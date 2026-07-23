import * as THREE from 'three';

export interface EastWestExitThresholdDefinition {
  readonly x: number;
  readonly minimumZ: number;
  readonly maximumZ: number;
}

export interface NorthSouthExitThresholdDefinition {
  readonly z: number;
  readonly minimumX: number;
  readonly maximumX: number;
  readonly crossing: 'negative-z' | 'positive-z';
}

export type ExitThresholdDefinition =
  | EastWestExitThresholdDefinition
  | NorthSouthExitThresholdDefinition;

export interface ExitThresholdPosition {
  readonly x: number;
  readonly z: number;
}

export class ExitThresholdDetector {
  private readonly worldToThresholdSpace: THREE.Matrix4 | null;
  private readonly localPosition = new THREE.Vector3();

  public constructor(
    private readonly threshold: ExitThresholdDefinition,
    thresholdWorldMatrix?: THREE.Matrix4,
  ) {
    const valid = 'x' in threshold
      ? Number.isFinite(threshold.x) &&
        Number.isFinite(threshold.minimumZ) &&
        Number.isFinite(threshold.maximumZ) &&
        threshold.minimumZ < threshold.maximumZ
      : Number.isFinite(threshold.z) &&
        Number.isFinite(threshold.minimumX) &&
        Number.isFinite(threshold.maximumX) &&
        threshold.minimumX < threshold.maximumX;

    if (!valid) {
      throw new RangeError('Exit threshold bounds are invalid.');
    }

    this.worldToThresholdSpace = thresholdWorldMatrix === undefined
      ? null
      : thresholdWorldMatrix.clone().invert();
  }

  public hasCrossed(position: ExitThresholdPosition): boolean {
    if (!Number.isFinite(position.x) || !Number.isFinite(position.z)) {
      return false;
    }

    const testedPosition = this.worldToThresholdSpace === null
      ? position
      : this.localPosition
          .set(position.x, 0, position.z)
          .applyMatrix4(this.worldToThresholdSpace);

    if ('x' in this.threshold) {
      return (
        testedPosition.x >= this.threshold.x &&
        testedPosition.z >= this.threshold.minimumZ &&
        testedPosition.z <= this.threshold.maximumZ
      );
    }

    const crossed = this.threshold.crossing === 'negative-z'
      ? testedPosition.z <= this.threshold.z
      : testedPosition.z >= this.threshold.z;
    return (
      crossed &&
      testedPosition.x >= this.threshold.minimumX &&
      testedPosition.x <= this.threshold.maximumX
    );
  }
}
