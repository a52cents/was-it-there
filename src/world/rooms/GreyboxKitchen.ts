import * as THREE from 'three';
import { KITCHEN_ASSET_CATALOG } from '../../content/rooms/KitchenAssetCatalog';
import {
  captureAnomalyCollisionObjectState,
  captureAnomalyTargetInitialState,
  type AnomalyTarget,
  type PreparedAnomalyVariant,
} from '../../gameplay/anomalies/AnomalyTarget';
import { AnomalyTargetRegistry } from '../../gameplay/anomalies/AnomalyTargetRegistry';
import { RENDER_LAYERS } from '../../rendering/RenderLayers';
import {
  type AssetManager,
  type GlbAssetLease,
} from '../assets/AssetManager';
import type { RoomDefinition } from '../RoomDefinition';
import { RoomRuntime } from '../RoomRuntime';
import { createAgedPlasterTexture } from '../textures/AgedPlasterTexture';
import { createStoneTileFloorTexture } from '../textures/ProceduralFloorTexture';
import type { PlayableRoom } from './PlayableRoom';

type Vector3Tuple = readonly [number, number, number];
type QuaternionTuple = readonly [number, number, number, number];
type KitchenAssetKey = keyof typeof KITCHEN_ASSET_CATALOG;

interface KitchenMaterials {
  readonly wall: THREE.MeshStandardMaterial;
  readonly floor: THREE.MeshStandardMaterial;
  readonly ceiling: THREE.MeshStandardMaterial;
  readonly tile: THREE.MeshStandardMaterial;
  readonly trim: THREE.MeshStandardMaterial;
  readonly door: THREE.MeshStandardMaterial;
  readonly metal: THREE.MeshStandardMaterial;
  readonly glass: THREE.MeshStandardMaterial;
  readonly neonGreen: THREE.MeshStandardMaterial;
  readonly porcelain: THREE.MeshStandardMaterial;
  readonly bread: THREE.MeshStandardMaterial;
  readonly fruitRed: THREE.MeshStandardMaterial;
  readonly fruitGreen: THREE.MeshStandardMaterial;
  readonly exitGlow: THREE.MeshBasicMaterial;
  readonly collision: THREE.MeshBasicMaterial;
  readonly interaction: THREE.MeshBasicMaterial;
}

interface KitchenAssetPlacement {
  readonly key: KitchenAssetKey;
  readonly targetId: string;
  readonly objectName: string;
  readonly position: Vector3Tuple;
  readonly quaternion?: QuaternionTuple;
  readonly scale?: Vector3Tuple;
  readonly rotationY: number;
  readonly maximumSize: Vector3Tuple;
  readonly verticalAnchor: 'center' | 'ground';
  readonly interactionSize: Vector3Tuple;
  readonly tint: string;
  readonly anomalyColors: readonly [string, string];
  readonly colliderName?: string;
  readonly colliderSize?: Vector3Tuple;
  readonly dependentTargetIds?: readonly string[];
  readonly anomalyEnabled?: boolean;
}

const ROOM_HALF_SIZE = 4.2;
const ROOM_HEIGHT = 3.1;
const WALL_THICKNESS = 0.18;
const DOOR_WIDTH = 1.1;
const DOOR_HEIGHT = 2.2;
const ENTRANCE_CENTER_X = -2.75;
const EXIT_CENTER_X = 2.75;
const SOUTH_Z = ROOM_HALF_SIZE;
const NORTH_Z = -ROOM_HALF_SIZE;

export const KITCHEN_COLOR_ANOMALY_TARGET_IDS = [
  'coffee-machine',
  'toaster',
  'microwave',
  'blender',
  'trashcan',
  'window-plant',
] as const;

const KITCHEN_COLOR_ANOMALY_TARGET_ID_SET: ReadonlySet<string> = new Set(
  KITCHEN_COLOR_ANOMALY_TARGET_IDS,
);

const KITCHEN_ASSET_PLACEMENTS: readonly KitchenAssetPlacement[] = [
  {
    key: 'fridgeLarge',
    targetId: 'fridge',
    objectName: 'ANOM_Kitchen_Fridge',
    position: [-3.55, 0, -2.45],
    rotationY: Math.PI / 2,
    maximumSize: [0.74, 2.2, 0.92],
    verticalAnchor: 'ground',
    interactionSize: [0.92, 2.3, 1.08],
    tint: '#b9c0ba',
    anomalyColors: ['#80605b', '#647c7c'],
    colliderName: 'COLLIDER_Kitchen_Fridge',
    colliderSize: [0.82, 2.2, 1.02],
  },
  {
    key: 'cabinetDrawer',
    targetId: 'west-cabinet',
    objectName: 'ANOM_Kitchen_WestCabinet',
    position: [-3.55, 0, -1.25],
    scale: [1.5, 1.4, 1.5],
    rotationY: Math.PI / 2,
    maximumSize: [0.72, 0.94, 1.12],
    verticalAnchor: 'ground',
    interactionSize: [0.86, 1.06, 1.24],
    tint: '#b6a17f',
    anomalyColors: ['#6d7d65', '#6c7188'],
    colliderName: 'COLLIDER_Kitchen_WestCabinet',
    colliderSize: [0.78, 0.94, 1.16],
    dependentTargetIds: ['coffee-machine', 'toaster'],
  },
  {
    key: 'coffeeMachine',
    targetId: 'coffee-machine',
    objectName: 'ANOM_Kitchen_CoffeeMachine',
    position: [-3.52, 0.96, -1.48],
    rotationY: Math.PI / 2,
    maximumSize: [0.36, 0.44, 0.36],
    verticalAnchor: 'ground',
    interactionSize: [0.48, 0.56, 0.48],
    tint: '#8f8f88',
    anomalyColors: ['#915956', '#5e7182'],
  },
  {
    key: 'toaster',
    targetId: 'toaster',
    objectName: 'ANOM_Kitchen_Toaster',
    position: [-3.5, 0.96, -0.98],
    rotationY: Math.PI / 2,
    maximumSize: [0.36, 0.25, 0.3],
    verticalAnchor: 'ground',
    interactionSize: [0.48, 0.37, 0.42],
    tint: '#a9a397',
    anomalyColors: ['#80714e', '#5f7770'],
  },
  {
    key: 'sink',
    targetId: 'sink',
    objectName: 'ANOM_Kitchen_Sink',
    position: [-2.15, 0, -3.55],
    quaternion: [0, 0.9990482215818578, 0, -0.04361938736533589],
    scale: [1.15, 1.15, 1.15],
    rotationY: Math.PI,
    maximumSize: [1.12, 1.0, 0.72],
    verticalAnchor: 'ground',
    interactionSize: [1.24, 1.16, 0.86],
    tint: '#b8ae96',
    anomalyColors: ['#587783', '#816357'],
    colliderName: 'COLLIDER_Kitchen_Sink',
    colliderSize: [1.16, 1.0, 0.78],
  },
  {
    key: 'cabinet',
    targetId: 'north-cabinet',
    objectName: 'ANOM_Kitchen_NorthCabinet',
    position: [-0.98, 0, -3.55],
    quaternion: [0, 1, 0, 0],
    scale: [1.25, 1.25, 1.25],
    rotationY: Math.PI,
    maximumSize: [1.08, 0.94, 0.7],
    verticalAnchor: 'ground',
    interactionSize: [1.2, 1.06, 0.84],
    tint: '#b6a17f',
    anomalyColors: ['#6a7a62', '#80615c'],
    colliderName: 'COLLIDER_Kitchen_NorthCabinet',
    colliderSize: [1.12, 0.94, 0.76],
  },
  {
    key: 'stoveElectric',
    targetId: 'stove',
    objectName: 'ANOM_Kitchen_Stove',
    position: [0.18, 0, -3.55],
    quaternion: [0, 1, 0, 0],
    scale: [1.15, 1.15, 1.15],
    rotationY: Math.PI,
    maximumSize: [1.05, 1.0, 0.72],
    verticalAnchor: 'ground',
    interactionSize: [1.17, 1.14, 0.86],
    tint: '#aaa99f',
    anomalyColors: ['#875c54', '#5d7180'],
    colliderName: 'COLLIDER_Kitchen_Stove',
    colliderSize: [1.08, 1.0, 0.78],
    dependentTargetIds: ['hood'],
  },
  {
    key: 'cabinetDrawer',
    targetId: 'east-cabinet',
    objectName: 'ANOM_Kitchen_EastCabinet',
    position: [1.34, 0, -3.55],
    quaternion: [0, 1, 0, 0],
    scale: [1, 1.1, 1],
    rotationY: Math.PI,
    maximumSize: [1.05, 0.94, 0.7],
    verticalAnchor: 'ground',
    interactionSize: [1.17, 1.06, 0.84],
    tint: '#b6a17f',
    anomalyColors: ['#667b70', '#7b6484'],
    colliderName: 'COLLIDER_Kitchen_EastCabinet',
    colliderSize: [1.1, 0.94, 0.76],
    dependentTargetIds: ['microwave'],
  },
  {
    key: 'cabinetUpperDouble',
    targetId: 'upper-cabinet',
    objectName: 'ANOM_Kitchen_UpperCabinet',
    position: [-1.03, 1.42, -3.67],
    quaternion: [0, 1, 0, 0],
    rotationY: Math.PI,
    maximumSize: [1.18, 0.76, 0.42],
    verticalAnchor: 'ground',
    interactionSize: [1.3, 0.88, 0.54],
    tint: '#b6a17f',
    anomalyColors: ['#657662', '#6a7187'],
  },
  {
    key: 'hoodModern',
    targetId: 'hood',
    objectName: 'ANOM_Kitchen_Hood',
    position: [0.18, 1.42, -3.68],
    quaternion: [0, 1, 0, 0],
    rotationY: Math.PI,
    maximumSize: [0.86, 0.78, 0.48],
    verticalAnchor: 'ground',
    interactionSize: [1.0, 0.9, 0.6],
    tint: '#aaa9a1',
    anomalyColors: ['#78615d', '#5e747a'],
  },
  {
    key: 'microwave',
    targetId: 'microwave',
    objectName: 'ANOM_Kitchen_Microwave',
    position: [1.34, 0.7, -3.65],
    quaternion: [0, 1, 0, 0],
    rotationY: Math.PI,
    maximumSize: [0.72, 0.48, 0.44],
    verticalAnchor: 'ground',
    interactionSize: [0.84, 0.6, 0.56],
    tint: '#9e9d95',
    anomalyColors: ['#865b55', '#5f7180'],
  },
  {
    key: 'island',
    targetId: 'island',
    objectName: 'ANOM_Kitchen_Island',
    position: [-0.22, 0, -0.55],
    rotationY: Math.PI / 2,
    maximumSize: [1.15, 1.0, 1.65],
    verticalAnchor: 'ground',
    interactionSize: [1.28, 1.12, 1.78],
    tint: '#aa9272',
    anomalyColors: ['#5f7564', '#725f81'],
    colliderName: 'COLLIDER_Kitchen_Island',
    colliderSize: [1.24, 1.0, 1.74],
    dependentTargetIds: ['blender'],
  },
  {
    key: 'islandEnd',
    targetId: 'island-end',
    objectName: 'ANOM_Kitchen_IslandEnd',
    position: [-0.22, 0, 1.1],
    rotationY: Math.PI / 2,
    maximumSize: [1.15, 1.0, 0.78],
    verticalAnchor: 'ground',
    interactionSize: [1.28, 1.12, 0.9],
    tint: '#aa9272',
    anomalyColors: ['#607568', '#7b625d'],
    colliderName: 'COLLIDER_Kitchen_IslandEnd',
    colliderSize: [1.24, 1.0, 0.86],
  },
  {
    key: 'blender',
    targetId: 'blender',
    objectName: 'ANOM_Kitchen_Blender',
    position: [-0.22, 1, -0.42],
    rotationY: -0.25,
    maximumSize: [0.32, 0.48, 0.32],
    verticalAnchor: 'ground',
    interactionSize: [0.44, 0.6, 0.44],
    tint: '#9ea49d',
    anomalyColors: ['#8c5d58', '#5d7481'],
  },
  {
    key: 'barStool',
    targetId: 'bar-stool-west',
    objectName: 'ANOM_Kitchen_BarStoolWest',
    position: [-1.25, 0, -0.5],
    rotationY: Math.PI / 2,
    maximumSize: [0.58, 0.9, 0.58],
    verticalAnchor: 'ground',
    interactionSize: [0.7, 1.02, 0.7],
    tint: '#826d5c',
    anomalyColors: ['#536f7f', '#756082'],
  },
  {
    key: 'barStool',
    targetId: 'bar-stool-east',
    objectName: 'ANOM_Kitchen_BarStoolEast',
    position: [-1.25, 0, 0.45],
    rotationY: Math.PI / 2,
    maximumSize: [0.58, 0.9, 0.58],
    verticalAnchor: 'ground',
    interactionSize: [0.7, 1.02, 0.7],
    tint: '#826d5c',
    anomalyColors: ['#597366', '#875c58'],
  },
  {
    key: 'tableRound',
    targetId: 'breakfast-table',
    objectName: 'ANOM_Kitchen_BreakfastTable',
    position: [2.65, 0, 1.62],
    quaternion: [0, 0.25881904510252074, 0, 0.9659258262890683],
    rotationY: 0,
    maximumSize: [1.35, 0.82, 1.35],
    verticalAnchor: 'ground',
    interactionSize: [1.48, 0.94, 1.48],
    tint: '#a99072',
    anomalyColors: ['#62755f', '#6a7085'],
    colliderName: 'COLLIDER_Kitchen_BreakfastTable',
    colliderSize: [1.25, 0.82, 1.25],
    dependentTargetIds: ['breakfast-chair'],
  },
  {
    key: 'chairRounded',
    targetId: 'breakfast-chair',
    objectName: 'ANOM_Kitchen_BreakfastChair',
    position: [2.55, 0, 2.72],
    rotationY: Math.PI,
    maximumSize: [0.72, 0.98, 0.72],
    verticalAnchor: 'ground',
    interactionSize: [0.84, 1.1, 0.84],
    tint: '#8b7562',
    anomalyColors: ['#587486', '#845b57'],
  },
  {
    key: 'trashcan',
    targetId: 'trashcan',
    objectName: 'ANOM_Kitchen_Trashcan',
    position: [-3.5, 0, 1.45],
    rotationY: 0,
    maximumSize: [0.56, 0.72, 0.56],
    verticalAnchor: 'ground',
    interactionSize: [0.68, 0.84, 0.68],
    tint: '#858982',
    anomalyColors: ['#865a55', '#5e727d'],
  },
  {
    key: 'plantSmall',
    targetId: 'window-plant',
    objectName: 'ANOM_Kitchen_WindowPlant',
    position: [2.6, 0.6, 1.65],
    rotationY: 0.25,
    maximumSize: [0.42, 0.55, 0.42],
    verticalAnchor: 'ground',
    interactionSize: [0.54, 0.67, 0.54],
    tint: '#78906a',
    anomalyColors: ['#98714e', '#5a7384'],
  },
  {
    key: 'ceilingLight',
    targetId: 'ceiling-light-west',
    objectName: 'ANOM_Kitchen_CeilingLightWest',
    position: [-1.55, 2.92, 0.2],
    rotationY: 0,
    maximumSize: [0.72, 0.1, 0.72],
    verticalAnchor: 'ground',
    interactionSize: [0.84, 0.18, 0.84],
    tint: '#d3bd91',
    anomalyColors: ['#8d5d57', '#587486'],
    anomalyEnabled: false,
  },
  {
    key: 'ceilingLight',
    targetId: 'ceiling-light-east',
    objectName: 'ANOM_Kitchen_CeilingLightEast',
    position: [1.25, 2.92, 0.2],
    rotationY: Math.PI / 2,
    maximumSize: [0.72, 0.1, 0.72],
    verticalAnchor: 'ground',
    interactionSize: [0.84, 0.18, 0.84],
    tint: '#d3bd91',
    anomalyColors: ['#627861', '#756184'],
    anomalyEnabled: false,
  },
] as const;

export const KITCHEN_EXIT_THRESHOLD = {
  z: NORTH_Z - 0.4,
  minimumX: EXIT_CENTER_X - DOOR_WIDTH / 2,
  maximumX: EXIT_CENTER_X + DOOR_WIDTH / 2,
  crossing: 'negative-z',
} as const;

export class GreyboxKitchen extends RoomRuntime implements PlayableRoom {
  public readonly definition: RoomDefinition = {
    id: 'kitchen',
    displayName: 'Kitchen',
    observationDurationMs: 13_000,
    searchDurationMs: 28_000,
    anomalyCount: { min: 2, max: 2 },
    playerSpawn: {
      position: [ENTRANCE_CENTER_X, 0, 3.35],
      yaw: 0,
      pitch: 0,
    },
  };

  private readonly anomalyTargetRegistry = new AnomalyTargetRegistry();
  private readonly assetLeases: GlbAssetLease[] = [];
  private materials: KitchenMaterials | null = null;
  private exitDoor: THREE.Object3D | null = null;
  private exitDoorCollider: THREE.Mesh | null = null;
  private exitPortal: THREE.Group | null = null;
  private exitPortalLight: THREE.PointLight | null = null;
  private assetManager: AssetManager | null = null;
  private assetLoadPromise: Promise<void> | null = null;
  private assetsLoaded = false;
  private buildRevision = 0;

  public constructor() {
    super('ROOM_Kitchen_VisualRoot', 'COLLIDER_Kitchen_Root');
  }

  public getAnomalyTargets(): readonly AnomalyTarget[] {
    return this.anomalyTargetRegistry.getAll();
  }

  public getAnomalyTargetRegistry(): AnomalyTargetRegistry {
    return this.anomalyTargetRegistry;
  }

  public getExitDoor(): THREE.Object3D | null {
    return this.exitDoor;
  }

  public getExitThresholdDefinition() {
    return KITCHEN_EXIT_THRESHOLD;
  }

  public isAssetsLoaded(): boolean {
    return this.assetsLoaded;
  }

  public getLoadedAssetIds(): readonly string[] {
    return this.assetLeases.map((lease) => lease.assetId);
  }

  public async loadAssets(assetManager?: AssetManager): Promise<void> {
    await this.loadKitchenAssets(assetManager);
    const manager = this.assetManager;

    if (manager === null) {
      throw new Error('The kitchen AssetManager is unavailable.');
    }

    await this.loadHouseShellAssets(manager, 'kitchen');
  }

  private async loadKitchenAssets(assetManager?: AssetManager): Promise<void> {
    if (!this.isMounted()) {
      throw new Error('The kitchen must be mounted before loading assets.');
    }

    if (this.assetsLoaded) {
      return;
    }

    if (this.assetLoadPromise !== null) {
      await this.assetLoadPromise;
      return;
    }

    if (assetManager !== undefined) {
      this.assetManager = assetManager;
    }

    if (this.assetManager === null) {
      throw new Error('The kitchen AssetManager is unavailable.');
    }

    const revision = this.buildRevision;
    const loadPromise = this.performAssetLoad(this.assetManager, revision);
    this.assetLoadPromise = loadPromise;

    try {
      await loadPromise;
    } finally {
      if (this.assetLoadPromise === loadPromise) {
        this.assetLoadPromise = null;
      }
    }
  }

  public setExitDoorCollisionEnabled(
    enabled: boolean,
    rebuildCollision = true,
  ): void {
    const collider = this.exitDoorCollider;

    if (collider === null) {
      throw new Error('The kitchen exit-door collider is unavailable.');
    }

    const root = this.getCollisionRoot();
    const currentlyEnabled = collider.parent === root;

    if (currentlyEnabled === enabled) {
      return;
    }

    if (enabled) {
      root.add(collider);
    } else {
      collider.removeFromParent();
    }

    if (rebuildCollision) {
      this.rebuildWorldCollision();
    }
  }

  public setExitPortalProgress(progress: number): void {
    const materials = this.materials;

    if (
      this.exitPortal === null ||
      this.exitPortalLight === null ||
      materials === null
    ) {
      throw new Error('The kitchen exit portal is unavailable.');
    }

    const safeProgress = Number.isFinite(progress)
      ? THREE.MathUtils.clamp(progress, 0, 1)
      : 0;
    this.exitPortal.visible = safeProgress > 0;
    materials.exitGlow.opacity = safeProgress * 0.82;
    this.exitPortalLight.intensity = safeProgress * 2.3;
  }

  protected buildRoom(): void {
    this.buildRevision += 1;
    this.materials = this.createMaterials();
    this.createArchitecture();
    this.createLighting();
    this.createCollisions();
  }

  protected override takeDeferredRoomReleaseTasks(): readonly (() => void)[] {
    return this.assetLeases
      .splice(0)
      .map((lease) => () => lease.release());
  }

  protected override onRoomReleased(): void {
    this.assetsLoaded = false;
    this.anomalyTargetRegistry.clear();
    this.materials = null;
    this.exitDoor = null;
    this.exitDoorCollider = null;
    this.exitPortal = null;
    this.exitPortalLight = null;
  }

  private async performAssetLoad(
    assetManager: AssetManager,
    revision: number,
  ): Promise<void> {
    const results = await Promise.allSettled(
      KITCHEN_ASSET_PLACEMENTS.map((placement) =>
        assetManager.acquire(KITCHEN_ASSET_CATALOG[placement.key]),
      ),
    );
    const leases = results.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : [],
    );
    const failure = results.find(
      (result): result is PromiseRejectedResult =>
        result.status === 'rejected',
    );

    if (failure !== undefined) {
      for (const lease of leases) {
        lease.release();
      }
      throw new Error(
        `Kitchen assets could not be loaded: ${this.getErrorMessage(failure.reason)}`,
        { cause: failure.reason },
      );
    }

    if (!this.isMounted() || revision !== this.buildRevision) {
      for (const lease of leases) {
        lease.release();
      }
      throw new Error('The kitchen changed while its assets were loading.');
    }

    try {
      const preparedAssets = KITCHEN_ASSET_PLACEMENTS.map((placement, index) => {
        const lease = leases[index];
        if (lease === undefined) {
          throw new Error(`Missing kitchen asset for "${placement.targetId}".`);
        }
        return {
          placement,
          object: this.createFittedAssetObject(placement, lease),
        };
      });
      const targets = preparedAssets
        .filter(({ placement }) => placement.anomalyEnabled !== false)
        .map(({ placement, object }) =>
          this.createAnomalyTarget(placement, object)
        );
      const validationRegistry = new AnomalyTargetRegistry();
      for (const target of targets) {
        validationRegistry.register(target);
      }
      const layoutAdditions = this.createLayoutAdditions(targets);
      this.getVisualRoot().add(
        ...preparedAssets.map(({ object }) => object),
        ...layoutAdditions,
      );
      for (const target of targets) {
        this.anomalyTargetRegistry.register(target);
      }
      this.assetLeases.push(...leases);
      this.assetsLoaded = true;
      this.refreshVisualObjectCount();
    } catch (error: unknown) {
      for (const lease of leases) {
        lease.release();
      }
      throw new Error(
        `Kitchen assets could not be prepared: ${this.getErrorMessage(error)}`,
        { cause: error },
      );
    }
  }

  private createFittedAssetObject(
    placement: KitchenAssetPlacement,
    lease: GlbAssetLease,
  ): THREE.Group {
    const object = new THREE.Group();
    object.name = placement.objectName;
    object.position.fromArray(placement.position);
    object.quaternion.fromArray(placement.quaternion ?? [0, 0, 0, 1]);
    object.scale.fromArray(placement.scale ?? [1, 1, 1]);
    object.userData['assetId'] = lease.assetId;
    const model = lease.root;
    model.name = `${placement.objectName}_GLB`;
    model.rotation.y = placement.rotationY;
    this.harmonizeImportedMaterials(model, placement);
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const scale = Math.min(
      placement.maximumSize[0] / size.x,
      placement.maximumSize[1] / size.y,
      placement.maximumSize[2] / size.z,
    );

    if (!Number.isFinite(scale) || scale <= 0) {
      throw new Error(`Kitchen asset "${lease.assetId}" has invalid bounds.`);
    }

    model.scale.setScalar(scale);
    model.updateMatrixWorld(true);
    const fittedBounds = new THREE.Box3().setFromObject(model);
    const center = fittedBounds.getCenter(new THREE.Vector3());
    model.position.set(
      -center.x,
      placement.verticalAnchor === 'ground' ? -fittedBounds.min.y : -center.y,
      -center.z,
    );
    object.add(model);
    return object;
  }

  private createLayoutAdditions(
    targets: readonly AnomalyTarget[],
  ): readonly THREE.Object3D[] {
    const additions = [
      {
        sourceTargetId: 'breakfast-chair',
        nodeName: 'ANOM_Kitchen_BreakfastChair_Copy',
        position: [2.55, 0, 0.55] as const,
        quaternion: [0, 1, 0, 0] as const,
      },
      {
        sourceTargetId: 'breakfast-chair',
        nodeName: 'ANOM_Kitchen_BreakfastChair_Copy_2',
        position: [3.6500000000000004, 0, 1.7000000000000002] as const,
        quaternion: [
          0,
          -0.7071067811865476,
          0,
          -0.7071067811865475,
        ] as const,
      },
      {
        sourceTargetId: 'island',
        nodeName: 'ANOM_Kitchen_Island_Copy',
        position: [-0.22, 0, 0.47] as const,
        quaternion: [0, 0, 0, 1] as const,
      },
    ];

    return additions.map((addition) => {
      const source = targets.find(({ id }) => id === addition.sourceTargetId);

      if (source === undefined) {
        throw new Error(
          `Kitchen layout source "${addition.sourceTargetId}" is missing.`,
        );
      }

      const copy = source.object.clone(true);
      copy.name = addition.nodeName;
      copy.position.fromArray(addition.position);
      copy.quaternion.fromArray(addition.quaternion);
      copy.scale.set(1, 1, 1);
      copy.visible = true;
      const technicalObjects: THREE.Object3D[] = [];

      copy.traverse((object) => {
        if (
          object.name.startsWith('INTERACT_') ||
          (
            object.layers.isEnabled(RENDER_LAYERS.interaction) &&
            !object.layers.isEnabled(RENDER_LAYERS.scene)
          )
        ) {
          technicalObjects.push(object);
        }
      });

      for (const object of technicalObjects) {
        object.removeFromParent();
      }

      copy.traverse((object) => {
        const mesh = object as THREE.Mesh;

        if (!mesh.isMesh) {
          return;
        }

        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map((material) =>
              this.ownMaterial(material.clone())
            )
          : this.ownMaterial(mesh.material.clone());
      });

      return copy;
    });
  }

  private harmonizeImportedMaterials(
    root: THREE.Object3D,
    placement: KitchenAssetPlacement,
  ): void {
    const styledMaterials = new Set<THREE.Material>();
    let surfaceIndex = 0;

    root.traverse((candidate) => {
      const mesh = candidate as THREE.Mesh;
      if (!mesh.isMesh) {
        return;
      }
      surfaceIndex += 1;
      mesh.name = `${placement.objectName}_Surface_${surfaceIndex}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const material of materials) {
        if (styledMaterials.has(material)) {
          continue;
        }
        const standard = material as THREE.MeshStandardMaterial;
        material.name = `kitchen-${placement.targetId}`;
        if (standard.isMeshStandardMaterial) {
          standard.color.multiply(new THREE.Color(placement.tint));
          standard.roughness = Math.max(standard.roughness, 0.68);
          standard.metalness = Math.min(standard.metalness, 0.16);
          standard.envMapIntensity = 0.52;
          standard.needsUpdate = true;
        }
        styledMaterials.add(material);
      }
    });

    if (surfaceIndex === 0) {
      throw new Error(`Kitchen asset "${placement.targetId}" contains no mesh.`);
    }
  }

  private createAnomalyTarget(
    placement: KitchenAssetPlacement,
    object: THREE.Group,
  ): AnomalyTarget {
    const interactionVolume = new THREE.Mesh(
      this.ownGeometry(new THREE.BoxGeometry(...placement.interactionSize)),
      this.requireMaterials().interaction,
    );
    interactionVolume.name = `INTERACT_${placement.targetId}`;
    interactionVolume.position.y = placement.interactionSize[1] / 2;
    interactionVolume.layers.set(RENDER_LAYERS.interaction);
    interactionVolume.renderOrder = 11;
    object.add(interactionVolume);
    const surfaceNames: string[] = [];
    object.traverse((candidate) => {
      const mesh = candidate as THREE.Mesh;
      if (mesh.isMesh && mesh.layers.isEnabled(RENDER_LAYERS.scene)) {
        surfaceNames.push(mesh.name);
      }
    });
    if (placement.targetId === 'breakfast-table') {
      this.createBreakfastTableDetails(object);
    }
    const variants = this.createAnomalyVariants(placement, surfaceNames);
    const collisionObjects = this.getCollisionObjects(placement);
    return {
      id: placement.targetId,
      nodeName: object.name,
      interactionNodeNames: [interactionVolume.name],
      allowedKinds: [...new Set(variants.map(({ kind }) => kind))],
      variants,
      weight: placement.colliderName === undefined ? 0.95 : 1.1,
      minimumDifficulty: 2,
      object,
      interactionVolume,
      interactionVolumes: [interactionVolume],
      dependentTargetIds: placement.dependentTargetIds ?? [],
      initialState: captureAnomalyTargetInitialState(object),
      collisionObjects,
      collisionInitialState: captureAnomalyCollisionObjectState(collisionObjects),
    };
  }

  private createAnomalyVariants(
    placement: KitchenAssetPlacement,
    surfaceNames: readonly string[],
  ): readonly PreparedAnomalyVariant[] {
    const variants: PreparedAnomalyVariant[] = [
      { id: 'hidden', kind: 'hide' },
      { id: 'appeared', kind: 'show' },
    ];

    if (KITCHEN_COLOR_ANOMALY_TARGET_ID_SET.has(placement.targetId)) {
      variants.push({
        id: 'color-warm',
        kind: 'color',
        nodeNames: surfaceNames,
        color: placement.anomalyColors[0],
      }, {
        id: 'color-cool',
        kind: 'color',
        nodeNames: surfaceNames,
        color: placement.anomalyColors[1],
      });
    }

    return variants;
  }

  private createBreakfastTableDetails(root: THREE.Object3D): void {
    const materials = this.requireMaterials();
    const setting = new THREE.Group();
    setting.name = 'DETAIL_Kitchen_BreakfastSetting';
    const northPlate = this.createCylinder(
      'DETAIL_Kitchen_BreakfastPlateNorth',
      0.17,
      0.17,
      0.024,
      [0, 0.63, -0.34],
      materials.porcelain,
    );
    const southPlate = this.createCylinder(
      'DETAIL_Kitchen_BreakfastPlateSouth',
      0.17,
      0.17,
      0.024,
      [0, 0.63, 0.34],
      materials.porcelain,
    );
    const eastPlate = this.createCylinder(
      'DETAIL_Kitchen_BreakfastPlateEast',
      0.17,
      0.17,
      0.024,
      [0.34, 0.63, 0],
      materials.porcelain,
    );
    const northToast = this.createBox(
      'DETAIL_Kitchen_ToastNorth',
      [0.18, 0.035, 0.13],
      [0, 0.66, -0.34],
      materials.bread,
    );
    northToast.rotation.y = 0.18;
    const southToast = this.createBox(
      'DETAIL_Kitchen_ToastSouth',
      [0.18, 0.035, 0.13],
      [0, 0.66, 0.34],
      materials.bread,
    );
    southToast.rotation.y = -0.24;
    const eastToast = this.createBox(
      'DETAIL_Kitchen_ToastEast',
      [0.18, 0.035, 0.13],
      [0.34, 0.66, 0],
      materials.bread,
    );
    eastToast.rotation.y = Math.PI / 2 + 0.12;
    const bowl = this.createCylinder(
      'DETAIL_Kitchen_FruitBowl',
      0.18,
      0.13,
      0.09,
      [0, 0.665, 0],
      materials.porcelain,
    );
    const northMug = this.createCylinder(
      'DETAIL_Kitchen_MugNorth',
      0.055,
      0.055,
      0.13,
      [0.22, 0.69, -0.36],
      materials.porcelain,
    );
    const southMug = this.createCylinder(
      'DETAIL_Kitchen_MugSouth',
      0.055,
      0.055,
      0.13,
      [-0.22, 0.69, 0.36],
      materials.porcelain,
    );
    const eastMug = this.createCylinder(
      'DETAIL_Kitchen_MugEast',
      0.055,
      0.055,
      0.13,
      [0.36, 0.69, 0.22],
      materials.porcelain,
    );
    setting.add(
      northPlate,
      southPlate,
      eastPlate,
      northToast,
      southToast,
      eastToast,
      bowl,
      this.createSphere('DETAIL_Kitchen_AppleRed', 0.06, [-0.06, 0.75, 0], materials.fruitRed),
      this.createSphere('DETAIL_Kitchen_AppleGreen', 0.055, [0.05, 0.75, -0.03], materials.fruitGreen),
      this.createSphere('DETAIL_Kitchen_Orange', 0.052, [0.04, 0.76, 0.07], materials.bread),
      northMug,
      southMug,
      eastMug,
      this.createMugHandle('DETAIL_Kitchen_MugHandleNorth', [0.265, 0.69, -0.36], materials.porcelain),
      this.createMugHandle('DETAIL_Kitchen_MugHandleSouth', [-0.175, 0.69, 0.36], materials.porcelain),
      this.createMugHandle('DETAIL_Kitchen_MugHandleEast', [0.405, 0.69, 0.22], materials.porcelain),
    );
    root.add(setting);
  }

  private createMugHandle(
    name: string,
    position: Vector3Tuple,
    material: THREE.Material,
  ): THREE.Mesh {
    const handle = new THREE.Mesh(
      this.ownGeometry(new THREE.TorusGeometry(0.042, 0.011, 8, 14)),
      material,
    );
    handle.name = name;
    handle.position.fromArray(position);
    handle.scale.x = 0.72;
    handle.castShadow = true;
    handle.receiveShadow = true;
    return handle;
  }

  private getCollisionObjects(
    placement: KitchenAssetPlacement,
  ): readonly THREE.Object3D[] {
    if (placement.colliderName === undefined) {
      return [];
    }
    const collider = this.getCollisionRoot().getObjectByName(
      placement.colliderName,
    );
    if (collider === undefined) {
      throw new Error(`Kitchen collider "${placement.colliderName}" is missing.`);
    }
    return [collider];
  }

  private createMaterials(): KitchenMaterials {
    const standard = (
      color: THREE.ColorRepresentation,
      roughness: number,
      metalness = 0,
    ) => this.ownMaterial(
      new THREE.MeshStandardMaterial({ color, roughness, metalness }),
    );
    const floor = standard('#ffffff', 0.88);
    floor.map = this.createFloorTexture();
    const ceiling = standard('#d8d4ca', 0.98);
    ceiling.side = THREE.DoubleSide;
    const glass = standard('#78999d', 0.28, 0.06);
    glass.transparent = true;
    glass.opacity = 0.68;
    glass.emissive.set('#17373a');
    glass.emissiveIntensity = 0.28;
    const neonGreen = standard('#294535', 0.38, 0.04);
    neonGreen.emissive.set('#4f9c69');
    neonGreen.emissiveIntensity = 1.65;
    const wall = standard('#968f84', 0.96);
    wall.map = this.ownTexture(
      createAgedPlasterTexture({
        name: 'TEXTURE_Kitchen_AgedPlaster',
        seed: 3_053,
      }),
    );
    return {
      wall,
      floor,
      ceiling,
      tile: standard('#c7c0b1', 0.78),
      trim: standard('#c8bca8', 0.84),
      door: standard('#503832', 0.8),
      metal: standard('#343b3d', 0.55, 0.2),
      glass,
      neonGreen,
      porcelain: standard('#ddd4c3', 0.72),
      bread: standard('#c99156', 0.88),
      fruitRed: standard('#9a4e42', 0.7),
      fruitGreen: standard('#71845d', 0.74),
      exitGlow: this.ownMaterial(new THREE.MeshBasicMaterial({
        color: '#83aaa5',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      })),
      collision: this.ownMaterial(new THREE.MeshBasicMaterial({
        color: '#d9665b',
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        wireframe: true,
      })),
      interaction: this.ownMaterial(new THREE.MeshBasicMaterial({
        color: '#f3c969',
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        wireframe: true,
      })),
    };
  }

  private createFloorTexture(): THREE.DataTexture {
    return this.ownTexture(
      createStoneTileFloorTexture({
        name: 'TEXTURE_Kitchen_WornTile',
        seed: 3_053,
        repeat: [4, 4],
        tileColors: ['#a99a89', '#9c8e7e', '#948575', '#b0a08e'],
        groutColor: '#625a52',
      }),
    );
  }

  private createArchitecture(): void {
    const materials = this.requireMaterials();
    const root = new THREE.Group();
    root.name = 'Kitchen_Architecture';
    root.add(
      this.createBox('ARCH_KitchenFloor', [8.4, 0.03, 8.4], [0, -0.015, 0], materials.floor),
      this.createBox('ARCH_KitchenCeiling', [8.4, 0.04, 8.4], [0, ROOM_HEIGHT, 0], materials.ceiling),
    );
    this.createWalls(root);
    this.createDoors(root);
    this.createWindowsAndDetails(root);
    this.getVisualRoot().add(root);
  }

  private createWalls(root: THREE.Object3D): void {
    const entranceLeft = ENTRANCE_CENTER_X - DOOR_WIDTH / 2;
    const entranceRight = ENTRANCE_CENTER_X + DOOR_WIDTH / 2;
    const exitLeft = EXIT_CENTER_X - DOOR_WIDTH / 2;
    const exitRight = EXIT_CENTER_X + DOOR_WIDTH / 2;
    const wallParts: readonly [string, Vector3Tuple, Vector3Tuple][] = [
      ['SouthWest', [entranceLeft + ROOM_HALF_SIZE, ROOM_HEIGHT, WALL_THICKNESS], [(-ROOM_HALF_SIZE + entranceLeft) / 2, ROOM_HEIGHT / 2, SOUTH_Z]],
      ['SouthEast', [ROOM_HALF_SIZE - entranceRight, ROOM_HEIGHT, WALL_THICKNESS], [(entranceRight + ROOM_HALF_SIZE) / 2, ROOM_HEIGHT / 2, SOUTH_Z]],
      ['NorthWest', [exitLeft + ROOM_HALF_SIZE, ROOM_HEIGHT, WALL_THICKNESS], [(-ROOM_HALF_SIZE + exitLeft) / 2, ROOM_HEIGHT / 2, NORTH_Z]],
      ['NorthEast', [ROOM_HALF_SIZE - exitRight, ROOM_HEIGHT, WALL_THICKNESS], [(exitRight + ROOM_HALF_SIZE) / 2, ROOM_HEIGHT / 2, NORTH_Z]],
      ['West', [WALL_THICKNESS, ROOM_HEIGHT, 8.4], [-ROOM_HALF_SIZE, ROOM_HEIGHT / 2, 0]],
      ['East', [WALL_THICKNESS, ROOM_HEIGHT, 8.4], [ROOM_HALF_SIZE, ROOM_HEIGHT / 2, 0]],
    ];
    for (const [name, size, position] of wallParts) {
      root.add(this.createBox(`WALL_Kitchen_${name}`, size, position, this.requireMaterials().wall));
    }
    root.add(
      this.createBox('WALL_Kitchen_EntranceLintel', [DOOR_WIDTH, ROOM_HEIGHT - DOOR_HEIGHT, WALL_THICKNESS], [ENTRANCE_CENTER_X, DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT) / 2, SOUTH_Z], this.requireMaterials().wall),
      this.createBox('WALL_Kitchen_ExitLintel', [DOOR_WIDTH, ROOM_HEIGHT - DOOR_HEIGHT, WALL_THICKNESS], [EXIT_CENTER_X, DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT) / 2, NORTH_Z], this.requireMaterials().wall),
      this.createBox('TILE_Kitchen_NorthBacksplash', [5.7, 0.7, 0.035], [-0.8, 1.28, NORTH_Z + 0.105], this.requireMaterials().tile),
      this.createBox('TILE_Kitchen_WestBacksplash', [0.035, 0.7, 2.3], [-ROOM_HALF_SIZE + 0.105, 1.28, -1.3], this.requireMaterials().tile),
    );
    for (const z of [-3.95, -3.6, -3.25]) {
      root.add(this.createBox(`TILE_Kitchen_NorthLine_${String(z)}`, [5.7, 0.018, 0.018], [-0.8, 1.28 + (z + 3.6), NORTH_Z + 0.082], this.requireMaterials().trim));
    }
  }

  private createDoors(root: THREE.Object3D): void {
    const materials = this.requireMaterials();
    this.addDoorFrame(root, 'Entrance', ENTRANCE_CENTER_X, SOUTH_Z, false);
    root.add(this.createBox('DOOR_Kitchen_Entrance', [DOOR_WIDTH - 0.08, DOOR_HEIGHT - 0.06, 0.09], [ENTRANCE_CENTER_X, (DOOR_HEIGHT - 0.06) / 2, SOUTH_Z - 0.08], materials.door));
    this.addDoorFrame(root, 'Exit', EXIT_CENTER_X, NORTH_Z, true);
    const pivot = new THREE.Group();
    pivot.name = 'DOOR_KitchenExit_Pivot';
    pivot.position.set(EXIT_CENTER_X - DOOR_WIDTH / 2 + 0.04, 0, NORTH_Z + 0.08);
    pivot.add(
      this.createBox('DOOR_Kitchen_Exit', [DOOR_WIDTH - 0.08, DOOR_HEIGHT - 0.06, 0.09], [(DOOR_WIDTH - 0.08) / 2, (DOOR_HEIGHT - 0.06) / 2, 0], materials.door),
      this.createSphere('DOOR_Kitchen_ExitHandle', 0.055, [DOOR_WIDTH - 0.23, 1.02, 0.065], materials.metal),
    );
    root.add(pivot);
    this.exitDoor = pivot;
    const portal = new THREE.Group();
    portal.name = 'EXIT_Kitchen_Portal';
    portal.visible = false;
    const glow = new THREE.Mesh(
      this.ownGeometry(new THREE.PlaneGeometry(DOOR_WIDTH * 0.82, DOOR_HEIGHT * 0.9)),
      materials.exitGlow,
    );
    glow.position.set(EXIT_CENTER_X, DOOR_HEIGHT * 0.46, NORTH_Z - 0.055);
    const light = new THREE.PointLight('#7aaaa5', 0, 2.6, 2);
    light.position.set(EXIT_CENTER_X, 1.2, NORTH_Z - 0.2);
    portal.add(glow, light);
    root.add(portal);
    this.exitPortal = portal;
    this.exitPortalLight = light;
  }

  private addDoorFrame(
    root: THREE.Object3D,
    name: string,
    x: number,
    z: number,
    north: boolean,
  ): void {
    const frame = 0.09;
    const depth = 0.26;
    const zOffset = north ? z + 0.02 : z - 0.02;
    root.add(
      this.createBox(`FRAME_Kitchen_${name}_Left`, [frame, DOOR_HEIGHT + 0.08, depth], [x - DOOR_WIDTH / 2, DOOR_HEIGHT / 2, zOffset], this.requireMaterials().trim),
      this.createBox(`FRAME_Kitchen_${name}_Right`, [frame, DOOR_HEIGHT + 0.08, depth], [x + DOOR_WIDTH / 2, DOOR_HEIGHT / 2, zOffset], this.requireMaterials().trim),
      this.createBox(`FRAME_Kitchen_${name}_Top`, [DOOR_WIDTH + frame * 2, frame, depth], [x, DOOR_HEIGHT, zOffset], this.requireMaterials().trim),
    );
  }

  private createWindowsAndDetails(root: THREE.Object3D): void {
    const materials = this.requireMaterials();
    root.add(
      this.createBox('WINDOW_Kitchen_East', [0.03, 1.25, 2.5], [ROOM_HALF_SIZE - 0.1, 1.78, -0.15], materials.glass),
      this.createBox('WINDOW_Kitchen_EastTop', [0.08, 0.07, 2.68], [ROOM_HALF_SIZE - 0.12, 2.43, -0.15], materials.trim),
      this.createBox('WINDOW_Kitchen_EastBottom', [0.08, 0.07, 2.68], [ROOM_HALF_SIZE - 0.12, 1.12, -0.15], materials.trim),
      this.createBox('WINDOW_Kitchen_EastCenter', [0.08, 1.32, 0.06], [ROOM_HALF_SIZE - 0.12, 1.78, -0.15], materials.trim),
      this.createBox('ARCH_Kitchen_WindowShelf', [0.42, 0.08, 2.85], [ROOM_HALF_SIZE - 0.23, 1.02, -0.15], materials.trim),
      this.createBox('ARCH_Kitchen_PantryDivider', [1.1, 2.45, 0.12], [-3.65, 1.225, 0.15], materials.trim),
      this.createBox('ARCH_Kitchen_PantryHeader', [1.1, 0.18, 1.25], [-3.65, 2.45, 0.72], materials.trim),
      this.createBox('NEON_Kitchen_SouthWest', [1.15, 0.045, 0.045], [-3.45, 2.48, SOUTH_Z - 0.12], materials.neonGreen),
      this.createBox('NEON_Kitchen_NorthEast', [0.95, 0.045, 0.045], [3.55, 2.5, NORTH_Z + 0.12], materials.neonGreen),
      this.createBox('NEON_Kitchen_EastCorner', [0.045, 0.045, 1.05], [ROOM_HALF_SIZE - 0.12, 2.34, 3.48], materials.neonGreen),
    );
  }

  private createLighting(): void {
    const hemisphere = new THREE.HemisphereLight('#94a1a5', '#3b2d26', 0.4);
    hemisphere.name = 'LIGHT_Kitchen_Ambient';
    const ambient = new THREE.AmbientLight('#c8c0b3', 0.12);
    ambient.name = 'LIGHT_Kitchen_Bounce';
    const key = new THREE.SpotLight('#efd0a4', 6.4, 10, Math.PI / 3.1, 0.48, 1.15);
    key.name = 'LIGHT_Kitchen_Key';
    key.position.set(-0.35, 2.96, 0.15);
    key.target.position.set(-0.1, 0.45, -0.5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.3;
    key.shadow.camera.far = 11;
    key.shadow.bias = -0.0002;
    key.shadow.normalBias = 0.026;
    const worktop = new THREE.PointLight('#dfbd91', 0.42, 5, 1.6);
    worktop.name = 'LIGHT_Kitchen_Worktop';
    worktop.position.set(-1.0, 1.75, -3.0);
    const window = new THREE.PointLight('#829da6', 0.36, 5.5, 1.5);
    window.name = 'LIGHT_Kitchen_Window';
    window.position.set(3.55, 1.9, -0.15);
    const breakfast = new THREE.PointLight('#d5b185', 0.36, 4.8, 1.7);
    breakfast.name = 'LIGHT_Kitchen_Breakfast';
    breakfast.position.set(2.6, 2.2, 1.65);
    const neonSouthWest = new THREE.PointLight('#5d9b70', 0.28, 3.4, 2);
    neonSouthWest.name = 'LIGHT_Kitchen_NeonSouthWest';
    neonSouthWest.position.set(-3.45, 2.25, 3.65);
    const neonNorthEast = new THREE.PointLight('#4f8f68', 0.3, 3.2, 2);
    neonNorthEast.name = 'LIGHT_Kitchen_NeonNorthEast';
    neonNorthEast.position.set(3.55, 2.25, -3.62);
    const neonEastCorner = new THREE.PointLight('#568f67', 0.24, 2.8, 2);
    neonEastCorner.name = 'LIGHT_Kitchen_NeonEastCorner';
    neonEastCorner.position.set(3.72, 2.1, 3.45);
    this.getVisualRoot().add(
      hemisphere,
      ambient,
      key,
      key.target,
      worktop,
      window,
      breakfast,
      neonSouthWest,
      neonNorthEast,
      neonEastCorner,
    );
  }

  private createCollisions(): void {
    this.addCollisionFloor();
    this.addCollisionBox('COLLIDER_Kitchen_Ceiling', [8.4, 0.12, 8.4], [0, ROOM_HEIGHT + 0.06, 0]);
    const entranceLeft = ENTRANCE_CENTER_X - DOOR_WIDTH / 2;
    const entranceRight = ENTRANCE_CENTER_X + DOOR_WIDTH / 2;
    const exitLeft = EXIT_CENTER_X - DOOR_WIDTH / 2;
    const exitRight = EXIT_CENTER_X + DOOR_WIDTH / 2;
    this.addCollisionBox('COLLIDER_Kitchen_WallSouthWest', [entranceLeft + ROOM_HALF_SIZE, ROOM_HEIGHT, WALL_THICKNESS], [(-ROOM_HALF_SIZE + entranceLeft) / 2, ROOM_HEIGHT / 2, SOUTH_Z]);
    this.addCollisionBox('COLLIDER_Kitchen_WallSouthEast', [ROOM_HALF_SIZE - entranceRight, ROOM_HEIGHT, WALL_THICKNESS], [(entranceRight + ROOM_HALF_SIZE) / 2, ROOM_HEIGHT / 2, SOUTH_Z]);
    this.addCollisionBox('COLLIDER_Kitchen_WallNorthWest', [exitLeft + ROOM_HALF_SIZE, ROOM_HEIGHT, WALL_THICKNESS], [(-ROOM_HALF_SIZE + exitLeft) / 2, ROOM_HEIGHT / 2, NORTH_Z]);
    this.addCollisionBox('COLLIDER_Kitchen_WallNorthEast', [ROOM_HALF_SIZE - exitRight, ROOM_HEIGHT, WALL_THICKNESS], [(exitRight + ROOM_HALF_SIZE) / 2, ROOM_HEIGHT / 2, NORTH_Z]);
    this.addCollisionBox('COLLIDER_Kitchen_WallWest', [WALL_THICKNESS, ROOM_HEIGHT, 8.4], [-ROOM_HALF_SIZE, ROOM_HEIGHT / 2, 0]);
    this.addCollisionBox('COLLIDER_Kitchen_WallEast', [WALL_THICKNESS, ROOM_HEIGHT, 8.4], [ROOM_HALF_SIZE, ROOM_HEIGHT / 2, 0]);
    this.addCollisionBox('COLLIDER_Kitchen_EntranceLintel', [DOOR_WIDTH, ROOM_HEIGHT - DOOR_HEIGHT, WALL_THICKNESS], [ENTRANCE_CENTER_X, DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT) / 2, SOUTH_Z]);
    this.addCollisionBox('COLLIDER_Kitchen_EntranceDoor', [DOOR_WIDTH, DOOR_HEIGHT, WALL_THICKNESS], [ENTRANCE_CENTER_X, DOOR_HEIGHT / 2, SOUTH_Z]);
    this.addCollisionBox('COLLIDER_Kitchen_ExitLintel', [DOOR_WIDTH, ROOM_HEIGHT - DOOR_HEIGHT, WALL_THICKNESS], [EXIT_CENTER_X, DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT) / 2, NORTH_Z]);
    this.exitDoorCollider = this.addCollisionBox('COLLIDER_Kitchen_ExitDoor', [DOOR_WIDTH, DOOR_HEIGHT, WALL_THICKNESS], [EXIT_CENTER_X, DOOR_HEIGHT / 2, NORTH_Z]);
    for (const placement of KITCHEN_ASSET_PLACEMENTS) {
      if (placement.colliderName === undefined || placement.colliderSize === undefined) {
        continue;
      }
      this.addCollisionBox(
        placement.colliderName,
        [
          placement.colliderSize[0] * (placement.scale?.[0] ?? 1),
          placement.colliderSize[1] * (placement.scale?.[1] ?? 1),
          placement.colliderSize[2] * (placement.scale?.[2] ?? 1),
        ],
        [
          placement.position[0],
          placement.colliderSize[1] * (placement.scale?.[1] ?? 1) / 2,
          placement.position[2],
        ],
      );
    }
    this.addCollisionBox(
      'COLLIDER_Kitchen_IslandCopy',
      [1.24, 1.0, 1.74],
      [-0.22, 0.5, 0.47],
    );
    this.addCollisionBox('COLLIDER_Kitchen_PantryDivider', [1.1, 2.45, 0.12], [-3.65, 1.225, 0.15]);
  }

  private addCollisionFloor(): void {
    const geometry = this.ownGeometry(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([-20, 0, -20, 0, 0, 20, 20, 0, -20], 3));
    geometry.computeVertexNormals();
    const floor = new THREE.Mesh(geometry, this.requireMaterials().collision);
    floor.name = 'COLLIDER_KitchenFloor';
    floor.visible = false;
    this.getCollisionRoot().add(floor);
    if (import.meta.env.DEV) {
      const debugFloor = this.createBox('DEBUG_COLLIDER_KitchenFloor', [8.4, 0.025, 8.4], [0, -0.025, 0], this.requireMaterials().collision);
      debugFloor.layers.set(RENDER_LAYERS.debug);
      debugFloor.renderOrder = 9;
      this.getCollisionRoot().add(debugFloor);
    }
  }

  private addCollisionBox(name: string, size: Vector3Tuple, position: Vector3Tuple): THREE.Mesh {
    const mesh = new THREE.Mesh(
      this.ownGeometry(new THREE.BoxGeometry(...size)),
      this.requireMaterials().collision,
    );
    mesh.name = name;
    mesh.position.fromArray(position);
    mesh.renderOrder = 9;
    this.getCollisionRoot().add(mesh);
    return mesh;
  }

  private createBox(
    name: string,
    size: Vector3Tuple,
    position: Vector3Tuple,
    material: THREE.Material,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(this.ownGeometry(new THREE.BoxGeometry(...size)), material);
    mesh.name = name;
    mesh.position.fromArray(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private createSphere(
    name: string,
    radius: number,
    position: Vector3Tuple,
    material: THREE.Material,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(
      this.ownGeometry(new THREE.SphereGeometry(radius, 16, 10)),
      material,
    );
    mesh.name = name;
    mesh.position.fromArray(position);
    mesh.castShadow = true;
    return mesh;
  }

  private createCylinder(
    name: string,
    radiusTop: number,
    radiusBottom: number,
    height: number,
    position: Vector3Tuple,
    material: THREE.Material,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(
      this.ownGeometry(
        new THREE.CylinderGeometry(
          radiusTop,
          radiusBottom,
          height,
          18,
        ),
      ),
      material,
    );
    mesh.name = name;
    mesh.position.fromArray(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private requireMaterials(): KitchenMaterials {
    if (this.materials === null) {
      throw new Error('Kitchen materials are unavailable.');
    }
    return this.materials;
  }
}
