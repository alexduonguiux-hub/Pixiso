"""Hand-drawn giant mannequins (x1.5 = 25x60, x2 = 33x80) for hero64.giant.ts.

A giant is a bigger person, not the base figure scaled: the silhouette keeps
the base proportions, but every feature stays at pixel scale (eyes two cells
wide and three tall under a two-cell brow, one-pixel lines, fists with one
thumb line) and the shading is placed by hand (a highlight dome weighted to
the upper left, 2-3 cell shadow clusters, limb highlights on the top rows of
the upper arm and thigh, a short forearm/calf highlight, no full-length
stripes). The script validates the drawings (closed outline, no exposed skin,
no lonely line cell, the craft lint) and emits the TypeScript.

Usage: python3 -I scripts/research/gen_giants.py [--print]
"""
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'packages', 'sprite-kit', 'src', 'hero64.giant.ts')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pixel_lint

def fig(w, rows):
    bad = [(i, len(r), r) for i, r in enumerate(rows) if len(r) != w]
    assert not bad, bad
    return rows

# ------------------------------------------------------------------ x1.5: 25x60
# Rows: skull 0-11 (highlight dome 2-8), brow and ears 12, eyes 13-15, jaw 16-20,
# neck 21, shoulders 22-26 (collarbones 23, pecs 24-25, under-pec shadow 26),
# arms 27-43 (fists 38-43), torso 27-43 (ribs 27-28, abs 29/32, belly light
# 34-39, pelvis 41), crotch 44, thighs 45-50, calves 51-53, feet 54-59.
GIANT15 = fig(25, [
'.........ooooooo.........',
'.......ooSsssssSoo.......',
'......oSS$$$$$$sSSo......',
'.....os$$$$$$$$$ssso.....',
'....os$$$$$$$$$$sssso....',
'....oss$$$$$$$$$sssso....',
'...osss$$$$$$$$sssssSo...',
'...ossss$$$$$$sssssSSo...',
'...osssss$$$$sssssssSo...',
'...ossssssssssssssssSo...',
'...oSssssssssssssssSSo...',
'...oSSssssssssssssSSSo...',
'..osSoosssssssssssooSso..',
'..osSoxesssssssssexoSso..',
'..osSoxesssssssssexoSso..',
'...oSoxesssssssssexoSo...',
'....oSss$$$$$ssssSSso....',
'.....os$$$$$$$ssssSo.....',
'......os$$$$$$sssSo......',
'.......os$$$$sssSo.......',
'........oss$$ssSo........',
'......oosooooooosoo......',
'.....ossssssssssssso.....',
'....ossssSSsssSSsssso....',
'...osss$$$ssSSs$$sssso...',
'..oSss$$$$ssSSs$$$sssSo..',
'..oSssSSSsssssssSSSsSSo..',
'.osssoss$$sssssssssossso.',
'.osssosss$ssssssssSossso.',
'.o$ssosSSsssssSSssSoss$o.',
'o$ssSosssssssssssSSoSss$o',
'o$ssSosssssssssssssoSss$o',
'o$sssosSSsssssSSsssosss$o',
'ossssosssssssssssssosssso',
'osssooss$$$$$ssssssoossso',
'o$ssoos$$$$$$$sssssooss$o',
'o$ssoos$$$$$$$ssssSooss$o',
'ossssoss$$$$$$sssSSosssso',
'osossosss$$$$sssssSossoso',
'osossossss$$ssssSSsossoso',
'osossosssssssssssssossoso',
'osoooossSSsssssSSssooooso',
'.ossoosssssssssssssoosso.',
'.ossoosssssssssssssoosso.',
'..oooosssooooooosssoooo..',
'....oSssssso.osssssSo....',
'....o$ssssSo.oSssss$o....',
'....o$$sssSo.oSsss$$o....',
'....o$$sssSo.oSsss$$o....',
'....o$sssSso.osSsss$o....',
'....ossssSso.osSsssso....',
'...ossssssso.ossssssso...',
'...os$sssSso.osSsss$so...',
'...os$sssSso.osSsss$so...',
'..ooooSsssso.ossssSoooo..',
'.o$$$$ssssso.osssss$$$$o.',
'.o$$$sssssso.ossssss$$$o.',
'.ossssssssso.ossssssssso.',
'.osssssssSSo.oSSssssSSso.',
'.ooooooooooo.ooooooooooo.',
])

# ------------------------------------------------------------------ x2: 33x80
# The silhouette of the checked-in drawing is kept; each row's interior
# segments (runs between line cells) are repainted, or a whole row is given
# where a line cell moves (brows, eyes).
def segments(row):
    return [(m.start(), m.end()) for m in re.finditer(r'[^o.]+', row)]

def paint(orig, spec):
    out = list(orig)
    for y, v in spec.items():
        if isinstance(v, str):
            assert len(v) == len(orig[y]), (y, len(v), v)
            out[y] = v
            continue
        segs = segments(orig[y])
        assert len(v) == len(segs), (y, 'segments', [b - a for a, b in segs], v)
        r = list(orig[y])
        for (a, b), t in zip(segs, v):
            assert len(t) == b - a, (y, 'segment', b - a, t)
            r[a:b] = list(t)
        out[y] = ''.join(r)
    return out

S = lambda n: 's' * n
# Rows: skull 0-15 (dome 2-10 weighted to the upper left, temples 12-15), brow
# and ears 16, eyes 17-20 (three wide, the white column rounded off on the last
# row), jaw 21-26, neck 27, shoulders 28-32 (collarbones 29, pecs 30-32),
# under-pec shadow 33, arms 33-56 (fists 49-56), torso 34-56 (ribs 34-35, abs
# 38/41, belly light 43-50, pelvis 54), crotch 57, thighs 58-66, calves 67-72,
# feet 73-79.
GIANT2_SPEC = {
    1: ['Ss$$$$ssS'],
    2: ['Ss$$$$$$$$$sssS'],
    3: ['s$$$$$$$$$$$$ssssss'],
    4: ['s$$$$$$$$$$$$$sssssss'],
    5: ['ss$$$$$$$$$$$$sssssss'],
    6: ['sss$$$$$$$$$$$ssssssssS'],
    7: ['ssss$$$$$$$$$$sssssssSS'],
    8: ['sssss$$$$$$$$ssssssssSS'],
    9: ['ssssss$$$$$$sssssssssSS'],
    10: ['sssssss$$$$sssssssssssS'],
    11: [S(23)],
    12: ['S' + S(21) + 'S'],
    13: ['SS' + S(19) + 'SS'],
    14: ['SS' + S(18) + 'SSS'],
    15: ['SSS' + S(17) + 'SSS'],
    16: '..ooSSooo' + S(15) + 'oooSSoo..',
    17: '..osSoxee' + S(15) + 'eexoSso..',
    18: '..osSoxee' + S(15) + 'eexoSso..',
    19: '..osSoxee' + S(15) + 'eexoSso..',
    20: '..osSosee' + S(15) + 'eesoSso..',
    21: '...o' + 'Sssss$$$$$$$ssssssssSSsSS' + 'o...',
    22: '....o' + 'sss$$$$$$$$ssssssssSSss' + 'o....',
    23: ['ss$$$$$$$ssssssssSSss'],
    24: ['ss$$$$$$sssssssSSss'],
    25: ['ss$$$$ssssssssSSs'],
    26: ['sss$$ssssssSSSs'],
    28: [S(19)],
    29: ['sssssSSSsssssSSSsssss'],
    30: ['ssss$$$$sssSSsss$$$ssss'],
    31: ['sss$$$$$$sssSSss$$$$$ssss'],
    32: ['Sss$$$$$ssssSSssss$$$ssssSS'],
    33: ['sssss', 'sSSSSssssssSSSsss', 'sssss'],
    34: ['sssss', 'ss$$sssssssssssss', 'sssss'],
    35: ['$ssss', 'ss$$sssssssssssss', 'ssss$'],
    36: ['$ssssS', 'sss$sssssssssssSS', 'Sssss$'],
    37: ['$ssssS', S(15) + 'SS', 'Sssss$'],
    38: ['$ssssS', 'sSSSsssssssSSSsss', 'Sssss$'],
    39: ['$sssss', S(17), 'sssss$'],
    40: ['$sssss', S(17), 'sssss$'],
    41: [S(6), 'sSSSsssssssSSSsss', S(6)],
    42: [S(6), S(17), S(6)],
    43: [S(5), 'sss$$$$$$$sssssss', S(5)],
    44: ['$ssss', 'ss$$$$$$$$$ssssss', 'ssss$'],
    45: ['$ssss', 's$$$$$$$$$$sssssS', 'ssss$'],
    46: ['$ssss', 's$$$$$$$$$$sssssS', 'ssss$'],
    47: [S(6), 'ss$$$$$$$$$ssssSS', S(6)],
    48: [S(6), 'sss$$$$$$$sssssSS', S(6)],
    49: ['ss', 'sss', 'ssss$$$$$ssssssSs', 'sss', 'ss'],
    50: ['ss', 'sss', 'sssss$$$sssssssss', 'sss', 'ss'],
    51: ['ss', 'sss', S(17), 'sss', 'ss'],
    52: ['ss', 'sss', S(17), 'sss', 'ss'],
    53: ['ss', S(17), 'ss'],
    54: ['ss', 'sssSSSssssSSSssss', 'ss'],
    55: ['ss', S(17), 'ss'],
    56: ['ss', S(17), 'ss'],
    58: ['S' + S(7), S(7) + 'S'],
    59: ['$ssssssS', 'Sssssss$'],
    60: ['$$sssssS', 'Ssssss$$'],
    61: ['$$sssssS', 'Ssssss$$'],
    62: ['$$ssssss', 'ssssss$$'],
    63: ['$sssssss', 'sssssss$'],
    64: [S(8), S(8)], 65: [S(8), S(8)],
    66: [S(9), S(9)],
    67: ['s$sssssss', 'sssssss$s'],
    68: ['s$sssssss', 'sssssss$s'],
    69: ['s$sssssss', 'sssssss$s'],
    70: ['sssssssSs', 'sSsssssss'],
    71: ['sssssssSs', 'sSsssssss'],
    72: ['Sssssss', 'ssssssS'],
    73: ['$$$$$ssssss', 'ssssss$$$$$'],
    74: ['s$$$$ssssss', 'ssssss$$$$s'],
    75: ['ss$$sssssss', 'sssssss$$ss'],
    76: [S(11), S(11)], 77: [S(11), S(11)],
    78: [S(10) + 'S', 'S' + S(10)],
}

def current_rows(name):
    """Rows of a sprite in the checked-in hero64.giant.ts (silhouette lock)."""
    src = open(OUT).read()
    m = re.search(r'export const %s = sprite`\n(.*?)`;' % name, src, re.S)
    return [l.strip() for l in m.group(1).strip('\n').split('\n')]

def problems(rows, allow_double=()):
    H = len(rows); W = len(rows[0]); out = []
    at = lambda x, y: rows[y][x] if 0 <= x < W and 0 <= y < H else '.'
    for y in range(H):
        for x in range(W):
            c = rows[y][x]
            if c == '.': continue
            if c == 'o':
                if not any((dx or dy) and at(x + dx, y + dy) == 'o' for dy in (-1, 0, 1) for dx in (-1, 0, 1)):
                    out.append(f'lonely o ({x},{y})')
            else:
                if any(at(x + dx, y + dy) == '.' for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    out.append(f'exposed {c} ({x},{y})')
    return out

def silhouette(rows):
    return [''.join('.' if c == '.' else '#' for c in r) for r in rows]

def check(name, rows, lock, allow=()):
    """Validate a drawing; `lock` is the checked-in drawing whose silhouette must be kept
    (the brute composition and the clothes regions depend on it) except on `allow` rows."""
    ps = problems(rows)
    if lock is not None:
        a, b = silhouette(rows), silhouette(lock)
        diff = [y for y in range(len(a)) if a[y] != b[y] and y not in allow]
        if diff: ps.append(f'silhouette differs from the checked-in drawing on rows {diff}')
    for p in ps: print(f'{name}: {p}')
    pixel_lint.summarize(f'lint {name}', pixel_lint.lint(rows), show=6)
    return not ps

GIANT2 = paint(current_rows('HERO_GIANT2_S'), GIANT2_SPEC)

if __name__ == '__main__':
    ok = check('GIANT15', GIANT15, current_rows('HERO_GIANT15_S'), allow={25})  # shoulder slope made monotone
    ok = check('GIANT2', GIANT2, current_rows('HERO_GIANT2_S')) and ok
    if '--print' in sys.argv:
        for name, g in (('GIANT15', GIANT15), ('GIANT2', GIANT2)):
            print('==', name)
            for i, r in enumerate(g): print(str(i).rjust(2), r)
    print('ok' if ok else 'PROBLEMS')
    if not ok and '--force' not in sys.argv: sys.exit(1)
    header = '''/**
 * Giant mannequins drawn by hand, not scaled (generated by
 * scripts/research/gen_giants.py, which validates them; do not edit by hand).
 * The silhouette keeps the base proportions (head a little over a third of
 * the height), but every feature stays at pixel scale: one-pixel brown
 * outline, eyes two or three cells wide under a two-cell brow, ears, fists
 * with one thumb line and a knuckle line, feet one column wider than the
 * calves. Shading is placed by hand: a highlight dome weighted to the upper
 * left of the skull, collarbone and under-pec shadow dashes, two pairs of
 * abs, a belly light, 2-3 cell shadow clusters on the lower right, limb
 * highlights only on the top rows of the upper arm and thigh plus a short
 * forearm and calf light, so a giant is a bigger person, not a different
 * species and not a blown-up sprite.
 */
import { sprite } from './format.js';

'''
    def block(name, doc, rows):
        return f'/** {doc} */\nexport const {name} = sprite`\n' + '\n'.join('  ' + r for r in rows) + '\n`;\n'
    ts = header + block('HERO_GIANT15_S', 'Front view at about ×1.5: 25×60 with the outline.', GIANT15) + '\n' + block('HERO_GIANT2_S', 'Front view at ×2: 33×80 with the outline.', GIANT2)
    open(OUT, 'w').write(ts)
    print('wrote', OUT)
