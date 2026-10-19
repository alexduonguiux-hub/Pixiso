"""Inventory of the 1x gauge's fragments (D-093): every 4-connected region of one material under three
cells, grouped by material, by the glyphs it is made of and by the materials around it, with examples, so a
fix can target the rule that draws them rather than single characters.

Usage: python3 -I scripts/research/frag_inventory.py [view]   (after `pnpm qa:1x`, which writes sprites.json)
"""
import collections, json, os, sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MAT = {}
for m, g in [('skin', 'sS$zZ'), ('hair', 'hH#jJ'), ('cloth', 'cC^vV'), ('cloth2', 'kK&qQ'), ('pants', 'pP+yY'),
             ('boots', 'bB!gG'), ('metal', 'mMwnN'), ('leather', 'lL|iI'), ('wood', 'dD%tT'), ('accent', 'aA*rR'),
             ('line', 'o'), ('eye', 'eE'), ('white', 'x')]:
    for ch in g: MAT[ch] = m
MAT = collections.defaultdict(lambda: 'other', MAT)
SKIP = {'line', 'eye', 'white', 'other'}

def main():
    d = json.load(open(os.path.join(ROOT, 'test-output', 'score', 'sprites.json')))
    want_view = sys.argv[1] if len(sys.argv) > 1 else None
    frags = []
    for e in d:
        if want_view and e['view'] != want_view: continue
        rows = e['rows']; H = len(rows)
        at = lambda x, y: rows[y][x] if 0 <= y < H and 0 <= x < len(rows[y]) else '.'
        seen = set()
        for y in range(H):
            for x in range(len(rows[y])):
                c = at(x, y)
                if c == '.' or (x, y) in seen or MAT[c] in SKIP: continue
                m = MAT[c]; comp = []; st = [(x, y)]
                while st:
                    px, py = st.pop()
                    if (px, py) in seen or at(px, py) == '.' or MAT[at(px, py)] != m: continue
                    seen.add((px, py)); comp.append((px, py))
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)): st.append((px + dx, py + dy))
                if len(comp) < 3:
                    around = Counter()
                    for px, py in comp:
                        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                            q = at(px + dx, py + dy)
                            if q != '.' and (px + dx, py + dy) not in comp: around[MAT[q]] += 1
                    ctx = ','.join(k for k, _ in around.most_common(2))
                    glyphs = ''.join(sorted(at(px, py) for px, py in comp))
                    frags.append((e['id'], e['view'], m, len(comp), glyphs, ctx, comp[0]))
    print('total', len(frags))
    bym = Counter(f[2] for f in frags); print('by material', bym.most_common())
    print('by id', Counter(f[0] for f in frags).most_common(12))
    print()
    for m, _ in bym.most_common():
        print('==', m)
        sig = Counter((f[4], f[5]) for f in frags if f[2] == m)
        for (g, ctx), n in sig.most_common(8):
            ex = [f for f in frags if f[2] == m and f[4] == g and f[5] == ctx][:3]
            print(f'  {n:3d}  glyphs={g:3s} around={ctx:16s} e.g. ' + '; '.join(f'{f[0]}@{f[1]}{f[6]}' for f in ex))

if __name__ == '__main__':
    main()
