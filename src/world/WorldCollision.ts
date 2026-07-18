import type * as THREE from 'three';
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
