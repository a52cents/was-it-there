import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { ExitDoorController } from '../../src/gameplay/progression/ExitDoorController';

function createHarness() {
  const door = new THREE.Group();
  let collisionEnabled = true;
  let portalProgress = 0;
  const setCollisionEnabled = vi.fn((enabled: boolean) => {
    collisionEnabled = enabled;
  });
  const setPortalProgress = vi.fn((progress: number) => {
    portalProgress = progress;
  });
  const controller = new ExitDoorController({
    getDoor: () => door,
    setCollisionEnabled,
    setPortalProgress,
    openingDurationMs: 1_000,
  });

  return {
    controller,
    door,
    setCollisionEnabled,
    setPortalProgress,
    readCollisionEnabled: () => collisionEnabled,
    readPortalProgress: () => portalProgress,
  };
}

describe('ExitDoorController', () => {
  it('keeps the exit locked and collidable until explicitly unlocked', () => {
    const harness = createHarness();

    harness.controller.update(2);

    expect(harness.controller.getSnapshot()).toEqual({
      state: 'locked',
      progress: 0,
      collisionEnabled: true,
    });
    expect(harness.door.rotation.y).toBe(0);
    expect(harness.readCollisionEnabled()).toBe(true);
    expect(harness.readPortalProgress()).toBe(0);
  });

  it('opens from its hinge, releases collision, and exposes the portal', () => {
    const harness = createHarness();

    expect(harness.controller.unlock()).toBe(true);
    expect(harness.controller.unlock()).toBe(false);
    harness.controller.update(0.2);
    expect(harness.controller.getSnapshot()).toMatchObject({
      state: 'opening',
      progress: 0.2,
      collisionEnabled: true,
    });
    expect(harness.door.rotation.y).toBeGreaterThan(0);

    harness.controller.update(0.2);
    expect(harness.controller.getSnapshot().collisionEnabled).toBe(false);
    expect(harness.readCollisionEnabled()).toBe(false);
    expect(harness.readPortalProgress()).toBeGreaterThan(0);

    harness.controller.update(0.6);
    expect(harness.controller.getSnapshot()).toEqual({
      state: 'open',
      progress: 1,
      collisionEnabled: false,
    });
    expect(harness.door.rotation.y).toBeCloseTo(Math.PI / 2);
    expect(harness.readPortalProgress()).toBe(1);
  });

  it('restores the closed door and collision for a new run', () => {
    const harness = createHarness();
    harness.controller.unlock();
    harness.controller.update(1);

    harness.controller.reset();

    expect(harness.controller.getSnapshot().state).toBe('locked');
    expect(harness.door.rotation.y).toBe(0);
    expect(harness.readCollisionEnabled()).toBe(true);
    expect(harness.readPortalProgress()).toBe(0);
  });

  it('rejects invalid animation configuration and a missing door', () => {
    expect(
      () =>
        new ExitDoorController({
          getDoor: () => new THREE.Group(),
          setCollisionEnabled: () => undefined,
          setPortalProgress: () => undefined,
          openingDurationMs: 0,
        }),
    ).toThrow(RangeError);
    expect(
      () =>
        new ExitDoorController({
          getDoor: () => null,
          setCollisionEnabled: () => undefined,
          setPortalProgress: () => undefined,
        }),
    ).toThrow(/unavailable exit door/u);
  });
});
