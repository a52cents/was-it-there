import type { PersistentStoryProgressSnapshot } from '../../gameplay/story/StoryProgress';

export type StoryNotebookEntryCategory =
  | 'rule'
  | 'event'
  | 'memory'
  | 'outcome';

export interface StoryNotebookEntryDefinition {
  readonly id: string;
  readonly category: StoryNotebookEntryCategory;
  readonly title: string;
  readonly body: string;
  readonly unlock:
    | { readonly type: 'always' }
    | { readonly type: 'event'; readonly id: string }
    | { readonly type: 'discovery'; readonly id: string }
    | { readonly type: 'fragment'; readonly id: string }
    | { readonly type: 'outcome'; readonly id: string };
}

export const STORY_NOTEBOOK_CATALOG: readonly StoryNotebookEntryDefinition[] = [
  {
    id: 'observation-protocol',
    category: 'rule',
    title: 'THE OBSERVATION PROTOCOL',
    body:
      'Memorize what belongs in the room. After the dark, report only what changed. The house remembers every mistake.',
    unlock: { type: 'always' },
  },
  {
    id: 'bedroom-radio-signal',
    category: 'event',
    title: 'A SIGNAL IN THE BEDROOM',
    body:
      'The radio came alive without being touched. Something in the static sounded less like a voice than a warning.',
    unlock: { type: 'event', id: 'bedroom-radio-burst' },
  },
  {
    id: 'bedroom-empty-place',
    category: 'memory',
    title: 'THE EMPTY PLACE',
    body:
      'The family photograph feels incomplete. There is room beside them for someone the image refuses to remember.',
    unlock: { type: 'fragment', id: 'memory-empty-place' },
  },
  {
    id: 'bedroom-missing-reflection',
    category: 'event',
    title: 'NO REFLECTION',
    body:
      'The television showed every object in the bedroom except the person standing in front of it.',
    unlock: { type: 'discovery', id: 'bedroom-missing-reflection' },
  },
  {
    id: 'bedroom-page-317',
    category: 'event',
    title: 'PAGE 317',
    body:
      'Every book stops on the same page. The final sentence is different in each one, but they all end with my name.',
    unlock: { type: 'discovery', id: 'bedroom-page-317' },
  },
  {
    id: 'bathroom-inside-fingerprints',
    category: 'event',
    title: 'BEHIND THE MIRROR',
    body:
      'The fingerprints were not on the surface. They moved behind the glass, as if the reflection were another room.',
    unlock: { type: 'discovery', id: 'bathroom-inside-fingerprints' },
  },
  {
    id: 'bathroom-fourth-toothbrush',
    category: 'event',
    title: 'A FOURTH TOOTHBRUSH',
    body:
      'The bathroom was prepared for four people. The newest toothbrush was wet, but I still cannot remember who used it.',
    unlock: { type: 'discovery', id: 'bathroom-fourth-toothbrush' },
  },
  {
    id: 'bathroom-duck-317',
    category: 'event',
    title: '317 AGAIN',
    body:
      'The number beneath the rubber duck matches the final page in every bedroom book. Someone carved it recently.',
    unlock: { type: 'discovery', id: 'bathroom-duck-317' },
  },
  {
    id: 'bathroom-mirror-warning',
    category: 'memory',
    title: 'THE WARNING',
    body:
      'Writing appeared in the mirror only after the room was stable. It warned that the house can replace a person as easily as an object.',
    unlock: { type: 'fragment', id: 'memory-mirror-warning' },
  },
  {
    id: 'corridor-phone-prediction',
    category: 'memory',
    title: 'THE PREDICTION',
    body:
      'The corridor caller knew what would happen in the office: when the radio stops, do not answer your name.',
    unlock: { type: 'fragment', id: 'memory-phone-prediction' },
  },
  {
    id: 'chapter-one-complete',
    category: 'outcome',
    title: 'THE HOUSE LET ME LEAVE',
    body:
      'The first route through the house is complete. Escape is now open, but leaving the test is not the same as understanding it.',
    unlock: { type: 'outcome', id: 'chapter-one-complete' },
  },
] as const;

export function getUnlockedStoryNotebookEntries(
  progress: PersistentStoryProgressSnapshot,
): readonly StoryNotebookEntryDefinition[] {
  return STORY_NOTEBOOK_CATALOG.filter((entry) => {
    switch (entry.unlock.type) {
      case 'always':
        return true;
      case 'event':
        return progress.triggeredEventIds.includes(entry.unlock.id);
      case 'discovery':
        return progress.discoveries.includes(entry.unlock.id);
      case 'fragment':
        return progress.fragments.includes(entry.unlock.id);
      case 'outcome':
        return progress.chapterOutcomeIds.includes(entry.unlock.id);
    }
  });
}
