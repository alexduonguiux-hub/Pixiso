"""Repaint every hair drawing as 3-wide locks (an upper-left edge and a two-column body, read in segments) with lock_paint.paint: the S
constants of cast64.ts (HAIR_SHORT ... HAIR_WILD and the ponytail crown) and the per-view hair section of
gen_view_items.py (rewritten as literal lists). Run after changing a hair silhouette, then gen_view_items.py.
Idempotent: tones depend only on the silhouette."""
import re, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from lock_paint import paint
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CAST = f'{ROOT}/packages/sprite-kit/src/cast64.ts'
GEN = f'{ROOT}/scripts/research/gen_view_items.py'
def crown_x(rows, view):
    fill = [[c in 'hH#jJ' for c in r] for r in rows]
    top = next(y for y in range(len(rows)) if any(fill[y]))
    y = top + 1 if top + 1 < len(rows) and any(fill[top + 1]) else top
    xs = [x for x in range(len(rows[0])) if fill[y][x]]
    if view == 'W': return max(xs) - 2
    return (min(xs) + max(xs)) / 2
def paint_view(rows, view):
    return paint(rows, cx=crown_x(rows, view), sweep=0.5, W=3)
# ---- cast64 S hairs
cast = open(CAST).read()
for name in ('SHORT', 'SPIKY', 'SWEPT', 'BOB', 'CURLY', 'LONG', 'WILD', 'PONYTAIL'):
    m = re.search(r"const HAIR_%s = hov\((-?\d+), (-?\d+), \[\n((?:  '[^']*',\n)+)\]\)" % name, cast)
    if not m:
        m = re.search(r"const HAIR_%s: Overlay\[\] = \[\n  hov\(0, 0, \[\n((?:    '[^']*',\n)+)  \]\)" % name, cast)
        if not m: print('cast: no block for', name); continue
        rows = re.findall(r"'([^']*)'", m.group(1))
        new = paint_view(rows, 'S')
        cast = cast.replace(m.group(1), ''.join("    '%s',\n" % r for r in new)); print('cast', name, 'painted'); continue
    rows = re.findall(r"'([^']*)'", m.group(3))
    new = paint_view(rows, 'S')
    cast = cast.replace(m.group(3), ''.join("  '%s',\n" % r for r in new))
    print('cast', name, 'painted')
open(CAST, 'w').write(cast)
# ---- gen hair section
gen = open(GEN).read()
a = gen.index('# ---------------------------------------------------------------- hair')
b = gen.index('BUZZ = ')
section = gen[a:b]
ns = {}
def O(x, y, rows, head=True, rigid=False, under=False): return {'x': x, 'y': y, 'rows': list(rows), 'head': head, 'rigid': rigid, 'under': under}
ns['O'] = O
exec(section, ns)
HAIR = ns['HAIR']
def lit(o):
    kw = ''.join(f', {k}={v!r}' for k, v in (('head', o['head']), ('rigid', o['rigid']), ('under', o['under'])) if (k == 'head' and not v) or (k != 'head' and v))
    rows = ','.join("'%s'" % r for r in o['rows'])
    return f"O({o['x']},{o['y']}, [{rows}]{kw})"
out = ['# ---------------------------------------------------------------- hair',
       '# Literal per view; tones painted as locks (upper-left edge + two-column body, in segments) by lock_paint.py (W=3, sweep 0.5): keep the',
       '# silhouettes, edit tones by repainting rather than by hand.', 'HAIR = {}']
for style in ('SPIKY', 'CURLY', 'SWEPT', 'BOB', 'WILD', 'PONYTAIL', 'SHORT', 'LONG'):
    out.append(f"HAIR['{style}'] = {{")
    for view in ('SW', 'N', 'W', 'NW'):
        if view not in HAIR[style]: continue
        v = HAIR[style][view]
        items = v if isinstance(v, list) else [v]
        painted = []
        for i, o in enumerate(items):
            o = dict(o)
            big = max(len(r) for r in o['rows']) >= 12   # the ponytail tail (4 wide) keeps its tones
            if big: o['rows'] = paint_view(o['rows'], view)
            painted.append(o)
        body = ', '.join(lit(o) for o in painted)
        out.append(f"  '{view}': {body if len(painted) == 1 else '[' + body + ']'},")
    out.append('}')
new_section = '\n'.join(out) + '\n\n'
gen = gen[:a] + new_section + gen[b:]
open(GEN, 'w').write(gen)
print('gen section rewritten;', sum(len(v) for v in HAIR.values()), 'view entries')
