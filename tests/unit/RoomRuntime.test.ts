import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { RoomDefinition } from '../../src/world/RoomDefinition';
import { RoomRuntime } from '../../src/world/RoomRuntime';
import { WorldCollision } from '../../src/world/WorldCollision';

class TestRoom extends RoomRuntime {
  public readonly definition = {
    id: 'test-room',
    displayName: 'Test Room',
    observationDurationMs: 15_000,
    searchDurationMs: 30_000,
    anomalyCount: { min: 1, max: 1 },
    playerSpawn: {
      position: [1, 0, 2],
      yaw: 0.5,
      pitch: -0.1,
    },
  } as const satisfies RoomDefinition;

  public lastVisualGeometry: THREE.BoxGeometry | null = null;
  public lastTexture: THREE.Texture | null = null;

  public constructor() {
    super('ROOM_Test_VisualRoot', 'COLLIDER_Test_Root');
  }

  protected buildRoom(): void {
    const visualGeometry = this.ownGeometry(new THREE.BoxGeometry(1, 1, 1));
    const collisionGeometry = this.ownGeometry(
      new THREE.BoxGeometry(2, 0.2, 2),
    );
    const material = this.ownMaterial(new THREE.MeshBasicMaterial());
    const texture = this.ownTexture(new THREE.Texture());
    material.map = texture;
    const visual = new THREE.Mesh(visualGeometry, material);
    const collision = new THREE.Mesh(collisionGeometry, material);
    collision.position.y = -0.1;
    this.getVisualRoot().add(visual);
    this.getCollisionRoot().add(collision);
    this.lastVisualGeometry = visualGeometry;
    this.lastTexture = texture;
  }

  protected override onRoomReleased(): void {
    this.lastVisualGeometry = null;
    this.lastTexture = null;
  }
}

describe('RoomRuntime', () => {
  it('adds both roots to the scene and builds the collision world', () => {
    const room = new TestRoom();
    const scene = new THREE.Scene();
    const world = new WorldCollision();

    room.mount({ scene, worldCollision: world });

    expect(scene.children).toContain(room.getVisualRoot());
    expect(scene.children).toContain(room.getCollisionRoot());
    expect(world.isReady()).toBe(true);
    expect(world.getSourceRoot()).toBe(room.getCollisionRoot());
    expect(room.isMounted()).toBe(true);
    room.unmount();
  });

  it('adds shared sky and bounce lighting inside the controllable room root', () => {
    const room = new TestRoom();
    room.mount({
      scene: new THREE.Scene(),
      worldCollision: new WorldCollision(),
    });

    const skyFill = room
      .getVisualRoot()
      .getObjectByName('LIGHT_GlobalSkyFill') as
        | THREE.HemisphereLight
        | undefined;
    const bounce = room
      .getVisualRoot()
      .getObjectByName('LIGHT_GlobalBounce') as
        | THREE.AmbientLight
        | undefined;

    expect(skyFill).toBeInstanceOf(THREE.HemisphereLight);
    expect(skyFill?.intensity).toBeCloseTo(0.09);
    expect(bounce).toBeInstanceOf(THREE.AmbientLight);
    expect(bounce?.intensity).toBeCloseTo(0.03);
    room.unmount();
  });

  it('exposes a fresh player spawn in the player controller format', () => {
    const room = new TestRoom();

    expect(room.getPlayerSpawn()).toEqual({
      x: 1,
      y: 0,
      z: 2,
      yaw: 0.5,
      pitch: -0.1,
    });
    expect(room.getPlayerSpawn()).not.toBe(room.getPlayerSpawn());
  });

  it('rejects a second simultaneous mount explicitly', () => {
    const room = new TestRoom();
    const scene = new THREE.Scene();
    const world = new WorldCollision();
    room.mount({ scene, worldCollision: world });

    expect(() => room.mount({ scene, worldCollision: world })).toThrow(
      'Room "test-room" is already mounted.',
    );
    room.unmount();
  });

  it('transfers a built room between staging and gameplay without rebuilding it', () => {
    const room = new TestRoom();
    const stagingScene = new THREE.Scene();
    const stagingWorld = new WorldCollision();
    const gameplayScene = new THREE.Scene();
    const gameplayWorld = new WorldCollision();
    room.mount({
      scene: stagingScene,
      worldCollision: stagingWorld,
    });
    const geometry = room.lastVisualGeometry;

    room.transferMount({
      scene: gameplayScene,
      worldCollision: gameplayWorld,
    });

    expect(room.lastVisualGeometry).toBe(geometry);
    expect(stagingScene.children).not.toContain(room.getVisualRoot());
    expect(stagingWorld.isReady()).toBe(false);
    expect(gameplayScene.children).toContain(room.getVisualRoot());
    expect(gameplayScene.children).toContain(room.getCollisionRoot());
    expect(gameplayWorld.getSourceRoot()).toBe(room.getCollisionRoot());
    expect(room.isMounted()).toBe(true);
    room.unmount();
  });

  it('rejects transferring a room that has not been mounted', () => {
    const room = new TestRoom();

    expect(() =>
      room.transferMount({
        scene: new THREE.Scene(),
        worldCollision: new WorldCollision(),
      }),
    ).toThrow('must be mounted before it can be transferred');
  });

  it('removes roots, clears collision state, and disposes owned resources', () => {
    const room = new TestRoom();
    const scene = new THREE.Scene();
    const world = new WorldCollision();
    room.mount({ scene, worldCollision: world });
    const geometry = room.lastVisualGeometry;
    const texture = room.lastTexture;

    if (geometry === null || texture === null) {
      throw new Error('Expected the test room to create owned resources.');
    }

    const dispose = vi.spyOn(geometry, 'dispose');
    const disposeTexture = vi.spyOn(texture, 'dispose');
    room.unmount();

    expect(dispose).toHaveBeenCalledOnce();
    expect(disposeTexture).toHaveBeenCalledOnce();
    expect(scene.children).not.toContain(room.getVisualRoot());
    expect(scene.children).not.toContain(room.getCollisionRoot());
    expect(room.getVisualRoot().children).toHaveLength(0);
    expect(room.getCollisionRoot().children).toHaveLength(0);
    expect(world.isReady()).toBe(false);
    expect(world.getSourceRoot()).toBeNull();
    expect(room.isMounted()).toBe(false);
  });

  it('can rebuild fresh contents after being unmounted', () => {
    const room = new TestRoom();
    const scene = new THREE.Scene();
    const world = new WorldCollision();
    room.mount({ scene, worldCollision: world });
    const firstGeometry = room.lastVisualGeometry;
    room.unmount();

    room.mount({ scene, worldCollision: world });

    expect(room.lastVisualGeometry).not.toBeNull();
    expect(room.lastVisualGeometry).not.toBe(firstGeometry);
    expect(world.isReady()).toBe(true);
    room.unmount();
  });

  it('allows repeated unmount calls without retaining state', () => {
    const room = new TestRoom();
    room.unmount();
    room.unmount();

    expect(room.isMounted()).toBe(false);
    expect(room.getVisualRoot().children).toHaveLength(0);
  });
});
