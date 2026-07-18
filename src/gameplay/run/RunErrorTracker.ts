export const MAX_RUN_ERRORS = 3;

export type RunErrorKind = 'incorrect-report' | 'timeout';

export interface RunErrorSnapshot {
  readonly errorCount: number;
  readonly maximumErrors: number;
  readonly remainingErrors: number;
  readonly lastError: RunErrorKind | null;
  readonly gameOver: boolean;
}

export class RunErrorTracker {
  private errorCount = 0;
  private lastError: RunErrorKind | null = null;

  public constructor(
    private readonly maximumErrors: number = MAX_RUN_ERRORS,
  ) {
    if (!Number.isInteger(maximumErrors) || maximumErrors <= 0) {
      throw new RangeError('Maximum run errors must be a positive integer.');
    }
  }

  public recordError(kind: RunErrorKind): RunErrorSnapshot {
    if (this.errorCount >= this.maximumErrors) {
      throw new Error('Cannot record an error after the run has ended.');
    }

    this.errorCount += 1;
    this.lastError = kind;
    return this.getSnapshot();
  }

  public getSnapshot(): RunErrorSnapshot {
    return {
      errorCount: this.errorCount,
      maximumErrors: this.maximumErrors,
      remainingErrors: Math.max(0, this.maximumErrors - this.errorCount),
      lastError: this.lastError,
      gameOver: this.errorCount >= this.maximumErrors,
    };
  }

  public reset(): void {
    this.errorCount = 0;
    this.lastError = null;
  }
}
