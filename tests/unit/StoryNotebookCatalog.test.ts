import { describe, expect, it } from 'vitest';
import { getUnlockedStoryNotebookEntries } from '../../src/content/story/StoryNotebookCatalog';
import { createEmptyStoryProgress } from '../../src/gameplay/story/StorySaveRepository';

describe('StoryNotebookCatalog', () => {
  it('reveals entries only after their matching durable discovery', () => {
    const empty = createEmptyStoryProgress();
    expect(getUnlockedStoryNotebookEntries(empty).map((entry) => entry.id)).toEqual([
      'observation-protocol',
    ]);

    expect(
      getUnlockedStoryNotebookEntries({
        ...empty,
        fragments: ['memory-empty-place'],
        chapterOutcomeIds: ['chapter-one-complete'],
      }).map((entry) => entry.id),
    ).toEqual([
      'observation-protocol',
      'bedroom-empty-place',
      'chapter-one-complete',
    ]);
  });

  it('records hidden inspection easter eggs as notebook entries', () => {
    const entries = getUnlockedStoryNotebookEntries({
      ...createEmptyStoryProgress(),
      discoveries: ['bedroom-page-304', 'bedroom-missing-reflection'],
    });

    expect(entries.map((entry) => entry.id)).toEqual([
      'observation-protocol',
      'bedroom-missing-reflection',
      'bedroom-page-304',
    ]);
  });

  it('records the corridor prediction as a durable memory', () => {
    const entries = getUnlockedStoryNotebookEntries({
      ...createEmptyStoryProgress(),
      fragments: ['memory-phone-prediction'],
    });

    expect(entries.map((entry) => entry.id)).toContain(
      'corridor-phone-prediction',
    );
  });

  it('connects bathroom examination easter eggs across rooms', () => {
    const entries = getUnlockedStoryNotebookEntries({
      ...createEmptyStoryProgress(),
      discoveries: [
        'bathroom-fourth-toothbrush',
        'bathroom-duck-304',
      ],
      fragments: ['memory-mirror-warning'],
    });

    expect(entries.map((entry) => entry.id)).toEqual([
      'observation-protocol',
      'bathroom-fourth-toothbrush',
      'bathroom-duck-304',
      'bathroom-mirror-warning',
    ]);
  });

  it('records the office memory and its remembered chapter outcome', () => {
    const entries = getUnlockedStoryNotebookEntries({
      ...createEmptyStoryProgress(),
      discoveries: ['office-predicted-silence', 'office-clock-304'],
      fragments: ['memory-erased-name'],
      chapterOutcomeIds: ['chapter-one-complete', 'chapter-remembered'],
    });

    expect(entries.map((entry) => entry.id)).toEqual([
      'observation-protocol',
      'office-predicted-silence',
      'office-clock-304',
      'office-erased-name',
      'chapter-remembered',
      'chapter-one-complete',
    ]);
  });

  it('records the reversed breakfast and the fourth-place memory', () => {
    const entries = getUnlockedStoryNotebookEntries({
      ...createEmptyStoryProgress(),
      discoveries: ['kitchen-receipt-304'],
      fragments: ['memory-kitchen-fourth-place'],
      triggeredEventIds: ['kitchen-reverse-breakfast'],
    });

    expect(entries.map((entry) => entry.id)).toEqual([
      'observation-protocol',
      'kitchen-reverse-breakfast',
      'kitchen-receipt-304',
      'kitchen-fourth-place',
    ]);
  });

  it('records the evidence and final dining-room reconstruction', () => {
    const entries = getUnlockedStoryNotebookEntries({
      ...createEmptyStoryProgress(),
      discoveries: [
        'dining-previous-loop-voice',
        'dining-bear-tag',
        'dining-deletion-order',
      ],
      fragments: ['memory-dining-reconstruction'],
    });

    expect(entries.map((entry) => entry.id)).toEqual([
      'observation-protocol',
      'dining-previous-loop-voice',
      'dining-bear-tag',
      'dining-deletion-order',
      'dining-reconstruction-truth',
    ]);
  });

  it("records Noah's living-room evidence and the current route outcome", () => {
    const entries = getUnlockedStoryNotebookEntries({
      ...createEmptyStoryProgress(),
      discoveries: ['living-noah-tape', 'living-noah-message'],
      fragments: ['memory-noah-protection'],
      chapterOutcomeIds: ['chapter-two-recording'],
    });

    expect(entries.map((entry) => entry.id)).toEqual([
      'observation-protocol',
      'living-noah-tape',
      'living-noah-message',
      'living-noah-protection',
      'chapter-two-recording',
    ]);
  });

  it('records the physical evidence left by discarded copies', () => {
    const entries = getUnlockedStoryNotebookEntries({
      ...createEmptyStoryProgress(),
      discoveries: ['laundry-iteration-17'],
      fragments: ['memory-discarded-copies'],
      chapterOutcomeIds: ['chapter-two-copies'],
    });

    expect(entries.map((entry) => entry.id)).toEqual([
      'observation-protocol',
      'laundry-iteration-17',
      'laundry-discarded-copies',
      'chapter-two-copies',
    ]);
  });
});
