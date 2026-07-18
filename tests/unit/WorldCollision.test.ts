import * as THREE from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import { describe, expect, it } from 'vitest';
import { WorldCollision } from '../../src/world/WorldCollision';

interface BoxDefinition {
  readonly size: readonly [number, number, number];
  readonly position: readonly [number, number, number];
}

function createRoot(...boxes: BoxDefinition[]): THREE.Group {
  const root = new THREE.Group();

  for (const box of boxes) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...box.size),
      new THREE.MeshBasicMaterial(),
    );
    mesh.position.fromArray(box.position);
    root.add(mesh);
  }

  return root;
}

function createCapsule(x: number, baseY: number, z: number): Capsule {
  return new Capsule(
    new THREE.Vector3(x, baseY + 0.3, z),
    new THREE.Vector3(x, baseY + 1.45, z),
    0.3,
  );
}

describe('WorldCollision', () => {
  it('builds an Octree from a simple group', () => {
    const world = new WorldCollision();
    const root = createRoot({ size: [2, 0.2, 2], position: [0, -0.1, 0] });

    world.buildFromObject(root);

    expect(world.isReady()).toBe(true);
    expect(world.getSourceRoot()).toBe(root);
    expect(world.getTriangleCount()).toBe(12);
  });

  it('detects a capsule intersecting a floor', () => {
    const world = new WorldCollision();
    world.buildFromObject(
      createRoot({ size: [4, 0.2, 4], position: [0, -0.1, 0] }),
    );

    const collision = world.intersectCapsule(createCapsule(0, -0.05, 0));

    expect(collision).not.toBeNull();
    expect(collision?.normal.y).toBeGreaterThan(0.9);
    expect(collision?.depth).toBeGreaterThan(0);
  });

  it('detects a capsule intersecting a wall', () => {
    const world = new WorldCollision();
    world.buildFromObject(
      createRoot({ size: [0.2, 3, 4], position: [0, 1.5, 0] }),
    );

    const collision = world.intersectCapsule(createCapsule(0.2, 0, 0));

    expect(collision).not.toBeNull();
    expect(collision?.normal.x).toBeGreaterThan(0.9);
  });

  it('does not report collisions at a distance', () => {
    const world = new WorldCollision();
    world.buildFromObject(
      createRoot({ size: [2, 0.2, 2], position: [0, -0.1, 0] }),
    );

    expect(world.intersectCapsule(createCapsule(10, 2, 10))).toBeNull();
  });

  it('does not report exact zero-depth contact as penetration', () => {
    const world = new WorldCollision();
    world.buildFromObject(
      createRoot(
        { size: [4, 0.2, 4], position: [0, -0.1, 0] },
        { size: [0.2, 3, 4], position: [0, 1.5, 0] },
      ),
    );

    expect(world.intersectCapsule(createCapsule(0.4, 0, 0))).toBeNull();
  });

  it('clears its Octree and source references', () => {
    const world = new WorldCollision();
    world.buildFromObject(
      createRoot({ size: [2, 0.2, 2], position: [0, -0.1, 0] }),
    );

    world.clear();

    expect(world.isReady()).toBe(false);
    expect(world.getSourceRoot()).toBeNull();
    expect(world.getTriangleCount()).toBe(0);
    expect(world.intersectCapsule(createCapsule(0, -0.05, 0))).toBeNull();
  });

  it('rebuilds without retaining triangles from the previous world', () => {
    const world = new WorldCollision();
    world.buildFromObject(
      createRoot({ size: [0.2, 3, 4], position: [0, 1.5, 0] }),
    );
    expect(world.intersectCapsule(createCapsule(0.2, 0, 0))).not.toBeNull();

    const replacement = createRoot({
      size: [0.2, 3, 4],
      position: [10, 1.5, 0],
    });
    world.buildFromObject(replacement);

    expect(world.getSourceRoot()).toBe(replacement);
    expect(world.getTriangleCount()).toBe(12);
    expect(world.intersectCapsule(createCapsule(0.2, 0, 0))).toBeNull();
    expect(world.intersectCapsule(createCapsule(10.2, 0, 0))).not.toBeNull();
  });
});
