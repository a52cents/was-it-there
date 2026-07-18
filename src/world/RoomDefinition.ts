export interface TransformDefinition {
  readonly position: readonly [number, number, number];
  readonly rotation?: readonly [number, number, number];
  readonly scale?: readonly [number, number, number];
}

export interface RoomDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly observationDurationMs: number;
  readonly searchDurationMs: number;
  readonly anomalyCount: {
    readonly min: number;
    readonly max: number;
  };
  readonly playerSpawn: {
    readonly position: readonly [number, number, number];
    readonly yaw: number;
    readonly pitch: number;
  };
}
