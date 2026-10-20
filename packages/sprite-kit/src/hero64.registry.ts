/**
 * The 64 px bodies in the registry (D-096, D-100): the standing hero and the
 * posed bodies (zombie stances, large builds) as characters the config can
 * dress. A part is a patch on a Look (cast64.ts): hair, hats and faces are
 * drawn items in head space that land on any form, tops and bottoms are the
 * material changes and garments the tailor already makes on a pose's regions,
 * gear and marks are the cast's props and wounds. Parts drawn for one figure
 * (a backpack on the standing body, the shell on the heavy one) list the
 * bodies they fit. Presets are the cast looks themselves written as configs,
 * so a user can start from Dương or the police zombie and change one thing; a
 * test keeps every preset pixel-identical to its look.
 */
import type { Rgb8 } from '@pixiso/pixel-core';
import { PART_NONE, type CharacterConfig, type HexColor } from '@pixiso/shared';
import {
  BASE_LOOKS,
  HERO_ITEMS,
  POSED_LOOKS,
  type Bottoms,
  type Detail,
  type Footwear,
  type Look,
  type Top,
} from './cast64.js';
import type { ViewItem } from './outfit64.js';
import type { MaterialColors } from './paint.js';
import { POSED_BODIES } from './posed64.js';
import { COLOR_TARGETS, HERO_BODY_ID } from './registry.js';

export const HERO_SLOT_IDS = [
  'hair',
  'hat',
  'face',
  'eyewear',
  'top',
  'bottoms',
  'shoes',
  'gear',
  'marks',
] as const;
export type HeroSlotId = (typeof HERO_SLOT_IDS)[number];

/** Clips the standing hero has frames for (hero64.ts: the standing frame and the walk steps). */
export const HERO_CLIP_IDS = ['idle', 'walk'] as const;
/** Clips a posed body has frames for: its standing frame only, until D-101. */
export const POSED_CLIP_IDS = ['idle'] as const;

/** Every body dressed by Look rules: the hero and the posed bodies. */
export const LOOK_BODY_IDS: readonly string[] = [HERO_BODY_ID, ...POSED_BODIES.map((b) => b.id)];
/** Bodies whose head is the base head grid, where head-space parts land. */
const HEADED: readonly string[] = [
  HERO_BODY_ID,
  ...POSED_BODIES.filter((b) => b.head).map((b) => b.id),
];
const STANDING: readonly string[] = [HERO_BODY_ID];

/**
 * Parts are applied in this order, whatever the slot order in the UI: the
 * cast looks list their extras hair → face → top → bottoms → shoes → gear and
 * put the hat last (a hat goes on after the face in cast64 `build`); marks
 * follow the top so a blood stain lies over the garment's own details the way
 * the looks list them. A preset then lays its overlays in the same order as
 * its look.
 */
const APPLY_ORDER: readonly HeroSlotId[] = [
  'hair',
  'face',
  'eyewear',
  'top',
  'bottoms',
  'shoes',
  'gear',
  'marks',
  'hat',
];

/** A look before its colours: every field a part may set. */
interface Draft {
  hair: ViewItem[];
  hat?: ViewItem;
  glasses?: boolean;
  top: Top;
  bottoms: Bottoms;
  shoes: Footwear;
  details: Detail[];
  extras: ViewItem[];
  /** The infected face (sunken sockets, toothy mouth, cheek gash) instead of the plain one. */
  face?: 'zombie';
  mouth?: boolean;
  hem?: boolean;
  sleeves?: 'wide';
}

export interface HeroPartDef {
  id: string;
  slot: HeroSlotId;
  /** Bodies the part is drawn for (catalog `characters`). */
  bodies: readonly string[];
  apply: (draft: Draft) => void;
}

const hair = (id: string, item: ViewItem): HeroPartDef => ({
  id,
  slot: 'hair',
  bodies: HEADED,
  apply: (d) => {
    d.hair.push(item);
  },
});
const hat = (id: string, item: ViewItem, extra?: ViewItem): HeroPartDef => ({
  id,
  slot: 'hat',
  bodies: HEADED,
  apply: (d) => {
    d.hat = item;
    if (extra) d.extras.push(extra);
  },
});
/** A band worn in the hair rather than over it: it goes on with the hair, under the face's marks (a cheek gash crosses it). */
const hairBand = (id: string, item: ViewItem): HeroPartDef => ({
  id,
  slot: 'hat',
  bodies: HEADED,
  apply: (d) => {
    d.hair.push(item);
  },
});
const face = (
  id: string,
  apply: (d: Draft) => void,
  bodies: readonly string[] = HEADED,
): HeroPartDef => ({ id, slot: 'face', bodies, apply });
interface TopPatch {
  details?: Detail[];
  extras?: ViewItem[];
  hem?: boolean;
  sleeves?: 'wide';
  /** Figure-space drawings made for one body (default: every Look body). */
  bodies?: readonly string[];
}
const top = (id: string, kind: Top, patch: TopPatch = {}): HeroPartDef => ({
  id,
  slot: 'top',
  bodies: patch.bodies ?? LOOK_BODY_IDS,
  apply: (d) => {
    d.top = kind;
    d.details.push(...(patch.details ?? []));
    d.extras.push(...(patch.extras ?? []));
    if (patch.hem !== undefined) d.hem = patch.hem;
    if (patch.sleeves) d.sleeves = patch.sleeves;
  },
});
const bottoms = (
  id: string,
  kind: Bottoms,
  extra?: ViewItem,
  bodies: readonly string[] = LOOK_BODY_IDS,
): HeroPartDef => ({
  id,
  slot: 'bottoms',
  bodies,
  apply: (d) => {
    d.bottoms = kind;
    if (extra) d.extras.push(extra);
  },
});
const shoes = (id: string, kind: Footwear): HeroPartDef => ({
  id,
  slot: 'shoes',
  bodies: LOOK_BODY_IDS,
  apply: (d) => {
    d.shoes = kind;
  },
});
const gear = (id: string, bodies: readonly string[], ...items: ViewItem[]): HeroPartDef => ({
  id,
  slot: 'gear',
  bodies,
  apply: (d) => {
    d.extras.push(...items);
  },
});
const marks = (id: string, details: Detail[]): HeroPartDef => ({
  id,
  slot: 'marks',
  bodies: LOOK_BODY_IDS,
  apply: (d) => {
    d.details.push(...details);
  },
});

const I = HERO_ITEMS;
/** A uniform's belt, second-cloth cuffs and knee pads (the soldiers' details, in the looks' order). */
const UNIFORM: Detail[] = ['belt', 'cuffs', 'kneepads'];

export const HERO_PARTS: readonly HeroPartDef[] = [
  hair('hair_short', I.hair.short),
  hair('hair_spiky', I.hair.spiky),
  hair('hair_swept', I.hair.swept),
  hair('hair_bob', I.hair.bob),
  hair('hair_curly', I.hair.curly),
  hair('hair_long', I.hair.long),
  hair('hair_ponytail', I.hair.ponytail),
  hair('hair_buzz', I.hair.buzz),
  hair('hair_wild', I.hair.wild),
  // a shaven head: the skull's hair shadow lightened (D-092); the bare standing hero gets it by default
  hair('hair_bald', I.hair.bald),
  hat('helmet', I.hat.helmet),
  hat('beret', I.hat.beret),
  hat('peaked_cap', I.hat.peaked_cap),
  hat('police_cap', I.hat.police_cap),
  hat('ranger_hat', I.hat.ranger_hat, I.brim_eye),
  hat('hard_hat', I.hat.hard_hat),
  hairBand('headband', I.hat.headband),
  face('beard', (d) => {
    d.extras.push(I.face.beard);
  }),
  face('mimic', (d) => {
    d.mouth = false;
    d.extras.push(I.face.mimic);
  }),
  face('face_zombie', (d) => {
    d.face = 'zombie';
  }),
  // Kẻ Thính: the infected face with huge ears and eyes sewn shut
  face('face_thinh', (d) => {
    d.face = 'zombie';
    d.extras.push(I.face.big_ears, I.face.sealed_eyes);
  }),
  // Đột Biến: one bulging eye and a maw, drawn on the giant's own head
  face(
    'face_brute',
    (d) => {
      d.mouth = false;
      d.extras.push(I.face.brute);
    },
    ['brute'],
  ),
  {
    id: 'glasses',
    slot: 'eyewear',
    bodies: HEADED,
    apply: (d) => {
      d.glasses = true;
    },
  },
  top('tee', 'tee'),
  top('tee_torn', 'torn'),
  top('tee_rags', 'torn', { hem: true }),
  top('tee_hivis', 'tee', { details: ['hivis'] }),
  top('tee_army', 'tee', { details: UNIFORM, extras: [I.top.dog_tag], bodies: STANDING }),
  top('tee_army_torn', 'torn', { details: ['stains', 'belt', 'kneepads'] }),
  top('scrubs', 'tee', { extras: [I.top.ny_strap, I.top.tunic], bodies: STANDING }),
  top('jacket', 'long'),
  top('jacket_zip', 'long', { extras: [I.top.jacket_zip], bodies: STANDING }),
  top('coat_ranger', 'long', {
    hem: false,
    sleeves: 'wide',
    extras: [I.top.ranger_coat],
    bodies: STANDING,
  }),
  top('coat_lab', 'long', { hem: false, extras: [I.top.lab_coat], bodies: STANDING }),
  top('shirt_tie_stained', 'long', { details: ['stains', 'tie'] }),
  top('uniform_camo', 'long', { details: ['camo', ...UNIFORM] }),
  top('uniform_rotten', 'long', { details: ['camo', 'stains', ...UNIFORM, 'rip'] }),
  top('uniform_officer', 'long', { details: ['belt', 'badge', 'cuffs', 'kneepads'] }),
  top('uniform_police', 'long', { details: ['badge', 'belt'] }),
  top('uniform_medic', 'long', { details: [...UNIFORM, 'armband'] }),
  top('tank', 'tank'),
  top('tank_torn', 'tank', { details: ['gash', 'stains'] }),
  top('tank_number', 'tank', { details: ['number'] }),
  top('crop', 'crop'),
  bottoms('pants', 'pants'),
  bottoms('shorts', 'shorts'),
  bottoms('skirt', 'skirt'),
  bottoms('dress', 'dress'),
  bottoms('dress_stained', 'dress', I.bottoms.dress_stains, STANDING),
  shoes('boots', 'both'),
  shoes('boot_right', 'right'),
  shoes('flats', 'flats'),
  gear('backpack', STANDING, I.gear.backpack),
  gear('rifle_slung', STANDING, I.gear.rifle_slung),
  gear('rifle_stand', STANDING, I.gear.rifle_stand),
  gear('map_case', STANDING, I.gear.map_case),
  gear('satchel_medic', STANDING, I.gear.satchel, I.gear.medic_cross),
  gear('police_belt', ['droop_m'], I.gear.police),
  gear('sores_dog_tag', ['drag'], I.gear.sores_dog_tag),
  gear('shell', ['heavy'], I.gear.shell),
  gear('pustules', ['fat'], I.gear.pustules),
  marks('wounds', ['gash', 'stains']),
  marks('wounds_scalp', ['scalp', 'gash', 'stains']),
  marks('stains', ['stains']),
  marks('gash', ['gash']),
];

export function heroPartById(id: string): HeroPartDef | undefined {
  return HERO_PARTS.find((p) => p.id === id);
}

/** The bare mannequin's colours (scripts/hero-walk.ts) and Dương's clothes; the rest keep the palette defaults. */
export const HERO_DEFAULT_COLORS: MaterialColors = {
  skin: [249, 209, 173],
  eye: [25, 123, 186],
  white: [212, 230, 238],
  hair: [56, 44, 40],
  cloth: [70, 150, 100],
  pants: [48, 58, 96],
  boots: [110, 74, 48],
};

/**
 * The look of a config's parts on a body (slot → part id; "none", unknown
 * ids and parts not drawn for the body are skipped) with the material colours
 * over the hero defaults. On the standing hero a head with neither hair nor
 * hat is shaven (BALD_V lightens the skull's hair shadow, D-092); the posed
 * bodies keep their drawn skull, as their looks do.
 */
export function heroLook(
  parts: Readonly<Record<string, string>>,
  colors: MaterialColors,
  bodyId: string = HERO_BODY_ID,
): Look {
  const body = POSED_BODIES.find((b) => b.id === bodyId);
  const d: Draft = {
    hair: [],
    top: 'none',
    bottoms: 'none',
    shoes: 'none',
    details: [],
    extras: [],
    ...(body?.look ?? {}),
  };
  for (const slot of APPLY_ORDER) {
    const id = parts[slot];
    if (!id || id === PART_NONE) continue;
    const def = heroPartById(id);
    if (def && def.slot === slot && def.bodies.includes(bodyId)) def.apply(d);
  }
  if (bodyId === HERO_BODY_ID && d.hair.length === 0 && !d.hat) d.hair.push(I.hair.bald);
  return {
    ...(d.hair.length ? { hair: d.hair } : {}),
    ...(d.hat ? { hat: d.hat } : {}),
    ...(d.glasses ? { glasses: true } : {}),
    top: d.top,
    bottoms: d.bottoms,
    shoes: d.shoes,
    details: d.details,
    ...(d.extras.length ? { extras: d.extras } : {}),
    face: d.face ?? 'plain',
    ...(d.mouth === false ? { mouth: false } : {}),
    ...(d.hem !== undefined ? { hem: d.hem } : {}),
    ...(d.sleeves ? { sleeves: d.sleeves } : {}),
    colors: { ...HERO_DEFAULT_COLORS, ...colors },
  };
}

/** The parts that rebuild each cast look (cast64 BASE_LOOKS and POSED_LOOKS); hero64.registry.test.ts proves them pixel-identical. */
const PRESET_PARTS: Readonly<Record<string, Partial<Record<HeroSlotId, string>>>> = {
  // the standing cast
  duong: { hair: 'hair_spiky', top: 'tee', bottoms: 'pants', shoes: 'boots' },
  ny: { hair: 'hair_curly', top: 'scrubs', bottoms: 'pants', shoes: 'boots' },
  son: {
    hair: 'hair_swept',
    eyewear: 'glasses',
    top: 'jacket_zip',
    bottoms: 'pants',
    shoes: 'boots',
    gear: 'backpack',
  },
  ong_tu: {
    hat: 'ranger_hat',
    face: 'beard',
    top: 'coat_ranger',
    bottoms: 'pants',
    shoes: 'boots',
  },
  bac_si_lan: {
    hair: 'hair_bob',
    eyewear: 'glasses',
    top: 'coat_lab',
    bottoms: 'pants',
    shoes: 'boots',
  },
  ke_bat_chuoc: { hair: 'hair_wild', face: 'mimic', top: 'tank', bottoms: 'dress_stained' },
  linh_non_sat: {
    hat: 'helmet',
    top: 'uniform_camo',
    bottoms: 'pants',
    shoes: 'boots',
    gear: 'rifle_slung',
  },
  linh_mu_noi: {
    hat: 'beret',
    top: 'uniform_officer',
    bottoms: 'pants',
    shoes: 'boots',
    gear: 'map_case',
  },
  linh_dau_dinh: {
    hair: 'hair_buzz',
    top: 'tee_army',
    bottoms: 'pants',
    shoes: 'boots',
    gear: 'rifle_stand',
  },
  linh_nu: {
    hair: 'hair_ponytail',
    hat: 'peaked_cap',
    top: 'uniform_camo',
    bottoms: 'pants',
    shoes: 'boots',
  },
  linh_quan_y: {
    hat: 'helmet',
    top: 'uniform_medic',
    bottoms: 'pants',
    shoes: 'boots',
    gear: 'satchel_medic',
  },
  ke_lang_thang: { hair: 'hair_bald', face: 'face_zombie', top: 'tank_torn', bottoms: 'shorts' },
  mai: { hair: 'hair_short', top: 'tee', bottoms: 'shorts' },
  // the posed cast (D-100)
  zombie_civ_m: {
    hair: 'hair_short',
    face: 'face_zombie',
    top: 'tee_torn',
    bottoms: 'pants',
    shoes: 'boot_right',
    marks: 'wounds_scalp',
  },
  zombie_civ_f: {
    hair: 'hair_long',
    face: 'face_zombie',
    top: 'tee',
    bottoms: 'skirt',
    shoes: 'flats',
    marks: 'wounds',
  },
  zombie_worker: {
    hat: 'hard_hat',
    face: 'face_zombie',
    top: 'tee_hivis',
    bottoms: 'pants',
    shoes: 'boots',
    marks: 'wounds',
  },
  zombie_police: {
    hat: 'police_cap',
    face: 'face_zombie',
    top: 'uniform_police',
    bottoms: 'pants',
    shoes: 'boots',
    gear: 'police_belt',
    marks: 'stains',
  },
  zombie_soldier: {
    hat: 'helmet',
    face: 'face_zombie',
    top: 'uniform_rotten',
    bottoms: 'pants',
    shoes: 'boots',
  },
  linh_nhiem: {
    hat: 'helmet',
    face: 'face_zombie',
    top: 'tee_army_torn',
    bottoms: 'pants',
    shoes: 'boots',
    gear: 'sores_dog_tag',
  },
  zombie_athlete_m: {
    hair: 'hair_short',
    hat: 'headband',
    face: 'face_zombie',
    top: 'tank_number',
    bottoms: 'shorts',
    shoes: 'boots',
    marks: 'wounds',
  },
  zombie_athlete_f: {
    hair: 'hair_ponytail',
    face: 'face_zombie',
    top: 'crop',
    bottoms: 'shorts',
    shoes: 'boots',
    marks: 'gash',
  },
  zombie_office: {
    hair: 'hair_buzz',
    face: 'face_zombie',
    eyewear: 'glasses',
    top: 'shirt_tie_stained',
    bottoms: 'pants',
    shoes: 'boots',
  },
  ke_thinh: { face: 'face_thinh', top: 'tee_torn', bottoms: 'shorts', marks: 'wounds' },
  ke_bam_tran: { face: 'face_zombie', top: 'tee_rags', bottoms: 'shorts', marks: 'wounds_scalp' },
  ke_phun: { bottoms: 'pants', shoes: 'boots', gear: 'pustules' },
  hung: { hair: 'hair_bald', hat: 'headband', top: 'tank', bottoms: 'shorts', shoes: 'boots' },
  ke_mang_vo: { face: 'face_zombie', bottoms: 'shorts', gear: 'shell' },
  dot_bien: { face: 'face_brute', bottoms: 'pants' },
};

function hexOf([r, g, b]: Rgb8): HexColor {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export interface HeroPreset {
  id: string;
  /** Body the preset dresses: the hero or a posed body. */
  body: string;
  config: CharacterConfig;
}

function presetOf(id: string, body: string, look: Look): HeroPreset {
  const picked = PRESET_PARTS[id];
  if (!picked) throw new Error(`no preset parts for "${id}"`);
  const parts: Record<string, string> = {};
  for (const slot of HERO_SLOT_IDS) {
    const part = picked[slot] ?? PART_NONE;
    if (part !== PART_NONE) {
      const def = heroPartById(part);
      if (def?.slot !== slot) throw new Error(`preset "${id}": "${part}" is not a ${slot} part`);
      if (!def.bodies.includes(body))
        throw new Error(`preset "${id}": "${part}" is not drawn for ${body}`);
    }
    parts[slot] = part;
  }
  const colors = COLOR_TARGETS.flatMap((t) => {
    const c = look.colors[t.material];
    return c ? [{ target: t.id, color: hexOf(c) }] : [];
  });
  const clips = body === HERO_BODY_ID ? HERO_CLIP_IDS : POSED_CLIP_IDS;
  return {
    id,
    body,
    config: { version: 1, baseCharacter: body, parts, colors, animations: [...clips] },
  };
}

/** Every cast look as a config: its parts, and its measured colours as hex on the colour targets. */
export const HERO_PRESETS: readonly HeroPreset[] = [
  ...BASE_LOOKS.map(({ id, look }) => presetOf(id, HERO_BODY_ID, look)),
  ...POSED_LOOKS.map(({ id, pose, look }) => {
    if (!POSED_BODIES.some((b) => b.id === pose.id))
      throw new Error(`posed look "${id}" is on pose "${pose.id}", which is not a catalog body`);
    return presetOf(id, pose.id, look);
  }),
];
