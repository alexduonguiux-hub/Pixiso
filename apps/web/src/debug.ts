import type * as PixelCore from '@pixiso/pixel-core';
import type * as SpriteKit from '@pixiso/sprite-kit';
import type { StoreApi } from 'zustand/vanilla';
import type { AppState } from './state/store.js';

/** Dev/test hook. Playwright drives the store and measures through `window.__pixiso`. */
export interface PixisoDebug {
  store: StoreApi<AppState>;
  /** pixel-core namespace, so render tests can measure in-page without a bundler import. */
  core: typeof PixelCore;
  /** sprite-kit namespace: the same renderer the preview uses. */
  kit: typeof SpriteKit;
}

declare global {
  interface Window {
    __pixiso?: PixisoDebug;
  }
}

export function debugHook(): PixisoDebug | undefined {
  return window.__pixiso;
}
