import { describe, expect, it } from 'vitest';
import {
  BLACKOUT_TIMING,
  BlackoutTimeline,
  type BlackoutClock,
} from '../../src/gameplay/anomalies/BlackoutTimeline';

class FakeClock implements BlackoutClock {
  public value = 0;

  public now(): number {
    return this.value;
  }
}

describe('BlackoutTimeline', () => {
  it('follows the prepared 1.1 second stage sequence', () => {
    const clock = new FakeClock();
    const timeline = new BlackoutTimeline(clock);
    timeline.start();

    expect(timeline.getSnapshot()).toMatchObject({
      stage: 'flicker',
      elapsedMs: 0,
      overlayOpacity: 0,
      lightMultiplier: 1,
      anomalyApplicationDue: false,
      complete: false,
    });

    clock.value = BLACKOUT_TIMING.flickerEndMs;
    expect(timeline.getSnapshot()).toMatchObject({
      stage: 'fade-to-black',
      overlayOpacity: 0,
      lightMultiplier: 0.58,
      anomalyApplicationDue: false,
    });

    clock.value = BLACKOUT_TIMING.fullBlackAtMs;
    expect(timeline.getSnapshot()).toMatchObject({
      stage: 'full-black',
      overlayOpacity: 1,
      lightMultiplier: 0,
      anomalyApplicationDue: true,
      complete: false,
    });

    clock.value = BLACKOUT_TIMING.revealStartMs;
    expect(timeline.getSnapshot()).toMatchObject({
      stage: 'reveal',
      overlayOpacity: 1,
      lightMultiplier: 0,
      anomalyApplicationDue: true,
    });

    clock.value = BLACKOUT_TIMING.totalDurationMs;
    expect(timeline.getSnapshot()).toMatchObject({
      stage: 'complete',
      elapsedMs: 1_100,
      overlayOpacity: 0,
      lightMultiplier: 1,
      anomalyApplicationDue: true,
      complete: true,
    });
  });

  it('never raises light intensity above normal or uses a bright overlay', () => {
    const clock = new FakeClock();
    const timeline = new BlackoutTimeline(clock);
    timeline.start();

    for (
      clock.value = 0;
      clock.value <= BLACKOUT_TIMING.totalDurationMs;
      clock.value += 5
    ) {
      const snapshot = timeline.getSnapshot();
      expect(snapshot.lightMultiplier).toBeGreaterThanOrEqual(0);
      expect(snapshot.lightMultiplier).toBeLessThanOrEqual(1);
      expect(snapshot.overlayOpacity).toBeGreaterThanOrEqual(0);
      expect(snapshot.overlayOpacity).toBeLessThanOrEqual(1);
    }
  });

  it('freezes elapsed time while paused and resumes from the exact point', () => {
    const clock = new FakeClock();
    const timeline = new BlackoutTimeline(clock);
    timeline.start();
    clock.value = 275;

    expect(timeline.pause()).toBe(true);
    clock.value = 10_000;
    expect(timeline.getSnapshot().elapsedMs).toBe(275);
    expect(timeline.pause()).toBe(false);

    expect(timeline.resume()).toBe(true);
    clock.value = 10_125;
    expect(timeline.getSnapshot().elapsedMs).toBe(400);
    expect(timeline.resume()).toBe(false);
  });

  it('returns to a neutral idle snapshot after reset', () => {
    const clock = new FakeClock();
    const timeline = new BlackoutTimeline(clock);
    timeline.start();
    clock.value = 500;
    timeline.reset();

    expect(timeline.getSnapshot()).toEqual({
      stage: 'idle',
      elapsedMs: 0,
      overlayOpacity: 0,
      lightMultiplier: 1,
      anomalyApplicationDue: false,
      complete: false,
    });
  });
});
