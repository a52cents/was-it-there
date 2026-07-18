import * as THREE from 'three';
import { RENDER_LAYERS } from '../../rendering/RenderLayers';

const HIGHLIGHT_DURATION_MS = 650;
const CORRECT_COLOR = 0x72c98d;
const MISSED_COLOR = 0xff4d42;
const AIM_COLOR = 0xe8c35a;

export class TargetReportHighlight {
  private readonly helper: THREE.BoxHelper;
  private readonly aimHelper: THREE.BoxHelper;
  private readonly bounds = new THREE.Box3();
  private readonly meshBounds = new THREE.Box3();
  private target: THREE.Object3D | null = null;
  private aimedTarget: THREE.Object3D | null = null;
  private hideAt = 0;
  private persistent = false;

  public constructor(scene: THREE.Scene) {
    this.helper = new THREE.BoxHelper(scene, CORRECT_COLOR);
    this.helper.name = 'REPORT_CorrectTargetHighlight';
    this.helper.visible = false;
    this.helper.renderOrder = 20;
    this.helper.material.depthTest = false;
    this.helper.material.transparent = true;
    this.helper.material.opacity = 0.95;
    this.aimHelper = new THREE.BoxHelper(scene, AIM_COLOR);
    this.aimHelper.name = 'REPORT_AimedTargetHighlight';
    this.aimHelper.visible = false;
    this.aimHelper.renderOrder = 19;
    this.aimHelper.material.depthTest = false;
    this.aimHelper.material.transparent = true;
    this.aimHelper.material.opacity = 0.72;
    scene.add(this.aimHelper, this.helper);
  }

  public setAimedTarget(target: THREE.Object3D | null): void {
    this.aimedTarget = target;

    if (target === null) {
      this.aimHelper.visible = false;
      return;
    }

    this.updateHelperBounds(this.aimHelper, target);
    this.aimHelper.visible = !this.helper.visible;
  }

  public show(target: THREE.Object3D, now = performance.now()): void {
    this.target = target;
    this.hideAt = now + HIGHLIGHT_DURATION_MS;
    this.persistent = false;
    this.helper.material.color.setHex(CORRECT_COLOR);
    this.updateHelperBounds(this.helper, target);
    this.helper.visible = true;
    this.aimHelper.visible = false;
  }

  public showMissed(target: THREE.Object3D): void {
    this.target = target;
    this.hideAt = 0;
    this.persistent = true;
    this.helper.material.color.setHex(MISSED_COLOR);
    this.updateHelperBounds(this.helper, target);
    this.helper.visible = true;
    this.aimHelper.visible = false;
  }

  public update(now = performance.now()): void {
    if (this.helper.visible && this.target !== null) {
      if (!this.persistent && now >= this.hideAt) {
        this.hideReportHighlight();
      } else {
        this.updateHelperBounds(this.helper, this.target);
      }
    }

    if (this.aimedTarget !== null && !this.helper.visible) {
      this.updateHelperBounds(this.aimHelper, this.aimedTarget);
      this.aimHelper.visible = true;
    }
  }

  public reset(): void {
    this.target = null;
    this.hideAt = 0;
    this.persistent = false;
    this.helper.visible = false;
    this.aimedTarget = null;
    this.aimHelper.visible = false;
  }

  public dispose(scene: THREE.Scene): void {
    scene.remove(this.helper, this.aimHelper);
    this.helper.geometry.dispose();
    this.helper.material.dispose();
    this.aimHelper.geometry.dispose();
    this.aimHelper.material.dispose();
  }

  private hideReportHighlight(): void {
    this.target = null;
    this.hideAt = 0;
    this.persistent = false;
    this.helper.visible = false;
  }

  private updateHelperBounds(
    helper: THREE.BoxHelper,
    target: THREE.Object3D,
  ): void {
    target.updateWorldMatrix(true, true);
    this.bounds.makeEmpty();
    let meshCount = this.expandBoundsFromMeshes(target, true);

    if (meshCount === 0) {
      meshCount = this.expandBoundsFromMeshes(target, false);
    }

    if (meshCount === 0 || this.bounds.isEmpty()) {
      helper.visible = false;
      return;
    }

    const { min, max } = this.bounds;
    const position = helper.geometry.getAttribute(
      'position',
    ) as THREE.BufferAttribute;
    const array = position.array;
    const corners = [
      max.x, max.y, max.z,
      min.x, max.y, max.z,
      min.x, min.y, max.z,
      max.x, min.y, max.z,
      max.x, max.y, min.z,
      min.x, max.y, min.z,
      min.x, min.y, min.z,
      max.x, min.y, min.z,
    ];

    for (const [index, value] of corners.entries()) {
      array[index] = value;
    }

    position.needsUpdate = true;
    helper.geometry.computeBoundingSphere();
  }

  private expandBoundsFromMeshes(
    target: THREE.Object3D,
    sceneMeshes: boolean,
  ): number {
    let meshCount = 0;
    target.traverse((object) => {
      const mesh = object as THREE.Mesh;

      if (
        mesh.isMesh &&
        mesh.visible &&
        mesh.layers.isEnabled(RENDER_LAYERS.scene) === sceneMeshes
      ) {
        if (mesh.geometry.boundingBox === null) {
          mesh.geometry.computeBoundingBox();
        }

        const geometryBounds = mesh.geometry.boundingBox;

        if (geometryBounds !== null) {
          this.meshBounds.copy(geometryBounds).applyMatrix4(mesh.matrixWorld);
          this.bounds.union(this.meshBounds);
          meshCount += 1;
        }
      }
    });
    return meshCount;
  }
}
