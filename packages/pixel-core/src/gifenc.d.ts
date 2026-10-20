/** Typings for gifenc 1.0 (the package ships none; its ESM build is imported by path because the package has no exports map and Node would take the CJS bundle). */
declare module 'gifenc/dist/gifenc.esm.js' {
  export interface GIFFrameOptions {
    /** Colour table as [r, g, b] rows; required on the first frame (global table), local afterwards. */
    palette?: number[][];
    /** Frame delay in milliseconds (stored in centiseconds). */
    delay?: number;
    /** Loop count written with the first frame; 0 loops forever. */
    repeat?: number;
    transparent?: boolean;
    transparentIndex?: number;
    /** GIF disposal method: 2 restores the background before the next frame. */
    dispose?: number;
    colorDepth?: number;
    first?: boolean;
  }
  export interface GIFEncoderInstance {
    writeFrame(index: Uint8Array, width: number, height: number, opts?: GIFFrameOptions): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
    reset(): void;
  }
  export function GIFEncoder(opts?: {
    initialCapacity?: number;
    auto?: boolean;
  }): GIFEncoderInstance;
}
