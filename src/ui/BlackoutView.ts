import * as THREE from 'three';
import type { BlackoutSnapshot } from '../gameplay/anomalies/BlackoutTimeline';

interface LightSnapshot {
  readonly light: THREE.Light;
  readonly intensity: number;
}

export class BlackoutView {
  private readonly overlay: HTMLElement;
  private readonly lights: LightSnapshot[] = [];

  public constructor(root: HTMLElement) {
    this.overlay = root.ownerDocument.createElement('div');
    this.overlay.className = 'blackout-overlay';
    this.overlay.hidden = true;
    this.overlay.setAttribute('aria-hidden', 'true');
    this.overlay.dataset.stage = 'idle';
    root.append(this.overlay);
  }

  public begin(lightRoot: THREE.Object3D): void {
    this.restoreLights();
    this.lights.length = 0;
    lightRoot.traverse((object) => {
      const light = object as THREE.Light;

      if (light.isLight) {
        this.lights.push({ light, intensity: light.intensity });
      }
    });
    this.overlay.hidden = false;
  }

  public apply(snapshot: BlackoutSnapshot): void {
    this.overlay.dataset.stage = snapshot.stage;
    this.overlay.style.opacity = snapshot.overlayOpacity.toFixed(4);

    for (const { light, intensity } of this.lights) {
      light.intensity = intensity * snapshot.lightMultiplier;
    }
  }

  public reset(): void {
    this.restoreLights();
    this.lights.length = 0;
    this.overlay.style.opacity = '0';
    this.overlay.dataset.stage = 'idle';
    this.overlay.hidden = true;
  }

  public dispose(): void {
    this.reset();
    this.overlay.remove();
  }

  private restoreLights(): void {
    for (const { light, intensity } of this.lights) {
      light.intensity = intensity;
    }
  }
}
