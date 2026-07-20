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
      'The family photograph once showed four people. The missing resident was named Elise Vale; her name and body were deliberately cut from the image.',
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
      'The mirror confirmed that these rooms are not stable places. The house is reconstructing a person from remembered details, just as it reconstructs furniture.',
    unlock: { type: 'fragment', id: 'memory-mirror-warning' },
  },
  {
    id: 'corridor-clock-304',
    category: 'event',
    title: 'SUBJECT 04 PASSED HERE',
    body:
      'The corridor clock is fixed at 03:04. Scratches beneath it claim Subject 04 already walked this route before me.',
    unlock: { type: 'discovery', id: 'corridor-clock-304' },
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
      'The missing resident was Elise Vale. Her record was not lost: an authorized command deliberately removed it from the domestic archive.',
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
      'The fourth place belonged to Elise. Her family kept setting it after her death, leaving a domestic memory the deletion command could not erase.',
    unlock: { type: 'fragment', id: 'memory-kitchen-fourth-place' },
  },
  {
    id: 'dining-previous-loop-voice',
    category: 'event',
    title: 'MY VOICE ON THE LINE',
    body:
      'The corridor caller was not another resident. It was an earlier reconstruction of me, warning the next loop before it was erased.',
    unlock: { type: 'discovery', id: 'dining-previous-loop-voice' },
  },
  {
    id: 'dining-bear-tag',
    category: 'event',
    title: "NOAH'S BEAR",
    body:
      'The tag belongs to Noah Vale and carries a note written by Elise. The handwriting feels natural in my hand because the house copied that memory into me.',
    unlock: { type: 'discovery', id: 'dining-bear-tag' },
  },
  {
    id: 'dining-deletion-order',
    category: 'event',
    title: 'THE DELETION ORDER',
    body:
      'Elise died in a fire at 03:04. Her father, Dr. Adrian Vale, ordered Subject 04 removed when the domestic archive kept reconstructing his dead daughter as if memory were a person.',
    unlock: { type: 'discovery', id: 'dining-deletion-order' },
  },
  {
    id: 'dining-reconstruction-truth',
    category: 'memory',
    title: 'SUBJECT 04',
    body:
      'I am not Elise returned from the dead. I am a reconstruction assembled from photographs, routines, reflections and the memories her family left in the house.',
    unlock: { type: 'fragment', id: 'memory-dining-reconstruction' },
  },
  {
    id: 'living-noah-tape',
    category: 'event',
    title: "NOAH'S RECORDING",
    body:
      'Noah prepared a cassette for Elise before this reconstruction existed. He expected the house to bring her back.',
    unlock: { type: 'discovery', id: 'living-noah-tape' },
  },
  {
    id: 'living-noah-message',
    category: 'event',
    title: 'THE ARCHIVE HAS A GUARDIAN',
    body:
      'Noah says Adrian tried to reach the archive after ordering Elise erased. The earlier copies were not accidents: Noah used the house to keep warning the next one.',
    unlock: { type: 'discovery', id: 'living-noah-message' },
  },
  {
    id: 'living-noah-protection',
    category: 'memory',
    title: 'NOAH REMEMBERED ME',
    body:
      'Noah preserved Elise through recordings, routines and repeated reconstructions. The house rebuilds her because someone kept teaching it not to forget.',
    unlock: { type: 'fragment', id: 'memory-noah-protection' },
  },
  {
    id: 'chapter-escaped',
    category: 'outcome',
    title: 'CHAPTER ONE SURVIVED',
    body:
      'I survived the first reconstruction route and learned what I am, but the house itself is not escaped. I still do not know who kept carrying the warning from one copy to the next.',
    unlock: { type: 'outcome', id: 'chapter-escaped' },
  },
  {
    id: 'chapter-remembered',
    category: 'outcome',
    title: 'CHAPTER REMEMBERED',
    body:
      'Elise died at 03:04. Adrian ordered her archive erased, but family habits rebuilt her. The radio and telephone were earlier copies of me helping this reconstruction survive.',
    unlock: { type: 'outcome', id: 'chapter-remembered' },
  },
  {
    id: 'chapter-one-complete',
    category: 'outcome',
    title: 'THE INNER ROUTE OPENED',
    body:
      'The first route through the house is complete. Escape Mode is now open, but the Story continues beyond the dining room toward the front of the house.',
    unlock: { type: 'outcome', id: 'chapter-one-complete' },
  },
  {
    id: 'chapter-two-recording',
    category: 'outcome',
    title: 'THE RECORDING SURVIVED',
    body:
      "Noah's message survived the living room. The next route leads toward the laundry room, where the fire damage and Adrian's return can be traced.",
    unlock: { type: 'outcome', id: 'chapter-two-recording' },
  },
  {
    id: 'laundry-iteration-17',
    category: 'event',
    title: 'ITERATION 17',
    body:
      'The washer processed Subject 04 as an ash load after a failed domestic recall. The house numbered every reconstruction.',
    unlock: { type: 'discovery', id: 'laundry-iteration-17' },
  },
  {
    id: 'laundry-discarded-copies',
    category: 'memory',
    title: 'THE DISCARDED COPIES',
    body:
      'Earlier versions of me became physical enough to wear clothes, carry ash and fail. The laundry room erased their remains before rebuilding the bedroom again.',
    unlock: { type: 'fragment', id: 'memory-discarded-copies' },
  },
  {
    id: 'chapter-two-copies',
    category: 'outcome',
    title: 'THE COPIES WERE HERE',
    body:
      'The trail of discarded reconstructions continues toward the entrance corridor. The front door may have been part of the loop all along.',
    unlock: { type: 'outcome', id: 'chapter-two-copies' },
  },
  {
    id: 'entrance-adrian-return',
    category: 'event',
    title: "ADRIAN'S RETURN ORDER",
    body: 'Adrian classified this reconstruction as iteration twenty-seven and ordered the entrance to return it to the archive instead of letting it outside.',
    unlock: { type: 'discovery', id: 'entrance-adrian-return' },
  },
  {
    id: 'entrance-false-exit',
    category: 'memory',
    title: 'THE FALSE FRONT DOOR',
    body: 'The front door was another loop mechanism. Every route through the house ended at an interior wall and sent the failed copy back to the archive.',
    unlock: { type: 'fragment', id: 'memory-false-exit' },
  },
  {
    id: 'main-hall-archive-truth',
    category: 'event',
    title: 'THE ARCHIVE CANNOT CHOOSE',
    body: 'The archive preserved Elise, Noah and every reconstructed life, but it cannot decide whether a perfect memory has become a person. That decision belongs to the current copy.',
    unlock: { type: 'discovery', id: 'main-hall-archive-truth' },
  },
  {
    id: 'ending-escape',
    category: 'outcome',
    title: 'A LIFE OF YOUR OWN',
    body: 'The reconstruction route was erased. Elise remains remembered, while the person created from her memories leaves the house as someone new.',
    unlock: { type: 'outcome', id: 'ending-escape' },
  },
  {
    id: 'ending-remember',
    category: 'outcome',
    title: 'ELISE REMEMBERED',
    body: 'Every archived memory was restored, including the fire. The reconstruction chose to carry the whole of Elise forward.',
    unlock: { type: 'outcome', id: 'ending-remember' },
  },
  {
    id: 'ending-replaced',
    category: 'outcome',
    title: 'THE NEW HOUSE',
    body: 'The reconstruction accepted the archive and became its living memory. The house stopped rebuilding Elise and began rebuilding itself around its new keeper.',
    unlock: { type: 'outcome', id: 'ending-replaced' },
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
