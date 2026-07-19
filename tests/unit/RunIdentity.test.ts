import { describe, expect, it } from 'vitest';
import { createRunIdentity } from '../../src/gameplay/run/RunIdentity';

describe('createRunIdentity', () => {
  it('normalizes the run seed and records a stable escape identity', () => {
    expect(createRunIdentity({ seed: -1, startedAt: 123.9 })).toEqual({
      seed: 4_294_967_295,
      startedAt: 123,
      mode: 'escape',
    });
  });

  it('records a story identity without changing seed normalization', () => {
    expect(
      createRunIdentity({ mode: 'story', seed: -2, startedAt: 456.8 }),
    ).toEqual({
      seed: 4_294_967_294,
      startedAt: 456,
      mode: 'story',
    });
  });

  it('rejects a non-finite start time', () => {
    expect(() =>
      createRunIdentity({ seed: 1, startedAt: Number.NaN }),
    ).toThrow(
      'Run start time must be finite',
    );
  });
});
