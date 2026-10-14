import type { SceneController } from './SceneController.js';

type Listener = (ctl: SceneController | null) => void;

let current: SceneController | null = null;
const listeners = new Set<Listener>();

/** Lets panels other than the viewport reach the single SceneController. */
export function setSceneController(ctl: SceneController | null): void {
  current = ctl;
  for (const l of listeners) l(ctl);
}

export function getSceneController(): SceneController | null {
  return current;
}

export function subscribeSceneController(listener: Listener): () => void {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}
