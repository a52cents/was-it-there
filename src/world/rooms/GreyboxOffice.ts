import * as THREE from 'three';
import { OFFICE_ASSET_CATALOG } from '../../content/rooms/OfficeAssetCatalog';
import { STORY_LOOP_ANCHOR } from '../../content/story/StoryLoopAnchor';
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
import { createWoodPlankFloorTexture } from '../textures/ProceduralFloorTexture';
import type { PlayableRoom } from './PlayableRoom';

type Vector2Tuple = readonly [number, number];
type Vector3Tuple = readonly [number, number, number];
type QuaternionTuple = readonly [number, number, number, number];
type OfficeAssetKey = keyof typeof OFFICE_ASSET_CATALOG;
type OfficeTargetId =
  | 'archive-box'
  | 'bay-armchair'
  | 'bay-plant'
  | 'bay-rug'
  | 'bookcase'
  | 'books'
  | 'desk'
  | 'desk-lamp'
  | 'desk-photo'
  | 'drawer-cabinet'
  | 'filing-cabinet'
  | 'frame-east'
  | 'frame-west'
  | 'office-chair'
  | 'office-phone'
  | 'radio'
  | 'speaker'
  | 'wall-clock';

interface OfficeMaterials {
  readonly wall: THREE.MeshStandardMaterial;
  readonly panel: THREE.MeshStandardMaterial;
  readonly floor: THREE.MeshStandardMaterial;
  readonly ceiling: THREE.MeshStandardMaterial;
  readonly trim: THREE.MeshStandardMaterial;
  readonly door: THREE.MeshStandardMaterial;
  readonly darkMetal: THREE.MeshStandardMaterial;
  readonly lampGlass: THREE.MeshStandardMaterial;
  readonly window: THREE.MeshStandardMaterial;
  readonly exitGlow: THREE.MeshBasicMaterial;
  readonly collision: THREE.MeshBasicMaterial;
  readonly interaction: THREE.MeshBasicMaterial;
}

interface OfficeAssetPlacement {
  readonly key: OfficeAssetKey;
  readonly targetId: OfficeTargetId;
  readonly objectName: string;
  readonly position: Vector3Tuple;
  readonly quaternion?: QuaternionTuple;
  readonly scale?: Vector3Tuple;
  readonly rotationY: number;
  readonly maximumSize: Vector3Tuple;
  readonly verticalAnchor: 'center' | 'ground';
  readonly interactionSize: Vector3Tuple;
  readonly interactionPosition: Vector3Tuple;
  readonly tint: string;
  readonly anomalyColors: readonly [
    { readonly id: string; readonly color: string },
    { readonly id: string; readonly color: string },
  ];
  readonly rotations?: 'floor' | 'wall-x' | 'wall-z';
  readonly colliderName?: string;
  readonly dependentTargetIds?: readonly OfficeTargetId[];
}

const ROOM_HEIGHT = 3.1;
const WALL_THICKNESS = 0.18;
const DOOR_HEIGHT = 2.2;
const DOOR_WIDTH = 1.1;
const ENTRANCE_CENTER_X = -2.7;
const SOUTH_Z = 3.6;
const EAST_X = 4.2;
const NORTH_Z = -3.2;
const BAY_NORTH_Z = -4.8;
const EXIT_CENTER_Z = 1.2;

const OFFICE_FOOTPRINT: readonly Vector2Tuple[] = [
  [-4.2, SOUTH_Z],
  [EAST_X, SOUTH_Z],
  [EAST_X, NORTH_Z],
  [2.2, NORTH_Z],
  [1.4, BAY_NORTH_Z],
  [-1.4, BAY_NORTH_Z],
  [-2.2, NORTH_Z],
  [-4.2, NORTH_Z],
];

const OFFICE_ASSET_PLACEMENTS: readonly OfficeAssetPlacement[] = [
  {
    key: 'desk',
    targetId: 'desk',
    objectName: 'ANOM_Office_Desk',
    position: [0.25, 0, -0.35],
    quaternion: [0, 1, 0, 0],
    scale: [1.15, 1.15, 1.15],
    rotationY: 0,
    maximumSize: [2.25, 0.82, 0.9],
    verticalAnchor: 'ground',
    interactionSize: [1.26, 0.9, 0.59],
    interactionPosition: [0, 0.41, 0],
    tint: '#b49370',
    anomalyColors: [
      { id: 'desk-blue', color: '#557486' },
      { id: 'desk-green', color: '#66785d' },
    ],
    colliderName: 'COLLIDER_OfficeDesk',
    dependentTargetIds: [
      'desk-lamp',
      'office-phone',
      'books',
      'desk-photo',
    ],
  },
  {
    key: 'officeChair',
    targetId: 'office-chair',
    objectName: 'ANOM_Office_Chair',
    position: [0.25, 0, -1.05],
    quaternion: [0, 1, 0, 0],
    scale: [1.25, 1.25, 1.25],
    rotationY: Math.PI,
    maximumSize: [0.84, 1.05, 0.84],
    verticalAnchor: 'ground',
    interactionSize: [0.96, 1.16, 0.96],
    interactionPosition: [0, 0.52, 0],
    tint: '#8c7767',
    anomalyColors: [
      { id: 'chair-red', color: '#875956' },
      { id: 'chair-blue', color: '#536f82' },
    ],
    rotations: 'floor',
  },
  {
    key: 'deskLamp',
    targetId: 'desk-lamp',
    objectName: 'ANOM_Office_DeskLamp',
    position: [-0.25, 0.95, -0.2],
    rotationY: 0.35,
    maximumSize: [0.38, 0.5, 0.38],
    verticalAnchor: 'ground',
    interactionSize: [0.5, 0.62, 0.5],
    interactionPosition: [0, 0.25, 0],
    tint: '#b7a986',
    anomalyColors: [
      { id: 'lamp-green', color: '#607768' },
      { id: 'lamp-purple', color: '#796589' },
    ],
    rotations: 'floor',
  },
  {
    key: 'officePhone',
    targetId: 'office-phone',
    objectName: 'ANOM_Office_Phone',
    position: [0.78, 0.93, -0.2],
    scale: [1.15, 1.15, 1.15],
    rotationY: Math.PI,
    maximumSize: [0.38, 0.2, 0.34],
    verticalAnchor: 'ground',
    interactionSize: [0.5, 0.32, 0.46],
    interactionPosition: [0, 0.1, 0],
    tint: '#aaa69e',
    anomalyColors: [
      { id: 'phone-red', color: '#925957' },
      { id: 'phone-green', color: '#5f796b' },
    ],
    rotations: 'floor',
  },
  {
    key: 'books',
    targetId: 'books',
    objectName: 'ANOM_Office_Books',
    position: [0.3, 0.94, -0.2],
    rotationY: -0.16,
    maximumSize: [0.42, 0.25, 0.32],
    verticalAnchor: 'ground',
    interactionSize: [0.54, 0.36, 0.44],
    interactionPosition: [0, 0.12, 0],
    tint: '#b6a883',
    anomalyColors: [
      { id: 'books-yellow', color: '#b3924d' },
      { id: 'books-purple', color: '#735f87' },
    ],
    rotations: 'floor',
  },
  {
    key: 'frameSmall',
    targetId: 'desk-photo',
    objectName: 'ANOM_Office_DeskPhoto',
    position: [0.12, 0.97, -0.17],
    rotationY: Math.PI,
    maximumSize: [0.28, 0.34, 0.18],
    verticalAnchor: 'ground',
    interactionSize: [0.46, 0.58, 0.3],
    interactionPosition: [0, 0.19, 0.12],
    tint: '#bda988',
    anomalyColors: [
      { id: 'photo-blue', color: '#58768a' },
      { id: 'photo-red', color: '#915c58' },
    ],
    rotations: 'floor',
  },
  {
    key: 'filingCabinet',
    targetId: 'filing-cabinet',
    objectName: 'ANOM_Office_FilingCabinet',
    position: [3.55, 0, -2.24],
    rotationY: Math.PI / 2,
    maximumSize: [0.68, 2.05, 1.05],
    verticalAnchor: 'ground',
    interactionSize: [0.8, 2.16, 1.17],
    interactionPosition: [0, 1.02, 0],
    tint: '#98968d',
    anomalyColors: [
      { id: 'filing-blue', color: '#566f80' },
      { id: 'filing-rust', color: '#8b6454' },
    ],
    colliderName: 'COLLIDER_OfficeFilingCabinet',
  },
  {
    key: 'cabinet',
    targetId: 'drawer-cabinet',
    objectName: 'ANOM_Office_DrawerCabinet',
    position: [3.48, 0, -0.72],
    quaternion: [0, -1, 0, 0],
    rotationY: Math.PI / 2,
    maximumSize: [0.68, 1.04, 0.72],
    verticalAnchor: 'ground',
    interactionSize: [0.8, 1.16, 0.84],
    interactionPosition: [0, 0.52, 0],
    tint: '#ac9478',
    anomalyColors: [
      { id: 'drawers-green', color: '#65775f' },
      { id: 'drawers-purple', color: '#776484' },
    ],
    colliderName: 'COLLIDER_OfficeDrawerCabinet',
  },
  {
    key: 'bookcase',
    targetId: 'bookcase',
    objectName: 'ANOM_Office_Bookcase',
    position: [-3.62, 0, -1.38],
    rotationY: Math.PI / 2,
    maximumSize: [0.62, 1.36, 1.72],
    verticalAnchor: 'ground',
    interactionSize: [0.74, 1.48, 1.84],
    interactionPosition: [0, 0.68, 0],
    tint: '#a98d70',
    anomalyColors: [
      { id: 'bookcase-blue', color: '#587184' },
      { id: 'bookcase-red', color: '#8d5c57' },
    ],
    colliderName: 'COLLIDER_OfficeBookcase',
    dependentTargetIds: ['radio', 'speaker'],
  },
  {
    key: 'radio',
    targetId: 'radio',
    objectName: 'ANOM_Office_Radio',
    position: [-3.58, 0.9, -1.68],
    rotationY: Math.PI / 2,
    maximumSize: [0.28, 0.3, 0.5],
    verticalAnchor: 'ground',
    interactionSize: [0.4, 0.42, 0.62],
    interactionPosition: [0, 0.15, 0],
    tint: '#aaa28f',
    anomalyColors: [
      { id: 'radio-yellow', color: '#aa8b4f' },
      { id: 'radio-blue', color: '#526f83' },
    ],
    rotations: 'floor',
  },
  {
    key: 'speaker',
    targetId: 'speaker',
    objectName: 'ANOM_Office_Speaker',
    position: [-3.58, 0.9, -1.15],
    rotationY: Math.PI / 2,
    maximumSize: [0.24, 0.32, 0.26],
    verticalAnchor: 'ground',
    interactionSize: [0.36, 0.44, 0.38],
    interactionPosition: [0, 0.16, 0],
    tint: '#9d9e99',
    anomalyColors: [
      { id: 'speaker-orange', color: '#a06f50' },
      { id: 'speaker-purple', color: '#725f81' },
    ],
    rotations: 'floor',
  },
  {
    key: 'armchair',
    targetId: 'bay-armchair',
    objectName: 'ANOM_Office_BayArmchair',
    position: [0.2, 0, 1.45],
    quaternion: [0, 1, 0, 0],
    rotationY: 0,
    maximumSize: [1.02, 1.05, 1.02],
    verticalAnchor: 'ground',
    interactionSize: [1.14, 1.16, 1.14],
    interactionPosition: [0, 0.52, 0],
    tint: '#9e806d',
    anomalyColors: [
      { id: 'armchair-green', color: '#61745f' },
      { id: 'armchair-blue', color: '#526f83' },
    ],
    rotations: 'floor',
    colliderName: 'COLLIDER_OfficeBayArmchair',
  },
  {
    key: 'rug',
    targetId: 'bay-rug',
    objectName: 'ANOM_Office_BayRug',
    position: [0, 0.012, -2.55],
    rotationY: 0,
    maximumSize: [2.5, 0.05, 1.75],
    verticalAnchor: 'ground',
    interactionSize: [2.62, 0.16, 1.87],
    interactionPosition: [0, 0.05, 0],
    tint: '#9d7967',
    anomalyColors: [
      { id: 'rug-blue', color: '#55778a' },
      { id: 'rug-green', color: '#64785f' },
    ],
    rotations: 'floor',
  },
  {
    key: 'plant',
    targetId: 'bay-plant',
    objectName: 'ANOM_Office_BayPlant',
    position: [-1.5, 0, -4.05],
    rotationY: 0.25,
    maximumSize: [0.72, 1.15, 0.72],
    verticalAnchor: 'ground',
    interactionSize: [0.84, 1.27, 0.84],
    interactionPosition: [0, 0.57, 0],
    tint: '#9d9d7d',
    anomalyColors: [
      { id: 'plant-purple', color: '#766487' },
      { id: 'plant-orange', color: '#9d6b4d' },
    ],
  },
  {
    key: 'frameLarge',
    targetId: 'frame-west',
    objectName: 'ANOM_Office_FrameWest',
    position: [-4.08, 1.72, 0.92],
    rotationY: Math.PI / 2,
    maximumSize: [0.16, 0.82, 0.66],
    verticalAnchor: 'center',
    interactionSize: [0.28, 0.94, 0.78],
    interactionPosition: [0, 0, 0],
    tint: '#b9a587',
    anomalyColors: [
      { id: 'frame-west-red', color: '#8f5a56' },
      { id: 'frame-west-green', color: '#627661' },
    ],
    rotations: 'wall-x',
  },
  {
    key: 'frameSmall',
    targetId: 'frame-east',
    objectName: 'ANOM_Office_FrameEast',
    position: [4.08, 1.55, -0.08],
    rotationY: -Math.PI / 2,
    maximumSize: [0.16, 0.62, 0.48],
    verticalAnchor: 'center',
    interactionSize: [0.28, 0.74, 0.6],
    interactionPosition: [0, 0, 0],
    tint: '#bca88a',
    anomalyColors: [
      { id: 'frame-east-blue', color: '#55758a' },
      { id: 'frame-east-purple', color: '#756183' },
    ],
    rotations: 'wall-x',
  },
  {
    key: 'wallClock',
    targetId: 'wall-clock',
    objectName: 'ANOM_Office_WallClock',
    position: [-4.08, 1.86, -0.52],
    quaternion: [0, -Math.SQRT1_2, 0, Math.SQRT1_2],
    scale: [4.2, 4.2, 4.2],
    rotationY: Math.PI / 2,
    maximumSize: [0.16, 0.64, 0.64],
    verticalAnchor: 'center',
    interactionSize: [0.28, 0.76, 0.76],
    interactionPosition: [0, 0, 0],
    tint: '#aaa38f',
    anomalyColors: [
      { id: 'clock-red', color: '#8e5d58' },
      { id: 'clock-blue', color: '#567487' },
    ],
  },
  {
    key: 'parcel',
    targetId: 'archive-box',
    objectName: 'ANOM_Office_ArchiveBox',
    position: [3.55, 0, 2.8],
    rotationY: -0.16,
    maximumSize: [0.62, 0.52, 0.62],
    verticalAnchor: 'ground',
    interactionSize: [0.74, 0.64, 0.74],
    interactionPosition: [0, 0.26, 0],
    tint: '#ad8e68',
    anomalyColors: [
      { id: 'box-green', color: '#68785e' },
      { id: 'box-blue', color: '#587385' },
    ],
    rotations: 'floor',
  },
] as const;

export const OFFICE_EXIT_THRESHOLD = {
  x: EAST_X + 0.4,
  minimumZ: EXIT_CENTER_Z - DOOR_WIDTH / 2,
  maximumZ: EXIT_CENTER_Z + DOOR_WIDTH / 2,
} as const;

export class GreyboxOffice extends RoomRuntime implements PlayableRoom {
  public readonly definition: RoomDefinition = {
    id: 'office',
    displayName: 'Office',
    observationDurationMs: 15_000,
    searchDurationMs: 30_000,
    anomalyCount: { min: 1, max: 2 },
    playerSpawn: {
      position: [ENTRANCE_CENTER_X, 0, 2.85],
      yaw: 0,
      pitch: 0,
    },
  };

  private readonly anomalyTargetRegistry = new AnomalyTargetRegistry();
  private readonly assetLeases: GlbAssetLease[] = [];
  private materials: OfficeMaterials | null = null;
  private exitDoor: THREE.Object3D | null = null;
  private exitDoorCollider: THREE.Mesh | null = null;
  private exitPortal: THREE.Group | null = null;
  private exitPortalLight: THREE.PointLight | null = null;
  private assetManager: AssetManager | null = null;
  private assetLoadPromise: Promise<void> | null = null;
  private assetsLoaded = false;
  private buildRevision = 0;

  public constructor() {
    super('ROOM_Office_VisualRoot', 'COLLIDER_Office_Root');
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
    return OFFICE_EXIT_THRESHOLD;
  }

  public isAssetsLoaded(): boolean {
    return this.assetsLoaded;
  }

  public getLoadedAssetIds(): readonly string[] {
    return this.assetLeases.map((lease) => lease.assetId);
  }

  public async loadAssets(assetManager?: AssetManager): Promise<void> {
    await this.loadOfficeAssets(assetManager);
    const manager = this.assetManager;

    if (manager === null) {
      throw new Error('The office AssetManager is unavailable.');
    }

    await this.loadHouseShellAssets(manager, 'office');
  }

  private async loadOfficeAssets(assetManager?: AssetManager): Promise<void> {
    if (!this.isMounted()) {
      throw new Error('The office must be mounted before loading assets.');
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
      throw new Error('The office AssetManager is unavailable.');
    }

    const revision = this.buildRevision;
    const loadPromise = this.performAssetLoad(
      this.assetManager,
      revision,
    );
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
      throw new Error('The office exit-door collider is unavailable.');
    }

    const collisionRoot = this.getCollisionRoot();
    const currentlyEnabled = collider.parent === collisionRoot;

    if (enabled === currentlyEnabled) {
      return;
    }

    if (enabled) {
      collisionRoot.add(collider);
    } else {
      collider.removeFromParent();
    }

    if (rebuildCollision) {
      this.rebuildWorldCollision();
    }
  }

  public setExitPortalProgress(progress: number): void {
    const portal = this.exitPortal;
    const light = this.exitPortalLight;
    const materials = this.materials;

    if (portal === null || light === null || materials === null) {
      throw new Error('The office exit portal is unavailable.');
    }

    const safeProgress = Number.isFinite(progress)
      ? THREE.MathUtils.clamp(progress, 0, 1)
      : 0;
    portal.visible = safeProgress > 0;
    materials.exitGlow.opacity = safeProgress * 0.82;
    light.intensity = safeProgress * 2.3;
  }

  protected buildRoom(): void {
    this.buildRevision += 1;
    this.materials = this.createMaterials();
    this.createArchitecture();
    this.createLighting();
    this.createCollisions();
  }

  protected override onRoomReleased(): void {
    for (const lease of this.assetLeases.splice(0)) {
      lease.release();
    }

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
      OFFICE_ASSET_PLACEMENTS.map((placement) =>
        assetManager.acquire(OFFICE_ASSET_CATALOG[placement.key]),
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
        `Office assets could not be loaded: ${this.getErrorMessage(failure.reason)}`,
        { cause: failure.reason },
      );
    }

    if (!this.isMounted() || revision !== this.buildRevision) {
      for (const lease of leases) {
        lease.release();
      }

      throw new Error('The office changed while its assets were loading.');
    }

    try {
      const preparedTargets = OFFICE_ASSET_PLACEMENTS.map(
        (placement, index) => {
          const lease = leases[index];

          if (lease === undefined) {
            throw new Error(
              `Office asset lease for "${placement.targetId}" is missing.`,
            );
          }

          const object = this.createFittedAssetObject(placement, lease);
          return this.createAnomalyTarget(placement, object);
        },
      );
      const validationRegistry = new AnomalyTargetRegistry();

      for (const target of preparedTargets) {
        validationRegistry.register(target);
      }

      const layoutAdditions = this.createLayoutAdditions(preparedTargets);
      this.getVisualRoot().add(
        ...preparedTargets.map((target) => target.object),
        ...layoutAdditions,
      );

      for (const target of preparedTargets) {
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
        `Office assets could not be prepared: ${this.getErrorMessage(error)}`,
        { cause: error },
      );
    }
  }

  private createFittedAssetObject(
    placement: OfficeAssetPlacement,
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
    model.position.set(0, 0, 0);
    model.rotation.set(0, placement.rotationY, 0);
    model.scale.set(1, 1, 1);
    this.harmonizeImportedMaterials(model, placement);
    model.updateMatrixWorld(true);
    const initialBounds = new THREE.Box3().setFromObject(model);
    const initialSize = initialBounds.getSize(new THREE.Vector3());
    const [maximumX, maximumY, maximumZ] = placement.maximumSize;
    const scale = Math.min(
      maximumX / initialSize.x,
      maximumY / initialSize.y,
      maximumZ / initialSize.z,
    );

    if (!Number.isFinite(scale) || scale <= 0) {
      throw new Error(`Office asset "${lease.assetId}" has invalid bounds.`);
    }

    model.scale.setScalar(scale);
    model.updateMatrixWorld(true);
    const fittedBounds = new THREE.Box3().setFromObject(model);
    const center = fittedBounds.getCenter(new THREE.Vector3());
    model.position.set(
      -center.x,
      placement.verticalAnchor === 'ground'
        ? -fittedBounds.min.y
        : -center.y,
      -center.z,
    );
    object.add(model);
    return object;
  }

  private createLayoutAdditions(
    targets: readonly AnomalyTarget[],
  ): readonly THREE.Object3D[] {
    const source = targets.find(({ id }) => id === 'bay-plant')?.object;

    if (source === undefined) {
      throw new Error('Office layout addition source "bay-plant" is missing.');
    }

    const copy = source.clone(true);
    copy.name = 'ANOM_Office_BayPlant_Copy';
    copy.position.set(1.5, 0, -4.05);
    copy.quaternion.identity();
    copy.scale.set(1, 1, 1);
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
        ? mesh.material.map((material) => this.ownMaterial(material.clone()))
        : this.ownMaterial(mesh.material.clone());
    });

    return [copy];
  }

  private harmonizeImportedMaterials(
    root: THREE.Object3D,
    placement: OfficeAssetPlacement,
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
        material.name = `office-${placement.targetId}`;

        if (standard.isMeshStandardMaterial) {
          standard.color.multiply(new THREE.Color(placement.tint));
          standard.roughness = Math.max(standard.roughness, 0.72);
          standard.metalness = Math.min(standard.metalness, 0.12);
          standard.envMapIntensity = 0.55;
          standard.needsUpdate = true;
        }

        styledMaterials.add(material);
      }
    });

    if (surfaceIndex === 0) {
      throw new Error(
        `Office asset "${placement.targetId}" contains no mesh.`,
      );
    }
  }

  private createAnomalyTarget(
    placement: OfficeAssetPlacement,
    object: THREE.Group,
  ): AnomalyTarget {
    const interactionVolume = new THREE.Mesh(
      this.ownGeometry(new THREE.BoxGeometry(...placement.interactionSize)),
      this.requireMaterials().interaction,
    );
    interactionVolume.name = `INTERACT_${placement.targetId}`;
    interactionVolume.position.fromArray(placement.interactionPosition);
    interactionVolume.layers.set(RENDER_LAYERS.interaction);
    interactionVolume.renderOrder = 11;
    object.add(interactionVolume);

    if (placement.targetId === 'wall-clock') {
      this.addStoryClockDisplay(object);
    }

    const surfaceNames: string[] = [];

    object.traverse((candidate) => {
      const mesh = candidate as THREE.Mesh;

      if (mesh.isMesh && mesh.layers.isEnabled(RENDER_LAYERS.scene)) {
        surfaceNames.push(mesh.name);
      }
    });

    const variants = this.createAnomalyVariants(placement, surfaceNames);
    const collisionObjects = this.getCollisionObjects(placement);

    return {
      id: placement.targetId,
      nodeName: object.name,
      interactionNodeNames: [interactionVolume.name],
      allowedKinds: [...new Set(variants.map(({ kind }) => kind))],
      variants,
      weight: placement.colliderName === undefined ? 0.95 : 1.1,
      minimumDifficulty: 1,
      object,
      interactionVolume,
      interactionVolumes: [interactionVolume],
      dependentTargetIds: placement.dependentTargetIds ?? [],
      initialState: captureAnomalyTargetInitialState(object),
      collisionObjects,
      collisionInitialState:
        captureAnomalyCollisionObjectState(collisionObjects),
    };
  }

  private addStoryClockDisplay(clock: THREE.Group): void {
    const display = new THREE.Group();
    display.name = STORY_LOOP_ANCHOR.officeClockObjectName;
    display.position.set(0, 0, -0.022);
    display.rotation.y = Math.PI;
    display.scale.set(
      1 / clock.scale.x,
      1 / clock.scale.y,
      1 / clock.scale.z,
    );
    const material = this.ownMaterial(
      new THREE.MeshBasicMaterial({
        color: '#7f2524',
        transparent: true,
        opacity: 0.86,
        depthWrite: false,
      }),
    );
    material.name = 'STORY_OfficeClock_Digits';
    const horizontal = this.ownGeometry(
      new THREE.PlaneGeometry(0.042, 0.007),
    );
    const vertical = this.ownGeometry(
      new THREE.PlaneGeometry(0.007, 0.038),
    );
    const segmentOffsets = {
      a: [0, 0.043],
      b: [0.022, 0.022],
      c: [0.022, -0.022],
      d: [0, -0.043],
      e: [-0.022, -0.022],
      f: [-0.022, 0.022],
      g: [0, 0],
    } as const;
    const digitSegments = {
      '0': ['a', 'b', 'c', 'd', 'e', 'f'],
      '3': ['a', 'b', 'c', 'd', 'g'],
      '4': ['b', 'c', 'f', 'g'],
    } as const;
    const digitXs = [-0.12, -0.055, 0.055, 0.12] as const;

    for (const [digitIndex, digit] of STORY_LOOP_ANCHOR.clockDigits.entries()) {
      for (const segmentId of digitSegments[digit]) {
        const [x, y] = segmentOffsets[segmentId];
        const segment = new THREE.Mesh(
          segmentId === 'b' ||
          segmentId === 'c' ||
          segmentId === 'e' ||
          segmentId === 'f'
            ? vertical
            : horizontal,
          material,
        );
        segment.name = `STORY_OfficeClock_Digit${digitIndex}_${segmentId}`;
        segment.position.set((digitXs[digitIndex] ?? 0) + x, y, 0);
        segment.layers.set(RENDER_LAYERS.scene);
        display.add(segment);
      }
    }

    const colonGeometry = this.ownGeometry(
      new THREE.CircleGeometry(0.005, 8),
    );

    for (const y of [-0.018, 0.018]) {
      const dot = new THREE.Mesh(colonGeometry, material);
      dot.name = `STORY_OfficeClock_Colon_${String(y)}`;
      dot.position.set(0, y, 0);
      dot.layers.set(RENDER_LAYERS.scene);
      display.add(dot);
    }

    clock.add(display);
  }

  private createAnomalyVariants(
    placement: OfficeAssetPlacement,
    surfaceNames: readonly string[],
  ): readonly PreparedAnomalyVariant[] {
    const visibilityVariants: PreparedAnomalyVariant[] =
      placement.targetId === 'desk-photo'
        ? [{ id: 'appeared', kind: 'show' }]
        : [
            { id: 'hidden', kind: 'hide' },
            { id: 'appeared', kind: 'show' },
          ];

    return [
      ...visibilityVariants,
      ...placement.anomalyColors.map(({ id, color }) => ({
        id,
        kind: 'color' as const,
        nodeNames: surfaceNames,
        color,
      })),
    ];
  }

  private getCollisionObjects(
    placement: OfficeAssetPlacement,
  ): readonly THREE.Object3D[] {
    if (placement.colliderName === undefined) {
      return [];
    }

    const collider = this.getCollisionRoot().getObjectByName(
      placement.colliderName,
    );

    if (collider === undefined) {
      throw new Error(
        `Office collider "${placement.colliderName}" is missing.`,
      );
    }

    return [collider];
  }

  private createMaterials(): OfficeMaterials {
    const standard = (
      color: THREE.ColorRepresentation,
      roughness: number,
      metalness = 0,
    ): THREE.MeshStandardMaterial =>
      this.ownMaterial(
        new THREE.MeshStandardMaterial({ color, roughness, metalness }),
      );
    const floor = standard('#ffffff', 0.84);
    floor.map = this.createFloorTexture();
    const ceiling = standard('#d4cec2', 0.98);
    ceiling.side = THREE.DoubleSide;
    const window = standard('#60838b', 0.28, 0.08);
    window.transparent = true;
    window.opacity = 0.72;
    window.emissive.set('#17393e');
    window.emissiveIntensity = 0.36;
    const wall = standard('#8a8276', 0.96);
    wall.map = this.ownTexture(
      createAgedPlasterTexture({
        name: 'TEXTURE_Office_AgedPlaster',
        seed: 3_047,
      }),
    );

    return {
      wall,
      panel: standard('#4f5a57', 0.88),
      floor,
      ceiling,
      trim: standard('#c2b49e', 0.84),
      door: standard('#49332e', 0.8),
      darkMetal: standard('#343a3b', 0.55, 0.2),
      lampGlass: standard('#e8c980', 0.4),
      window,
      exitGlow: this.ownMaterial(
        new THREE.MeshBasicMaterial({
          color: '#83aaa5',
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      ),
      collision: this.ownMaterial(
        new THREE.MeshBasicMaterial({
          color: '#d9665b',
          transparent: true,
          opacity: 0.28,
          depthWrite: false,
          wireframe: true,
        }),
      ),
      interaction: this.ownMaterial(
        new THREE.MeshBasicMaterial({
          color: '#f3c969',
          transparent: true,
          opacity: 0.2,
          depthWrite: false,
          wireframe: true,
        }),
      ),
    };
  }

  private createFloorTexture(): THREE.DataTexture {
    return this.ownTexture(
      createWoodPlankFloorTexture({
        name: 'TEXTURE_Office_WornWood',
        seed: 3_047,
        repeat: [2.5, 3.5],
        plankColors: ['#92785d', '#876d55', '#7c654f', '#9b8062'],
        seamColor: '#514137',
      }),
    );
  }

  private createArchitecture(): void {
    const materials = this.requireMaterials();
    const root = new THREE.Group();
    root.name = 'Office_Architecture';
    root.add(
      this.createPolygonSurface(
        'ARCH_OfficeFloor_Polygon',
        -0.015,
        materials.floor,
      ),
      this.createPolygonSurface(
        'ARCH_OfficeCeiling_Polygon',
        ROOM_HEIGHT,
        materials.ceiling,
      ),
    );
    this.createOfficeWalls(root);
    this.createDoors(root);
    this.createBayWindows(root);
    this.createCeilingFixtures(root);
    this.getVisualRoot().add(root);
  }

  private createOfficeWalls(root: THREE.Object3D): void {
    const entranceLeft = ENTRANCE_CENTER_X - DOOR_WIDTH / 2;
    const entranceRight = ENTRANCE_CENTER_X + DOOR_WIDTH / 2;
    const exitSouth = EXIT_CENTER_Z + DOOR_WIDTH / 2;
    const exitNorth = EXIT_CENTER_Z - DOOR_WIDTH / 2;
    const segments: readonly {
      readonly name: string;
      readonly start: Vector2Tuple;
      readonly end: Vector2Tuple;
    }[] = [
      {
        name: 'SouthWest',
        start: [-4.2, SOUTH_Z],
        end: [entranceLeft, SOUTH_Z],
      },
      {
        name: 'SouthEast',
        start: [entranceRight, SOUTH_Z],
        end: [EAST_X, SOUTH_Z],
      },
      {
        name: 'EastSouth',
        start: [EAST_X, SOUTH_Z],
        end: [EAST_X, exitSouth],
      },
      {
        name: 'EastNorth',
        start: [EAST_X, exitNorth],
        end: [EAST_X, NORTH_Z],
      },
      {
        name: 'NorthEast',
        start: [EAST_X, NORTH_Z],
        end: [2.2, NORTH_Z],
      },
      {
        name: 'BayEast',
        start: [2.2, NORTH_Z],
        end: [1.4, BAY_NORTH_Z],
      },
      {
        name: 'BayNorth',
        start: [1.4, BAY_NORTH_Z],
        end: [-1.4, BAY_NORTH_Z],
      },
      {
        name: 'BayWest',
        start: [-1.4, BAY_NORTH_Z],
        end: [-2.2, NORTH_Z],
      },
      {
        name: 'NorthWest',
        start: [-2.2, NORTH_Z],
        end: [-4.2, NORTH_Z],
      },
      {
        name: 'West',
        start: [-4.2, NORTH_Z],
        end: [-4.2, SOUTH_Z],
      },
    ];

    for (const segment of segments) {
      this.addDecoratedWallSegment(
        root,
        segment.name,
        segment.start,
        segment.end,
      );
    }

    root.add(
      this.createVisualBox(
        'WALL_Entrance_Lintel',
        [DOOR_WIDTH, ROOM_HEIGHT - DOOR_HEIGHT, WALL_THICKNESS],
        [
          ENTRANCE_CENTER_X,
          DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT) / 2,
          SOUTH_Z,
        ],
        this.requireMaterials().wall,
      ),
      this.createVisualBox(
        'WALL_Exit_Lintel',
        [WALL_THICKNESS, ROOM_HEIGHT - DOOR_HEIGHT, DOOR_WIDTH],
        [
          EAST_X,
          DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT) / 2,
          EXIT_CENTER_Z,
        ],
        this.requireMaterials().wall,
      ),
    );
  }

  private addDecoratedWallSegment(
    root: THREE.Object3D,
    name: string,
    start: Vector2Tuple,
    end: Vector2Tuple,
  ): void {
    const materials = this.requireMaterials();
    root.add(
      this.createSegmentBox(
        `WALL_${name}`,
        start,
        end,
        ROOM_HEIGHT,
        WALL_THICKNESS,
        ROOM_HEIGHT / 2,
        materials.wall,
      ),
      this.createSegmentBox(
        `PANEL_${name}`,
        start,
        end,
        0.78,
        WALL_THICKNESS + 0.025,
        0.39,
        materials.panel,
        0.98,
      ),
      this.createSegmentBox(
        `TRIM_${name}`,
        start,
        end,
        0.07,
        WALL_THICKNESS + 0.045,
        0.815,
        materials.trim,
        0.98,
      ),
      this.createSegmentBox(
        `BASEBOARD_${name}`,
        start,
        end,
        0.12,
        WALL_THICKNESS + 0.04,
        0.06,
        materials.trim,
        0.98,
      ),
    );
  }

  private createDoors(root: THREE.Object3D): void {
    const materials = this.requireMaterials();
    const frame = 0.09;
    const depth = 0.26;
    root.add(
      this.createVisualBox(
        'FRAME_OfficeEntrance_Left',
        [frame, DOOR_HEIGHT + 0.08, depth],
        [
          ENTRANCE_CENTER_X - DOOR_WIDTH / 2,
          DOOR_HEIGHT / 2,
          SOUTH_Z - 0.02,
        ],
        materials.trim,
      ),
      this.createVisualBox(
        'FRAME_OfficeEntrance_Right',
        [frame, DOOR_HEIGHT + 0.08, depth],
        [
          ENTRANCE_CENTER_X + DOOR_WIDTH / 2,
          DOOR_HEIGHT / 2,
          SOUTH_Z - 0.02,
        ],
        materials.trim,
      ),
      this.createVisualBox(
        'FRAME_OfficeEntrance_Top',
        [DOOR_WIDTH + frame * 2, frame, depth],
        [ENTRANCE_CENTER_X, DOOR_HEIGHT, SOUTH_Z - 0.02],
        materials.trim,
      ),
      this.createVisualBox(
        'DOOR_OfficeEntrance',
        [DOOR_WIDTH - 0.08, DOOR_HEIGHT - 0.06, 0.09],
        [ENTRANCE_CENTER_X, (DOOR_HEIGHT - 0.06) / 2, SOUTH_Z - 0.08],
        materials.door,
      ),
    );

    const pivot = new THREE.Group();
    pivot.name = 'DOOR_OfficeExit_Pivot';
    pivot.position.set(
      EAST_X - 0.08,
      0,
      EXIT_CENTER_Z - DOOR_WIDTH / 2 + 0.04,
    );
    pivot.add(
      this.createVisualBox(
        'DOOR_OfficeExit',
        [0.09, DOOR_HEIGHT - 0.06, DOOR_WIDTH - 0.08],
        [0, (DOOR_HEIGHT - 0.06) / 2, (DOOR_WIDTH - 0.08) / 2],
        materials.door,
      ),
      this.createSphere(
        'DOOR_OfficeExit_Handle',
        0.055,
        [-0.065, 1.02, DOOR_WIDTH - 0.23],
        materials.darkMetal,
      ),
    );
    root.add(
      pivot,
      this.createVisualBox(
        'FRAME_OfficeExit_South',
        [depth, DOOR_HEIGHT + 0.08, frame],
        [EAST_X - 0.02, DOOR_HEIGHT / 2, EXIT_CENTER_Z + DOOR_WIDTH / 2],
        materials.trim,
      ),
      this.createVisualBox(
        'FRAME_OfficeExit_North',
        [depth, DOOR_HEIGHT + 0.08, frame],
        [EAST_X - 0.02, DOOR_HEIGHT / 2, EXIT_CENTER_Z - DOOR_WIDTH / 2],
        materials.trim,
      ),
      this.createVisualBox(
        'FRAME_OfficeExit_Top',
        [depth, frame, DOOR_WIDTH + frame * 2],
        [EAST_X - 0.02, DOOR_HEIGHT, EXIT_CENTER_Z],
        materials.trim,
      ),
    );
    this.exitDoor = pivot;

    const portal = new THREE.Group();
    portal.name = 'EXIT_Office_Portal';
    portal.visible = false;
    const glow = new THREE.Mesh(
      this.ownGeometry(
        new THREE.PlaneGeometry(
          DOOR_WIDTH * 0.82,
          DOOR_HEIGHT * 0.9,
        ),
      ),
      materials.exitGlow,
    );
    glow.rotation.y = -Math.PI / 2;
    glow.position.set(EAST_X + 0.055, DOOR_HEIGHT * 0.46, EXIT_CENTER_Z);
    const light = new THREE.PointLight('#7aaaa5', 0, 2.6, 2);
    light.position.set(EAST_X + 0.2, 1.2, EXIT_CENTER_Z);
    portal.add(glow, light);
    root.add(portal);
    this.exitPortal = portal;
    this.exitPortalLight = light;
  }

  private createBayWindows(root: THREE.Object3D): void {
    const materials = this.requireMaterials();
    const windows: readonly {
      readonly name: string;
      readonly start: Vector2Tuple;
      readonly end: Vector2Tuple;
    }[] = [
      {
        name: 'East',
        start: [2.2, NORTH_Z],
        end: [1.4, BAY_NORTH_Z],
      },
      {
        name: 'North',
        start: [1.4, BAY_NORTH_Z],
        end: [-1.4, BAY_NORTH_Z],
      },
      {
        name: 'West',
        start: [-1.4, BAY_NORTH_Z],
        end: [-2.2, NORTH_Z],
      },
    ];

    for (const window of windows) {
      root.add(
        this.createSegmentBox(
          `WINDOW_OfficeBay_${window.name}`,
          window.start,
          window.end,
          1.18,
          WALL_THICKNESS + 0.04,
          1.82,
          materials.window,
          0.64,
        ),
        this.createSegmentBox(
          `WINDOW_OfficeBay_${window.name}_Top`,
          window.start,
          window.end,
          0.055,
          WALL_THICKNESS + 0.06,
          2.43,
          materials.trim,
          0.68,
        ),
        this.createSegmentBox(
          `WINDOW_OfficeBay_${window.name}_Bottom`,
          window.start,
          window.end,
          0.055,
          WALL_THICKNESS + 0.06,
          1.21,
          materials.trim,
          0.68,
        ),
      );
    }
  }

  private createCeilingFixtures(root: THREE.Object3D): void {
    const materials = this.requireMaterials();
    const positions: readonly Vector3Tuple[] = [
      [-2.1, 3.02, 0.7],
      [1.85, 3.02, 0.35],
      [0, 3.02, -3.75],
    ];

    for (const [index, position] of positions.entries()) {
      root.add(
        this.createCylinder(
          `ARCH_OfficeCeilingLightRim_${index + 1}`,
          0.25,
          0.075,
          position,
          materials.darkMetal,
        ),
        this.createCylinder(
          `ARCH_OfficeCeilingLightGlass_${index + 1}`,
          0.2,
          0.065,
          [position[0], position[1] - 0.065, position[2]],
          materials.lampGlass,
        ),
      );
    }
  }

  private createLighting(): void {
    const hemisphere = new THREE.HemisphereLight('#94a1a5', '#3b2d26', 0.4);
    hemisphere.name = 'LIGHT_Office_Ambient';
    const ambient = new THREE.AmbientLight('#c8c0b3', 0.12);
    ambient.name = 'LIGHT_Office_Bounce';
    const key = new THREE.SpotLight(
      '#ffd09a',
      6.4,
      9,
      Math.PI / 3.2,
      0.5,
      1.15,
    );
    key.name = 'LIGHT_Office_Key';
    key.position.set(1.1, 2.92, 1.15);
    key.target.position.set(0.15, 0.35, -0.6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.3;
    key.shadow.camera.far = 10;
    key.shadow.bias = -0.0002;
    key.shadow.normalBias = 0.026;
    key.shadow.radius = 2;
    const archiveFill = new THREE.PointLight('#e5bd8f', 0.42, 5.5, 1.6);
    archiveFill.name = 'LIGHT_Office_ArchiveFill';
    archiveFill.position.set(3.1, 1.95, -1.5);
    const libraryFill = new THREE.PointLight('#efc88f', 0.38, 5, 1.7);
    libraryFill.name = 'LIGHT_Office_LibraryFill';
    libraryFill.position.set(-3.1, 1.85, -0.9);
    const bayFill = new THREE.PointLight('#8faaa9', 0.45, 5.8, 1.5);
    bayFill.name = 'LIGHT_Office_BayFill';
    bayFill.position.set(0, 2.05, -4.25);
    const entranceFill = new THREE.PointLight('#ffd099', 0.36, 4.2, 1.8);
    entranceFill.name = 'LIGHT_Office_EntranceFill';
    entranceFill.position.set(-2.6, 1.8, 2.45);
    this.getVisualRoot().add(
      hemisphere,
      ambient,
      key,
      key.target,
      archiveFill,
      libraryFill,
      bayFill,
      entranceFill,
    );
  }

  private createCollisions(): void {
    this.addCollisionFloor();
    this.addCollisionBox(
      'COLLIDER_OfficeCeiling',
      [8.8, 0.12, 8.8],
      [0, ROOM_HEIGHT + 0.06, -0.5],
    );
    const entranceLeft = ENTRANCE_CENTER_X - DOOR_WIDTH / 2;
    const entranceRight = ENTRANCE_CENTER_X + DOOR_WIDTH / 2;
    const exitSouth = EXIT_CENTER_Z + DOOR_WIDTH / 2;
    const exitNorth = EXIT_CENTER_Z - DOOR_WIDTH / 2;
    const segments: readonly {
      readonly name: string;
      readonly start: Vector2Tuple;
      readonly end: Vector2Tuple;
    }[] = [
      {
        name: 'SouthWest',
        start: [-4.2, SOUTH_Z],
        end: [entranceLeft, SOUTH_Z],
      },
      {
        name: 'SouthEast',
        start: [entranceRight, SOUTH_Z],
        end: [EAST_X, SOUTH_Z],
      },
      {
        name: 'EastSouth',
        start: [EAST_X, SOUTH_Z],
        end: [EAST_X, exitSouth],
      },
      {
        name: 'EastNorth',
        start: [EAST_X, exitNorth],
        end: [EAST_X, NORTH_Z],
      },
      {
        name: 'NorthEast',
        start: [EAST_X, NORTH_Z],
        end: [2.2, NORTH_Z],
      },
      {
        name: 'BayEast',
        start: [2.2, NORTH_Z],
        end: [1.4, BAY_NORTH_Z],
      },
      {
        name: 'BayNorth',
        start: [1.4, BAY_NORTH_Z],
        end: [-1.4, BAY_NORTH_Z],
      },
      {
        name: 'BayWest',
        start: [-1.4, BAY_NORTH_Z],
        end: [-2.2, NORTH_Z],
      },
      {
        name: 'NorthWest',
        start: [-2.2, NORTH_Z],
        end: [-4.2, NORTH_Z],
      },
      {
        name: 'West',
        start: [-4.2, NORTH_Z],
        end: [-4.2, SOUTH_Z],
      },
    ];

    for (const segment of segments) {
      this.addCollisionSegment(
        `COLLIDER_OfficeWall_${segment.name}`,
        segment.start,
        segment.end,
      );
    }

    this.addCollisionBox(
      'COLLIDER_OfficeEntranceLintel',
      [DOOR_WIDTH, ROOM_HEIGHT - DOOR_HEIGHT, WALL_THICKNESS],
      [
        ENTRANCE_CENTER_X,
        DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT) / 2,
        SOUTH_Z,
      ],
    );
    this.addCollisionBox(
      'COLLIDER_OfficeEntranceDoor',
      [DOOR_WIDTH, DOOR_HEIGHT, WALL_THICKNESS],
      [ENTRANCE_CENTER_X, DOOR_HEIGHT / 2, SOUTH_Z],
    );
    this.addCollisionBox(
      'COLLIDER_OfficeExitLintel',
      [WALL_THICKNESS, ROOM_HEIGHT - DOOR_HEIGHT, DOOR_WIDTH],
      [
        EAST_X,
        DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT) / 2,
        EXIT_CENTER_Z,
      ],
    );
    this.exitDoorCollider = this.addCollisionBox(
      'COLLIDER_OfficeExitDoor',
      [WALL_THICKNESS, DOOR_HEIGHT, DOOR_WIDTH],
      [EAST_X, DOOR_HEIGHT / 2, EXIT_CENTER_Z],
    );
    this.addCollisionBox(
      'COLLIDER_OfficeDesk',
      [1.45, 0.943, 0.68],
      [0.25, 0.4715, -0.35],
    );
    this.addCollisionBox(
      'COLLIDER_OfficeFilingCabinet',
      [0.68, 2.05, 1.05],
      [3.55, 1.025, -2.24],
    );
    this.addCollisionBox(
      'COLLIDER_OfficeDrawerCabinet',
      [0.68, 1.04, 0.72],
      [3.48, 0.52, -0.72],
    );
    this.addCollisionBox(
      'COLLIDER_OfficeBookcase',
      [0.62, 1.36, 1.72],
      [-3.62, 0.68, -1.38],
    );
    this.addCollisionBox(
      'COLLIDER_OfficeBayArmchair',
      [1.02, 1.05, 1.02],
      [0.2, 0.525, 1.45],
    );
  }

  private addCollisionFloor(): void {
    const geometry = this.ownGeometry(new THREE.BufferGeometry());
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [-20, 0, -20, 0, 0, 20, 20, 0, -20],
        3,
      ),
    );
    geometry.computeVertexNormals();
    const collision = new THREE.Mesh(
      geometry,
      this.requireMaterials().collision,
    );
    collision.name = 'COLLIDER_OfficeFloor';
    collision.visible = false;
    this.getCollisionRoot().add(collision);

    if (import.meta.env.DEV) {
      const debugFloor = this.createPolygonSurface(
        'DEBUG_COLLIDER_OfficeFloor',
        -0.025,
        this.requireMaterials().collision,
      );
      debugFloor.layers.set(RENDER_LAYERS.debug);
      debugFloor.renderOrder = 9;
      this.getCollisionRoot().add(debugFloor);
    }
  }

  private addCollisionSegment(
    name: string,
    start: Vector2Tuple,
    end: Vector2Tuple,
  ): THREE.Mesh {
    const mesh = this.createSegmentBox(
      name,
      start,
      end,
      ROOM_HEIGHT,
      WALL_THICKNESS,
      ROOM_HEIGHT / 2,
      this.requireMaterials().collision,
    );
    mesh.renderOrder = 9;
    this.getCollisionRoot().add(mesh);
    return mesh;
  }

  private addCollisionBox(
    name: string,
    size: Vector3Tuple,
    position: Vector3Tuple,
  ): THREE.Mesh {
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

  private createPolygonSurface(
    name: string,
    height: number,
    material: THREE.Material,
  ): THREE.Mesh {
    const shape = new THREE.Shape();
    const first = OFFICE_FOOTPRINT[0] as Vector2Tuple;
    shape.moveTo(first[0], -first[1]);

    for (const point of OFFICE_FOOTPRINT.slice(1)) {
      shape.lineTo(point[0], -point[1]);
    }

    shape.closePath();
    const mesh = new THREE.Mesh(
      this.ownGeometry(new THREE.ShapeGeometry(shape)),
      material,
    );
    mesh.name = name;
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = height;
    mesh.receiveShadow = true;
    return mesh;
  }

  private createSegmentBox(
    name: string,
    start: Vector2Tuple,
    end: Vector2Tuple,
    height: number,
    depth: number,
    y: number,
    material: THREE.Material,
    lengthScale = 1,
  ): THREE.Mesh {
    const deltaX = end[0] - start[0];
    const deltaZ = end[1] - start[1];
    const length = Math.hypot(deltaX, deltaZ) * lengthScale;
    const mesh = new THREE.Mesh(
      this.ownGeometry(new THREE.BoxGeometry(length, height, depth)),
      material,
    );
    mesh.name = name;
    mesh.position.set(
      (start[0] + end[0]) / 2,
      y,
      (start[1] + end[1]) / 2,
    );
    mesh.rotation.y = -Math.atan2(deltaZ, deltaX);
    mesh.receiveShadow = true;
    return mesh;
  }

  private createVisualBox(
    name: string,
    size: Vector3Tuple,
    position: Vector3Tuple,
    material: THREE.Material,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(
      this.ownGeometry(new THREE.BoxGeometry(...size)),
      material,
    );
    mesh.name = name;
    mesh.position.fromArray(position);
    mesh.receiveShadow = true;
    return mesh;
  }

  private createCylinder(
    name: string,
    radius: number,
    height: number,
    position: Vector3Tuple,
    material: THREE.Material,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(
      this.ownGeometry(
        new THREE.CylinderGeometry(radius, radius, height, 18),
      ),
      material,
    );
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

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private requireMaterials(): OfficeMaterials {
    if (this.materials === null) {
      throw new Error('Office materials are unavailable.');
    }

    return this.materials;
  }
}
