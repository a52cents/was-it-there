export interface ExitThresholdDefinition {
  readonly x: number;
  readonly minimumZ: number;
  readonly maximumZ: number;
}

export interface ExitThresholdPosition {
  readonly x: number;
  readonly z: number;
}

export class ExitThresholdDetector {
  public constructor(private readonly threshold: ExitThresholdDefinition) {
    if (
      !Number.isFinite(threshold.x) ||
      !Number.isFinite(threshold.minimumZ) ||
      !Number.isFinite(threshold.maximumZ) ||
      threshold.minimumZ >= threshold.maximumZ
    ) {
      throw new RangeError('Exit threshold bounds are invalid.');
    }
  }

  public hasCrossed(position: ExitThresholdPosition): boolean {
    return (
      Number.isFinite(position.x) &&
      Number.isFinite(position.z) &&
      position.x >= this.threshold.x &&
      position.z >= this.threshold.minimumZ &&
      position.z <= this.threshold.maximumZ
    );
  }
}
