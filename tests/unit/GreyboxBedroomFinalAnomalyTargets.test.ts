import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { BEDROOM_ASSET_CATALOG } from '../../src/content/rooms/BedroomAssetCatalog';
import type { AnomalyPlan } from '../../src/gameplay/anomalies/AnomalyGenerator';
import { RoomAnomalySystem } from '../../src/gameplay/anomalies/RoomAnomalySystem';
import type { ColorAnomalyVariant } from '../../src/gameplay/anomalies/AnomalyTarget';
import { AssetManager } from '../../src/world/assets/AssetManager';
import { GreyboxBedroom } from '../../src/world/rooms/GreyboxBedroom';
import { WorldCollision } from '../../src/world/WorldCollision';

const FINAL_TARGETS = [
  {
    definition: BEDROOM_ASSET_CATALOG.television,
    targetId: 'television',
    objectName: 'ANOM_Television',
    surfaceName: 'Television_FinalSurface',
    materialNames: ['metalDark', 'metal'],
    colorMaterialNames: ['metalDark'],
    rotationY: -Math.PI / 2,
    position: [2.68, 0.65, 0.15] as const,
    maximumSize: [0.23, 0.78, 1.32] as const,
  },
  {
    definition: BEDROOM_ASSET_CATALOG.chairCushion,
    targetId: 'chair',
    objectName: 'ANOM_Chair',
    surfaceName: 'Chair_FinalSurface',
    materialNames: ['wood', 'carpet'],
    colorMaterialNames: ['carpet'],
    rotationY: Math.PI / 2 - 0.32,
    position: [0.9, 0, 1.45] as const,
    maximumSize: [0.78, 1.25, 0.78] as const,
  },
  {
    definition: BEDROOM_ASSET_CATALOG.plantSmall,
    targetId: 'plant',
    objectName: 'ANOM_Plant',
    surfaceName: 'Plant_FinalSurface',
    materialNames: ['wood', 'plant'],
    colorMaterialNames: ['plant'],
    rotationY: 0,
    position: [-2.58, 0, 1.3] as const,
    maximumSize: [0.72, 1.22, 0.72] as const,
  },
  {
    definition: BEDROOM_ASSET_CATALOG.pictureFrame,
    targetId: 'picture',
    objectName: 'ANOM_Picture',
    surfaceName: 'Picture_FinalSurface',
    materialNames: ['furniture_texture'],
    colorMaterialNames: ['furniture_texture'],
    rotationY: 0,
    position: [0.45, 1.82, -3.64] as const,
    maximumSize: [1.45, 0.9, 0.18] as const,
  },
  {
    definition: BEDROOM_ASSET_CATALOG.tableLamp,
    targetId: 'lamp',
    objectName: 'ANOM_Lamp',
    surfaceName: 'Lamp_FinalSurface',
    materialNames: ['metal', 'lamp'],
    colorMaterialNames: ['lamp'],
    rotationY: 0,
    position: [-1.22, 0.56, -2.74] as const,
    maximumSize: [0.48, 0.78, 0.48] as const,
  },
  {
    definition: BEDROOM_ASSET_CATALOG.booksStack,
    targetId: 'books',
    objectName: 'ANOM_Books',
    surfaceName: 'Books_FinalSurface',
    materialNames: ['carpetDarker', 'carpetWhite', 'plant', 'metal'],
    colorMaterialNames: [
      'carpetDarker',
      'carpetWhite',
      'plant',
      'metal',
    ],
    rotationY: 0,
    position: [-0.96, 0.56, -2.62] as const,
    maximumSize: [0.36, 0.25, 0.38] as const,
  },
] as const;

function createSource(url: string): THREE.Group {
  const target = FINAL_TARGETS.find(
    (candidate) => candidate.definition.url === url,
  );

  if (target === undefined) {
    throw new Error(`Unexpected final-target URL: ${url}`);
  }

  const root = new THREE.Group();
  const materials = target.materialNames.map((name, index) => {
    const material = new THREE.MeshStandardMaterial({
      color: index === 0 ? 0x6b5548 : 0x87955f,
    });
    material.name = name;
    return material;
  });
  for (const [index, material] of materials.entries()) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1 - index * 0.08, 0.8, 1.4 - index * 0.08),
      material,
    );
    mesh.position.set(0.32, 0.52 + index * 0.01, -0.18);
    root.add(mesh);
  }

  return root;
}

function createMountedRoom(): {
  readonly room: GreyboxBedroom;
  readonly scene: THREE.Scene;
  readonly world: WorldCollision;
} {
  const room = new GreyboxBedroom();
  const scene = new THREE.Scene();
  const world = new WorldCollision();
  room.mount({ scene, worldCollision: world });
  return { room, scene, world };
}

describe('GreyboxBedroom final anomaly targets', () => {
  it('replaces all six targets while preserving interactions and collisions', async () => {
    const load = vi.fn((url: string) => Promise.resolve(createSource(url)));
    const manager = new AssetManager({ load });
    const { room, world } = createMountedRoom();
    const oldTargets = new Map(
      room.getAnomalyTargets().map((target) => [target.id, target]),
    );
    const oldPictureGeometry = oldTargets
      .get('picture')
      ?.object.getObjectByName('Picture_Frame') as THREE.Mesh | undefined;

    if (oldPictureGeometry === undefined) {
      throw new Error('Expected the primitive picture frame.');
    }

    const disposePrimitiveGeometry = vi.spyOn(
      oldPictureGeometry.geometry,
      'dispose',
    );
    const collisionRoot = world.getSourceRoot();
    const collisionCount = room.getCollisionObjectCount();

    await room.loadFinalAnomalyTargets(manager);
    await room.loadFinalAnomalyTargets(manager);

    expect(load).toHaveBeenCalledTimes(6);
    expect(room.isFinalAnomalyTargetsLoaded()).toBe(true);
    expect(disposePrimitiveGeometry).toHaveBeenCalledOnce();
    expect(world.getSourceRoot()).toBe(collisionRoot);
    expect(room.getCollisionObjectCount()).toBe(collisionCount);
    expect(room.getAnomalyTargets()).toHaveLength(6);
    expect(new Set(room.getFinalAnomalyTargetAssetIds())).toEqual(
      new Set(FINAL_TARGETS.map((target) => target.definition.id)),
    );

    for (const expected of FINAL_TARGETS) {
      const target = room.getAnomalyTargetRegistry().getById(
        expected.targetId,
      );
      const model = target?.object.getObjectByName(
        `${expected.objectName}_GLB`,
      );

      if (target === null || target === undefined || model === undefined) {
        throw new Error(`Expected final target ${expected.targetId}.`);
      }

      const size = new THREE.Box3()
        .setFromObject(model)
        .getSize(new THREE.Vector3());
      const colorVariants = target.variants.filter(
        (variant): variant is ColorAnomalyVariant => variant.kind === 'color',
      );
      const expectedSurfaceNames = expected.materialNames.length === 1
        ? [expected.surfaceName]
        : expected.materialNames.map(
            (_materialName, index) => `${expected.surfaceName}_${index + 1}`,
          );

      expect(oldTargets.get(expected.targetId)?.object.parent).toBeNull();
      expect(target.object).not.toBe(oldTargets.get(expected.targetId)?.object);
      expect(target.object.name).toBe(expected.objectName);
      expect(target.object.position.toArray()).toEqual(expected.position);
      expect(target.interactionVolumes).toHaveLength(1);
      expect(model.rotation.y).toBeCloseTo(expected.rotationY);
      model.traverse((object) => {
        const mesh = object as THREE.Mesh;

        if (mesh.isMesh) {
          expect(mesh.castShadow).toBe(true);
          expect(mesh.receiveShadow).toBe(true);
        }
      });
      expect(
        expectedSurfaceNames.every(
          (surfaceName) =>
            target.object.getObjectByName(surfaceName) !== undefined,
        ),
      ).toBe(true);
      expect(size.x).toBeLessThanOrEqual(expected.maximumSize[0] + 1e-6);
      expect(size.y).toBeLessThanOrEqual(expected.maximumSize[1] + 1e-6);
      expect(size.z).toBeLessThanOrEqual(expected.maximumSize[2] + 1e-6);
      expect(
        colorVariants.every(
          (variant) =>
            variant.nodeNames.length === expectedSurfaceNames.length &&
            expectedSurfaceNames.every((name) =>
              variant.nodeNames.includes(name),
            ) &&
            new Set(variant.materialNames).size ===
              expected.colorMaterialNames.length &&
            expected.colorMaterialNames.every((name) =>
              variant.materialNames?.includes(name),
            ),
        ),
      ).toBe(true);
      expect(manager.getReferenceCount(expected.definition.id)).toBe(1);
    }

    const system = new RoomAnomalySystem(room.getAnomalyTargetRegistry());
    const generatedPlan = system.generatePlan({
      runSeed: 123,
      roomIndex: 0,
      roomId: room.definition.id,
      difficulty: 1,
      count: 6,
    });
    expect(generatedPlan.anomalies).toHaveLength(6);

    const chair = room.getAnomalyTargetRegistry().getById('chair');
    const chairVariant = chair?.variants.find(
      (variant): variant is ColorAnomalyVariant => variant.kind === 'color',
    );
    const chairSurfaces: THREE.Mesh[] = [];
    chair?.object.traverse((object) => {
      const mesh = object as THREE.Mesh;

      if (mesh.isMesh) {
        chairSurfaces.push(mesh);
      }
    });

    if (chair === null || chairVariant === undefined) {
      throw new Error('Expected the final chair color anomaly.');
    }

    const chairMaterials = chairSurfaces.flatMap((surface) =>
      Array.isArray(surface.material) ? surface.material : [surface.material],
    );
    const wood = chairMaterials.find((material) => material.name === 'wood') as
      | THREE.MeshStandardMaterial
      | undefined;
    const carpet = chairMaterials.find(
      (material) => material.name === 'carpet',
    ) as THREE.MeshStandardMaterial | undefined;
    const woodColor = wood?.color.getHex();
    system.applyPlan(createPlan(room, chair.id, chairVariant));
    expect(carpet?.color.getHexString()).toBe(
      new THREE.Color(chairVariant.color).getHexString(),
    );
    expect(wood?.color.getHex()).toBe(woodColor);
    system.restore();

    room.unmount();
    expect(manager.getCachedAssetCount()).toBe(0);
    expect(room.isFinalAnomalyTargetsLoaded()).toBe(false);
  });

  it('reloads fresh final targets after a room remount', async () => {
    const load = vi.fn((url: string) => Promise.resolve(createSource(url)));
    const manager = new AssetManager({ load });
    const { room, scene, world } = createMountedRoom();
    await room.loadFinalAnomalyTargets(manager);
    const firstPicture = room.getAnomalyTargetRegistry().getById('picture')?.object;
    room.unmount();

    room.mount({ scene, worldCollision: world });
    await room.loadFinalAnomalyTargets();
    const secondPicture = room.getAnomalyTargetRegistry().getById('picture')?.object;

    expect(load).toHaveBeenCalledTimes(12);
    expect(secondPicture).not.toBe(firstPicture);
    expect(firstPicture?.parent).toBeNull();
    room.unmount();
    expect(manager.getCachedAssetCount()).toBe(0);
  });

  it('keeps all primitive targets when one final asset fails', async () => {
    const load = vi.fn((url: string) =>
      url === BEDROOM_ASSET_CATALOG.pictureFrame.url
        ? Promise.reject(new Error('picture is corrupt'))
        : Promise.resolve(createSource(url)),
    );
    const manager = new AssetManager({ load });
    const { room } = createMountedRoom();
    const oldTargets = new Map(
      room.getAnomalyTargets().map((target) => [target.id, target]),
    );

    await expect(room.loadFinalAnomalyTargets(manager)).rejects.toThrow(
      'Final bedroom anomaly targets could not be loaded',
    );

    expect(room.isFinalAnomalyTargetsLoaded()).toBe(false);
    expect(manager.getCachedAssetCount()).toBe(0);

    for (const [id, oldTarget] of oldTargets) {
      expect(room.getAnomalyTargetRegistry().getById(id)).toBe(oldTarget);
      expect(oldTarget.object.parent).not.toBeNull();
    }

    room.unmount();
  });
});

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
