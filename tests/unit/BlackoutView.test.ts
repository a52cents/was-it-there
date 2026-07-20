import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { BlackoutSnapshot } from '../../src/gameplay/anomalies/BlackoutTimeline';
import { BlackoutView } from '../../src/ui/BlackoutView';

class FakeDocument {
  public createElement(): FakeElement {
    return new FakeElement(this);
  }
}

class FakeElement {
  public className = '';
  public hidden = false;
  public readonly dataset: Record<string, string> = {};
  public readonly style: Record<string, string> = {};

  public constructor(public readonly ownerDocument: FakeDocument) {}

  public append(..._children: FakeElement[]): void {}
  public remove(): void {}
  public setAttribute(_name: string, _value: string): void {}
}

const BLACKOUT_SNAPSHOT: BlackoutSnapshot = {
  stage: 'full-black',
  elapsedMs: 500,
  overlayOpacity: 1,
  lightMultiplier: 0,
  anomalyApplicationDue: false,
  complete: false,
};

describe('BlackoutView', () => {
  it('dims and restores room lights and HDR environment lighting together', () => {
    const document = new FakeDocument();
    const rootElement = new FakeElement(document);
    const root = new THREE.Group();
    const light = new THREE.AmbientLight(0xffffff, 0.75);
    const scene = new THREE.Scene();
    scene.environmentIntensity = 0.36;
    root.add(light);
    const view = new BlackoutView(
      rootElement as unknown as HTMLElement,
    );

    view.begin(root, scene);
    view.apply(BLACKOUT_SNAPSHOT);

    expect(light.intensity).toBe(0);
    expect(scene.environmentIntensity).toBe(0);
    view.reset();
    expect(light.intensity).toBeCloseTo(0.75);
    expect(scene.environmentIntensity).toBeCloseTo(0.36);
  });
});
