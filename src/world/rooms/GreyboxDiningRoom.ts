import * as THREE from 'three';
import { DINING_ROOM_ASSET_CATALOG } from '../../content/rooms/DiningRoomAssetCatalog';
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
type DiningAssetKey = keyof typeof DINING_ROOM_ASSET_CATALOG;

interface DiningMaterials {
  readonly wall: THREE.MeshStandardMaterial;
  readonly alcoveWall: THREE.MeshStandardMaterial;
  readonly panel: THREE.MeshStandardMaterial;
  readonly floor: THREE.MeshStandardMaterial;
  readonly ceiling: THREE.MeshStandardMaterial;
  readonly trim: THREE.MeshStandardMaterial;
  readonly door: THREE.MeshStandardMaterial;
  readonly metal: THREE.MeshStandardMaterial;
  readonly candle: THREE.MeshStandardMaterial;
  readonly porcelain: THREE.MeshStandardMaterial;
  readonly glass: THREE.MeshStandardMaterial;
  readonly exitGlow: THREE.MeshBasicMaterial;
  readonly collision: THREE.MeshBasicMaterial;
  readonly interaction: THREE.MeshBasicMaterial;
}

interface DiningAssetPlacement {
  readonly key: DiningAssetKey;
  readonly targetId: string;
  readonly objectName: string;
  readonly position: Vector3Tuple;
  readonly rotationY: number;
  readonly scale?: Vector3Tuple;
  readonly maximumSize: Vector3Tuple;
  readonly verticalAnchor: 'center' | 'ground';
  readonly interactionSize: Vector3Tuple;
  readonly tint: string;
  readonly anomalyColors: readonly [string, string];
  readonly colliderName?: string;
  readonly colliderSize?: Vector3Tuple;
  readonly dependentTargetIds?: readonly string[];
}

const ROOM_HEIGHT = 3.15;
const WALL_THICKNESS = 0.18;
const DOOR_WIDTH = 1.1;
const DOOR_HEIGHT = 2.2;
const ENTRANCE_CENTER_X = -2.8;
const SOUTH_Z = 3.8;
const NORTH_Z = -3.8;
const MAIN_EAST_X = 2;
const WEST_X = -4;
const ALCOVE_EAST_X = 4.8;
const ALCOVE_SOUTH_Z = 2.4;
const ALCOVE_NORTH_Z = -2.2;
const EXIT_CENTER_Z = -0.65;

const DINING_FOOTPRINT: readonly Vector2Tuple[] = [
  [WEST_X, SOUTH_Z],
  [MAIN_EAST_X, SOUTH_Z],
  [MAIN_EAST_X, ALCOVE_SOUTH_Z],
  [ALCOVE_EAST_X, ALCOVE_SOUTH_Z],
  [ALCOVE_EAST_X, ALCOVE_NORTH_Z],
  [MAIN_EAST_X, ALCOVE_NORTH_Z],
  [MAIN_EAST_X, NORTH_Z],
  [WEST_X, NORTH_Z],
];

const DINING_ASSET_PLACEMENTS: readonly DiningAssetPlacement[] = [
  {
    key: 'diningTableCloth',
    targetId: 'dining-table',
    objectName: 'ANOM_Dining_Table',
    position: [-1, 0, -0.1],
    rotationY: 0,
    scale: [1.25, 1, 1.1],
    maximumSize: [2, 0.78, 1.05],
    verticalAnchor: 'ground',
    interactionSize: [1.96, 0.92, 1.073],
    tint: '#b8a58d',
    anomalyColors: ['#6a7561', '#765d6e'],
    colliderName: 'COLLIDER_DiningTable',
    colliderSize: [1.936, 0.78, 1.036],
  },
  ...([
    ['chair-north-west', [-1.65, 0, -1.13], 0],
    ['chair-north-east', [-0.35, 0, -1.13], 0],
    ['chair-south-west', [-1.65, 0, 0.93], Math.PI],
    ['chair-south-east', [-0.35, 0, 0.93], Math.PI],
    ['chair-west', [-2.58, 0, -0.1], Math.PI / 2],
    ['chair-east', [0.58, 0, -0.1], -Math.PI / 2],
  ] as const).map(([targetId, position, rotationY], index) => ({
    key: 'diningChairModern' as const,
    targetId,
    objectName: `ANOM_Dining_Chair_${index + 1}`,
    position,
    rotationY,
    maximumSize: [0.56, 1, 0.56] as const,
    verticalAnchor: 'ground' as const,
    interactionSize: [0.62, 1.08, 0.62] as const,
    tint: '#856f62',
    anomalyColors: ['#56717b', '#7d5b57'] as const,
    colliderName: `COLLIDER_DiningChair_${index + 1}`,
    colliderSize: [0.48, 0.96, 0.48] as const,
  })),
  {
    key: 'sideboardDoors',
    targetId: 'sideboard',
    objectName: 'ANOM_Dining_Sideboard',
    position: [-1, 0, -3.35],
    rotationY: 0,
    maximumSize: [2, 0.82, 0.66],
    verticalAnchor: 'ground',
    interactionSize: [2.12, 0.94, 0.78],
    tint: '#9c8066',
    anomalyColors: ['#536f78', '#6e765c'],
    colliderName: 'COLLIDER_DiningSideboard',
    colliderSize: [2.04, 0.82, 0.7],
    dependentTargetIds: ['bear-ornament'],
  },
  {
    key: 'bearOrnament',
    targetId: 'bear-ornament',
    objectName: 'ANOM_Dining_BearOrnament',
    position: [-1, 0.78, -3.3],
    rotationY: 0,
    maximumSize: [0.34, 0.4, 0.3],
    verticalAnchor: 'ground',
    interactionSize: [0.46, 0.52, 0.42],
    tint: '#a88a68',
    anomalyColors: ['#80605a', '#5b7480'],
  },
  {
    key: 'rugRounded',
    targetId: 'dining-rug',
    objectName: 'ANOM_Dining_Rug',
    position: [-1, 0.012, -0.1],
    rotationY: 0,
    maximumSize: [3.25, 0.035, 2.05],
    verticalAnchor: 'ground',
    interactionSize: [3.35, 0.14, 2.15],
    tint: '#765f58',
    anomalyColors: ['#526f75', '#6c7759'],
  },
  {
    key: 'ceilingFan',
    targetId: 'ceiling-fan',
    objectName: 'ANOM_Dining_CeilingFan',
    position: [-1, 2.84, -0.1],
    rotationY: 0,
    maximumSize: [1.5, 0.4, 1.5],
    verticalAnchor: 'center',
    interactionSize: [1.62, 0.5, 1.62],
    tint: '#5e5148',
    anomalyColors: ['#526f74', '#75605b'],
  },
  {
    key: 'floorLampSquare',
    targetId: 'alcove-floor-lamp',
    objectName: 'ANOM_Dining_AlcoveFloorLamp',
    position: [4.35, 0, 1.92],
    rotationY: 0,
    maximumSize: [0.34, 2.05, 0.34],
    verticalAnchor: 'ground',
    interactionSize: [0.48, 2.14, 0.48],
    tint: '#aaa080',
    anomalyColors: ['#65785d', '#766083'],
  },
  {
    key: 'alcoveBench',
    targetId: 'alcove-bench',
    objectName: 'ANOM_Dining_AlcoveBench',
    position: [4.28, 0, 1.13],
    rotationY: -Math.PI / 2,
    scale: [1, 1, 1.3],
    maximumSize: [0.55, 1, 1.4],
    verticalAnchor: 'ground',
    interactionSize: [0.7, 1.08, 0.98],
    tint: '#7d6b62',
    anomalyColors: ['#53717b', '#7a5b62'],
    colliderName: 'COLLIDER_DiningAlcoveBench',
    colliderSize: [0.58, 1, 0.91],
  },
  {
    key: 'glassSideTable',
    targetId: 'alcove-table',
    objectName: 'ANOM_Dining_AlcoveTable',
    position: [3.48, 0, 0.92],
    rotationY: Math.PI / 2,
    maximumSize: [0.72, 0.58, 1.1],
    verticalAnchor: 'ground',
    interactionSize: [0.84, 0.62, 1.2],
    tint: '#829091',
    anomalyColors: ['#6d775a', '#775f75'],
    colliderName: 'COLLIDER_DiningAlcoveTable',
    colliderSize: [0.7, 0.48, 1.08],
  },
  {
    key: 'loungeChairRelax',
    targetId: 'alcove-chair-south',
    objectName: 'ANOM_Dining_AlcoveChairSouth',
    position: [2.82, 0, 1.72],
    rotationY: Math.PI * 0.78,
    maximumSize: [0.9, 1.05, 1.12],
    verticalAnchor: 'ground',
    interactionSize: [1.0, 1.14, 1.22],
    tint: '#786860',
    anomalyColors: ['#56727d', '#735c78'],
    colliderName: 'COLLIDER_DiningAlcoveChairSouth',
    colliderSize: [0.88, 1.02, 1.02],
  },
  {
    key: 'loungeChairRelax',
    targetId: 'alcove-chair-north',
    objectName: 'ANOM_Dining_AlcoveChairNorth',
    position: [2.75, 0, -1.42],
    rotationY: Math.PI / 10,
    maximumSize: [0.9, 1.05, 1.12],
    verticalAnchor: 'ground',
    interactionSize: [1.0, 1.14, 1.22],
    tint: '#786860',
    anomalyColors: ['#607858', '#805d58'],
    colliderName: 'COLLIDER_DiningAlcoveChairNorth',
    colliderSize: [0.88, 1.02, 1.02],
  },
] as const;

export const DINING_ROOM_EXIT_THRESHOLD = {
  x: ALCOVE_EAST_X + 0.4,
  minimumZ: EXIT_CENTER_Z - DOOR_WIDTH / 2,
  maximumZ: EXIT_CENTER_Z + DOOR_WIDTH / 2,
} as const;

export class GreyboxDiningRoom extends RoomRuntime implements PlayableRoom {
  public readonly definition: RoomDefinition = {
    id: 'dining-room',
    displayName: 'Dining Room',
    observationDurationMs: 13_000,
    searchDurationMs: 28_000,
    anomalyCount: { min: 2, max: 2 },
    playerSpawn: {
      position: [ENTRANCE_CENTER_X, 0, 3.05],
      yaw: 0,
      pitch: 0,
    },
  };

  private readonly anomalyTargetRegistry = new AnomalyTargetRegistry();
  private readonly assetLeases: GlbAssetLease[] = [];
  private materials: DiningMaterials | null = null;
  private exitDoor: THREE.Object3D | null = null;
  private exitDoorCollider: THREE.Mesh | null = null;
  private exitPortal: THREE.Group | null = null;
  private exitPortalLight: THREE.PointLight | null = null;
  private assetManager: AssetManager | null = null;
  private assetLoadPromise: Promise<void> | null = null;
  private assetsLoaded = false;
  private buildRevision = 0;

  public constructor() {
    super('ROOM_DiningRoom_VisualRoot', 'COLLIDER_DiningRoom_Root');
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
    return DINING_ROOM_EXIT_THRESHOLD;
  }

  public isAssetsLoaded(): boolean {
    return this.assetsLoaded;
  }

  public getLoadedAssetIds(): readonly string[] {
    return this.assetLeases.map((lease) => lease.assetId);
  }

  public async loadAssets(assetManager?: AssetManager): Promise<void> {
    await this.loadDiningRoomAssets(assetManager);
    const manager = this.assetManager;

    if (manager === null) {
      throw new Error('The dining-room AssetManager is unavailable.');
    }

    await this.loadHouseShellAssets(manager, 'dining-room');
  }

  private async loadDiningRoomAssets(assetManager?: AssetManager): Promise<void> {
    if (!this.isMounted()) {
      throw new Error('The dining room must be mounted before loading assets.');
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
      throw new Error('The dining-room AssetManager is unavailable.');
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
      throw new Error('The dining-room exit-door collider is unavailable.');
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
    if (
      this.exitPortal === null ||
      this.exitPortalLight === null ||
      this.materials === null
    ) {
      throw new Error('The dining-room exit portal is unavailable.');
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
      DINING_ASSET_PLACEMENTS.map((placement) =>
        assetManager.acquire(DINING_ROOM_ASSET_CATALOG[placement.key]),
      ),
    );
    const leases = results.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : [],
    );
    const failure = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    if (failure !== undefined) {
      for (const lease of leases) {
        lease.release();
      }
      throw new Error(
        `Dining-room assets could not be loaded: ${this.getErrorMessage(failure.reason)}`,
        { cause: failure.reason },
      );
    }
    if (!this.isMounted() || revision !== this.buildRevision) {
      for (const lease of leases) {
        lease.release();
      }
      throw new Error('The dining room changed while its assets were loading.');
    }
    try {
      const targets = DINING_ASSET_PLACEMENTS.map((placement, index) => {
        const lease = leases[index];
        if (lease === undefined) {
          throw new Error(`Missing dining-room asset for "${placement.targetId}".`);
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
      for (const lease of leases) {
        lease.release();
      }
      throw new Error(
        `Dining-room assets could not be prepared: ${this.getErrorMessage(error)}`,
        { cause: error },
      );
    }
  }

  private createFittedAssetObject(
    placement: DiningAssetPlacement,
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
      throw new Error(`Dining-room asset "${lease.assetId}" has invalid bounds.`);
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
    return object;
  }

  private harmonizeImportedMaterials(
    root: THREE.Object3D,
    placement: DiningAssetPlacement,
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
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const material of materials) {
        if (styled.has(material)) {
          continue;
        }
        const standard = material as THREE.MeshStandardMaterial;
        material.name = `dining-room-${placement.targetId}`;
        if (standard.isMeshStandardMaterial) {
          standard.color.multiply(new THREE.Color(placement.tint));
          standard.roughness = Math.max(standard.roughness, 0.7);
          standard.metalness = Math.min(standard.metalness, 0.14);
          standard.envMapIntensity = 0.5;
          standard.needsUpdate = true;
        }
        styled.add(material);
      }
    });
    if (surfaceIndex === 0) {
      throw new Error(`Dining-room asset "${placement.targetId}" contains no mesh.`);
    }
  }

  private createAnomalyTarget(
    placement: DiningAssetPlacement,
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
    if (placement.targetId === 'dining-table') {
      this.createTableDetails(object, placement.scale ?? [1, 1, 1]);
    }
    const variants: readonly PreparedAnomalyVariant[] = [
      { id: 'hidden', kind: 'hide' },
      { id: 'appeared', kind: 'show' },
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
    ];
    const collisionObjects = this.getCollisionObjects(placement);
    return {
      id: placement.targetId,
      nodeName: object.name,
      interactionNodeNames: [interactionVolume.name],
      allowedKinds: ['hide', 'show', 'color'],
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

  private getCollisionObjects(
    placement: DiningAssetPlacement,
  ): readonly THREE.Object3D[] {
    if (placement.colliderName === undefined) {
      return [];
    }
    const collider = this.getCollisionRoot().getObjectByName(
      placement.colliderName,
    );
    if (collider === undefined) {
      throw new Error(`Dining-room collider "${placement.colliderName}" is missing.`);
    }
    return [collider];
  }

  private createMaterials(): DiningMaterials {
    const standard = (
      color: THREE.ColorRepresentation,
      roughness: number,
      metalness = 0,
    ) => this.ownMaterial(
      new THREE.MeshStandardMaterial({ color, roughness, metalness }),
    );
    const floor = standard('#ffffff', 0.86);
    floor.map = this.createFloorTexture();
    const ceiling = standard('#d2ccc0', 0.98);
    ceiling.side = THREE.DoubleSide;
    const glass = standard('#708d91', 0.26, 0.08);
    glass.transparent = true;
    glass.opacity = 0.7;
    glass.emissive.set('#173237');
    glass.emissiveIntensity = 0.3;
    const candle = standard('#e1c183', 0.5);
    candle.emissive.set('#8b5222');
    candle.emissiveIntensity = 0.75;
    const wall = standard('#756c65', 0.96);
    const alcoveWall = standard('#53615b', 0.94);
    const wallTexture = this.ownTexture(
      createAgedPlasterTexture({
        name: 'TEXTURE_DiningRoom_AgedPlaster',
        seed: 3_059,
      }),
    );
    wall.map = wallTexture;
    alcoveWall.map = wallTexture;
    return {
      wall,
      alcoveWall,
      panel: standard('#493e3b', 0.88),
      floor,
      ceiling,
      trim: standard('#b7a68d', 0.84),
      door: standard('#48312d', 0.8),
      metal: standard('#34393a', 0.55, 0.2),
      candle,
      porcelain: standard('#d4cec2', 0.72),
      glass,
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
      createWoodPlankFloorTexture({
        name: 'TEXTURE_DiningRoom_WornWood',
        seed: 3_059,
        repeat: [2.75, 3.25],
        plankColors: ['#81684e', '#765e48', '#6d5845', '#896e51'],
        seamColor: '#463930',
      }),
    );
  }

  private createArchitecture(): void {
    const materials = this.requireMaterials();
    const root = new THREE.Group();
    root.name = 'DiningRoom_Architecture';
    root.add(
      this.createPolygonSurface('ARCH_DiningRoomFloor', -0.015, materials.floor),
      this.createPolygonSurface('ARCH_DiningRoomCeiling', ROOM_HEIGHT, materials.ceiling),
    );
    this.createWalls(root);
    this.createDoors(root);
    this.createAlcoveDetails(root);
    this.getVisualRoot().add(root);
  }

  private createWalls(root: THREE.Object3D): void {
    const materials = this.requireMaterials();
    const entranceLeft = ENTRANCE_CENTER_X - DOOR_WIDTH / 2;
    const entranceRight = ENTRANCE_CENTER_X + DOOR_WIDTH / 2;
    const exitSouth = EXIT_CENTER_Z + DOOR_WIDTH / 2;
    const exitNorth = EXIT_CENTER_Z - DOOR_WIDTH / 2;
    const segments: readonly {
      readonly name: string;
      readonly start: Vector2Tuple;
      readonly end: Vector2Tuple;
      readonly alcove?: boolean;
    }[] = [
      { name: 'SouthWest', start: [WEST_X, SOUTH_Z], end: [entranceLeft, SOUTH_Z] },
      { name: 'SouthEast', start: [entranceRight, SOUTH_Z], end: [MAIN_EAST_X, SOUTH_Z] },
      { name: 'MainEastSouth', start: [MAIN_EAST_X, SOUTH_Z], end: [MAIN_EAST_X, ALCOVE_SOUTH_Z] },
      { name: 'AlcoveSouth', start: [MAIN_EAST_X, ALCOVE_SOUTH_Z], end: [ALCOVE_EAST_X, ALCOVE_SOUTH_Z], alcove: true },
      { name: 'AlcoveEastSouth', start: [ALCOVE_EAST_X, ALCOVE_SOUTH_Z], end: [ALCOVE_EAST_X, exitSouth], alcove: true },
      { name: 'AlcoveEastNorth', start: [ALCOVE_EAST_X, exitNorth], end: [ALCOVE_EAST_X, ALCOVE_NORTH_Z], alcove: true },
      { name: 'AlcoveNorth', start: [ALCOVE_EAST_X, ALCOVE_NORTH_Z], end: [MAIN_EAST_X, ALCOVE_NORTH_Z], alcove: true },
      { name: 'MainEastNorth', start: [MAIN_EAST_X, ALCOVE_NORTH_Z], end: [MAIN_EAST_X, NORTH_Z] },
      { name: 'North', start: [MAIN_EAST_X, NORTH_Z], end: [WEST_X, NORTH_Z] },
      { name: 'West', start: [WEST_X, NORTH_Z], end: [WEST_X, SOUTH_Z] },
    ];
    for (const segment of segments) {
      const wallMaterial = segment.alcove ? this.requireMaterials().alcoveWall : this.requireMaterials().wall;
      root.add(
        this.createSegmentBox(`WALL_DiningRoom_${segment.name}`, segment.start, segment.end, ROOM_HEIGHT, WALL_THICKNESS, ROOM_HEIGHT / 2, wallMaterial),
        this.createSegmentBox(`PANEL_DiningRoom_${segment.name}`, segment.start, segment.end, 0.82, WALL_THICKNESS + 0.025, 0.41, this.requireMaterials().panel, 0.98),
        this.createSegmentBox(`TRIM_DiningRoom_${segment.name}`, segment.start, segment.end, 0.07, WALL_THICKNESS + 0.045, 0.85, this.requireMaterials().trim, 0.98),
      );
    }
    root.add(
      this.createBox('WALL_DiningRoom_EntranceLintel', [DOOR_WIDTH, ROOM_HEIGHT - DOOR_HEIGHT, WALL_THICKNESS], [ENTRANCE_CENTER_X, DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT) / 2, SOUTH_Z], materials.wall),
      this.createBox('WALL_DiningRoom_ExitLintel', [WALL_THICKNESS, ROOM_HEIGHT - DOOR_HEIGHT, DOOR_WIDTH], [ALCOVE_EAST_X, DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT) / 2, EXIT_CENTER_Z], materials.alcoveWall),
    );
  }

  private createDoors(root: THREE.Object3D): void {
    const materials = this.requireMaterials();
    root.add(
      this.createBox('FRAME_DiningEntrance_Left', [0.09, DOOR_HEIGHT + 0.08, 0.26], [ENTRANCE_CENTER_X - DOOR_WIDTH / 2, DOOR_HEIGHT / 2, SOUTH_Z - 0.02], materials.trim),
      this.createBox('FRAME_DiningEntrance_Right', [0.09, DOOR_HEIGHT + 0.08, 0.26], [ENTRANCE_CENTER_X + DOOR_WIDTH / 2, DOOR_HEIGHT / 2, SOUTH_Z - 0.02], materials.trim),
      this.createBox('FRAME_DiningEntrance_Top', [DOOR_WIDTH + 0.18, 0.09, 0.26], [ENTRANCE_CENTER_X, DOOR_HEIGHT, SOUTH_Z - 0.02], materials.trim),
      this.createBox('DOOR_DiningRoom_Entrance', [DOOR_WIDTH - 0.08, DOOR_HEIGHT - 0.06, 0.09], [ENTRANCE_CENTER_X, (DOOR_HEIGHT - 0.06) / 2, SOUTH_Z - 0.08], materials.door),
    );
    const pivot = new THREE.Group();
    pivot.name = 'DOOR_DiningRoomExit_Pivot';
    pivot.position.set(ALCOVE_EAST_X - 0.08, 0, EXIT_CENTER_Z - DOOR_WIDTH / 2 + 0.04);
    pivot.add(
      this.createBox('DOOR_DiningRoom_Exit', [0.09, DOOR_HEIGHT - 0.06, DOOR_WIDTH - 0.08], [0, (DOOR_HEIGHT - 0.06) / 2, (DOOR_WIDTH - 0.08) / 2], materials.door),
      this.createSphere('DOOR_DiningRoom_ExitHandle', 0.055, [-0.065, 1.02, DOOR_WIDTH - 0.23], materials.metal),
    );
    root.add(
      pivot,
      this.createBox('FRAME_DiningExit_South', [0.26, DOOR_HEIGHT + 0.08, 0.09], [ALCOVE_EAST_X - 0.02, DOOR_HEIGHT / 2, EXIT_CENTER_Z + DOOR_WIDTH / 2], materials.trim),
      this.createBox('FRAME_DiningExit_North', [0.26, DOOR_HEIGHT + 0.08, 0.09], [ALCOVE_EAST_X - 0.02, DOOR_HEIGHT / 2, EXIT_CENTER_Z - DOOR_WIDTH / 2], materials.trim),
      this.createBox('FRAME_DiningExit_Top', [0.26, 0.09, DOOR_WIDTH + 0.18], [ALCOVE_EAST_X - 0.02, DOOR_HEIGHT, EXIT_CENTER_Z], materials.trim),
    );
    this.exitDoor = pivot;
    const portal = new THREE.Group();
    portal.name = 'EXIT_DiningRoom_Portal';
    portal.visible = false;
    const glow = new THREE.Mesh(
      this.ownGeometry(new THREE.PlaneGeometry(DOOR_WIDTH * 0.82, DOOR_HEIGHT * 0.9)),
      materials.exitGlow,
    );
    glow.rotation.y = -Math.PI / 2;
    glow.position.set(ALCOVE_EAST_X + 0.055, DOOR_HEIGHT * 0.46, EXIT_CENTER_Z);
    const light = new THREE.PointLight('#7aaaa5', 0, 2.6, 2);
    light.position.set(ALCOVE_EAST_X + 0.2, 1.2, EXIT_CENTER_Z);
    portal.add(glow, light);
    root.add(portal);
    this.exitPortal = portal;
    this.exitPortalLight = light;
  }

  private createAlcoveDetails(root: THREE.Object3D): void {
    const materials = this.requireMaterials();
    root.add(
      this.createBox('ARCH_DiningRoom_AlcoveColumnSouth', [0.34, 2.72, 0.34], [MAIN_EAST_X, 1.36, 1.72], materials.trim),
      this.createBox('ARCH_DiningRoom_AlcoveColumnNorth', [0.34, 2.72, 0.34], [MAIN_EAST_X, 1.36, -1.52], materials.trim),
      this.createBox('ARCH_DiningRoom_AlcoveHeader', [0.34, 0.32, 3.58], [MAIN_EAST_X, 2.83, 0.1], materials.trim),
      this.createBox('WINDOW_DiningRoom_AlcoveSouth', [1.65, 1.28, 0.035], [3.55, 1.75, ALCOVE_SOUTH_Z - 0.1], materials.glass),
      this.createBox('WINDOW_DiningRoom_AlcoveNorth', [1.65, 1.28, 0.035], [3.55, 1.75, ALCOVE_NORTH_Z + 0.1], materials.glass),
      this.createBox('WINDOW_DiningRoom_AlcoveEast', [0.035, 1.28, 0.85], [ALCOVE_EAST_X - 0.1, 1.75, 1.55], materials.glass),
    );
  }

  private createTableDetails(
    root: THREE.Object3D,
    parentScale: Vector3Tuple,
  ): void {
    const materials = this.requireMaterials();
    const details = new THREE.Group();
    details.name = 'DETAIL_DiningRoom_TableSetting';
    details.scale.set(
      1 / parentScale[0],
      1 / parentScale[1],
      1 / parentScale[2],
    );
    const platePositions: readonly Vector3Tuple[] = [
      [-0.65, 0.81, -0.33], [0.65, 0.81, -0.33],
      [-0.65, 0.81, 0.33], [0.65, 0.81, 0.33],
    ];
    for (const [index, position] of platePositions.entries()) {
      details.add(this.createCylinder(`DETAIL_DiningRoom_Plate_${index + 1}`, 0.13, 0.025, position, materials.porcelain));
    }
    for (const [index, x] of [-0.28, 0.28].entries()) {
      details.add(
        this.createCylinder(`DETAIL_DiningRoom_Candle_${index + 1}`, 0.035, 0.28, [x, 0.95, 0], materials.candle),
        this.createSphere(`DETAIL_DiningRoom_Flame_${index + 1}`, 0.025, [x, 1.11, 0], materials.candle),
      );
    }
    root.add(details);
  }

  private createLighting(): void {
    const hemisphere = new THREE.HemisphereLight('#94a1a5', '#3b2d26', 0.4);
    hemisphere.name = 'LIGHT_DiningRoom_Ambient';
    const ambient = new THREE.AmbientLight('#c8c0b3', 0.12);
    ambient.name = 'LIGHT_DiningRoom_Bounce';
    const key = new THREE.SpotLight('#f0c495', 6.4, 9.5, Math.PI / 3.15, 0.52, 1.15);
    key.name = 'LIGHT_DiningRoom_Table';
    key.position.set(-1, 2.95, -0.1);
    key.target.position.set(-1, 0.4, -0.1);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.3;
    key.shadow.camera.far = 10;
    key.shadow.bias = -0.0002;
    key.shadow.normalBias = 0.026;
    const sideboard = new THREE.PointLight('#d9ad7e', 0.42, 5.2, 1.6);
    sideboard.name = 'LIGHT_DiningRoom_Sideboard';
    sideboard.position.set(-1, 1.65, -3.0);
    const alcove = new THREE.PointLight('#7da097', 0.45, 5.8, 1.55);
    alcove.name = 'LIGHT_DiningRoom_Alcove';
    alcove.position.set(3.55, 2.1, 0.8);
    const moon = new THREE.PointLight('#7393a2', 0.3, 5, 1.7);
    moon.name = 'LIGHT_DiningRoom_Moon';
    moon.position.set(4.35, 1.8, -1.65);
    const entranceFill = new THREE.PointLight('#c7b6a1', 0.38, 6.2, 1.55);
    entranceFill.name = 'LIGHT_DiningRoom_EntranceFill';
    entranceFill.position.set(-2.75, 1.85, 2.15);
    this.getVisualRoot().add(
      hemisphere,
      ambient,
      key,
      key.target,
      sideboard,
      alcove,
      moon,
      entranceFill,
    );
  }

  private createCollisions(): void {
    this.addCollisionFloor();
    this.addCollisionBox('COLLIDER_DiningRoomCeiling', [9.2, 0.12, 8.2], [0.4, ROOM_HEIGHT + 0.06, 0]);
    const entranceLeft = ENTRANCE_CENTER_X - DOOR_WIDTH / 2;
    const entranceRight = ENTRANCE_CENTER_X + DOOR_WIDTH / 2;
    const exitSouth = EXIT_CENTER_Z + DOOR_WIDTH / 2;
    const exitNorth = EXIT_CENTER_Z - DOOR_WIDTH / 2;
    const segments: readonly [string, Vector2Tuple, Vector2Tuple][] = [
      ['SouthWest', [WEST_X, SOUTH_Z], [entranceLeft, SOUTH_Z]],
      ['SouthEast', [entranceRight, SOUTH_Z], [MAIN_EAST_X, SOUTH_Z]],
      ['MainEastSouth', [MAIN_EAST_X, SOUTH_Z], [MAIN_EAST_X, ALCOVE_SOUTH_Z]],
      ['AlcoveSouth', [MAIN_EAST_X, ALCOVE_SOUTH_Z], [ALCOVE_EAST_X, ALCOVE_SOUTH_Z]],
      ['AlcoveEastSouth', [ALCOVE_EAST_X, ALCOVE_SOUTH_Z], [ALCOVE_EAST_X, exitSouth]],
      ['AlcoveEastNorth', [ALCOVE_EAST_X, exitNorth], [ALCOVE_EAST_X, ALCOVE_NORTH_Z]],
      ['AlcoveNorth', [ALCOVE_EAST_X, ALCOVE_NORTH_Z], [MAIN_EAST_X, ALCOVE_NORTH_Z]],
      ['MainEastNorth', [MAIN_EAST_X, ALCOVE_NORTH_Z], [MAIN_EAST_X, NORTH_Z]],
      ['North', [MAIN_EAST_X, NORTH_Z], [WEST_X, NORTH_Z]],
      ['West', [WEST_X, NORTH_Z], [WEST_X, SOUTH_Z]],
    ];
    for (const [name, start, end] of segments) {
      this.addCollisionSegment(`COLLIDER_DiningRoomWall_${name}`, start, end);
    }
    this.addCollisionBox('COLLIDER_DiningRoomEntranceLintel', [DOOR_WIDTH, ROOM_HEIGHT - DOOR_HEIGHT, WALL_THICKNESS], [ENTRANCE_CENTER_X, DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT) / 2, SOUTH_Z]);
    this.addCollisionBox('COLLIDER_DiningRoomEntranceDoor', [DOOR_WIDTH, DOOR_HEIGHT, WALL_THICKNESS], [ENTRANCE_CENTER_X, DOOR_HEIGHT / 2, SOUTH_Z]);
    this.addCollisionBox('COLLIDER_DiningRoomExitLintel', [WALL_THICKNESS, ROOM_HEIGHT - DOOR_HEIGHT, DOOR_WIDTH], [ALCOVE_EAST_X, DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT) / 2, EXIT_CENTER_Z]);
    this.exitDoorCollider = this.addCollisionBox('COLLIDER_DiningRoomExitDoor', [WALL_THICKNESS, DOOR_HEIGHT, DOOR_WIDTH], [ALCOVE_EAST_X, DOOR_HEIGHT / 2, EXIT_CENTER_Z]);
    this.addCollisionBox('COLLIDER_DiningRoomAlcoveColumnSouth', [0.34, 2.72, 0.34], [MAIN_EAST_X, 1.36, 1.72]);
    this.addCollisionBox('COLLIDER_DiningRoomAlcoveColumnNorth', [0.34, 2.72, 0.34], [MAIN_EAST_X, 1.36, -1.52]);
    for (const placement of DINING_ASSET_PLACEMENTS) {
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
    floor.name = 'COLLIDER_DiningRoomFloor';
    floor.visible = false;
    this.getCollisionRoot().add(floor);
    if (import.meta.env.DEV) {
      const debugFloor = this.createPolygonSurface('DEBUG_COLLIDER_DiningRoomFloor', -0.025, this.requireMaterials().collision);
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
    const first = DINING_FOOTPRINT[0] as Vector2Tuple;
    shape.moveTo(first[0], -first[1]);
    for (const point of DINING_FOOTPRINT.slice(1)) {
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

  private createBox(name: string, size: Vector3Tuple, position: Vector3Tuple, material: THREE.Material): THREE.Mesh {
    const mesh = new THREE.Mesh(this.ownGeometry(new THREE.BoxGeometry(...size)), material);
    mesh.name = name;
    mesh.position.fromArray(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private createCylinder(name: string, radius: number, height: number, position: Vector3Tuple, material: THREE.Material): THREE.Mesh {
    const mesh = new THREE.Mesh(
      this.ownGeometry(new THREE.CylinderGeometry(radius, radius, height, 18)),
      material,
    );
    mesh.name = name;
    mesh.position.fromArray(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private createSphere(name: string, radius: number, position: Vector3Tuple, material: THREE.Material): THREE.Mesh {
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

  private requireMaterials(): DiningMaterials {
    if (this.materials === null) {
      throw new Error('Dining-room materials are unavailable.');
    }
    return this.materials;
  }
}
