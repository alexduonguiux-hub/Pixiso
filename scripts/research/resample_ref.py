"""Resample a region of a scaled-up pixel-art image back to its 1x grid.

Fits the pixel pitch (within [lo, hi]) and phase from colour transitions, then
samples each cell centre. Usage:
  python3 -I resample_ref.py IMG y0 y1 x0 x1 OUT.png [lo hi]
Writes OUT.png (1x) and OUT_x8.png (nearest x8 preview).
"""
import sys
import numpy as np
from PIL import Image

path = sys.argv[1]
y0, y1, x0, x1 = [int(v) for v in sys.argv[2:6]]
out = sys.argv[6]
lo = float(sys.argv[7]) if len(sys.argv) > 7 else 2.1
hi = float(sys.argv[8]) if len(sys.argv) > 8 else 2.6
rgb = np.array(Image.open(path).convert('RGB')).astype(float)
reg = rgb[y0:y1, x0:x1]
gray = reg.mean(axis=2)
gx = np.abs(np.diff(gray, axis=1)).sum(axis=0)
gy = np.abs(np.diff(gray, axis=0)).sum(axis=1)

def fit(sig, lo, hi):
    n = len(sig); best = (-1, 0, 0)
    step = max(0.002, (hi - lo) / 400)
    for p in np.arange(lo, hi, step):
        for ph in np.arange(0, p, max(0.05, p / 40)):
            b = np.arange(ph, n, p)
            idx = np.floor(b).astype(int); idx = idx[idx < n]
            score = sig[idx].sum() / len(idx)
            if score > best[0]: best = (score, p, ph)
    return best

sx, px, phx = fit(gx, lo, hi)
sy, py, phy = fit(gy, lo, hi)
print('x pitch', round(px, 3), 'phase', round(phx, 2), '| y pitch', round(py, 3), 'phase', round(phy, 2))
cols = np.arange(phx + px / 2, reg.shape[1], px)
rows = np.arange(phy + py / 2, reg.shape[0], py)
small = np.zeros((len(rows), len(cols), 3))
r = max(1, int(min(px, py) // 4))   # average a window around the centre (jpeg/webp noise)
for j, cy in enumerate(rows):
    for i, cx in enumerate(cols):
        yy = int(round(cy)); xx = int(round(cx))
        small[j, i] = reg[max(yy - r, 0):yy + r + 1, max(xx - r, 0):xx + r + 1].reshape(-1, 3).mean(axis=0)
img = Image.fromarray(small.astype(np.uint8))
img.save(out)
img.resize((small.shape[1] * 8, small.shape[0] * 8), Image.NEAREST).save(out.replace('.png', '_x8.png'))
print('out', small.shape[1], 'x', small.shape[0])
