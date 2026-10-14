import {
  linearRgbToOklab,
  oklabToOklch,
  srgb8ToOklab,
  type Lab,
  type Lch,
} from '@pixiso/pixel-core';
import type { Mesh } from 'three';
import {
  DataTexture,
  MeshStandardMaterial,
  MeshToonMaterial,
  NearestFilter,
  RedFormat,
  UnsignedByteType,
  Vector3,
  type BufferGeometry,
  type Material,
  type Texture,
} from 'three';
import type { RecolorMethod } from '../state/store.js';

/** 3-step toon ramp (HANDOFF §6.4), nearest-filtered. */
export function createGradientMap(steps: number[] = [0.35, 0.7, 1.0]): DataTexture {
  const data = new Uint8Array(steps.map((s) => Math.round(s * 255)));
  const tex = new DataTexture(data, steps.length, 1, RedFormat, UnsignedByteType);
  tex.minFilter = NearestFilter;
  tex.magFilter = NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export interface RecolorUniforms {
  uRecolorMode: { value: number };
  uTargetLab: { value: Vector3 };
  uSourceLch: { value: Vector3 };
  uChromaMin: { value: number };
}

export interface RecolorParams {
  method: RecolorMethod;
  targetLab: Lab;
  sourceLch: Lch;
}

export interface PixisoToonMaterial extends MeshToonMaterial {
  userData: { pixiso: { uniforms: RecolorUniforms; recolor: RecolorParams | null } };
}

const GLSL_FUNCS = /* glsl */ `
uniform int uRecolorMode;
uniform vec3 uTargetLab;
uniform vec3 uSourceLch;
uniform float uChromaMin;

vec3 pixisoLinearToOklab(vec3 c) {
  c = max(c, vec3(0.0));
  float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
  float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
  float l_ = pow(l, 1.0 / 3.0);
  float m_ = pow(m, 1.0 / 3.0);
  float s_ = pow(s, 1.0 / 3.0);
  return vec3(
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_);
}

vec3 pixisoOklabToLinear(vec3 lab) {
  float l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s_ = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
  float l = l_ * l_ * l_;
  float m = m_ * m_ * m_;
  float s = s_ * s_ * s_;
  return vec3(
     4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);
}

// Method A (1): rotate hue from the part's dominant hue to the target hue, scale chroma,
// shift lightness; near-grey texels (metal, teeth) are left alone.
// Method B (2): keep the texel's lightness curve, paint the target hue/chroma everywhere.
vec3 pixisoRecolor(vec3 c) {
  if (uRecolorMode == 0) return c;
  vec3 lab = pixisoLinearToOklab(c);
  vec3 t = uTargetLab;
  float sL = uSourceLch.x;
  float sC = max(uSourceLch.y, 0.001);
  float sh = uSourceLch.z;
  if (uRecolorMode == 1) {
    float C = length(lab.yz);
    float h = atan(lab.z, lab.y);
    float tC = length(t.yz);
    float th = atan(t.z, t.y);
    float w = smoothstep(uChromaMin * 0.5, uChromaMin, C);
    float h2 = h + (th - sh);
    float C2 = min(C * (tC / sC), tC * 1.5 + 0.02);
    float L2 = clamp(lab.x + (t.x - sL), 0.0, 1.0);
    lab = mix(lab, vec3(L2, C2 * cos(h2), C2 * sin(h2)), w);
  } else {
    float L2 = clamp(lab.x + (t.x - sL), 0.0, 1.0);
    lab = vec3(L2, t.y, t.z);
  }
  return clamp(pixisoOklabToLinear(lab), 0.0, 1.0);
}
`;

const RECOLOR_FRAG = /* glsl */ `
#include <map_fragment>
diffuseColor.rgb = pixisoRecolor(diffuseColor.rgb);
`;

function firstMap(source: Material | Material[]): Texture | null {
  const m = Array.isArray(source) ? source[0] : source;
  if (m instanceof MeshStandardMaterial || m instanceof MeshToonMaterial) return m.map;
  return null;
}

/**
 * Builds a toon material that keeps the source's atlas texture and carries the
 * recolour uniforms. One material per mesh so recolouring is per part (HANDOFF §6.7).
 */
export function makeToonMaterial(
  source: Material | Material[],
  gradientMap: DataTexture,
): PixisoToonMaterial {
  const map = firstMap(source);
  if (map) {
    // Discrete atlas strips: nearest sampling keeps colours pure at low resolution.
    map.minFilter = NearestFilter;
    map.magFilter = NearestFilter;
    map.generateMipmaps = false;
    map.needsUpdate = true;
  }
  const uniforms: RecolorUniforms = {
    uRecolorMode: { value: 0 },
    uTargetLab: { value: new Vector3() },
    uSourceLch: { value: new Vector3() },
    uChromaMin: { value: 0.04 },
  };
  const mat = new MeshToonMaterial({ map, gradientMap, color: 0xffffff }) as PixisoToonMaterial;
  mat.userData = { pixiso: { uniforms, recolor: null } };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `${GLSL_FUNCS}\nvoid main() {`)
      .replace('#include <map_fragment>', RECOLOR_FRAG);
  };
  mat.customProgramCacheKey = () => 'pixiso-toon-recolor-v1';
  return mat;
}

export function isPixisoMaterial(m: Material | Material[]): m is PixisoToonMaterial {
  return !Array.isArray(m) && 'pixiso' in (m.userData as object);
}

export function setRecolor(mat: PixisoToonMaterial, params: RecolorParams | null): void {
  const u = mat.userData.pixiso.uniforms;
  mat.userData.pixiso.recolor = params;
  if (!params) {
    u.uRecolorMode.value = 0;
    return;
  }
  u.uRecolorMode.value = params.method === 'hue' ? 1 : 2;
  u.uTargetLab.value.set(...params.targetLab);
  u.uSourceLch.value.set(...params.sourceLch);
}

export function labFromHex(hex: string): Lab {
  const n = parseInt(hex.replace('#', ''), 16);
  return srgb8ToOklab((n >> 16) & 255, (n >> 8) & 255, n & 255);
}

export function labFromLinear(r: number, g: number, b: number): Lab {
  return linearRgbToOklab(r, g, b);
}

// ---------------------------------------------------------------------------
// Dominant colour of a mesh, sampled from the atlas at its vertex UVs.
// ---------------------------------------------------------------------------

const imageDataCache = new Map<string, ImageData | null>();

function textureImageData(tex: Texture): ImageData | null {
  const key = tex.source.uuid;
  const hit = imageDataCache.get(key);
  if (hit !== undefined) return hit;
  let data: ImageData | null = null;
  try {
    const img = tex.image as CanvasImageSource & { width: number; height: number };
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      data = ctx.getImageData(0, 0, img.width, img.height);
    }
  } catch {
    data = null;
  }
  imageDataCache.set(key, data);
  return data;
}

const statsCache = new Map<string, Lch>();

/**
 * Mean OKLab of the texels a mesh actually uses (one sample per vertex, nearest texel),
 * preferring chromatic texels so grey trims do not drag the hue. Returned as OKLCh.
 */
export function meshSourceLch(mesh: Mesh, chromaMin = 0.04): Lch {
  const geometry: BufferGeometry = mesh.geometry;
  const mat = Array.isArray(mesh.material) ? mesh.material[0]! : mesh.material;
  const map = (mat as MeshToonMaterial).map;
  const key = `${geometry.uuid}|${map?.source.uuid ?? 'none'}`;
  const cached = statsCache.get(key);
  if (cached) return cached;

  let result: Lch = [0.6, 0.1, 0];
  const uv = geometry.getAttribute('uv');
  const img = map ? textureImageData(map) : null;
  if (uv && img) {
    const { width, height, data } = img;
    let cL = 0,
      ca = 0,
      cb = 0,
      cn = 0;
    let aL = 0,
      aa = 0,
      ab = 0,
      an = 0;
    const step = Math.max(1, Math.floor(uv.count / 4000));
    for (let i = 0; i < uv.count; i += step) {
      const u = uv.getX(i) - Math.floor(uv.getX(i));
      const v = uv.getY(i) - Math.floor(uv.getY(i));
      const px = Math.min(width - 1, Math.floor(u * width));
      const py = Math.min(height - 1, Math.floor(v * height)); // glTF textures: flipY = false
      const o = (py * width + px) * 4;
      const [L, a, b] = srgb8ToOklab(data[o]!, data[o + 1]!, data[o + 2]!);
      aL += L;
      aa += a;
      ab += b;
      an++;
      if (Math.hypot(a, b) > chromaMin) {
        cL += L;
        ca += a;
        cb += b;
        cn++;
      }
    }
    const n = cn > 0 ? cn : an;
    if (n > 0) {
      const L = (cn > 0 ? cL : aL) / n;
      const a = (cn > 0 ? ca : aa) / n;
      const b = (cn > 0 ? cb : ab) / n;
      result = oklabToOklch(L, a, b);
    }
  }
  statsCache.set(key, result);
  return result;
}
