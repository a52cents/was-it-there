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
    text: 'The tuning needle is fixed at 3:17. That is not a frequency.',
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
    text: 'Different titles. Different authors. Every story ends on page 317.',
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
  'story.bathroom.inspectMirror': {
    speaker: 'OBSERVATION',
    text: 'Fingerprints cover the inside of the glass. One of them is still moving.',
    durationMs: 4_300,
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
    text: '317 is carved underneath. The cut is fresh.',
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
