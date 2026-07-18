import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { InputManager } from '../../src/input/InputManager';
import { PLAYER_CONFIG } from '../../src/player/PlayerConfig';
import { PlayerLook } from '../../src/player/PlayerLook';

interface LookHarness {
  readonly input: InputManager;
  readonly look: PlayerLook;
  setPointerLocked(locked: boolean): void;
}

function createHarness(
  sensitivity: number = PLAYER_CONFIG.mouseSensitivity,
): LookHarness {
  const input = new InputManager();
  let pointerLocked = true;
  const look = new PlayerLook(
    input,
    () => pointerLocked,
    { ...PLAYER_CONFIG, mouseSensitivity: sensitivity },
  );

  return {
    input,
    look,
    setPointerLocked: (locked) => {
      pointerLocked = locked;
    },
  };
}

describe('PlayerLook', () => {
  it('starts with a neutral yaw and pitch', () => {
    const { look } = createHarness();

    expect(look.getYaw()).toBe(0);
    expect(look.getPitch()).toBe(0);
  });

  it('turns right for positive horizontal mouse movement', () => {
    const { input, look } = createHarness();
    input.addPointerDelta(10, 0);

    look.update();

    expect(look.getYaw()).toBeCloseTo(-0.02);
  });

  it('looks up for negative vertical mouse movement', () => {
    const { input, look } = createHarness();
    input.addPointerDelta(0, -10);

    look.update();

    expect(look.getPitch()).toBeCloseTo(0.02);
  });

  it('applies the configured sensitivity', () => {
    const { input, look } = createHarness(0.01);
    input.addPointerDelta(5, -4);

    look.update();

    expect(look.getYaw()).toBeCloseTo(-0.05);
    expect(look.getPitch()).toBeCloseTo(0.04);
  });

  it('clamps pitch at its minimum', () => {
    const { input, look } = createHarness();
    input.addPointerDelta(0, 1_000_000);

    look.update();

    expect(look.getPitch()).toBe(PLAYER_CONFIG.minimumPitch);
  });

  it('clamps pitch at its maximum', () => {
    const { input, look } = createHarness();
    input.addPointerDelta(0, -1_000_000);

    look.update();

    expect(look.getPitch()).toBe(PLAYER_CONFIG.maximumPitch);
  });

  it('does not change orientation without pointer lock', () => {
    const harness = createHarness();
    harness.setPointerLocked(false);
    harness.input.addPointerDelta(20, -30);

    harness.look.update();

    expect(harness.look.getYaw()).toBe(0);
    expect(harness.look.getPitch()).toBe(0);
  });

  it('resets yaw and pitch to a requested orientation', () => {
    const { input, look } = createHarness();
    input.addPointerDelta(30, 20);
    look.update();

    look.reset(0.7, -0.4);

    expect(look.getYaw()).toBeCloseTo(0.7);
    expect(look.getPitch()).toBeCloseTo(-0.4);
  });

  it('applies YXZ rotation without roll', () => {
    const { look } = createHarness();
    const rotation = new THREE.Euler(1, 1, 1, 'XYZ');
    look.reset(0.6, -0.25);

    look.applyRotation(rotation);

    expect(rotation.order).toBe('YXZ');
    expect(rotation.x).toBeCloseTo(-0.25);
    expect(rotation.y).toBeCloseTo(0.6);
    expect(rotation.z).toBe(0);
  });
});
