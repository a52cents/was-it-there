import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { HousePressureSnapshot } from '../../src/gameplay/story/HousePressureSystem';
import { HousePressureLighting } from '../../src/rendering/HousePressureLighting';

const PRESSURED_SNAPSHOT: HousePressureSnapshot = {
  pressureLevel: 2,
  lightMultiplier: 0.8,
  coldShift: 0.25,
  calmIntensity: 0,
  vignetteOpacity: 0.25,
  failureProgress: 0,
  failureComplete: false,
};

describe('HousePressureLighting', () => {
  it('changes only lights and restores their exact baseline', () => {
    const root = new THREE.Group();
    const light = new THREE.PointLight(0xffa45c, 2.5);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0x4f8a55 }),
    );
    const originalLightColor = light.color.getHex();
    const originalMeshColor = mesh.material.color.getHex();
    root.add(light, mesh);
    const pressureLighting = new HousePressureLighting();

    pressureLighting.bind(root);
    pressureLighting.apply(PRESSURED_SNAPSHOT);

    expect(light.intensity).toBe(2);
    expect(light.color.getHex()).not.toBe(originalLightColor);
    expect(mesh.material.color.getHex()).toBe(originalMeshColor);

    pressureLighting.release();
    expect(light.intensity).toBe(2.5);
    expect(light.color.getHex()).toBe(originalLightColor);
  });

  it('restores the previous room before binding the next one', () => {
    const firstRoot = new THREE.Group();
    const firstLight = new THREE.AmbientLight(0xffffff, 1);
    firstRoot.add(firstLight);
    const secondRoot = new THREE.Group();
    const secondLight = new THREE.HemisphereLight(0xbad7ff, 0x201810, 3);
    secondRoot.add(secondLight);
    const pressureLighting = new HousePressureLighting();

    pressureLighting.bind(firstRoot);
    pressureLighting.apply(PRESSURED_SNAPSHOT);
    expect(firstLight.intensity).toBe(0.8);

    pressureLighting.bind(secondRoot);
    expect(firstLight.intensity).toBe(1);

    pressureLighting.apply(PRESSURED_SNAPSHOT);
    expect(secondLight.intensity).toBeCloseTo(2.4);
    pressureLighting.release();
    expect(secondLight.intensity).toBe(3);
  });
});
