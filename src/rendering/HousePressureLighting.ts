import * as THREE from 'three';
import type { HousePressureSnapshot } from '../gameplay/story/HousePressureSystem';

interface LightBaseline {
  readonly light: THREE.Light;
  readonly intensity: number;
  readonly color: THREE.Color;
}

const COLD_LIGHT_COLOR = new THREE.Color(0xb8c9e8);
const CALM_LIGHT_COLOR = new THREE.Color(0xffd39b);

export class HousePressureLighting {
  private readonly lights: LightBaseline[] = [];
  private scene: THREE.Scene | null = null;
  private environmentIntensity = 1;

  public bind(root: THREE.Object3D, scene?: THREE.Scene): void {
    this.release();
    this.scene = scene ?? null;
    this.environmentIntensity = scene?.environmentIntensity ?? 1;
    root.traverse((object) => {
      const light = object as THREE.Light;

      if (!light.isLight) {
        return;
      }

      this.lights.push({
        light,
        intensity: light.intensity,
        color: light.color.clone(),
      });
    });
  }

  public apply(snapshot: HousePressureSnapshot): void {
    for (const baseline of this.lights) {
      baseline.light.intensity =
        baseline.intensity * snapshot.lightMultiplier;
      baseline.light.color
        .copy(baseline.color)
        .lerp(COLD_LIGHT_COLOR, snapshot.coldShift)
        .lerp(CALM_LIGHT_COLOR, snapshot.calmIntensity * 0.22);
    }

    if (this.scene !== null) {
      this.scene.environmentIntensity =
        this.environmentIntensity * snapshot.lightMultiplier;
    }
  }

  public release(): void {
    for (const baseline of this.lights) {
      baseline.light.intensity = baseline.intensity;
      baseline.light.color.copy(baseline.color);
    }

    if (this.scene !== null) {
      this.scene.environmentIntensity = this.environmentIntensity;
    }

    this.lights.length = 0;
    this.scene = null;
    this.environmentIntensity = 1;
  }
}
