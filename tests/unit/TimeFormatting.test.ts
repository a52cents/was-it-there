import { describe, expect, it } from 'vitest';
import {
  formatElapsedMilliseconds,
  formatRemainingMilliseconds,
} from '../../src/core/time/TimeFormatting';

describe('time formatting', () => {
  it('floors elapsed time to stable whole seconds', () => {
    expect(formatElapsedMilliseconds(0)).toBe('00:00');
    expect(formatElapsedMilliseconds(999)).toBe('00:00');
    expect(formatElapsedMilliseconds(61_999)).toBe('01:01');
  });

  it('ceils countdown time so a second is not hidden early', () => {
    expect(formatRemainingMilliseconds(15_000)).toBe('00:15');
    expect(formatRemainingMilliseconds(14_001)).toBe('00:15');
    expect(formatRemainingMilliseconds(14_000)).toBe('00:14');
    expect(formatRemainingMilliseconds(1)).toBe('00:01');
    expect(formatRemainingMilliseconds(0)).toBe('00:00');
  });
});
