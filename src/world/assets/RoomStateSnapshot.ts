import * as THREE from 'three';

interface NodeState {
  readonly node: THREE.Object3D;
  readonly parent: THREE.Object3D | null;
  readonly name: string;
  readonly position: readonly [number, number, number];
  readonly quaternion: readonly [number, number, number, number];
  readonly scale: readonly [number, number, number];
  readonly visible: boolean;
  readonly layerMask: number;
  readonly renderOrder: number;
  readonly materialWasArray: boolean;
  readonly materials: readonly THREE.Material[];
}

interface MaterialState {
  readonly material: THREE.Material;
  readonly color: readonly [number, number, number] | null;
  readonly emissive: readonly [number, number, number] | null;
  readonly opacity: number;
  readonly transparent: boolean;
  readonly visible: boolean;
}

interface LightState {
  readonly light: THREE.Light;
  readonly intensity: number;
  readonly color: readonly [number, number, number];
}

type MaterialWithColors = THREE.Material & {
  color?: THREE.Color;
  emissive?: THREE.Color;
};

export class RoomStateSnapshot {
  private readonly nodes: readonly NodeState[];
  private readonly capturedNodes: ReadonlySet<THREE.Object3D>;
  private readonly materials: readonly MaterialState[];
  private readonly lights: readonly LightState[];

  public constructor(private readonly root: THREE.Object3D) {
    const nodes: NodeState[] = [];
    const materialStates = new Map<THREE.Material, MaterialState>();
    const lights: LightState[] = [];

    root.traverse((node) => {
      const mesh = node as THREE.Mesh;
      const nodeMaterials = mesh.isMesh
        ? Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]
        : [];

      nodes.push({
        node,
        parent: node === root ? null : node.parent,
        name: node.name,
        position: [node.position.x, node.position.y, node.position.z],
        quaternion: [
          node.quaternion.x,
          node.quaternion.y,
          node.quaternion.z,
          node.quaternion.w,
        ],
        scale: [node.scale.x, node.scale.y, node.scale.z],
        visible: node.visible,
        layerMask: node.layers.mask,
        renderOrder: node.renderOrder,
        materialWasArray: mesh.isMesh && Array.isArray(mesh.material),
        materials: [...nodeMaterials],
      });

      for (const material of nodeMaterials) {
        if (!materialStates.has(material)) {
          materialStates.set(material, this.captureMaterial(material));
        }
      }

      const light = node as THREE.Light;

      if (light.isLight) {
        lights.push({
          light,
          intensity: light.intensity,
          color: [light.color.r, light.color.g, light.color.b],
        });
      }
    });

    this.nodes = nodes;
    this.capturedNodes = new Set(nodes.map((state) => state.node));
    this.materials = [...materialStates.values()];
    this.lights = lights;
  }

  public restore(): void {
    const currentNodes: THREE.Object3D[] = [];
    this.root.traverse((node) => currentNodes.push(node));

    for (const node of currentNodes.reverse()) {
      if (!this.capturedNodes.has(node)) {
        node.removeFromParent();
      }
    }

    for (const state of this.nodes) {
      if (
        state.node !== this.root &&
        state.parent !== null &&
        state.node.parent !== state.parent
      ) {
        state.parent.add(state.node);
      }

      state.node.name = state.name;
      state.node.position.fromArray(state.position);
      state.node.quaternion.fromArray(state.quaternion);
      state.node.scale.fromArray(state.scale);
      state.node.visible = state.visible;
      state.node.layers.mask = state.layerMask;
      state.node.renderOrder = state.renderOrder;

      const mesh = state.node as THREE.Mesh;

      if (mesh.isMesh && state.materials.length > 0) {
        mesh.material = state.materialWasArray
          ? [...state.materials]
          : (state.materials[0] as THREE.Material);
      }
    }

    for (const state of this.materials) {
      const material = state.material as MaterialWithColors;
      this.restoreColor(material.color, state.color);
      this.restoreColor(material.emissive, state.emissive);
      material.opacity = state.opacity;
      material.transparent = state.transparent;
      material.visible = state.visible;
      material.needsUpdate = true;
    }

    for (const state of this.lights) {
      state.light.intensity = state.intensity;
      state.light.color.fromArray(state.color);
    }

    this.root.updateMatrixWorld(true);
  }

  private captureMaterial(material: THREE.Material): MaterialState {
    const materialWithColors = material as MaterialWithColors;
    return {
      material,
      color: this.captureColor(materialWithColors.color),
      emissive: this.captureColor(materialWithColors.emissive),
      opacity: material.opacity,
      transparent: material.transparent,
      visible: material.visible,
    };
  }

  private captureColor(
    color: THREE.Color | undefined,
  ): readonly [number, number, number] | null {
    return color?.isColor === true ? [color.r, color.g, color.b] : null;
  }

  private restoreColor(
    color: THREE.Color | undefined,
    snapshot: readonly [number, number, number] | null,
  ): void {
    if (color?.isColor === true && snapshot !== null) {
      color.fromArray(snapshot);
    }
  }
}
