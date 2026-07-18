import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { AnomalyPlan } from '../../src/gameplay/anomalies/AnomalyGenerator';
import { RoomAnomalySystem } from '../../src/gameplay/anomalies/RoomAnomalySystem';
import type { ColorAnomalyVariant } from '../../src/gameplay/anomalies/AnomalyTarget';
import { AssetManager } from '../../src/world/assets/AssetManager';
import { GreyboxBedroom } from '../../src/world/rooms/GreyboxBedroom';
import { WorldCollision } from '../../src/world/WorldCollision';

const EXPECTED_STYLES = {
  wood: { color: '#8b644b', roughness: 0.78, metalness: 0 },
  _defaultMat: { color: '#c8c0b3', roughness: 0.9, metalness: 0 },
  metal: { color: '#858784', roughness: 0.68, metalness: 0.18 },
  metalMedium: { color: '#596366', roughness: 0.72, metalness: 0.12 },
  metalDark: { color: '#242b2d', roughness: 0.64, metalness: 0.08 },
  carpet: { color: '#8f6259', roughness: 0.96, metalness: 0 },
  carpetDarker: { color: '#66504b', roughness: 0.98, metalness: 0 },
  carpetWhite: { color: '#d8d1c5', roughness: 0.97, metalness: 0 },
  carpetBlue: { color: '#536f80', roughness: 0.96, metalness: 0 },
  plant: { color: '#60765d', roughness: 0.92, metalness: 0 },
  lamp: {
    color: '#d4b978',
    roughness: 0.86,
    metalness: 0,
    emissive: '#6d4822',
    emissiveIntensity: 0.32,
  },
  furniture_texture: {
    color: '#e6ddd1',
    roughness: 0.82,
    metalness: 0,
  },
} as const;

function createSource(): THREE.Group {
  const root = new THREE.Group();
  const materials = Object.keys(EXPECTED_STYLES).map((name) => {
    const material = new THREE.MeshStandardMaterial({
      color: 0xff00ff,
      roughness: 0.1,
      metalness: 0.9,
    });
    material.name = name;
    return material;
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 1.4), materials);
  root.add(mesh);
  return root;
}

describe('GreyboxBedroom final material palette', () => {
  it('harmonizes every imported material and restores it after an anomaly', async () => {
    const manager = new AssetManager({
      load: () => Promise.resolve(createSource()),
    });
    const room = new GreyboxBedroom();
    room.mount({
      scene: new THREE.Scene(),
      worldCollision: new WorldCollision(),
    });

    await room.loadFinalFurniture(manager);
    await room.loadFinalAnomalyTargets(manager);
    await room.loadFinalDecor(manager);

    for (const objectName of ['ANOM_Bed', 'ANOM_Chair', 'ANOM_Radio']) {
      const object = room.getVisualRoot().getObjectByName(objectName);

      if (object === undefined) {
        throw new Error(`Expected imported object ${objectName}.`);
      }

      assertExpectedStyles(collectMaterials(object));
    }

    const chair = room.getAnomalyTargetRegistry().getById('chair');
    const colorVariant = chair?.variants.find(
      (variant): variant is ColorAnomalyVariant => variant.kind === 'color',
    );

    if (chair === null || colorVariant === undefined) {
      throw new Error('Expected the final chair color variant.');
    }

    const system = new RoomAnomalySystem(room.getAnomalyTargetRegistry());
    system.applyPlan(createPlan(room, chair.id, colorVariant));
    const changedCarpet = collectMaterials(chair.object).find(
      (material) => material.name === 'carpet',
    );
    expect(changedCarpet?.color.getHexString()).toBe(
      new THREE.Color(colorVariant.color).getHexString(),
    );

    system.restore();
    assertExpectedStyles(collectMaterials(chair.object));
    expect(manager.getCachedAssetCount()).toBe(14);
    room.unmount();
    expect(manager.getCachedAssetCount()).toBe(0);
  });
});

function collectMaterials(root: THREE.Object3D): THREE.MeshStandardMaterial[] {
  const materials = new Set<THREE.MeshStandardMaterial>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;

    if (!mesh.isMesh) {
      return;
    }

    const meshMaterials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];

    for (const material of meshMaterials) {
      if (material instanceof THREE.MeshStandardMaterial) {
        materials.add(material);
      }
    }
  });
  return [...materials];
}

function assertExpectedStyles(
  materials: readonly THREE.MeshStandardMaterial[],
): void {
  for (const [name, expected] of Object.entries(EXPECTED_STYLES)) {
    const material = materials.find((candidate) => candidate.name === name);

    expect(material, `material ${name}`).toBeDefined();
    expect(material?.color.getHexString()).toBe(
      new THREE.Color(expected.color).getHexString(),
    );
    expect(material?.roughness).toBeCloseTo(expected.roughness);
    expect(material?.metalness).toBeCloseTo(expected.metalness);

    if ('emissive' in expected) {
      expect(material?.emissive.getHexString()).toBe(
        new THREE.Color(expected.emissive).getHexString(),
      );
      expect(material?.emissiveIntensity).toBeCloseTo(
        expected.emissiveIntensity,
      );
    }
  }
}

function createPlan(
  room: GreyboxBedroom,
  targetId: string,
  variant: ColorAnomalyVariant,
): AnomalyPlan {
  return {
    runSeed: 123,
    roomSeed: 456,
    roomId: room.definition.id,
    roomIndex: 0,
    difficulty: 1,
    anomalies: [
      {
        targetId,
        kind: variant.kind,
        variantId: variant.id,
      },
    ],
  };
}
