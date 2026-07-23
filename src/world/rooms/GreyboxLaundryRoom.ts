import * as THREE from 'three';
import { LAUNDRY_ROOM_ASSET_CATALOG } from '../../content/rooms/LaundryRoomAssetCatalog';
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
type LaundryAssetKey = keyof typeof LAUNDRY_ROOM_ASSET_CATALOG;
type AnomalyStyle = 'furniture' | 'accent' | 'story';

interface LaundryMaterials {
  readonly wall: THREE.MeshStandardMaterial;
  readonly lowerWall: THREE.MeshStandardMaterial;
  readonly floor: THREE.MeshStandardMaterial;
  readonly ceiling: THREE.MeshStandardMaterial;
  readonly trim: THREE.MeshStandardMaterial;
  readonly door: THREE.MeshStandardMaterial;
  readonly metal: THREE.MeshStandardMaterial;
  readonly clothDark: THREE.MeshStandardMaterial;
  readonly clothPale: THREE.MeshStandardMaterial;
  readonly ash: THREE.MeshStandardMaterial;
  readonly paper: THREE.MeshStandardMaterial;
  readonly glass: THREE.MeshStandardMaterial;
  readonly lamp: THREE.MeshBasicMaterial;
  readonly exitGlow: THREE.MeshBasicMaterial;
  readonly collision: THREE.MeshBasicMaterial;
  readonly interaction: THREE.MeshBasicMaterial;
}

interface LaundryAssetPlacement {
  readonly key: LaundryAssetKey;
  readonly targetId: string;
  readonly objectName: string;
  readonly position: Vector3Tuple;
  readonly rotationY: number;
  readonly maximumSize: Vector3Tuple;
  readonly interactionSize: Vector3Tuple;
  readonly tint: string;
  readonly anomalyStyle: AnomalyStyle;
  readonly colliderName?: string;
  readonly colliderSize?: Vector3Tuple;
}

const HALF_WIDTH = 4;
const HALF_DEPTH = 3.5;
const ROOM_HEIGHT = 3.05;
const WALL_THICKNESS = 0.18;
const DOOR_WIDTH = 1.1;
const DOOR_HEIGHT = 2.2;
const ENTRANCE_X = -2.45;
const EXIT_X = 2.45;
const SOUTH_Z = HALF_DEPTH;
const NORTH_Z = -HALF_DEPTH;

const ASSET_PLACEMENTS: readonly LaundryAssetPlacement[] = [
  {
    key: 'washingMachine',
    targetId: 'washing-machine',
    objectName: 'ANOM_LaundryRoom_WashingMachine',
    position: [-3.28, 0, -2.35],
    rotationY: Math.PI / 2,
    maximumSize: [0.88, 1.12, 0.92],
    interactionSize: [1.05, 1.3, 1.08],
    tint: '#9a9b91',
    anomalyStyle: 'story',
    colliderName: 'COLLIDER_LaundryRoom_WashingMachine',
    colliderSize: [0.94, 1.12, 1],
  },
  {
    key: 'utilityCabinet',
    targetId: 'utility-cabinet',
    objectName: 'ANOM_LaundryRoom_UtilityCabinet',
    position: [-3.3, 0, -0.75],
    rotationY: Math.PI / 2,
    maximumSize: [0.76, 1.02, 1.1],
    interactionSize: [0.92, 1.16, 1.24],
    tint: '#756d5d',
    anomalyStyle: 'furniture',
    colliderName: 'COLLIDER_LaundryRoom_UtilityCabinet',
    colliderSize: [0.82, 1.02, 1.16],
  },
  {
    key: 'storageShelf',
    targetId: 'storage-shelf',
    objectName: 'ANOM_LaundryRoom_StorageShelf',
    position: [3.3, 0, -2.15],
    rotationY: -Math.PI / 2,
    maximumSize: [0.72, 2.05, 1.65],
    interactionSize: [0.9, 2.2, 1.82],
    tint: '#665b50',
    anomalyStyle: 'furniture',
    colliderName: 'COLLIDER_LaundryRoom_StorageShelf',
    colliderSize: [0.78, 2.05, 1.72],
  },
  {
    key: 'disposalBin',
    targetId: 'disposal-bin',
    objectName: 'ANOM_LaundryRoom_DisposalBin',
    position: [3.28, 0, -0.35],
    rotationY: -Math.PI / 2,
    maximumSize: [0.62, 0.86, 0.62],
    interactionSize: [0.82, 1.06, 0.82],
    tint: '#565d59',
    anomalyStyle: 'story',
    colliderName: 'COLLIDER_LaundryRoom_DisposalBin',
    colliderSize: [0.68, 0.86, 0.68],
  },
  {
    key: 'foldingBench',
    targetId: 'folding-bench',
    objectName: 'ANOM_LaundryRoom_FoldingBench',
    position: [2.65, 0, 2.15],
    rotationY: Math.PI / 2,
    maximumSize: [0.72, 0.7, 1.65],
    interactionSize: [0.88, 0.86, 1.82],
    tint: '#6d5e50',
    anomalyStyle: 'furniture',
    colliderName: 'COLLIDER_LaundryRoom_FoldingBench',
    colliderSize: [0.78, 0.7, 1.72],
  },
  {
    key: 'runnerRug',
    targetId: 'rubber-runner',
    objectName: 'ANOM_LaundryRoom_RubberRunner',
    position: [0.05, 0.025, 1.6],
    rotationY: 0,
    maximumSize: [1.3, 0.06, 2.65],
    interactionSize: [1.44, 0.24, 2.8],
    tint: '#4c5652',
    anomalyStyle: 'accent',
  },
];

const SCALE_VARIANTS: readonly PreparedAnomalyVariant[] = [
  { id: 'smaller', kind: 'scale', scaleMultiplier: [0.72, 0.72, 0.72] },
  { id: 'larger', kind: 'scale', scaleMultiplier: [1.28, 1.28, 1.28] },
];

export const LAUNDRY_ROOM_EXIT_THRESHOLD = {
  z: NORTH_Z - 0.38,
  minimumX: EXIT_X - DOOR_WIDTH / 2,
  maximumX: EXIT_X + DOOR_WIDTH / 2,
  crossing: 'negative-z',
} as const;

export class GreyboxLaundryRoom extends RoomRuntime implements PlayableRoom {
  public readonly definition: RoomDefinition = {
    id: 'laundry-room',
    displayName: 'Laundry Room',
    observationDurationMs: 11_000,
    searchDurationMs: 25_000,
    anomalyCount: { min: 2, max: 3 },
    playerSpawn: { position: [ENTRANCE_X, 0, 2.8], yaw: 0, pitch: 0 },
  };

  private readonly anomalyTargetRegistry = new AnomalyTargetRegistry();
  private readonly assetLeases: GlbAssetLease[] = [];
  private materials: LaundryMaterials | null = null;
  private exitDoor: THREE.Object3D | null = null;
  private exitDoorCollider: THREE.Mesh | null = null;
  private exitPortal: THREE.Group | null = null;
  private exitPortalLight: THREE.PointLight | null = null;
  private assetManager: AssetManager | null = null;
  private assetLoadPromise: Promise<void> | null = null;
  private assetsLoaded = false;
  private buildRevision = 0;

  public constructor() {
    super('ROOM_LaundryRoom_VisualRoot', 'COLLIDER_LaundryRoom_Root');
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
    return LAUNDRY_ROOM_EXIT_THRESHOLD;
  }

  public async loadAssets(assetManager?: AssetManager): Promise<void> {
    await this.loadLaundryAssets(assetManager);
    const manager = this.assetManager;
    if (manager === null) {
      throw new Error('The laundry-room AssetManager is unavailable.');
    }
    await this.loadHouseShellAssets(manager, 'laundry-room');
  }

  public setExitDoorCollisionEnabled(
    enabled: boolean,
    rebuildCollision = true,
  ): void {
    const collider = this.exitDoorCollider;
    if (collider === null) {
      throw new Error('The laundry-room exit-door collider is unavailable.');
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
    if (this.exitPortal === null || this.exitPortalLight === null) {
      throw new Error('The laundry-room exit portal is unavailable.');
    }
    const safeProgress = Number.isFinite(progress)
      ? THREE.MathUtils.clamp(progress, 0, 1)
      : 0;
    this.exitPortal.visible = safeProgress > 0;
    this.requireMaterials().exitGlow.opacity = safeProgress * 0.82;
    this.exitPortalLight.intensity = safeProgress * 2.3;
  }

  protected buildRoom(): void {
    this.buildRevision += 1;
    this.materials = this.createMaterials();
    this.createArchitecture();
    this.createLighting();
    this.createCollisions();
    this.createDryingRackTarget();
    this.createLaundryBasketTarget();
    this.createIroningBoardTarget();
  }

  protected override onRoomReleased(): void {
    for (const lease of this.assetLeases.splice(0)) {
      lease.release();
    }
    this.anomalyTargetRegistry.clear();
    this.materials = null;
    this.exitDoor = null;
    this.exitDoorCollider = null;
    this.exitPortal = null;
    this.exitPortalLight = null;
    this.assetsLoaded = false;
  }

  private async loadLaundryAssets(assetManager?: AssetManager): Promise<void> {
    if (!this.isMounted()) {
      throw new Error('The laundry room must be mounted before loading assets.');
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
      throw new Error('The laundry-room AssetManager is unavailable.');
    }
    const promise = this.performAssetLoad(this.assetManager, this.buildRevision);
    this.assetLoadPromise = promise;
    try {
      await promise;
    } finally {
      if (this.assetLoadPromise === promise) {
        this.assetLoadPromise = null;
      }
    }
  }

  private async performAssetLoad(
    assetManager: AssetManager,
    revision: number,
  ): Promise<void> {
    const results = await Promise.allSettled(
      ASSET_PLACEMENTS.map((placement) =>
        assetManager.acquire(LAUNDRY_ROOM_ASSET_CATALOG[placement.key]),
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
      throw new Error(`Laundry-room assets could not be loaded: ${String(failure.reason)}`);
    }
    if (!this.isMounted() || revision !== this.buildRevision) {
      leases.forEach((lease) => lease.release());
      throw new Error('The laundry room changed while its assets were loading.');
    }
    try {
      const targets = ASSET_PLACEMENTS.map((placement, index) => {
        const lease = leases[index];
        if (lease === undefined) {
          throw new Error(`Missing laundry-room asset for "${placement.targetId}".`);
        }
        return this.createAssetTarget(placement, lease);
      });
      const validation = new AnomalyTargetRegistry();
      targets.forEach((target) => validation.register(target));
      this.getVisualRoot().add(...targets.map(({ object }) => object));
      targets.forEach((target) => this.anomalyTargetRegistry.register(target));
      this.assetLeases.push(...leases);
      this.assetsLoaded = true;
      this.refreshVisualObjectCount();
    } catch (error: unknown) {
      leases.forEach((lease) => lease.release());
      throw error;
    }
  }

  private createAssetTarget(
    placement: LaundryAssetPlacement,
    lease: GlbAssetLease,
  ): AnomalyTarget {
    const object = new THREE.Group();
    object.name = placement.objectName;
    object.position.fromArray(placement.position);
    object.userData['assetId'] = lease.assetId;
    const model = lease.root;
    model.name = `${placement.objectName}_GLB`;
    model.rotation.y = placement.rotationY;
    this.harmonizeMaterials(model, placement.tint, placement.targetId);
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const scale = Math.min(
      placement.maximumSize[0] / size.x,
      placement.maximumSize[1] / size.y,
      placement.maximumSize[2] / size.z,
    );
    if (!Number.isFinite(scale) || scale <= 0) {
      throw new Error(`Laundry-room asset "${lease.assetId}" has invalid bounds.`);
    }
    model.scale.setScalar(scale);
    model.updateMatrixWorld(true);
    const fitted = new THREE.Box3().setFromObject(model);
    const center = fitted.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -fitted.min.y, -center.z);
    object.add(model);
    if (placement.targetId === 'washing-machine') {
      this.addIterationTag(object, 'DETAIL_LaundryRoom_WasherTag');
    }
    return this.registerTarget(
      placement.targetId,
      object,
      placement.interactionSize,
      placement.anomalyStyle,
      placement.colliderName,
    );
  }

  private harmonizeMaterials(
    root: THREE.Object3D,
    tint: string,
    targetId: string,
  ): void {
    const styled = new Set<THREE.Material>();
    let surfaceIndex = 0;
    root.traverse((candidate) => {
      const mesh = candidate as THREE.Mesh;
      if (!mesh.isMesh) {
        return;
      }
      surfaceIndex += 1;
      mesh.name = `ANOM_LaundryRoom_${targetId}_Surface_${surfaceIndex}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        if (styled.has(material)) {
          continue;
        }
        const standard = material as THREE.MeshStandardMaterial;
        if (standard.isMeshStandardMaterial) {
          standard.color.multiply(new THREE.Color(tint));
          standard.roughness = Math.max(standard.roughness, 0.74);
          standard.metalness = Math.min(standard.metalness, 0.14);
          standard.envMapIntensity = 0.45;
          standard.needsUpdate = true;
        }
        styled.add(material);
      }
    });
    if (surfaceIndex === 0) {
      throw new Error(`Laundry-room asset "${targetId}" contains no mesh.`);
    }
  }

  private registerTarget(
    id: string,
    object: THREE.Group,
    interactionSize: Vector3Tuple,
    style: AnomalyStyle,
    colliderName?: string,
  ): AnomalyTarget {
    const interaction = new THREE.Mesh(
      this.ownGeometry(new THREE.BoxGeometry(...interactionSize)),
      this.requireMaterials().interaction,
    );
    interaction.name = `INTERACT_${id}`;
    interaction.position.y = interactionSize[1] / 2;
    interaction.layers.set(RENDER_LAYERS.interaction);
    interaction.renderOrder = 11;
    object.add(interaction);
    const collisionObjects = colliderName === undefined
      ? []
      : [this.requireCollisionObject(colliderName)];
    const variants: PreparedAnomalyVariant[] = [...SCALE_VARIANTS];
    if (style !== 'story') {
      variants.unshift(
        { id: 'hidden', kind: 'hide' },
        { id: 'appeared', kind: 'show' },
      );
    }
    return {
      id,
      nodeName: object.name,
      interactionNodeNames: [interaction.name],
      allowedKinds: [...new Set(variants.map(({ kind }) => kind))],
      variants,
      weight: style === 'story' ? 0.85 : 1,
      minimumDifficulty: 3,
      object,
      interactionVolume: interaction,
      interactionVolumes: [interaction],
      initialState: captureAnomalyTargetInitialState(object),
      collisionObjects,
      collisionInitialState: captureAnomalyCollisionObjectState(collisionObjects),
    };
  }

  private createDryingRackTarget(): void {
    const object = new THREE.Group();
    object.name = 'ANOM_LaundryRoom_DryingRack';
    object.position.set(0.25, 0, -0.85);
    const materials = this.requireMaterials();
    for (const x of [-0.85, 0.85]) {
      object.add(this.createBox(`DETAIL_DryingRack_Post_${x}`, [0.06, 1.65, 0.06], [x, 0.825, 0], materials.metal));
    }
    for (const y of [0.72, 1.2, 1.62]) {
      object.add(this.createBox(`DETAIL_DryingRack_Rail_${y}`, [1.76, 0.045, 0.045], [0, y, 0], materials.metal));
    }
    const garments: readonly [number, number, THREE.Material][] = [
      [-0.55, 0.98, materials.clothDark],
      [0, 0.98, materials.clothPale],
      [0.55, 0.98, materials.ash],
    ];
    garments.forEach(([x, y, material], index) => {
      object.add(this.createBox(`DETAIL_DryingRack_Garment_${index + 1}`, [0.42, 0.62, 0.035], [x, y, 0.02], material));
      const tag = this.createBox(`DETAIL_DryingRack_Tag_${index + 17}`, [0.11, 0.075, 0.012], [x + 0.14, y + 0.18, 0.045], materials.paper);
      object.add(tag);
    });
    const target = this.registerTarget(
      'drying-rack', object, [2.05, 1.85, 0.72], 'story',
      'COLLIDER_LaundryRoom_DryingRack',
    );
    this.getVisualRoot().add(object);
    this.anomalyTargetRegistry.register(target);
  }

  private createLaundryBasketTarget(): void {
    const object = new THREE.Group();
    object.name = 'ANOM_LaundryRoom_LaundryBasket';
    object.position.set(-1.45, 0, 1.45);
    object.add(
      this.createBox('ANOM_LaundryBasket_Base', [0.86, 0.08, 0.62], [0, 0.04, 0], this.requireMaterials().metal),
      this.createBox('ANOM_LaundryBasket_Clothes', [0.72, 0.38, 0.52], [0, 0.26, 0], this.requireMaterials().clothDark),
    );
    const target = this.registerTarget(
      'laundry-basket', object, [1, 0.72, 0.78], 'accent',
      'COLLIDER_LaundryRoom_LaundryBasket',
    );
    this.getVisualRoot().add(object);
    this.anomalyTargetRegistry.register(target);
  }

  private createIroningBoardTarget(): void {
    const object = new THREE.Group();
    object.name = 'ANOM_LaundryRoom_IroningBoard';
    object.position.set(-2.65, 0, 1.55);
    object.rotation.y = Math.PI / 2;
    object.add(
      this.createBox('ANOM_IroningBoard_Top', [1.55, 0.09, 0.48], [0, 0.86, 0], this.requireMaterials().clothPale),
      this.createBox('ANOM_IroningBoard_LegA', [0.07, 0.95, 0.07], [-0.38, 0.43, 0], this.requireMaterials().metal, -0.42),
      this.createBox('ANOM_IroningBoard_LegB', [0.07, 0.95, 0.07], [0.38, 0.43, 0], this.requireMaterials().metal, 0.42),
    );
    const target = this.registerTarget(
      'ironing-board', object, [1.75, 1.08, 0.7], 'furniture',
      'COLLIDER_LaundryRoom_IroningBoard',
    );
    this.getVisualRoot().add(object);
    this.anomalyTargetRegistry.register(target);
  }

  private addIterationTag(root: THREE.Object3D, name: string): void {
    root.add(this.createBox(name, [0.28, 0.16, 0.025], [0.2, 0.88, 0.49], this.requireMaterials().paper));
  }

  private createMaterials(): LaundryMaterials {
    const standard = (color: THREE.ColorRepresentation, roughness: number, metalness = 0) =>
      this.ownMaterial(new THREE.MeshStandardMaterial({ color, roughness, metalness }));
    const floor = standard('#ffffff', 0.92);
    floor.map = this.ownTexture(createStoneTileFloorTexture({
      name: 'TEXTURE_LaundryRoom_StainedTile',
      seed: 3_804,
      repeat: [3.4, 3],
      tileColors: ['#666861', '#72736a', '#5c605c', '#7b776d'],
      groutColor: '#353938',
    }));
    const wallTexture = this.ownTexture(createAgedPlasterTexture({
      name: 'TEXTURE_LaundryRoom_AgedPlaster',
      seed: 3_804,
    }));
    const wall = standard('#6e706a', 0.97);
    wall.map = wallTexture;
    const lowerWall = standard('#4e5754', 0.94);
    lowerWall.map = wallTexture;
    return {
      wall,
      lowerWall,
      floor,
      ceiling: standard('#b6b5ad', 0.98),
      trim: standard('#a49e8e', 0.88),
      door: standard('#483934', 0.86),
      metal: standard('#555d5b', 0.58, 0.18),
      clothDark: standard('#484a49', 0.98),
      clothPale: standard('#888378', 0.98),
      ash: standard('#302d2b', 1),
      paper: standard('#b59b70', 0.95),
      glass: standard('#587479', 0.28, 0.08),
      lamp: this.ownMaterial(new THREE.MeshBasicMaterial({ color: '#d9bb82' })),
      exitGlow: this.ownMaterial(new THREE.MeshBasicMaterial({
        color: '#739d91', transparent: true, opacity: 0, depthWrite: false,
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
    root.name = 'LaundryRoom_Architecture';
    root.add(
      this.createBox('ARCH_LaundryRoomFloor', [HALF_WIDTH * 2, 0.08, HALF_DEPTH * 2], [0, -0.04, 0], materials.floor),
      this.createBox('ARCH_LaundryRoomCeiling', [HALF_WIDTH * 2, 0.1, HALF_DEPTH * 2], [0, ROOM_HEIGHT + 0.05, 0], materials.ceiling),
    );
    this.createWalls(root);
    this.createDoors(root);
    this.createWindow(root);
    const fixture = new THREE.Group();
    fixture.name = 'LIGHT_LaundryRoom_Fixture';
    fixture.add(
      this.createBox('DETAIL_LaundryLamp_Base', [1.25, 0.07, 0.34], [0, ROOM_HEIGHT - 0.12, 0], materials.metal),
      this.createBox('DETAIL_LaundryLamp_Glow', [1.12, 0.025, 0.25], [0, ROOM_HEIGHT - 0.165, 0], materials.lamp),
    );
    root.add(fixture);
    this.getVisualRoot().add(root);
  }

  private createWalls(root: THREE.Group): void {
    const entranceLeft = ENTRANCE_X - DOOR_WIDTH / 2;
    const entranceRight = ENTRANCE_X + DOOR_WIDTH / 2;
    const exitLeft = EXIT_X - DOOR_WIDTH / 2;
    const exitRight = EXIT_X + DOOR_WIDTH / 2;
    const materials = this.requireMaterials();
    root.add(
      this.createWallSegment('WALL_LaundryRoom_SouthWest', [-HALF_WIDTH, SOUTH_Z], [entranceLeft, SOUTH_Z]),
      this.createWallSegment('WALL_LaundryRoom_SouthEast', [entranceRight, SOUTH_Z], [HALF_WIDTH, SOUTH_Z]),
      this.createWallSegment('WALL_LaundryRoom_NorthWest', [-HALF_WIDTH, NORTH_Z], [exitLeft, NORTH_Z]),
      this.createWallSegment('WALL_LaundryRoom_NorthEast', [exitRight, NORTH_Z], [HALF_WIDTH, NORTH_Z]),
      this.createWallSegment('WALL_LaundryRoom_West', [-HALF_WIDTH, NORTH_Z], [-HALF_WIDTH, SOUTH_Z]),
      this.createBox('WALL_LaundryRoom_EastSouth', [WALL_THICKNESS, ROOM_HEIGHT, 2.35], [HALF_WIDTH, ROOM_HEIGHT / 2, 2.325], materials.wall),
      this.createBox('WALL_LaundryRoom_EastNorth', [WALL_THICKNESS, ROOM_HEIGHT, 2.85], [HALF_WIDTH, ROOM_HEIGHT / 2, -2.075], materials.wall),
      this.createBox('WALL_LaundryRoom_EastWindowLower', [WALL_THICKNESS, 0.95, 1.8], [HALF_WIDTH, 0.475, 0.45], materials.lowerWall),
      this.createBox('WALL_LaundryRoom_EastWindowUpper', [WALL_THICKNESS, 0.65, 1.8], [HALF_WIDTH, ROOM_HEIGHT - 0.325, 0.45], materials.wall),
      this.createBox('WALL_LaundryRoom_EntranceLintel', [DOOR_WIDTH, ROOM_HEIGHT - DOOR_HEIGHT, WALL_THICKNESS], [ENTRANCE_X, DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT) / 2, SOUTH_Z], materials.wall),
      this.createBox('WALL_LaundryRoom_ExitLintel', [DOOR_WIDTH, ROOM_HEIGHT - DOOR_HEIGHT, WALL_THICKNESS], [EXIT_X, DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT) / 2, NORTH_Z], materials.wall),
    );
  }

  private createDoors(root: THREE.Group): void {
    const materials = this.requireMaterials();
    root.add(this.createBox('DOOR_LaundryRoom_Entrance', [DOOR_WIDTH - 0.08, DOOR_HEIGHT - 0.06, 0.09], [ENTRANCE_X, (DOOR_HEIGHT - 0.06) / 2, SOUTH_Z - 0.08], materials.door));
    const pivot = new THREE.Group();
    pivot.name = 'DOOR_LaundryRoomExit_Pivot';
    pivot.position.set(EXIT_X - DOOR_WIDTH / 2 + 0.04, 0, NORTH_Z + 0.08);
    pivot.add(
      this.createBox('DOOR_LaundryRoom_Exit', [DOOR_WIDTH - 0.08, DOOR_HEIGHT - 0.06, 0.09], [(DOOR_WIDTH - 0.08) / 2, (DOOR_HEIGHT - 0.06) / 2, 0], materials.door),
      this.createSphere('DOOR_LaundryRoom_ExitHandle', 0.055, [DOOR_WIDTH - 0.23, 1.02, 0.065], materials.metal),
    );
    root.add(pivot);
    this.exitDoor = pivot;
    const portal = new THREE.Group();
    portal.name = 'EXIT_LaundryRoom_Portal';
    portal.visible = false;
    const glow = new THREE.Mesh(
      this.ownGeometry(new THREE.PlaneGeometry(DOOR_WIDTH * 0.82, DOOR_HEIGHT * 0.9)),
      materials.exitGlow,
    );
    glow.position.set(EXIT_X, DOOR_HEIGHT * 0.46, NORTH_Z - 0.055);
    const light = new THREE.PointLight('#74a89a', 0, 2.6, 2);
    light.position.set(EXIT_X, 1.2, NORTH_Z - 0.2);
    portal.add(glow, light);
    root.add(portal);
    this.exitPortal = portal;
    this.exitPortalLight = light;
  }

  private createWindow(root: THREE.Group): void {
    const materials = this.requireMaterials();
    const window = this.createBox('WINDOW_LaundryRoom_East', [0.04, 1.45, 1.8], [HALF_WIDTH - 0.1, 1.68, 0.45], materials.glass);
    materials.glass.transparent = true;
    materials.glass.opacity = 0.38;
    root.add(window);
  }

  private createLighting(): void {
    const hemisphere = new THREE.HemisphereLight('#92a4a3', '#3b302c', 0.42);
    hemisphere.name = 'LIGHT_LaundryRoom_Ambient';
    const ambient = new THREE.AmbientLight('#c5beb1', 0.13);
    ambient.name = 'LIGHT_LaundryRoom_Bounce';
    const key = new THREE.SpotLight('#e2bd85', 5.6, 9, Math.PI / 3.2, 0.56, 1.2);
    key.name = 'LIGHT_LaundryRoom_Ceiling';
    key.position.set(0, 2.95, 0);
    key.target.position.set(0, 0.2, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    const windowFill = new THREE.PointLight('#6d9896', 0.55, 5.2, 1.7);
    windowFill.name = 'LIGHT_LaundryRoom_WindowFill';
    windowFill.position.set(3.45, 1.65, 0.45);
    const washer = new THREE.PointLight('#b99b74', 0.32, 3.8, 1.8);
    washer.name = 'LIGHT_LaundryRoom_WasherFill';
    washer.position.set(-2.7, 1.45, -2.1);
    this.getVisualRoot().add(hemisphere, ambient, key, key.target, windowFill, washer);
  }

  private createCollisions(): void {
    this.addCollisionBox('COLLIDER_LaundryRoomFloor', [8, 0.08, 7], [0, -0.04, 0]);
    this.addCollisionBox('COLLIDER_LaundryRoomCeiling', [8, 0.1, 7], [0, ROOM_HEIGHT + 0.05, 0]);
    const entranceLeft = ENTRANCE_X - DOOR_WIDTH / 2;
    const entranceRight = ENTRANCE_X + DOOR_WIDTH / 2;
    const exitLeft = EXIT_X - DOOR_WIDTH / 2;
    const exitRight = EXIT_X + DOOR_WIDTH / 2;
    this.addCollisionSegment('COLLIDER_LaundryWall_SouthWest', [-HALF_WIDTH, SOUTH_Z], [entranceLeft, SOUTH_Z]);
    this.addCollisionSegment('COLLIDER_LaundryWall_SouthEast', [entranceRight, SOUTH_Z], [HALF_WIDTH, SOUTH_Z]);
    this.addCollisionSegment('COLLIDER_LaundryWall_NorthWest', [-HALF_WIDTH, NORTH_Z], [exitLeft, NORTH_Z]);
    this.addCollisionSegment('COLLIDER_LaundryWall_NorthEast', [exitRight, NORTH_Z], [HALF_WIDTH, NORTH_Z]);
    this.addCollisionSegment('COLLIDER_LaundryWall_West', [-HALF_WIDTH, NORTH_Z], [-HALF_WIDTH, SOUTH_Z]);
    this.addCollisionSegment('COLLIDER_LaundryWall_East', [HALF_WIDTH, NORTH_Z], [HALF_WIDTH, SOUTH_Z]);
    this.addCollisionBox('COLLIDER_LaundryEntranceDoor', [DOOR_WIDTH, DOOR_HEIGHT, WALL_THICKNESS], [ENTRANCE_X, DOOR_HEIGHT / 2, SOUTH_Z]);
    this.exitDoorCollider = this.addCollisionBox('COLLIDER_LaundryExitDoor', [DOOR_WIDTH, DOOR_HEIGHT, WALL_THICKNESS], [EXIT_X, DOOR_HEIGHT / 2, NORTH_Z]);
    this.addCollisionBox('COLLIDER_LaundryRoom_DryingRack', [1.86, 1.65, 0.26], [0.25, 0.825, -0.85]);
    this.addCollisionBox('COLLIDER_LaundryRoom_LaundryBasket', [0.9, 0.55, 0.65], [-1.45, 0.275, 1.45]);
    this.addCollisionBox('COLLIDER_LaundryRoom_IroningBoard', [0.58, 0.95, 1.58], [-2.65, 0.475, 1.55]);
    for (const placement of ASSET_PLACEMENTS) {
      if (placement.colliderName !== undefined && placement.colliderSize !== undefined) {
        this.addCollisionBox(placement.colliderName, placement.colliderSize, [placement.position[0], placement.colliderSize[1] / 2, placement.position[2]]);
      }
    }
  }

  private createWallSegment(name: string, start: readonly [number, number], end: readonly [number, number]): THREE.Mesh {
    return this.createSegmentBox(name, start, end, this.requireMaterials().wall);
  }

  private addCollisionSegment(name: string, start: readonly [number, number], end: readonly [number, number]): void {
    this.getCollisionRoot().add(this.createSegmentBox(name, start, end, this.requireMaterials().collision));
  }

  private createSegmentBox(
    name: string,
    start: readonly [number, number],
    end: readonly [number, number],
    material: THREE.Material,
  ): THREE.Mesh {
    const dx = end[0] - start[0];
    const dz = end[1] - start[1];
    const mesh = new THREE.Mesh(
      this.ownGeometry(new THREE.BoxGeometry(Math.hypot(dx, dz), ROOM_HEIGHT, WALL_THICKNESS)),
      material,
    );
    mesh.name = name;
    mesh.position.set((start[0] + end[0]) / 2, ROOM_HEIGHT / 2, (start[1] + end[1]) / 2);
    mesh.rotation.y = -Math.atan2(dz, dx);
    mesh.receiveShadow = true;
    return mesh;
  }

  private addCollisionBox(name: string, size: Vector3Tuple, position: Vector3Tuple): THREE.Mesh {
    const mesh = this.createBox(name, size, position, this.requireMaterials().collision);
    this.getCollisionRoot().add(mesh);
    return mesh;
  }

  private requireCollisionObject(name: string): THREE.Object3D {
    const object = this.getCollisionRoot().getObjectByName(name);
    if (object === undefined) {
      throw new Error(`Laundry-room collider "${name}" is missing.`);
    }
    return object;
  }

  private createBox(
    name: string,
    size: Vector3Tuple,
    position: Vector3Tuple,
    material: THREE.Material,
    rotationZ = 0,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(this.ownGeometry(new THREE.BoxGeometry(...size)), material);
    mesh.name = name;
    mesh.position.fromArray(position);
    mesh.rotation.z = rotationZ;
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
    const mesh = new THREE.Mesh(this.ownGeometry(new THREE.SphereGeometry(radius, 14, 9)), material);
    mesh.name = name;
    mesh.position.fromArray(position);
    mesh.castShadow = true;
    return mesh;
  }

  private requireMaterials(): LaundryMaterials {
    if (this.materials === null) {
      throw new Error('Laundry-room materials are unavailable.');
    }
    return this.materials;
  }
}
