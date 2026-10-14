import {
  DIRECTIONS_8,
  PART_NONE,
  type Catalog,
  type CatalogAnimation,
  type CharacterConfig,
  type Direction,
} from '@pixiso/shared';
import type { Object3D } from 'three';
import {
  AnimationClip,
  AnimationMixer,
  Group,
  LoopOnce,
  LoopRepeat,
  Mesh,
  PropertyBinding,
  SkinnedMesh,
  VectorKeyframeTrack,
  type AnimationAction,
} from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { RecolorMethod } from '../state/store.js';
import { characterFile, loadGltf } from './loader.js';
import {
  createGradientMap,
  isPixisoMaterial,
  labFromHex,
  makeToonMaterial,
  meshSourceLch,
  setRecolor,
  type PixisoToonMaterial,
} from './toon.js';

/** Yaw (rotation about +Y) that makes the model face the camera (direction "S"). The glTF forward is +Z. */
export const YAW_S_RAD = Math.PI / 4;

/** Direction k is 45° clockwise (seen from above) from the previous one, i.e. yaw decreases. */
export function yawForDirection(direction: Direction): number {
  const k = DIRECTIONS_8.indexOf(direction);
  return YAW_S_RAD - k * (Math.PI / 4);
}

export interface RigDebugState {
  characterId: string | null;
  clip: string | null;
  direction: Direction;
  hiddenBuiltins: string[];
  visibleBuiltins: string[];
  attached: Record<string, string>;
  recolored: Record<string, { method: RecolorMethod; hex: string }>;
}

interface AttachedPart {
  partId: string;
  object: Object3D;
}

/**
 * Owns one character instance: model clone, built-in part visibility, attached
 * file parts, per-mesh toon materials, and the animation mixer. `root` has its
 * pivot at the feet and carries the yaw for the current direction.
 */
export class CharacterRig {
  readonly root = new Group();
  private readonly gradientMap = createGradientMap();
  private model: Object3D | null = null;
  private characterId: string | null = null;
  private mixer: AnimationMixer | null = null;
  private clips = new Map<string, AnimationClip>();
  private action: AnimationAction | null = null;
  private current: CatalogAnimation | null = null;
  private bones = new Map<string, Object3D>();
  private builtin = new Map<string, Object3D>();
  private skinned = new Map<string, SkinnedMesh>();
  private attached = new Map<string, AttachedPart>();
  private direction: Direction = 'S';
  private applyToken = 0;

  constructor() {
    this.root.name = 'CharacterRig';
    this.setDirection('S');
  }

  get ready(): boolean {
    return this.model !== null;
  }

  /** Applies a config; later calls supersede earlier in-flight ones. */
  async applyConfig(
    config: CharacterConfig,
    catalog: Catalog,
    method: RecolorMethod,
  ): Promise<void> {
    const token = ++this.applyToken;
    const stale = () => token !== this.applyToken;
    if (config.baseCharacter !== this.characterId) {
      await this.loadCharacter(config.baseCharacter, catalog);
      if (stale()) return;
    }
    await this.applyParts(config, catalog, stale);
    if (stale()) return;
    this.applyColors(config, catalog, method);
    if (this.current) this.setAnimation(this.current, this.action?.time ?? 0);
  }

  private async loadCharacter(characterId: string, catalog: Catalog): Promise<void> {
    const character = catalog.characters.find((c) => c.id === characterId);
    if (!character) throw new Error(`unknown character "${characterId}"`);
    const gltf = await loadGltf(characterFile(characterId));

    const model = SkeletonUtils.clone(gltf.scene);
    model.name = `character:${characterId}`;
    this.disposeModel();
    this.bones.clear();
    this.builtin.clear();
    this.skinned.clear();
    this.attached.clear();
    this.clips.clear();

    model.traverse((o) => {
      if (o instanceof SkinnedMesh) this.skinned.set(o.name, o);
      if (o instanceof Mesh) {
        o.frustumCulled = false;
        o.material = makeToonMaterial(o.material, this.gradientMap);
      }
    });
    // GLTFLoader strips reserved characters from node names ("handslot.r" -> "handslotr"),
    // so look bones and built-in nodes up by their sanitized names.
    for (const slot of catalog.slots) {
      const bone = model.getObjectByName(PropertyBinding.sanitizeNodeName(slot.bone));
      if (bone) this.bones.set(slot.id, bone);
    }
    for (const name of character.builtinNodes) {
      const node = model.getObjectByName(PropertyBinding.sanitizeNodeName(name));
      if (node) {
        node.visible = false;
        this.builtin.set(name, node);
      }
    }
    const loops = new Set(catalog.animations.filter((a) => a.loop).map((a) => a.clip));
    for (const clip of gltf.animations) {
      this.clips.set(clip.name, loops.has(clip.name) ? stripHorizontalRootMotion(clip) : clip);
    }

    this.model = model;
    this.characterId = characterId;
    this.mixer = new AnimationMixer(model);
    this.action = null;
    this.root.add(model);
  }

  private async applyParts(
    config: CharacterConfig,
    catalog: Catalog,
    stale: () => boolean,
  ): Promise<void> {
    if (!this.model) return;
    for (const slot of catalog.slots) {
      const wanted = config.parts[slot.id] ?? PART_NONE;
      const part = wanted === PART_NONE ? undefined : catalog.parts.find((p) => p.id === wanted);

      // Built-in meshes: visible only when selected in this slot.
      for (const p of catalog.parts) {
        if (p.source.type !== 'builtin' || !p.slots.includes(slot.id)) continue;
        const node = this.builtin.get(p.source.node);
        if (node) node.visible = part?.id === p.id && part.source.type === 'builtin';
      }

      const current = this.attached.get(slot.id);
      if (part?.source.type === 'file') {
        if (current?.partId === part.id) continue;
        const gltf = await loadGltf(part.source.file);
        if (stale()) return;
        this.detach(slot.id);
        const object = gltf.scene.clone(true);
        object.name = `part:${slot.id}:${part.id}`;
        object.traverse((o) => {
          if (o instanceof Mesh) {
            o.frustumCulled = false;
            o.material = makeToonMaterial(o.material, this.gradientMap);
          }
        });
        const attach = part.attach?.[slot.id];
        if (attach) {
          object.position.fromArray(attach.translation);
          object.quaternion.fromArray(attach.rotation);
        }
        const bone = this.bones.get(slot.id);
        if (!bone)
          throw new Error(`slot "${slot.id}": bone "${slot.bone}" missing on ${this.characterId}`);
        bone.add(object);
        this.attached.set(slot.id, { partId: part.id, object });
      } else if (current) {
        this.detach(slot.id);
      }
    }
  }

  private detach(slotId: string): void {
    const current = this.attached.get(slotId);
    if (!current) return;
    current.object.removeFromParent();
    current.object.traverse((o) => {
      if (o instanceof Mesh && isPixisoMaterial(o.material)) o.material.dispose();
    });
    this.attached.delete(slotId);
  }

  private meshesForTarget(targetId: string, catalog: Catalog): Mesh[] {
    const target = catalog.colorTargets.find((t) => t.id === targetId);
    if (!target) return [];
    const out: Mesh[] = [];
    if (target.kind === 'mesh') {
      for (const [name, mesh] of this.skinned) {
        if (target.meshSuffixes!.some((s) => name.endsWith(s))) out.push(mesh);
      }
    } else if (target.slot) {
      const attached = this.attached.get(target.slot);
      const roots: Object3D[] = attached ? [attached.object] : [];
      for (const node of this.builtin.values())
        if (node.visible && this.builtinSlot(node.name, catalog) === target.slot) roots.push(node);
      for (const r of roots) r.traverse((o) => o instanceof Mesh && out.push(o));
    }
    return out;
  }

  private builtinSlot(node: string, catalog: Catalog): string | undefined {
    return catalog.parts.find((p) => p.source.type === 'builtin' && p.source.node === node)
      ?.slots[0];
  }

  private applyColors(config: CharacterConfig, catalog: Catalog, method: RecolorMethod): void {
    if (!this.model) return;
    this.model.traverse((o) => {
      if (o instanceof Mesh && isPixisoMaterial(o.material)) setRecolor(o.material, null);
    });
    for (const assignment of config.colors) {
      const color = catalog.colors.find((c) => c.id === assignment.color);
      if (!color || assignment.color === 'original') continue;
      const targetLab = labFromHex(color.hex);
      for (const mesh of this.meshesForTarget(assignment.target, catalog)) {
        if (!isPixisoMaterial(mesh.material)) continue;
        setRecolor(mesh.material, { method, targetLab, sourceLch: meshSourceLch(mesh) });
      }
    }
  }

  // ----- animation -----------------------------------------------------------

  setAnimation(anim: CatalogAnimation, time = 0): void {
    const clip = this.clips.get(anim.clip);
    if (!clip || !this.mixer) return;
    if (this.action) this.action.stop();
    const action = this.mixer.clipAction(clip);
    action.setLoop(anim.loop ? LoopRepeat : LoopOnce, Infinity);
    action.clampWhenFinished = true;
    action.enabled = true;
    action.reset().play();
    action.time = Math.min(time, clip.duration);
    this.mixer.update(0);
    this.action = action;
    this.current = anim;
  }

  /** Deterministic pose at an absolute clip time (used for frame sampling). */
  setTime(t: number): void {
    if (!this.action || !this.mixer) return;
    this.action.paused = false;
    this.action.time = t;
    this.mixer.update(0);
  }

  update(dt: number): void {
    this.mixer?.update(dt);
  }

  get clipDuration(): number {
    return this.action?.getClip().duration ?? 0;
  }

  setDirection(direction: Direction): void {
    this.direction = direction;
    this.root.rotation.set(0, yawForDirection(direction), 0);
  }

  getDebugState(): RigDebugState {
    const recolored: Record<string, { method: RecolorMethod; hex: string }> = {};
    this.model?.traverse((o) => {
      if (o instanceof Mesh && isPixisoMaterial(o.material)) {
        const r = (o.material as PixisoToonMaterial).userData.pixiso.recolor;
        if (r) recolored[o.name] = { method: r.method, hex: labKey(r.targetLab) };
      }
    });
    const attached: Record<string, string> = {};
    for (const [slot, a] of this.attached) attached[slot] = a.partId;
    const builtins = [...this.builtin.entries()];
    return {
      characterId: this.characterId,
      clip: this.current?.clip ?? null,
      direction: this.direction,
      hiddenBuiltins: builtins
        .filter(([, n]) => !n.visible)
        .map(([k]) => k)
        .sort(),
      visibleBuiltins: builtins
        .filter(([, n]) => n.visible)
        .map(([k]) => k)
        .sort(),
      attached,
      recolored,
    };
  }

  /** All meshes currently rendered (for measurements). */
  visibleMeshes(): Mesh[] {
    const out: Mesh[] = [];
    this.root.traverse((o) => {
      if (o instanceof Mesh && o.visible && isVisibleChain(o, this.root)) out.push(o);
    });
    return out;
  }

  private disposeModel(): void {
    if (!this.model) return;
    this.mixer?.stopAllAction();
    this.model.removeFromParent();
    this.model.traverse((o) => {
      if (o instanceof Mesh && isPixisoMaterial(o.material)) o.material.dispose();
    });
    this.model = null;
    this.mixer = null;
    this.action = null;
  }
}

function isVisibleChain(o: Object3D, stopAt: Object3D): boolean {
  let cur: Object3D | null = o;
  while (cur && cur !== stopAt) {
    if (!cur.visible) return false;
    cur = cur.parent;
  }
  return true;
}

function labKey(lab: [number, number, number]): string {
  return lab.map((v) => v.toFixed(3)).join(',');
}

/**
 * Returns a copy of the clip whose `hips`/`root` position tracks keep only their
 * first X/Z value (vertical bob is preserved), so looping clips never drift
 * horizontally off the pivot (HANDOFF §6.2).
 */
export function stripHorizontalRootMotion(clip: AnimationClip): AnimationClip {
  const tracks = clip.tracks.map((track) => {
    if (!(track instanceof VectorKeyframeTrack)) return track;
    const [node, prop] = track.name.split('.');
    if (prop !== 'position' || (node !== 'hips' && node !== 'root')) return track;
    const values = Float32Array.from(track.values);
    const x0 = values[0]!;
    const z0 = values[2]!;
    for (let i = 0; i < values.length; i += 3) {
      values[i] = x0;
      values[i + 2] = z0;
    }
    const copy = new VectorKeyframeTrack(track.name, Array.from(track.times), Array.from(values));
    copy.setInterpolation(track.getInterpolation());
    return copy;
  });
  return new AnimationClip(clip.name, clip.duration, tracks, clip.blendMode);
}
