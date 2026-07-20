import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { RoomAnomalySystem } from '../../src/gameplay/anomalies/RoomAnomalySystem';
import { AssetManager } from '../../src/world/assets/AssetManager';
import { GreyboxEntranceCorridor } from '../../src/world/rooms/GreyboxEntranceCorridor';
import { GreyboxMainHall } from '../../src/world/rooms/GreyboxMainHall';
import type { PlayableRoom } from '../../src/world/rooms/PlayableRoom';
import { WorldCollision } from '../../src/world/WorldCollision';

describe('final route rooms', () => {
  it('builds the entrance corridor with its false exit and corridor rotations', () => {
    const room = mount(new GreyboxEntranceCorridor());

    expect(room.definition).toMatchObject({
      id: 'entrance-corridor',
      anomalyCount: { min: 3, max: 3 },
    });
    expect(room.getVisualRoot().getObjectByName('ANOM_EntranceCorridor_FalseFrontDoor')).toBeDefined();
    expect(room.getExitThresholdDefinition()).toMatchObject({ crossing: 'positive-x' });
    expect(room.getAnomalyTargets().some((target) =>
      target.variants.some((variant) => variant.kind === 'rotate'),
    )).toBe(true);
    expectGeneratedAnomalies(room, 8, 3);
    room.unmount();
  });

  it('builds the main archive hall with protected physical ending choices', () => {
    const room = mount(new GreyboxMainHall());
    const choices = ['choice-escape', 'choice-remember', 'choice-replaced'];

    expect(room.definition).toMatchObject({
      id: 'main-hall',
      anomalyCount: { min: 3, max: 4 },
    });
    expect(room.getExitThresholdDefinition()).toMatchObject({ crossing: 'negative-z' });
    for (const id of choices) {
      expect(room.getAnomalyTargetRegistry().getById(id)?.variants).toEqual([]);
    }
    expect(room.getAnomalyTargets().every((target) =>
      target.variants.every((variant) => variant.kind !== 'rotate'),
    )).toBe(true);
    expectGeneratedAnomalies(room, 9, 4);
    room.unmount();
  });

  it('installs and releases the reusable 3D door models in both rooms', async () => {
    const load = vi.fn(() => Promise.resolve(createDoorSource()));
    const manager = new AssetManager({ load });

    for (const room of [
      mount(new GreyboxEntranceCorridor()),
      mount(new GreyboxMainHall()),
    ]) {
      await room.loadAssets(manager);
      await room.loadAssets(manager);
      expect(room.getExitDoor()?.getObjectByName(
        `DOOR_${room.definition.id === 'main-hall' ? 'MainHall' : 'EntranceCorridor'}_Exit`,
      )?.userData['assetId']).toBe('house-shell/interior-door');
      room.unmount();
    }

    expect(load).toHaveBeenCalledTimes(2);
    expect(manager.getCachedAssetCount()).toBe(0);
  });
});

function mount<T extends PlayableRoom>(room: T): T {
  room.mount({ scene: new THREE.Scene(), worldCollision: new WorldCollision() });
  return room;
}

function expectGeneratedAnomalies(
  room: PlayableRoom,
  roomIndex: number,
  count: number,
): void {
  const system = new RoomAnomalySystem(room.getAnomalyTargetRegistry());
  system.prepareRunBaseline({ runSeed: 304, roomIndex, roomId: room.definition.id });
  const plan = system.generatePlan({
    runSeed: 304,
    roomIndex,
    roomId: room.definition.id,
    difficulty: 6,
    count,
  });
  expect(plan.anomalies).toHaveLength(count);
  system.applyPlan(plan);
  system.restore();
}

function createDoorSource(): THREE.Group {
  const root = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 2, 0.12),
    new THREE.MeshStandardMaterial({ color: '#604638' }),
  );
  mesh.position.y = 1;
  root.add(mesh);
  return root;
}
