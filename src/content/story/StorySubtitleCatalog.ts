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
    text: 'There were four of us. Someone cut Elise out of the photograph.',
    durationMs: 4_600,
  },
  'story.bedroom.photoIncomplete': {
    speaker: 'OBSERVATION',
    text: 'The faces are blurred by static. The radio may be carrying the missing part.',
    durationMs: 4_200,
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
    text: 'This is not a house. It is rebuilding you from what it remembers.',
    durationMs: 4_800,
  },
  'story.bathroom.mirrorIncomplete': {
    speaker: 'MIRROR',
    text: 'Your reflection moves, but it will not meet your eyes. Something else must identify you first.',
    durationMs: 4_500,
  },
  'story.corridor.phoneRings': {
    speaker: 'TELEPHONE',
    text: 'The telephone is ringing.',
    durationMs: 2_600,
  },
  'story.corridor.inspectClock': {
    speaker: 'OBSERVATION',
    text: `The clock is stopped at ${STORY_LOOP_ANCHOR.displayTime}. Scratches beneath it read: SUBJECT 04 LEFT THIS WAY.`,
    durationMs: 4_800,
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
  'story.office.clockIncomplete': {
    speaker: 'OBSERVATION',
    text: 'The display is blank. The radio signal may be the key that wakes it.',
    durationMs: 4_000,
  },
  'story.office.erasedName': {
    speaker: 'MEMORY',
    text: 'ELISE VALE. It did not forget your name. Someone ordered it removed.',
    durationMs: 5_200,
  },
  'story.office.photoIncomplete': {
    speaker: 'OBSERVATION',
    text: 'The erased line will not hold still. The clock and radio belong to the same record.',
    durationMs: 4_300,
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
    text: 'The fourth place belonged to Elise. They kept setting it after she died.',
    durationMs: 5_000,
  },
  'story.kitchen.tableIncomplete': {
    speaker: 'OBSERVATION',
    text: 'Four places, but no name. The discarded receipt may say who breakfast was for.',
    durationMs: 4_400,
  },
  'story.kitchen.exit': {
    speaker: 'HOUSE',
    text: 'The last dinner remembers who gave the order. It is waiting for you.',
    durationMs: 4_200,
  },
  'story.kitchen.failure': {
    speaker: 'SERVICE',
    text: 'PLACE FOUR ACCEPTED. BEGIN PREPARATION.',
    durationMs: 3_600,
  },
  'story.dining.lastDinnerEcho': {
    speaker: 'DINING ROOM',
    text: 'Four voices repeat the same unfinished dinner. One always stops at 03:04.',
    durationMs: 4_800,
  },
  'story.dining.previousLoop': {
    speaker: 'OBSERVATION',
    text: 'The corridor caller is among the voices. It sounds exactly like you.',
    durationMs: 4_600,
  },
  'story.dining.bearTag': {
    speaker: 'MEMORY',
    text: 'NOAH VALE. “If I forget, ask Elise.” Your hand recognizes the handwriting.',
    durationMs: 5_200,
  },
  'story.dining.sideboardLocked': {
    speaker: 'OBSERVATION',
    text: 'The lock has no keyhole. Its shallow mark is shaped like the bear.',
    durationMs: 4_300,
  },
  'story.dining.deletionOrder': {
    speaker: 'ARCHIVE',
    text: 'ELISE VALE — deceased at 03:04. Remove Subject 04. Signed: Dr. Adrian Vale.',
    durationMs: 5_800,
  },
  'story.dining.tableIncomplete': {
    speaker: 'OBSERVATION',
    text: 'The fourth place repeats the dinner, but the memory has no ending yet.',
    durationMs: 4_400,
  },
  'story.dining.reconstructionTruth': {
    speaker: 'MEMORY',
    text: 'Elise died in the fire at 03:04. You are the copy these rooms rebuilt from what her family left behind.',
    durationMs: 7_000,
  },
  'story.dining.failure': {
    speaker: 'HOUSE',
    text: 'SUBJECT 04 INCOMPLETE. ERASE AND REBUILD.',
    durationMs: 4_000,
  },
  'story.living.recordingEcho': {
    speaker: 'TAPE',
    text: 'A rewinding cassette clicks somewhere near the archive shelf.',
    durationMs: 4_100,
  },
  'story.living.tapeLabel': {
    speaker: 'OBSERVATION',
    text: 'NOAH // FOR ELISE, WHEN THE HOUSE BRINGS HER BACK.',
    durationMs: 4_600,
  },
  'story.living.playerEmpty': {
    speaker: 'OBSERVATION',
    text: 'The player is waiting. Its cassette compartment is empty.',
    durationMs: 3_700,
  },
  'story.living.noahVoice': {
    speaker: 'NOAH',
    text: "Elise, if you hear this, Dad did not save you. The house did. Do not let him reach the archive.",
    durationMs: 6_800,
  },
  'story.living.televisionSilent': {
    speaker: 'OBSERVATION',
    text: 'A frozen waveform fills the screen. It is waiting for a recording.',
    durationMs: 4_000,
  },
  'story.living.noahReveal': {
    speaker: 'MEMORY',
    text: 'Noah kept feeding memories back into the house. He built the earlier copies to protect you from Adrian.',
    durationMs: 6_800,
  },
  'story.living.failure': {
    speaker: 'HOUSE',
    text: 'UNAUTHORIZED RECORDING DETECTED. REMOVE THE WITNESS.',
    durationMs: 4_200,
  },
  'story.laundry.machineCycle': {
    speaker: 'LAUNDRY ROOM',
    text: 'The washer completes a cycle with no water connected. Something taps once from inside.',
    durationMs: 4_800,
  },
  'story.laundry.washerTag': {
    speaker: 'ARCHIVE',
    text: 'SUBJECT 04 — ITERATION 17. ASH LOAD. FAILED DOMESTIC RECALL.',
    durationMs: 5_100,
  },
  'story.laundry.rackUnreadable': {
    speaker: 'OBSERVATION',
    text: 'Every garment has a numbered tag, but you need a starting number.',
    durationMs: 4_100,
  },
  'story.laundry.labelsMatched': {
    speaker: 'MEMORY',
    text: 'Iterations 18 through 26. Your size. Your ash marks. None of these clothes belonged to the original Elise.',
    durationMs: 6_500,
  },
  'story.laundry.binSealed': {
    speaker: 'OBSERVATION',
    text: 'The disposal lock expects the last matching iteration number.',
    durationMs: 3_900,
  },
  'story.laundry.discardedCopies': {
    speaker: 'MEMORY',
    text: 'The earlier reconstructions became real enough to leave clothes behind. The house erased them here when they failed.',
    durationMs: 6_800,
  },
  'story.laundry.failure': {
    speaker: 'HOUSE',
    text: 'ITERATION REJECTED. PREPARE THE NEXT LOAD.',
    durationMs: 4_000,
  },
  'story.entrance.doorBreathing': {
    speaker: 'ENTRANCE',
    text: 'The front door expands with the walls, as though the house is breathing through it.',
    durationMs: 4_500,
  },
  'story.entrance.intercom': {
    speaker: 'ADRIAN — ARCHIVED',
    text: 'Iteration twenty-seven is stable. Route it away from the entrance and return it to the archive.',
    durationMs: 6_000,
  },
  'story.entrance.clockUnreadable': {
    speaker: 'OBSERVATION',
    text: 'The clock has no hands. The intercom may contain its return instruction.',
    durationMs: 4_000,
  },
  'story.entrance.returnTrace': {
    speaker: 'ARCHIVE',
    text: '03:04 is not when the loop begins. It is the address that sends every failed Elise back inside.',
    durationMs: 5_800,
  },
  'story.entrance.doorSealed': {
    speaker: 'OBSERVATION',
    text: 'There is no outside behind the lock. Trace the mechanism that returns the copies.',
    durationMs: 4_300,
  },
  'story.entrance.falseExit': {
    speaker: 'MEMORY',
    text: 'The front door opens onto another interior wall. The only real exit is through the archive that built you.',
    durationMs: 6_300,
  },
  'story.mainHall.archivePulse': {
    speaker: 'ARCHIVE',
    text: 'Twenty-seven lives wait inside the machine. One of them is yours.',
    durationMs: 4_600,
  },
  'story.mainHall.archiveOpened': {
    speaker: 'ARCHIVE',
    text: 'The house preserved Elise, Noah, and every failed copy. It cannot decide which memory has the right to become a person.',
    durationMs: 7_000,
  },
  'story.mainHall.choiceSealed': {
    speaker: 'ARCHIVE',
    text: 'No answer can be accepted until you have opened the archive.',
    durationMs: 3_800,
  },
  'story.mainHall.escape': {
    speaker: 'ELISE',
    text: 'Delete the reconstruction route. Let the dead remain remembered, and let this life leave as itself.',
    durationMs: 6_200,
  },
  'story.mainHall.remember': {
    speaker: 'ELISE',
    text: 'Restore every memory. If the house insists I am Elise, I will carry all of her — including the fire.',
    durationMs: 6_400,
  },
  'story.mainHall.replaced': {
    speaker: 'HOUSE',
    text: 'SUBJECT ACCEPTED. THE HOUSE NO LONGER NEEDS TO REMEMBER ELISE. IT WILL REMEMBER YOU.',
    durationMs: 6_400,
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
