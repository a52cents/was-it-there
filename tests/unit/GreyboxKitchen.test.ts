import * as THREE from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KITCHEN_ASSET_CATALOG } from '../../src/content/rooms/KitchenAssetCatalog';
import { RoomAnomalySystem } from '../../src/gameplay/anomalies/RoomAnomalySystem';
import { PLAYER_CONFIG } from '../../src/player/PlayerConfig';
import { RENDER_LAYERS } from '../../src/rendering/RenderLayers';
import { AssetManager } from '../../src/world/assets/AssetManager';
import {
  GreyboxKitchen,
  KITCHEN_COLOR_ANOMALY_TARGET_IDS,
  KITCHEN_EXIT_THRESHOLD,
} from '../../src/world/rooms/GreyboxKitchen';
import { WorldCollision } from '../../src/world/WorldCollision';

function createAssetSource(): THREE.Group {
  const root = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: '#b8aa91' });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.8), material);
  mesh.position.set(0.15, 0.5, -0.1);
  root.add(mesh);
  return root;
}

describe('GreyboxKitchen', () => {
  let room: GreyboxKitchen;
  let world: WorldCollision;

  beforeEach(() => {
    room = new GreyboxKitchen();
    world = new WorldCollision();
    room.mount({ scene: new THREE.Scene(), worldCollision: world });
  });

  it('builds an office-sized kitchen with a different northbound layout', () => {
    expect(room.definition).toMatchObject({
      id: 'kitchen',
      observationDurationMs: 13_000,
      searchDurationMs: 28_000,
      anomalyCount: { min: 2, max: 2 },
    });

    for (const name of [
      'ARCH_KitchenFloor',
      'TILE_Kitchen_NorthBacksplash',
      'TILE_Kitchen_WestBacksplash',
      'WINDOW_Kitchen_East',
      'ARCH_Kitchen_PantryDivider',
      'DOOR_Kitchen_Entrance',
      'DOOR_Kitchen_Exit',
      'EXIT_Kitchen_Portal',
      'NEON_Kitchen_SouthWest',
      'NEON_Kitchen_NorthEast',
      'NEON_Kitchen_EastCorner',
      'LIGHT_Kitchen_NeonSouthWest',
      'LIGHT_Kitchen_NeonNorthEast',
      'LIGHT_Kitchen_NeonEastCorner',
    ]) {
      expect(room.getVisualRoot().getObjectByName(name), name).toBeDefined();
    }

    const floor = room.getVisualRoot().getObjectByName('ARCH_KitchenFloor');
    if (floor === undefined) {
      throw new Error('Expected the kitchen floor.');
    }
    const floorSize = new THREE.Box3().setFromObject(floor).getSize(new THREE.Vector3());
    expect(floorSize.x).toBeCloseTo(8.4, 5);
    expect(floorSize.z).toBeCloseTo(8.4, 5);
    const floorMaterial = (floor as THREE.Mesh)
      .material as THREE.MeshStandardMaterial;
    expect(floorMaterial.color.getHexString()).toBe('ffffff');
    expect(floorMaterial.map?.name).toBe('TEXTURE_Kitchen_WornTile');
    expect(KITCHEN_EXIT_THRESHOLD.crossing).toBe('negative-z');
    expect(room.getExitDoor()).not.toBeNull();
    room.unmount();
  });

  it('keeps the spawn, loop circulation, and opened north exit clear', () => {
    const spawn = room.getPlayerSpawn();
    expectCapsuleClear(spawn.x, spawn.z);

    for (const [x, z] of [
      [-2.75, 2.7],
      [-2.25, 0.3],
      [0.75, 1.45],
      [1.75, 0.1],
      [2.75, -2.6],
    ] as const) {
      expectCapsuleClear(x, z);
    }

    room.setExitDoorCollisionEnabled(false);
    expectCapsuleClear(2.75, -4.45);
    room.unmount();
  });

  it('loads twenty-two detailed props and prepares coherent anomalies', async () => {
    const load = vi.fn(() => Promise.resolve(createAssetSource()));
    const manager = new AssetManager({ load });

    await room.loadAssets(manager);
    await room.loadAssets(manager);

    expect(load).toHaveBeenCalledTimes(19);
    expect(new Set(room.getLoadedAssetIds())).toEqual(
      new Set(Object.values(KITCHEN_ASSET_CATALOG).map(({ id }) => id)),
    );
    expect(room.getLoadedAssetIds()).toHaveLength(22);
    expect(room.getAnomalyTargets()).toHaveLength(20);
    expect(new Set(room.getAnomalyTargets().map(({ id }) => id)).size).toBe(20);

    for (const [targetId, objectName] of [
      ['ceiling-light-west', 'ANOM_Kitchen_CeilingLightWest'],
      ['ceiling-light-east', 'ANOM_Kitchen_CeilingLightEast'],
    ] as const) {
      expect(room.getVisualRoot().getObjectByName(objectName)).toBeDefined();
      expect(room.getAnomalyTargetRegistry().getById(targetId)).toBeNull();
      expect(
        room.getVisualRoot().getObjectByName(`INTERACT_${targetId}`),
      ).toBeUndefined();
    }

    for (const target of room.getAnomalyTargets()) {
      expect(target.object.parent).toBe(room.getVisualRoot());
      expect(target.interactionVolume.parent).toBe(target.object);
      expect(target.interactionVolume.layers.isEnabled(RENDER_LAYERS.interaction)).toBe(true);
      const colorVariantCount = KITCHEN_COLOR_ANOMALY_TARGET_IDS.includes(
        target.id as (typeof KITCHEN_COLOR_ANOMALY_TARGET_IDS)[number],
      ) ? 2 : 0;
      expect(target.variants.filter(({ kind }) => kind === 'color')).toHaveLength(colorVariantCount);
      expect(target.variants.some(({ kind }) => kind === 'hide')).toBe(true);
      expect(target.variants.some(({ kind }) => kind === 'show')).toBe(true);
      expect(target.variants.some(({ kind }) => kind === 'rotate')).toBe(false);
    }

    expect(
      room.getAnomalyTargetRegistry().getById('island')?.dependentTargetIds,
    ).toEqual(['blender']);
    expect(
      room.getAnomalyTargetRegistry().getById('stove')?.dependentTargetIds,
    ).toEqual(['hood']);
    for (const furnitureId of [
      'fridge',
      'west-cabinet',
      'sink',
      'north-cabinet',
      'stove',
      'east-cabinet',
      'upper-cabinet',
      'hood',
      'island',
      'island-end',
      'bar-stool-west',
      'bar-stool-east',
      'breakfast-table',
      'breakfast-chair',
    ]) {
      expect(
        room.getAnomalyTargetRegistry().getById(furnitureId)?.variants
          .some(({ kind }) => kind === 'color'),
        furnitureId,
      ).toBe(false);
    }
    expect(
      room.getAnomalyTargetRegistry().getById('fridge')?.collisionObjects,
    ).toHaveLength(1);
    expect(
      room.getAnomalyTargetRegistry().getById('bar-stool-west')?.object.position.toArray(),
    ).toEqual([-1.25, 0, -0.5]);
    expect(
      room.getAnomalyTargetRegistry().getById('bar-stool-east')?.object.position.toArray(),
    ).toEqual([-1.25, 0, 0.45]);
    expect(
      room.getAnomalyTargetRegistry().getById('west-cabinet')?.object.scale.toArray(),
    ).toEqual([1.5, 1.4, 1.5]);
    expect(
      room.getAnomalyTargetRegistry().getById('north-cabinet')?.object.scale.toArray(),
    ).toEqual([1.25, 1.25, 1.25]);
    expect(
      room.getAnomalyTargetRegistry().getById('sink')?.object.scale.toArray(),
    ).toEqual([1.15, 1.15, 1.15]);
    expect(
      room.getAnomalyTargetRegistry().getById('microwave')?.object.position.toArray(),
    ).toEqual([1.34, 0.7, -3.65]);
    expect(
      room.getAnomalyTargetRegistry().getById('microwave')?.object.quaternion.toArray(),
    ).toEqual([0, 1, 0, 0]);
    expect(
      room.getAnomalyTargetRegistry().getById('window-plant')?.object.position.toArray(),
    ).toEqual([2.6, 0.6, 1.65]);
    const breakfastTable = room
      .getAnomalyTargetRegistry()
      .getById('breakfast-table')?.object;
    expect(breakfastTable?.quaternion.toArray()).toEqual([
      0,
      0.25881904510252074,
      0,
      0.9659258262890683,
    ]);
    expect(
      breakfastTable?.getObjectByName('DETAIL_Kitchen_BreakfastSetting'),
    ).toBeDefined();
    for (const side of ['North', 'South', 'East']) {
      expect(
        breakfastTable?.getObjectByName(
          `DETAIL_Kitchen_BreakfastPlate${side}`,
        ),
      ).toBeDefined();
      expect(
        breakfastTable?.getObjectByName(`DETAIL_Kitchen_Mug${side}`),
      ).toBeDefined();
    }
    expect(
      breakfastTable?.getObjectByName('DETAIL_Kitchen_BreakfastPlateWest'),
    ).toBeUndefined();
    expect(
      breakfastTable?.getObjectByName('DETAIL_Kitchen_MugWest'),
    ).toBeUndefined();
    expect(
      breakfastTable?.getObjectByName('DETAIL_Kitchen_FruitBowl'),
    ).toBeDefined();

    const chairCopy = room
      .getVisualRoot()
      .getObjectByName('ANOM_Kitchen_BreakfastChair_Copy');
    const chairCopy2 = room
      .getVisualRoot()
      .getObjectByName('ANOM_Kitchen_BreakfastChair_Copy_2');
    const islandCopy = room
      .getVisualRoot()
      .getObjectByName('ANOM_Kitchen_Island_Copy');
    expect(chairCopy?.position.toArray()).toEqual([2.55, 0, 0.55]);
    expect(chairCopy?.quaternion.toArray()).toEqual([0, 1, 0, 0]);
    expect(chairCopy2?.position.toArray()).toEqual([
      3.6500000000000004,
      0,
      1.7000000000000002,
    ]);
    expect(chairCopy2?.quaternion.toArray()).toEqual([
      0,
      -0.7071067811865476,
      0,
      -0.7071067811865475,
    ]);
    expect(islandCopy?.position.toArray()).toEqual([-0.22, 0, 0.47]);
    expect(chairCopy?.getObjectByName('INTERACT_breakfast-chair')).toBeUndefined();
    expect(chairCopy2?.getObjectByName('INTERACT_breakfast-chair')).toBeUndefined();
    expect(islandCopy?.getObjectByName('INTERACT_island')).toBeUndefined();

    const westCabinetCollider = room
      .getCollisionRoot()
      .getObjectByName('COLLIDER_Kitchen_WestCabinet') as THREE.Mesh;
    westCabinetCollider.geometry.computeBoundingBox();
    const westColliderSize = westCabinetCollider.geometry.boundingBox?.getSize(
      new THREE.Vector3(),
    );
    expect(westColliderSize?.x).toBeCloseTo(1.17);
    expect(westColliderSize?.y).toBeCloseTo(1.316);
    expect(westColliderSize?.z).toBeCloseTo(1.74);
    expect(
      room.getCollisionRoot().getObjectByName('COLLIDER_Kitchen_IslandCopy'),
    ).toBeDefined();

    const system = new RoomAnomalySystem(room.getAnomalyTargetRegistry());
    system.prepareRunBaseline({ runSeed: 42, roomIndex: 4, roomId: 'kitchen' });
    const plan = system.generatePlan({
      runSeed: 42,
      roomIndex: 4,
      roomId: 'kitchen',
      difficulty: 3,
      count: 2,
    });
    expect(plan.anomalies).toHaveLength(2);
    system.applyPlan(plan);
    system.restore();

    const storyTargetIds = room.getAnomalyTargets().map(({ id }) => id);
    system.prepareRunBaseline({
      runSeed: 304,
      roomIndex: 4,
      roomId: 'kitchen',
      requiredVisibleTargetIds: storyTargetIds,
      disappearanceProtectedTargetIds: ['breakfast-table'],
    });
    const storyPlan = system.generatePlan({
      runSeed: 304,
      roomIndex: 4,
      roomId: 'kitchen',
      difficulty: 3,
      count: 2,
    });
    expect(storyPlan.anomalies).toHaveLength(2);
    expect(
      storyPlan.anomalies.some(
        ({ targetId }) => targetId === 'breakfast-table',
      ),
    ).toBe(false);
    system.applyPlan(storyPlan);
    system.restore();

    let generatedIslandHide = false;
    for (let seed = 0; seed < 1_000; seed += 1) {
      system.prepareRunBaseline({
        runSeed: seed,
        roomIndex: 4,
        roomId: 'kitchen',
      });
      const dependencySafePlan = system.generatePlan({
        runSeed: seed,
        roomIndex: 4,
        roomId: 'kitchen',
        difficulty: 3,
        count: 2,
      });
      const selectedTargetIds = new Set(
        dependencySafePlan.anomalies.map(({ targetId }) => targetId),
      );

      for (const anomaly of dependencySafePlan.anomalies) {
        if (anomaly.kind !== 'hide') {
          continue;
        }

        if (anomaly.targetId === 'island') {
          generatedIslandHide = true;
        }

        const hiddenTarget = room
          .getAnomalyTargetRegistry()
          .getById(anomaly.targetId);
        for (const dependentTargetId of hiddenTarget?.dependentTargetIds ?? []) {
          expect(
            selectedTargetIds.has(dependentTargetId),
            `${anomaly.targetId}/hide cannot be combined with ${dependentTargetId}`,
          ).toBe(false);
        }
      }
    }
    expect(generatedIslandHide).toBe(true);

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
