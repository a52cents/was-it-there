import * as THREE from 'three';
import { LIVING_ROOM_ASSET_CATALOG } from '../../content/rooms/LivingRoomAssetCatalog';
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
import {
  createStoneTileFloorTexture,
  createWoodPlankFloorTexture,
} from '../textures/ProceduralFloorTexture';
import type { PlayableRoom } from './PlayableRoom';

type Vector2Tuple = readonly [number, number];
type Vector3Tuple = readonly [number, number, number];
type LivingAssetKey = keyof typeof LIVING_ROOM_ASSET_CATALOG;
type AnomalyStyle = 'furniture' | 'accent' | 'story';

interface LivingMaterials {
  readonly wall: THREE.MeshStandardMaterial;
  readonly bayWall: THREE.MeshStandardMaterial;
  readonly panel: THREE.MeshStandardMaterial;
  readonly floor: THREE.MeshStandardMaterial;
  readonly ceiling: THREE.MeshStandardMaterial;
  readonly trim: THREE.MeshStandardMaterial;
  readonly door: THREE.MeshStandardMaterial;
  readonly metal: THREE.MeshStandardMaterial;
  readonly glass: THREE.MeshStandardMaterial;
  readonly fireplaceStone: THREE.Texture;
  readonly charredWood: THREE.MeshStandardMaterial;
  readonly emberGlow: THREE.MeshBasicMaterial;
  readonly cassette: THREE.MeshStandardMaterial;
  readonly cassetteLabel: THREE.MeshBasicMaterial;
  readonly exitGlow: THREE.MeshBasicMaterial;
  readonly collision: THREE.MeshBasicMaterial;
  readonly interaction: THREE.MeshBasicMaterial;
}

interface LivingAssetPlacement {
  readonly key: LivingAssetKey;
  readonly targetId: string;
  readonly objectName: string;
  readonly position: Vector3Tuple;
  readonly rotationY: number;
  readonly scale?: Vector3Tuple;
  readonly maximumSize: Vector3Tuple;
  readonly verticalAnchor: 'center' | 'ground';
  readonly interactionSize: Vector3Tuple;
  readonly tint: string;
  readonly anomalyStyle: AnomalyStyle;
  readonly anomalyColors?: readonly [string, string];
  readonly colliderName?: string;
  readonly colliderSize?: Vector3Tuple;
  readonly dependentTargetIds?: readonly string[];
}

const ROOM_HEIGHT = 3.2;
const WALL_THICKNESS = 0.18;
const DOOR_WIDTH = 1.1;
const DOOR_HEIGHT = 2.2;
const WEST_X = -4.2;
const EAST_X = 4.2;
const SOUTH_Z = 3.8;
const NORTH_Z = -3.8;
const BAY_WEST_X = -5.5;
const BAY_SOUTH_Z = 1.9;
const BAY_NORTH_Z = -2.1;
const ENTRANCE_CENTER_X = 2.75;
const EXIT_CENTER_X = -4.85;

const LIVING_FOOTPRINT: readonly Vector2Tuple[] = [
  [WEST_X, SOUTH_Z],
  [EAST_X, SOUTH_Z],
  [EAST_X, NORTH_Z],
  [WEST_X, NORTH_Z],
  [WEST_X, BAY_NORTH_Z],
  [BAY_WEST_X, BAY_NORTH_Z],
  [BAY_WEST_X, BAY_SOUTH_Z],
  [WEST_X, BAY_SOUTH_Z],
];

const LIVING_ASSET_PLACEMENTS: readonly LivingAssetPlacement[] = [
  {
    key: 'lCouch',
    targetId: 'sectional-sofa',
    objectName: 'ANOM_LivingRoom_SectionalSofa',
    position: [0.25, 0, 1.15],
    rotationY: Math.PI,
    scale: [1.15, 1, 1.15],
    maximumSize: [3.15, 1.05, 2.15],
    verticalAnchor: 'ground',
    interactionSize: [3.35, 1.1, 2.3],
    tint: '#786961',
    anomalyStyle: 'furniture',
    colliderName: 'COLLIDER_LivingRoom_SectionalSofa',
    colliderSize: [3.05, 0.92, 2.05],
  },
  {
    key: 'fireplace',
    targetId: 'fireplace',
    objectName: 'ANOM_LivingRoom_Fireplace',
    position: [3.8, 0, -0.25],
    rotationY: -Math.PI / 2,
    maximumSize: [0.72, 1.8, 2.15],
    verticalAnchor: 'ground',
    interactionSize: [0.88, 1.92, 2.3],
    tint: '#8b7968',
    anomalyStyle: 'furniture',
    colliderName: 'COLLIDER_LivingRoom_Fireplace',
    colliderSize: [0.72, 1.78, 2.12],
  },
  {
    key: 'tvCabinet',
    targetId: 'media-cabinet',
    objectName: 'ANOM_LivingRoom_MediaCabinet',
    position: [3.6, 0, -2.45],
    rotationY: -Math.PI / 2,
    maximumSize: [0.62, 0.66, 1.7],
    verticalAnchor: 'ground',
    interactionSize: [0.75, 0.78, 1.85],
    tint: '#756153',
    anomalyStyle: 'furniture',
    colliderName: 'COLLIDER_LivingRoom_MediaCabinet',
    colliderSize: [0.62, 0.66, 1.68],
    dependentTargetIds: ['television'],
  },
  {
    key: 'television',
    targetId: 'television',
    objectName: 'ANOM_LivingRoom_Television',
    position: [3.48, 0.68, -2.45],
    rotationY: -Math.PI / 2,
    maximumSize: [0.22, 1.05, 1.55],
    verticalAnchor: 'ground',
    interactionSize: [0.36, 1.18, 1.7],
    tint: '#788387',
    anomalyStyle: 'story',
    anomalyColors: ['#5b766d', '#735a78'],
  },
  {
    key: 'shelfLarge',
    targetId: 'archive-shelf',
    objectName: 'ANOM_LivingRoom_ArchiveShelf',
    position: [-0.25, 0, -3.48],
    rotationY: 0,
    maximumSize: [2.6, 2.25, 0.58],
    verticalAnchor: 'ground',
    interactionSize: [2.75, 2.35, 0.72],
    tint: '#725e4f',
    anomalyStyle: 'furniture',
    colliderName: 'COLLIDER_LivingRoom_ArchiveShelf',
    colliderSize: [2.58, 2.2, 0.58],
    dependentTargetIds: ['tape-player', 'family-photo', 'recording-tape'],
  },
  {
    key: 'rugRound',
    targetId: 'round-rug',
    objectName: 'ANOM_LivingRoom_RoundRug',
    position: [0.35, 0.012, 0.2],
    rotationY: 0,
    maximumSize: [3.35, 0.035, 3.35],
    verticalAnchor: 'ground',
    interactionSize: [3.5, 0.14, 3.5],
    tint: '#765950',
    anomalyStyle: 'accent',
    anomalyColors: ['#4d706d', '#715478'],
  },
  {
    key: 'glassTable',
    targetId: 'coffee-table',
    objectName: 'ANOM_LivingRoom_CoffeeTable',
    position: [0.45, 0, -0.05],
    rotationY: 0,
    maximumSize: [1.35, 0.55, 0.82],
    verticalAnchor: 'ground',
    interactionSize: [1.48, 0.66, 0.95],
    tint: '#7b8988',
    anomalyStyle: 'furniture',
    colliderName: 'COLLIDER_LivingRoom_CoffeeTable',
    colliderSize: [1.32, 0.52, 0.8],
  },
  {
    key: 'loungeChair',
    targetId: 'bay-chair',
    objectName: 'ANOM_LivingRoom_BayChair',
    position: [-4.78, 0, 1.1],
    rotationY: Math.PI * 0.68,
    maximumSize: [0.95, 1.08, 1.18],
    verticalAnchor: 'ground',
    interactionSize: [1.08, 1.18, 1.3],
    tint: '#6d625f',
    anomalyStyle: 'furniture',
    colliderName: 'COLLIDER_LivingRoom_BayChair',
    colliderSize: [0.88, 1, 1.02],
  },
  {
    key: 'curtainsDouble',
    targetId: 'bay-curtains',
    objectName: 'ANOM_LivingRoom_BayCurtains',
    position: [-5.36, 0.25, 0],
    rotationY: Math.PI / 2,
    maximumSize: [0.28, 2.35, 2.45],
    verticalAnchor: 'ground',
    interactionSize: [0.42, 2.45, 2.6],
    tint: '#725b5d',
    anomalyStyle: 'accent',
    anomalyColors: ['#4e6c69', '#65527b'],
  },
  {
    key: 'chandelier',
    targetId: 'chandelier',
    objectName: 'ANOM_LivingRoom_Chandelier',
    position: [0.25, 2.86, 0.25],
    rotationY: 0,
    maximumSize: [1.35, 0.7, 1.35],
    verticalAnchor: 'center',
    interactionSize: [1.5, 0.82, 1.5],
    tint: '#9a7c58',
    anomalyStyle: 'accent',
    anomalyColors: ['#57716a', '#715a7a'],
  },
  {
    key: 'floorLamp',
    targetId: 'bay-floor-lamp',
    objectName: 'ANOM_LivingRoom_BayFloorLamp',
    position: [-4.7, 0, -1.45],
    rotationY: 0,
    maximumSize: [0.34, 2.05, 0.34],
    verticalAnchor: 'ground',
    interactionSize: [0.48, 2.15, 0.48],
    tint: '#a39578',
    anomalyStyle: 'accent',
    anomalyColors: ['#587269', '#72577b'],
  },
  {
    key: 'pottedPlant',
    targetId: 'corner-plant',
    objectName: 'ANOM_LivingRoom_CornerPlant',
    position: [3.35, 0, 2.9],
    rotationY: 0,
    maximumSize: [0.8, 1.45, 0.8],
    verticalAnchor: 'ground',
    interactionSize: [0.94, 1.55, 0.94],
    tint: '#66715e',
    anomalyStyle: 'accent',
    anomalyColors: ['#785f4f', '#536a78'],
  },
  {
    key: 'radio',
    targetId: 'tape-player',
    objectName: 'ANOM_LivingRoom_TapePlayer',
    position: [-0.75, 1.02, -3.33],
    rotationY: 0,
    maximumSize: [0.58, 0.36, 0.3],
    verticalAnchor: 'ground',
    interactionSize: [0.72, 0.52, 0.46],
    tint: '#74675a',
    anomalyStyle: 'story',
    anomalyColors: ['#4e6d72', '#76546d'],
  },
  {
    key: 'photoFrame',
    targetId: 'family-photo',
    objectName: 'ANOM_LivingRoom_FamilyPhoto',
    position: [0.35, 1.05, -3.34],
    rotationY: 0,
    maximumSize: [0.36, 0.42, 0.18],
    verticalAnchor: 'ground',
    interactionSize: [0.5, 0.56, 0.34],
    tint: '#8e725c',
    anomalyStyle: 'story',
    anomalyColors: ['#506c73', '#74576f'],
  },
] as const;

const ACCENT_SCALE_VARIANTS: readonly PreparedAnomalyVariant[] = [
  { id: 'smaller', kind: 'scale', scaleMultiplier: [0.72, 0.72, 0.72] },
  { id: 'larger', kind: 'scale', scaleMultiplier: [1.28, 1.28, 1.28] },
];

export const LIVING_ROOM_EXIT_THRESHOLD = {
  z: BAY_NORTH_Z - 0.38,
  minimumX: EXIT_CENTER_X - DOOR_WIDTH / 2,
  maximumX: EXIT_CENTER_X + DOOR_WIDTH / 2,
  crossing: 'negative-z',
} as const;

export class GreyboxLivingRoom extends RoomRuntime implements PlayableRoom {
  public readonly definition: RoomDefinition = {
    id: 'living-room',
    displayName: 'Living Room',
    observationDurationMs: 11_000,
    searchDurationMs: 25_000,
    anomalyCount: { min: 2, max: 3 },
    playerSpawn: { position: [ENTRANCE_CENTER_X, 0, 3.05], yaw: 0, pitch: 0 },
  };

  private readonly anomalyTargetRegistry = new AnomalyTargetRegistry();
  private readonly assetLeases: GlbAssetLease[] = [];
  private materials: LivingMaterials | null = null;
  private exitDoor: THREE.Object3D | null = null;
  private exitDoorCollider: THREE.Mesh | null = null;
  private exitPortal: THREE.Group | null = null;
  private exitPortalLight: THREE.PointLight | null = null;
  private assetManager: AssetManager | null = null;
  private assetLoadPromise: Promise<void> | null = null;
  private assetsLoaded = false;
  private buildRevision = 0;

  public constructor() {
    super('ROOM_LivingRoom_VisualRoot', 'COLLIDER_LivingRoom_Root');
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
    return LIVING_ROOM_EXIT_THRESHOLD;
  }

  public isAssetsLoaded(): boolean {
    return this.assetsLoaded;
  }

  public getLoadedAssetIds(): readonly string[] {
    return this.assetLeases.map(({ assetId }) => assetId);
  }

  public async loadAssets(assetManager?: AssetManager): Promise<void> {
    await this.loadLivingRoomAssets(assetManager);
    const manager = this.assetManager;
    if (manager === null) {
      throw new Error('The living-room AssetManager is unavailable.');
    }
    await this.loadHouseShellAssets(manager, 'living-room');
  }

  public setExitDoorCollisionEnabled(
    enabled: boolean,
    rebuildCollision = true,
  ): void {
    const collider = this.exitDoorCollider;
    if (collider === null) {
      throw new Error('The living-room exit-door collider is unavailable.');
    }
    const root = this.getCollisionRoot();
    if ((collider.parent === root) === enabled) {
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
    if (this.exitPortal === null || this.exitPortalLight === null || this.materials === null) {
      throw new Error('The living-room exit portal is unavailable.');
    }
    const safeProgress = Number.isFinite(progress)
      ? THREE.MathUtils.clamp(progress, 0, 1)
      : 0;
    this.exitPortal.visible = safeProgress > 0;
    this.materials.exitGlow.opacity = safeProgress * 0.82;
    this.exitPortalLight.intensity = safeProgress * 2.3;
  }

  protected buildRoom(): void {
    this.buildRevision += 1;
    this.materials = this.createMaterials();
    this.createArchitecture();
    this.createLighting();
    this.createCollisions();
    this.createRecordingTapeTarget();
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

  private async loadLivingRoomAssets(assetManager?: AssetManager): Promise<void> {
    if (!this.isMounted()) {
      throw new Error('The living room must be mounted before loading assets.');
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
      throw new Error('The living-room AssetManager is unavailable.');
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

  private async performAssetLoad(
    assetManager: AssetManager,
    revision: number,
  ): Promise<void> {
    const results = await Promise.allSettled(
      LIVING_ASSET_PLACEMENTS.map((placement) =>
        assetManager.acquire(LIVING_ROOM_ASSET_CATALOG[placement.key]),
      ),
    );
    const leases = results.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : [],
    );
    const failure = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    if (failure !== undefined) {
      leases.forEach((lease) => lease.release());
      throw new Error(
        `Living-room assets could not be loaded: ${this.getErrorMessage(failure.reason)}`,
        { cause: failure.reason },
      );
    }
    if (!this.isMounted() || revision !== this.buildRevision) {
      leases.forEach((lease) => lease.release());
      throw new Error('The living room changed while its assets were loading.');
    }
    try {
      const targets = LIVING_ASSET_PLACEMENTS.map((placement, index) => {
        const lease = leases[index];
        if (lease === undefined) {
          throw new Error(`Missing living-room asset for "${placement.targetId}".`);
        }
        return this.createAnomalyTarget(
          placement,
          this.createFittedAssetObject(placement, lease),
        );
      });
      const validationRegistry = new AnomalyTargetRegistry();
      for (const target of targets) {
        validationRegistry.register(target);
      }
      this.getVisualRoot().add(...targets.map(({ object }) => object));
      for (const target of targets) {
        this.anomalyTargetRegistry.register(target);
      }
      this.assetLeases.push(...leases);
      this.assetsLoaded = true;
      this.refreshVisualObjectCount();
    } catch (error: unknown) {
      leases.forEach((lease) => lease.release());
      throw new Error(
        `Living-room assets could not be prepared: ${this.getErrorMessage(error)}`,
        { cause: error },
      );
    }
  }

  private createFittedAssetObject(
    placement: LivingAssetPlacement,
    lease: GlbAssetLease,
  ): THREE.Group {
    const object = new THREE.Group();
    object.name = placement.objectName;
    object.position.fromArray(placement.position);
    object.scale.fromArray(placement.scale ?? [1, 1, 1]);
    object.userData['assetId'] = lease.assetId;
    const model = lease.root;
    model.name = `${placement.objectName}_GLB`;
    model.rotation.y = placement.rotationY;
    this.harmonizeImportedMaterials(model, placement);
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const fittedScale = Math.min(
      placement.maximumSize[0] / size.x,
      placement.maximumSize[1] / size.y,
      placement.maximumSize[2] / size.z,
    );
    if (!Number.isFinite(fittedScale) || fittedScale <= 0) {
      throw new Error(`Living-room asset "${lease.assetId}" has invalid bounds.`);
    }
    model.scale.setScalar(fittedScale);
    model.updateMatrixWorld(true);
    const fittedBounds = new THREE.Box3().setFromObject(model);
    const center = fittedBounds.getCenter(new THREE.Vector3());
    model.position.set(
      -center.x,
      placement.verticalAnchor === 'ground' ? -fittedBounds.min.y : -center.y,
      -center.z,
    );
    object.add(model);

    if (placement.targetId === 'fireplace') {
      this.createFireplaceDetails(object);
    }

    return object;
  }

  private harmonizeImportedMaterials(
    root: THREE.Object3D,
    placement: LivingAssetPlacement,
  ): void {
    const styled = new Set<THREE.Material>();
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
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        if (styled.has(material)) {
          continue;
        }
        const standard = material as THREE.MeshStandardMaterial;
        material.name = `living-room-${placement.targetId}`;
        if (standard.isMeshStandardMaterial) {
          if (placement.targetId === 'fireplace') {
            standard.color.set('#ffffff');
            standard.map = this.requireMaterials().fireplaceStone;
            standard.roughness = 0.9;
            standard.metalness = 0;
            standard.envMapIntensity = 0.28;
          } else {
            standard.color.multiply(new THREE.Color(placement.tint));
            standard.roughness = Math.max(standard.roughness, 0.72);
            standard.metalness = Math.min(standard.metalness, 0.12);
            standard.envMapIntensity = 0.5;
          }
          standard.needsUpdate = true;
        }
        styled.add(material);
      }
    });
    if (surfaceIndex === 0) {
      throw new Error(`Living-room asset "${placement.targetId}" contains no mesh.`);
    }
  }

  private createAnomalyTarget(
    placement: LivingAssetPlacement,
    object: THREE.Group,
  ): AnomalyTarget {
    const interactionVolume = new THREE.Mesh(
      this.ownGeometry(new THREE.BoxGeometry(...placement.interactionSize)),
      this.requireMaterials().interaction,
    );
    interactionVolume.name = `INTERACT_${placement.targetId}`;
    interactionVolume.position.y = placement.verticalAnchor === 'ground'
      ? placement.interactionSize[1] / 2
      : 0;
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
    const variants = this.createAnomalyVariants(placement, surfaceNames);
    const collisionObjects = this.getCollisionObjects(placement);
    return {
      id: placement.targetId,
      nodeName: object.name,
      interactionNodeNames: [interactionVolume.name],
      allowedKinds: [...new Set(variants.map(({ kind }) => kind))],
      variants,
      weight: placement.colliderName === undefined ? 0.95 : 1.1,
      minimumDifficulty: 3,
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
    placement: LivingAssetPlacement,
    surfaceNames: readonly string[],
  ): readonly PreparedAnomalyVariant[] {
    const variants: PreparedAnomalyVariant[] = [];
    if (placement.anomalyStyle === 'furniture') {
      if ((placement.dependentTargetIds?.length ?? 0) === 0) {
        variants.push(
          { id: 'hidden', kind: 'hide' },
          { id: 'appeared', kind: 'show' },
        );
      }
      variants.push(...ACCENT_SCALE_VARIANTS);
    } else if (placement.anomalyColors !== undefined) {
      if (placement.anomalyStyle === 'accent') {
        variants.push(
          { id: 'hidden', kind: 'hide' },
          { id: 'appeared', kind: 'show' },
        );
      }
      variants.push(
        {
          id: 'color-muted',
          kind: 'color',
          nodeNames: surfaceNames,
          color: placement.anomalyColors[0],
        },
        {
          id: 'color-unnatural',
          kind: 'color',
          nodeNames: surfaceNames,
          color: placement.anomalyColors[1],
        },
      );
    }
    return variants;
  }

  private createRecordingTapeTarget(): void {
    const object = new THREE.Group();
    object.name = 'ANOM_LivingRoom_RecordingTape';
    object.position.set(-1.28, 1.05, -3.3);
    const body = this.createBox(
      'ANOM_LivingRoom_RecordingTape_Body',
      [0.28, 0.045, 0.18],
      [0, 0, 0],
      this.requireMaterials().cassette,
    );
    const label = new THREE.Mesh(
      this.ownGeometry(new THREE.PlaneGeometry(0.2, 0.09)),
      this.requireMaterials().cassetteLabel,
    );
    label.name = 'DETAIL_LivingRoom_RecordingTape_Label';
    label.rotation.x = -Math.PI / 2;
    label.position.set(0, 0.024, 0);
    const interactionVolume = new THREE.Mesh(
      this.ownGeometry(new THREE.BoxGeometry(0.42, 0.22, 0.32)),
      this.requireMaterials().interaction,
    );
    interactionVolume.name = 'INTERACT_recording-tape';
    interactionVolume.position.y = 0.08;
    interactionVolume.layers.set(RENDER_LAYERS.interaction);
    interactionVolume.renderOrder = 11;
    object.add(body, label, interactionVolume);
    this.getVisualRoot().add(object);
    this.anomalyTargetRegistry.register({
      id: 'recording-tape',
      nodeName: object.name,
      interactionNodeNames: [interactionVolume.name],
      allowedKinds: ['color'],
      variants: [
        {
          id: 'label-blue',
          kind: 'color',
          nodeNames: [body.name],
          color: '#536f78',
        },
        {
          id: 'label-red',
          kind: 'color',
          nodeNames: [body.name],
          color: '#7b5656',
        },
      ],
      weight: 0.85,
      minimumDifficulty: 3,
      object,
      interactionVolume,
      interactionVolumes: [interactionVolume],
      initialState: captureAnomalyTargetInitialState(object),
      collisionObjects: [],
      collisionInitialState: [],
    });
  }

  private createFireplaceDetails(root: THREE.Object3D): void {
    const materials = this.requireMaterials();
    const details = new THREE.Group();
    details.name = 'DETAIL_LivingRoom_FireplaceFire';

    const emberBed = new THREE.Mesh(
      this.ownGeometry(new THREE.PlaneGeometry(0.34, 0.82)),
      materials.emberGlow,
    );
    emberBed.name = 'DETAIL_LivingRoom_FireplaceEmbers';
    emberBed.rotation.x = -Math.PI / 2;
    emberBed.position.set(-0.38, 0.18, 0);

    for (const [index, rotationY] of [-0.28, 0.28].entries()) {
      const log = new THREE.Mesh(
        this.ownGeometry(new THREE.CylinderGeometry(0.055, 0.07, 0.62, 10)),
        materials.charredWood,
      );
      log.name = `DETAIL_LivingRoom_FireplaceLog_${index + 1}`;
      log.position.set(-0.41, 0.27, index === 0 ? -0.04 : 0.04);
      log.rotation.order = 'YXZ';
      log.rotation.y = rotationY;
      log.rotation.x = Math.PI / 2;
      log.castShadow = true;
      details.add(log);
    }

    for (const [index, position] of ([
      [-0.46, 0.39, -0.19],
      [-0.47, 0.43, 0],
      [-0.46, 0.37, 0.2],
    ] as const).entries()) {
      const flame = new THREE.Mesh(
        this.ownGeometry(new THREE.ConeGeometry(0.065, 0.3, 9)),
        materials.emberGlow,
      );
      flame.name = `DETAIL_LivingRoom_FireplaceFlame_${index + 1}`;
      flame.position.fromArray(position);
      details.add(flame);
    }

    details.add(emberBed);
    root.add(details);
  }

  private getCollisionObjects(
    placement: LivingAssetPlacement,
  ): readonly THREE.Object3D[] {
    if (placement.colliderName === undefined) {
      return [];
    }
    const collider = this.getCollisionRoot().getObjectByName(placement.colliderName);
    if (collider === undefined) {
      throw new Error(`Living-room collider "${placement.colliderName}" is missing.`);
    }
    return [collider];
  }

  private createMaterials(): LivingMaterials {
    const standard = (
      color: THREE.ColorRepresentation,
      roughness: number,
      metalness = 0,
    ) => this.ownMaterial(new THREE.MeshStandardMaterial({ color, roughness, metalness }));
    const floor = standard('#ffffff', 0.87);
    floor.map = this.ownTexture(
      createWoodPlankFloorTexture({
        name: 'TEXTURE_LivingRoom_WornWood',
        seed: 3_071,
        repeat: [3.2, 3.5],
        plankColors: ['#745c45', '#80664b', '#6a5542', '#896e50'],
        seamColor: '#40352f',
      }),
    );
    const wallTexture = this.ownTexture(
      createAgedPlasterTexture({ name: 'TEXTURE_LivingRoom_AgedPlaster', seed: 3_071 }),
    );
    const wall = standard('#777068', 0.96);
    wall.map = wallTexture;
    const bayWall = standard('#59635e', 0.95);
    bayWall.map = wallTexture;
    const ceiling = standard('#cec8bd', 0.98);
    ceiling.side = THREE.DoubleSide;
    const glass = standard('#607e84', 0.25, 0.08);
    glass.transparent = true;
    glass.opacity = 0.68;
    glass.emissive.set('#18353a');
    glass.emissiveIntensity = 0.32;
    const fireplaceStone = this.ownTexture(
      createStoneTileFloorTexture({
        name: 'TEXTURE_LivingRoom_FireplaceStone',
        seed: 3_409,
        repeat: [1.8, 2.4],
        tileColors: ['#6f655b', '#807367', '#5e5750', '#8a7b6c'],
        groutColor: '#342f2b',
      }),
    );
    const charredWood = standard('#241713', 0.96);
    const emberGlow = this.ownMaterial(new THREE.MeshBasicMaterial({
      color: '#d65d24',
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    }));
    return {
      wall,
      bayWall,
      panel: standard('#463d3b', 0.9),
      floor,
      ceiling,
      trim: standard('#b7aa95', 0.84),
      door: standard('#49322d', 0.82),
      metal: standard('#34393a', 0.55, 0.2),
      glass,
      fireplaceStone,
      charredWood,
      emberGlow,
      cassette: standard('#383b3a', 0.62, 0.08),
      cassetteLabel: this.ownMaterial(new THREE.MeshBasicMaterial({ color: '#c8aa75' })),
      exitGlow: this.ownMaterial(new THREE.MeshBasicMaterial({
        color: '#7fa69f', transparent: true, opacity: 0, depthWrite: false,
        side: THREE.DoubleSide,
      })),
      collision: this.ownMaterial(new THREE.MeshBasicMaterial({
        color: '#d9665b', transparent: true, opacity: 0.28,
        depthWrite: false, wireframe: true,
      })),
      interaction: this.ownMaterial(new THREE.MeshBasicMaterial({
        color: '#f3c969', transparent: true, opacity: 0.2,
        depthWrite: false, wireframe: true,
      })),
    };
  }

  private createArchitecture(): void {
    const materials = this.requireMaterials();
    const root = new THREE.Group();
    root.name = 'LivingRoom_Architecture';
    root.add(
      this.createPolygonSurface('ARCH_LivingRoomFloor', -0.015, materials.floor),
      this.createPolygonSurface('ARCH_LivingRoomCeiling', ROOM_HEIGHT, materials.ceiling),
    );
    this.createWalls(root);
    this.createDoors(root);
    this.createBayDetails(root);
    this.getVisualRoot().add(root);
  }

  private createWalls(root: THREE.Object3D): void {
    const entranceLeft = ENTRANCE_CENTER_X - DOOR_WIDTH / 2;
    const entranceRight = ENTRANCE_CENTER_X + DOOR_WIDTH / 2;
    const exitLeft = EXIT_CENTER_X - DOOR_WIDTH / 2;
    const exitRight = EXIT_CENTER_X + DOOR_WIDTH / 2;
    const segments: readonly {
      readonly name: string;
      readonly start: Vector2Tuple;
      readonly end: Vector2Tuple;
      readonly bay?: boolean;
    }[] = [
      { name: 'SouthWest', start: [WEST_X, SOUTH_Z], end: [entranceLeft, SOUTH_Z] },
      { name: 'SouthEast', start: [entranceRight, SOUTH_Z], end: [EAST_X, SOUTH_Z] },
      { name: 'East', start: [EAST_X, SOUTH_Z], end: [EAST_X, NORTH_Z] },
      { name: 'North', start: [EAST_X, NORTH_Z], end: [WEST_X, NORTH_Z] },
      { name: 'WestNorth', start: [WEST_X, NORTH_Z], end: [WEST_X, BAY_NORTH_Z] },
      { name: 'BayNorthEast', start: [WEST_X, BAY_NORTH_Z], end: [exitRight, BAY_NORTH_Z], bay: true },
      { name: 'BayNorthWest', start: [exitLeft, BAY_NORTH_Z], end: [BAY_WEST_X, BAY_NORTH_Z], bay: true },
      { name: 'BayWest', start: [BAY_WEST_X, BAY_NORTH_Z], end: [BAY_WEST_X, BAY_SOUTH_Z], bay: true },
      { name: 'BaySouth', start: [BAY_WEST_X, BAY_SOUTH_Z], end: [WEST_X, BAY_SOUTH_Z], bay: true },
      { name: 'WestSouth', start: [WEST_X, BAY_SOUTH_Z], end: [WEST_X, SOUTH_Z] },
    ];
    for (const segment of segments) {
      const wallMaterial = segment.bay
        ? this.requireMaterials().bayWall
        : this.requireMaterials().wall;
      root.add(
        this.createSegmentBox(`WALL_LivingRoom_${segment.name}`, segment.start, segment.end, ROOM_HEIGHT, WALL_THICKNESS, ROOM_HEIGHT / 2, wallMaterial),
        this.createSegmentBox(`PANEL_LivingRoom_${segment.name}`, segment.start, segment.end, 0.78, WALL_THICKNESS + 0.025, 0.39, this.requireMaterials().panel, 0.98),
        this.createSegmentBox(`TRIM_LivingRoom_${segment.name}`, segment.start, segment.end, 0.07, WALL_THICKNESS + 0.045, 0.81, this.requireMaterials().trim, 0.98),
      );
    }
    root.add(
      this.createBox('WALL_LivingRoom_EntranceLintel', [DOOR_WIDTH, ROOM_HEIGHT - DOOR_HEIGHT, WALL_THICKNESS], [ENTRANCE_CENTER_X, DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT) / 2, SOUTH_Z], this.requireMaterials().wall),
      this.createBox('WALL_LivingRoom_ExitLintel', [DOOR_WIDTH, ROOM_HEIGHT - DOOR_HEIGHT, WALL_THICKNESS], [EXIT_CENTER_X, DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT) / 2, BAY_NORTH_Z], this.requireMaterials().bayWall),
    );
  }

  private createDoors(root: THREE.Object3D): void {
    const materials = this.requireMaterials();
    root.add(
      this.createBox('FRAME_LivingEntrance_Left', [0.09, DOOR_HEIGHT + 0.08, 0.26], [ENTRANCE_CENTER_X - DOOR_WIDTH / 2, DOOR_HEIGHT / 2, SOUTH_Z - 0.02], materials.trim),
      this.createBox('FRAME_LivingEntrance_Right', [0.09, DOOR_HEIGHT + 0.08, 0.26], [ENTRANCE_CENTER_X + DOOR_WIDTH / 2, DOOR_HEIGHT / 2, SOUTH_Z - 0.02], materials.trim),
      this.createBox('FRAME_LivingEntrance_Top', [DOOR_WIDTH + 0.18, 0.09, 0.26], [ENTRANCE_CENTER_X, DOOR_HEIGHT, SOUTH_Z - 0.02], materials.trim),
      this.createBox('DOOR_LivingRoom_Entrance', [DOOR_WIDTH - 0.08, DOOR_HEIGHT - 0.06, 0.09], [ENTRANCE_CENTER_X, (DOOR_HEIGHT - 0.06) / 2, SOUTH_Z - 0.08], materials.door),
    );
    const pivot = new THREE.Group();
    pivot.name = 'DOOR_LivingRoomExit_Pivot';
    pivot.position.set(EXIT_CENTER_X - DOOR_WIDTH / 2 + 0.04, 0, BAY_NORTH_Z + 0.08);
    pivot.add(
      this.createBox('DOOR_LivingRoom_Exit', [DOOR_WIDTH - 0.08, DOOR_HEIGHT - 0.06, 0.09], [(DOOR_WIDTH - 0.08) / 2, (DOOR_HEIGHT - 0.06) / 2, 0], materials.door),
      this.createSphere('DOOR_LivingRoom_ExitHandle', 0.055, [DOOR_WIDTH - 0.23, 1.02, 0.065], materials.metal),
    );
    root.add(
      pivot,
      this.createBox('FRAME_LivingExit_Left', [0.09, DOOR_HEIGHT + 0.08, 0.26], [EXIT_CENTER_X - DOOR_WIDTH / 2, DOOR_HEIGHT / 2, BAY_NORTH_Z + 0.02], materials.trim),
      this.createBox('FRAME_LivingExit_Right', [0.09, DOOR_HEIGHT + 0.08, 0.26], [EXIT_CENTER_X + DOOR_WIDTH / 2, DOOR_HEIGHT / 2, BAY_NORTH_Z + 0.02], materials.trim),
      this.createBox('FRAME_LivingExit_Top', [DOOR_WIDTH + 0.18, 0.09, 0.26], [EXIT_CENTER_X, DOOR_HEIGHT, BAY_NORTH_Z + 0.02], materials.trim),
    );
    this.exitDoor = pivot;
    const portal = new THREE.Group();
    portal.name = 'EXIT_LivingRoom_Portal';
    portal.visible = false;
    const glow = new THREE.Mesh(
      this.ownGeometry(new THREE.PlaneGeometry(DOOR_WIDTH * 0.82, DOOR_HEIGHT * 0.9)),
      materials.exitGlow,
    );
    glow.position.set(EXIT_CENTER_X, DOOR_HEIGHT * 0.46, BAY_NORTH_Z - 0.055);
    const light = new THREE.PointLight('#7aaaa1', 0, 2.6, 2);
    light.position.set(EXIT_CENTER_X, 1.2, BAY_NORTH_Z - 0.2);
    portal.add(glow, light);
    root.add(portal);
    this.exitPortal = portal;
    this.exitPortalLight = light;
  }

  private createBayDetails(root: THREE.Object3D): void {
    const materials = this.requireMaterials();
    root.add(
      this.createBox('ARCH_LivingRoom_BayColumnSouth', [0.32, 2.72, 0.32], [WEST_X, 1.36, BAY_SOUTH_Z], materials.trim),
      this.createBox('ARCH_LivingRoom_BayColumnNorth', [0.32, 2.72, 0.32], [WEST_X, 1.36, BAY_NORTH_Z], materials.trim),
      this.createBox('ARCH_LivingRoom_BayHeader', [0.32, 0.32, BAY_SOUTH_Z - BAY_NORTH_Z], [WEST_X, 2.84, (BAY_SOUTH_Z + BAY_NORTH_Z) / 2], materials.trim),
      this.createBox('WINDOW_LivingRoom_BayWest', [0.035, 1.42, 2.15], [BAY_WEST_X + 0.1, 1.72, -0.05], materials.glass),
    );
  }

  private createLighting(): void {
    const hemisphere = new THREE.HemisphereLight('#91a0a2', '#3b2c28', 0.39);
    hemisphere.name = 'LIGHT_LivingRoom_Ambient';
    const ambient = new THREE.AmbientLight('#c5bcb0', 0.12);
    ambient.name = 'LIGHT_LivingRoom_Bounce';
    const key = new THREE.SpotLight('#efbd83', 6.2, 10, Math.PI / 3.1, 0.52, 1.15);
    key.name = 'LIGHT_LivingRoom_Chandelier';
    key.position.set(0.25, 3.02, 0.2);
    key.target.position.set(0.25, 0.35, 0.2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.3;
    key.shadow.camera.far = 10;
    key.shadow.bias = -0.0002;
    key.shadow.normalBias = 0.026;
    const fire = new THREE.PointLight('#d48b4e', 0.62, 5.4, 1.7);
    fire.name = 'LIGHT_LivingRoom_Fireplace';
    fire.position.set(3.25, 0.75, -0.25);
    const bay = new THREE.PointLight('#789b96', 0.45, 5.8, 1.6);
    bay.name = 'LIGHT_LivingRoom_Bay';
    bay.position.set(-4.9, 1.85, 0.1);
    const archive = new THREE.PointLight('#c8aa82', 0.38, 5, 1.7);
    archive.name = 'LIGHT_LivingRoom_Archive';
    archive.position.set(-0.3, 1.65, -3.0);
    const entrance = new THREE.PointLight('#bcae9e', 0.34, 5.8, 1.6);
    entrance.name = 'LIGHT_LivingRoom_EntranceFill';
    entrance.position.set(2.6, 1.8, 2.65);
    this.getVisualRoot().add(
      hemisphere, ambient, key, key.target, fire, bay, archive, entrance,
    );
  }

  private createCollisions(): void {
    this.addCollisionFloor();
    this.addCollisionBox('COLLIDER_LivingRoomCeiling', [11.4, 0.12, 8.2], [-0.65, ROOM_HEIGHT + 0.06, 0]);
    const entranceLeft = ENTRANCE_CENTER_X - DOOR_WIDTH / 2;
    const entranceRight = ENTRANCE_CENTER_X + DOOR_WIDTH / 2;
    const exitLeft = EXIT_CENTER_X - DOOR_WIDTH / 2;
    const exitRight = EXIT_CENTER_X + DOOR_WIDTH / 2;
    const segments: readonly [string, Vector2Tuple, Vector2Tuple][] = [
      ['SouthWest', [WEST_X, SOUTH_Z], [entranceLeft, SOUTH_Z]],
      ['SouthEast', [entranceRight, SOUTH_Z], [EAST_X, SOUTH_Z]],
      ['East', [EAST_X, SOUTH_Z], [EAST_X, NORTH_Z]],
      ['North', [EAST_X, NORTH_Z], [WEST_X, NORTH_Z]],
      ['WestNorth', [WEST_X, NORTH_Z], [WEST_X, BAY_NORTH_Z]],
      ['BayNorthEast', [WEST_X, BAY_NORTH_Z], [exitRight, BAY_NORTH_Z]],
      ['BayNorthWest', [exitLeft, BAY_NORTH_Z], [BAY_WEST_X, BAY_NORTH_Z]],
      ['BayWest', [BAY_WEST_X, BAY_NORTH_Z], [BAY_WEST_X, BAY_SOUTH_Z]],
      ['BaySouth', [BAY_WEST_X, BAY_SOUTH_Z], [WEST_X, BAY_SOUTH_Z]],
      ['WestSouth', [WEST_X, BAY_SOUTH_Z], [WEST_X, SOUTH_Z]],
    ];
    for (const [name, start, end] of segments) {
      this.addCollisionSegment(`COLLIDER_LivingRoomWall_${name}`, start, end);
    }
    this.addCollisionBox('COLLIDER_LivingRoomEntranceLintel', [DOOR_WIDTH, ROOM_HEIGHT - DOOR_HEIGHT, WALL_THICKNESS], [ENTRANCE_CENTER_X, DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT) / 2, SOUTH_Z]);
    this.addCollisionBox('COLLIDER_LivingRoomEntranceDoor', [DOOR_WIDTH, DOOR_HEIGHT, WALL_THICKNESS], [ENTRANCE_CENTER_X, DOOR_HEIGHT / 2, SOUTH_Z]);
    this.addCollisionBox('COLLIDER_LivingRoomExitLintel', [DOOR_WIDTH, ROOM_HEIGHT - DOOR_HEIGHT, WALL_THICKNESS], [EXIT_CENTER_X, DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT) / 2, BAY_NORTH_Z]);
    this.exitDoorCollider = this.addCollisionBox('COLLIDER_LivingRoomExitDoor', [DOOR_WIDTH, DOOR_HEIGHT, WALL_THICKNESS], [EXIT_CENTER_X, DOOR_HEIGHT / 2, BAY_NORTH_Z]);
    this.addCollisionBox('COLLIDER_LivingRoomBayColumnSouth', [0.32, 2.72, 0.32], [WEST_X, 1.36, BAY_SOUTH_Z]);
    this.addCollisionBox('COLLIDER_LivingRoomBayColumnNorth', [0.32, 2.72, 0.32], [WEST_X, 1.36, BAY_NORTH_Z]);
    for (const placement of LIVING_ASSET_PLACEMENTS) {
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
  }

  private addCollisionFloor(): void {
    const geometry = this.ownGeometry(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([-20, 0, -20, 0, 0, 20, 20, 0, -20], 3));
    geometry.computeVertexNormals();
    const floor = new THREE.Mesh(geometry, this.requireMaterials().collision);
    floor.name = 'COLLIDER_LivingRoomFloor';
    floor.visible = false;
    this.getCollisionRoot().add(floor);
    if (import.meta.env.DEV) {
      const debugFloor = this.createPolygonSurface('DEBUG_COLLIDER_LivingRoomFloor', -0.025, this.requireMaterials().collision);
      debugFloor.layers.set(RENDER_LAYERS.debug);
      debugFloor.renderOrder = 9;
      this.getCollisionRoot().add(debugFloor);
    }
  }

  private addCollisionSegment(name: string, start: Vector2Tuple, end: Vector2Tuple): void {
    const mesh = this.createSegmentBox(name, start, end, ROOM_HEIGHT, WALL_THICKNESS, ROOM_HEIGHT / 2, this.requireMaterials().collision);
    mesh.renderOrder = 9;
    this.getCollisionRoot().add(mesh);
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

  private createPolygonSurface(name: string, height: number, material: THREE.Material): THREE.Mesh {
    const shape = new THREE.Shape();
    const first = LIVING_FOOTPRINT[0] as Vector2Tuple;
    shape.moveTo(first[0], -first[1]);
    for (const point of LIVING_FOOTPRINT.slice(1)) {
      shape.lineTo(point[0], -point[1]);
    }
    shape.closePath();
    const mesh = new THREE.Mesh(this.ownGeometry(new THREE.ShapeGeometry(shape)), material);
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
    const mesh = new THREE.Mesh(
      this.ownGeometry(new THREE.BoxGeometry(Math.hypot(deltaX, deltaZ) * lengthScale, height, depth)),
      material,
    );
    mesh.name = name;
    mesh.position.set((start[0] + end[0]) / 2, y, (start[1] + end[1]) / 2);
    mesh.rotation.y = -Math.atan2(deltaZ, deltaX);
    mesh.receiveShadow = true;
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
      this.ownGeometry(new THREE.SphereGeometry(radius, 14, 9)),
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

  private requireMaterials(): LivingMaterials {
    if (this.materials === null) {
      throw new Error('Living-room materials are unavailable.');
    }
    return this.materials;
  }
}
