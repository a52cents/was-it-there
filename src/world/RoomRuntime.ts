import * as THREE from 'three';
import type { PlayerSpawn } from '../player/PlayerConfig';
import { RENDER_LAYERS } from '../rendering/RenderLayers';
import type { RoomDefinition } from './RoomDefinition';
import type { WorldCollision } from './WorldCollision';
import type { AssetManager } from './assets/AssetManager';
import {
  installHouseShellModels,
  releaseHouseShellModels,
  type HouseShellRoomId,
} from './rooms/HouseShellModels';

export interface RoomRuntimeOptions {
  readonly scene: THREE.Scene;
  readonly worldCollision: WorldCollision;
  readonly activateCollision?: boolean;
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
  private visualObjectCount = 0;
  private collisionObjectCount = 0;

  protected constructor(visualRootName: string, collisionRootName: string) {
    this.visualRoot.name = visualRootName;
    this.collisionRoot.name = collisionRootName;
    this.collisionRoot.visible = false;
  }

  public mount(options: RoomRuntimeOptions): void {
    if (this.isMounted()) {
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
    if (!this.isMounted()) {
      return;
    }

    this.mountedScene?.remove(this.visualRoot, this.collisionRoot);

    if (
      this.mountedWorldCollision?.getSourceRoot() === this.collisionRoot
    ) {
      this.mountedWorldCollision.clear();
    }

    this.mountedScene = null;
    this.mountedWorldCollision = null;
    this.releaseRoomContents();
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
    releaseHouseShellModels(this);
    this.onRoomReleased();
    this.visualRoot.clear();
    this.collisionRoot.clear();

    for (const geometry of this.ownedGeometries) {
      geometry.dispose();
    }

    for (const material of this.ownedMaterials) {
      material.dispose();
    }

    for (const texture of this.ownedTextures) {
      texture.dispose();
    }

    this.ownedGeometries.clear();
    this.ownedMaterials.clear();
    this.ownedTextures.clear();
    this.visualObjectCount = 0;
    this.collisionObjectCount = 0;
    this.collisionRoot.visible = false;
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
