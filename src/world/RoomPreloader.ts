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

interface RoomPreload<TRoom extends PreloadableRoom> {
  readonly roomIndex: number;
  readonly room: TRoom;
  ready: Promise<TRoom | null>;
  cancelled: boolean;
}

export class RoomPreloader<TRoom extends PreloadableRoom> {
  private preload: RoomPreload<TRoom> | null = null;

  public constructor(
    private readonly assetManager: AssetManager,
    private readonly createRoom: (roomIndex: number) => TRoom,
    private readonly onError: RoomPreloadErrorHandler = () => undefined,
  ) {}

  public preloadRoom(roomIndex: number): Promise<boolean> {
    if (!Number.isInteger(roomIndex) || roomIndex < 0) {
      return Promise.reject(
        new RangeError(
          `Preloaded room index must be a non-negative integer; received ${roomIndex}.`,
        ),
      );
    }

    if (this.preload?.roomIndex === roomIndex) {
      return this.preload.ready.then((room) => room !== null);
    }

    this.cancel();
    let room: TRoom;

    try {
      room = this.createRoom(roomIndex);
      room.mount({
        scene: new THREE.Scene(),
        worldCollision: new WorldCollision(),
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
      .then(() => (room.isMounted() ? room : null))
      .catch((error: unknown) => {
        room.unmount();

        if (!preload.cancelled) {
          this.onError(roomIndex, error);
        }

        return null;
      });

    this.preload = preload;
    return preload.ready.then((loadedRoom) => loadedRoom !== null);
  }

  public async consume(
    roomIndex: number,
    options: RoomRuntimeOptions,
  ): Promise<TRoom | null> {
    const preload = this.preload;

    if (preload === null || preload.roomIndex !== roomIndex) {
      return null;
    }

    const room = await preload.ready;

    if (this.preload === preload) {
      this.preload = null;
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
    return this.preload?.roomIndex ?? null;
  }

  public cancel(): void {
    const preload = this.preload;
    this.preload = null;
    if (preload !== null) {
      preload.cancelled = true;
    }
    preload?.room.unmount();
  }

  public dispose(): void {
    this.cancel();
  }
}
