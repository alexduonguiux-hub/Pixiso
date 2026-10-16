"""Per-object crops + tolerance-merged palettes. Usage: python3 -I crops.py OUT_DIR IMG_DIR"""
import sys, os, json, math
import numpy as np
from PIL import Image, ImageDraw

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
    return lab[...,0], np.hypot(lab[...,1], lab[...,2]), (np.degrees(np.arctan2(lab[...,2], lab[...,1]))+360)%360

def merged_palette(pixels, radius=0.03):
    """Greedy merge of colours within OKLab radius, by frequency. Returns list of (rgb, count, lab)."""
    uniq, counts = np.unique(pixels.reshape(-1,3), axis=0, return_counts=True)
    order = np.argsort(-counts); uniq, counts = uniq[order], counts[order]
    lab = rgb_to_oklab(uniq.astype(np.float64))
    reps = []  # [lab, rgb, count]
    rep_lab = np.zeros((0,3))
    for i in range(len(uniq)):
        if len(reps):
            d = np.sqrt(((rep_lab - lab[i])**2).sum(1))
            j = int(np.argmin(d))
            if d[j] < radius:
                reps[j][2] += int(counts[i]); continue
        reps.append([lab[i], uniq[i], int(counts[i])])
        rep_lab = np.vstack([rep_lab, lab[i]])
    reps.sort(key=lambda r: -r[2])
    return reps

def coverage_count(reps, frac):
    tot = sum(r[2] for r in reps); acc = 0
    for n, r in enumerate(reps, 1):
        acc += r[2]
        if acc / tot >= frac: return n
    return len(reps)

def quantize_to(pixels, reps):
    lab = rgb_to_oklab(pixels.astype(np.float64)).reshape(-1,3)
    rl = np.array([r[0] for r in reps])
    d = ((lab[:,None,:]-rl[None,:,:])**2).sum(2)
    idx = np.argmin(d, 1)
    return idx.reshape(pixels.shape[:2])

def texture(idx):
    c = idx[1:-1,1:-1]; up, dn, lf, rt = idx[:-2,1:-1], idx[2:,1:-1], idx[1:-1,:-2], idx[1:-1,2:]
    checker = (c!=lf)&(lf==rt)&(lf==up)&(lf==dn)
    nsame = (c==lf).astype(int)+(c==rt)+(c==up)+(c==dn)
    return {"checker": round(float(checker.mean()),4), "orphan0": round(float((nsame==0).mean()),4),
            "orphan1": round(float((nsame==1).mean()),4), "ge2": round(float((nsame>=2).mean()),3)}

SCALES = {"1": (4,4,0,0), "2": (2,2,0,0), "3": (4,4,0,0), "4": (2,2,0,0)}
CROPS = {
 "1": [("creature_leaf", 60,30,95,62), ("creature_deer", 42,178,82,216), ("creature_bird", 298,105,338,140),
       ("creature_turtle", 268,30,312,66), ("creature_mouse", 278,178,322,216), ("creature_fish", 15,95,65,145),
       ("tree_round", 118,14,178,72), ("tree_pine", 178,18,218,76), ("rocks_waterfall", 162,92,218,142),
       ("cliff_edge", 95,165,200,212), ("water_pond", 110,55,165,95)],
 "4": [("chest", 95,75,150,125), ("seal", 72,222,128,272), ("wave_creature", 555,205,640,290),
       ("palm", 160,60,245,222), ("rocks", 340,80,470,200), ("sand_edge", 230,300,420,380), ("bush_flower", 280,150,350,215)],
 "2": [("cafe_house", 130,320,470,612), ("tables", 330,648,510,742), ("lamp", 100,140,160,310),
       ("tree", 250,130,350,290), ("fish", 758,548,842,622), ("bench_flower", 150,250,290,310), ("sign_board", 470,30,720,270)],
 "3": [("tailor_shop", 60,40,270,215), ("heart_lamp", 50,128,82,210), ("small_house", 340,50,470,210), ("bench_lamp", 268,90,290,165)],
}


def components(mask):
    H, W = mask.shape; seen = np.zeros_like(mask, bool); comps = []
    for y0 in range(H):
        for x0 in range(W):
            if mask[y0,x0] and not seen[y0,x0]:
                st=[(y0,x0)]; seen[y0,x0]=True; pts=[]
                while st:
                    y,x=st.pop(); pts.append((y,x))
                    for ny,nx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
                        if 0<=ny<H and 0<=nx<W and mask[ny,nx] and not seen[ny,nx]:
                            seen[ny,nx]=True; st.append((ny,nx))
                comps.append(pts)
    comps.sort(key=len, reverse=True); return comps

def sprite_metrics(crop, creps, cidx, is_sprite):
    """bbox of main object, outline closure, tones per hue family, light vector."""
    out = {}
    lab = rgb_to_oklab(crop.astype(np.float64)); L, C, h = lch(lab)
    bg = 0 if is_sprite else None
    if is_sprite:
        # background = most common colour (+ the ring: near white thin) -> object mask = not bg and not (near-white with L>0.9 touching border)
        mask = cidx != bg
        comps = components(mask)
        # drop components touching the crop border that are mostly white (the ring)
        Hc, Wc = mask.shape
        main = None
        for c in comps:
            ys=[p[0] for p in c]; xs=[p[1] for p in c]
            whites = np.mean([L[y,x] > 0.9 for y,x in c])
            if whites > 0.8: continue
            main = c; break
        if main:
            ys=[p[0] for p in main]; xs=[p[1] for p in main]
            out["bbox_wh"] = [max(xs)-min(xs)+1, max(ys)-min(ys)+1]
            m = np.zeros_like(mask); m[ys, xs] = True
            # boundary pixels of the object: object pixels with a 4-neighbour outside object
            pad = np.pad(m, 1); inner = pad[1:-1,1:-1]
            nb = (~pad[:-2,1:-1]) | (~pad[2:,1:-1]) | (~pad[1:-1,:-2]) | (~pad[1:-1,2:])
            boundary = inner & nb
            out["boundary_px"] = int(boundary.sum())
            out["boundary_dark_fraction(L<0.3)"] = round(float((L[boundary] < 0.3).mean()), 3)
            out["boundary_mean_L"] = round(float(L[boundary].mean()), 3)
            # interior dark lines (L<0.3 but not boundary)
            interior_dark = m & ~boundary & (L < 0.3)
            out["interior_dark_fraction_of_object"] = round(float(interior_dark.sum() / m.sum()), 3)
            out["object_px"] = int(m.sum())
            obj = m
        else:
            obj = mask
    else:
        obj = np.ones(crop.shape[:2], bool)
    # tones per hue family among object pixels (chromatic only)
    fam = {}
    sel = obj & (C > 0.03) & (L > 0.2) & (L < 0.97)
    hb = (h[sel] // 30 * 30).astype(int); Ls = L[sel]; Cs = C[sel]; hs = h[sel]
    for b in np.unique(hb):
        m2 = hb == b
        if m2.sum() < max(6, 0.01 * sel.sum()): continue
        # merge L levels within 0.06 using histogram peaks
        vals = np.sort(Ls[m2]); levels = []
        for v in vals:
            if not levels or v - levels[-1][-1] > 0.06: levels.append([v])
            else: levels[-1].append(v)
        levels = [lv for lv in levels if len(lv) >= max(3, 0.03 * m2.sum())]
        fam[int(b)] = {"px": int(m2.sum()), "levels_L": [round(float(np.mean(lv)), 2) for lv in levels],
                       "levels_n": [len(lv) for lv in levels],
                       "mean_h_by_level": [round(float(np.mean(hs[m2][np.isin(Ls[m2], lv)])), 0) for lv in levels],
                       "mean_C_by_level": [round(float(np.mean(Cs[m2][np.isin(Ls[m2], lv)])), 3) for lv in levels]}
    out["families"] = fam
    # light vector: biggest family, centroid(light) - centroid(dark)
    if fam:
        b = max(fam, key=lambda k: fam[k]["px"])
        m2 = sel & ((h // 30 * 30).astype(int) == b)
        ys, xs = np.nonzero(m2); Lv = L[m2]; med = np.median(Lv)
        li = Lv > med + 0.04; da = Lv < med - 0.04
        if li.sum() > 3 and da.sum() > 3:
            dx = xs[li].mean() - xs[da].mean(); dy = ys[li].mean() - ys[da].mean()
            out["light_vector_px"] = [round(float(dx), 1), round(float(dy), 1)]
            out["light_from_deg(0=right,90=up)"] = round(math.degrees(math.atan2(-dy, dx)), 0)
    return out

def main():
    out = sys.argv[1]; imgdir = sys.argv[2]; os.makedirs(out, exist_ok=True)
    report = {}
    for name, (sx, sy, ox, oy) in SCALES.items():
        img = np.asarray(Image.open(os.path.join(imgdir, name + ".webp")).convert("RGB"))
        H, W, _ = img.shape
        small = img[np.ix_(np.arange(oy+sy//2, H, sy), np.arange(ox+sx//2, W, sx))]
        # global merged palette
        reps = merged_palette(small, 0.03)
        g = {"merged_total": len(reps), "n90": coverage_count(reps,0.9), "n95": coverage_count(reps,0.95), "n99": coverage_count(reps,0.99)}
        # noise estimate: in the most common colour's neighbourhood, spread
        idx = quantize_to(small, reps[:min(len(reps), 256)])
        g["texture_after_merge"] = texture(idx)
        report[name] = {"global": g, "crops": {}}
        print(f"== {name} native {small.shape[1]}x{small.shape[0]} merged palette: {g}")
        # contact sheet
        tiles = []
        for (cn, x0, y0, x1, y1) in CROPS[name]:
            crop = small[y0:y1, x0:x1]
            creps = merged_palette(crop, 0.03)
            cidx = quantize_to(crop, creps)
            tex = texture(cidx)
            # colour table for colours covering 98%
            n98 = coverage_count(creps, 0.98)
            rows = []
            for r in creps[:n98]:
                L, C, h = lch(r[0]); rows.append(("#%02x%02x%02x" % tuple(r[1]), r[2], round(float(L),2), round(float(C),3), round(float(h))))
            metrics = sprite_metrics(crop, creps, cidx, cn.startswith(("creature","chest","seal","wave","fish")))
            report[name]["crops"][cn] = {"metrics": metrics, "box_native": [x0,y0,x1,y1], "size": [x1-x0, y1-y0], "merged_total": len(creps), "n95": coverage_count(creps,0.95), "n98": n98, "texture": tex, "colours": rows}
            print(f"  -- {cn} {x1-x0}x{y1-y0} px: colours total={len(creps)} n95={coverage_count(creps,0.95)} n98={n98} tex={tex}")
            print("     metrics:", json.dumps(metrics))
            k = 6 if max(x1-x0, y1-y0) <= 100 else (3 if max(x1-x0,y1-y0) <= 200 else 2)
            tile = Image.fromarray(crop).resize(((x1-x0)*k, (y1-y0)*k), Image.NEAREST)
            tiles.append((cn, tile, k))
            tile.save(os.path.join(out, f"{name}_{cn}_x{k}.png"))
        # contact sheet (simple row packing)
        maxw = 1600; x = y = 0; rowh = 0; placed = []
        for cn, t, k in tiles:
            if x + t.width > maxw and x > 0:
                x = 0; y += rowh + 24; rowh = 0
            placed.append((cn, t, x, y)); x += t.width + 8; rowh = max(rowh, t.height)
        sheet = Image.new("RGB", (maxw, y + rowh + 24), (40, 40, 40))
        d = ImageDraw.Draw(sheet)
        for cn, t, px, py in placed:
            sheet.paste(t, (px, py + 14)); d.text((px, py), cn, fill=(255,255,0))
        sheet.save(os.path.join(out, f"{name}_crops.png"))
    json.dump(report, open(os.path.join(out, "crops.json"), "w"), indent=1)
main()
