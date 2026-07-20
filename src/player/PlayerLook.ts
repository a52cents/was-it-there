import type * as THREE from 'three';
import type { InputManager } from '../input/InputManager';
import { PLAYER_CONFIG, type PlayerConfig } from './PlayerConfig';

type PointerInput = Pick<InputManager, 'getPointerDelta'>;
type PointerLockReader = () => boolean;

const FULL_ROTATION = Math.PI * 2;

function normalizeYaw(yaw: number): number {
  return ((yaw + Math.PI) % FULL_ROTATION + FULL_ROTATION) % FULL_ROTATION - Math.PI;
}

export class PlayerLook {
  private yaw = 0;
  private pitch = 0;
  private sensitivityMultiplier = 1;

  public constructor(
    private readonly input: PointerInput,
    private readonly isPointerLocked: PointerLockReader,
    private readonly config: PlayerConfig = PLAYER_CONFIG,
  ) {}

  public update(pointerLocked = this.isPointerLocked()): void {
    if (!pointerLocked) {
      return;
    }

    const pointerDelta = this.input.getPointerDelta();

    // Three.js cameras face local -Z. Negative Y rotation therefore turns
    // right, while positive X rotation looks up. Euler order YXZ prevents
    // pitch from introducing roll.
    if (Number.isFinite(pointerDelta.x)) {
      this.yaw = normalizeYaw(
        this.yaw -
          pointerDelta.x *
            this.config.mouseSensitivity *
            this.sensitivityMultiplier,
      );
    }

    if (Number.isFinite(pointerDelta.y)) {
      this.pitch = this.clampPitch(
        this.pitch -
          pointerDelta.y *
            this.config.mouseSensitivity *
            this.sensitivityMultiplier,
      );
    }
  }

  public setSensitivityMultiplier(multiplier: number): void {
    this.sensitivityMultiplier =
      Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
  }

  public reset(yaw = 0, pitch = 0): void {
    this.yaw = Number.isFinite(yaw) ? normalizeYaw(yaw) : 0;
    this.pitch = Number.isFinite(pitch) ? this.clampPitch(pitch) : 0;
  }

  public applyRotation(rotation: THREE.Euler): void {
    rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  public getYaw(): number {
    return this.yaw;
  }

  public getPitch(): number {
    return this.pitch;
  }

  private clampPitch(pitch: number): number {
    return Math.min(
      this.config.maximumPitch,
      Math.max(this.config.minimumPitch, pitch),
    );
  }
}
