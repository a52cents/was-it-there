import * as THREE from 'three';
import type { InputManager } from '../input/InputManager';
import { PLAYER_CONFIG, type PlayerConfig } from './PlayerConfig';

type MovementInput = Pick<InputManager, 'isActionPressed'>;

const WORLD_UP = new THREE.Vector3(0, 1, 0);

export class PlayerMovement {
  private readonly localDirection = new THREE.Vector3();
  private readonly movementDirection = new THREE.Vector3();
  private readonly targetVelocity = new THREE.Vector3();
  private readonly currentVelocity = new THREE.Vector3();
  private readonly previousVelocity = new THREE.Vector3();
  private readonly velocityDifference = new THREE.Vector3();
  private readonly displacement = new THREE.Vector3();
  private readonly collisionNormal = new THREE.Vector3();
  private fastMovementActive = false;

  public constructor(
    private readonly input: MovementInput,
    private readonly config: PlayerConfig = PLAYER_CONFIG,
  ) {}

  public update(
    deltaSeconds: number,
    yaw: number,
    movementEnabled = true,
  ): Readonly<THREE.Vector3> {
    this.displacement.set(0, 0, 0);

    if (!movementEnabled) {
      this.reset();
      return this.displacement;
    }

    this.updateTargetVelocity(yaw);

    const safeDeltaSeconds = this.sanitizeDelta(deltaSeconds);

    if (safeDeltaSeconds === 0) {
      return this.displacement;
    }

    const rate =
      this.movementDirection.lengthSq() > 0
        ? this.config.acceleration
        : this.config.deceleration;

    this.advanceVelocityAndCalculateDisplacement(rate, safeDeltaSeconds);
    this.displacement.y = 0;

    if (!this.isFiniteVector(this.displacement)) {
      this.reset();
    }

    return this.displacement;
  }

  public reset(): void {
    this.localDirection.set(0, 0, 0);
    this.movementDirection.set(0, 0, 0);
    this.targetVelocity.set(0, 0, 0);
    this.currentVelocity.set(0, 0, 0);
    this.previousVelocity.set(0, 0, 0);
    this.velocityDifference.set(0, 0, 0);
    this.displacement.set(0, 0, 0);
    this.fastMovementActive = false;
  }

  public getCurrentVelocity(): Readonly<THREE.Vector3> {
    return this.currentVelocity;
  }

  public getTargetVelocity(): Readonly<THREE.Vector3> {
    return this.targetVelocity;
  }

  public getMovementDirection(): Readonly<THREE.Vector3> {
    return this.movementDirection;
  }

  public getCurrentSpeed(): number {
    return this.currentVelocity.length();
  }

  public isFastMovementActive(): boolean {
    return this.fastMovementActive;
  }

  public resolveCollision(normal: Readonly<THREE.Vector3>): void {
    this.collisionNormal.set(normal.x, 0, normal.z);

    if (this.collisionNormal.lengthSq() === 0) {
      return;
    }

    this.collisionNormal.normalize();
    const velocityIntoSurface = this.currentVelocity.dot(
      this.collisionNormal,
    );

    if (velocityIntoSurface < 0) {
      // Remove only the component entering the wall. Tangential velocity is
      // preserved, which produces cinematic sliding without bounce.
      this.currentVelocity.addScaledVector(
        this.collisionNormal,
        -velocityIntoSurface,
      );
    }
  }

  private updateTargetVelocity(yaw: number): void {
    const horizontalInput =
      Number(this.input.isActionPressed('move-right')) -
      Number(this.input.isActionPressed('move-left'));
    const forwardInput =
      Number(this.input.isActionPressed('move-backward')) -
      Number(this.input.isActionPressed('move-forward'));

    this.localDirection.set(horizontalInput, 0, forwardInput);

    if (this.localDirection.lengthSq() > 1) {
      this.localDirection.normalize();
    }

    const safeYaw = Number.isFinite(yaw) ? yaw : 0;
    this.movementDirection
      .copy(this.localDirection)
      .applyAxisAngle(WORLD_UP, safeYaw);
    this.movementDirection.y = 0;

    this.fastMovementActive = this.input.isActionPressed('move-fast');
    const speed = this.fastMovementActive
      ? this.config.fastSpeed
      : this.config.walkSpeed;
    this.targetVelocity.copy(this.movementDirection).multiplyScalar(speed);
  }

  private advanceVelocityAndCalculateDisplacement(
    rate: number,
    deltaSeconds: number,
  ): void {
    this.previousVelocity.copy(this.currentVelocity);
    this.velocityDifference.subVectors(
      this.targetVelocity,
      this.currentVelocity,
    );
    const distance = this.velocityDifference.length();

    if (distance === 0 || rate <= 0) {
      this.displacement
        .copy(this.currentVelocity)
        .multiplyScalar(deltaSeconds);
      return;
    }

    const accelerationDuration = distance / rate;

    if (accelerationDuration <= deltaSeconds) {
      this.currentVelocity.copy(this.targetVelocity);
      this.displacement
        .addVectors(this.previousVelocity, this.currentVelocity)
        .multiplyScalar(0.5 * accelerationDuration)
        .addScaledVector(
          this.currentVelocity,
          deltaSeconds - accelerationDuration,
        );
      return;
    }

    this.currentVelocity.addScaledVector(
      this.velocityDifference,
      (rate * deltaSeconds) / distance,
    );
    this.displacement
      .addVectors(this.previousVelocity, this.currentVelocity)
      .multiplyScalar(0.5 * deltaSeconds);
  }

  private sanitizeDelta(deltaSeconds: number): number {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return 0;
    }

    return Math.min(deltaSeconds, this.config.maximumDeltaSeconds);
  }

  private isFiniteVector(vector: Readonly<THREE.Vector3>): boolean {
    return (
      Number.isFinite(vector.x) &&
      Number.isFinite(vector.y) &&
      Number.isFinite(vector.z)
    );
  }
}
