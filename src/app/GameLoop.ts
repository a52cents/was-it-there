export type FrameCallback = (timestampMs: number) => void;

export interface FrameScheduler {
  requestFrame(callback: FrameCallback): number;
  cancelFrame(requestId: number): void;
  now(): number;
}

export interface GameLoopOptions {
  readonly maxDeltaSeconds?: number;
  readonly fixedStepSeconds?: number;
  readonly maximumSubSteps?: number;
  readonly onFrameStart?: (deltaSeconds: number) => void;
  readonly onFrameEnd?: (fixedSteps: number) => void;
}

const browserFrameScheduler: FrameScheduler = {
  requestFrame: (callback) => window.requestAnimationFrame(callback),
  cancelFrame: (requestId) => window.cancelAnimationFrame(requestId),
  now: () => performance.now(),
};

const DEFAULT_MAX_DELTA_SECONDS = 0.1;
export const DEFAULT_FIXED_STEP_SECONDS = 1 / 60;
export const DEFAULT_MAXIMUM_SUB_STEPS = 5;

export class GameLoop {
  private readonly maxDeltaSeconds: number;
  private readonly fixedStepSeconds: number;
  private readonly maximumSubSteps: number;
  private readonly onFrameStart: (deltaSeconds: number) => void;
  private readonly onFrameEnd: (fixedSteps: number) => void;
  private running = false;
  private frameRequestId: number | null = null;
  private previousFrameTimeMs = 0;
  private accumulatorSeconds = 0;
  private lastFixedSteps = 0;
  private lastFrameDeltaSeconds = 0;

  public constructor(
    private readonly update: (deltaSeconds: number) => void,
    private readonly render: () => void,
    private readonly scheduler: FrameScheduler = browserFrameScheduler,
    options: GameLoopOptions = {},
  ) {
    this.maxDeltaSeconds =
      options.maxDeltaSeconds ?? DEFAULT_MAX_DELTA_SECONDS;
    this.fixedStepSeconds =
      options.fixedStepSeconds ?? DEFAULT_FIXED_STEP_SECONDS;
    this.maximumSubSteps =
      options.maximumSubSteps ?? DEFAULT_MAXIMUM_SUB_STEPS;
    this.onFrameStart = options.onFrameStart ?? (() => undefined);
    this.onFrameEnd = options.onFrameEnd ?? (() => undefined);

    if (this.maxDeltaSeconds <= 0) {
      throw new RangeError('maxDeltaSeconds must be greater than zero.');
    }

    if (this.fixedStepSeconds <= 0) {
      throw new RangeError('fixedStepSeconds must be greater than zero.');
    }

    if (
      !Number.isInteger(this.maximumSubSteps) ||
      this.maximumSubSteps <= 0
    ) {
      throw new RangeError('maximumSubSteps must be a positive integer.');
    }
  }

  public get isRunning(): boolean {
    return this.running;
  }

  public get fixedStepsLastFrame(): number {
    return this.lastFixedSteps;
  }

  public get frameDeltaSecondsLastFrame(): number {
    return this.lastFrameDeltaSeconds;
  }

  public start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.previousFrameTimeMs = this.scheduler.now();
    this.accumulatorSeconds = 0;
    this.lastFixedSteps = 0;
    this.lastFrameDeltaSeconds = 0;
    this.frameRequestId = this.scheduler.requestFrame(this.onFrame);
  }

  public stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;
    this.accumulatorSeconds = 0;
    this.lastFixedSteps = 0;
    this.lastFrameDeltaSeconds = 0;

    if (this.frameRequestId !== null) {
      this.scheduler.cancelFrame(this.frameRequestId);
      this.frameRequestId = null;
    }
  }

  private readonly onFrame = (timestampMs: number): void => {
    if (!this.running) {
      return;
    }

    this.frameRequestId = null;

    const elapsedSeconds = Math.max(
      0,
      (timestampMs - this.previousFrameTimeMs) / 1_000,
    );
    const deltaSeconds = Math.min(elapsedSeconds, this.maxDeltaSeconds);
    this.lastFrameDeltaSeconds = deltaSeconds;
    this.previousFrameTimeMs = timestampMs;
    this.accumulatorSeconds += deltaSeconds;
    let fixedSteps = 0;

    try {
      // Mouse look is consumed once per rendered frame. Movement and
      // collisions consume only fixed steps, so a large frame cannot reuse
      // the same pointer delta across several sub-steps.
      this.onFrameStart(deltaSeconds);

      while (
        this.accumulatorSeconds >= this.fixedStepSeconds &&
        fixedSteps < this.maximumSubSteps
      ) {
        this.update(this.fixedStepSeconds);
        this.accumulatorSeconds -= this.fixedStepSeconds;
        fixedSteps += 1;
      }

      if (
        fixedSteps === this.maximumSubSteps &&
        this.accumulatorSeconds >= this.fixedStepSeconds
      ) {
        // Drop only whole excess steps after the cap and retain the fractional
        // remainder. This prevents a spiral of death after an inactive tab.
        this.accumulatorSeconds %= this.fixedStepSeconds;
      }

      this.lastFixedSteps = fixedSteps;
      this.render();
    } finally {
      this.lastFixedSteps = fixedSteps;
      this.onFrameEnd(fixedSteps);
    }

    if (this.running) {
      this.frameRequestId = this.scheduler.requestFrame(this.onFrame);
    }
  };
}
