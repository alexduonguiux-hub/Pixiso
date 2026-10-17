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
import type { Box, HeroView } from './hero64.js';
import { FORM_FAT, FORM_HEAVY } from './heroforms.js';
import { FORM_BRUTE } from './hero64.mutants.js';
import {
  POSE_CRAWL,
  POSE_DRAG,
  POSE_DRAG_M,
  POSE_DROOP,
  POSE_DROOP_M,
  POSE_HUNCH,
  POSE_REACH,
  POSE_STAND,
  POSE_TWIST,
  POSE_TWIST_M,
  type ZombiePose,
} from './hero64.poses.js';
import type { Outfit, Overlay, Remap, Seam, ViewItem, ViewLayer } from './outfit64.js';
import type { MaterialColors } from './paint.js';
import { STAND_VIEWS } from './views64.js';

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

/** Spiky hair: three points rising two rows above the skull (the outfit needs `headroom: 2`), a fuller mass, tips over the brow. */
const HAIR_SPIKY = hov(0, -2, [
  '.....o...o...o...',
  '....o#o.o#o.o#o..',
  '...o#hho#hho#hho.',
  '..o##hhhhhhhhhHo.',
  '.o##hhhhhhhhhhHo.',
  '.o#hhhhhhhhhhhHo.',
  '.o#hhhhhhhhhhhHo.',
  '..o#hhhhhhhhhHo..',
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

/** Curly hair: a bumpy silhouette wider than the skull, two-cell curl marks, fringe over the brow, ends at the jaw. */
const HAIR_CURLY = hov(0, 0, [
  '.....ooooooo.....',
  '...oo#hhhhhhoo...',
  '..o#hhHHhhHHhho..',
  '.o##hhhhhhhhhhho.',
  'o#hHHhhhHHhhhHHho',
  'o#hhhhhhhhhhhhhho',
  '.o#hhHHhhHHhhhho.',
  'o#hhhhhHHhhHHhhho',
  '.ohhH..HHH..Hhho.',
  'ohhH.........Hhho',
  '.ohh.........hho.',
  'ohHh.........hHho',
  '.oHH.........HHo.',
  '..oo.........oo..',
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
const GLASSES_V: ViewItem = { S: { overlays: [GLASSES] } };

/** Headband across the forehead (accent material). */
const HEADBAND = hov(2, 6, ['o*aaaaaaaaaAo', 'oAaaaaaaaaAAo']);

/** Full beard (hair material): moustache under the nose, a line under it (the mouth, parting it from the beard), a bushy beard wider than the jaw down to the collar, its own outline. */
const BEARD = hov(3, 12, [
  '.o#hhhhhHo.',
  'o#oooooooHo',
  'o#hhhhhhhHo',
  'oHhhhhhhHHo',
  '.ooooooooo.',
]);

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

/** Beret (cloth2): puffed crown rising at the left and draped down to the right over the band, rim on the brow. */
const BERET: Overlay = {
  ...hov(-1, 0, [
    '.....ooooooo.......',
    '...oo&kkkkkkkoo....',
    '..o&kkkkkkkkkkoo...',
    '.o&kkkkkkkkkkkkkoo.',
    '.o&kkkkkkkkkkkkkkKo',
    '.oKkkkkkkkkkkkkkkKo',
    '.ooKKKKKKKKKKKKKooo',
    '..oKKKKKKKKKKKKKo..',
    '.ooooooooooooooooo.',
  ]),
  rigid: true,
};

/** Combat helmet: flat top, vertical sides, dark band and a flared rim sitting on the brow. */
const HELMET: Overlay = {
  ...hov(-1, 0, [
    '......ooooooo......',
    '....oo^ccccc^oo....',
    '...o^ccccccccc^o...',
    '..o^cccccccccccCo..',
    '..occccccccccccCo..',
    '..occccccccccccCo..',
    '..oCcccccccccccCo..',
    '.oCCCCCCCCCCCCCCCo.',
    '.ooooooooooooooooo.',
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

const DUONG_LOOK: Look = {
  hair: [HAIR_SPIKY],
  headroom: 2,
  top: 'tee',
  bottoms: 'pants',
  shoes: 'both',
  details: [],
  face: 'plain',
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
export const DUONG = wear('duong', 'Dương', POSE_STAND, DUONG_LOOK);

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

const NY_LOOK: Look = {
  hair: [HAIR_CURLY],
  top: 'tee',
  bottoms: 'pants',
  shoes: 'both',
  details: [],
  face: 'plain',
  extras: [...MEDIC_BAG],
  colors: {
    skin: [250, 214, 180],
    hair: [160, 56, 40],
    cloth: [128, 192, 168], // mint scrub top: tells her apart from Bác sĩ Lan's white coat
    pants: [170, 170, 176],
    boots: [236, 236, 236],
    accent: [200, 40, 50],
    eye: [40, 95, 110],
    white: [240, 245, 245],
  },
};
export const NY = wear('ny', 'Ny', POSE_STAND, NY_LOOK);

const SON_LOOK: Look = {
  hair: [HAIR_SWEPT],
  glasses: true,
  top: 'long',
  bottoms: 'pants',
  shoes: 'both',
  details: [],
  face: 'plain',
  extras: { S: { lines: [seam([8, 19, 8, 27])] } }, // jacket zip
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
export const SON = wear('son', 'Sơn', POSE_STAND, SON_LOOK);

/** Ông Tư, the old forest ranger: hat, full grey beard, khaki shirt with long sleeves, dark trousers, boots. */
const ONG_TU_LOOK: Look = {
  hat: {
    S: { remaps: [RANGER_HAT.remap], lines: RANGER_HAT.seams, overlays: [RANGER_HAT.overlay] },
  },
  top: 'long',
  bottoms: 'pants',
  shoes: 'both',
  details: [],
  face: 'plain',
  extras: [BEARD],
  colors: {
    skin: [226, 182, 144],
    hair: [104, 100, 96], // dark grey beard
    leather: [120, 92, 60],
    cloth: [176, 158, 112],
    pants: [70, 72, 70],
    boots: [72, 52, 36],
    eye: [60, 50, 40],
    white: [212, 230, 238],
  },
};
export const ONG_TU = wear('ong_tu', 'Ông Tư', POSE_STAND, ONG_TU_LOOK);

/** Lab-coat tails over the hips, open at the front (base form, figure space). */
const COAT_TAILS = ov(2, 29, ['o^ccccoccccCo', '.o^cccocccCo.', '.o^cccocccCo.', '.ooooo.ooooo.']);

/** Bác sĩ Lan, the doctor: auburn bob, round glasses, white coat open at the front over blue trousers, dark shoes. */
const BAC_SI_LAN_LOOK: Look = {
  hair: [HAIR_BOB],
  glasses: true,
  top: 'long',
  bottoms: 'pants',
  shoes: 'both',
  details: [],
  face: 'plain',
  hem: false,
  extras: { S: { overlays: [COAT_TAILS], lines: [seam([8, 19, 8, 28])] } }, // coat opening
  colors: {
    skin: [240, 206, 176],
    hair: [118, 42, 40],
    cloth: [228, 226, 220],
    pants: [62, 80, 112],
    boots: [42, 44, 50],
    eye: [40, 95, 110],
    white: [212, 230, 238],
  },
};
export const BAC_SI_LAN = wear('bac_si_lan', 'Bác sĩ Lan', POSE_STAND, BAC_SI_LAN_LOOK);

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
type Bottoms = 'pants' | 'shorts' | 'skirt' | 'dress';
type Footwear = 'both' | 'right' | 'flats' | 'none';
type Detail = 'stains' | 'gash' | 'hivis' | 'badge' | 'belt' | 'tie' | 'number' | 'camo' | 'scalp';

function isViewItem(x: object): x is ViewItem {
  return 'S' in x;
}

export interface Look {
  /** Hair overlays (S head space), a buzz-cut remap, or a per-view item. */
  hair?: Overlay[] | Remap | ViewItem;
  hat?: Overlay | ViewItem;
  glasses?: boolean;
  top: Top;
  bottoms: Bottoms;
  shoes: Footwear;
  details: Detail[];
  /** Overlays stamped last (mutations on top of the face), S only or per view. */
  extras?: Overlay[] | ViewItem;
  /** Zombie sockets, mouth and cheek gash (default), or the plain base face. */
  face?: 'zombie' | 'plain';
  /** False drops the hem line at the waist (a coat that carries on below it). */
  hem?: boolean;
  /** Rows added above the figure for hair that rises past the skull. */
  headroom?: number;
  colors: MaterialColors;
}

/** The layer an item contributes in a view; S-only items (plain overlays, remaps) count for S alone. */
function layer(
  item: Overlay | Overlay[] | Remap | ViewItem | undefined,
  view: HeroView,
): ViewLayer {
  if (!item) return {};
  if (Array.isArray(item)) return view === 'S' ? { overlays: item } : {};
  if (isViewItem(item)) return item[view] ?? {};
  if (view !== 'S') return {};
  return 'sprite' in item ? { overlays: [item] } : { remaps: [item] };
}
function push(into: { remaps: Remap[]; lines: Seam[]; overlays: Overlay[] }, l: ViewLayer): void {
  into.remaps.push(...(l.remaps ?? []));
  into.lines.push(...(l.lines ?? []));
  into.overlays.push(...(l.overlays ?? []));
}

const ZOMBIE_EYES: MaterialColors = { eye: [180, 50, 40], white: [206, 196, 160] };
/** One army palette for every soldier, infected or not: olive uniform, darker green caps (cloth2), dark boots, dull metal. */
const ARMY: MaterialColors = {
  cloth: [106, 112, 72],
  pants: [92, 96, 64],
  cloth2: [78, 86, 56],
  boots: [58, 50, 40],
  metal: [204, 204, 194],
};
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

/** Builds an outfit from a look laid on a pose's regions, for one view (zombies, mutants, soldiers and the cast alike). */
function build(id: string, label: string, pose: ZombiePose, look: Look, view: HeroView): Outfit {
  const out = { remaps: [] as Remap[], lines: [] as Seam[], overlays: [] as Overlay[] };
  const { remaps, lines, overlays } = out;
  const [tx0, ty0, tx1] = pose.torso;
  const hemY = pose.hem[1];
  const torso = (except: Box[], y1 = pose.torso[3]): Remap => ({
    box: [tx0, ty0, tx1, y1],
    except: [...pose.neck, ...except],
    to: 'cloth',
  });
  const caps = pose.shoulders.map((box): Remap => ({ box, to: 'cloth' }));
  const collar = pose.collar.map(seam);
  // A dress is one piece, a coat carries on: no hem line at the waist.
  const waist = look.bottoms === 'dress' || look.hem === false ? [] : [seam(pose.hem)];
  switch (look.top) {
    case 'tee':
      remaps.push(
        torso([]),
        ...caps,
        { box: pose.sleeveL.short, to: 'cloth' },
        { box: pose.sleeveR.short, to: 'cloth' },
      );
      lines.push(...collar, ...waist);
      break;
    case 'torn': {
      const holes: Box[] = [pose.frayedXs[0]! + 1, pose.frayedXs[2] ?? pose.frayedXs[0]! + 1].map(
        (x) => [x, hemY - 1, x, hemY],
      );
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
      lines.push(...collar, ...waist);
      break;
    case 'tank':
      remaps.push(torso([]));
      lines.push(...collar, ...waist);
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
  if (look.bottoms === 'dress') {
    const d = pose.dress ?? pose.skirt;
    overlays.push(ov(d.x, d.y, d.rows));
  }
  if (look.shoes === 'both')
    remaps.push({ box: pose.shoeL, to: 'boots' }, { box: pose.shoeR, to: 'boots' });
  if (look.shoes === 'right') remaps.push({ box: pose.shoeR, to: 'boots' });
  if (look.shoes === 'flats')
    remaps.push(...pose.flats.map((box): Remap => ({ box, to: 'boots' })));
  push(out, layer(look.hair, view));
  if (look.glasses) push(out, layer(GLASSES_V, view));
  if (view === 'S') {
    if (look.details.includes('scalp')) overlays.push(ZOMBIE_SCALP);
    if ((look.face ?? 'zombie') === 'zombie') overlays.push(ZOMBIE_FACE, ZOMBIE_CHEEK);
  }
  // Hats go on after the face so a scalp wound or cheek gash never lands on the hat.
  push(out, layer(look.hat, view));
  for (const d of look.details) {
    const chest = pose.chest;
    if (d === 'stains' && pose.stains)
      overlays.push(
        ov(...pose.stains, ['.D.....', '.......', '......D', 'D......', '.......', '....D..']),
      );
    if (d === 'gash' && pose.gash) overlays.push(ov(...pose.gash, ['d', 'd', 'd']));
    if (d === 'hivis' && chest) {
      const stripe = 'w'.repeat(tx1 - tx0 - 1);
      overlays.push(ov(tx0 + 1, chest[1] + 2, [stripe]), ov(tx0 + 1, chest[1] + 5, [stripe]));
    }
    if (d === 'badge' && chest) overlays.push(ov(chest[0], chest[1], ['w']));
    if (d === 'belt' && pose.belt) overlays.push(ov(...pose.belt, ['w']));
    if (d === 'tie' && pose.tie)
      overlays.push(ov(...pose.tie, ['l', 'L', 'l', 'L', 'l', 'L', 'l']));
    if (d === 'number' && pose.number) overlays.push(ov(...pose.number, ['xxx', '..x', '..x']));
    if (d === 'camo')
      overlays.push(
        camo([tx0 + 1, pose.collar[pose.collar.length - 1]![1] + 1, tx1 - 1, hemY - 1], 'C'),
      );
  }
  push(out, layer(look.extras, view));
  return {
    id,
    label,
    form: pose.form,
    remaps,
    lines,
    overlays,
    colors: look.colors,
    ...(look.headroom ? { headroom: look.headroom } : {}),
  };
}

/** The S-view outfit of a look on a pose. */
function wear(id: string, label: string, pose: ZombiePose, look: Look): Outfit {
  return build(id, label, pose, look, 'S');
}

/** The outfit of a look on the standing base figure in a drawn view. */
export function wearView(id: string, label: string, look: Look, view: HeroView): Outfit {
  return build(id, label, STAND_VIEWS[view], look, view);
}

/** Civilian man: drooped stance, torn tee, jeans, one shoe lost, messy short hair. */
export const ZOMBIE_CIV_M = wear('zombie_civ_m', 'Zombie dân thường (nam)', POSE_DROOP, {
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
export const ZOMBIE_CIV_F = wear('zombie_civ_f', 'Zombie dân thường (nữ)', POSE_TWIST, {
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
export const ZOMBIE_WORKER = wear('zombie_worker', 'Zombie công nhân', POSE_REACH, {
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
export const ZOMBIE_POLICE = wear('zombie_police', 'Zombie cảnh sát', POSE_DRAG, {
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
export const ZOMBIE_SOLDIER = wear('zombie_soldier', 'Zombie quân đội', POSE_HUNCH, {
  hat: HELMET,
  top: 'long',
  bottoms: 'pants',
  shoes: 'both',
  details: ['camo', 'stains'],
  colors: {
    skin: SKIN_M,
    ...ARMY,
    ...BLOOD,
    ...ZOMBIE_EYES,
  },
});

/** Sores on both bare forearms (drag pose). */
const SORES: Overlay[] = [ov(1, 24, ['D.', '..', '.D', 'D.']), ov(13, 25, ['..D', '...', '.D.'])];
/** Dog tag on the sternum, two cells above the pose's chest anchor column +2. */
const dogTag = (pose: ZombiePose): Overlay => {
  const [cx, cy] = pose.chest ?? [6, 20];
  return ov(cx + 2, cy - 1, ['w', 'm']);
};

/** Lính Nhiễm, the infected soldier (NPC): helmet, olive uniform with one sleeve torn off, sores on the forearms, dog tag, dragging a leg. */
export const LINH_NHIEM = wear('linh_nhiem', 'Lính Nhiễm', POSE_DRAG, {
  hat: HELMET,
  top: 'torn',
  bottoms: 'pants',
  shoes: 'both',
  details: ['stains'],
  extras: [...SORES, dogTag(POSE_DRAG)],
  colors: {
    skin: [184, 186, 156],
    ...ARMY,
    ...BLOOD,
    ...ZOMBIE_EYES,
  },
});

/** Athlete (man): drooped stance mirrored, sweatband, sleeveless jersey with a number, shorts, sneakers. */
export const ZOMBIE_ATHLETE_M = wear(
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
export const ZOMBIE_ATHLETE_F = wear('zombie_athlete_f', 'Zombie vận động viên (nữ)', POSE_DRAG_M, {
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
});

/** Office worker: twisted neck mirrored, white shirt, tie, glasses, dark trousers, black shoes. */
export const ZOMBIE_OFFICE = wear('zombie_office', 'Zombie nhân viên văn phòng', POSE_TWIST_M, {
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

/* ------------------------------------------------------------------ */
/* Mutants.                                                            */
/* ------------------------------------------------------------------ */

/**
 * Huge pointed ears of Kẻ Thính (head space): they rise beside the skull to
 * above its crown, kept within one column of the head grid so no pose
 * canvas cuts their outline, and sit behind the head so the skull keeps its
 * own line.
 */
const BIG_EARS: Overlay[] = [
  {
    ...hov(-1, 0, [
      '.o...',
      'osoo.',
      'ossS.',
      'ossS.',
      'osS..',
      'osS..',
      'osS..',
      'oSS..',
      'oS...',
      'oS...',
      'oo...',
    ]),
    under: true,
  },
  {
    ...hov(13, 0, [
      '...o.',
      '.ooso',
      '.Ssso',
      '.Ssso',
      '..Sso',
      '..Sso',
      '..Sso',
      '..SSo',
      '...So',
      '...So',
      '...oo',
    ]),
    under: true,
  },
];
/** Eyes sewn shut: a dark slit where each eye was. */
const SEALED_EYES = hov(5, 9, ['SS...SS', 'oo...oo', 'SS...SS']);

/** Carapace behind the heavy body (stamped only on empty cells) and plates over the shoulders. */
const SHELL_HUMP: Overlay = {
  ...ov(0, 2, [
    '........ooooooo........',
    '......oo|lllll|oo......',
    '.....o|lllllllll|o.....',
    '....o|lllllllllll|o....',
    '...o|lllllllllllllLo...',
    '..o|oooooooooooooooLo..',
    '.o|lllllllllllllllllLo.',
    'o|lllllllllllllllllllLo',
    'olllllllllllllllllllLLo',
    'olllllllllllllllllllLLo',
    'ooooooooooooooooooooooo',
    'olllllllllllllllllllLLo',
    'olllllllllllllllllllLLo',
    'olllllllllllllllllllLLo',
    'oLLLLLLLLLLLLLLLLLLLLLo',
    'ooooooooooooooooooooooo',
  ]),
  under: true,
};
const SHELL_PLATES: Overlay[] = [
  ov(0, 16, ['oooooo', 'o|llLo', 'ollllo', 'oLlLLo', 'oooooo']),
  ov(17, 16, ['oooooo', 'oLll|o', 'ollllo', 'oLLlLo', 'oooooo']),
];

/** Brute face: one bulging eye, a maw of teeth; boils on the torso (brute figure space). */
const BRUTE_EYE = ov(8, 12, ['ooooo', 'oxeeo', 'oeeeo', 'oeeeo', 'ooooo']);
const BRUTE_MAW = ov(11, 18, ['oxoxoxoxoxo', 'ooooooooooo']);
const BRUTE_BOILS = ov(12, 33, [
  '.a......',
  '........',
  '........',
  '.......a',
  '........',
  '........',
  'a.......',
  '........',
  '.....a..',
]);

/** Kẻ Thính: blind, hears everything. Upright, feeling forward; pale, huge ears, eyes sewn shut, rags. */
export const KE_THINH = wear('ke_thinh', 'Kẻ Thính', POSE_REACH, {
  top: 'torn',
  bottoms: 'shorts',
  shoes: 'none',
  details: ['stains', 'gash'],
  extras: [...BIG_EARS, SEALED_EYES],
  colors: {
    skin: [196, 196, 186],
    cloth: [120, 110, 100],
    pants: [70, 66, 62],
    ...BLOOD,
    ...ZOMBIE_EYES,
  },
});

/** Kẻ Bám Trần: the ceiling crawler on the ground, crouched with long clawed arms, yellow eyes. */
export const KE_BAM_TRAN = wear('ke_bam_tran', 'Kẻ Bám Trần', POSE_CRAWL, {
  top: 'torn',
  bottoms: 'shorts',
  shoes: 'none',
  details: ['scalp', 'stains', 'gash'],
  colors: {
    skin: [120, 112, 132],
    cloth: [80, 76, 84],
    pants: [50, 46, 56],
    eye: [230, 200, 60],
    white: [160, 150, 120],
    ...BLOOD,
  },
});

/** Kẻ Mang Vỏ: heavy build with a chitin carapace behind and plates over the shoulders. */
export const KE_MANG_VO: Outfit = {
  id: 'ke_mang_vo',
  label: 'Kẻ Mang Vỏ',
  form: FORM_HEAVY,
  remaps: [{ box: [0, 34, 22, 38], to: 'pants' }],
  overlays: [SHELL_HUMP, ...SHELL_PLATES, ZOMBIE_FACE, ZOMBIE_CHEEK],
  colors: {
    skin: [160, 152, 132],
    leather: [92, 72, 58],
    pants: [64, 58, 52],
    eye: [220, 120, 40],
    white: [200, 190, 170],
    ...BLOOD,
  },
};

/** Đột Biến: the ×1.5 giant with a mutated claw arm, bone spikes, a bulging eye and a maw. */
export const DOT_BIEN: Outfit = {
  id: 'dot_bien',
  label: 'Đột Biến',
  form: FORM_BRUTE,
  remaps: [{ box: [8, 45, 24, 56], to: 'pants' }],
  overlays: [BRUTE_EYE, BRUTE_MAW, BRUTE_BOILS],
  colors: {
    skin: [150, 162, 128],
    pants: [60, 56, 60],
    eye: [210, 40, 40],
    white: [236, 230, 210],
    accent: [230, 200, 80],
    ...BLOOD,
  },
};

/**
 * Hair of the mimic (head space): black hair to the shoulders, matted,
 * strands sticking out at the sides and ragged ends on the shoulders. The
 * face stays visible, as on the game's own sprite.
 */
const HAIR_WILD = hov(0, 0, [
  '......ooooo......',
  '....oo#hhhhoo....',
  '...o##hhhhhhho...',
  '..o##hhhhhhhhho..',
  '..o#hhhhhhhhhho..',
  '.o#hhhhhhhhhhhho.',
  '.ohhhhhhhhhhhhho.',
  '.ohhhhHhhhhhHhho.',
  '.ohhH..HHH..Hhho.',
  '.ohh.........hho.',
  'ohhh.........hho.',
  '.ohh.........hhho',
  '.ohh.........hho.',
  '.ohH.........Hho.',
  'ohhH.........Hhho',
  '.oHH.........HHo.',
  '.oHo.........oHo.',
  '..o...........o..',
]);
/** Sunken sockets with a glowing point in each. */
const SUNKEN_EYES = hov(5, 9, ['SS...SS', 'Se...eS', 'SS...SS']);
/** A smile far too wide: corners lifted at the cheeks, a line across the face, bared teeth above the chin. */
const WIDE_SMILE = hov(4, 11, ['o.......o', '.ooooooo.', '..xxxxx..']);
/** Blood dripping down the dress. */
const DRESS_STAINS = ov(4, 30, ['....D....', '.........', '.D.......', '.........', '......D..']);

/**
 * Kẻ Bắt Chước: stands still like a person (base figure), a dirty off-white
 * slip dress to the shins with a torn hem, bare feet, shoulder-length black
 * hair, red points in sunken sockets and a smile too wide.
 */
const KE_BAT_CHUOC_LOOK: Look = {
  hair: [HAIR_WILD],
  top: 'tank',
  bottoms: 'dress',
  shoes: 'none',
  details: [],
  face: 'plain',
  extras: [SUNKEN_EYES, WIDE_SMILE, DRESS_STAINS],
  colors: {
    skin: [184, 184, 164],
    hair: [38, 34, 36],
    cloth: [226, 216, 196],
    cloth2: [226, 216, 196],
    eye: [214, 70, 40],
    white: [236, 232, 222],
    ...BLOOD,
  },
};
export const KE_BAT_CHUOC = wear('ke_bat_chuoc', 'Kẻ Bắt Chước', POSE_STAND, KE_BAT_CHUOC_LOOK);

export const MUTANTS: readonly Outfit[] = [
  KE_THINH,
  KE_BAM_TRAN,
  KE_MANG_VO,
  DOT_BIEN,
  KE_BAT_CHUOC,
];

/** The common infected of the game is the civilian man. */
export const BIEN_THE: Outfit = { ...ZOMBIE_CIV_M, id: 'bien_the', label: 'Biến Thể' };

/* ------------------------------------------------------------------ */
/* Uninfected soldiers: the same army palette on the standing figure.  */
/* ------------------------------------------------------------------ */

/** Rifleman: helmet, camouflage jacket, belt. */
const LINH_NON_SAT_LOOK: Look = {
  hat: HELMET,
  top: 'long',
  bottoms: 'pants',
  shoes: 'both',
  details: ['camo', 'belt'],
  face: 'plain',
  colors: { skin: [226, 186, 150], eye: [60, 50, 40], white: [212, 230, 238], ...ARMY },
};
export const LINH_NON_SAT = wear('linh_non_sat', 'Lính nón sắt', POSE_STAND, LINH_NON_SAT_LOOK);

/** Officer: beret, plain jacket, belt, insignia on the chest. */
const LINH_MU_NOI_LOOK: Look = {
  hat: BERET,
  top: 'long',
  bottoms: 'pants',
  shoes: 'both',
  details: ['belt', 'badge'],
  face: 'plain',
  colors: { skin: [214, 170, 132], eye: [60, 50, 40], white: [212, 230, 238], ...ARMY },
};
export const LINH_MU_NOI = wear('linh_mu_noi', 'Lính mũ nồi', POSE_STAND, LINH_MU_NOI_LOOK);

/** Off duty: buzz cut, olive tee, dog tag. */
const LINH_DAU_DINH_LOOK: Look = {
  hair: BUZZ,
  top: 'tee',
  bottoms: 'pants',
  shoes: 'both',
  details: ['belt'],
  extras: [dogTag(POSE_STAND)],
  face: 'plain',
  colors: {
    skin: [196, 150, 112],
    hair: [50, 40, 36],
    eye: [60, 50, 40],
    white: [212, 230, 238],
    ...ARMY,
  },
};
export const LINH_DAU_DINH = wear('linh_dau_dinh', 'Lính đầu đinh', POSE_STAND, LINH_DAU_DINH_LOOK);

/** Woman soldier: patrol cap over a ponytail, camouflage jacket, belt. */
const LINH_NU_LOOK: Look = {
  hair: HAIR_PONYTAIL,
  hat: PEAKED_CAP,
  top: 'long',
  bottoms: 'pants',
  shoes: 'both',
  details: ['camo', 'belt'],
  face: 'plain',
  colors: {
    skin: [240, 200, 165],
    hair: [70, 48, 36],
    eye: [60, 50, 40],
    white: [212, 230, 238],
    ...ARMY,
  },
};
export const LINH_NU = wear('linh_nu', 'Lính nữ', POSE_STAND, LINH_NU_LOOK);

/** Medic soldier: helmet, plain jacket, red-cross bag on the hip. */
const LINH_QUAN_Y_LOOK: Look = {
  hat: HELMET,
  top: 'long',
  bottoms: 'pants',
  shoes: 'both',
  details: ['belt'],
  extras: [...MEDIC_BAG],
  face: 'plain',
  colors: {
    skin: [232, 192, 156],
    eye: [60, 50, 40],
    white: [240, 245, 245],
    accent: [200, 40, 50],
    ...ARMY,
  },
};
export const LINH_QUAN_Y = wear('linh_quan_y', 'Lính quân y', POSE_STAND, LINH_QUAN_Y_LOOK);

export const SOLDIERS: readonly Outfit[] = [
  LINH_NON_SAT,
  LINH_MU_NOI,
  LINH_DAU_DINH,
  LINH_NU,
  LINH_QUAN_Y,
];

/** Characters on the standing base figure, dressable in every drawn view. */
export const BASE_LOOKS: readonly { id: string; label: string; look: Look }[] = [
  { id: 'duong', label: 'Dương', look: DUONG_LOOK },
  { id: 'ny', label: 'Ny', look: NY_LOOK },
  { id: 'son', label: 'Sơn', look: SON_LOOK },
  { id: 'ong_tu', label: 'Ông Tư', look: ONG_TU_LOOK },
  { id: 'bac_si_lan', label: 'Bác sĩ Lan', look: BAC_SI_LAN_LOOK },
  { id: 'ke_bat_chuoc', label: 'Kẻ Bắt Chước', look: KE_BAT_CHUOC_LOOK },
  { id: 'linh_non_sat', label: 'Lính nón sắt', look: LINH_NON_SAT_LOOK },
  { id: 'linh_mu_noi', label: 'Lính mũ nồi', look: LINH_MU_NOI_LOOK },
  { id: 'linh_dau_dinh', label: 'Lính đầu đinh', look: LINH_DAU_DINH_LOOK },
  { id: 'linh_nu', label: 'Lính nữ', look: LINH_NU_LOOK },
  { id: 'linh_quan_y', label: 'Lính quân y', look: LINH_QUAN_Y_LOOK },
];

/** Every base character dressed for one view. */
export function castInView(view: HeroView): Outfit[] {
  return BASE_LOOKS.map((c) => wearView(c.id, c.label, c.look, view));
}

export const CAST: readonly Outfit[] = [
  DUONG,
  HUNG,
  NY,
  SON,
  ONG_TU,
  BAC_SI_LAN,
  LINH_NHIEM,
  BIEN_THE,
  KE_PHUN,
];
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
