import { describe, expect, it } from 'vitest';
import {
  assertValidStoryEventCatalog,
  type StoryEventDefinition,
} from '../../src/gameplay/story/StoryEvent';

function createEvent(
  overrides: Partial<StoryEventDefinition> = {},
): StoryEventDefinition {
  return {
    id: 'bedroom-radio',
    roomId: 'greybox-bedroom',
    trigger: { type: 'loop-started' },
    effects: [{ type: 'subtitle', copyKey: 'story.bedroom.radio' }],
    repeat: 'once-ever',
    ...overrides,
  };
}

describe('StoryEvent catalog validation', () => {
  it('accepts a well-formed authored catalog', () => {
    expect(() =>
      assertValidStoryEventCatalog([
        createEvent(),
        createEvent({
          id: 'corridor-phone',
          roomId: 'first-corridor',
          trigger: {
            type: 'phase-elapsed',
            phase: 'observation',
            elapsedMs: 6_000,
          },
          conditions: {
            minimumLoop: 1,
            maximumPressure: 2,
          },
        }),
      ]),
    ).not.toThrow();
  });

  it('rejects duplicate ids and empty effect lists', () => {
    expect(() =>
      assertValidStoryEventCatalog([createEvent(), createEvent()]),
    ).toThrow('Duplicate story event id');
    expect(() =>
      assertValidStoryEventCatalog([createEvent({ effects: [] })]),
    ).toThrow('must contain an effect');
  });

  it('rejects invalid elapsed time and condition ranges', () => {
    expect(() =>
      assertValidStoryEventCatalog([
        createEvent({
          trigger: {
            type: 'phase-elapsed',
            phase: 'observation',
            elapsedMs: -1,
          },
        }),
      ]),
    ).toThrow('elapsed time must be finite and non-negative');
    expect(() =>
      assertValidStoryEventCatalog([
        createEvent({
          conditions: { minimumPressure: 3, maximumPressure: 1 },
        }),
      ]),
    ).toThrow('pressure minimum exceeds its maximum');
  });

  it('rejects blank data identifiers and non-finite flag values', () => {
    expect(() =>
      assertValidStoryEventCatalog([
        createEvent({
          effects: [{ type: 'add-fragment', fragmentId: ' ' }],
        }),
      ]),
    ).toThrow('fragment id must not be empty');
    expect(() =>
      assertValidStoryEventCatalog([
        createEvent({
          effects: [
            { type: 'set-flag', flagId: 'memory', value: Number.NaN },
          ],
        }),
      ]),
    ).toThrow('flag value must be finite');
  });
});
