import * as THREE from 'three';
import type { InputManager } from '../input/InputManager';
import { WorldCollision } from '../world/WorldCollision';
import { PlayerCollider } from './PlayerCollider';
import {
  DEFAULT_PLAYER_SPAWN,
  PLAYER_CONFIG,
  type PlayerConfig,
  type PlayerSpawn,
} from './PlayerConfig';
import { PlayerLook } from './PlayerLook';
import { PlayerMovement } from './PlayerMovement';

interface ResolvedPlayerSpawn {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  readonly pitch: number;
}

type PlayerInput = Pick<
  InputManager,
  'getPointerDelta' | 'isActionPressed'
>;
type PointerLockReader = () => boolean;

export class PlayerController {
  private readonly initialSpawn: ResolvedPlayerSpawn;
  private readonly look: PlayerLook;
  private readonly movement: PlayerMovement;
  private readonly collider: PlayerCollider;
  private respawnYaw = 0;
  private respawnPitch = 0;

  public constructor(
    private readonly camera: THREE.PerspectiveCamera,
    input: PlayerInput,
    private readonly isPointerLocked: PointerLockReader,
    private readonly worldCollision: WorldCollision = new WorldCollision(),
    spawn: PlayerSpawn = DEFAULT_PLAYER_SPAWN,
    private readonly config: PlayerConfig = PLAYER_CONFIG,
  ) {
    this.initialSpawn = this.resolveSpawn(spawn);
    this.look = new PlayerLook(input, isPointerLocked, config);
    this.movement = new PlayerMovement(input, config);
    this.collider = new PlayerCollider(this.initialSpawn, config);
    this.reset();
  }

  /** Consumes mouse input once per rendered frame. */
  public updateLook(): void {
    this.look.update(this.isPointerLocked());
  }

  /** Advances horizontal movement, gravity and collisions at the fixed step. */
  public fixedUpdate(deltaSeconds: number): void {
    const movementEnabled = this.isPointerLocked();
    const displacement = this.movement.update(
      deltaSeconds,
      this.look.getYaw(),
      movementEnabled,
    );

    if (!movementEnabled) {
      return;
    }

    this.collider.applyGravity(deltaSeconds);
    const result = this.collider.move(
      displacement,
      deltaSeconds,
      this.worldCollision,
    );

    if (result.wallNormal !== null) {
      this.movement.resolveCollision(result.wallNormal);
    }

    if (result.respawned) {
      this.look.reset(this.respawnYaw, this.respawnPitch);
      this.movement.reset();
      this.synchronizeCamera();
    }
  }

  /** Keeps legacy direct updates useful in unit tests and small harnesses. */
  public update(deltaSeconds: number): void {
    this.updateLook();
    this.fixedUpdate(deltaSeconds);
    this.synchronizeCamera();
  }

  public synchronizeCamera(): void {
    this.camera.position.copy(this.collider.getPosition());
    this.camera.position.y += this.config.eyeHeight;
    this.look.applyRotation(this.camera.rotation);
  }

  public reset(spawn?: PlayerSpawn): void {
    const targetSpawn =
      spawn === undefined ? this.initialSpawn : this.resolveSpawn(spawn);

    this.collider.reset(targetSpawn);
    this.respawnYaw = targetSpawn.yaw;
    this.respawnPitch = targetSpawn.pitch;
    this.look.reset(targetSpawn.yaw, targetSpawn.pitch);
    this.movement.reset();
    this.synchronizeCamera();
  }

  public getPosition(): Readonly<THREE.Vector3> {
    return this.collider.getPosition();
  }

  public getYaw(): number {
    return this.look.getYaw();
  }

  public getPitch(): number {
    return this.look.getPitch();
  }

  public setLookSensitivityMultiplier(multiplier: number): void {
    this.look.setSensitivityMultiplier(multiplier);
  }

  public getCurrentVelocity(): Readonly<THREE.Vector3> {
    return this.movement.getCurrentVelocity();
  }

  public getCurrentSpeed(): number {
    return this.movement.getCurrentSpeed();
  }

  public getMovementDirection(): Readonly<THREE.Vector3> {
    return this.movement.getMovementDirection();
  }

  public isFastMovementActive(): boolean {
    return this.movement.isFastMovementActive();
  }

  public isGrounded(): boolean {
    return this.collider.isGrounded();
  }

  public didCollide(): boolean {
    return this.collider.didCollide();
  }

  public getVerticalVelocity(): number {
    return this.collider.getVerticalVelocity();
  }

  public getCapsule(): ReturnType<PlayerCollider['getCapsule']> {
    return this.collider.getCapsule();
  }

  private resolveSpawn(spawn: PlayerSpawn): ResolvedPlayerSpawn {
    return {
      x: this.finiteOr(spawn.x, DEFAULT_PLAYER_SPAWN.x),
      y: this.finiteOr(spawn.y, DEFAULT_PLAYER_SPAWN.y),
      z: this.finiteOr(spawn.z, DEFAULT_PLAYER_SPAWN.z),
      yaw: this.finiteOr(spawn.yaw, DEFAULT_PLAYER_SPAWN.yaw),
      pitch: this.finiteOr(spawn.pitch, DEFAULT_PLAYER_SPAWN.pitch),
    };
  }

  private finiteOr(value: number | undefined, fallback: number): number {
    return value !== undefined && Number.isFinite(value) ? value : fallback;
  }
}
