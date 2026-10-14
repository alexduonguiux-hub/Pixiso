/**
 * Inspects the KayKit glTF files with @gltf-transform (no rendering) and writes
 *   - assets/inspection.json   machine-readable, consumed by build-catalog.ts
 *   - docs/ASSET_REPORT.md     human-readable report
 * Both outputs are deterministic (sorted, rounded) so re-running produces no diff.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  NodeIO,
  type Accessor,
  type Animation,
  type Document,
  type Mesh,
  type Node,
  type Texture,
} from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { ASSET_REPORT_MD, INSPECTION_JSON, KAYKIT, KAYKIT_DIR, idFromFile } from './lib/paths.js';

type Vec3 = [number, number, number];
type Vec4 = [number, number, number, number];

export interface BBox {
  min: Vec3;
  max: Vec3;
  size: Vec3;
}
export interface Transform {
  translation: Vec3;
  rotation: Vec4;
  scale: Vec3;
}
export interface MeshInfo {
  node: string;
  mesh: string;
  vertices: number;
  triangles: number;
  material: string;
  bbox: BBox;
}
export interface BuiltinPartInfo extends MeshInfo, Transform {
  /** Nearest ancestor that is a skin joint. */
  parentBone: string;
}
export interface BoneInfo extends Transform {
  found: boolean;
  worldPosition: Vec3;
}
export interface AnimationInfo {
  name: string;
  durationS: number;
  channels: number;
  /** Max horizontal (XZ) distance of the hips from their first keyframe. */
  hipsXZMaxExcursion: number;
  /** Horizontal distance between the last and first hips keyframe. */
  hipsXZNetDrift: number;
  hipsYMin: number;
  hipsYMax: number;
  rootXZNetDrift: number;
  /** True when the clip translates the character horizontally (net drift > 0.1 m). */
  rootMotion: boolean;
}
/** Extents measured in the iso camera's image plane for a given facing yaw. */
export interface ProjectedExtent {
  yawDeg: number;
  /** Full height on screen in metres (vertical extent + depth·sinθ). */
  heightM: number;
  /** Metres above the origin pixel (head). */
  aboveM: number;
  /** Metres below the origin pixel (front of the feet). */
  belowM: number;
  /** Full width on screen in metres. */
  widthM: number;
}

export interface CharacterInspection {
  id: string;
  file: string;
  generator: string;
  textureImage: string;
  textureSize: [number, number] | null;
  materials: string[];
  jointCount: number;
  joints: string[];
  rigTransform: Transform;
  attachBones: Record<string, BoneInfo>;
  skinnedMeshes: MeshInfo[];
  builtinParts: BuiltinPartInfo[];
  restBBox: BBox;
  heightM: number;
  /** Rest-pose extents as seen by the 30°/45° camera, facing S (yaw 45°) and the max over 8 directions. */
  projectedS: ProjectedExtent;
  projectedMax: ProjectedExtent;
  animations: AnimationInfo[];
  nodeTree: string[];
}
export interface AccessoryInspection extends MeshInfo, Transform {
  id: string;
  file: string;
  textureImage: string;
  textureUri: string;
}
export interface Inspection {
  version: 1;
  asset: typeof KAYKIT;
  characters: CharacterInspection[];
  accessories: AccessoryInspection[];
  /** Clips present in every character, sorted. */
  commonAnimations: string[];
}

const ATTACH_BONES = ['handslot.r', 'handslot.l', 'head', 'chest', 'hips', 'root'];
const ROOT_MOTION_THRESHOLD_M = 0.1;

const r4 = (n: number): number => Math.round(n * 1e4) / 1e4;
const v3 = (a: ArrayLike<number>): Vec3 => [r4(a[0]!), r4(a[1]!), r4(a[2]!)];
const v4 = (a: ArrayLike<number>): Vec4 => [r4(a[0]!), r4(a[1]!), r4(a[2]!), r4(a[3]!)];

function transformOf(node: Node): Transform {
  return {
    translation: v3(node.getTranslation()),
    rotation: v4(node.getRotation()),
    scale: v3(node.getScale()),
  };
}

function emptyBBox(): BBox {
  return {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
    size: [0, 0, 0],
  };
}
function extendBBox(b: BBox, min: ArrayLike<number>, max: ArrayLike<number>): void {
  for (let i = 0; i < 3; i++) {
    b.min[i] = Math.min(b.min[i]!, min[i]!);
    b.max[i] = Math.max(b.max[i]!, max[i]!);
  }
}
function finishBBox(b: BBox): BBox {
  const size: Vec3 = [0, 0, 0];
  for (let i = 0; i < 3; i++) size[i] = r4(b.max[i]! - b.min[i]!);
  return { min: v3(b.min), max: v3(b.max), size };
}

function meshInfo(node: Node, mesh: Mesh): MeshInfo {
  const bbox = emptyBBox();
  let vertices = 0;
  let triangles = 0;
  const materials = new Set<string>();
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION');
    if (pos) {
      vertices += pos.getCount();
      const min = [0, 0, 0];
      const max = [0, 0, 0];
      pos.getMin(min);
      pos.getMax(max);
      extendBBox(bbox, min, max);
    }
    const idx = prim.getIndices();
    triangles += Math.floor((idx ? idx.getCount() : (pos?.getCount() ?? 0)) / 3);
    materials.add(prim.getMaterial()?.getName() ?? '(none)');
  }
  return {
    node: node.getName(),
    mesh: mesh.getName(),
    vertices,
    triangles,
    material: [...materials].sort().join(', '),
    bbox: finishBBox(bbox),
  };
}

function pngSize(bytes: Uint8Array): [number, number] | null {
  if (bytes.length < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50) return null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return [dv.getUint32(16), dv.getUint32(20)];
}

function textureSize(tex: Texture | null): [number, number] | null {
  if (!tex) return null;
  const img = tex.getImage();
  return img ? pngSize(img) : null;
}

function sampleTranslations(acc: Accessor, interpolation: string): Vec3[] {
  const arr = acc.getArray()!;
  const stride = acc.getElementSize();
  const out: Vec3[] = [];
  // CUBICSPLINE stores in-tangent, value, out-tangent per keyframe; keep the value.
  const step = interpolation === 'CUBICSPLINE' ? 3 : 1;
  const offset = interpolation === 'CUBICSPLINE' ? 1 : 0;
  for (let i = 0; i < acc.getCount(); i += step) {
    const base = (i + offset) * stride;
    out.push([arr[base]!, arr[base + 1]!, arr[base + 2]!]);
  }
  return out;
}

function animationInfo(anim: Animation): AnimationInfo {
  let duration = 0;
  let hipsXZMaxExcursion = 0;
  let hipsXZNetDrift = 0;
  let hipsYMin = Infinity;
  let hipsYMax = -Infinity;
  let rootXZNetDrift = 0;
  const channels = anim.listChannels();
  for (const ch of channels) {
    const sampler = ch.getSampler();
    const input = sampler?.getInput();
    if (input) {
      const max = [0];
      input.getMax(max);
      duration = Math.max(duration, max[0]!);
    }
    const target = ch.getTargetNode()?.getName();
    if (
      ch.getTargetPath() !== 'translation' ||
      !sampler ||
      (target !== 'hips' && target !== 'root')
    )
      continue;
    const output = sampler.getOutput();
    if (!output) continue;
    const samples = sampleTranslations(output, sampler.getInterpolation());
    if (samples.length === 0) continue;
    const [x0, , z0] = samples[0]!;
    const last = samples[samples.length - 1]!;
    const net = Math.hypot(last[0] - x0, last[2] - z0);
    if (target === 'root') {
      rootXZNetDrift = Math.max(rootXZNetDrift, net);
      continue;
    }
    hipsXZNetDrift = Math.max(hipsXZNetDrift, net);
    for (const [x, y, z] of samples) {
      hipsXZMaxExcursion = Math.max(hipsXZMaxExcursion, Math.hypot(x - x0, z - z0));
      hipsYMin = Math.min(hipsYMin, y);
      hipsYMax = Math.max(hipsYMax, y);
    }
  }
  if (!Number.isFinite(hipsYMin)) hipsYMin = hipsYMax = 0;
  return {
    name: anim.getName(),
    durationS: r4(duration),
    channels: channels.length,
    hipsXZMaxExcursion: r4(hipsXZMaxExcursion),
    hipsXZNetDrift: r4(hipsXZNetDrift),
    hipsYMin: r4(hipsYMin),
    hipsYMax: r4(hipsYMax),
    rootXZNetDrift: r4(rootXZNetDrift),
    rootMotion: Math.max(hipsXZNetDrift, rootXZNetDrift) > ROOT_MOTION_THRESHOLD_M,
  };
}

const ISO_ELEVATION = Math.PI / 6;
const ISO_AZIMUTH = Math.PI / 4;

/**
 * Projects rest-pose vertices onto the iso camera's image plane for a facing yaw.
 * Camera looks from azimuth 45°, elevation 30°; up vector u = (−sinθ·sin45, cosθ, −sinθ·cos45),
 * right vector r = (cos45, 0, −sin45). Vertex rotated by yaw about +Y first.
 */
function projectedExtent(positions: Float32Array[], yawRad: number): ProjectedExtent {
  const sy = Math.sin(yawRad);
  const cy = Math.cos(yawRad);
  const st = Math.sin(ISO_ELEVATION);
  const ct = Math.cos(ISO_ELEVATION);
  const sa = Math.sin(ISO_AZIMUTH);
  const ca = Math.cos(ISO_AZIMUTH);
  let minV = Infinity,
    maxV = -Infinity,
    minH = Infinity,
    maxH = -Infinity;
  for (const arr of positions) {
    for (let i = 0; i < arr.length; i += 3) {
      const x = arr[i]!;
      const y = arr[i + 1]!;
      const z = arr[i + 2]!;
      const rx = x * cy + z * sy;
      const rz = -x * sy + z * cy;
      const v = -st * sa * rx + ct * y - st * ca * rz;
      const h = ca * rx - sa * rz;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
      if (h < minH) minH = h;
      if (h > maxH) maxH = h;
    }
  }
  return {
    yawDeg: Math.round((yawRad * 180) / Math.PI),
    heightM: r4(maxV - minV),
    aboveM: r4(maxV),
    belowM: r4(-minV),
    widthM: r4(maxH - minH),
  };
}

function skinnedPositions(root: ReturnType<Document['getRoot']>): Float32Array[] {
  const out: Float32Array[] = [];
  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (!mesh || !node.getSkin()) continue;
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      if (pos) out.push(Float32Array.from(pos.getArray()!));
    }
  }
  return out;
}

function nearestJointAncestor(node: Node, joints: Set<Node>): string {
  let cur = node.getParentNode();
  while (cur) {
    if (joints.has(cur)) return cur.getName();
    cur = cur.getParentNode();
  }
  return '(none)';
}

function buildTree(node: Node, depth: number, joints: Set<Node>, out: string[]): void {
  const mesh = node.getMesh();
  let label = node.getName() || '(unnamed)';
  if (mesh) {
    const info = meshInfo(node, mesh);
    label += ` [mesh ${info.vertices} verts${node.getSkin() ? ', skinned' : ''}]`;
  } else if (joints.has(node)) {
    label += ' (joint)';
  }
  out.push(`${'  '.repeat(depth)}${label}`);
  for (const child of node.listChildren()) buildTree(child, depth + 1, joints, out);
}

function inspectCharacter(doc: Document, file: string): CharacterInspection {
  const root = doc.getRoot();
  const scene = root.getDefaultScene() ?? root.listScenes()[0]!;
  const skin = root.listSkins()[0];
  const joints = new Set<Node>(skin ? skin.listJoints() : []);
  const nodesByName = new Map<string, Node>();
  for (const n of root.listNodes()) nodesByName.set(n.getName(), n);

  const skinnedMeshes: MeshInfo[] = [];
  const builtinParts: BuiltinPartInfo[] = [];
  const rest = emptyBBox();
  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const info = meshInfo(node, mesh);
    if (node.getSkin()) {
      skinnedMeshes.push(info);
      extendBBox(rest, info.bbox.min, info.bbox.max);
    } else {
      builtinParts.push({
        ...info,
        ...transformOf(node),
        parentBone: nearestJointAncestor(node, joints),
      });
    }
  }
  skinnedMeshes.sort((a, b) => a.node.localeCompare(b.node));
  builtinParts.sort((a, b) => a.node.localeCompare(b.node));

  const attachBones: Record<string, BoneInfo> = {};
  for (const name of ATTACH_BONES) {
    const node = nodesByName.get(name);
    if (!node) {
      attachBones[name] = {
        found: false,
        translation: [0, 0, 0],
        rotation: [0, 0, 0, 1],
        scale: [1, 1, 1],
        worldPosition: [0, 0, 0],
      };
      continue;
    }
    const m = node.getWorldMatrix();
    attachBones[name] = {
      found: true,
      ...transformOf(node),
      worldPosition: v3([m[12]!, m[13]!, m[14]!]),
    };
  }

  const rigNode = scene.listChildren()[0]!;
  const material = root.listMaterials()[0];
  const tex = material?.getBaseColorTexture() ?? null;
  const tree: string[] = [];
  for (const child of scene.listChildren()) buildTree(child, 0, joints, tree);

  const restBBox = finishBBox(rest);
  const positions = skinnedPositions(root);
  const projectedS = projectedExtent(positions, Math.PI / 4);
  let projectedMax = projectedS;
  for (let k = 1; k < 8; k++) {
    const e = projectedExtent(positions, Math.PI / 4 - (k * Math.PI) / 4);
    if (e.heightM > projectedMax.heightM) projectedMax = e;
  }
  return {
    id: idFromFile(file),
    file: `Characters/gltf/${path.basename(file)}`,
    generator: root.getAsset().generator ?? '',
    textureImage: tex?.getName() ?? '(none)',
    textureSize: textureSize(tex),
    materials: root
      .listMaterials()
      .map((m) => m.getName())
      .sort(),
    jointCount: joints.size,
    joints: skin ? skin.listJoints().map((j) => j.getName()) : [],
    rigTransform: transformOf(rigNode),
    attachBones,
    skinnedMeshes,
    builtinParts,
    restBBox,
    heightM: restBBox.size[1],
    projectedS,
    projectedMax,
    animations: root
      .listAnimations()
      .map(animationInfo)
      .sort((a, b) => a.name.localeCompare(b.name)),
    nodeTree: tree,
  };
}

function inspectAccessory(doc: Document, file: string): AccessoryInspection {
  const root = doc.getRoot();
  const meshNode = root.listNodes().find((n) => n.getMesh()) ?? root.listNodes()[0]!;
  const mesh = meshNode.getMesh()!;
  const material = root.listMaterials()[0];
  const tex = material?.getBaseColorTexture() ?? null;
  return {
    id: idFromFile(file),
    file: `Assets/gltf/${path.basename(file)}`,
    ...meshInfo(meshNode, mesh),
    ...transformOf(meshNode),
    textureImage: tex?.getName() ?? '(none)',
    textureUri: tex?.getURI() ?? '',
  };
}

// ---------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------

const f = (n: number, d = 3): string => n.toFixed(d);
const vec = (v: ArrayLike<number>, d = 3): string =>
  `(${Array.from(v)
    .map((x) => f(x, d))
    .join(', ')})`;
const row = (cells: (string | number)[]): string => `| ${cells.join(' | ')} |`;
const header = (cells: string[]): string => `${row(cells)}\n${row(cells.map(() => '---'))}`;

function renderReport(ins: Inspection): string {
  const L: string[] = [];
  L.push('# Asset report: KayKit Character Pack — Adventurers');
  L.push('');
  L.push(
    `> Generated by \`pnpm assets:inspect\` from ${KAYKIT.repo} @ \`${KAYKIT.commit}\`. Do not edit by hand.`,
  );
  L.push('');
  L.push('## 1. Characters');
  L.push('');
  L.push(
    header([
      'id',
      'file',
      'rest height (m)',
      'rest bbox size (m)',
      'skinned meshes',
      'built-in parts',
      'joints',
      'texture',
      'clips',
    ]),
  );
  for (const c of ins.characters) {
    L.push(
      row([
        c.id,
        c.file,
        f(c.heightM),
        vec(c.restBBox.size),
        c.skinnedMeshes.length,
        c.builtinParts.length,
        c.jointCount,
        `${c.textureImage} ${c.textureSize ? `${c.textureSize[0]}×${c.textureSize[1]}` : '?'}`,
        c.animations.length,
      ]),
    );
  }
  L.push('');
  L.push(
    'Rest-pose bounding boxes come from the raw skinned-mesh POSITION accessors (bind pose = rest pose for these exports). Feet are at y = min.y.',
  );
  L.push('');
  L.push(
    'Projected extents are the same vertices seen by the 30°/45° camera (what the sprite will actually span): facing S (yaw 45°) and the tallest of the 8 directions. `PPM = characterHeightPx / projectedS.heightM` of the reference character (D-018).',
  );
  L.push('');
  L.push(
    header([
      'id',
      'projected S height (m)',
      'above / below origin (m)',
      'projected S width (m)',
      'max height over 8 dirs (m)',
    ]),
  );
  for (const c of ins.characters) {
    L.push(
      row([
        c.id,
        f(c.projectedS.heightM),
        `${f(c.projectedS.aboveM)} / ${f(c.projectedS.belowM)}`,
        f(c.projectedS.widthM),
        `${f(c.projectedMax.heightM)} (yaw ${c.projectedMax.yawDeg}°)`,
      ]),
    );
  }
  L.push('');
  L.push(header(['id', 'rest bbox min', 'rest bbox max', 'Rig node transform']));
  for (const c of ins.characters) {
    L.push(
      row([
        c.id,
        vec(c.restBBox.min),
        vec(c.restBBox.max),
        `T${vec(c.rigTransform.translation)} R${vec(c.rigTransform.rotation, 3)} S${vec(c.rigTransform.scale)}`,
      ]),
    );
  }
  L.push('');

  L.push('## 2. Materials and texture atlas');
  L.push('');
  L.push(
    'Every mesh in a character file (body parts and built-in accessories) shares one material and one gradient atlas texture. Recolouring therefore needs per-mesh material clones (HANDOFF §6.7).',
  );
  L.push('');
  L.push(header(['character', 'materials', 'texture', 'size']));
  for (const c of ins.characters)
    L.push(
      row([
        c.id,
        c.materials.join(', '),
        c.textureImage,
        c.textureSize ? `${c.textureSize[0]}×${c.textureSize[1]}` : '?',
      ]),
    );
  L.push('');

  L.push('## 3. Attachment bones');
  L.push('');
  L.push(
    'Accessory files are meant to be parented to `handslot.r` / `handslot.l` with an identity local transform (the built-in weapons sit there the same way). Local transform is relative to the parent bone; world position is in rest pose.',
  );
  L.push('');
  for (const c of ins.characters) {
    L.push(`### ${c.id}`);
    L.push('');
    L.push(
      header([
        'bone',
        'found',
        'local translation',
        'local rotation (quat)',
        'local scale',
        'world position (rest)',
      ]),
    );
    for (const [name, b] of Object.entries(c.attachBones)) {
      L.push(
        row([
          `\`${name}\``,
          b.found ? 'yes' : '**no**',
          vec(b.translation),
          vec(b.rotation),
          vec(b.scale),
          vec(b.worldPosition),
        ]),
      );
    }
    L.push('');
  }

  L.push('## 4. Built-in accessory meshes (inside each character GLB)');
  L.push('');
  L.push(
    'Non-skinned mesh nodes parented to a bone. They can be toggled by visibility; everything not selected as a part must be hidden.',
  );
  L.push('');
  L.push(
    header([
      'character',
      'node',
      'parent bone',
      'verts',
      'local translation',
      'local rotation (quat)',
      'local scale',
      'bbox size (m)',
    ]),
  );
  for (const c of ins.characters) {
    for (const p of c.builtinParts) {
      L.push(
        row([
          c.id,
          `\`${p.node}\``,
          `\`${p.parentBone}\``,
          p.vertices,
          vec(p.translation),
          vec(p.rotation),
          vec(p.scale),
          vec(p.bbox.size),
        ]),
      );
    }
  }
  L.push('');

  L.push('## 5. Skinned body meshes');
  L.push('');
  L.push(header(['character', 'node', 'verts', 'tris', 'bbox min', 'bbox max']));
  for (const c of ins.characters)
    for (const m of c.skinnedMeshes)
      L.push(
        row([c.id, `\`${m.node}\``, m.vertices, m.triangles, vec(m.bbox.min), vec(m.bbox.max)]),
      );
  L.push('');

  L.push('## 6. Accessory files (`Assets/gltf`)');
  L.push('');
  L.push(
    'Separate, unskinned, single-mesh glTF files. Each references a character texture by relative URI; the mesh origin is the grip point.',
  );
  L.push('');
  L.push(
    header([
      'id',
      'file',
      'node',
      'verts',
      'tris',
      'texture (uri)',
      'node transform',
      'bbox min',
      'bbox max',
    ]),
  );
  for (const a of ins.accessories) {
    L.push(
      row([
        a.id,
        a.file,
        `\`${a.node}\``,
        a.vertices,
        a.triangles,
        `${a.textureImage} (${a.textureUri})`,
        `T${vec(a.translation)} R${vec(a.rotation)} S${vec(a.scale)}`,
        vec(a.bbox.min),
        vec(a.bbox.max),
      ]),
    );
  }
  L.push('');

  L.push('## 7. Animations');
  L.push('');
  const ref = ins.characters.find((c) => c.id === 'knight') ?? ins.characters[0]!;
  const byName = new Map<string, AnimationInfo[]>();
  for (const c of ins.characters)
    for (const a of c.animations) byName.set(a.name, [...(byName.get(a.name) ?? []), a]);
  const names = [...byName.keys()].sort();
  L.push(
    `${names.length} distinct clips; ${ins.commonAnimations.length} present in every character. Durations below are from \`${ref.id}\`; a ⚠ marks clips whose duration differs between characters.`,
  );
  L.push('');
  L.push(
    `Root motion = net horizontal drift of \`hips\` or \`root\` over the clip > ${ROOT_MOTION_THRESHOLD_M} m. "hips XZ excursion" is the maximum horizontal distance of the hips from their first keyframe (sway), "net drift" the distance between last and first keyframe.`,
  );
  L.push('');
  L.push(
    header([
      'clip',
      'duration (s)',
      'channels',
      'hips XZ excursion (m)',
      'hips XZ net drift (m)',
      'hips Y range (m)',
      'root XZ net drift (m)',
      'root motion',
      'in all chars',
    ]),
  );
  for (const name of names) {
    const list = byName.get(name)!;
    const a = list.find((x) => ref.animations.includes(x)) ?? list[0]!;
    const durations = new Set(list.map((x) => x.durationS));
    L.push(
      row([
        `\`${name}\``,
        `${f(a.durationS)}${durations.size > 1 ? ' ⚠' : ''}`,
        a.channels,
        f(a.hipsXZMaxExcursion),
        f(a.hipsXZNetDrift),
        `${f(a.hipsYMin)} … ${f(a.hipsYMax)}`,
        f(a.rootXZNetDrift),
        a.rootMotion ? '**yes**' : 'no',
        ins.commonAnimations.includes(name)
          ? 'yes'
          : `**no** (${list.length}/${ins.characters.length})`,
      ]),
    );
  }
  L.push('');

  L.push('## 8. Skeleton');
  L.push('');
  L.push(
    `All characters share the same ${ref.jointCount}-joint rig (\`${ref.joints.join('`, `')}\`).`,
  );
  const diff = ins.characters.filter((c) => c.joints.join('|') !== ref.joints.join('|'));
  L.push(
    diff.length === 0
      ? 'Joint lists are identical in every file.'
      : `⚠ Joint lists differ in: ${diff.map((c) => c.id).join(', ')}.`,
  );
  L.push('');

  L.push('## 9. Node trees');
  L.push('');
  for (const c of ins.characters) {
    L.push(`<details><summary>${c.id} (${c.nodeTree.length} nodes)</summary>`);
    L.push('');
    L.push('```');
    L.push(...c.nodeTree);
    L.push('```');
    L.push('');
    L.push('</details>');
    L.push('');
  }
  return L.join('\n') + '\n';
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const charDir = path.join(KAYKIT_DIR, 'Characters', 'gltf');
  const accDir = path.join(KAYKIT_DIR, 'Assets', 'gltf');
  if (!fs.existsSync(charDir)) {
    throw new Error(`${charDir} not found. Run \`pnpm assets:fetch\` first.`);
  }
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

  const characters: CharacterInspection[] = [];
  for (const file of fs
    .readdirSync(charDir)
    .filter((f) => f.endsWith('.glb'))
    .sort()) {
    const full = path.join(charDir, file);
    console.log(`[inspect-assets] ${file}`);
    characters.push(inspectCharacter(await io.read(full), full));
  }
  characters.sort((a, b) => a.id.localeCompare(b.id));

  const accessories: AccessoryInspection[] = [];
  for (const file of fs
    .readdirSync(accDir)
    .filter((f) => f.endsWith('.gltf'))
    .sort()) {
    const full = path.join(accDir, file);
    accessories.push(inspectAccessory(await io.read(full), full));
  }
  accessories.sort((a, b) => a.id.localeCompare(b.id));

  const nameSets = characters.map((c) => new Set(c.animations.map((a) => a.name)));
  const first = nameSets[0] ?? new Set<string>();
  const commonAnimations = [...first].filter((n) => nameSets.every((s) => s.has(n))).sort();

  const inspection: Inspection = {
    version: 1,
    asset: KAYKIT,
    characters,
    accessories,
    commonAnimations,
  };
  fs.writeFileSync(INSPECTION_JSON, JSON.stringify(inspection, null, 2) + '\n');
  fs.mkdirSync(path.dirname(ASSET_REPORT_MD), { recursive: true });
  fs.writeFileSync(ASSET_REPORT_MD, renderReport(inspection));
  console.log(
    `[inspect-assets] ${characters.length} characters, ${accessories.length} accessories, ${inspection.commonAnimations.length} common clips -> ${path.relative(process.cwd(), ASSET_REPORT_MD)}, ${path.relative(process.cwd(), INSPECTION_JSON)}`,
  );
}

main().catch((err) => {
  console.error(`[inspect-assets] ${(err as Error).stack ?? err}`);
  process.exit(1);
});
