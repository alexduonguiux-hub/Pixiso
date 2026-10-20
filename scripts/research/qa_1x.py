"""The 1x yardstick (D-088): what a player sees at game size, measured on the scorer's dump
(`pnpm qa:score` writes test-output/score/sprites.json and sprites/*.png).

Per sprite:
  islands    opaque 8-connected pieces apart from the body (a prop floating beside it) -> must be 0
  skin1      skin cells with no skin among their 8 neighbours (a flesh dot cut off from the body:
             an ear sliver under hair, a cheek cell between lines; a thumb touching the hand
             corner to corner is not one)                                                  -> must be 0
  frag       4-connected same-material regions under 3 cells, any material but line, eye and white
             (a detail smaller than that reads as a dropped pixel at 1x)                -> must not rise
Per pair of characters (S view), confusability: silhouette IoU with the feet aligned and the mean
oklab distance of six horizontal colour bands; a pair is "lẫn" when IoU >= IOU_MIN and dE <= DE_MAX.

Usage: python3 -I scripts/research/qa_1x.py [--pairs] [--verbose]
Writes test-output/score/report_1x.md and exits 1 when a hard gate fails or a count rises above the
baseline in BASELINE (update the baseline on purpose, in the same commit as the change).
"""
import json, os, sys
from collections import deque, Counter
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SCORE_DIR = os.path.join(HERE, '..', '..', 'test-output', 'score')
SH = {'skin': 'sS$zZ', 'hair': 'hH#jJ', 'cloth': 'cC^vV', 'cloth2': 'kK&qQ', 'pants': 'pP+yY', 'boots': 'bB!gG',
      'metal': 'mMwnN', 'leather': 'lL|iI', 'wood': 'dD%tT', 'accent': 'aA*rR'}
MAT = {g: m for m, gs in SH.items() for g in gs}
IOU_MIN = 0.82
DE_MAX = 0.075
# Gates: islands and skin1 are hard zeros; frag and pairs are the counts after D-088 (19/10/2026) and must not
# rise (lower them here, in the same commit, when a change brings them down).
BASELINE = {'islands': 0, 'skin1': 0, 'frag': 939, 'pairs': 0}
BANDS = 6

def comps(mask, conn8):
    H, W = mask.shape; lab = -np.ones((H, W), int); out = []
    for y in range(H):
        for x in range(W):
            if not mask[y, x] or lab[y, x] >= 0: continue
            q = deque([(x, y)]); lab[y, x] = len(out); cells = []
            while q:
                cx, cy = q.popleft(); cells.append((cx, cy))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        if dx == 0 and dy == 0: continue
                        if not conn8 and dx and dy: continue
                        X, Y = cx + dx, cy + dy
                        if 0 <= X < W and 0 <= Y < H and mask[Y, X] and lab[Y, X] < 0:
                            lab[Y, X] = len(out); q.append((X, Y))
            out.append(cells)
    return out

def srgb_to_oklab(rgb):
    c = rgb / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    l = np.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    m = np.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    s = np.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    return np.stack([0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
                     1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
                     0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s], axis=-1)

def measure(e):
    rows = e['rows']; H = len(rows); W = max(len(r) for r in rows)
    grid = [r.ljust(W, '.') for r in rows]
    a = np.array(Image.open(os.path.join(SCORE_DIR, 'sprites', e['png'])).convert('RGBA'))
    op = a[..., 3] > 0
    pieces = comps(op, True); pieces.sort(key=len, reverse=True)
    islands = [(len(c), min(c)) for c in pieces[1:]]
    skin1 = []
    for y in range(H):
        for x in range(W):
            if grid[y][x] not in SH['skin']: continue
            if not any(0 <= x + dx < W and 0 <= y + dy < H and grid[y + dy][x + dx] in SH['skin']
                       for dx in (-1, 0, 1) for dy in (-1, 0, 1) if dx or dy):
                skin1.append((x, y, grid[y][x]))
    frag = []
    for m, gs in SH.items():
        mask = np.array([[c in gs for c in r] for r in grid])
        for c in comps(mask, False):
            if len(c) < 3: frag.append((m, len(c), c[0], grid[c[0][1]][c[0][0]]))
    return {'islands': islands, 'skin1': skin1, 'frag': frag, 'img': a, 'op': op}

def signature(m):
    """Silhouette (feet-aligned, centred) and six colour bands for the pair measure."""
    op = m['op']; ys, xs = np.where(op)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    h, w = y1 - y0 + 1, x1 - x0 + 1
    canvas = np.zeros((64, 64), bool); img = np.zeros((64, 64, 3)); ox = 32 - w // 2; oy = 63 - h
    canvas[oy:oy + h, ox:ox + w] = op[y0:y1 + 1, x0:x1 + 1]
    img[oy:oy + h, ox:ox + w] = m['img'][y0:y1 + 1, x0:x1 + 1, :3]
    lab = srgb_to_oklab(img)
    bands = []
    for b in range(BANDS):
        r0 = oy + b * h // BANDS; r1 = oy + (b + 1) * h // BANDS
        sel = canvas[r0:r1]
        bands.append(lab[r0:r1][sel].mean(axis=0) if sel.any() else np.zeros(3))
    return canvas, np.array(bands)

def main():
    verbose = '--verbose' in sys.argv
    sprites = json.load(open(os.path.join(SCORE_DIR, 'sprites.json')))
    tot = Counter(); lines = []; per = {}
    for e in sprites:
        m = measure(e); per[(e['id'], e['view'])] = m
        tot['islands'] += len(m['islands']); tot['skin1'] += len(m['skin1']); tot['frag'] += len(m['frag'])
        if m['islands'] or m['skin1'] or (verbose and m['frag']):
            lines.append(f"- `{e['id']}@{e['view']}`: islands {m['islands']} · skin1 {m['skin1']}"
                         + (f" · frag {m['frag']}" if verbose else f" · frag {len(m['frag'])}"))
    # fragments by material, for the painter
    bym = Counter(); byid = Counter()
    for (sid, view), m in per.items():
        for mat, n, *_ in m['frag']: bym[mat] += 1
        byid[sid] += len(m['frag']) + len(m['skin1'])
    # pairs (S view)
    ids = [e['id'] for e in sprites if e['view'] == 'S']
    sig = {i: signature(per[(i, 'S')]) for i in ids}
    pairs = []
    for a in range(len(ids)):
        for b in range(a + 1, len(ids)):
            ca, ba = sig[ids[a]]; cb, bb = sig[ids[b]]
            iou = (ca & cb).sum() / max(1, (ca | cb).sum())
            de = float(np.linalg.norm(ba - bb, axis=1).mean())
            pairs.append((iou, de, ids[a], ids[b]))
    confusable = sorted([p for p in pairs if p[0] >= IOU_MIN and p[1] <= DE_MAX], key=lambda p: (-p[0], p[1]))
    tot['pairs'] = len(confusable)
    out = ['# Thước 1× (D-088)', '',
           f"islands {tot['islands']} · skin1 {tot['skin1']} · frag {tot['frag']} · cặp lẫn {tot['pairs']} "
           f"(IoU ≥ {IOU_MIN}, ΔE ≤ {DE_MAX})", '',
           '## Mảng rời / ô da đơn theo sprite', *lines, '',
           '## Mảnh vật liệu dưới 3 ô theo vật liệu', *[f'- {m}: {n}' for m, n in bym.most_common()], '',
           '## Nhân vật nhiều mảnh nhất (5 góc)', *[f'- {i}: {n}' for i, n in byid.most_common(10)], '',
           '## Cặp dễ lẫn ở 1× (góc S)', *[f'- {a} ~ {b}: IoU {iou:.2f}, ΔE {de:.3f}' for iou, de, a, b in confusable], '',
           '## Mọi cặp có IoU ≥ 0.82 (ΔE tăng dần)',
           *[f'- {a} ~ {b}: IoU {iou:.2f}, ΔE {de:.3f}' for iou, de, a, b in sorted([p for p in pairs if p[0] >= IOU_MIN], key=lambda p: p[1])[:40]]]
    os.makedirs(SCORE_DIR, exist_ok=True)
    open(os.path.join(SCORE_DIR, 'report_1x.md'), 'w').write('\n'.join(out) + '\n')
    print(out[2])
    bad = []
    for k, base in BASELINE.items():
        if base is None: continue
        if tot[k] > base: bad.append(f'{k} {tot[k]} > {base}')
    if bad: print('FAIL:', '; '.join(bad))
    print('-> test-output/score/report_1x.md')
    sys.exit(1 if bad else 0)

if __name__ == '__main__':
    main()
