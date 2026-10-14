import { AmbientLight, DirectionalLight, Group, OrthographicCamera, Vector3 } from 'three';

/** 2:1 dimetric: elevation 30° (asin 0.5), azimuth 45° (HANDOFF §6.1). */
export const ISO_ELEVATION_RAD = Math.PI / 6;
export const ISO_AZIMUTH_RAD = Math.PI / 4;
export const ISO_COS_ELEVATION = Math.cos(ISO_ELEVATION_RAD);

/** Unit vector from the origin toward the camera. */
export function isoViewDirection(): Vector3 {
  return new Vector3(
    ISO_COS_ELEVATION * Math.sin(ISO_AZIMUTH_RAD),
    Math.sin(ISO_ELEVATION_RAD),
    ISO_COS_ELEVATION * Math.cos(ISO_AZIMUTH_RAD),
  );
}

export interface PixelFrustum {
  widthPx: number;
  heightPx: number;
  /** Pixels per metre measured in the camera's image plane. */
  ppm: number;
  /** Pixel the world origin (character feet) lands on, measured from the top-left corner. */
  pivotX: number;
  pivotY: number;
}

/**
 * Static orthographic camera plus camera-attached lights. Never rotated: the
 * character turns instead, so every direction gets the same screen-space lighting.
 */
export class IsoCameraRig {
  readonly group = new Group();
  readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  readonly keyLight = new DirectionalLight(0xffffff, 2.6);
  readonly ambient = new AmbientLight(0xffffff, 1.1);

  constructor(distance = 50) {
    this.group.name = 'IsoCameraRig';
    this.camera.position.copy(isoViewDirection()).multiplyScalar(distance);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0, 0, 0);
    // Light sits up-left-behind the camera in camera space and points at the origin,
    // so the lit side is always the screen's upper left.
    this.keyLight.position.set(-6, 9, 5);
    this.camera.add(this.keyLight);
    this.group.add(this.camera, this.ambient);
  }

  /** Frustum such that the origin lands exactly on the pivot pixel (HANDOFF §6.2). */
  setPixelFrustum(f: PixelFrustum): void {
    const c = this.camera;
    c.left = -f.pivotX / f.ppm;
    c.right = (f.widthPx - f.pivotX) / f.ppm;
    c.top = f.pivotY / f.ppm;
    c.bottom = -(f.heightPx - f.pivotY) / f.ppm;
    c.updateProjectionMatrix();
  }

  /** Reference viewport: show `visibleHeightM` metres with the ground line near the bottom. */
  fitViewer(widthPx: number, heightPx: number, visibleHeightM = 3.6, groundFraction = 0.22): void {
    const ppm = heightPx / visibleHeightM;
    this.setPixelFrustum({
      widthPx,
      heightPx,
      ppm,
      pivotX: widthPx / 2,
      pivotY: heightPx * (1 - groundFraction),
    });
  }
}
