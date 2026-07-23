import * as THREE from 'three';
import type { AssetManager } from './assets/AssetManager';
import type { RoomRuntimeOptions } from './RoomRuntime';
import { WorldCollision } from './WorldCollision';

export interface PreloadableRoom {
  mount(options: RoomRuntimeOptions): void;
  transferMount(options: RoomRuntimeOptions): void;
  unmount(): void;
  isMounted(): boolean;
  loadAssets(assetManager?: AssetManager): Promise<void>;
}

export type RoomPreloadErrorHandler = (
  roomIndex: number,
  error: unknown,
) => void;

export type RoomPreloadPreparation<TRoom> = (
  room: TRoom,
  roomIndex: number,
) => Promise<void>;

interface RoomPreload<TRoom extends PreloadableRoom> {
  readonly roomIndex: number;
  readonly room: TRoom;
  ready: Promise<TRoom | null>;
  cancelled: boolean;
}

export class RoomPreloader<TRoom extends PreloadableRoom> {
  private readonly preloads = new Map<number, RoomPreload<TRoom>>();

  public constructor(
    private readonly assetManager: AssetManager,
    private readonly createRoom: (roomIndex: number) => TRoom,
    private readonly onError: RoomPreloadErrorHandler = () => undefined,
    private readonly prepareRoom: RoomPreloadPreparation<TRoom> =
      () => Promise.resolve(),
  ) {}

  public preloadRoom(roomIndex: number): Promise<boolean> {
    if (!Number.isInteger(roomIndex) || roomIndex < 0) {
      return Promise.reject(
        new RangeError(
          `Preloaded room index must be a non-negative integer; received ${roomIndex}.`,
        ),
      );
    }

    const existing = this.preloads.get(roomIndex);

    if (existing !== undefined) {
      return existing.ready.then((room) => room !== null);
    }

    let room: TRoom;

    try {
      room = this.createRoom(roomIndex);
      room.mount({
        scene: new THREE.Scene(),
        worldCollision: new WorldCollision(),
        activateCollision: false,
      });
    } catch (error: unknown) {
      this.onError(roomIndex, error);
      return Promise.resolve(false);
    }

    const preload: RoomPreload<TRoom> = {
      roomIndex,
      room,
      ready: Promise.resolve(null),
      cancelled: false,
    };
    preload.ready = room
      .loadAssets(this.assetManager)
      .then(async () => {
        if (!room.isMounted() || preload.cancelled) {
          return null;
        }

        await this.prepareRoom(room, roomIndex);
        return room.isMounted() && !preload.cancelled ? room : null;
      })
      .catch((error: unknown) => {
        room.unmount();

        if (!preload.cancelled) {
          this.onError(roomIndex, error);
        }

        if (this.preloads.get(roomIndex) === preload) {
          this.preloads.delete(roomIndex);
        }

        return null;
      });

    this.preloads.set(roomIndex, preload);
    return preload.ready.then((loadedRoom) => loadedRoom !== null);
  }

  public async consume(
    roomIndex: number,
    options: RoomRuntimeOptions,
  ): Promise<TRoom | null> {
    const preload = this.preloads.get(roomIndex);

    if (preload === undefined) {
      return null;
    }

    const room = await preload.ready;

    if (this.preloads.get(roomIndex) === preload) {
      this.preloads.delete(roomIndex);
    }

    if (room === null || !room.isMounted()) {
      return null;
    }

    try {
      room.transferMount(options);
      return room;
    } catch (error: unknown) {
      room.unmount();
      throw error;
    }
  }

  public getPendingRoomIndex(): number | null {
    return this.getPendingRoomIndices()[0] ?? null;
  }

  public getPendingRoomIndices(): readonly number[] {
    return [...this.preloads.keys()].sort((first, second) => first - second);
  }

  public cancel(): void {
    const preloads = [...this.preloads.values()];
    this.preloads.clear();

    for (const preload of preloads) {
      preload.cancelled = true;
      preload.room.unmount();
    }
  }

  public dispose(): void {
    this.cancel();
  }
}
