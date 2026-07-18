import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import {
  AssetManager,
  type GlbAssetLease,
} from '../../src/world/assets/AssetManager';
import type { RoomDefinition } from '../../src/world/RoomDefinition';
import {
  RoomPreloader,
  type PreloadableRoom,
} from '../../src/world/RoomPreloader';
import { RoomRuntime } from '../../src/world/RoomRuntime';
import { WorldCollision } from '../../src/world/WorldCollision';

class PreloadTestRoom
  extends RoomRuntime
  implements PreloadableRoom
{
  public readonly definition = {
    id: 'preload-test-room',
    displayName: 'Preload Test Room',
    observationDurationMs: 10_000,
    searchDurationMs: 30_000,
    anomalyCount: { min: 1, max: 1 },
    playerSpawn: {
      position: [0, 0, 0],
      yaw: 0,
      pitch: 0,
    },
  } as const satisfies RoomDefinition;

  public loadCalls = 0;

  public constructor(
    private readonly load: () => Promise<void> = () =>
      Promise.resolve(),
  ) {
    super('ROOM_PreloadTest_Visual', 'COLLIDER_PreloadTest');
  }

  public async loadAssets(_assetManager?: AssetManager): Promise<void> {
    this.loadCalls += 1;
    await this.load();
  }

  protected buildRoom(): void {
    const material = this.ownMaterial(new THREE.MeshBasicMaterial());
    this.getVisualRoot().add(
      new THREE.Mesh(
        this.ownGeometry(new THREE.BoxGeometry(1, 1, 1)),
        material,
      ),
    );
    this.getCollisionRoot().add(
      new THREE.Mesh(
        this.ownGeometry(new THREE.BoxGeometry(2, 0.2, 2)),
        material,
      ),
    );
  }
}

class LeasedPreloadTestRoom extends PreloadTestRoom {
  private lease: GlbAssetLease | null = null;

  public override async loadAssets(
    assetManager?: AssetManager,
  ): Promise<void> {
    if (assetManager === undefined) {
      throw new Error('Expected an AssetManager for the leased test room.');
    }

    this.loadCalls += 1;
    this.lease = await assetManager.acquire({
      id: 'preloaded-prop',
      url: '/preloaded-prop.glb',
    });
  }

  protected override onRoomReleased(): void {
    this.lease?.release();
    this.lease = null;
  }
}

describe('RoomPreloader', () => {
  it('loads off-scene and transfers the exact prepared room into gameplay', async () => {
    const rooms: PreloadTestRoom[] = [];
    const preloader = new RoomPreloader(
      {} as AssetManager,
      () => {
        const room = new PreloadTestRoom();
        rooms.push(room);
        return room;
      },
    );

    await expect(preloader.preloadRoom(1)).resolves.toBe(true);
    expect(preloader.getPendingRoomIndex()).toBe(1);
    expect(rooms).toHaveLength(1);
    expect(rooms[0]?.loadCalls).toBe(1);

    const scene = new THREE.Scene();
    const worldCollision = new WorldCollision();
    const room = await preloader.consume(1, { scene, worldCollision });

    expect(room).toBe(rooms[0]);
    expect(preloader.getPendingRoomIndex()).toBeNull();
    expect(scene.children).toContain(room?.getVisualRoot());
    expect(worldCollision.getSourceRoot()).toBe(
      room?.getCollisionRoot(),
    );
    room?.unmount();
  });

  it('coalesces duplicate requests and safely cancels an in-flight preload', async () => {
    const loading = createDeferred<void>();
    const rooms: PreloadTestRoom[] = [];
    const onError = vi.fn();
    const preloader = new RoomPreloader(
      {} as AssetManager,
      () => {
        const room = new PreloadTestRoom(() => loading.promise);
        rooms.push(room);
        return room;
      },
      onError,
    );
    const first = preloader.preloadRoom(2);
    const second = preloader.preloadRoom(2);

    expect(rooms).toHaveLength(1);
    preloader.cancel();
    loading.resolve();

    await expect(first).resolves.toBe(false);
    await expect(second).resolves.toBe(false);
    expect(rooms[0]?.isMounted()).toBe(false);
    expect(preloader.getPendingRoomIndex()).toBeNull();
    expect(onError).not.toHaveBeenCalled();
  });

  it('keeps asset leases through transfer and releases them with the consumed room', async () => {
    const source = new THREE.Group();
    source.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial(),
      ),
    );
    const assetManager = new AssetManager({
      load: vi.fn(() => Promise.resolve(source)),
    });
    const preloader = new RoomPreloader(
      assetManager,
      () => new LeasedPreloadTestRoom(),
    );

    await preloader.preloadRoom(1);
    expect(assetManager.getReferenceCount('preloaded-prop')).toBe(1);

    const room = await preloader.consume(1, {
      scene: new THREE.Scene(),
      worldCollision: new WorldCollision(),
    });
    expect(assetManager.getReferenceCount('preloaded-prop')).toBe(1);

    room?.unmount();
    expect(assetManager.getReferenceCount('preloaded-prop')).toBe(0);
    expect(assetManager.getCachedAssetCount()).toBe(0);
  });

  it('reports a preload failure and leaves transition code free to fall back', async () => {
    const onError = vi.fn();
    const room = new PreloadTestRoom(() =>
      Promise.reject(new Error('asset unavailable')),
    );
    const preloader = new RoomPreloader(
      {} as AssetManager,
      () => room,
      onError,
    );

    await expect(preloader.preloadRoom(1)).resolves.toBe(false);
    await expect(
      preloader.consume(1, {
        scene: new THREE.Scene(),
        worldCollision: new WorldCollision(),
      }),
    ).resolves.toBeNull();
    expect(onError).toHaveBeenCalledWith(1, expect.any(Error));
    expect(room.isMounted()).toBe(false);
  });

  it('rejects an invalid route index before creating a room', async () => {
    const createRoom = vi.fn(() => new PreloadTestRoom());
    const preloader = new RoomPreloader(
      {} as AssetManager,
      createRoom,
    );

    await expect(preloader.preloadRoom(-1)).rejects.toThrow(
      'must be a non-negative integer',
    );
    expect(createRoom).not.toHaveBeenCalled();
  });
});

function createDeferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T | PromiseLike<T>) => void;
} {
  let resolve = (_value: T | PromiseLike<T>): void => undefined;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}
