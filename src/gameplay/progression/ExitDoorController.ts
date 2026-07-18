import type * as THREE from 'three';

export type ExitDoorState = 'locked' | 'opening' | 'open';

export interface ExitDoorSnapshot {
  readonly state: ExitDoorState;
  readonly progress: number;
  readonly collisionEnabled: boolean;
}

export interface ExitDoorControllerOptions {
  readonly getDoor: () => THREE.Object3D | null;
  readonly setCollisionEnabled: (enabled: boolean) => void;
  readonly setPortalProgress: (progress: number) => void;
  readonly openingDurationMs?: number;
  readonly openAngleRadians?: number;
  readonly collisionReleaseProgress?: number;
}

const DEFAULT_OPENING_DURATION_MS = 900;
const DEFAULT_OPEN_ANGLE_RADIANS = Math.PI / 2;
const DEFAULT_COLLISION_RELEASE_PROGRESS = 0.35;

export class ExitDoorController {
  private readonly openingDurationMs: number;
  private readonly openAngleRadians: number;
  private readonly collisionReleaseProgress: number;
  private state: ExitDoorState = 'locked';
  private progress = 0;

  public constructor(private readonly options: ExitDoorControllerOptions) {
    this.openingDurationMs =
      options.openingDurationMs ?? DEFAULT_OPENING_DURATION_MS;
    this.openAngleRadians =
      options.openAngleRadians ?? DEFAULT_OPEN_ANGLE_RADIANS;
    this.collisionReleaseProgress =
      options.collisionReleaseProgress ??
      DEFAULT_COLLISION_RELEASE_PROGRESS;

    if (
      !Number.isFinite(this.openingDurationMs) ||
      this.openingDurationMs <= 0 ||
      !Number.isFinite(this.openAngleRadians) ||
      this.openAngleRadians <= 0 ||
      !Number.isFinite(this.collisionReleaseProgress) ||
      this.collisionReleaseProgress < 0 ||
      this.collisionReleaseProgress > 1
    ) {
      throw new RangeError('Exit-door animation options are invalid.');
    }

    this.applyCurrentState();
  }

  public unlock(): boolean {
    if (this.state !== 'locked') {
      return false;
    }

    this.state = 'opening';
    this.applyCurrentState();
    return true;
  }

  public update(deltaSeconds: number): void {
    if (this.state === 'locked') {
      return;
    }

    if (this.state === 'opening') {
      const safeDeltaSeconds =
        Number.isFinite(deltaSeconds) && deltaSeconds > 0
          ? deltaSeconds
          : 0;
      this.progress = Math.min(
        1,
        this.progress +
          (safeDeltaSeconds * 1_000) / this.openingDurationMs,
      );

      if (this.progress >= 1) {
        this.state = 'open';
      }
    }

    this.applyCurrentState();
  }

  public reset(): void {
    this.state = 'locked';
    this.progress = 0;
    this.applyCurrentState();
  }

  public getSnapshot(): ExitDoorSnapshot {
    return {
      state: this.state,
      progress: this.progress,
      collisionEnabled:
        this.state === 'locked' ||
        this.progress < this.collisionReleaseProgress,
    };
  }

  private applyCurrentState(): void {
    const door = this.options.getDoor();

    if (door === null) {
      throw new Error('Cannot control an unavailable exit door.');
    }

    const easedProgress = 1 - (1 - this.progress) ** 3;
    door.rotation.y = easedProgress * this.openAngleRadians;
    this.options.setCollisionEnabled(
      this.state === 'locked' ||
        this.progress < this.collisionReleaseProgress,
    );
    this.options.setPortalProgress(easedProgress);
  }
}
