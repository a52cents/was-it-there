import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { InputManager } from '../../src/input/InputManager';
import { PLAYER_CONFIG } from '../../src/player/PlayerConfig';
import { PlayerController } from '../../src/player/PlayerController';
import { WorldCollision } from '../../src/world/WorldCollision';

interface ControllerHarness {
  readonly camera: THREE.PerspectiveCamera;
  readonly controller: PlayerController;
  readonly input: InputManager;
  setPointerLocked(locked: boolean): void;
}

function createWorld(withWall = false): WorldCollision {
  const world = new WorldCollision();
  const root = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 10));
  floor.position.y = -0.1;
  root.add(floor);

  if (withWall) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(10, 3, 0.2));
    wall.position.set(0, 1.5, 2);
    root.add(wall);
  }

  world.buildFromObject(root);
  return world;
}

function createHarness(world = createWorld()): ControllerHarness {
  const camera = new THREE.PerspectiveCamera();
  const input = new InputManager();
  let pointerLocked = true;
  const controller = new PlayerController(
    camera,
    input,
    () => pointerLocked,
    world,
  );

  return {
    camera,
    controller,
    input,
    setPointerLocked: (locked) => {
      pointerLocked = locked;
    },
  };
}

describe('PlayerController', () => {
  it('starts at the configured logical spawn position', () => {
    const { controller } = createHarness();

    expect(controller.getPosition().toArray()).toEqual([0, 0, 3]);
  });

  it('places the camera at eye height above the logical position', () => {
    const { camera, controller } = createHarness();

    expect(controller.getPosition().y).toBeCloseTo(0);
    expect(camera.position.y).toBeCloseTo(PLAYER_CONFIG.eyeHeight);
    expect(camera.position.x).toBe(controller.getPosition().x);
    expect(camera.position.z).toBe(controller.getPosition().z);
  });

  it('keeps capsule, logical position, and camera synchronized', () => {
    const { camera, controller, input } = createHarness();
    input.setActionPressed('move-right', true);

    controller.update(0.1);

    const capsule = controller.getCapsule();
    expect(capsule.start.x).toBeCloseTo(controller.getPosition().x);
    expect(capsule.start.y - capsule.radius).toBeCloseTo(
      controller.getPosition().y,
    );
    expect(camera.position.x).toBeCloseTo(controller.getPosition().x);
    expect(camera.position.y).toBeCloseTo(
      controller.getPosition().y + PLAYER_CONFIG.eyeHeight,
    );
  });

  it('updates logical position from movement', () => {
    const { controller, input } = createHarness();
    input.setActionPressed('move-forward', true);

    controller.update(0.1);

    expect(controller.getPosition().z).toBeLessThan(3);
    expect(controller.getPosition().y).toBeCloseTo(0);
  });

  it('applies yaw and pitch to the camera without roll', () => {
    const { camera, controller, input } = createHarness();
    input.addPointerDelta(100, -50);

    controller.update(0);

    expect(controller.getYaw()).toBeCloseTo(-0.2);
    expect(controller.getPitch()).toBeCloseTo(0.1);
    expect(camera.rotation.order).toBe('YXZ');
    expect(camera.rotation.y).toBeCloseTo(-0.2);
    expect(camera.rotation.x).toBeCloseTo(0.1);
    expect(camera.rotation.z).toBe(0);
  });

  it('keeps eye height constant while looking up and moving', () => {
    const { camera, controller, input } = createHarness();
    input.addPointerDelta(0, -500);
    input.setActionPressed('move-forward', true);

    controller.update(0.1);

    expect(controller.getPosition().y).toBeCloseTo(0);
    expect(camera.position.y).toBeCloseTo(PLAYER_CONFIG.eyeHeight);
  });

  it('fully resets position, velocity, orientation, and camera', () => {
    const { camera, controller, input } = createHarness();
    input.addPointerDelta(100, 80);
    input.setActionPressed('move-forward', true);
    input.setActionPressed('move-fast', true);
    controller.update(0.1);

    controller.reset();

    expect(controller.getPosition().toArray()).toEqual([0, 0, 3]);
    expect(controller.getCurrentSpeed()).toBe(0);
    expect(controller.getYaw()).toBe(0);
    expect(controller.getPitch()).toBe(0);
    expect(controller.isFastMovementActive()).toBe(false);
    expect(camera.position.toArray()).toEqual([0, PLAYER_CONFIG.eyeHeight, 3]);
    expect(camera.rotation.x).toBe(0);
    expect(camera.rotation.y).toBe(0);
    expect(camera.rotation.z).toBe(0);
  });

  it('resets to an explicit development spawn', () => {
    const { camera, controller } = createHarness();

    controller.reset({ x: 2, y: 0.25, z: -4, yaw: 0.5, pitch: -0.2 });

    expect(controller.getPosition().toArray()).toEqual([2, 0.25, -4]);
    expect(controller.getYaw()).toBeCloseTo(0.5);
    expect(controller.getPitch()).toBeCloseTo(-0.2);
    expect(camera.position.y).toBeCloseTo(0.25 + PLAYER_CONFIG.eyeHeight);
  });

  it('rebases position, view, and velocity into an adjacent room', () => {
    const { controller, input } = createHarness();
    controller.reset({ x: 3.4, y: 0, z: 1, yaw: -Math.PI / 2, pitch: 0.1 });
    input.setActionPressed('move-forward', true);
    controller.update(0.1);
    const worldPosition = controller.getPosition().clone();
    const worldVelocity = controller.getCurrentVelocity().clone();
    const roomPosition = new THREE.Vector3(3, 0, 1);
    const roomRotation = -Math.PI / 2;
    const roomMatrix = new THREE.Matrix4().compose(
      roomPosition,
      new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        roomRotation,
      ),
      new THREE.Vector3(1, 1, 1),
    );
    const expectedPosition = worldPosition
      .clone()
      .applyMatrix4(roomMatrix.clone().invert());
    const expectedVelocity = worldVelocity
      .clone()
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), -roomRotation);

    controller.rebaseToRoom(roomMatrix, roomRotation);

    expect(controller.getPosition().x).toBeCloseTo(expectedPosition.x);
    expect(controller.getPosition().z).toBeCloseTo(expectedPosition.z);
    expect(controller.getCurrentVelocity().x).toBeCloseTo(expectedVelocity.x);
    expect(controller.getCurrentVelocity().z).toBeCloseTo(expectedVelocity.z);
    expect(controller.getYaw()).toBeCloseTo(0);
    expect(controller.getPitch()).toBeCloseTo(0.1);
  });

  it('does not move or look while pointer lock is inactive', () => {
    const harness = createHarness();
    harness.setPointerLocked(false);
    harness.input.setActionPressed('move-forward', true);
    harness.input.addPointerDelta(100, -100);

    harness.controller.update(0.1);

    expect(harness.controller.getPosition().toArray()).toEqual([0, 0, 3]);
    expect(harness.controller.getYaw()).toBe(0);
    expect(harness.controller.getPitch()).toBe(0);
    expect(harness.controller.getCurrentSpeed()).toBe(0);
  });

  it('stops immediately when pointer lock is lost', () => {
    const harness = createHarness();
    harness.input.setActionPressed('move-forward', true);
    harness.controller.update(0.1);
    const positionBeforeUnlock = harness.controller.getPosition().clone();

    harness.setPointerLocked(false);
    harness.controller.update(0.1);

    expect(harness.controller.getPosition().toArray()).toEqual(
      positionBeforeUnlock.toArray(),
    );
    expect(harness.controller.getCurrentSpeed()).toBe(0);
  });

  it('resolves horizontal movement against the world collider', () => {
    const harness = createHarness(createWorld(true));
    harness.input.setActionPressed('move-forward', true);
    harness.input.setActionPressed('move-fast', true);

    for (let step = 0; step < 120; step += 1) {
      harness.controller.update(1 / 60);
    }

    // The wall's player-facing surface is z=2.1 and the capsule radius is
    // 0.3, so the logical center cannot move below z=2.4.
    expect(harness.controller.getPosition().z).toBeGreaterThanOrEqual(2.399);
    expect(harness.controller.didCollide()).toBe(true);
    expect(harness.camera.position.z).toBeCloseTo(
      harness.controller.getPosition().z,
    );
  });
});
