import * as THREE from 'three';
import {
  captureAnomalyTargetInitialState,
  type AnomalyTarget,
  type AnomalyTargetDefinition,
} from '../../gameplay/anomalies/AnomalyTarget';
import { AnomalyTargetRegistry } from '../../gameplay/anomalies/AnomalyTargetRegistry';
import { RENDER_LAYERS } from '../../rendering/RenderLayers';
import {
  AssetManager,
  type GlbAssetDefinition,
  type GlbAssetLease,
} from './AssetManager';
import { RoomStateSnapshot } from './RoomStateSnapshot';
import { SceneNodeIndex } from './SceneNodeIndex';

export interface GlbRoomAssetDefinition {
  readonly id: string;
  readonly asset: GlbAssetDefinition;
  readonly roomRootNodeName: string;
  readonly collisionNodeNames: readonly string[];
  readonly requiredMaterialNames: readonly string[];
  readonly anomalyTargets: readonly AnomalyTargetDefinition[];
}

export class LoadedGlbRoomAsset {
  private disposed = false;

  public constructor(
    public readonly definition: GlbRoomAssetDefinition,
    public readonly scene: THREE.Group,
    public readonly roomRoot: THREE.Object3D,
    public readonly collisionRoot: THREE.Group,
    public readonly anomalyTargetRegistry: AnomalyTargetRegistry,
    private readonly nodeIndex: SceneNodeIndex,
    private readonly materials: ReadonlyMap<string, THREE.Material>,
    private readonly sceneSnapshot: RoomStateSnapshot,
    private readonly collisionSnapshot: RoomStateSnapshot,
    private readonly lease: GlbAssetLease,
  ) {}

  public getNode(name: string): THREE.Object3D {
    this.assertAvailable();
    return this.nodeIndex.requireNode(name);
  }

  public getMaterial(name: string): THREE.Material {
    this.assertAvailable();
    const material = this.materials.get(name);

    if (material === undefined) {
      throw new Error(
        `Room asset "${this.definition.id}" did not declare required material "${name}".`,
      );
    }

    return material;
  }

  public restore(): void {
    this.assertAvailable();
    this.sceneSnapshot.restore();
    this.collisionSnapshot.restore();
  }

  public isDisposed(): boolean {
    return this.disposed;
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.anomalyTargetRegistry.clear();
    this.scene.removeFromParent();
    this.collisionRoot.removeFromParent();
    this.collisionRoot.clear();
    this.lease.release();
  }

  private assertAvailable(): void {
    if (this.disposed) {
      throw new Error(`Room asset "${this.definition.id}" has been disposed.`);
    }
  }
}

export class GlbRoomPipeline {
  public constructor(private readonly assetManager: AssetManager) {}

  public async load(
    definition: GlbRoomAssetDefinition,
  ): Promise<LoadedGlbRoomAsset> {
    this.validateDefinition(definition);
    const lease = await this.assetManager.acquire(definition.asset);

    try {
      lease.root.updateMatrixWorld(true);
      const nodeIndex = new SceneNodeIndex(lease.root, definition.id);
      const roomRoot = nodeIndex.requireNode(
        definition.roomRootNodeName,
        'room root',
      );
      const materials = this.resolveMaterials(definition, nodeIndex);
      const collisionRoot = this.buildCollisionRoot(
        definition,
        lease.root,
        nodeIndex,
      );
      const anomalyTargetRegistry = this.buildAnomalyTargetRegistry(
        definition,
        nodeIndex,
      );
      const sceneSnapshot = new RoomStateSnapshot(lease.root);
      const collisionSnapshot = new RoomStateSnapshot(collisionRoot);

      return new LoadedGlbRoomAsset(
        definition,
        lease.root,
        roomRoot,
        collisionRoot,
        anomalyTargetRegistry,
        nodeIndex,
        materials,
        sceneSnapshot,
        collisionSnapshot,
        lease,
      );
    } catch (error: unknown) {
      lease.release();
      throw error;
    }
  }

  private resolveMaterials(
    definition: GlbRoomAssetDefinition,
    nodeIndex: SceneNodeIndex,
  ): ReadonlyMap<string, THREE.Material> {
    const materials = new Map<string, THREE.Material>();

    for (const name of definition.requiredMaterialNames) {
      if (materials.has(name)) {
        throw new Error(
          `Room asset "${definition.id}" declares required material "${name}" more than once.`,
        );
      }

      materials.set(name, nodeIndex.requireMaterial(name));
    }

    return materials;
  }

  private buildCollisionRoot(
    definition: GlbRoomAssetDefinition,
    sceneRoot: THREE.Group,
    nodeIndex: SceneNodeIndex,
  ): THREE.Group {
    const collisionRoot = new THREE.Group();
    collisionRoot.name = `COLLIDER_${definition.id}_Runtime`;
    collisionRoot.visible = false;
    const sources: THREE.Object3D[] = [];

    for (const name of definition.collisionNodeNames) {
      const source = nodeIndex.requireNode(name, 'collision node');

      for (const other of sources) {
        if (this.isDescendant(other, source) || this.isDescendant(source, other)) {
          throw new Error(
            `Room asset "${definition.id}" collision nodes "${other.name}" and "${source.name}" overlap in the scene hierarchy.`,
          );
        }
      }

      sources.push(source);
      source.traverse((node) => node.layers.set(RENDER_LAYERS.debug));
      source.visible = false;
      const collisionClone = this.cloneRelativeToRoot(source, sceneRoot);
      collisionClone.traverse((node) => {
        node.layers.set(RENDER_LAYERS.scene);
        node.visible = true;
      });
      collisionRoot.add(collisionClone);
    }

    collisionRoot.updateMatrixWorld(true);
    return collisionRoot;
  }

  private cloneRelativeToRoot(
    source: THREE.Object3D,
    sceneRoot: THREE.Object3D,
  ): THREE.Object3D {
    sceneRoot.updateMatrixWorld(true);
    source.updateMatrixWorld(true);
    const rootInverse = new THREE.Matrix4().copy(sceneRoot.matrixWorld).invert();
    const relativeMatrix = rootInverse.multiply(source.matrixWorld);
    const clone = source.clone(true);
    relativeMatrix.decompose(clone.position, clone.quaternion, clone.scale);
    clone.updateMatrix();
    return clone;
  }

  private buildAnomalyTargetRegistry(
    definition: GlbRoomAssetDefinition,
    nodeIndex: SceneNodeIndex,
  ): AnomalyTargetRegistry {
    const registry = new AnomalyTargetRegistry();

    for (const targetDefinition of definition.anomalyTargets) {
      const object = nodeIndex.requireNode(
        targetDefinition.nodeName,
        `anomaly target "${targetDefinition.id}"`,
      );
      const interactionVolumes = targetDefinition.interactionNodeNames.map(
        (name) =>
          nodeIndex.requireMesh(
            name,
            `interaction volume for anomaly target "${targetDefinition.id}"`,
          ),
      );
      const primaryInteractionVolume = interactionVolumes[0];

      if (primaryInteractionVolume === undefined) {
        throw new Error(
          `Anomaly target "${targetDefinition.id}" in room asset "${definition.id}" requires at least one named interaction volume.`,
        );
      }

      for (const volume of interactionVolumes) {
        if (!this.isDescendant(object, volume)) {
          throw new Error(
            `Interaction volume "${volume.name}" is not a descendant of anomaly target "${targetDefinition.nodeName}" in room asset "${definition.id}".`,
          );
        }

        volume.layers.set(RENDER_LAYERS.interaction);
      }

      this.validateTargetVariants(
        definition.id,
        targetDefinition,
        object,
        nodeIndex,
      );

      const target: AnomalyTarget = {
        ...targetDefinition,
        object,
        interactionVolume: primaryInteractionVolume,
        interactionVolumes,
        initialState: captureAnomalyTargetInitialState(object),
      };
      registry.register(target);
    }

    return registry;
  }

  private validateTargetVariants(
    roomId: string,
    target: AnomalyTargetDefinition,
    object: THREE.Object3D,
    nodeIndex: SceneNodeIndex,
  ): void {
    const variantIds = new Set<string>();

    for (const variant of target.variants) {
      if (variantIds.has(variant.id)) {
        throw new Error(
          `Anomaly target "${target.id}" in room asset "${roomId}" contains duplicate variant id "${variant.id}".`,
        );
      }

      variantIds.add(variant.id);

      if (!target.allowedKinds.includes(variant.kind)) {
        throw new Error(
          `Variant "${variant.id}" uses disallowed kind "${variant.kind}" for anomaly target "${target.id}" in room asset "${roomId}".`,
        );
      }

      if (variant.kind !== 'color') {
        continue;
      }

      for (const nodeName of variant.nodeNames) {
        const variantNode = nodeIndex.requireNode(
          nodeName,
          `color variant "${variant.id}"`,
        );

        if (!this.isDescendant(object, variantNode)) {
          throw new Error(
            `Color variant node "${nodeName}" is not a descendant of anomaly target "${target.nodeName}" in room asset "${roomId}".`,
          );
        }
      }
    }
  }

  private isDescendant(
    ancestor: THREE.Object3D,
    candidate: THREE.Object3D,
  ): boolean {
    let current: THREE.Object3D | null = candidate;

    while (current !== null) {
      if (current === ancestor) {
        return true;
      }

      current = current.parent;
    }

    return false;
  }

  private validateDefinition(definition: GlbRoomAssetDefinition): void {
    if (definition.id.trim().length === 0) {
      throw new Error('A GLB room asset must have a non-empty stable id.');
    }

    if (definition.roomRootNodeName.trim().length === 0) {
      throw new Error(
        `Room asset "${definition.id}" must declare a room root node name.`,
      );
    }

    if (definition.collisionNodeNames.length === 0) {
      throw new Error(
        `Room asset "${definition.id}" must declare at least one collision node.`,
      );
    }

    if (
      new Set(definition.collisionNodeNames).size !==
      definition.collisionNodeNames.length
    ) {
      throw new Error(
        `Room asset "${definition.id}" contains duplicate collision node names.`,
      );
    }
  }
}
