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
import { EMPTY, flipX, LEGEND, MATERIALS, packCell, parseSprite, toAscii } from './format.js';
import type { Box, HeroView, WalkKey } from './hero64.js';
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
import type { Outfit, Overlay, Remap, Seam, Space, ViewItem, ViewLayer } from './outfit64.js';
import { buildForm } from './heroforms.js';
import type { Garment } from './tailor64.js';
import type { MaterialColors } from './paint.js';
import { poseInView } from './poseviews64.js';
import { STAND_BRUTE, STAND_FAT, STAND_HEAVY, STAND_VIEWS } from './views64.js';
import { walkPose, type WalkView } from './walk64.js';
import {
  BACKPACK_N,
  BACKPACK_NW,
  BACKPACK_W,
  BACKPACK_WALK,
  BEARD_VIEWS,
  BERET_W,
  BIG_EAR_W,
  BUZZ_VIEWS,
  COAT_TAILS2_W,
  COAT_TAILS2_WALK,
  DRESS_STAINS_W,
  DRESS_STAINS_WALK,
  GLASSES_VIEWS,
  HAIR_BOB_VIEWS,
  HAIR_CURLY_VIEWS,
  HAIR_LONG_VIEWS,
  HAIR_PONYTAIL_VIEWS,
  HAIR_SHORT_VIEWS,
  HAIR_SPIKY_VIEWS,
  HAIR_SWEPT_VIEWS,
  HAIR_WILD_VIEWS,
  HARD_HAT_W,
  HEADBAND_VIEWS,
  HELMET_W,
  MAP_CASE_WALK,
  MIMIC_FACE_VIEWS,
  NY_STRAP_WALK,
  PEAKED_CAP_N,
  PEAKED_CAP_W,
  RANGER_COAT_W,
  RANGER_COAT_WALK,
  RANGER_HAT_W,
  RIFLE_SLUNG_N,
  RIFLE_SLUNG_W,
  RIFLE_SLUNG_WALK,
  RIFLE_STAND_N,
  RIFLE_STAND_W,
  RIFLE_STAND_WALK,
  SATCHEL_N,
  SATCHEL_W,
  SATCHEL_WALK,
  SEALED_EYES_VIEWS,
  TUNIC_W,
  TUNIC_WALK,
  ZOMBIE_CHEEK_VIEWS,
  ZOMBIE_FACE_VIEWS,
} from './views64.items.js';

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

// Hairstyles are silhouettes in the mid tone (plus their outline); hair64.ts combs every mass into three
// diagonal masses with strand lines when the figure is dressed (D-074). Only the beard keeps drawn tones.
/** Short hair, parted on the left: strands lit on their top-left, shadow gaps between them, a deep underside, three fringe points of different lengths and one reaching the temple. */
const HAIR_SHORT = hov(0, 0, [
  '......ooooo......',
  '....oohhhhhoo....',
  '...ohhhhhhhhho...',
  '...ohhhhhhhhho...',
  '..ohhhhhhhhhhho..',
  '..ohhhhhhhhhhho..',
  '..ohhhhhhhhhhho..',
  '..oh...hhhhhhho..',
  '..hhh..hhh..hhh..',
  '...h....h........',
]);

/** Spiky hair: three points rising two rows above the skull (dress() grows the canvas), a fuller mass, tips over the brow. */
const HAIR_SPIKY = hov(0, -2, [
  '.....o...o...o...',
  '....oho.oho.oho..',
  '...ohhhohhhohhho.',
  '..ohhhhhhhhhhhho.',
  '.ohhhhhhhhhhhhho.',
  '.ohhhhhhhhhhhhho.',
  '.ohhhhhhhhhhhhho.',
  '..ohhhhhhhhhhho..',
  '..ohhhhhhhhhhho..',
  '..oh...hhhhhhho..',
  '..hhh..hhh..hhh..',
  '....h........h...',
]);

/** Fuller hair swept over the brow, sideburns over the ears. */
const HAIR_SWEPT = hov(0, 0, [
  '......ooooo......',
  '....oohhhhhoo....',
  '...ohhhhhhhhho...',
  '..ohhhhhhhhhhho..',
  '..ohhhhhhhhhhho..',
  '.ohhhhhhhhhhhhho.',
  '.ohhhhhhhhhhhhho.',
  '.ohhhhhhhhhhhhho.',
  '.ohh...hhhhhhhho.',
  '.ohh.........hho.',
  '.ohh.........hho.',
  '..oo.........oo..',
]);

/** Chin-length bob with a fringe. */
const HAIR_BOB = hov(0, 0, [
  '......ooooo......',
  '....oohhhhhoo....',
  '...ohhhhhhhhho...',
  '..ohhhhhhhhhhho..',
  '..ohhhhhhhhhhho..',
  '.ohhhhhhhhhhhhho.',
  '.ohhhhhhhhhhhhho.',
  '.ohh...hhhhhhhho.',
  '.ohhh..hhh..hhho.',
  '.ohh.........hho.',
  '.ohh.........hho.',
  '.ohh.........hho.',
  '..oho.......oho..',
  '...o.........o...',
]);

/** Curly hair: a bumpy silhouette wider than the skull, two-cell curl marks, fringe over the brow, ends at the jaw. */
const HAIR_CURLY = hov(0, 0, [
  '.....ooooooo.....',
  '...oohhhhhhhoo...',
  '..ohhhhhhhhhhho..',
  '.ohhhhhhhhhhhhho.',
  'ohhhhhhhhhhhhhhho',
  'ohhhhhhhhhhhhhhho',
  '.ohhhhhhhhhhhhho.',
  'ohhh...hhhhhhhhho',
  '.ohhh..hhh..hhho.',
  'ohhh.........hhho',
  '.ohh.........hho.',
  'ohhh.........hhho',
  '.ohh.........hho.',
  '..oo.........oo..',
]);

/** Long hair to the shoulders. */
const HAIR_LONG = hov(0, 0, [
  '......ooooo......',
  '....oohhhhhoo....',
  '...ohhhhhhhhho...',
  '..ohhhhhhhhhhho..',
  '..ohhhhhhhhhhho..',
  '.ohhhhhhhhhhhhho.',
  '.ohhhhhhhhhhhhho.',
  '.ohh...hhhhhhhho.',
  '.ohhh..hhh..hhho.',
  '.ohh.........hho.',
  '.ohh.........hho.',
  '.ohh.........hho.',
  '.ohh.........hho.',
  '.ohh.........hho.',
  '.ohh.........hho.',
  '.ohh.........hho.',
  '..oo.........oo..',
]);

/** Tight cap of hair with a ponytail hanging at the right. */
const HAIR_PONYTAIL: Overlay[] = [
  hov(0, 0, [
    '......ooooo......',
    '....oohhhhhoo....',
    '...ohhhhhhhhho...',
    '...ohhhhhhhhho...',
    '..ohhhhhhhhhhho..',
    '..ohhhhhhhhhhho..',
    '..ohhhhhhhhhhho..',
    '..oh...hhhhhhho..',
    '..#hH.......hhH..',
    '...hH.......Hh...',
  ]),
  // The tail is drawn with its tones (too small and too dark-sided for the comb): lit on top, a shadow cell
  // parting it into two locks, deep on its far lower side.
  hov(13, 10, ['.ooo', 'o#ho', 'ohHo', 'ohjo', 'ohjo', '.oo.']),
];

/** Buzz cut: the skull recoloured to hair, face and ears left alone. */

/** Round glasses: frame joins the brow line, bridge between the eyes, rims under them. */
const GLASSES = hov(4, 8, ['...o.o...', '...ooo...', '...o.o...', 'o..o.o..o', 'oooo.oooo']);

/** Headband across the forehead (accent material). */
const HEADBAND = hov(2, 6, ['o**aaaaaaaAAo', 'oaaaaaaaaAAAo']);

/** Full beard (hair material): a moustache under the nose parted from the cheek hair by the lip corners, a short dark notch for the mouth, a bushy beard wider than the jaw, its points hanging over the collar opening. */
const BEARD = hov(3, 12, [
  '.o#.hHh.Ho.',
  'o#hhHjjHhHo',
  'o#hHhhHhHHo',
  '.o#hHhHhHo.',
  '....HjH....',
  '....ooo....',
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
const HARD_HAT_ROWS = [
  '......ooooooo......',
  '.....o****aaao.....',
  '....o***a*aaaao....',
  '...o*aaaa*aaaaao...',
  '...oaaaaa*aaaAAo...',
  '...oaaaaaaAAAAro...',
  '..o*aaaAAAAArrrro..',
  '..ooooooooooooooo..',
];
/** From the front the brows sit right under the brim: they go (forehead skin), or brim and brow make a 2x2 line block (D-094). */
const HARD_HAT: Overlay = {
  ...hov(-1, 0, [...HARD_HAT_ROWS, '......ss...ss......']),
  rigid: true,
};
const HARD_HAT_BACK: Overlay = { ...hov(-1, 0, HARD_HAT_ROWS), rigid: true };
// the three-quarter face carries its brows two columns further left
const HARD_HAT_SW: Overlay = {
  ...hov(-1, 0, [...HARD_HAT_ROWS, '....ss..ss.........']),
  rigid: true,
};

/** Peaked cap: wide flat crown in cloth2, dark band, visor across the brow. */
const PEAKED_CAP: Overlay = {
  ...hov(-1, 0, [
    '....ooooooooooo....',
    '...oQQ&&&&KkkkKo...',
    '..o&&&kkkKkkkkkKo..',
    '..okkkkkkKkkkKKKo..',
    '..okkkKKKKKKqqqqo..',
    '...o&&&&&kkkkkko...',
    '.okkkKKKKKKKqqqqqo.',
    '..ooooooooooooooo..',
  ]),
  rigid: true,
};

/** Beret (cloth2): puffed crown rising at the left and draped down to the right over the band, rim on the brow. */
const BERET: Overlay = {
  ...hov(-1, 0, [
    '.....ooooooo.......',
    '...ooQQ&&&kkkoo....',
    '..o&&&kkKkkKkkoo...',
    '.okkKkkkKkkkKkkKoo.',
    '.okkkKkkkKkkKKKqKKo',
    '.okKkkKKKKqKKqqqqqo',
    '.ookkkKKKqKKqqqqooo',
    '..okkkKKKqKKqqqqo..',
    '.ooooooooooooooooo.',
  ]),
  rigid: true,
};

/** Combat helmet: flat top, vertical sides, dark band and a flared rim sitting on the brow. */
const HELMET: Overlay = {
  ...hov(-1, 0, [
    '......ooooooo......',
    '....ooV^^^cccoo....',
    '...o^^^^ccccccco...',
    '..o^cccccccccccco..',
    '..o^CCCCCCCCCCCCo..',
    '..occcccccCCCCCvo..',
    '..occccCCCCCvvvvo..',
    '.occcCCCCCCCvvvvvo.',
    '.ooooooooooooooooo.',
  ]),
  rigid: true,
};

/** Zombie face: sunken sockets, a gaping mouth with yellowed teeth, bags under the eyes. */
const ZOMBIE_FACE = hov(4, 8, [
  '$.......$',
  '...S.S...',
  '...S.S...',
  '.........',
  '.SoxxxoS.',
  '...ooo...',
]); // temples catch light, sunken brows, a toothy mouth
/** Scalp patches and a scalp wound (blood is the wood material). */
const ZOMBIE_SCALP = hov(5, 2, ['.SS.ddd', '..S....']); // the wound in one row: a tilted head shears rows apart
/** A gash on the cheek. */
const ZOMBIE_CHEEK = hov(11, 6, ['dd', '.d']); // rows 6-7 sit in one shift band of every tilted head (D-093)

/* ------------------------------------------------------------------ */
/* Base figure (17×40) regions in figure space.                        */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Items drawn per view (views64.items.ts holds the SW/W/NW/N rows).    */
/* ------------------------------------------------------------------ */

const same = (o: Overlay): ViewLayer => ({ overlays: [o] });
/**
 * A plain face's mouth: a two-cell line under the chin light, as the reference's three-cell brown mouth line
 * (a face under a helmet rim had nothing but eyes); off-centre toward the near cheek at SW, a notch into the
 * profile at W; nothing from behind.
 */
const MOUTH_V: ViewItem = {
  S: same(hov(7, 12, ['oo'])),
  SW: same(hov(6, 12, ['oo'])),
  W: same(hov(3, 12, ['oo'])),
};
const HAIR_SPIKY_V: ViewItem = { S: same(HAIR_SPIKY), ...HAIR_SPIKY_VIEWS };
const HAIR_CURLY_V: ViewItem = { S: same(HAIR_CURLY), ...HAIR_CURLY_VIEWS };
const HAIR_SWEPT_V: ViewItem = { S: same(HAIR_SWEPT), ...HAIR_SWEPT_VIEWS };
const HAIR_BOB_V: ViewItem = { S: same(HAIR_BOB), ...HAIR_BOB_VIEWS };
const HAIR_SHORT_V: ViewItem = { S: same(HAIR_SHORT), ...HAIR_SHORT_VIEWS };
const HAIR_LONG_V: ViewItem = { S: same(HAIR_LONG), ...HAIR_LONG_VIEWS };
const HEADBAND_V: ViewItem = {
  S: same(HEADBAND),
  SW: same(HEADBAND),
  N: same(HEADBAND),
  NW: same(HEADBAND),
  ...HEADBAND_VIEWS,
};
const HARD_HAT_V: ViewItem = {
  S: same(HARD_HAT),
  SW: same(HARD_HAT_SW),
  N: same(HARD_HAT_BACK),
  NW: same(HARD_HAT_BACK),
  W: HARD_HAT_W,
};
/** Zombie face per view: sockets and mouth (none from behind), the cheek gash, the scalp wound (seen from everywhere). */
const ZOMBIE_FACE_V: ViewItem = { S: same(ZOMBIE_FACE), ...ZOMBIE_FACE_VIEWS };
const ZOMBIE_CHEEK_V: ViewItem = {
  S: same(ZOMBIE_CHEEK),
  N: same(ZOMBIE_CHEEK),
  NW: same(ZOMBIE_CHEEK),
  ...ZOMBIE_CHEEK_VIEWS,
};
const ZOMBIE_SCALP_V: ViewItem = {
  S: same(ZOMBIE_SCALP),
  SW: same(ZOMBIE_SCALP),
  W: same(ZOMBIE_SCALP),
  N: same(ZOMBIE_SCALP),
  NW: same(ZOMBIE_SCALP),
};
const HAIR_PONYTAIL_V: ViewItem = { S: { overlays: HAIR_PONYTAIL }, ...HAIR_PONYTAIL_VIEWS };
const BUZZ_V: ViewItem = { S: BUZZ_VIEWS.S!, ...BUZZ_VIEWS };
const GLASSES_V: ViewItem = { S: same(GLASSES), ...GLASSES_VIEWS };
const BEARD_V: ViewItem = { S: same(BEARD), ...BEARD_VIEWS };
/** Under a hat brim the profile's iris loses its top cell; this lower cell keeps the eye three cells tall. */
const BRIM_EYE_V: ViewItem = { S: {}, W: { overlays: [ov(4, 11, ['e'])] } };
/** Helmets and the ranger hat look the same from the back; the beret drapes to the other side. */
const HELMET_V: ViewItem = {
  S: same(HELMET),
  SW: same(HELMET),
  N: same(HELMET),
  NW: same(HELMET),
  W: HELMET_W,
};
/** The medic's red cross on the white helmet dome: five cells, one region, on every side (D-089). */
const CROSS = ['.a.', 'aaa', '.a.'];
const MEDIC_CROSS_V: ViewItem = {
  S: { overlays: [{ ...hov(6, 2, CROSS), rigid: true }] },
  SW: { overlays: [{ ...hov(6, 2, CROSS), rigid: true }] },
  N: { overlays: [{ ...hov(6, 2, CROSS), rigid: true }] },
  NW: { overlays: [{ ...hov(6, 2, CROSS), rigid: true }] },
  W: { overlays: [{ ...hov(5, 2, CROSS), rigid: true }] },
};
const BERET_BACK: Overlay = { ...BERET, sprite: flipX(BERET.sprite) };
const BERET_V: ViewItem = {
  S: same(BERET),
  SW: same(BERET),
  N: same(BERET_BACK),
  NW: same(BERET_BACK),
  W: BERET_W,
};
const PEAKED_CAP_V: ViewItem = {
  S: same(PEAKED_CAP),
  SW: same(PEAKED_CAP),
  N: PEAKED_CAP_N,
  NW: PEAKED_CAP_N,
  W: PEAKED_CAP_W,
};
/**
 * The police cap: the peaked cap with its band (row 5 of every view's drawing)
 * in the accent colour, two light cells at the left and three shadow at the
 * right like the band's own tones; the one red in the green group, so the
 * officer reads at 1x (fourth review).
 */
const BAND_ROW = 5;
const CLOTH2 = MATERIALS.indexOf('cloth2');
function banded(o: Overlay): Overlay {
  const { w } = o.sprite;
  const cells = Int16Array.from(o.sprite.cells);
  const xs: number[] = [];
  for (let x = 0; x < w; x++) {
    const v = cells[BAND_ROW * w + x]!;
    if (v >= 0 && v >> 3 === CLOTH2) xs.push(x);
  }
  xs.forEach((x, i) => {
    const glyph = i < 2 ? '*' : i >= xs.length - 3 ? 'A' : 'a';
    cells[BAND_ROW * w + x] = packCell(LEGEND[glyph]!);
  });
  return { ...o, sprite: { ...o.sprite, cells } };
}
const POLICE_CAP_V = Object.fromEntries(
  Object.entries(PEAKED_CAP_V).map(([view, l]) => [
    view,
    { ...l, overlays: (l.overlays ?? []).map(banded) },
  ]),
) as ViewItem;
const RANGER_S: ViewLayer = {
  remaps: [RANGER_HAT.remap],
  lines: RANGER_HAT.seams,
  overlays: [RANGER_HAT.overlay],
};
const RANGER_HAT_V: ViewItem = {
  S: RANGER_S,
  SW: RANGER_S,
  N: RANGER_S,
  NW: RANGER_S,
  W: RANGER_HAT_W,
};

/** A rifle held at ease in the right hand: muzzle up beside the head, butt on the ground; the hand closes on the stock. */
const RIFLE_STAND: Overlay[] = [
  ov(17, 9, [
    '.o..',
    '.o..',
    '.o..',
    '.o..',
    '.o..',
    '.o..',
    '.o..',
    '.o..',
    '.o..',
    '.o..',
    '.oo.',
    'oMmo',
    'oMmo',
    'oDdo',
    'oDdo',
    'oDdo',
    'oD%o',
    'oDdo',
    'oDdo',
    'oDdo',
    'oDdo',
    'oD%o',
    'oDdo',
    'oDdo',
    'oDdo',
    'oDDo',
    'oDDo',
    'oDDo',
    'oDDo',
    'oDDo',
    '.oo.',
  ]),
];
const RIFLE_STAND_V: ViewItem = {
  S: { overlays: RIFLE_STAND },
  SW: { overlays: RIFLE_STAND },
  W: RIFLE_STAND_W,
  N: RIFLE_STAND_N,
  NW: RIFLE_STAND_N,
  ...RIFLE_STAND_WALK,
};
/** A rifle slung across the back: barrel up behind the left shoulder, stock below the right hip, sling over the chest. */
const RIFLE_SLUNG: Overlay[] = [
  {
    ...ov(15, 5, [
      '..o',
      '..o',
      '..o',
      '.o.',
      '.o.',
      '.o.',
      '.o.',
      '.o.',
      '.o.',
      '.o.',
      '.o.',
      '.o.',
    ]),
    under: true,
  },
  ov(0, 29, ['ooD', 'odD', 'odD', 'odD', 'ooo']),
  // two cells on the rows where the sling steps over, so the band is one piece at 1x (D-093)
  ...(
    [
      [12, 17],
      [11, 18],
      [12, 18],
      [11, 19],
      [10, 20],
      [11, 20],
      [10, 21],
      [9, 22],
      [10, 22],
      [9, 23],
      [8, 24],
      [9, 24],
      [8, 25],
      [7, 26],
      [8, 26],
      [7, 27],
    ] as const
  ).map(([x, y]) => ov(x, y, ['L'])),
];
const RIFLE_SLUNG_V: ViewItem = {
  S: { overlays: RIFLE_SLUNG },
  SW: { overlays: RIFLE_SLUNG },
  W: RIFLE_SLUNG_W,
  N: RIFLE_SLUNG_N,
  NW: RIFLE_SLUNG_N,
  ...RIFLE_SLUNG_WALK,
};
/** The medic's big satchel: hangs outside the right hip on the chest strap, red with a white cross. */
const SATCHEL: Overlay[] = [
  ov(5, 17, ['A.......', 'AA......', '.AA.....', '..AA....', '...AA...', '....AA..', '.....AAA']),
  ov(14, 23, ['ooooo', 'o**Ao', 'oaaAo', 'oaxAo', 'oxxxo', 'oaxAo', 'oaaAo', 'orrro', 'ooooo']),
];
const SATCHEL_V: ViewItem = {
  S: { overlays: SATCHEL },
  SW: { overlays: SATCHEL },
  W: SATCHEL_W,
  N: SATCHEL_N,
  NW: SATCHEL_N,
  ...SATCHEL_WALK,
};

/** Sơn's backpack: its top shows behind the shoulders either side of the neck, two straps down the chest; a bat rests on the right shoulder. */
const BACKPACK: Overlay[] = [
  {
    ...ov(1, 11, [
      '.ooooooooooooo.',
      'oL|llllllllllLo',
      'oL|lllllllllLLo',
      'oLlllllllllllLo',
      'ooooooooooooooo',
    ]),
    under: true,
  },
  ...(
    [
      [5, 17],
      [5, 18],
      [5, 19],
      [5, 20],
      [11, 17],
      [11, 18],
      [11, 19],
      [11, 20],
    ] as const
  ).map(([x, y]) => ov(x, y, ['L'])),
];
// Two wood cells where the shaft steps over: a one-cell 45° stick is a row of lone pairs at 1x (D-093).
const BAT: Overlay = ov(14, 7, [
  '....ooo',
  '....o%o',
  '...o%%o',
  '...odo.',
  '..oddo.',
  '..odo..',
  '.oddo..',
  '.odo...',
  'oddo...',
  'odo....',
  'Ddo....',
  'Ddo....',
  'ooo....',
]);
const BACKPACK_V: ViewItem = {
  S: { overlays: [...BACKPACK, BAT] },
  SW: { overlays: [...BACKPACK, BAT] },
  W: BACKPACK_W,
  N: BACKPACK_N,
  NW: BACKPACK_NW,
  ...BACKPACK_WALK,
};
/** Ông Tư's ranger coat: a column wider at each sleeve and a skirt to the knee, open at the front, vented at the back. */
const RANGER_COAT: Overlay[] = [
  ov(1, 29, [
    'o^ccCccoccCccCo',
    'o^ccCccoccCccCo',
    'occcCco.ocCccco',
    'occcCco.ocCccvo',
    'occcCco.ocCccvo',
    'occcCco.ocCccvo',
    'ooooooo.ooooooo',
  ]),
];
const RANGER_COAT_BACK: Overlay[] = [
  ov(1, 29, [
    'o^ccCccoccCccCo',
    'o^ccCccoccCccCo',
    'occcCccoccCccco',
    'occcCco.ocCccvo',
    'occcCco.ocCccvo',
    'occcCco.ocCccvo',
    'ooooooo.ooooooo',
  ]),
];
const RANGER_COAT_V: ViewItem = {
  S: { overlays: RANGER_COAT },
  SW: { overlays: RANGER_COAT },
  W: RANGER_COAT_W,
  N: { overlays: RANGER_COAT_BACK },
  NW: { overlays: RANGER_COAT_BACK },
  ...RANGER_COAT_WALK,
};
/** Bác sĩ Lan's coat tails to the knee, a column past each hip, and a clipboard held against the left thigh. */
const COAT_TAILS2: Overlay = ov(1, 29, [
  'o^ccCccoccCccCo',
  'o^ccCccoccCccCo',
  'occcCco.ocCccco',
  'occcCco.ocCccvo',
  '.occCco.ocCcco.',
  '.oooooo.oooooo.',
]);
const COAT_TAILS2_BACK: Overlay = ov(1, 29, [
  'o^ccCccoccCccCo',
  'o^ccCccoccCccCo',
  'occcCccoccCccco',
  'occcCco.ocCccvo',
  '.occCco.ocCcco.',
  '.oooooo.oooooo.',
]);
const CLIPBOARD: Overlay = ov(-1, 23, [
  'ooooo',
  'oMMxo',
  'oxxxo',
  'oxxxo',
  'oxxxo',
  'oxxxo',
  'ooooo',
]);
const CLIPBOARD_BACK: Overlay = ov(17, 23, ['oo', 'xo', 'xo', 'xo', 'xo', 'xo', 'oo']);
/** The back of the turned figure is a column narrower: the clipboard stays against the arm (1x yardstick). */
const CLIPBOARD_BACK_NW: Overlay = ov(16, 23, ['oo', 'xo', 'xo', 'xo', 'xo', 'xo', 'oo']);
/** Ny's scrub tunic reaches below the hips; a small red pouch hangs on the right hip. */
const TUNIC: Overlay = ov(1, 29, [
  'o^ccCccCccCccCo',
  'o^ccCccCccCccCo',
  'o^ccCccCccCccCo',
  'occcCccCccCccco',
  'ooooooooooooooo',
]);
const POUCH: Overlay = ov(14, 23, ['oooo', 'oAao', 'oAao', 'oaao', 'oooo']);
const POUCH_BACK: Overlay = ov(-1, 23, ['oooo', 'oaAo', 'oaAo', 'oaao', 'oooo']);
/** The pouch's strap seen from behind: from the right shoulder (screen-left) down across the back to the hip. */
const STRAP_BACK: Overlay = ov(5, 17, [
  '......A',
  '.....AA',
  '....AA.',
  '...AA..',
  '..AA...',
  '.AA....',
  'AA.....',
]);
const TUNIC_V: ViewItem = {
  S: { overlays: [TUNIC, POUCH] },
  SW: { overlays: [TUNIC, POUCH] },
  W: TUNIC_W,
  N: { overlays: [STRAP_BACK, TUNIC, POUCH_BACK] },
  NW: { overlays: [STRAP_BACK, TUNIC, POUCH_BACK] },
  ...TUNIC_WALK,
};

/** The beret soldier's leather map case on the left hip, a column past the arm. */
const MAP_CASE: Overlay = ov(-2, 23, ['oooo', 'oLlo', 'oLlo', 'olio', 'oooo']);
const MAP_CASE_V: ViewItem = {
  S: { overlays: [MAP_CASE] },
  SW: { overlays: [MAP_CASE] },
  W: { overlays: [ov(1, 23, ['oooo', 'oLlo', 'oLlo', 'olio', 'oooo'])] },
  N: { overlays: [ov(15, 23, ['oooo', 'olLo', 'olLo', 'oilo', 'oooo'])] },
  NW: { overlays: [ov(15, 23, ['oooo', 'olLo', 'olLo', 'oilo', 'oooo'])] },
  ...MAP_CASE_WALK,
};

/** The police zombie's duty belt on the mirrored droop pose: a baton beside the hanging hand, a holster on the far hip. */
const BATON = ['oo', 'oD', 'oD', 'oD', 'oD', 'oo'];
const BATON_R = ['oo', 'Do', 'Do', 'Do', 'Do', 'oo'];
const HOLSTER = ['oo', 'Do', 'Do', 'Do', 'Do', 'Do', 'oo'];
const HOLSTER_L = ['oo', 'oD', 'oD', 'oD', 'oD', 'oD', 'oo'];
const POLICE_GEAR_V: ViewItem = {
  S: { overlays: [ov(0, 26, BATON), ov(16, 27, HOLSTER)] },
  SW: { overlays: [ov(0, 26, BATON), ov(16, 27, HOLSTER)] }, // the turned torso is a column narrower: the baton follows
  W: { overlays: [ov(3, 26, BATON)] },
  N: { overlays: [ov(17, 26, BATON_R), ov(1, 28, HOLSTER_L)] },
  NW: { overlays: [ov(17, 26, BATON_R), ov(1, 28, HOLSTER_L)] },
};

/** Red medic bag on the right hip with a white cross, plus a strap across the chest (two cells wide: a
 * one-cell diagonal is a row of lone dots at 1x, D-093). */
const MEDIC_BAG: Overlay[] = [
  ov(5, 17, ['A......', 'AA.....', '.AA....', '..AA...', '...AA..', '....AA.', '.....AA']),
  ov(12, 22, ['ooooo', 'o*x*o', 'oxxxo', 'oAxAo', 'oAAAo', 'ooooo']),
];
/** Ny's chest strap on the front views (the tunic carries it on the side and from behind); shorter on the walk steps' narrower torso. */
const NY_STRAP_V: ViewItem = {
  S: { overlays: [MEDIC_BAG[0]!] },
  SW: { overlays: [MEDIC_BAG[0]!] },
  ...NY_STRAP_WALK,
};

/** Pustules on a bloated belly (fat form coordinates). */
const PUSTULES = ov(7, 23, ['...aa....', 'aa.a...**', 'a......*.', '...aa...a', '...a...aa']);

/* ------------------------------------------------------------------ */
/* The Vùng Xanh cast.                                                 */
/* ------------------------------------------------------------------ */

const DUONG_LOOK: Look = {
  hair: HAIR_SPIKY_V,
  top: 'tee',
  bottoms: 'pants',
  shoes: 'both',
  details: [],
  face: 'plain',
  colors: {
    skin: [249, 209, 173],
    hair: [56, 44, 40],
    cloth: [70, 150, 100], // a clear, cool green: next to the army olive he read as a soldier at 1x (D-089)
    pants: [48, 58, 96],
    boots: [110, 74, 48],
    eye: [25, 123, 186],
    white: [212, 230, 238],
  },
};
export const DUONG = wear('duong', 'Dương', POSE_STAND, DUONG_LOOK);

const NY_LOOK: Look = {
  hair: HAIR_CURLY_V,
  top: 'tee',
  bottoms: 'pants',
  shoes: 'both',
  details: [],
  face: 'plain',
  extras: [NY_STRAP_V, TUNIC_V], // strap, tunic, pouch
  colors: {
    skin: [250, 214, 180],
    hair: [160, 56, 40],
    cloth: [128, 192, 168], // mint scrub top: tells her apart from Bác sĩ Lan's white coat
    pants: [170, 170, 176],
    boots: [236, 236, 236],
    accent: [200, 40, 50],
    eye: [25, 123, 186],
    white: [240, 245, 245],
  },
};
export const NY = wear('ny', 'Ny', POSE_STAND, NY_LOOK);

/** A jacket's zip: a seam down the chest on the front views; on the walk steps it stops above the fist swung in front of the hip (D-095). */
const JACKET_ZIP_V: ViewItem = {
  S: { lines: [seam([8, 19, 8, 27])] },
  SW: { lines: [seam([7, 19, 7, 27])] },
  S0: { lines: [seam([7, 19, 7, 25])] },
  S1: { lines: [seam([8, 19, 8, 25])] },
};
const SON_LOOK: Look = {
  hair: HAIR_SWEPT_V,
  glasses: true,
  top: 'long',
  bottoms: 'pants',
  shoes: 'both',
  details: [],
  face: 'plain',
  extras: [JACKET_ZIP_V, BACKPACK_V], // jacket zip, pack, bat
  colors: {
    skin: [240, 200, 165],
    hair: [58, 54, 66],
    cloth: [40, 140, 150],
    pants: [50, 50, 60],
    boots: [40, 40, 46],
    eye: [25, 123, 186],
    white: [212, 230, 238],
  },
};
export const SON = wear('son', 'Sơn', POSE_STAND, SON_LOOK);

/** Ông Tư, the old forest ranger: hat, full grey beard, khaki shirt with long sleeves, dark trousers, boots. */
const ONG_TU_LOOK: Look = {
  hat: RANGER_HAT_V,
  top: 'long',
  bottoms: 'pants',
  shoes: 'both',
  details: [],
  face: 'plain',
  extras: [BEARD_V, RANGER_COAT_V, BRIM_EYE_V],
  hem: false,
  sleeves: 'wide',
  colors: {
    skin: [226, 182, 144],
    hair: [188, 182, 172], // a white beard: the old man's key at 1x (D-090)
    leather: [120, 92, 60], // dark brown pith helmet (a pale one met the medic's khaki helmet at 1x)
    cloth: [194, 148, 84], // ochre, warmer than the medic's grey khaki (D-090: the two met at 1x once outlines darkened)
    pants: [78, 64, 52],
    boots: [72, 52, 36],
    eye: [150, 80, 40],
    white: [212, 230, 238],
  },
};
export const ONG_TU = wear('ong_tu', 'Ông Tư', POSE_STAND, ONG_TU_LOOK);

/** Lab-coat tails over the hips, open at the front (coat opening seam, back vent), with the clipboard against the left thigh. */
const LAB_COAT_V: ViewItem = {
  S: { overlays: [COAT_TAILS2, CLIPBOARD], lines: [seam([8, 19, 8, 28])] }, // coat opening
  SW: { overlays: [COAT_TAILS2, CLIPBOARD], lines: [seam([7, 19, 7, 28])] },
  W: COAT_TAILS2_W,
  N: { overlays: [COAT_TAILS2_BACK, CLIPBOARD_BACK] }, // back vent
  NW: { overlays: [COAT_TAILS2_BACK, CLIPBOARD_BACK_NW] },
  ...COAT_TAILS2_WALK,
};

/** Bác sĩ Lan, the doctor: auburn bob, round glasses, white coat open at the front over blue trousers, dark shoes. */
const BAC_SI_LAN_LOOK: Look = {
  hair: HAIR_BOB_V,
  glasses: true,
  top: 'long',
  bottoms: 'pants',
  shoes: 'both',
  details: [],
  face: 'plain',
  hem: false,
  extras: LAB_COAT_V,
  colors: {
    skin: [240, 206, 176],
    hair: [118, 42, 40],
    cloth: [212, 210, 204], // light grey-white: a true white clips the light step to +8 L (fourth review)
    pants: [62, 80, 112],
    boots: [42, 44, 50],
    eye: [25, 123, 186],
    white: [212, 230, 238],
  },
};
export const BAC_SI_LAN = wear('bac_si_lan', 'Bác sĩ Lan', POSE_STAND, BAC_SI_LAN_LOOK);

/* ------------------------------------------------------------------ */
/* Zombies: one pose each, clothes described once and laid on the     */
/* pose's regions (hero64.poses.ts).                                   */
/* ------------------------------------------------------------------ */

export type Top = 'tee' | 'torn' | 'long' | 'tank' | 'crop' | 'none';
export type Bottoms = 'pants' | 'shorts' | 'skirt' | 'dress' | 'none';
export type Footwear = 'both' | 'right' | 'flats' | 'none';
export type Detail =
  | 'stains'
  | 'gash'
  | 'hivis'
  | 'badge'
  | 'belt'
  | 'tie'
  | 'number'
  | 'camo'
  | 'scalp'
  | 'cuffs' // a uniform's cuffs in its second cloth
  | 'kneepads' // two light cells on each knee
  | 'rip' // a tear at the belly baring four skin cells, front views
  | 'armband'; // two rows of the right upper sleeve in white (the medic)

function isViewItem(x: object): x is ViewItem {
  return 'S' in x;
}

export interface Look {
  /** Hair overlays (S head space), a buzz-cut remap, or a per-view item. */
  hair?: Overlay[] | Remap | ViewItem | ViewItem[];
  hat?: Overlay | ViewItem;
  glasses?: boolean;
  top: Top;
  bottoms: Bottoms;
  shoes: Footwear;
  details: Detail[];
  /** Overlays stamped last (mutations on top of the face), S only or per view. */
  extras?: Overlay[] | ViewItem | ViewItem[];
  /** Zombie sockets, mouth and cheek gash (default), or the plain base face. */
  face?: 'zombie' | 'plain';
  /** False drops the plain face's mouth (a drawn smile, a beard, a giant with its own teeth). */
  mouth?: boolean;
  /** False drops the hem line at the waist (a coat that carries on below it); true sews a torn top's rags to one. */
  hem?: boolean;
  /** Wide sleeves: a column let out past each arm's outline (a coat). */
  sleeves?: 'wide';
  colors: MaterialColors;
}

/**
 * The layer an item contributes in a view; S-only items (plain overlays, remaps) count for S alone. On a
 * walk step (D-095) an item's own drawing for that step wins; otherwise the view's drawing moves by the
 * step's column shift (figure space only: head-space parts follow the form's head map).
 */
function layer(
  item: Overlay | Overlay[] | Remap | ViewItem | ViewItem[] | undefined,
  view: HeroView,
  walk?: { key: WalkKey; dx: number; base?: ZombiePose['stepBase'] },
): ViewLayer {
  if (!item) return {};
  const dx = walk?.dx ?? 0;
  const pick = (i: ViewItem): ViewLayer => {
    if (!walk) return i[view] ?? {};
    if (i[walk.key]) return i[walk.key]!;
    // a turned step: the drawing made for the step it derives from, moved with the turn
    if (walk.base && i[walk.base.key]) return mapped(i[walk.base.key]!, walk.base.map);
    return shifted(i[view] ?? {}, dx);
  };
  const merge = (parts: ViewLayer[]): ViewLayer => ({
    overlays: parts.flatMap((p) => p.overlays ?? []),
    remaps: parts.flatMap((p) => p.remaps ?? []),
    lines: parts.flatMap((p) => p.lines ?? []),
  });
  const sOnly = (l: ViewLayer): ViewLayer => (view === 'S' ? shifted(l, dx) : {});
  if (Array.isArray(item)) {
    if (item.length && isViewItem(item[0]!)) return merge((item as ViewItem[]).map(pick));
    return sOnly({ overlays: item as Overlay[] });
  }
  if (isViewItem(item)) return pick(item);
  if ('sprite' in item) return sOnly({ overlays: [item] });
  return sOnly({ remaps: [item] });
}
function push(into: { remaps: Remap[]; lines: Seam[]; overlays: Overlay[] }, l: ViewLayer): void {
  into.remaps.push(...(l.remaps ?? []));
  into.lines.push(...(l.lines ?? []));
  into.overlays.push(...(l.overlays ?? []));
}

const ZOMBIE_EYES: MaterialColors = { eye: [222, 62, 48], white: [206, 196, 160] };
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
/** Camouflage blotches: three-cell shapes on a 6x4 tile (the reference draws marks as 2-4 cell shapes, never lone dots). */
/**
 * A layer's figure-space parts put through a column map (a three-quarter turn's). Each drawing moves as one
 * piece, by the shift most of its cells get: a rigid thing (a bag, a rifle across the back) must not tear
 * where the turn's deleted column crosses it.
 */
function mapped(l: ViewLayer, map: (x: number, y: number) => number): ViewLayer {
  const figure = (space: Space | undefined) => space !== 'head';
  const majority = (shifts: number[]): number => {
    const count = new Map<number, number>();
    for (const s of shifts) count.set(s, (count.get(s) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? 0;
  };
  const box = ([x0, y0, x1, y1]: Box): Box => {
    const shifts: number[] = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) shifts.push(map(x, y) - x);
    const s = majority(shifts);
    return [x0 + s, y0, x1 + s, y1];
  };
  const overlay = (o: Overlay): Overlay => {
    const shifts: number[] = [];
    for (let y = 0; y < o.sprite.h; y++)
      for (let x = 0; x < o.sprite.w; x++)
        if (o.sprite.cells[y * o.sprite.w + x] !== EMPTY)
          shifts.push(map(o.x + x, o.y + y) - (o.x + x));
    const s = majority(shifts);
    return s ? { ...o, x: o.x + s } : o;
  };
  return {
    overlays: l.overlays?.map((o) => (figure(o.space) ? overlay(o) : o)),
    remaps: l.remaps?.map((r) =>
      figure(r.space)
        ? { ...r, box: box(r.box), ...(r.except ? { except: r.except.map(box) } : {}) }
        : r,
    ),
    lines: l.lines?.map((m) => (figure(m.space) ? { ...m, box: box(m.box) } : m)),
  };
}

/** A layer's figure-space parts moved by `dx` columns (head-space parts follow the form's head map instead). */
function shifted(l: ViewLayer, dx: number): ViewLayer {
  if (!dx) return l;
  const box = ([x0, y0, x1, y1]: Box): Box => [x0 + dx, y0, x1 + dx, y1];
  const figure = (space: Space | undefined) => space !== 'head';
  return {
    overlays: l.overlays?.map((o) => (figure(o.space) ? { ...o, x: o.x + dx } : o)),
    remaps: l.remaps?.map((r) =>
      figure(r.space)
        ? { ...r, box: box(r.box), ...(r.except ? { except: r.except.map(box) } : {}) }
        : r,
    ),
    lines: l.lines?.map((m) => (figure(m.space) ? { ...m, box: box(m.box) } : m)),
  };
}

const CAMO_TILE = ['xx....', '.x..x.', '....xx', 'x.....'];
/**
 * Rows of marks keeping only the 4-connected groups of three or more cells: a mark cut to one or two
 * cells (by a box edge, an arm line) is a lone dot at 1x (D-093). `cell` gives the glyph at (x, y) or '.'.
 */
function cullSmallBlotches(w: number, h: number, cell: (x: number, y: number) => string): string[] {
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && cell(x, y) !== '.';
  const keep = new Set<number>();
  const seen = new Set<number>();
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!on(x, y) || seen.has(y * w + x)) continue;
      const comp: number[] = [];
      const stack: [number, number][] = [[x, y]];
      while (stack.length) {
        const [cx, cy] = stack.pop()!;
        const k = cy * w + cx;
        if (seen.has(k) || !on(cx, cy)) continue;
        seen.add(k);
        comp.push(k);
        stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
      }
      if (comp.length >= 3) for (const k of comp) keep.add(k);
    }
  const rows: string[] = [];
  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) row += keep.has(y * w + x) ? cell(x, y) : '.';
    rows.push(row);
  }
  return rows;
}
function camo(
  box: Box,
  glyph: string,
  except: readonly Box[] = [],
  onBody: (x: number, y: number) => boolean = () => true,
): Overlay {
  const [x0, y0, x1, y1] = box;
  const skip = (x: number, y: number) =>
    !onBody(x, y) ||
    except.some(([ex0, ey0, ex1, ey1]) => x >= ex0 && x <= ex1 && y >= ey0 && y <= ey1);
  return ov(
    x0,
    y0,
    cullSmallBlotches(x1 - x0 + 1, y1 - y0 + 1, (x, y) =>
      CAMO_TILE[y % 4]![x % 6] === 'x' && !skip(x0 + x, y0 + y) ? glyph : '.',
    ),
  );
}
/** Blood on a garment: three-cell blotches, two of them off the lit chest crease. */
const STAIN_ROWS = ['.DD....', '.D.....', '.....DD', 'DD....D', 'D....D.', '....DD.'];

/** Builds an outfit from a look laid on a pose's regions, for one view (zombies, mutants, soldiers and the cast alike). */
function build(id: string, label: string, pose: ZombiePose, look: Look, view: HeroView): Outfit {
  const out = { remaps: [] as Remap[], lines: [] as Seam[], overlays: [] as Overlay[] };
  const { remaps, lines, overlays } = out;
  const garments: Garment[] = [];
  const [tx0, ty0, tx1] = pose.torso;
  const hemY = pose.hem[1];
  const torso = (except: Box[], y1 = pose.torso[3]): Remap => {
    garments.push({
      kind: 'torso',
      box: [tx0, ty0, tx1, y1],
      material: 'cloth',
      except: [...pose.neck, ...except],
      // Buttons and pockets are on the front: the back views and the side view do not show them.
      placket: look.top === 'long' && (view === 'S' || view === 'SW') ? 'buttons' : 'none',
      pockets: look.details.includes('camo') && (view === 'S' || view === 'SW'),

      light: view === 'N' || view === 'NW' ? 'block' : 'full',
      turned: view === 'SW' || view === 'NW',
    });
    return { box: [tx0, ty0, tx1, y1], except: [...pose.neck, ...except], to: 'cloth' };
  };
  const sleeve = (side: 'L' | 'R', box: Box, cuff = false): Remap => {
    // A side view gives both sleeves the same box (the far arm is hidden): shade it once, as the near one.
    if (!garments.some((g) => g.kind === 'sleeve' && g.box.join() === box.join()))
      garments.push({
        kind: 'sleeve',
        side,
        box,
        material: 'cloth',
        cuff,
        ...(pose.sleeveExcept ? { except: pose.sleeveExcept } : {}),
        // A uniform's cuff is its second cloth (the darker green of the cap and the camo blotches).
        ...(cuff && look.details.includes('cuffs') && look.colors.cloth2
          ? { cuffMaterial: 'cloth2' as const }
          : {}),
        // Shoulder caps are let out too, so the coat's shoulder slopes evenly into the wider sleeve.
        ...(look.sleeves === 'wide' ? { letOut: 1 } : {}),
      });
    return { box, to: 'cloth', ...(pose.sleeveExcept ? { except: pose.sleeveExcept } : {}) };
  };
  const caps = pose.shoulders.map((box): Remap => sleeve(box[0] < tx0 ? 'L' : 'R', box));
  // The body's own cells (not empty, not outline), for details that must not land on a line.
  const body = toAscii(buildForm(pose.form));
  const collar = pose.collar.map(seam);
  // A dress is one piece, a coat carries on: no hem line at the waist.
  const waist = look.bottoms === 'dress' || look.hem === false ? [] : [seam(pose.hem)];
  switch (look.top) {
    case 'tee': {
      remaps.push(
        torso([]),
        ...caps,
        sleeve('L', pose.sleeveL.short),
        sleeve('R', pose.sleeveR.short),
      );
      lines.push(...collar, ...waist);
      // The neckband: a V of deep cloth under the collar line, on the front views.
      const seg = pose.collar[pose.collar.length - 1]!;
      if (view === 'S' || view === 'SW') {
        const cw = seg[2] - seg[0] + 1;
        const half = Math.floor(cw / 2);
        overlays.push(
          ov(seg[0], seg[1] + 1, [
            'v'.repeat(cw),
            '.'.repeat(half) + 'v' + '.'.repeat(cw - half - 1),
          ]),
        );
      }
      break;
    }
    case 'torn': {
      // two-cell holes at the hem; above a sewn hem line (`hem: true`) they sit one row higher, whole
      const holeY = look.hem ? hemY - 1 : hemY;
      const holes: Box[] = [pose.frayedXs[0]! + 1, pose.frayedXs[2] ?? pose.frayedXs[0]! + 1].map(
        (x) => [x, holeY - 1, x, holeY],
      );
      remaps.push(
        torso(holes),
        ...caps,
        sleeve('L', pose.sleeveL.torn ?? pose.sleeveL.short),
        sleeve('R', pose.sleeveR.short),
      );
      // `hem: true` sews the rags to a hem line (the crawler's shirt parted from its hips at 1x, fourth review)
      // on a step derived from a stance (D-101) a frayed cell with no line beside it (the stance's crotch
      // line used to sit under it) would be a lone dot: that rag stays unsewn
      const frayed = pose.snapItems
        ? pose.frayedXs.filter((x) =>
            [-1, 0, 1].some((ay) =>
              [-1, 0, 1].some((ax) => (ax || ay) && body[hemY + ay]?.[x + ax] === 'o'),
            ),
          )
        : pose.frayedXs;
      lines.push(...collar, ...(look.hem ? waist : frayed.map((x) => seam([x, hemY, x, hemY]))));
      break;
    }
    case 'long':
      remaps.push(
        torso([]),
        ...caps,
        sleeve('L', pose.sleeveL.long, true),
        sleeve('R', pose.sleeveR.long, true),
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
      // A bare torso still ends on the trousers' waistband: the hem line stays.
      if (look.bottoms === 'pants' || look.bottoms === 'shorts') lines.push(...waist);
      break;
  }
  const kneePads = look.details.includes('kneepads');
  const onBody = (x: number, y: number) => !'.o'.includes(body[y]?.[x] ?? '.');
  // A stride parts the legs at a column of its own and may put the near leg on the right (D-095).
  const legs = {
    ...(pose.legSplit !== undefined ? { split: pose.legSplit } : {}),
    ...(pose.nearLeg ? { near: pose.nearLeg } : {}),
  };
  // hands hanging into the leg boxes (a stance's arms over a derived step, D-101) stay bare
  const legExcept = pose.legExcept ? { except: pose.legExcept } : {};
  if (look.bottoms === 'pants') {
    remaps.push(...pose.pants.map((box): Remap => ({ box, to: 'pants', ...legExcept })));
    garments.push({
      kind: 'pants',
      box: pose.pants,
      material: 'pants',
      kneePads,
      ...legs,
      ...legExcept,
    });
  }
  if (look.bottoms === 'shorts') {
    remaps.push(...pose.shorts.map((box): Remap => ({ box, to: 'pants', ...legExcept })));
    garments.push({ kind: 'pants', box: pose.shorts, material: 'pants', ...legs, ...legExcept });
  }
  if (look.bottoms === 'skirt') overlays.push(ov(pose.skirt.x, pose.skirt.y, pose.skirt.rows));
  if (look.bottoms === 'dress') {
    const d = pose.dress ?? pose.skirt;
    overlays.push(ov(d.x, d.y, d.rows));
  }
  if (look.shoes === 'both') {
    remaps.push(
      { box: pose.shoeL, to: 'boots', ...legExcept },
      { box: pose.shoeR, to: 'boots', ...legExcept },
    );
    garments.push({
      kind: 'boots',
      box: [pose.shoeL, pose.shoeR],
      material: 'boots',
      ...legExcept,
    });
  }
  if (look.shoes === 'right') {
    remaps.push({ box: pose.shoeR, to: 'boots', ...legExcept });
    garments.push({ kind: 'boots', box: pose.shoeR, material: 'boots', ...legExcept });
  }
  if (look.shoes === 'flats') {
    remaps.push(...pose.flats.map((box): Remap => ({ box, to: 'boots', ...legExcept })));
    garments.push({ kind: 'boots', box: pose.flats, material: 'boots', ...legExcept });
  }
  // On a walk step, items pick their step drawing or move with the step's canvas (D-095).
  const walk = pose.walkKey
    ? { key: pose.walkKey, dx: pose.extrasDx ?? 0, base: pose.stepBase }
    : undefined;
  const hairLayer = layer(look.hair, view, walk);
  push(out, hairLayer);
  if (look.glasses) push(out, layer(GLASSES_V, view, walk));
  if (look.details.includes('scalp')) push(out, layer(ZOMBIE_SCALP_V, view, walk));
  if ((look.face ?? 'zombie') === 'zombie') {
    push(out, layer(ZOMBIE_FACE_V, view, walk));
    push(out, layer(ZOMBIE_CHEEK_V, view, walk));
  } else if (look.mouth !== false) push(out, layer(MOUTH_V, view, walk));
  // Hats go on after the face so a scalp wound or cheek gash never lands on the hat.
  push(out, layer(look.hat, view, walk));
  for (const d of look.details) {
    const chest = pose.chest;
    if (d === 'stains' && pose.stains) {
      // one column right of the anchor: the first stain pair stays off the chest crease's lit cells; inside
      // the torso's own columns (the turned torso is narrower: a blotch on the arm line cut the line, D-093)
      const sx = pose.stains[0] + 1;
      overlays.push(
        ov(
          sx,
          pose.stains[1],
          // and above the reflective bands when the look has them (a band cuts a blotch to a dot)
          cullSmallBlotches(STAIN_ROWS[0]!.length, STAIN_ROWS.length, (x, y) =>
            sx + x > tx0 &&
            sx + x < tx1 &&
            (!look.details.includes('hivis') || pose.stains![1] + y < hemY - 3)
              ? STAIN_ROWS[y]![x]!
              : '.',
          ),
        ),
      );
    }
    if (d === 'gash' && pose.gash) {
      // Above the reflective bands when the look has them (a gash cut by a band leaves two lone cells).
      const gy = look.details.includes('hivis') ? Math.min(pose.gash[1], hemY - 6) : pose.gash[1];
      overlays.push(ov(pose.gash[0], gy, ['d', 'd', 'd']));
    }
    if (d === 'hivis') {
      // Two reflective bands above the hem, at the same rows and the same width in every view (chest-relative
      // rows put one of them on the trousers and at different heights front and back).
      const stripe = 'w'.repeat(tx1 - tx0 - 1);
      overlays.push(ov(tx0 + 1, hemY - 3, [stripe]), ov(tx0 + 1, hemY - 1, [stripe]));
    }
    if (d === 'badge' && chest) overlays.push(ov(chest[0], chest[1], ['ww', 'ww']));
    if (d === 'armband') {
      // the sleeve's cloth two rows below its top goes white; a remap, so the arm's outline stays (D-089).
      // Not on a one-column far arm (the turned back view): the band would cut its cloth into fragments.
      const b = pose.sleeveR.long;
      if (b[2] - b[0] >= 4)
        remaps.push({ box: [b[0], b[1] + 2, b[2], b[1] + 3], from: ['cloth'], to: 'white' });
    }
    // A tear below the chest anchor baring the skin: two offset pairs read as a jagged hole (the garment's
    // own fold shadows frame it), only where the belly faces the viewer.
    if (d === 'rip' && chest && (view === 'S' || view === 'SW'))
      // staggered the way that leaves the fold shadows beside it in pairs (the turned torso is narrower)
      overlays.push(ov(chest[0] + 2, chest[1] + 3, view === 'S' ? ['ss.', '.ss'] : ['.ss', 'ss.']));
    if (d === 'belt' && pose.belt) {
      // The belt is the hem row and the row above it in leather, with a two-by-two buckle on the front
      // views placed so no belt piece beside it is under two columns (D-093: one-row belt pieces and a
      // two-cell buckle were fragments at 1x).
      const [hx0, hy, hx1] = pose.hem;
      // the boots' dark brown, as the reference's belt; only on the body's own cells (a fist swung in front
      // of the hip on a walk step puts its outline on the belt rows, D-095)
      const strap = (y: number) =>
        Array.from({ length: hx1 - hx0 + 1 }, (_, i) => (onBody(hx0 + i, y) ? 'b' : '.')).join('');
      overlays.push(ov(hx0, hy - 1, [strap(hy - 1), strap(hy)]));
      if (view === 'S' || view === 'SW') {
        const bx = Math.min(pose.belt[0], hx1 - 3);
        overlays.push(ov(bx, hy - 1, ['ww', 'ww']));
      }
    }
    if (d === 'tie' && pose.tie)
      overlays.push(ov(...pose.tie, ['l', 'l', 'l', 'L', 'L', 'L', 'L']));
    if (d === 'number' && pose.number) overlays.push(ov(...pose.number, ['xxx', '..x', '..x']));
    if (d === 'camo')
      overlays.push(
        // darker-green blotches (cloth2); only on the body's own cells and none on the torso's exceptions (a
        // walk step's torso box holds the outline of the arm swung across the chest: a blotch cut by it is a dot,
        // D-095)
        camo(
          // below the collar line, or from the torso top when the view draws no collar (the crawl in profile)
          [
            tx0 + 1,
            pose.collar.length ? pose.collar[pose.collar.length - 1]![1] + 1 : ty0,
            tx1 - 1,
            hemY - 1,
          ],
          'k',
          pose.neck,
          onBody,
        ),
      );
  }
  const extras = layer(look.extras, view, walk);
  if (pose.snapItems && extras.overlays)
    extras.overlays = extras.overlays.map((o) => snapToBody(o, body));
  push(out, extras);
  return {
    id,
    label,
    form: pose.form,
    remaps,
    garments,
    lines,
    overlays,
    colors: look.colors,
    view,
  };
}

/**
 * A figure-space overlay beside the body (a baton on the hip) moved sideways
 * until it touches the body again: on a step derived from a stance (D-101) the
 * stride's hips are narrower than the stance's, and an item left where the
 * stance's hip was would float. The item keeps its rows; the smallest gap over
 * its rows closes, so it never overlaps the body.
 */
function snapToBody(o: Overlay, body: string[]): Overlay {
  if (o.space === 'head') return o;
  const on = (x: number, y: number) => !'.o'.includes(body[y]?.[x] ?? '.') || body[y]?.[x] === 'o';
  const W = body[0]?.length ?? 0;
  let x0 = Infinity;
  let x1 = -Infinity;
  for (let y = 0; y < o.sprite.h; y++)
    for (let x = 0; x < o.sprite.w; x++)
      if (o.sprite.cells[y * o.sprite.w + x] !== EMPTY) {
        x0 = Math.min(x0, o.x + x);
        x1 = Math.max(x1, o.x + x);
      }
  if (x0 === Infinity) return o;
  // the side of the body the item is on: toward the body's centre line at its rows
  let gapRight = Infinity; // body cells to the right of the item
  let gapLeft = Infinity; // body cells to the left of the item
  for (let y = o.y; y < o.y + o.sprite.h; y++) {
    for (let x = x1 + 1; x < W; x++)
      if (on(x, y)) {
        gapRight = Math.min(gapRight, x - x1 - 1);
        break;
      }
    for (let x = x0 - 1; x >= 0; x--)
      if (on(x, y)) {
        gapLeft = Math.min(gapLeft, x0 - 1 - x);
        break;
      }
  }
  const dx = gapRight <= gapLeft ? gapRight : -gapLeft;
  return closeOverlay(Number.isFinite(dx) && dx !== 0 ? { ...o, x: o.x + dx } : o, body);
}

/**
 * An item's material cell that faces neither the body nor the item's own
 * cells gets a line cell there: a baton lying along a thigh keeps its edge
 * where the stride's leg has moved away from it.
 */
function closeOverlay(o: Overlay, body: string[]): Overlay {
  const covered = (x: number, y: number) => (body[y]?.[x] ?? '.') !== '.';
  const own = (x: number, y: number) =>
    x >= o.x && y >= o.y && x < o.x + o.sprite.w && y < o.y + o.sprite.h
      ? o.sprite.cells[(y - o.y) * o.sprite.w + x - o.x]!
      : EMPTY;
  const add = new Map<string, [number, number]>();
  for (let y = 0; y < o.sprite.h; y++)
    for (let x = 0; x < o.sprite.w; x++) {
      const v = o.sprite.cells[y * o.sprite.w + x]!;
      if (v === EMPTY || Math.floor(v / 8) === MATERIALS.indexOf('line')) continue;
      for (const [ax, ay] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const X = o.x + x + ax;
        const Y = o.y + y + ay;
        if (own(X, Y) === EMPTY && !covered(X, Y)) add.set(`${X},${Y}`, [X, Y]);
      }
    }
  if (add.size === 0) return o;
  const xs = [o.x, o.x + o.sprite.w - 1, ...[...add.values()].map((p) => p[0])];
  const ys = [o.y, o.y + o.sprite.h - 1, ...[...add.values()].map((p) => p[1])];
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const w = Math.max(...xs) - x0 + 1;
  const h = Math.max(...ys) - y0 + 1;
  const cells = new Int16Array(w * h).fill(EMPTY);
  for (let y = 0; y < o.sprite.h; y++)
    for (let x = 0; x < o.sprite.w; x++)
      cells[(o.y + y - y0) * w + o.x + x - x0] = o.sprite.cells[y * o.sprite.w + x]!;
  for (const [X, Y] of add.values()) cells[(Y - y0) * w + X - x0] = packCell(LEGEND.o!);
  return { ...o, x: x0, y: y0, sprite: { w, h, cells } };
}

/** The outfit of a look on any pose in any drawn view: what the registry's bodies render with (D-100). */
export const buildOutfit = build;

/** The S-view outfit of a look on a pose. */
function wear(id: string, label: string, pose: ZombiePose, look: Look): Outfit {
  return build(id, label, pose, look, 'S');
}

/** Looks on zombie poses, kept so they can be dressed in the other views (poseInView). */
export const POSED_LOOKS: { id: string; label: string; pose: ZombiePose; look: Look }[] = [];
function wearPosed(id: string, label: string, pose: ZombiePose, look: Look): Outfit {
  POSED_LOOKS.push({ id, label, pose, look });
  return wear(id, label, pose, look);
}

/** Every posed look dressed for one view; poses without that view drawn yet are left out. */
export function posedInView(view: HeroView): Outfit[] {
  const out: Outfit[] = [];
  for (const z of POSED_LOOKS) {
    const pose = poseInView(z.pose, view);
    if (pose) out.push(build(z.id, z.label, pose, z.look, view));
  }
  return out;
}

/** The outfit of a look on the standing base figure in a drawn view. */
export function wearView(id: string, label: string, look: Look, view: HeroView): Outfit {
  return build(id, label, STAND_VIEWS[view], look, view);
}

/** Civilian man: drooped stance, torn tee, jeans, one shoe lost, messy short hair. */
export const ZOMBIE_CIV_M = wearPosed('zombie_civ_m', 'Zombie dân thường (nam)', POSE_DROOP, {
  hair: HAIR_SHORT_V,
  top: 'torn',
  bottoms: 'pants',
  shoes: 'right',
  details: ['scalp', 'gash', 'stains'],
  colors: {
    skin: SKIN_M,
    hair: [60, 50, 42],
    cloth: [98, 120, 138], // blue-grey tee, away from the woman's warm top (D-089)
    pants: [62, 60, 66],
    boots: [52, 46, 40],
    ...BLOOD,
    ...ZOMBIE_EYES,
  },
});

/** Civilian woman: twisted neck, long hair, blouse, torn skirt, flats. */
export const ZOMBIE_CIV_F = wearPosed('zombie_civ_f', 'Zombie dân thường (nữ)', POSE_TWIST, {
  hair: HAIR_LONG_V,
  top: 'tee',
  bottoms: 'skirt',
  shoes: 'flats',
  details: ['gash', 'stains'],
  colors: {
    skin: SKIN_F,
    hair: [104, 56, 48], // auburn: both civilians had near-black hair (D-089)
    cloth: [214, 124, 152],
    cloth2: [70, 60, 92],
    boots: [60, 40, 50],
    ...BLOOD,
    ...ZOMBIE_EYES,
  },
});

/** Construction worker: reaching, hard hat, hi-vis shirt, jeans, boots. */
export const ZOMBIE_WORKER = wearPosed('zombie_worker', 'Zombie công nhân', POSE_REACH, {
  hat: HARD_HAT_V,
  top: 'tee',
  bottoms: 'pants',
  shoes: 'both',
  details: ['stains', 'gash', 'hivis'], // the bands last: blood does not break them
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
export const ZOMBIE_POLICE = wearPosed('zombie_police', 'Zombie cảnh sát', POSE_DROOP_M, {
  hat: POLICE_CAP_V,
  top: 'long',
  bottoms: 'pants',
  shoes: 'both',
  details: ['badge', 'belt', 'stains'],
  extras: POLICE_GEAR_V,
  colors: {
    skin: SKIN_M,
    accent: [200, 40, 50], // the cap band: the one red in the green group, legible at 1x (fourth review)
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
export const ZOMBIE_SOLDIER = wearPosed('zombie_soldier', 'Zombie quân đội', POSE_HUNCH, {
  hat: HELMET_V,
  top: 'long',
  bottoms: 'pants',
  shoes: 'both',
  details: ['camo', 'stains', 'belt', 'cuffs', 'kneepads', 'rip'],
  colors: {
    skin: SKIN_M, // the zombies' grey-green on the bare forearms, not the live soldiers' skin (fourth review)
    ...ARMY,
    // the uniform rotted to grey-olive: Lính Nhiễm keeps the live olive, so the two part at 1x (D-089)
    cloth: [92, 96, 80],
    pants: [84, 86, 74],
    cloth2: [66, 70, 56],
    eye: [150, 80, 40],
    ...BLOOD,
    ...ZOMBIE_EYES,
  },
});

/** Sores on both bare forearms (drag pose). */
const SORES: Overlay[] = [ov(1, 24, ['DD', 'D.', '.D', 'DD']), ov(13, 25, ['.DD', '.D.'])];
/** Dog tag on the sternum: two cells hanging from the pose's chest anchor row, column +2 (below the tee's neckband). */
const dogTag = (pose: ZombiePose): Overlay => {
  const [cx, cy] = pose.chest ?? [6, 20];
  return ov(cx + 2, cy, ['w.', 'ww']); // chain cell over a two-cell plate: three cells (D-093)
};

/** Lính Nhiễm, the infected soldier (NPC): helmet, olive uniform with one sleeve torn off, sores on the forearms, dog tag, dragging a leg. */
export const LINH_NHIEM = wearPosed('linh_nhiem', 'Lính Nhiễm', POSE_DRAG, {
  hat: HELMET_V,
  top: 'torn',
  bottoms: 'pants',
  shoes: 'both',
  details: ['stains', 'belt', 'kneepads'],
  extras: [...SORES, dogTag(POSE_DRAG)],
  colors: {
    skin: [184, 186, 156],
    ...ARMY,
    eye: [150, 80, 40],
    ...BLOOD,
    ...ZOMBIE_EYES,
  },
});

/** Athlete (man): drooped stance mirrored, sweatband, sleeveless jersey with a number, shorts, sneakers. */
export const ZOMBIE_ATHLETE_M = wearPosed(
  'zombie_athlete_m',
  'Zombie vận động viên (nam)',
  POSE_DROOP_M,
  {
    hair: [HAIR_SHORT_V, HEADBAND_V],
    top: 'tank',
    bottoms: 'shorts',
    shoes: 'both',
    details: ['number', 'gash', 'stains'],
    colors: {
      skin: SKIN_M,
      hair: [60, 54, 54],
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
export const ZOMBIE_ATHLETE_F = wearPosed(
  'zombie_athlete_f',
  'Zombie vận động viên (nữ)',
  POSE_DRAG_M,
  {
    hair: HAIR_PONYTAIL_V,
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
export const ZOMBIE_OFFICE = wearPosed(
  'zombie_office',
  'Zombie nhân viên văn phòng',
  POSE_TWIST_M,
  {
    hair: BUZZ_V,
    glasses: true,
    top: 'long',
    bottoms: 'pants',
    shoes: 'both',
    details: ['stains', 'tie'], // the tie over the blood: a stain cut the tie in two at 1x (D-093)
    colors: {
      skin: SKIN_M,
      hair: [118, 116, 112], // grey: with black hair he paired with Dương at 1x (D-089)
      cloth: [214, 214, 210], // off-white shirt with room for a light step
      leather: [120, 30, 40],
      pants: [50, 50, 60],
      boots: [30, 30, 34],
      ...BLOOD,
      ...ZOMBIE_EYES,
    },
  },
);

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
    ...hov(-1, -3, [
      '.oo..',
      'osso.',
      'osso.',
      'ossSo',
      'osSo.',
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
    ...hov(13, -3, [
      '..oo.',
      '.osso',
      '.osso',
      'oSsso',
      '.oSso',
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
const SEALED_EYES_V: ViewItem = { S: same(SEALED_EYES), N: {}, NW: {}, ...SEALED_EYES_VIEWS };
/** The ears stand beside the skull and rise three rows over it in every view; in profile the near ear is a leaf leaning back past the skull. */
const BIG_EARS_V: ViewItem = {
  S: { overlays: BIG_EARS },
  SW: { overlays: BIG_EARS },
  N: { overlays: BIG_EARS },
  NW: { overlays: BIG_EARS },
  W: BIG_EAR_W,
};

/** Carapace behind the heavy body (stamped only on empty cells) and plates over the shoulders. */
const SHELL_HUMP: Overlay = {
  ...ov(0, 2, [
    '........ooooooo........',
    '......oo|lllll|oo......',
    '.....o||llllllll|o.....',
    '....o||llllllllll|o....',
    '...o||llllllllllllLo...',
    '..o|oooooooooooooooLo..',
    '.o||llllllllllllllllLo.',
    'o||llllllllllllllllllLo',
    'o|llllllllllllllllllLLo',
    'o|llllllllllllllllllLLo',
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
const BRUTE_MAW = ov(11, 18, ['oxoxoxoxoxo', 'ooooooooooo']);
const BRUTE_BOILS = ov(12, 33, [
  '.aa.....',
  '.a......',
  '........',
  '......aa',
  '.......a',
  '........',
  'aa......',
  'a.......',
  '.....aa.',
  '.....a..',
]); // boils of three cells (D-093)

/** Kẻ Thính: blind, hears everything. Upright, feeling forward; pale, huge ears, eyes sewn shut, rags. */
export const KE_THINH = wearPosed('ke_thinh', 'Kẻ Thính', POSE_REACH, {
  top: 'torn',
  bottoms: 'shorts',
  shoes: 'none',
  details: ['stains', 'gash'],
  extras: [BIG_EARS_V, SEALED_EYES_V],
  colors: {
    skin: [196, 196, 186],
    cloth: [120, 110, 100],
    pants: [70, 66, 62],
    ...BLOOD,
    ...ZOMBIE_EYES,
  },
});

/** Kẻ Bám Trần: the ceiling crawler on the ground, crouched with long clawed arms, yellow eyes. */
export const KE_BAM_TRAN = wearPosed('ke_bam_tran', 'Kẻ Bám Trần', POSE_CRAWL, {
  top: 'torn',
  hem: true,
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

/**
 * The carapace in the other views. Its top sits at row 4 (hidden behind the
 * head in S, so S does not fix it). From behind it covers the back and the
 * upper arms and hides all of the head but the crown; from the side it is the
 * dome behind the back (stamped under the body); the three-quarter views
 * shift the back drawing towards the near side.
 */
const SHELL_BACK = [
  '........ooooooo........',
  '......oo|lllll|oo......',
  '.....o|lllllllll|o.....',
  '....ooooooooooooooo....',
  '...o|lllllllllllllLo...',
  '..o|lllllllllllllllLo..',
  '.o|lllllllllllllllllLo.',
  'o|lllllllllllllllllllLo',
  'ooooooooooooooooooooooo',
  'o|lllllllllllllllllllLo',
  'o|lllllllllllllllllllLo',
  'o|lllllllllllllllllllLo',
  'o|lllllllllllllllllllLo',
  'ooooooooooooooooooooooo',
  'o|lllllllllllllllllllLo',
  'o|lllllllllllllllllllLo',
  'o|lllllllllllllllllllLo',
  'o|lllllllllllllllllllLo',
  'ooooooooooooooooooooooo',
  'o|lllllllllllllllllllLo',
  'o|lllllllllllllllllllLo',
  '.o|lllllllllllllllllLo.',
  '.o|lllllllllllllllllLo.',
  '..ooooooooooooooooooo..',
  '..o|lllllllllllllllLo..',
  '...o|lllllllllllllLo...',
  '....oLLLLLLLLLLLLLo....',
  '.....ooooooooooooo.....',
];
const SHELL_SIDE = [
  '..ooooooo.....',
  '.o||lllllLo...',
  'o|||llllllLo..',
  'oooooooooooo..',
  'o||lllllllLLo.',
  'o|lllllllllLLo',
  'o|lllllllllLLo',
  'o|lllllllllLLo',
  'oooooooooooooo',
  'o|lllllllllLLo',
  'o|lllllllllLLo',
  'o|lllllllllLLo',
  'o|lllllllllLLo',
  'oooooooooooooo',
  'o|lllllllllLLo',
  'o|lllllllllLLo',
  'o|lllllllllLLo',
  'o|lllllllllLLo',
  'oooooooooooooo',
  'o|lllllllllLLo',
  'o|lllllllllLLo',
  'o|llllllllLLo.',
  'o|lllllllLLo..',
  'oooooooooooo..',
  'o|llllllLLo...',
  'o|lllllLLo....',
  'oLLLLLLLo.....',
  'oooooooo......',
];
const PLATE_L = ['oooooo', 'o|llLo', 'ollllo', 'oLlLLo', 'oooooo'];
const PLATE_R = ['oooooo', 'oLll|o', 'ollllo', 'oLLlLo', 'oooooo'];
/** Carapace and shoulder plates per view. */
const SHELL_V: ViewItem = {
  S: { overlays: [SHELL_HUMP, ...SHELL_PLATES] },
  SW: {
    overlays: [{ ...ov(3, 4, SHELL_BACK), under: true }, ov(2, 16, PLATE_L), ov(17, 16, PLATE_R)],
  },
  W: { overlays: [{ ...ov(12, 4, SHELL_SIDE), under: true }, ov(5, 15, PLATE_L)] },
  NW: { overlays: [ov(3, 4, SHELL_BACK)] },
  N: { overlays: [ov(0, 4, SHELL_BACK)] },
};

/** Pustules on the swollen torso per view (figure space of the fat build). */
const PUSTULES_V: ViewItem = {
  S: same(PUSTULES),
  SW: same(ov(8, 23, ['...aa....', '...a...**', '.......*.', '....aa...', '....a....'])),
  W: {
    overlays: [
      ov(9, 22, ['.aa..', '.a...', '..**.', '...*.', 'aa...', 'a....']),
      ov(1, 25, ['aa']),
    ],
  },
  NW: same(ov(7, 22, ['..aa.....', '..a...**.', '.......*.', '...aa.a..', '...a..aa.'])),
  N: same(ov(7, 22, ['..aa.....', '..a...**.', '.......*.', '...aa.a..', '...a..aa.'])),
};

/** Kẻ Phun, the bloated spore spitter: fat build, bare swollen torso with pustules, torn trousers. */
const KE_PHUN_LOOK: Look = {
  top: 'none',
  bottoms: 'pants',
  shoes: 'both',
  details: [],
  face: 'plain',
  mouth: false, // the bloated head doubles its middle columns and would split a two-cell mouth
  extras: PUSTULES_V,
  colors: {
    skin: [150, 172, 112],
    pants: [66, 58, 54],
    boots: [60, 52, 44],
    accent: [230, 200, 80],
    eye: [210, 170, 50],
    white: [200, 190, 150],
  },
};
export const KE_PHUN = wearPosed('ke_phun', 'Kẻ Phun', STAND_FAT, KE_PHUN_LOOK);

/**
 * A shaven head: the base heads keep the back of the skull in shadow where
 * hair normally sits, which reads as dark hair on a bald man from the side.
 * These lighten that zone to mid skin. S needs nothing; the back views keep
 * the base nape (D-092).
 */
const BALD_V: ViewItem = {
  S: {},
  SW: same(hov(10, 8, ['...s.', '...s.', '..s..', '.s...', 's....'])),
  W: same(
    hov(7, 1, [
      '.ss..',
      '...s.',
      '.....',
      '...s.',
      '...s.',
      '..ss.',
      '..ss.',
      '...s.',
      '...s.',
      '..s..',
      'sss..',
      '.....',
      '.s...',
    ]),
  ),
  // N/NW: the base nape (D-092) already reads as a shaven skull: lit dome, shadow cup, ears.
  NW: {},
  N: {},
};

/** Hùng: heavy build, headband, grey tank top, khaki shorts to the knee, boots; shaven head. */
const HUNG_LOOK: Look = {
  hair: [BALD_V, HEADBAND_V],
  top: 'tank',
  bottoms: 'shorts',
  shoes: 'both',
  details: [],
  face: 'plain',
  colors: {
    skin: [196, 140, 96],
    cloth: [150, 150, 150],
    pants: [156, 118, 70],
    boots: [70, 60, 54],
    accent: [72, 170, 96],
    eye: [150, 80, 40],
    white: [212, 230, 238],
  },
};
export const HUNG = wearPosed('hung', 'Hùng', STAND_HEAVY, HUNG_LOOK);

/** Kẻ Mang Vỏ: heavy build with a chitin carapace behind and plates over the shoulders, bare torso, torn shorts. */
const KE_MANG_VO_LOOK: Look = {
  top: 'none',
  bottoms: 'shorts',
  shoes: 'none',
  details: [],
  extras: SHELL_V,
  colors: {
    skin: [160, 152, 132],
    leather: [92, 72, 58],
    pants: [64, 58, 52],
    eye: [220, 120, 40],
    white: [200, 190, 170],
    ...BLOOD,
  },
};
export const KE_MANG_VO = wearPosed('ke_mang_vo', 'Kẻ Mang Vỏ', STAND_HEAVY, KE_MANG_VO_LOOK);

/** The brute's maw and boils per view (figure space of the brute in that view); its eyes are drawn in the figure. */
const BRUTE_FACE_V: ViewItem = {
  S: { overlays: [BRUTE_MAW, BRUTE_BOILS] },
  SW: {
    overlays: [ov(10, 18, ['oxoxoxoxoxo', 'ooooooooooo']), BRUTE_BOILS],
  },
  W: {
    overlays: [
      ov(3, 17, ['oxoxoxo', 'ooooooo']),
      ov(12, 30, ['.aa.', '.a..', '..aa', '...a', 'aa..', 'a...', '.aa.', '.a..']),
    ],
  },
  NW: {
    overlays: [
      ov(10, 30, ['.aa...', '.a....', '....aa', '.....a', 'aa....', 'a.....', '..aa..', '..a...']),
    ],
  },
  N: {
    overlays: [
      ov(10, 30, ['.aa...', '.a....', '....aa', '.....a', 'aa....', 'a.....', '..aa..', '..a...']),
    ],
  },
};

/** Đột Biến: the ×1.5 giant with a mutated claw arm, bone spikes, a bulging eye and a maw. */
const DOT_BIEN_LOOK: Look = {
  top: 'none',
  bottoms: 'pants',
  shoes: 'none',
  details: [],
  face: 'plain',
  mouth: false,
  extras: BRUTE_FACE_V,
  colors: {
    skin: [150, 162, 128],
    pants: [60, 56, 60],
    eye: [210, 40, 40],
    white: [236, 230, 210],
    accent: [230, 200, 80],
    ...BLOOD,
  },
};
export const DOT_BIEN = wearPosed('dot_bien', 'Đột Biến', STAND_BRUTE, DOT_BIEN_LOOK);

/**
 * Hair of the mimic (head space): black hair to the shoulders, matted,
 * strands sticking out at the sides and ragged ends on the shoulders. The
 * face stays visible, as on the game's own sprite.
 */
const HAIR_WILD = hov(0, 0, [
  '......ooooo......',
  '....oohhhhhoo....',
  '...ohhhhhhhhho...',
  '..ohhhhhhhhhhho..',
  '..ohhhhhhhhhhho..',
  '.ohhhhhhhhhhhhho.',
  '.ohhhhhhhhhhhhho.',
  '.ohh...hhhhhhhho.',
  '.ohhh..hhh..hhho.',
  '.ohh...hh....hho.',
  'ohhh....h....hho.',
  '.ohh.........hhho',
  '.ohh.........hho.',
  '.ohh.........hho.',
  'ohhh.........hhho',
  '.ohh.........hho.',
  '.oho.........oho.',
  '..o...........o..',
]);
/** Sunken sockets with a glowing point in each. */
/** Sunken sockets around the standard eye module: a shadow at the top-outer corner and down the inner side of each three-cell iris, whites outside-below. */
const SUNKEN_EYES = hov(5, 9, ['SES.SES', 'xES.SEx', 'xe...ex']);
/** A smile far too wide: corners lifted at the cheeks, a line across the face, bared teeth above the chin. */
const WIDE_SMILE = hov(4, 11, ['o.......o', '.ooooooo.', '..xxxxx..']);
/** Blood dripping down the dress. */
const DRESS_STAINS = ov(4, 30, ['....DD...', '....D....', '.DD......', '..D....D.', '......DD.']);

/**
 * Kẻ Bắt Chước: stands still like a person (base figure), a dirty off-white
 * slip dress to the shins with a torn hem, bare feet, shoulder-length black
 * hair, red points in sunken sockets and a smile too wide.
 */
const HAIR_WILD_V: ViewItem = { S: same(HAIR_WILD), ...HAIR_WILD_VIEWS };
/** The mimic's face: red points in sunken sockets and a smile too wide; nothing from behind. */
const MIMIC_FACE_V: ViewItem = {
  S: { overlays: [SUNKEN_EYES, WIDE_SMILE] },
  SW: MIMIC_FACE_VIEWS.SW!,
  W: MIMIC_FACE_VIEWS.W!,
};
/** Blood dripping down a dress, on every side; the walk steps carry their own drawing (D-095). */
const DRESS_STAINS_V: ViewItem = {
  S: same(DRESS_STAINS),
  SW: same(DRESS_STAINS),
  W: DRESS_STAINS_W,
  N: same(DRESS_STAINS),
  NW: same(DRESS_STAINS),
  ...DRESS_STAINS_WALK,
};
const KE_BAT_CHUOC_LOOK: Look = {
  hair: HAIR_WILD_V,
  top: 'tank',
  bottoms: 'dress',
  shoes: 'none',
  details: [],
  face: 'plain',
  mouth: false,
  extras: [MIMIC_FACE_V, DRESS_STAINS_V],
  colors: {
    skin: [184, 184, 164],
    hair: [58, 52, 54],
    cloth: [214, 203, 182], // dirty off-white with room for a light step
    cloth2: [214, 203, 182],
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
  hat: HELMET_V,
  top: 'long',
  bottoms: 'pants',
  shoes: 'both',
  details: ['camo', 'belt', 'cuffs', 'kneepads'],
  face: 'plain',
  extras: RIFLE_SLUNG_V,
  colors: { skin: [226, 186, 150], eye: [150, 80, 40], white: [212, 230, 238], ...ARMY },
};
export const LINH_NON_SAT = wear('linh_non_sat', 'Lính nón sắt', POSE_STAND, LINH_NON_SAT_LOOK);

/** Officer: beret, plain jacket, belt, insignia on the chest. */
const LINH_MU_NOI_LOOK: Look = {
  hat: BERET_V,
  top: 'long',
  bottoms: 'pants',
  shoes: 'both',
  details: ['belt', 'badge', 'cuffs', 'kneepads'],
  face: 'plain',
  extras: MAP_CASE_V,
  // the one maroon in the green group: beret and cuffs; the uniform a step darker and bluer than the line
  // infantry so the pair with the female soldier parts at 1x (D-089)
  colors: {
    skin: [214, 170, 132],
    eye: [150, 80, 40],
    white: [212, 230, 238],
    ...ARMY,
    cloth: [80, 92, 72],
    pants: [70, 76, 62],
    cloth2: [118, 42, 54],
  },
};
export const LINH_MU_NOI = wear('linh_mu_noi', 'Lính mũ nồi', POSE_STAND, LINH_MU_NOI_LOOK);

/** The dog tag on the standing figure's sternum (front view only: the tee's neckband hides it when turned). */
const DOG_TAG_V: ViewItem = { S: { overlays: [dogTag(POSE_STAND)] } };
/** Off duty: buzz cut, olive tee, dog tag. */
const LINH_DAU_DINH_LOOK: Look = {
  hair: BUZZ_V,
  top: 'tee',
  bottoms: 'pants',
  shoes: 'both',
  details: ['belt', 'cuffs', 'kneepads'],
  extras: [DOG_TAG_V, RIFLE_STAND_V],
  face: 'plain',
  colors: {
    skin: [196, 150, 112],
    hair: [64, 52, 46],
    eye: [150, 80, 40],
    white: [212, 230, 238],
    ...ARMY,
  },
};
export const LINH_DAU_DINH = wear('linh_dau_dinh', 'Lính đầu đinh', POSE_STAND, LINH_DAU_DINH_LOOK);

/** Woman soldier: patrol cap over a ponytail, camouflage jacket, belt. */
const LINH_NU_LOOK: Look = {
  hair: HAIR_PONYTAIL_V,
  hat: PEAKED_CAP_V,
  top: 'long',
  bottoms: 'pants',
  shoes: 'both',
  details: ['camo', 'belt', 'cuffs', 'kneepads'],
  face: 'plain',
  colors: {
    skin: [240, 200, 165],
    hair: [70, 48, 36],
    eye: [150, 80, 40],
    white: [212, 230, 238],
    ...ARMY,
    cloth: [128, 126, 78], // a warmer, lighter olive than the line infantry (D-089)
    pants: [110, 108, 70],
    cloth2: [100, 104, 66], // the soft cap a step lighter than the army's dark green
  },
};
export const LINH_NU = wear('linh_nu', 'Lính nữ', POSE_STAND, LINH_NU_LOOK);

/** Medic soldier: helmet, plain jacket, red-cross bag on the hip. */
const LINH_QUAN_Y_LOOK: Look = {
  hat: HELMET_V,
  top: 'long',
  bottoms: 'pants',
  shoes: 'both',
  details: ['belt', 'cuffs', 'kneepads', 'armband'],
  extras: [SATCHEL_V, MEDIC_CROSS_V],
  face: 'plain',
  colors: {
    // the medic in a lighter khaki than the line infantry, with the white of the armband and the helmet
    // cross: the helmet-and-olive pair with the rifleman parted at 1x (D-089)
    skin: [232, 192, 156],
    eye: [150, 80, 40],
    white: [240, 245, 245],
    accent: [200, 40, 50],
    ...ARMY,
    cloth: [140, 148, 104], // grey-green khaki, a step away from Ông Tư's ochre
    pants: [122, 124, 90],
    cloth2: [196, 196, 186], // white cuffs (the helmet is drawn in cloth, so it stays khaki under its red cross)
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

/* ------------------------------------------------------------------ */
/* Two more of the game's cast on the standing figure (D-098).         */
/* ------------------------------------------------------------------ */

/**
 * Kẻ Lang Thang, the wanderer that guards the bridgehead: a bald, pale infected standing upright (not
 * drooping like the common infected), a ragged brown sleeveless tunic read as a tank top over shorts of
 * the same cloth, bare feet, sunken sockets, a gash and blood on the tunic.
 */
const KE_LANG_THANG_LOOK: Look = {
  hair: BALD_V,
  top: 'tank',
  bottoms: 'shorts',
  shoes: 'none',
  details: ['gash', 'stains'],
  colors: {
    skin: [206, 192, 156],
    cloth: [128, 92, 58],
    pants: [104, 74, 48],
    ...BLOOD,
    ...ZOMBIE_EYES,
  },
};
export const KE_LANG_THANG = wear('ke_lang_thang', 'Kẻ Lang Thang', POSE_STAND, KE_LANG_THANG_LOOK);

/**
 * Mai, the ghost who guides the group: a girl with short side-parted hair, a plain tee and shorts, bare
 * feet, every material in one pale green so she reads as a spirit (the game draws her translucent in a
 * green glow; a sprite has no half-transparent pixels, so the colour carries it).
 */
const MAI_LOOK: Look = {
  hair: HAIR_SHORT_V,
  top: 'tee',
  bottoms: 'shorts',
  shoes: 'none',
  details: [],
  face: 'plain',
  colors: {
    skin: [178, 204, 160],
    hair: [116, 148, 108],
    cloth: [150, 184, 138],
    pants: [122, 156, 114],
    eye: [52, 108, 78],
    white: [214, 236, 208],
  },
};
export const MAI = wear('mai', 'Mai', POSE_STAND, MAI_LOOK);

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
  { id: 'ke_lang_thang', label: 'Kẻ Lang Thang', look: KE_LANG_THANG_LOOK },
  { id: 'mai', label: 'Mai', look: MAI_LOOK },
];

/** Every base character dressed for one view. */
export function castInView(view: HeroView): Outfit[] {
  return BASE_LOOKS.map((c) => wearView(c.id, c.label, c.look, view));
}

/** The outfit of a look on a walk step of a drawn view (D-095): step 0 is A, 1 is B. */
export function wearWalk(
  id: string,
  label: string,
  look: Look,
  view: WalkView,
  step: 0 | 1,
): Outfit {
  return build(id, label, walkPose(view, step), look, view);
}

/** Every base character dressed for one walk step. */
export function walkCastInView(view: WalkView, step: 0 | 1): Outfit[] {
  return BASE_LOOKS.map((c) => wearWalk(c.id, c.label, c.look, view, step));
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

/* ------------------------------------------------------------------ */
/* Items a config picks on the hero body (hero64.registry.ts, D-096).  */
/* ------------------------------------------------------------------ */

/**
 * The drawn items a hero part stands for, by the registry's part id. Hair, hats
 * and faces are head-space items that land on any form; the rest are drawn for
 * the standing figure and its walk steps.
 */
export const HERO_ITEMS = {
  hair: {
    short: HAIR_SHORT_V,
    spiky: HAIR_SPIKY_V,
    swept: HAIR_SWEPT_V,
    bob: HAIR_BOB_V,
    curly: HAIR_CURLY_V,
    long: HAIR_LONG_V,
    ponytail: HAIR_PONYTAIL_V,
    buzz: BUZZ_V,
    wild: HAIR_WILD_V,
    /** A shaven head: no drawing, the skull's hair shadow lightened (D-092). */
    bald: BALD_V,
  },
  hat: {
    helmet: HELMET_V,
    beret: BERET_V,
    peaked_cap: PEAKED_CAP_V,
    police_cap: POLICE_CAP_V,
    ranger_hat: RANGER_HAT_V,
    hard_hat: HARD_HAT_V,
    headband: HEADBAND_V,
  },
  face: {
    beard: BEARD_V,
    mimic: MIMIC_FACE_V,
    big_ears: BIG_EARS_V,
    sealed_eyes: SEALED_EYES_V,
    brute: BRUTE_FACE_V,
  },
  top: {
    ny_strap: NY_STRAP_V,
    tunic: TUNIC_V,
    jacket_zip: JACKET_ZIP_V,
    ranger_coat: RANGER_COAT_V,
    lab_coat: LAB_COAT_V,
    dog_tag: DOG_TAG_V,
  },
  bottoms: { dress_stains: DRESS_STAINS_V },
  gear: {
    backpack: BACKPACK_V,
    rifle_slung: RIFLE_SLUNG_V,
    rifle_stand: RIFLE_STAND_V,
    map_case: MAP_CASE_V,
    satchel: SATCHEL_V,
    medic_cross: MEDIC_CROSS_V,
    /** The police zombie's duty belt, drawn on the mirrored droop pose. */
    police: POLICE_GEAR_V,
    /** Lính Nhiễm's forearm sores and dog tag, drawn on the drag pose (front view). */
    sores_dog_tag: { S: { overlays: [...SORES, dogTag(POSE_DRAG)] } } as ViewItem,
    /** Kẻ Mang Vỏ's carapace and shoulder plates, on the heavy build. */
    shell: SHELL_V,
    /** Kẻ Phun's pustules, on the bloated belly. */
    pustules: PUSTULES_V,
  },
  /** Under a hat brim the profile's iris keeps its lower cell (the ranger hat). */
  brim_eye: BRIM_EYE_V,
};
