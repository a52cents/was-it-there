import { describe, expect, it } from 'vitest';
import { ExitThresholdDetector } from '../../src/gameplay/progression/ExitThresholdDetector';

describe('ExitThresholdDetector', () => {
  const detector = new ExitThresholdDetector({
    x: 3.65,
    minimumZ: -2.25,
    maximumZ: -1.25,
  });

  it('detects a player beyond the exit within the doorway bounds', () => {
    expect(detector.hasCrossed({ x: 3.64, z: -1.75 })).toBe(false);
    expect(detector.hasCrossed({ x: 3.65, z: -1.75 })).toBe(true);
    expect(detector.hasCrossed({ x: 4.2, z: -2.25 })).toBe(true);
  });

  it('does not trigger beside the doorway or for invalid positions', () => {
    expect(detector.hasCrossed({ x: 4.2, z: -2.26 })).toBe(false);
    expect(detector.hasCrossed({ x: 4.2, z: -1.24 })).toBe(false);
    expect(detector.hasCrossed({ x: Number.NaN, z: -1.75 })).toBe(false);
  });

  it('rejects invalid threshold bounds', () => {
    expect(
      () =>
        new ExitThresholdDetector({
          x: 3,
          minimumZ: 1,
          maximumZ: 1,
        }),
    ).toThrow(RangeError);
  });

  it('supports a north-facing exit with horizontal doorway bounds', () => {
    const northExit = new ExitThresholdDetector({
      z: -4.6,
      minimumX: 2.2,
      maximumX: 3.3,
      crossing: 'negative-z',
    });

    expect(northExit.hasCrossed({ x: 2.75, z: -4.59 })).toBe(false);
    expect(northExit.hasCrossed({ x: 2.75, z: -4.6 })).toBe(true);
    expect(northExit.hasCrossed({ x: 2.19, z: -5 })).toBe(false);
  });
});
