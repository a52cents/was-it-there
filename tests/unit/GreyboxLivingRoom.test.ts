import * as THREE from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LIVING_ROOM_ASSET_CATALOG } from '../../src/content/rooms/LivingRoomAssetCatalog';
import { RoomAnomalySystem } from '../../src/gameplay/anomalies/RoomAnomalySystem';
import { PLAYER_CONFIG } from '../../src/player/PlayerConfig';
import { RENDER_LAYERS } from '../../src/rendering/RenderLayers';
import { AssetManager } from '../../src/world/assets/AssetManager';
import {
  GreyboxLivingRoom,
  LIVING_ROOM_EXIT_THRESHOLD,
} from '../../src/world/rooms/GreyboxLivingRoom';
import { WorldCollision } from '../../src/world/WorldCollision';

function createAssetSource(): THREE.Group {
  const root = new THREE.Group();
  const frame = new THREE.MeshStandardMaterial({ color: '#b8aa91' });
  frame.name = 'White';
  const glass = new THREE.MeshStandardMaterial({ color: '#83999f' });
  glass.name = 'Glass';
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 0.8),
    [frame, glass],
  );
  mesh.position.set(0.15, 0.5, -0.1);
  root.add(mesh);
  return root;
}

describe('GreyboxLivingRoom', () => {
  let room: GreyboxLivingRoom;
  let world: WorldCollision;

  beforeEach(() => {
    room = new GreyboxLivingRoom();
    world = new WorldCollision();
    room.mount({ scene: new THREE.Scene(), worldCollision: world });
  });

  it('builds an irregular furnished salon with a west reading bay', () => {
    expect(room.definition).toMatchObject({
      id: 'living-room',
      observationDurationMs: 11_000,
      searchDurationMs: 25_000,
      anomalyCount: { min: 2, max: 3 },
    });

    for (const name of [
      'ARCH_LivingRoomFloor',
      'WALL_LivingRoom_North',
      'ARCH_LivingRoom_BayColumnSouth',
      'ARCH_LivingRoom_BayColumnNorth',
      'ARCH_LivingRoom_BayHeader',
      'WINDOW_LivingRoom_BayWest',
      'DOOR_LivingRoom_Entrance',
      'DOOR_LivingRoom_Exit',
      'EXIT_LivingRoom_Portal',
      'ANOM_LivingRoom_RecordingTape',
    ]) {
      expect(room.getVisualRoot().getObjectByName(name), name).toBeDefined();
    }

    const floor = room.getVisualRoot().getObjectByName('ARCH_LivingRoomFloor');
    if (floor === undefined) {
      throw new Error('Expected the living-room floor.');
    }
    const floorSize = new THREE.Box3()
      .setFromObject(floor)
      .getSize(new THREE.Vector3());
    expect(floorSize.x).toBeCloseTo(9.7, 5);
    expect(floorSize.z).toBeCloseTo(7.6, 5);
    expect(LIVING_ROOM_EXIT_THRESHOLD.crossing).toBe('negative-z');

    const shadowLights: string[] = [];
    room.getVisualRoot().traverse((object) => {
      const light = object as THREE.Light;
      if (light.isLight && light.castShadow) {
        shadowLights.push(light.name);
      }
    });
    expect(shadowLights).toEqual(['LIGHT_LivingRoom_Chandelier']);
    expect(room.getExitDoor()).not.toBeNull();
    room.unmount();
  });

  it('keeps the spawn and opened west-bay exit clear', () => {
    const spawn = room.getPlayerSpawn();
    expectCapsuleClear(spawn.x, spawn.z);
    expectCapsuleClear(-3.5, 2.65);
    expectCapsuleClear(-4.45, 0.15);

    room.setExitDoorCollisionEnabled(false);
    expectCapsuleClear(-4.85, -2.25);
    room.unmount();
  });

  it('loads fourteen props plus the cassette without rotation anomalies', async () => {
    const load = vi.fn(() => Promise.resolve(createAssetSource()));
    const manager = new AssetManager({ load });

    await room.loadAssets(manager);
    await room.loadAssets(manager);

    expect(load).toHaveBeenCalledTimes(16);
    expect(new Set(room.getLoadedAssetIds())).toEqual(
      new Set(Object.values(LIVING_ROOM_ASSET_CATALOG).map(({ id }) => id)),
    );
    expect(room.getLoadedAssetIds()).toHaveLength(14);
    expect(room.getAnomalyTargets()).toHaveLength(15);

    for (const target of room.getAnomalyTargets()) {
      expect(target.object.parent).toBe(room.getVisualRoot());
      expect(target.interactionVolume.parent).toBe(target.object);
      expect(
        target.interactionVolume.layers.isEnabled(RENDER_LAYERS.interaction),
      ).toBe(true);
      expect(target.variants.some(({ kind }) => kind === 'rotate')).toBe(false);
    }

    const registry = room.getAnomalyTargetRegistry();
    for (const id of [
      'sectional-sofa',
      'fireplace',
      'media-cabinet',
      'archive-shelf',
      'coffee-table',
      'bay-chair',
    ]) {
      expect(
        registry.getById(id)?.variants.some(({ kind }) => kind === 'color'),
        id,
      ).toBe(false);
      expect(
        registry.getById(id)?.variants.some(({ kind }) => kind === 'scale'),
        id,
      ).toBe(true);
    }
    for (const id of ['recording-tape', 'tape-player', 'television']) {
      expect(
        registry.getById(id)?.variants.some(
          ({ kind }) => kind === 'hide' || kind === 'show',
        ),
        id,
      ).toBe(false);
    }
    expect(registry.getById('archive-shelf')?.dependentTargetIds).toEqual([
      'tape-player',
      'family-photo',
      'recording-tape',
    ]);
    const fireplace = registry.getById('fireplace')?.object;
    expect(
      fireplace?.getObjectByName('DETAIL_LivingRoom_FireplaceEmbers'),
    ).toBeDefined();
    expect(
      fireplace?.getObjectByName('DETAIL_LivingRoom_FireplaceFlame_1'),
    ).toBeDefined();
    const fireplaceStoneMaterial = collectStandardMaterials(fireplace).find(
      ({ map }) => map?.name === 'TEXTURE_LivingRoom_FireplaceStone',
    );
    expect(fireplaceStoneMaterial).toBeDefined();

    const window = room
      .getVisualRoot()
      .getObjectByName('WINDOW_LivingRoom_BayWest');
    const windowMaterials = collectStandardMaterials(window);
    const frameMaterial = windowMaterials.find(({ name }) => name === 'White');
    const glassMaterial = windowMaterials.find(({ name }) => name === 'Glass');
    expect(frameMaterial?.map?.name).toBe(
      'TEXTURE_HouseShell_living-room_WindowFrameWood',
    );
    expect(glassMaterial?.color.getHexString()).toBe('4f7480');
    expect(glassMaterial?.transparent).toBe(true);
    expect(glassMaterial?.opacity).toBeCloseTo(0.3);
    const frameTexture = frameMaterial?.map;
    if (frameTexture === null || frameTexture === undefined) {
      throw new Error('Expected the living-room window-frame texture.');
    }
    const disposeFrameTexture = vi.spyOn(frameTexture, 'dispose');

    const system = new RoomAnomalySystem(registry);
    system.prepareRunBaseline({
      runSeed: 304,
      roomIndex: 6,
      roomId: 'living-room',
    });
    const plan = system.generatePlan({
      runSeed: 304,
      roomIndex: 6,
      roomId: 'living-room',
      difficulty: 4,
      count: 3,
    });
    expect(plan.anomalies).toHaveLength(3);
    expect(plan.anomalies.some(({ kind }) => kind === 'rotate')).toBe(false);
    system.applyPlan(plan);
    system.restore();

    room.unmount();
    expect(disposeFrameTexture).toHaveBeenCalledOnce();
    expect(manager.getCachedAssetCount()).toBe(0);
  });

  function expectCapsuleClear(x: number, z: number): void {
    const capsule = new Capsule(
      new THREE.Vector3(x, PLAYER_CONFIG.capsuleRadius, z),
      new THREE.Vector3(
        x,
        PLAYER_CONFIG.capsuleHeight - PLAYER_CONFIG.capsuleRadius,
        z,
      ),
      PLAYER_CONFIG.capsuleRadius,
    );
    expect(world.intersectCapsule(capsule), `capsule at ${x}, ${z}`).toBeNull();
  }
});

function collectStandardMaterials(
  root: THREE.Object3D | undefined,
): THREE.MeshStandardMaterial[] {
  const materials = new Set<THREE.MeshStandardMaterial>();

  root?.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }
    for (const material of Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]) {
      const standard = material as THREE.MeshStandardMaterial;
      if (standard.isMeshStandardMaterial) {
        materials.add(standard);
      }
    }
  });

  return [...materials];
}
