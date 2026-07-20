import * as THREE from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DINING_ROOM_ASSET_CATALOG } from '../../src/content/rooms/DiningRoomAssetCatalog';
import { RoomAnomalySystem } from '../../src/gameplay/anomalies/RoomAnomalySystem';
import { PLAYER_CONFIG } from '../../src/player/PlayerConfig';
import { RENDER_LAYERS } from '../../src/rendering/RenderLayers';
import { AssetManager } from '../../src/world/assets/AssetManager';
import {
  DINING_ROOM_EXIT_THRESHOLD,
  GreyboxDiningRoom,
} from '../../src/world/rooms/GreyboxDiningRoom';
import { WorldCollision } from '../../src/world/WorldCollision';

function createAssetSource(): THREE.Group {
  const root = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: '#b8aa91' });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.8), material);
  mesh.position.set(0.15, 0.5, -0.1);
  root.add(mesh);
  return root;
}

describe('GreyboxDiningRoom', () => {
  let room: GreyboxDiningRoom;
  let world: WorldCollision;

  beforeEach(() => {
    room = new GreyboxDiningRoom();
    world = new WorldCollision();
    room.mount({ scene: new THREE.Scene(), worldCollision: world });
  });

  it('builds a two-volume dining room with a distinct furnished alcove', () => {
    expect(room.definition).toMatchObject({
      id: 'dining-room',
      observationDurationMs: 13_000,
      searchDurationMs: 28_000,
      anomalyCount: { min: 2, max: 2 },
    });

    for (const name of [
      'ARCH_DiningRoomFloor',
      'WALL_DiningRoom_North',
      'WALL_DiningRoom_AlcoveSouth',
      'ARCH_DiningRoom_AlcoveColumnSouth',
      'ARCH_DiningRoom_AlcoveColumnNorth',
      'ARCH_DiningRoom_AlcoveHeader',
      'WINDOW_DiningRoom_AlcoveSouth',
      'WINDOW_DiningRoom_AlcoveNorth',
      'WINDOW_DiningRoom_AlcoveEast',
      'DOOR_DiningRoom_Entrance',
      'DOOR_DiningRoom_Exit',
      'EXIT_DiningRoom_Portal',
    ]) {
      expect(room.getVisualRoot().getObjectByName(name), name).toBeDefined();
    }

    const floor = room.getVisualRoot().getObjectByName('ARCH_DiningRoomFloor');
    if (floor === undefined) {
      throw new Error('Expected the dining-room floor.');
    }
    const floorSize = new THREE.Box3().setFromObject(floor).getSize(new THREE.Vector3());
    expect(floorSize.x).toBeCloseTo(8.8, 5);
    expect(floorSize.z).toBeCloseTo(7.6, 5);
    expect(DINING_ROOM_EXIT_THRESHOLD.x).toBeCloseTo(5.2);

    const shadowLights: string[] = [];
    room.getVisualRoot().traverse((object) => {
      const light = object as THREE.Light;
      if (light.isLight && light.castShadow) {
        shadowLights.push(light.name);
      }
    });
    expect(shadowLights).toEqual(['LIGHT_DiningRoom_Table']);
    const entranceFill = room
      .getVisualRoot()
      .getObjectByName('LIGHT_DiningRoom_EntranceFill') as
        | THREE.PointLight
        | undefined;
    expect(entranceFill).toBeInstanceOf(THREE.PointLight);
    expect(entranceFill?.intensity).toBeCloseTo(0.38);
    expect(
      (
        room
          .getVisualRoot()
          .getObjectByName('LIGHT_DiningRoom_Ambient') as THREE.HemisphereLight
      ).intensity,
    ).toBeCloseTo(0.4);
    expect(room.getExitDoor()).not.toBeNull();
    room.unmount();
  });

  it('keeps the spawn, passage between both volumes, and opened east exit clear', () => {
    const spawn = room.getPlayerSpawn();
    expectCapsuleClear(spawn.x, spawn.z);

    for (const [x, z] of [
      [-2.8, 2.5],
      [-3.15, 0.8],
      [-3.05, -1.7],
      [1.2, 0.2],
      [2.45, 0.15],
      [3.65, -0.55],
      [4.35, -0.65],
    ] as const) {
      expectCapsuleClear(x, z);
    }

    room.setExitDoorCollisionEnabled(false);
    expectCapsuleClear(5.05, -0.65);
    room.unmount();
  });

  it('loads sixteen correctly oriented props without rotation anomalies', async () => {
    const load = vi.fn(() => Promise.resolve(createAssetSource()));
    const manager = new AssetManager({ load });

    await room.loadAssets(manager);
    await room.loadAssets(manager);

    expect(load).toHaveBeenCalledTimes(13);
    expect(new Set(room.getLoadedAssetIds())).toEqual(
      new Set(Object.values(DINING_ROOM_ASSET_CATALOG).map(({ id }) => id)),
    );
    expect(room.getLoadedAssetIds()).toHaveLength(16);
    expect(room.getAnomalyTargets()).toHaveLength(16);
    expect(new Set(room.getAnomalyTargets().map(({ id }) => id)).size).toBe(16);

    for (const target of room.getAnomalyTargets()) {
      expect(target.object.parent).toBe(room.getVisualRoot());
      expect(target.interactionVolume.parent).toBe(target.object);
      expect(target.interactionVolume.layers.isEnabled(RENDER_LAYERS.interaction)).toBe(true);
      expect(target.variants.filter(({ kind }) => kind === 'color')).toHaveLength(2);
      expect(target.variants.some(({ kind }) => kind === 'hide')).toBe(true);
      expect(target.variants.some(({ kind }) => kind === 'show')).toBe(true);
      expect(target.variants.some(({ kind }) => kind === 'rotate')).toBe(false);
    }

    const registry = room.getAnomalyTargetRegistry();
    expect(registry.getById('dining-table')?.object.position.toArray()).toEqual([-1, 0, -0.1]);
    expect(registry.getById('dining-table')?.object.scale.toArray()).toEqual([1.25, 1, 1.1]);
    expect(registry.getById('chair-north-west')?.object.position.toArray()).toEqual([-1.65, 0, -1.13]);
    expect(registry.getById('chair-south-west')?.object.position.toArray()).toEqual([-1.65, 0, 0.93]);
    expect(registry.getById('chair-west')?.object.position.toArray()).toEqual([-2.58, 0, -0.1]);
    expect(registry.getById('chair-east')?.object.position.toArray()).toEqual([0.58, 0, -0.1]);
    expect(
      registry.getById('chair-north-west')?.object.getObjectByName('ANOM_Dining_Chair_1_GLB')?.rotation.y,
    ).toBeCloseTo(0);
    expect(
      registry.getById('chair-south-west')?.object.getObjectByName('ANOM_Dining_Chair_3_GLB')?.rotation.y,
    ).toBeCloseTo(Math.PI);
    expect(
      registry.getById('chair-west')?.object.getObjectByName('ANOM_Dining_Chair_5_GLB')?.rotation.y,
    ).toBeCloseTo(Math.PI / 2);
    expect(
      registry.getById('chair-east')?.object.getObjectByName('ANOM_Dining_Chair_6_GLB')?.rotation.y,
    ).toBeCloseTo(-Math.PI / 2);
    expect(
      registry.getById('alcove-bench')?.object.getObjectByName('ANOM_Dining_AlcoveBench_GLB')?.rotation.y,
    ).toBeCloseTo(-Math.PI / 2);
    expect(
      registry.getById('alcove-chair-south')?.object.getObjectByName('ANOM_Dining_AlcoveChairSouth_GLB')?.rotation.y,
    ).toBeCloseTo(Math.PI * 0.78);
    expect(
      registry.getById('alcove-chair-north')?.object.getObjectByName('ANOM_Dining_AlcoveChairNorth_GLB')?.rotation.y,
    ).toBeCloseTo(Math.PI / 10);
    expect(registry.getById('sideboard')?.dependentTargetIds).toEqual(['bear-ornament']);
    expect(registry.getById('dining-table')?.object.getObjectByName('DETAIL_DiningRoom_TableSetting')).toBeDefined();
    expect(registry.getById('dining-table')?.collisionObjects).toHaveLength(1);
    expect(registry.getById('alcove-bench')?.collisionObjects).toHaveLength(1);

    const tableCollider = room
      .getCollisionRoot()
      .getObjectByName('COLLIDER_DiningTable') as THREE.Mesh;
    tableCollider.geometry.computeBoundingBox();
    const tableColliderSize = tableCollider.geometry.boundingBox?.getSize(
      new THREE.Vector3(),
    );
    expect(tableColliderSize?.x).toBeCloseTo(2.42);
    expect(tableColliderSize?.y).toBeCloseTo(0.78);
    expect(tableColliderSize?.z).toBeCloseTo(1.1396);

    const system = new RoomAnomalySystem(registry);
    system.prepareRunBaseline({ runSeed: 84, roomIndex: 5, roomId: 'dining-room' });
    const plan = system.generatePlan({
      runSeed: 84,
      roomIndex: 5,
      roomId: 'dining-room',
      difficulty: 3,
      count: 2,
    });
    expect(plan.anomalies).toHaveLength(2);
    expect(plan.anomalies.some(({ kind }) => kind === 'rotate')).toBe(false);
    system.applyPlan(plan);
    system.restore();

    room.unmount();
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
