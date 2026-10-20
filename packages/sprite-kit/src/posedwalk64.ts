/**
 * Walk steps for the posed bodies (D-101). A zombie stance keeps the
 * mannequin's legs ("đầu hạ n hàng thì thân mất n hàng, chân giữ nguyên"), so
 * a step of a stance is the stance's upper body down to its hem row with the
 * hero's walk step from its trousers down: the shamble is the hero's stride
 * under a body that does not swing its arms. Cells of the stance below the hem
 * that are not its legs (hands hanging past the hips, arms beside the thighs)
 * stay, stamped over the step's legs. The regions follow the same split:
 * torso, sleeves, collar and marks from the stance, trousers, shoes and the
 * stride's leg split from the step, moved to where the step landed.
 */
import { buildOutfit, POSED_LOOKS } from './cast64.js';
import { EMPTY, LEGEND, MATERIALS, packCell, type Sprite } from './format.js';
import type { Box, HeroView } from './hero64.js';
import type { ZombiePose } from './hero64.poses.js';
import type { Outfit } from './outfit64.js';
import { POSED_BODIES, type PosedBodyDef } from './posed64.js';
import { poseInView } from './poseviews64.js';
import { WALK_VIEWS } from './walk64.js';

/** Stances whose legs are the mannequin's, so the hero's steps fit under them. */
export const STEPPING_POSES: readonly string[] = ['droop', 'twist', 'reach'];

const inBox = (x: number, y: number, [x0, y0, x1, y1]: Box) =>
  x >= x0 && x <= x1 && y >= y0 && y <= y1;
const centre = (b: Box) => (b[0] + b[2]) / 2;
const shiftBox = ([x0, y0, x1, y1]: Box, dx: number, dy: number): Box => [
  x0 + dx,
  y0 + dy,
  x1 + dx,
  y1 + dy,
];

/** Whether a posed body has steps: its stance is one of STEPPING_POSES (mirrored stances included). */
export function posedBodySteps(body: PosedBodyDef): boolean {
  return STEPPING_POSES.includes(body.pose.id.replace(/_m$/, ''));
}

/**
 * The step pose of a posed body in a drawn view, or undefined when the stance
 * has no steps or the view is not drawn. Step 0 is A (the person's left leg
 * forward), 1 is B.
 */
export function posedStep(body: PosedBodyDef, view: HeroView, step: 0 | 1): ZombiePose | undefined {
  if (!posedBodySteps(body)) return undefined;
  const pose = poseInView(body.pose, view);
  const walk = WALK_VIEWS[view]?.[step];
  if (!pose || !walk) return undefined;
  const figure = pose.form.figure;
  const stepFigure = walk.form.figure;
  if (!figure || !stepFigure) return undefined;

  const hemP = pose.hem[1];
  const hemS = walk.hem[1];
  const dx = Math.round(centre(pose.hem) - centre(walk.hem));
  const dy = hemP - hemS;
  // the composite keeps the stance's origin; the step's rows below its hem land dy rows down, dx columns over
  const minX = Math.min(0, dx);
  const w = Math.max(figure.w, stepFigure.w + dx) - minX;
  const h = Math.max(figure.h, stepFigure.h + dy);
  const cells = new Int16Array(w * h).fill(EMPTY);
  const put = (x: number, y: number, v: number) => {
    const X = x - minX;
    if (v !== EMPTY && X >= 0 && y >= 0 && X < w && y < h) cells[y * w + X] = v;
  };
  // the stance down to its hem row
  for (let y = 0; y <= hemP && y < figure.h; y++)
    for (let x = 0; x < figure.w; x++) put(x, y, figure.cells[y * figure.w + x]!);
  // the step from its first trouser row down
  for (let y = hemS + 1; y < stepFigure.h; y++)
    for (let x = 0; x < stepFigure.w; x++)
      put(x + dx, y + dy, stepFigure.cells[y * stepFigure.w + x]!);
  // What the stance has below its hem that is not its legs (hands past the hips, arms beside the thighs)
  // stays over the step, but only what still hangs from the body: a cell reached from the hem row through
  // other kept cells. A piece the legs used to carry (a foot's outline beside the trousers) would float.
  const legBoxes: Box[] = [...pose.pants, ...pose.shorts, pose.shoeL, pose.shoeR, ...pose.flats];
  const candidate = (x: number, y: number) =>
    y > hemP &&
    y < figure.h &&
    x >= 0 &&
    x < figure.w &&
    figure.cells[y * figure.w + x] !== EMPTY &&
    !legBoxes.some((b) => inBox(x, y, b));
  const kept = new Set<number>();
  const stack: [number, number][] = [];
  for (let x = 0; x < figure.w; x++)
    if (figure.cells[hemP * figure.w + x] !== EMPTY) stack.push([x, hemP]);
  while (stack.length) {
    const [x, y] = stack.pop()!;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx;
        const Y = y + dy;
        if ((dx || dy) && candidate(X, Y) && !kept.has(Y * figure.w + X)) {
          kept.add(Y * figure.w + X);
          stack.push([X, Y]);
        }
      }
  }
  for (const k of kept) put(k % figure.w, Math.floor(k / figure.w), figure.cells[k]!);
  closeSeam(cells, w, h, hemP);
  const shiftX = -minX;
  const own = (b: Box) => shiftBox(b, shiftX, 0);
  const stepped = (b: Box) => shiftBox(b, dx + shiftX, dy);
  const id = `${body.id}_${view}${step}`;
  const front = pose.form.front;
  return {
    ...pose,
    id,
    form: {
      ...pose.form,
      id,
      label: `${pose.form.label} ${step === 0 ? 'A' : 'B'}`,
      figure: { w, h, cells },
      headMap: shiftX
        ? (x, y) => {
            const [fx, fy] = pose.form.headMap!(x, y);
            return [fx + shiftX, fy];
          }
        : pose.form.headMap,
      ...(front ? { front: pad(front, shiftX, w, h) } : {}),
    },
    w,
    torso: own(pose.torso),
    neck: pose.neck.map(own),
    shoulders: pose.shoulders.map(own),
    sleeveL: sleeves(pose.sleeveL, own),
    sleeveR: sleeves(pose.sleeveR, own),
    collar: pose.collar.map(own),
    hem: own(pose.hem),
    pants: walk.pants.map(stepped),
    shorts: walk.shorts.map(stepped),
    shoeL: stepped(walk.shoeL),
    shoeR: stepped(walk.shoeR),
    flats: walk.flats.map(stepped),
    skirt: mergeSkirt(pose.skirt, walk.skirt, hemP, shiftX, dx + shiftX, dy),
    ...(walk.dress && pose.dress
      ? { dress: mergeSkirt(pose.dress, walk.dress, hemP, shiftX, dx + shiftX, dy) }
      : walk.dress
        ? { dress: { x: walk.dress.x + dx + shiftX, y: walk.dress.y + dy, rows: walk.dress.rows } }
        : {}),
    snapItems: true,
    ...(walk.legSplit !== undefined ? { legSplit: walk.legSplit + dx + shiftX } : {}),
    ...(walk.nearLeg ? { nearLeg: walk.nearLeg } : {}),
    ...(walk.walkKey ? { walkKey: walk.walkKey } : {}),
    extrasDx: 0,
  };
}

function sleeves<T extends { short: Box; long: Box; torn?: Box }>(s: T, f: (b: Box) => Box): T {
  return { ...s, short: f(s.short), long: f(s.long), ...(s.torn ? { torn: f(s.torn) } : {}) };
}

type Drawn = { x: number; y: number; rows: string[] };

/**
 * A skirt (or dress) for the composite: the stance's drawing down to the hem
 * row, where it fits the stance's hips, then the step's from its first row
 * below the hem, where it fits the stride; a cell of the wider piece left
 * uncovered at the seam gets a line above or below it.
 */
function mergeSkirt(
  top: Drawn,
  bottom: Drawn,
  hem: number,
  dxTop: number,
  dxBottom: number,
  dy: number,
): Drawn {
  const cells = new Map<string, string>();
  const place = (d: Drawn, dx: number, ddy: number, keep: (y: number) => boolean) =>
    d.rows.forEach((row, ry) => {
      const y = d.y + ry + ddy;
      if (!keep(y)) return;
      [...row].forEach((ch, rx) => {
        if (ch !== '.') cells.set(`${d.x + rx + dx},${y}`, ch);
      });
    });
  place(top, dxTop, 0, (y) => y <= hem);
  place(bottom, dxBottom, dy, (y) => y > hem);
  if (cells.size === 0) return { x: bottom.x + dxBottom, y: bottom.y + dy, rows: bottom.rows };
  const at = (x: number, y: number) => cells.get(`${x},${y}`) ?? '.';
  for (const [k, ch] of [...cells]) {
    if (ch === 'o') continue;
    const [x, y] = k.split(',').map(Number) as [number, number];
    if (y === hem || y === hem + 1)
      for (const [ax, ay] of [
        [0, -1],
        [0, 1],
        [1, 0],
        [-1, 0],
      ] as const)
        if (at(x + ax, y + ay) === '.' && (y + ay === hem || y + ay === hem + 1 || ay === 0))
          cells.set(`${x + ax},${y + ay}`, 'o');
  }
  const xs = [...cells.keys()].map((k) => Number(k.split(',')[0]));
  const ys = [...cells.keys()].map((k) => Number(k.split(',')[1]));
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const x1 = Math.max(...xs);
  const y1 = Math.max(...ys);
  const rows: string[] = [];
  for (let y = y0; y <= y1; y++) {
    let row = '';
    for (let x = x0; x <= x1; x++) row += at(x, y);
    rows.push(row);
  }
  return { x: x0, y: y0, rows };
}

/** A front mask moved right by `dx` on a `w`×`h` canvas. */
function pad(s: Sprite, dx: number, w: number, h: number): Sprite {
  const cells = new Int16Array(w * h).fill(EMPTY);
  for (let y = 0; y < s.h && y < h; y++)
    for (let x = 0; x < s.w; x++) {
      const X = x + dx;
      if (X >= 0 && X < w) cells[y * w + X] = s.cells[y * s.w + x]!;
    }
  return { w, h, cells };
}

const LINE = packCell(LEGEND.o!);
const LINE_MATERIAL = MATERIALS.indexOf('line');

/**
 * Closes the silhouette where the stance and the step meet: from the hem row
 * down, a material cell with a transparent 4-neighbour gets a line cell there
 * (the trousers' top under a narrower hem, a hand's side where the leg moved
 * away), and a line cell of the seam band left with no line beside it (the
 * stance's crotch line under a step whose legs part elsewhere) takes the cell
 * above it.
 */
function closeSeam(cells: Int16Array, w: number, h: number, hem: number): void {
  const at = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h ? cells[y * w + x]! : EMPTY;
  const isLine = (v: number) => v !== EMPTY && Math.floor(v / 8) === LINE_MATERIAL;
  const N4: readonly (readonly [number, number])[] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (let y = hem; y < h; y++)
    for (let x = 0; x < w; x++) {
      const v = at(x, y);
      if (v === EMPTY || isLine(v)) continue;
      for (const [dx, dy] of N4)
        if (at(x + dx, y + dy) === EMPTY && y + dy < h && y + dy >= 0 && x + dx >= 0 && x + dx < w)
          cells[(y + dy) * w + x + dx] = LINE;
    }
  for (let y = Math.max(0, hem - 1); y <= hem + 1 && y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!isLine(at(x, y))) continue;
      let lines = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && isLine(at(x + dx, y + dy))) lines++;
      if (lines === 0) cells[y * w + x] = at(x, y - 1);
    }
}

/** The posed looks whose bodies step, dressed on a step of a view: outfit and figure, for the sheets and the QA. */
export function posedWalkCast(
  view: HeroView,
  step: 0 | 1,
): { id: string; label: string; outfit: Outfit; figure: Sprite }[] {
  const out: { id: string; label: string; outfit: Outfit; figure: Sprite }[] = [];
  for (const l of POSED_LOOKS) {
    const body = POSED_BODIES.find((b) => b.id === l.pose.id);
    if (!body) continue;
    const pose = posedStep(body, view, step);
    if (!pose) continue;
    out.push({
      id: l.id,
      label: l.label,
      outfit: buildOutfit(l.id, l.label, pose, l.look, view),
      figure: pose.form.figure!,
    });
  }
  return out;
}
