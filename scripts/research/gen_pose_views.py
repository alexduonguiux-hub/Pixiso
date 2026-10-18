"""Zombie poses in the views other than S (W, N, SW, NW): hand-authored bodies
with that view's base head stamped on, plus the clothes regions. Validates
every figure (closed outline, no stray line cell) and emits
packages/sprite-kit/src/hero64.poses.views.ts.

Input: test-output/view_figures.json (DUMP=... pnpm exec tsx scripts/hero-views.ts).
"""
import copy, json, os, sys
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
# Lurking crouch, side view: the standing W figure with the head sunk six rows into the
# shoulders (as the S body), the long near arm hanging in front of the chest and down past
# the hip to a clawed hand resting on the ground before the far foot; the far arm hidden.
CRAWL_W = body(15, 41, 21, [
'.....o$SSss$$o.',
'....o$$sssSSo..',
'...o$sso$sSSo..',
'..o$ssos$sSSo..',
'.osssossssSSo..',
'.osssosssSSSo..',
'.osssosssSSSo..',
'ossSosssSSSSo..',
'ossSoSSossooo..',
'ossSoSSo$ssso..',
'ossSoSSSossso..',
'ossSooSSoS$sSo.',
'ossSooSSoo$SSo.',
'oSssooSSSos$so.',
'oSssSoSSSoS$sso',
'ososSooSSosssso',
'oSoSoSSSoooSSso',
'oooooSSSossssso',
'...oooooo$sss$o',
'........ooooooo',
])

BODIES = FIG.get('bodies', {})

# Drooped stance, three-quarter: the base SW body (far arm two skin columns, near
# flank in shadow) with the same changes as the S body: far shoulder raised two rows
# into the hump beside the jaw, near arm dropped two rows with its fist in front of
# the hip, near foot turned out; the SW head drooped and tilted as in S.
DROOP_SW = body(19, 40, 14, [
'...ooooo...........',
'..osssss...........',
'.osssssss....so....',
'.oSsssssSSsSSso....',
'.osso$$$sSsssso....',
'.o$so$$s$$$Ssso....',
'.o$so$$s$$$SSsSo...',
'.o$soSSsSSsSosso...',
'.o$sosssssssosso...',
'.osso$$$$ssSoSs$o..',
'.osso$$$sssSoSs$o..',
'.osoo$$$$ssSoos$o..',
'.osoos$$$ssSoos$o..',
'..ooosssssssossso..',
'....osSSsSSsososo..',
'...oossooossoooso..',
'...oSsso.ossoosso..',
'...o$sSo.oSsoooo...',
'...o$$So.oS$$o.....',
'...o$$so.os$$o.....',
'..osssso.osssso....',
'..osssso.osssso....',
'..ooosso.ossooooo..',
'.o$$$sso.o$$sSSso..',
'.ossssso.osssssso..',
'.ooooooo.oooooooo..',
])
# Reaching forward, three-quarter (21 wide: the body sits two columns right of
# its S canvas so both hands can swing a column towards the far side). Far
# shoulder pulled in, both hands shifted a column to the far side, the near hand
# crossing in front of the flank; below the hands the base SW hips and legs.
REACH_SW = body(21, 40, 14, [
'.......os.....so.....',
'.......osssssssso....',
'......ossSSsSSsSso...',
'......os$$SsS$$Sso...',
'.....oSs$$sss$$sSSo..',
'.....oso$$$s$$Sosso..',
'.....oso$$$s$$Sosso..',
'.....osso$$s$$ossso..',
'.....osso$$s$$ossso..',
'.....osSo$$s$$oSSso..',
'.....oooo$$s$$ooooo..',
'.......o$$$s$$So.....',
'.......ossssssSo.....',
'.......ossssssso.....',
'.......osSSsSSso.....',
'......oossooossoo....',
'.....oSsso.ossSo.....',
'.....o$sSo.oSs$o.....',
'.....o$$So.oS$$o.....',
'.....o$$so.os$$o.....',
'....osssso.osssso....',
'....osssso.osssso....',
'....ooosso.ossooo....',
'...o$$$sso.o$$sSSo...',
'...ossssso.ossssso...',
'...ooooooo.ooooooo...',
])
# Dragging a leg, three-quarter: far shoulder and arm pulled in (one skin
# column), near flank in shadow; fists one row lower than the base, the base
# SW hips and legs with the near leg stretched out, its trailing foot a cell
# shorter than in S (it points back, away from the viewer).
DRAG_SW = body(21, 40, 15, [
'....os.....so........',
'....osssssssso.......',
'...ossSSsSSsSso......',
'...os$$SsS$$Sso......',
'..osS$$sss$$SsSo.....',
'..o$o$$$s$$SoSs$o....',
'..o$oSSsssSSoSs$o....',
'..o$ossssssSoSs$o....',
'..o$os$$$$$Soos$o....',
'..o$oss$$$sSoos$o....',
'..osos$$$$$Sossso....',
'..osos$$$ssSossso....',
'..osossssssssososo...',
'..ososSSsSSSoooso....',
'..ooossooossoosso....',
'...oSsso.ossSooo.....',
'...o$sSo.oSs$o.......',
'...o$$So..oS$$o......',
'...o$sSo..oSs$o......',
'..osssso..osssso.....',
'..osssso..osssso.....',
'..ooosso..ossoooooo..',
'.o$$$sso..osss$$$$o..',
'.ossssso..ossssssso..',
'.ooooooo..ooooooooo..',
])
# Hunched, three-quarter: the far shoulder and arm pulled in one column (two
# skin columns), the near flank in shadow; as in S the arms hang in front of
# the thighs' outer columns down to the knees, the base SW feet below.
HUNCH_SW = body(19, 40, 14, [
'...ooo.......oooo..',
'..ossS.......Sssso.',
'..o$ssS.....Ssss$o.',
'..o$sSs.....sSss$o.',
'..o$ssSs...sSsss$o.',
'..o$sosSSsSSsoSs$o.',
'..osSo$$SsS$$oSsso.',
'..ossoSSsssSSossso.',
'..ossosssssssossso.',
'..ossos$$$$$sossso.',
'..ossoss$$$ssossso.',
'..ossos$$$$$sossso.',
'..ossosSSsSSsossso.',
'..ossosssssssossso.',
'..o$sossooossoss$o.',
'..o$sosso.ossoss$o.',
'..o$sosso.ossoss$o.',
'..ossosSo.oSsossso.',
'..osSosSo.oSsosSso.',
'..osSosSo.oSsosSso.',
'..osoosso.ossososo.',
'..osoosso.ossososo.',
'...ooosso.ossooooo.',
'..o$$$sso.o$$sSSo..',
'..ossssso.ossssso..',
'..ooooooo.ooooooo..',
])
# Twisted neck, three-quarter: far shoulder and arm pulled in, flank in shadow,
# open hands one row above the crotch, knees knocked together, the base SW feet.
TWIST_SW = body(19, 40, 15, [
'.......os.....so...',
'.....oosssssssoo...',
'....ossssSSsSSsSo..',
'....os$$$sSsS$sSo..',
'...osS$$sss$$SsSo..',
'...oso$$$s$$Sosso..',
'...o$oSSsssSSoSs$o.',
'...o$ossssssSoSs$o.',
'...o$os$$$$$Soos$o.',
'...o$oss$$$sSoos$o.',
'...osos$$$$$Sossso.',
'...osos$$$ssSosSso.',
'...ososssssssososo.',
'...ososSSsSSSososo.',
'...ooossooossooooo.',
'....oSsso.ossSo....',
'....o$sSo.oSs$o....',
'.....oSssossSo.....',
'.....o$ssoss$o.....',
'.....o$ssoss$o.....',
'....ossso.ossso....',
'...ooosso.ossooo...',
'..o$$$sso.o$$sSSo..',
'..ossssso.ossssso..',
'..ooooooo.ooooooo..',
])
# Crawling, three-quarter: the far arm a skin column narrower with its hand
# beside the far foot, far shoulder pulled in, near flank in shadow; the
# crouched legs and the planted near hand keep their place.
CRAWL_SW = body(21, 40, 20, [
'......os.....so......',
'.....osssssssssoo....',
'....osssSSsSSsssSo...',
'...osss$$SsS$$ssSSo..',
'..osSo$$$sss$$SoSsSo.',
'.o$sSoSSsssssSSoSss$o',
'.o$sSossssssssSoSss$o',
'.o$sSossssssssSoSss$o',
'.o$sSossooooosSoSss$o',
'.o$sSo$$so.os$$oSss$o',
'.o$sSo$sso.oss$oSss$o',
'.o$sSoSSso.ossSoSss$o',
'.o$sSo$sSo.oSs$oSss$o',
'.o$sSo$sSo.oSs$oSss$o',
'.o$sSo$sso.oss$oSss$o',
'.osssossso.osssosssso',
'.ososossso.osssoososo',
'.ososoosso.ossooososo',
'.ososo$sso.oss$oososo',
'.ooooooooo.oooooooooo',
])
# ------------------------------------------------------------------ heavy build (23×45 in S; W 18×46 with the soles a row lower)
# Side view of the heavy build (20×46): a barrel chest that juts out in front
# of the near arm (columns 2–4), the arm hanging over the middle of the flank
# (columns 5–10), the back at column 16; legs a column thicker than the base,
# five more torso rows; the W head three columns in, the neck filling the jaw
# row under it.
HEAVY_W = body(20, 46, 14, [
'..........SSsSo.....',
'.......ossssssso....',
'.....oo$SSssss$o....',
'....o$$Sssssss$so...',
'...o$ossssossssso...',
'..o$$o$sssossssso...',
'..o$$o$ssSoSsss$o...',
'..o$so$ssSoSsss$o...',
'..o$so$sssossss$o...',
'..o$soSsssossssso...',
'..ossoSsssossssso...',
'...osoSsssossssso...',
'....oossssossssso...',
'.....ossssosssssso..',
'.....o$sssosssssso..',
'.....o$$ssoSsssSo...',
'.....oSSssoSsssSo...',
'.....oSSsosssoooo...',
'.....osSSo$sssso....',
'.....osSSo$sssso....',
'.....osSSSosssso....',
'.....osSSSosssso....',
'......osSSoS$ssSo...',
'......osSSoo$sSSo...',
'......osSSSos$sso...',
'......osSSSos$sso...',
'......osSSSoS$ssso..',
'.....ooooSSoSsssso..',
'....osSSSSoooSSSso..',
'....ooSSSSosssssso..',
'....ooooooo$ssss$o..',
'..........oooooooo..',
])
# Three-quarter front of the heavy build: the far arm behind the torso with one
# skin column showing, the raised far shoulder pulled in, the near flank in
# shadow, the far leg a column narrower, the far foot a cell shorter and the near
# foot facing the viewer; the SW head where the S head sits.
HEAVY_SW = body(23, 45, 14, [
'.......os.....so.......',
'.......osssssssso......',
'......ossSSsSSssSo.....',
'.....oss$$SsS$$ssSo....',
'....os$$$sssss$$$sSoo..',
'...oso$$$sssss$$Sossso.',
'...o$o$$$sssss$$SoSss$o',
'...o$os$$$sss$$$SoSss$o',
'...o$os$$$sSs$$$SoSss$o',
'...o$ossSSsSssSSSoSss$o',
'...o$osssssSssssSooss$o',
'...o$ossSSsSsSSsSooss$o',
'...o$osssssSssssSooss$o',
'...osossssssssssSossoso',
'...osossssssssssSossoso',
'...ososssSSsSSssSooooso',
'...osossssssssssSoosso.',
'...oooossooooosssooooo.',
'......oSsso.osssSo.....',
'......o$sSo.oSss$o.....',
'......o$$So.oSs$$o.....',
'......o$sSo.oSss$o.....',
'......ossso.osssso.....',
'.....osssso.ossssso....',
'.....os$sso.osss$so....',
'.....os$sso.osss$so....',
'.....ossSso.osSssso....',
'.....ooSsso.osSoooo....',
'....o$$ssso.o$$ssSSo...',
'....ossssso.osssssso...',
'....ooooooo.oooooooo...',
])
# Hunched back seen from behind: the hump rises between the raised shoulders and
# hides the nape; the head sits behind it (stamped under), only the crown and the
# ears show. Flat back shading as the derived N views, light on the left; from
# behind the legs pass in front of the hanging arms.
HUNCH_N = body(19, 40, 12, [
'.......ooooo.......',
'.....oo$$ssSoo.....',
'..oooo$$sssSSoooo..',
'.osss$$ssssSSSssso.',
'.o$sssssssSSSsss$o.',
'.o$ssssssSSSSsss$o.',
'.o$sssssSSSSssss$o.',
'.o$sSosssssssoSs$o.',
'.ossSosssssssoSsso.',
'.osssosssssssossso.',
'.osssosssssssossso.',
'.osssosssssssossso.',
'.osssosssssssossso.',
'.osssosssssssossso.',
'.osssosssssssossso.',
'.osssosssssssossso.',
'.o$ssossooossoss$o.',
'.o$soSsso.ossSos$o.',
'.o$soSsso.ossSos$o.',
'.ossoSsso.ossSosso.',
'.osso$sSo.oSs$osso.',
'.osSo$sSo.oSs$oSso.',
'.ososssso.ossssoso.',
'.ososssso.ossssoso.',
'.ooooosso.ossooooo.',
'..o$$$sso.oss$$$o..',
'..ossssso.ossssso..',
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
          'hunch': 'Zombie khom lưng', 'twist': 'Zombie ngoẹo cổ', 'crawl': 'Dáng bò rình',
          'heavy': 'To con', 'fat': 'Mập', 'brute': 'Đột biến khổng lồ'}
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
def break_column(rows, x, y0, y1, keep):
    """A shade column hugging an outline reads as a stripe: keep it only in the row
    ranges `keep` (2-3 cell clusters), mid skin elsewhere."""
    g = [list(r) for r in rows]
    for y in range(y0, y1 + 1):
        if g[y][x] in '$S' and not any(a <= y <= b for a, b in keep): g[y][x] = 's'
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
RAISE_FAR_FOOT = {'droop', 'reach', 'drag', 'hunch', 'twist', 'heavy', 'brute'}
def raise_far_foot(rows, regions):
    """The three-quarter turn (D-072): the far (left) foot stands one row back, so one row higher. The far
    shoe's block (its columns read off the sole row, left of the gap between the feet) moves up a row over
    the leg's last row; the shoe boxes follow."""
    x0, y0, x1, y1 = regions['shoeL']
    sole = rows[y1]
    a = next(x for x, c in enumerate(sole) if c != '.')
    b = a
    while b + 1 < len(sole) and sole[b + 1] != '.': b += 1
    out = [list(r) for r in rows]
    for y in range(y0, y1 + 1):
        for x in range(a, b + 1):
            out[y - 1][x] = rows[y][x]
    for x in range(a, b + 1): out[y1][x] = '.'
    regs = copy.deepcopy(regions)
    regs['shoeL'] = [x0, y0 - 1, x1, y1 - 1]
    if regs.get('flats'): regs['flats'][0] = [regs['flats'][0][0], regs['flats'][0][1] - 1, regs['flats'][0][2], regs['flats'][0][3] - 1]
    return [''.join(r) for r in out], regs
def add(pose, view, rows, head, regions, under=False, headcols=None, **opts):
    """A view of a pose: `rows` is the body and `head` = (view, x, y, shift) places the view's base
    head on it; with `head=None` the rows are the whole figure (its head drawn in) and `headcols`
    maps each head-grid column to a figure column for the items drawn in head space."""
    if view == 'SW' and pose in RAISE_FAR_FOOT and 'shoeL' in regions:
        rows, regions = raise_far_foot(rows, regions)
    if head is None:
        hview, hx, hy, shift = view, 0, 0, (lambda k: 0)
        fig = rows
    else:
        hview, hx, hy, shift = head
        fig = stamp_head(rows, hview, hx, hy, shift, under=under, **opts)
    table = [shift(k) for k in range(HEAD_W)]
    base = pose[:-2] if pose.endswith('_m') else pose
    label = LABELS[base] + (' lật' if pose.endswith('_m') else '') + f' ({view})'
    POSES.setdefault(pose, {})[view] = {'rows': fig, 'body': rows, 'headView': hview, 'headX': hx, 'headY': hy,
                                        'shift': table, 'regions': regions, 'label': label, 'headUnder': under,
                                        'headCols': headcols}

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
CRAWL_SW = break_column(CRAWL_SW, 2, 24, 34, [(24, 30)])
CRAWL_SW = break_column(CRAWL_SW, 4, 24, 34, [(24, 27)])
CRAWL_SW = break_column(CRAWL_SW, 16, 24, 34, [(24, 27)])
CRAWL_SW = break_column(CRAWL_SW, 19, 24, 34, [(24, 30)])
HEAVY_SW = break_column(HEAVY_SW, 21, 20, 27, [(20, 23)])
HEAVY_SW = break_column(HEAVY_SW, 16, 16, 30, [(19, 21), (28, 30)])
add('droop', 'SW', DROOP_SW, ('SW', 0, 2, lambda k: 0 if k < 5 else 1 if k < 9 else 2), {
    'torso': [4, 14, 12, 28], 'neck': [[7, 17, 13, 17]], 'shoulders': [[1, 14, 3, 18], [13, 16, 15, 19]],
    'sleeveL': {'short': [1, 19, 4, 22], 'long': [1, 19, 4, 24], 'torn': [1, 19, 4, 20]},
    'sleeveR': {'short': [12, 20, 16, 24], 'long': [12, 20, 16, 26]},
    'pants': [[3, 29, 11, 31], [2, 32, 14, 35]], 'shorts': [[3, 29, 11, 31], [2, 32, 14, 32]],
    'shoeL': [1, 36, 7, 39], 'shoeR': [9, 36, 16, 39], 'flats': [[1, 38, 7, 39], [9, 38, 16, 39]],
    'collar': [[7, 17, 7, 17], [13, 17, 13, 17], [8, 18, 12, 18]], 'hem': [5, 28, 11, 28], 'frayedXs': [5, 7, 9, 11],
    'chest': [6, 20], 'number': [7, 21], 'tie': [9, 19], 'belt': [8, 28], 'stains': [5, 21], 'gash': [14, 22],
    'skirt': {'x': 2, 'y': 29, 'rows': ['.o&kkkkkkkKo.', '.o&kkkkkkkKo.', 'o&kkkkkkkkkKo', 'o&kkkkkkkkkKo', 'oo.ooo.oooo.o']},
})
add('reach', 'SW', REACH_SW, ('SW', 3, 0, lambda k: 0), {
    # the far shoulder, arm and fist sit a column in (the three-quarter turn); the fists stay skin where
    # they overlap the torso box
    'torso': [7, 15, 15, 28], 'neck': [[9, 15, 13, 16], [10, 17, 12, 17], [7, 21, 7, 24], [14, 21, 14, 24]], 'shoulders': [[6, 15, 7, 18], [16, 15, 18, 18]],
    'sleeveL': {'short': [5, 19, 6, 20], 'long': [5, 19, 6, 20], 'torn': [5, 19, 6, 20]},
    'sleeveR': {'short': [15, 19, 18, 20], 'long': [15, 19, 18, 20]},
    'pants': [[5, 29, 17, 35]], 'shorts': [[5, 29, 17, 32]],
    'shoeL': [4, 36, 10, 39], 'shoeR': [12, 36, 18, 39], 'flats': [[4, 38, 10, 39], [12, 38, 18, 39]],
    'collar': [[9, 17, 9, 17], [13, 17, 13, 17], [10, 18, 12, 18]], 'hem': [8, 28, 14, 28], 'frayedXs': [8, 10, 12, 14],
    'chest': [9, 24], 'number': [10, 23], 'tie': [11, 19], 'belt': [11, 28], 'stains': [7, 24], 'gash': [6, 21],
    'skirt': {'x': 5, 'y': 29, 'rows': ['.o&kkkkkkkKo.', '.o&kkkkkkkKo.', 'o&kkkkkkkkkKo', 'o&kkkkkkkkkKo', 'oo.ooo.oooo.o']},
})
add('drag', 'SW', DRAG_SW, ('SW', 0, 1, lambda k: 2 if k < 3 else 1 if k < 9 else 0), {
    'torso': [4, 15, 12, 28], 'neck': [[6, 15, 10, 16], [7, 17, 9, 17]], 'shoulders': [[2, 15, 3, 19], [13, 15, 15, 19]],
    'sleeveL': {'short': [2, 21, 4, 23], 'long': [2, 21, 4, 25], 'torn': [2, 21, 4, 22]},
    'sleeveR': {'short': [12, 21, 16, 23], 'long': [12, 21, 16, 25]},
    'pants': [[0, 29, 20, 35]], 'shorts': [[0, 29, 20, 32]],
    'shoeL': [1, 36, 7, 39], 'shoeR': [10, 36, 18, 39], 'flats': [[1, 38, 7, 39], [10, 38, 18, 39]],
    'collar': [[6, 17, 6, 17], [10, 17, 10, 17], [7, 18, 9, 18]], 'hem': [5, 28, 11, 28], 'frayedXs': [5, 7, 9, 11],
    'chest': [6, 22], 'number': [7, 23], 'tie': [8, 19], 'belt': [8, 28], 'stains': [5, 21], 'gash': [14, 24],
    'skirt': {'x': 2, 'y': 29, 'rows': ['.o&kkkkkkkKo.', '.o&kkkkkkkKo.', 'o&kkkkkkkkkKo', 'o&kkkkkkkkkKo', 'oo.ooo.oooo.o']},
})
add('hunch', 'SW', HUNCH_SW, ('SW', 1, 4, lambda k: 0), {
    'torso': [5, 19, 13, 27], 'neck': [[7, 19, 11, 19]],
    'shoulders': [[3, 14, 4, 15], [2, 15, 5, 16], [2, 17, 6, 17], [2, 18, 7, 18], [15, 14, 17, 15], [13, 16, 17, 16], [12, 17, 17, 17], [11, 18, 17, 18]],
    'sleeveL': {'short': [2, 19, 5, 22], 'long': [2, 19, 5, 26], 'torn': [2, 19, 5, 20]},
    'sleeveR': {'short': [13, 19, 17, 22], 'long': [13, 19, 17, 26]},
    'pants': [[5, 28, 13, 35]], 'shorts': [[5, 28, 13, 31]],
    'shoeL': [2, 36, 8, 39], 'shoeR': [10, 36, 16, 39], 'flats': [[2, 38, 8, 39], [10, 38, 16, 39]],
    'collar': [[6, 19, 6, 19], [12, 19, 12, 19], [7, 20, 11, 20]], 'hem': [6, 27, 12, 27], 'frayedXs': [6, 8, 10, 12],
    'chest': [7, 21], 'number': [8, 22], 'tie': [9, 21], 'belt': [9, 27], 'stains': [6, 21], 'gash': [15, 23],
    'skirt': {'x': 4, 'y': 28, 'rows': ['.o&kkkkkKo.', '.o&kkkkkKo.', 'o&kkkkkkkKo', 'o&kkkkkkkKo', 'o.ooo.ooo.o']},
})
add('twist', 'SW', TWIST_SW, ('SW', 1, 1, lambda k: -1 if k < 3 else 0 if k < 6 else 1 if k < 9 else 2), {
    'torso': [5, 16, 13, 28], 'neck': [[8, 15, 14, 17]], 'shoulders': [[3, 19, 4, 20], [15, 19, 17, 20]],
    'sleeveL': {'short': [3, 21, 5, 22], 'long': [3, 21, 5, 24], 'torn': [3, 21, 5, 21]},
    'sleeveR': {'short': [13, 21, 17, 22], 'long': [13, 21, 17, 24]},
    'pants': [[3, 29, 15, 35]], 'shorts': [[3, 29, 15, 32]],
    'shoeL': [2, 36, 8, 39], 'shoeR': [10, 36, 16, 39], 'flats': [[2, 38, 8, 39], [10, 38, 16, 39]],
    'collar': [[7, 17, 7, 17], [15, 17, 15, 17], [8, 18, 14, 18]], 'hem': [6, 28, 12, 28], 'frayedXs': [6, 8, 10, 12],
    'chest': [7, 22], 'number': [8, 23], 'tie': [9, 19], 'belt': [9, 28], 'stains': [6, 21], 'gash': [15, 24],
    'skirt': {'x': 3, 'y': 29, 'rows': ['.o&kkkkkkkKo.', '.o&kkkkkkkKo.', 'o&kkkkkkkkkKo', 'o&kkkkkkkkkKo', 'oo.ooo.oooo.o']},
})
add('crawl', 'SW', CRAWL_SW, ('SW', 2, 6, lambda k: 0), {
    'torso': [5, 21, 15, 28], 'neck': [[7, 20, 13, 22]], 'shoulders': [],
    'sleeveL': {'short': [1, 24, 5, 27], 'long': [1, 24, 5, 31], 'torn': [1, 24, 5, 25]},
    'sleeveR': {'short': [15, 24, 20, 27], 'long': [15, 24, 20, 31]},
    'pants': [[5, 28, 15, 36]], 'shorts': [[5, 28, 15, 31]],
    'shoeL': [5, 37, 9, 39], 'shoeR': [11, 37, 15, 39], 'flats': [[5, 38, 9, 39], [11, 38, 15, 39]],
    'collar': [[7, 22, 7, 22], [13, 22, 13, 22], [8, 23, 12, 23]], 'hem': [6, 27, 14, 27], 'frayedXs': [6, 8, 10, 12, 14],
    'chest': [7, 25], 'number': [8, 25], 'tie': [10, 24], 'belt': [10, 27], 'stains': [6, 24], 'gash': [2, 29],
    'skirt': {'x': 4, 'y': 28, 'rows': ['.o&kkkkkkkKo.', '.o&kkkkkkkKo.', 'o&kkkkkkkkkKo', 'o&kkkkkkkkkKo', 'oo.ooo.oooo.o']},
})
add('heavy', 'W', HEAVY_W, ('W', 3, 0, lambda k: 0), {
    # the torso box spans chest front and back; the arm hanging over the flank is excluded through `neck`
    'torso': [3, 16, 15, 30], 'neck': [[5, 16, 10, 17], [5, 18, 10, 30]], 'shoulders': [[5, 16, 10, 17]],
    'sleeveL': {'short': [5, 18, 10, 22], 'long': [5, 18, 10, 25], 'torn': [5, 18, 10, 19]},
    'sleeveR': {'short': [5, 18, 10, 22], 'long': [5, 18, 10, 25]},
    'pants': [[5, 31, 16, 40]], 'shorts': [[5, 31, 16, 35]],
    'shoeL': [4, 41, 10, 45], 'shoeR': [11, 41, 17, 45], 'flats': [[4, 44, 10, 45], [11, 44, 17, 45]],
    'collar': [[8, 16, 14, 16]], 'hem': [11, 30, 15, 30], 'frayedXs': [11, 13, 15],
    'chest': [12, 21], 'gash': [6, 24],
    'skirt': {'x': 5, 'y': 31, 'rows': ['o&kkkkkkkKo..', 'o&kkkkkkkkKo.', 'o&kkkkkkkkKo.', 'o&kkkkkkkkkKo', 'ooooooooooooo']},
})
add('heavy', 'SW', HEAVY_SW, ('SW', 3, 0, lambda k: 0), {
    'torso': [6, 15, 16, 30], 'neck': [[8, 15, 14, 18], [6, 15, 6, 18], [16, 15, 16, 18]],
    'shoulders': [[6, 17, 6, 17], [16, 16, 17, 17], [3, 18, 6, 19], [16, 18, 20, 19]],
    'sleeveL': {'short': [3, 20, 5, 23], 'long': [3, 20, 5, 25], 'torn': [3, 20, 5, 21]},
    'sleeveR': {'short': [17, 20, 22, 23], 'long': [17, 20, 22, 25]},
    'pants': [[0, 31, 22, 40]], 'shorts': [[0, 31, 22, 35]],
    'shoeL': [4, 41, 10, 44], 'shoeR': [12, 41, 19, 44], 'flats': [[4, 43, 10, 44], [12, 43, 19, 44]],
    'collar': [[8, 18, 14, 18]], 'hem': [7, 30, 15, 30], 'frayedXs': [7, 9, 11, 13, 15],
    'chest': [8, 22], 'number': [10, 22], 'tie': [11, 19], 'belt': [11, 30], 'stains': [8, 24], 'gash': [20, 24],
    'skirt': {'x': 3, 'y': 31, 'rows': ['.o&kkkkkkkkkkkkkKo.', '.o&kkkkkkkkkkkkkKo.', 'o&kkkkkkkkkkkkkkkKo', 'o&kkkkkkkkkkkkkkkKo', 'oo.ooo.ooooo.ooo.oo']},
})
HUNCH_N_REGIONS = {
    'torso': [5, 13, 13, 27], 'neck': [],
    'shoulders': [[1, 14, 3, 15], [1, 16, 5, 16], [1, 17, 6, 17], [1, 18, 7, 18], [15, 14, 17, 15], [13, 16, 17, 16], [12, 17, 17, 17], [11, 18, 17, 18]],
    'sleeveL': {'short': [1, 19, 5, 22], 'long': [1, 19, 5, 26], 'torn': [1, 19, 5, 20]},
    'sleeveR': {'short': [13, 19, 17, 22], 'long': [13, 19, 17, 26]},
    'pants': [[4, 28, 14, 35]], 'shorts': [[4, 28, 14, 31]],
    'shoeL': [2, 36, 8, 39], 'shoeR': [10, 36, 16, 39], 'flats': [[2, 38, 8, 39], [10, 38, 16, 39]],
    'collar': [[7, 12, 11, 12]], 'hem': [6, 27, 12, 27], 'frayedXs': [6, 8, 10, 12],
    'stains': [7, 21], 'gash': [15, 23],
    'skirt': {'x': 3, 'y': 28, 'rows': ['.o&kkkkkkkKo.', '.o&kkkkkkkKo.', 'o&kkkkkkkkkKo', 'o&kkkkkkkkkKo', '.o.ooo.ooo.o.']},
}

add('hunch', 'N', HUNCH_N, ('N', 1, 4, lambda k: 0), HUNCH_N_REGIONS, under=True)
add('hunch', 'NW', HUNCH_N, ('NW', 1, 4, lambda k: 0), HUNCH_N_REGIONS, under=True)
add('crawl', 'W', CRAWL_W, ('W', 1, 6, lambda k: 0), {
    'torso': [6, 21, 12, 28], 'neck': [], 'shoulders': [],
    'sleeveL': {'short': [4, 22, 7, 25], 'long': [1, 22, 7, 34], 'torn': [4, 22, 7, 23]},
    'sleeveR': {'short': [4, 22, 7, 25], 'long': [1, 22, 7, 34]},
    'pants': [[4, 29, 13, 35]], 'shorts': [[4, 29, 13, 31]],
    'shoeL': [3, 36, 8, 40], 'shoeR': [9, 36, 14, 40], 'flats': [[3, 39, 8, 40], [9, 39, 14, 40]],
    'collar': [], 'hem': [6, 28, 11, 28], 'frayedXs': [6, 8, 10],
    'chest': [8, 24], 'gash': [7, 26],
    'skirt': {'x': 4, 'y': 29, 'rows': ['o&kkkkkKo..', 'o&kkkkkkKo.', 'o&kkkkkkKo.', 'o&kkkkkkkKo', 'ooooooooooo']},
}, full_chin=True)


# ------------------------------------------------------------------ fat build (Kẻ Phun): the base figure widened
# S is FORM_FAT's band expansion (heroforms.ts); SW, N and NW apply the same
# bands to that view's base figure (same height, same columns to widen, rows
# centred as buildForm does). W is widened by hand: the head two columns
# deeper, the back two columns further, the belly bulging in front of the arm.
FAT_BANDS = [((0, 16), {'center': 2}), ((17, 23), {'center': 4}), ((24, 28), {'center': 6}),
             ((29, 29), {'pairs': [(5, 3)]}), ((30, 35), {'pairs': [(5, 2)]}), ((36, 39), {'pairs': [(4, 1), (5, 1)]})]
def widen_sym(rows, bands, center=8):
    out = []
    for y, r in enumerate(rows):
        rep = [1] * len(r)
        for (y0, y1), b in bands:
            if y0 <= y <= y1:
                rep[center] += b.get('center', 0)
                if 'col' in b: rep[b['col'][0]] += b['col'][1]   # one named column
                for x, extra in b.get('pairs', []):   # a column and its mirror about the centre
                    rep[x] += extra; rep[2 * center - x] += extra
        out.append(''.join(c * rep[x] for x, c in enumerate(r)))
    W = max(len(r) for r in out)
    res = []
    for r in out:
        pad = W - len(r); assert pad % 2 == 0, (r, pad)
        res.append('.' * (pad // 2) + r + '.' * (pad // 2))
    return res
assert widen_sym(FIG['S'], FAT_BANDS) == FIG['fat_S'], 'fat S rebuilt differently from buildForm(FORM_FAT)'
# head-grid column -> figure column for the symmetric fat views (the centre column is tripled)
FAT_HEADCOLS = [x + 2 if x < 8 else 11 if x == 8 else x + 4 for x in range(HEAD_W)]
def dup_cols(rows, dups, width):
    out = []
    for r in rows:
        t = ''.join(c * (1 + dups.get(x, 0)) for x, c in enumerate(r))
        out.append(t + '.' * (width - len(t)))
    return out
FAT_W = dup_cols(FIG['W'][:15], {7: 1, 10: 1}, 18) + [
'....ossssssssso...',
'....o$SSssss$$$o..',
'....osSsssssss$o..',
'...osss$sossssso..',
'...o$s$$sossssso..',
'...o$s$$$ossss$o..',
'...o$sSSSoosss$o..',
'...ossssSoSsss$o..',
'..oo$$$ssossss$o..',
'.oso$$ssossss$so..',
'o$so$$$soossssSo..',
'o$so$$soSsssssSo..',
'o$sosssoSsssssso..',
'.osoSSssoSssssso..',
'..ooSSossssoooo...',
'...oSSSo$sssso....',
'...oSSSSosssso....',
'....oSSSoS$ssSo...',
'....oSSSoo$sSSo...',
'....oSSSSos$sso...',
'....oSSSSoS$ssso..',
'...ooooSSoSsssso..',
'..oSSSSSoooSSSso..',
'..ooSSSSosssssso..',
'..ooooooo$ssss$o..',
'........oooooooo..',
]
FAT_W_HEADCOLS = [x if x <= 7 else x + 1 if x <= 10 else x + 2 for x in range(HEAD_W)]
# The three-quarter heads keep their eyes one cell wide: the head rows repeat column 7 (between the eyes) instead
# of the centre column, which is the near eye's own.
FAT_BANDS_Q = [((0, 16), {'col': (7, 2)})] + [b for b in FAT_BANDS if b[0] != (0, 16)]
FAT_SW = widen_sym(FIG['SW'], FAT_BANDS_Q)
FAT_N = widen_sym(FIG['N'], FAT_BANDS)
FAT_NW = widen_sym(FIG['NW'], FAT_BANDS_Q)
def fat_regions(**over):
    r = {
        'torso': [5, 15, 17, 28], 'neck': [[8, 15, 14, 16], [9, 17, 13, 17]], 'shoulders': [[2, 15, 4, 18], [18, 15, 20, 18]],
        'sleeveL': {'short': [0, 18, 5, 22], 'long': [0, 18, 5, 24], 'torn': [0, 18, 5, 20]},
        'sleeveR': {'short': [17, 18, 22, 22], 'long': [17, 18, 22, 24]},
        'pants': [[0, 29, 22, 35]], 'shorts': [[0, 29, 22, 32]],
        'shoeL': [2, 36, 10, 39], 'shoeR': [12, 36, 20, 39], 'flats': [[2, 38, 10, 39], [12, 38, 20, 39]],
        'collar': [[8, 17, 8, 17], [14, 17, 14, 17], [9, 18, 13, 18]], 'hem': [6, 28, 16, 28], 'frayedXs': [6, 8, 10, 12, 14, 16],
        'chest': [7, 20], 'number': [10, 21], 'tie': [11, 19], 'belt': [11, 28], 'stains': [8, 22], 'gash': [2, 23],
        'skirt': {'x': 2, 'y': 29, 'rows': ['.o&kkkkkkkkkkkkkKo.', '.o&kkkkkkkkkkkkkKo.', 'o&kkkkkkkkkkkkkkkKo', 'o&kkkkkkkkkkkkkkkKo', 'oo.ooo.ooooo.ooo.oo']},
    }
    r.update(over)
    return r
add('fat', 'SW', FAT_SW, None, fat_regions(shoulders=[[3, 15, 4, 18], [18, 15, 20, 18]], sleeveL={'short': [1, 18, 5, 22], 'long': [1, 18, 5, 24], 'torn': [1, 18, 5, 20]}), headcols=FAT_HEADCOLS)
add('fat', 'N', FAT_N, None, back_regions(fat_regions(stains=[8, 21])), headcols=FAT_HEADCOLS)
add('fat', 'NW', FAT_NW, None, back_regions(fat_regions(stains=[8, 21], shoulders=[[2, 15, 4, 18], [18, 15, 19, 18]], sleeveR={'short': [17, 18, 21, 22], 'long': [17, 18, 21, 24]})), headcols=FAT_HEADCOLS)
add('fat', 'W', FAT_W, None, {
    'torso': [9, 16, 15, 29], 'neck': [[9, 16, 9, 17]], 'shoulders': [[5, 16, 8, 17]],
    'sleeveL': {'short': [3, 18, 8, 22], 'long': [3, 18, 8, 25], 'torn': [3, 18, 8, 19]},
    'sleeveR': {'short': [3, 18, 8, 22], 'long': [3, 18, 8, 25]},
    'pants': [[0, 29, 15, 35]], 'shorts': [[0, 29, 15, 32]],
    'shoeL': [2, 36, 8, 40], 'shoeR': [9, 36, 15, 40], 'flats': [[2, 39, 8, 40], [9, 39, 15, 40]],
    'collar': [[6, 16, 12, 16]], 'hem': [10, 28, 14, 28], 'frayedXs': [10, 12, 14],
    'chest': [11, 20], 'gash': [5, 23],
    'skirt': {'x': 3, 'y': 29, 'rows': ['o&kkkkkkkKo..', 'o&kkkkkkkkKo.', 'o&kkkkkkkkKo.', 'o&kkkkkkkkkKo', 'ooooooooooooo']},
}, headcols=FAT_W_HEADCOLS)

# ------------------------------------------------------------------ brute (Đột Biến): the ×1.5 giant with the claw arm and spikes
# S is HERO_BRUTE_S (31×60). SW turns the face (eyes slid to the far edge, the
# far ear gone), tucks the claw arm two columns behind the torso and shades the
# near flank. N is S flipped with the torso flattened and the head's lower half
# redrawn as a bald nape (mid skin, shadow on the lower right, the ears). NW is
# the back of SW with the far side of the nape a column narrower. W is drawn
# by hand (22×61): the claw arm is shown on the near side so the brute's mark
# stays visible from the side (as D-042 lets a mirrored view keep the drawn
# side), the spikes rise from the near shoulder in front of the jaw.
BRUTE_S = FIG['brute_S']
def replace_span(rows, y, x0, text):
    g = list(rows); r = list(g[y]); r[x0:x0 + len(text)] = list(text); g[y] = ''.join(r); return g
# SW: face turned to the far (left) side
BRUTE_SW = list(BRUTE_S)
# (the face rows of the giant, drawn like the base SW head: far brow and eye against the far outline,
#  near eye slid a column in, the near cheek in shadow; the giant sits four columns into the brute canvas)
BRUTE_SW[12] = '....' + '..osssssssssssssSssSSso..' + '..'
BRUTE_SW[13] = '....' + '..oxeesssssssseexssSSso..' + '..'
BRUTE_SW[14] = '....' + '..oseesssssssseesssSSso..' + '..'
BRUTE_SW[15] = '....' + '...ossssssssssssssSSso...' + '..'
BRUTE_SW[16] = '....' + '....oss$$$$sssssSSSso....' + '..'
assert all(len(BRUTE_SW[y]) == 31 for y in range(12, 17)), [len(BRUTE_SW[y]) for y in range(12, 17)]
# the claw arm two columns behind the torso edge (rows 28-46 hold it in columns 0-8; the torso keeps columns 9-10)
for y in range(28, 45):
    r = BRUTE_SW[y]
    BRUTE_SW[y] = '..' + r[0:9] + r[11:]
    assert len(BRUTE_SW[y]) == len(r)
# the claws (rows 45-46) hang in front of the far thigh
r = BRUTE_SW[45]; BRUTE_SW[45] = '...' + r[1:8] + r[10:]
r = BRUTE_SW[46]; BRUTE_SW[46] = '....' + r[2:7] + r[9:]
assert all(len(t) == 31 for t in BRUTE_SW)
# near flank in shadow (the torso's last interior column)
BRUTE_SW = [(''.join('S' if (x == 22 and (27 <= y <= 30 or 41 <= y <= 44) and c in 's$') else c for x, c in enumerate(r))) for y, r in enumerate(BRUTE_SW)]
# N: flipped, flattened, bald nape
NAPE = ['ossssssssssssssSSSSso', 'o$ossssssssssssSSSo$o', 'o$ossssssssssssSSSo$o', 'oosssssssssssSSSSoo',
        'ossssssssssSSSSSo', 'ossssssssSSSSSo', 'ossssssSSSSSo', 'ossssSSSSSo', 'ossSSSSSo', 'oosooSSSoosoo']
NAPE_X = [4, 4, 4, 5, 6, 7, 8, 9, 10, 8]   # columns in the flipped figure (the giant's head is centred on column 16 of 31)
def nape(rows, narrow_far=False):
    out = list(rows)
    for i, (x, t) in enumerate(zip(NAPE_X, NAPE)):
        if narrow_far and i < 8:   # rows 20-21 keep their width: the shoulders below need their outline
            t = t[:-2] + t[-1]          # drop the last interior column: the far side a column narrower
            out = replace_span(out, 12 + i, x, t + '.')
        else:
            out = replace_span(out, 12 + i, x, t)
    return out
BRUTE_N = nape(flatten(flipx(BRUTE_S), [8, 24, 20, 44]))
BRUTE_NW = nape(flatten(flipx(BRUTE_SW), [8, 24, 20, 44]), narrow_far=True)
BRUTE_W = body(22, 61, 0, [
'.......ooooooooo......',
'.....ooSsssssSSSoo....',
'....oSs$$$$$$sssSSo...',
'...os$$$$$$$$$sssSSo..',
'..os$$$$$$$$$$ssSSSo..',
'..os$$$$$$$$$$ssSSSo..',
'.oss$$$$$$$$$sssSSSSo.',
'.osss$$$$$$$ssssSSSSo.',
'.ossss$$$$$sssssSSSSo.',
'.ossssssssssssssSSSSo.',
'.ossssssssssSsSSSSSSo.',
'.osssssseexSssSSSSSSo.',
'.osssssseessssSSSSSSo.',
'.ossssssssssssSSSSSSo.',
'o$$ssssssssssssSSSSSo.',
'o$$$sssssssssssSSSSo..',
'.o$$$ssssssssssSSSo...',
'..o$$$sssssssssSSo....',
'...o$sssssssssSSo.....',
'....ossssosssSSo......',
'.....ossoxosoSo.......',
'......oooxooxoSo......',
'......ooxxxoxosso.....',
'.....osoxxxxxossso....',
'....o$$SSssssss$$$o...',
'....ossSsssssSs$$$o...',
'...ossSSssssssSss$$o..',
'...o$ssss$osssssssso..',
'..o$$sss$$oSssssss$$o.',
'..o$$sss$$oSssssss$$o.',
'..o$$sss$$oSssssss$$o.',
'..o$ssSSSSoSSsssss$$o.',
'..o$sssssSoSSsssss$$o.',
'..o$$$ssssossssss$$so.',
'..o$$$ssssossssss$$so.',
'..o$$sssssosssss$$sso.',
'.o$$$ssssSosssss$$sso.',
'.o$$$ssssSoSsssss$sSo.',
'.o$$$$sssSoSsssss$sSo.',
'.o$$$ssssSoSSssssssSo.',
'.o$sssssSSoSSssssssSo.',
'.oSssssssSoSSsssssSo..',
'.oSsssssSSoSsssssSo...',
'..oSsssSoossssooooo...',
'..oSsssSoo$ssssso.....',
'..oSsssSoo$ssssso.....',
'..oSsSsSoo$ssssso.....',
'..oSoSoSoo$ssssso.....',
'...o.o.o.osssssso.....',
'....oooooosssssso.....',
'....oSSSSosssssso.....',
'....oSSSSosssssso.....',
'.....oSSSoS$ssSo......',
'.....oSSSoo$sSSo......',
'.....oSSSSos$sso......',
'.....oSSSSoS$ssso.....',
'....ooooSSoSsssso.....',
'...oSSSSSoooSSSso.....',
'...ooSSSSosssssso.....',
'...ooooooo$ssss$o.....',
'.........oooooooo.....',
])
def brute_regions(**over):
    r = {
        'torso': [10, 24, 22, 44], 'neck': [[12, 24, 20, 25]], 'shoulders': [],
        'sleeveL': {'short': [0, 28, 8, 32], 'long': [0, 28, 8, 40], 'torn': [0, 28, 8, 29]},
        'sleeveR': {'short': [23, 27, 28, 31], 'long': [23, 27, 28, 40]},
        'pants': [[8, 45, 24, 56]], 'shorts': [[8, 45, 24, 50]],
        'shoeL': [5, 54, 15, 59], 'shoeR': [17, 54, 27, 59], 'flats': [[5, 58, 15, 59], [17, 58, 27, 59]],
        'collar': [[12, 25, 20, 25]], 'hem': [11, 44, 21, 44], 'frayedXs': [11, 13, 15, 17, 19, 21],
        'chest': [12, 30], 'stains': [12, 32], 'gash': [25, 34],
        'skirt': {'x': 7, 'y': 45, 'rows': ['.o&kkkkkkkkkkkKo.', '.o&kkkkkkkkkkkKo.', 'o&kkkkkkkkkkkkkKo', 'o&kkkkkkkkkkkkkKo', 'oo.ooo.oooo.ooo.o']},
    }
    r.update(over)
    return r
add('brute', 'SW', BRUTE_SW, None, brute_regions(sleeveL={'short': [2, 28, 8, 32], 'long': [2, 28, 8, 40], 'torn': [2, 28, 8, 29]}))
add('brute', 'N', BRUTE_N, None, back_regions(mirror_regions(brute_regions(), 31)))
add('brute', 'NW', BRUTE_NW, None, back_regions(mirror_regions(brute_regions(), 31)))
add('brute', 'W', BRUTE_W, None, {
    'torso': [11, 24, 19, 43], 'neck': [], 'shoulders': [[5, 22, 10, 23]],
    'sleeveL': {'short': [1, 27, 10, 32], 'long': [1, 27, 10, 42], 'torn': [1, 27, 10, 28]},
    'sleeveR': {'short': [1, 27, 10, 32], 'long': [1, 27, 10, 42]},
    'pants': [[9, 44, 16, 48], [4, 49, 16, 55]], 'shorts': [[9, 44, 16, 48], [4, 49, 16, 51]],
    'shoeL': [3, 56, 9, 60], 'shoeR': [10, 56, 16, 60], 'flats': [[3, 59, 9, 60], [10, 59, 16, 60]],
    'collar': [[11, 24, 17, 24]], 'hem': [11, 43, 13, 43], 'frayedXs': [11, 13],
    'chest': [13, 30], 'gash': [4, 33],
    'skirt': {'x': 4, 'y': 44, 'rows': ['o&kkkkkkkkKo.', 'o&kkkkkkkkkKo', 'o&kkkkkkkkkKo', 'o&kkkkkkkkkKo', 'ooooooooooooo']},
})

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
# craft lint (pixel_lint.py, calibrated on the reference): warnings only, printed so stripes and jaggies get fixed
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pixel_lint
nwarn = 0
for pose, views in POSES.items():
    for view, d in views.items():
        ws = pixel_lint.lint(d['rows'])
        nwarn += len(ws)
        if ws and '--quiet' not in sys.argv: pixel_lint.summarize(f'lint {pose}@{view}', ws, show=4)
print('lint warnings:', nwarn)
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
  /** Figure column of each head-grid column when the head is drawn wider than the base head (17 entries). */
  headCols?: number[];
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
        if d.get('headCols'): under += f", headCols: {ts(d['headCols'])}"
        out.append(f"    {view}: {{ rows: {ts(d['rows'])}, body: {ts(d['body'])}{under}, headView: '{d['headView']}', headX: {d['headX']}, headY: {d['headY']}, shift: {ts(d['shift'])}, regions: {ts(d['regions'])}, label: {ts(d['label'])} }},\n")
    out.append("  },\n")
out.append("};\n")
open(OUT, 'w').write(''.join(out))
print('wrote', OUT)
