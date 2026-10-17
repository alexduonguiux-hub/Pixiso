/**
 * The Vùng Xanh cast dressed on the hero mannequin (front view), plus a set
 * of zombie variants. Each entry is an Outfit: material remaps for tight
 * clothes, seam lines, and hand-drawn overlays. Hair, hats, glasses and face
 * details are drawn once in head space (the base head's grid) and land on
 * every form through its headMap; clothes are given per form in figure space.
 * Player characters come from the game's characters.json (Dương the leader,
 * Hùng strength, Ny medic, Sơn technician); their look follows the game's own
 * sprites in broad strokes (colours and silhouettes), redrawn at this scale.
 */
import type { Rgb8 } from '@pixiso/pixel-core';
import { parseSprite } from './format.js';
import type { Box } from './hero64.js';
import { FORM_FAT, FORM_HEAVY } from './heroforms.js';
import {
  POSE_DRAG,
  POSE_DRAG_M,
  POSE_DROOP,
  POSE_DROOP_M,
  POSE_HUNCH,
  POSE_REACH,
  POSE_TWIST,
  POSE_TWIST_M,
  type ZombiePose,
} from './hero64.poses.js';
import type { Outfit, Overlay, Remap, Seam } from './outfit64.js';
import type { MaterialColors } from './paint.js';

/** Overlay from ASCII rows at a figure position. */
function ov(x: number, y: number, rows: string[]): Overlay {
  return { sprite: parseSprite(rows, 'overlay'), x, y };
}
/** Overlay in head space (base-head coordinates). */
function hov(x: number, y: number, rows: string[]): Overlay {
  return { ...ov(x, y, rows), space: 'head' };
}
const seam = (box: Box): Seam => ({ box });
const hseam = (box: Box): Seam => ({ box, space: 'head' });

/* ------------------------------------------------------------------ */
/* Head space: hair, hats, faces (17 columns, rows 0–16 of the base).  */
/* ------------------------------------------------------------------ */

/** Short dark hair, parted, tips over the brow. */
const HAIR_SHORT = hov(0, 0, [
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

/** Fuller hair swept over the brow, sideburns over the ears. */
const HAIR_SWEPT = hov(0, 0, [
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
const HAIR_BOB = hov(0, 0, [
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

/** Long hair to the shoulders. */
const HAIR_LONG = hov(0, 0, [
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
  '.ohh.........hho.',
  '.ohH.........Hho.',
  '.ohH.........Hho.',
  '.oHH.........HHo.',
  '.oHH.........HHo.',
  '..oo.........oo..',
]);

/** Tight cap of hair with a ponytail hanging at the right. */
const HAIR_PONYTAIL: Overlay[] = [
  hov(0, 0, [
    '......ooooo......',
    '....oo#hhhhoo....',
    '...o##hhhhhhho...',
    '...o#hhhhhhhho...',
    '..o#hhhhhhhhhho..',
    '..ohhhhhhhhhhho..',
    '..ohhhhhhhhhhho..',
    '..oHhhhhhhhhhHo..',
    '..HhH.......HhH..',
  ]),
  hov(13, 10, ['.ooo', 'ohHo', 'ohHo', 'ohHo', 'oHHo', '.oo.']),
];

/** Buzz cut: the skull recoloured to hair, face and ears left alone. */
const BUZZ: Remap = { box: [0, 0, 16, 7], to: 'hair', space: 'head' };

/** Round glasses: frame joins the brow line, bridge between the eyes, rims under them. */
const GLASSES = hov(4, 8, ['...o.o...', '...ooo...', '...o.o...', 'o..o.o..o', 'oooo.oooo']);

/** Headband across the forehead (accent material). */
const HEADBAND = hov(2, 6, ['o*aaaaaaaaaAo', 'oAaaaaaaaaAAo']);

/** Grey moustache under the nose and a goatee on the chin (hair material). */
const MOUSTACHE = hov(5, 12, ['#hhHhh#', '.HhhhH.']);

/** Ranger hat: crown is the skull in leather, band and brim as lines/overlay. */
const RANGER_HAT = {
  remap: { box: [0, 0, 16, 6], to: 'leather', space: 'head' } as Remap,
  seams: [hseam([3, 6, 13, 6])],
  overlay: hov(0, 7, ['oLlllllllllllllLo', '.ooooooooooooooo.']),
};

/*
 * Hats are rigid head-space overlays (they take the translation of their
 * bottom row instead of the head's shear) drawn two columns wider than the
 * skull on each side, so a tilted head neither bends them nor shows skin
 * around them. They start one column left of the head grid (x = -1).
 */

/** Hard hat: rounded dome one column wider than the skull, a centre ridge, a thin brim all round. */
const HARD_HAT: Overlay = {
  ...hov(-1, 0, [
    '......ooooooo......',
    '.....o*aa*aaAo.....',
    '....o*aaa*aaaAo....',
    '...o*aaaa*aaaaAo...',
    '...oaaaaa*aaaaAo...',
    '...oaaaaaaaaaaAo...',
    '..o*aaaaaaaaaaAAo..',
    '..ooooooooooooooo..',
  ]),
  rigid: true,
};

/** Peaked cap: wide flat crown in cloth2, dark band, visor across the brow. */
const PEAKED_CAP: Overlay = {
  ...hov(-1, 0, [
    '....ooooooooooo....',
    '...o&kkkkkkkkkKo...',
    '..o&kkkkkkkkkkkKo..',
    '..o&kkkkkkkkkkkKo..',
    '..oKKKKKKKKKKKKKo..',
    '...okkkkkkkkkkko...',
    '.oKKKKKKKKKKKKKKKo.',
    '..ooooooooooooooo..',
  ]),
  rigid: true,
};

/** Combat helmet: wide dome that comes down over the ears, front rim over the brow, chin strap. */
const HELMET: Overlay = {
  ...hov(-1, 0, [
    '......ooooooo......',
    '....oo^ccccc^oo....',
    '...o^ccccccccc^o...',
    '..o^cccccccccccCo..',
    '.o^ccccccccccccCCo.',
    '.occcccccccccccCCo.',
    'occcccccccccccccCCo',
    'oCccoooooooooooocCo',
    'oCcco.........occCo',
    'oCcco.........occCo',
    'ooooo.........ooooo',
    '.....L.......L.....',
    '......L.....L......',
    '.......L...L.......',
  ]),
  rigid: true,
};

/** Zombie face: sunken sockets, a gaping mouth with yellowed teeth, bags under the eyes. */
const ZOMBIE_FACE = hov(4, 9, ['...S.S...', '...S.S...', '.........', '.SoxxxoS.', '...ooo...']);
/** Scalp patches and a scalp wound (blood is the wood material). */
const ZOMBIE_SCALP = hov(5, 2, ['.SS...d', '..S....']);
/** A gash on the cheek. */
const ZOMBIE_CHEEK = hov(11, 5, ['d', 'd']);

/* ------------------------------------------------------------------ */
/* Base figure (17×40) regions in figure space.                        */
/* ------------------------------------------------------------------ */

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
const COLLAR: Seam[] = [seam([6, 17, 6, 17]), seam([10, 17, 10, 17]), seam([7, 18, 9, 18])];
const HEM = seam([5, 28, 11, 28]);
const TEE = [...SHIRT, SLEEVE_R_SHORT, SLEEVE_L_SHORT, PANTS, SHOES];
const LONG_SLEEVES = [...SHIRT, SLEEVE_R_LONG, SLEEVE_L_LONG, PANTS, SHOES];

/** Red medic bag on the right hip with a white cross, plus a strap across the chest. */
const MEDIC_BAG: Overlay[] = [
  ov(5, 17, ['A......', '.A.....', '..A....', '...A...', '....A..', '.....A.', '......A']),
  ov(12, 23, ['ooooo', 'o*x*o', 'oxxxo', 'oAxAo', 'oAAAo', 'ooooo']),
];

/** Pustules on a bloated belly (fat form coordinates). */
const PUSTULES = ov(7, 23, ['....a....', 'a.......*', '.........', '...*.....', '.......a.']);

/* ------------------------------------------------------------------ */
/* The Vùng Xanh cast.                                                 */
/* ------------------------------------------------------------------ */

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

/** Heavy form (23×45): torso interior columns 6–16 on rows 19–33, hips row 34, legs 35–44. */
export const HUNG: Outfit = {
  id: 'hung',
  label: 'Hùng',
  form: FORM_HEAVY,
  remaps: [
    { box: [7, 15, 7, 18], to: 'cloth' }, // tank-top straps over the shoulders
    { box: [15, 15, 15, 18], to: 'cloth' },
    { box: [6, 19, 16, 33], to: 'cloth' },
    { box: [0, 34, 22, 38], to: 'pants' }, // shorts to the knee
    { box: [0, 41, 22, 44], to: 'boots' },
  ],
  lines: [seam([7, 33, 15, 33])],
  overlays: [HEADBAND],
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
  lines: [...COLLAR, HEM, seam([8, 19, 8, 27])], // collar, hem, jacket zip
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

/** Ông Tư, the old forest ranger: hat, moustache, khaki shirt with long sleeves, dark trousers, boots. */
export const ONG_TU: Outfit = {
  id: 'ong_tu',
  label: 'Ông Tư',
  remaps: [RANGER_HAT.remap, ...LONG_SLEEVES],
  lines: [...RANGER_HAT.seams, ...COLLAR, HEM],
  overlays: [RANGER_HAT.overlay, MOUSTACHE],
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

/** Kẻ Phun, the bloated spore spitter: fat form, bare swollen torso with pustules, torn trousers. */
export const KE_PHUN: Outfit = {
  id: 'ke_phun',
  label: 'Kẻ Phun',
  form: FORM_FAT,
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

/* ------------------------------------------------------------------ */
/* Zombies: one pose each, clothes described once and laid on the     */
/* pose's regions (hero64.poses.ts).                                   */
/* ------------------------------------------------------------------ */

type Top = 'tee' | 'torn' | 'long' | 'tank' | 'crop' | 'none';
type Bottoms = 'pants' | 'shorts' | 'skirt';
type Footwear = 'both' | 'right' | 'flats' | 'none';
type Detail = 'stains' | 'gash' | 'hivis' | 'badge' | 'belt' | 'tie' | 'number' | 'camo' | 'scalp';

interface Look {
  /** Hair overlays or a buzz-cut remap. */
  hair?: Overlay[] | Remap;
  hat?: Overlay;
  glasses?: boolean;
  top: Top;
  bottoms: Bottoms;
  shoes: Footwear;
  details: Detail[];
  colors: MaterialColors;
}

const ZOMBIE_EYES: MaterialColors = { eye: [180, 50, 40], white: [206, 196, 160] };
const BLOOD: MaterialColors = { wood: [120, 30, 30] };
const SKIN_M: Rgb8 = [172, 182, 142];
const SKIN_F: Rgb8 = [178, 188, 152];

/** Deterministic camouflage blotches inside a box (no randomness: a fixed hash of the cell). */
function camo(box: Box, glyph: string): Overlay {
  const [x0, y0, x1, y1] = box;
  const rows: string[] = [];
  for (let y = y0; y <= y1; y++) {
    let row = '';
    for (let x = x0; x <= x1; x++) row += (x * 7 + y * 13 + ((x * y) % 5)) % 4 === 0 ? glyph : '.';
    rows.push(row);
  }
  return ov(x0, y0, rows);
}

function zombie(id: string, label: string, pose: ZombiePose, look: Look): Outfit {
  const remaps: Remap[] = [];
  const lines: Seam[] = [];
  const overlays: Overlay[] = [];
  const [tx0, ty0, tx1] = pose.torso;
  const hemY = pose.hem[1];
  const torso = (except: Box[], y1 = pose.torso[3]): Remap => ({
    box: [tx0, ty0, tx1, y1],
    except: [...pose.neck, ...except],
    to: 'cloth',
  });
  const caps = pose.shoulders.map((box): Remap => ({ box, to: 'cloth' }));
  const collar = pose.collar.map(seam);
  switch (look.top) {
    case 'tee':
      remaps.push(
        torso([]),
        ...caps,
        { box: pose.sleeveL.short, to: 'cloth' },
        { box: pose.sleeveR.short, to: 'cloth' },
      );
      lines.push(...collar, seam(pose.hem));
      break;
    case 'torn': {
      const holes: Box[] = [pose.frayedXs[0]! + 1, pose.frayedXs[2]! + 1].map((x) => [
        x,
        hemY - 1,
        x,
        hemY,
      ]);
      remaps.push(
        torso(holes),
        ...caps,
        { box: pose.sleeveL.torn ?? pose.sleeveL.short, to: 'cloth' },
        { box: pose.sleeveR.short, to: 'cloth' },
      );
      lines.push(...collar, ...pose.frayedXs.map((x) => seam([x, hemY, x, hemY])));
      break;
    }
    case 'long':
      remaps.push(
        torso([]),
        ...caps,
        { box: pose.sleeveL.long, to: 'cloth' },
        { box: pose.sleeveR.long, to: 'cloth' },
      );
      lines.push(...collar, seam(pose.hem));
      break;
    case 'tank':
      remaps.push(torso([]));
      lines.push(...collar, seam(pose.hem));
      break;
    case 'crop': {
      const y1 = ty0 + 10;
      remaps.push(torso([], y1));
      lines.push(...collar, seam([pose.hem[0], y1, pose.hem[2], y1]));
      break;
    }
    case 'none':
      break;
  }
  if (look.bottoms === 'pants')
    remaps.push(...pose.pants.map((box): Remap => ({ box, to: 'pants' })));
  if (look.bottoms === 'shorts')
    remaps.push(...pose.shorts.map((box): Remap => ({ box, to: 'pants' })));
  if (look.bottoms === 'skirt') overlays.push(ov(pose.skirt.x, pose.skirt.y, pose.skirt.rows));
  if (look.shoes === 'both')
    remaps.push({ box: pose.shoeL, to: 'boots' }, { box: pose.shoeR, to: 'boots' });
  if (look.shoes === 'right') remaps.push({ box: pose.shoeR, to: 'boots' });
  if (look.shoes === 'flats')
    remaps.push(...pose.flats.map((box): Remap => ({ box, to: 'boots' })));
  if (Array.isArray(look.hair)) overlays.push(...look.hair);
  else if (look.hair) remaps.push(look.hair);
  if (look.hat) overlays.push(look.hat);
  if (look.glasses) overlays.push(GLASSES);
  if (look.details.includes('scalp')) overlays.push(ZOMBIE_SCALP);
  overlays.push(ZOMBIE_FACE, ZOMBIE_CHEEK);
  for (const d of look.details) {
    const [cx, cy] = pose.chest;
    if (d === 'stains')
      overlays.push(
        ov(...pose.stains, ['.D.....', '.......', '......D', 'D......', '.......', '....D..']),
      );
    if (d === 'gash') overlays.push(ov(...pose.gash, ['d', 'd', 'd']));
    if (d === 'hivis') {
      const stripe = 'w'.repeat(tx1 - tx0 - 1);
      overlays.push(ov(tx0 + 1, cy + 2, [stripe]), ov(tx0 + 1, cy + 5, [stripe]));
    }
    if (d === 'badge') overlays.push(ov(cx, cy, ['w']));
    if (d === 'belt') overlays.push(ov(...pose.belt, ['w']));
    if (d === 'tie') overlays.push(ov(...pose.tie, ['l', 'L', 'l', 'L', 'l', 'L', 'l']));
    if (d === 'number') overlays.push(ov(...pose.number, ['xxx', '..x', '..x']));
    if (d === 'camo')
      overlays.push(camo([tx0 + 1, pose.collar[2]![1] + 1, tx1 - 1, hemY - 1], 'C'));
  }
  return { id, label, form: pose.form, remaps, lines, overlays, colors: look.colors };
}

/** Civilian man: drooped stance, torn tee, jeans, one shoe lost, messy short hair. */
export const ZOMBIE_CIV_M = zombie('zombie_civ_m', 'Zombie dân thường (nam)', POSE_DROOP, {
  hair: [HAIR_SHORT],
  top: 'torn',
  bottoms: 'pants',
  shoes: 'right',
  details: ['scalp', 'gash', 'stains'],
  colors: {
    skin: SKIN_M,
    hair: [60, 50, 42],
    cloth: [122, 120, 112],
    pants: [62, 60, 66],
    boots: [52, 46, 40],
    ...BLOOD,
    ...ZOMBIE_EYES,
  },
});

/** Civilian woman: twisted neck, long hair, blouse, torn skirt, flats. */
export const ZOMBIE_CIV_F = zombie('zombie_civ_f', 'Zombie dân thường (nữ)', POSE_TWIST, {
  hair: [HAIR_LONG],
  top: 'tee',
  bottoms: 'skirt',
  shoes: 'flats',
  details: ['gash', 'stains'],
  colors: {
    skin: SKIN_F,
    hair: [50, 40, 46],
    cloth: [204, 150, 168],
    cloth2: [70, 60, 92],
    boots: [60, 40, 50],
    ...BLOOD,
    ...ZOMBIE_EYES,
  },
});

/** Construction worker: reaching, hard hat, hi-vis shirt, jeans, boots. */
export const ZOMBIE_WORKER = zombie('zombie_worker', 'Zombie công nhân', POSE_REACH, {
  hat: HARD_HAT,
  top: 'tee',
  bottoms: 'pants',
  shoes: 'both',
  details: ['hivis', 'stains', 'gash'],
  colors: {
    skin: SKIN_M,
    accent: [232, 184, 48],
    cloth: [222, 110, 40],
    metal: [200, 200, 196],
    pants: [60, 70, 110],
    boots: [96, 66, 42],
    ...BLOOD,
    ...ZOMBIE_EYES,
  },
});

/** Police officer: dragging a leg, peaked cap, green uniform, badge, belt, black shoes. */
export const ZOMBIE_POLICE = zombie('zombie_police', 'Zombie cảnh sát', POSE_DRAG, {
  hat: PEAKED_CAP,
  top: 'long',
  bottoms: 'pants',
  shoes: 'both',
  details: ['badge', 'belt', 'stains'],
  colors: {
    skin: SKIN_M,
    cloth2: [40, 76, 50],
    cloth: [98, 128, 80],
    pants: [52, 72, 50],
    boots: [30, 30, 34],
    metal: [210, 180, 90],
    ...BLOOD,
    ...ZOMBIE_EYES,
  },
});

/** Soldier: hunched, helmet, camouflage fatigues, boots. */
export const ZOMBIE_SOLDIER = zombie('zombie_soldier', 'Zombie quân đội', POSE_HUNCH, {
  hat: HELMET,
  top: 'long',
  bottoms: 'pants',
  shoes: 'both',
  details: ['camo', 'stains'],
  colors: {
    skin: SKIN_M,
    cloth: [112, 120, 78],
    pants: [98, 106, 72],
    boots: [50, 42, 34],
    ...BLOOD,
    ...ZOMBIE_EYES,
  },
});

/** Athlete (man): drooped stance mirrored, sweatband, sleeveless jersey with a number, shorts, sneakers. */
export const ZOMBIE_ATHLETE_M = zombie(
  'zombie_athlete_m',
  'Zombie vận động viên (nam)',
  POSE_DROOP_M,
  {
    hair: [HAIR_SHORT, HEADBAND],
    top: 'tank',
    bottoms: 'shorts',
    shoes: 'both',
    details: ['number', 'gash', 'stains'],
    colors: {
      skin: SKIN_M,
      hair: [40, 36, 36],
      accent: [240, 240, 236],
      cloth: [44, 110, 200],
      pants: [236, 236, 236],
      boots: [240, 240, 240],
      white: [236, 236, 230],
      eye: [180, 50, 40],
      ...BLOOD,
    },
  },
);

/** Athlete (woman): dragging mirrored, ponytail, sports top, shorts, sneakers. */
export const ZOMBIE_ATHLETE_F = zombie(
  'zombie_athlete_f',
  'Zombie vận động viên (nữ)',
  POSE_DRAG_M,
  {
    hair: HAIR_PONYTAIL,
    top: 'crop',
    bottoms: 'shorts',
    shoes: 'both',
    details: ['gash'],
    colors: {
      skin: SKIN_F,
      hair: [120, 70, 40],
      cloth: [222, 60, 96],
      pants: [40, 40, 52],
      boots: [240, 240, 240],
      ...BLOOD,
      ...ZOMBIE_EYES,
    },
  },
);

/** Office worker: twisted neck mirrored, white shirt, tie, glasses, dark trousers, black shoes. */
export const ZOMBIE_OFFICE = zombie('zombie_office', 'Zombie nhân viên văn phòng', POSE_TWIST_M, {
  hair: BUZZ,
  glasses: true,
  top: 'long',
  bottoms: 'pants',
  shoes: 'both',
  details: ['tie', 'stains'],
  colors: {
    skin: SKIN_M,
    hair: [50, 46, 46],
    cloth: [236, 236, 232],
    leather: [120, 30, 40],
    pants: [50, 50, 60],
    boots: [30, 30, 34],
    ...BLOOD,
    ...ZOMBIE_EYES,
  },
});

/** The common infected of the game is the civilian man. */
export const BIEN_THE: Outfit = { ...ZOMBIE_CIV_M, id: 'bien_the', label: 'Biến Thể' };

export const CAST: readonly Outfit[] = [DUONG, HUNG, NY, SON, ONG_TU, BIEN_THE, KE_PHUN];
export const ZOMBIES: readonly Outfit[] = [
  ZOMBIE_CIV_M,
  ZOMBIE_CIV_F,
  ZOMBIE_WORKER,
  ZOMBIE_POLICE,
  ZOMBIE_SOLDIER,
  ZOMBIE_ATHLETE_M,
  ZOMBIE_ATHLETE_F,
  ZOMBIE_OFFICE,
];
