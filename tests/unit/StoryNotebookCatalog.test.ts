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
      discoveries: ['bedroom-page-317', 'bedroom-missing-reflection'],
    });

    expect(entries.map((entry) => entry.id)).toEqual([
      'observation-protocol',
      'bedroom-missing-reflection',
      'bedroom-page-317',
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
        'bathroom-inside-fingerprints',
        'bathroom-fourth-toothbrush',
        'bathroom-duck-317',
      ],
    });

    expect(entries.map((entry) => entry.id)).toEqual([
      'observation-protocol',
      'bathroom-inside-fingerprints',
      'bathroom-fourth-toothbrush',
      'bathroom-duck-317',
    ]);
  });
});
