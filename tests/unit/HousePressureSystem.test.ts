import { describe, expect, it } from 'vitest';
import {
  HOUSE_CALM_DURATION_MS,
  HOUSE_FAILURE_DURATION_MS,
  HousePressureSystem,
} from '../../src/gameplay/story/HousePressureSystem';

describe('HousePressureSystem', () => {
  it('maps errors to increasingly dark, cold pressure levels', () => {
    const system = new HousePressureSystem();
    const neutral = system.getSnapshot();
    const noticed = system.setPressureLevel(1);
    const watched = system.setPressureLevel(2);

    expect(neutral.pressureLevel).toBe(0);
    expect(noticed.lightMultiplier).toBeLessThan(neutral.lightMultiplier);
    expect(watched.lightMultiplier).toBeLessThan(noticed.lightMultiplier);
    expect(watched.coldShift).toBeGreaterThan(noticed.coldShift);
    expect(watched.vignetteOpacity).toBeGreaterThan(
      noticed.vignetteOpacity,
    );
  });

  it('adds a temporary calm response without reducing pressure', () => {
    const system = new HousePressureSystem();
    system.setPressureLevel(2);
    const calm = system.registerCorrectReport();

    expect(calm.pressureLevel).toBe(2);
    expect(calm.calmIntensity).toBe(1);

    const settled = system.update(HOUSE_CALM_DURATION_MS);
    expect(settled.pressureLevel).toBe(2);
    expect(settled.calmIntensity).toBe(0);
  });

  it('runs a bounded takeover sequence and resolves at 03:04', () => {
    const system = new HousePressureSystem();
    const started = system.beginFailure();

    expect(started.pressureLevel).toBe(3);
    expect(started.failureProgress).toBe(0);
    expect(started.failureComplete).toBe(false);

    const halfway = system.update(HOUSE_FAILURE_DURATION_MS / 2);
    expect(halfway.failureProgress).toBe(0.5);
    expect(halfway.lightMultiplier).toBeLessThan(started.lightMultiplier);

    const complete = system.update(HOUSE_FAILURE_DURATION_MS / 2);
    expect(complete.failureProgress).toBe(1);
    expect(complete.failureComplete).toBe(true);
  });

  it('does not advance calm or failure timing while paused', () => {
    const system = new HousePressureSystem();
    system.beginFailure();
    system.pause();

    expect(system.update(HOUSE_FAILURE_DURATION_MS).failureProgress).toBe(0);

    system.resume();
    expect(system.update(160).failureProgress).toBe(0.05);
  });

  it('clamps pressure levels and rejects invalid timing', () => {
    const system = new HousePressureSystem();

    expect(system.setPressureLevel(8).pressureLevel).toBe(3);
    expect(system.setPressureLevel(-2).pressureLevel).toBe(0);
    expect(() => system.setPressureLevel(Number.NaN)).toThrow(RangeError);
    expect(() => system.update(-1)).toThrow(RangeError);
  });
});
