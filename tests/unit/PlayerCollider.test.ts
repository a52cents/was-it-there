import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { PlayerCollider } from '../../src/player/PlayerCollider';
import { PLAYER_CONFIG } from '../../src/player/PlayerConfig';
import { WorldCollision } from '../../src/world/WorldCollision';

interface BoxDefinition {
  readonly size: readonly [number, number, number];
  readonly position: readonly [number, number, number];
}

const SPAWN = { x: 0, y: 0, z: 0 } as const;
const ZERO_DISPLACEMENT = new THREE.Vector3();

function createWorld(...boxes: BoxDefinition[]): WorldCollision {
  const world = new WorldCollision();
  const root = new THREE.Group();

  for (const box of boxes) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...box.size));
    mesh.position.fromArray(box.position);
    root.add(mesh);
  }

  world.buildFromObject(root);
  return world;
}

function createFloorWorld(): WorldCollision {
  return createWorld({ size: [10, 0.2, 10], position: [0, -0.1, 0] });
}

function expectFiniteVector(vector: Readonly<THREE.Vector3>): void {
  expect(Number.isFinite(vector.x)).toBe(true);
  expect(Number.isFinite(vector.y)).toBe(true);
  expect(Number.isFinite(vector.z)).toBe(true);
}

describe('PlayerCollider', () => {
  it('creates a capsule with the configured total dimensions', () => {
    const collider = new PlayerCollider(SPAWN);
    const capsule = collider.getCapsule();

    expect(capsule.radius).toBe(PLAYER_CONFIG.capsuleRadius);
    expect(capsule.start.y).toBeCloseTo(PLAYER_CONFIG.capsuleRadius);
    expect(capsule.end.y).toBeCloseTo(
      PLAYER_CONFIG.capsuleHeight - PLAYER_CONFIG.capsuleRadius,
    );
    expect(
      capsule.end.y - capsule.start.y + capsule.radius * 2,
    ).toBeCloseTo(PLAYER_CONFIG.capsuleHeight);
  });

  it('resets the capsule and vertical velocity to a spawn', () => {
    const collider = new PlayerCollider(SPAWN);
    collider.applyGravity(0.1);

    collider.reset({ x: 2, y: 0.5, z: -3 });

    expect(collider.getPosition().toArray()).toEqual([2, 0.5, -3]);
    expect(collider.getVerticalVelocity()).toBe(0);
    expect(collider.isGrounded()).toBe(false);
  });

  it('moves freely when no obstacle is present', () => {
    const collider = new PlayerCollider(SPAWN);
    const world = new WorldCollision();

    collider.move(new THREE.Vector3(0.5, 0, -0.75), 1 / 60, world);

    expect(collider.getPosition().x).toBeCloseTo(0.5);
    expect(collider.getPosition().z).toBeCloseTo(-0.75);
  });

  it('stops before crossing a wall', () => {
    const collider = new PlayerCollider(SPAWN);
    const world = createWorld({
      size: [0.2, 3, 4],
      position: [1, 1.5, 0],
    });

    const result = collider.move(
      new THREE.Vector3(0.8, 0, 0),
      1 / 60,
      world,
    );

    expect(result.collided).toBe(true);
    expect(collider.getPosition().x).toBeLessThanOrEqual(0.601);
  });

  it('corrects an existing penetration', () => {
    const collider = new PlayerCollider({ x: 0.75, y: 0, z: 0 });
    const world = createWorld({
      size: [0.2, 3, 4],
      position: [1, 1.5, 0],
    });

    collider.move(ZERO_DISPLACEMENT, 1 / 60, world);

    expect(collider.getPosition().x).toBeCloseTo(0.6, 5);
  });

  it('preserves parallel displacement while sliding along a wall', () => {
    const collider = new PlayerCollider(SPAWN);
    const world = createWorld({
      size: [0.2, 3, 8],
      position: [1, 1.5, 0],
    });

    collider.move(new THREE.Vector3(0.8, 0, -1), 1 / 60, world);

    expect(collider.getPosition().x).toBeLessThanOrEqual(0.601);
    expect(collider.getPosition().z).toBeCloseTo(-1, 5);
  });

  it('remains stable in a two-wall corner', () => {
    const collider = new PlayerCollider(SPAWN);
    const world = createWorld(
      { size: [0.2, 3, 4], position: [1, 1.5, 0] },
      { size: [4, 3, 0.2], position: [0, 1.5, -1] },
    );

    for (let step = 0; step < 20; step += 1) {
      collider.move(new THREE.Vector3(0.1, 0, -0.1), 1 / 60, world);
    }

    expect(collider.getPosition().x).toBeLessThanOrEqual(0.601);
    expect(collider.getPosition().z).toBeGreaterThanOrEqual(-0.601);
    expectFiniteVector(collider.getPosition());
  });

  it('detects walkable ground from its upward normal', () => {
    const collider = new PlayerCollider(SPAWN);
    const world = createFloorWorld();

    collider.applyGravity(1 / 60);
    const result = collider.move(ZERO_DISPLACEMENT, 1 / 60, world);

    expect(result.grounded).toBe(true);
    expect(collider.isGrounded()).toBe(true);
  });

  it('does not classify a wall as ground', () => {
    const collider = new PlayerCollider(SPAWN);
    const world = createWorld({
      size: [0.2, 3, 4],
      position: [1, 1.5, 0],
    });

    collider.move(new THREE.Vector3(0.8, 0, 0), 1 / 60, world);

    expect(collider.didCollide()).toBe(true);
    expect(collider.isGrounded()).toBe(false);
  });

  it('is pushed below a ceiling without becoming grounded', () => {
    const collider = new PlayerCollider({ x: 0, y: 0.4, z: 0 });
    const world = createWorld({
      size: [4, 0.2, 4],
      position: [0, 2.1, 0],
    });

    collider.move(ZERO_DISPLACEMENT, 1 / 60, world);

    const capsule = collider.getCapsule();
    expect(capsule.end.y + capsule.radius).toBeLessThanOrEqual(2.001);
    expect(collider.isGrounded()).toBe(false);
  });

  it('cancels downward velocity when the floor is reached', () => {
    const collider = new PlayerCollider(SPAWN);
    const world = createFloorWorld();
    collider.applyGravity(1 / 60);
    expect(collider.getVerticalVelocity()).toBeLessThan(0);

    collider.move(ZERO_DISPLACEMENT, 1 / 60, world);

    expect(collider.getVerticalVelocity()).toBe(0);
  });

  it('applies gravity while airborne', () => {
    const collider = new PlayerCollider({ x: 0, y: 5, z: 0 });

    collider.applyGravity(1 / 60);

    expect(collider.getVerticalVelocity()).toBeCloseTo(
      -PLAYER_CONFIG.gravity / 60,
    );
  });

  it('limits maximum falling speed', () => {
    const collider = new PlayerCollider({ x: 0, y: 100, z: 0 });

    for (let step = 0; step < 1_000; step += 1) {
      collider.applyGravity(1 / 60);
    }

    expect(collider.getVerticalVelocity()).toBe(
      -PLAYER_CONFIG.maximumFallSpeed,
    );
  });

  it('does not introduce NaN for invalid displacement data', () => {
    const collider = new PlayerCollider(SPAWN);
    const world = new WorldCollision();

    collider.move(
      new THREE.Vector3(Number.NaN, Number.POSITIVE_INFINITY, Number.NaN),
      1 / 60,
      world,
    );

    expectFiniteVector(collider.getPosition());
    expectFiniteVector(collider.getCapsule().start);
    expectFiniteVector(collider.getCapsule().end);
  });

  it('recovers at the spawn below the configured respawn height', () => {
    const config = { ...PLAYER_CONFIG, respawnHeight: -0.1 };
    const collider = new PlayerCollider(SPAWN, config);
    const world = new WorldCollision();
    collider.applyGravity(0.1);

    const result = collider.move(ZERO_DISPLACEMENT, 0.1, world);

    expect(result.respawned).toBe(true);
    expect(collider.getPosition().toArray()).toEqual([0, 0, 0]);
    expect(collider.getVerticalVelocity()).toBe(0);
  });
});
