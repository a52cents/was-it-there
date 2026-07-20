import * as THREE from 'three';
import { CORRIDOR_ASSET_CATALOG } from '../../content/rooms/CorridorAssetCatalog';
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

type Vector3Tuple = readonly [number, number, number];
type QuaternionTuple = readonly [number, number, number, number];
type CorridorAssetKey = keyof typeof CORRIDOR_ASSET_CATALOG;
type CorridorTargetId =
  | 'bench'
  | 'boots'
  | 'coat-stand'
  | 'console'
  | 'frame-east'
  | 'frame-west'
  | 'parcel-closed'
  | 'parcel-open'
  | 'phone'
  | 'plant'
  | 'runner-rug'
  | 'side-table'
  | 'small-speaker'
  | 'wall-clock'
  | 'wall-hooks'
  | 'wall-lamp';

interface CorridorMaterials {
  readonly wall: THREE.MeshStandardMaterial;
  readonly wainscot: THREE.MeshStandardMaterial;
  readonly floor: THREE.MeshStandardMaterial;
  readonly ceiling: THREE.MeshStandardMaterial;
  readonly trim: THREE.MeshStandardMaterial;
  readonly door: THREE.MeshStandardMaterial;
  readonly darkMetal: THREE.MeshStandardMaterial;
  readonly lampGlass: THREE.MeshStandardMaterial;
  readonly exitGlow: THREE.MeshBasicMaterial;
  readonly collision: THREE.MeshBasicMaterial;
  readonly interaction: THREE.MeshBasicMaterial;
}

interface CorridorAssetPlacement {
  readonly key: CorridorAssetKey;
  readonly targetId: CorridorTargetId;
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
  readonly dependentTargetIds?: readonly CorridorTargetId[];
}

const CORRIDOR_WIDTH = 2.8;
const FIRST_LEG_LENGTH = 7.6;
const SECOND_LEG_LENGTH = 5.2;
const ROOM_HEIGHT = 2.8;
const WALL_THICKNESS = 0.16;
const DOOR_HEIGHT = 2.15;
const DOOR_WIDTH = 1;
const NORTH_WALL_Z = -FIRST_LEG_LENGTH / 2;
const TURN_CENTER_Z = NORTH_WALL_Z + CORRIDOR_WIDTH / 2;
const INNER_CORNER_Z = TURN_CENTER_Z + CORRIDOR_WIDTH / 2;
const FAR_EAST_X = CORRIDOR_WIDTH / 2 + SECOND_LEG_LENGTH;
const SECOND_LEG_CENTER_X = CORRIDOR_WIDTH / 2 + SECOND_LEG_LENGTH / 2;
const EXIT_CENTER_Z = TURN_CENTER_Z;
const FLOOR_ROTATION_ANOMALY_RADIANS = Math.PI / 6;
const WALL_ROTATION_ANOMALY_RADIANS = Math.PI / 12;

const CORRIDOR_ASSET_PLACEMENTS: readonly CorridorAssetPlacement[] = [
  {
    key: 'console',
    targetId: 'console',
    objectName: 'ANOM_Corridor_Console',
    position: [-1.08, 0, -0.78],
    rotationY: Math.PI / 2,
    maximumSize: [0.46, 0.86, 1.32],
    verticalAnchor: 'ground',
    interactionSize: [0.54, 0.96, 1.44],
    interactionPosition: [0, 0.43, 0],
    tint: '#b59b7e',
    anomalyColors: [
      { id: 'console-blue', color: '#607c88' },
      { id: 'console-red', color: '#8f5e5a' },
    ],
    colliderName: 'COLLIDER_Console',
    dependentTargetIds: ['phone'],
  },
  {
    key: 'officePhone',
    targetId: 'phone',
    objectName: 'ANOM_Corridor_Phone',
    position: [-1.1, 0.8, -1.15],
    scale: [1.15, 1.15, 1.15],
    rotationY: Math.PI / 2,
    maximumSize: [0.34, 0.2, 0.3],
    verticalAnchor: 'ground',
    interactionSize: [0.46, 0.34, 0.42],
    interactionPosition: [0, 0.1, 0],
    tint: '#aaa79f',
    anomalyColors: [
      { id: 'phone-green', color: '#617f70' },
      { id: 'phone-red', color: '#985a5d' },
    ],
    rotations: 'floor',
  },
  {
    key: 'bench',
    targetId: 'bench',
    objectName: 'ANOM_Corridor_Bench',
    position: [0.94, 0, 0.8],
    rotationY: -Math.PI / 2,
    maximumSize: [0.66, 0.62, 1.28],
    verticalAnchor: 'ground',
    interactionSize: [0.76, 0.72, 1.4],
    interactionPosition: [0, 0.31, 0],
    tint: '#b1a28e',
    anomalyColors: [
      { id: 'bench-plum', color: '#786378' },
      { id: 'bench-olive', color: '#6e7860' },
    ],
    colliderName: 'COLLIDER_Bench',
  },
  {
    key: 'boots',
    targetId: 'boots',
    objectName: 'ANOM_Corridor_Boots',
    position: [-0.95, 0, 1.85],
    quaternion: [
      -0.030843564597231896,
      0.706433772212892,
      0.0308435645972319,
      0.7064337722128922,
    ],
    rotationY: Math.PI,
    maximumSize: [0.58, 0.32, 0.56],
    verticalAnchor: 'ground',
    interactionSize: [0.7, 0.42, 0.68],
    interactionPosition: [0, 0.16, 0],
    tint: '#b28c5c',
    anomalyColors: [
      { id: 'boots-blue', color: '#546f82' },
      { id: 'boots-purple', color: '#80658c' },
    ],
    rotations: 'floor',
  },
  {
    key: 'pottedPlant',
    targetId: 'plant',
    objectName: 'ANOM_Corridor_Plant',
    position: [5.92, 0, -1.44],
    rotationY: 0.2,
    maximumSize: [0.62, 1.02, 0.62],
    verticalAnchor: 'ground',
    interactionSize: [0.74, 1.14, 0.74],
    interactionPosition: [0, 0.51, 0],
    tint: '#a7aa91',
    anomalyColors: [
      { id: 'plant-purple', color: '#79648c' },
      { id: 'plant-orange', color: '#a46f4e' },
    ],
  },
  {
    key: 'runnerRug',
    targetId: 'runner-rug',
    objectName: 'ANOM_Corridor_RunnerRug',
    position: [0, 0.012, 3.3],
    rotationY: 0,
    maximumSize: [1.05, 0.045, 2.5],
    verticalAnchor: 'ground',
    interactionSize: [1.18, 0.14, 2.62],
    interactionPosition: [0, 0.05, 0],
    tint: '#a68f78',
    anomalyColors: [
      { id: 'rug-red', color: '#8c5755' },
      { id: 'rug-blue', color: '#597887' },
    ],
    rotations: 'floor',
  },
  {
    key: 'coatStand',
    targetId: 'coat-stand',
    objectName: 'ANOM_Corridor_CoatStand',
    position: [1.05, 0, -3.3],
    rotationY: 0.18,
    maximumSize: [0.68, 1.72, 0.68],
    verticalAnchor: 'ground',
    interactionSize: [0.8, 1.84, 0.8],
    interactionPosition: [0, 0.86, 0],
    tint: '#a99278',
    anomalyColors: [
      { id: 'coat-stand-blue', color: '#586f82' },
      { id: 'coat-stand-red', color: '#895b58' },
    ],
  },
  {
    key: 'wallHooks',
    targetId: 'wall-hooks',
    objectName: 'ANOM_Corridor_WallHooks',
    position: [3.25, 1.55, -1.08],
    scale: [2, 2, 2],
    rotationY: Math.PI,
    maximumSize: [0.84, 0.48, 0.24],
    verticalAnchor: 'center',
    interactionSize: [0.96, 0.6, 0.28],
    interactionPosition: [0, 0, 0],
    tint: '#b49c80',
    anomalyColors: [
      { id: 'hooks-green', color: '#5d7768' },
      { id: 'hooks-purple', color: '#786487' },
    ],
    rotations: 'wall-z',
  },
  {
    key: 'sideTable',
    targetId: 'side-table',
    objectName: 'ANOM_Corridor_SideTable',
    position: [4.5, 0, -1.34],
    rotationY: 0,
    maximumSize: [0.9, 0.72, 0.5],
    verticalAnchor: 'ground',
    interactionSize: [1.02, 0.82, 0.62],
    interactionPosition: [0, 0.36, 0],
    tint: '#af9273',
    anomalyColors: [
      { id: 'side-table-blue', color: '#5d7481' },
      { id: 'side-table-red', color: '#8b5a56' },
    ],
    colliderName: 'COLLIDER_SideTable',
    dependentTargetIds: ['small-speaker'],
  },
  {
    key: 'smallSpeaker',
    targetId: 'small-speaker',
    objectName: 'ANOM_Corridor_SmallSpeaker',
    position: [4.5, 0.65, -1.36],
    rotationY: Math.PI,
    maximumSize: [0.28, 0.36, 0.24],
    verticalAnchor: 'ground',
    interactionSize: [0.4, 0.48, 0.36],
    interactionPosition: [0, 0.18, 0],
    tint: '#a7a69f',
    anomalyColors: [
      { id: 'speaker-yellow', color: '#a88a51' },
      { id: 'speaker-purple', color: '#75617f' },
    ],
    rotations: 'floor',
  },
  {
    key: 'parcelClosed',
    targetId: 'parcel-closed',
    objectName: 'ANOM_Corridor_ParcelClosed',
    position: [5.12, 0, -3.36],
    rotationY: -0.12,
    maximumSize: [0.52, 0.46, 0.52],
    verticalAnchor: 'ground',
    interactionSize: [0.64, 0.58, 0.64],
    interactionPosition: [0, 0.23, 0],
    tint: '#b59670',
    anomalyColors: [
      { id: 'parcel-closed-blue', color: '#597382' },
      { id: 'parcel-closed-green', color: '#667962' },
    ],
    rotations: 'floor',
  },
  {
    key: 'parcelOpen',
    targetId: 'parcel-open',
    objectName: 'ANOM_Corridor_ParcelOpen',
    position: [5.72, 0, -3.27],
    rotationY: 0.2,
    maximumSize: [0.58, 0.58, 0.58],
    verticalAnchor: 'ground',
    interactionSize: [0.7, 0.7, 0.7],
    interactionPosition: [0, 0.29, 0],
    tint: '#b59670',
    anomalyColors: [
      { id: 'parcel-open-red', color: '#8b5c56' },
      { id: 'parcel-open-purple', color: '#77617f' },
    ],
    rotations: 'floor',
  },
  {
    key: 'wallLamp',
    targetId: 'wall-lamp',
    objectName: 'ANOM_Corridor_WallLamp',
    position: [-1.3, 1.82, 0.45],
    rotationY: Math.PI / 2,
    maximumSize: [0.24, 0.48, 0.36],
    verticalAnchor: 'center',
    interactionSize: [0.36, 0.62, 0.5],
    interactionPosition: [0, 0, 0],
    tint: '#d1b988',
    anomalyColors: [
      { id: 'lamp-cold', color: '#7290a0' },
      { id: 'lamp-red', color: '#a35f59' },
    ],
  },
  {
    key: 'wallClock',
    targetId: 'wall-clock',
    objectName: 'ANOM_Corridor_WallClock',
    position: [3.7, 1.82, -3.65],
    quaternion: [0, -0.7071067811865475, 0, 0.7071067811865476],
    scale: [5.5, 5.5, 5.5],
    rotationY: 0,
    maximumSize: [0.62, 0.62, 0.18],
    verticalAnchor: 'center',
    interactionSize: [0.2, 0.2, 0.05],
    interactionPosition: [0, 0, 0],
    tint: '#c5bba7',
    anomalyColors: [
      { id: 'clock-black', color: '#343b3c' },
      { id: 'clock-red', color: '#985b58' },
    ],
  },
  {
    key: 'frameLarge',
    targetId: 'frame-east',
    objectName: 'ANOM_Corridor_FrameEast',
    position: [1.3, 1.56, 0.45],
    rotationY: -Math.PI / 2,
    maximumSize: [0.16, 0.78, 0.62],
    verticalAnchor: 'center',
    interactionSize: [0.26, 0.9, 0.74],
    interactionPosition: [0, 0, 0],
    tint: '#bca98c',
    anomalyColors: [
      { id: 'frame-east-green', color: '#617969' },
      { id: 'frame-east-blue', color: '#58778b' },
    ],
    rotations: 'wall-x',
  },
  {
    key: 'frameSmall',
    targetId: 'frame-west',
    objectName: 'ANOM_Corridor_FrameWest',
    position: [-1.3, 1.48, 1.7],
    quaternion: [0, 0, -0.17364817766693036, 0.9848077530122082],
    rotationY: Math.PI / 2,
    maximumSize: [0.16, 0.52, 0.42],
    verticalAnchor: 'center',
    interactionSize: [0.26, 0.64, 0.54],
    interactionPosition: [0, 0, 0],
    tint: '#bca98c',
    anomalyColors: [
      { id: 'frame-west-red', color: '#925b58' },
      { id: 'frame-west-purple', color: '#766285' },
    ],
    rotations: 'wall-x',
  },
] as const;

export const CORRIDOR_EXIT_THRESHOLD = {
  x: FAR_EAST_X + 0.4,
  minimumZ: EXIT_CENTER_Z - DOOR_WIDTH / 2,
  maximumZ: EXIT_CENTER_Z + DOOR_WIDTH / 2,
} as const;

export class GreyboxCorridor extends RoomRuntime implements PlayableRoom {
  public readonly definition: RoomDefinition = {
    id: 'first-corridor',
    displayName: 'Corridor',
    observationDurationMs: 15_000,
    searchDurationMs: 45_000,
    anomalyCount: { min: 2, max: 2 },
    playerSpawn: {
      position: [0, 0, 3.2],
      yaw: 0,
      pitch: 0,
    },
  };

  private readonly anomalyTargetRegistry = new AnomalyTargetRegistry();
  private readonly assetLeases: GlbAssetLease[] = [];
  private materials: CorridorMaterials | null = null;
  private exitDoor: THREE.Object3D | null = null;
  private exitDoorCollider: THREE.Mesh | null = null;
  private exitPortal: THREE.Group | null = null;
  private exitPortalLight: THREE.PointLight | null = null;
  private assetManager: AssetManager | null = null;
  private assetLoadPromise: Promise<void> | null = null;
  private assetsLoaded = false;
  private buildRevision = 0;

  public constructor() {
    super('ROOM_FirstCorridor_VisualRoot', 'COLLIDER_FirstCorridor_Root');
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
    return CORRIDOR_EXIT_THRESHOLD;
  }

  public isAssetsLoaded(): boolean {
    return this.assetsLoaded;
  }

  public getLoadedAssetIds(): readonly string[] {
    return this.assetLeases.map((lease) => lease.assetId);
  }

  public async loadAssets(assetManager?: AssetManager): Promise<void> {
    await this.loadCorridorAssets(assetManager);
    const manager = this.assetManager;

    if (manager === null) {
      throw new Error('The first corridor AssetManager is unavailable.');
    }

    await this.loadHouseShellAssets(manager, 'corridor');
  }

  private async loadCorridorAssets(assetManager?: AssetManager): Promise<void> {
    if (!this.isMounted()) {
      throw new Error('The first corridor must be mounted before loading assets.');
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
      throw new Error('The first corridor AssetManager is unavailable.');
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

  public setExitDoorCollisionEnabled(enabled: boolean): void {
    const collider = this.exitDoorCollider;

    if (collider === null) {
      throw new Error('The first corridor exit-door collider is unavailable.');
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

    this.rebuildWorldCollision();
  }

  public setExitPortalProgress(progress: number): void {
    const portal = this.exitPortal;
    const light = this.exitPortalLight;
    const materials = this.materials;

    if (portal === null || light === null || materials === null) {
      throw new Error('The first corridor exit portal is unavailable.');
    }

    const safeProgress = Number.isFinite(progress)
      ? THREE.MathUtils.clamp(progress, 0, 1)
      : 0;
    portal.visible = safeProgress > 0;
    materials.exitGlow.opacity = safeProgress * 0.82;
    light.intensity = safeProgress * 2.1;
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
    const leases: GlbAssetLease[] = [];

    try {
      for (const placement of CORRIDOR_ASSET_PLACEMENTS) {
        const lease = await assetManager.acquire(
          CORRIDOR_ASSET_CATALOG[placement.key],
        );
        leases.push(lease);

        if (!this.isMounted() || revision !== this.buildRevision) {
          throw new Error('The first corridor changed while its assets were loading.');
        }
      }

      if (!this.isMounted() || revision !== this.buildRevision) {
        throw new Error('The first corridor changed while its assets were loading.');
      }

      const preparedTargets = CORRIDOR_ASSET_PLACEMENTS.map(
        (placement, index) => {
          const object = this.createFittedAssetObject(
            placement,
            leases[index] as GlbAssetLease,
          );
          return this.createAnomalyTarget(placement, object);
        },
      );
      const validationRegistry = new AnomalyTargetRegistry();

      for (const target of preparedTargets) {
        validationRegistry.register(target);
      }

      this.getVisualRoot().add(...preparedTargets.map((target) => target.object));

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
        `First corridor assets could not be loaded: ${this.getErrorMessage(error)}`,
        { cause: error },
      );
    }
  }

  private createFittedAssetObject(
    placement: CorridorAssetPlacement,
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
      throw new Error(`Corridor asset "${lease.assetId}" has invalid bounds.`);
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

  private harmonizeImportedMaterials(
    root: THREE.Object3D,
    placement: CorridorAssetPlacement,
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
        material.name = `corridor-${placement.targetId}`;

        if (standard.isMeshStandardMaterial) {
          standard.color.multiply(new THREE.Color(placement.tint));
          standard.roughness = Math.max(standard.roughness, 0.76);
          standard.metalness = Math.min(standard.metalness, 0.1);
          standard.envMapIntensity = 0.5;
          standard.needsUpdate = true;
        }

        styledMaterials.add(material);
      }
    });

    if (surfaceIndex === 0) {
      throw new Error(`Corridor asset "${placement.targetId}" contains no mesh.`);
    }
  }

  private createAnomalyTarget(
    placement: CorridorAssetPlacement,
    object: THREE.Group,
  ): AnomalyTarget {
    const materials = this.requireMaterials();
    const interactionVolume = new THREE.Mesh(
      this.ownGeometry(new THREE.BoxGeometry(...placement.interactionSize)),
      materials.interaction,
    );
    interactionVolume.name = `INTERACT_${placement.targetId}`;
    interactionVolume.position.fromArray(placement.interactionPosition);
    interactionVolume.layers.set(RENDER_LAYERS.interaction);
    interactionVolume.renderOrder = 11;
    object.add(interactionVolume);

    if (placement.targetId === 'wall-lamp') {
      const glow = new THREE.PointLight('#ffc982', 0.32, 2.5, 1.7);
      glow.name = 'LIGHT_Corridor_WallLampGlow';
      glow.position.set(0.18, -0.03, 0);
      object.add(glow);
    }

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
      allowedKinds: [...new Set(variants.map((variant) => variant.kind))],
      variants,
      weight: placement.colliderName === undefined ? 0.95 : 1.1,
      minimumDifficulty: 1,
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
    placement: CorridorAssetPlacement,
    surfaceNames: readonly string[],
  ): readonly PreparedAnomalyVariant[] {
    const rotations: PreparedAnomalyVariant[] = [];

    if (placement.rotations === 'floor') {
      rotations.push(
        {
          id: 'turned-left',
          kind: 'rotate',
          rotationOffsetRadians: [0, FLOOR_ROTATION_ANOMALY_RADIANS, 0],
        },
        {
          id: 'turned-right',
          kind: 'rotate',
          rotationOffsetRadians: [0, -FLOOR_ROTATION_ANOMALY_RADIANS, 0],
        },
      );
    } else if (placement.rotations === 'wall-x') {
      rotations.push(
        {
          id: 'tilted-left',
          kind: 'rotate',
          rotationOffsetRadians: [WALL_ROTATION_ANOMALY_RADIANS, 0, 0],
        },
        {
          id: 'tilted-right',
          kind: 'rotate',
          rotationOffsetRadians: [-WALL_ROTATION_ANOMALY_RADIANS, 0, 0],
        },
      );
    } else if (placement.rotations === 'wall-z') {
      rotations.push(
        {
          id: 'tilted-left',
          kind: 'rotate',
          rotationOffsetRadians: [0, 0, WALL_ROTATION_ANOMALY_RADIANS],
        },
        {
          id: 'tilted-right',
          kind: 'rotate',
          rotationOffsetRadians: [0, 0, -WALL_ROTATION_ANOMALY_RADIANS],
        },
      );
    }

    return [
      { id: 'hidden', kind: 'hide' },
      { id: 'appeared', kind: 'show' },
      ...rotations,
      ...placement.anomalyColors.map(({ id, color }) => ({
        id,
        kind: 'color' as const,
        nodeNames: surfaceNames,
        color,
      })),
    ];
  }

  private addStoryClockDisplay(clock: THREE.Group): void {
    const display = new THREE.Group();
    display.name = STORY_LOOP_ANCHOR.corridorClockObjectName;
    display.position.set(0.022, 0, 0);
    display.rotation.y = Math.PI / 2;
    display.scale.set(
      1 / clock.scale.x,
      1 / clock.scale.y,
      1 / clock.scale.z,
    );
    const material = this.ownMaterial(
      new THREE.MeshBasicMaterial({
        color: '#7f2524',
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
      }),
    );
    material.name = 'STORY_CorridorClock_Digits';
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
        segment.name = `STORY_CorridorClock_Digit${digitIndex}_${segmentId}`;
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
      dot.name = `STORY_CorridorClock_Colon_${String(y)}`;
      dot.position.set(0, y, 0);
      dot.layers.set(RENDER_LAYERS.scene);
      display.add(dot);
    }

    clock.add(display);
  }

  private getCollisionObjects(
    placement: CorridorAssetPlacement,
  ): readonly THREE.Object3D[] {
    if (placement.colliderName === undefined) {
      return [];
    }

    const collider = this.getCollisionRoot().getObjectByName(
      placement.colliderName,
    );

    if (collider === undefined) {
      throw new Error(`Corridor collider "${placement.colliderName}" is missing.`);
    }

    return [collider];
  }

  private createMaterials(): CorridorMaterials {
    const standard = (
      color: THREE.ColorRepresentation,
      roughness: number,
      metalness = 0,
    ): THREE.MeshStandardMaterial =>
      this.ownMaterial(
        new THREE.MeshStandardMaterial({ color, roughness, metalness }),
      );
    const floor = standard('#ffffff', 0.88);
    floor.map = this.createFloorTexture();
    const wall = standard('#81796c', 0.96);
    wall.map = this.ownTexture(
      createAgedPlasterTexture({
        name: 'TEXTURE_Corridor_AgedPlaster',
        seed: 3_043,
      }),
    );

    return {
      wall,
      wainscot: standard('#53605c', 0.9),
      floor,
      ceiling: standard('#c4bcae', 0.98),
      trim: standard('#b9aa93', 0.88),
      door: standard('#46332e', 0.82),
      darkMetal: standard('#343b3c', 0.58, 0.18),
      lampGlass: standard('#e8c77e', 0.42, 0),
      exitGlow: this.ownMaterial(
        new THREE.MeshBasicMaterial({
          color: '#80a9a3',
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
        name: 'TEXTURE_Corridor_WornWood',
        seed: 3_043,
        repeat: [1.5, 4.5],
        plankColors: ['#8c745c', '#806951', '#735f4d', '#957a5e'],
        seamColor: '#4d4137',
      }),
    );
  }

  private createArchitecture(): void {
    const materials = this.requireMaterials();
    const root = new THREE.Group();
    root.name = 'Corridor_Architecture';
    const northWallLength = CORRIDOR_WIDTH + SECOND_LEG_LENGTH;
    const northWallCenterX = (FAR_EAST_X - CORRIDOR_WIDTH / 2) / 2;
    root.add(
      this.createVisualBox(
        'ARCH_Floor_FirstLeg',
        [CORRIDOR_WIDTH, 0.12, FIRST_LEG_LENGTH],
        [0, -0.06, 0],
        materials.floor,
      ),
      this.createVisualBox(
        'ARCH_Floor_SecondLeg',
        [SECOND_LEG_LENGTH, 0.12, CORRIDOR_WIDTH],
        [SECOND_LEG_CENTER_X, -0.06, TURN_CENTER_Z],
        materials.floor,
      ),
      this.createVisualBox(
        'ARCH_Ceiling_FirstLeg',
        [CORRIDOR_WIDTH, 0.12, FIRST_LEG_LENGTH],
        [0, ROOM_HEIGHT + 0.06, 0],
        materials.ceiling,
      ),
      this.createVisualBox(
        'ARCH_Ceiling_SecondLeg',
        [SECOND_LEG_LENGTH, 0.12, CORRIDOR_WIDTH],
        [SECOND_LEG_CENTER_X, ROOM_HEIGHT + 0.06, TURN_CENTER_Z],
        materials.ceiling,
      ),
      this.createVisualBox(
        'WALL_North_Long',
        [northWallLength, ROOM_HEIGHT, WALL_THICKNESS],
        [northWallCenterX, ROOM_HEIGHT / 2, NORTH_WALL_Z],
        materials.wall,
      ),
      this.createVisualBox(
        'WALL_West',
        [WALL_THICKNESS, ROOM_HEIGHT, FIRST_LEG_LENGTH],
        [-CORRIDOR_WIDTH / 2, ROOM_HEIGHT / 2, 0],
        materials.wall,
      ),
    );
    this.createSouthWall(root);
    this.createInnerAndExitWalls(root);
    this.createWallDetails(root);
    this.createDoors(root);
    this.createCeilingFixtures(root);
    this.getVisualRoot().add(root);
  }

  private createSouthWall(root: THREE.Object3D): void {
    const materials = this.requireMaterials();
    const sideWidth = (CORRIDOR_WIDTH - DOOR_WIDTH) / 2;
    root.add(
      this.createVisualBox(
        'WALL_South_Left',
        [sideWidth, ROOM_HEIGHT, WALL_THICKNESS],
        [-DOOR_WIDTH / 2 - sideWidth / 2, ROOM_HEIGHT / 2, FIRST_LEG_LENGTH / 2],
        materials.wall,
      ),
      this.createVisualBox(
        'WALL_South_Right',
        [sideWidth, ROOM_HEIGHT, WALL_THICKNESS],
        [DOOR_WIDTH / 2 + sideWidth / 2, ROOM_HEIGHT / 2, FIRST_LEG_LENGTH / 2],
        materials.wall,
      ),
      this.createVisualBox(
        'WALL_South_Lintel',
        [DOOR_WIDTH, ROOM_HEIGHT - DOOR_HEIGHT, WALL_THICKNESS],
        [0, DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT) / 2, FIRST_LEG_LENGTH / 2],
        materials.wall,
      ),
    );
  }

  private createInnerAndExitWalls(root: THREE.Object3D): void {
    const materials = this.requireMaterials();
    const innerWallLength = FIRST_LEG_LENGTH - CORRIDOR_WIDTH;
    const innerWallCenterZ = INNER_CORNER_Z + innerWallLength / 2;
    const exitSideWidth = (CORRIDOR_WIDTH - DOOR_WIDTH) / 2;
    root.add(
      this.createVisualBox(
        'WALL_InnerEast',
        [WALL_THICKNESS, ROOM_HEIGHT, innerWallLength],
        [CORRIDOR_WIDTH / 2, ROOM_HEIGHT / 2, innerWallCenterZ],
        materials.wall,
      ),
      this.createVisualBox(
        'WALL_InnerSouth',
        [SECOND_LEG_LENGTH, ROOM_HEIGHT, WALL_THICKNESS],
        [SECOND_LEG_CENTER_X, ROOM_HEIGHT / 2, INNER_CORNER_Z],
        materials.wall,
      ),
      this.createVisualBox(
        'WALL_FarEast_North',
        [WALL_THICKNESS, ROOM_HEIGHT, exitSideWidth],
        [
          FAR_EAST_X,
          ROOM_HEIGHT / 2,
          NORTH_WALL_Z + exitSideWidth / 2,
        ],
        materials.wall,
      ),
      this.createVisualBox(
        'WALL_FarEast_South',
        [WALL_THICKNESS, ROOM_HEIGHT, exitSideWidth],
        [
          FAR_EAST_X,
          ROOM_HEIGHT / 2,
          INNER_CORNER_Z - exitSideWidth / 2,
        ],
        materials.wall,
      ),
      this.createVisualBox(
        'WALL_FarEast_Lintel',
        [WALL_THICKNESS, ROOM_HEIGHT - DOOR_HEIGHT, DOOR_WIDTH],
        [FAR_EAST_X, DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT) / 2, EXIT_CENTER_Z],
        materials.wall,
      ),
    );
  }

  private createWallDetails(root: THREE.Object3D): void {
    const materials = this.requireMaterials();
    const panelHeight = 0.78;
    const panelDepth = 0.035;
    const firstInnerX = CORRIDOR_WIDTH / 2 - WALL_THICKNESS / 2 - panelDepth / 2;
    const northInnerZ = NORTH_WALL_Z + WALL_THICKNESS / 2 + panelDepth / 2;
    const innerSouthZ = INNER_CORNER_Z - WALL_THICKNESS / 2 - panelDepth / 2;
    const farEastInnerX = FAR_EAST_X - WALL_THICKNESS / 2 - panelDepth / 2;
    const innerWallLength = FIRST_LEG_LENGTH - CORRIDOR_WIDTH;
    const innerWallCenterZ = INNER_CORNER_Z + innerWallLength / 2;
    const northWallLength = CORRIDOR_WIDTH + SECOND_LEG_LENGTH;
    const northWallCenterX = (FAR_EAST_X - CORRIDOR_WIDTH / 2) / 2;
    const exitSideWidth = (CORRIDOR_WIDTH - DOOR_WIDTH) / 2;
    root.add(
      this.createVisualBox(
        'PANEL_West',
        [panelDepth, panelHeight, FIRST_LEG_LENGTH - 0.18],
        [-firstInnerX, panelHeight / 2, 0],
        materials.wainscot,
      ),
      this.createVisualBox(
        'PANEL_North_Long',
        [northWallLength - 0.18, panelHeight, panelDepth],
        [northWallCenterX, panelHeight / 2, northInnerZ],
        materials.wainscot,
      ),
      this.createVisualBox(
        'PANEL_InnerEast',
        [panelDepth, panelHeight, innerWallLength - 0.18],
        [firstInnerX, panelHeight / 2, innerWallCenterZ],
        materials.wainscot,
      ),
      this.createVisualBox(
        'PANEL_InnerSouth',
        [SECOND_LEG_LENGTH - 0.18, panelHeight, panelDepth],
        [SECOND_LEG_CENTER_X, panelHeight / 2, innerSouthZ],
        materials.wainscot,
      ),
      this.createVisualBox(
        'PANEL_FarEast_North',
        [panelDepth, panelHeight, exitSideWidth - 0.08],
        [farEastInnerX, panelHeight / 2, NORTH_WALL_Z + exitSideWidth / 2],
        materials.wainscot,
      ),
      this.createVisualBox(
        'PANEL_FarEast_South',
        [panelDepth, panelHeight, exitSideWidth - 0.08],
        [farEastInnerX, panelHeight / 2, INNER_CORNER_Z - exitSideWidth / 2],
        materials.wainscot,
      ),
      this.createVisualBox(
        'TRIM_West',
        [0.07, 0.07, FIRST_LEG_LENGTH - 0.16],
        [-firstInnerX + 0.015, panelHeight + 0.035, 0],
        materials.trim,
      ),
      this.createVisualBox(
        'TRIM_North_Long',
        [northWallLength - 0.16, 0.07, 0.07],
        [northWallCenterX, panelHeight + 0.035, northInnerZ + 0.015],
        materials.trim,
      ),
      this.createVisualBox(
        'TRIM_InnerEast',
        [0.07, 0.07, innerWallLength - 0.08],
        [firstInnerX - 0.015, panelHeight + 0.035, innerWallCenterZ],
        materials.trim,
      ),
      this.createVisualBox(
        'TRIM_InnerSouth',
        [SECOND_LEG_LENGTH - 0.08, 0.07, 0.07],
        [SECOND_LEG_CENTER_X, panelHeight + 0.035, innerSouthZ - 0.015],
        materials.trim,
      ),
      this.createVisualBox(
        'BASEBOARD_West',
        [0.08, 0.12, FIRST_LEG_LENGTH - 0.12],
        [-firstInnerX + 0.02, 0.06, 0],
        materials.trim,
      ),
      this.createVisualBox(
        'BASEBOARD_North_Long',
        [northWallLength - 0.12, 0.12, 0.08],
        [northWallCenterX, 0.06, northInnerZ + 0.02],
        materials.trim,
      ),
      this.createVisualBox(
        'BASEBOARD_InnerEast',
        [0.08, 0.12, innerWallLength - 0.04],
        [firstInnerX - 0.02, 0.06, innerWallCenterZ],
        materials.trim,
      ),
      this.createVisualBox(
        'BASEBOARD_InnerSouth',
        [SECOND_LEG_LENGTH - 0.04, 0.12, 0.08],
        [SECOND_LEG_CENTER_X, 0.06, innerSouthZ - 0.02],
        materials.trim,
      ),
    );
  }

  private createDoors(root: THREE.Object3D): void {
    const materials = this.requireMaterials();
    const frameThickness = 0.09;
    const frameDepth = 0.25;
    root.add(
      this.createVisualBox(
        'FRAME_Entrance_Left',
        [frameThickness, DOOR_HEIGHT + 0.08, frameDepth],
        [-DOOR_WIDTH / 2, DOOR_HEIGHT / 2, FIRST_LEG_LENGTH / 2 - 0.02],
        materials.trim,
      ),
      this.createVisualBox(
        'FRAME_Entrance_Right',
        [frameThickness, DOOR_HEIGHT + 0.08, frameDepth],
        [DOOR_WIDTH / 2, DOOR_HEIGHT / 2, FIRST_LEG_LENGTH / 2 - 0.02],
        materials.trim,
      ),
      this.createVisualBox(
        'FRAME_Entrance_Top',
        [DOOR_WIDTH + frameThickness * 2, frameThickness, frameDepth],
        [0, DOOR_HEIGHT, FIRST_LEG_LENGTH / 2 - 0.02],
        materials.trim,
      ),
      this.createVisualBox(
        'DOOR_Entrance',
        [DOOR_WIDTH - 0.08, DOOR_HEIGHT - 0.06, 0.09],
        [0, (DOOR_HEIGHT - 0.06) / 2, FIRST_LEG_LENGTH / 2 - 0.08],
        materials.door,
      ),
    );

    const pivot = new THREE.Group();
    pivot.name = 'DOOR_Exit_Pivot';
    pivot.position.set(
      FAR_EAST_X - 0.08,
      0,
      EXIT_CENTER_Z - DOOR_WIDTH / 2 + 0.04,
    );
    pivot.add(
      this.createVisualBox(
        'DOOR_Exit',
        [0.09, DOOR_HEIGHT - 0.06, DOOR_WIDTH - 0.08],
        [0, (DOOR_HEIGHT - 0.06) / 2, (DOOR_WIDTH - 0.08) / 2],
        materials.door,
      ),
      this.createSphere(
        'DOOR_Exit_Handle',
        0.055,
        [-0.065, 1.02, DOOR_WIDTH - 0.22],
        materials.darkMetal,
      ),
    );
    root.add(
      pivot,
      this.createVisualBox(
        'FRAME_Exit_North',
        [frameDepth, DOOR_HEIGHT + 0.08, frameThickness],
        [FAR_EAST_X - 0.02, DOOR_HEIGHT / 2, EXIT_CENTER_Z - DOOR_WIDTH / 2],
        materials.trim,
      ),
      this.createVisualBox(
        'FRAME_Exit_South',
        [frameDepth, DOOR_HEIGHT + 0.08, frameThickness],
        [FAR_EAST_X - 0.02, DOOR_HEIGHT / 2, EXIT_CENTER_Z + DOOR_WIDTH / 2],
        materials.trim,
      ),
      this.createVisualBox(
        'FRAME_Exit_Top',
        [frameDepth, frameThickness, DOOR_WIDTH + frameThickness * 2],
        [FAR_EAST_X - 0.02, DOOR_HEIGHT, EXIT_CENTER_Z],
        materials.trim,
      ),
    );
    this.exitDoor = pivot;

    const portal = new THREE.Group();
    portal.name = 'EXIT_Corridor_Portal';
    portal.visible = false;
    const glow = new THREE.Mesh(
      this.ownGeometry(new THREE.PlaneGeometry(DOOR_WIDTH * 0.82, DOOR_HEIGHT * 0.9)),
      materials.exitGlow,
    );
    glow.rotation.y = -Math.PI / 2;
    glow.position.set(FAR_EAST_X + 0.055, DOOR_HEIGHT * 0.46, EXIT_CENTER_Z);
    const light = new THREE.PointLight('#79aaa5', 0, 2.4, 2);
    light.position.set(FAR_EAST_X + 0.2, 1.2, EXIT_CENTER_Z);
    portal.add(glow, light);
    root.add(portal);
    this.exitPortal = portal;
    this.exitPortalLight = light;
  }

  private createCeilingFixtures(root: THREE.Object3D): void {
    const materials = this.requireMaterials();
    const fixturePositions: readonly Vector3Tuple[] = [
      [0, 2.72, 1.45],
      [0, 2.72, -1.45],
      [2.75, 2.72, TURN_CENTER_Z],
      [5.15, 2.72, TURN_CENTER_Z],
    ];

    for (const [index, position] of fixturePositions.entries()) {
      const glassPosition: Vector3Tuple = [position[0], 2.66, position[2]];
      root.add(
        this.createCylinder(
          `ARCH_CeilingLightRim_${index + 1}`,
          0.22,
          0.075,
          position,
          materials.darkMetal,
        ),
        this.createCylinder(
          `ARCH_CeilingLightGlass_${index + 1}`,
          0.17,
          0.065,
          glassPosition,
          materials.lampGlass,
        ),
      );
    }
  }

  private createLighting(): void {
    const hemisphere = new THREE.HemisphereLight('#94a1a5', '#3b2d26', 0.4);
    hemisphere.name = 'LIGHT_Corridor_Ambient';
    const ambient = new THREE.AmbientLight('#c8c0b3', 0.12);
    ambient.name = 'LIGHT_Corridor_Bounce';
    const key = new THREE.SpotLight(
      '#ffd099',
      6.4,
      7.5,
      Math.PI / 3.4,
      0.52,
      1.2,
    );
    key.name = 'LIGHT_Corridor_Key';
    key.position.set(0.35, 2.55, 1.5);
    key.target.position.set(-0.1, 0.25, -0.4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.3;
    key.shadow.camera.far = 9;
    key.shadow.bias = -0.0002;
    key.shadow.normalBias = 0.025;
    key.shadow.radius = 2;
    const northFill = new THREE.PointLight('#9fb6b5', 0.35, 4.2, 1.6);
    northFill.name = 'LIGHT_Corridor_NorthFill';
    northFill.position.set(0.2, 1.7, -2.3);
    const southFill = new THREE.PointLight('#ffbf80', 0.36, 3.6, 1.7);
    southFill.name = 'LIGHT_Corridor_SouthFill';
    southFill.position.set(-0.35, 1.75, 2.35);
    const secondLegFill = new THREE.PointLight('#e2c49a', 0.42, 5.2, 1.6);
    secondLegFill.name = 'LIGHT_Corridor_SecondLegFill';
    secondLegFill.position.set(4.35, 1.82, TURN_CENTER_Z);
    this.getVisualRoot().add(
      hemisphere,
      ambient,
      key,
      key.target,
      northFill,
      southFill,
      secondLegFill,
    );
  }

  private createCollisions(): void {
    const sideWidth = (CORRIDOR_WIDTH - DOOR_WIDTH) / 2;
    const innerWallLength = FIRST_LEG_LENGTH - CORRIDOR_WIDTH;
    const innerWallCenterZ = INNER_CORNER_Z + innerWallLength / 2;
    const northWallLength = CORRIDOR_WIDTH + SECOND_LEG_LENGTH;
    const northWallCenterX = (FAR_EAST_X - CORRIDOR_WIDTH / 2) / 2;
    const exitSideWidth = (CORRIDOR_WIDTH - DOOR_WIDTH) / 2;
    this.addCollisionFloor();
    this.addCollisionBox(
      'COLLIDER_CeilingFirstLeg',
      [CORRIDOR_WIDTH, 0.12, FIRST_LEG_LENGTH],
      [0, ROOM_HEIGHT + 0.06, 0],
    );
    this.addCollisionBox(
      'COLLIDER_CeilingSecondLeg',
      [SECOND_LEG_LENGTH, 0.12, CORRIDOR_WIDTH],
      [SECOND_LEG_CENTER_X, ROOM_HEIGHT + 0.06, TURN_CENTER_Z],
    );
    this.addCollisionBox(
      'COLLIDER_WallNorthLong',
      [northWallLength, ROOM_HEIGHT, WALL_THICKNESS],
      [northWallCenterX, ROOM_HEIGHT / 2, NORTH_WALL_Z],
    );
    this.addCollisionBox(
      'COLLIDER_WallWest',
      [WALL_THICKNESS, ROOM_HEIGHT, FIRST_LEG_LENGTH],
      [-CORRIDOR_WIDTH / 2, ROOM_HEIGHT / 2, 0],
    );
    this.addCollisionBox(
      'COLLIDER_WallSouthLeft',
      [sideWidth, ROOM_HEIGHT, WALL_THICKNESS],
      [-DOOR_WIDTH / 2 - sideWidth / 2, ROOM_HEIGHT / 2, FIRST_LEG_LENGTH / 2],
    );
    this.addCollisionBox(
      'COLLIDER_WallSouthRight',
      [sideWidth, ROOM_HEIGHT, WALL_THICKNESS],
      [DOOR_WIDTH / 2 + sideWidth / 2, ROOM_HEIGHT / 2, FIRST_LEG_LENGTH / 2],
    );
    this.addCollisionBox(
      'COLLIDER_WallSouthLintel',
      [DOOR_WIDTH, ROOM_HEIGHT - DOOR_HEIGHT, WALL_THICKNESS],
      [0, DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT) / 2, FIRST_LEG_LENGTH / 2],
    );
    this.addCollisionBox(
      'COLLIDER_EntranceDoor',
      [DOOR_WIDTH, DOOR_HEIGHT, WALL_THICKNESS],
      [0, DOOR_HEIGHT / 2, FIRST_LEG_LENGTH / 2],
    );
    this.addCollisionBox(
      'COLLIDER_WallInnerEast',
      [WALL_THICKNESS, ROOM_HEIGHT, innerWallLength],
      [CORRIDOR_WIDTH / 2, ROOM_HEIGHT / 2, innerWallCenterZ],
    );
    this.addCollisionBox(
      'COLLIDER_WallInnerSouth',
      [SECOND_LEG_LENGTH, ROOM_HEIGHT, WALL_THICKNESS],
      [SECOND_LEG_CENTER_X, ROOM_HEIGHT / 2, INNER_CORNER_Z],
    );
    this.addCollisionBox(
      'COLLIDER_WallFarEastNorth',
      [WALL_THICKNESS, ROOM_HEIGHT, exitSideWidth],
      [FAR_EAST_X, ROOM_HEIGHT / 2, NORTH_WALL_Z + exitSideWidth / 2],
    );
    this.addCollisionBox(
      'COLLIDER_WallFarEastSouth',
      [WALL_THICKNESS, ROOM_HEIGHT, exitSideWidth],
      [FAR_EAST_X, ROOM_HEIGHT / 2, INNER_CORNER_Z - exitSideWidth / 2],
    );
    this.addCollisionBox(
      'COLLIDER_WallFarEastLintel',
      [WALL_THICKNESS, ROOM_HEIGHT - DOOR_HEIGHT, DOOR_WIDTH],
      [FAR_EAST_X, DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT) / 2, EXIT_CENTER_Z],
    );
    this.exitDoorCollider = this.addCollisionBox(
      'COLLIDER_ExitDoor',
      [WALL_THICKNESS, DOOR_HEIGHT, DOOR_WIDTH],
      [FAR_EAST_X, DOOR_HEIGHT / 2, EXIT_CENTER_Z],
    );
    this.addCollisionBox(
      'COLLIDER_Console',
      [0.52, 0.86, 1.36],
      [-1.08, 0.43, -0.78],
    );
    this.addCollisionBox(
      'COLLIDER_Bench',
      [0.72, 0.62, 1.34],
      [0.94, 0.31, 0.8],
    );
    this.addCollisionBox(
      'COLLIDER_SideTable',
      [0.96, 0.65, 0.56],
      [4.5, 0.325, -1.34],
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
    const collision = new THREE.Mesh(geometry, this.requireMaterials().collision);
    collision.name = 'COLLIDER_Floor';
    collision.visible = false;
    this.getCollisionRoot().add(collision);

    if (import.meta.env.DEV) {
      const debugFloor = new THREE.Mesh(
        this.ownGeometry(
          new THREE.BoxGeometry(CORRIDOR_WIDTH, 0.12, FIRST_LEG_LENGTH),
        ),
        this.requireMaterials().collision,
      );
      debugFloor.name = 'DEBUG_COLLIDER_Floor_FirstLeg';
      debugFloor.position.set(0, -0.06, 0);
      debugFloor.layers.set(RENDER_LAYERS.debug);
      debugFloor.renderOrder = 9;
      this.getCollisionRoot().add(debugFloor);

      const debugSecondFloor = new THREE.Mesh(
        this.ownGeometry(
          new THREE.BoxGeometry(SECOND_LEG_LENGTH, 0.12, CORRIDOR_WIDTH),
        ),
        this.requireMaterials().collision,
      );
      debugSecondFloor.name = 'DEBUG_COLLIDER_Floor_SecondLeg';
      debugSecondFloor.position.set(SECOND_LEG_CENTER_X, -0.06, TURN_CENTER_Z);
      debugSecondFloor.layers.set(RENDER_LAYERS.debug);
      debugSecondFloor.renderOrder = 9;
      this.getCollisionRoot().add(debugSecondFloor);
    }
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
      this.ownGeometry(new THREE.CylinderGeometry(radius, radius, height, 16)),
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

  private requireMaterials(): CorridorMaterials {
    if (this.materials === null) {
      throw new Error('First corridor materials are unavailable.');
    }

    return this.materials;
  }
}
