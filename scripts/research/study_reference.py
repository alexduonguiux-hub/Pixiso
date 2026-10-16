"""Quantitative analysis of reference pixel-art images.

Usage: python3 -I analyze.py OUT_DIR IMG [IMG...]
Measures: native pixel scale, effective palette, OKLCh ramps per hue family,
outline colour, light direction, dithering / anti-aliasing usage.
"""
import sys, os, json, math
import numpy as np
from PIL import Image

# ---------- colour maths (sRGB -> OKLab / OKLCh) ----------
def srgb_to_linear(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

def rgb_to_oklab(rgb):
    r, g, b = [srgb_to_linear(rgb[..., i].astype(np.float64)) for i in range(3)]
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l_, m_, s_ = np.cbrt(l), np.cbrt(m), np.cbrt(s)
    L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
    a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
    b2 = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    return np.stack([L, a, b2], axis=-1)

def oklab_to_lch(lab):
    L, a, b = lab[..., 0], lab[..., 1], lab[..., 2]
    C = np.hypot(a, b)
    h = (np.degrees(np.arctan2(b, a)) + 360.0) % 360.0
    return np.stack([L, C, h], axis=-1)

# ---------- native pixel scale ----------
def change_profile(img, axis):
    # count of colour changes between neighbouring columns (axis=1) or rows (axis=0)
    d = np.any(np.diff(img.astype(np.int16), axis=axis) != 0, axis=2)
    return d.sum(axis=1 - axis).astype(np.float64)  # length = size-1

def autocorr_peak(profile, max_lag=40):
    p = profile - profile.mean()
    denom = (p * p).sum() + 1e-9
    ac = [((p[:-lag] * p[lag:]).sum() / denom) for lag in range(1, max_lag + 1)]
    ac = np.array(ac)
    # first local maximum above a threshold
    best = None
    for i in range(1, len(ac) - 1):
        if ac[i] > ac[i - 1] and ac[i] >= ac[i + 1] and ac[i] > 0.15:
            best = (i + 1, float(ac[i]))
            break
    if best is None:
        i = int(np.argmax(ac))
        best = (i + 1, float(ac[i]))
    return best, ac

def phase_for_scale(profile, scale):
    # find offset where edges concentrate
    n = len(profile)
    sums = np.zeros(scale)
    for i in range(n):
        sums[(i + 1) % scale] += profile[i]
    return int(np.argmax(sums)), sums / max(sums.sum(), 1)

def downsample(img, sx, sy, ox, oy):
    H, W, _ = img.shape
    # grid cells start at ox + k*sx; sample the centre pixel of each cell
    xs = np.arange(ox + sx // 2, W, sx)
    ys = np.arange(oy + sy // 2, H, sy)
    return img[np.ix_(ys, xs)]

# ---------- palette ----------
def quantize(img, bits=5):
    shift = 8 - bits
    q = (img >> shift) << shift
    q = q + (1 << (shift - 1)) if shift > 0 else q
    return q.astype(np.uint8)

def palette_stats(small):
    flat = small.reshape(-1, 3)
    uniq, counts = np.unique(flat, axis=0, return_counts=True)
    order = np.argsort(-counts)
    uniq, counts = uniq[order], counts[order]
    cum = np.cumsum(counts) / counts.sum()
    def n_for(frac):
        return int(np.searchsorted(cum, frac) + 1)
    return uniq, counts, {"unique": int(len(uniq)), "n90": n_for(0.90), "n95": n_for(0.95), "n99": n_for(0.99)}

# ---------- ramps ----------
def ramp_analysis(uniq, counts, top=96, hue_bin=30):
    lab = rgb_to_oklab(uniq[:top].astype(np.float64))
    lch = oklab_to_lch(lab)
    out = []
    # ignore near-greys for hue grouping
    chroma_ok = lch[:, 1] > 0.03
    hues = lch[:, 2]
    bins = {}
    for i in range(min(top, len(uniq))):
        if not chroma_ok[i]:
            key = "grey"
        else:
            key = int(hues[i] // hue_bin) * hue_bin
        bins.setdefault(key, []).append(i)
    for key, idx in bins.items():
        if len(idx) < 3:
            continue
        idx = sorted(idx, key=lambda i: lch[i, 0])
        Ls = lch[idx, 0]; Cs = lch[idx, 1]; Hs = lch[idx, 2]
        # hue slope vs lightness (circular-unwrapped around median)
        if key == "grey":
            slope = 0.0
        else:
            h0 = np.median(Hs)
            Hu = ((Hs - h0 + 180) % 360) - 180 + h0
            if np.ptp(Ls) > 1e-6:
                slope = float(np.polyfit(Ls, Hu, 1)[0])  # deg per unit L
            else:
                slope = 0.0
        out.append({
            "hue_family": key,
            "n": len(idx),
            "weight": float(counts[idx].sum()),
            "L_min": round(float(Ls.min()), 3), "L_max": round(float(Ls.max()), 3),
            "C_min": round(float(Cs.min()), 3), "C_max": round(float(Cs.max()), 3),
            "hue_dark": round(float(Hs[0]), 1), "hue_light": round(float(Hs[-1]), 1),
            "hue_slope_deg_per_L": round(slope, 1),
            "L_steps": [round(float(v), 2) for v in Ls],
            "hex": ["#%02x%02x%02x" % tuple(uniq[i]) for i in idx],
        })
    out.sort(key=lambda d: -d["weight"])
    return out

# ---------- outlines ----------
def outline_stats(small):
    lab = rgb_to_oklab(small.astype(np.float64))
    L = lab[..., 0]
    lch = oklab_to_lch(lab)
    H, W = L.shape
    dark = L < 0.32
    # neighbour max L
    pad = np.pad(L, 1, mode="edge")
    nmax = np.max(np.stack([pad[0:H, 1:W+1], pad[2:H+2, 1:W+1], pad[1:H+1, 0:W], pad[1:H+1, 2:W+2]]), axis=0)
    edge_dark = dark & (nmax - L > 0.25)
    n = int(edge_dark.sum())
    if n == 0:
        return {"count": 0}
    cols = small[edge_dark]
    lchs = lch[edge_dark]
    pure_black = int(np.all(cols < 24, axis=1).sum())
    # dominant outline colours
    q = quantize(cols, 4)
    uniq, counts = np.unique(q.reshape(-1, 3), axis=0, return_counts=True)
    order = np.argsort(-counts)[:8]
    top = [("#%02x%02x%02x" % tuple(uniq[i]), int(counts[i])) for i in order]
    # thickness: fraction of dark-edge pixels that have a dark-edge neighbour in BOTH x directions (i.e. >=2px thick along x)
    ed = edge_dark
    thick_x = ed[:, 1:-1] & ed[:, :-2] & ed[:, 2:]
    thick_y = ed[1:-1, :] & ed[:-2, :] & ed[2:, :]
    return {
        "count": n,
        "fraction_of_image": round(n / (H * W), 4),
        "pure_black_fraction": round(pure_black / n, 3),
        "mean_L": round(float(lchs[:, 0].mean()), 3),
        "mean_C": round(float(lchs[:, 1].mean()), 3),
        "hue_hist_30deg": {int(k): int(v) for k, v in zip(*np.unique((lchs[:, 2] // 30 * 30).astype(int), return_counts=True))},
        "top_colours": top,
        "thick2px_fraction_x": round(float(thick_x.sum()) / n, 3),
        "thick2px_fraction_y": round(float(thick_y.sum()) / n, 3),
    }

# ---------- light direction ----------
def light_direction(small):
    lab = rgb_to_oklab(small.astype(np.float64))
    L = lab[..., 0]
    gx = np.zeros_like(L); gy = np.zeros_like(L)
    gx[:, 1:-1] = (L[:, 2:] - L[:, :-2]) / 2
    gy[1:-1, :] = (L[2:, :] - L[:-2, :]) / 2
    mag = np.hypot(gx, gy)
    # shading steps: moderate lightness steps between non-outline pixels
    mask = (mag > 0.02) & (mag < 0.18) & (L > 0.3)
    vx = gx[mask].sum(); vy = gy[mask].sum()
    ang = math.degrees(math.atan2(-vy, vx))  # screen: +x right, -y up
    # also counts per quadrant of gradient direction
    a = np.degrees(np.arctan2(-gy[mask], gx[mask]))
    hist, _ = np.histogram(a, bins=8, range=(-180, 180))
    return {"toward_light_deg": round(ang, 1), "n": int(mask.sum()),
            "dir_hist_8": {int(b): int(c) for b, c in zip(range(-180, 180, 45), hist)}}

# ---------- dithering / AA ----------
def texture_stats(small):
    H, W, _ = small.shape
    a = small.astype(np.int16)
    same = lambda p, q: np.all(p == q, axis=2)
    c = a[1:-1, 1:-1]
    up, dn, lf, rt = a[:-2, 1:-1], a[2:, 1:-1], a[1:-1, :-2], a[1:-1, 2:]
    # checkerboard: centre != left==right==up==down  (classic 50% dither)
    checker = (~same(c, lf)) & same(lf, rt) & same(lf, up) & same(lf, dn)
    # orphan: differs from all 4 neighbours and neighbours not all equal
    orphan = (~same(c, lf)) & (~same(c, rt)) & (~same(c, up)) & (~same(c, dn)) & ~checker
    # cluster size proxy: fraction of pixels with >=2 same-colour 4-neighbours
    nsame = same(c, lf).astype(int) + same(c, rt) + same(c, up) + same(c, dn)
    return {"checker_fraction": round(float(checker.mean()), 4),
            "orphan_fraction": round(float(orphan.mean()), 4),
            "pixels_with_ge2_same_neighbours": round(float((nsame >= 2).mean()), 3),
            "pixels_with_0_same_neighbours": round(float((nsame == 0).mean()), 3)}

def main():
    out_dir = sys.argv[1]
    os.makedirs(out_dir, exist_ok=True)
    report = {}
    for path in sys.argv[2:]:
        name = os.path.splitext(os.path.basename(path))[0]
        img = np.asarray(Image.open(path).convert("RGB"))
        H, W, _ = img.shape
        px = change_profile(img, 1); py = change_profile(img, 0)
        (sx, acx), _ = autocorr_peak(px); (sy, acy), _ = autocorr_peak(py)
        ox, distx = phase_for_scale(px, sx); oy, disty = phase_for_scale(py, sy)
        small = downsample(img, sx, sy, ox, oy)
        # quantize noise before palette stats (5 bits/channel)
        q = quantize(small, 5)
        uniq, counts, pstats = palette_stats(q)
        ramps = ramp_analysis(uniq, counts)
        rep = {
            "size": [W, H],
            "scale": {"x": sx, "y": sy, "autocorr_x": round(acx, 3), "autocorr_y": round(acy, 3),
                      "edge_phase_concentration_x": round(float(distx.max()), 3),
                      "edge_phase_concentration_y": round(float(disty.max()), 3)},
            "native_size": [int(small.shape[1]), int(small.shape[0])],
            "palette_exact_unique": int(len(np.unique(small.reshape(-1, 3), axis=0))),
            "palette_5bit": pstats,
            "palette_top16": ["#%02x%02x%02x" % tuple(c) for c in uniq[:16]],
            "ramps": ramps[:10],
            "outline": outline_stats(small),
            "light": light_direction(small),
            "texture": texture_stats(small),
        }
        report[name] = rep
        Image.fromarray(small).save(os.path.join(out_dir, f"{name}_native.png"))
        # x4 nearest of native for viewing
        Image.fromarray(small).resize((small.shape[1] * 4, small.shape[0] * 4), Image.NEAREST).save(os.path.join(out_dir, f"{name}_native_x4.png"))
        # thumbnail with grid labels for crop picking
        th = Image.fromarray(img).resize((W // 2, H // 2), Image.BOX)
        th.save(os.path.join(out_dir, f"{name}_thumb.png"))
        print(f"== {name}: {W}x{H} scale=({sx},{sy}) ac=({acx:.2f},{acy:.2f}) native={small.shape[1]}x{small.shape[0]} "
              f"uniq={rep['palette_exact_unique']} n95={pstats['n95']} n99={pstats['n99']}")
    with open(os.path.join(out_dir, "report.json"), "w") as f:
        json.dump(report, f, indent=1)

main()
