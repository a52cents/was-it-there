import * as THREE from 'three';
import type { PlayerSpawn } from '../player/PlayerConfig';
import { RENDER_LAYERS } from '../rendering/RenderLayers';
import type { RoomDefinition } from './RoomDefinition';
import type { WorldCollision } from './WorldCollision';
import type { AssetManager } from './assets/AssetManager';
import {
  installHouseShellModels,
  takeHouseShellReleaseTasks,
  type HouseShellRoomId,
} from './rooms/HouseShellModels';

export interface RoomRuntimeOptions {
  readonly scene: THREE.Scene;
  readonly worldCollision: WorldCollision;
  readonly activateCollision?: boolean;
}

export type RoomCleanupYield = () => Promise<void>;

interface RoomOwnedResources {
  readonly geometries: readonly THREE.BufferGeometry[];
  readonly materials: readonly THREE.Material[];
  readonly textures: readonly THREE.Texture[];
}

export abstract class RoomRuntime {
  public abstract readonly definition: RoomDefinition;

  private readonly visualRoot = new THREE.Group();
  private readonly collisionRoot = new THREE.Group();
  private readonly ownedGeometries = new Set<THREE.BufferGeometry>();
  private readonly ownedMaterials = new Set<THREE.Material>();
  private readonly ownedTextures = new Set<THREE.Texture>();
  private mountedScene: THREE.Scene | null = null;
  private mountedWorldCollision: WorldCollision | null = null;
  private incrementalRelease: Promise<void> | null = null;
  private visualObjectCount = 0;
  private collisionObjectCount = 0;

  protected constructor(visualRootName: string, collisionRootName: string) {
    this.visualRoot.name = visualRootName;
    this.collisionRoot.name = collisionRootName;
    this.collisionRoot.visible = false;
  }

  public mount(options: RoomRuntimeOptions): void {
    if (this.isMounted() || this.incrementalRelease !== null) {
      throw new Error(`Room "${this.definition.id}" is already mounted.`);
    }

    try {
      this.buildRoom();
      this.createSharedAmbience();
      this.visualRoot.updateMatrixWorld(true);
      this.collisionRoot.updateMatrixWorld(true);
      this.visualObjectCount = this.countMeshes(
        this.visualRoot,
        (mesh) => mesh.layers.isEnabled(RENDER_LAYERS.scene),
      );
      this.collisionObjectCount = this.countMeshes(
        this.collisionRoot,
        (mesh) => mesh.layers.isEnabled(0),
      );
      options.scene.add(this.visualRoot, this.collisionRoot);
      if (options.activateCollision !== false) {
        options.worldCollision.buildFromObject(this.collisionRoot);
      }
      this.mountedScene = options.scene;
      this.mountedWorldCollision = options.worldCollision;
    } catch (error: unknown) {
      options.scene.remove(this.visualRoot, this.collisionRoot);
      if (options.worldCollision.getSourceRoot() === this.collisionRoot) {
        options.worldCollision.clear();
      }
      this.releaseRoomContents();
      throw error;
    }
  }

  public unmount(): void {
    if (!this.isMounted() || this.incrementalRelease !== null) {
      return;
    }

    this.detachRoom();
    this.releaseRoomContents();
  }

  public unmountIncrementally(
    yieldBetweenBatches: RoomCleanupYield,
    batchSize = 24,
  ): Promise<void> {
    if (
      !Number.isInteger(batchSize) ||
      batchSize <= 0
    ) {
      return Promise.reject(
        new RangeError('Room cleanup batch size must be a positive integer.'),
      );
    }

    if (this.incrementalRelease !== null) {
      return this.incrementalRelease;
    }

    if (!this.isMounted()) {
      return Promise.resolve();
    }

    this.detachRoom();
    const resources = this.takeOwnedResources();
    const release = this.releaseRoomContentsIncrementally(
      resources,
      yieldBetweenBatches,
      batchSize,
    ).finally(() => {
      if (this.incrementalRelease === release) {
        this.incrementalRelease = null;
      }
    });
    this.incrementalRelease = release;
    return release;
  }

  public transferMount(options: RoomRuntimeOptions): void {
    if (!this.isMounted()) {
      throw new Error(
        `Room "${this.definition.id}" must be mounted before it can be transferred.`,
      );
    }

    if (
      this.mountedScene === options.scene &&
      this.mountedWorldCollision === options.worldCollision
    ) {
      return;
    }

    const previousScene = this.mountedScene as THREE.Scene;
    const previousWorldCollision =
      this.mountedWorldCollision as WorldCollision;

    previousScene.remove(this.visualRoot, this.collisionRoot);

    if (previousWorldCollision.getSourceRoot() === this.collisionRoot) {
      previousWorldCollision.clear();
    }

    try {
      options.scene.add(this.visualRoot, this.collisionRoot);
      if (options.activateCollision !== false) {
        options.worldCollision.buildFromObject(this.collisionRoot);
      }
      this.mountedScene = options.scene;
      this.mountedWorldCollision = options.worldCollision;
    } catch (error: unknown) {
      options.scene.remove(this.visualRoot, this.collisionRoot);
      previousScene.add(this.visualRoot, this.collisionRoot);
      previousWorldCollision.buildFromObject(this.collisionRoot);
      throw error;
    }
  }

  public isMounted(): boolean {
    return this.mountedScene !== null;
  }

  public getVisualRoot(): THREE.Group {
    return this.visualRoot;
  }

  public getCollisionRoot(): THREE.Group {
    return this.collisionRoot;
  }

  public getPlayerSpawn(): PlayerSpawn {
    const [x, y, z] = this.definition.playerSpawn.position;
    return {
      x,
      y,
      z,
      yaw: this.definition.playerSpawn.yaw,
      pitch: this.definition.playerSpawn.pitch,
    };
  }

  public getVisualObjectCount(): number {
    return this.visualObjectCount;
  }

  public getCollisionObjectCount(): number {
    return this.collisionObjectCount;
  }

  public setCollisionVisible(visible: boolean): void {
    this.collisionRoot.visible = visible;
  }

  public isCollisionVisible(): boolean {
    return this.collisionRoot.visible;
  }

  protected ownGeometry<T extends THREE.BufferGeometry>(geometry: T): T {
    this.ownedGeometries.add(geometry);
    return geometry;
  }

  protected ownMaterial<T extends THREE.Material>(material: T): T {
    this.ownedMaterials.add(material);
    return material;
  }

  protected ownTexture<T extends THREE.Texture>(texture: T): T {
    this.ownedTextures.add(texture);
    return texture;
  }

  protected disposeOwnedGeometry(geometry: THREE.BufferGeometry): void {
    if (this.ownedGeometries.delete(geometry)) {
      geometry.dispose();
    }
  }

  protected refreshVisualObjectCount(): void {
    this.visualRoot.updateMatrixWorld(true);
    this.visualObjectCount = this.countMeshes(
      this.visualRoot,
      (mesh) => mesh.layers.isEnabled(RENDER_LAYERS.scene),
    );
  }

  protected rebuildWorldCollision(): void {
    if (this.mountedWorldCollision === null) {
      throw new Error(
        `Room "${this.definition.id}" must be mounted before rebuilding collisions.`,
      );
    }

    this.collisionRoot.updateMatrixWorld(true);
    this.collisionObjectCount = this.countMeshes(
      this.collisionRoot,
      (mesh) => mesh.layers.isEnabled(0),
    );
    this.mountedWorldCollision.buildFromObject(this.collisionRoot);
  }

  protected async loadHouseShellAssets(
    assetManager: AssetManager,
    roomId: HouseShellRoomId,
  ): Promise<void> {
    await installHouseShellModels(
      this,
      roomId,
      this.visualRoot,
      assetManager,
      () => this.isMounted(),
    );
    this.refreshVisualObjectCount();
  }

  protected abstract buildRoom(): void;

  protected onRoomReleased(): void {
    // Concrete rooms can clear references to locally owned scene objects.
  }

  protected takeDeferredRoomReleaseTasks(): readonly (() => void)[] {
    return [];
  }

  private createSharedAmbience(): void {
    const skyFill = new THREE.HemisphereLight(
      '#c9dbe0',
      '#66564a',
      0.09,
    );
    skyFill.name = 'LIGHT_GlobalSkyFill';
    const bounce = new THREE.AmbientLight('#d8d2c7', 0.03);
    bounce.name = 'LIGHT_GlobalBounce';
    this.visualRoot.add(skyFill, bounce);
  }

  private releaseRoomContents(): void {
    const deferredReleases = [
      ...takeHouseShellReleaseTasks(this),
      ...this.takeDeferredRoomReleaseTasks(),
    ];

    for (const release of deferredReleases) {
      release();
    }

    this.onRoomReleased();
    this.visualRoot.clear();
    this.collisionRoot.clear();
    const resources = this.takeOwnedResources();

    for (const geometry of resources.geometries) {
      geometry.dispose();
    }

    for (const material of resources.materials) {
      material.dispose();
    }

    for (const texture of resources.textures) {
      texture.dispose();
    }
  }

  private async releaseRoomContentsIncrementally(
    resources: RoomOwnedResources,
    yieldBetweenBatches: RoomCleanupYield,
    batchSize: number,
  ): Promise<void> {
    const deferredReleases = [
      ...takeHouseShellReleaseTasks(this),
      ...this.takeDeferredRoomReleaseTasks(),
    ];
    await yieldBetweenBatches();
    await clearObjectChildrenInBatches(
      [this.visualRoot, this.collisionRoot],
      yieldBetweenBatches,
      batchSize,
    );
    await disposeInBatches(
      deferredReleases,
      (release) => release(),
      yieldBetweenBatches,
      Math.min(batchSize, 4),
    );
    this.onRoomReleased();
    await disposeInBatches(
      resources.geometries,
      (geometry) => geometry.dispose(),
      yieldBetweenBatches,
      batchSize,
    );
    await disposeInBatches(
      resources.materials,
      (material) => material.dispose(),
      yieldBetweenBatches,
      batchSize,
    );
    await disposeInBatches(
      resources.textures,
      (texture) => texture.dispose(),
      yieldBetweenBatches,
      batchSize,
    );
  }

  private detachRoom(): void {
    this.mountedScene?.remove(this.visualRoot, this.collisionRoot);

    if (
      this.mountedWorldCollision?.getSourceRoot() === this.collisionRoot
    ) {
      this.mountedWorldCollision.clear();
    }

    this.mountedScene = null;
    this.mountedWorldCollision = null;
  }

  private takeOwnedResources(): RoomOwnedResources {
    const resources = {
      geometries: [...this.ownedGeometries],
      materials: [...this.ownedMaterials],
      textures: [...this.ownedTextures],
    } satisfies RoomOwnedResources;
    this.ownedGeometries.clear();
    this.ownedMaterials.clear();
    this.ownedTextures.clear();
    this.visualObjectCount = 0;
    this.collisionObjectCount = 0;
    this.collisionRoot.visible = false;
    return resources;
  }

  private countMeshes(
    root: THREE.Object3D,
    include: (mesh: THREE.Mesh) => boolean = () => true,
  ): number {
    let count = 0;
    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh && include(mesh)) {
        count += 1;
      }
    });
    return count;
  }
}

async function disposeInBatches<T>(
  resources: readonly T[],
  dispose: (resource: T) => void,
  yieldBetweenBatches: RoomCleanupYield,
  batchSize: number,
): Promise<void> {
  for (let offset = 0; offset < resources.length; offset += batchSize) {
    const batch = resources.slice(offset, offset + batchSize);

    for (const resource of batch) {
      dispose(resource);
    }

    if (offset + batchSize < resources.length) {
      await yieldBetweenBatches();
    }
  }

  await yieldBetweenBatches();
}

async function clearObjectChildrenInBatches(
  roots: readonly THREE.Object3D[],
  yieldBetweenBatches: RoomCleanupYield,
  batchSize: number,
): Promise<void> {
  for (const root of roots) {
    while (root.children.length > 0) {
      const batch = root.children.slice(0, batchSize);
      root.remove(...batch);
      await yieldBetweenBatches();
    }
  }
}
