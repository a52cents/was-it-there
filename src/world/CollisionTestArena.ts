import * as THREE from 'three';
import type { PlayerSpawn } from '../player/PlayerConfig';

type ArenaMaterial = 'floor' | 'structure' | 'obstacle' | 'accent';

interface ArenaBoxDefinition {
  readonly name: string;
  readonly size: readonly [number, number, number];
  readonly position: readonly [number, number, number];
  readonly material: ArenaMaterial;
}

const ARENA_BOXES: readonly ArenaBoxDefinition[] = [
  {
    name: 'COLLIDER_Floor',
    size: [12, 0.2, 12],
    position: [0, -0.1, 0],
    material: 'floor',
  },
  {
    name: 'COLLIDER_Ceiling',
    size: [12, 0.2, 12],
    position: [0, 3.1, 0],
    material: 'structure',
  },
  {
    name: 'COLLIDER_WallNorth',
    size: [12.4, 3, 0.2],
    position: [0, 1.5, -6.1],
    material: 'structure',
  },
  {
    name: 'COLLIDER_WallSouth',
    size: [12.4, 3, 0.2],
    position: [0, 1.5, 6.1],
    material: 'structure',
  },
  {
    name: 'COLLIDER_WallWest',
    size: [0.2, 3, 12],
    position: [-6.1, 1.5, 0],
    material: 'structure',
  },
  {
    name: 'COLLIDER_WallEast',
    size: [0.2, 3, 12],
    position: [6.1, 1.5, 0],
    material: 'structure',
  },
  {
    name: 'COLLIDER_CentralBlock',
    size: [1.5, 1.3, 1.5],
    position: [0, 0.65, 0],
    material: 'obstacle',
  },
  {
    name: 'COLLIDER_SlideObstacle',
    size: [0.5, 1.6, 4.5],
    position: [-3, 0.8, -0.4],
    material: 'accent',
  },
  {
    name: 'COLLIDER_NarrowPassageLeft',
    size: [0.5, 1.5, 3],
    position: [2.1, 0.75, -2.5],
    material: 'obstacle',
  },
  {
    name: 'COLLIDER_NarrowPassageRight',
    size: [0.5, 1.5, 3],
    position: [3.45, 0.75, -2.5],
    material: 'obstacle',
  },
  {
    name: 'COLLIDER_LowPlatform',
    size: [1.4, 0.08, 1.4],
    position: [4.5, 0.04, 1.5],
    material: 'accent',
  },
] as const;

export class CollisionTestArena {
  public readonly visualRoot = new THREE.Group();
  public readonly collisionRoot = new THREE.Group();
  public readonly spawn: PlayerSpawn = {
    x: 0,
    y: 0,
    z: 4.5,
    yaw: 0,
    pitch: 0,
  };

  private readonly visualMaterials: Record<
    ArenaMaterial,
    THREE.MeshStandardMaterial
  > = {
    floor: new THREE.MeshStandardMaterial({
      color: 0x343a40,
      roughness: 0.95,
      metalness: 0,
    }),
    structure: new THREE.MeshStandardMaterial({
      color: 0xb8b5ae,
      roughness: 0.9,
      metalness: 0,
    }),
    obstacle: new THREE.MeshStandardMaterial({
      color: 0x536c7b,
      roughness: 0.85,
      metalness: 0,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: 0xe8c35a,
      roughness: 0.8,
      metalness: 0,
    }),
  };
  private readonly collisionMaterial = new THREE.MeshBasicMaterial({
    color: 0x72c98d,
    wireframe: true,
    depthTest: false,
  });

  public constructor() {
    this.visualRoot.name = 'CollisionTestArena_VisualRoot';
    this.collisionRoot.name = 'CollisionTestArena_CollisionRoot';

    for (const definition of ARENA_BOXES) {
      this.addBox(definition);
    }

    this.collisionRoot.visible = false;
    this.visualRoot.updateMatrixWorld(true);
    this.collisionRoot.updateMatrixWorld(true);
  }

  public setCollisionVisible(visible: boolean): void {
    this.collisionRoot.visible = visible;
  }

  public isCollisionVisible(): boolean {
    return this.collisionRoot.visible;
  }

  public dispose(): void {
    const geometries = new Set<THREE.BufferGeometry>();

    this.visualRoot.traverse((object) => {
      const mesh = object as THREE.Mesh<THREE.BufferGeometry>;

      if (mesh.isMesh) {
        geometries.add(mesh.geometry);
      }
    });
    this.collisionRoot.traverse((object) => {
      const mesh = object as THREE.Mesh<THREE.BufferGeometry>;

      if (mesh.isMesh) {
        geometries.add(mesh.geometry);
      }
    });

    for (const geometry of geometries) {
      geometry.dispose();
    }

    for (const material of Object.values(this.visualMaterials)) {
      material.dispose();
    }

    this.collisionMaterial.dispose();
    this.visualRoot.clear();
    this.collisionRoot.clear();
  }

  private addBox(definition: ArenaBoxDefinition): void {
    const [width, height, depth] = definition.size;
    const visual = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      this.visualMaterials[definition.material],
    );
    visual.name = definition.name.replace('COLLIDER_', 'VISUAL_');
    visual.position.fromArray(definition.position);
    visual.receiveShadow = true;
    this.visualRoot.add(visual);

    const collision = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      this.collisionMaterial,
    );
    collision.name = definition.name;
    collision.position.fromArray(definition.position);
    collision.renderOrder = 9;
    this.collisionRoot.add(collision);
  }
}
