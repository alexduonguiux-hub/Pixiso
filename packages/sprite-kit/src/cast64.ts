/**
 * The Vùng Xanh cast dressed on the hero mannequin (front view). Each entry is
 * an Outfit: material remaps for tight clothes, seam lines, and hand-drawn
 * overlays (hair, headband, glasses, bag) in figure coordinates. Player
 * characters come from the game's characters.json (Dương the leader, Hùng
 * strength, Ny medic, Sơn technician); their look follows the game's own
 * sprites in broad strokes (colours and silhouettes), redrawn here at the
 * mannequin's scale.
 */
import { parseSprite } from './format.js';
import { FORM_FAT, FORM_HEAVY } from './heroforms.js';
import type { Outfit, Overlay, Remap } from './outfit64.js';
import type { Box } from './hero64.js';

/** Overlay from ASCII rows at a figure position. */
function ov(x: number, y: number, rows: string[]): Overlay {
  return { sprite: parseSprite(rows, 'overlay'), x, y };
}

/* Regions of the base figure (17×40). */
/** Neck opening of a crew neck: the neck well on rows 15–16 and its bottom on row 17. */
const NECK: Box[] = [
  [6, 15, 10, 16],
  [7, 17, 9, 17],
];
/** Shirt body: torso from the shoulders to the hem minus the neck opening, plus the shoulder caps (not the arms). */
const SHIRT: Remap[] = [
  { box: [4, 15, 12, 28], except: NECK, to: 'cloth' },
  { box: [1, 15, 3, 18], to: 'cloth' },
  { box: [13, 15, 15, 18], to: 'cloth' },
];
const SLEEVE_R_SHORT: Remap = { box: [0, 18, 4, 22], to: 'cloth' };
const SLEEVE_L_SHORT: Remap = { box: [12, 18, 16, 22], to: 'cloth' };
const SLEEVE_R_LONG: Remap = { box: [0, 18, 4, 24], to: 'cloth' };
const SLEEVE_L_LONG: Remap = { box: [12, 18, 16, 24], to: 'cloth' };
const PANTS: Remap = { box: [0, 29, 16, 35], to: 'pants' };
const SHOES: Remap = { box: [0, 36, 16, 39], to: 'boots' };
/** Seams: collar under the neck opening and the hem. */
const COLLAR: Box[] = [
  [6, 17, 6, 17],
  [10, 17, 10, 17],
  [7, 18, 9, 18],
];
const HEM: Box = [5, 28, 11, 28];
const TEE = [...SHIRT, SLEEVE_R_SHORT, SLEEVE_L_SHORT, PANTS, SHOES];
const LONG_SLEEVES = [...SHIRT, SLEEVE_R_LONG, SLEEVE_L_LONG, PANTS, SHOES];

/** Short dark hair, parted, tips over the brow. */
const HAIR_SHORT = ov(0, 0, [
  '......ooooo......',
  '....oo#hhhhoo....',
  '...o##hhhhhhho...',
  '...o#hhhhhhhho...',
  '..o#hhhhhhhhhho..',
  '..ohhhhhhhhhhho..',
  '..ohhhhhHhhhhho..',
  '..oHhhhhHHhhhHo..',
  '..HhH..HHH..HhH..',
]);

/** Fuller black hair swept over the brow, sideburns over the ears. */
const HAIR_SWEPT = ov(0, 0, [
  '......ooooo......',
  '....oo#hhhhoo....',
  '...o##hhhhhhho...',
  '..o##hhhhhhhhho..',
  '..o#hhhhhhhhhho..',
  '.o#hhhhhhhhhhhho.',
  '.ohhhhhhhhhhhhho.',
  '.ohhhhhhHhhhhhho.',
  '.oHhhhhhHHhhhhHo.',
  '.ohH.........Hho.',
  '.ohH.........Hho.',
  '..oo.........oo..',
]);

/** Chin-length bob with a fringe. */
const HAIR_BOB = ov(0, 0, [
  '......ooooo......',
  '....oo#hhhhoo....',
  '...o##hhhhhhho...',
  '..o##hhhhhhhhho..',
  '..o#hhhhhhhhhho..',
  '.o#hhhhhhhhhhhho.',
  '.ohhhhhhhhhhhhho.',
  '.ohhhhhHhhhHhhho.',
  '.ohhH..HHH..Hhho.',
  '.ohh.........hho.',
  '.ohh.........hho.',
  '.oHh.........hHo.',
  '..oHo.......oHo..',
  '...o.........o...',
]);

/** Round glasses: frame joins the brow line, bridge between the eyes, rims under them. */
const GLASSES = ov(4, 8, ['...o.o...', '...ooo...', '...o.o...', 'o..o.o..o', 'oooo.oooo']);

/** Headband across the forehead (accent material), for a 23-wide form the x is shifted by 3. */
function headband(dx: number): Overlay {
  return ov(2 + dx, 6, ['o*aaaaaaaaaAo', 'oAaaaaaaaaAAo']);
}

/** Red medic bag on the right hip with a white cross, plus a strap across the chest. */
const MEDIC_BAG: Overlay[] = [
  ov(5, 17, ['A......', '.A.....', '..A....', '...A...', '....A..', '.....A.', '......A']),
  ov(12, 23, ['ooooo', 'o*x*o', 'oxxxo', 'oAxAo', 'oAAAo', 'ooooo']),
];

export const DUONG: Outfit = {
  id: 'duong',
  label: 'Dương',
  remaps: TEE,
  lines: [...COLLAR, HEM],
  overlays: [HAIR_SHORT],
  colors: {
    skin: [249, 209, 173],
    hair: [56, 44, 40],
    cloth: [84, 116, 64],
    pants: [58, 66, 88],
    boots: [110, 74, 48],
    eye: [40, 95, 110],
    white: [212, 230, 238],
  },
};

export const HUNG: Outfit = {
  id: 'hung',
  label: 'Hùng',
  form: FORM_HEAVY,
  // Heavy form: head rows 0–16 unchanged (centre column 11, so +3 on x), torso
  // interior columns 6–16 on rows 19–24 and 7–15 on rows 25–31, hips row 32.
  remaps: [
    { box: [7, 15, 7, 18], to: 'cloth' }, // tank-top straps over the shoulders
    { box: [15, 15, 15, 18], to: 'cloth' },
    { box: [6, 19, 16, 24], to: 'cloth' },
    { box: [7, 25, 15, 31], to: 'cloth' },
    { box: [0, 32, 22, 37], to: 'pants' }, // shorts to the knee
    { box: [0, 41, 22, 44], to: 'boots' },
  ],
  lines: [[7, 31, 15, 31]],
  overlays: [headband(3)],
  colors: {
    skin: [196, 140, 96],
    cloth: [150, 150, 150],
    pants: [156, 118, 70],
    boots: [70, 60, 54],
    accent: [72, 170, 96],
    eye: [60, 50, 40],
    white: [212, 230, 238],
  },
};

export const NY: Outfit = {
  id: 'ny',
  label: 'Ny',
  remaps: TEE,
  lines: [...COLLAR, HEM],
  overlays: [HAIR_BOB, ...MEDIC_BAG],
  colors: {
    skin: [250, 214, 180],
    hair: [160, 56, 40],
    cloth: [235, 232, 226],
    pants: [170, 170, 176],
    boots: [236, 236, 236],
    accent: [200, 40, 50],
    eye: [40, 95, 110],
    white: [240, 245, 245],
  },
};

export const SON: Outfit = {
  id: 'son',
  label: 'Sơn',
  remaps: LONG_SLEEVES,
  lines: [...COLLAR, HEM, [8, 19, 8, 27]], // collar, hem, jacket zip
  overlays: [HAIR_SWEPT, GLASSES],
  colors: {
    skin: [240, 200, 165],
    hair: [34, 32, 40],
    cloth: [40, 140, 150],
    pants: [50, 50, 60],
    boots: [40, 40, 46],
    eye: [40, 95, 110],
    white: [212, 230, 238],
  },
};

/** Ranger hat: the crown is the skull remapped to leather, this is the brim. */
const HAT_BRIM = ov(0, 7, ['oLlllllllllllllLo', '.ooooooooooooooo.']);

/** Grey moustache under the nose and a goatee on the chin (hair material). */
const MOUSTACHE = ov(5, 12, ['#hhHhh#', '.HhhhH.']);

/** Blood and tears on a shirt. */
const STAINS = ov(5, 21, ['.A.....', '.......', '......A', 'A......', '.......', '....A..']);

/** Pustules on a bloated belly (fat form coordinates). */
const PUSTULES = ov(7, 23, ['....a....', 'a.......*', '.........', '...*.....', '.......a.']);

/** Ông Tư, the old forest ranger: hat, khaki shirt with long sleeves, dark trousers, boots. */
export const ONG_TU: Outfit = {
  id: 'ong_tu',
  label: 'Ông Tư',
  remaps: [{ box: [0, 0, 16, 6], to: 'leather' }, ...LONG_SLEEVES], // hat crown, then the clothes
  lines: [[3, 6, 13, 6], ...COLLAR, HEM], // hat band, collar, hem
  overlays: [HAT_BRIM, MOUSTACHE],
  colors: {
    skin: [226, 182, 144],
    hair: [196, 190, 178],
    leather: [120, 92, 60],
    cloth: [176, 158, 112],
    pants: [70, 72, 70],
    boots: [72, 52, 36],
    eye: [60, 50, 40],
    white: [212, 230, 238],
  },
};

/** Sunken eye sockets, a gaping mouth with yellowed teeth, bags under the eyes. */
const ZOMBIE_FACE = ov(4, 9, ['...S.S...', '...S.S...', '.........', '.SoxxxoS.', '...ooo...']);
/** Scalp patches and a scalp wound. */
const ZOMBIE_SCALP = ov(5, 2, ['.SS...A', '..S....']);
/** A gash down the bare arm and one on the cheek. */
const ZOMBIE_WOUNDS: Overlay[] = [ov(2, 21, ['A', 'A', 'A']), ov(11, 5, ['A', 'A'])];
/** Torn tee: one sleeve ripped off, holes at the hem, the hem itself frayed. */
const TORN_TEE: Remap[] = [
  {
    box: [4, 15, 12, 28],
    except: [...NECK, [6, 27, 6, 28], [10, 27, 10, 28]],
    to: 'cloth',
  },
  { box: [1, 15, 3, 18], to: 'cloth' },
  { box: [13, 15, 15, 18], to: 'cloth' },
  { box: [0, 18, 4, 20], to: 'cloth' }, // ripped short
  SLEEVE_L_SHORT,
  PANTS,
  { box: [9, 36, 15, 39], to: 'boots' }, // the other shoe is lost
];
const FRAYED_HEM: Box[] = [
  [5, 28, 5, 28],
  [7, 28, 7, 28],
  [9, 28, 9, 28],
  [11, 28, 11, 28],
];

/** Biến Thể, the common infected: grey-green skin, torn grey shirt, red eyes, a bare foot, no hair. */
export const BIEN_THE: Outfit = {
  id: 'bien_the',
  label: 'Biến Thể',
  remaps: TORN_TEE,
  lines: [...COLLAR, ...FRAYED_HEM],
  overlays: [ZOMBIE_SCALP, ZOMBIE_FACE, ...ZOMBIE_WOUNDS, STAINS],
  colors: {
    skin: [172, 182, 142],
    cloth: [122, 120, 112],
    pants: [62, 60, 66],
    boots: [52, 46, 40],
    accent: [120, 30, 30],
    eye: [180, 50, 40],
    white: [206, 196, 160],
  },
};

/** Kẻ Phun, the bloated spore spitter: fat form, bare swollen torso with pustules, torn trousers. */
export const KE_PHUN: Outfit = {
  id: 'ke_phun',
  label: 'Kẻ Phun',
  form: FORM_FAT,
  // Fat form (23 wide): hips and legs span the full width; the torso stays bare.
  remaps: [
    { box: [0, 29, 22, 35], to: 'pants' },
    { box: [0, 36, 22, 39], to: 'boots' },
  ],
  overlays: [PUSTULES],
  colors: {
    skin: [150, 172, 112],
    pants: [66, 58, 54],
    boots: [60, 52, 44],
    accent: [230, 200, 80],
    eye: [210, 170, 50],
    white: [200, 190, 150],
  },
};

export const CAST: readonly Outfit[] = [DUONG, HUNG, NY, SON, ONG_TU, BIEN_THE, KE_PHUN];
