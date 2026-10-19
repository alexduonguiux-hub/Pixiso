"""Per-view drawings (SW, W, NW, N) of hair, hats, faces and body items for the
standing base figure. Validates each drawing composed on its view figure and
emits packages/sprite-kit/src/views64.items.ts."""
import json, os, sys
# ASCII of the five standing figures: `DUMP=test-output/view_figures.json pnpm exec tsx scripts/hero-views.ts`
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FIG = json.load(open(sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else os.path.join(ROOT, 'test-output', 'view_figures.json')))
OUT = os.path.join(ROOT, 'packages', 'sprite-kit', 'src', 'views64.items.ts')

def O(x, y, rows, head=True, rigid=False, under=False, crop=False):
    return {'kind': 'overlay', 'x': x, 'y': y, 'rows': rows, 'head': head, 'rigid': rigid, 'under': under, 'crop': crop}
def R(box, to, head=True):
    return {'kind': 'remap', 'box': box, 'to': to, 'head': head}
def L(box, head=True):
    return {'kind': 'seam', 'box': box, 'head': head}

# ---------------------------------------------------------------- hair
# Literal per view, silhouettes in the mid tone: hair64.ts (combHair) tones every mass when the figure is
# dressed (D-074), so only the shapes are drawn here. From behind (N/NW, D-092) a short cut fills the skull to
# its last row (13) with no outline row of its own (the neck row below bounds it), leaves the ear block (rows
# 8-9, two cells beside the outline) bare, and on NW follows the turned skull (interior 4-13, 4-12, 4-11, 5-10
# on rows 10-13, the near cheek sliver at column 3 left bare); the ponytail leaves the nape row bare.
HAIR = {}
HAIR['SPIKY'] = {
  'SW': O(0,-2, ['.....o...o...o...','....oho.oho.oho..','...ohhhohhhohhho.','..ohhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','..oh...hhhhhhho..','.....hhh..hhhhh..','.......h.....h...']),
  'N': O(0,-2, ['.....o...o...o...','....oho.oho.oho..','...ohhhohhhohhho.','..ohhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','....hhhhhhhhh....','....hhhhhhhhh....','....hhhhhhhhh....','....hhhhhhhhh....','.....hhhhhhh.....','......hhhhh......']),
  'W': O(0,-2, ['....o..o..o...','...ohoohooho..','..ohhohhohhho.','.ohhhhhhhhhho.','ohhhhhhhhhhhho','ohhhhhhhhhhhho','ohhhhhhhhhhhho','ohhhhhhhhhhhho','ohhh.....hhho.','.ohh......hho.','..........hho.','.........hho..','........hhho..','.........o....']),
  'NW': O(0,-2, ['.....o...o...o...','....oho.oho.oho..','...ohhhohhhohhho.','..ohhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','....hhhhhhhhhh...','....hhhhhhhhhh...','....hhhhhhhhhh...','....hhhhhhhhh....','....hhhhhhhh.....','.....hhhhhh......']),
}
HAIR['CURLY'] = {
  'SW': O(0,0, ['.....ooooooo.....','...oohhhhhhhoo...','..ohhhhhhhhhhho..','.ohhhhhhhhhhhhho.','ohhhhhhhhhhhhhhho','ohhhhhhhhhhhhhhho','.ohhhhhhhhhhhhho.','ohhh...hhhhhhhhho','.oh..hhh..hhhhho.','ohh..........hhho','.oh..........hhho','ohh..........hhho','.oh..........hho.','..o..........oo..']),
  'N': O(0,0, ['.....ooooooo.....','...oohhhhhhhoo...','..ohhhhhhhhhhho..','.ohhhhhhhhhhhhho.','ohhhhhhhhhhhhhhho','ohhhhhhhhhhhhhhho','.ohhhhhhhhhhhhho.','ohhhhhhhhhhhhhhho','.ohhhhhhhhhhhhho.','ohhhhhhhhhhhhhhho','.ohhhhhhhhhhhhho.','ohhhhhhhhhhhhhhho','.ohhhhhhhhhhhhho.','..oohhhhhhhhhoo..','....ooooooooo....']),
  'W': O(0,0, ['...oooooooo....','..ohhhhhhhhoo..','.ohhhhhhhhhhho.','ohhhhhhhhhhhhho','ohhhhhhhhhhhhho','.ohhhhhhhhhhhho','ohhhhhhhhhhhhho','ohhh..hhhhhhhho','.ohh..ohhhhhhho','......ohhhhhhho','......ohhhhhhho','......ohhhhhho.','.......ohhhho..','........ohho...','.........oo....']),
  'NW': O(0,0, ['.....ooooooo.....','...oohhhhhhhoo...','..ohhhhhhhhhhho..','.ohhhhhhhhhhhhho.','ohhhhhhhhhhhhhhho','ohhhhhhhhhhhhhhho','.ohhhhhhhhhhhhho.','ohhhhhhhhhhhhhhho','.ohhhhhhhhhhhhho.','ohhhhhhhhhhhhhhho','.ohhhhhhhhhhhhho.','ohhhhhhhhhhhhhhho','.ohhhhhhhhhhhhho.','..oohhhhhhhhhoo..','....ooooooooo....']),
}
HAIR['SWEPT'] = {
  'SW': O(0,0, ['......ooooo......','....oohhhhhoo....','...ohhhhhhhhho...','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhh...hhhhhhho.','.oh..........hho.','.oh..........hho.','..o..........oo..']),
  'N': O(0,0, ['......ooooo......','....oohhhhhoo....','...ohhhhhhhhho...','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','..ohhhhhhhhhhho..','...oohhhhhhhoo...','......hhhhh......']),
  'W': O(0,0, ['...oooooooo...','..ohhhhhhhho..','.ohhhhhhhhhho.','.ohhhhhhhhhho.','ohhhhhhhhhhhho','ohhhhhhhhhhhho','ohhhhhhhhhhhho','ohhhhhhhhhhho.','..........hho.','..........hho.','.........hho..','........hhho..','.........o....']),
  'NW': O(0,0, ['......ooooo......','....oohhhhhoo....','...ohhhhhhhhho...','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','..ohhhhhhhhhhho..','..ohhhhhhhhhho...','...ohhhhhhhoo....']),
}
HAIR['BOB'] = {
  'SW': O(0,0, ['......ooooo......','....oohhhhhoo....','...ohhhhhhhhho...','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohh...hhhhhhhho.','.oh..hhh..hhhhho.','.oh..........hhho','.oh..........hhho','.oh..........hho.','..oh.........oho.','...o.........oo..']),
  'N': O(0,0, ['......ooooo......','....oohhhhhoo....','...ohhhhhhhhho...','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','..ohhhhhhhhhhho..','...oohhhhhhhoo...','.....ooooooo.....']),
  'W': O(0,0, ['...oooooooo...','..ohhhhhhhho..','.ohhhhhhhhhho.','.ohhhhhhhhhho.','ohhhhhhhhhhhho','ohhhhhhhhhhhho','ohhhhhhhhhhhho','ohhh..hhhhhhho','......ohhhhhho','......ohhhhhho','......ohhhhhho','......ohhhhhho','.......ohhhhho','........oooooo']),
  'NW': O(0,0, ['......ooooo......','....oohhhhhoo....','...ohhhhhhhhho...','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','..ohhhhhhhhhhho..','...oohhhhhhhoo...','.....ooooooo.....']),
}
HAIR['WILD'] = {
  'SW': O(0,0, ['......ooooo......','....oohhhhhoo....','...ohhhhhhhhho...','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohh...hhhhhhhho.','.oh..hhh..hhhhho.','.oh.......hh.hhho','ohh........h.hhho','.oh..........hhho','.oh..........hhho','.oh.........ohhho','ohho.........hhho','.oho.........hho.','.oho.........oho.','..o...........o..']),
  'N': O(0,0, ['......ooooo......','....oohhhhhoo....','...ohhhhhhhhho...','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','ohhhhhhhhhhhhhho.','.ohhhhhhhhhhhhhho','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','ohhhhhhhhhhhhhhho','.ohhhhhhhhhhhhho.','.ohohhhhhhhhhoho.','..ooooooooooooo..']),
  'W': O(0,0, ['...oooooooo...','..ohhhhhhhho..','.ohhhhhhhhhho.','.ohhhhhhhhhho.','ohhhhhhhhhhhho','ohhhhhhhhhhhho','ohhhhhhhhhhhho','ohhh..hhhhhhho','.ohh..ohhhhhho','.ohh..ohhhhhho','.oh...ohhhhhho','..o...ohhhhhho','......ohhhhhho','.......ohhhhho','.......ohhhhho','.......ohhhhho','........ohho..','.........oo...']),
  'NW': O(0,0, ['......ooooo......','....oohhhhhoo....','...ohhhhhhhhho...','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','ohhhhhhhhhhhhhho.','.ohhhhhhhhhhhhhho','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','ohhhhhhhhhhhhhhho','.ohhhhhhhhhhhhho.','.ohohhhhhhhhhoho.','..ooooooooooooo..']),
}
HAIR['PONYTAIL'] = {
  'SW': [O(0,0, ['......ooooo......','....oohhhhhoo....','...ohhhhhhhhho...','...ohhhhhhhhho...','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','..oh...hhhhhhho..','............hhH..','............Hh...']), O(13,10, ['.ooo','o#ho','ohHo','ohjo','ohjo','.oo.'])],
  'N': [O(0,0, ['......ooooo......','....oohhhhhoo....','...ohhhhhhhhho...','...ohhhhhhhhho...','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','....hhhhhhhhh....','....hhhhhhhhh....','....hhhhhhhhh....','....hhhhhhhhh....','.....hhhhhhh.....']), O(7,12, ['.ooo','ohho','ohho','ohho','ohho','.oo.'])],
  'W': [O(0,0, ['...oooooooo...','..ohhhhhhhho..','.ohhhhhhhhhho.','.ohhhhhhhhhho.','ohhhhhhhhhhhho','ohhhhhhhhhhhho','ohhhhhhhhhhhho','ohhh.....hhho.','.ohh......hho.']), O(10,8, ['.ooo','ohho','ohho','ohho','ohho','.oo.'])],
  'NW': [O(0,0, ['......ooooo......','....oohhhhhoo....','...ohhhhhhhhho...','...ohhhhhhhhho...','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','....hhhhhhhhhh...','....hhhhhhhhhh...','....hhhhhhhhhh...','....hhhhhhhhh....','....hhhhhhhh.....']), O(7,12, ['.ooo','ohho','ohho','ohho','ohho','.oo.'])],
}
HAIR['SHORT'] = {
  'SW': O(0,0, ['......ooooo......','....oohhhhhoo....','...ohhhhhhhhho...','...ohhhhhhhhho...','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','..oh...hhhhhhho..','.....hhh..hhhhh..','......h....h.....']),
  'N': O(0,0, ['......ooooo......','....oohhhhhoo....','...ohhhhhhhhho...','...ohhhhhhhhho...','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','....hhhhhhhhh....','....hhhhhhhhh....','....hhhhhhhhh....','....hhhhhhhhh....','.....hhhhhhh.....','......hhhhh......']),
  'W': O(0,0, ['...oooooooo...','..ohhhhhhhho..','.ohhhhhhhhhho.','.ohhhhhhhhhho.','ohhhhhhhhhhhho','ohhhhhhhhhhhho','ohhhhhhhhhhhho','ohhh.....hhho.','.ohh......hho.','..........hho.','.........hho..','........hhho..','.........o....']),
  'NW': O(0,0, ['......ooooo......','....oohhhhhoo....','...ohhhhhhhhho...','...ohhhhhhhhho...','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','....hhhhhhhhhh...','....hhhhhhhhhh...','....hhhhhhhhhh...','....hhhhhhhhh....','....hhhhhhhh.....','.....hhhhhh......']),
}
HAIR['LONG'] = {
  'SW': O(0,0, ['......ooooo......','....oohhhhhoo....','...ohhhhhhhhho...','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohh...hhhhhhhho.','.oh..hhh..hhhhho.','.oh..........hhho','.oh..........hhho','.oh..........hhho','.oh..........hhho','.oh.........ohhho','.oho.........hhho','.oho.........hho.','..o..........oo..']),
  'N': O(0,0, ['......ooooo......','....oohhhhhoo....','...ohhhhhhhhho...','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','..ooooooooooooo..']),
  'W': O(0,0, ['...oooooooo...','..ohhhhhhhho..','.ohhhhhhhhhho.','.ohhhhhhhhhho.','ohhhhhhhhhhhho','ohhhhhhhhhhhho','ohhhhhhhhhhhho','ohhh..hhhhhhho','......ohhhhhho','......ohhhhhho','......ohhhhhho','......ohhhhhho','......ohhhhhho','......ohhhhhho','......ohhhhhho','......ohhhhhho','......oooooooo']),
  'NW': O(0,0, ['......ooooo......','....oohhhhhoo....','...ohhhhhhhhho...','..ohhhhhhhhhhho..','..ohhhhhhhhhhho..','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','.ohhhhhhhhhhhhho.','..ooooooooooooo..']),
}

# The buzz cut: the skull of each view's head (the skin cells inside these head-space boxes) as hair, a
# silhouette like the drawn hairstyles; hair64.ts combs it when the figure is dressed, as a crop (`crop`: three
# tones in masses, no strand period; fourth review).
# The hairline stops a row above the brows on S/SW: a brow cell touching hair takes the hair's line colour and
# reads as a black dot beside its brown twin (fourth review). W keeps its row (both brow cells touch hair there,
# and the shorter mass combs into one flat patch). N/NW leave the ear block (two by two beside the hair, as on
# S) and, on NW, the sliver of near cheek down the turned skull's edge (D-092).
BUZZ_BOXES = {'S': [[0,0,16,6]], 'SW': [[0,0,16,6]], 'W': [[0,0,13,7], [9,8,12,11]], 'N': [[0,0,16,7], [4,8,12,13]], 'NW': [[0,0,16,7], [4,8,13,12], [5,13,10,13]]}
def buzz_rows(view):
    head = FIG[view][:14]
    W = max(len(r) for r in head)
    rows = []
    for y, r in enumerate(head):
        r = r.ljust(W, '.')
        inside = lambda x: any(x0 <= x <= x1 and y0 <= y <= y1 for x0, y0, x1, y1 in BUZZ_BOXES[view])
        rows.append(''.join('h' if inside(x) and c in 'sS$zZ' else '.' for x, c in enumerate(r)))
    return rows
BUZZ = {view: O(0, 0, buzz_rows(view), crop=True) for view in ('S', 'SW', 'W', 'N', 'NW')}

# ---------------------------------------------------------------- hats (W only here; SW/N/NW reuse or flip the S drawings)
HATS = {
 'HELMET_W': O(-2,0, ['.....ooooooo......','...ooV^^cccoo.....','..o^^^ccccccco....','.o^ccccccccccco...','.o^CCCCCCCCCCCCo..',
                      '.occcccccCCCCCvo..','.occccCCCCCvvvvo..','.occcCCCCCCvvvvo..','.ooooooooooooooo..'], rigid=True),
 'BERET_W':  O(-2,0, ['...ooooooooo......','..oQQ&&&kkkkoo....','.o&&&kkKkkkkkkoo..','.okkKkkkKkkkkkKKo.','.okkkkkkkKKKqKKqo.','.okkkKKKqKKKqqqqo.','.okkkKKKKqKKqqqqo.','.okkkKKKqKKKqqqqo.','.ooooooooooooooo..'], rigid=True),
 'CAP_W':    O(-2,0, ['....ooooooooo.....','...oQQ&&&KkkKo....','..o&&kkkKkkkkko...','..okkkkkkkkkKKo...','..okkKKKKKqqqqo...',
                      '..o&&&&&kkkkkko...','..okkKKKKKKqqqqo..','oooooooooooooooo..'], rigid=True),
 'CAP_N':    O(-1,0, ['....ooooooooooo....','...oQQ&&&&KkkkKo...','..o&&&kkkKkkkkkKo..','..okkkkkkKkkkKKKo..','..okkkKKKKKKqqqqo..',
                      '...o&&&&&kkkkkko...','..okkkKKKKKKqqqqo..','..ooooooooooooooo..'], rigid=True),
 'HARD_HAT_W': O(-2,0, ['.....ooooooo......','...oo***aaaoo.....','..o***aaaaaaao....','.o*aaaaaaaaaaao...','.oaaaaaaaaaaAAAo..',
                        '.oaaaaaaaAAAAAro..','o*aaaaAAAAAArrrro.','ooooooooooooooooo.'], rigid=True),
 'RANGER_W_BRIM': O(-2,6, ['.o.............oo.','oLlllllllllllllLo.','.ooooooooooooooo..'], rigid=True),
}
RANGER_W_REMAP = R([0,0,13,6],'leather'); RANGER_W_SEAM = L([1,6,11,6])

# ---------------------------------------------------------------- faces
FACE = {
 'GLASSES_SW': O(2,8, ['...o.o.....','...ooo.....','...o.o.....','o..o.o..ooo','oooo.oooo..']),
 'GLASSES_W':  O(3,7, ['ooo...','o..ooo','o..o..','o..o..','.ooo..']),  # the lower rim's front corner open: it sat on the mouth line (D-094)
 'BEARD_SW':   O(2,12, ['.#.hHh.hHH.','o#hHjjHhhHo','o#hHhhHhHHo','.o#hHhHhHo.','.....HjH...','.....ooo...']),
 'BEARD_W':    O(0,10, ['.......H....','.......h....','.o#hHhhHhH..','o#hhHhHhHH..','o#hHhhHhHHj.','.ooHhHHhH...','...o........']),
 'SUNKEN_SW':  O(3,9, ['SES.SEs','.ES.SEx','.e...ex']),
 'SMILE_SW':   O(3,12, ['ooooooooo','.xxxxxxx.']),  # teeth to the jaw line: no skin cell pocketed at the corner
 'SUNKEN_W':   O(3,8, ['.ES','.ES','.ex']),
 'SMILE_W':    O(2,12, ['oooooo','.xxxx.']),
 'HEADBAND_W': O(0,6, ['o**aaaaaaaAAo','oaaaaaaaaAAAo']),
 'ZFACE_SW':   O(2,8, ['........$$.','...S.S.....','...S.S.....','...........','.SoxxxoS...','...ooo.....']),
 'ZFACE_W':    O(2,12, ['xxxo','.ooo']),
 'ZCHEEK_SW':  O(10,6, ['dd','.d']),
 'ZCHEEK_W':   O(9,5, ['dd','.d']),
 'SEALED_SW':  O(3,9, ['SS...SS','oo...oo','SS...SS']),
 'SEALED_W':   O(4,8, ['SS','oo','SS']),
 'BIG_EAR_W':  O(6,-3, ['....oo...','...osso..','...ossSo.','..ossSSo.','..osssSSo','..osssSSo','..osssSSo','..ossSSo.','..ossSSo.','..osSSo..','.osSSo...','.oSSo....','.oSo.....','.oo......']),
}
# ---------------------------------------------------------------- body items (figure space)
BODY = {
 'BAG_W':    [O(8,22, ['ooooo','o*x*o','oxxxo','oAxAo','oAAAo','ooooo'], head=False)],
 'BAG_N':    [O(5,17, ['......A','.....AA','....AA.','...AA..','..AA...','.AA....','AA.....'], head=False),
              O(0,23, ['ooooo','o*x*o','oxxxo','oAxAo','oAAAo','ooooo'], head=False)],
 'COAT_W':   [O(3,29, ['o^cccccCo.','o^cccccCo.','o^cccccCo.','.oooooooo.'], head=False)],
 'STAINS_W': [O(5,30, ['..DD.','.....','DD...','.....','...DD'], head=False)],
 'RIFLE_STAND_W': [O(12,9, ['.o.', '.o.', '.o.', '.o.', '.o.', '...', '...', '...', '...', '.Do', '.Do', '.Do', '.Do', '.Do', '.Do', '.Do', '.Do', '.Do', '.Do', '.Do', 'Do.', 'Do.', 'Do.', '.Do', '.Do', '.Do', '.Do', '.Do', '.Do', '.Do', '.oo'], head=False, under=True)],
 'RIFLE_STAND_N': [O(-4,9, ['..o.', '..o.', '..o.', '..o.', '..o.', '..o.', '..o.', '..o.', '..o.', '..o.', '.oo.', 'omMo', 'omMo', 'odDo', 'odDo', 'odDo', 'o%Do', 'odDo', 'odDo', 'odDo', 'odDo', 'o%Do', 'odDo', 'odDo', 'odDo', 'oDDo', 'oDDo', 'oDDo', 'oDDo', 'oDDo', '.oo.'], head=False)],
 # the sling: two leather cells from the shoulder (row 17) to the stock (row 18) tie the stock to the body; without
 # them it hangs a column behind the back as a piece apart (1x yardstick)
 'RIFLE_SLUNG_W': [O(13,9, ['.o...', '.o...', '.o...', '.o...', '.o...', '.....', '.....', '.....', 'o....', '.oo..', '..o..', '..o..', '..o..', '..o..', '..o..', '..o..', '..o..', '..o..', '..o..', '..o..', '..ooo', '..oDo', '..oDo', '..ooo'], head=False, under=True)],
 'RIFLE_SLUNG_N': [O(-1,5, ['o.', 'o.', 'o.', '.o', '.o', '.o', '.o', '.o', '.o', '.o', '.o', '.o'], head=False), O(7,17, ['oMMo........', '.oMMo.......', '..oMMo......', '..oDD.......', '...oDD......', '....oDD.....', '....oDD.....', '.....oDD....', '......oDD...', '......oDD...', '.......oDDo.', '.......oDDo.', '........oooo', '.........oDo', '.........oDo', '.........oDo', '.........ooo'], head=False), O(11,16, ['LL','.L'], head=False)],
 'SATCHEL_W':  [O(7,18, ['A..', 'AA.', '.AA'], head=False), O(13,21, ['ooooo', 'o**Ao', 'oaaAo', 'oaxAo', 'oxxxo', 'oaxAo', 'oaaAo', 'orrro', 'ooooo'], head=False)],
 'BACKPACK_W': [O(13,17, ['.ooo', 'o|lo', 'o|lo', 'oiio', 'oLlo', 'oLlo', 'oLlo', 'oLlo', 'oLlo', 'olLo', 'oiio', '.ooo'], head=False), O(10,7, ['....ooo', '....o%o', '...o%%o', '...odo.', '..oddo.', '..odo..', '.oddo..', '.odo...', 'oddo...', 'odo....'], head=False, under=True)],
 # The pack from behind: Sơn's bat first (it rests on the right shoulder, screen-left here, leaning out past the
 # head, under the pack's top), the top flap as wide as it shows from the front (one column narrower on the
 # far side at NW, as is the pack body there: the turned back is a column narrower), then the pack body.
 'BACKPACK_N': [O(-4,7, ['ooo....', 'o%o....', 'o%%o...', '.odo...', '.oddo..', '..odo..', '..oddo.', '...odo.', '...oddo', '....odo', '....odD', '....ooo'], head=False), O(1,11, ['.ooooooooooooo.', 'o||lllllllllLLo', 'o|lllllllllLLLo', 'ollllllllLLLLLo', 'ooooooooooooooo'], head=False), O(3,16, ['o||lllllllo', 'o|llllllLLo', 'ollllllllLo', 'oiiiiiiiiio', 'ollllLllllo', 'o|lllLlllLo', 'o|lllmmllLo', 'oLLLLLLLLLo', 'ollllLllllo', 'oilllLLlLio', 'ooooooooooo'], head=False)],
 'BACKPACK_NW': [O(-4,7, ['ooo....', 'o%o....', 'o%%o...', '.odo...', '.oddo..', '..odo..', '..oddo.', '...odo.', '...oddo', '....odo', '....odD', '....ooo'], head=False), O(1,11, ['.oooooooooooo.', 'o||llllllllLLo', 'o|llllllllLLLo', 'ollllllllLLLLo', 'oooooooooooooo'], head=False), O(3,16, ['o||llllllo', 'o|llllllLo', 'ollllllllo', 'oiiiiiiiio', 'ollllLlllo', 'o|lllLlllo', 'o|lllmmllo', 'oLLLLLLLLo', 'ollllLlllo', 'oilllLLlLo', 'oooooooooo'], head=False)],
 'RANGER_COAT_W': [O(2,29, ['o^ccCccCcCo', 'o^ccCccCcCo', 'occcCccCcco', 'occcCccCcvo', 'occcCccCcvo', 'occcCccCcvo', 'ooooooooooo'], head=False)],
 'COAT_TAILS2_W': [O(2,29, ['o^ccCccCcCo', 'o^ccCccCcCo', 'occcCccCcco', 'occcCccCcvo', 'occcCccCcvo', 'ooooooooooo'], head=False), O(1,23, ['ooooo', 'oMMxo', 'oxxxo', 'oxxxo', 'oxxxo', 'oxxxo', 'ooooo'], head=False)],
 'TUNIC_W': [O(7,18, ['A..', 'AA.', '.AA'], head=False), O(2,29, ['o^ccCccCcCo', 'o^ccCccCcCo', 'occcCccCcco', 'ooooooooooo'], head=False), O(13,24, ['oooo', 'oAao', 'oAao', 'oaao', 'oooo'], head=False)],
 'SATCHEL_N':  [O(5,17, ['......A','.....AA','....AA.','...AA..','..AA...','.AA....','AA.....'], head=False), O(-2,23, ['ooooo', 'oA**o', 'oAaao', 'oAxao', 'oxxxo', 'oAxao', 'oAaao', 'orrro', 'ooooo'], head=False)],
}

# ---------------------------------------------------------------- validation
def compose(view, layers, pad=5, top=5):
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
        extra=''.join(f', {k}: true' for k in ('rigid', 'crop') if l.get(k))
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
out.append("export const HARD_HAT_W: ViewLayer = "+ts_layers(HATS['HARD_HAT_W'])+";\n")
out.append("export const HEADBAND_VIEWS: Views = { W: "+ts_layers(FACE['HEADBAND_W'])+" };\n")
out.append("export const ZOMBIE_FACE_VIEWS: Views = { SW: "+ts_layers(FACE['ZFACE_SW'])+", W: "+ts_layers(FACE['ZFACE_W'])+" };\n")
out.append("export const ZOMBIE_CHEEK_VIEWS: Views = { SW: "+ts_layers(FACE['ZCHEEK_SW'])+", W: "+ts_layers(FACE['ZCHEEK_W'])+" };\n")
out.append("export const SEALED_EYES_VIEWS: Views = { SW: "+ts_layers(FACE['SEALED_SW'])+", W: "+ts_layers(FACE['SEALED_W'])+" };\n")
out.append("export const BIG_EAR_W: ViewLayer = "+ts_layers(FACE['BIG_EAR_W'])+";\n")
out.append("export const RANGER_HAT_W: ViewLayer = "+ts_layers([RANGER_W_REMAP, RANGER_W_SEAM, HATS['RANGER_W_BRIM']])+";\n")
out.append("export const GLASSES_VIEWS: Views = { SW: "+ts_layers(FACE['GLASSES_SW'])+", W: "+ts_layers(FACE['GLASSES_W'])+" };\n")
out.append("export const BEARD_VIEWS: Views = { SW: "+ts_layers(FACE['BEARD_SW'])+", W: "+ts_layers(FACE['BEARD_W'])+" };\n")
out.append("export const MIMIC_FACE_VIEWS: Views = { SW: "+ts_layers([FACE['SUNKEN_SW'],FACE['SMILE_SW']])+", W: "+ts_layers([FACE['SUNKEN_W'],FACE['SMILE_W']])+" };\n")
out.append("export const MEDIC_BAG_W: ViewLayer = "+ts_layers(BODY['BAG_W'])+";\n")
out.append("export const MEDIC_BAG_N: ViewLayer = "+ts_layers(BODY['BAG_N'])+";\n")
out.append("export const COAT_TAILS_W: ViewLayer = "+ts_layers(BODY['COAT_W'])+";\n")
out.append("export const DRESS_STAINS_W: ViewLayer = "+ts_layers(BODY['STAINS_W'])+";\n")
for name in ('RIFLE_STAND_W', 'RIFLE_STAND_N', 'RIFLE_SLUNG_W', 'RIFLE_SLUNG_N', 'SATCHEL_W', 'SATCHEL_N', 'BACKPACK_W', 'BACKPACK_N', 'BACKPACK_NW', 'RANGER_COAT_W', 'COAT_TAILS2_W', 'TUNIC_W'):
    out.append("export const "+name+": ViewLayer = "+ts_layers(BODY[name])+";\n")
open(OUT,'w').write('\n'.join(out))
print('wrote', OUT)
