import * as THREE from 'three';

const INITIAL_FIELD_OF_VIEW = 70;

export class CameraManager {
  public readonly camera: THREE.PerspectiveCamera;

  public constructor() {
    this.camera = new THREE.PerspectiveCamera(
      INITIAL_FIELD_OF_VIEW,
      1,
      0.1,
      100,
    );
  }

  public updateAspect(width: number, height: number): void {
    if (width <= 0 || height <= 0) {
      return;
    }

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
