"""Repaint hair fill as locks three cells wide radiating from the parting with a 0.5 cell/row sweep (the
reference head: 5–6 locks). A lock is two body columns and one edge column on its upper-left side, read
along its length: a light crown, then a light edge over a mid body, lower down a light edge over a shadow
body, on a tall mass a mid edge over a deep body, and a bottom row of mid edge, shadow body and one deep cell where the locks meet; on the shadow side of the head
(a sphere lit from the top left) each pair is one tone darker; a cell against the outline is never darker
than mid (lit side) or shadow (shadow side). Rows with gaps (fringe tips, hanging
strands) are painted per run of cells: the run's left column is its edge, tips are mid over shadow,
strands change pair every three rows. Two bright cells left of the parting. The outline (o), gaps (.) and
a single cell takes the edge tone. Tone regions stay small (the scorer's flat-hair rule: ≤ 13.8 % of the hair).
Usage: paint(rows, cx, sweep, W)."""
HAIR = 'hH#jJ'
LOCK_W = 3
# (edge, body) per segment of the lock, lit side and shadow side
SEG_LIT = [('#', 'h'), ('#', 'H'), ('h', 'j')]
SEG_SHADOW = [('h', 'H'), ('h', 'j'), ('j', 'H')]
SEG_START = [2, 5, 9]
STRAND_LIT = [('#', 'h'), ('h', 'H'), ('H', 'j')]
STRAND_SHADOW = [('h', 'H'), ('H', 'j'), ('j', 'H')]
def paint(rows, cx=None, sweep=0.5, W=LOCK_W, solid_only=True):
    H = len(rows); Wd = len(rows[0])
    fill = [[c in HAIR for c in r] for r in rows]
    def solid(y):
        # a row of the hair mass: at least three fill cells with no gap between them
        xs = [x for x in range(Wd) if fill[y][x]]
        return len(xs) >= 3 and all(fill[y][x] or rows[y][x] == 'o' for x in range(min(xs), max(xs) + 1))
    # the mass: the first run of consecutive solid rows (spikes above it and anything below it are runs)
    top = next((y for y in range(H) if solid(y)), next(y for y in range(H) if any(fill[y])))
    bottom = top
    while bottom + 1 < H and solid(bottom + 1): bottom += 1
    Hh = bottom - top + 1
    if cx is None:
        xs = [x for x in range(Wd) if fill[min(top + 1, H - 1)][x]] or [x for x in range(Wd) if fill[top][x]]
        cx = (min(xs) + max(xs)) / 2
    R = max(1.0, max(abs(x - cx) for y in range(H) for x in range(Wd) if fill[y][x]))
    def lit(x, y):
        return (x - cx) / R + 0.5 * (y - top) / Hh <= 0.6
    def lock(x, y):
        # distance from the parting (the first column on either side is 0) plus the sweep
        u = (cx - x - 0.5 if x < cx else x - cx) + sweep * (y - top)
        k, p = int(u) // W, int(u) % W
        # p counts from the parting outward; the upper-left edge is the outer column on the left side and
        # the inner one on the right side
        return k, (W - 1 - p) if x >= cx else p
    def seg(t):
        return max(i for i, s in enumerate(SEG_START) if t >= s)
    def tone(p, t, L):
        edge = p == W - 1
        # the bottom row sits on the brow line: a mid edge, a shadow body and one deep cell where the locks
        # meet, never a deep row that merges with the outline (dark hair: deep L 0.17 over a line at 0.10)
        if t == Hh - 1 and t >= 2: return 'h' if edge else 'H' if p == 1 else 'j'
        if t < 2: return ('h' if p == 0 else '#') if L else ('H' if p == 0 else 'h')
        e, b = (SEG_LIT if L else SEG_SHADOW)[seg(t)]
        return e if edge else b
    out = []
    for y in range(H):
        r = list(rows[y])
        if top <= y <= bottom:
            xs = [x for x in range(Wd) if fill[y][x]]
            for x in xs:
                k, p = lock(x, y)
                L = lit(x, y)
                c = tone(p, y - top, L)
                # a cell against the outline is never a dark stripe hugging it (dark hair: shadow L 0.20 and
                # deep 0.17 next to a line at 0.10 read as a thick or broken outline)
                if x in (xs[0], xs[-1]): c = {'H': 'h', 'j': 'h'}.get(c, c) if L else {'j': 'H'}.get(c, c)
                r[x] = c
            out.append(''.join(r)); continue
        if y < top or not solid_only: out.append(rows[y]); continue
        # below the mass: tips and strands, one run of fill cells at a time
        x = 0
        while x < Wd:
            if not fill[y][x]: x += 1; continue
            x0 = x
            while x < Wd and fill[y][x]: x += 1
            n = x - x0
            below = sum(1 for dy in (1, 2) if y + dy < H and any(fill[y + dy][xx] for xx in range(x0, x)))
            L = lit((x0 + x - 1) / 2, y)
            if below >= 2 or y - top - Hh >= 2:
                e, b = (STRAND_LIT if L else STRAND_SHADOW)[(y - top - Hh) // 3 % 3]
            else:
                e, b = ('h', 'H') if L else ('H', 'j')
            if n >= 4:
                # a wide run (hair hanging behind the neck) keeps the lock geometry of the mass
                for xx in range(x0, x): r[xx] = e if lock(xx, y)[1] == W - 1 else b
            else:
                r[x0] = e
                for xx in range(x0 + 1, x): r[xx] = b
        out.append(''.join(r))
    y = top + 1
    if y <= bottom:
        r = list(out[y])
        for x in (int(cx) - 2, int(cx) - 1):
            if 0 <= x < Wd and fill[y][x]: r[x] = 'J'
        out[y] = ''.join(r)
    return out
def largest_flat(rows):
    """Largest 4-connected same-glyph region among hair fill cells (the scorer's flat metric, on glyphs)."""
    H = len(rows); Wd = len(rows[0]); seen = set(); best = (0, '')
    for y in range(H):
        for x in range(Wd):
            if rows[y][x] not in HAIR or (x, y) in seen: continue
            g = rows[y][x]; st = [(x, y)]; seen.add((x, y)); n = 0
            while st:
                a, b = st.pop(); n += 1
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    X, Y = a + dx, b + dy
                    if 0 <= X < Wd and 0 <= Y < H and (X, Y) not in seen and rows[Y][X] == g:
                        seen.add((X, Y)); st.append((X, Y))
            if n > best[0]: best = (n, g)
    return best
if __name__ == '__main__':
    import sys
    BOB=['......ooooo......','....oo#J#hhoo....','...o##h#hhHhho...','..o##hhh#hhHhho..','..o#hh#hhhHhhHo..','.o#hhh#hhhHhhhHo.','.ohh#hhhhHhhhjHo.','.ohhhHhhHhhhHjjo.','.ohhH..HHj..Hjjo.','.o#h.........hHo.','.ohh.........hHo.','.oHj.........jHo.','..oHo.......oHo..','...o.........o...']
    SHORT=['......ooooo......','....ooh#hhHoo....','...o#hh#hhHHho...','...oJJJJhHHhho...','..oh##hhjjjjhHo..','..ohh##hHHhhjjo..','..ohh##hHHhhHHo..','..o#hh##HhhHHHo..','..HhH..HHj..HjH..','...#.............']
    BUZZ=['......ooooo......','....oohhhhhoo....','...ohhhhhhhhho...','...ohhhhhhhhho...','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..']
    W = int(sys.argv[1]) if len(sys.argv) > 1 else LOCK_W
    for name, rows in (('BOB', BOB), ('SHORT', SHORT), ('BUZZ', BUZZ)):
        p = paint(rows, W=W); n = sum(c in HAIR for r in rows for c in r)
        print(name, 'fill', n, 'largest flat', largest_flat(p))
        for a,b in zip(rows, p): print('  ', a, ' -> ', b)
