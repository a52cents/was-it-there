import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { InputManager } from '../../src/input/InputManager';
import { PLAYER_CONFIG } from '../../src/player/PlayerConfig';
import { PlayerMovement } from '../../src/player/PlayerMovement';

interface MovementHarness {
  readonly input: InputManager;
  readonly movement: PlayerMovement;
}

function createHarness(): MovementHarness {
  const input = new InputManager();
  return { input, movement: new PlayerMovement(input) };
}

function expectVector(
  vector: Readonly<THREE.Vector3>,
  x: number,
  y: number,
  z: number,
): void {
  expect(vector.x).toBeCloseTo(x);
  expect(vector.y).toBeCloseTo(y);
  expect(vector.z).toBeCloseTo(z);
}

function expectFiniteVector(vector: Readonly<THREE.Vector3>): void {
  expect(Number.isFinite(vector.x)).toBe(true);
  expect(Number.isFinite(vector.y)).toBe(true);
  expect(Number.isFinite(vector.z)).toBe(true);
}

describe('PlayerMovement', () => {
  it('has no target movement without input', () => {
    const { movement } = createHarness();

    movement.update(0, 0);

    expectVector(movement.getTargetVelocity(), 0, 0, 0);
  });

  it.each([
    ['move-forward', 0, -PLAYER_CONFIG.walkSpeed],
    ['move-backward', 0, PLAYER_CONFIG.walkSpeed],
    ['move-left', -PLAYER_CONFIG.walkSpeed, 0],
    ['move-right', PLAYER_CONFIG.walkSpeed, 0],
  ] as const)('builds the expected %s target', (action, x, z) => {
    const { input, movement } = createHarness();
    input.setActionPressed(action, true);

    movement.update(0, 0);

    expectVector(movement.getTargetVelocity(), x, 0, z);
  });

  it('normalizes forward and right diagonal input', () => {
    const { input, movement } = createHarness();
    input.setActionPressed('move-forward', true);
    input.setActionPressed('move-right', true);

    movement.update(0, 0);

    expect(movement.getMovementDirection().length()).toBeCloseTo(1);
    expect(movement.getTargetVelocity().length()).toBeCloseTo(
      PLAYER_CONFIG.walkSpeed,
    );
    expectVector(
      movement.getMovementDirection(),
      Math.SQRT1_2,
      0,
      -Math.SQRT1_2,
    );
  });

  it('cancels simultaneous forward and backward input', () => {
    const { input, movement } = createHarness();
    input.setActionPressed('move-forward', true);
    input.setActionPressed('move-backward', true);

    movement.update(0, 0);

    expectVector(movement.getTargetVelocity(), 0, 0, 0);
  });

  it('cancels simultaneous left and right input', () => {
    const { input, movement } = createHarness();
    input.setActionPressed('move-left', true);
    input.setActionPressed('move-right', true);

    movement.update(0, 0);

    expectVector(movement.getTargetVelocity(), 0, 0, 0);
  });

  it('uses normal walking speed by default', () => {
    const { input, movement } = createHarness();
    input.setActionPressed('move-forward', true);

    movement.update(0, 0);

    expect(movement.getTargetVelocity().length()).toBeCloseTo(
      PLAYER_CONFIG.walkSpeed,
    );
    expect(movement.isFastMovementActive()).toBe(false);
  });

  it('uses fast speed while move-fast is pressed', () => {
    const { input, movement } = createHarness();
    input.setActionPressed('move-forward', true);
    input.setActionPressed('move-fast', true);

    movement.update(0, 0);

    expect(movement.getTargetVelocity().length()).toBeCloseTo(
      PLAYER_CONFIG.fastSpeed,
    );
    expect(movement.isFastMovementActive()).toBe(true);
  });

  it('rotates movement by yaw', () => {
    const { input, movement } = createHarness();
    input.setActionPressed('move-forward', true);

    movement.update(0, -Math.PI / 2);

    expectVector(
      movement.getTargetVelocity(),
      PLAYER_CONFIG.walkSpeed,
      0,
      0,
    );
  });

  it('keeps movement horizontal because pitch is not part of its input', () => {
    const { input, movement } = createHarness();
    input.setActionPressed('move-forward', true);

    const displacement = movement.update(0.1, 0.4);

    expect(displacement.y).toBe(0);
    expect(movement.getTargetVelocity().y).toBe(0);
  });

  it('accelerates toward the target using elapsed time', () => {
    const { input, movement } = createHarness();
    input.setActionPressed('move-forward', true);

    movement.update(0.05, 0);

    expect(movement.getCurrentSpeed()).toBeCloseTo(
      PLAYER_CONFIG.acceleration * 0.05,
    );
  });

  it('covers the same distance at different frame rates', () => {
    const simulate = (deltaSeconds: number, frameCount: number): number => {
      const { input, movement } = createHarness();
      const position = new THREE.Vector3();
      input.setActionPressed('move-forward', true);

      for (let frame = 0; frame < frameCount; frame += 1) {
        position.add(movement.update(deltaSeconds, 0));
      }

      return position.z;
    };

    const positionAtTenFps = simulate(0.1, 10);
    const positionAtTwentyFps = simulate(0.05, 20);

    expect(positionAtTenFps).toBeCloseTo(positionAtTwentyFps, 10);
  });

  it('decelerates quickly after movement input is released', () => {
    const { input, movement } = createHarness();
    input.setActionPressed('move-forward', true);
    movement.update(0.1, 0);
    movement.update(0.1, 0);
    input.setActionPressed('move-forward', false);

    movement.update(0.05, 0);

    expect(movement.getCurrentSpeed()).toBeCloseTo(
      PLAYER_CONFIG.walkSpeed - PLAYER_CONFIG.deceleration * 0.05,
    );
  });

  it('produces no displacement for a zero delta', () => {
    const { input, movement } = createHarness();
    input.setActionPressed('move-forward', true);

    const displacement = movement.update(0, 0);

    expectVector(displacement, 0, 0, 0);
    expect(movement.getCurrentSpeed()).toBe(0);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1])(
    'produces finite zero displacement for invalid delta %s',
    (deltaSeconds) => {
      const { input, movement } = createHarness();
      input.setActionPressed('move-forward', true);

      const displacement = movement.update(deltaSeconds, 0);

      expectFiniteVector(displacement);
      expectVector(displacement, 0, 0, 0);
    },
  );

  it('clamps an extreme finite delta defensively', () => {
    const { input, movement } = createHarness();
    input.setActionPressed('move-forward', true);

    const displacement = movement.update(100, 0);

    expectFiniteVector(displacement);
    expect(displacement.length()).toBeLessThanOrEqual(
      PLAYER_CONFIG.walkSpeed * PLAYER_CONFIG.maximumDeltaSeconds,
    );
  });

  it('clears velocity immediately when movement is disabled', () => {
    const { input, movement } = createHarness();
    input.setActionPressed('move-forward', true);
    movement.update(0.1, 0);

    const displacement = movement.update(0.1, 0, false);

    expectVector(displacement, 0, 0, 0);
    expect(movement.getCurrentSpeed()).toBe(0);
  });

  it('removes only velocity directed into a collision wall', () => {
    const { input, movement } = createHarness();
    input.setActionPressed('move-forward', true);
    input.setActionPressed('move-right', true);
    movement.update(0.1, 0);

    movement.resolveCollision(new THREE.Vector3(-1, 0, 0));

    expect(movement.getCurrentVelocity().x).toBeCloseTo(0);
    expect(movement.getCurrentVelocity().z).toBeLessThan(0);
  });
});
