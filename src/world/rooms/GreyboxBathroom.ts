import * as THREE from 'three';
import {
  BATHROOM_ASSET_CATALOG,
  BATHROOM_COLLECTION_NODE_NAMES,
} from '../../content/rooms/BathroomAssetCatalog';
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
import type { PlayableRoom } from './PlayableRoom';

type Vector3Tuple = readonly [number, number, number];
type QuaternionTuple = readonly [number, number, number, number];
type BathroomCollectionKey = keyof typeof BATHROOM_COLLECTION_NODE_NAMES;

type BathroomTargetId =
  | 'bath-mat'
  | 'bathtub'
  | 'bin'
  | 'candle'
  | 'mirror'
  | 'plant'
  | 'rubber-duck'
  | 'slippers'
  | 'soap-dish'
  | 'toilet'
  | 'toilet-roll-holder'
  | 'toilet-rolls'
  | 'toothbrush-cup'
  | 'towel'
  | 'towels-stacked'
  | 'vanity'
  | 'wall-shelf';

interface BathroomMaterials {
  readonly wall: THREE.MeshStandardMaterial;
  readonly tile: THREE.MeshStandardMaterial;
  readonly floor: THREE.MeshStandardMaterial;
  readonly ceiling: THREE.MeshStandardMaterial;
  readonly trim: THREE.MeshStandardMaterial;
  readonly door: THREE.MeshStandardMaterial;
  readonly darkMetal: THREE.MeshStandardMaterial;
  readonly glass: THREE.MeshPhysicalMaterial;
  readonly windowGlass: THREE.MeshBasicMaterial;
  readonly exitGlow: THREE.MeshBasicMaterial;
  readonly collision: THREE.MeshBasicMaterial;
  readonly interaction: THREE.MeshBasicMaterial;
}

interface BathroomAssetPlacement {
  readonly key: BathroomCollectionKey;
  readonly targetId: BathroomTargetId;
  readonly objectName: string;
  readonly position: Vector3Tuple;
  readonly quaternion?: QuaternionTuple;
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
  readonly rotations?: 'floor' | 'wall';
  readonly colliderName?: string;
  readonly dependentTargetIds?: readonly BathroomTargetId[];
}

const ROOM_WIDTH = 5.8;
const ROOM_LENGTH = 6.2;
const ROOM_HEIGHT = 2.8;
const WALL_THICKNESS = 0.16;
const LOWER_TILE_HEIGHT = 1.26;
const DOOR_HEIGHT = 2.15;
const ENTRANCE_CENTER_X = -1.5;
const ENTRANCE_WIDTH = 1;
const EXIT_CENTER_Z = 1.55;
const EXIT_WIDTH = 1;
const ROTATION_ANOMALY_RADIANS = Math.PI / 6;

const BATHROOM_ASSET_PLACEMENTS: readonly BathroomAssetPlacement[] = [
  {
    key: 'bathtub',
    targetId: 'bathtub',
    objectName: 'ANOM_Bath_Bathtub',
    position: [-2.05, 0, -0.72],
    rotationY: 0,
    maximumSize: [1.46, 1.16, 2.18],
    verticalAnchor: 'ground',
    interactionSize: [1.62, 1.35, 2.32],
    interactionPosition: [0, 0.58, 0],
    tint: '#d5d0c7',
    anomalyColors: [
      { id: 'enamel-red', color: '#9b5558' },
      { id: 'enamel-blue', color: '#55798d' },
    ],
    colliderName: 'COLLIDER_Bathtub',
    dependentTargetIds: ['rubber-duck'],
  },
  {
    key: 'vanity',
    targetId: 'vanity',
    objectName: 'ANOM_Bath_Vanity',
    position: [0.45, 0, -2.7],
    rotationY: 0,
    maximumSize: [1.65, 1.35, 1.02],
    verticalAnchor: 'ground',
    interactionSize: [1.62, 1.25, 0.9],
    interactionPosition: [0, 0.55, 0],
    tint: '#c6c2b7',
    anomalyColors: [
      { id: 'cabinet-olive', color: '#778065' },
      { id: 'cabinet-wine', color: '#8d5962' },
    ],
    colliderName: 'COLLIDER_Vanity',
    dependentTargetIds: ['plant', 'soap-dish', 'toothbrush-cup'],
  },
  {
    key: 'mirror',
    targetId: 'mirror',
    objectName: 'ANOM_Bath_Mirror',
    position: [0.45, 1.8, -2.98],
    rotationY: 0,
    maximumSize: [1.08, 0.94, 0.16],
    verticalAnchor: 'center',
    interactionSize: [1.22, 1.08, 0.24],
    interactionPosition: [0, 0, 0],
    tint: '#d7d2c8',
    anomalyColors: [
      { id: 'frame-violet', color: '#7b608b' },
      { id: 'frame-copper', color: '#a36b4c' },
    ],
    rotations: 'wall',
  },
  {
    key: 'toilet',
    targetId: 'toilet',
    objectName: 'ANOM_Bath_Toilet',
    position: [2.25, 0, -0.72],
    rotationY: -Math.PI / 2,
    maximumSize: [1.1, 1.18, 0.95],
    verticalAnchor: 'ground',
    interactionSize: [1.06, 1.18, 0.96],
    interactionPosition: [0, 0.5, 0],
    tint: '#d6d1c8',
    anomalyColors: [
      { id: 'porcelain-pink', color: '#b06b75' },
      { id: 'porcelain-blue', color: '#668b9a' },
    ],
    colliderName: 'COLLIDER_Toilet',
  },
  {
    key: 'bathMat',
    targetId: 'bath-mat',
    objectName: 'ANOM_Bath_Mat',
    position: [-0.56, 0.012, 0.48],
    rotationY: 0.08,
    maximumSize: [1.48, 0.05, 0.92],
    verticalAnchor: 'ground',
    interactionSize: [1.58, 0.16, 1.02],
    interactionPosition: [0, 0.05, 0],
    tint: '#aaa38f',
    anomalyColors: [
      { id: 'mat-plum', color: '#805e76' },
      { id: 'mat-moss', color: '#69785c' },
    ],
    rotations: 'floor',
  },
  {
    key: 'wallShelf',
    targetId: 'wall-shelf',
    objectName: 'ANOM_Bath_WallShelf',
    position: [-2.66, 1.36, 1.32],
    rotationY: Math.PI / 2,
    maximumSize: [0.42, 0.52, 1.18],
    verticalAnchor: 'center',
    interactionSize: [0.52, 0.7, 1.34],
    interactionPosition: [0, 0, 0],
    tint: '#b8aa97',
    anomalyColors: [
      { id: 'shelf-blue', color: '#637d8a' },
      { id: 'shelf-red', color: '#91585a' },
    ],
    dependentTargetIds: ['candle', 'towels-stacked'],
  },
  {
    key: 'towelsStacked',
    targetId: 'towels-stacked',
    objectName: 'ANOM_Bath_TowelsStacked',
    position: [-2.65, 1.54, 1.7],
    rotationY: Math.PI / 2,
    maximumSize: [0.34, 0.28, 0.5],
    verticalAnchor: 'ground',
    interactionSize: [0.44, 0.4, 0.62],
    interactionPosition: [0, 0, 0],
    tint: '#c2bbb0',
    anomalyColors: [
      { id: 'towels-purple', color: '#856b91' },
      { id: 'towels-yellow', color: '#b69555' },
    ],
  },
  {
    key: 'candle',
    targetId: 'candle',
    objectName: 'ANOM_Bath_Candle',
    position: [-2.65, 1.54, 1.04],
    rotationY: 0,
    maximumSize: [0.2, 0.28, 0.2],
    verticalAnchor: 'ground',
    interactionSize: [0.34, 0.42, 0.34],
    interactionPosition: [0, 0, 0],
    tint: '#d2c2a0',
    anomalyColors: [
      { id: 'candle-green', color: '#75906f' },
      { id: 'candle-purple', color: '#8e6ca1' },
    ],
    rotations: 'floor',
  },
  {
    key: 'towelBlue',
    targetId: 'towel',
    objectName: 'ANOM_Bath_Towel',
    position: [2.76, 1.35, 0.38],
    rotationY: -Math.PI / 2,
    maximumSize: [0.18, 0.98, 0.76],
    verticalAnchor: 'center',
    interactionSize: [0.28, 1.12, 0.9],
    interactionPosition: [0, 0, 0],
    tint: '#9ca9aa',
    anomalyColors: [
      { id: 'towel-red', color: '#a45f62' },
      { id: 'towel-yellow', color: '#ad9154' },
    ],
  },
  {
    key: 'plant',
    targetId: 'plant',
    objectName: 'ANOM_Bath_Plant',
    position: [-0.1, 0.5, -2.4],
    rotationY: 0,
    maximumSize: [0.38, 0.54, 0.38],
    verticalAnchor: 'ground',
    interactionSize: [0.52, 0.68, 0.52],
    interactionPosition: [0, 0.27, 0],
    tint: '#aeb7a4',
    anomalyColors: [
      { id: 'plant-purple', color: '#7e668c' },
      { id: 'plant-orange', color: '#aa714e' },
    ],
  },
  {
    key: 'toothbrushCup',
    targetId: 'toothbrush-cup',
    objectName: 'ANOM_Bath_ToothbrushCup',
    position: [0.95, 0.5, -2.3],
    rotationY: 0,
    maximumSize: [0.24, 0.38, 0.24],
    verticalAnchor: 'ground',
    interactionSize: [0.38, 0.52, 0.38],
    interactionPosition: [0, 0.19, 0],
    tint: '#c5c0b4',
    anomalyColors: [
      { id: 'cup-red', color: '#a9585e' },
      { id: 'cup-green', color: '#5f846f' },
    ],
    rotations: 'floor',
  },
  {
    key: 'soapDish',
    targetId: 'soap-dish',
    objectName: 'ANOM_Bath_SoapDish',
    position: [1, 0.915, -2.95],
    rotationY: 0,
    maximumSize: [0.32, 0.16, 0.24],
    verticalAnchor: 'ground',
    interactionSize: [0.46, 0.3, 0.38],
    interactionPosition: [0, 0.08, 0],
    tint: '#adb8b7',
    anomalyColors: [
      { id: 'soap-purple', color: '#82658f' },
      { id: 'soap-orange', color: '#b5764e' },
    ],
    rotations: 'floor',
  },
  {
    key: 'rubberDuck',
    targetId: 'rubber-duck',
    objectName: 'ANOM_Bath_RubberDuck',
    position: [-2.05, 0.5, -0.72],
    rotationY: -0.35,
    maximumSize: [0.32, 0.34, 0.32],
    verticalAnchor: 'ground',
    interactionSize: [0.46, 0.48, 0.46],
    interactionPosition: [0, 0.17, 0],
    tint: '#d0c690',
    anomalyColors: [
      { id: 'duck-purple', color: '#8867a0' },
      { id: 'duck-green', color: '#6f9472' },
    ],
    rotations: 'floor',
  },
  {
    key: 'toiletRollHolder',
    targetId: 'toilet-roll-holder',
    objectName: 'ANOM_Bath_ToiletRollHolder',
    position: [2.77, 0.84, -0.02],
    rotationY: -Math.PI / 2,
    maximumSize: [0.2, 0.38, 0.46],
    verticalAnchor: 'center',
    interactionSize: [0.3, 0.52, 0.58],
    interactionPosition: [0, 0, 0],
    tint: '#c9c2b7',
    anomalyColors: [
      { id: 'holder-red', color: '#9b5559' },
      { id: 'holder-blue', color: '#587b8c' },
    ],
    rotations: 'wall',
  },
  {
    key: 'toiletRolls',
    targetId: 'toilet-rolls',
    objectName: 'ANOM_Bath_ToiletRolls',
    position: [2.23, 0, 0.18],
    rotationY: 0.15,
    maximumSize: [0.42, 0.58, 0.42],
    verticalAnchor: 'ground',
    interactionSize: [0.56, 0.7, 0.56],
    interactionPosition: [0, 0.29, 0],
    tint: '#d2cdc4',
    anomalyColors: [
      { id: 'rolls-pink', color: '#b67b84' },
      { id: 'rolls-blue', color: '#7592a0' },
    ],
    rotations: 'floor',
  },
  {
    key: 'slippers',
    targetId: 'slippers',
    objectName: 'ANOM_Bath_Slippers',
    position: [0.55, 0.01, 0.75],
    quaternion: [0, 0.9990482215818578, 0, 0.04361938736533601],
    rotationY: -0.22,
    maximumSize: [0.62, 0.16, 0.58],
    verticalAnchor: 'ground',
    interactionSize: [0.76, 0.26, 0.72],
    interactionPosition: [0, 0.08, 0],
    tint: '#aaa196',
    anomalyColors: [
      { id: 'slippers-purple', color: '#826892' },
      { id: 'slippers-yellow', color: '#b29154' },
    ],
    rotations: 'floor',
  },
  {
    key: 'bin',
    targetId: 'bin',
    objectName: 'ANOM_Bath_Bin',
    position: [1.52, 0, -2.4],
    rotationY: 0.08,
    maximumSize: [0.48, 0.68, 0.48],
    verticalAnchor: 'ground',
    interactionSize: [0.62, 0.8, 0.62],
    interactionPosition: [0, 0.34, 0],
    tint: '#aaa7a0',
    anomalyColors: [
      { id: 'bin-red', color: '#92575c' },
      { id: 'bin-green', color: '#627b67' },
    ],
    colliderName: 'COLLIDER_Bin',
  },
] as const;

export const BATHROOM_EXIT_THRESHOLD = {
  x: ROOM_WIDTH / 2 + 0.4,
  minimumZ: EXIT_CENTER_Z - EXIT_WIDTH / 2,
  maximumZ: EXIT_CENTER_Z + EXIT_WIDTH / 2,
} as const;

export class GreyboxBathroom extends RoomRuntime implements PlayableRoom {
  public readonly definition: RoomDefinition = {
    id: 'bathroom',
    displayName: 'Bathroom',
    observationDurationMs: 10_000,
    searchDurationMs: 30_000,
    anomalyCount: { min: 1, max: 1 },
    playerSpawn: {
      position: [-1.5, 0, 2.42],
      yaw: 0,
      pitch: 0,
    },
  };

  private readonly anomalyTargetRegistry = new AnomalyTargetRegistry();
  private materials: BathroomMaterials | null = null;
  private exitDoor: THREE.Object3D | null = null;
  private exitDoorCollider: THREE.Mesh | null = null;
  private exitPortal: THREE.Group | null = null;
  private exitPortalLight: THREE.PointLight | null = null;
  private assetManager: AssetManager | null = null;
  private assetLease: GlbAssetLease | null = null;
  private assetLoadPromise: Promise<void> | null = null;
  private assetsLoaded = false;
  private buildRevision = 0;

  public constructor() {
    super('ROOM_GreyboxBathroom_VisualRoot', 'COLLIDER_GreyboxBathroom_Root');
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
    return BATHROOM_EXIT_THRESHOLD;
  }

  public isAssetsLoaded(): boolean {
    return this.assetsLoaded;
  }

  public getLoadedAssetIds(): readonly string[] {
    return this.assetLease === null ? [] : [this.assetLease.assetId];
  }

  public async loadAssets(assetManager?: AssetManager): Promise<void> {
    if (!this.isMounted()) {
      throw new Error('The bathroom must be mounted before loading assets.');
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

    const manager = this.assetManager;

    if (manager === null) {
      throw new Error('The bathroom AssetManager is unavailable.');
    }

    const revision = this.buildRevision;
    const loadPromise = this.performAssetLoad(manager, revision);
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
      throw new Error('The bathroom exit-door collider is unavailable.');
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

  public isExitDoorCollisionEnabled(): boolean {
    return this.exitDoorCollider?.parent === this.getCollisionRoot();
  }

  public setExitPortalProgress(progress: number): void {
    const portal = this.exitPortal;
    const light = this.exitPortalLight;
    const materials = this.materials;

    if (portal === null || light === null || materials === null) {
      throw new Error('The bathroom exit portal is unavailable.');
    }

    const safeProgress = Number.isFinite(progress)
      ? THREE.MathUtils.clamp(progress, 0, 1)
      : 0;
    portal.visible = safeProgress > 0;
    materials.exitGlow.opacity = safeProgress * 0.82;
    light.intensity = safeProgress * 2.2;
  }

  protected buildRoom(): void {
    this.buildRevision += 1;
    this.materials = this.createMaterials();
    this.createArchitecture();
    this.createLighting();
    this.createArchitectureCollisions();
    this.createFixtureCollisions();
  }

  protected override onRoomReleased(): void {
    this.assetLease?.release();
    this.assetLease = null;
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
    let lease: GlbAssetLease;

    try {
      lease = await assetManager.acquire(BATHROOM_ASSET_CATALOG.collection);
    } catch (error: unknown) {
      throw new Error(
        `Final bathroom assets could not be loaded: ${this.getErrorMessage(error)}`,
        { cause: error },
      );
    }

    if (!this.isMounted() || revision !== this.buildRevision) {
      lease.release();
      throw new Error('The bathroom changed while its assets were loading.');
    }

    try {
      const preparedTargets = BATHROOM_ASSET_PLACEMENTS.map((placement) => {
        const sourceName = BATHROOM_COLLECTION_NODE_NAMES[placement.key];
        const sourceObject = lease.root.getObjectByName(sourceName);

        if (sourceObject === undefined) {
          throw new Error(
            `Bathroom collection node "${sourceName}" is missing.`,
          );
        }

        const { object, surfaceNames } = this.createFittedAssetObject(
          placement,
          sourceObject,
        );
        return this.createAnomalyTarget(placement, object, surfaceNames);
      });
      const validationRegistry = new AnomalyTargetRegistry();

      for (const target of preparedTargets) {
        validationRegistry.register(target);
      }

      lease.root.name = 'Bathroom_TinyTreats_Collection';
      lease.root.add(...preparedTargets.map((target) => target.object));
      this.getVisualRoot().add(lease.root);

      for (const target of preparedTargets) {
        this.anomalyTargetRegistry.register(target);
      }

      this.assetLease = lease;
      this.assetsLoaded = true;
      this.refreshVisualObjectCount();
    } catch (error: unknown) {
      lease.release();
      throw error;
    }
  }

  private createFittedAssetObject(
    placement: BathroomAssetPlacement,
    sourceObject: THREE.Object3D,
  ): { readonly object: THREE.Group; readonly surfaceNames: readonly string[] } {
    const object = new THREE.Group();
    object.name = placement.objectName;
    const model = new THREE.Group();
    model.name = `${placement.objectName}_GLB`;
    model.rotation.y = placement.rotationY;
    model.add(sourceObject);
    object.add(model);

    const surfaceNames: string[] = [];
    const materialClones = new Map<THREE.Material, THREE.Material>();
    let surfaceIndex = 0;

    sourceObject.traverse((node) => {
      const mesh = node as THREE.Mesh;

      if (!mesh.isMesh) {
        return;
      }

      surfaceIndex += 1;
      mesh.name = `${placement.objectName}_Surface_${surfaceIndex}`;
      surfaceNames.push(mesh.name);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((material) =>
            this.cloneImportedMaterial(
              material,
              placement,
              materialClones,
            ),
          )
        : this.cloneImportedMaterial(
            mesh.material,
            placement,
            materialClones,
          );
    });

    if (surfaceNames.length === 0) {
      throw new Error(
        `Bathroom asset "${placement.targetId}" contains no mesh.`,
      );
    }

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
      throw new Error(
        `Bathroom asset "${placement.targetId}" has invalid bounds.`,
      );
    }

    model.scale.setScalar(scale);
    model.updateMatrixWorld(true);
    const fittedBounds = new THREE.Box3().setFromObject(model);
    const center = fittedBounds.getCenter(new THREE.Vector3());
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -=
      placement.verticalAnchor === 'ground'
        ? fittedBounds.min.y
        : center.y;
    object.position.fromArray(placement.position);

    if (placement.quaternion !== undefined) {
      object.quaternion.fromArray(placement.quaternion);
    }

    return { object, surfaceNames };
  }

  private cloneImportedMaterial(
    source: THREE.Material,
    placement: BathroomAssetPlacement,
    clones: Map<THREE.Material, THREE.Material>,
  ): THREE.Material {
    const existing = clones.get(source);

    if (existing !== undefined) {
      return existing;
    }

    const clone = this.ownMaterial(source.clone());
    clone.name = `bathroom-${placement.targetId}`;
    const standard = clone as THREE.MeshStandardMaterial;

    if (standard.isMeshStandardMaterial) {
      standard.color.multiply(new THREE.Color(placement.tint));
      standard.roughness = Math.max(standard.roughness, 0.78);
      standard.metalness = Math.min(standard.metalness, 0.08);
      standard.envMapIntensity = 0.55;
      standard.needsUpdate = true;
    }

    clones.set(source, clone);
    return clone;
  }

  private createAnomalyTarget(
    placement: BathroomAssetPlacement,
    object: THREE.Group,
    surfaceNames: readonly string[],
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

    const variants = this.createAnomalyVariants(placement, surfaceNames);
    const collisionObjects = this.getCollisionObjects(placement);

    return {
      id: placement.targetId,
      nodeName: object.name,
      interactionNodeNames: [interactionVolume.name],
      allowedKinds: [...new Set(variants.map((variant) => variant.kind))],
      variants,
      weight: placement.colliderName === undefined ? 0.9 : 1.15,
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

  private createAnomalyVariants(
    placement: BathroomAssetPlacement,
    surfaceNames: readonly string[],
  ): readonly PreparedAnomalyVariant[] {
    const rotations: PreparedAnomalyVariant[] = [];

    if (placement.rotations === 'floor') {
      rotations.push(
        {
          id: 'turned-left',
          kind: 'rotate',
          rotationOffsetRadians: [0, ROTATION_ANOMALY_RADIANS, 0],
        },
        {
          id: 'turned-right',
          kind: 'rotate',
          rotationOffsetRadians: [0, -ROTATION_ANOMALY_RADIANS, 0],
        },
      );
    } else if (placement.rotations === 'wall') {
      rotations.push(
        {
          id: 'tilted-left',
          kind: 'rotate',
          rotationOffsetRadians: [0, 0, ROTATION_ANOMALY_RADIANS],
        },
        {
          id: 'tilted-right',
          kind: 'rotate',
          rotationOffsetRadians: [0, 0, -ROTATION_ANOMALY_RADIANS],
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
        materialNames: [`bathroom-${placement.targetId}`],
        color,
      })),
    ];
  }

  private getCollisionObjects(
    placement: BathroomAssetPlacement,
  ): readonly THREE.Object3D[] {
    if (placement.colliderName === undefined) {
      return [];
    }

    const collider = this.getCollisionRoot().getObjectByName(
      placement.colliderName,
    );

    if (collider === undefined) {
      throw new Error(
        `Bathroom collider "${placement.colliderName}" is missing.`,
      );
    }

    return [collider];
  }

  private createMaterials(): BathroomMaterials {
    const standard = (
      color: THREE.ColorRepresentation,
      roughness: number,
      metalness = 0,
    ): THREE.MeshStandardMaterial =>
      this.ownMaterial(
        new THREE.MeshStandardMaterial({ color, roughness, metalness }),
      );
    const floorTexture = this.createTileTexture(
      new THREE.Color('#aaa79e'),
      new THREE.Color('#969991'),
      new THREE.Color('#727a76'),
    );
    floorTexture.repeat.set(8, 9);
    const wallTileTexture = this.createTileTexture(
      new THREE.Color('#d0d3ca'),
      new THREE.Color('#bbc5c0'),
      new THREE.Color('#89938f'),
    );
    wallTileTexture.repeat.set(10, 3);
    const floor = standard('#ffffff', 0.92);
    floor.map = floorTexture;
    const tile = standard('#ffffff', 0.88);
    tile.map = wallTileTexture;

    return {
      wall: standard('#687a7d', 0.96),
      tile,
      floor,
      ceiling: standard('#c5c3b9', 0.98),
      trim: standard('#c3b9aa', 0.9),
      door: standard('#4c3832', 0.82),
      darkMetal: standard('#383f40', 0.62, 0.18),
      glass: this.ownMaterial(
        new THREE.MeshPhysicalMaterial({
          color: '#8ca5a8',
          roughness: 0.24,
          metalness: 0,
          transparent: true,
          opacity: 0.22,
          transmission: 0.16,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      ),
      windowGlass: this.ownMaterial(
        new THREE.MeshBasicMaterial({
          color: '#a7c9c9',
          transparent: true,
          opacity: 0.38,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      ),
      exitGlow: this.ownMaterial(
        new THREE.MeshBasicMaterial({
          color: '#84b2ad',
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      ),
      collision: this.ownMaterial(
        new THREE.MeshBasicMaterial({
          color: '#e15b64',
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

  private createTileTexture(
    first: THREE.Color,
    second: THREE.Color,
    grout: THREE.Color,
  ): THREE.DataTexture {
    const size = 16;
    const data = new Uint8Array(size * size * 4);

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const isGrout = x === 0 || y === 0;
        const color = isGrout ? grout : (x + y) % 2 === 0 ? first : second;
        const offset = (y * size + x) * 4;
        data[offset] = Math.round(color.r * 255);
        data[offset + 1] = Math.round(color.g * 255);
        data[offset + 2] = Math.round(color.b * 255);
        data[offset + 3] = 255;
      }
    }

    const texture = this.ownTexture(
      new THREE.DataTexture(data, size, size, THREE.RGBAFormat),
    );
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  private createArchitecture(): void {
    const materials = this.requireMaterials();
    const root = new THREE.Group();
    root.name = 'Bathroom_Architecture';
    root.add(
      this.createVisualBox(
        'ARCH_Floor',
        [ROOM_WIDTH, 0.12, ROOM_LENGTH],
        [0, -0.06, 0],
        materials.floor,
      ),
      this.createVisualBox(
        'ARCH_Ceiling',
        [ROOM_WIDTH, 0.12, ROOM_LENGTH],
        [0, ROOM_HEIGHT + 0.06, 0],
        materials.ceiling,
      ),
      this.createVisualBox(
        'WALL_North',
        [ROOM_WIDTH, ROOM_HEIGHT, WALL_THICKNESS],
        [0, ROOM_HEIGHT / 2, -ROOM_LENGTH / 2],
        materials.wall,
      ),
      this.createVisualBox(
        'WALL_West',
        [WALL_THICKNESS, ROOM_HEIGHT, ROOM_LENGTH],
        [-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0],
        materials.wall,
      ),
    );
    this.createSouthWall(root);
    this.createEastWall(root);
    this.createTileWainscot(root);
    this.createTrim(root);
    this.createDoorFrames(root);
    this.createEntranceDoor(root);
    this.createExitDoor(root);
    this.createBathroomDetails(root);
    this.getVisualRoot().add(root);
  }

  private createSouthWall(root: THREE.Object3D): void {
    const materials = this.requireMaterials();
    const openingMin = ENTRANCE_CENTER_X - ENTRANCE_WIDTH / 2;
    const openingMax = ENTRANCE_CENTER_X + ENTRANCE_WIDTH / 2;
    const leftWidth = openingMin + ROOM_WIDTH / 2;
    const rightWidth = ROOM_WIDTH / 2 - openingMax;

    root.add(
      this.createVisualBox(
        'WALL_South_Left',
        [leftWidth, ROOM_HEIGHT, WALL_THICKNESS],
        [-ROOM_WIDTH / 2 + leftWidth / 2, ROOM_HEIGHT / 2, ROOM_LENGTH / 2],
        materials.wall,
      ),
      this.createVisualBox(
        'WALL_South_Right',
        [rightWidth, ROOM_HEIGHT, WALL_THICKNESS],
        [openingMax + rightWidth / 2, ROOM_HEIGHT / 2, ROOM_LENGTH / 2],
        materials.wall,
      ),
      this.createVisualBox(
        'WALL_South_Lintel',
        [ENTRANCE_WIDTH, ROOM_HEIGHT - DOOR_HEIGHT, WALL_THICKNESS],
        [
          ENTRANCE_CENTER_X,
          DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT) / 2,
          ROOM_LENGTH / 2,
        ],
        materials.wall,
      ),
    );
  }

  private createEastWall(root: THREE.Object3D): void {
    const materials = this.requireMaterials();
    const openingMin = EXIT_CENTER_Z - EXIT_WIDTH / 2;
    const openingMax = EXIT_CENTER_Z + EXIT_WIDTH / 2;
    const northLength = openingMin + ROOM_LENGTH / 2;
    const southLength = ROOM_LENGTH / 2 - openingMax;

    root.add(
      this.createVisualBox(
        'WALL_East_North',
        [WALL_THICKNESS, ROOM_HEIGHT, northLength],
        [ROOM_WIDTH / 2, ROOM_HEIGHT / 2, -ROOM_LENGTH / 2 + northLength / 2],
        materials.wall,
      ),
      this.createVisualBox(
        'WALL_East_South',
        [WALL_THICKNESS, ROOM_HEIGHT, southLength],
        [ROOM_WIDTH / 2, ROOM_HEIGHT / 2, openingMax + southLength / 2],
        materials.wall,
      ),
      this.createVisualBox(
        'WALL_East_Lintel',
        [WALL_THICKNESS, ROOM_HEIGHT - DOOR_HEIGHT, EXIT_WIDTH],
        [
          ROOM_WIDTH / 2,
          DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT) / 2,
          EXIT_CENTER_Z,
        ],
        materials.wall,
      ),
    );
  }

  private createTileWainscot(root: THREE.Object3D): void {
    const materials = this.requireMaterials();
    const panelDepth = 0.025;
    const innerX = ROOM_WIDTH / 2 - WALL_THICKNESS / 2 - panelDepth / 2;
    const innerZ = ROOM_LENGTH / 2 - WALL_THICKNESS / 2 - panelDepth / 2;
    const southOpeningMin = ENTRANCE_CENTER_X - ENTRANCE_WIDTH / 2;
    const southOpeningMax = ENTRANCE_CENTER_X + ENTRANCE_WIDTH / 2;
    const southLeftWidth = southOpeningMin + ROOM_WIDTH / 2;
    const southRightWidth = ROOM_WIDTH / 2 - southOpeningMax;
    const eastOpeningMin = EXIT_CENTER_Z - EXIT_WIDTH / 2;
    const eastOpeningMax = EXIT_CENTER_Z + EXIT_WIDTH / 2;
    const eastNorthLength = eastOpeningMin + ROOM_LENGTH / 2;
    const eastSouthLength = ROOM_LENGTH / 2 - eastOpeningMax;

    root.add(
      this.createVisualBox(
        'TILE_North',
        [ROOM_WIDTH - 0.18, LOWER_TILE_HEIGHT, panelDepth],
        [0, LOWER_TILE_HEIGHT / 2, -innerZ],
        materials.tile,
      ),
      this.createVisualBox(
        'TILE_West',
        [panelDepth, LOWER_TILE_HEIGHT, ROOM_LENGTH - 0.18],
        [-innerX, LOWER_TILE_HEIGHT / 2, 0],
        materials.tile,
      ),
      this.createVisualBox(
        'TILE_South_Left',
        [southLeftWidth, LOWER_TILE_HEIGHT, panelDepth],
        [
          -ROOM_WIDTH / 2 + southLeftWidth / 2,
          LOWER_TILE_HEIGHT / 2,
          innerZ,
        ],
        materials.tile,
      ),
      this.createVisualBox(
        'TILE_South_Right',
        [southRightWidth, LOWER_TILE_HEIGHT, panelDepth],
        [
          southOpeningMax + southRightWidth / 2,
          LOWER_TILE_HEIGHT / 2,
          innerZ,
        ],
        materials.tile,
      ),
      this.createVisualBox(
        'TILE_East_North',
        [panelDepth, LOWER_TILE_HEIGHT, eastNorthLength],
        [
          innerX,
          LOWER_TILE_HEIGHT / 2,
          -ROOM_LENGTH / 2 + eastNorthLength / 2,
        ],
        materials.tile,
      ),
      this.createVisualBox(
        'TILE_East_South',
        [panelDepth, LOWER_TILE_HEIGHT, eastSouthLength],
        [
          innerX,
          LOWER_TILE_HEIGHT / 2,
          eastOpeningMax + eastSouthLength / 2,
        ],
        materials.tile,
      ),
    );
  }

  private createTrim(root: THREE.Object3D): void {
    const materials = this.requireMaterials();
    const trimHeight = 0.055;
    const trimDepth = 0.06;
    const y = LOWER_TILE_HEIGHT + trimHeight / 2;
    const x = ROOM_WIDTH / 2 - 0.12;
    const z = ROOM_LENGTH / 2 - 0.12;
    const entranceMin = ENTRANCE_CENTER_X - ENTRANCE_WIDTH / 2;
    const entranceMax = ENTRANCE_CENTER_X + ENTRANCE_WIDTH / 2;
    const southLeftWidth = entranceMin + ROOM_WIDTH / 2;
    const southRightWidth = ROOM_WIDTH / 2 - entranceMax;
    const exitMin = EXIT_CENTER_Z - EXIT_WIDTH / 2;
    const exitMax = EXIT_CENTER_Z + EXIT_WIDTH / 2;
    const eastNorthLength = exitMin + ROOM_LENGTH / 2;
    const eastSouthLength = ROOM_LENGTH / 2 - exitMax;

    root.add(
      this.createVisualBox(
        'TRIM_North',
        [ROOM_WIDTH - 0.2, trimHeight, trimDepth],
        [0, y, -z],
        materials.trim,
      ),
      this.createVisualBox(
        'TRIM_West',
        [trimDepth, trimHeight, ROOM_LENGTH - 0.2],
        [-x, y, 0],
        materials.trim,
      ),
      this.createVisualBox(
        'TRIM_South_Left',
        [southLeftWidth, trimHeight, trimDepth],
        [-ROOM_WIDTH / 2 + southLeftWidth / 2, y, z],
        materials.trim,
      ),
      this.createVisualBox(
        'TRIM_South_Right',
        [southRightWidth, trimHeight, trimDepth],
        [entranceMax + southRightWidth / 2, y, z],
        materials.trim,
      ),
      this.createVisualBox(
        'TRIM_East_North',
        [trimDepth, trimHeight, eastNorthLength],
        [x, y, -ROOM_LENGTH / 2 + eastNorthLength / 2],
        materials.trim,
      ),
      this.createVisualBox(
        'TRIM_East_South',
        [trimDepth, trimHeight, eastSouthLength],
        [x, y, exitMax + eastSouthLength / 2],
        materials.trim,
      ),
    );
  }

  private createDoorFrames(root: THREE.Object3D): void {
    const materials = this.requireMaterials();
    const thickness = 0.09;
    const depth = 0.25;

    root.add(
      this.createVisualBox(
        'FRAME_Entrance_Left',
        [thickness, DOOR_HEIGHT + 0.08, depth],
        [
          ENTRANCE_CENTER_X - ENTRANCE_WIDTH / 2,
          DOOR_HEIGHT / 2,
          ROOM_LENGTH / 2 - 0.02,
        ],
        materials.trim,
      ),
      this.createVisualBox(
        'FRAME_Entrance_Right',
        [thickness, DOOR_HEIGHT + 0.08, depth],
        [
          ENTRANCE_CENTER_X + ENTRANCE_WIDTH / 2,
          DOOR_HEIGHT / 2,
          ROOM_LENGTH / 2 - 0.02,
        ],
        materials.trim,
      ),
      this.createVisualBox(
        'FRAME_Entrance_Top',
        [ENTRANCE_WIDTH + thickness * 2, thickness, depth],
        [ENTRANCE_CENTER_X, DOOR_HEIGHT, ROOM_LENGTH / 2 - 0.02],
        materials.trim,
      ),
      this.createVisualBox(
        'FRAME_Exit_North',
        [depth, DOOR_HEIGHT + 0.08, thickness],
        [ROOM_WIDTH / 2 - 0.02, DOOR_HEIGHT / 2, EXIT_CENTER_Z - EXIT_WIDTH / 2],
        materials.trim,
      ),
      this.createVisualBox(
        'FRAME_Exit_South',
        [depth, DOOR_HEIGHT + 0.08, thickness],
        [ROOM_WIDTH / 2 - 0.02, DOOR_HEIGHT / 2, EXIT_CENTER_Z + EXIT_WIDTH / 2],
        materials.trim,
      ),
      this.createVisualBox(
        'FRAME_Exit_Top',
        [depth, thickness, EXIT_WIDTH + thickness * 2],
        [ROOM_WIDTH / 2 - 0.02, DOOR_HEIGHT, EXIT_CENTER_Z],
        materials.trim,
      ),
    );
  }

  private createEntranceDoor(root: THREE.Object3D): void {
    const materials = this.requireMaterials();
    const door = this.createVisualBox(
      'DOOR_Entrance',
      [ENTRANCE_WIDTH - 0.08, DOOR_HEIGHT - 0.06, 0.09],
      [ENTRANCE_CENTER_X, (DOOR_HEIGHT - 0.06) / 2, ROOM_LENGTH / 2 - 0.08],
      materials.door,
    );
    const handle = this.createCylinder(
      'DOOR_Entrance_Handle',
      0.04,
      0.09,
      [ENTRANCE_CENTER_X + 0.32, 1.02, ROOM_LENGTH / 2 - 0.01],
      materials.darkMetal,
      Math.PI / 2,
    );
    root.add(door, handle);
  }

  private createExitDoor(root: THREE.Object3D): void {
    const materials = this.requireMaterials();
    const pivot = new THREE.Group();
    pivot.name = 'DOOR_Exit_Pivot';
    pivot.position.set(
      ROOM_WIDTH / 2 - 0.08,
      0,
      EXIT_CENTER_Z - EXIT_WIDTH / 2 + 0.04,
    );
    pivot.add(
      this.createVisualBox(
        'DOOR_Exit',
        [0.09, DOOR_HEIGHT - 0.06, EXIT_WIDTH - 0.08],
        [0, (DOOR_HEIGHT - 0.06) / 2, (EXIT_WIDTH - 0.08) / 2],
        materials.door,
      ),
      this.createSphere(
        'DOOR_Exit_Handle',
        0.055,
        [-0.065, 1.02, EXIT_WIDTH - 0.22],
        materials.darkMetal,
      ),
    );
    root.add(pivot);
    this.exitDoor = pivot;

    const portal = new THREE.Group();
    portal.name = 'EXIT_Bathroom_Portal';
    portal.visible = false;
    const glow = new THREE.Mesh(
      this.ownGeometry(new THREE.PlaneGeometry(EXIT_WIDTH * 0.82, DOOR_HEIGHT * 0.9)),
      materials.exitGlow,
    );
    glow.rotation.y = -Math.PI / 2;
    glow.position.set(ROOM_WIDTH / 2 + 0.055, DOOR_HEIGHT * 0.46, EXIT_CENTER_Z);
    portal.add(glow);
    const light = new THREE.PointLight('#79aaa5', 0, 2.4, 2);
    light.position.set(ROOM_WIDTH / 2 + 0.2, 1.2, EXIT_CENTER_Z);
    portal.add(light);
    root.add(portal);
    this.exitPortal = portal;
    this.exitPortalLight = light;
  }

  private createBathroomDetails(root: THREE.Object3D): void {
    const materials = this.requireMaterials();
    const showerGlass = this.createVisualBox(
      'ARCH_ShowerGlass',
      [0.035, 1.45, 1.62],
      [-1.31, 1.04, -0.72],
      materials.glass,
    );
    showerGlass.castShadow = false;
    showerGlass.renderOrder = 4;
    const frostedWindow = this.createVisualBox(
      'ARCH_FrostedWindow',
      [1.18, 0.82, 0.035],
      [1.72, 1.92, ROOM_LENGTH / 2 - 0.11],
      materials.windowGlass,
    );
    frostedWindow.castShadow = false;
    frostedWindow.renderOrder = 3;

    root.add(
      showerGlass,
      frostedWindow,
      this.createVisualBox(
        'ARCH_ShowerGlassRail',
        [0.065, 0.065, 1.7],
        [-1.31, 1.78, -0.72],
        materials.darkMetal,
      ),
      this.createVisualBox(
        'ARCH_WindowFrameTop',
        [1.34, 0.07, 0.07],
        [1.72, 2.36, ROOM_LENGTH / 2 - 0.13],
        materials.trim,
      ),
      this.createVisualBox(
        'ARCH_WindowFrameBottom',
        [1.34, 0.07, 0.07],
        [1.72, 1.48, ROOM_LENGTH / 2 - 0.13],
        materials.trim,
      ),
      this.createVisualBox(
        'ARCH_WindowFrameLeft',
        [0.07, 0.94, 0.07],
        [1.09, 1.92, ROOM_LENGTH / 2 - 0.13],
        materials.trim,
      ),
      this.createVisualBox(
        'ARCH_WindowFrameRight',
        [0.07, 0.94, 0.07],
        [2.35, 1.92, ROOM_LENGTH / 2 - 0.13],
        materials.trim,
      ),
      this.createCylinder(
        'ARCH_CeilingLightRim',
        0.29,
        0.08,
        [0, 2.7, 0.05],
        materials.darkMetal,
      ),
      this.createCylinder(
        'ARCH_CeilingLightGlass',
        0.23,
        0.07,
        [0, 2.64, 0.05],
        materials.glass,
      ),
    );
  }

  private createLighting(): void {
    const hemisphere = new THREE.HemisphereLight('#d7e4e6', '#756d62', 1.18);
    hemisphere.name = 'LIGHT_Bathroom_Ambient';
    const bounce = new THREE.AmbientLight('#dce2de', 0.68);
    bounce.name = 'LIGHT_Bathroom_Bounce';
    const ceiling = new THREE.SpotLight(
      '#ffd09a',
      8.2,
      8,
      Math.PI * 0.48,
      0.5,
      2,
    );
    ceiling.name = 'LIGHT_Bathroom_Ceiling';
    ceiling.position.set(0, 2.58, 0.05);
    ceiling.target.position.set(0, 0.2, 0);
    ceiling.castShadow = true;
    ceiling.shadow.mapSize.set(1024, 1024);
    ceiling.shadow.camera.near = 0.25;
    ceiling.shadow.camera.far = 8;
    ceiling.shadow.bias = -0.00025;
    ceiling.shadow.normalBias = 0.025;
    ceiling.shadow.radius = 2;
    const vanity = new THREE.PointLight('#ffca91', 1.25, 3.4, 1.7);
    vanity.name = 'LIGHT_Bathroom_Vanity';
    vanity.position.set(0.45, 2.12, -2.45);
    const windowFill = new THREE.DirectionalLight('#a8d1d7', 0.72);
    windowFill.name = 'LIGHT_Bathroom_WindowFill';
    windowFill.position.set(2.2, 2.2, 4.2);
    windowFill.target.position.set(-0.4, 0.5, -0.6);
    const roomFill = new THREE.PointLight('#b9d0cf', 1.1, 5.8, 1.45);
    roomFill.name = 'LIGHT_Bathroom_RoomFill';
    roomFill.position.set(-0.35, 1.7, 1.55);
    const tubFill = new THREE.PointLight('#ffd0a0', 0.62, 3.8, 1.6);
    tubFill.name = 'LIGHT_Bathroom_TubFill';
    tubFill.position.set(-2.05, 1.45, -0.55);
    this.getVisualRoot().add(
      hemisphere,
      bounce,
      ceiling,
      ceiling.target,
      vanity,
      windowFill,
      windowFill.target,
      roomFill,
      tubFill,
    );
  }

  private createArchitectureCollisions(): void {
    const openingSouthMin = ENTRANCE_CENTER_X - ENTRANCE_WIDTH / 2;
    const openingSouthMax = ENTRANCE_CENTER_X + ENTRANCE_WIDTH / 2;
    const southLeftWidth = openingSouthMin + ROOM_WIDTH / 2;
    const southRightWidth = ROOM_WIDTH / 2 - openingSouthMax;
    const openingEastMin = EXIT_CENTER_Z - EXIT_WIDTH / 2;
    const openingEastMax = EXIT_CENTER_Z + EXIT_WIDTH / 2;
    const eastNorthLength = openingEastMin + ROOM_LENGTH / 2;
    const eastSouthLength = ROOM_LENGTH / 2 - openingEastMax;

    this.addCollisionFloor();
    this.addCollisionBox(
      'COLLIDER_Ceiling',
      [ROOM_WIDTH, 0.12, ROOM_LENGTH],
      [0, ROOM_HEIGHT + 0.06, 0],
    );
    this.addCollisionBox(
      'COLLIDER_WallNorth',
      [ROOM_WIDTH + WALL_THICKNESS, ROOM_HEIGHT, WALL_THICKNESS],
      [0, ROOM_HEIGHT / 2, -ROOM_LENGTH / 2],
    );
    this.addCollisionBox(
      'COLLIDER_WallWest',
      [WALL_THICKNESS, ROOM_HEIGHT, ROOM_LENGTH],
      [-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0],
    );
    this.addCollisionBox(
      'COLLIDER_WallSouthLeft',
      [southLeftWidth, ROOM_HEIGHT, WALL_THICKNESS],
      [-ROOM_WIDTH / 2 + southLeftWidth / 2, ROOM_HEIGHT / 2, ROOM_LENGTH / 2],
    );
    this.addCollisionBox(
      'COLLIDER_WallSouthRight',
      [southRightWidth, ROOM_HEIGHT, WALL_THICKNESS],
      [openingSouthMax + southRightWidth / 2, ROOM_HEIGHT / 2, ROOM_LENGTH / 2],
    );
    this.addCollisionBox(
      'COLLIDER_WallSouthLintel',
      [ENTRANCE_WIDTH, ROOM_HEIGHT - DOOR_HEIGHT, WALL_THICKNESS],
      [
        ENTRANCE_CENTER_X,
        DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT) / 2,
        ROOM_LENGTH / 2,
      ],
    );
    this.addCollisionBox(
      'COLLIDER_EntranceDoor',
      [ENTRANCE_WIDTH, DOOR_HEIGHT, WALL_THICKNESS],
      [ENTRANCE_CENTER_X, DOOR_HEIGHT / 2, ROOM_LENGTH / 2],
    );
    this.addCollisionBox(
      'COLLIDER_WallEastNorth',
      [WALL_THICKNESS, ROOM_HEIGHT, eastNorthLength],
      [ROOM_WIDTH / 2, ROOM_HEIGHT / 2, -ROOM_LENGTH / 2 + eastNorthLength / 2],
    );
    this.addCollisionBox(
      'COLLIDER_WallEastSouth',
      [WALL_THICKNESS, ROOM_HEIGHT, eastSouthLength],
      [ROOM_WIDTH / 2, ROOM_HEIGHT / 2, openingEastMax + eastSouthLength / 2],
    );
    this.addCollisionBox(
      'COLLIDER_WallEastLintel',
      [WALL_THICKNESS, ROOM_HEIGHT - DOOR_HEIGHT, EXIT_WIDTH],
      [
        ROOM_WIDTH / 2,
        DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT) / 2,
        EXIT_CENTER_Z,
      ],
    );
    this.exitDoorCollider = this.addCollisionBox(
      'COLLIDER_ExitDoor',
      [WALL_THICKNESS, DOOR_HEIGHT, EXIT_WIDTH],
      [ROOM_WIDTH / 2, DOOR_HEIGHT / 2, EXIT_CENTER_Z],
    );
  }

  private createFixtureCollisions(): void {
    this.addCollisionBox(
      'COLLIDER_Bathtub',
      [1.52, 0.76, 2.22],
      [-2.05, 0.38, -0.72],
    );
    this.addCollisionBox(
      'COLLIDER_Vanity',
      [1.38, 1.3, 1.02],
      [0.45, 0.65, -2.7],
    );
    this.addCollisionBox(
      'COLLIDER_Toilet',
      [1.12, 1.06, 0.9],
      [2.25, 0.53, -0.72],
    );
    this.addCollisionBox(
      'COLLIDER_Bin',
      [0.5, 0.66, 0.5],
      [1.52, 0.33, -2.4],
    );
  }

  private addCollisionFloor(): void {
    const materials = this.requireMaterials();
    const geometry = this.ownGeometry(new THREE.BufferGeometry());
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [-20, 0, -20, 0, 0, 20, 20, 0, -20],
        3,
      ),
    );
    geometry.computeVertexNormals();
    const collision = new THREE.Mesh(geometry, materials.collision);
    collision.name = 'COLLIDER_Floor';
    collision.visible = false;
    this.getCollisionRoot().add(collision);

    if (import.meta.env.DEV) {
      const debugFloor = new THREE.Mesh(
        this.ownGeometry(new THREE.BoxGeometry(ROOM_WIDTH, 0.12, ROOM_LENGTH)),
        materials.collision,
      );
      debugFloor.name = 'DEBUG_COLLIDER_Floor';
      debugFloor.position.set(0, -0.06, 0);
      debugFloor.layers.set(RENDER_LAYERS.debug);
      debugFloor.renderOrder = 9;
      this.getCollisionRoot().add(debugFloor);
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
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    return mesh;
  }

  private createCylinder(
    name: string,
    radius: number,
    height: number,
    position: Vector3Tuple,
    material: THREE.Material,
    rotationX = 0,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(
      this.ownGeometry(new THREE.CylinderGeometry(radius, radius, height, 16)),
      material,
    );
    mesh.name = name;
    mesh.position.fromArray(position);
    mesh.rotation.x = rotationX;
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

  private requireMaterials(): BathroomMaterials {
    if (this.materials === null) {
      throw new Error('Greybox bathroom materials are unavailable.');
    }

    return this.materials;
  }
}
