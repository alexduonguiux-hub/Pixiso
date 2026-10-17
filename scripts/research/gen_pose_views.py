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
    (or made line with full_chin); S/SW: the jaw corners are erased unless `corners`;
    N/NW: the neck row stays (it fills the footprint of the S chin)."""
    rows = [list(r) for r in FIG[view][:15]]
    if view == 'W':
        for x in range(7, 11): rows[14][x] = 'o' if full_chin else '.'
    elif view in ('N', 'NW'):
        pass                                              # row 14 is the neck line: it fills the S chin footprint
    elif not corners:
        # keep only the middle of the chin line (as posedFigure does for S)
        r = rows[14]
        for x in range(len(r)):
            if x < 5 or x > 10: r[x] = '.'
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
def stamp_head(rows, view, hx, hy, shift=lambda k: 0, under=False, **opts):
    """The view's head on the body; with `under` the body stays in front (a hump hides the nape)."""
    g = [list(r) for r in rows]
    for k, hr in enumerate(head_rows(view, **opts)):
        for j, c in enumerate(hr):
            if c == '.': continue
            X, Y = hx + shift(k) + j, hy + k
            assert 0 <= Y < len(g) and 0 <= X < len(g[0]), ('head', view, X, Y)
            if under and g[Y][X] != '.': continue
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

BODIES = FIG.get('bodies', {})

# ------------------------------------------------------------------ SW / N bodies (40 tall, soles on row 39, same canvas as the S body)
# Drooped stance, three-quarter (facing SW, far side on the left): the far arm is
# mostly behind the torso (one skin column shows), the far leg a column narrower,
# the near flank in shadow, the near foot turned to the viewer; the SW head drooped
# and tilted towards the far shoulder as in S.
DROOP_SW = body(19, 40, 14, [
'....oooo...........',
'...osssss..........',
'..ossssss.....so...',
'..oSsssssSSsSSsSo..',
'..oso$$$sSsssSsSo..',
'..o$o$$$s$$$ssSSSo.',
'..o$o$$$s$$$sSoSs$o',
'..o$oSSsssSSsSoSs$o',
'..o$ossssssssSoSs$o',
'..o$os$$$$$ssSoSs$o',
'..o$oss$$$sssSoSs$o',
'..osos$$$$$ssSoos$o',
'..osos$$$$$ssSoos$o',
'..osossSSsSSsSossso',
'..osossssssssSosSso',
'..osossssssssSosSso',
'..ooossssssssSososo',
'.....ossooosssososo',
'.....oSso.osssooooo',
'.....o$So.oSs$o....',
'.....o$So.oSs$o....',
'....ossso.osssso...',
'....ossso.osssso...',
'...oooSso.osSoooo..',
'...o$$sso.o$$sSSo..',
'...oooooo.ooooooo..',
])
# Hunched back seen from behind: the hump rises between the raised shoulders and
# hides the nape; the head sits behind it (stamped under), only the crown and the
# ears show. Flat back shading as the derived N views, light on the left.
HUNCH_N = body(19, 40, 12, [
'.......ooooo.......',
'.....oo$$ssSoo.....',
'.oooo$$sssssSSoooo.',
'osss$$ssssssSSSssso',
'o$sssssssssSSSsss$o',
'o$ssssssssSSSSsss$o',
'o$sssssssSSSSssss$o',
'o$sSosssssssssoSs$o',
'o$sSosssssssssoSs$o',
'o$sSosssssssssoSs$o',
'o$sSosssssssssoSs$o',
'o$sSosssssssssoSs$o',
'o$sSosssssssssoSs$o',
'o$sSosssssssssoSs$o',
'o$sSossSSsSSssoSs$o',
'o$sSosssssssssoSs$o',
'o$sSosssooosssoSs$o',
'o$sSoSsso.ossSoSs$o',
'o$sSoSsso.ossSoSs$o',
'o$sSoSsso.ossSoSs$o',
'ossso$sSo.oSs$ossso',
'osSso$sSo.oSs$osSso',
'ososo$sSo.oSs$ososo',
'ososossso.osssososo',
'ooooossso.osssooooo',
'..oooSsso.ossSooo..',
'..o$$ssso.osss$$o..',
'..ooooooo.ooooooo..',
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

# ------------------------------------------------------------------ S poses (input) and helpers
POSE_S = FIG['poses']               # id -> {body, hx, hy, shift, regions}: the S body and where its head grid sits
MIRRORED = FIG.get('mirrored', [])  # poses that also exist flipped (`*_m`)
LABELS = {'droop': 'Zombie gục đầu', 'reach': 'Zombie vươn tay', 'drag': 'Zombie lết chân',
          'hunch': 'Zombie khom lưng', 'twist': 'Zombie ngoẹo cổ', 'crawl': 'Dáng bò rình'}
HEAD_W = 17

def flipx(rows): return [r[::-1] for r in rows]
def flatten(rows, box):
    """Seen from behind: skin highlights and shadows inside the torso box become plain skin."""
    x0, y0, x1, y1 = box
    g = [list(r) for r in rows]
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if g[y][x] in '$S': g[y][x] = 's'
    return [''.join(r) for r in g]
def patched(rows, patches):
    g = [list(r) for r in rows]
    for (x, y), c in patches.items(): g[y][x] = c
    return [''.join(r) for r in g]
def mirror_regions(r, W):
    """The regions flipped horizontally (left and right items swap)."""
    mb = lambda b: [W - 1 - b[2], b[1], W - 1 - b[0], b[3]]
    mp = lambda p, w: [W - w - p[0], p[1]]
    rows = lambda d: {'x': W - len(d['rows'][0]) - d['x'], 'y': d['y'], 'rows': [t[::-1] for t in d['rows']]}
    def sleeves(sl):
        out = {'short': mb(sl['short']), 'long': mb(sl['long'])}
        if 'torn' in sl: out['torn'] = mb(sl['torn'])
        return out
    out = {'torso': mb(r['torso']), 'neck': [mb(b) for b in r['neck']], 'shoulders': [mb(b) for b in r['shoulders']],
           'sleeveL': sleeves(r['sleeveR']), 'sleeveR': sleeves(r['sleeveL']),
           'pants': [mb(b) for b in r['pants']], 'shorts': [mb(b) for b in r['shorts']],
           'shoeL': mb(r['shoeR']), 'shoeR': mb(r['shoeL']), 'flats': [mb(b) for b in r['flats']],
           'collar': [mb(b) for b in r['collar']], 'hem': mb(r['hem']), 'frayedXs': [W - 1 - x for x in r['frayedXs']]}
    for k, w in (('chest', 1), ('number', 3), ('tie', 1), ('belt', 1), ('stains', 7), ('gash', 1)):
        if k in r: out[k] = mp(r[k], w)
    out['skirt'] = rows(r['skirt'])
    if 'dress' in r: out['dress'] = rows(r['dress'])
    return out
def back_regions(r):
    """Regions seen from behind: a straight collar line, no tie, badge or belt."""
    xs = [x for b in r['collar'] for x in (b[0], b[2])]
    row = min(b[1] for b in r['collar'])
    out = {k: v for k, v in r.items() if k not in ('tie', 'chest', 'belt')}
    out['collar'] = [[min(xs), row, max(xs), row]]
    return out

POSES = {}
def add(pose, view, rows, head, regions, under=False, **opts):
    hview, hx, hy, shift = head
    fig = stamp_head(rows, hview, hx, hy, shift, under=under, **opts)
    table = [shift(k) for k in range(HEAD_W)]
    base = pose[:-2] if pose.endswith('_m') else pose
    label = LABELS[base] + (' lật' if pose.endswith('_m') else '') + f' ({view})'
    POSES.setdefault(pose, {})[view] = {'rows': fig, 'body': rows, 'headView': hview, 'headX': hx, 'headY': hy,
                                        'shift': table, 'regions': regions, 'label': label, 'headUnder': under}

# ------------------------------------------------------------------ hand-drawn views
add('droop', 'W', DROOP_W, ('W', 0, 2, lambda k: 0), regions_w(2, 3, hem=[11, 28, 13, 28]))
add('reach', 'W', REACH_W, ('W', 6, 0, lambda k: 0), regions_w(6, 6,
    torso=[10, 16, 18, 29], neck=[], shoulders=[[11, 16, 13, 17]],
    sleeveL={'short': [6, 19, 9, 22], 'long': [1, 19, 9, 22], 'torn': [8, 19, 9, 22]},
    sleeveR={'short': [6, 19, 9, 22], 'long': [1, 19, 9, 22]},
    collar=[[12, 16, 16, 16]], hem=[10, 28, 18, 28], frayedXs=[10, 13, 17], chest=[12, 20], gash=[11, 24]))
add('drag', 'W', DRAG_W, ('W', 0, 1, lambda k: 0), regions_w(1, 1,
    pants=[[5, 29, 17, 36]], shorts=[[5, 29, 17, 32]], shoeL=[8, 37, 14, 40], shoeR=[14, 37, 17, 40],
    flats=[[8, 39, 14, 40], [14, 39, 17, 40]]))
add('hunch', 'W', HUNCH_W, ('W', 0, 5, lambda k: 0), regions_w(2, 2,
    torso=[9, 14, 15, 30], neck=[[9, 14, 9, 17]], shoulders=[[9, 14, 14, 17]],
    sleeveL={'short': [4, 18, 8, 23], 'long': [4, 18, 8, 28], 'torn': [4, 18, 8, 20]},
    sleeveR={'short': [4, 18, 8, 23], 'long': [4, 18, 8, 28]},
    pants=[[4, 30, 15, 35]], shorts=[[4, 30, 15, 33]], collar=[[9, 17, 13, 17]], hem=[10, 29, 14, 29], frayedXs=[10, 12, 14],
    chest=[11, 20], gash=[5, 23]))
add('twist', 'W', TWIST_W, ('SW', 0, 1, lambda k: 0 if k < 5 else 1), regions_w(1, 1), corners=True)
add('droop', 'SW', DROOP_SW, ('SW', 0, 2, lambda k: 1 if k < 5 else 2 if k < 9 else 3), {
    'torso': [4, 14, 14, 30], 'neck': [[8, 17, 14, 17]], 'shoulders': [[2, 14, 3, 18], [15, 16, 17, 19]],
    'sleeveL': {'short': [2, 19, 4, 22], 'long': [2, 19, 4, 24], 'torn': [2, 19, 4, 20]},
    'sleeveR': {'short': [14, 20, 18, 24], 'long': [14, 20, 18, 26]},
    'pants': [[5, 31, 14, 32], [4, 33, 15, 36]], 'shorts': [[5, 31, 14, 32], [4, 33, 15, 34]],
    'shoeL': [3, 37, 8, 39], 'shoeR': [10, 37, 16, 39], 'flats': [[3, 38, 8, 39], [10, 38, 16, 39]],
    'collar': [[8, 17, 8, 17], [14, 17, 14, 17], [9, 18, 13, 18]], 'hem': [5, 30, 13, 30], 'frayedXs': [5, 7, 9, 11, 13],
    'chest': [6, 20], 'number': [8, 21], 'tie': [9, 19], 'belt': [9, 30], 'stains': [6, 21], 'gash': [16, 22],
    'skirt': {'x': 4, 'y': 31, 'rows': ['.o&kkkkkkkKo.', '.o&kkkkkkkKo.', 'o&kkkkkkkkkKo', 'o&kkkkkkkkkKo', 'oo.ooo.oooooo']},
})
HUNCH_N_REGIONS = {
    'torso': [4, 13, 14, 27], 'neck': [],
    'shoulders': [[0, 14, 2, 15], [0, 16, 4, 16], [0, 17, 5, 17], [0, 18, 6, 18], [16, 14, 18, 15], [14, 16, 18, 16], [13, 17, 18, 17], [12, 18, 18, 18]],
    'sleeveL': {'short': [0, 19, 4, 22], 'long': [0, 19, 4, 26], 'torn': [0, 19, 4, 20]},
    'sleeveR': {'short': [14, 19, 18, 22], 'long': [14, 19, 18, 26]},
    'pants': [[4, 28, 14, 36]], 'shorts': [[4, 28, 14, 31]],
    'shoeL': [1, 37, 8, 39], 'shoeR': [10, 37, 17, 39], 'flats': [[1, 38, 8, 39], [10, 38, 17, 39]],
    'collar': [[7, 12, 11, 12]], 'hem': [5, 27, 13, 27], 'frayedXs': [5, 7, 9, 11, 13],
    'stains': [7, 21], 'gash': [16, 23],
    'skirt': {'x': 3, 'y': 28, 'rows': ['.o&kkkkkkkKo.', '.o&kkkkkkkKo.', 'o&kkkkkkkkkKo', 'o&kkkkkkkkkKo', '.o.ooo.ooo.o.']},
}
add('hunch', 'N', HUNCH_N, ('N', 1, 4, lambda k: 0), HUNCH_N_REGIONS, under=True)
add('hunch', 'NW', HUNCH_N, ('NW', 1, 4, lambda k: 0), HUNCH_N_REGIONS, under=True)
add('crawl', 'W', CRAWL_W, ('W', 0, 18, lambda k: 0), {
    'torso': [12, 24, 23, 33], 'neck': [], 'shoulders': [],
    'sleeveL': {'short': [11, 30, 14, 33], 'long': [11, 30, 14, 37], 'torn': [11, 30, 14, 31]},
    'sleeveR': {'short': [11, 30, 14, 33], 'long': [11, 30, 14, 37]},
    'pants': [[16, 33, 24, 38]], 'shorts': [[16, 33, 24, 35]],
    'shoeL': [10, 39, 14, 40], 'shoeR': [17, 38, 25, 40], 'flats': [[10, 40, 14, 40], [17, 39, 25, 40]],
    'collar': [[12, 25, 12, 29]], 'hem': [22, 25, 22, 32], 'frayedXs': [22],
    'chest': [15, 27], 'gash': [16, 26],
    'skirt': {'x': 15, 'y': 33, 'rows': ['oo&kkkkkKo', '.o&kkkkkkKo', '.ooooooooo']},
}, full_chin=True)


# ------------------------------------------------------------------ derived views
# Cells of an S body that the view's head (a different footprint) leaves open next to where the S head was.
PATCHES = {
}
for pose, S in POSE_S.items():
    W = len(S['body'][0]); regs = S['regions']
    sh = lambda k, t=S['shift']: t[k]
    views = POSES.setdefault(pose, {})
    # SW: the S body with the three-quarter head.
    if 'SW' not in views:
        add(pose, 'SW', patched(S['body'], PATCHES.get((pose, 'SW'), {})), ('SW', S['hx'], S['hy'], sh), regs)
    # N: the S body flipped and flattened, the N head where the S head was (tilt mirrored).
    if 'N' not in views:
        back = mirror_regions(regs, W)
        body = flatten(flipx(S['body']), back['torso'])
        add(pose, 'N', patched(body, PATCHES.get((pose, 'N'), {})), ('N', W - HEAD_W - S['hx'], S['hy'], lambda k, f=sh: -f(k)), back_regions(back))
    # NW: the back of the SW drawing (hand-drawn or derived).
    if 'NW' not in views:
        sw = views['SW']; Wsw = len(sw['body'][0])
        back = mirror_regions(sw['regions'], Wsw)
        body = flatten(flipx(sw['body']), back['torso'])
        add(pose, 'NW', patched(body, PATCHES.get((pose, 'NW'), {})), ('NW', Wsw - HEAD_W - sw['headX'], sw['headY'], lambda k, t=sw['shift']: -t[k]), back_regions(back))
# Mirrored poses: their own back view (flipped, as their S view is); W, SW and NW are shared with the base pose.
for pose in MIRRORED:
    n = POSES[pose]['N']; Wn = len(n['body'][0])
    add(pose + '_m', 'N', flipx(n['body']), ('N', Wn - HEAD_W - n['headX'], n['headY'], lambda k, t=n['shift']: -t[k]), mirror_regions(n['regions'], Wn), under=n['headUnder'])

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
    # transparent cells must reach the border: an enclosed pocket of 3+ cells is a hole
    # in the figure (a slit of 1-2 cells between limbs is daylight, allowed)
    seen=set()
    def flood(start):
        pocket=[]; stack=[start]
        while stack:
            x,y=stack.pop()
            if (x,y) in seen: continue
            seen.add((x,y)); pocket.append((x,y))
            for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                X,Y=x+dx,y+dy
                if 0<=X<W and 0<=Y<H and rows[Y][X]=='.' and (X,Y) not in seen: stack.append((X,Y))
        return pocket
    for y in range(H):
        for x in range(W):
            if (x in (0,W-1) or y in (0,H-1)) and rows[y][x]=='.': flood((x,y))
    for y in range(H):
        for x in range(W):
            if rows[y][x]=='.' and (x,y) not in seen:
                pocket=flood((x,y))
                if len(pocket)>=3: out.append(f'hole of {len(pocket)} at ({x},{y})')
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
 * Zombie poses in the views other than S: every view of every pose as a
 * validated drawing (hand-drawn bodies, or derived from the S body by the
 * generator) with the view's base head stamped on, and the clothes regions
 * of each. Mirrored poses carry their own back view. Generated by
 * scripts/research/gen_pose_views.py (validates outlines and holes); do not
 * edit by hand.
 */
import type { HeroView } from './hero64.js';

export interface PoseViewData {
  /** The figure: body with the view's base head stamped on (under it when `headUnder`). */
  rows: string[];
  /** The bare body, for the views derived from this one. */
  body: string[];
  /** The head sits behind the body (a hump hides the nape): body cells stay in front of head items. */
  headUnder?: boolean;
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
        under = ', headUnder: true' if d['headUnder'] else ''
        out.append(f"    {view}: {{ rows: {ts(d['rows'])}, body: {ts(d['body'])}{under}, headView: '{d['headView']}', headX: {d['headX']}, headY: {d['headY']}, shift: {ts(d['shift'])}, regions: {ts(d['regions'])}, label: {ts(d['label'])} }},\n")
    out.append("  },\n")
out.append("};\n")
open(OUT, 'w').write(''.join(out))
print('wrote', OUT)
