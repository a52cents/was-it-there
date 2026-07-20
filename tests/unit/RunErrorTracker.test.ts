import { describe, expect, it } from 'vitest';
import {
  MAX_RUN_ERRORS,
  RunErrorTracker,
} from '../../src/gameplay/run/RunErrorTracker';

describe('RunErrorTracker', () => {
  it('ends the run on the third error regardless of error kind', () => {
    const errors = new RunErrorTracker();

    expect(errors.recordError('timeout')).toMatchObject({
      errorCount: 1,
      remainingErrors: 2,
      lastError: 'timeout',
      gameOver: false,
    });
    expect(errors.recordError('incorrect-report')).toMatchObject({
      errorCount: 2,
      remainingErrors: 1,
      lastError: 'incorrect-report',
      gameOver: false,
    });
    expect(errors.recordError('timeout')).toEqual({
      errorCount: 3,
      maximumErrors: MAX_RUN_ERRORS,
      remainingErrors: 0,
      lastError: 'timeout',
      gameOver: true,
    });
  });

  it('cannot count a fourth error after Game Over', () => {
    const errors = new RunErrorTracker(1);
    errors.recordError('incorrect-report');

    expect(() => errors.recordError('timeout')).toThrow(
      /after the run has ended/u,
    );
  });

  it('grants exactly one extra error allowance after Game Over', () => {
    const errors = new RunErrorTracker();
    errors.recordError('timeout');
    errors.recordError('incorrect-report');
    errors.recordError('timeout');

    expect(errors.grantExtraLife()).toEqual({
      errorCount: 2,
      maximumErrors: MAX_RUN_ERRORS,
      remainingErrors: 1,
      lastError: null,
      gameOver: false,
    });
    expect(() => errors.grantExtraLife()).toThrow(/after game over/u);
  });

  it('resets every error field for a new run', () => {
    const errors = new RunErrorTracker();
    errors.recordError('incorrect-report');
    errors.reset();

    expect(errors.getSnapshot()).toEqual({
      errorCount: 0,
      maximumErrors: MAX_RUN_ERRORS,
      remainingErrors: MAX_RUN_ERRORS,
      lastError: null,
      gameOver: false,
    });
  });

  it('requires a positive integer error limit', () => {
    expect(() => new RunErrorTracker(0)).toThrow(RangeError);
    expect(() => new RunErrorTracker(2.5)).toThrow(RangeError);
  });
});
