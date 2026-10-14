import { catalog } from '@pixiso/shared/catalog';
import { describe, expect, it } from 'vitest';
import { computePpm, frameDurationMs, sampleTimes, workingFrustum } from './pixelMath.js';

describe('pixelMath', () => {
  it('derives PPM from the reference character projected height', () => {
    const ref = catalog.characters.find((c) => c.id === catalog.referenceCharacter)!;
    expect(computePpm(48, catalog) * ref.projected.heightM).toBeCloseTo(48, 9);
    expect(computePpm(64, catalog)).toBeGreaterThan(computePpm(32, catalog));
  });

  it('samples loops with N steps and one-shots end-inclusive', () => {
    expect(sampleTimes(1, 4, true)).toEqual([0, 0.25, 0.5, 0.75]);
    expect(sampleTimes(1, 4, false)).toEqual([0, 1 / 3, 2 / 3, 1]);
    expect(sampleTimes(1, 1, true)).toEqual([0]);
  });

  it('rounds frame durations to 10 ms', () => {
    expect(frameDurationMs(1.0667, 8, 'fromClip')).toBe(130);
    expect(frameDurationMs(1.0667, 8, 12)).toBe(80);
  });

  it('puts the pivot inside the working canvas', () => {
    const f = workingFrustum(48, computePpm(48, catalog));
    expect(f.pivotX).toBeGreaterThan(0);
    expect(f.pivotY).toBeLessThan(f.heightPx);
    expect(f.pivotY).toBeGreaterThan(48);
  });
});
