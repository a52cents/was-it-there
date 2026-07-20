import { STORY_LOOP_ANCHOR } from './StoryLoopAnchor';

export interface StorySubtitleCopy {
  readonly speaker: string;
  readonly text: string;
  readonly durationMs: number;
}

export const STORY_SUBTITLE_CATALOG = {
  'story.bedroom.radioBurst': {
    speaker: 'RADIO',
    text: 'The house forgot—',
    durationMs: 2_500,
  },
  'story.bedroom.emptyPlace': {
    speaker: 'MEMORY',
    text: 'There were four of us.',
    durationMs: 3_400,
  },
  'story.bedroom.inspectRadio': {
    speaker: 'OBSERVATION',
    text: `The tuning needle is fixed at ${STORY_LOOP_ANCHOR.shortTime}. That is not a frequency.`,
    durationMs: 4_000,
  },
  'story.bedroom.inspectTelevision': {
    speaker: 'OBSERVATION',
    text: 'The dark screen reflects the whole room. It does not reflect you.',
    durationMs: 4_200,
  },
  'story.bedroom.inspectWardrobe': {
    speaker: 'OBSERVATION',
    text: 'The wardrobe is locked from the inside.',
    durationMs: 3_200,
  },
  'story.bedroom.inspectBed': {
    speaker: 'OBSERVATION',
    text: 'Only one side of the sheets is still warm.',
    durationMs: 3_400,
  },
  'story.bedroom.inspectBooks': {
    speaker: 'OBSERVATION',
    text: `Different titles. Different authors. Every story ends on page ${STORY_LOOP_ANCHOR.number}.`,
    durationMs: 4_200,
  },
  'story.bedroom.inspectPicture': {
    speaker: 'OBSERVATION',
    text: 'A door is painted in the background. Fresh paint covers the handle.',
    durationMs: 4_100,
  },
  'story.bedroom.inspectPlant': {
    speaker: 'OBSERVATION',
    text: 'The soil is wet. The leaves have been dead for years.',
    durationMs: 3_700,
  },
  'story.bedroom.radioComplete': {
    speaker: 'RADIO',
    text: 'The house forgot someone.',
    durationMs: 3_600,
  },
  'story.bathroom.pipes': {
    speaker: 'HOUSE',
    text: 'Something moves through the pipes against the water.',
    durationMs: 3_400,
  },
  'story.bathroom.inspectBathtub': {
    speaker: 'OBSERVATION',
    text: 'The drain is completely dry. Something beneath it is breathing slowly.',
    durationMs: 4_300,
  },
  'story.bathroom.inspectVanity': {
    speaker: 'OBSERVATION',
    text: 'One drawer bears your name. It has no handle and no seam.',
    durationMs: 3_900,
  },
  'story.bathroom.inspectToothbrushes': {
    speaker: 'OBSERVATION',
    text: 'Four toothbrushes. One is wet. You only remember three people.',
    durationMs: 4_100,
  },
  'story.bathroom.inspectDuck': {
    speaker: 'OBSERVATION',
    text: `${STORY_LOOP_ANCHOR.number} is carved underneath. The cut is fresh.`,
    durationMs: 3_500,
  },
  'story.bathroom.inspectCandle': {
    speaker: 'OBSERVATION',
    text: 'The wax has run upward, toward a flame that was never lit.',
    durationMs: 3_900,
  },
  'story.bathroom.inspectTowels': {
    speaker: 'OBSERVATION',
    text: 'Every towel is dry except the one folded at the bottom. It is warm.',
    durationMs: 4_000,
  },
  'story.bathroom.mirrorWarning': {
    speaker: 'MIRROR',
    text: 'It remembers you differently.',
    durationMs: 4_000,
  },
  'story.corridor.phoneRings': {
    speaker: 'TELEPHONE',
    text: 'The telephone is ringing.',
    durationMs: 2_600,
  },
  'story.corridor.prediction': {
    speaker: 'CALLER',
    text: 'When the radio stops, do not answer your name.',
    durationMs: 4_800,
  },
  'story.office.radioPattern': {
    speaker: 'RADIO',
    text: 'A rising tone. Static. The same sequence as the bedroom.',
    durationMs: 4_200,
  },
  'story.office.predictedSilence': {
    speaker: 'OBSERVATION',
    text: 'The radio stops exactly as promised. In the silence, something almost says your name.',
    durationMs: 4_800,
  },
  'story.office.inspectRadio': {
    speaker: 'OBSERVATION',
    text: `The dial is fixed at ${STORY_LOOP_ANCHOR.shortTime}. The same impossible frequency as before.`,
    durationMs: 4_200,
  },
  'story.office.inspectPhone': {
    speaker: 'OBSERVATION',
    text: 'The receiver is warm. The line repeats your breathing half a second early.',
    durationMs: 4_200,
  },
  'story.office.inspectClock': {
    speaker: 'OBSERVATION',
    text: `The clock has no hands. Its red display reads ${STORY_LOOP_ANCHOR.displayTime}.`,
    durationMs: 3_800,
  },
  'story.office.erasedName': {
    speaker: 'MEMORY',
    text: 'It did not forget your name. It removed it.',
    durationMs: 4_800,
  },
  'story.office.exit': {
    speaker: 'HOUSE',
    text: 'The lock opens when the erased line matches your handwriting.',
    durationMs: 4_200,
  },
  'story.office.failure': {
    speaker: 'RADIO',
    text: 'Ra— ... answer me.',
    durationMs: 3_600,
  },
  'story.kitchen.reverseBreakfast': {
    speaker: 'APPLIANCES',
    text: 'The microwave chimes. Then the toaster clicks. Breakfast is playing backwards.',
    durationMs: 4_400,
  },
  'story.kitchen.chairBeforeArrival': {
    speaker: 'HOUSE',
    text: 'A chair scrapes beside the table. Nothing moved.',
    durationMs: 3_600,
  },
  'story.kitchen.inspectFridge': {
    speaker: 'OBSERVATION',
    text: 'Every container is labelled with tomorrow\'s date. All four portions are already empty.',
    durationMs: 4_400,
  },
  'story.kitchen.inspectMicrowave': {
    speaker: 'OBSERVATION',
    text: 'The timer is counting upward from zero. It chimed before you entered.',
    durationMs: 4_100,
  },
  'story.kitchen.inspectSink': {
    speaker: 'OBSERVATION',
    text: 'Wet fingerprints lie beneath the dust. The sink remembers being cleaned tomorrow.',
    durationMs: 4_400,
  },
  'story.kitchen.inspectStove': {
    speaker: 'OBSERVATION',
    text: 'Every burner is cold. In the hood\'s reflection, one of them is still burning.',
    durationMs: 4_200,
  },
  'story.kitchen.inspectCoffee': {
    speaker: 'OBSERVATION',
    text: 'The machine is warm. A fresh ring of coffee marks a cup that is not there.',
    durationMs: 4_100,
  },
  'story.kitchen.inspectTrashcan': {
    speaker: 'OBSERVATION',
    text: `A receipt stamped ${STORY_LOOP_ANCHOR.displayTime}. Four breakfasts served. Three paid for.`,
    durationMs: 4_500,
  },
  'story.kitchen.fourthPlace': {
    speaker: 'MEMORY',
    text: 'They kept setting my place after the house removed me.',
    durationMs: 4_800,
  },
  'story.kitchen.exit': {
    speaker: 'HOUSE',
    text: 'One place remains. It has been waiting for you.',
    durationMs: 4_200,
  },
  'story.kitchen.failure': {
    speaker: 'SERVICE',
    text: 'PLACE FOUR ACCEPTED. BEGIN PREPARATION.',
    durationMs: 3_600,
  },
} as const satisfies Readonly<Record<string, StorySubtitleCopy>>;

export type StorySubtitleCopyKey = keyof typeof STORY_SUBTITLE_CATALOG;

export function resolveStorySubtitleCopy(
  copyKey: string,
): StorySubtitleCopy {
  if (!Object.hasOwn(STORY_SUBTITLE_CATALOG, copyKey)) {
    throw new Error(`Unknown story subtitle copy key "${copyKey}".`);
  }

  return STORY_SUBTITLE_CATALOG[copyKey as StorySubtitleCopyKey];
}
