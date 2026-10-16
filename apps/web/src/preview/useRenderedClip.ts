import { colorTableFrom, renderClip, type RenderedClip } from '@pixiso/sprite-kit';
import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../state/store.js';

/**
 * The frames of the previewed clip, recomputed synchronously from the store.
 * sprite-kit renders a 24×32 clip in well under a millisecond, so there is no
 * async state and the preview can never show a stale pose.
 */
export function useRenderedClip(): RenderedClip | null {
  const catalog = useAppStore((s) => s.catalog);
  const config = useAppStore((s) => s.config);
  const style = useAppStore((s) => s.style);
  const animationId = useAppStore((s) => s.preview.animationId);
  const direction = useAppStore((s) => s.preview.direction);
  return useMemo(() => {
    if (!catalog.directions.includes(direction)) return null;
    try {
      return renderClip(config, style, animationId, direction, colorTableFrom(catalog.colors));
    } catch {
      return null;
    }
  }, [catalog, config, style, animationId, direction]);
}

/** Current frame index of a playing clip; restarts from 0 when the clip changes. */
export function useFrameIndex(clip: RenderedClip | null, playing: boolean): number {
  const [index, setIndex] = useState(0);
  // Reset during render when the clip identity changes (React's "adjust state on prop change").
  const [prevClip, setPrevClip] = useState(clip);
  if (prevClip !== clip) {
    setPrevClip(clip);
    setIndex(0);
  }
  useEffect(() => {
    if (!clip || clip.frames.length < 2 || !playing) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % clip.frames.length),
      clip.frameMs,
    );
    return () => window.clearInterval(id);
  }, [clip, playing]);
  return clip ? Math.min(index, clip.frames.length - 1) : 0;
}
