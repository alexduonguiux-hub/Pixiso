"""2x2 line blocks that appear only once a figure is dressed (D-094): the undressed figure's own doubles
(limbs touching) are aligned under the dressed sprite and subtracted, so what is left came from a hat, a
seam, an accessory or a filled cell. The ones that remain by design are where an accessory touches the
body (a pouch on the hip, a backpack on the back, the bat); anything else is a drawing to fix.

Usage: python3 -I scripts/research/doubles_dressed.py [sprites.json]   (after `pnpm qa:1x`)
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def blocks(rows):
    H = len(rows); out = set()
    at = lambda x, y: rows[y][x] if 0 <= y < H and 0 <= x < len(rows[y]) else '.'
    for y in range(H - 1):
        for x in range(max(len(rows[y]), len(rows[y + 1])) - 1):
            if at(x, y) == 'o' and at(x + 1, y) == 'o' and at(x, y + 1) == 'o' and at(x + 1, y + 1) == 'o': out.add((x, y))
    return out

def align(base, rows):
    """Offset of the undressed figure inside the dressed canvas (dress() grows the canvas for hair and props):
    the placement where most of the figure's cells land on opaque cells."""
    bh = len(base); bw = max(len(r) for r in base); H = len(rows); W = max(len(r) for r in rows)
    bcells = [(x, y) for y, r in enumerate(base) for x, c in enumerate(r) if c != '.']
    best = None
    for oy in range(0, H - bh + 1):
        for ox in range(0, W - bw + 1):
            n = sum(1 for x, y in bcells if x + ox < len(rows[y + oy]) and rows[y + oy][x + ox] != '.')
            if best is None or n > best[0]: best = (n, ox, oy)
    return best[1], best[2]

def main():
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'test-output', 'score', 'sprites.json')
    total = 0
    for e in json.load(open(path)):
        ox, oy = align(e['baseRows'], e['rows'])
        new = sorted(blocks(e['rows']) - {(x + ox, y + oy) for x, y in blocks(e['baseRows'])})
        if new:
            total += len(new)
            print(f"{e['id']}@{e['view']}: +{len(new)} {new}")
    print('dressing-made 2x2 line blocks:', total)

if __name__ == '__main__':
    main()
