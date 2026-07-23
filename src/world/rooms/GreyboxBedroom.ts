import * as THREE from 'three';
import { BEDROOM_ASSET_CATALOG } from '../../content/rooms/BedroomAssetCatalog';
import { GAME_TIMING_CONFIG } from '../../core/time/GameTimingConfig';
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
  type GlbAssetDefinition,
  type GlbAssetLease,
} from '../assets/AssetManager';
import type { RoomDefinition } from '../RoomDefinition';
import { RoomRuntime } from '../RoomRuntime';
import { createAgedPlasterTexture } from '../textures/AgedPlasterTexture';
import type { PlayableRoom } from './PlayableRoom';

type Vector3Tuple = readonly [number, number, number];

type BedroomAnomalyTargetId =
  | 'television'
  | 'chair'
  | 'plant'
  | 'picture'
  | 'lamp'
  | 'books'
  | 'bed'
  | 'wardrobe'
  | 'nightstand'
  | 'tv-cabinet'
  | 'rug'
  | 'bookcase'
  | 'radio'
  | 'photo-frame';

interface BedroomMaterials {
  readonly wall: THREE.MeshStandardMaterial;
  readonly wallAccent: THREE.MeshStandardMaterial;
  readonly floor: THREE.MeshStandardMaterial;
  readonly ceiling: THREE.MeshStandardMaterial;
  readonly trim: THREE.MeshStandardMaterial;
  readonly baseboard: THREE.MeshStandardMaterial;
  readonly windowGlass: THREE.MeshStandardMaterial;
  readonly radiator: THREE.MeshStandardMaterial;
  readonly fixture: THREE.MeshStandardMaterial;
  readonly lightShade: THREE.MeshStandardMaterial;
  readonly brass: THREE.MeshStandardMaterial;
  readonly wood: THREE.MeshStandardMaterial;
  readonly darkWood: THREE.MeshStandardMaterial;
  readonly bed: THREE.MeshStandardMaterial;
  readonly bedding: THREE.MeshStandardMaterial;
  readonly chair: THREE.MeshStandardMaterial;
  readonly television: THREE.MeshStandardMaterial;
  readonly screen: THREE.MeshStandardMaterial;
  readonly lamp: THREE.MeshStandardMaterial;
  readonly plant: THREE.MeshStandardMaterial;
  readonly pot: THREE.MeshStandardMaterial;
  readonly picture: THREE.MeshStandardMaterial;
  readonly pictureFrame: THREE.MeshStandardMaterial;
  readonly rug: THREE.MeshStandardMaterial;
  readonly bookBlue: THREE.MeshStandardMaterial;
  readonly bookRed: THREE.MeshStandardMaterial;
  readonly bookGreen: THREE.MeshStandardMaterial;
  readonly entranceDoor: THREE.MeshStandardMaterial;
  readonly exitDoor: THREE.MeshStandardMaterial;
  readonly exitGlow: THREE.MeshBasicMaterial;
  readonly metal: THREE.MeshStandardMaterial;
  readonly collision: THREE.MeshBasicMaterial;
  readonly interaction: THREE.MeshBasicMaterial;
}

export type GreyboxObservationTarget = AnomalyTarget;

const ROOM_WIDTH = 6.5;
const ROOM_LENGTH = 7.5;
const ROOM_HEIGHT = 2.8;
const WALL_THICKNESS = 0.16;

const ENTRANCE_CENTER_X = -1.7;
const ENTRANCE_WIDTH = 1;
const EXIT_CENTER_Z = -1.75;
const EXIT_WIDTH = 1;
const DOOR_HEIGHT = 2.15;
const WINDOW_CENTER_Y = 1.65;
const WINDOW_CENTER_Z = 0.72;
const WINDOW_WIDTH = 1.62;
const WINDOW_HEIGHT = 1.18;

interface FittedAssetPlacement {
  readonly asset: GlbAssetDefinition;
  readonly objectName: string;
  readonly position: Vector3Tuple;
  readonly rotationY: number;
  readonly maximumSize: Vector3Tuple;
  readonly verticalAnchor: 'center' | 'ground';
  readonly castsShadow: boolean;
}

type FinalFurniturePlacement = FittedAssetPlacement;

interface FinalAnomalyPlacement extends FittedAssetPlacement {
  readonly targetId: string;
  readonly surfaceName: string;
  readonly colorMaterialNames: readonly string[];
  readonly interactionSize: Vector3Tuple;
  readonly interactionPosition: Vector3Tuple;
}

interface FinalDecorPlacement extends FittedAssetPlacement {
  readonly replacesPrimitive: boolean;
}

interface SupplementaryAnomalyPlacement {
  readonly targetId: BedroomAnomalyTargetId;
  readonly asset: GlbAssetDefinition;
  readonly objectName: string;
  readonly surfaceName: string;
  readonly colorMaterialNames: readonly string[];
  readonly interactionSize: Vector3Tuple;
  readonly interactionPosition: Vector3Tuple;
  readonly colors: readonly {
    readonly id: string;
    readonly color: string;
  }[];
}

interface ImportedMaterialStyle {
  readonly color: THREE.ColorRepresentation;
  readonly roughness: number;
  readonly metalness: number;
  readonly emissive?: THREE.ColorRepresentation;
  readonly emissiveIntensity?: number;
}

const FINAL_IMPORTED_MATERIAL_STYLES = {
  wood: { color: '#8b644b', roughness: 0.78, metalness: 0 },
  _defaultMat: { color: '#c8c0b3', roughness: 0.9, metalness: 0 },
  metal: { color: '#858784', roughness: 0.68, metalness: 0.18 },
  metalMedium: { color: '#596366', roughness: 0.72, metalness: 0.12 },
  metalDark: { color: '#242b2d', roughness: 0.64, metalness: 0.08 },
  carpet: { color: '#8f6259', roughness: 0.96, metalness: 0 },
  carpetDarker: { color: '#66504b', roughness: 0.98, metalness: 0 },
  carpetWhite: { color: '#d8d1c5', roughness: 0.97, metalness: 0 },
  carpetBlue: { color: '#536f80', roughness: 0.96, metalness: 0 },
  plant: { color: '#60765d', roughness: 0.92, metalness: 0 },
  lamp: {
    color: '#d4b978',
    roughness: 0.86,
    metalness: 0,
    emissive: '#6d4822',
    emissiveIntensity: 0.32,
  },
  furniture_texture: {
    color: '#e6ddd1',
    roughness: 0.82,
    metalness: 0,
  },
} as const satisfies Record<string, ImportedMaterialStyle>;

const BEDROOM_COLLIDER_NAMES: Partial<
  Record<BedroomAnomalyTargetId, string>
> = {
  bed: 'COLLIDER_Bed',
  wardrobe: 'COLLIDER_Wardrobe',
  'tv-cabinet': 'COLLIDER_TvStand',
};

const BEDROOM_DEPENDENT_TARGET_IDS: Partial<
  Record<BedroomAnomalyTargetId, readonly BedroomAnomalyTargetId[]>
> = {
  nightstand: ['lamp', 'books'],
  'tv-cabinet': ['television'],
  bookcase: ['radio', 'photo-frame'],
};

const FINAL_FURNITURE_PLACEMENTS: readonly FinalFurniturePlacement[] = [
  {
    asset: BEDROOM_ASSET_CATALOG.bedDouble,
    objectName: 'ANOM_Bed',
    position: [0.45, 0, -2.38],
    rotationY: 0,
    maximumSize: [1.9, 0.75, 2.15],
    verticalAnchor: 'ground',
    castsShadow: true,
  },
  {
    asset: BEDROOM_ASSET_CATALOG.wardrobe,
    objectName: 'ANOM_Wardrobe',
    position: [-2.78, 0, -1.55],
    rotationY: Math.PI / 2,
    maximumSize: [0.68, 2.18, 1.18],
    verticalAnchor: 'ground',
    castsShadow: true,
  },
  {
    asset: BEDROOM_ASSET_CATALOG.nightstand,
    objectName: 'ANOM_Nightstand',
    position: [-1.08, 0, -2.68],
    rotationY: 0,
    maximumSize: [0.58, 0.58, 0.55],
    verticalAnchor: 'ground',
    castsShadow: true,
  },
  {
    asset: BEDROOM_ASSET_CATALOG.tvCabinet,
    objectName: 'ANOM_TvStand',
    position: [2.76, 0, 0.15],
    rotationY: -Math.PI / 2,
    maximumSize: [0.54, 0.65, 1.72],
    verticalAnchor: 'ground',
    castsShadow: true,
  },
] as const;

const FINAL_ANOMALY_PLACEMENTS: readonly FinalAnomalyPlacement[] = [
  {
    targetId: 'television',
    asset: BEDROOM_ASSET_CATALOG.television,
    objectName: 'ANOM_Television',
    surfaceName: 'Television_FinalSurface',
    colorMaterialNames: ['metalDark'],
    position: [2.68, 0.65, 0.15],
    rotationY: -Math.PI / 2,
    maximumSize: [0.23, 0.78, 1.32],
    verticalAnchor: 'ground',
    castsShadow: true,
    interactionSize: [0.5, 1.15, 1.65],
    interactionPosition: [0, 0.52, 0],
  },
  {
    targetId: 'chair',
    asset: BEDROOM_ASSET_CATALOG.chairCushion,
    objectName: 'ANOM_Chair',
    surfaceName: 'Chair_FinalSurface',
    colorMaterialNames: ['carpet'],
    position: [0.9, 0, 1.45],
    rotationY: Math.PI / 2 - 0.32,
    maximumSize: [0.78, 1.25, 0.78],
    verticalAnchor: 'ground',
    castsShadow: true,
    interactionSize: [0.86, 1.42, 0.86],
    interactionPosition: [0, 0.7, 0],
  },
  {
    targetId: 'plant',
    asset: BEDROOM_ASSET_CATALOG.plantSmall,
    objectName: 'ANOM_Plant',
    surfaceName: 'Plant_FinalSurface',
    colorMaterialNames: ['plant'],
    position: [-2.58, 0, 1.3],
    rotationY: 0,
    maximumSize: [0.72, 1.22, 0.72],
    verticalAnchor: 'ground',
    castsShadow: true,
    interactionSize: [0.9, 1.38, 0.9],
    interactionPosition: [0, 0.66, 0],
  },
  {
    targetId: 'picture',
    asset: BEDROOM_ASSET_CATALOG.pictureFrame,
    objectName: 'ANOM_Picture',
    surfaceName: 'Picture_FinalSurface',
    colorMaterialNames: ['furniture_texture'],
    position: [0.45, 1.82, -ROOM_LENGTH / 2 + 0.11],
    rotationY: 0,
    maximumSize: [1.45, 0.9, 0.18],
    verticalAnchor: 'center',
    castsShadow: true,
    interactionSize: [1.58, 1, 0.24],
    interactionPosition: [0, 0, 0],
  },
  {
    targetId: 'lamp',
    asset: BEDROOM_ASSET_CATALOG.tableLamp,
    objectName: 'ANOM_Lamp',
    surfaceName: 'Lamp_FinalSurface',
    colorMaterialNames: ['lamp'],
    position: [-1.22, 0.56, -2.74],
    rotationY: 0,
    maximumSize: [0.48, 0.78, 0.48],
    verticalAnchor: 'ground',
    castsShadow: true,
    interactionSize: [0.66, 0.92, 0.66],
    interactionPosition: [0, 0.4, 0],
  },
  {
    targetId: 'books',
    asset: BEDROOM_ASSET_CATALOG.booksStack,
    objectName: 'ANOM_Books',
    surfaceName: 'Books_FinalSurface',
    colorMaterialNames: [
      'carpetDarker',
      'carpetWhite',
      'plant',
      'metal',
    ],
    position: [-0.96, 0.56, -2.62],
    rotationY: 0,
    maximumSize: [0.36, 0.25, 0.38],
    verticalAnchor: 'ground',
    castsShadow: true,
    interactionSize: [0.62, 0.42, 0.62],
    interactionPosition: [0, 0.14, 0],
  },
] as const;

const FINAL_DECOR_PLACEMENTS: readonly FinalDecorPlacement[] = [
  {
    asset: BEDROOM_ASSET_CATALOG.rugRectangle,
    objectName: 'ANOM_Rug',
    position: [0, 0.002, 0.45],
    rotationY: 0,
    maximumSize: [2.55, 0.04, 1.65],
    verticalAnchor: 'ground',
    castsShadow: false,
    replacesPrimitive: true,
  },
  {
    asset: BEDROOM_ASSET_CATALOG.bookcaseLow,
    objectName: 'ANOM_BookcaseLow',
    position: [1.55, 0, 3.38],
    rotationY: Math.PI,
    maximumSize: [1.05, 0.82, 0.55],
    verticalAnchor: 'ground',
    castsShadow: true,
    replacesPrimitive: false,
  },
  {
    asset: BEDROOM_ASSET_CATALOG.radio,
    objectName: 'ANOM_Radio',
    position: [1.74, 0.82, 3.23],
    rotationY: Math.PI,
    maximumSize: [0.44, 0.34, 0.2],
    verticalAnchor: 'ground',
    castsShadow: true,
    replacesPrimitive: false,
  },
  {
    asset: BEDROOM_ASSET_CATALOG.photoFrame,
    objectName: 'ANOM_PhotoFrame',
    position: [1.28, 0.82, 3.25],
    rotationY: Math.PI,
    maximumSize: [0.3, 0.38, 0.25],
    verticalAnchor: 'ground',
    castsShadow: true,
    replacesPrimitive: false,
  },
] as const;

const SUPPLEMENTARY_ANOMALY_PLACEMENTS: readonly SupplementaryAnomalyPlacement[] = [
  {
    targetId: 'bed',
    asset: BEDROOM_ASSET_CATALOG.bedDouble,
    objectName: 'ANOM_Bed',
    surfaceName: 'Bed_TargetSurface',
    colorMaterialNames: ['carpet'],
    interactionSize: [2.12, 0.9, 2.24],
    interactionPosition: [0, 0.42, 0],
    colors: [
      { id: 'blanket-blue', color: '#536c7b' },
      { id: 'blanket-beige', color: '#b5a38c' },
    ],
  },
  {
    targetId: 'wardrobe',
    asset: BEDROOM_ASSET_CATALOG.wardrobe,
    objectName: 'ANOM_Wardrobe',
    surfaceName: 'Wardrobe_TargetSurface',
    colorMaterialNames: ['wood'],
    interactionSize: [0.86, 2.3, 1.42],
    interactionPosition: [0, 1.1, 0],
    colors: [
      { id: 'wood-dark', color: '#5b4338' },
      { id: 'wood-pale', color: '#a38368' },
    ],
  },
  {
    targetId: 'nightstand',
    asset: BEDROOM_ASSET_CATALOG.nightstand,
    objectName: 'ANOM_Nightstand',
    surfaceName: 'Nightstand_TargetSurface',
    colorMaterialNames: ['wood'],
    interactionSize: [0.72, 0.72, 0.72],
    interactionPosition: [0, 0.3, 0],
    colors: [
      { id: 'painted-blue', color: '#5d7380' },
      { id: 'wood-dark', color: '#5b4338' },
    ],
  },
  {
    targetId: 'tv-cabinet',
    asset: BEDROOM_ASSET_CATALOG.tvCabinet,
    objectName: 'ANOM_TvStand',
    surfaceName: 'TvCabinet_TargetSurface',
    colorMaterialNames: ['wood'],
    interactionSize: [0.74, 0.86, 1.88],
    interactionPosition: [0, 0.36, 0],
    colors: [
      { id: 'painted-olive', color: '#6b7056' },
      { id: 'painted-red', color: '#8c4f46' },
    ],
  },
  {
    targetId: 'rug',
    asset: BEDROOM_ASSET_CATALOG.rugRectangle,
    objectName: 'ANOM_Rug',
    surfaceName: 'Rug_TargetSurface',
    colorMaterialNames: ['carpet', 'carpetDarker'],
    interactionSize: [2.7, 0.18, 1.7],
    interactionPosition: [0, 0.08, 0],
    colors: [
      { id: 'rug-blue', color: '#536c7b' },
      { id: 'rug-beige', color: '#9e8874' },
    ],
  },
  {
    targetId: 'bookcase',
    asset: BEDROOM_ASSET_CATALOG.bookcaseLow,
    objectName: 'ANOM_BookcaseLow',
    surfaceName: 'Bookcase_TargetSurface',
    colorMaterialNames: ['wood'],
    interactionSize: [1.08, 1, 0.72],
    interactionPosition: [0, 0.42, 0],
    colors: [
      { id: 'painted-blue', color: '#536c7b' },
      { id: 'painted-cream', color: '#b5a38c' },
    ],
  },
  {
    targetId: 'radio',
    asset: BEDROOM_ASSET_CATALOG.radio,
    objectName: 'ANOM_Radio',
    surfaceName: 'Radio_TargetSurface',
    colorMaterialNames: ['metalMedium'],
    interactionSize: [0.56, 0.5, 0.36],
    interactionPosition: [0, 0.18, 0],
    colors: [
      { id: 'case-red', color: '#8c4f46' },
      { id: 'case-blue', color: '#536c7b' },
    ],
  },
  {
    targetId: 'photo-frame',
    asset: BEDROOM_ASSET_CATALOG.photoFrame,
    objectName: 'ANOM_PhotoFrame',
    surfaceName: 'PhotoFrame_TargetSurface',
    colorMaterialNames: ['furniture_texture'],
    interactionSize: [0.42, 0.56, 0.36],
    interactionPosition: [0, 0.2, 0],
    colors: [
      { id: 'photo-blue', color: '#536c7b' },
      { id: 'photo-purple', color: '#765b95' },
    ],
  },
] as const;

function createAutomaticAnomalyVariants(
  targetId: BedroomAnomalyTargetId,
): readonly PreparedAnomalyVariant[] {
  if (targetId === 'bookcase') {
    return [];
  }

  return [
    { id: 'hidden', kind: 'hide' },
    { id: 'appeared', kind: 'show' },
  ];
}

export const GREYBOX_EXIT_THRESHOLD = {
  x: ROOM_WIDTH / 2 + 0.4,
  minimumZ: EXIT_CENTER_Z - EXIT_WIDTH / 2,
  maximumZ: EXIT_CENTER_Z + EXIT_WIDTH / 2,
} as const;

export class GreyboxBedroom extends RoomRuntime implements PlayableRoom {
  public readonly definition: RoomDefinition = {
    id: 'greybox-bedroom',
    displayName: 'Greybox Bedroom',
    observationDurationMs: GAME_TIMING_CONFIG.observationDurationMs,
    searchDurationMs: GAME_TIMING_CONFIG.searchDurationMs,
    anomalyCount: { min: 1, max: 1 },
    playerSpawn: {
      position: [-1.7, 0, 2.85],
      yaw: 0,
      pitch: 0,
    },
  };

  private readonly anomalyTargetRegistry = new AnomalyTargetRegistry();
  private materials: BedroomMaterials | null = null;
  private exitDoor: THREE.Object3D | null = null;
  private exitDoorCollider: THREE.Mesh | null = null;
  private exitPortal: THREE.Group | null = null;
  private exitPortalLight: THREE.PointLight | null = null;
  private finalAssetManager: AssetManager | null = null;
  private finalFurnitureLoadPromise: Promise<void> | null = null;
  private readonly finalFurnitureLeases: GlbAssetLease[] = [];
  private finalFurnitureLoaded = false;
  private finalAnomalyTargetLoadPromise: Promise<void> | null = null;
  private readonly finalAnomalyTargetLeases: GlbAssetLease[] = [];
  private finalAnomalyTargetsLoaded = false;
  private finalDecorLoadPromise: Promise<void> | null = null;
  private readonly finalDecorLeases: GlbAssetLease[] = [];
  private finalDecorLoaded = false;
  private buildRevision = 0;

  public constructor() {
    super(
      'ROOM_GreyboxBedroom_VisualRoot',
      'COLLIDER_GreyboxBedroom_Root',
    );
  }

  public getAnomalyTargets(): readonly AnomalyTarget[] {
    return this.anomalyTargetRegistry.getAll();
  }

  public getAnomalyTargetRegistry(): AnomalyTargetRegistry {
    return this.anomalyTargetRegistry;
  }

  public getObservationTargets(): readonly GreyboxObservationTarget[] {
    return this.getAnomalyTargets();
  }

  public async loadFinalFurniture(
    assetManager?: AssetManager,
  ): Promise<void> {
    if (!this.isMounted()) {
      throw new Error(
        'The bedroom must be mounted before loading final furniture.',
      );
    }

    if (this.finalFurnitureLoaded) {
      return;
    }

    if (this.finalFurnitureLoadPromise !== null) {
      await this.finalFurnitureLoadPromise;
      return;
    }

    if (assetManager !== undefined) {
      this.finalAssetManager = assetManager;
    }

    const manager = this.finalAssetManager;

    if (manager === null) {
      throw new Error(
        'The bedroom final-furniture AssetManager is unavailable.',
      );
    }

    const revision = this.buildRevision;
    const loadPromise = this.performFinalFurnitureLoad(manager, revision);
    this.finalFurnitureLoadPromise = loadPromise;

    try {
      await loadPromise;
    } finally {
      if (this.finalFurnitureLoadPromise === loadPromise) {
        this.finalFurnitureLoadPromise = null;
      }
    }
  }

  public isFinalFurnitureLoaded(): boolean {
    return this.finalFurnitureLoaded;
  }

  public getFinalFurnitureAssetIds(): readonly string[] {
    return this.finalFurnitureLeases.map((lease) => lease.assetId);
  }

  public async loadFinalAnomalyTargets(
    assetManager?: AssetManager,
  ): Promise<void> {
    if (!this.isMounted()) {
      throw new Error(
        'The bedroom must be mounted before loading final anomaly targets.',
      );
    }

    if (this.finalAnomalyTargetsLoaded) {
      return;
    }

    if (this.finalAnomalyTargetLoadPromise !== null) {
      await this.finalAnomalyTargetLoadPromise;
      return;
    }

    if (assetManager !== undefined) {
      this.finalAssetManager = assetManager;
    }

    const manager = this.finalAssetManager;

    if (manager === null) {
      throw new Error(
        'The bedroom final-asset AssetManager is unavailable.',
      );
    }

    const revision = this.buildRevision;
    const loadPromise = this.performFinalAnomalyTargetLoad(
      manager,
      revision,
    );
    this.finalAnomalyTargetLoadPromise = loadPromise;

    try {
      await loadPromise;
    } finally {
      if (this.finalAnomalyTargetLoadPromise === loadPromise) {
        this.finalAnomalyTargetLoadPromise = null;
      }
    }
  }

  public isFinalAnomalyTargetsLoaded(): boolean {
    return this.finalAnomalyTargetsLoaded;
  }

  public getFinalAnomalyTargetAssetIds(): readonly string[] {
    return this.finalAnomalyTargetLeases.map((lease) => lease.assetId);
  }

  public async loadFinalDecor(
    assetManager?: AssetManager,
  ): Promise<void> {
    if (!this.isMounted()) {
      throw new Error(
        'The bedroom must be mounted before loading final decor.',
      );
    }

    if (this.finalDecorLoaded) {
      return;
    }

    const pendingDecorLoad = this.getPendingFinalDecorLoad();

    if (pendingDecorLoad !== null) {
      await pendingDecorLoad;
      return;
    }

    if (assetManager !== undefined) {
      this.finalAssetManager = assetManager;
    }

    const manager = this.finalAssetManager;

    if (manager === null) {
      throw new Error(
        'The bedroom final-asset AssetManager is unavailable.',
      );
    }

    await this.loadFinalFurniture(manager);
    await this.loadFinalAnomalyTargets(manager);

    if (this.finalDecorLoaded) {
      return;
    }

    if (this.finalDecorLoadPromise !== null) {
      await this.finalDecorLoadPromise;
      return;
    }

    const revision = this.buildRevision;
    const loadPromise = this.performFinalDecorLoad(manager, revision);
    this.finalDecorLoadPromise = loadPromise;

    try {
      await loadPromise;
    } finally {
      if (this.finalDecorLoadPromise === loadPromise) {
        this.finalDecorLoadPromise = null;
      }
    }
  }

  public isFinalDecorLoaded(): boolean {
    return this.finalDecorLoaded;
  }

  public getFinalDecorAssetIds(): readonly string[] {
    return this.finalDecorLeases.map((lease) => lease.assetId);
  }

  private getPendingFinalDecorLoad(): Promise<void> | null {
    return this.finalDecorLoadPromise;
  }

  public getExitDoor(): THREE.Object3D | null {
    return this.exitDoor;
  }

  public getExitThresholdDefinition() {
    return GREYBOX_EXIT_THRESHOLD;
  }

  public async loadAssets(assetManager?: AssetManager): Promise<void> {
    await this.loadFinalDecor(assetManager);
    const manager = this.finalAssetManager;

    if (manager === null) {
      throw new Error('The bedroom AssetManager is unavailable.');
    }

    await this.loadHouseShellAssets(manager, 'bedroom');
  }

  public setExitDoorCollisionEnabled(
    enabled: boolean,
    rebuildCollision = true,
  ): void {
    const collider = this.exitDoorCollider;

    if (collider === null) {
      throw new Error('The greybox exit-door collider is unavailable.');
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

  public isExitDoorCollisionEnabled(): boolean {
    return this.exitDoorCollider?.parent === this.getCollisionRoot();
  }

  public setExitPortalProgress(progress: number): void {
    const portal = this.exitPortal;
    const light = this.exitPortalLight;
    const materials = this.materials;

    if (portal === null || light === null || materials === null) {
      throw new Error('The greybox exit portal is unavailable.');
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

    const bed = this.createBed();
    const nightstand = this.createNightstand();
    const wardrobe = this.createWardrobe();
    const chair = this.createChair();
    const tvStand = this.createTvStand();
    const television = this.createTelevision();
    const lamp = this.createLamp();
    const plant = this.createPlant();
    const picture = this.createPicture();
    const books = this.createBooks();
    const rug = this.createRug();

    this.getVisualRoot().add(
      bed,
      nightstand,
      wardrobe,
      chair,
      tvStand,
      television,
      lamp,
      plant,
      picture,
      books,
      rug,
    );

    this.registerAnomalyTarget(
      'television',
      television,
      [0.5, 1.15, 1.65],
      [0, 0.52, 0],
      [
        ...createAutomaticAnomalyVariants('television'),
        {
          id: 'screen-purple',
          kind: 'color',
          nodeNames: ['Television_Screen'],
          color: '#704f80',
        },
        {
          id: 'screen-amber',
          kind: 'color',
          nodeNames: ['Television_Screen'],
          color: '#80613c',
        },
      ],
    );
    this.registerAnomalyTarget(
      'chair',
      chair,
      [0.86, 1.42, 0.86],
      [0, 0.7, 0],
      [
        ...createAutomaticAnomalyVariants('chair'),
        {
          id: 'upholstery-blue',
          kind: 'color',
          nodeNames: ['Chair_Seat', 'Chair_Back'],
          color: '#466f88',
        },
        {
          id: 'upholstery-ochre',
          kind: 'color',
          nodeNames: ['Chair_Seat', 'Chair_Back'],
          color: '#9b713d',
        },
      ],
    );
    this.registerAnomalyTarget(
      'plant',
      plant,
      [0.9, 1.38, 0.9],
      [0, 0.66, 0],
      [
        ...createAutomaticAnomalyVariants('plant'),
        {
          id: 'foliage-purple',
          kind: 'color',
          nodeNames: [
            'Plant_Stem',
            'Plant_LeavesLower',
            'Plant_LeavesUpper',
          ],
          color: '#76517f',
        },
        {
          id: 'foliage-amber',
          kind: 'color',
          nodeNames: [
            'Plant_Stem',
            'Plant_LeavesLower',
            'Plant_LeavesUpper',
          ],
          color: '#a57a3f',
        },
      ],
    );
    this.registerAnomalyTarget(
      'picture',
      picture,
      [1.58, 1, 0.24],
      [0, 0, 0],
      [
        ...createAutomaticAnomalyVariants('picture'),
        {
          id: 'image-blue',
          kind: 'color',
          nodeNames: ['Picture_Image'],
          color: '#3f7180',
        },
        {
          id: 'image-orange',
          kind: 'color',
          nodeNames: ['Picture_Image'],
          color: '#a56642',
        },
      ],
    );
    this.registerAnomalyTarget(
      'lamp',
      lamp,
      [0.66, 0.92, 0.66],
      [0, 0.4, 0],
      [
        ...createAutomaticAnomalyVariants('lamp'),
        {
          id: 'shade-purple',
          kind: 'color',
          nodeNames: ['Lamp_Shade'],
          color: '#7651a3',
        },
        {
          id: 'shade-blue',
          kind: 'color',
          nodeNames: ['Lamp_Shade'],
          color: '#47828d',
        },
      ],
    );
    this.registerAnomalyTarget(
      'books',
      books,
      [0.62, 0.42, 0.62],
      [0, 0.14, 0],
      [
        ...createAutomaticAnomalyVariants('books'),
        {
          id: 'covers-yellow',
          kind: 'color',
          nodeNames: ['Book_Bottom', 'Book_Middle', 'Book_Top'],
          color: '#e8c35a',
        },
        {
          id: 'covers-purple',
          kind: 'color',
          nodeNames: ['Book_Bottom', 'Book_Middle', 'Book_Top'],
          color: '#765b95',
        },
      ],
    );

    this.createFurnitureCollisions();
  }

  protected override takeDeferredRoomReleaseTasks(): readonly (() => void)[] {
    const leases = [
      ...this.finalFurnitureLeases,
      ...this.finalAnomalyTargetLeases,
      ...this.finalDecorLeases,
    ];
    this.finalFurnitureLeases.length = 0;
    this.finalAnomalyTargetLeases.length = 0;
    this.finalDecorLeases.length = 0;
    return leases.map((lease) => () => lease.release());
  }

  protected override onRoomReleased(): void {
    this.finalFurnitureLoaded = false;
    this.finalAnomalyTargetsLoaded = false;
    this.finalDecorLoaded = false;
    this.anomalyTargetRegistry.clear();
    this.materials = null;
    this.exitDoor = null;
    this.exitDoorCollider = null;
    this.exitPortal = null;
    this.exitPortalLight = null;
  }

  private async performFinalFurnitureLoad(
    assetManager: AssetManager,
    revision: number,
  ): Promise<void> {
    const results = await Promise.allSettled(
      FINAL_FURNITURE_PLACEMENTS.map((placement) =>
        assetManager.acquire(placement.asset),
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
        `Final bedroom furniture could not be loaded: ${this.getErrorMessage(failure.reason)}`,
        { cause: failure.reason },
      );
    }

    if (!this.isMounted() || this.buildRevision !== revision) {
      for (const lease of leases) {
        lease.release();
      }

      throw new Error(
        'The bedroom changed while final furniture was loading.',
      );
    }

    try {
      const leasesByAssetId = new Map(
        leases.map((lease) => [lease.assetId, lease]),
      );
      const replacements = FINAL_FURNITURE_PLACEMENTS.map((placement) => {
        const lease = leasesByAssetId.get(placement.asset.id);

        if (lease === undefined) {
          throw new Error(
            `Loaded furniture lease "${placement.asset.id}" is missing.`,
          );
        }

        return {
          oldObject: this.requireVisualObject(placement.objectName),
          newObject: this.createFinalFurnitureObject(placement, lease),
        };
      });

      for (const replacement of replacements) {
        replacement.oldObject.removeFromParent();
        this.disposePrimitiveObjectGeometries(replacement.oldObject);
      }

      this.getVisualRoot().add(
        ...replacements.map((replacement) => replacement.newObject),
      );
      this.finalFurnitureLeases.push(...leases);
      this.finalFurnitureLoaded = true;
      this.refreshVisualObjectCount();
    } catch (error: unknown) {
      for (const lease of leases) {
        lease.release();
      }

      throw error;
    }
  }

  private async performFinalAnomalyTargetLoad(
    assetManager: AssetManager,
    revision: number,
  ): Promise<void> {
    const results = await Promise.allSettled(
      FINAL_ANOMALY_PLACEMENTS.map((placement) =>
        assetManager.acquire(placement.asset),
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
        `Final bedroom anomaly targets could not be loaded: ${this.getErrorMessage(failure.reason)}`,
        { cause: failure.reason },
      );
    }

    if (!this.isMounted() || this.buildRevision !== revision) {
      for (const lease of leases) {
        lease.release();
      }

      throw new Error(
        'The bedroom changed while final anomaly targets were loading.',
      );
    }

    const preparedTargets: AnomalyTarget[] = [];

    try {
      const leasesByAssetId = new Map(
        leases.map((lease) => [lease.assetId, lease]),
      );
      const validationRegistry = new AnomalyTargetRegistry();
      const replacements = FINAL_ANOMALY_PLACEMENTS.map((placement) => {
        const lease = leasesByAssetId.get(placement.asset.id);
        const oldTarget = this.anomalyTargetRegistry.getById(
          placement.targetId,
        );

        if (lease === undefined) {
          throw new Error(
            `Loaded anomaly-target lease "${placement.asset.id}" is missing.`,
          );
        }

        if (oldTarget === null) {
          throw new Error(
            `Anomaly target "${placement.targetId}" is unavailable.`,
          );
        }

        const newObject = this.createFittedAssetObject(placement, lease);
        const surfaceNames = this.prepareFinalAnomalySurfaces(
          newObject,
          placement,
        );
        const target = this.createAnomalyTarget(
          placement.targetId,
          newObject,
          placement.interactionSize,
          placement.interactionPosition,
          this.createFinalAnomalyVariants(
            oldTarget,
            placement,
            surfaceNames,
          ),
        );
        validationRegistry.register(target);
        preparedTargets.push(target);
        return { oldTarget, newObject, target };
      });

      for (const replacement of replacements) {
        replacement.oldTarget.object.removeFromParent();
        this.disposePrimitiveObjectGeometries(
          replacement.oldTarget.object,
        );
      }

      this.anomalyTargetRegistry.clear();
      this.getVisualRoot().add(
        ...replacements.map((replacement) => replacement.newObject),
      );

      for (const replacement of replacements) {
        this.anomalyTargetRegistry.register(replacement.target);
      }

      this.finalAnomalyTargetLeases.push(...leases);
      this.finalAnomalyTargetsLoaded = true;
      this.refreshVisualObjectCount();
    } catch (error: unknown) {
      for (const target of preparedTargets) {
        for (const interactionVolume of target.interactionVolumes) {
          this.disposeOwnedGeometry(interactionVolume.geometry);
        }
      }

      for (const lease of leases) {
        lease.release();
      }

      throw error;
    }
  }

  private async performFinalDecorLoad(
    assetManager: AssetManager,
    revision: number,
  ): Promise<void> {
    const results = await Promise.allSettled(
      FINAL_DECOR_PLACEMENTS.map((placement) =>
        assetManager.acquire(placement.asset),
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
        `Final bedroom decor could not be loaded: ${this.getErrorMessage(failure.reason)}`,
        { cause: failure.reason },
      );
    }

    if (!this.isMounted() || this.buildRevision !== revision) {
      for (const lease of leases) {
        lease.release();
      }

      throw new Error('The bedroom changed while final decor was loading.');
    }

    const preparedTargets: AnomalyTarget[] = [];

    try {
      const replacements = FINAL_DECOR_PLACEMENTS.map(
        (placement, index) => {
          const lease = leases[index];

          if (lease === undefined) {
            throw new Error(
              `Loaded decor lease "${placement.asset.id}" is missing.`,
            );
          }

          return {
            oldObject: placement.replacesPrimitive
              ? this.requireVisualObject(placement.objectName)
              : null,
            newObject: this.createFittedAssetObject(placement, lease),
          };
        },
      );
      const stagedObjects = new Map(
        replacements.map((replacement) => [
          replacement.newObject.name,
          replacement.newObject,
        ]),
      );
      const validationRegistry = new AnomalyTargetRegistry();
      const supplementaryTargets = SUPPLEMENTARY_ANOMALY_PLACEMENTS.map(
        (placement) => {
          if (
            this.anomalyTargetRegistry.getById(placement.targetId) !== null
          ) {
            throw new Error(
              `Supplementary anomaly target "${placement.targetId}" is already registered.`,
            );
          }

          const object =
            stagedObjects.get(placement.objectName) ??
            this.requireVisualObject(placement.objectName);
          const surfaceNames = this.prepareFinalAnomalySurfaces(
            object,
            placement,
          );
          const target = this.createAnomalyTarget(
            placement.targetId,
            object,
            placement.interactionSize,
            placement.interactionPosition,
            [
              ...createAutomaticAnomalyVariants(
                placement.targetId,
              ),
              ...placement.colors.map((color) => ({
                id: color.id,
                kind: 'color' as const,
                nodeNames: surfaceNames,
                materialNames: placement.colorMaterialNames,
                color: color.color,
              })),
            ],
            this.getAnomalyCollisionObjects(placement.targetId),
          );
          validationRegistry.register(target);
          preparedTargets.push(target);
          return target;
        },
      );

      for (const replacement of replacements) {
        if (replacement.oldObject === null) {
          continue;
        }

        replacement.oldObject.removeFromParent();
        this.disposePrimitiveObjectGeometries(replacement.oldObject);
      }

      this.getVisualRoot().add(
        ...replacements.map((replacement) => replacement.newObject),
      );

      for (const target of supplementaryTargets) {
        this.anomalyTargetRegistry.register(target);
      }

      this.finalDecorLeases.push(...leases);
      this.finalDecorLoaded = true;
      this.refreshVisualObjectCount();
    } catch (error: unknown) {
      for (const target of preparedTargets) {
        for (const interactionVolume of target.interactionVolumes) {
          interactionVolume.removeFromParent();
          this.disposeOwnedGeometry(interactionVolume.geometry);
        }
      }

      for (const lease of leases) {
        lease.release();
      }

      throw error;
    }
  }

  private createFinalFurnitureObject(
    placement: FinalFurniturePlacement,
    lease: GlbAssetLease,
  ): THREE.Group {
    return this.createFittedAssetObject(placement, lease);
  }

  private createFittedAssetObject(
    placement: FittedAssetPlacement,
    lease: GlbAssetLease,
  ): THREE.Group {
    const wrapper = new THREE.Group();
    wrapper.name = placement.objectName;
    wrapper.position.fromArray(placement.position);
    wrapper.userData['assetId'] = placement.asset.id;
    const model = lease.root;
    this.harmonizeFinalAssetMaterials(model);
    model.name = `${placement.objectName}_GLB`;
    model.position.set(0, 0, 0);
    model.rotation.set(0, placement.rotationY, 0);
    model.scale.set(1, 1, 1);
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
        `Furniture asset "${placement.asset.id}" has invalid bounds.`,
      );
    }

    model.scale.setScalar(scale);
    model.updateMatrixWorld(true);
    const scaledBounds = new THREE.Box3().setFromObject(model);
    const center = scaledBounds.getCenter(new THREE.Vector3());
    const verticalOffset =
      placement.verticalAnchor === 'ground'
        ? -scaledBounds.min.y
        : -center.y;
    model.position.set(-center.x, verticalOffset, -center.z);
    model.traverse((object) => {
      const mesh = object as THREE.Mesh;

      if (mesh.isMesh) {
        mesh.castShadow = placement.castsShadow;
        mesh.receiveShadow = true;
      }
    });
    wrapper.add(model);
    return wrapper;
  }

  private harmonizeFinalAssetMaterials(root: THREE.Object3D): void {
    const styledMaterials = new Set<THREE.Material>();

    root.traverse((object) => {
      const mesh = object as THREE.Mesh;

      if (!mesh.isMesh) {
        return;
      }

      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];

      for (const material of materials) {
        if (styledMaterials.has(material)) {
          continue;
        }

        const style: ImportedMaterialStyle | undefined =
          FINAL_IMPORTED_MATERIAL_STYLES[
          material.name as keyof typeof FINAL_IMPORTED_MATERIAL_STYLES
        ];

        if (style === undefined) {
          continue;
        }

        const styledMaterial = material as THREE.Material & {
          color?: THREE.Color;
          roughness?: number;
          metalness?: number;
          emissive?: THREE.Color;
          emissiveIntensity?: number;
        };

        if (styledMaterial.color?.isColor === true) {
          styledMaterial.color.set(style.color);
        }

        if (typeof styledMaterial.roughness === 'number') {
          styledMaterial.roughness = style.roughness;
        }

        if (typeof styledMaterial.metalness === 'number') {
          styledMaterial.metalness = style.metalness;
        }

        if (
          style.emissive !== undefined &&
          styledMaterial.emissive?.isColor === true
        ) {
          styledMaterial.emissive.set(style.emissive);
          styledMaterial.emissiveIntensity =
            style.emissiveIntensity ?? 1;
        }

        styledMaterial.needsUpdate = true;
        styledMaterials.add(material);
      }
    });
  }

  private prepareFinalAnomalySurfaces(
    object: THREE.Object3D,
    placement: FinalAnomalyPlacement | SupplementaryAnomalyPlacement,
  ): readonly string[] {
    const meshes: THREE.Mesh[] = [];
    object.traverse((candidate) => {
      const mesh = candidate as THREE.Mesh;

      if (mesh.isMesh) {
        meshes.push(mesh);
      }
    });

    if (meshes.length === 0) {
      throw new Error(
        `Final anomaly asset "${placement.asset.id}" has no mesh.`,
      );
    }

    const surfaceNames = meshes.map((mesh, index) => {
      const name =
        meshes.length === 1
          ? placement.surfaceName
          : `${placement.surfaceName}_${index + 1}`;
      mesh.name = name;
      return name;
    });
    const materialNames = new Set(
      meshes.flatMap((mesh) =>
        (Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]
        ).map((material) => material.name),
      ),
    );
    const missingMaterial = placement.colorMaterialNames.find(
      (materialName) => !materialNames.has(materialName),
    );

    if (missingMaterial !== undefined) {
      throw new Error(
        `Final anomaly asset "${placement.asset.id}" is missing material "${missingMaterial}".`,
      );
    }

    return surfaceNames;
  }

  private createFinalAnomalyVariants(
    oldTarget: AnomalyTarget,
    placement: FinalAnomalyPlacement,
    surfaceNames: readonly string[],
  ): readonly PreparedAnomalyVariant[] {
    return oldTarget.variants.map((variant) =>
      variant.kind === 'color'
        ? {
            ...variant,
            nodeNames: surfaceNames,
            materialNames: placement.colorMaterialNames,
          }
        : variant,
    );
  }

  private requireVisualObject(name: string): THREE.Object3D {
    const matches: THREE.Object3D[] = [];
    this.getVisualRoot().traverse((object) => {
      if (object.name === name) {
        matches.push(object);
      }
    });

    if (matches.length !== 1) {
      throw new Error(
        `Expected exactly one visual object named "${name}", found ${matches.length}.`,
      );
    }

    return matches[0] as THREE.Object3D;
  }

  private disposePrimitiveObjectGeometries(root: THREE.Object3D): void {
    root.traverse((object) => {
      const mesh = object as THREE.Mesh;

      if (mesh.isMesh) {
        this.disposeOwnedGeometry(mesh.geometry);
      }
    });
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private createMaterials(): BedroomMaterials {
    const standard = (
      color: THREE.ColorRepresentation,
      roughness = 0.86,
      metalness = 0,
    ): THREE.MeshStandardMaterial =>
      this.ownMaterial(
        new THREE.MeshStandardMaterial({ color, roughness, metalness }),
      );

    const floorTexture = this.createWoodFloorTexture();
    const floorMaterial = standard(0xffffff, 0.88);
    floorMaterial.map = floorTexture;
    const wallMaterial = standard(0xd8d0c3, 0.94);
    wallMaterial.map = this.ownTexture(
      createAgedPlasterTexture({
        name: 'TEXTURE_Bedroom_AgedPlaster',
        seed: 3_017,
      }),
    );

    return {
      wall: wallMaterial,
      wallAccent: standard(0xc8bdae, 0.96),
      floor: floorMaterial,
      ceiling: standard(0xf1ede5, 0.94),
      trim: standard(0x765442, 0.82),
      baseboard: standard(0xeee8de, 0.9),
      windowGlass: this.ownMaterial(
        new THREE.MeshStandardMaterial({
          color: 0x78909b,
          roughness: 0.38,
          metalness: 0,
          transparent: true,
          opacity: 0.72,
        }),
      ),
      radiator: standard(0xd7d2c9, 0.78, 0.08),
      fixture: standard(0xe2d5be, 0.74),
      lightShade: this.ownMaterial(
        new THREE.MeshStandardMaterial({
          color: 0xffe4b8,
          emissive: 0xffb85c,
          emissiveIntensity: 0.6,
          roughness: 0.64,
        }),
      ),
      brass: standard(0xb28a4f, 0.46, 0.45),
      wood: standard(0xa97852),
      darkWood: standard(0x4d382f),
      bed: standard(0x536c7b),
      bedding: standard(0x879aa4, 0.95),
      chair: standard(0x8c4f46, 0.92),
      television: standard(0x1d1d1d, 0.72),
      screen: standard(0x263740, 0.48),
      lamp: standard(0xe8c35a, 0.82),
      plant: standard(0x5f7658, 0.92),
      pot: standard(0x8d6650, 0.92),
      picture: standard(0x65577f, 0.9),
      pictureFrame: standard(0x4d382f, 0.86),
      rug: standard(0x9e8874, 1),
      bookBlue: standard(0x536c7b),
      bookRed: standard(0x8c4f46),
      bookGreen: standard(0x5f7658),
      entranceDoor: standard(0x725243),
      exitDoor: standard(0x896343, 0.82),
      exitGlow: this.ownMaterial(
        new THREE.MeshBasicMaterial({
          color: 0xe8f3ff,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          toneMapped: false,
        }),
      ),
      metal: standard(0x8e8c86, 0.62),
      collision: this.ownMaterial(
        new THREE.MeshBasicMaterial({
          color: 0x72c98d,
          wireframe: true,
          depthTest: false,
        }),
      ),
      interaction: this.ownMaterial(
        new THREE.MeshBasicMaterial({
          color: 0x4dc3ff,
          wireframe: true,
          transparent: true,
          opacity: 0.55,
          depthTest: false,
          depthWrite: false,
        }),
      ),
    };
  }

  private createWoodFloorTexture(): THREE.DataTexture {
    const width = 64;
    const height = 64;
    const channels = 4;
    const pixels = new Uint8Array(width * height * channels);
    const plankHeight = 16;
    const baseColors = [
      [136, 98, 71],
      [153, 111, 80],
      [144, 103, 73],
      [161, 118, 84],
    ] as const;

    for (let y = 0; y < height; y += 1) {
      const plankIndex = Math.floor(y / plankHeight);
      const base = baseColors[plankIndex % baseColors.length] as readonly [
        number,
        number,
        number,
      ];

      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * channels;
        const horizontalSeam = y % plankHeight === 0;
        const jointOffset = plankIndex % 2 === 0 ? 0 : width / 2;
        const verticalSeam = (x + jointOffset) % width === 0;
        const grain = ((x * 13 + y * 7) % 9) - 4;
        const shade = horizontalSeam || verticalSeam ? -34 : grain;
        pixels[offset] = THREE.MathUtils.clamp(base[0] + shade, 0, 255);
        pixels[offset + 1] = THREE.MathUtils.clamp(base[1] + shade, 0, 255);
        pixels[offset + 2] = THREE.MathUtils.clamp(base[2] + shade, 0, 255);
        pixels[offset + 3] = 255;
      }
    }

    const texture = this.ownTexture(
      new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat),
    );
    texture.name = 'TEXTURE_WoodFloor_Light';
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 4);
    texture.needsUpdate = true;
    return texture;
  }

  private createArchitecture(): void {
    const materials = this.requireMaterials();
    const visualRoot = this.getVisualRoot();
    const architectureRoot = new THREE.Group();
    architectureRoot.name = 'ARCH_Bedroom';
    visualRoot.add(architectureRoot);

    architectureRoot.add(
      this.createVisualBox(
        'FLOOR_Room',
        [ROOM_WIDTH, 0.12, ROOM_LENGTH],
        [0, -0.06, 0],
        materials.floor,
      ),
      this.createVisualBox(
        'CEILING_Room',
        [ROOM_WIDTH, 0.12, ROOM_LENGTH],
        [0, ROOM_HEIGHT + 0.06, 0],
        materials.ceiling,
      ),
      this.createVisualBox(
        'WALL_North',
        [ROOM_WIDTH + WALL_THICKNESS, ROOM_HEIGHT, WALL_THICKNESS],
        [0, ROOM_HEIGHT / 2, -ROOM_LENGTH / 2],
        materials.wall,
      ),
      this.createWestWall(),
    );

    architectureRoot.add(this.createSouthWall(), this.createEastWall());
    this.createDoorFrames(architectureRoot);
    this.createArchitectureDetails(architectureRoot);
    this.exitDoor = this.createExitDoor();
    this.exitPortal = this.createExitPortal();
    architectureRoot.add(
      this.createEntranceDoor(),
      this.exitDoor,
      this.exitPortal,
    );
    this.createArchitectureCollisions();
  }

  private createSouthWall(): THREE.Group {
    const materials = this.requireMaterials();
    const wall = new THREE.Group();
    wall.name = 'WALL_South';
    const openingMin = ENTRANCE_CENTER_X - ENTRANCE_WIDTH / 2;
    const openingMax = ENTRANCE_CENTER_X + ENTRANCE_WIDTH / 2;
    const leftWidth = openingMin + ROOM_WIDTH / 2;
    const rightWidth = ROOM_WIDTH / 2 - openingMax;

    wall.add(
      this.createVisualBox(
        'WALL_South_Left',
        [leftWidth, ROOM_HEIGHT, WALL_THICKNESS],
        [-ROOM_WIDTH / 2 + leftWidth / 2, ROOM_HEIGHT / 2, 0],
        materials.wall,
      ),
      this.createVisualBox(
        'WALL_South_Right',
        [rightWidth, ROOM_HEIGHT, WALL_THICKNESS],
        [openingMax + rightWidth / 2, ROOM_HEIGHT / 2, 0],
        materials.wall,
      ),
      this.createVisualBox(
        'WALL_South_Lintel',
        [ENTRANCE_WIDTH, ROOM_HEIGHT - DOOR_HEIGHT, WALL_THICKNESS],
        [ENTRANCE_CENTER_X, DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT) / 2, 0],
        materials.wall,
      ),
    );
    wall.position.z = ROOM_LENGTH / 2;
    return wall;
  }

  private createWestWall(): THREE.Group {
    const materials = this.requireMaterials();
    const wall = new THREE.Group();
    wall.name = 'WALL_West';
    const openingMinimumZ = WINDOW_CENTER_Z - WINDOW_WIDTH / 2;
    const openingMaximumZ = WINDOW_CENTER_Z + WINDOW_WIDTH / 2;
    const openingMinimumY = WINDOW_CENTER_Y - WINDOW_HEIGHT / 2;
    const openingMaximumY = WINDOW_CENTER_Y + WINDOW_HEIGHT / 2;
    const northLength = openingMinimumZ + ROOM_LENGTH / 2;
    const southLength = ROOM_LENGTH / 2 - openingMaximumZ;
    const topHeight = ROOM_HEIGHT - openingMaximumY;

    wall.add(
      this.createVisualBox(
        'WALL_West_North',
        [WALL_THICKNESS, ROOM_HEIGHT, northLength],
        [
          -ROOM_WIDTH / 2,
          ROOM_HEIGHT / 2,
          -ROOM_LENGTH / 2 + northLength / 2,
        ],
        materials.wall,
      ),
      this.createVisualBox(
        'WALL_West_South',
        [WALL_THICKNESS, ROOM_HEIGHT, southLength],
        [
          -ROOM_WIDTH / 2,
          ROOM_HEIGHT / 2,
          openingMaximumZ + southLength / 2,
        ],
        materials.wall,
      ),
      this.createVisualBox(
        'WALL_West_WindowBottom',
        [WALL_THICKNESS, openingMinimumY, WINDOW_WIDTH],
        [-ROOM_WIDTH / 2, openingMinimumY / 2, WINDOW_CENTER_Z],
        materials.wall,
      ),
      this.createVisualBox(
        'WALL_West_WindowTop',
        [WALL_THICKNESS, topHeight, WINDOW_WIDTH],
        [
          -ROOM_WIDTH / 2,
          openingMaximumY + topHeight / 2,
          WINDOW_CENTER_Z,
        ],
        materials.wall,
      ),
    );
    return wall;
  }

  private createEastWall(): THREE.Group {
    const materials = this.requireMaterials();
    const wall = new THREE.Group();
    wall.name = 'WALL_East';
    const openingMin = EXIT_CENTER_Z - EXIT_WIDTH / 2;
    const openingMax = EXIT_CENTER_Z + EXIT_WIDTH / 2;
    const northLength = openingMin + ROOM_LENGTH / 2;
    const southLength = ROOM_LENGTH / 2 - openingMax;

    wall.add(
      this.createVisualBox(
        'WALL_East_North',
        [WALL_THICKNESS, ROOM_HEIGHT, northLength],
        [0, ROOM_HEIGHT / 2, -ROOM_LENGTH / 2 + northLength / 2],
        materials.wall,
      ),
      this.createVisualBox(
        'WALL_East_South',
        [WALL_THICKNESS, ROOM_HEIGHT, southLength],
        [0, ROOM_HEIGHT / 2, openingMax + southLength / 2],
        materials.wall,
      ),
      this.createVisualBox(
        'WALL_East_Lintel',
        [WALL_THICKNESS, ROOM_HEIGHT - DOOR_HEIGHT, EXIT_WIDTH],
        [0, DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT) / 2, EXIT_CENTER_Z],
        materials.wall,
      ),
    );
    wall.position.x = ROOM_WIDTH / 2;
    return wall;
  }

  private createDoorFrames(root: THREE.Object3D): void {
    const materials = this.requireMaterials();
    const frameThickness = 0.09;
    const frameDepth = 0.24;

    root.add(
      this.createVisualBox(
        'FRAME_Entrance_Left',
        [frameThickness, DOOR_HEIGHT + 0.08, frameDepth],
        [ENTRANCE_CENTER_X - ENTRANCE_WIDTH / 2, DOOR_HEIGHT / 2, ROOM_LENGTH / 2 - 0.02],
        materials.trim,
      ),
      this.createVisualBox(
        'FRAME_Entrance_Right',
        [frameThickness, DOOR_HEIGHT + 0.08, frameDepth],
        [ENTRANCE_CENTER_X + ENTRANCE_WIDTH / 2, DOOR_HEIGHT / 2, ROOM_LENGTH / 2 - 0.02],
        materials.trim,
      ),
      this.createVisualBox(
        'FRAME_Entrance_Top',
        [ENTRANCE_WIDTH + frameThickness * 2, frameThickness, frameDepth],
        [ENTRANCE_CENTER_X, DOOR_HEIGHT, ROOM_LENGTH / 2 - 0.02],
        materials.trim,
      ),
      this.createVisualBox(
        'FRAME_Exit_North',
        [frameDepth, DOOR_HEIGHT + 0.08, frameThickness],
        [ROOM_WIDTH / 2 - 0.02, DOOR_HEIGHT / 2, EXIT_CENTER_Z - EXIT_WIDTH / 2],
        materials.trim,
      ),
      this.createVisualBox(
        'FRAME_Exit_South',
        [frameDepth, DOOR_HEIGHT + 0.08, frameThickness],
        [ROOM_WIDTH / 2 - 0.02, DOOR_HEIGHT / 2, EXIT_CENTER_Z + EXIT_WIDTH / 2],
        materials.trim,
      ),
      this.createVisualBox(
        'FRAME_Exit_Top',
        [frameDepth, frameThickness, EXIT_WIDTH + frameThickness * 2],
        [ROOM_WIDTH / 2 - 0.02, DOOR_HEIGHT, EXIT_CENTER_Z],
        materials.trim,
      ),
    );
  }

  private createArchitectureDetails(root: THREE.Object3D): void {
    this.createBaseboards(root);
    this.createCrownMolding(root);
    this.createThresholds(root);
    root.add(
      this.createWindow(),
      this.createRadiator(),
      this.createWallFixtures(),
      this.createCeilingFixture(),
    );
  }

  private createBaseboards(root: THREE.Object3D): void {
    const materials = this.requireMaterials();
    const height = 0.13;
    const depth = 0.055;
    const y = height / 2;
    const innerX = ROOM_WIDTH / 2 - WALL_THICKNESS / 2 - depth / 2;
    const innerZ = ROOM_LENGTH / 2 - WALL_THICKNESS / 2 - depth / 2;
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
        'ARCH_Baseboard_North',
        [ROOM_WIDTH - 0.1, height, depth],
        [0, y, -innerZ],
        materials.baseboard,
      ),
      this.createVisualBox(
        'ARCH_Baseboard_West',
        [depth, height, ROOM_LENGTH - 0.1],
        [-innerX, y, 0],
        materials.baseboard,
      ),
      this.createVisualBox(
        'ARCH_Baseboard_SouthLeft',
        [southLeftWidth, height, depth],
        [-ROOM_WIDTH / 2 + southLeftWidth / 2, y, innerZ],
        materials.baseboard,
      ),
      this.createVisualBox(
        'ARCH_Baseboard_SouthRight',
        [southRightWidth, height, depth],
        [entranceMax + southRightWidth / 2, y, innerZ],
        materials.baseboard,
      ),
      this.createVisualBox(
        'ARCH_Baseboard_EastNorth',
        [depth, height, eastNorthLength],
        [innerX, y, -ROOM_LENGTH / 2 + eastNorthLength / 2],
        materials.baseboard,
      ),
      this.createVisualBox(
        'ARCH_Baseboard_EastSouth',
        [depth, height, eastSouthLength],
        [innerX, y, exitMax + eastSouthLength / 2],
        materials.baseboard,
      ),
    );
  }

  private createCrownMolding(root: THREE.Object3D): void {
    const materials = this.requireMaterials();
    const height = 0.085;
    const depth = 0.06;
    const y = ROOM_HEIGHT - height / 2;
    const innerX = ROOM_WIDTH / 2 - WALL_THICKNESS / 2 - depth / 2;
    const innerZ = ROOM_LENGTH / 2 - WALL_THICKNESS / 2 - depth / 2;

    root.add(
      this.createVisualBox(
        'ARCH_Crown_North',
        [ROOM_WIDTH - 0.08, height, depth],
        [0, y, -innerZ],
        materials.baseboard,
      ),
      this.createVisualBox(
        'ARCH_Crown_South',
        [ROOM_WIDTH - 0.08, height, depth],
        [0, y, innerZ],
        materials.baseboard,
      ),
      this.createVisualBox(
        'ARCH_Crown_West',
        [depth, height, ROOM_LENGTH - 0.08],
        [-innerX, y, 0],
        materials.baseboard,
      ),
      this.createVisualBox(
        'ARCH_Crown_East',
        [depth, height, ROOM_LENGTH - 0.08],
        [innerX, y, 0],
        materials.baseboard,
      ),
    );
  }

  private createThresholds(root: THREE.Object3D): void {
    const materials = this.requireMaterials();
    root.add(
      this.createVisualBox(
        'ARCH_Threshold_Entrance',
        [ENTRANCE_WIDTH + 0.08, 0.025, 0.24],
        [ENTRANCE_CENTER_X, 0.013, ROOM_LENGTH / 2 - 0.08],
        materials.trim,
      ),
      this.createVisualBox(
        'ARCH_Threshold_Exit',
        [0.24, 0.025, EXIT_WIDTH + 0.08],
        [ROOM_WIDTH / 2 - 0.08, 0.013, EXIT_CENTER_Z],
        materials.trim,
      ),
    );
  }

  private createWindow(): THREE.Group {
    const materials = this.requireMaterials();
    const window = new THREE.Group();
    window.name = 'ARCH_Window_West';
    const x = -ROOM_WIDTH / 2 + WALL_THICKNESS / 2 + 0.04;
    const centerY = WINDOW_CENTER_Y;
    const centerZ = WINDOW_CENTER_Z;
    const width = WINDOW_WIDTH;
    const height = WINDOW_HEIGHT;
    const frame = 0.085;

    window.add(
      this.createVisualBox(
        'ARCH_Window_Glass',
        [0.035, height - frame * 2, width - frame * 2],
        [x, centerY, centerZ],
        materials.windowGlass,
      ),
      this.createVisualBox(
        'ARCH_Window_FrameTop',
        [0.075, frame, width],
        [x + 0.018, centerY + height / 2 - frame / 2, centerZ],
        materials.baseboard,
      ),
      this.createVisualBox(
        'ARCH_Window_FrameBottom',
        [0.075, frame, width],
        [x + 0.018, centerY - height / 2 + frame / 2, centerZ],
        materials.baseboard,
      ),
      this.createVisualBox(
        'ARCH_Window_FrameNorth',
        [0.075, height, frame],
        [x + 0.018, centerY, centerZ - width / 2 + frame / 2],
        materials.baseboard,
      ),
      this.createVisualBox(
        'ARCH_Window_FrameSouth',
        [0.075, height, frame],
        [x + 0.018, centerY, centerZ + width / 2 - frame / 2],
        materials.baseboard,
      ),
      this.createVisualBox(
        'ARCH_Window_Mullion',
        [0.08, height - frame * 2, 0.055],
        [x + 0.024, centerY, centerZ],
        materials.baseboard,
      ),
      this.createVisualBox(
        'ARCH_Window_Sill',
        [0.2, 0.07, width + 0.18],
        [x + 0.07, centerY - height / 2 - 0.015, centerZ],
        materials.baseboard,
      ),
    );
    return window;
  }

  private createRadiator(): THREE.Group {
    const materials = this.requireMaterials();
    const radiator = new THREE.Group();
    radiator.name = 'ARCH_Radiator_West';
    const x = -ROOM_WIDTH / 2 + WALL_THICKNESS / 2 + 0.075;
    const centerZ = 0.72;
    radiator.add(
      this.createVisualBox(
        'ARCH_Radiator_Back',
        [0.055, 0.58, 1.26],
        [x, 0.48, centerZ],
        materials.radiator,
      ),
    );

    for (let index = 0; index < 7; index += 1) {
      radiator.add(
        this.createVisualBox(
          `ARCH_Radiator_Slat_${index + 1}`,
          [0.095, 0.52, 0.105],
          [x + 0.045, 0.48, centerZ - 0.51 + index * 0.17],
          materials.radiator,
        ),
      );
    }

    return radiator;
  }

  private createWallFixtures(): THREE.Group {
    const materials = this.requireMaterials();
    const fixtures = new THREE.Group();
    fixtures.name = 'ARCH_WallFixtures';
    const southZ = ROOM_LENGTH / 2 - WALL_THICKNESS / 2 - 0.025;
    const northZ = -ROOM_LENGTH / 2 + WALL_THICKNESS / 2 + 0.025;
    fixtures.add(
      this.createVisualBox(
        'ARCH_LightSwitch_Entrance',
        [0.17, 0.25, 0.035],
        [-0.96, 1.18, southZ],
        materials.fixture,
      ),
      this.createVisualBox(
        'ARCH_LightSwitch_Button',
        [0.075, 0.12, 0.025],
        [-0.96, 1.18, southZ - 0.028],
        materials.wallAccent,
      ),
      this.createVisualBox(
        'ARCH_Outlet_North',
        [0.18, 0.12, 0.035],
        [-1.68, 0.3, northZ],
        materials.fixture,
      ),
      this.createVisualBox(
        'ARCH_Outlet_South',
        [0.18, 0.12, 0.035],
        [1.65, 0.3, southZ],
        materials.fixture,
      ),
    );
    return fixtures;
  }

  private createCeilingFixture(): THREE.Group {
    const materials = this.requireMaterials();
    const fixture = new THREE.Group();
    fixture.name = 'ARCH_CeilingFixture';
    fixture.add(
      this.createCylinderMesh(
        'ARCH_CeilingFixture_Base',
        0.24,
        0.24,
        0.08,
        [0, ROOM_HEIGHT - 0.04, 0.2],
        materials.brass,
      ),
      this.createCylinderMesh(
        'ARCH_CeilingFixture_Stem',
        0.025,
        0.025,
        0.18,
        [0, ROOM_HEIGHT - 0.15, 0.2],
        materials.brass,
      ),
      this.createCylinderMesh(
        'ARCH_CeilingFixture_Shade',
        0.16,
        0.33,
        0.2,
        [0, ROOM_HEIGHT - 0.31, 0.2],
        materials.lightShade,
      ),
    );
    return fixture;
  }

  private createEntranceDoor(): THREE.Group {
    const materials = this.requireMaterials();
    const door = new THREE.Group();
    door.name = 'ENTRANCE_Door';
    door.position.set(
      ENTRANCE_CENTER_X - ENTRANCE_WIDTH / 2,
      0,
      ROOM_LENGTH / 2 - WALL_THICKNESS / 2,
    );
    door.add(
      this.createVisualBox(
        'ENTRANCE_DoorPanel',
        [ENTRANCE_WIDTH - 0.08, DOOR_HEIGHT - 0.06, 0.1],
        [ENTRANCE_WIDTH / 2, (DOOR_HEIGHT - 0.06) / 2, 0],
        materials.entranceDoor,
      ),
      this.createVisualBox(
        'ENTRANCE_DoorInsetUpper',
        [0.64, 0.68, 0.026],
        [ENTRANCE_WIDTH / 2, 1.55, -0.064],
        materials.trim,
      ),
      this.createVisualBox(
        'ENTRANCE_DoorInsetLower',
        [0.64, 0.58, 0.026],
        [ENTRANCE_WIDTH / 2, 0.62, -0.064],
        materials.trim,
      ),
      this.createSphereMesh(
        'ENTRANCE_DoorHandle',
        0.055,
        [ENTRANCE_WIDTH - 0.16, 1.02, -0.08],
        materials.brass,
      ),
    );
    return door;
  }

  private createExitDoor(): THREE.Group {
    const materials = this.requireMaterials();
    const door = new THREE.Group();
    door.name = 'EXIT_Door';
    door.position.set(
      ROOM_WIDTH / 2 - WALL_THICKNESS / 2,
      0,
      EXIT_CENTER_Z - EXIT_WIDTH / 2,
    );
    door.add(
      this.createVisualBox(
        'EXIT_DoorPanel',
        [0.1, DOOR_HEIGHT - 0.06, EXIT_WIDTH - 0.08],
        [0, (DOOR_HEIGHT - 0.06) / 2, EXIT_WIDTH / 2],
        materials.exitDoor,
      ),
      this.createVisualBox(
        'EXIT_DoorInsetUpper',
        [0.026, 0.68, 0.64],
        [-0.064, 1.55, EXIT_WIDTH / 2],
        materials.trim,
      ),
      this.createVisualBox(
        'EXIT_DoorInsetLower',
        [0.026, 0.58, 0.64],
        [-0.064, 0.62, EXIT_WIDTH / 2],
        materials.trim,
      ),
      this.createSphereMesh(
        'EXIT_DoorHandle',
        0.06,
        [-0.08, 1.02, EXIT_WIDTH - 0.16],
        materials.brass,
      ),
    );
    return door;
  }

  private createExitPortal(): THREE.Group {
    const materials = this.requireMaterials();
    const portal = new THREE.Group();
    portal.name = 'EXIT_PrototypeLanding';
    portal.visible = false;
    portal.add(
      this.createVisualBox(
        'EXIT_LandingFloor',
        [2.7, 0.12, 1.7],
        [ROOM_WIDTH / 2 + 1.35, -0.06, EXIT_CENTER_Z],
        materials.floor,
      ),
      this.createVisualBox(
        'EXIT_NaturalLight',
        [0.04, 2.4, 1.65],
        [ROOM_WIDTH / 2 + 2.68, 1.2, EXIT_CENTER_Z],
        materials.exitGlow,
      ),
    );
    const light = new THREE.PointLight(0xe8f3ff, 0, 5.5, 1.6);
    light.name = 'EXIT_PortalLight';
    light.position.set(
      ROOM_WIDTH / 2 + 0.85,
      1.45,
      EXIT_CENTER_Z,
    );
    portal.add(light);
    this.exitPortalLight = light;
    return portal;
  }

  private createLighting(): void {
    const hemisphere = new THREE.HemisphereLight(0x94a1a5, 0x3b2d26, 0.4);
    hemisphere.name = 'LIGHT_Ambient';
    const roomBounce = new THREE.AmbientLight(0xc8c0b3, 0.12);
    roomBounce.name = 'LIGHT_RoomBounce';
    const ceilingLight = new THREE.SpotLight(
      0xffc477,
      6.4,
      8.5,
      Math.PI * 0.32,
      0.64,
      2,
    );
    ceilingLight.name = 'LIGHT_Ceiling';
    ceilingLight.position.set(0, 2.34, 0.2);
    ceilingLight.target.position.set(0, 0.15, 0.2);
    ceilingLight.castShadow = true;
    ceilingLight.shadow.mapSize.set(1024, 1024);
    ceilingLight.shadow.camera.near = 0.25;
    ceilingLight.shadow.camera.far = 8.5;
    ceilingLight.shadow.bias = -0.00025;
    ceilingLight.shadow.normalBias = 0.025;
    ceilingLight.shadow.radius = 2;
    const ceilingBounce = new THREE.PointLight(0xffb85c, 0.36, 1.8, 2);
    ceilingBounce.name = 'LIGHT_CeilingBounce';
    ceilingBounce.position.set(0, 2.42, 0.2);
    const fillLight = new THREE.DirectionalLight(0x829da6, 0.27);
    fillLight.name = 'LIGHT_WindowFill';
    fillLight.position.set(-4.2, 4.8, 3.4);
    fillLight.target.position.set(0.5, 0.45, -0.7);
    const windowAreaLight = new THREE.RectAreaLight(
      0xaed8e5,
      0.72,
      WINDOW_WIDTH,
      WINDOW_HEIGHT,
    );
    windowAreaLight.name = 'LIGHT_WindowArea';
    windowAreaLight.position.set(
      -ROOM_WIDTH / 2 + 0.12,
      WINDOW_CENTER_Y,
      WINDOW_CENTER_Z,
    );
    windowAreaLight.lookAt(0.4, 1.05, WINDOW_CENTER_Z);
    this.getVisualRoot().add(
      hemisphere,
      roomBounce,
      ceilingLight,
      ceilingLight.target,
      ceilingBounce,
      fillLight,
      fillLight.target,
      windowAreaLight,
    );
  }

  private createBed(): THREE.Group {
    const materials = this.requireMaterials();
    const bed = new THREE.Group();
    bed.name = 'ANOM_Bed';
    bed.position.set(0.45, 0, -2.38);
    bed.add(
      this.createVisualBox('Bed_Frame', [2.05, 0.28, 2.15], [0, 0.2, 0], materials.darkWood),
      this.createVisualBox('Bed_Mattress', [1.92, 0.3, 2.02], [0, 0.46, 0.02], materials.bed),
      this.createVisualBox('Bed_Blanket', [1.82, 0.08, 1.15], [0, 0.65, 0.42], materials.bedding),
      this.createVisualBox('Bed_Headboard', [2.05, 0.9, 0.16], [0, 0.65, -1.02], materials.darkWood),
      this.createVisualBox('Bed_PillowLeft', [0.72, 0.16, 0.42], [-0.45, 0.67, -0.68], materials.bedding),
      this.createVisualBox('Bed_PillowRight', [0.72, 0.16, 0.42], [0.45, 0.67, -0.68], materials.bedding),
    );
    return bed;
  }

  private createNightstand(): THREE.Group {
    const materials = this.requireMaterials();
    const nightstand = new THREE.Group();
    nightstand.name = 'ANOM_Nightstand';
    nightstand.position.set(-1.08, 0, -2.68);
    nightstand.add(
      this.createVisualBox('Nightstand_Body', [0.58, 0.55, 0.55], [0, 0.275, 0], materials.wood),
      this.createVisualBox('Nightstand_Drawer', [0.5, 0.18, 0.04], [0, 0.36, 0.295], materials.darkWood),
    );
    return nightstand;
  }

  private createWardrobe(): THREE.Group {
    const materials = this.requireMaterials();
    const wardrobe = new THREE.Group();
    wardrobe.name = 'ANOM_Wardrobe';
    wardrobe.position.set(-2.78, 0, -1.55);
    wardrobe.add(
      this.createVisualBox('Wardrobe_Body', [0.72, 2.18, 1.3], [0, 1.09, 0], materials.wood),
      this.createVisualBox('Wardrobe_DoorLeft', [0.04, 1.98, 0.61], [0.38, 1.08, -0.325], materials.darkWood),
      this.createVisualBox('Wardrobe_DoorRight', [0.04, 1.98, 0.61], [0.38, 1.08, 0.325], materials.darkWood),
    );
    return wardrobe;
  }

  private createChair(): THREE.Group {
    const materials = this.requireMaterials();
    const chair = new THREE.Group();
    chair.name = 'ANOM_Chair';
    chair.position.set(0.9, 0, 1.45);
    chair.rotation.y = -0.32;
    chair.add(
      this.createVisualBox('Chair_Seat', [0.62, 0.12, 0.62], [0, 0.55, 0], materials.chair),
      this.createVisualBox('Chair_Back', [0.62, 0.76, 0.12], [0, 0.92, 0.25], materials.chair),
      this.createVisualBox('Chair_LegFrontLeft', [0.09, 0.52, 0.09], [-0.23, 0.26, -0.23], materials.darkWood),
      this.createVisualBox('Chair_LegFrontRight', [0.09, 0.52, 0.09], [0.23, 0.26, -0.23], materials.darkWood),
      this.createVisualBox('Chair_LegBackLeft', [0.09, 0.52, 0.09], [-0.23, 0.26, 0.23], materials.darkWood),
      this.createVisualBox('Chair_LegBackRight', [0.09, 0.52, 0.09], [0.23, 0.26, 0.23], materials.darkWood),
    );
    return chair;
  }

  private createTvStand(): THREE.Group {
    const materials = this.requireMaterials();
    const stand = new THREE.Group();
    stand.name = 'ANOM_TvStand';
    stand.position.set(2.76, 0, 0.15);
    stand.add(
      this.createVisualBox('TvStand_Body', [0.54, 0.62, 1.72], [0, 0.31, 0], materials.darkWood),
      this.createVisualBox('TvStand_Shelf', [0.58, 0.08, 1.78], [0, 0.65, 0], materials.wood),
    );
    return stand;
  }

  private createTelevision(): THREE.Group {
    const materials = this.requireMaterials();
    const television = new THREE.Group();
    television.name = 'ANOM_Television';
    television.position.set(2.43, 0.65, 0.15);
    television.add(
      this.createVisualBox('Television_Case', [0.14, 0.84, 1.45], [0, 0.55, 0], materials.television),
      this.createVisualBox('Television_Screen', [0.025, 0.68, 1.25], [-0.085, 0.57, 0], materials.screen),
      this.createVisualBox('Television_Stand', [0.36, 0.08, 0.52], [0.05, 0.08, 0], materials.television),
    );
    return television;
  }

  private createLamp(): THREE.Group {
    const materials = this.requireMaterials();
    const lamp = new THREE.Group();
    lamp.name = 'ANOM_Lamp';
    lamp.position.set(-1.22, 0.56, -2.74);
    lamp.add(
      this.createCylinderMesh('Lamp_Base', 0.15, 0.15, 0.08, [0, 0.04, 0], materials.darkWood),
      this.createCylinderMesh('Lamp_Stem', 0.025, 0.025, 0.38, [0, 0.26, 0], materials.metal),
      this.createCylinderMesh('Lamp_Shade', 0.1, 0.25, 0.34, [0, 0.52, 0], materials.lamp),
    );
    return lamp;
  }

  private createPlant(): THREE.Group {
    const materials = this.requireMaterials();
    const plant = new THREE.Group();
    plant.name = 'ANOM_Plant';
    plant.position.set(-2.58, 0, 1.3);
    plant.add(
      this.createCylinderMesh('Plant_Pot', 0.26, 0.34, 0.42, [0, 0.21, 0], materials.pot),
      this.createCylinderMesh('Plant_Stem', 0.035, 0.05, 0.62, [0, 0.67, 0], materials.plant),
      this.createSphereMesh('Plant_LeavesLower', 0.34, [0.12, 0.72, 0], materials.plant, [1, 0.65, 0.75]),
      this.createSphereMesh('Plant_LeavesUpper', 0.31, [-0.1, 1.0, 0.04], materials.plant, [0.8, 1, 0.72]),
    );
    return plant;
  }

  private createPicture(): THREE.Group {
    const materials = this.requireMaterials();
    const picture = new THREE.Group();
    picture.name = 'ANOM_Picture';
    picture.position.set(0.45, 1.82, -ROOM_LENGTH / 2 + 0.1);
    picture.add(
      this.createVisualBox('Picture_Frame', [1.45, 0.86, 0.1], [0, 0, 0], materials.pictureFrame),
      this.createVisualBox('Picture_Image', [1.24, 0.65, 0.035], [0, 0, 0.065], materials.picture),
    );
    return picture;
  }

  private createBooks(): THREE.Group {
    const materials = this.requireMaterials();
    const books = new THREE.Group();
    books.name = 'ANOM_Books';
    books.position.set(-0.96, 0.56, -2.62);
    books.add(
      this.createVisualBox('Book_Bottom', [0.26, 0.055, 0.34], [0, 0.03, 0], materials.bookBlue, 0.03),
      this.createVisualBox('Book_Middle', [0.3, 0.055, 0.31], [0.01, 0.09, 0], materials.bookRed, -0.04),
      this.createVisualBox('Book_Top', [0.24, 0.055, 0.33], [-0.01, 0.15, 0], materials.bookGreen, 0.07),
    );
    return books;
  }

  private createRug(): THREE.Group {
    const materials = this.requireMaterials();
    const rug = new THREE.Group();
    rug.name = 'ANOM_Rug';
    rug.add(
      this.createVisualBox('Rug_Surface', [2.45, 0.035, 2.25], [0, 0.018, 0.45], materials.rug),
    );
    return rug;
  }

  private registerAnomalyTarget(
    id: string,
    object: THREE.Object3D,
    interactionSize: Vector3Tuple,
    interactionPosition: Vector3Tuple,
    variants: readonly PreparedAnomalyVariant[],
  ): void {
    this.anomalyTargetRegistry.register(
      this.createAnomalyTarget(
        id,
        object,
        interactionSize,
        interactionPosition,
        variants,
      ),
    );
  }

  private createAnomalyTarget(
    id: string,
    object: THREE.Object3D,
    interactionSize: Vector3Tuple,
    interactionPosition: Vector3Tuple,
    variants: readonly PreparedAnomalyVariant[],
    collisionObjects: readonly THREE.Object3D[] = [],
  ): AnomalyTarget {
    const materials = this.requireMaterials();
    const interactionVolume = new THREE.Mesh(
      this.ownGeometry(new THREE.BoxGeometry(...interactionSize)),
      materials.interaction,
    );
    interactionVolume.name = `INTERACT_${id}`;
    interactionVolume.position.fromArray(interactionPosition);
    interactionVolume.layers.set(RENDER_LAYERS.interaction);
    interactionVolume.renderOrder = 11;
    object.add(interactionVolume);

    return {
      id,
      nodeName: object.name,
      interactionNodeNames: [interactionVolume.name],
      allowedKinds: [...new Set(variants.map((variant) => variant.kind))],
      variants,
      weight: 1,
      minimumDifficulty: 1,
      object,
      interactionVolume,
      interactionVolumes: [interactionVolume],
      dependentTargetIds:
        BEDROOM_DEPENDENT_TARGET_IDS[
          id as BedroomAnomalyTargetId
        ] ?? [],
      initialState: captureAnomalyTargetInitialState(object),
      collisionObjects,
      collisionInitialState:
        captureAnomalyCollisionObjectState(collisionObjects),
    };
  }

  private getAnomalyCollisionObjects(
    targetId: BedroomAnomalyTargetId,
  ): readonly THREE.Object3D[] {
    const colliderName = BEDROOM_COLLIDER_NAMES[targetId];

    if (colliderName === undefined) {
      return [];
    }

    const collider = this.getCollisionRoot().getObjectByName(colliderName);

    if (collider === undefined) {
      throw new Error(
        `Anomaly target "${targetId}" requires missing collider "${colliderName}".`,
      );
    }

    return [collider];
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
    this.addCollisionBox('COLLIDER_Ceiling', [ROOM_WIDTH, 0.12, ROOM_LENGTH], [0, ROOM_HEIGHT + 0.06, 0]);
    this.addCollisionBox('COLLIDER_WallNorth', [ROOM_WIDTH + WALL_THICKNESS, ROOM_HEIGHT, WALL_THICKNESS], [0, ROOM_HEIGHT / 2, -ROOM_LENGTH / 2]);
    this.addCollisionBox('COLLIDER_WallWest', [WALL_THICKNESS, ROOM_HEIGHT, ROOM_LENGTH], [-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0]);
    this.addCollisionBox('COLLIDER_WallSouthLeft', [southLeftWidth, ROOM_HEIGHT, WALL_THICKNESS], [-ROOM_WIDTH / 2 + southLeftWidth / 2, ROOM_HEIGHT / 2, ROOM_LENGTH / 2]);
    this.addCollisionBox('COLLIDER_WallSouthRight', [southRightWidth, ROOM_HEIGHT, WALL_THICKNESS], [openingSouthMax + southRightWidth / 2, ROOM_HEIGHT / 2, ROOM_LENGTH / 2]);
    this.addCollisionBox('COLLIDER_WallSouthLintel', [ENTRANCE_WIDTH, ROOM_HEIGHT - DOOR_HEIGHT, WALL_THICKNESS], [ENTRANCE_CENTER_X, DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT) / 2, ROOM_LENGTH / 2]);
    this.addCollisionBox('COLLIDER_EntranceDoor', [ENTRANCE_WIDTH, DOOR_HEIGHT, WALL_THICKNESS], [ENTRANCE_CENTER_X, DOOR_HEIGHT / 2, ROOM_LENGTH / 2]);
    this.addCollisionBox('COLLIDER_WallEastNorth', [WALL_THICKNESS, ROOM_HEIGHT, eastNorthLength], [ROOM_WIDTH / 2, ROOM_HEIGHT / 2, -ROOM_LENGTH / 2 + eastNorthLength / 2]);
    this.addCollisionBox('COLLIDER_WallEastSouth', [WALL_THICKNESS, ROOM_HEIGHT, eastSouthLength], [ROOM_WIDTH / 2, ROOM_HEIGHT / 2, openingEastMax + eastSouthLength / 2]);
    this.addCollisionBox('COLLIDER_WallEastLintel', [WALL_THICKNESS, ROOM_HEIGHT - DOOR_HEIGHT, EXIT_WIDTH], [ROOM_WIDTH / 2, DOOR_HEIGHT + (ROOM_HEIGHT - DOOR_HEIGHT) / 2, EXIT_CENTER_Z]);
    this.exitDoorCollider = this.addCollisionBox('COLLIDER_ExitDoor', [WALL_THICKNESS, DOOR_HEIGHT, EXIT_WIDTH], [ROOM_WIDTH / 2, DOOR_HEIGHT / 2, EXIT_CENTER_Z]);
  }

  private createFurnitureCollisions(): void {
    this.addCollisionBox('COLLIDER_Bed', [2.08, 0.72, 2.18], [0.45, 0.36, -2.38]);
    this.addCollisionBox('COLLIDER_Wardrobe', [0.76, 2.2, 1.34], [-2.78, 1.1, -1.55]);
    this.addCollisionBox('COLLIDER_TvStand', [0.58, 0.7, 1.8], [2.76, 0.35, 0.15]);
  }

  private addCollisionFloor(): void {
    const materials = this.requireMaterials();
    // A single oversized triangle keeps every internal mesh edge outside the
    // room. Capsule-vs-triangle collision otherwise treats the diagonal seam
    // of a box floor as a shallow ramp and pushes straight movement sideways.
    const collisionGeometry = this.ownGeometry(new THREE.BufferGeometry());
    collisionGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [-20, 0, -20, 0, 0, 20, 20, 0, -20],
        3,
      ),
    );
    collisionGeometry.computeVertexNormals();

    const collision = new THREE.Mesh(
      collisionGeometry,
      materials.collision,
    );
    collision.name = 'COLLIDER_Floor';
    // The collision triangle is intentionally larger than the room and would
    // be misleading as a helper, so only its exact debug proxy is rendered.
    collision.visible = false;
    this.getCollisionRoot().add(collision);

    if (import.meta.env.DEV) {
      const debugGeometry = this.ownGeometry(
        new THREE.BoxGeometry(ROOM_WIDTH, 0.12, ROOM_LENGTH),
      );
      const debugFloor = new THREE.Mesh(debugGeometry, materials.collision);
      debugFloor.name = 'DEBUG_COLLIDER_Floor';
      debugFloor.position.set(0, -0.06, 0);
      debugFloor.layers.set(RENDER_LAYERS.debug);
      debugFloor.renderOrder = 9;
      this.getCollisionRoot().add(debugFloor);
    }
  }

  private addCollisionBox(name: string, size: Vector3Tuple, position: Vector3Tuple): THREE.Mesh {
    const materials = this.requireMaterials();
    const geometry = this.ownGeometry(new THREE.BoxGeometry(...size));
    const mesh = new THREE.Mesh(geometry, materials.collision);
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
    rotationY = 0,
  ): THREE.Mesh<THREE.BoxGeometry, THREE.Material> {
    const mesh = new THREE.Mesh(
      this.ownGeometry(new THREE.BoxGeometry(...size)),
      material,
    );
    mesh.name = name;
    mesh.position.fromArray(position);
    mesh.rotation.y = rotationY;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    return mesh;
  }

  private createCylinderMesh(
    name: string,
    radiusTop: number,
    radiusBottom: number,
    height: number,
    position: Vector3Tuple,
    material: THREE.Material,
  ): THREE.Mesh<THREE.CylinderGeometry, THREE.Material> {
    const mesh = new THREE.Mesh(
      this.ownGeometry(
        new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 12),
      ),
      material,
    );
    mesh.name = name;
    mesh.position.fromArray(position);
    return mesh;
  }

  private createSphereMesh(
    name: string,
    radius: number,
    position: Vector3Tuple,
    material: THREE.Material,
    scale: Vector3Tuple = [1, 1, 1],
  ): THREE.Mesh<THREE.SphereGeometry, THREE.Material> {
    const mesh = new THREE.Mesh(
      this.ownGeometry(new THREE.SphereGeometry(radius, 12, 8)),
      material,
    );
    mesh.name = name;
    mesh.position.fromArray(position);
    mesh.scale.fromArray(scale);
    return mesh;
  }

  private requireMaterials(): BedroomMaterials {
    if (this.materials === null) {
      throw new Error('Greybox bedroom materials are unavailable.');
    }
    return this.materials;
  }
}
