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
import { flipX, parseSprite } from './format.js';
import type { Box, HeroView } from './hero64.js';
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
import type { Garment } from './tailor64.js';
import type { MaterialColors } from './paint.js';
import { poseInView } from './poseviews64.js';
import { STAND_BRUTE, STAND_FAT, STAND_HEAVY, STAND_VIEWS } from './views64.js';
import {
  BEARD_VIEWS,
  BERET_W,
  BUZZ_VIEWS,
  DRESS_STAINS_W,
  GLASSES_VIEWS,
  HAIR_BOB_VIEWS,
  HAIR_CURLY_VIEWS,
  HAIR_PONYTAIL_VIEWS,
  HAIR_SPIKY_VIEWS,
  HAIR_SWEPT_VIEWS,
  HAIR_LONG_VIEWS,
  HAIR_SHORT_VIEWS,
  HAIR_WILD_VIEWS,
  HARD_HAT_W,
  HEADBAND_VIEWS,
  HELMET_W,
  BACKPACK_N,
  BACKPACK_W,
  COAT_TAILS2_W,
  RANGER_COAT_W,
  RIFLE_SLUNG_N,
  RIFLE_SLUNG_W,
  TUNIC_W,
  RIFLE_STAND_N,
  RIFLE_STAND_W,
  SATCHEL_N,
  SATCHEL_W,
  MIMIC_FACE_VIEWS,
  PEAKED_CAP_N,
  PEAKED_CAP_W,
  RANGER_HAT_W,
  SEALED_EYES_VIEWS,
  BIG_EAR_W,
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

/** Short hair, parted on the left: strands lit on their top-left, shadow gaps between them, a deep underside, three fringe points of different lengths and one reaching the temple. */
const HAIR_SHORT = hov(0, 0, [
  '......ooooo......',
  '....ooh#hhHoo....',
  '...o#hh#hhHHho...',
  '...oJJJJhHHhho...',
  '..oh##hhjjjjhHo..',
  '..ohh##hHHhhjjo..',
  '..ohh##hHHhhHHo..',
  '..o#hh##HhhHHHo..',
  '..HhH..HHj..HjH..',
  '...#.............',
]);

/** Spiky hair: three points rising two rows above the skull (dress() grows the canvas), a fuller mass, tips over the brow. */
const HAIR_SPIKY = hov(0, -2, [
  '.....o...o...o...',
  '....o#o.o#o.o#o..',
  '...o##ho#hhoHhho.',
  '..ohhJJJJhHHhhHo.',
  '.o#hh##hhjjjjhHo.',
  '.o##hh##hHHhhjjo.',
  '.o##hh##hHHhhHHo.',
  '..o##hh##HhhHHo..',
  '..oJJhh##HhhHHo..',
  '..oh#JJJJhhHHHo..',
  '..HhH..HHj..HjH..',
  '...h.............',
]);

/** Fuller hair swept over the brow, sideburns over the ears. */
const HAIR_SWEPT = hov(0, 0, [
  '......ooooo......',
  '....ooh#hhHoo....',
  '...o#hh#hhHHho...',
  '..ohJJJJhHHhhHo..',
  '..oh##hhjjjjhHo..',
  '.o#hh##hHHhhjjjo.',
  '.o#hh##hHHhhHHho.',
  '.o##hh##HhhHHhho.',
  '.oJJhh##HhhHHhho.',
  '.ohH.........Hjo.',
  '.ojH.........Hjo.',
  '..oo.........oo..',
]);

/** Chin-length bob with a fringe. */
const HAIR_BOB = hov(0, 0, [
  '......ooooo......',
  '....ooh#hhHoo....',
  '...o#hh#hhHHho...',
  '..ohJJJJhHHhhHo..',
  '..oh##hhjjjjhHo..',
  '.o#hh##hHHhhjjjo.',
  '.o#hh##hHHhhHHho.',
  '.o##hh##HhhHHhho.',
  '.ohhH..HHj..Hjjo.',
  '.o#h.........hHo.',
  '.ohh.........hHo.',
  '.oHj.........jHo.',
  '..oHo.......oHo..',
  '...o.........o...',
]);

/** Curly hair: a bumpy silhouette wider than the skull, two-cell curl marks, fringe over the brow, ends at the jaw. */
const HAIR_CURLY = hov(0, 0, [
  '.....ooooooo.....',
  '...oohh#hhHHoo...',
  '..o##hh#hhHHhho..',
  '.ohhJJJJhHHhhHHo.',
  'o#hh##hhjjjjhHHho',
  'o##hh##hHHhhjjjjo',
  '.o#hh##hHHhhHHho.',
  'oh##hh##HhhHHhhHo',
  '.ohhH..HHj..Hjjo.',
  'ohhj.........jHho',
  '.o#h.........hHo.',
  'ohHj.........jHHo',
  '.oHj.........jHo.',
  '..oo.........oo..',
]);

/** Long hair to the shoulders. */
const HAIR_LONG = hov(0, 0, [
  '......ooooo......',
  '....ooh#hhHoo....',
  '...o#hh#hhHHho...',
  '..ohJJJJhHHhhHo..',
  '..oh##hhjjjjhHo..',
  '.o#hh##hHHhhjjjo.',
  '.o#hh##hHHhhHHho.',
  '.o##hh##HhhHHhho.',
  '.ohhH..HHj..Hjjo.',
  '.o#h.........hHo.',
  '.o#h.........hHo.',
  '.ohh.........hHo.',
  '.ohH.........Hjo.',
  '.ohH.........Hjo.',
  '.oHj.........jHo.',
  '.oHj.........jHo.',
  '..oo.........oo..',
]);

/** Tight cap of hair with a ponytail hanging at the right. */
const HAIR_PONYTAIL: Overlay[] = [
  hov(0, 0, [
    '......ooooo......',
    '....ooh#hhHoo....',
    '...o#hh#hhHHho...',
    '...oJJJJhHHhho...',
    '..oh##hhjjjjhHo..',
    '..ohh##hHHhhjjo..',
    '..ohh##hHHhhHHo..',
    '..o#hh##HhhHHHo..',
    '..HhH.......HjH..',
  ]),
  hov(13, 10, ['.ooo', 'o#Ho', 'ohHo', 'ohjo', 'oHjo', '.oo.']),
];

/** Buzz cut: the skull recoloured to hair, face and ears left alone. */
const BUZZ: Remap = { box: [0, 0, 16, 7], to: 'hair', space: 'head' };

/** Round glasses: frame joins the brow line, bridge between the eyes, rims under them. */
const GLASSES = hov(4, 8, ['...o.o...', '...ooo...', '...o.o...', 'o..o.o..o', 'oooo.oooo']);

/** Headband across the forehead (accent material). */
const HEADBAND = hov(2, 6, ['o*aaaaaaaaaAo', 'oAaaaaaaaaAAo']);

/** Full beard (hair material): moustache under the nose, a line under it (the mouth, parting it from the beard), a bushy beard wider than the jaw down to the collar, its own outline. */
const BEARD = hov(3, 12, [
  '.o#hHhhHHo.',
  'o#oooooooHo',
  'o#hHhhHhhHo',
  'oHhhHhhHHHo',
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
    '.....o****aaao.....',
    '....o***a*aaaao....',
    '...o*aaaa*aaaaao...',
    '...oaaaaa*aaaAAo...',
    '...oaaaaaaAAAAro...',
    '..o*aaaAAAAArrrro..',
    '..ooooooooooooooo..',
  ]),
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
    '..o&&&kkKkkkkkoo...',
    '.okkkkkkKkkkkkkKoo.',
    '.okkKkkkkKkkKKKKKKo',
    '.okKkkkKKKKKKqqqqqo',
    '.ookkkKKKKKKqqqqooo',
    '..okkkKKKKKKqqqqo..',
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
    '..occCCCCCCCCCCCo..',
    '..occcccccCCCCCvo..',
    '..occccCCCCCvvvvo..',
    '.occcCCCCCCCvvvvvo.',
    '.ooooooooooooooooo.',
  ]),
  rigid: true,
};

/** Zombie face: sunken sockets, a gaping mouth with yellowed teeth, bags under the eyes. */
const ZOMBIE_FACE = hov(4, 9, ['...S.S...', '...S.S...', '.$.....$.', '.SoxxxoS.', '...ooo...']);
/** Scalp patches and a scalp wound (blood is the wood material). */
const ZOMBIE_SCALP = hov(5, 2, ['.SS...d', '..S....']);
/** A gash on the cheek. */
const ZOMBIE_CHEEK = hov(11, 5, ['d', 'd']);

/* ------------------------------------------------------------------ */
/* Base figure (17×40) regions in figure space.                        */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Items drawn per view (views64.items.ts holds the SW/W/NW/N rows).    */
/* ------------------------------------------------------------------ */

const same = (o: Overlay): ViewLayer => ({ overlays: [o] });
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
  SW: same(HARD_HAT),
  N: same(HARD_HAT),
  NW: same(HARD_HAT),
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
const BUZZ_V: ViewItem = { S: { remaps: [BUZZ] }, ...BUZZ_VIEWS };
const GLASSES_V: ViewItem = { S: same(GLASSES), ...GLASSES_VIEWS };
const BEARD_V: ViewItem = { S: same(BEARD), ...BEARD_VIEWS };
/** Helmets and the ranger hat look the same from the back; the beret drapes to the other side. */
const HELMET_V: ViewItem = {
  S: same(HELMET),
  SW: same(HELMET),
  N: same(HELMET),
  NW: same(HELMET),
  W: HELMET_W,
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
  ov(18, 9, [
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
  ov(17, 24, ['o', 's', 's', 'o']),
];
const RIFLE_STAND_V: ViewItem = {
  S: { overlays: RIFLE_STAND },
  SW: { overlays: RIFLE_STAND },
  W: RIFLE_STAND_W,
  N: RIFLE_STAND_N,
  NW: RIFLE_STAND_N,
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
  ...(
    [
      [12, 17],
      [11, 18],
      [11, 19],
      [10, 20],
      [10, 21],
      [9, 22],
      [9, 23],
      [8, 24],
      [8, 25],
      [7, 26],
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
};
/** The medic's big satchel: hangs outside the right hip on the chest strap, red with a white cross. */
const SATCHEL: Overlay[] = [
  ov(5, 17, ['A.......', '.A......', '..A.....', '...A....', '....A...', '.....A..', '......AA']),
  ov(14, 23, ['ooooo', 'oa*Ao', 'oaaAo', 'orrro', 'oaxAo', 'oxxxo', 'oaxAo', 'oAAAo', 'ooooo']),
];
const SATCHEL_V: ViewItem = {
  S: { overlays: SATCHEL },
  SW: { overlays: SATCHEL },
  W: SATCHEL_W,
  N: SATCHEL_N,
  NW: SATCHEL_N,
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
const BAT: Overlay = ov(14, 7, [
  '....ooo',
  '....o%o',
  '...o%o.',
  '...odo.',
  '..odo..',
  '..odo..',
  '.odo...',
  '.odo...',
  'odo....',
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
  NW: BACKPACK_N,
};
/** Ông Tư's ranger coat: a column wider at each sleeve and a skirt to the knee, open at the front, vented at the back. */
const RANGER_COAT: Overlay[] = [
  ov(-1, 18, ['oC', 'oC', 'oC', 'oC', 'oC', 'oC', 'oC', 'oC', 'oC']),
  ov(16, 18, ['Co', 'Co', 'Co', 'Co', 'Co', 'Co', 'Co', 'Co', 'Co']),
  ov(1, 29, [
    'o^cccccocccccCo',
    'o^ccCccoccCccCo',
    'occcCco.ocCccco',
    'occcCco.ocCccvo',
    'occcCco.ocCccvo',
    'occccco.occccvo',
    'ooooooo.ooooooo',
  ]),
];
const RANGER_COAT_BACK: Overlay[] = [
  ov(-1, 18, ['oC', 'oC', 'oC', 'oC', 'oC', 'oC', 'oC', 'oC', 'oC']),
  ov(16, 18, ['Co', 'Co', 'Co', 'Co', 'Co', 'Co', 'Co', 'Co', 'Co']),
  ov(1, 29, [
    'o^cccccocccccCo',
    'o^ccCccoccCccCo',
    'occcCccoccCccco',
    'occcCco.ocCccvo',
    'occcCco.ocCccvo',
    'occccco.occccvo',
    'ooooooo.ooooooo',
  ]),
];
const RANGER_COAT_V: ViewItem = {
  S: { overlays: RANGER_COAT },
  SW: { overlays: RANGER_COAT },
  W: RANGER_COAT_W,
  N: { overlays: RANGER_COAT_BACK },
  NW: { overlays: RANGER_COAT_BACK },
};
/** Bác sĩ Lan's coat tails to the knee, a column past each hip, and a clipboard held against the left thigh. */
const COAT_TAILS2: Overlay = ov(1, 29, [
  'o^cccccocccccCo',
  'o^ccCccoccCccCo',
  'occcCco.ocCccco',
  'occcCco.ocCccvo',
  '.occcco.occcco.',
  '.oooooo.oooooo.',
]);
const COAT_TAILS2_BACK: Overlay = ov(1, 29, [
  'o^cccccocccccCo',
  'o^ccCccoccCccCo',
  'occcCccoccCccco',
  'occcCco.ocCccvo',
  '.occcco.occcco.',
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
/** Ny's scrub tunic reaches below the hips; a small red pouch hangs on the right hip. */
const TUNIC: Overlay = ov(1, 30, [
  'o^cccccCcccccCo',
  'o^ccCcccccCccCo',
  'occccccccccccco',
  'ooooooooooooooo',
]);
const POUCH: Overlay = ov(14, 23, ['oooo', 'oAao', 'oAao', 'oaao', 'oooo']);
const POUCH_BACK: Overlay = ov(-1, 23, ['oooo', 'oaAo', 'oaAo', 'oaao', 'oooo']);
const TUNIC_V: ViewItem = {
  S: { overlays: [TUNIC, POUCH] },
  SW: { overlays: [TUNIC, POUCH] },
  W: TUNIC_W,
  N: { overlays: [TUNIC, POUCH_BACK] },
  NW: { overlays: [TUNIC, POUCH_BACK] },
};

/** The beret soldier's leather map case on the left hip, a column past the arm. */
const MAP_CASE: Overlay = ov(-2, 23, ['oooo', 'oLlo', 'oLlo', 'olio', 'oooo']);
const MAP_CASE_V: ViewItem = {
  S: { overlays: [MAP_CASE] },
  SW: { overlays: [MAP_CASE] },
  W: { overlays: [ov(1, 23, ['oooo', 'oLlo', 'oLlo', 'olio', 'oooo'])] },
  N: { overlays: [ov(15, 23, ['oooo', 'olLo', 'olLo', 'oilo', 'oooo'])] },
  NW: { overlays: [ov(15, 23, ['oooo', 'olLo', 'olLo', 'oilo', 'oooo'])] },
};

/** The police zombie's duty belt on the mirrored droop pose: a baton beside the hanging hand, a holster on the far hip. */
const BATON = ['oo', 'oD', 'oD', 'oD', 'oD', 'oo'];
const BATON_R = ['oo', 'Do', 'Do', 'Do', 'Do', 'oo'];
const HOLSTER = ['oo', 'Do', 'Do', 'Do', 'Do', 'Do', 'oo'];
const HOLSTER_L = ['oo', 'oD', 'oD', 'oD', 'oD', 'oD', 'oo'];
const POLICE_GEAR_V: ViewItem = {
  S: { overlays: [ov(0, 26, BATON), ov(16, 27, HOLSTER)] },
  SW: { overlays: [ov(-1, 26, BATON), ov(16, 27, HOLSTER)] },
  W: { overlays: [ov(3, 26, BATON)] },
  N: { overlays: [ov(17, 26, BATON_R), ov(1, 28, HOLSTER_L)] },
  NW: { overlays: [ov(17, 26, BATON_R), ov(1, 28, HOLSTER_L)] },
};

/** Red medic bag on the right hip with a white cross, plus a strap across the chest. */
const MEDIC_BAG: Overlay[] = [
  ov(5, 17, ['A......', '.A.....', '..A....', '...A...', '....A..', '.....A.', '......A']),
  ov(12, 22, ['ooooo', 'o*x*o', 'oxxxo', 'oAxAo', 'oAAAo', 'ooooo']),
];

/** Pustules on a bloated belly (fat form coordinates). */
const PUSTULES = ov(7, 23, ['....a....', 'a.......*', '.........', '...*.....', '.......a.']);

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
    cloth: [84, 116, 64],
    pants: [58, 66, 88],
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
  extras: [{ S: { overlays: [MEDIC_BAG[0]!] }, SW: { overlays: [MEDIC_BAG[0]!] } }, TUNIC_V], // strap, tunic, pouch
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

const SON_LOOK: Look = {
  hair: HAIR_SWEPT_V,
  glasses: true,
  top: 'long',
  bottoms: 'pants',
  shoes: 'both',
  details: [],
  face: 'plain',
  extras: [
    { S: { lines: [seam([8, 19, 8, 27])] }, SW: { lines: [seam([7, 19, 7, 27])] } },
    BACKPACK_V,
  ], // jacket zip, pack, bat
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
  extras: [BEARD_V, RANGER_COAT_V],
  hem: false,
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
  extras: {
    S: { overlays: [COAT_TAILS2, CLIPBOARD], lines: [seam([8, 19, 8, 28])] }, // coat opening
    SW: { overlays: [COAT_TAILS2, CLIPBOARD], lines: [seam([7, 19, 7, 28])] },
    W: COAT_TAILS2_W,
    N: { overlays: [COAT_TAILS2_BACK, CLIPBOARD_BACK] }, // back vent
    NW: { overlays: [COAT_TAILS2_BACK, CLIPBOARD_BACK] },
  },
  colors: {
    skin: [240, 206, 176],
    hair: [118, 42, 40],
    cloth: [228, 226, 220],
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

type Top = 'tee' | 'torn' | 'long' | 'tank' | 'crop' | 'none';
type Bottoms = 'pants' | 'shorts' | 'skirt' | 'dress';
type Footwear = 'both' | 'right' | 'flats' | 'none';
type Detail = 'stains' | 'gash' | 'hivis' | 'badge' | 'belt' | 'tie' | 'number' | 'camo' | 'scalp';

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
  /** False drops the hem line at the waist (a coat that carries on below it). */
  hem?: boolean;
  colors: MaterialColors;
}

/** The layer an item contributes in a view; S-only items (plain overlays, remaps) count for S alone. */
function layer(
  item: Overlay | Overlay[] | Remap | ViewItem | ViewItem[] | undefined,
  view: HeroView,
): ViewLayer {
  if (!item) return {};
  if (Array.isArray(item)) {
    if (item.length && isViewItem(item[0]!)) {
      const parts = (item as ViewItem[]).map((i) => i[view] ?? {});
      return {
        overlays: parts.flatMap((l) => l.overlays ?? []),
        remaps: parts.flatMap((l) => l.remaps ?? []),
        lines: parts.flatMap((l) => l.lines ?? []),
      };
    }
    return view === 'S' ? { overlays: item as Overlay[] } : {};
  }
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
    });
    return { box: [tx0, ty0, tx1, y1], except: [...pose.neck, ...except], to: 'cloth' };
  };
  const sleeve = (side: 'L' | 'R', box: Box, cuff = false): Remap => {
    // A side view gives both sleeves the same box (the far arm is hidden): shade it once, as the near one.
    if (!garments.some((g) => g.kind === 'sleeve' && g.box.join() === box.join()))
      garments.push({ kind: 'sleeve', side, box, material: 'cloth', cuff });
    return { box, to: 'cloth' };
  };
  const caps = pose.shoulders.map((box): Remap => sleeve(box[0] < tx0 ? 'L' : 'R', box));
  const collar = pose.collar.map(seam);
  // A dress is one piece, a coat carries on: no hem line at the waist.
  const waist = look.bottoms === 'dress' || look.hem === false ? [] : [seam(pose.hem)];
  switch (look.top) {
    case 'tee':
      remaps.push(
        torso([]),
        ...caps,
        sleeve('L', pose.sleeveL.short),
        sleeve('R', pose.sleeveR.short),
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
        sleeve('L', pose.sleeveL.torn ?? pose.sleeveL.short),
        sleeve('R', pose.sleeveR.short),
      );
      lines.push(...collar, ...pose.frayedXs.map((x) => seam([x, hemY, x, hemY])));
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
      break;
  }
  if (look.bottoms === 'pants') {
    remaps.push(...pose.pants.map((box): Remap => ({ box, to: 'pants' })));
    garments.push({ kind: 'pants', box: pose.pants, material: 'pants' });
  }
  if (look.bottoms === 'shorts') {
    remaps.push(...pose.shorts.map((box): Remap => ({ box, to: 'pants' })));
    garments.push({ kind: 'pants', box: pose.shorts, material: 'pants' });
  }
  if (look.bottoms === 'skirt') overlays.push(ov(pose.skirt.x, pose.skirt.y, pose.skirt.rows));
  if (look.bottoms === 'dress') {
    const d = pose.dress ?? pose.skirt;
    overlays.push(ov(d.x, d.y, d.rows));
  }
  if (look.shoes === 'both') {
    remaps.push({ box: pose.shoeL, to: 'boots' }, { box: pose.shoeR, to: 'boots' });
    garments.push({ kind: 'boots', box: [pose.shoeL, pose.shoeR], material: 'boots' });
  }
  if (look.shoes === 'right') {
    remaps.push({ box: pose.shoeR, to: 'boots' });
    garments.push({ kind: 'boots', box: pose.shoeR, material: 'boots' });
  }
  if (look.shoes === 'flats') {
    remaps.push(...pose.flats.map((box): Remap => ({ box, to: 'boots' })));
    garments.push({ kind: 'boots', box: pose.flats, material: 'boots' });
  }
  const hairLayer = layer(look.hair, view);
  push(out, hairLayer);
  // A buzz cut is the skull remapped to hair: band it like the drawn hairstyles.
  for (const r of hairLayer.remaps ?? [])
    if (r.to === 'hair')
      garments.push({ kind: 'hair', box: r.box, material: 'hair', space: r.space ?? 'figure' });
  if (look.glasses) push(out, layer(GLASSES_V, view));
  if (look.details.includes('scalp')) push(out, layer(ZOMBIE_SCALP_V, view));
  if ((look.face ?? 'zombie') === 'zombie') {
    push(out, layer(ZOMBIE_FACE_V, view));
    push(out, layer(ZOMBIE_CHEEK_V, view));
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
    garments,
    lines,
    overlays,
    colors: look.colors,
  };
}

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
    cloth: [122, 120, 112],
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
    hair: [62, 50, 58],
    cloth: [204, 150, 168],
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
export const ZOMBIE_POLICE = wearPosed('zombie_police', 'Zombie cảnh sát', POSE_DROOP_M, {
  hat: PEAKED_CAP_V,
  top: 'long',
  bottoms: 'pants',
  shoes: 'both',
  details: ['badge', 'belt', 'stains'],
  extras: POLICE_GEAR_V,
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
export const ZOMBIE_SOLDIER = wearPosed('zombie_soldier', 'Zombie quân đội', POSE_HUNCH, {
  hat: HELMET_V,
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
export const LINH_NHIEM = wearPosed('linh_nhiem', 'Lính Nhiễm', POSE_DRAG, {
  hat: HELMET_V,
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
    details: ['tie', 'stains'],
    colors: {
      skin: SKIN_M,
      hair: [62, 57, 57],
      cloth: [236, 236, 232],
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
const SEALED_EYES_V: ViewItem = { S: same(SEALED_EYES), N: {}, NW: {}, ...SEALED_EYES_VIEWS };
/** The ears stand beside the skull in every view; in profile one ear rises over the ear of the side head. */
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
  SW: same(ov(8, 23, ['....a....', 'a.......*', '.........', '...*.....', '.......a.'])),
  W: {
    overlays: [ov(9, 22, ['.a...', '.....', '...*.', 'a....', '.....', '..a..']), ov(1, 25, ['a'])],
  },
  NW: same(ov(7, 22, ['..a......', '.......*.', '.........', '...a.....', '......a..'])),
  N: same(ov(7, 22, ['..a......', '.......*.', '.........', '...a.....', '......a..'])),
};

/** Kẻ Phun, the bloated spore spitter: fat build, bare swollen torso with pustules, torn trousers. */
const KE_PHUN_LOOK: Look = {
  top: 'none',
  bottoms: 'pants',
  shoes: 'both',
  details: [],
  face: 'plain',
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
 * hair normally sits, which reads as dark hair on a bald man from the side
 * and behind. These lighten that zone to mid skin, leaving a shadow on the
 * lower back of the skull. S needs nothing.
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
  NW: same(
    hov(2, 8, [
      'sssssssssssS',
      '..ssssssssSS',
      '..sssssssSS.',
      '..ssssssSS..',
      '...ssssSS...',
      '....ssSS....',
    ]),
  ),
  N: same(
    hov(2, 8, [
      'sssssssssssss',
      '..ssssssssS..',
      '..sssssssSS..',
      '..sssssssSS..',
      '...sssssSS...',
      '....sssSS....',
    ]),
  ),
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
    eye: [60, 50, 40],
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

/** The brute's face and boils per view (figure space of the brute in that view). */
const BRUTE_EYE_ROWS = ['ooooo', 'oxeeo', 'oeeeo', 'oeeeo', 'ooooo'];
const BRUTE_FACE_V: ViewItem = {
  S: { overlays: [BRUTE_EYE, BRUTE_MAW, BRUTE_BOILS] },
  SW: {
    overlays: [ov(6, 12, BRUTE_EYE_ROWS), ov(10, 18, ['oxoxoxoxoxo', 'ooooooooooo']), BRUTE_BOILS],
  },
  W: {
    overlays: [
      ov(6, 10, BRUTE_EYE_ROWS),
      ov(3, 17, ['oxoxoxo', 'ooooooo']),
      ov(12, 30, ['.a..', '....', '...a', 'a...', '....', '..a.']),
    ],
  },
  NW: { overlays: [ov(10, 30, ['.a....', '......', '....a.', 'a.....', '......', '..a...'])] },
  N: { overlays: [ov(10, 30, ['.a....', '......', '....a.', 'a.....', '......', '..a...'])] },
};

/** Đột Biến: the ×1.5 giant with a mutated claw arm, bone spikes, a bulging eye and a maw. */
const DOT_BIEN_LOOK: Look = {
  top: 'none',
  bottoms: 'pants',
  shoes: 'none',
  details: [],
  face: 'plain',
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
  '....ooh#hhHoo....',
  '...o#hh#hhHHho...',
  '..ohJJJJhHHhhHo..',
  '..oh##hhjjjjhHo..',
  '.o#hh##hHHhhjjjo.',
  '.o#hh##hHHhhHHho.',
  '.o##hh##HhhHHhho.',
  '.ohhH..HHj..Hjjo.',
  '.o#h.........hHo.',
  'ohhH.........hjo.',
  '.ohH.........hhjo',
  '.ohh.........Hjo.',
  '.ohH.........Hjo.',
  'ohHj.........jHho',
  '.oHj.........jHo.',
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
const HAIR_WILD_V: ViewItem = { S: same(HAIR_WILD), ...HAIR_WILD_VIEWS };
const MIMIC_V: ViewItem = {
  S: { overlays: [SUNKEN_EYES, WIDE_SMILE, DRESS_STAINS] },
  SW: { overlays: [...(MIMIC_FACE_VIEWS.SW?.overlays ?? []), DRESS_STAINS] },
  W: { overlays: [...(MIMIC_FACE_VIEWS.W?.overlays ?? []), ...(DRESS_STAINS_W.overlays ?? [])] },
  N: { overlays: [DRESS_STAINS] },
  NW: { overlays: [DRESS_STAINS] },
};
const KE_BAT_CHUOC_LOOK: Look = {
  hair: HAIR_WILD_V,
  top: 'tank',
  bottoms: 'dress',
  shoes: 'none',
  details: [],
  face: 'plain',
  extras: MIMIC_V,
  colors: {
    skin: [184, 184, 164],
    hair: [58, 52, 54],
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
  hat: HELMET_V,
  top: 'long',
  bottoms: 'pants',
  shoes: 'both',
  details: ['camo', 'belt'],
  face: 'plain',
  extras: RIFLE_SLUNG_V,
  colors: { skin: [226, 186, 150], eye: [60, 50, 40], white: [212, 230, 238], ...ARMY },
};
export const LINH_NON_SAT = wear('linh_non_sat', 'Lính nón sắt', POSE_STAND, LINH_NON_SAT_LOOK);

/** Officer: beret, plain jacket, belt, insignia on the chest. */
const LINH_MU_NOI_LOOK: Look = {
  hat: BERET_V,
  top: 'long',
  bottoms: 'pants',
  shoes: 'both',
  details: ['belt', 'badge'],
  face: 'plain',
  extras: MAP_CASE_V,
  colors: { skin: [214, 170, 132], eye: [60, 50, 40], white: [212, 230, 238], ...ARMY },
};
export const LINH_MU_NOI = wear('linh_mu_noi', 'Lính mũ nồi', POSE_STAND, LINH_MU_NOI_LOOK);

/** Off duty: buzz cut, olive tee, dog tag. */
const LINH_DAU_DINH_LOOK: Look = {
  hair: BUZZ_V,
  top: 'tee',
  bottoms: 'pants',
  shoes: 'both',
  details: ['belt'],
  extras: [{ S: { overlays: [dogTag(POSE_STAND)] } }, RIFLE_STAND_V],
  face: 'plain',
  colors: {
    skin: [196, 150, 112],
    hair: [64, 52, 46],
    eye: [60, 50, 40],
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
  hat: HELMET_V,
  top: 'long',
  bottoms: 'pants',
  shoes: 'both',
  details: ['belt'],
  extras: SATCHEL_V,
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
