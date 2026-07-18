import * as THREE from 'three';

export class SceneNodeIndex {
  private readonly nodesByName = new Map<string, THREE.Object3D[]>();
  private readonly materialsByName = new Map<string, THREE.Material[]>();

  public constructor(
    root: THREE.Object3D,
    private readonly assetLabel: string,
  ) {
    root.traverse((node) => {
      if (node.name.length > 0) {
        this.addUniqueReference(this.nodesByName, node.name, node);
      }

      const mesh = node as THREE.Mesh;

      if (!mesh.isMesh) {
        return;
      }

      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];

      for (const material of materials) {
        if (material.name.length > 0) {
          this.addUniqueReference(
            this.materialsByName,
            material.name,
            material,
          );
        }
      }
    });
  }

  public requireNode(name: string, purpose = 'node'): THREE.Object3D {
    return this.requireUnique(this.nodesByName, name, purpose);
  }

  public requireMesh(name: string, purpose = 'mesh'): THREE.Mesh {
    const node = this.requireNode(name, purpose) as THREE.Mesh;

    if (!node.isMesh) {
      throw new Error(
        `Room asset "${this.assetLabel}" requires "${name}" to be a mesh for ${purpose}.`,
      );
    }

    return node;
  }

  public requireMaterial(name: string): THREE.Material {
    return this.requireUnique(this.materialsByName, name, 'material');
  }

  private requireUnique<T>(
    index: ReadonlyMap<string, readonly T[]>,
    name: string,
    purpose: string,
  ): T {
    if (name.trim().length === 0) {
      throw new Error(
        `Room asset "${this.assetLabel}" has an empty required ${purpose} name.`,
      );
    }

    const matches = index.get(name) ?? [];

    if (matches.length === 0) {
      throw new Error(
        `Room asset "${this.assetLabel}" is missing required ${purpose} "${name}".`,
      );
    }

    if (matches.length > 1) {
      throw new Error(
        `Room asset "${this.assetLabel}" contains ${matches.length} objects named "${name}"; ${purpose} names must be unique.`,
      );
    }

    return matches[0] as T;
  }

  private addUniqueReference<T>(
    index: Map<string, T[]>,
    name: string,
    value: T,
  ): void {
    const values = index.get(name);

    if (values === undefined) {
      index.set(name, [value]);
      return;
    }

    if (!values.includes(value)) {
      values.push(value);
    }
  }
}
