import * as THREE from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import type { WorldCollision } from '../world/WorldCollision';
import {
  PLAYER_CONFIG,
  type PlayerConfig,
  type PlayerSpawn,
} from './PlayerConfig';

export interface CollisionMoveResult {
  readonly grounded: boolean;
  readonly collided: boolean;
  readonly correctedPosition: Readonly<THREE.Vector3>;
  readonly wallNormal: Readonly<THREE.Vector3> | null;
  readonly respawned: boolean;
}

interface MutableCollisionMoveResult {
  grounded: boolean;
  collided: boolean;
  correctedPosition: Readonly<THREE.Vector3>;
  wallNormal: Readonly<THREE.Vector3> | null;
  respawned: boolean;
}

const MINIMUM_NORMAL_LENGTH_SQUARED = 1e-12;

export class PlayerCollider {
  private readonly capsule: Capsule;
  private readonly logicalPosition = new THREE.Vector3();
  private readonly respawnPosition = new THREE.Vector3();
  private readonly totalDisplacement = new THREE.Vector3();
  private readonly collisionNormal = new THREE.Vector3();
  private readonly correction = new THREE.Vector3();
  private readonly wallNormal = new THREE.Vector3();
  private readonly horizontalNormal = new THREE.Vector3();
  private readonly moveResult: MutableCollisionMoveResult;

  private verticalVelocity = 0;
  private grounded = false;
  private collisionActive = false;

  public constructor(
    spawn: PlayerSpawn,
    private readonly config: PlayerConfig = PLAYER_CONFIG,
  ) {
    if (
      config.capsuleRadius <= 0 ||
      config.capsuleHeight < config.capsuleRadius * 2 ||
      !Number.isInteger(config.collisionIterations) ||
      config.collisionIterations <= 0
    ) {
      throw new RangeError(
        'Player collider dimensions and collision iterations are invalid.',
      );
    }

    this.capsule = new Capsule(
      new THREE.Vector3(),
      new THREE.Vector3(),
      config.capsuleRadius,
    );
    this.moveResult = {
      grounded: false,
      collided: false,
      correctedPosition: this.logicalPosition,
      wallNormal: null,
      respawned: false,
    };
    this.reset(spawn);
  }

  public applyGravity(deltaSeconds: number): void {
    const safeDeltaSeconds = this.sanitizeDelta(deltaSeconds);

    if (safeDeltaSeconds === 0) {
      return;
    }

    // A one-step downward velocity keeps an already-grounded capsule in
    // contact without accumulating fall speed or requiring a raycast.
    if (this.grounded) {
      this.verticalVelocity = -this.config.gravity * safeDeltaSeconds;
      return;
    }

    this.verticalVelocity = Math.max(
      -this.config.maximumFallSpeed,
      this.verticalVelocity - this.config.gravity * safeDeltaSeconds,
    );
  }

  public move(
    displacement: Readonly<THREE.Vector3>,
    deltaSeconds: number,
    world: WorldCollision,
  ): CollisionMoveResult {
    const safeDeltaSeconds = this.sanitizeDelta(deltaSeconds);
    this.totalDisplacement.set(
      this.finiteOrZero(displacement.x),
      this.verticalVelocity * safeDeltaSeconds,
      this.finiteOrZero(displacement.z),
    );

    if (this.isFiniteVector(this.totalDisplacement)) {
      this.capsule.translate(this.totalDisplacement);
    } else {
      this.totalDisplacement.set(0, 0, 0);
      this.verticalVelocity = 0;
    }

    this.grounded = false;
    this.collisionActive = false;
    this.wallNormal.set(0, 0, 0);

    for (
      let iteration = 0;
      iteration < this.config.collisionIterations;
      iteration += 1
    ) {
      const intersection = world.intersectCapsule(this.capsule);

      if (intersection === null) {
        break;
      }

      if (!this.isValidIntersection(intersection.normal, intersection.depth)) {
        this.warnInvalidIntersection(intersection.depth);
        break;
      }

      this.collisionNormal.copy(intersection.normal).normalize();
      this.correction
        .copy(this.collisionNormal)
        .multiplyScalar(intersection.depth);
      this.capsule.translate(this.correction);
      this.collisionActive = true;

      if (this.collisionNormal.y > this.config.groundNormalMinimum) {
        this.grounded = true;

        if (this.verticalVelocity < 0) {
          this.verticalVelocity = 0;
        }
      } else if (
        this.collisionNormal.y < -this.config.groundNormalMinimum &&
        this.verticalVelocity > 0
      ) {
        this.verticalVelocity = 0;
      }

      this.accumulateWallNormal(this.collisionNormal);
    }

    if (this.wallNormal.lengthSq() > MINIMUM_NORMAL_LENGTH_SQUARED) {
      this.wallNormal.normalize();
      this.moveResult.wallNormal = this.wallNormal;
    } else {
      this.moveResult.wallNormal = null;
    }

    this.synchronizeLogicalPosition();
    let respawned = false;

    if (this.logicalPosition.y < this.config.respawnHeight) {
      this.resetToRespawnPosition();
      respawned = true;
    }

    this.moveResult.grounded = this.grounded;
    this.moveResult.collided = this.collisionActive;
    this.moveResult.respawned = respawned;
    return this.moveResult;
  }

  public reset(spawn: PlayerSpawn): void {
    this.respawnPosition.set(
      this.finiteOrZero(spawn.x),
      this.finiteOrZero(spawn.y),
      this.finiteOrZero(spawn.z),
    );
    this.resetToRespawnPosition();
  }

  public isGrounded(): boolean {
    return this.grounded;
  }

  public didCollide(): boolean {
    return this.collisionActive;
  }

  public getCapsule(): Readonly<Capsule> {
    return this.capsule;
  }

  public getPosition(): Readonly<THREE.Vector3> {
    return this.logicalPosition;
  }

  public getVerticalVelocity(): number {
    return this.verticalVelocity;
  }

  private resetToRespawnPosition(): void {
    // The logical position is the capsule base at floor level. The capsule's
    // segment starts/ends one radius inside its total configured height.
    this.capsule.start.set(
      this.respawnPosition.x,
      this.respawnPosition.y + this.config.capsuleRadius,
      this.respawnPosition.z,
    );
    this.capsule.end.set(
      this.respawnPosition.x,
      this.respawnPosition.y +
        this.config.capsuleHeight -
        this.config.capsuleRadius,
      this.respawnPosition.z,
    );
    this.logicalPosition.copy(this.respawnPosition);
    this.verticalVelocity = 0;
    this.grounded = false;
    this.collisionActive = false;
    this.wallNormal.set(0, 0, 0);
  }

  private synchronizeLogicalPosition(): void {
    this.logicalPosition.set(
      this.capsule.start.x,
      this.capsule.start.y - this.config.capsuleRadius,
      this.capsule.start.z,
    );
  }

  private accumulateWallNormal(normal: Readonly<THREE.Vector3>): void {
    this.horizontalNormal.set(normal.x, 0, normal.z);

    if (
      this.horizontalNormal.lengthSq() <= MINIMUM_NORMAL_LENGTH_SQUARED
    ) {
      return;
    }

    this.wallNormal.add(this.horizontalNormal.normalize());
  }

  private isValidIntersection(
    normal: Readonly<THREE.Vector3>,
    depth: number,
  ): boolean {
    return (
      Number.isFinite(depth) &&
      depth > 0 &&
      this.isFiniteVector(normal) &&
      normal.lengthSq() > MINIMUM_NORMAL_LENGTH_SQUARED
    );
  }

  private sanitizeDelta(deltaSeconds: number): number {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return 0;
    }

    return Math.min(deltaSeconds, this.config.maximumDeltaSeconds);
  }

  private finiteOrZero(value: number): number {
    return Number.isFinite(value) ? value : 0;
  }

  private isFiniteVector(vector: Readonly<THREE.Vector3>): boolean {
    return (
      Number.isFinite(vector.x) &&
      Number.isFinite(vector.y) &&
      Number.isFinite(vector.z)
    );
  }

  private warnInvalidIntersection(depth: number): void {
    if (import.meta.env.DEV) {
      console.warn('Ignored an invalid capsule collision result.', { depth });
    }
  }
}
