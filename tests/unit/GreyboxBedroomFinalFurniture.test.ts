import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { BEDROOM_ASSET_CATALOG } from '../../src/content/rooms/BedroomAssetCatalog';
import { AssetManager } from '../../src/world/assets/AssetManager';
import { GreyboxBedroom } from '../../src/world/rooms/GreyboxBedroom';
import { WorldCollision } from '../../src/world/WorldCollision';

const FINAL_FURNITURE = [
  {
    definition: BEDROOM_ASSET_CATALOG.bedDouble,
    objectName: 'ANOM_Bed',
    rotationY: 0,
    maximumSize: [1.9, 0.75, 2.15] as const,
  },
  {
    definition: BEDROOM_ASSET_CATALOG.wardrobe,
    objectName: 'ANOM_Wardrobe',
    rotationY: Math.PI / 2,
    maximumSize: [0.68, 2.18, 1.18] as const,
  },
  {
    definition: BEDROOM_ASSET_CATALOG.nightstand,
    objectName: 'ANOM_Nightstand',
    rotationY: 0,
    maximumSize: [0.58, 0.58, 0.55] as const,
  },
  {
    definition: BEDROOM_ASSET_CATALOG.tvCabinet,
    objectName: 'ANOM_TvStand',
    rotationY: -Math.PI / 2,
    maximumSize: [0.54, 0.65, 1.72] as const,
  },
] as const;

function createSource(url: string): THREE.Group {
  const furniture = FINAL_FURNITURE.find(
    (candidate) => candidate.definition.url === url,
  );

  if (furniture === undefined) {
    throw new Error(`Unexpected furniture URL: ${url}`);
  }

  const root = new THREE.Group();
  root.name = `SOURCE_${furniture.definition.id}`;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.8, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x886644 }),
  );
  mesh.name = 'SourceMesh';
  mesh.position.set(0.35, 0.5, -0.2);
  root.add(mesh);
  return root;
}

function getRequiredObject(room: GreyboxBedroom, name: string): THREE.Object3D {
  const object = room.getVisualRoot().getObjectByName(name);

  if (object === undefined) {
    throw new Error(`Expected visual object ${name}.`);
  }

  return object;
}

describe('GreyboxBedroom final GLB furniture', () => {
  it('replaces four primitives transactionally while preserving collision geometry', async () => {
    const load = vi.fn((url: string) => Promise.resolve(createSource(url)));
    const manager = new AssetManager({ load });
    const room = new GreyboxBedroom();
    const scene = new THREE.Scene();
    const world = new WorldCollision();
    room.mount({ scene, worldCollision: world });
    const oldObjects = new Map(
      FINAL_FURNITURE.map((item) => [
        item.objectName,
        getRequiredObject(room, item.objectName),
      ]),
    );
    const oldBedFrame = oldObjects
      .get('ANOM_Bed')
      ?.getObjectByName('Bed_Frame') as THREE.Mesh | undefined;

    if (oldBedFrame === undefined) {
      throw new Error('Expected the primitive bed frame.');
    }

    const disposePrimitiveGeometry = vi.spyOn(
      oldBedFrame.geometry,
      'dispose',
    );
    const collisionRoot = world.getSourceRoot();
    const collisionCount = room.getCollisionObjectCount();

    await room.loadFinalFurniture(manager);
    await room.loadFinalFurniture(manager);

    expect(load).toHaveBeenCalledTimes(4);
    expect(room.isFinalFurnitureLoaded()).toBe(true);
    expect(new Set(room.getFinalFurnitureAssetIds())).toEqual(
      new Set(FINAL_FURNITURE.map((item) => item.definition.id)),
    );
    expect(disposePrimitiveGeometry).toHaveBeenCalledOnce();
    expect(world.getSourceRoot()).toBe(collisionRoot);
    expect(room.getCollisionObjectCount()).toBe(collisionCount);
    expect(room.getAnomalyTargets()).toHaveLength(6);

    for (const item of FINAL_FURNITURE) {
      const oldObject = oldObjects.get(item.objectName);
      const replacement = getRequiredObject(room, item.objectName);
      const size = new THREE.Box3()
        .setFromObject(replacement)
        .getSize(new THREE.Vector3());

      expect(oldObject?.parent).toBeNull();
      expect(replacement).not.toBe(oldObject);
      expect(
        replacement.getObjectByName(`${item.objectName}_GLB`),
      ).toBeDefined();
      expect(
        replacement.getObjectByName(`${item.objectName}_GLB`)?.rotation.y,
      ).toBeCloseTo(item.rotationY);
      replacement
        .getObjectByName(`${item.objectName}_GLB`)
        ?.traverse((object) => {
          const mesh = object as THREE.Mesh;

          if (mesh.isMesh) {
            expect(mesh.castShadow).toBe(true);
            expect(mesh.receiveShadow).toBe(true);
          }
        });
      expect(size.x).toBeLessThanOrEqual(item.maximumSize[0] + 1e-6);
      expect(size.y).toBeLessThanOrEqual(item.maximumSize[1] + 1e-6);
      expect(size.z).toBeLessThanOrEqual(item.maximumSize[2] + 1e-6);
      expect(manager.getReferenceCount(item.definition.id)).toBe(1);
    }

    room.unmount();

    expect(manager.getCachedAssetCount()).toBe(0);
    expect(room.isFinalFurnitureLoaded()).toBe(false);
    expect(room.getFinalFurnitureAssetIds()).toHaveLength(0);
  });

  it('reloads fresh GLB instances after a room remount', async () => {
    const load = vi.fn((url: string) => Promise.resolve(createSource(url)));
    const manager = new AssetManager({ load });
    const room = new GreyboxBedroom();
    const scene = new THREE.Scene();
    const world = new WorldCollision();
    room.mount({ scene, worldCollision: world });
    await room.loadFinalFurniture(manager);
    const firstBed = getRequiredObject(room, 'ANOM_Bed');
    room.unmount();

    room.mount({ scene, worldCollision: world });
    await room.loadFinalFurniture();
    const secondBed = getRequiredObject(room, 'ANOM_Bed');

    expect(load).toHaveBeenCalledTimes(8);
    expect(secondBed).not.toBe(firstBed);
    expect(firstBed.parent).toBeNull();
    expect(room.isFinalFurnitureLoaded()).toBe(true);
    room.unmount();
    expect(manager.getCachedAssetCount()).toBe(0);
  });

  it('keeps every primitive and releases successful leases when one GLB fails', async () => {
    const load = vi.fn((url: string) =>
      url === BEDROOM_ASSET_CATALOG.wardrobe.url
        ? Promise.reject(new Error('wardrobe is corrupt'))
        : Promise.resolve(createSource(url)),
    );
    const manager = new AssetManager({ load });
    const room = new GreyboxBedroom();
    const scene = new THREE.Scene();
    const world = new WorldCollision();
    room.mount({ scene, worldCollision: world });
    const oldObjects = new Map(
      FINAL_FURNITURE.map((item) => [
        item.objectName,
        getRequiredObject(room, item.objectName),
      ]),
    );

    await expect(room.loadFinalFurniture(manager)).rejects.toThrow(
      'Final bedroom furniture could not be loaded: Asset "bedroom/wardrobe" could not be loaded',
    );

    expect(room.isFinalFurnitureLoaded()).toBe(false);
    expect(room.getFinalFurnitureAssetIds()).toHaveLength(0);
    expect(manager.getCachedAssetCount()).toBe(0);

    for (const item of FINAL_FURNITURE) {
      expect(getRequiredObject(room, item.objectName)).toBe(
        oldObjects.get(item.objectName),
      );
    }

    room.unmount();
  });

  it('requires a mounted room and an available AssetManager', async () => {
    const room = new GreyboxBedroom();

    await expect(room.loadFinalFurniture()).rejects.toThrow(
      'The bedroom must be mounted before loading final furniture.',
    );

    room.mount({ scene: new THREE.Scene(), worldCollision: new WorldCollision() });
    await expect(room.loadFinalFurniture()).rejects.toThrow(
      'The bedroom final-furniture AssetManager is unavailable.',
    );
    room.unmount();
  });
});
