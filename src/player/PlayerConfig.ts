export interface PlayerConfig {
  readonly eyeHeight: number;
  readonly capsuleRadius: number;
  readonly capsuleHeight: number;
  readonly walkSpeed: number;
  readonly fastSpeed: number;
  readonly acceleration: number;
  readonly deceleration: number;
  readonly gravity: number;
  readonly maximumFallSpeed: number;
  readonly collisionIterations: number;
  readonly groundNormalMinimum: number;
  readonly mouseSensitivity: number;
  readonly minimumPitch: number;
  readonly maximumPitch: number;
  readonly maximumDeltaSeconds: number;
  readonly respawnHeight: number;
}

export interface PlayerSpawn {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw?: number;
  readonly pitch?: number;
}

export const PLAYER_CONFIG = {
  eyeHeight: 1.65,
  capsuleRadius: 0.3,
  capsuleHeight: 1.75,
  walkSpeed: 2.6,
  fastSpeed: 3.8,
  acceleration: 18,
  deceleration: 22,
  gravity: 18,
  maximumFallSpeed: 20,
  collisionIterations: 3,
  // Normals above this value are walkable ground; walls and ceilings are not.
  groundNormalMinimum: 0.5,
  mouseSensitivity: 0.002,
  minimumPitch: -Math.PI / 2 + 0.05,
  maximumPitch: Math.PI / 2 - 0.05,
  maximumDeltaSeconds: 0.1,
  respawnHeight: -10,
} as const satisfies PlayerConfig;

export const DEFAULT_PLAYER_SPAWN = {
  x: 0,
  y: 0,
  z: 3,
  yaw: 0,
  pitch: 0,
} as const satisfies PlayerSpawn;
