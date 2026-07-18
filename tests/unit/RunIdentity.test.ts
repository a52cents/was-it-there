import { describe, expect, it } from 'vitest';
import { createRunIdentity } from '../../src/gameplay/run/RunIdentity';

describe('createRunIdentity', () => {
  it('normalizes the run seed and records a stable escape identity', () => {
    expect(createRunIdentity(-1, 123.9)).toEqual({
      seed: 4_294_967_295,
      startedAt: 123,
      mode: 'escape',
    });
  });

  it('rejects a non-finite start time', () => {
    expect(() => createRunIdentity(1, Number.NaN)).toThrow(
      'Run start time must be finite',
    );
  });
});
