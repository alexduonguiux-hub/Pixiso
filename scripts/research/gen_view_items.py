"""Per-view drawings (SW, W, NW, N) of hair, hats, faces and body items for the
standing base figure. Validates each drawing composed on its view figure and
emits packages/sprite-kit/src/views64.items.ts."""
import json, os, sys
# ASCII of the five standing figures: `DUMP=test-output/view_figures.json pnpm exec tsx scripts/hero-views.ts`
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FIG = json.load(open(sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else os.path.join(ROOT, 'test-output', 'view_figures.json')))
OUT = os.path.join(ROOT, 'packages', 'sprite-kit', 'src', 'views64.items.ts')

def O(x, y, rows, head=True, rigid=False, under=False):
    return {'kind': 'overlay', 'x': x, 'y': y, 'rows': rows, 'head': head, 'rigid': rigid, 'under': under}
def R(box, to, head=True):
    return {'kind': 'remap', 'box': box, 'to': to, 'head': head}
def L(box, head=True):
    return {'kind': 'seam', 'box': box, 'head': head}

# ---------------------------------------------------------------- hair
CROWN_SPIKY = [  # rows -2..7 (S spiky)
'.....o...o...o...','....o#o.o#o.o#o..','...o#hho#hho#hho.','..o##hhhhhhhhhHo.','.o##hhhhhhhhhhHo.',
'.o#hhhhhhhhhhhHo.','.o#hhhhhhhhhhhHo.','..o#hhhhhhhhhHo..','..ohhhhhHhhhhho..','..oHhhhhHHhhhHo..']
CROWN = ['......ooooo......','....oo#hhhhoo....','...o##hhhhhhho...','..o##hhhhhhhhho..','..o#hhhhhhhhhho..',
         '.o#hhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhHhhhHhhho.']  # rows 0-7 shared by bob/long/wild
CROWN_CURLY = ['.....ooooooo.....','...oo#hhhhhhoo...','..o#hhHHhhHHhho..','.o##hhhhhhhhhhho.','o#hHHhhhHHhhhHHho',
               'o#hhhhhhhhhhhhhho','.o#hhHHhhHHhhhho.','o#hhhhhHHhhHHhhho']
CROWN_SWEPT = ['......ooooo......','....oo#hhhhoo....','...o##hhhhhhho...','..o##hhhhhhhhho..','..o#hhhhhhhhhho..',
               '.o#hhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhHhhhhhho.','.oHhhhhhHHhhhhHo.']  # rows 0-8
CROWN_PONY = ['......ooooo......','....oo#hhhhoo....','...o##hhhhhhho...','...o#hhhhhhhho...','..o#hhhhhhhhhho..',
              '..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','..oHhhhhhhhhhHo..']  # rows 0-7

NAPE_SHORT = ['.ohhhhhhhhhhhhho.','...oHhhhhhhhHo...','...oHhhhhhhhHo...','...oHHhhhhhHHo...','....oHHHHHHHo....','.....ooooooo.....']  # rows 8-13

HAIR = {}
HAIR['SPIKY'] = {
  'SW': O(0,-2, CROWN_SPIKY + ['.....HHH..HHHhH..']),
  'N':  O(0,-2, CROWN_SPIKY + NAPE_SHORT),
  'W':  O(0,-2, ['....o..o..o...','...o#oo#oo#o..','..o#ho#ho#hho.','.o##hhhhhhhho.','o##hhhhhhhhhHo','o#hhhhhhhhhhHo',
                 'o#hhhhhhhhhhHo','ohhhhhhhhhhhHo','oHhH.....hhHo.','.ohH......hHo.','..........HHo.','.........HHo..',
                 '........HHHo..','.........o....']),
}
HAIR['CURLY'] = {
  'SW': O(0,0, CROWN_CURLY + ['.oh..HHH..HHhhho.','ohh..........hhho','.oh..........hhho','ohH..........hHho','.oH..........HHo.','..o..........oo..']),
  'N':  O(0,0, CROWN_CURLY + ['.ohhHHhhHHhhhhho.','ohhhhhhhhhhhhhhho','.ohhHHhhhhHHhhho.','ohHhhhhhhhhhhhHho','.oHHhhhhhhhhhHHo.','..ooHHHHHHHHHoo..','....ooooooooo....']),
  'W':  O(0,0, ['...oooooooo...','..o#hhhhhhhoo.','.o#hhHHhhhhhho','o#hhhhhhhhHHho','o#hHHhhhhhhhho','.o#hhhhhHHhhho','o#hhhhhhhhhhHo',
                'oHhh..hhhhhHho','.ohH..hhhhhHho','.oh...hhhhHhho','..o...ohhhHhho','.......oHhHho.','........oHHo..','.........oo...']),
}
HAIR['SWEPT'] = {
  'SW': O(0,0, CROWN_SWEPT + ['.oh..........hHo.','.oh..........hHo.','..o..........oo..']),
  'N':  O(0,0, CROWN_SWEPT + ['.ohHhhhhhhhhhHho.','.ohHhhhhhhhhhHho.','..oHHhhhhhhhHHo..','...ooHHHHHHHoo...','.....ooooooo.....']),
  'W':  O(0,0, ['...oooooooo...','..o#hhhhhhho..','.o#hhhhhhhhho.','.o#hhhhhhhhho.','o#hhhhhhhhhhHo','o#hhhhhhhhhhHo','ohhhhhhhhhhhHo',
                'oHhhhhhHhhhHo.','.oHH......HHo.','..........HHo.','.........HHo..','........HHHo..','.........o....']),
}
HAIR['BOB'] = {
  'SW': O(0,0, CROWN + ['.oh..HHH..HHhhho.','.oh..........hhho','.oh..........hhho','.oH..........hHo.','..oH.........oHo.','...o.........oo..']),
  'N':  O(0,0, CROWN + ['.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.oHhhhhhhhhhhhHo.','..oHHhhhhhhhHHo..','...ooHHHHHHHoo...','.....ooooooo.....']),
  'W':  O(0,0, ['...oooooooo...','..o#hhhhhhho..','.o#hhhhhhhhho.','.o#hhhhhhhhho.','o#hhhhhhhhhhHo','o#hhhhhhhhhhHo','ohhhhhhhhhhhHo',
                'oHhH..hhhhhHho','.ohH..ohhhhHho','.oh...ohhhhHho','..o...ohhhHhho','......oHhhHho.','.......oHHHo..','........oooo..']),
}
HAIR['WILD'] = {
  'SW': O(0,0, CROWN + ['.oh..HHH..HHhhho.','.oh..........hhho','ohh..........hhho','.oh..........hhho','.oh..........hhho','.oH.........oHhho',
                        'ohH..........Hhho','.oH..........HHo.','.oHo.........oHo.','..o...........o..']),
  'N':  O(0,0, CROWN + ['.ohhhhhhhhhhhhho.','.ohhHHhhhhhhhhho.','ohhhhhhhhHHhhhho.','.ohhhhHHhhhhhhhho','.ohhhhhhhhhHHhho.','.ohHhhhhhhhhhhHo.',
                        'ohhHhhhhhhhhhHhho','.oHHhhhhhhhhhHHo.','.oHoHHHHHHHHHoHo.','..ooooooooooooo..']),
  'W':  O(0,0, ['...oooooooo...','..o#hhhhhhho..','.o#hhhhhhhhho.','.o#hhhhhhhhho.','o#hhhhhhhhhhHo','o#hhhhhhhhhhHo','ohhhhhhhhhhhHo',
                'oHhH..hhhhhHho','.ohH..ohhhhHho','.ohH..ohhhhHho','.oH...ohhhHhho','..o...oHhhHhho','......oHhhHHo.','.......oHhHHo.',
                '.......oHhHHo.','.......oHhHHo.','........oHHo..','.........oo...']),
}
HAIR['PONYTAIL'] = {
  'SW': [O(0,0, CROWN_PONY + ['............HhH..']), O(13,10, ['.ooo','ohHo','ohHo','ohHo','oHHo','.oo.'])],
  'N':  [O(0,0, CROWN_PONY + ['..HhHhhhhhhhHhH..','...oHhhhhhhhHo...','...oHhhhhhhhHo...','...oHHhhhhhHHo...','....oHHHHHHHo....']),
         O(7,12, ['.ooo','ohHo','ohHo','ohHo','oHHo','.oo.'])],
  'W':  [O(0,0, ['...oooooooo...','..o#hhhhhhho..','.o#hhhhhhhhho.','.o#hhhhhhhhho.','o#hhhhhhhhhhHo','o#hhhhhhhhhhHo','ohhhhhhhhhhhHo',
                 'oHhH.....hhHo.','.ohH......hHo.']), O(10,8, ['.ooo','ohHo','ohHo','ohHo','oHHo','.oo.'])],
}
for k in HAIR: HAIR[k]['NW'] = HAIR[k]['N']
HAIR['PONYTAIL']['NW'] = [O(0,0, CROWN_PONY + ['..HhHhhhhhhhhHo..','...oHhhhhhhhHo...','...oHhhhhhhhHo...','...oHHhhhhhHo....','....oHHHHHHo.....']), O(7,12, ['.ooo','ohHo','ohHo','ohHo','oHHo','.oo.'])]

BUZZ = {'SW': R([0,0,16,7],'hair'), 'W': [R([0,0,13,7],'hair'), R([9,8,12,11],'hair')], 'N': R([0,0,16,13],'hair'), 'NW': R([0,0,16,13],'hair')}

# ---------------------------------------------------------------- hats (W only here; SW/N/NW reuse or flip the S drawings)
HATS = {
 'HELMET_W': O(-2,0, ['.....ooooooo......','...oo^cccc^oo.....','..o^cccccccc^o....','.o^ccccccccccCo...','.occcccccccccCCo..',
                      '.occcccccccccCCo..','.oCcccccccccccCo..','.oCCCCCCCCCCCCCo..','.ooooooooooooooo..'], rigid=True),
 'BERET_W':  O(-2,0, ['...ooooooooo......','..o&kkkkkkkkoo....','.o&kkkkkkkkkkkoo..','.o&kkkkkkkkkkkkKo.','.oKkkkkkkkkkkkkKo.',
                      '.oKKKKKKKKKKKKKKo.','.oKKKKKKKKKKKKKKo.','.oKKKKKKKKKKKKKKo.','.ooooooooooooooo..'], rigid=True),
 'CAP_W':    O(-2,0, ['....ooooooooo.....','...o&kkkkkkkKo....','..o&kkkkkkkkkKo...','..o&kkkkkkkkkKo...','..oKKKKKKKKKKKo...',
                      '..okkkkkkkkkkko...','..oKKKKKKKKKKKKo..','oooooooooooooooo..'], rigid=True),
 'CAP_N':    O(-1,0, ['....ooooooooooo....','...o&kkkkkkkkkKo...','..o&kkkkkkkkkkkKo..','..o&kkkkkkkkkkkKo..','..oKKKKKKKKKKKKKo..',
                      '...okkkkkkkkkkko...','..oKKKKKKKKKKKKKo..','..ooooooooooooooo..'], rigid=True),
 'RANGER_W_BRIM': O(-2,6, ['.o.............oo.','oLlllllllllllllLo.','.ooooooooooooooo..'], rigid=True),
}
RANGER_W_REMAP = R([0,0,13,6],'leather'); RANGER_W_SEAM = L([1,6,11,6])

# ---------------------------------------------------------------- faces
FACE = {
 'GLASSES_SW': O(2,8, ['...o.o...','...ooo...','...o.o...','o..o.o..o','oooo.oooo']),
 'GLASSES_W':  O(3,7, ['ooo...','o..ooo','o..o..','o..o..','oooo..']),
 'BEARD_SW':   O(2,12, ['.o#hhhhhHo.','o#oooooooHo','o#hhhhhhhHo','oHhhhhhhHHo','.ooooooooo.']),
 'BEARD_W':    O(0,12, ['.o#hhho..','o#hhhhho.','o#hhhhHo.','.oHhhHHo.','..ooooo..']),
 'SUNKEN_SW':  O(3,9, ['SS...SS','Se...eS','SS...SS']),
 'SMILE_SW':   O(3,12, ['ooooooooo','.xxxxxx..']),
 'SUNKEN_W':   O(3,8, ['.SS','.eS','SSS']),
 'SMILE_W':    O(2,12, ['oooooo','.xxxx.']),
}
# ---------------------------------------------------------------- body items (figure space)
BODY = {
 'BAG_W':    [O(8,23, ['ooooo','o*x*o','oxxxo','oAxAo','oAAAo','ooooo'], head=False)],
 'BAG_N':    [O(5,17, ['......A','.....A.','....A..','...A...','..A....','.A.....','A......'], head=False),
              O(0,23, ['ooooo','o*x*o','oxxxo','oAxAo','oAAAo','ooooo'], head=False)],
 'COAT_W':   [O(3,29, ['o^cccccCo.','o^cccccCo.','o^cccccCo.','.oooooooo.'], head=False)],
 'STAINS_W': [O(5,30, ['...D.','.....','D....','.....','....D'], head=False)],
}

# ---------------------------------------------------------------- validation
def compose(view, layers, pad=3, top=3):
    fig = FIG[view]; W = len(fig[0]); H = len(fig)
    g = [['.']*(W+2*pad) for _ in range(H+top+pad)]
    for y,r in enumerate(fig):
        for x,c in enumerate(r): g[y+top][x+pad] = c
    for l in layers:
        if l['kind']!='overlay': continue
        for dy,r in enumerate(l['rows']):
            for dx,c in enumerate(r):
                if c=='.': continue
                X=l['x']+dx+pad; Y=l['y']+dy+top
                assert 0<=Y<len(g) and 0<=X<len(g[0]), (view, l['x'], l['y'], dx, dy)
                if l['under'] and g[Y][X]!='.': continue
                g[Y][X]=c
    return g
def problems(g):
    H=len(g); W=len(g[0]); out=[]
    at=lambda x,y: g[y][x] if 0<=x<W and 0<=y<H else '.'
    for y in range(H):
        for x in range(W):
            c=g[y][x]
            if c=='.': continue
            if c=='o':
                if not any((dx or dy) and at(x+dx,y+dy)=='o' for dy in (-1,0,1) for dx in (-1,0,1)): out.append(f'lonely o ({x-3},{y-3})')
            else:
                for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    if at(x+dx,y+dy)=='.': out.append(f'exposed {c} ({x-3},{y-3})'); break
    return out
def check(name, view, layers):
    layers = layers if isinstance(layers, list) else [layers]
    for l in layers:
        if l['kind']=='overlay':
            w=len(l['rows'][0]); bad=[(i,len(r)) for i,r in enumerate(l['rows']) if len(r)!=w]
            assert not bad, (name, view, bad)
    ps=problems(compose(view, layers))
    if ps: print(f'{name}@{view}: '+'; '.join(ps[:8])); return 1
    return 0
bad=0
for k,v in HAIR.items():
    for view,l in v.items(): bad+=check('HAIR_'+k, view, l)
for k,l in HATS.items():
    view = 'W' if k.endswith('_W') or k.endswith('_BRIM') else 'N'
    layers = [l] + ([RANGER_W_REMAP] if k.startswith('RANGER') else [])
    bad+=check(k, view, layers)
for k,l in FACE.items(): bad+=check(k, 'W' if k.endswith('_W') else 'SW', l)
for k,l in BODY.items(): bad+=check(k, 'W' if k.endswith('_W') else 'N', l)
print('problems:', bad)
if bad and '--force' not in sys.argv: sys.exit(1)

# ---------------------------------------------------------------- emit
def ts_layer(l):
    if l['kind']=='overlay':
        rows=', '.join(f"'{r}'" for r in l['rows'])
        fn='hov' if l['head'] else 'ov'
        extra=(', rigid: true' if l['rigid'] else '')
        s=f"{fn}({l['x']}, {l['y']}, [{rows}])"
        return f"{{ ...{s}{extra} }}" if extra else s
    if l['kind']=='remap':
        return f"{{ box: [{', '.join(map(str,l['box']))}], to: '{l['to']}'{', space: \'head\'' if l['head'] else ''} }}"
    return f"{{ box: [{', '.join(map(str,l['box']))}]{', space: \'head\'' if l['head'] else ''} }}"
def ts_layers(ls):
    ls = ls if isinstance(ls, list) else [ls]
    ov=[ts_layer(l) for l in ls if l['kind']=='overlay']; rm=[ts_layer(l) for l in ls if l['kind']=='remap']; sm=[ts_layer(l) for l in ls if l['kind']=='seam']
    parts=[]
    if ov: parts.append('overlays: ['+', '.join(ov)+']')
    if rm: parts.append('remaps: ['+', '.join(rm)+']')
    if sm: parts.append('lines: ['+', '.join(sm)+']')
    return '{ '+', '.join(parts)+' }'
out=['''/**
 * Per-view drawings (SW, W, NW, N) of hair, hats, faces and body items for the
 * standing base figure, as ViewLayer tables keyed by view. The S drawings
 * live in cast64.ts; a view that reuses an S drawing is wired there.
 * Generated by scripts/research/gen_view_items.py (validates every drawing on its view figure); do not edit by hand.
 */
import type { HeroView } from './hero64.js';
import { parseSprite } from './format.js';
import type { Overlay, ViewLayer } from './outfit64.js';

type Views = Partial<Record<HeroView, ViewLayer>>;
function ov(x: number, y: number, rows: string[]): Overlay {
  return { sprite: parseSprite(rows, 'view-item'), x, y };
}
function hov(x: number, y: number, rows: string[]): Overlay {
  return { ...ov(x, y, rows), space: 'head' };
}
''']
for k,v in HAIR.items():
    out.append(f"export const HAIR_{k}_VIEWS: Views = {{\n"+''.join(f"  {view}: {ts_layers(l)},\n" for view,l in v.items())+"};\n")
out.append("export const BUZZ_VIEWS: Views = {\n"+''.join(f"  {view}: {ts_layers(l)},\n" for view,l in BUZZ.items())+"};\n")
out.append("export const HELMET_W: ViewLayer = "+ts_layers(HATS['HELMET_W'])+";\n")
out.append("export const BERET_W: ViewLayer = "+ts_layers(HATS['BERET_W'])+";\n")
out.append("export const PEAKED_CAP_W: ViewLayer = "+ts_layers(HATS['CAP_W'])+";\n")
out.append("export const PEAKED_CAP_N: ViewLayer = "+ts_layers(HATS['CAP_N'])+";\n")
out.append("export const RANGER_HAT_W: ViewLayer = "+ts_layers([RANGER_W_REMAP, RANGER_W_SEAM, HATS['RANGER_W_BRIM']])+";\n")
out.append("export const GLASSES_VIEWS: Views = { SW: "+ts_layers(FACE['GLASSES_SW'])+", W: "+ts_layers(FACE['GLASSES_W'])+" };\n")
out.append("export const BEARD_VIEWS: Views = { SW: "+ts_layers(FACE['BEARD_SW'])+", W: "+ts_layers(FACE['BEARD_W'])+" };\n")
out.append("export const MIMIC_FACE_VIEWS: Views = { SW: "+ts_layers([FACE['SUNKEN_SW'],FACE['SMILE_SW']])+", W: "+ts_layers([FACE['SUNKEN_W'],FACE['SMILE_W']])+" };\n")
out.append("export const MEDIC_BAG_W: ViewLayer = "+ts_layers(BODY['BAG_W'])+";\n")
out.append("export const MEDIC_BAG_N: ViewLayer = "+ts_layers(BODY['BAG_N'])+";\n")
out.append("export const COAT_TAILS_W: ViewLayer = "+ts_layers(BODY['COAT_W'])+";\n")
out.append("export const DRESS_STAINS_W: ViewLayer = "+ts_layers(BODY['STAINS_W'])+";\n")
open(OUT,'w').write('\n'.join(out))
print('wrote', OUT)
