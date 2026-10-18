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
# Literal per view; tones painted as continuous locks by scratch tool lock_paint.py (W=3, sweep 0.5): keep the
# silhouettes, edit tones by repainting rather than by hand.
HAIR = {}
HAIR['SPIKY'] = {
  'SW': O(0,-2, ['.....o...o...o...','....o#o.o#o.o#o..','...o##ho#hhoHhho.','..ohhJJJJhHHhhHo.','.o#hh##hhjjjjhHo.','.o##hh##hHHhhjjo.','.o##hh##hHHhhHHo.','..o##hh##HhhHHo..','..oJJhh##HhhHHo..','..oh#JJJJhhHHHo..','.....HHj..HjHhH..']),
  'N': O(0,-2, ['.....o...o...o...','....o#o.o#o.o#o..','...o##ho#hhoHhho.','..ohhJJJJhHHhhHo.','.o#hh##hhjjjjhHo.','.o##hh##hHHhhjjo.','.o##hh##hHHhhHHo.','..o##hh##HhhHHo..','..oJJhh##HhhHHo..','..oh#JJJJhhHHHo..','.ohh##hh#jjjjHHo.','...oh##hhhHHHo...','...oh##hhhHHHo...','...ohh##hHHHHo...','....oh##hHHHo....','.....ooooooo.....']),
  'W': O(0,-2, ['....o..o..o...','...o#oohooho..','..oh#ohhohhHo.','.o#hhJJJJhHHo.','o##hh##hhjjjjo','oh##hh##hHHhho','oh##hh##hHHhho','ohh##hh##HhhHo','oHhH.....hHjo.','.ohH......Hjo.','..........jjo.','.........hHo..','........hhHo..','.........o....']),
  'NW': O(0,-2, ['.....o...o...o...','....o#o.o#o.o#o..','...o##ho#hhoHhho.','..ohhJJJJhHHhhHo.','.o#hh##hhjjjjhHo.','.o##hh##hHHhhjjo.','.o##hh##hHHhhHHo.','..o##hh##HhhHHo..','..oJJhh##HhhHHo..','..oh#JJJJhhHHHo..','.ohh##hh#jjjjHHo.','...oh##hhhHHHo...','...oh##hhhHHHo...','...ohh##hHHHHo...','....oh##hHHHo....','.....ooooooo.....']),
}
HAIR['CURLY'] = {
  'SW': O(0,0, ['.....ooooooo.....','...oohh#hhHHoo...','..o##hh#hhHHhho..','.ohhJJJJhHHhhHHo.','o#hh##hhjjjjhHHho','o##hh##hHHhhjjjjo','.o#hh##hHHhhHHho.','oh##hh##HhhHHhhHo','.oh..HHH..HHhhho.','ohh..........hhho','.oh..........hhho','ohH..........hHho','.oH..........HHo.','..o..........oo..']),
  'N': O(0,0, ['.....ooooooo.....','...oohh#hhHHoo...','..o##hh#hhHHhho..','.ohhJJJJhHHhhHHo.','o#hh##hhjjjjhHHho','o##hh##hHHhhjjjjo','.o#hh##hHHhhHHho.','oh##hh##HhhHHhhHo','.oJJhh##HhhHHhho.','ohh#JJJJhhHHhhHHo','.oh##hh#jjjjhhHo.','o#hh##hhhHHhjjjjo','.ohh##hhhHHhhHHo.','..ooh##hHHhhHoo..','....ooooooooo....']),
  'W': O(0,0, ['...oooooooo....','..ohh##hh#hoo..','.o#hh##hh#hhHo.','oh##hhJJJJhHHho','oh##hh##hhjjjjo','.oh##hh##hHHhho','ohh##hh##hHHhho','oHhh..HhhhHjhjo','.ohH..oh#hhHjjo','......oJJJhhHHo','......ohh#jjjjo','......o#hhhHHo.','.......ohhhHo..','........ohHo...','.........oo....']),
  'NW': O(0,0, ['.....ooooooo.....','...oohh#hhHHoo...','..o##hh#hhHHhho..','.ohhJJJJhHHhhHHo.','o#hh##hhjjjjhHHho','o##hh##hHHhhjjjjo','.o#hh##hHHhhHHho.','oh##hh##HhhHHhhHo','.oJJhh##HhhHHhho.','ohh#JJJJhhHHhhHHo','.oh##hh#jjjjhhHo.','o#hh##hhhHHhjjjjo','.ohh##hhhHHhhHHo.','..ooh##hHHhhHoo..','....ooooooooo....']),
}
HAIR['SWEPT'] = {
  'SW': O(0,0, ['......ooooo......','....ooh#hhHoo....','...o#hh#hhHHho...','..ohJJJJhHHhhHo..','..oh##hhjjjjhHo..','.o#hh##hHHhhjjjo.','.o#hh##hHHhhHHho.','.o##hh##HhhHHhho.','.oJJhh##HhhHHhho.','.oh..........hHo.','.oh..........hHo.','..o..........oo..']),
  'N': O(0,0, ['......ooooo......','....ooh#hhHoo....','...o#hh#hhHHho...','..ohJJJJhHHhhHo..','..oh##hhjjjjhHo..','.o#hh##hHHhhjjjo.','.o#hh##hHHhhHHho.','.o##hh##HhhHHhho.','.oJJhh##HhhHHhho.','.oh#JJJJhhHHhhHo.','.oh##hh#jjjjhhHo.','..oh##hhhHHhjjo..','...oo#hhhHHhoo...','.....ooooooo.....']),
  'W': O(0,0, ['...oooooooo...','..oh##hh#hho..','.ohh##hh#hhHo.','.o#hhJJJJhHHo.','o##hh##hhjjjjo','oh##hh##hHHhho','oh##hh##hHHhho','ohh##hh##Hhho.','..........hho.','..........hHo.','.........jjo..','........hhHo..','.........o....']),
  'NW': O(0,0, ['......ooooo......','....ooh#hhHoo....','...o#hh#hhHHho...','..ohJJJJhHHhhHo..','..oh##hhjjjjhHo..','.o#hh##hHHhhjjjo.','.o#hh##hHHhhHHho.','.o##hh##HhhHHhho.','.oJJhh##HhhHHhho.','.oh#JJJJhhHHhhHo.','.oh##hh#jjjjhhHo.','..oh##hhhHHhjjo..','...oo#hhhHHhoo...','.....ooooooo.....']),
}
HAIR['BOB'] = {
  'SW': O(0,0, ['......ooooo......','....ooh#hhHoo....','...o#hh#hhHHho...','..ohJJJJhHHhhHo..','..oh##hhjjjjhHo..','.o#hh##hHHhhjjjo.','.o#hh##hHHhhHHho.','.o##hh##HhhHHhho.','.oh..HHH..HHhhho.','.oh..........hhho','.oh..........hhho','.oH..........hHo.','..oH.........oHo.','...o.........oo..']),
  'N': O(0,0, ['......ooooo......','....ooh#hhHoo....','...o#hh#hhHHho...','..ohJJJJhHHhhHo..','..oh##hhjjjjhHo..','.o#hh##hHHhhjjjo.','.o#hh##hHHhhHHho.','.o##hh##HhhHHhho.','.oJJhh##HhhHHhho.','.oh#JJJJhhHHhhHo.','.oh##hh#jjjjhhHo.','.ohh##hhhHHhjjjo.','..oh##hhhHHhhHo..','...oo##hHHhhoo...','.....ooooooo.....']),
  'W': O(0,0, ['...oooooooo...','..oh##hh#hho..','.ohh##hh#hhHo.','.o#hhJJJJhHHo.','o##hh##hhjjjjo','oh##hh##hHHhho','oh##hh##hHHhho','oHhH..hhHhhHjo','......o##HhhHo','......oJJhhHHo','......oh#jjjjo','......ohhhHHHo','.......ohhHHHo','........oooooo']),
  'NW': O(0,0, ['......ooooo......','....ooh#hhHoo....','...o#hh#hhHHho...','..ohJJJJhHHhhHo..','..oh##hhjjjjhHo..','.o#hh##hHHhhjjjo.','.o#hh##hHHhhHHho.','.o##hh##HhhHHhho.','.oJJhh##HhhHHhho.','.oh#JJJJhhHHhhHo.','.oh##hh#jjjjhhHo.','.ohh##hhhHHhjjjo.','..oh##hhhHHhhHo..','...oo##hHHhhoo...','.....ooooooo.....']),
}
HAIR['WILD'] = {
  'SW': O(0,0, ['......ooooo......','....ooh#hhHoo....','...o#hh#hhHHho...','..ohJJJJhHHhhHo..','..oh##hhjjjjhHo..','.o#hh##hHHhhjjjo.','.o#hh##hHHhhHHho.','.o##hh##HhhHHhho.','.oh..HHH..HHhhho.','.oh..........hhho','ohh..........hhho','.oh..........hhho','.oh..........hhho','.oH.........oHhho','ohH..........Hhho','.oH..........HHo.','.oHo.........oHo.','..o...........o..']),
  'N': O(0,0, ['......ooooo......','....ooh#hhHoo....','...o#hh#hhHHho...','..ohJJJJhHHhhHo..','..oh##hhjjjjhHo..','.o#hh##hHHhhjjjo.','.o#hh##hHHhhHHho.','.o##hh##HhhHHhho.','.oJJhh##HhhHHhho.','.oh#JJJJhhHHhhHo.','ohh##hh#jjjjhhHo.','.ohh##hhhHHhjjjjo','.ohh##hhhHHhhHHo.','.o#hh##hHHhhHHHo.','oJJJh##hHHhhHHHHo','.o##JJJJHhhHHHHo.','.o#ohh##jjjjHoHo.','..ooooooooooooo..']),
  'W': O(0,0, ['...oooooooo...','..oh##hh#hho..','.ohh##hh#hhHo.','.o#hhJJJJhHHo.','o##hh##hhjjjjo','oh##hh##hHHhho','oh##hh##hHHhho','oHhH..hhHhhHjo','.ohH..ohHhhhjo','.ohH..ohhHhhjo','.oH...ohhhHjjo','..o...ohhhHHho','......ohhhHHho','.......ohHHhho','.......ohHHhho','.......oJHhhHo','........ojjo..','.........oo...']),
  'NW': O(0,0, ['......ooooo......','....ooh#hhHoo....','...o#hh#hhHHho...','..ohJJJJhHHhhHo..','..oh##hhjjjjhHo..','.o#hh##hHHhhjjjo.','.o#hh##hHHhhHHho.','.o##hh##HhhHHhho.','.oJJhh##HhhHHhho.','.oh#JJJJhhHHhhHo.','ohh##hh#jjjjhhHo.','.ohh##hhhHHhjjjjo','.ohh##hhhHHhhHHo.','.o#hh##hHHhhHHHo.','oJJJh##hHHhhHHHHo','.o##JJJJHhhHHHHo.','.o#ohh##jjjjHoHo.','..ooooooooooooo..']),
}
HAIR['PONYTAIL'] = {
  'SW': [O(0,0, ['......ooooo......','....ooh#hhHoo....','...o#hh#hhHHho...','...oJJJJhHHhho...','..oh##hhjjjjhHo..','..ohh##hHHhhjjo..','..ohh##hHHhhHHo..','..o#hh##HhhHHHo..','............HHH..']), O(13,10, ['.ooo','o#Ho','ohHo','ohjo','oHjo','.oo.'])],
  'N': [O(0,0, ['......ooooo......','....ooh#hhHoo....','...o#hh#hhHHho...','...oJJJJhHHhho...','..oh##hhjjjjhHo..','..ohh##hHHhhjjo..','..ohh##hHHhhHHo..','..o#hh##HhhHHHo..','..JJhh##HhhHHHH..','...oJJJJhhHHHo...','...o#hh#jjjjHo...','...o##hhhHHHjo...','....o#hhhHHHo....']), O(7,12, ['.ooo','o#Ho','ohHo','ohjo','oHjo','.oo.'])],
  'W': [O(0,0, ['...oooooooo...','..oh##hh#hho..','.ohh##hh#hhHo.','.o#hhJJJJhHHo.','o##hh##hhjjjjo','oh##hh##hHHHHo','oh##hh##hHHHHo','oHhH.....hHjo.','.ohH......Hjo.']), O(10,8, ['.ooo','o#Ho','ohHo','ohjo','oHjo','.oo.'])],
  'NW': [O(0,0, ['......ooooo......','....ooh#hhHoo....','...o#hh#hhHHho...','...oJJJJhHHhho...','..oh##hhjjjjhHo..','..ohh##hHHhhjjo..','..ohh##hHHhhHHo..','..o#hh##HhhHHHo..','..JJhh##HhhHHHo..','...oJJJJhhHHHo...','...o#hh#jjjjHo...','...o##hhhHHHo....','....o#hhhHHo.....']), O(7,12, ['.ooo','o#Ho','ohHo','ohjo','oHjo','.oo.'])],
}
HAIR['SHORT'] = {
  'SW': O(0,0, ['......ooooo......','....ooh#hhHoo....','...o#hh#hhHHho...','...oJJJJhHHhho...','..oh##hhjjjjhHo..','..ohh##hHHhhjjo..','..ohh##hHHhhHHo..','..o#hh##HhhHHHo..','.....HHj..HjHhH..']),
  'N': O(0,0, ['......ooooo......','....ooh#hhHoo....','...o#hh#hhHHho...','...oJJJJhHHhho...','..oh##hhjjjjhHo..','..ohh##hHHhhjjo..','..ohh##hHHhhHHo..','..o#hh##HhhHHHo..','.oJJhh##HhhHHHHo.','...oJJJJhhHHHo...','...o#hh#jjjjHo...','...o##hhhHHHjo...','....o#hhhHHHo....','.....ooooooo.....']),
  'W': O(0,0, ['...oooooooo...','..oh##hh#hho..','.ohh##hh#hhHo.','.o#hhJJJJhHHo.','o##hh##hhjjjjo','oh##hh##hHHhho','oh##hh##hHHhho','oHhH.....hHjo.','.ohH......Hjo.','..........hHo.','.........jjo..','........hhHo..','.........o....']),
  'NW': O(0,0, ['......ooooo......','....ooh#hhHoo....','...o#hh#hhHHho...','...oJJJJhHHhho...','..oh##hhjjjjhHo..','..ohh##hHHhhjjo..','..ohh##hHHhhHHo..','..o#hh##HhhHHHo..','.oJJhh##HhhHHHHo.','...oJJJJhhHHHo...','...o#hh#jjjjHo...','...o##hhhHHHjo...','....o#hhhHHHo....','.....ooooooo.....']),
}
HAIR['LONG'] = {
  'SW': O(0,0, ['......ooooo......','....ooh#hhHoo....','...o#hh#hhHHho...','..ohJJJJhHHhhHo..','..oh##hhjjjjhHo..','.o#hh##hHHhhjjjo.','.o#hh##hHHhhHHho.','.o##hh##HhhHHhho.','.oh..HHH..HHhhho.','.oh..........hhho','.oh..........hhho','.oh..........hhho','.oh..........hhho','.oh.........ohhho','.oh..........hhho','.oH..........hHo.','..o..........oo..']),
  'N': O(0,0, ['......ooooo......','....ooh#hhHoo....','...o#hh#hhHHho...','..ohJJJJhHHhhHo..','..oh##hhjjjjhHo..','.o#hh##hHHhhjjjo.','.o#hh##hHHhhHHho.','.o##hh##HhhHHhho.','.oJJhh##HhhHHhho.','.oh#JJJJhhHHhhHo.','.oh##hh#jjjjhhHo.','.ohh##hhhHHhjjjo.','.ohh##hhhHHhhHHo.','.o#hh##hHHhhHHHo.','.oJJh##hHHhhHHHo.','.o##JJJJHhhHHHHo.','..ooooooooooooo..']),
  'W': O(0,0, ['...oooooooo...','..oh##hh#hho..','.ohh##hh#hhHo.','.o#hhJJJJhHHo.','o##hh##hhjjjjo','oh##hh##hHHhho','oh##hh##hHHhho','oHhH..hhHhhHjo','......o##HhhHo','......oJJhhHHo','......oh#jjjjo','......ohhhHHho','......ohhhHHho','......o#hHHhho','......o#hHHhho','......oJJHhhHo','......oooooooo']),
  'NW': O(0,0, ['......ooooo......','....ooh#hhHoo....','...o#hh#hhHHho...','..ohJJJJhHHhhHo..','..oh##hhjjjjhHo..','.o#hh##hHHhhjjjo.','.o#hh##hHHhhHHho.','.o##hh##HhhHHhho.','.oJJhh##HhhHHhho.','.oh#JJJJhhHHhhHo.','.oh##hh#jjjjhhHo.','.ohh##hhhHHhjjjo.','.ohh##hhhHHhhHHo.','.o#hh##hHHhhHHHo.','.oJJh##hHHhhHHHo.','.o##JJJJHhhHHHHo.','..ooooooooooooo..']),
}

BUZZ = {'SW': R([0,0,16,7],'hair'), 'W': [R([0,0,13,7],'hair'), R([9,8,12,11],'hair')], 'N': R([0,0,16,13],'hair'), 'NW': R([0,0,16,13],'hair')}

# ---------------------------------------------------------------- hats (W only here; SW/N/NW reuse or flip the S drawings)
HATS = {
 'HELMET_W': O(-2,0, ['.....ooooooo......','...ooV^^cccoo.....','..o^^^ccccccco....','.o^ccccccccccco...','.occCCCCCCCCCCCo..',
                      '.occcccccCCCCCvo..','.occccCCCCCvvvvo..','.occcCCCCCCvvvvo..','.ooooooooooooooo..'], rigid=True),
 'BERET_W':  O(-2,0, ['...ooooooooo......','..oQQ&&&kkkkoo....','.o&&&kkKkkkkkkoo..','.okkKkkkKkkkkkKKo.','.okkkkkkkKKKKKKqo.',
                      '.okkkKKKKKKKqqqqo.','.okkkKKKKKKKqqqqo.','.okkkKKKKKKKqqqqo.','.ooooooooooooooo..'], rigid=True),
 'CAP_W':    O(-2,0, ['....ooooooooo.....','...oQQ&&&KkkKo....','..o&&kkkKkkkkko...','..okkkkkkkkkKKo...','..okkKKKKKqqqqo...',
                      '..o&&&&&kkkkkko...','..okkKKKKKKqqqqo..','oooooooooooooooo..'], rigid=True),
 'CAP_N':    O(-1,0, ['....ooooooooooo....','...oQQ&&&&KkkkKo...','..o&&&kkkKkkkkkKo..','..okkkkkkkkkkKKKo..','..okkkKKKKKKqqqqo..',
                      '...o&&&&&kkkkkko...','..okkkKKKKKKqqqqo..','..ooooooooooooooo..'], rigid=True),
 'HARD_HAT_W': O(-2,0, ['.....ooooooo......','...oo***aaaoo.....','..o***aaaaaaao....','.o*aaaaaaaaaaao...','.oaaaaaaaaaaAAAo..',
                        '.oaaaaaaaAAAAAro..','o*aaaaAAAAAArrrro.','ooooooooooooooooo.'], rigid=True),
 'RANGER_W_BRIM': O(-2,6, ['.o.............oo.','oLlllllllllllllLo.','.ooooooooooooooo..'], rigid=True),
}
RANGER_W_REMAP = R([0,0,13,6],'leather'); RANGER_W_SEAM = L([1,6,11,6])

# ---------------------------------------------------------------- faces
FACE = {
 'GLASSES_SW': O(2,8, ['...o.o.....','...ooo.....','...o.o.....','o..o.o..ooo','oooo.oooo..']),
 'GLASSES_W':  O(3,7, ['ooo...','o..ooo','o..o..','o..o..','oooo..']),
 'BEARD_SW':   O(2,12, ['.o#hHhhHHo.','o#oooooooHo','o#hHhhHhhHo','oHhhHhhHHHo','.ooooooooo.']),
 'BEARD_W':    O(0,12, ['.o#hHho..','o#hHhhho.','o#hhHhHo.','.oHhhHHo.','..ooooo..']),
 'SUNKEN_SW':  O(3,9, ['SS...SS','Se...eS','SS...SS']),
 'SMILE_SW':   O(3,12, ['ooooooooo','.xxxxxx..']),
 'SUNKEN_W':   O(3,8, ['.SS','.eS','SSS']),
 'SMILE_W':    O(2,12, ['oooooo','.xxxx.']),
 'HEADBAND_W': O(0,6, ['o*aaaaaaaaAAo','oAaaaaaaaAAAo']),
 'ZFACE_SW':   O(2,9, ['...S.S...','...S.S...','.$.....$.','.SoxxxoS.','...ooo...']),
 'ZFACE_W':    O(2,12, ['xxxo','.ooo']),
 'ZCHEEK_SW':  O(10,5, ['d','d']),
 'ZCHEEK_W':   O(9,5, ['d','d']),
 'SEALED_SW':  O(3,9, ['SS...SS','oo...oo','SS...SS']),
 'SEALED_W':   O(4,8, ['SS','oo','SS']),
 'BIG_EAR_W':  O(5,0, ['...o..','..oso.','..osSo','.ossSo','.ossSo','.ossSo','.osSSo','.oSSSo','.oSS$o','..ooo.']),
}
# ---------------------------------------------------------------- body items (figure space)
BODY = {
 'BAG_W':    [O(8,22, ['ooooo','o*x*o','oxxxo','oAxAo','oAAAo','ooooo'], head=False)],
 'BAG_N':    [O(5,17, ['......A','.....A.','....A..','...A...','..A....','.A.....','A......'], head=False),
              O(0,23, ['ooooo','o*x*o','oxxxo','oAxAo','oAAAo','ooooo'], head=False)],
 'COAT_W':   [O(3,29, ['o^cccccCo.','o^cccccCo.','o^cccccCo.','.oooooooo.'], head=False)],
 'STAINS_W': [O(5,30, ['...D.','.....','D....','.....','....D'], head=False)],
 'RIFLE_STAND_W': [O(12,9, ['.o.', '.o.', '.o.', '.o.', '.o.', '...', '...', '...', '...', '.Do', '.Do', '.Do', '.Do', '.Do', '.Do', '.Do', '.Do', '.Do', '.Do', '.Do', 'Do.', 'Do.', 'Do.', '.Do', '.Do', '.Do', '.Do', '.Do', '.Do', '.Do', '.oo'], head=False, under=True)],
 'RIFLE_STAND_N': [O(-5,9, ['..o.', '..o.', '..o.', '..o.', '..o.', '..o.', '..o.', '..o.', '..o.', '..o.', '.oo.', 'omMo', 'omMo', 'odDo', 'odDo', 'odDo', 'o%Do', 'odDo', 'odDo', 'odDo', 'odDo', 'o%Do', 'odDo', 'odDo', 'odDo', 'oDDo', 'oDDo', 'oDDo', 'oDDo', 'oDDo', '.oo.'], head=False)],
 'RIFLE_SLUNG_W': [O(14,9, ['o...', 'o...', 'o...', 'o...', 'o...', '....', '....', '....', '....', '.o..', '.o..', '.o..', '.o..', '.o..', '.o..', '.o..', '.o..', '.o..', '.o..', '.o..', '.ooo', '.oDo', '.oDo', '.ooo'], head=False, under=True)],
 'RIFLE_SLUNG_N': [O(7,17, ['oo.........', '.oo........', '..oo.......', '..o........', '...o.......', '....o......', '....o......', '.....o.....', '......o....', '......o....', '.......oooo', '........oDo', '........oDo', '........oDo', '........ooo'], head=False), O(11,16, ['LL','.L'], head=False)],
 'SATCHEL_W':  [O(13,21, ['ooooo', 'oa*Ao', 'oaaAo', 'orrro', 'oaxAo', 'oxxxo', 'oaxAo', 'oAAAo', 'ooooo'], head=False)],
 'BACKPACK_W': [O(13,17, ['.ooo', 'o|lo', 'o|lo', 'oiio', 'oLlo', 'oLlo', 'oLlo', 'oLlo', 'oLlo', 'olLo', 'oiio', '.ooo'], head=False), O(10,7, ['....ooo', '....o%o', '...o%o.', '...odo.', '..odo..', '..odo..', '.odo...', '.odo...', 'odo....', 'odo....'], head=False, under=True)],
 'BACKPACK_N': [O(3,11, ['.ooooooooo.', 'oL|llllllLo', 'oL|lllllLLo', 'oLlllllllLo', 'ooooooooooo'], head=False), O(3,16, ['o||lllllllo', 'o|llllllLLo', 'ollllllllLo', 'oiiiiiiiiio', 'ollllLllllo', 'o|lllLlllLo', 'o|llllmllLo', 'oLLLLLLLLLo', 'ollllLllllo', 'oilllLLlLio', 'ooooooooooo'], head=False)],
 'RANGER_COAT_W': [O(2,29, ['o^cccccCcCo', 'o^ccCccCcCo', 'occcCccCcco', 'occcCccCcvo', 'occcCccccvo', 'occccccccvo', 'ooooooooooo'], head=False)],
 'COAT_TAILS2_W': [O(2,29, ['o^cccccCcCo', 'o^ccCccCcCo', 'occcCccCcco', 'occcCccccvo', 'occccccccvo', 'ooooooooooo'], head=False), O(1,23, ['ooooo', 'oMMxo', 'oxxxo', 'oxxxo', 'oxxxo', 'oxxxo', 'ooooo'], head=False)],
 'TUNIC_W': [O(2,29, ['o^cccccCcCo', 'o^ccCccccCo', 'occccccccco', 'ooooooooooo'], head=False), O(13,24, ['oooo', 'oAao', 'oAao', 'oaao', 'oooo'], head=False)],
 'SATCHEL_N':  [O(5,17, ['......A','.....A.','....A..','...A...','..A....','.A.....','AA.....'], head=False), O(-2,23, ['ooooo', 'oA*ao', 'oAaao', 'orrro', 'oAxao', 'oxxxo', 'oAxao', 'oAAAo', 'ooooo'], head=False)],
}

# ---------------------------------------------------------------- validation
def compose(view, layers, pad=5, top=3):
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
for name in ('RIFLE_STAND_W', 'RIFLE_STAND_N', 'RIFLE_SLUNG_W', 'RIFLE_SLUNG_N', 'SATCHEL_W', 'SATCHEL_N', 'BACKPACK_W', 'BACKPACK_N', 'RANGER_COAT_W', 'COAT_TAILS2_W', 'TUNIC_W'):
    out.append("export const "+name+": ViewLayer = "+ts_layers(BODY[name])+";\n")
open(OUT,'w').write('\n'.join(out))
print('wrote', OUT)
