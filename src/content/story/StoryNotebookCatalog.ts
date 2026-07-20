import type { PersistentStoryProgressSnapshot } from '../../gameplay/story/StoryProgress';
import {
  STORY_EASTER_EGG_DISCOVERY_IDS,
  STORY_LOOP_ANCHOR,
} from './StoryLoopAnchor';

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
    id: STORY_EASTER_EGG_DISCOVERY_IDS.bedroomPage,
    category: 'event',
    title: `PAGE ${STORY_LOOP_ANCHOR.number}`,
    body:
      'Every book stops on the same page. The final sentence is different in each one, but they all end with my name.',
    unlock: {
      type: 'discovery',
      id: STORY_EASTER_EGG_DISCOVERY_IDS.bedroomPage,
    },
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
    id: STORY_EASTER_EGG_DISCOVERY_IDS.bathroomDuck,
    category: 'event',
    title: `${STORY_LOOP_ANCHOR.number} AGAIN`,
    body:
      'The number beneath the rubber duck matches the final page in every bedroom book. Someone carved it recently.',
    unlock: {
      type: 'discovery',
      id: STORY_EASTER_EGG_DISCOVERY_IDS.bathroomDuck,
    },
  },
  {
    id: 'bathroom-mirror-warning',
    category: 'memory',
    title: 'THE WARNING',
    body:
      'Examining the mirror produced a warning: the house can replace a person as easily as an object.',
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
    id: 'office-predicted-silence',
    category: 'event',
    title: 'THE PROMISED SILENCE',
    body:
      'The office radio stopped exactly when the corridor caller said it would. Something used the silence to test the beginning of my name.',
    unlock: { type: 'discovery', id: 'office-predicted-silence' },
  },
  {
    id: 'office-clock-304',
    category: 'event',
    title: `${STORY_LOOP_ANCHOR.displayTime} IN THE OFFICE`,
    body:
      'The office clock has no hands or mechanism. It still displays the same time that anchors every reconstruction.',
    unlock: { type: 'discovery', id: 'office-clock-304' },
  },
  {
    id: 'office-erased-name',
    category: 'memory',
    title: 'THE ERASED NAME',
    body:
      'The missing resident was not forgotten by accident. The erased name matches the identity the house is trying to give me.',
    unlock: { type: 'fragment', id: 'memory-erased-name' },
  },
  {
    id: 'kitchen-reverse-breakfast',
    category: 'event',
    title: 'BREAKFAST IN REVERSE',
    body:
      'The appliances replayed the end of a breakfast before anyone sat down. The kitchen remembers events that have not happened yet.',
    unlock: { type: 'event', id: 'kitchen-reverse-breakfast' },
  },
  {
    id: 'kitchen-receipt-304',
    category: 'event',
    title: `THE ${STORY_LOOP_ANCHOR.displayTime} RECEIPT`,
    body:
      'A receipt records four breakfasts at the loop time, but payment for only three. Its date is tomorrow.',
    unlock: { type: 'discovery', id: 'kitchen-receipt-304' },
  },
  {
    id: 'kitchen-fourth-place',
    category: 'memory',
    title: 'THE FOURTH PLACE',
    body:
      'The family kept setting my place even after the house removed my name. The room remembers my absence as part of the meal.',
    unlock: { type: 'fragment', id: 'memory-kitchen-fourth-place' },
  },
  {
    id: 'chapter-escaped',
    category: 'outcome',
    title: 'CHAPTER ESCAPED',
    body:
      'I escaped the reconstructed rooms, but part of the memory is still missing. The house knows more about me than I do.',
    unlock: { type: 'outcome', id: 'chapter-escaped' },
  },
  {
    id: 'chapter-remembered',
    category: 'outcome',
    title: 'CHAPTER REMEMBERED',
    body:
      'All four memories connect. My identity belongs to the resident the house deliberately removed from its records.',
    unlock: { type: 'outcome', id: 'chapter-remembered' },
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
