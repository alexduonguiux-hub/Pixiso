"""Pixel-art lint for the ASCII cell grids of sprite-kit (glyph = material + shade).

Checks the craft rules that the outline validator (closed outline, stray cells,
holes) does not cover; they are the classic pixel-art mistakes named by the
community (PixelJoint tutorial, Pedro Medeiros' notes) and formalised in
"Pixel Fixer" (TU Delft, 2025: banding = pairs of aligned value segments,
pillow shading = concentric bands following the outline):

- doubles:  a 2x2 block of line cells on the silhouette (the 1 px outline
            doubled; two parts touching inside may share a 2-wide line);
- jaggies:  on the silhouette, a shorter step run wedged between two equal
            longer runs (2-1-2, 3-1-3, 3-2-3) or a 2 among 1s on a diagonal
            (1-2-1): the curve stutters;
- banding:  two stacked (or side by side) runs of different shades of one
            material with exactly the same extent, both at least 3 long: the
            value edge reads as a drawn line (a dome's bands grow by one per
            row and pass);
- outline band: a 1-cell-wide run of one shade hugging the outline for 7+
            cells while the cells on its other side are another shade: a
            stripe parallel to the line (what the user called "đường mờ");
- pillow (opt-in): shadow cells touching the outline on its lit side (the
            outline cell is above or to the left) for a run of 7+;
- orphans (opt-in): clusters of 1 or 2 cells of one glyph inside a material
            (eye highlights and wound marks are allowed; the reference uses
            many 1-2 cell accents, so this is informational).

Thresholds are calibrated so the transcribed reference mannequin passes.

Usage: python3 -I scripts/research/pixel_lint.py test-output/view_figures.json [kinds] [-q]
       (lints the standing figures and every pose body), or pass
       packages/sprite-kit/src/hero64.poses.views.ts to lint every generated view;
       `-q` hides clean figures; `pnpm qa:pixel` runs both. Or import `lint(rows)`.
"""
import json, sys
from collections import defaultdict

LINE = 'o'
EMPTY = '.'
# glyph -> (material, shade) ; shade 0 = line, 1 = mid, 2 = shadow, 3 = highlight, 4 = deep shadow, 5 = bright highlight
GLYPHS = {
    's': ('skin', 1), 'S': ('skin', 2), '$': ('skin', 3),
    'h': ('hair', 1), 'H': ('hair', 2), '#': ('hair', 3),
    'c': ('cloth', 1), 'C': ('cloth', 2), '^': ('cloth', 3),
    'k': ('cloth2', 1), 'K': ('cloth2', 2), '&': ('cloth2', 3),
    'p': ('pants', 1), 'P': ('pants', 2), '+': ('pants', 3),
    'b': ('boots', 1), 'B': ('boots', 2), '!': ('boots', 3),
    'm': ('metal', 1), 'M': ('metal', 2), 'w': ('metal', 3),
    'l': ('leather', 1), 'L': ('leather', 2), '|': ('leather', 3),
    'd': ('wood', 1), 'D': ('wood', 2), '%': ('wood', 3),
    'a': ('accent', 1), 'A': ('accent', 2), '*': ('accent', 3),
    'e': ('eye', 1), 'E': ('eye', 2), 'x': ('white', 1),
    # deep shadow (4) and bright highlight (5): the second letter pair of each material
    'z': ('skin', 4), 'Z': ('skin', 5), 'j': ('hair', 4), 'J': ('hair', 5), 'v': ('cloth', 4), 'V': ('cloth', 5),
    'q': ('cloth2', 4), 'Q': ('cloth2', 5), 'y': ('pants', 4), 'Y': ('pants', 5), 'g': ('boots', 4), 'G': ('boots', 5),
    'n': ('metal', 4), 'N': ('metal', 5), 'i': ('leather', 4), 'I': ('leather', 5), 't': ('wood', 4), 'T': ('wood', 5),
    'r': ('accent', 4), 'R': ('accent', 5),
}
# glyphs that may stand alone (eye highlight, teeth, wound and stain marks)
ORPHAN_OK = set('exdDa*')


def _mat(c):
    return GLYPHS.get(c, (None, None))


def lint(rows, kinds=None):
    """Return a list of (kind, x, y, note) warnings for an ASCII figure."""
    H = len(rows); W = len(rows[0])
    at = lambda x, y: rows[y][x] if 0 <= x < W and 0 <= y < H else EMPTY
    out = []
    default = {'doubles', 'jaggies', 'banding', 'outline-band'}   # pillow and orphans are opt-in (noisy at 17 px)
    want = lambda k: (k in default) if kinds is None else (k in kinds)

    # ---- doubles: 2x2 blocks of line cells
    if want('doubles'):
        # calibrated on the transcribed reference: two touching parts (arm against torso)
        # may share a 2-wide line inside; only the silhouette line must stay 1 px
        for y in range(H - 1):
            for x in range(W - 1):
                block = [(x + dx, y + dy) for dx in (0, 1) for dy in (0, 1)]
                if all(at(*c) == LINE for c in block) and any(
                    at(cx + dx, cy + dy) == EMPTY for cx, cy in block for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                ):
                    out.append(('doubles', x, y, '2x2 line block on the silhouette'))

    # ---- jaggies: step runs along the silhouette
    if want('jaggies'):
        out += _jaggies(rows, at, W, H)

    # ---- banding: aligned runs of two shades of one material
    if want('banding'):
        out += _banding(rows, at, W, H)

    # ---- outline band and pillow shading
    if want('outline-band') or want('pillow'):
        out += _outline_bands(rows, at, W, H, want)

    # ---- orphans: clusters of 1-2 cells of one glyph
    if want('orphans'):
        out += _orphans(rows, at, W, H)
    return out


def _runs(seq):
    """[(value, start, length)] for a sequence."""
    runs = []
    for i, v in enumerate(seq):
        if runs and runs[-1][0] == v:
            runs[-1] = (v, runs[-1][1], runs[-1][2] + 1)
        else:
            runs.append((v, i, 1))
    return runs


def _jaggies(rows, at, W, H):
    """Walk the outer contour of each silhouette; report a run wedged between two equal
    longer-or-shorter runs (x, y, x with y != x) inside one monotone slope."""
    out = []
    # silhouette mask: any non-empty cell
    solid = [[rows[y][x] != EMPTY for x in range(W)] for y in range(H)]
    # Horizontal scan: for each row, the leftmost and rightmost solid x give the left and right
    # profile; the step sequence of a profile is the run-length sequence of equal x values.
    for side in ('left', 'right'):
        prof = []
        for y in range(H):
            xs = [x for x in range(W) if solid[y][x]]
            prof.append((min(xs) if side == 'left' else max(xs)) if xs else None)
        # split into segments of consecutive defined rows
        seg = []
        for y, v in enumerate(prof + [None]):
            if v is None:
                if len(seg) >= 4:
                    out += _stutter(seg, side)
                seg = []
            else:
                seg.append((y, v))
    return out


def _stutter(seg, side):
    """seg: [(y, x)] of a profile. Runs of equal x = vertical steps; between runs the
    profile moves by dx. A run of length b between runs of length a and a (a != b)
    where the profile keeps moving the same way is a jaggy."""
    out = []
    runs = _runs([x for _, x in seg])          # (x, start_index, length)
    for i in range(1, len(runs) - 1):
        a, b, c = runs[i - 1], runs[i], runs[i + 1]
        d1 = b[0] - a[0]; d2 = c[0] - b[0]
        if d1 == 0 or d2 == 0 or (d1 > 0) != (d2 > 0):
            continue                           # not one monotone slope
        if abs(d1) > 1 or abs(d2) > 1:
            continue                           # steep steps: not a drawn curve
        if a[2] == c[2] and (b[2] < a[2] or (a[2] == 1 and b[2] == 2)) and max(a[2], b[2], c[2]) <= 4:
            y = seg[b[1]][0]
            out.append(('jaggies', b[0], y, f'{side} profile steps {a[2]}-{b[2]}-{c[2]}'))
    return out


def _banding(rows, at, W, H):
    out = []
    # horizontal runs per row
    def runs_row(y):
        return [(v, s, l) for v, s, l in _runs(list(rows[y])) if v not in (LINE, EMPTY)]
    def runs_col(x):
        return [(v, s, l) for v, s, l in _runs([rows[y][x] for y in range(H)]) if v not in (LINE, EMPTY)]
    seen = set()
    for y in range(H - 1):
        a_runs = runs_row(y); b_runs = runs_row(y + 1)
        for v1, s1, l1 in a_runs:
            if l1 < 3: continue
            m1, sh1 = _mat(v1)
            for v2, s2, l2 in b_runs:
                if l2 < 3 or v2 == v1: continue
                m2, sh2 = _mat(v2)
                if m1 != m2: continue
                if s1 == s2 and l1 == l2:
                    key = ('h', y, s1)
                    if key in seen: continue
                    seen.add(key)
                    out.append(('banding', s1, y, f'rows {y}/{y + 1}: {v1}x{l1} over {v2}x{l2}'))
    for x in range(W - 1):
        a_runs = runs_col(x); b_runs = runs_col(x + 1)
        for v1, s1, l1 in a_runs:
            if l1 < 3: continue
            m1, sh1 = _mat(v1)
            for v2, s2, l2 in b_runs:
                if l2 < 3 or v2 == v1: continue
                m2, sh2 = _mat(v2)
                if m1 != m2: continue
                if s1 == s2 and l1 == l2:
                    key = ('v', x, s1)
                    if key in seen: continue
                    seen.add(key)
                    out.append(('banding', x, s1, f'cols {x}/{x + 1}: {v1}x{l1} beside {v2}x{l2}'))
    return out


def _outline_bands(rows, at, W, H, want):
    """Runs of one shade along a line cell, 1 cell wide, with another shade of the same
    material on the far side (outline band); shadow runs on the lit side of the line (pillow)."""
    out = []
    # vertical bands: cell (x,y) with line at x-1 (left) or x+1 (right)
    for x in range(W):
        for side, lx, inner in (('L', x - 1, x + 1), ('R', x + 1, x - 1)):
            col = []
            for y in range(H):
                c = at(x, y)
                m, sh = _mat(c)
                ok = m is not None and at(lx, y) == LINE
                col.append((c, m, sh, at(inner, y)) if ok else None)
            out += _band_runs(col, lambda y: (x, y), 'col', side, want)
    # horizontal bands: line above or below
    for y in range(H):
        for side, ly, inner in (('T', y - 1, y + 1), ('B', y + 1, y - 1)):
            row = []
            for x in range(W):
                c = at(x, y)
                m, sh = _mat(c)
                ok = m is not None and at(x, ly) == LINE
                row.append((c, m, sh, at(x, inner)) if ok else None)
            out += _band_runs(row, lambda x: (x, y), 'row', side, want)
    return out


def _band_runs(cells, pos, axis, side, want):
    out = []
    i = 0
    n = len(cells)
    while i < n:
        if cells[i] is None:
            i += 1; continue
        j = i
        c = cells[i][0]
        while j < n and cells[j] is not None and cells[j][0] == c:
            j += 1
        length = j - i
        if length >= 7:
            m, sh = cells[i][1], cells[i][2]
            inner = [cells[k][3] for k in range(i, j)]
            inner_same_mat = [GLYPHS.get(v, (None, None))[0] == m and v != c for v in inner]
            x, y = pos(i)
            if want('outline-band') and sum(inner_same_mat) >= length - 1:
                out.append(('outline-band', x, y, f'{c}x{length} along the line ({axis} {side}), other shade inside'))
            # pillow: shadow against the line on its lit side (line above or to the left)
            if want('pillow') and sh == 2 and side in ('L', 'T'):
                out.append(('pillow', x, y, f'shadow {c}x{length} on the lit side of the line ({axis} {side})'))
        i = j
    return out


def _orphans(rows, at, W, H):
    out = []
    seen = set()
    for y in range(H):
        for x in range(W):
            c = at(x, y)
            if c in (LINE, EMPTY) or c in ORPHAN_OK or (x, y) in seen:
                continue
            # flood the 4-connected cluster of this glyph
            stack = [(x, y)]; cl = []
            while stack:
                px, py = stack.pop()
                if (px, py) in seen: continue
                seen.add((px, py)); cl.append((px, py))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if at(px + dx, py + dy) == c and (px + dx, py + dy) not in seen:
                        stack.append((px + dx, py + dy))
            if len(cl) <= 2:
                out.append(('orphans', x, y, f'{c} cluster of {len(cl)}'))
    return out


QUIET = False  # -q: print only figures that have warnings


def summarize(name, warnings, show=8):
    if QUIET and not warnings:
        return
    by = defaultdict(list)
    for k, x, y, note in warnings:
        by[k].append((x, y, note))
    parts = [f'{k}={len(v)}' for k, v in sorted(by.items())]
    print(f'{name}: ' + (', '.join(parts) if parts else 'clean'))
    for k, v in sorted(by.items()):
        for x, y, note in v[:show]:
            print(f'    {k} ({x},{y}) {note}')
        if len(v) > show:
            print(f'    ... {len(v) - show} more {k}')


def lint_views_ts(path, kinds=None):
    """Lint every `rows: [...]` figure of the generated hero64.poses.views.ts."""
    import re
    src = open(path).read()
    for pm in re.finditer(r'^  (\w+): \{', src, re.M):
        pose = pm.group(1)
        end = src.find('\n  },', pm.end())
        block = src[pm.end():end]
        for vm in re.finditer(r'(\w+): \{\s*rows: \[([^\]]*)\]', block):
            rows = re.findall(r"'([^']*)'", vm.group(2))
            summarize(f'{pose}@{vm.group(1)}', lint(rows, kinds))


if __name__ == '__main__':
    QUIET = '-q' in sys.argv
    args = [a for a in sys.argv[1:] if a != '-q']
    kinds = set(args[1].split(',')) if len(args) > 1 and args[1] != '-' else None
    if args[0].endswith('.ts'):
        lint_views_ts(args[0], kinds)
        sys.exit(0)
    fig = json.load(open(args[0]))
    for v in ('S', 'SW', 'W', 'NW', 'N'):
        summarize(f'stand {v}', lint(fig[v], kinds))
    for k in ('fat_S', 'brute_S'):
        if k in fig:
            summarize(k, lint(fig[k], kinds))
    for pid, p in fig.get('poses', {}).items():
        summarize(f'pose {pid} (body)', lint(p['body'], kinds))
