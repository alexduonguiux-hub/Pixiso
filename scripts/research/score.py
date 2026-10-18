"""Measure every dumped sprite with the same yardstick as the reference sheet.

Reads test-output/score/sprites.json (+ 1x PNGs) written by scripts/hero-score-dump.ts
and compares with the reference figure's numbers in reference_figure.json (measured
once from the user's sheet resampled to 1x with --ref PATH; the sheet itself is not
committed). Every metric is computed in image space on both, so the
comparison does not depend on our own cell semantics:

  colors      distinct colours after an OKLab merge (radius 0.03)
  materials   hue families (30 deg bins, chromatic) + grey groups split by L
  tones       L levels per family (gap 0.06); hl/sh = share of the lightest/darkest
              level in the dominant clothing family and in skin
  lineDens    interior line pixels (dark, not on the silhouette, 1 px thin) per 100
              object pixels: garment construction (seams, cuffs, pockets, folds)
  lines       connected interior line pieces of 2+ pixels
  flatMax     largest flat same-colour region as a share of the object
  light       centroid(lightest) - centroid(darkest) of the dominant family:
              must point up-left (dx <= 0.5, dy <= 0.5)
  orphan      object pixels with no same-colour 4-neighbour (1 px specks)
  lint        pixel_lint warnings on our cells (doubles, jaggies, banding, bands)

Cross-sprite (ours only): silhouette distinctness between characters on the same
body in S (1 - IoU; two sprites that only differ by colour fail the 1x test) and
view consistency (height, opaque area S/N and SW/NW, head width S/N).

A sprite passes a metric when it is within the tolerance of the reference value
(see THRESHOLDS). Output: test-output/score/report.md and report.json.
"""
import json, os, sys, math
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pixel_lint

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCORE = os.path.join(ROOT, 'test-output', 'score')

# ---------------------------------------------------------------- colour maths
def srgb_to_linear(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def rgb_to_oklab(rgb):
    r, g, b = [srgb_to_linear(rgb[..., i].astype(np.float64)) for i in range(3)]
    l = 0.4122214708*r + 0.5363325363*g + 0.0514459929*b
    m = 0.2119034982*r + 0.6806995451*g + 0.1073969566*b
    s = 0.0883024619*r + 0.2817188376*g + 0.6299787005*b
    l_, m_, s_ = np.cbrt(l), np.cbrt(m), np.cbrt(s)
    return np.stack([0.2104542553*l_ + 0.7936177850*m_ - 0.0040720468*s_,
                     1.9779984951*l_ - 2.4285922050*m_ + 0.4505937099*s_,
                     0.0259040371*l_ + 0.7827717662*m_ - 0.8086757660*s_], axis=-1)
def lch(lab):
    return lab[..., 0], np.hypot(lab[..., 1], lab[..., 2]), (np.degrees(np.arctan2(lab[..., 2], lab[..., 1])) + 360) % 360

def components(mask, diag=False):
    H, W = mask.shape; seen = np.zeros_like(mask, bool); out = []
    nb = [(1,0),(-1,0),(0,1),(0,-1)] + ([(1,1),(1,-1),(-1,1),(-1,-1)] if diag else [])
    for y in range(H):
        for x in range(W):
            if not mask[y, x] or seen[y, x]: continue
            stack = [(y, x)]; seen[y, x] = True; comp = []
            while stack:
                cy, cx = stack.pop(); comp.append((cy, cx))
                for dy, dx in nb:
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True; stack.append((ny, nx))
            out.append(comp)
    return out

def quantize(rgb, obj, radius=0.03):
    """Merge colours within an OKLab radius (by frequency). Returns label image (-1 outside) and count."""
    px = rgb[obj]
    uniq, counts = np.unique(px.reshape(-1, 3), axis=0, return_counts=True)
    order = np.argsort(-counts); uniq, counts = uniq[order], counts[order]
    lab = rgb_to_oklab(uniq.astype(np.float64))
    reps = []; rep_lab = np.zeros((0, 3)); assign = {}
    for i in range(len(uniq)):
        if len(reps):
            d = np.sqrt(((rep_lab - lab[i]) ** 2).sum(1)); j = int(np.argmin(d))
            if d[j] < radius: assign[tuple(uniq[i])] = j; continue
        assign[tuple(uniq[i])] = len(reps); reps.append(lab[i]); rep_lab = np.vstack([rep_lab, lab[i]])
    labels = np.full(obj.shape, -1, int)
    ys, xs = np.nonzero(obj)
    for y, x in zip(ys, xs): labels[y, x] = assign[tuple(rgb[y, x])]
    # compression noise: colours left with fewer than 3 pixels are snapped to the nearest kept colour
    cnt = np.bincount(labels[labels >= 0], minlength=len(reps))
    keep = [i for i in range(len(reps)) if cnt[i] >= 3] or list(range(len(reps)))
    remap = {}
    for i in range(len(reps)):
        if i in keep: remap[i] = keep.index(i); continue
        d = [np.sqrt(((rep_lab[k] - rep_lab[i]) ** 2).sum()) for k in keep]
        remap[i] = int(np.argmin(d))
    for y, x in zip(ys, xs): labels[y, x] = remap[labels[y, x]]
    rep_lab = rep_lab[keep]
    return labels, len(keep), rep_lab

# ---------------------------------------------------------------- metrics on one image
def object_mask(img):
    """Object = non-transparent; for an RGB image, non-white pixels (white flood-filled from the border is background)."""
    arr = np.array(img)
    if arr.shape[2] == 4:
        return arr[..., :3], arr[..., 3] > 0
    rgb = arr[..., :3]
    lab = rgb_to_oklab(rgb.astype(np.float64)); L, C, _ = lch(lab)
    white = (L > 0.93) & (C < 0.04)
    H, W = white.shape; bg = np.zeros_like(white)
    stack = [(y, x) for y in range(H) for x in (0, W - 1) if white[y, x]] + [(y, x) for x in range(W) for y in (0, H - 1) if white[y, x]]
    for y, x in stack: bg[y, x] = True
    while stack:
        y, x = stack.pop()
        for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and white[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True; stack.append((ny, nx))
    return rgb, ~bg

def measure(img, rows=None):
    rgb, obj = object_mask(img)
    ys, xs = np.nonzero(obj)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    rgb = rgb[y0:y1 + 1, x0:x1 + 1]; obj = obj[y0:y1 + 1, x0:x1 + 1]
    H, W = obj.shape; n = int(obj.sum())
    lab = rgb_to_oklab(rgb.astype(np.float64)); L, C, hue = lch(lab)
    m = {'w': int(W), 'h': int(H), 'px': n}
    labels, ncol, rep_lab = quantize(rgb, obj)
    m['colors'] = ncol
    # silhouette boundary and interior lines
    pad = np.pad(obj, 1)
    boundary = obj & (~pad[:-2, 1:-1] | ~pad[2:, 1:-1] | ~pad[1:-1, :-2] | ~pad[1:-1, 2:])
    dark = obj & (L < 0.33)
    nd = np.zeros_like(obj, int)   # non-dark object neighbours
    for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
        sh = np.roll(np.roll(obj & ~dark, dy, 0), dx, 1); nd += sh
    line = dark & ~boundary & (nd >= 2)
    m['lineDens'] = round(100.0 * line.sum() / n, 1)
    m['lines'] = sum(1 for c in components(line, diag=True) if len(c) >= 2)
    # flat regions
    flats = []
    for k in range(ncol):
        for c in components(labels == k): flats.append(len(c))
    m['flatMax'] = round(100.0 * max(flats) / n, 1)
    m['bigFlats'] = sum(1 for f in flats if f >= 10)
    # orphans: object pixel with no same-label 4-neighbour
    same = np.zeros_like(obj, int)
    for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
        shl = np.roll(np.roll(labels, dy, 0), dx, 1); same += (shl == labels) & obj
    m['orphan'] = round(100.0 * ((same == 0) & obj & ~line).sum() / n, 2)
    # families: palette entries clustered by hue (one ramp shifts hue by at most ~16 deg per tone), greys split dark/light
    Lr, Cr, hr = rep_lab[:, 0], np.hypot(rep_lab[:, 1], rep_lab[:, 2]), (np.degrees(np.arctan2(rep_lab[:, 2], rep_lab[:, 1])) + 360) % 360
    cnt = np.bincount(labels[labels >= 0], minlength=ncol)
    groups = []   # {'kind': 'hue' | 'grey-dark' | 'grey-light', 'hue': float | None, 'entries': [palette indices]}
    for i in np.argsort(-cnt):
        if Lr[i] <= 0.12: continue                      # outline / black: not a material tone
        if Cr[i] < 0.012:
            kind = 'grey-dark' if Lr[i] < 0.35 else 'grey-light'
            g = next((g for g in groups if g['kind'] == kind), None)
            if g is None: g = {'kind': kind, 'hue': None, 'entries': []}; groups.append(g)
        else:
            g = next((g for g in groups if g['kind'] == 'hue' and min(abs(g['hue'] - hr[i]), 360 - abs(g['hue'] - hr[i])) < 22), None)
            if g is None: g = {'kind': 'hue', 'hue': float(hr[i]), 'entries': []}; groups.append(g)
        g['entries'].append(int(i))
    fams = {}
    for gi, g in enumerate(groups):
        entries = g['entries']
        pxs = int(sum(cnt[e] for e in entries))
        if pxs < max(8, 0.02 * n): continue
        entries = sorted(entries, key=lambda e: Lr[e])
        info = {'px': pxs, 'tones': len(entries), 'kind': g['kind'], 'hue': None if g['hue'] is None else round(float(np.mean([hr[e] for e in entries])), 0)}
        if len(entries) >= 2:
            lo, hi = entries[0], entries[-1]
            info['hl'] = round(100.0 * cnt[hi] / pxs, 1); info['sh'] = round(100.0 * cnt[lo] / pxs, 1)
            yl, xl = np.nonzero(labels == hi); yd, xd = np.nonzero(labels == lo)
            info['light'] = [round(float(xl.mean() - xd.mean()), 1), round(float(yl.mean() - yd.mean()), 1)]
        fams[gi] = info
    m['materials'] = len(fams)
    m['families'] = fams
    if rows is None:
        # reference: skin = the warm family (hue 40-80) with most pixels, cloth = the largest other family
        skin = max((f for f in fams if fams[f]['hue'] is not None and 40 <= fams[f]['hue'] <= 80), key=lambda f: fams[f]['px'], default=None)
        cloth = max((f for f in fams if f != skin), key=lambda f: fams[f]['px'], default=None)
        for name, f in (('skin', skin), ('cloth', cloth)):
            if f is not None:
                info = fams[f]; m[name] = {'tones': info['tones'], 'hl': info.get('hl'), 'sh': info.get('sh'), 'light': info.get('light')}
    else:
        # ours: exact from the cells. skin = s/S/$; cloth = the biggest garment material among cloth, cloth2, pants, leather, boots
        GL = {'skin': 's', 'cloth': 'c', 'cloth2': 'k', 'pants': 'p', 'leather': 'l', 'boots': 'b', 'hair': 'h'}
        # glyphs per material: mid, shadow, highlight, deep shadow, bright highlight
        SH = {'skin': 'sS$zZ', 'cloth': 'cC^vV', 'cloth2': 'kK&qQ', 'pants': 'pP+yY', 'leather': 'lL|iI', 'boots': 'bB!gG', 'hair': 'hH#jJ'}
        def part(mat):
            mid, sh, hl, deep, bright = SH[mat]
            cells = [(x, y, c) for y, r in enumerate(rows) for x, c in enumerate(r) if c in SH[mat]]
            if len(cells) < 8: return None
            tot = len(cells)
            nh = sum(1 for *_, c in cells if c in (hl, bright)); ns = sum(1 for *_, c in cells if c in (sh, deep))
            tones = len({c for *_, c in cells})
            info = {'tones': tones, 'hl': round(100.0 * nh / tot, 1), 'sh': round(100.0 * ns / tot, 1), 'px': tot}
            if nh and ns:
                hx = np.mean([x for x, y, c in cells if c in (hl, bright)]); hy = np.mean([y for x, y, c in cells if c in (hl, bright)])
                sx = np.mean([x for x, y, c in cells if c in (sh, deep)]); sy = np.mean([y for x, y, c in cells if c in (sh, deep)])
                info['light'] = [round(float(hx - sx), 1), round(float(hy - sy), 1)]
            return info
        m['skin'] = part('skin')
        garments = [(mat, part(mat)) for mat in ('cloth', 'cloth2', 'pants', 'leather', 'boots')]
        garments = [(mat, g) for mat, g in garments if g]
        if garments:
            mat, g = max(garments, key=lambda mg: mg[1]['px']); g['material'] = mat; m['cloth'] = g
    if rows is not None:
        ws = pixel_lint.lint(rows)
        m['lint'] = len(ws)
        m['lintKinds'] = sorted(set(k for k, *_ in ws))
    return m

# ---------------------------------------------------------------- reference and thresholds
THRESHOLDS = {
    # name: (direction, tolerance) relative to the reference value; 'abs' entries are fixed
    'colors': ('max_ratio', 1.2),
    'materials': ('min_ratio', 0.75),
    'lineDens': ('min_ratio', 0.6),
    'lines': ('min_ratio', 0.6),
    'flatMax': ('max_ratio', 1.3),
    'lint': ('max_abs', 2),
}
# Tone shares measured on the reference figure (skin: hl 21 / sh 6.5; jacket: hl 10 / sh 40), each widened by ~10 points.
# Clothes on the reference are mostly mid and shadow with a small highlight; skin is mostly mid and highlight.
TONE_RANGE = {'skin': {'hl': (12, 32), 'sh': (4, 20)}, 'cloth': {'hl': (4, 22), 'sh': (28, 52)}}

def judge(m, ref):
    flags = []
    for key, (mode, tol) in THRESHOLDS.items():
        v = m.get(key); r = ref.get(key) if ref else None
        if v is None: continue
        if mode == 'max_abs' and v > tol: flags.append(f'{key} {v}>{tol}')
        elif mode == 'min_ratio' and r is not None and v < tol * r: flags.append(f'{key} {v}<{round(tol * r, 1)}')
        elif mode == 'max_ratio' and r is not None and v > tol * r: flags.append(f'{key} {v}>{round(tol * r, 1)}')
        elif mode == 'max_plus' and r is not None and v > r + tol: flags.append(f'{key} {v}>{round(r + tol, 2)}')
    for part in ('skin', 'cloth'):
        p = m.get(part)
        if not p: continue
        if p['tones'] < 3: flags.append(f'{part} tones {p["tones"]}<3')
        for k, (lo, hi) in TONE_RANGE[part].items():
            v = p.get(k)
            if v is not None and not (lo <= v <= hi): flags.append(f'{part} {k} {v}% not in {lo}-{hi}')
        # the light vector (centroid of highlights minus centroid of shadows) is reported, not gated: on a whole
        # figure the belly and thigh lights pull it down even on the reference (skin 0.0, +0.3)
    return flags

# ---------------------------------------------------------------- cross-sprite checks
def silhouette(rows):
    return np.array([[c != '.' for c in r] for r in rows], bool)

def cross_checks(entries):
    out = {'distinct': [], 'views': []}
    by_id = {}
    for e in entries: by_id.setdefault(e['id'], {})[e['view']] = e
    # distinctness: S silhouettes of sprites with the same canvas size (same body)
    S = [(e['id'], silhouette(e['rows'])) for e in entries if e['view'] == 'S']
    for i in range(len(S)):
        for j in range(i + 1, len(S)):
            a, b = S[i][1], S[j][1]
            if a.shape != b.shape: continue
            inter = (a & b).sum(); union = (a | b).sum()
            diff = 1 - inter / union
            if diff < 0.08: out['distinct'].append((S[i][0], S[j][0], round(float(diff), 3)))
    for id_, views in by_id.items():
        s = views.get('S'); n = views.get('N'); sw = views.get('SW'); nw = views.get('NW'); w = views.get('W')
        probs = []
        def area(e): return int(silhouette(e['rows']).sum())
        def height(e):
            sil = silhouette(e['rows']); ys = np.nonzero(sil.any(1))[0]; return int(ys.max() - ys.min() + 1)
        if s and n:
            if height(s) != height(n): probs.append(f'height S {height(s)} vs N {height(n)}')
            if abs(area(s) - area(n)) > 0.08 * area(s): probs.append(f'area S {area(s)} vs N {area(n)}')
        if sw and nw and abs(area(sw) - area(nw)) > 0.08 * area(sw): probs.append(f'area SW {area(sw)} vs NW {area(nw)}')
        if s and w and abs(height(s) - height(w)) > 1: probs.append(f'height S {height(s)} vs W {height(w)}')
        if probs: out['views'].append((id_, probs))
    return out

# ---------------------------------------------------------------- main
def main():
    args = sys.argv[1:]
    ref_path = args[args.index('--ref') + 1] if '--ref' in args else None
    os.makedirs(SCORE, exist_ok=True)
    ref_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'reference_figure.json')   # committed numbers
    if ref_path:
        ref = measure(Image.open(ref_path).convert('RGB'))
        json.dump(ref, open(os.path.join(SCORE, 'reference.json'), 'w'), indent=1, default=lambda o: o.item() if hasattr(o, 'item') else str(o))
        print('reference:', {k: ref[k] for k in ('w', 'h', 'px', 'colors', 'materials', 'lineDens', 'lines', 'flatMax', 'bigFlats', 'orphan')})
        print('  skin', ref.get('skin'), '\n  cloth', ref.get('cloth'))
        for f, info in sorted(ref['families'].items(), key=lambda kv: -kv[1]['px']): print('  family', f, info)
    else:
        ref = json.load(open(ref_file))
    entries = json.load(open(os.path.join(SCORE, 'sprites.json')))
    results = []
    for e in entries:
        img = Image.open(os.path.join(SCORE, 'sprites', e['png'])).convert('RGBA')
        m = measure(img, e['rows'])
        m['id'] = e['id']; m['view'] = e['view']; m['label'] = e['label']
        m['flags'] = judge(m, ref)
        results.append(m)
    cross = cross_checks(entries)
    # report
    cols = ['sprite', 'colors', 'mat', 'lineDens', 'lines', 'flatMax', 'skin hl/sh', 'cloth hl/sh', 'orphan', 'lint', 'flags']
    lines = ['# Pixel quality score', '', f'{len(results)} sprites; reference: ' + (json.dumps({k: ref[k] for k in ("colors", "materials", "lineDens", "lines", "flatMax", "orphan")}) if ref else 'none'), '']
    fails = {}
    for m in results:
        for f in m['flags']: fails[f.split(' ')[0] if not f.startswith(('skin', 'cloth')) else ' '.join(f.split(' ')[:2])] = fails.get(f.split(' ')[0] if not f.startswith(('skin', 'cloth')) else ' '.join(f.split(' ')[:2]), 0) + 1
    lines.append('## Failures by metric (sprites failing / total)')
    for k, v in sorted(fails.items(), key=lambda kv: -kv[1]): lines.append(f'- {k}: {v} / {len(results)}')
    lines.append('')
    lines.append('## Per sprite')
    lines.append('| ' + ' | '.join(cols) + ' |'); lines.append('|' + '---|' * len(cols))
    def tone(p): return f"{p['hl']}/{p['sh']}" if p and p.get('hl') is not None else '-'
    for m in sorted(results, key=lambda m: (-len(m['flags']), m['id'], m['view'])):
        lines.append('| ' + ' | '.join([f"{m['id']}@{m['view']}", str(m['colors']), str(m['materials']), str(m['lineDens']), str(m['lines']), str(m['flatMax']), tone(m.get('skin')), tone(m.get('cloth')), str(m['orphan']), str(m.get('lint', '-')), '; '.join(m['flags'])]) + ' |')
    lines.append('')
    lines.append('## Silhouettes that only differ by colour (S, 1 - IoU < 0.08)')
    for a, b, d in cross['distinct']: lines.append(f'- {a} ~ {b}: {d}')
    if not cross['distinct']: lines.append('- none')
    lines.append('')
    lines.append('## View consistency')
    for id_, probs in cross['views']: lines.append(f'- {id_}: ' + '; '.join(probs))
    if not cross['views']: lines.append('- all consistent')
    open(os.path.join(SCORE, 'report.md'), 'w').write('\n'.join(lines) + '\n')
    json.dump({'reference': ref, 'results': results, 'cross': cross}, open(os.path.join(SCORE, 'report.json'), 'w'))
    passing = sum(1 for m in results if not m['flags'])
    print(f'pass {passing}/{len(results)} sprites; failures by metric:', dict(sorted(fails.items(), key=lambda kv: -kv[1])))
    print(f'silhouette near-duplicates: {len(cross["distinct"])}; view inconsistencies: {len(cross["views"])}')
    print('-> test-output/score/report.md')

if __name__ == '__main__':
    main()
