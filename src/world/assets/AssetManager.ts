import * as THREE from 'three';
import { clone as cloneObjectGraph } from 'three/addons/utils/SkeletonUtils.js';
import {
  ThreeGlbAssetLoader,
  type GlbAssetLoader,
} from './GlbAssetLoader';

export interface GlbAssetDefinition {
  readonly id: string;
  readonly url: string;
}

export interface GlbAssetLease {
  readonly assetId: string;
  readonly url: string;
  readonly root: THREE.Group;
  isReleased(): boolean;
  release(): void;
}

interface AssetCacheEntry {
  readonly definition: GlbAssetDefinition;
  readonly sourcePromise: Promise<THREE.Group>;
  sourceRoot: THREE.Group | null;
  referenceCount: number;
}

interface InstantiatedAsset {
  readonly root: THREE.Group;
  readonly ownedMaterials: ReadonlySet<THREE.Material>;
}

export class AssetManager {
  private readonly cache = new Map<string, AssetCacheEntry>();

  public constructor(
    private readonly loader: GlbAssetLoader = new ThreeGlbAssetLoader(),
  ) {}

  public async acquire(
    definition: GlbAssetDefinition,
  ): Promise<GlbAssetLease> {
    this.validateDefinition(definition);
    const entry = this.getOrCreateEntry(definition);
    let sourceRoot: THREE.Group;

    try {
      sourceRoot = await entry.sourcePromise;
    } catch (error: unknown) {
      if (this.cache.get(definition.id) === entry) {
        this.cache.delete(definition.id);
      }

      throw new Error(
        `Asset "${definition.id}" could not be loaded from "${definition.url}": ${this.getErrorMessage(error)}`,
        { cause: error },
      );
    }

    entry.sourceRoot = sourceRoot;
    entry.referenceCount += 1;
    let instance: InstantiatedAsset;

    try {
      instance = this.instantiate(sourceRoot);
    } catch (error: unknown) {
      this.releaseEntry(entry);
      throw new Error(
        `Asset "${definition.id}" could not be instantiated: ${this.getErrorMessage(error)}`,
        { cause: error },
      );
    }

    let released = false;

    return {
      assetId: definition.id,
      url: definition.url,
      root: instance.root,
      isReleased: () => released,
      release: () => {
        if (released) {
          return;
        }

        released = true;
        instance.root.removeFromParent();

        for (const material of instance.ownedMaterials) {
          material.dispose();
        }

        instance.root.clear();
        this.releaseEntry(entry);
      },
    };
  }

  public getReferenceCount(assetId: string): number {
    return this.cache.get(assetId)?.referenceCount ?? 0;
  }

  public getCachedAssetCount(): number {
    return this.cache.size;
  }

  private getOrCreateEntry(
    definition: GlbAssetDefinition,
  ): AssetCacheEntry {
    const cached = this.cache.get(definition.id);

    if (cached !== undefined) {
      if (cached.definition.url !== definition.url) {
        throw new Error(
          `Asset id "${definition.id}" is already associated with "${cached.definition.url}", not "${definition.url}".`,
        );
      }

      return cached;
    }

    const entry: AssetCacheEntry = {
      definition: { ...definition },
      sourcePromise: Promise.resolve().then(() =>
        this.loader.load(definition.url),
      ),
      sourceRoot: null,
      referenceCount: 0,
    };
    this.cache.set(definition.id, entry);
    return entry;
  }

  private instantiate(sourceRoot: THREE.Group): InstantiatedAsset {
    const root = cloneObjectGraph(sourceRoot) as THREE.Group;
    const materialClones = new Map<THREE.Material, THREE.Material>();
    const ownedMaterials = new Set<THREE.Material>();

    root.traverse((object) => {
      const mesh = object as THREE.Mesh;

      if (!mesh.isMesh) {
        return;
      }

      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((material) =>
          this.cloneMaterial(material, materialClones, ownedMaterials),
        );
      } else {
        mesh.material = this.cloneMaterial(
          mesh.material,
          materialClones,
          ownedMaterials,
        );
      }
    });

    return { root, ownedMaterials };
  }

  private cloneMaterial(
    source: THREE.Material,
    clones: Map<THREE.Material, THREE.Material>,
    ownedMaterials: Set<THREE.Material>,
  ): THREE.Material {
    const existing = clones.get(source);

    if (existing !== undefined) {
      return existing;
    }

    const cloned = source.clone();
    clones.set(source, cloned);
    ownedMaterials.add(cloned);
    return cloned;
  }

  private releaseEntry(entry: AssetCacheEntry): void {
    entry.referenceCount -= 1;

    if (entry.referenceCount < 0) {
      throw new Error(
        `Asset "${entry.definition.id}" reference count became negative.`,
      );
    }

    if (entry.referenceCount > 0) {
      return;
    }

    if (this.cache.get(entry.definition.id) === entry) {
      this.cache.delete(entry.definition.id);
    }

    if (entry.sourceRoot !== null) {
      this.disposeSource(entry.sourceRoot);
      entry.sourceRoot.clear();
      entry.sourceRoot = null;
    }
  }

  private disposeSource(root: THREE.Object3D): void {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();

    root.traverse((object) => {
      const mesh = object as THREE.Mesh;

      if (!mesh.isMesh) {
        return;
      }

      geometries.add(mesh.geometry);
      const meshMaterials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];

      for (const material of meshMaterials) {
        materials.add(material);
        this.collectMaterialTextures(material, textures);
      }
    });

    for (const geometry of geometries) {
      geometry.dispose();
    }

    for (const material of materials) {
      material.dispose();
    }

    for (const texture of textures) {
      texture.dispose();
    }
  }

  private collectMaterialTextures(
    material: THREE.Material,
    textures: Set<THREE.Texture>,
  ): void {
    const values = Object.values(
      material as unknown as Record<string, unknown>,
    );

    for (const value of values) {
      if (
        typeof value === 'object' &&
        value !== null &&
        'isTexture' in value &&
        value.isTexture === true
      ) {
        textures.add(value as THREE.Texture);
      }
    }
  }

  private validateDefinition(definition: GlbAssetDefinition): void {
    if (definition.id.trim().length === 0) {
      throw new Error('A GLB asset must have a non-empty stable id.');
    }

    if (definition.url.trim().length === 0) {
      throw new Error(`Asset "${definition.id}" must have a non-empty URL.`);
    }
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
