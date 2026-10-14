import type { StoreApi } from 'zustand/vanilla';
import type { SceneController } from './scene/SceneController.js';
import type { AppState } from './state/store.js';

/** Dev/test hook. Playwright reads scene state through `window.__pixiso`. */
export interface PixisoDebug {
  store: StoreApi<AppState>;
  scene: SceneController | null;
}

declare global {
  interface Window {
    __pixiso?: PixisoDebug;
  }
}

export function debugHook(): PixisoDebug | undefined {
  return window.__pixiso;
}
