import * as THREE from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CORRIDOR_ASSET_CATALOG } from '../../src/content/rooms/CorridorAssetCatalog';
import type { AnomalyPlan } from '../../src/gameplay/anomalies/AnomalyGenerator';
import { RoomAnomalySystem } from '../../src/gameplay/anomalies/RoomAnomalySystem';
import type { PreparedAnomalyVariant } from '../../src/gameplay/anomalies/AnomalyTarget';
import { PLAYER_CONFIG } from '../../src/player/PlayerConfig';
import { RENDER_LAYERS } from '../../src/rendering/RenderLayers';
import { AssetManager } from '../../src/world/assets/AssetManager';
import {
  CORRIDOR_EXIT_THRESHOLD,
  GreyboxCorridor,
} from '../../src/world/rooms/GreyboxCorridor';
import { WorldCollision } from '../../src/world/WorldCollision';

function createAssetSource(): THREE.Group {
  const root = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: '#b9a58b' });
  material.name = 'corridor-test-material';
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.8), material);
  mesh.name = 'corridor-test-mesh';
  mesh.position.set(0.2, 0.5, -0.1);
  root.add(mesh);
  return root;
}

describe('GreyboxCorridor', () => {
  let room: GreyboxCorridor;
  let scene: THREE.Scene;
  let world: WorldCollision;

  beforeEach(() => {
    room = new GreyboxCorridor();
    scene = new THREE.Scene();
    world = new WorldCollision();
    room.mount({ scene, worldCollision: world });
  });

  it('builds the L-shaped shell, readable lighting, doors, and a safe spawn', () => {
    expect(room.definition).toMatchObject({
      id: 'first-corridor',
      displayName: 'Corridor',
      observationDurationMs: 20_000,
      searchDurationMs: 45_000,
      anomalyCount: { min: 2, max: 2 },
    });

    for (const name of [
      'ARCH_Floor_FirstLeg',
      'ARCH_Floor_SecondLeg',
      'ARCH_Ceiling_FirstLeg',
      'ARCH_Ceiling_SecondLeg',
      'WALL_North_Long',
      'WALL_West',
      'WALL_InnerEast',
      'WALL_InnerSouth',
      'PANEL_West',
      'DOOR_Entrance',
      'DOOR_Exit',
      'EXIT_Corridor_Portal',
    ]) {
      expect(room.getVisualRoot().getObjectByName(name), name).toBeDefined();
    }

    const shadowLights: THREE.Light[] = [];
    room.getVisualRoot().traverse((object) => {
      const light = object as THREE.Light;

      if (light.isLight && light.castShadow) {
        shadowLights.push(light);
      }
    });
    expect(shadowLights).toHaveLength(1);
    expect(shadowLights[0]?.name).toBe('LIGHT_Corridor_Key');
    expect(room.getExitDoor()).not.toBeNull();
    expect(CORRIDOR_EXIT_THRESHOLD.x).toBeGreaterThan(6);

    const spawn = room.getPlayerSpawn();
    const capsule = new Capsule(
      new THREE.Vector3(spawn.x, spawn.y + PLAYER_CONFIG.capsuleRadius, spawn.z),
      new THREE.Vector3(
        spawn.x,
        spawn.y + PLAYER_CONFIG.capsuleHeight - PLAYER_CONFIG.capsuleRadius,
        spawn.z,
      ),
      PLAYER_CONFIG.capsuleRadius,
    );
    expect(world.intersectCapsule(capsule)).toBeNull();

    for (const [x, z] of [
      [0, -2.4],
      [2.5, -2.4],
      [5.8, -2.4],
    ] as const) {
      const pathCapsule = new Capsule(
        new THREE.Vector3(x, PLAYER_CONFIG.capsuleRadius, z),
        new THREE.Vector3(
          x,
          PLAYER_CONFIG.capsuleHeight - PLAYER_CONFIG.capsuleRadius,
          z,
        ),
        PLAYER_CONFIG.capsuleRadius,
      );
      expect(world.intersectCapsule(pathCapsule), `path at ${x}, ${z}`).toBeNull();
    }

    room.setExitDoorCollisionEnabled(false);
    const exitCapsule = new Capsule(
      new THREE.Vector3(6.6, PLAYER_CONFIG.capsuleRadius, -2.4),
      new THREE.Vector3(
        6.6,
        PLAYER_CONFIG.capsuleHeight - PLAYER_CONFIG.capsuleRadius,
        -2.4,
      ),
      PLAYER_CONFIG.capsuleRadius,
    );
    expect(world.intersectCapsule(exitCapsule)).toBeNull();
    room.unmount();
  });

  it('loads sixteen props and exposes deterministic, visible anomaly variants', async () => {
    const load = vi.fn(() => Promise.resolve(createAssetSource()));
    const manager = new AssetManager({ load });

    await room.loadAssets(manager);
    await room.loadAssets(manager);

    expect(load).toHaveBeenCalledTimes(16);
    expect(new Set(room.getLoadedAssetIds())).toEqual(
      new Set(Object.values(CORRIDOR_ASSET_CATALOG).map((asset) => asset.id)),
    );
    expect(room.getAnomalyTargets()).toHaveLength(16);
    expect(new Set(room.getAnomalyTargets().map((target) => target.id)).size).toBe(16);

    for (const target of room.getAnomalyTargets()) {
      expect(target.object.parent).toBe(room.getVisualRoot());
      expect(target.interactionVolume.parent).toBe(target.object);
      expect(
        target.interactionVolume.layers.isEnabled(RENDER_LAYERS.interaction),
      ).toBe(true);
      expect(target.variants.filter((variant) => variant.kind === 'color')).toHaveLength(2);
      expect(target.variants.some((variant) => variant.kind === 'hide')).toBe(true);
      expect(target.variants.some((variant) => variant.kind === 'show')).toBe(true);
    }

    expect(
      room.getAnomalyTargetRegistry().getById('console')?.dependentTargetIds,
    ).toEqual(['phone']);
    expect(
      room
        .getAnomalyTargetRegistry()
        .getById('console')
        ?.collisionObjects?.[0]?.name,
    ).toBe('COLLIDER_Console');
    expect(
      room
        .getAnomalyTargetRegistry()
        .getById('bench')
        ?.collisionObjects?.[0]?.name,
    ).toBe('COLLIDER_Bench');
    expect(
      room.getAnomalyTargetRegistry().getById('side-table')?.dependentTargetIds,
    ).toEqual(['small-speaker']);
    expect(
      room
        .getAnomalyTargetRegistry()
        .getById('side-table')
        ?.collisionObjects?.[0]?.name,
    ).toBe('COLLIDER_SideTable');

    const expectedLayout = new Map<
      string,
      {
        readonly position: readonly [number, number, number];
        readonly quaternion?: readonly [number, number, number, number];
        readonly scale?: readonly [number, number, number];
      }
    >([
      ['bench', { position: [0.94, 0, 0.8] }],
      [
        'boots',
        {
          position: [-0.95, 0, 1.85],
          quaternion: [
            -0.030843564597231896,
            0.706433772212892,
            0.0308435645972319,
            0.7064337722128922,
          ],
        },
      ],
      ['coat-stand', { position: [1.05, 0, -3.3] }],
      ['phone', { position: [-1.1, 0.8, -1.15], scale: [1.15, 1.15, 1.15] }],
      ['runner-rug', { position: [0, 0.012, 3.3] }],
      [
        'wall-clock',
        {
          position: [3.7, 1.82, -3.65],
          quaternion: [0, -0.7071067811865475, 0, 0.7071067811865476],
          scale: [5.5, 5.5, 5.5],
        },
      ],
      ['wall-hooks', { position: [3.25, 1.55, -1.08], scale: [2, 2, 2] }],
    ]);

    for (const [targetId, expected] of expectedLayout) {
      const object = room.getAnomalyTargetRegistry().getById(targetId)?.object;

      expect(object?.position.toArray(), `${targetId} position`).toEqual(
        expected.position,
      );
      expect(object?.quaternion.toArray(), `${targetId} quaternion`).toEqual(
        expected.quaternion ?? [0, 0, 0, 1],
      );
      expect(object?.scale.toArray(), `${targetId} scale`).toEqual(
        expected.scale ?? [1, 1, 1],
      );
    }

    const positiveRotation = (targetId: string) =>
      room
        .getAnomalyTargetRegistry()
        .getById(targetId)
        ?.variants.find(
          (variant) =>
            variant.kind === 'rotate' &&
            (variant.id === 'turned-left' || variant.id === 'tilted-left'),
        );
    expect(positiveRotation('phone')).toMatchObject({
      rotationOffsetRadians: [0, Math.PI / 6, 0],
    });
    expect(positiveRotation('wall-hooks')).toMatchObject({
      rotationOffsetRadians: [0, 0, Math.PI / 12],
    });
    expect(positiveRotation('frame-east')).toMatchObject({
      rotationOffsetRadians: [Math.PI / 12, 0, 0],
    });
    expect(positiveRotation('frame-west')).toMatchObject({
      rotationOffsetRadians: [Math.PI / 12, 0, 0],
    });

    for (const targetId of ['coat-stand', 'plant', 'wall-clock']) {
      expect(positiveRotation(targetId), targetId).toBeUndefined();
    }

    const system = new RoomAnomalySystem(room.getAnomalyTargetRegistry());
    system.prepareRunBaseline({
      runSeed: 42,
      roomIndex: 2,
      roomId: 'first-corridor',
    });
    const plan = system.generatePlan({
      runSeed: 42,
      roomIndex: 2,
      roomId: 'first-corridor',
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

  it('hides the phone with its supporting console', async () => {
    const manager = new AssetManager({
      load: vi.fn(() => Promise.resolve(createAssetSource())),
    });
    await room.loadAssets(manager);
    const system = new RoomAnomalySystem(room.getAnomalyTargetRegistry());
    const consoleTarget = room.getAnomalyTargetRegistry().getById('console');
    const phone = room.getAnomalyTargetRegistry().getById('phone');
    const hide = consoleTarget?.variants.find((variant) => variant.kind === 'hide');

    if (consoleTarget === null || phone === null || hide === undefined) {
      throw new Error('Expected the corridor console support group.');
    }

    system.applyPlan(createPlan(consoleTarget.id, hide));
    expect(phone.interactionVolume.visible).toBe(false);
    system.restore();
    expect(phone.interactionVolume.visible).toBe(true);
    room.unmount();
  });

  it('releases assets that finish loading after an unmount', async () => {
    let resolveLoad: ((root: THREE.Group) => void) | undefined;
    const manager = new AssetManager({
      load: vi.fn(
        () =>
          new Promise<THREE.Group>((resolve) => {
            resolveLoad = resolve;
          }),
      ),
    });
    const loading = room.loadAssets(manager);
    await Promise.resolve();
    room.unmount();
    resolveLoad?.(createAssetSource());

    await expect(loading).rejects.toThrow(
      'The first corridor changed while its assets were loading.',
    );
    expect(manager.getCachedAssetCount()).toBe(0);
  });
});

function createPlan(
  targetId: string,
  variant: PreparedAnomalyVariant,
): AnomalyPlan {
  return {
    runSeed: 12,
    roomSeed: 34,
    roomId: 'first-corridor',
    roomIndex: 2,
    difficulty: 2,
    anomalies: [{ targetId, kind: variant.kind, variantId: variant.id }],
  };
}
