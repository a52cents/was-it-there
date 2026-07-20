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
  public constructor(private readonly threshold: ExitThresholdDefinition) {
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
  }

  public hasCrossed(position: ExitThresholdPosition): boolean {
    if (!Number.isFinite(position.x) || !Number.isFinite(position.z)) {
      return false;
    }

    if ('x' in this.threshold) {
      return (
        position.x >= this.threshold.x &&
        position.z >= this.threshold.minimumZ &&
        position.z <= this.threshold.maximumZ
      );
    }

    const crossed = this.threshold.crossing === 'negative-z'
      ? position.z <= this.threshold.z
      : position.z >= this.threshold.z;
    return (
      crossed &&
      position.x >= this.threshold.minimumX &&
      position.x <= this.threshold.maximumX
    );
  }
}
