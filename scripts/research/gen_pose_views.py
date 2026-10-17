"""Zombie poses in the views other than S (W, N, SW, NW): hand-authored bodies
with that view's base head stamped on, plus the clothes regions. Validates
every figure (closed outline, no stray line cell) and emits
packages/sprite-kit/src/hero64.poses.views.ts.

Input: test-output/view_figures.json (DUMP=... pnpm exec tsx scripts/hero-views.ts).
"""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FIG = json.load(open(sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else os.path.join(ROOT, 'test-output', 'view_figures.json')))
OUT = os.path.join(ROOT, 'packages', 'sprite-kit', 'src', 'hero64.poses.views.ts')

def head_rows(view, corners=False, full_chin=False):
    """The view's base head: rows 0-14. W: the neck cells of the jaw row are erased
    (or made line with full_chin); S/SW: the jaw corners are erased unless `corners`."""
    rows = [list(r) for r in FIG[view][:15]]
    if view == 'W':
        for x in range(7, 11): rows[14][x] = 'o' if full_chin else '.'
    elif view in ('N', 'NW'):
        rows = rows[:14]                                  # row 14 is the neck line
    elif not corners:
        r = rows[14]
        for x in range(len(r)):
            if r[x] == 's': r[x] = '.'
    return [''.join(r) for r in rows]

def blank(w, h): return ['.' * w for _ in range(h)]
def put(rows, x, y, patch):
    g = [list(r) for r in rows]
    for dy, pr in enumerate(patch):
        for dx, c in enumerate(pr):
            if c == '.': continue
            X, Y = x + dx, y + dy
            assert 0 <= Y < len(g) and 0 <= X < len(g[0]), (x, y, dx, dy, pr)
            g[Y][X] = c
    return [''.join(r) for r in g]
def stamp_head(rows, view, hx, hy, shift=lambda k: 0, **opts):
    g = [list(r) for r in rows]
    for k, hr in enumerate(head_rows(view, **opts)):
        for j, c in enumerate(hr):
            if c == '.': continue
            X, Y = hx + shift(k) + j, hy + k
            assert 0 <= Y < len(g) and 0 <= X < len(g[0]), ('head', view, X, Y)
            g[Y][X] = c
    return [''.join(r) for r in g]

def body(w, h, rows_from, rows):
    """A canvas of w×h with `rows` placed from row `rows_from`."""
    out = blank(w, h)
    for i, r in enumerate(rows):
        assert len(r) == w, (rows_from + i, len(r), r)
        out[rows_from + i] = r
    return out

# ------------------------------------------------------------------ W poses (41 tall, soles on row 40)
DROOP_W = body(17, 41, 14, [
'...........oo....',
'.......ossssso...',
'......o$SSss$$o..',
'......osSssSs$o..',
'.....osss$sossso.',
'.....o$s$$sossso.',
'.....o$s$$$oSs$o.',
'.....oSsSSSoos$o.',
'.....ossssSoSs$o.',
'.....o$$$ssoss$o.',
'.....o$$ssoss$so.',
'.....o$$$sooSsSo.',
'.....o$$soSsssSo.',
'.....osssoSssso..',
'.....oSSssoSsSo..',
'.....oSSossooo...',
'......oSSo$ssso..',
'......oSSSossso..',
'.......oSSoS$sSo.',
'.......oSSoo$SSo.',
'.......oSSSos$so.',
'.......oSSSoS$sso',
'......oooSSoSssso',
'.....oSSSSoooSSso',
'.....ooSSSossssso',
'.....oooooo$sss$o',
'..........ooooooo',
])
REACH_W = body(20, 41, 14, [
'.........ooooSSsSo..',
'...........ossssso..',
'..........o$SSss$$o.',
'..........osSssSs$o.',
'.........o$$$sssssSo',
'oooooooooo$$$sssssSo',
'o$$$$$$$$$$$$sssssSo',
'osssssssss$$$sssssSo',
'oooooooooo$$$sssssSo',
'oso......o$$$sssssSo',
'.o.......o$$sssssSSo',
'.........o$$$ssssSSo',
'.........o$$sssssSSo',
'.........osssssssSSo',
'.........oSSsssssSSo',
'.........oSSosssSSo.',
'.........oSSo$ssso..',
'.........oSSSossso..',
'..........oSSoS$sSo.',
'..........oSSoo$SSo.',
'..........oSSSos$so.',
'..........oSSSoS$sso',
'.........oooSSoSssso',
'........oSSSSoooSSso',
'........ooSSSossssso',
'........oooooo$sss$o',
'.............ooooooo',
])
DRAG_W = body(18, 41, 14, [
'...........oo.....',
'......ossssso.....',
'.....o$SSss$$o....',
'.....osSssSs$o....',
'....osss$sossso...',
'....o$s$$sossso...',
'....o$s$$$oSs$o...',
'....oSsSSSoos$o...',
'....ossssSoSs$o...',
'....o$$$ssoss$o...',
'....o$$ssoss$so...',
'....o$$$sooSsSo...',
'....o$$soSsssSo...',
'....osssoSssso....',
'....oSSssoSsSo....',
'.....oSsssoooo....',
'......oo$sssoSo...',
'........osssooSo..',
'........oS$sSooSo.',
'........oo$SSo.oSo',
'.........os$so.oSo',
'.........oS$ssooSo',
'.........oSsssooSo',
'........oooSSsooSo',
'........osssssoSSo',
'........o$sss$oSSo',
'........oooooooooo',
])
HUNCH_W = body(16, 41, 14, [
'.........ooooo..',
'.......oo$sssSo.',
'......o$sssssSSo',
'.....o$ssssssSSo',
'....o$sss$sssSSo',
'....o$s$oSsssSSo',
'....o$s$oSsssSSo',
'....oSsSoSsssSSo',
'....ossSoSsssSSo',
'....o$$SoSsssSSo',
'....o$$SoSsssSSo',
'....o$$SoSSssSSo',
'....o$sSoSSsSSSo',
'....o$sSoSSsSSo.',
'....o$sSoSSsSSo.',
'....osssoSSsSSo.',
'....oSSsoSSSSo..',
'....ososo$ssso..',
'....oooooossso..',
'......oSSoo$SSo.',
'......oSSSos$so.',
'......oSSSoS$sso',
'.....oooSSoSssso',
'....oSSSSoooSSso',
'....ooSSSossssso',
'....oooooo$sss$o',
'.........ooooooo',
])
TWIST_W = body(17, 41, 14, [
'....ooooSSsSo....',
'......ossssso....',
'.....o$SSss$$o...',
'.....osSssSs$o...',
'....osss$sossso..',
'....o$s$$sossso..',
'....o$s$$$oSs$o..',
'....oSsSSSoos$o..',
'....ossssSoSs$o..',
'....o$$$ssoss$o..',
'....o$$ssoss$so..',
'....o$$$sooSsSo..',
'....o$$soSsssSo..',
'....osssoSssso...',
'....oSSssoSsSo...',
'....oSSossooo....',
'....oSSo$ssso....',
'....oSSSossso....',
'.....oSSoS$sSo...',
'.....oSSoo$SSo...',
'.....oSSSos$so...',
'.....oSSSoS$sso..',
'....oooSSoSssso..',
'...oSSSSoooSSso..',
'...ooSSSossssso..',
'...oooooo$sss$o..',
'........ooooooo..',
])
CRAWL_W = body(26, 41, 24, [
'..............oooooooo....',
'.............o$$$$$$$so...',
'............o$$sssssssSo..',
'............osssssssssSSo.',
'...........ossssssssssSSo.',
'...........ossssssssssSSo.',
'...........oSsosssssssSSo.',
'...........oSsoSssssssSSo.',
'...........oSsoSSsssssSSo.',
'...........oSsooSSSSSSSSo.',
'...........oSso.oooooSSSo.',
'...........oSso.....oSSSo.',
'...........oSso....oSSSSo.',
'...........oSso...oSSSSSo.',
'...........oSso..oSSSSSSo.',
'..........oSSSo..oSSSSSSo.',
'..........ooooo..ooooooooo',
])

def regions_w(dx, legs_dx=None, **over):
    """STAND_W regions shifted by dx (legs by legs_dx), with overrides."""
    ld = dx if legs_dx is None else legs_dx
    r = {
        'torso': [8+dx, 16, 12+dx, 29], 'neck': [[8+dx, 16, 8+dx, 23]], 'shoulders': [[5+dx, 16, 7+dx, 17]],
        'sleeveL': {'short': [3+dx, 18, 8+dx, 22], 'long': [3+dx, 18, 8+dx, 25], 'torn': [3+dx, 18, 8+dx, 19]},
        'sleeveR': {'short': [3+dx, 18, 8+dx, 22], 'long': [3+dx, 18, 8+dx, 25]},
        'pants': [[3+min(dx, ld), 29, 13+ld, 35]], 'shorts': [[3+min(dx, ld), 29, 13+ld, 32]],
        'shoeL': [2+ld, 36, 7+ld, 40], 'shoeR': [8+ld, 36, 13+ld, 40], 'flats': [[2+ld, 39, 7+ld, 40], [8+ld, 39, 13+ld, 40]],
        'collar': [[6+dx, 16, 10+dx, 16]], 'hem': [9+dx, 28, 11+dx, 28], 'frayedXs': [9+dx, 11+dx],
        'chest': [10+dx, 20], 'gash': [4+dx, 23],
        'skirt': {'x': 3+ld, 'y': 29, 'rows': ['o&kkkkkKo..', 'o&kkkkkkKo.', 'o&kkkkkkKo.', 'o&kkkkkkkKo', 'ooooooooooo']},
        'dress': {'x': 3+ld, 'y': 29, 'rows': ['o&kkkkkKo..', 'o&kkkkkkKo.', 'o&kkkkkkKo.', 'o&kkkkkkkKo', 'o&kkkkkkkKo', 'o&kkkkkkkKo', 'ooooooooooo']},
    }
    r.update(over)
    return r

POSES = {}
def add(pose, view, rows, head, regions, w=None, label='', **opts):
    hview, hx, hy, shift = head
    fig = stamp_head(rows, hview, hx, hy, shift, **opts)
    table = [shift(k) for k in range(17)]
    POSES.setdefault(pose, {})[view] = {'rows': fig, 'headView': hview, 'headX': hx, 'headY': hy, 'shift': table, 'regions': regions, 'label': label}

add('droop', 'W', DROOP_W, ('W', 0, 2, lambda k: 0), regions_w(2, 3, hem=[11, 28, 13, 28]), label='Zombie gục đầu (W)')
add('reach', 'W', REACH_W, ('W', 6, 0, lambda k: 0), regions_w(6, 6,
    torso=[10, 16, 18, 29], neck=[], shoulders=[[11, 16, 13, 17]],
    sleeveL={'short': [6, 19, 9, 22], 'long': [1, 19, 9, 22], 'torn': [8, 19, 9, 22]},
    sleeveR={'short': [6, 19, 9, 22], 'long': [1, 19, 9, 22]},
    collar=[[12, 16, 16, 16]], hem=[10, 28, 18, 28], frayedXs=[10, 12, 14, 16, 18], chest=[12, 20], gash=[11, 24]), label='Zombie vươn tay (W)')
add('drag', 'W', DRAG_W, ('W', 0, 1, lambda k: 0), regions_w(1, 1,
    pants=[[5, 29, 17, 36]], shorts=[[5, 29, 17, 32]], shoeL=[8, 37, 14, 40], shoeR=[14, 37, 17, 40],
    flats=[[8, 39, 14, 40], [14, 39, 17, 40]]), label='Zombie lết chân (W)')
add('hunch', 'W', HUNCH_W, ('W', 0, 5, lambda k: 0), regions_w(2, 2,
    torso=[9, 14, 15, 30], neck=[[9, 14, 9, 17]], shoulders=[[9, 14, 14, 17]],
    sleeveL={'short': [4, 18, 8, 23], 'long': [4, 18, 8, 28], 'torn': [4, 18, 8, 20]},
    sleeveR={'short': [4, 18, 8, 23], 'long': [4, 18, 8, 28]},
    pants=[[4, 30, 15, 35]], shorts=[[4, 30, 15, 33]], collar=[[9, 17, 13, 17]], hem=[10, 29, 14, 29], frayedXs=[10, 12, 14],
    chest=[11, 20], gash=[5, 23]), label='Zombie khom lưng (W)')
add('twist', 'W', TWIST_W, ('SW', 0, 1, lambda k: 0 if k < 5 else 1), regions_w(1, 1), label='Zombie ngoẹo cổ (W)', corners=True)
add('crawl', 'W', CRAWL_W, ('W', 0, 18, lambda k: 0), {
    'torso': [12, 24, 23, 33], 'neck': [], 'shoulders': [],
    'sleeveL': {'short': [11, 30, 14, 33], 'long': [11, 30, 14, 37], 'torn': [11, 30, 14, 31]},
    'sleeveR': {'short': [11, 30, 14, 33], 'long': [11, 30, 14, 37]},
    'pants': [[16, 33, 24, 38]], 'shorts': [[16, 33, 24, 35]],
    'shoeL': [10, 39, 14, 40], 'shoeR': [17, 38, 25, 40], 'flats': [[10, 40, 14, 40], [17, 39, 25, 40]],
    'collar': [[12, 25, 12, 29]], 'hem': [22, 25, 22, 32], 'frayedXs': [22],
    'chest': [15, 27], 'gash': [16, 26],
    'skirt': {'x': 15, 'y': 33, 'rows': ['oo&kkkkkKo', '.o&kkkkkkKo', '.ooooooooo']},
}, label='Dáng bò rình (W)', full_chin=True)

# ------------------------------------------------------------------ validation
def problems(rows):
    H=len(rows); W=len(rows[0]); out=[]
    at=lambda x,y: rows[y][x] if 0<=x<W and 0<=y<H else '.'
    for y in range(H):
        for x in range(W):
            c=rows[y][x]
            if c=='.': continue
            if c=='o':
                if not any((dx or dy) and at(x+dx,y+dy)=='o' for dy in (-1,0,1) for dx in (-1,0,1)): out.append(f'lonely o ({x},{y})')
            else:
                for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    if at(x+dx,y+dy)=='.': out.append(f'exposed {c} ({x},{y})'); break
    return out
bad=0
for pose,views in POSES.items():
    for view,d in views.items():
        ps=problems(d['rows'])
        if ps: bad+=1; print(f'{pose}@{view}: '+'; '.join(ps[:10]))
print('problems:', bad)
if '--print' in sys.argv:
    for pose,views in POSES.items():
        for view,d in views.items():
            print('==',pose,view); [print(str(i).rjust(2), r) for i,r in enumerate(d['rows'])]
if bad and '--force' not in sys.argv: sys.exit(1)

# ------------------------------------------------------------------ emit
def ts(v):
    if isinstance(v, dict): return '{ ' + ', '.join(f'{k}: {ts(x)}' for k, x in v.items()) + ' }'
    if isinstance(v, list): return '[' + ', '.join(ts(x) for x in v) + ']'
    if isinstance(v, str): return "'" + v.replace("'", "\\'") + "'"
    return str(v)
out = ['''/**
 * Zombie poses in the views other than S: hand-authored bodies with the
 * view's base head stamped on, and the clothes regions of each. Generated by
 * scripts/research/gen_pose_views.py (validates outlines); do not edit by hand.
 */
import type { HeroView } from './hero64.js';

export interface PoseViewData {
  rows: string[];
  /** Which view's base head is stamped (W uses the SW head for the twisted neck). */
  headView: HeroView;
  headX: number;
  headY: number;
  /** Column shift of each base-head row (17 entries). */
  shift: number[];
  regions: Record<string, unknown>;
  label: string;
}

export const POSE_VIEW_DATA: Record<string, Partial<Record<HeroView, PoseViewData>>> = {
''']
for pose, views in POSES.items():
    out.append(f"  {pose}: {{\n")
    for view, d in views.items():
        out.append(f"    {view}: {{ rows: {ts(d['rows'])}, headView: '{d['headView']}', headX: {d['headX']}, headY: {d['headY']}, shift: {ts(d['shift'])}, regions: {ts(d['regions'])}, label: {ts(d['label'])} }},\n")
    out.append("  },\n")
out.append("};\n")
open(OUT, 'w').write(''.join(out))
print('wrote', OUT)
