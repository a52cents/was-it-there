import * as THREE from 'three';
import {
  captureAnomalyCollisionObjectState,
  captureAnomalyTargetInitialState,
  type AnomalyTarget,
  type PreparedAnomalyVariant,
} from '../../gameplay/anomalies/AnomalyTarget';
import { AnomalyTargetRegistry } from '../../gameplay/anomalies/AnomalyTargetRegistry';
import { RENDER_LAYERS } from '../../rendering/RenderLayers';
import type { AssetManager } from '../assets/AssetManager';
import type { RoomDefinition } from '../RoomDefinition';
import { RoomRuntime } from '../RoomRuntime';
import { createAgedPlasterTexture } from '../textures/AgedPlasterTexture';
import {
  createStoneTileFloorTexture,
  createWoodPlankFloorTexture,
} from '../textures/ProceduralFloorTexture';
import type { PlayableRoom } from './PlayableRoom';

export type Vector3Tuple = readonly [number, number, number];
type ExitWall = 'north' | 'east';
type PropShape = 'box' | 'cylinder' | 'frame' | 'orb';
type PropAnomalyStyle = 'standard' | 'corridor' | 'story' | 'choice';

export interface FinalRoutePropDefinition {
  readonly id: string;
  readonly name: string;
  readonly position: Vector3Tuple;
  readonly size: Vector3Tuple;
  readonly color: string;
  readonly shape?: PropShape;
  readonly rotationY?: number;
  readonly anomalyStyle?: PropAnomalyStyle;
  readonly collision?: boolean;
  readonly detail?: 'records' | 'screen' | 'labels' | 'rings';
}

export interface FinalRouteRoomConfig {
  readonly id: 'entrance-corridor' | 'main-hall';
  readonly displayName: string;
  readonly prefix: 'EntranceCorridor' | 'MainHall';
  readonly halfWidth: number;
  readonly halfDepth: number;
  readonly roomHeight: number;
  readonly entranceX: number;
  readonly exitWall: ExitWall;
  readonly exitCenter: number;
  readonly observationDurationMs: number;
  readonly searchDurationMs: number;
  readonly anomalyCount: { readonly min: number; readonly max: number };
  readonly playerSpawn: Vector3Tuple;
  readonly floorStyle: 'wood' | 'stone';
  readonly props: readonly FinalRoutePropDefinition[];
}

interface FinalRouteMaterials {
  readonly wall: THREE.MeshStandardMaterial;
  readonly lowerWall: THREE.MeshStandardMaterial;
  readonly floor: THREE.MeshStandardMaterial;
  readonly ceiling: THREE.MeshStandardMaterial;
  readonly trim: THREE.MeshStandardMaterial;
  readonly door: THREE.MeshStandardMaterial;
  readonly metal: THREE.MeshStandardMaterial;
  readonly paper: THREE.MeshStandardMaterial;
  readonly glass: THREE.MeshStandardMaterial;
  readonly exitGlow: THREE.MeshBasicMaterial;
  readonly collision: THREE.MeshBasicMaterial;
  readonly interaction: THREE.MeshBasicMaterial;
}

const WALL_THICKNESS = 0.18;
const DOOR_WIDTH = 1.1;
const DOOR_HEIGHT = 2.2;

const SCALE_VARIANTS: readonly PreparedAnomalyVariant[] = [
  { id: 'smaller', kind: 'scale', scaleMultiplier: [0.72, 0.72, 0.72] },
  { id: 'larger', kind: 'scale', scaleMultiplier: [1.28, 1.28, 1.28] },
];

export abstract class FinalRouteRoomBase
  extends RoomRuntime
  implements PlayableRoom
{
  public readonly definition: RoomDefinition;
  private readonly anomalyTargetRegistry = new AnomalyTargetRegistry();
  private materials: FinalRouteMaterials | null = null;
  private exitDoor: THREE.Object3D | null = null;
  private exitDoorCollider: THREE.Mesh | null = null;
  private exitPortal: THREE.Group | null = null;
  private exitPortalLight: THREE.PointLight | null = null;

  protected constructor(protected readonly config: FinalRouteRoomConfig) {
    super(`ROOM_${config.prefix}_VisualRoot`, `COLLIDER_${config.prefix}_Root`);
    this.definition = {
      id: config.id,
      displayName: config.displayName,
      observationDurationMs: config.observationDurationMs,
      searchDurationMs: config.searchDurationMs,
      anomalyCount: config.anomalyCount,
      playerSpawn: {
        position: config.playerSpawn,
        yaw: 0,
        pitch: 0,
      },
    };
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
    if (this.config.exitWall === 'north') {
      return {
        z: -this.config.halfDepth - 0.38,
        minimumX: this.config.exitCenter - DOOR_WIDTH / 2,
        maximumX: this.config.exitCenter + DOOR_WIDTH / 2,
        crossing: 'negative-z' as const,
      };
    }
    return {
      x: this.config.halfWidth + 0.38,
      minimumZ: this.config.exitCenter - DOOR_WIDTH / 2,
      maximumZ: this.config.exitCenter + DOOR_WIDTH / 2,
      crossing: 'positive-x' as const,
    };
  }

  public async loadAssets(assetManager?: AssetManager): Promise<void> {
    if (assetManager === undefined) {
      throw new Error(`The ${this.config.displayName} AssetManager is unavailable.`);
    }
    await this.loadHouseShellAssets(
      assetManager,
      this.config.id,
    );
  }

  public setExitDoorCollisionEnabled(enabled: boolean): void {
    const collider = this.exitDoorCollider;
    if (collider === null) {
      throw new Error(`${this.config.displayName} exit collider is unavailable.`);
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
    this.rebuildWorldCollision();
  }

  public setExitPortalProgress(progress: number): void {
    if (this.exitPortal === null || this.exitPortalLight === null) {
      throw new Error(`${this.config.displayName} exit portal is unavailable.`);
    }
    const safe = Number.isFinite(progress)
      ? THREE.MathUtils.clamp(progress, 0, 1)
      : 0;
    this.exitPortal.visible = safe > 0;
    this.requireMaterials().exitGlow.opacity = safe * 0.82;
    this.exitPortalLight.intensity = safe * 2.4;
  }

  protected buildRoom(): void {
    this.materials = this.createMaterials();
    this.createArchitecture();
    this.createLighting();
    this.createCollisions();
    this.createProps();
    this.createRoomDetails();
  }

  protected override onRoomReleased(): void {
    this.anomalyTargetRegistry.clear();
    this.materials = null;
    this.exitDoor = null;
    this.exitDoorCollider = null;
    this.exitPortal = null;
    this.exitPortalLight = null;
  }

  protected abstract createRoomDetails(): void;

  protected createStoryTarget(
    definition: FinalRoutePropDefinition,
  ): THREE.Group {
    return this.createAndRegisterProp(definition);
  }

  protected createDetailBox(
    name: string,
    size: Vector3Tuple,
    position: Vector3Tuple,
    color: string,
  ): THREE.Mesh {
    return this.createBox(
      name,
      size,
      position,
      this.ownMaterial(new THREE.MeshStandardMaterial({
        color,
        roughness: 0.9,
      })),
    );
  }

  private createMaterials(): FinalRouteMaterials {
    const standard = (
      color: THREE.ColorRepresentation,
      roughness: number,
      metalness = 0,
    ) => this.ownMaterial(new THREE.MeshStandardMaterial({ color, roughness, metalness }));
    const wallTexture = this.ownTexture(createAgedPlasterTexture({
      name: `TEXTURE_${this.config.prefix}_AgedPlaster`,
      seed: this.config.id === 'main-hall' ? 3_910 : 3_862,
    }));
    const wall = standard(this.config.id === 'main-hall' ? '#65615d' : '#666a65', 0.97);
    wall.map = wallTexture;
    const lowerWall = standard(this.config.id === 'main-hall' ? '#403838' : '#3f4a47', 0.95);
    lowerWall.map = wallTexture;
    const floor = standard('#ffffff', 0.9);
    floor.map = this.ownTexture(
      this.config.floorStyle === 'wood'
        ? createWoodPlankFloorTexture({
            name: `TEXTURE_${this.config.prefix}_Floor`,
            seed: 3_910,
            repeat: [3.6, 3.8],
            plankColors: ['#5c493d', '#695245', '#514139', '#735947'],
            seamColor: '#2f2927',
          })
        : createStoneTileFloorTexture({
            name: `TEXTURE_${this.config.prefix}_Floor`,
            seed: 3_862,
            repeat: [2.8, 4.2],
            tileColors: ['#555b58', '#646761', '#4c5351', '#6b6961'],
            groutColor: '#303534',
          }),
    );
    return {
      wall,
      lowerWall,
      floor,
      ceiling: standard('#aaa8a0', 0.98),
      trim: standard('#9b927f', 0.9),
      door: standard('#473530', 0.86),
      metal: standard('#454c4b', 0.55, 0.2),
      paper: standard('#b49b72', 0.94),
      glass: standard('#4f6c70', 0.3, 0.08),
      exitGlow: this.ownMaterial(new THREE.MeshBasicMaterial({
        color: '#75a398', transparent: true, opacity: 0,
        depthWrite: false, side: THREE.DoubleSide,
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
    const { halfWidth, halfDepth, roomHeight, prefix } = this.config;
    const materials = this.requireMaterials();
    const root = new THREE.Group();
    root.name = `${prefix}_Architecture`;
    root.add(
      this.createBox(`ARCH_${prefix}Floor`, [halfWidth * 2, 0.08, halfDepth * 2], [0, -0.04, 0], materials.floor),
      this.createBox(`ARCH_${prefix}Ceiling`, [halfWidth * 2, 0.1, halfDepth * 2], [0, roomHeight + 0.05, 0], materials.ceiling),
    );
    this.createWalls(root);
    this.createDoors(root);
    this.getVisualRoot().add(root);
  }

  private createWalls(root: THREE.Group): void {
    const { halfWidth: w, halfDepth: d, roomHeight: h, entranceX } = this.config;
    const entranceLeft = entranceX - DOOR_WIDTH / 2;
    const entranceRight = entranceX + DOOR_WIDTH / 2;
    root.add(
      this.createWallSegment(`WALL_${this.config.prefix}_SouthWest`, [-w, d], [entranceLeft, d]),
      this.createWallSegment(`WALL_${this.config.prefix}_SouthEast`, [entranceRight, d], [w, d]),
      this.createWallSegment(`WALL_${this.config.prefix}_West`, [-w, -d], [-w, d]),
      this.createBox(`WALL_${this.config.prefix}_EntranceLintel`, [DOOR_WIDTH, h - DOOR_HEIGHT, WALL_THICKNESS], [entranceX, DOOR_HEIGHT + (h - DOOR_HEIGHT) / 2, d], this.requireMaterials().wall),
    );
    if (this.config.exitWall === 'north') {
      const left = this.config.exitCenter - DOOR_WIDTH / 2;
      const right = this.config.exitCenter + DOOR_WIDTH / 2;
      root.add(
        this.createWallSegment(`WALL_${this.config.prefix}_NorthWest`, [-w, -d], [left, -d]),
        this.createWallSegment(`WALL_${this.config.prefix}_NorthEast`, [right, -d], [w, -d]),
        this.createWallSegment(`WALL_${this.config.prefix}_East`, [w, -d], [w, d]),
        this.createBox(`WALL_${this.config.prefix}_ExitLintel`, [DOOR_WIDTH, h - DOOR_HEIGHT, WALL_THICKNESS], [this.config.exitCenter, DOOR_HEIGHT + (h - DOOR_HEIGHT) / 2, -d], this.requireMaterials().wall),
      );
    } else {
      const lower = this.config.exitCenter - DOOR_WIDTH / 2;
      const upper = this.config.exitCenter + DOOR_WIDTH / 2;
      root.add(
        this.createWallSegment(`WALL_${this.config.prefix}_North`, [-w, -d], [w, -d]),
        this.createWallSegment(`WALL_${this.config.prefix}_EastNorth`, [w, -d], [w, lower]),
        this.createWallSegment(`WALL_${this.config.prefix}_EastSouth`, [w, upper], [w, d]),
        this.createBox(`WALL_${this.config.prefix}_ExitLintel`, [WALL_THICKNESS, h - DOOR_HEIGHT, DOOR_WIDTH], [w, DOOR_HEIGHT + (h - DOOR_HEIGHT) / 2, this.config.exitCenter], this.requireMaterials().wall),
      );
    }
  }

  private createDoors(root: THREE.Group): void {
    const { prefix, halfDepth: d, halfWidth: w, entranceX } = this.config;
    root.add(this.createBox(`DOOR_${prefix}_Entrance`, [DOOR_WIDTH - 0.08, DOOR_HEIGHT - 0.06, 0.09], [entranceX, (DOOR_HEIGHT - 0.06) / 2, d - 0.08], this.requireMaterials().door));
    const pivot = new THREE.Group();
    pivot.name = `DOOR_${prefix}Exit_Pivot`;
    if (this.config.exitWall === 'north') {
      pivot.position.set(this.config.exitCenter - DOOR_WIDTH / 2 + 0.04, 0, -d + 0.08);
      pivot.add(this.createBox(`DOOR_${prefix}_Exit`, [DOOR_WIDTH - 0.08, DOOR_HEIGHT - 0.06, 0.09], [(DOOR_WIDTH - 0.08) / 2, (DOOR_HEIGHT - 0.06) / 2, 0], this.requireMaterials().door));
    } else {
      pivot.position.set(w - 0.08, 0, this.config.exitCenter - DOOR_WIDTH / 2 + 0.04);
      const door = this.createBox(`DOOR_${prefix}_Exit`, [DOOR_WIDTH - 0.08, DOOR_HEIGHT - 0.06, 0.09], [(DOOR_WIDTH - 0.08) / 2, (DOOR_HEIGHT - 0.06) / 2, 0], this.requireMaterials().door);
      door.rotation.y = Math.PI / 2;
      pivot.add(door);
    }
    root.add(pivot);
    this.exitDoor = pivot;
    this.createPortal(root);
  }

  private createPortal(root: THREE.Group): void {
    const portal = new THREE.Group();
    portal.name = `EXIT_${this.config.prefix}_Portal`;
    portal.visible = false;
    const glow = new THREE.Mesh(
      this.ownGeometry(new THREE.PlaneGeometry(DOOR_WIDTH * 0.82, DOOR_HEIGHT * 0.9)),
      this.requireMaterials().exitGlow,
    );
    const light = new THREE.PointLight('#75a398', 0, 2.8, 2);
    if (this.config.exitWall === 'north') {
      glow.position.set(this.config.exitCenter, DOOR_HEIGHT * 0.46, -this.config.halfDepth - 0.055);
      light.position.set(this.config.exitCenter, 1.2, -this.config.halfDepth - 0.2);
    } else {
      glow.rotation.y = -Math.PI / 2;
      glow.position.set(this.config.halfWidth + 0.055, DOOR_HEIGHT * 0.46, this.config.exitCenter);
      light.position.set(this.config.halfWidth + 0.2, 1.2, this.config.exitCenter);
    }
    portal.add(glow, light);
    root.add(portal);
    this.exitPortal = portal;
    this.exitPortalLight = light;
  }

  private createLighting(): void {
    const ambient = new THREE.HemisphereLight('#899b9c', '#382d2b', 0.4);
    ambient.name = `LIGHT_${this.config.prefix}_Ambient`;
    const bounce = new THREE.AmbientLight('#c5b9ac', 0.12);
    bounce.name = `LIGHT_${this.config.prefix}_Bounce`;
    const key = new THREE.SpotLight('#e6b77b', 6.1, 12, Math.PI / 3.1, 0.58, 1.15);
    key.name = `LIGHT_${this.config.prefix}_Key`;
    key.position.set(0, this.config.roomHeight - 0.08, 0);
    key.target.position.set(0, 0.3, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    const cold = new THREE.PointLight('#6a9292', 0.5, 6, 1.7);
    cold.name = `LIGHT_${this.config.prefix}_ColdFill`;
    cold.position.set(-this.config.halfWidth * 0.65, 1.7, -this.config.halfDepth * 0.5);
    this.getVisualRoot().add(ambient, bounce, key, key.target, cold);
  }

  private createCollisions(): void {
    const { halfWidth: w, halfDepth: d, roomHeight: h, entranceX } = this.config;
    this.addCollisionBox(`COLLIDER_${this.config.prefix}Floor`, [w * 2, 0.08, d * 2], [0, -0.04, 0]);
    this.addCollisionSegment(`COLLIDER_${this.config.prefix}Wall_West`, [-w, -d], [-w, d]);
    const entranceLeft = entranceX - DOOR_WIDTH / 2;
    const entranceRight = entranceX + DOOR_WIDTH / 2;
    this.addCollisionSegment(`COLLIDER_${this.config.prefix}Wall_SouthWest`, [-w, d], [entranceLeft, d]);
    this.addCollisionSegment(`COLLIDER_${this.config.prefix}Wall_SouthEast`, [entranceRight, d], [w, d]);
    this.addCollisionBox(`COLLIDER_${this.config.prefix}EntranceDoor`, [DOOR_WIDTH, DOOR_HEIGHT, WALL_THICKNESS], [entranceX, DOOR_HEIGHT / 2, d]);
    if (this.config.exitWall === 'north') {
      const left = this.config.exitCenter - DOOR_WIDTH / 2;
      const right = this.config.exitCenter + DOOR_WIDTH / 2;
      this.addCollisionSegment(`COLLIDER_${this.config.prefix}Wall_NorthWest`, [-w, -d], [left, -d]);
      this.addCollisionSegment(`COLLIDER_${this.config.prefix}Wall_NorthEast`, [right, -d], [w, -d]);
      this.addCollisionSegment(`COLLIDER_${this.config.prefix}Wall_East`, [w, -d], [w, d]);
      this.exitDoorCollider = this.addCollisionBox(`COLLIDER_${this.config.prefix}ExitDoor`, [DOOR_WIDTH, DOOR_HEIGHT, WALL_THICKNESS], [this.config.exitCenter, DOOR_HEIGHT / 2, -d]);
    } else {
      const lower = this.config.exitCenter - DOOR_WIDTH / 2;
      const upper = this.config.exitCenter + DOOR_WIDTH / 2;
      this.addCollisionSegment(`COLLIDER_${this.config.prefix}Wall_North`, [-w, -d], [w, -d]);
      this.addCollisionSegment(`COLLIDER_${this.config.prefix}Wall_EastNorth`, [w, -d], [w, lower]);
      this.addCollisionSegment(`COLLIDER_${this.config.prefix}Wall_EastSouth`, [w, upper], [w, d]);
      this.exitDoorCollider = this.addCollisionBox(`COLLIDER_${this.config.prefix}ExitDoor`, [WALL_THICKNESS, DOOR_HEIGHT, DOOR_WIDTH], [w, DOOR_HEIGHT / 2, this.config.exitCenter]);
    }
    this.addCollisionBox(`COLLIDER_${this.config.prefix}Ceiling`, [w * 2, 0.1, d * 2], [0, h + 0.05, 0]);
    for (const prop of this.config.props.filter(({ collision }) => collision)) {
      this.addCollisionBox(`COLLIDER_${prop.id}`, prop.size, [prop.position[0], prop.size[1] / 2, prop.position[2]]);
    }
  }

  private createProps(): void {
    for (const definition of this.config.props) {
      this.createAndRegisterProp(definition);
    }
  }

  private createAndRegisterProp(definition: FinalRoutePropDefinition): THREE.Group {
    const object = new THREE.Group();
    object.name = definition.name;
    object.position.fromArray(definition.position);
    object.rotation.y = definition.rotationY ?? 0;
    const material = this.ownMaterial(new THREE.MeshStandardMaterial({
      color: definition.color,
      roughness: 0.84,
      metalness: definition.shape === 'orb' ? 0.18 : 0.04,
    }));
    const visual = this.createPropVisual(definition, material);
    object.add(visual);
    this.addPropDetails(object, definition);
    const interaction = new THREE.Mesh(
      this.ownGeometry(new THREE.BoxGeometry(
        definition.size[0] + 0.18,
        definition.size[1] + 0.16,
        definition.size[2] + 0.18,
      )),
      this.requireMaterials().interaction,
    );
    interaction.name = `INTERACT_${definition.id}`;
    interaction.position.y = definition.size[1] / 2;
    interaction.layers.set(RENDER_LAYERS.interaction);
    interaction.renderOrder = 11;
    object.add(interaction);
    this.getVisualRoot().add(object);
    const variants = this.createVariants(definition.anomalyStyle ?? 'standard');
    const collisionObject = definition.collision
      ? this.getCollisionRoot().getObjectByName(`COLLIDER_${definition.id}`)
      : undefined;
    const collisionObjects = collisionObject === undefined ? [] : [collisionObject];
    this.anomalyTargetRegistry.register({
      id: definition.id,
      nodeName: object.name,
      interactionNodeNames: [interaction.name],
      allowedKinds: [...new Set(variants.map(({ kind }) => kind))],
      variants,
      weight: definition.anomalyStyle === 'choice' ? 0 : 1,
      minimumDifficulty: 3,
      object,
      interactionVolume: interaction,
      interactionVolumes: [interaction],
      initialState: captureAnomalyTargetInitialState(object),
      collisionObjects,
      collisionInitialState: captureAnomalyCollisionObjectState(collisionObjects),
    });
    return object;
  }

  private createPropVisual(
    definition: FinalRoutePropDefinition,
    material: THREE.Material,
  ): THREE.Object3D {
    const [x, y, z] = definition.size;
    if (definition.shape === 'cylinder' || definition.shape === 'orb') {
      const geometry = definition.shape === 'orb'
        ? new THREE.SphereGeometry(Math.min(x, y, z) / 2, 18, 12)
        : new THREE.CylinderGeometry(x / 2, x / 2, y, 18);
      const mesh = new THREE.Mesh(this.ownGeometry(geometry), material);
      mesh.name = `${definition.name}_Surface`;
      mesh.position.y = y / 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    }
    if (definition.shape === 'frame') {
      const group = new THREE.Group();
      group.name = `${definition.name}_Frame`;
      const t = Math.min(x, y) * 0.1;
      group.add(
        this.createBox(`${definition.name}_Left`, [t, y, z], [-x / 2 + t / 2, y / 2, 0], material),
        this.createBox(`${definition.name}_Right`, [t, y, z], [x / 2 - t / 2, y / 2, 0], material),
        this.createBox(`${definition.name}_Top`, [x, t, z], [0, y - t / 2, 0], material),
        this.createBox(`${definition.name}_Bottom`, [x, t, z], [0, t / 2, 0], material),
      );
      return group;
    }
    return this.createBox(`${definition.name}_Surface`, definition.size, [0, y / 2, 0], material);
  }

  private addPropDetails(
    object: THREE.Group,
    definition: FinalRoutePropDefinition,
  ): void {
    if (definition.detail === undefined) {
      return;
    }
    const materials = this.requireMaterials();
    if (definition.detail === 'records' || definition.detail === 'labels') {
      for (let index = 0; index < 3; index += 1) {
        object.add(this.createBox(
          `DETAIL_${definition.id}_${index + 1}`,
          [definition.size[0] * 0.62, 0.045, definition.size[2] * 0.62],
          [0, definition.size[1] + 0.035 + index * 0.012, 0],
          materials.paper,
        ));
      }
    } else if (definition.detail === 'screen') {
      object.add(this.createBox(
        `DETAIL_${definition.id}_Screen`,
        [definition.size[0] * 0.68, definition.size[1] * 0.42, 0.025],
        [0, definition.size[1] * 0.62, definition.size[2] / 2 + 0.014],
        materials.glass,
      ));
    } else if (definition.detail === 'rings') {
      for (const scale of [1, 0.72, 0.46]) {
        const ring = new THREE.Mesh(
          this.ownGeometry(new THREE.TorusGeometry(definition.size[0] * 0.42 * scale, 0.035, 8, 28)),
          materials.metal,
        );
        ring.name = `DETAIL_${definition.id}_Ring_${scale}`;
        ring.position.y = definition.size[1] * (0.34 + scale * 0.28);
        ring.rotation.x = Math.PI / 2;
        object.add(ring);
      }
    }
  }

  private createVariants(style: PropAnomalyStyle): PreparedAnomalyVariant[] {
    if (style === 'choice') {
      return [];
    }
    const variants: PreparedAnomalyVariant[] = [...SCALE_VARIANTS];
    if (style !== 'story') {
      variants.unshift({ id: 'hidden', kind: 'hide' }, { id: 'appeared', kind: 'show' });
    }
    if (style === 'corridor') {
      variants.push({ id: 'turned', kind: 'rotate', rotationOffsetRadians: [0, Math.PI / 6, 0] });
    }
    return variants;
  }

  private createWallSegment(name: string, start: readonly [number, number], end: readonly [number, number]): THREE.Mesh {
    return this.createSegmentBox(name, start, end, this.requireMaterials().wall);
  }

  private addCollisionSegment(name: string, start: readonly [number, number], end: readonly [number, number]): void {
    this.getCollisionRoot().add(this.createSegmentBox(name, start, end, this.requireMaterials().collision));
  }

  private createSegmentBox(name: string, start: readonly [number, number], end: readonly [number, number], material: THREE.Material): THREE.Mesh {
    const dx = end[0] - start[0];
    const dz = end[1] - start[1];
    const mesh = new THREE.Mesh(
      this.ownGeometry(new THREE.BoxGeometry(Math.hypot(dx, dz), this.config.roomHeight, WALL_THICKNESS)),
      material,
    );
    mesh.name = name;
    mesh.position.set((start[0] + end[0]) / 2, this.config.roomHeight / 2, (start[1] + end[1]) / 2);
    mesh.rotation.y = -Math.atan2(dz, dx);
    mesh.receiveShadow = true;
    return mesh;
  }

  private addCollisionBox(name: string, size: Vector3Tuple, position: Vector3Tuple): THREE.Mesh {
    const mesh = this.createBox(name, size, position, this.requireMaterials().collision);
    this.getCollisionRoot().add(mesh);
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

  private requireMaterials(): FinalRouteMaterials {
    if (this.materials === null) {
      throw new Error(`${this.config.displayName} materials are unavailable.`);
    }
    return this.materials;
  }
}
