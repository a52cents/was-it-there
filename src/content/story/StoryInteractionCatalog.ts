import type { StoryInteractionDefinition } from '../../gameplay/story/StoryInteraction';

export const BEDROOM_FAMILY_PHOTO_OBJECT_ID = 'bedroom-family-photo';
export const BEDROOM_STORY_OBJECT_IDS = {
  photo: BEDROOM_FAMILY_PHOTO_OBJECT_ID,
  radio: 'bedroom-radio',
  television: 'bedroom-television',
  wardrobe: 'bedroom-wardrobe',
  bed: 'bedroom-bed',
  books: 'bedroom-books',
  picture: 'bedroom-wall-picture',
  plant: 'bedroom-plant',
} as const;
export const BATHROOM_STORY_OBJECT_IDS = {
  mirror: 'bathroom-mirror',
  bathtub: 'bathroom-bathtub',
  vanity: 'bathroom-vanity',
  toothbrushes: 'bathroom-toothbrushes',
  duck: 'bathroom-rubber-duck',
  candle: 'bathroom-candle',
  towels: 'bathroom-towels',
} as const;
export const CORRIDOR_PHONE_OBJECT_ID = 'corridor-phone';
export const CORRIDOR_STORY_OBJECT_IDS = {
  clock: 'corridor-wall-clock',
  phone: CORRIDOR_PHONE_OBJECT_ID,
} as const;
export const OFFICE_STORY_OBJECT_IDS = {
  radio: 'office-radio',
  phone: 'office-phone',
  clock: 'office-wall-clock',
  photo: 'office-desk-photo',
} as const;
export const KITCHEN_STORY_OBJECT_IDS = {
  fridge: 'kitchen-fridge',
  microwave: 'kitchen-microwave',
  sink: 'kitchen-sink',
  stove: 'kitchen-stove',
  coffeeMachine: 'kitchen-coffee-machine',
  trashcan: 'kitchen-trashcan',
  breakfastTable: 'kitchen-breakfast-table',
} as const;
export const DINING_ROOM_STORY_OBJECT_IDS = {
  bear: 'dining-bear-tag',
  sideboard: 'dining-sideboard-record',
  table: 'dining-fourth-place',
} as const;
export const LIVING_ROOM_STORY_OBJECT_IDS = {
  tape: 'living-recording-tape',
  player: 'living-tape-player',
  television: 'living-television',
} as const;
export const LAUNDRY_ROOM_STORY_OBJECT_IDS = {
  washer: 'laundry-washer-tag',
  rack: 'laundry-drying-rack',
  bin: 'laundry-disposal-bin',
} as const;
export const ENTRANCE_CORRIDOR_STORY_OBJECT_IDS = {
  intercom: 'entrance-intercom',
  clock: 'entrance-return-clock',
  door: 'entrance-false-front-door',
} as const;
export const MAIN_HALL_STORY_OBJECT_IDS = {
  archive: 'main-hall-archive-core',
  escape: 'main-hall-choice-escape',
  remember: 'main-hall-choice-remember',
  replaced: 'main-hall-choice-replaced',
} as const;
export const MAIN_HALL_ENDING_EVENT_IDS = [
  'main-hall-escape-chosen',
  'main-hall-remember-chosen',
  'main-hall-replaced-chosen',
] as const;

export const STORY_DISAPPEARANCE_PROTECTED_TARGET_IDS_BY_ROOM = {
  'greybox-bedroom': ['radio', 'photo-frame'],
  bathroom: ['toothbrush-cup', 'mirror'],
  'first-corridor': ['wall-clock', 'phone'],
  office: ['radio', 'wall-clock', 'desk-photo'],
  kitchen: ['trashcan', 'breakfast-table'],
  'dining-room': ['bear-ornament', 'sideboard', 'dining-table'],
  'living-room': ['recording-tape', 'tape-player', 'television'],
  'laundry-room': ['washing-machine', 'drying-rack', 'disposal-bin'],
  'entrance-corridor': ['false-front-door', 'intercom', 'return-clock'],
  'main-hall': ['archive-core', 'choice-escape', 'choice-remember', 'choice-replaced'],
} as const satisfies Readonly<Record<string, readonly string[]>>;

export const STORY_INTERACTION_CATALOG = [
  {
    id: BEDROOM_FAMILY_PHOTO_OBJECT_ID,
    roomId: 'greybox-bedroom',
    targetId: 'photo-frame',
    actionLabel: 'EXAMINE',
    phases: ['room-complete'],
    requiredEventIdBeforeExit: 'bedroom-empty-place',
    exitInstruction: 'EXAMINE THE FAMILY PHOTO',
    exitInstructionStages: [
      {
        untilEventId: 'bedroom-radio-inspection',
        instruction: 'TUNE THE RADIO',
      },
      {
        untilEventId: 'bedroom-empty-place',
        instruction: 'EXAMINE THE FAMILY PHOTO',
      },
    ],
  },
  {
    id: BEDROOM_STORY_OBJECT_IDS.radio,
    roomId: 'greybox-bedroom',
    targetId: 'radio',
    actionLabel: 'EXAMINE',
    phases: ['room-complete'],
  },
  {
    id: BEDROOM_STORY_OBJECT_IDS.television,
    roomId: 'greybox-bedroom',
    targetId: 'television',
    actionLabel: 'EXAMINE',
    phases: ['room-complete'],
  },
  {
    id: BEDROOM_STORY_OBJECT_IDS.wardrobe,
    roomId: 'greybox-bedroom',
    targetId: 'wardrobe',
    actionLabel: 'EXAMINE',
    phases: ['room-complete'],
  },
  {
    id: BEDROOM_STORY_OBJECT_IDS.bed,
    roomId: 'greybox-bedroom',
    targetId: 'bed',
    actionLabel: 'EXAMINE',
    phases: ['room-complete'],
  },
  {
    id: BEDROOM_STORY_OBJECT_IDS.books,
    roomId: 'greybox-bedroom',
    targetId: 'books',
    actionLabel: 'EXAMINE',
    phases: ['room-complete'],
  },
  {
    id: BEDROOM_STORY_OBJECT_IDS.picture,
    roomId: 'greybox-bedroom',
    targetId: 'picture',
    actionLabel: 'EXAMINE',
    phases: ['room-complete'],
  },
  {
    id: BEDROOM_STORY_OBJECT_IDS.plant,
    roomId: 'greybox-bedroom',
    targetId: 'plant',
    actionLabel: 'EXAMINE',
    phases: ['room-complete'],
  },
  {
    id: BATHROOM_STORY_OBJECT_IDS.mirror,
    roomId: 'bathroom',
    targetId: 'mirror',
    actionLabel: 'EXAMINE',
    phases: ['room-complete'],
    requiredEventIdBeforeExit: 'bathroom-mirror-inspection',
    exitInstruction: 'EXAMINE THE MIRROR',
    exitInstructionStages: [
      {
        untilEventId: 'bathroom-toothbrushes-inspection',
        instruction: 'COUNT THE TOOTHBRUSHES',
      },
      {
        untilEventId: 'bathroom-mirror-inspection',
        instruction: 'EXAMINE THE MIRROR',
      },
    ],
  },
  {
    id: BATHROOM_STORY_OBJECT_IDS.bathtub,
    roomId: 'bathroom',
    targetId: 'bathtub',
    actionLabel: 'EXAMINE',
    phases: ['room-complete'],
  },
  {
    id: BATHROOM_STORY_OBJECT_IDS.vanity,
    roomId: 'bathroom',
    targetId: 'vanity',
    actionLabel: 'EXAMINE',
    phases: ['room-complete'],
  },
  {
    id: BATHROOM_STORY_OBJECT_IDS.toothbrushes,
    roomId: 'bathroom',
    targetId: 'toothbrush-cup',
    actionLabel: 'EXAMINE',
    phases: ['room-complete'],
  },
  {
    id: BATHROOM_STORY_OBJECT_IDS.duck,
    roomId: 'bathroom',
    targetId: 'rubber-duck',
    actionLabel: 'EXAMINE',
    phases: ['room-complete'],
  },
  {
    id: BATHROOM_STORY_OBJECT_IDS.candle,
    roomId: 'bathroom',
    targetId: 'candle',
    actionLabel: 'EXAMINE',
    phases: ['room-complete'],
  },
  {
    id: BATHROOM_STORY_OBJECT_IDS.towels,
    roomId: 'bathroom',
    targetId: 'towels-stacked',
    actionLabel: 'EXAMINE',
    phases: ['room-complete'],
  },
  {
    id: CORRIDOR_STORY_OBJECT_IDS.clock,
    roomId: 'first-corridor',
    targetId: 'wall-clock',
    actionLabel: 'EXAMINE',
    phases: ['room-complete'],
    requiredEventIdBeforeExit: 'corridor-clock-inspection',
    exitInstruction: 'CHECK THE WALL CLOCK',
  },
  {
    id: CORRIDOR_PHONE_OBJECT_ID,
    roomId: 'first-corridor',
    targetId: 'phone',
    actionLabel: 'ANSWER',
    phases: ['room-complete'],
  },
  {
    id: OFFICE_STORY_OBJECT_IDS.radio,
    roomId: 'office',
    targetId: 'radio',
    actionLabel: 'EXAMINE',
    phases: ['room-complete'],
  },
  {
    id: OFFICE_STORY_OBJECT_IDS.phone,
    roomId: 'office',
    targetId: 'office-phone',
    actionLabel: 'EXAMINE',
    phases: ['room-complete'],
  },
  {
    id: OFFICE_STORY_OBJECT_IDS.clock,
    roomId: 'office',
    targetId: 'wall-clock',
    actionLabel: 'EXAMINE',
    phases: ['room-complete'],
  },
  {
    id: OFFICE_STORY_OBJECT_IDS.photo,
    roomId: 'office',
    targetId: 'desk-photo',
    actionLabel: 'EXAMINE',
    phases: ['room-complete'],
    requiredEventIdBeforeExit: 'office-erased-name-inspection',
    exitInstruction: 'EXAMINE THE DESK PHOTO',
    exitInstructionStages: [
      {
        untilEventId: 'office-radio-inspection',
        instruction: 'TRACE THE RADIO SIGNAL',
      },
      {
        untilEventId: 'office-clock-inspection',
        instruction: 'CHECK THE WALL CLOCK',
      },
      {
        untilEventId: 'office-erased-name-inspection',
        instruction: 'EXAMINE THE DESK PHOTO',
      },
    ],
  },
  {
    id: KITCHEN_STORY_OBJECT_IDS.fridge,
    roomId: 'kitchen',
    targetId: 'fridge',
    actionLabel: 'EXAMINE',
    phases: ['room-complete'],
  },
  {
    id: KITCHEN_STORY_OBJECT_IDS.microwave,
    roomId: 'kitchen',
    targetId: 'microwave',
    actionLabel: 'EXAMINE',
    phases: ['room-complete'],
  },
  {
    id: KITCHEN_STORY_OBJECT_IDS.sink,
    roomId: 'kitchen',
    targetId: 'sink',
    actionLabel: 'EXAMINE',
    phases: ['room-complete'],
  },
  {
    id: KITCHEN_STORY_OBJECT_IDS.stove,
    roomId: 'kitchen',
    targetId: 'stove',
    actionLabel: 'EXAMINE',
    phases: ['room-complete'],
  },
  {
    id: KITCHEN_STORY_OBJECT_IDS.coffeeMachine,
    roomId: 'kitchen',
    targetId: 'coffee-machine',
    actionLabel: 'EXAMINE',
    phases: ['room-complete'],
  },
  {
    id: KITCHEN_STORY_OBJECT_IDS.trashcan,
    roomId: 'kitchen',
    targetId: 'trashcan',
    actionLabel: 'EXAMINE',
    phases: ['room-complete'],
  },
  {
    id: KITCHEN_STORY_OBJECT_IDS.breakfastTable,
    roomId: 'kitchen',
    targetId: 'breakfast-table',
    actionLabel: 'COUNT',
    phases: ['room-complete'],
    requiredEventIdBeforeExit: 'kitchen-fourth-place-inspection',
    exitInstruction: 'COUNT THE PLACES',
    exitInstructionStages: [
      {
        untilEventId: 'kitchen-trashcan-inspection',
        instruction: 'READ THE DISCARDED RECEIPT',
      },
      {
        untilEventId: 'kitchen-fourth-place-inspection',
        instruction: 'COUNT THE PLACES',
      },
    ],
  },
  {
    id: DINING_ROOM_STORY_OBJECT_IDS.bear,
    roomId: 'dining-room',
    targetId: 'bear-ornament',
    actionLabel: 'READ TAG',
    phases: ['room-complete'],
  },
  {
    id: DINING_ROOM_STORY_OBJECT_IDS.sideboard,
    roomId: 'dining-room',
    targetId: 'sideboard',
    actionLabel: 'OPEN',
    phases: ['room-complete'],
  },
  {
    id: DINING_ROOM_STORY_OBJECT_IDS.table,
    roomId: 'dining-room',
    targetId: 'dining-table',
    actionLabel: 'REMEMBER',
    phases: ['room-complete'],
    requiredEventIdBeforeExit: 'dining-reconstruction-truth',
    exitInstruction: 'RECONSTRUCT THE LAST DINNER',
    exitInstructionStages: [
      {
        untilEventId: 'dining-bear-tag-read',
        instruction: "READ THE BEAR'S TAG",
      },
      {
        untilEventId: 'dining-deletion-order-read',
        instruction: 'OPEN THE SIDEBOARD',
      },
      {
        untilEventId: 'dining-reconstruction-truth',
        instruction: 'RETURN TO THE FOURTH PLACE',
      },
    ],
  },
  {
    id: LIVING_ROOM_STORY_OBJECT_IDS.tape,
    roomId: 'living-room',
    targetId: 'recording-tape',
    actionLabel: 'READ LABEL',
    phases: ['room-complete'],
  },
  {
    id: LIVING_ROOM_STORY_OBJECT_IDS.player,
    roomId: 'living-room',
    targetId: 'tape-player',
    actionLabel: 'PLAY',
    phases: ['room-complete'],
  },
  {
    id: LIVING_ROOM_STORY_OBJECT_IDS.television,
    roomId: 'living-room',
    targetId: 'television',
    actionLabel: 'WATCH',
    phases: ['room-complete'],
    requiredEventIdBeforeExit: 'living-noah-recording-revealed',
    exitInstruction: "RECOVER NOAH'S RECORDING",
    exitInstructionStages: [
      {
        untilEventId: 'living-tape-label-read',
        instruction: 'FIND THE RECORDING TAPE',
      },
      {
        untilEventId: 'living-recording-played',
        instruction: 'PLAY THE TAPE',
      },
      {
        untilEventId: 'living-noah-recording-revealed',
        instruction: 'WATCH THE TELEVISION',
      },
    ],
  },
  {
    id: LAUNDRY_ROOM_STORY_OBJECT_IDS.washer,
    roomId: 'laundry-room',
    targetId: 'washing-machine',
    actionLabel: 'READ TAG',
    phases: ['room-complete'],
  },
  {
    id: LAUNDRY_ROOM_STORY_OBJECT_IDS.rack,
    roomId: 'laundry-room',
    targetId: 'drying-rack',
    actionLabel: 'MATCH LABELS',
    phases: ['room-complete'],
  },
  {
    id: LAUNDRY_ROOM_STORY_OBJECT_IDS.bin,
    roomId: 'laundry-room',
    targetId: 'disposal-bin',
    actionLabel: 'OPEN',
    phases: ['room-complete'],
    requiredEventIdBeforeExit: 'laundry-discarded-copies-revealed',
    exitInstruction: 'TRACE THE DISCARDED COPIES',
    exitInstructionStages: [
      {
        untilEventId: 'laundry-washer-tag-read',
        instruction: 'READ THE WASHER TAG',
      },
      {
        untilEventId: 'laundry-labels-matched',
        instruction: 'MATCH THE GARMENT LABELS',
      },
      {
        untilEventId: 'laundry-discarded-copies-revealed',
        instruction: 'OPEN THE DISPOSAL BIN',
      },
    ],
  },
  {
    id: ENTRANCE_CORRIDOR_STORY_OBJECT_IDS.intercom,
    roomId: 'entrance-corridor',
    targetId: 'intercom',
    actionLabel: 'LISTEN',
    phases: ['room-complete'],
  },
  {
    id: ENTRANCE_CORRIDOR_STORY_OBJECT_IDS.clock,
    roomId: 'entrance-corridor',
    targetId: 'return-clock',
    actionLabel: 'TRACE',
    phases: ['room-complete'],
  },
  {
    id: ENTRANCE_CORRIDOR_STORY_OBJECT_IDS.door,
    roomId: 'entrance-corridor',
    targetId: 'false-front-door',
    actionLabel: 'OPEN',
    phases: ['room-complete'],
    requiredEventIdBeforeExit: 'entrance-false-exit-revealed',
    exitInstruction: 'OPEN THE FRONT DOOR',
    exitInstructionStages: [
      { untilEventId: 'entrance-intercom-heard', instruction: 'LISTEN TO THE INTERCOM' },
      { untilEventId: 'entrance-return-traced', instruction: 'TRACE THE RETURN CLOCK' },
      { untilEventId: 'entrance-false-exit-revealed', instruction: 'OPEN THE FRONT DOOR' },
    ],
  },
  {
    id: MAIN_HALL_STORY_OBJECT_IDS.archive,
    roomId: 'main-hall',
    targetId: 'archive-core',
    actionLabel: 'OPEN ARCHIVE',
    phases: ['room-complete'],
    requiredAnyEventIdsBeforeExit: MAIN_HALL_ENDING_EVENT_IDS,
    exitInstruction: 'CHOOSE WHAT SURVIVES',
    exitInstructionStages: [
      { untilEventId: 'main-hall-archive-opened', instruction: 'OPEN THE ARCHIVE' },
      { untilAnyEventIds: MAIN_HALL_ENDING_EVENT_IDS, instruction: 'CHOOSE WHAT SURVIVES' },
    ],
  },
  {
    id: MAIN_HALL_STORY_OBJECT_IDS.escape,
    roomId: 'main-hall',
    targetId: 'choice-escape',
    actionLabel: 'LEAVE',
    phases: ['room-complete'],
  },
  {
    id: MAIN_HALL_STORY_OBJECT_IDS.remember,
    roomId: 'main-hall',
    targetId: 'choice-remember',
    actionLabel: 'RESTORE ELISE',
    phases: ['room-complete'],
  },
  {
    id: MAIN_HALL_STORY_OBJECT_IDS.replaced,
    roomId: 'main-hall',
    targetId: 'choice-replaced',
    actionLabel: 'ACCEPT THE HOUSE',
    phases: ['room-complete'],
  },
] as const satisfies readonly StoryInteractionDefinition[];
