import * as THREE from 'three';
import type { Capsule } from 'three/addons/math/Capsule.js';
import { Octree } from 'three/addons/math/Octree.js';

export interface CapsuleCollisionResult {
  readonly normal: THREE.Vector3;
  readonly depth: number;
}

const MINIMUM_PENETRATION_DEPTH = 1e-8;

export class WorldCollision {
  private octree = new Octree();
  private sourceRoot: THREE.Object3D | null = null;
  private ready = false;
  private sourceTriangleCount = 0;

  public buildFromObject(root: THREE.Object3D): void {
    this.clear();
    root.updateMatrixWorld(true);
    this.sourceTriangleCount = this.countSourceTriangles(root);
    this.octree.fromGraphNode(root);
    this.sourceRoot = root;
    this.ready = true;
  }

  public buildFromObjects(roots: readonly THREE.Object3D[]): void {
    if (roots.length === 1 && roots[0] !== undefined) {
      this.buildFromObject(roots[0]);
      return;
    }

    this.clear();

    if (roots.length === 0) {
      return;
    }

    const combinedRoot = new THREE.Group();
    combinedRoot.name = 'COLLIDER_CombinedRoomRoot';

    for (const root of roots) {
      root.updateWorldMatrix(true, true);
      this.sourceTriangleCount += this.countSourceTriangles(root);
      const clone = root.clone(true);
      root.matrixWorld.decompose(
        clone.position,
        clone.quaternion,
        clone.scale,
      );
      combinedRoot.add(clone);
    }

    this.octree.fromGraphNode(combinedRoot);
    this.sourceRoot = roots.length === 1
      ? roots[0] ?? null
      : combinedRoot;
    this.ready = true;
  }

  public buildVariantsFromObject(
    root: THREE.Object3D,
    variant: WorldCollision,
    excludedVariantRoots: readonly THREE.Object3D[],
  ): void {
    if (variant === this) {
      throw new Error('Collision variants require distinct worlds.');
    }

    this.clear();
    variant.clear();
    root.updateWorldMatrix(true, true);
    const excludedRoots = new Set(excludedVariantRoots);

    root.traverse((object) => {
      const mesh = object as THREE.Mesh;

      if (!mesh.isMesh || !this.octree.layers.test(mesh.layers)) {
        return;
      }

      const position = mesh.geometry.getAttribute('position');
      const index = mesh.geometry.index;
      const triangleCount = (index?.count ?? position.count) / 3;
      const excludedFromVariant = hasExcludedAncestor(
        object,
        root,
        excludedRoots,
      );
      this.sourceTriangleCount += triangleCount;

      if (!excludedFromVariant) {
        variant.sourceTriangleCount += triangleCount;
      }

      for (let offset = 0; offset < triangleCount * 3; offset += 3) {
        const firstIndex = index?.getX(offset) ?? offset;
        const secondIndex = index?.getX(offset + 1) ?? offset + 1;
        const thirdIndex = index?.getX(offset + 2) ?? offset + 2;
        const triangle = new THREE.Triangle(
          new THREE.Vector3()
            .fromBufferAttribute(position, firstIndex)
            .applyMatrix4(mesh.matrixWorld),
          new THREE.Vector3()
            .fromBufferAttribute(position, secondIndex)
            .applyMatrix4(mesh.matrixWorld),
          new THREE.Vector3()
            .fromBufferAttribute(position, thirdIndex)
            .applyMatrix4(mesh.matrixWorld),
        );
        this.octree.addTriangle(triangle);

        if (!excludedFromVariant) {
          variant.octree.addTriangle(triangle);
        }
      }
    });

    this.octree.build();
    variant.octree.build();
    this.sourceRoot = root;
    variant.sourceRoot = root;
    this.ready = true;
    variant.ready = true;
  }

  public adoptFrom(
    source: WorldCollision,
    sourceRoot: THREE.Object3D,
  ): void {
    if (source === this || !source.isReady()) {
      throw new Error('A ready, distinct collision world is required.');
    }

    this.clear();
    this.octree = source.octree;
    this.sourceRoot = sourceRoot;
    this.ready = true;
    this.sourceTriangleCount = source.sourceTriangleCount;
    source.octree = new Octree();
    source.sourceRoot = null;
    source.ready = false;
    source.sourceTriangleCount = 0;
  }

  public intersectCapsule(
    capsule: Capsule,
  ): CapsuleCollisionResult | null {
    if (!this.ready) {
      return null;
    }

    const intersection = this.octree.capsuleIntersect(capsule);
    // Octree can return a zero or floating-point-scale depth when the capsule
    // is merely tangent to adjacent triangles (typically floor + wall). This
    // is contact, not penetration, and requires no correction.
    return (
      intersection === false ||
      intersection.depth <= MINIMUM_PENETRATION_DEPTH
    )
      ? null
      : intersection;
  }

  public clear(): void {
    this.octree.clear();
    this.octree = new Octree();
    this.sourceRoot = null;
    this.ready = false;
    this.sourceTriangleCount = 0;
  }

  public isReady(): boolean {
    return this.ready;
  }

  public getSourceRoot(): THREE.Object3D | null {
    return this.sourceRoot;
  }

  public getTriangleCount(): number {
    return this.sourceTriangleCount;
  }

  private countSourceTriangles(root: THREE.Object3D): number {
    let triangleCount = 0;

    root.traverse((object) => {
      const mesh = object as THREE.Mesh;

      if (!mesh.isMesh) {
        return;
      }

      if (!this.octree.layers.test(mesh.layers)) {
        return;
      }

      const position = mesh.geometry.getAttribute('position');
      triangleCount += (mesh.geometry.index?.count ?? position.count) / 3;
    });

    return triangleCount;
  }
}

function hasExcludedAncestor(
  object: THREE.Object3D,
  root: THREE.Object3D,
  excludedRoots: ReadonlySet<THREE.Object3D>,
): boolean {
  let candidate: THREE.Object3D | null = object;

  while (candidate !== null) {
    if (excludedRoots.has(candidate)) {
      return true;
    }

    if (candidate === root) {
      return false;
    }

    candidate = candidate.parent;
  }

  return false;
}
