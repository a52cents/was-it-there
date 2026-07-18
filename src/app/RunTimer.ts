import {
  GAME_TIMING_CONFIG,
  type RunPenaltyKind,
} from '../core/time/GameTimingConfig';

export type TimedGamePhase = 'observation' | 'search';

export interface MonotonicClock {
  now(): number;
}

export interface RunTiming {
  readonly activeTimeMs: number;
  readonly penaltyTimeMs: number;
  readonly finalTimeMs: number;
}

export interface PhaseTimingSnapshot {
  readonly phase: TimedGamePhase;
  readonly durationMs: number;
  readonly elapsedMs: number;
  readonly remainingMs: number;
  readonly expired: boolean;
}

export interface RunTimerSnapshot extends RunTiming {
  readonly started: boolean;
  readonly running: boolean;
  readonly finished: boolean;
  readonly phase: PhaseTimingSnapshot | null;
}

interface ActivePhase {
  readonly phase: TimedGamePhase;
  readonly durationMs: number;
  readonly startedAtActiveTimeMs: number;
}

const performanceClock: MonotonicClock = {
  now: () => globalThis.performance.now(),
};

export class RunTimer {
  private started = false;
  private running = false;
  private finished = false;
  private accumulatedActiveTimeMs = 0;
  private activeSegmentStartedAtMs: number | null = null;
  private penaltyTimeMs = 0;
  private activePhase: ActivePhase | null = null;

  public constructor(
    private readonly clock: MonotonicClock = performanceClock,
  ) {}

  public get hasStarted(): boolean {
    return this.started;
  }

  public get isRunning(): boolean {
    return this.running;
  }

  public get isFinished(): boolean {
    return this.finished;
  }

  public startRun(): void {
    this.started = true;
    this.running = true;
    this.finished = false;
    this.accumulatedActiveTimeMs = 0;
    this.activeSegmentStartedAtMs = this.readNow();
    this.penaltyTimeMs = 0;
    this.activePhase = null;
  }

  public pause(): boolean {
    if (!this.running) {
      return false;
    }

    this.captureActiveSegment();
    this.running = false;
    return true;
  }

  public resume(): boolean {
    if (!this.started || this.running || this.finished) {
      return false;
    }

    this.activeSegmentStartedAtMs = this.readNow();
    this.running = true;
    return true;
  }

  public stop(): boolean {
    if (!this.started || this.finished) {
      return false;
    }

    if (this.running) {
      this.captureActiveSegment();
    }

    this.running = false;
    this.finished = true;
    return true;
  }

  public reset(): void {
    this.started = false;
    this.running = false;
    this.finished = false;
    this.accumulatedActiveTimeMs = 0;
    this.activeSegmentStartedAtMs = null;
    this.penaltyTimeMs = 0;
    this.activePhase = null;
  }

  public startPhase(phase: TimedGamePhase, durationMs: number): void {
    if (!this.started) {
      throw new Error('A run must be started before a timed phase.');
    }

    if (!Number.isInteger(durationMs) || durationMs <= 0) {
      throw new RangeError('Phase duration must be a positive integer.');
    }

    this.activePhase = {
      phase,
      durationMs,
      startedAtActiveTimeMs: this.getActiveTimeExact(),
    };
  }

  public clearPhase(): void {
    this.activePhase = null;
  }

  public addPenalty(kind: RunPenaltyKind): number {
    if (!this.started) {
      throw new Error('A run must be started before adding a penalty.');
    }

    this.penaltyTimeMs += GAME_TIMING_CONFIG.penalties[kind];
    return this.penaltyTimeMs;
  }

  public getSnapshot(): RunTimerSnapshot {
    const activeTimeExact = this.getActiveTimeExact();
    const activeTimeMs = Math.floor(activeTimeExact);
    const phase = this.createPhaseSnapshot(activeTimeExact);

    return {
      started: this.started,
      running: this.running,
      finished: this.finished,
      activeTimeMs,
      penaltyTimeMs: this.penaltyTimeMs,
      finalTimeMs: activeTimeMs + this.penaltyTimeMs,
      phase,
    };
  }

  private createPhaseSnapshot(
    activeTimeMs: number,
  ): PhaseTimingSnapshot | null {
    if (this.activePhase === null) {
      return null;
    }

    const elapsedExact = Math.max(
      0,
      activeTimeMs - this.activePhase.startedAtActiveTimeMs,
    );
    const elapsedMs = Math.min(
      this.activePhase.durationMs,
      Math.floor(elapsedExact),
    );

    return {
      phase: this.activePhase.phase,
      durationMs: this.activePhase.durationMs,
      elapsedMs,
      remainingMs: Math.max(0, this.activePhase.durationMs - elapsedMs),
      expired: elapsedExact >= this.activePhase.durationMs,
    };
  }

  private captureActiveSegment(): void {
    this.accumulatedActiveTimeMs = this.getActiveTimeExact();
    this.activeSegmentStartedAtMs = null;
  }

  private getActiveTimeExact(): number {
    if (!this.running || this.activeSegmentStartedAtMs === null) {
      return this.accumulatedActiveTimeMs;
    }

    return (
      this.accumulatedActiveTimeMs +
      Math.max(0, this.readNow() - this.activeSegmentStartedAtMs)
    );
  }

  private readNow(): number {
    const now = this.clock.now();

    if (!Number.isFinite(now)) {
      throw new Error('The monotonic clock returned a non-finite value.');
    }

    return now;
  }
}
