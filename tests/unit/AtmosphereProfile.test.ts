import { describe, expect, it } from 'vitest';
import type { HousePressureSnapshot } from '../../src/gameplay/story/HousePressureSystem';
import { createAtmosphereProfile } from '../../src/rendering/AtmosphereProfile';

function createSnapshot(
  overrides: Partial<HousePressureSnapshot> = {},
): HousePressureSnapshot {
  return {
    pressureLevel: 0,
    lightMultiplier: 1,
    coldShift: 0,
    calmIntensity: 0,
    vignetteOpacity: 0,
    failureProgress: 0,
    failureComplete: false,
    ...overrides,
  };
}

describe('createAtmosphereProfile', () => {
  it('raises visual stress progressively with house pressure', () => {
    expect(createAtmosphereProfile(createSnapshot()).stress).toBe(0);
    expect(
      createAtmosphereProfile(createSnapshot({ pressureLevel: 1 })).stress,
    ).toBeCloseTo(1 / 3);
    expect(
      createAtmosphereProfile(createSnapshot({ pressureLevel: 3 })).stress,
    ).toBe(1);
  });

  it('lets the failure sequence override pressure and preserves calm pulses', () => {
    expect(
      createAtmosphereProfile(
        createSnapshot({
          pressureLevel: 1,
          failureProgress: 0.82,
          calmIntensity: 0.65,
        }),
      ),
    ).toEqual({ stress: 0.82, calmPulse: 0.65 });
  });
});
