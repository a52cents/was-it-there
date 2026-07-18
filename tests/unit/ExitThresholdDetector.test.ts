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
});
