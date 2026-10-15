import { Vector3, type BufferGeometry } from 'three';

const done = new WeakSet<BufferGeometry>();

/**
 * Recomputes vertex normals by averaging face normals over every vertex that
 * shares a position, ignoring UV/material splits (PIXEL_RULES §5). Low-poly
 * meshes exported with split normals shade as facets; at sprite resolution a
 * facet boundary becomes a jagged band edge, while a smooth normal field gives
 * the large, simple light masses pixel art uses. Skinning attributes are untouched.
 * Idempotent per geometry.
 */
export function smoothNormalsByPosition(geometry: BufferGeometry, tolerance = 1e-4): void {
  if (done.has(geometry)) return;
  done.add(geometry);
  const pos = geometry.getAttribute('position');
  if (!pos) return;
  const count = pos.count;
  const index = geometry.getIndex();
  const scale = 1 / tolerance;
  const groupOf = new Int32Array(count);
  const groups = new Map<string, number>();
  const groupNormals: number[][] = [];
  for (let i = 0; i < count; i++) {
    const key = `${Math.round(pos.getX(i) * scale)},${Math.round(pos.getY(i) * scale)},${Math.round(pos.getZ(i) * scale)}`;
    let g = groups.get(key);
    if (g === undefined) {
      g = groupNormals.length;
      groups.set(key, g);
      groupNormals.push([0, 0, 0]);
    }
    groupOf[i] = g;
  }
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const cb = new Vector3();
  const ab = new Vector3();
  const tri = index ? index.count / 3 : count / 3;
  for (let t = 0; t < tri; t++) {
    const i0 = index ? index.getX(t * 3) : t * 3;
    const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;
    a.fromBufferAttribute(pos, i0);
    b.fromBufferAttribute(pos, i1);
    c.fromBufferAttribute(pos, i2);
    cb.subVectors(c, b);
    ab.subVectors(a, b);
    cb.cross(ab); // area-weighted face normal
    for (const i of [i0, i1, i2]) {
      const n = groupNormals[groupOf[i]!]!;
      n[0]! += cb.x;
      n[1]! += cb.y;
      n[2]! += cb.z;
    }
  }
  const normal = geometry.getAttribute('normal');
  if (!normal) return;
  for (let i = 0; i < count; i++) {
    const n = groupNormals[groupOf[i]!]!;
    const len = Math.hypot(n[0]!, n[1]!, n[2]!) || 1;
    normal.setXYZ(i, n[0]! / len, n[1]! / len, n[2]! / len);
  }
  normal.needsUpdate = true;
}
