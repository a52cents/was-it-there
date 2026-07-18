import * as THREE from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BATHROOM_ASSET_CATALOG,
  BATHROOM_COLLECTION_NODE_NAMES,
} from '../../src/content/rooms/BathroomAssetCatalog';
import type { AnomalyPlan } from '../../src/gameplay/anomalies/AnomalyGenerator';
import { RoomAnomalySystem } from '../../src/gameplay/anomalies/RoomAnomalySystem';
import type {
  AnomalyTarget,
  PreparedAnomalyVariant,
} from '../../src/gameplay/anomalies/AnomalyTarget';
import { PLAYER_CONFIG } from '../../src/player/PlayerConfig';
import { RENDER_LAYERS } from '../../src/rendering/RenderLayers';
import { AssetManager } from '../../src/world/assets/AssetManager';
import { GreyboxBathroom } from '../../src/world/rooms/GreyboxBathroom';
import { WorldCollision } from '../../src/world/WorldCollision';

function createCollectionSource(): THREE.Group {
  const root = new THREE.Group();

  for (const [index, name] of Object.values(
    BATHROOM_COLLECTION_NODE_NAMES,
  ).entries()) {
    const prop = new THREE.Group();
    prop.name = name;
    const material = new THREE.MeshStandardMaterial({
      color: index % 2 === 0 ? '#d0c7b7' : '#8fa09b',
    });
    material.name = 'tiny_treats_1';
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1 + (index % 3) * 0.2, 1, 0.8),
      material,
    );
    mesh.name = `${name}_mesh`;
    mesh.position.set(0.25, 0.5, -0.15);
    prop.add(mesh);
    root.add(prop);
  }

  return root;
}

describe('GreyboxBathroom', () => {
  let room: GreyboxBathroom;
  let scene: THREE.Scene;
  let world: WorldCollision;

  beforeEach(() => {
    room = new GreyboxBathroom();
    scene = new THREE.Scene();
    world = new WorldCollision();
    room.mount({ scene, worldCollision: world });
  });

  it('builds a coherent tiled shell, readable lighting, and safe spawn', () => {
    expect(room.definition).toMatchObject({
      id: 'bathroom',
      displayName: 'Bathroom',
      observationDurationMs: 10_000,
      searchDurationMs: 30_000,
      anomalyCount: { min: 1, max: 1 },
    });

    for (const name of [
      'ARCH_Floor',
      'ARCH_Ceiling',
      'WALL_North',
      'WALL_West',
      'TILE_North',
      'TILE_West',
      'TRIM_East_North',
      'TRIM_East_South',
      'ARCH_ShowerGlass',
      'ARCH_FrostedWindow',
      'DOOR_Entrance',
      'DOOR_Exit',
    ]) {
      expect(room.getVisualRoot().getObjectByName(name), name).toBeDefined();
    }
    expect(room.getVisualRoot().getObjectByName('TRIM_East')).toBeUndefined();

    const shadowLights: THREE.Light[] = [];
    room.getVisualRoot().traverse((object) => {
      const light = object as THREE.Light;

      if (light.isLight && light.castShadow) {
        shadowLights.push(light);
      }
    });
    expect(shadowLights).toHaveLength(1);
    expect(shadowLights[0]?.name).toBe('LIGHT_Bathroom_Ceiling');

    const ambient = room.getVisualRoot().getObjectByName(
      'LIGHT_Bathroom_Bounce',
    ) as THREE.AmbientLight | undefined;
    const hemisphere = room.getVisualRoot().getObjectByName(
      'LIGHT_Bathroom_Ambient',
    ) as THREE.HemisphereLight | undefined;
    const roomFill = room.getVisualRoot().getObjectByName(
      'LIGHT_Bathroom_RoomFill',
    ) as THREE.PointLight | undefined;
    const upperWall = room.getVisualRoot().getObjectByName(
      'WALL_North',
    ) as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> | undefined;
    expect(ambient?.intensity).toBeGreaterThanOrEqual(0.65);
    expect(hemisphere?.intensity).toBeGreaterThanOrEqual(1.1);
    expect(roomFill?.intensity).toBeGreaterThanOrEqual(1);
    expect(upperWall?.material.color.getHex()).toBe(0x687a7d);

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
    room.unmount();
  });

  it('loads all 17 props from one collection and exposes rich anomalies', async () => {
    const load = vi.fn(() => Promise.resolve(createCollectionSource()));
    const manager = new AssetManager({ load });

    await room.loadAssets(manager);
    await room.loadAssets(manager);

    expect(load).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledWith(BATHROOM_ASSET_CATALOG.collection.url);
    expect(room.isAssetsLoaded()).toBe(true);
    expect(room.getLoadedAssetIds()).toEqual([
      BATHROOM_ASSET_CATALOG.collection.id,
    ]);
    expect(room.getAnomalyTargets()).toHaveLength(17);
    expect(new Set(room.getAnomalyTargets().map((target) => target.id)).size).toBe(17);

    for (const target of room.getAnomalyTargets()) {
      expect(target.object.parent).not.toBeNull();
      expect(target.interactionVolume.parent).toBe(target.object);
      expect(
        target.interactionVolume.layers.isEnabled(RENDER_LAYERS.interaction),
      ).toBe(true);
      expect(target.variants.filter((variant) => variant.kind === 'color')).toHaveLength(2);
      expect(target.variants.some((variant) => variant.kind === 'hide')).toBe(true);
      expect(target.variants.some((variant) => variant.kind === 'show')).toBe(true);
      target.object.traverse((object) => {
        const mesh = object as THREE.Mesh;

        if (mesh.isMesh && mesh.layers.isEnabled(RENDER_LAYERS.scene)) {
          expect(mesh.castShadow).toBe(true);
          expect(mesh.receiveShadow).toBe(true);
        }
      });
    }

    expect(
      room.getAnomalyTargetRegistry().getById('vanity')?.dependentTargetIds,
    ).toEqual(['plant', 'soap-dish', 'toothbrush-cup']);
    expect(
      room.getAnomalyTargetRegistry().getById('bathtub')?.dependentTargetIds,
    ).toEqual(['rubber-duck']);
    expect(
      room.getAnomalyTargetRegistry().getById('wall-shelf')?.dependentTargetIds,
    ).toEqual(['candle', 'towels-stacked']);

    const expectedPlacements = new Map<string, readonly [number, number, number]>([
      ['vanity', [0.45, 0, -2.7]],
      ['toilet', [2.25, 0, -0.72]],
      ['plant', [-0.1, 0.5, -2.4]],
      ['soap-dish', [1, 0.915, -2.95]],
      ['toothbrush-cup', [0.95, 0.5, -2.3]],
      ['rubber-duck', [-2.05, 0.5, -0.72]],
      ['candle', [-2.65, 1.54, 1.04]],
      ['towels-stacked', [-2.65, 1.54, 1.7]],
    ]);

    for (const [targetId, expectedPosition] of expectedPlacements) {
      expect(
        room.getAnomalyTargetRegistry().getById(targetId)?.object.position.toArray(),
        targetId,
      ).toEqual(expectedPosition);
    }

    expect(
      room
        .getAnomalyTargetRegistry()
        .getById('slippers')
        ?.object.quaternion.toArray(),
    ).toEqual([0, 0.9990482215818578, 0, 0.04361938736533601]);

    for (const targetId of ['vanity', 'toilet'] as const) {
      const target = room.getAnomalyTargetRegistry().getById(targetId);
      const model = target?.object.getObjectByName(
        `${target?.object.name}_GLB`,
      );

      if (target === null || target === undefined || model === undefined) {
        throw new Error(`Expected grounded bathroom target ${targetId}.`);
      }

      const bounds = new THREE.Box3().setFromObject(model);
      expect(bounds.min.y).toBeCloseTo(target.object.position.y);
    }

    expect(
      room
        .getAnomalyTargetRegistry()
        .getById('bin')
        ?.variants.some((variant) => variant.kind === 'rotate'),
    ).toBe(false);

    for (const targetId of ['towel', 'towels-stacked']) {
      expect(
        room
          .getAnomalyTargetRegistry()
          .getById(targetId)
          ?.variants.some((variant) => variant.kind === 'rotate'),
        targetId,
      ).toBe(false);
    }

    room.unmount();
    expect(manager.getCachedAssetCount()).toBe(0);
    expect(room.getAnomalyTargets()).toHaveLength(0);
  });

  it('keeps supported props coherent when furniture disappears', async () => {
    const manager = new AssetManager({
      load: vi.fn(() => Promise.resolve(createCollectionSource())),
    });
    await room.loadAssets(manager);
    const system = new RoomAnomalySystem(room.getAnomalyTargetRegistry());
    const vanity = room.getAnomalyTargetRegistry().getById('vanity');
    const plant = room.getAnomalyTargetRegistry().getById('plant');
    const hide = vanity?.variants.find((variant) => variant.kind === 'hide');

    if (vanity === null || plant === null || hide === undefined) {
      throw new Error('Expected the vanity support group.');
    }

    system.applyPlan(createPlan(vanity.id, hide));
    expectVisibleSceneMeshes(vanity, false);
    expectVisibleSceneMeshes(plant, false);
    expect(plant.interactionVolume.visible).toBe(false);
    system.restore();
    expectVisibleSceneMeshes(vanity, true);
    expectVisibleSceneMeshes(plant, true);
    room.unmount();
  });

  it('releases a collection that finishes loading after an unmount', async () => {
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
    resolveLoad?.(createCollectionSource());

    await expect(loading).rejects.toThrow(
      'The bathroom changed while its assets were loading.',
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
    roomId: 'bathroom',
    roomIndex: 1,
    difficulty: 1,
    anomalies: [{ targetId, kind: variant.kind, variantId: variant.id }],
  };
}

function expectVisibleSceneMeshes(
  target: AnomalyTarget,
  visible: boolean,
): void {
  const meshes = target.initialState.nodes.filter(
    ({ node }) => (node as THREE.Mesh).isMesh,
  );
  expect(meshes.length).toBeGreaterThan(0);
  expect(meshes.every(({ node }) => node.visible === visible)).toBe(true);
}
