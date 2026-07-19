import * as THREE from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OFFICE_ASSET_CATALOG } from '../../src/content/rooms/OfficeAssetCatalog';
import type { AnomalyPlan } from '../../src/gameplay/anomalies/AnomalyGenerator';
import { RoomAnomalySystem } from '../../src/gameplay/anomalies/RoomAnomalySystem';
import type { PreparedAnomalyVariant } from '../../src/gameplay/anomalies/AnomalyTarget';
import { PLAYER_CONFIG } from '../../src/player/PlayerConfig';
import { RENDER_LAYERS } from '../../src/rendering/RenderLayers';
import { AssetManager } from '../../src/world/assets/AssetManager';
import {
  GreyboxOffice,
  OFFICE_EXIT_THRESHOLD,
} from '../../src/world/rooms/GreyboxOffice';
import { WorldCollision } from '../../src/world/WorldCollision';

function createAssetSource(): THREE.Group {
  const root = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: '#b9a58b' });
  material.name = 'office-test-material';
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.8), material);
  mesh.name = 'office-test-mesh';
  mesh.position.set(0.2, 0.5, -0.1);
  root.add(mesh);
  return root;
}

describe('GreyboxOffice', () => {
  let room: GreyboxOffice;
  let scene: THREE.Scene;
  let world: WorldCollision;

  beforeEach(() => {
    room = new GreyboxOffice();
    scene = new THREE.Scene();
    world = new WorldCollision();
    room.mount({ scene, worldCollision: world });
  });

  it('builds a large polygonal office with a projecting glazed bay', () => {
    expect(room.definition).toMatchObject({
      id: 'office',
      displayName: 'Office',
      observationDurationMs: 15_000,
      searchDurationMs: 30_000,
      anomalyCount: { min: 1, max: 2 },
    });

    for (const name of [
      'ARCH_OfficeFloor_Polygon',
      'ARCH_OfficeCeiling_Polygon',
      'WALL_BayEast',
      'WALL_BayNorth',
      'WALL_BayWest',
      'WINDOW_OfficeBay_East',
      'WINDOW_OfficeBay_North',
      'WINDOW_OfficeBay_West',
      'DOOR_OfficeEntrance',
      'DOOR_OfficeExit',
      'EXIT_Office_Portal',
    ]) {
      expect(room.getVisualRoot().getObjectByName(name), name).toBeDefined();
    }

    const floor = room
      .getVisualRoot()
      .getObjectByName('ARCH_OfficeFloor_Polygon');

    if (floor === undefined) {
      throw new Error('Expected the office polygon floor.');
    }

    const floorSize = new THREE.Box3()
      .setFromObject(floor)
      .getSize(new THREE.Vector3());
    expect(floorSize.x).toBeCloseTo(8.4, 5);
    expect(floorSize.z).toBeCloseTo(8.4, 5);

    const shadowLights: THREE.Light[] = [];
    room.getVisualRoot().traverse((object) => {
      const light = object as THREE.Light;

      if (light.isLight && light.castShadow) {
        shadowLights.push(light);
      }
    });
    expect(shadowLights).toHaveLength(1);
    expect(shadowLights[0]?.name).toBe('LIGHT_Office_Key');
    expect(OFFICE_EXIT_THRESHOLD.x).toBeGreaterThan(4.5);
    expect(room.getExitDoor()).not.toBeNull();
    room.unmount();
  });

  it('keeps the spawn, circulation zones, and opened exit collision-free', () => {
    const spawn = room.getPlayerSpawn();
    expectCapsuleClear(spawn.x, spawn.z);

    for (const [x, z] of [
      [-2.7, 2.2],
      [-2.6, 0.7],
      [-2.55, -1.9],
      [-1.2, -3.65],
      [2.7, 0.8],
    ] as const) {
      expectCapsuleClear(x, z);
    }

    room.setExitDoorCollisionEnabled(false);
    expectCapsuleClear(4.48, 1.2);
    room.unmount();
  });

  it('loads eighteen reused props with coherent anomalies and supports', async () => {
    const load = vi.fn(() => Promise.resolve(createAssetSource()));
    const manager = new AssetManager({ load });

    await room.loadAssets(manager);
    await room.loadAssets(manager);

    const uniqueAssetIds = new Set(
      Object.values(OFFICE_ASSET_CATALOG).map(({ id }) => id),
    );
    expect(load).toHaveBeenCalledTimes(uniqueAssetIds.size);
    expect(room.getLoadedAssetIds()).toHaveLength(18);
    expect(new Set(room.getLoadedAssetIds())).toEqual(uniqueAssetIds);
    expect(room.getAnomalyTargets()).toHaveLength(18);
    expect(
      new Set(room.getAnomalyTargets().map(({ id }) => id)).size,
    ).toBe(18);

    for (const target of room.getAnomalyTargets()) {
      expect(target.object.parent).toBe(room.getVisualRoot());
      expect(target.interactionVolume.parent).toBe(target.object);
      expect(
        target.interactionVolume.layers.isEnabled(
          RENDER_LAYERS.interaction,
        ),
      ).toBe(true);
      expect(
        target.variants.filter(({ kind }) => kind === 'color'),
      ).toHaveLength(2);
      expect(target.variants.some(({ kind }) => kind === 'hide')).toBe(true);
      expect(target.variants.some(({ kind }) => kind === 'show')).toBe(true);
    }

    expect(
      room.getAnomalyTargetRegistry().getById('desk')?.dependentTargetIds,
    ).toEqual(['desk-lamp', 'office-phone', 'books', 'desk-photo']);
    expect(
      room
        .getAnomalyTargetRegistry()
        .getById('bookcase')
        ?.dependentTargetIds,
    ).toEqual(['radio', 'speaker']);

    for (const targetId of [
      'desk',
      'filing-cabinet',
      'drawer-cabinet',
      'bookcase',
      'bay-armchair',
    ]) {
      expect(
        room.getAnomalyTargetRegistry().getById(targetId)
          ?.collisionObjects,
        targetId,
      ).toHaveLength(1);
    }

    const positiveRotation = (targetId: string) =>
      room
        .getAnomalyTargetRegistry()
        .getById(targetId)
        ?.variants.find(
          ({ id, kind }) =>
            kind === 'rotate' &&
            (id === 'turned-left' || id === 'tilted-left'),
        );
    expect(positiveRotation('office-chair')).toMatchObject({
      rotationOffsetRadians: [0, Math.PI / 6, 0],
    });
    expect(positiveRotation('frame-east')).toMatchObject({
      rotationOffsetRadians: [Math.PI / 12, 0, 0],
    });

    for (const targetId of [
      'filing-cabinet',
      'bay-plant',
      'wall-clock',
    ]) {
      expect(positiveRotation(targetId), targetId).toBeUndefined();
    }

    const system = new RoomAnomalySystem(
      room.getAnomalyTargetRegistry(),
    );
    system.prepareRunBaseline({
      runSeed: 42,
      roomIndex: 3,
      roomId: 'office',
    });
    const plan = system.generatePlan({
      runSeed: 42,
      roomIndex: 3,
      roomId: 'office',
      difficulty: 2,
      count: 2,
    });
    expect(plan.anomalies).toHaveLength(2);
    system.applyPlan(plan);
    system.restore();

    room.unmount();
    expect(manager.getCachedAssetCount()).toBe(0);
    expect(room.getAnomalyTargets()).toHaveLength(0);
  });

  it('hides every desk and bookcase accessory with its support', async () => {
    const manager = new AssetManager({
      load: vi.fn(() => Promise.resolve(createAssetSource())),
    });
    await room.loadAssets(manager);
    const system = new RoomAnomalySystem(
      room.getAnomalyTargetRegistry(),
    );

    for (const [supportId, dependentIds] of [
      [
        'desk',
        ['desk-lamp', 'office-phone', 'books', 'desk-photo'],
      ],
      ['bookcase', ['radio', 'speaker']],
    ] as const) {
      const support = room.getAnomalyTargetRegistry().getById(supportId);
      const hide = support?.variants.find(({ kind }) => kind === 'hide');

      if (support === null || hide === undefined) {
        throw new Error(`Expected office support "${supportId}".`);
      }

      system.applyPlan(createPlan(support.id, hide));

      for (const dependentId of dependentIds) {
        expect(
          room.getAnomalyTargetRegistry().getById(dependentId)
            ?.interactionVolume.visible,
          dependentId,
        ).toBe(false);
      }

      system.restore();
    }

    room.unmount();
  });

  it('releases assets that finish loading after an unmount', async () => {
    const resolveLoads: ((root: THREE.Group) => void)[] = [];
    const manager = new AssetManager({
      load: vi.fn(
        () =>
          new Promise<THREE.Group>((resolve) => {
            resolveLoads.push(resolve);
          }),
      ),
    });
    const loading = room.loadAssets(manager);
    await Promise.resolve();
    room.unmount();

    for (const resolve of resolveLoads) {
      resolve(createAssetSource());
    }

    await expect(loading).rejects.toThrow(
      'The office changed while its assets were loading.',
    );
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

function createPlan(
  targetId: string,
  variant: PreparedAnomalyVariant,
): AnomalyPlan {
  return {
    runSeed: 12,
    roomSeed: 34,
    roomId: 'office',
    roomIndex: 3,
    difficulty: 2,
    anomalies: [{ targetId, kind: variant.kind, variantId: variant.id }],
  };
}
