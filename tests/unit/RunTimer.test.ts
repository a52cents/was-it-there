import { describe, expect, it } from 'vitest';
import type { MonotonicClock } from '../../src/app/RunTimer';
import { RunTimer } from '../../src/app/RunTimer';

class ManualClock implements MonotonicClock {
  public timeMs = 0;

  public now(): number {
    return this.timeMs;
  }

  public advance(milliseconds: number): void {
    this.timeMs += milliseconds;
  }
}

describe('RunTimer', () => {
  it('measures active time from its monotonic clock without frame updates', () => {
    const clock = new ManualClock();
    const timer = new RunTimer(clock);
    timer.startRun();

    clock.advance(1_234.9);

    expect(timer.getSnapshot()).toMatchObject({
      started: true,
      running: true,
      activeTimeMs: 1_234,
      penaltyTimeMs: 0,
      finalTimeMs: 1_234,
    });
  });

  it('tracks and expires the observation phase at fifteen seconds', () => {
    const clock = new ManualClock();
    const timer = new RunTimer(clock);
    timer.startRun();
    timer.startPhase('observation', 15_000);

    clock.advance(14_999);
    expect(timer.getSnapshot().phase).toMatchObject({
      phase: 'observation',
      remainingMs: 1,
      expired: false,
    });

    clock.advance(1);
    expect(timer.getSnapshot().phase).toMatchObject({
      elapsedMs: 15_000,
      remainingMs: 0,
      expired: true,
    });
  });

  it('supports the thirty-second search phase', () => {
    const clock = new ManualClock();
    const timer = new RunTimer(clock);
    timer.startRun();
    timer.startPhase('search', 30_000);

    clock.advance(12_500);

    expect(timer.getSnapshot().phase).toEqual({
      phase: 'search',
      durationMs: 30_000,
      elapsedMs: 12_500,
      remainingMs: 17_500,
      expired: false,
    });
  });

  it('excludes paused wall time without losing or duplicating active time', () => {
    const clock = new ManualClock();
    const timer = new RunTimer(clock);
    timer.startRun();
    timer.startPhase('observation', 15_000);
    clock.advance(4_200);

    expect(timer.pause()).toBe(true);
    clock.advance(20_000);
    expect(timer.getSnapshot().activeTimeMs).toBe(4_200);
    expect(timer.getSnapshot().phase?.remainingMs).toBe(10_800);

    expect(timer.resume()).toBe(true);
    clock.advance(1_800);
    expect(timer.getSnapshot().activeTimeMs).toBe(6_000);
    expect(timer.getSnapshot().phase?.remainingMs).toBe(9_000);
  });

  it('adds documented integer penalties to the final time', () => {
    const clock = new ManualClock();
    const timer = new RunTimer(clock);
    timer.startRun();
    clock.advance(2_500);

    expect(timer.addPenalty('incorrectReport')).toBe(5_000);
    expect(timer.addPenalty('timeout')).toBe(20_000);
    expect(timer.addPenalty('hint')).toBe(30_000);
    expect(timer.getSnapshot()).toMatchObject({
      activeTimeMs: 2_500,
      penaltyTimeMs: 30_000,
      finalTimeMs: 32_500,
    });
  });

  it('freezes completed runs and resets cleanly for a new run', () => {
    const clock = new ManualClock();
    const timer = new RunTimer(clock);
    timer.startRun();
    clock.advance(3_000);
    timer.stop();
    clock.advance(8_000);

    expect(timer.getSnapshot()).toMatchObject({
      running: false,
      finished: true,
      activeTimeMs: 3_000,
    });

    timer.startRun();
    expect(timer.getSnapshot()).toMatchObject({
      running: true,
      finished: false,
      activeTimeMs: 0,
      penaltyTimeMs: 0,
      phase: null,
    });
  });

  it('continues a finished run without erasing its time or penalties', () => {
    const clock = new ManualClock();
    const timer = new RunTimer(clock);
    timer.startRun();
    clock.advance(3_000);
    timer.addPenalty('incorrectReport');
    timer.stop();
    clock.advance(8_000);

    expect(timer.continueFinishedRun()).toBe(true);
    clock.advance(1_000);

    expect(timer.getSnapshot()).toMatchObject({
      running: true,
      finished: false,
      activeTimeMs: 4_000,
      penaltyTimeMs: 5_000,
      finalTimeMs: 9_000,
    });
    expect(timer.continueFinishedRun()).toBe(false);
  });

  it('rejects phases and penalties before a run starts', () => {
    const timer = new RunTimer(new ManualClock());

    expect(() => timer.startPhase('observation', 15_000)).toThrow(
      'A run must be started before a timed phase.',
    );
    expect(() => timer.addPenalty('timeout')).toThrow(
      'A run must be started before adding a penalty.',
    );
  });
});
