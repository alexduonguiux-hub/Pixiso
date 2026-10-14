/** An RGBA8 image. `data.length === width * height * 4`, rows top-to-bottom. */
export interface RGBAImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export function createImage(width: number, height: number): RGBAImage {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

export function cloneImage(img: RGBAImage): RGBAImage {
  return { width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) };
}
