/**
 * The 64 px hero in the registry (D-096): the Vùng Xanh cast's body as a
 * character the config can dress. A part is a patch on a Look (cast64.ts):
 * hair, hats and faces are drawn items, tops and bottoms are the material
 * changes and garments the tailor already makes, gear is the cast's props.
 * Presets are the cast looks themselves written as configs, so a user can
 * start from Dương or the medic and change one thing; a test keeps them
 * pixel-identical to the looks.
 */
import type { Rgb8 } from '@pixiso/pixel-core';
import { PART_NONE, type CharacterConfig, type HexColor } from '@pixiso/shared';
import {
  BASE_LOOKS,
  HERO_ITEMS,
  type Bottoms,
  type Detail,
  type Footwear,
  type Look,
  type Top,
} from './cast64.js';
import type { ViewItem } from './outfit64.js';
import type { MaterialColors } from './paint.js';
import { COLOR_TARGETS, HERO_BODY_ID } from './registry.js';

export const HERO_SLOT_IDS = ['hair', 'hat', 'face', 'top', 'bottoms', 'shoes', 'gear'] as const;
export type HeroSlotId = (typeof HERO_SLOT_IDS)[number];

/** Clips the hero has frames for (hero64.ts: the standing frame and the walk steps). */
export const HERO_CLIP_IDS = ['idle', 'walk'] as const;

/**
 * Parts are applied in this order, whatever the slot order in the UI: the
 * cast looks list their extras hair → face → top → bottoms → shoes → gear and
 * put the hat last (a hat goes on after the face in cast64 `build`), so a
 * preset lays its overlays in the same order as its look.
 */
const APPLY_ORDER: readonly HeroSlotId[] = [
  'hair',
  'face',
  'top',
  'bottoms',
  'shoes',
  'gear',
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
  mouth?: boolean;
  hem?: boolean;
  sleeves?: 'wide';
}

export interface HeroPartDef {
  id: string;
  slot: HeroSlotId;
  apply: (draft: Draft) => void;
}

const hair = (id: string, item: ViewItem): HeroPartDef => ({
  id,
  slot: 'hair',
  apply: (d) => {
    d.hair.push(item);
  },
});
const hat = (id: string, item: ViewItem, extra?: ViewItem): HeroPartDef => ({
  id,
  slot: 'hat',
  apply: (d) => {
    d.hat = item;
    if (extra) d.extras.push(extra);
  },
});
interface TopPatch {
  details?: Detail[];
  extras?: ViewItem[];
  hem?: false;
  sleeves?: 'wide';
}
const top = (id: string, kind: Top, patch: TopPatch = {}): HeroPartDef => ({
  id,
  slot: 'top',
  apply: (d) => {
    d.top = kind;
    d.details.push(...(patch.details ?? []));
    d.extras.push(...(patch.extras ?? []));
    if (patch.hem === false) d.hem = false;
    if (patch.sleeves) d.sleeves = patch.sleeves;
  },
});
const bottoms = (id: string, kind: Bottoms, extra?: ViewItem): HeroPartDef => ({
  id,
  slot: 'bottoms',
  apply: (d) => {
    d.bottoms = kind;
    if (extra) d.extras.push(extra);
  },
});
const shoes = (id: string, kind: Footwear): HeroPartDef => ({
  id,
  slot: 'shoes',
  apply: (d) => {
    d.shoes = kind;
  },
});
const gear = (id: string, ...items: ViewItem[]): HeroPartDef => ({
  id,
  slot: 'gear',
  apply: (d) => {
    d.extras.push(...items);
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
  hat('helmet', I.hat.helmet),
  hat('beret', I.hat.beret),
  hat('peaked_cap', I.hat.peaked_cap),
  hat('police_cap', I.hat.police_cap),
  hat('ranger_hat', I.hat.ranger_hat, I.brim_eye),
  hat('hard_hat', I.hat.hard_hat),
  hat('headband', I.hat.headband),
  {
    id: 'glasses',
    slot: 'face',
    apply: (d) => {
      d.glasses = true;
    },
  },
  {
    id: 'beard',
    slot: 'face',
    apply: (d) => {
      d.extras.push(I.face.beard);
    },
  },
  {
    id: 'mimic',
    slot: 'face',
    apply: (d) => {
      d.mouth = false;
      d.extras.push(I.face.mimic);
    },
  },
  top('tee', 'tee'),
  top('tee_torn', 'torn'),
  top('tee_army', 'tee', { details: UNIFORM, extras: [I.top.dog_tag] }),
  top('scrubs', 'tee', { extras: [I.top.ny_strap, I.top.tunic] }),
  top('jacket', 'long'),
  top('jacket_zip', 'long', { extras: [I.top.jacket_zip] }),
  top('coat_ranger', 'long', { hem: false, sleeves: 'wide', extras: [I.top.ranger_coat] }),
  top('coat_lab', 'long', { hem: false, extras: [I.top.lab_coat] }),
  top('uniform_camo', 'long', { details: ['camo', ...UNIFORM] }),
  top('uniform_officer', 'long', { details: ['belt', 'badge', 'cuffs', 'kneepads'] }),
  top('uniform_medic', 'long', { details: [...UNIFORM, 'armband'] }),
  top('tank', 'tank'),
  top('crop', 'crop'),
  bottoms('pants', 'pants'),
  bottoms('shorts', 'shorts'),
  bottoms('skirt', 'skirt'),
  bottoms('dress', 'dress'),
  bottoms('dress_stained', 'dress', I.bottoms.dress_stains),
  shoes('boots', 'both'),
  shoes('boot_right', 'right'),
  shoes('flats', 'flats'),
  gear('backpack', I.gear.backpack),
  gear('rifle_slung', I.gear.rifle_slung),
  gear('rifle_stand', I.gear.rifle_stand),
  gear('map_case', I.gear.map_case),
  gear('satchel_medic', I.gear.satchel, I.gear.medic_cross),
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
 * The look of a config's parts (slot → part id, "none" or unknown ids skipped)
 * with the material colours over the hero defaults. A head with neither hair
 * nor hat is shaven (BALD_V lightens the skull's hair shadow, D-092).
 */
export function heroLook(parts: Readonly<Record<string, string>>, colors: MaterialColors): Look {
  const d: Draft = {
    hair: [],
    top: 'none',
    bottoms: 'none',
    shoes: 'none',
    details: [],
    extras: [],
  };
  for (const slot of APPLY_ORDER) {
    const id = parts[slot];
    if (!id || id === PART_NONE) continue;
    const def = heroPartById(id);
    if (def && def.slot === slot) def.apply(d);
  }
  if (d.hair.length === 0 && !d.hat) d.hair.push(I.hair.bald);
  return {
    ...(d.hair.length ? { hair: d.hair } : {}),
    ...(d.hat ? { hat: d.hat } : {}),
    ...(d.glasses ? { glasses: true } : {}),
    top: d.top,
    bottoms: d.bottoms,
    shoes: d.shoes,
    details: d.details,
    ...(d.extras.length ? { extras: d.extras } : {}),
    face: 'plain',
    ...(d.mouth === false ? { mouth: false } : {}),
    ...(d.hem === false ? { hem: false } : {}),
    ...(d.sleeves ? { sleeves: d.sleeves } : {}),
    colors: { ...HERO_DEFAULT_COLORS, ...colors },
  };
}

/** The parts that rebuild each cast look (cast64 BASE_LOOKS); hero64.registry.test.ts proves them pixel-identical. */
const PRESET_PARTS: Readonly<Record<string, Partial<Record<HeroSlotId, string>>>> = {
  duong: { hair: 'hair_spiky', top: 'tee', bottoms: 'pants', shoes: 'boots' },
  ny: { hair: 'hair_curly', top: 'scrubs', bottoms: 'pants', shoes: 'boots' },
  son: {
    hair: 'hair_swept',
    face: 'glasses',
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
    face: 'glasses',
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
};

function hexOf([r, g, b]: Rgb8): HexColor {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export interface HeroPreset {
  id: string;
  config: CharacterConfig;
}

/** Every cast look as a hero config: its parts, and its measured colours as hex on the colour targets. */
export const HERO_PRESETS: readonly HeroPreset[] = BASE_LOOKS.map(({ id, look }) => {
  const picked = PRESET_PARTS[id];
  if (!picked) throw new Error(`no preset parts for "${id}"`);
  const parts: Record<string, string> = {};
  for (const slot of HERO_SLOT_IDS) {
    const part = picked[slot] ?? PART_NONE;
    if (part !== PART_NONE && heroPartById(part)?.slot !== slot)
      throw new Error(`preset "${id}": "${part}" is not a ${slot} part`);
    parts[slot] = part;
  }
  const colors = COLOR_TARGETS.flatMap((t) => {
    const c = look.colors[t.material];
    return c ? [{ target: t.id, color: hexOf(c) }] : [];
  });
  return {
    id,
    config: {
      version: 1,
      baseCharacter: HERO_BODY_ID,
      parts,
      colors,
      animations: [...HERO_CLIP_IDS],
    },
  };
});
