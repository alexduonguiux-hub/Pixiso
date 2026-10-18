"""Lone pixels, counted the way the third independent review did (B4).

A lone pixel is an opaque pixel with no 8-neighbour of the same colour that also stands out: it
differs from every neighbour by >= 0.18 L (OKLab) or is itself saturated (C >= 0.12). Outline-dark
pixels (L <= 0.2) and the eye/white cells are ignored. Reads the sprites the scorer dumped
(`pnpm qa:score` writes test-output/score/sprites.json and sprites/*.png) and reports per sprite,
with cell coordinates in sprite space and the cell's ASCII glyph, worst sprites first.

Usage: python3 -I scripts/research/lone_pixels.py [S,SW,W|all] [top]
"""
import json
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from score import lch, rgb_to_oklab  # noqa: E402

SCORE_DIR = os.path.join(ROOT, 'test-output', 'score')


def lone_cells(e):
    im = Image.open(os.path.join(SCORE_DIR, 'sprites', e['png'])).convert('RGBA')
    a = np.array(im)
    rgb = a[..., :3].astype(float)
    alpha = a[..., 3] > 0
    lab = rgb_to_oklab(rgb.reshape(-1, 3))
    L, C, _ = lch(lab)
    L = L.reshape(alpha.shape)
    C = C.reshape(alpha.shape)
    H, W = alpha.shape
    rows = e['rows']
    out = []
    for y in range(H):
        for x in range(W):
            if not alpha[y, x] or L[y, x] <= 0.2:
                continue
            g = rows[y][x] if y < len(rows) and x < len(rows[y]) else '?'
            if g in 'eEx':
                continue
            same = False
            mind = 9.0
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if dx == 0 and dy == 0:
                        continue
                    X, Y = x + dx, y + dy
                    if 0 <= X < W and 0 <= Y < H and alpha[Y, X]:
                        if (rgb[Y, X] == rgb[y, x]).all():
                            same = True
                        mind = min(mind, abs(L[Y, X] - L[y, x]))
            if not same and (mind >= 0.18 or C[y, x] >= 0.12):
                out.append((x, y, g))
    return out


def main():
    views = sys.argv[1].split(',') if len(sys.argv) > 1 else ['S']
    top = int(sys.argv[2]) if len(sys.argv) > 2 else 40
    sprites = json.load(open(os.path.join(SCORE_DIR, 'sprites.json')))
    report = []
    for e in sprites:
        if 'all' not in views and e['view'] not in views:
            continue
        cells = lone_cells(e)
        report.append((len(cells), e['id'], e['view'], cells))
    report.sort(reverse=True)
    total = sum(r[0] for r in report)
    hit = sum(1 for r in report if r[0])
    print(f"{views}: {total} lone pixels in {hit}/{len(report)} sprites")
    for n, i, v, cells in report[:top]:
        if n:
            print(f'{n:3d} {i}@{v}: {cells[:16]}')


if __name__ == '__main__':
    main()
