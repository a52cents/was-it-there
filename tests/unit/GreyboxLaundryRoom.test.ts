import * as THREE from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LAUNDRY_ROOM_ASSET_CATALOG } from '../../src/content/rooms/LaundryRoomAssetCatalog';
import { RoomAnomalySystem } from '../../src/gameplay/anomalies/RoomAnomalySystem';
import { PLAYER_CONFIG } from '../../src/player/PlayerConfig';
import { RENDER_LAYERS } from '../../src/rendering/RenderLayers';
import { AssetManager } from '../../src/world/assets/AssetManager';
import {
  GreyboxLaundryRoom,
  LAUNDRY_ROOM_EXIT_THRESHOLD,
} from '../../src/world/rooms/GreyboxLaundryRoom';
import { WorldCollision } from '../../src/world/WorldCollision';

function createAssetSource(): THREE.Group {
  const root = new THREE.Group();
  const frame = new THREE.MeshStandardMaterial({ color: '#b8aa91' });
  frame.name = 'White';
  const glass = new THREE.MeshStandardMaterial({ color: '#83999f' });
  glass.name = 'Glass';
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.8), [frame, glass]);
  mesh.position.y = 0.5;
  root.add(mesh);
  return root;
}

describe('GreyboxLaundryRoom', () => {
  let room: GreyboxLaundryRoom;
  let world: WorldCollision;

  beforeEach(() => {
    room = new GreyboxLaundryRoom();
    world = new WorldCollision();
    room.mount({ scene: new THREE.Scene(), worldCollision: world });
  });

  it('builds a furnished utility room with visible story evidence', () => {
    expect(room.definition).toMatchObject({
      id: 'laundry-room',
      observationDurationMs: 11_000,
      searchDurationMs: 25_000,
      anomalyCount: { min: 2, max: 3 },
    });
    for (const name of [
      'ARCH_LaundryRoomFloor',
      'WINDOW_LaundryRoom_East',
      'DOOR_LaundryRoom_Entrance',
      'DOOR_LaundryRoom_Exit',
      'EXIT_LaundryRoom_Portal',
      'ANOM_LaundryRoom_DryingRack',
      'DETAIL_DryingRack_Tag_17',
      'ANOM_LaundryRoom_LaundryBasket',
      'ANOM_LaundryRoom_IroningBoard',
    ]) {
      expect(room.getVisualRoot().getObjectByName(name), name).toBeDefined();
    }
    expect(LAUNDRY_ROOM_EXIT_THRESHOLD.crossing).toBe('negative-z');
    expect(room.getExitDoor()).not.toBeNull();
    room.unmount();
  });

  it('keeps the spawn, center route, and opened exit clear', () => {
    expectCapsuleClear(-2.45, 2.8);
    expectCapsuleClear(0, 2.5);
    expectCapsuleClear(1.65, -2.8);
    room.setExitDoorCollisionEnabled(false);
    expectCapsuleClear(2.45, -3.25);
    room.unmount();
  });

  it('loads six props and generates three anomalies without rotations or furniture colors', async () => {
    const load = vi.fn(() => Promise.resolve(createAssetSource()));
    const manager = new AssetManager({ load });
    await room.loadAssets(manager);
    await room.loadAssets(manager);

    expect(new Set(room.getAnomalyTargets().map(({ id }) => id))).toEqual(
      new Set([
        ...Object.keys(LAUNDRY_ROOM_ASSET_CATALOG).map((key) => ({
          washingMachine: 'washing-machine',
          disposalBin: 'disposal-bin',
          utilityCabinet: 'utility-cabinet',
          storageShelf: 'storage-shelf',
          foldingBench: 'folding-bench',
          runnerRug: 'rubber-runner',
        })[key as keyof typeof LAUNDRY_ROOM_ASSET_CATALOG]),
        'drying-rack',
        'laundry-basket',
        'ironing-board',
      ]),
    );
    expect(room.getAnomalyTargets()).toHaveLength(9);
    for (const target of room.getAnomalyTargets()) {
      expect(target.interactionVolume.layers.isEnabled(RENDER_LAYERS.interaction)).toBe(true);
      expect(target.variants.some(({ kind }) => kind === 'rotate')).toBe(false);
      expect(target.variants.some(({ kind }) => kind === 'color')).toBe(false);
    }
    for (const id of ['washing-machine', 'drying-rack', 'disposal-bin']) {
      expect(room.getAnomalyTargetRegistry().getById(id)?.variants.some(
        ({ kind }) => kind === 'hide' || kind === 'show',
      )).toBe(false);
    }

    const system = new RoomAnomalySystem(room.getAnomalyTargetRegistry());
    system.prepareRunBaseline({ runSeed: 304, roomIndex: 7, roomId: 'laundry-room' });
    const plan = system.generatePlan({
      runSeed: 304,
      roomIndex: 7,
      roomId: 'laundry-room',
      difficulty: 4,
      count: 3,
    });
    expect(plan.anomalies).toHaveLength(3);
    system.applyPlan(plan);
    system.restore();

    room.unmount();
    expect(manager.getCachedAssetCount()).toBe(0);
  });

  function expectCapsuleClear(x: number, z: number): void {
    const capsule = new Capsule(
      new THREE.Vector3(x, PLAYER_CONFIG.capsuleRadius, z),
      new THREE.Vector3(x, PLAYER_CONFIG.capsuleHeight - PLAYER_CONFIG.capsuleRadius, z),
      PLAYER_CONFIG.capsuleRadius,
    );
    expect(world.intersectCapsule(capsule), `capsule at ${x}, ${z}`).toBeNull();
  }
});
