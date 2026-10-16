/**
 * Hand-drawn 64 px "hero" base body (mannequin), modelled on the user's
 * reference: a 21×48 figure, three heads tall, shoulders 17 wide with the arms
 * hanging beside the torso, hands at the hips, legs with a one-pixel gap and
 * rounded feet. Drawn without outer outline (compose adds it); inner lines
 * separate arms from torso. Tones: $ light (dominant on the lit side), s mid,
 * S shadow on the right and under every overhang.
 */
import type { BodyView } from './body32.js';
import { blank, stamp } from './draw.js';
import { sprite, type Sprite } from './format.js';

export const HERO_CANVAS = 64;
export const HERO_PIVOT = { x: 32, y: 62 } as const;

/** Front view, 19×46 (21×48 with the outline). Rows: head 0–15, neck 16–17, torso 18–33, legs 34–45. */
export const HERO_S_FIGURE = sprite`
  ......$$$$sss......
  ....$$$$$ssssss....
  ...$$$$$$sssssss...
  ...$$$$$$ssssssS...
  ..$$$$$$$ssssssSS..
  ..$$$$$$ssssssssS..
  ..$$$$$$ssssssssS..
  ..$$$$$sssssssssS..
  ..$$$$ssssssssssS..
  ..$$$soosssoosssS..
  ...$ssxesssxessS...
  ...$sseess$seesSS..
  ...ssseess$SeesSS..
  ....ssssssSssSS....
  .....sssSSssSS.....
  ......SSSSSSS......
  .......SSSSS.......
  .......SSsSS.......
  ...$$$$$$ssssssS...
  .$$$$$$$$ssssssssS.
  .$$so$$$sssssSosSS.
  .$$so$$$ss$$sSosSS.
  .$sso$$$ss$$sSosSS.
  .$ssosssSsssSSosSS.
  .$ssossssSsssSosSS.
  .sssossssSsssSosSS.
  .sssossssSsssSosSS.
  .sSsossssSsssSoSSS.
  .sSsossssSsssSoSSS.
  .sSsossssSsssSoSSS.
  .sSsoSSSSSSSSSoSSS.
  .sssosssssssssoSSS.
  .$ssosssssssssoSsS.
  .SSSoSSSSoSSSSoSSS.
  ....$$sss.sssSS....
  ....$ssss.ssssS....
  ....$ssss.ssssS....
  ....sssss.sssSS....
  ....sSSss.ssSSS....
  ....$ssss.sssSS....
  ...$sssss.sssssS...
  ...$sssss.sssssS...
  ...sSSSss.ssSSSS...
  ..$$sssss.sssss$S..
  ..$ssssss.ssssssS..
  ..SSSSSSS.SSSSSSS..
`;

/** Copies the inclusive box [x0..x1]×[y0..y1] of `s` into a new sprite. */
export function slice(s: Sprite, x0: number, y0: number, x1: number, y1: number): Sprite {
  const out = blank(x1 - x0 + 1, y1 - y0 + 1);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const v = s.cells[y * s.w + x]!;
      if (v >= 0) out.cells[(y - y0) * out.w + (x - x0)] = v;
    }
  return out;
}

/**
 * Splits the figure into limb layers so the offset-table clips can move them:
 * head with neck, torso with the separating lines, arms beside them (no overlap,
 * so the compositor adds no second line), legs split at the gap. Positions put the feet on row 60 of the 64 canvas.
 */
export function heroViewS(): BodyView {
  const f = HERO_S_FIGURE;
  const X = 22; // 19-wide figure centred on the 64 canvas
  const Y = HERO_PIVOT.y - 2 - (f.h - 1); // bottom row on 60
  const at = (x0: number, y0: number, x1: number, y1: number, z: number) => ({
    sprite: slice(f, x0, y0, x1, y1),
    x: X + x0,
    y: Y + y0,
    z,
  });
  return {
    parts: {
      legR: at(2, 34, 8, 45, 10),
      legL: at(10, 34, 16, 45, 10),
      torso: at(4, 18, 14, 33, 20),
      armR: at(0, 18, 3, 33, 30),
      armL: at(15, 18, 18, 33, 30),
      head: at(0, 0, 18, 17, 40),
    },
    anchors: {
      head: { x: X, y: Y },
      hand_right: { x: X + 2, y: Y + 32 },
      hand_left: { x: X + 16, y: Y + 32 },
      back: { x: X + 9, y: Y + 19 },
    },
  };
}

void stamp;
