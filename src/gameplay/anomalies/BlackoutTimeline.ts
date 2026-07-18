export const BLACKOUT_TIMING = {
  flickerEndMs: 180,
  fullBlackAtMs: 420,
  revealStartMs: 520,
  totalDurationMs: 1_100,
} as const;

export type BlackoutStage =
  | 'idle'
  | 'flicker'
  | 'fade-to-black'
  | 'full-black'
  | 'reveal'
  | 'complete';

export interface BlackoutSnapshot {
  readonly stage: BlackoutStage;
  readonly elapsedMs: number;
  readonly overlayOpacity: number;
  readonly lightMultiplier: number;
  readonly anomalyApplicationDue: boolean;
  readonly complete: boolean;
}

export interface BlackoutClock {
  now(): number;
}

const performanceClock: BlackoutClock = {
  now: () => globalThis.performance.now(),
};

export class BlackoutTimeline {
  private active = false;
  private paused = false;
  private accumulatedMs = 0;
  private segmentStartedAtMs: number | null = null;

  public constructor(
    private readonly clock: BlackoutClock = performanceClock,
  ) {}

  public start(): void {
    this.active = true;
    this.paused = false;
    this.accumulatedMs = 0;
    this.segmentStartedAtMs = this.readNow();
  }

  public pause(): boolean {
    if (!this.active || this.paused) {
      return false;
    }

    this.accumulatedMs = this.getElapsedExact();
    this.segmentStartedAtMs = null;
    this.paused = true;
    return true;
  }

  public resume(): boolean {
    if (!this.active || !this.paused) {
      return false;
    }

    this.segmentStartedAtMs = this.readNow();
    this.paused = false;
    return true;
  }

  public reset(): void {
    this.active = false;
    this.paused = false;
    this.accumulatedMs = 0;
    this.segmentStartedAtMs = null;
  }

  public getSnapshot(): BlackoutSnapshot {
    if (!this.active) {
      return {
        stage: 'idle',
        elapsedMs: 0,
        overlayOpacity: 0,
        lightMultiplier: 1,
        anomalyApplicationDue: false,
        complete: false,
      };
    }

    const elapsedExact = Math.min(
      this.getElapsedExact(),
      BLACKOUT_TIMING.totalDurationMs,
    );
    const elapsedMs = Math.floor(elapsedExact);

    if (elapsedExact >= BLACKOUT_TIMING.totalDurationMs) {
      return {
        stage: 'complete',
        elapsedMs,
        overlayOpacity: 0,
        lightMultiplier: 1,
        anomalyApplicationDue: true,
        complete: true,
      };
    }

    if (elapsedExact >= BLACKOUT_TIMING.revealStartMs) {
      const progress = smoothStep(
        inverseLerp(
          BLACKOUT_TIMING.revealStartMs,
          BLACKOUT_TIMING.totalDurationMs,
          elapsedExact,
        ),
      );
      return {
        stage: 'reveal',
        elapsedMs,
        overlayOpacity: 1 - progress,
        lightMultiplier: progress,
        anomalyApplicationDue: true,
        complete: false,
      };
    }

    if (elapsedExact >= BLACKOUT_TIMING.fullBlackAtMs) {
      return {
        stage: 'full-black',
        elapsedMs,
        overlayOpacity: 1,
        lightMultiplier: 0,
        anomalyApplicationDue: true,
        complete: false,
      };
    }

    if (elapsedExact >= BLACKOUT_TIMING.flickerEndMs) {
      const progress = smoothStep(
        inverseLerp(
          BLACKOUT_TIMING.flickerEndMs,
          BLACKOUT_TIMING.fullBlackAtMs,
          elapsedExact,
        ),
      );
      return {
        stage: 'fade-to-black',
        elapsedMs,
        overlayOpacity: progress,
        lightMultiplier: 0.58 * (1 - progress),
        anomalyApplicationDue: false,
        complete: false,
      };
    }

    return {
      stage: 'flicker',
      elapsedMs,
      overlayOpacity: 0,
      lightMultiplier: getFlickerMultiplier(elapsedExact),
      anomalyApplicationDue: false,
      complete: false,
    };
  }

  private getElapsedExact(): number {
    if (this.paused || this.segmentStartedAtMs === null) {
      return this.accumulatedMs;
    }

    return this.accumulatedMs + Math.max(0, this.readNow() - this.segmentStartedAtMs);
  }

  private readNow(): number {
    const now = this.clock.now();

    if (!Number.isFinite(now)) {
      throw new Error('The blackout clock returned a non-finite value.');
    }

    return now;
  }
}

function getFlickerMultiplier(elapsedMs: number): number {
  if (elapsedMs < 60) {
    return lerp(1, 0.72, elapsedMs / 60);
  }

  if (elapsedMs < 120) {
    return lerp(0.72, 0.92, (elapsedMs - 60) / 60);
  }

  return lerp(0.92, 0.58, (elapsedMs - 120) / 60);
}

function inverseLerp(minimum: number, maximum: number, value: number): number {
  return Math.min(1, Math.max(0, (value - minimum) / (maximum - minimum)));
}

function smoothStep(value: number): number {
  return value * value * (3 - 2 * value);
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}
