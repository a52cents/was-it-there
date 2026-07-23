import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { InputManager } from '../../src/input/InputManager';
import { PLAYER_CONFIG } from '../../src/player/PlayerConfig';
import { PlayerCollider } from '../../src/player/PlayerCollider';
import { PlayerController } from '../../src/player/PlayerController';
import { GreyboxBedroom } from '../../src/world/rooms/GreyboxBedroom';
import { GREYBOX_EXIT_THRESHOLD } from '../../src/world/rooms/GreyboxBedroom';
import { WorldCollision } from '../../src/world/WorldCollision';

describe('GreyboxBedroom player integration', () => {
  it('keeps a straight path from the room spawn free of lateral drift', () => {
    const scene = new THREE.Scene();
    const world = new WorldCollision();
    const room = new GreyboxBedroom();
    room.mount({ scene, worldCollision: world });
    const input = new InputManager();
    const controller = new PlayerController(
      new THREE.PerspectiveCamera(),
      input,
      () => true,
      world,
      room.getPlayerSpawn(),
    );
    const spawnX = controller.getPosition().x;
    input.setActionPressed('move-forward', true);

    for (let step = 0; step < 72; step += 1) {
      controller.fixedUpdate(1 / 60);
    }

    expect(controller.getPosition().x).toBeCloseTo(spawnX, 5);
    expect(controller.getPosition().z).toBeLessThan(
      room.getPlayerSpawn().z,
    );
    room.unmount();
  });

  it('resets capsule, velocity, orientation, and camera to the room spawn', () => {
    const scene = new THREE.Scene();
    const world = new WorldCollision();
    const room = new GreyboxBedroom();
    room.mount({ scene, worldCollision: world });
    const camera = new THREE.PerspectiveCamera();
    const input = new InputManager();
    const controller = new PlayerController(
      camera,
      input,
      () => true,
      world,
      room.getPlayerSpawn(),
    );
    input.setActionPressed('move-forward', true);
    controller.update(0.1);

    for (let reset = 0; reset < 5; reset += 1) {
      controller.reset(room.getPlayerSpawn());
    }

    const spawn = room.getPlayerSpawn();
    const capsule = controller.getCapsule();
    expect(controller.getPosition().toArray()).toEqual([spawn.x, spawn.y, spawn.z]);
    expect(controller.getCurrentSpeed()).toBe(0);
    expect(controller.getVerticalVelocity()).toBe(0);
    expect(controller.getYaw()).toBe(spawn.yaw);
    expect(controller.getPitch()).toBe(spawn.pitch);
    expect(capsule.start.x).toBe(spawn.x);
    expect(capsule.start.y).toBeCloseTo(spawn.y + PLAYER_CONFIG.capsuleRadius);
    expect(capsule.start.z).toBe(spawn.z);
    expect(camera.position.toArray()).toEqual([
      spawn.x,
      spawn.y + PLAYER_CONFIG.eyeHeight,
      spawn.z,
    ]);
    expect(camera.position.toArray().every(Number.isFinite)).toBe(true);
    room.unmount();
  });

  it('keeps the main route to the exit traversable and both doors blocking', () => {
    const scene = new THREE.Scene();
    const world = new WorldCollision();
    const room = new GreyboxBedroom();
    room.mount({ scene, worldCollision: world });
    const collider = new PlayerCollider(room.getPlayerSpawn());

    const moveTo = (targetX: number, targetZ: number): void => {
      const target = new THREE.Vector2(targetX, targetZ);
      const direction = new THREE.Vector2();

      for (let step = 0; step < 400; step += 1) {
        direction.set(
          target.x - collider.getPosition().x,
          target.y - collider.getPosition().z,
        );
        const distance = direction.length();

        if (distance < 0.01) {
          break;
        }

        direction.multiplyScalar(Math.min(0.04, distance) / distance);
        collider.applyGravity(1 / 60);
        collider.move(
          new THREE.Vector3(direction.x, 0, direction.y),
          1 / 60,
          world,
        );
      }

      expect(
        Math.hypot(
          collider.getPosition().x - targetX,
          collider.getPosition().z - targetZ,
        ),
      ).toBeLessThan(0.02);
    };

    moveTo(-1.7, 0);
    moveTo(2, 0);
    moveTo(2, -1.75);
    moveTo(2.8, -1.75);

    for (let step = 0; step < 20; step += 1) {
      collider.applyGravity(1 / 60);
      collider.move(new THREE.Vector3(0.04, 0, 0), 1 / 60, world);
    }

    expect(collider.getPosition().x).toBeLessThanOrEqual(2.871);
    expect(collider.didCollide()).toBe(true);
    expect(collider.getPosition().toArray().every(Number.isFinite)).toBe(true);

    collider.reset(room.getPlayerSpawn());
    for (let step = 0; step < 30; step += 1) {
      collider.applyGravity(1 / 60);
      collider.move(new THREE.Vector3(0, 0, 0.04), 1 / 60, world);
    }

    expect(collider.getPosition().z).toBeLessThanOrEqual(3.371);
    expect(collider.didCollide()).toBe(true);
    room.unmount();
  });

  it('lets the player cross the exit only after its collider is disabled', () => {
    const scene = new THREE.Scene();
    const world = new WorldCollision();
    const room = new GreyboxBedroom();
    room.mount({ scene, worldCollision: world });
    const collider = new PlayerCollider({ x: 2.8, y: 0, z: -1.75 });

    for (let step = 0; step < 25; step += 1) {
      collider.applyGravity(1 / 60);
      collider.move(new THREE.Vector3(0.04, 0, 0), 1 / 60, world);
    }

    expect(collider.getPosition().x).toBeLessThan(3);
    const closedCollisionCount = room.getCollisionObjectCount();

    room.setExitDoorCollisionEnabled(false);

    expect(room.isExitDoorCollisionEnabled()).toBe(false);
    expect(room.getCollisionObjectCount()).toBe(closedCollisionCount - 1);

    for (let step = 0; step < 30; step += 1) {
      collider.applyGravity(1 / 60);
      collider.move(new THREE.Vector3(0.04, 0, 0), 1 / 60, world);
    }

    expect(collider.getPosition().x).toBeGreaterThanOrEqual(
      GREYBOX_EXIT_THRESHOLD.x,
    );

    room.setExitDoorCollisionEnabled(true);
    expect(room.isExitDoorCollisionEnabled()).toBe(true);
    expect(room.getCollisionObjectCount()).toBe(closedCollisionCount);
    room.unmount();
  });

  it('can detach the door collider without rebuilding the active octree', () => {
    const scene = new THREE.Scene();
    const world = new WorldCollision();
    const room = new GreyboxBedroom();
    room.mount({ scene, worldCollision: world });
    const closedTriangleCount = world.getTriangleCount();

    room.setExitDoorCollisionEnabled(false, false);

    expect(room.isExitDoorCollisionEnabled()).toBe(false);
    expect(world.getTriangleCount()).toBe(closedTriangleCount);
    expect(world.getSourceRoot()).toBe(room.getCollisionRoot());

    room.setExitDoorCollisionEnabled(true, false);
    room.unmount();
  });
});
