"""Repaint hair fill as continuous locks: strips W wide radiating from the crown point, each with an edge line
(# on the lit left half, H on the right half), the far-right lock in shadow, two bright cells at the crown,
deep j where locks meet the fringe tips. Outline (o), gaps (.) and rows with gaps between fill cells
(fringe tips, sideburns) keep their glyphs. Usage: import and call paint(rows, cx, sweep, W, top)."""
HAIR = 'hH#jJ'
def paint(rows, cx=None, sweep=0.5, W=2, lit_edge='#', shadow_edge='H', solid_only=True, far_shadow=True, bright=2):
    H = len(rows); Wd = len(rows[0])
    fill = [[c in HAIR for c in r] for r in rows]
    top = next(y for y in range(H) if any(fill[y]))
    if cx is None:
        xs = [x for x in range(Wd) if fill[top + 1][x]] if top + 1 < H else [x for x in range(Wd) if fill[top][x]]
        cx = (min(xs) + max(xs)) / 2
    def solid(y):
        xs = [x for x in range(Wd) if fill[y][x]]
        return bool(xs) and all(fill[y][x] or rows[y][x] == 'o' for x in range(min(xs), max(xs) + 1))
    def k_of(x, y):
        d = x - cx
        return (1 if d >= 0 else -1) * int((abs(d) + sweep * (y - top)) // W + 1)
    out = []
    kmax = None
    ks = [k_of(x, y) for y in range(H) for x in range(Wd) if fill[y][x]]
    kmax = max(ks); kmin = min(ks)
    for y in range(H):
        r = list(rows[y])
        if not solid(y) and solid_only: out.append(rows[y]); continue
        for x in range(Wd):
            if not fill[y][x]: continue
            k = k_of(x, y)
            right = k > 0
            # locks are W-wide bands of alternating tone (the reference's 2-wide bands): light/mid on the lit
            # half, mid/shadow on the shadow half, the far-right lock in shadow; a sweep band one cell thick
            # crosses every lock (bright on the lit half, deep on the shadow half) and cuts each band in two
            band = (y - top) == 3 + int((x - cx) // 4)
            if band and (y - top) >= 2: tone = 'J' if x < cx else 'j'
            elif far_shadow and k == kmax: tone = 'H'
            elif right: tone = 'H' if k % 2 == 0 else 'h'
            else: tone = '#' if (-k) % 2 == 1 else 'h'
            r[x] = tone
        out.append(''.join(r))
    # bright crown: the two top-left-most fill cells of the second fill row
    if False:
        y = top + 1 if top + 1 < H else top
        xs = [x for x in range(Wd) if fill[y][x] and out[y][x] == 'h' or (fill[y][x] and out[y][x] == '#')]
        xs = [x for x in range(Wd) if fill[y][x]][:bright]
        r = list(out[y])
        for x in xs:
            if x < cx: r[x] = 'J'
        out[y] = ''.join(r)
    return out
if __name__ == '__main__':
    BOB=['......ooooo......','....oo#J#hhoo....','...o##h#hhHhho...','..o##hhh#hhHhho..','..o#hh#hhhHhhHo..','.o#hhh#hhhHhhhHo.','.ohh#hhhhHhhhjHo.','.ohhhHhhHhhhHjjo.','.ohhH..HHj..Hjjo.','.o#h.........hHo.','.ohh.........hHo.','.oHj.........jHo.','..oHo.......oHo..','...o.........o...']
    for sweep in (0.5,):
        print('sweep', sweep)
        for a,b in zip(BOB, paint(BOB, sweep=sweep)): print('  ', a, ' -> ', b)
