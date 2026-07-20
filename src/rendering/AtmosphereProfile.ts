import * as THREE from 'three';
import type { HousePressureSnapshot } from '../gameplay/story/HousePressureSystem';

export interface AtmosphereProfile {
  readonly stress: number;
  readonly calmPulse: number;
}

export function createAtmosphereProfile(
  snapshot: HousePressureSnapshot,
): AtmosphereProfile {
  return {
    stress: THREE.MathUtils.clamp(
      Math.max(snapshot.pressureLevel / 3, snapshot.failureProgress),
      0,
      1,
    ),
    calmPulse: THREE.MathUtils.clamp(snapshot.calmIntensity, 0, 1),
  };
}
