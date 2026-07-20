import type { StoryEventDefinition } from '../../gameplay/story/StoryEvent';
import {
  BATHROOM_STORY_OBJECT_IDS,
  BEDROOM_FAMILY_PHOTO_OBJECT_ID,
  BEDROOM_STORY_OBJECT_IDS,
  CORRIDOR_PHONE_OBJECT_ID,
  CORRIDOR_STORY_OBJECT_IDS,
  DINING_ROOM_STORY_OBJECT_IDS,
  ENTRANCE_CORRIDOR_STORY_OBJECT_IDS,
  KITCHEN_STORY_OBJECT_IDS,
  LAUNDRY_ROOM_STORY_OBJECT_IDS,
  LIVING_ROOM_STORY_OBJECT_IDS,
  MAIN_HALL_STORY_OBJECT_IDS,
  OFFICE_STORY_OBJECT_IDS,
} from './StoryInteractionCatalog';
import { STORY_EASTER_EGG_DISCOVERY_IDS } from './StoryLoopAnchor';

export const STORY_EVENT_CATALOG = [
  {
    id: 'bedroom-investigation-reset',
    roomId: 'greybox-bedroom',
    trigger: { type: 'room-entered' },
    effects: [
      { type: 'set-flag', flagId: 'bedroom-radio-read', value: false },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'bedroom-radio-burst',
    roomId: 'greybox-bedroom',
    trigger: {
      type: 'phase-elapsed',
      phase: 'observation',
      elapsedMs: 2_500,
    },
    effects: [
      { type: 'audio', cueId: 'story-radio-burst', action: 'play' },
      { type: 'subtitle', copyKey: 'story.bedroom.radioBurst' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'bedroom-photo-incomplete',
    roomId: 'greybox-bedroom',
    trigger: {
      type: 'object-examined',
      objectId: BEDROOM_FAMILY_PHOTO_OBJECT_ID,
    },
    conditions: {
      flags: [{ flagId: 'bedroom-radio-read', value: false }],
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.bedroom.photoIncomplete' },
    ],
    repeat: 'every-match',
  },
  {
    id: 'bedroom-empty-place',
    roomId: 'greybox-bedroom',
    trigger: {
      type: 'object-examined',
      objectId: BEDROOM_FAMILY_PHOTO_OBJECT_ID,
    },
    conditions: {
      flags: [{ flagId: 'bedroom-radio-read', value: true }],
    },
    effects: [
      { type: 'audio', cueId: 'story-photo-memory', action: 'play' },
      { type: 'screen-effect', effectId: 'bedroom-empty-place' },
      { type: 'subtitle', copyKey: 'story.bedroom.emptyPlace' },
      { type: 'add-discovery', discoveryId: 'bedroom-empty-place' },
      { type: 'add-fragment', fragmentId: 'memory-empty-place' },
    ],
    repeat: 'every-match',
  },
  {
    id: 'bedroom-radio-inspection',
    roomId: 'greybox-bedroom',
    trigger: {
      type: 'object-examined',
      objectId: BEDROOM_STORY_OBJECT_IDS.radio,
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.bedroom.inspectRadio' },
      { type: 'add-discovery', discoveryId: 'bedroom-radio-dial' },
      { type: 'set-flag', flagId: 'bedroom-radio-read', value: true },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'bedroom-television-inspection',
    roomId: 'greybox-bedroom',
    trigger: {
      type: 'object-examined',
      objectId: BEDROOM_STORY_OBJECT_IDS.television,
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.bedroom.inspectTelevision' },
      { type: 'add-discovery', discoveryId: 'bedroom-missing-reflection' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'bedroom-wardrobe-inspection',
    roomId: 'greybox-bedroom',
    trigger: {
      type: 'object-examined',
      objectId: BEDROOM_STORY_OBJECT_IDS.wardrobe,
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.bedroom.inspectWardrobe' },
      { type: 'add-discovery', discoveryId: 'bedroom-locked-inside' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'bedroom-bed-inspection',
    roomId: 'greybox-bedroom',
    trigger: {
      type: 'object-examined',
      objectId: BEDROOM_STORY_OBJECT_IDS.bed,
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.bedroom.inspectBed' },
      { type: 'add-discovery', discoveryId: 'bedroom-warm-sheets' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'bedroom-books-inspection',
    roomId: 'greybox-bedroom',
    trigger: {
      type: 'object-examined',
      objectId: BEDROOM_STORY_OBJECT_IDS.books,
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.bedroom.inspectBooks' },
      {
        type: 'add-discovery',
        discoveryId: STORY_EASTER_EGG_DISCOVERY_IDS.bedroomPage,
      },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'bedroom-picture-inspection',
    roomId: 'greybox-bedroom',
    trigger: {
      type: 'object-examined',
      objectId: BEDROOM_STORY_OBJECT_IDS.picture,
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.bedroom.inspectPicture' },
      { type: 'add-discovery', discoveryId: 'bedroom-painted-door' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'bedroom-plant-inspection',
    roomId: 'greybox-bedroom',
    trigger: {
      type: 'object-examined',
      objectId: BEDROOM_STORY_OBJECT_IDS.plant,
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.bedroom.inspectPlant' },
      { type: 'add-discovery', discoveryId: 'bedroom-dusty-plant' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'bedroom-radio-complete',
    roomId: 'greybox-bedroom',
    trigger: { type: 'room-completed' },
    conditions: {
      eventsTriggeredThisLoop: ['bedroom-radio-burst'],
    },
    effects: [
      { type: 'audio', cueId: 'story-radio-message', action: 'play' },
      { type: 'subtitle', copyKey: 'story.bedroom.radioComplete' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'bedroom-radio-failure',
    roomId: 'greybox-bedroom',
    trigger: { type: 'run-error' },
    conditions: { minimumPressure: 3 },
    effects: [
      { type: 'audio', cueId: 'story-radio-search', action: 'play' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'bathroom-investigation-reset',
    roomId: 'bathroom',
    trigger: { type: 'room-entered' },
    effects: [
      {
        type: 'set-flag',
        flagId: 'bathroom-toothbrushes-counted',
        value: false,
      },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'bathroom-mirror-incomplete',
    roomId: 'bathroom',
    trigger: {
      type: 'object-examined',
      objectId: BATHROOM_STORY_OBJECT_IDS.mirror,
    },
    conditions: {
      flags: [{ flagId: 'bathroom-toothbrushes-counted', value: false }],
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.bathroom.mirrorIncomplete' },
    ],
    repeat: 'every-match',
  },
  {
    id: 'bathroom-mirror-inspection',
    roomId: 'bathroom',
    trigger: {
      type: 'object-examined',
      objectId: BATHROOM_STORY_OBJECT_IDS.mirror,
    },
    conditions: {
      flags: [{ flagId: 'bathroom-toothbrushes-counted', value: true }],
    },
    effects: [
      { type: 'audio', cueId: 'story-bathroom-warning', action: 'play' },
      { type: 'subtitle', copyKey: 'story.bathroom.mirrorWarning' },
      { type: 'add-fragment', fragmentId: 'memory-mirror-warning' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'bathroom-bathtub-inspection',
    roomId: 'bathroom',
    trigger: {
      type: 'object-examined',
      objectId: BATHROOM_STORY_OBJECT_IDS.bathtub,
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.bathroom.inspectBathtub' },
      { type: 'add-discovery', discoveryId: 'bathroom-breathing-drain' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'bathroom-vanity-inspection',
    roomId: 'bathroom',
    trigger: {
      type: 'object-examined',
      objectId: BATHROOM_STORY_OBJECT_IDS.vanity,
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.bathroom.inspectVanity' },
      { type: 'add-discovery', discoveryId: 'bathroom-named-drawer' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'bathroom-toothbrushes-inspection',
    roomId: 'bathroom',
    trigger: {
      type: 'object-examined',
      objectId: BATHROOM_STORY_OBJECT_IDS.toothbrushes,
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.bathroom.inspectToothbrushes' },
      { type: 'add-discovery', discoveryId: 'bathroom-fourth-toothbrush' },
      {
        type: 'set-flag',
        flagId: 'bathroom-toothbrushes-counted',
        value: true,
      },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'bathroom-duck-inspection',
    roomId: 'bathroom',
    trigger: {
      type: 'object-examined',
      objectId: BATHROOM_STORY_OBJECT_IDS.duck,
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.bathroom.inspectDuck' },
      {
        type: 'add-discovery',
        discoveryId: STORY_EASTER_EGG_DISCOVERY_IDS.bathroomDuck,
      },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'bathroom-candle-inspection',
    roomId: 'bathroom',
    trigger: {
      type: 'object-examined',
      objectId: BATHROOM_STORY_OBJECT_IDS.candle,
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.bathroom.inspectCandle' },
      { type: 'add-discovery', discoveryId: 'bathroom-upward-wax' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'bathroom-towels-inspection',
    roomId: 'bathroom',
    trigger: {
      type: 'object-examined',
      objectId: BATHROOM_STORY_OBJECT_IDS.towels,
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.bathroom.inspectTowels' },
      { type: 'add-discovery', discoveryId: 'bathroom-wet-towel' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'bathroom-pipe-warning',
    roomId: 'bathroom',
    trigger: {
      type: 'phase-elapsed',
      phase: 'observation',
      elapsedMs: 1_800,
    },
    effects: [
      { type: 'audio', cueId: 'story-bathroom-pipes', action: 'play' },
      { type: 'subtitle', copyKey: 'story.bathroom.pipes' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'bathroom-failure-fog',
    roomId: 'bathroom',
    trigger: { type: 'run-error' },
    conditions: { minimumPressure: 3 },
    effects: [
      { type: 'audio', cueId: 'story-bathroom-failure', action: 'play' },
      {
        type: 'screen-effect',
        effectId: 'bathroom-condensation-failure',
      },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'corridor-clock-inspection',
    roomId: 'first-corridor',
    trigger: {
      type: 'object-examined',
      objectId: CORRIDOR_STORY_OBJECT_IDS.clock,
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.corridor.inspectClock' },
      { type: 'add-discovery', discoveryId: 'corridor-clock-304' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'corridor-phone-rings',
    roomId: 'first-corridor',
    trigger: {
      type: 'phase-elapsed',
      phase: 'observation',
      elapsedMs: 1_500,
    },
    effects: [
      { type: 'audio', cueId: 'story-corridor-ring', action: 'play' },
      { type: 'subtitle', copyKey: 'story.corridor.phoneRings' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'corridor-phone-answered',
    roomId: 'first-corridor',
    trigger: {
      type: 'object-examined',
      objectId: CORRIDOR_PHONE_OBJECT_ID,
    },
    conditions: {
      eventsTriggeredThisLoop: ['corridor-phone-rings'],
    },
    effects: [
      { type: 'audio', cueId: 'story-corridor-ring', action: 'stop' },
      { type: 'audio', cueId: 'story-corridor-prediction', action: 'play' },
      { type: 'subtitle', copyKey: 'story.corridor.prediction' },
      { type: 'add-discovery', discoveryId: 'corridor-phone-prediction' },
      { type: 'add-fragment', fragmentId: 'memory-phone-prediction' },
      { type: 'set-flag', flagId: 'corridor-phone-answered', value: true },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'corridor-ringing-failure',
    roomId: 'first-corridor',
    trigger: { type: 'run-error' },
    conditions: { minimumPressure: 3 },
    effects: [
      { type: 'audio', cueId: 'story-corridor-failure', action: 'play' },
      { type: 'screen-effect', effectId: 'corridor-ringing-failure' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'office-investigation-reset',
    roomId: 'office',
    trigger: { type: 'room-entered' },
    effects: [
      { type: 'set-flag', flagId: 'office-radio-read', value: false },
      { type: 'set-flag', flagId: 'office-clock-read', value: false },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'office-radio-pattern',
    roomId: 'office',
    trigger: {
      type: 'phase-elapsed',
      phase: 'observation',
      elapsedMs: 1_800,
    },
    effects: [
      { type: 'audio', cueId: 'story-office-radio-pattern', action: 'play' },
      { type: 'subtitle', copyKey: 'story.office.radioPattern' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'office-predicted-silence',
    roomId: 'office',
    trigger: {
      type: 'phase-elapsed',
      phase: 'observation',
      elapsedMs: 5_200,
    },
    conditions: {
      flags: [{ flagId: 'corridor-phone-answered', value: true }],
    },
    effects: [
      { type: 'audio', cueId: 'story-office-radio-silence', action: 'play' },
      { type: 'subtitle', copyKey: 'story.office.predictedSilence' },
      { type: 'add-discovery', discoveryId: 'office-predicted-silence' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'office-radio-inspection',
    roomId: 'office',
    trigger: {
      type: 'object-examined',
      objectId: OFFICE_STORY_OBJECT_IDS.radio,
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.office.inspectRadio' },
      { type: 'add-discovery', discoveryId: 'office-radio-pattern' },
      { type: 'set-flag', flagId: 'office-radio-read', value: true },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'office-phone-inspection',
    roomId: 'office',
    trigger: {
      type: 'object-examined',
      objectId: OFFICE_STORY_OBJECT_IDS.phone,
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.office.inspectPhone' },
      { type: 'add-discovery', discoveryId: 'office-early-echo' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'office-clock-incomplete',
    roomId: 'office',
    trigger: {
      type: 'object-examined',
      objectId: OFFICE_STORY_OBJECT_IDS.clock,
    },
    conditions: {
      flags: [{ flagId: 'office-radio-read', value: false }],
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.office.clockIncomplete' },
    ],
    repeat: 'every-match',
  },
  {
    id: 'office-clock-inspection',
    roomId: 'office',
    trigger: {
      type: 'object-examined',
      objectId: OFFICE_STORY_OBJECT_IDS.clock,
    },
    conditions: {
      flags: [{ flagId: 'office-radio-read', value: true }],
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.office.inspectClock' },
      { type: 'add-discovery', discoveryId: 'office-clock-304' },
      { type: 'set-flag', flagId: 'office-clock-read', value: true },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'office-photo-incomplete',
    roomId: 'office',
    trigger: {
      type: 'object-examined',
      objectId: OFFICE_STORY_OBJECT_IDS.photo,
    },
    conditions: {
      flags: [{ flagId: 'office-clock-read', value: false }],
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.office.photoIncomplete' },
    ],
    repeat: 'every-match',
  },
  {
    id: 'office-erased-name-inspection',
    roomId: 'office',
    trigger: {
      type: 'object-examined',
      objectId: OFFICE_STORY_OBJECT_IDS.photo,
    },
    conditions: {
      flags: [{ flagId: 'office-clock-read', value: true }],
    },
    effects: [
      { type: 'audio', cueId: 'story-office-erased-name', action: 'play' },
      { type: 'screen-effect', effectId: 'office-erased-name' },
      { type: 'subtitle', copyKey: 'story.office.erasedName' },
      { type: 'add-discovery', discoveryId: 'office-erased-name' },
      { type: 'add-fragment', fragmentId: 'memory-erased-name' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'office-memory-unlocks-exit',
    roomId: 'office',
    trigger: { type: 'room-completed' },
    conditions: {
      eventsTriggeredThisLoop: ['office-erased-name-inspection'],
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.office.exit' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'office-radio-failure',
    roomId: 'office',
    trigger: { type: 'run-error' },
    conditions: { minimumPressure: 3 },
    effects: [
      { type: 'audio', cueId: 'story-office-failure', action: 'play' },
      { type: 'screen-effect', effectId: 'office-erased-name' },
      { type: 'subtitle', copyKey: 'story.office.failure' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'kitchen-investigation-reset',
    roomId: 'kitchen',
    trigger: { type: 'room-entered' },
    effects: [
      { type: 'set-flag', flagId: 'kitchen-receipt-read', value: false },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'kitchen-reverse-breakfast',
    roomId: 'kitchen',
    trigger: {
      type: 'phase-elapsed',
      phase: 'observation',
      elapsedMs: 1_600,
    },
    effects: [
      {
        type: 'audio',
        cueId: 'story-kitchen-reverse-breakfast',
        action: 'play',
      },
      { type: 'subtitle', copyKey: 'story.kitchen.reverseBreakfast' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'kitchen-chair-before-arrival',
    roomId: 'kitchen',
    trigger: {
      type: 'phase-elapsed',
      phase: 'observation',
      elapsedMs: 6_200,
    },
    conditions: {
      eventsTriggeredThisLoop: ['kitchen-reverse-breakfast'],
    },
    effects: [
      {
        type: 'audio',
        cueId: 'story-kitchen-chair-scrape',
        action: 'play',
      },
      { type: 'subtitle', copyKey: 'story.kitchen.chairBeforeArrival' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'kitchen-fridge-inspection',
    roomId: 'kitchen',
    trigger: {
      type: 'object-examined',
      objectId: KITCHEN_STORY_OBJECT_IDS.fridge,
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.kitchen.inspectFridge' },
      { type: 'add-discovery', discoveryId: 'kitchen-future-dates' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'kitchen-microwave-inspection',
    roomId: 'kitchen',
    trigger: {
      type: 'object-examined',
      objectId: KITCHEN_STORY_OBJECT_IDS.microwave,
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.kitchen.inspectMicrowave' },
      { type: 'add-discovery', discoveryId: 'kitchen-early-chime' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'kitchen-sink-inspection',
    roomId: 'kitchen',
    trigger: {
      type: 'object-examined',
      objectId: KITCHEN_STORY_OBJECT_IDS.sink,
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.kitchen.inspectSink' },
      { type: 'add-discovery', discoveryId: 'kitchen-tomorrow-fingerprints' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'kitchen-stove-inspection',
    roomId: 'kitchen',
    trigger: {
      type: 'object-examined',
      objectId: KITCHEN_STORY_OBJECT_IDS.stove,
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.kitchen.inspectStove' },
      { type: 'add-discovery', discoveryId: 'kitchen-reflected-flame' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'kitchen-coffee-inspection',
    roomId: 'kitchen',
    trigger: {
      type: 'object-examined',
      objectId: KITCHEN_STORY_OBJECT_IDS.coffeeMachine,
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.kitchen.inspectCoffee' },
      { type: 'add-discovery', discoveryId: 'kitchen-missing-cup' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'kitchen-trashcan-inspection',
    roomId: 'kitchen',
    trigger: {
      type: 'object-examined',
      objectId: KITCHEN_STORY_OBJECT_IDS.trashcan,
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.kitchen.inspectTrashcan' },
      { type: 'add-discovery', discoveryId: 'kitchen-receipt-304' },
      { type: 'set-flag', flagId: 'kitchen-receipt-read', value: true },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'kitchen-table-incomplete',
    roomId: 'kitchen',
    trigger: {
      type: 'object-examined',
      objectId: KITCHEN_STORY_OBJECT_IDS.breakfastTable,
    },
    conditions: {
      flags: [{ flagId: 'kitchen-receipt-read', value: false }],
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.kitchen.tableIncomplete' },
    ],
    repeat: 'every-match',
  },
  {
    id: 'kitchen-fourth-place-inspection',
    roomId: 'kitchen',
    trigger: {
      type: 'object-examined',
      objectId: KITCHEN_STORY_OBJECT_IDS.breakfastTable,
    },
    conditions: {
      flags: [{ flagId: 'kitchen-receipt-read', value: true }],
    },
    effects: [
      {
        type: 'audio',
        cueId: 'story-kitchen-chair-scrape',
        action: 'play',
      },
      { type: 'screen-effect', effectId: 'kitchen-service-ticket' },
      { type: 'subtitle', copyKey: 'story.kitchen.fourthPlace' },
      { type: 'add-discovery', discoveryId: 'kitchen-fourth-place' },
      { type: 'add-fragment', fragmentId: 'memory-kitchen-fourth-place' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'kitchen-memory-unlocks-exit',
    roomId: 'kitchen',
    trigger: { type: 'room-completed' },
    conditions: {
      eventsTriggeredThisLoop: ['kitchen-fourth-place-inspection'],
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.kitchen.exit' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'kitchen-service-failure',
    roomId: 'kitchen',
    trigger: { type: 'run-error' },
    conditions: { minimumPressure: 3 },
    effects: [
      {
        type: 'audio',
        cueId: 'story-kitchen-failure',
        action: 'play',
      },
      { type: 'screen-effect', effectId: 'kitchen-service-ticket' },
      { type: 'subtitle', copyKey: 'story.kitchen.failure' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'dining-investigation-reset',
    roomId: 'dining-room',
    trigger: { type: 'room-entered' },
    effects: [
      { type: 'set-flag', flagId: 'dining-bear-read', value: false },
      {
        type: 'set-flag',
        flagId: 'dining-deletion-order-read',
        value: false,
      },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'dining-last-dinner-echo',
    roomId: 'dining-room',
    trigger: {
      type: 'phase-elapsed',
      phase: 'observation',
      elapsedMs: 1_800,
    },
    effects: [
      { type: 'audio', cueId: 'story-dining-voices', action: 'play' },
      { type: 'subtitle', copyKey: 'story.dining.lastDinnerEcho' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'dining-previous-loop-echo',
    roomId: 'dining-room',
    trigger: {
      type: 'phase-elapsed',
      phase: 'observation',
      elapsedMs: 6_400,
    },
    conditions: {
      flags: [{ flagId: 'corridor-phone-answered', value: true }],
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.dining.previousLoop' },
      { type: 'add-discovery', discoveryId: 'dining-previous-loop-voice' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'dining-bear-tag-read',
    roomId: 'dining-room',
    trigger: {
      type: 'object-examined',
      objectId: DINING_ROOM_STORY_OBJECT_IDS.bear,
    },
    conditions: {
      flags: [{ flagId: 'dining-bear-read', value: false }],
    },
    effects: [
      { type: 'audio', cueId: 'story-dining-memory-pulse', action: 'play' },
      { type: 'subtitle', copyKey: 'story.dining.bearTag' },
      { type: 'add-discovery', discoveryId: 'dining-bear-tag' },
      { type: 'set-flag', flagId: 'dining-bear-read', value: true },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'dining-sideboard-locked',
    roomId: 'dining-room',
    trigger: {
      type: 'object-examined',
      objectId: DINING_ROOM_STORY_OBJECT_IDS.sideboard,
    },
    conditions: {
      flags: [{ flagId: 'dining-bear-read', value: false }],
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.dining.sideboardLocked' },
    ],
    repeat: 'every-match',
  },
  {
    id: 'dining-deletion-order-read',
    roomId: 'dining-room',
    trigger: {
      type: 'object-examined',
      objectId: DINING_ROOM_STORY_OBJECT_IDS.sideboard,
    },
    conditions: {
      flags: [
        { flagId: 'dining-bear-read', value: true },
        { flagId: 'dining-deletion-order-read', value: false },
      ],
    },
    effects: [
      { type: 'audio', cueId: 'story-dining-archive', action: 'play' },
      { type: 'subtitle', copyKey: 'story.dining.deletionOrder' },
      { type: 'add-discovery', discoveryId: 'dining-deletion-order' },
      {
        type: 'set-flag',
        flagId: 'dining-deletion-order-read',
        value: true,
      },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'dining-table-incomplete',
    roomId: 'dining-room',
    trigger: {
      type: 'object-examined',
      objectId: DINING_ROOM_STORY_OBJECT_IDS.table,
    },
    conditions: {
      flags: [{ flagId: 'dining-deletion-order-read', value: false }],
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.dining.tableIncomplete' },
    ],
    repeat: 'every-match',
  },
  {
    id: 'dining-reconstruction-truth',
    roomId: 'dining-room',
    trigger: {
      type: 'object-examined',
      objectId: DINING_ROOM_STORY_OBJECT_IDS.table,
    },
    conditions: {
      flags: [{ flagId: 'dining-deletion-order-read', value: true }],
    },
    effects: [
      { type: 'audio', cueId: 'story-dining-memory-pulse', action: 'play' },
      { type: 'screen-effect', effectId: 'dining-reconstruction' },
      { type: 'subtitle', copyKey: 'story.dining.reconstructionTruth' },
      { type: 'add-discovery', discoveryId: 'dining-reconstruction-truth' },
      { type: 'add-fragment', fragmentId: 'memory-dining-reconstruction' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'dining-reconstruction-failure',
    roomId: 'dining-room',
    trigger: { type: 'run-error' },
    conditions: { minimumPressure: 3 },
    effects: [
      { type: 'audio', cueId: 'story-dining-failure', action: 'play' },
      { type: 'screen-effect', effectId: 'dining-reconstruction' },
      { type: 'subtitle', copyKey: 'story.dining.failure' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'living-investigation-reset',
    roomId: 'living-room',
    trigger: { type: 'room-entered' },
    effects: [
      { type: 'set-flag', flagId: 'living-tape-read', value: false },
      { type: 'set-flag', flagId: 'living-recording-played', value: false },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'living-recording-echo',
    roomId: 'living-room',
    trigger: {
      type: 'phase-elapsed',
      phase: 'observation',
      elapsedMs: 2_000,
    },
    effects: [
      { type: 'audio', cueId: 'story-living-tape-wind', action: 'play' },
      { type: 'subtitle', copyKey: 'story.living.recordingEcho' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'living-tape-label-read',
    roomId: 'living-room',
    trigger: {
      type: 'object-examined',
      objectId: LIVING_ROOM_STORY_OBJECT_IDS.tape,
    },
    conditions: {
      flags: [{ flagId: 'living-tape-read', value: false }],
    },
    effects: [
      { type: 'audio', cueId: 'story-living-tape-click', action: 'play' },
      { type: 'subtitle', copyKey: 'story.living.tapeLabel' },
      { type: 'add-discovery', discoveryId: 'living-noah-tape' },
      { type: 'set-flag', flagId: 'living-tape-read', value: true },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'living-player-empty',
    roomId: 'living-room',
    trigger: {
      type: 'object-examined',
      objectId: LIVING_ROOM_STORY_OBJECT_IDS.player,
    },
    conditions: {
      flags: [{ flagId: 'living-tape-read', value: false }],
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.living.playerEmpty' },
    ],
    repeat: 'every-match',
  },
  {
    id: 'living-recording-played',
    roomId: 'living-room',
    trigger: {
      type: 'object-examined',
      objectId: LIVING_ROOM_STORY_OBJECT_IDS.player,
    },
    conditions: {
      flags: [
        { flagId: 'living-tape-read', value: true },
        { flagId: 'living-recording-played', value: false },
      ],
    },
    effects: [
      { type: 'audio', cueId: 'story-living-noah-voice', action: 'play' },
      { type: 'subtitle', copyKey: 'story.living.noahVoice' },
      { type: 'set-flag', flagId: 'living-recording-played', value: true },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'living-television-silent',
    roomId: 'living-room',
    trigger: {
      type: 'object-examined',
      objectId: LIVING_ROOM_STORY_OBJECT_IDS.television,
    },
    conditions: {
      flags: [{ flagId: 'living-recording-played', value: false }],
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.living.televisionSilent' },
    ],
    repeat: 'every-match',
  },
  {
    id: 'living-noah-recording-revealed',
    roomId: 'living-room',
    trigger: {
      type: 'object-examined',
      objectId: LIVING_ROOM_STORY_OBJECT_IDS.television,
    },
    conditions: {
      flags: [{ flagId: 'living-recording-played', value: true }],
    },
    effects: [
      { type: 'audio', cueId: 'story-living-memory-burst', action: 'play' },
      { type: 'subtitle', copyKey: 'story.living.noahReveal' },
      { type: 'add-discovery', discoveryId: 'living-noah-message' },
      { type: 'add-fragment', fragmentId: 'memory-noah-protection' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'living-recording-failure',
    roomId: 'living-room',
    trigger: { type: 'run-error' },
    conditions: { minimumPressure: 3 },
    effects: [
      { type: 'audio', cueId: 'story-living-failure', action: 'play' },
      { type: 'subtitle', copyKey: 'story.living.failure' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'laundry-investigation-reset',
    roomId: 'laundry-room',
    trigger: { type: 'room-entered' },
    effects: [
      { type: 'set-flag', flagId: 'laundry-washer-read', value: false },
      { type: 'set-flag', flagId: 'laundry-labels-read', value: false },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'laundry-machine-cycle',
    roomId: 'laundry-room',
    trigger: {
      type: 'phase-elapsed',
      phase: 'observation',
      elapsedMs: 2_000,
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.laundry.machineCycle' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'laundry-washer-tag-read',
    roomId: 'laundry-room',
    trigger: {
      type: 'object-examined',
      objectId: LAUNDRY_ROOM_STORY_OBJECT_IDS.washer,
    },
    conditions: {
      flags: [{ flagId: 'laundry-washer-read', value: false }],
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.laundry.washerTag' },
      { type: 'add-discovery', discoveryId: 'laundry-iteration-17' },
      { type: 'set-flag', flagId: 'laundry-washer-read', value: true },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'laundry-rack-unreadable',
    roomId: 'laundry-room',
    trigger: {
      type: 'object-examined',
      objectId: LAUNDRY_ROOM_STORY_OBJECT_IDS.rack,
    },
    conditions: {
      flags: [{ flagId: 'laundry-washer-read', value: false }],
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.laundry.rackUnreadable' },
    ],
    repeat: 'every-match',
  },
  {
    id: 'laundry-labels-matched',
    roomId: 'laundry-room',
    trigger: {
      type: 'object-examined',
      objectId: LAUNDRY_ROOM_STORY_OBJECT_IDS.rack,
    },
    conditions: {
      flags: [
        { flagId: 'laundry-washer-read', value: true },
        { flagId: 'laundry-labels-read', value: false },
      ],
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.laundry.labelsMatched' },
      { type: 'add-discovery', discoveryId: 'laundry-copy-labels' },
      { type: 'set-flag', flagId: 'laundry-labels-read', value: true },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'laundry-bin-sealed',
    roomId: 'laundry-room',
    trigger: {
      type: 'object-examined',
      objectId: LAUNDRY_ROOM_STORY_OBJECT_IDS.bin,
    },
    conditions: {
      flags: [{ flagId: 'laundry-labels-read', value: false }],
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.laundry.binSealed' },
    ],
    repeat: 'every-match',
  },
  {
    id: 'laundry-discarded-copies-revealed',
    roomId: 'laundry-room',
    trigger: {
      type: 'object-examined',
      objectId: LAUNDRY_ROOM_STORY_OBJECT_IDS.bin,
    },
    conditions: {
      flags: [{ flagId: 'laundry-labels-read', value: true }],
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.laundry.discardedCopies' },
      { type: 'add-discovery', discoveryId: 'laundry-discarded-copies' },
      { type: 'add-fragment', fragmentId: 'memory-discarded-copies' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'laundry-erasure-failure',
    roomId: 'laundry-room',
    trigger: { type: 'run-error' },
    conditions: { minimumPressure: 3 },
    effects: [
      { type: 'subtitle', copyKey: 'story.laundry.failure' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'entrance-investigation-reset',
    roomId: 'entrance-corridor',
    trigger: { type: 'room-entered' },
    effects: [
      { type: 'set-flag', flagId: 'entrance-intercom-read', value: false },
      { type: 'set-flag', flagId: 'entrance-return-read', value: false },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'entrance-door-breathing',
    roomId: 'entrance-corridor',
    trigger: { type: 'phase-elapsed', phase: 'observation', elapsedMs: 2_200 },
    effects: [{ type: 'subtitle', copyKey: 'story.entrance.doorBreathing' }],
    repeat: 'once-per-loop',
  },
  {
    id: 'entrance-intercom-heard',
    roomId: 'entrance-corridor',
    trigger: { type: 'object-examined', objectId: ENTRANCE_CORRIDOR_STORY_OBJECT_IDS.intercom },
    effects: [
      { type: 'subtitle', copyKey: 'story.entrance.intercom' },
      { type: 'add-discovery', discoveryId: 'entrance-adrian-return' },
      { type: 'set-flag', flagId: 'entrance-intercom-read', value: true },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'entrance-clock-unreadable',
    roomId: 'entrance-corridor',
    trigger: { type: 'object-examined', objectId: ENTRANCE_CORRIDOR_STORY_OBJECT_IDS.clock },
    conditions: { flags: [{ flagId: 'entrance-intercom-read', value: false }] },
    effects: [{ type: 'subtitle', copyKey: 'story.entrance.clockUnreadable' }],
    repeat: 'every-match',
  },
  {
    id: 'entrance-return-traced',
    roomId: 'entrance-corridor',
    trigger: { type: 'object-examined', objectId: ENTRANCE_CORRIDOR_STORY_OBJECT_IDS.clock },
    conditions: { flags: [{ flagId: 'entrance-intercom-read', value: true }] },
    effects: [
      { type: 'subtitle', copyKey: 'story.entrance.returnTrace' },
      { type: 'add-discovery', discoveryId: 'entrance-return-loop' },
      { type: 'set-flag', flagId: 'entrance-return-read', value: true },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'entrance-door-sealed',
    roomId: 'entrance-corridor',
    trigger: { type: 'object-examined', objectId: ENTRANCE_CORRIDOR_STORY_OBJECT_IDS.door },
    conditions: { flags: [{ flagId: 'entrance-return-read', value: false }] },
    effects: [{ type: 'subtitle', copyKey: 'story.entrance.doorSealed' }],
    repeat: 'every-match',
  },
  {
    id: 'entrance-false-exit-revealed',
    roomId: 'entrance-corridor',
    trigger: { type: 'object-examined', objectId: ENTRANCE_CORRIDOR_STORY_OBJECT_IDS.door },
    conditions: { flags: [{ flagId: 'entrance-return-read', value: true }] },
    effects: [
      { type: 'subtitle', copyKey: 'story.entrance.falseExit' },
      { type: 'add-discovery', discoveryId: 'entrance-false-exit' },
      { type: 'add-fragment', fragmentId: 'memory-false-exit' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'main-hall-investigation-reset',
    roomId: 'main-hall',
    trigger: { type: 'room-entered' },
    effects: [
      { type: 'set-flag', flagId: 'main-hall-archive-opened', value: false },
      { type: 'set-flag', flagId: 'main-hall-choice-made', value: false },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'main-hall-archive-pulse',
    roomId: 'main-hall',
    trigger: { type: 'phase-elapsed', phase: 'observation', elapsedMs: 2_000 },
    effects: [{ type: 'subtitle', copyKey: 'story.mainHall.archivePulse' }],
    repeat: 'once-per-loop',
  },
  {
    id: 'main-hall-archive-opened',
    roomId: 'main-hall',
    trigger: { type: 'object-examined', objectId: MAIN_HALL_STORY_OBJECT_IDS.archive },
    effects: [
      { type: 'subtitle', copyKey: 'story.mainHall.archiveOpened' },
      { type: 'add-discovery', discoveryId: 'main-hall-archive-truth' },
      { type: 'set-flag', flagId: 'main-hall-archive-opened', value: true },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'main-hall-choice-sealed',
    roomId: 'main-hall',
    trigger: { type: 'object-examined', objectId: MAIN_HALL_STORY_OBJECT_IDS.escape },
    conditions: { flags: [{ flagId: 'main-hall-archive-opened', value: false }] },
    effects: [{ type: 'subtitle', copyKey: 'story.mainHall.choiceSealed' }],
    repeat: 'every-match',
  },
  {
    id: 'main-hall-escape-chosen',
    roomId: 'main-hall',
    trigger: { type: 'object-examined', objectId: MAIN_HALL_STORY_OBJECT_IDS.escape },
    conditions: { flags: [{ flagId: 'main-hall-archive-opened', value: true }, { flagId: 'main-hall-choice-made', value: false }] },
    effects: [
      { type: 'subtitle', copyKey: 'story.mainHall.escape' },
      { type: 'add-ending', endingId: 'escape' },
      { type: 'set-flag', flagId: 'main-hall-choice-made', value: true },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'main-hall-remember-chosen',
    roomId: 'main-hall',
    trigger: { type: 'object-examined', objectId: MAIN_HALL_STORY_OBJECT_IDS.remember },
    conditions: { flags: [{ flagId: 'main-hall-archive-opened', value: true }, { flagId: 'main-hall-choice-made', value: false }] },
    effects: [
      { type: 'subtitle', copyKey: 'story.mainHall.remember' },
      { type: 'add-ending', endingId: 'remember' },
      { type: 'set-flag', flagId: 'main-hall-choice-made', value: true },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'main-hall-replaced-chosen',
    roomId: 'main-hall',
    trigger: { type: 'object-examined', objectId: MAIN_HALL_STORY_OBJECT_IDS.replaced },
    conditions: { flags: [{ flagId: 'main-hall-archive-opened', value: true }, { flagId: 'main-hall-choice-made', value: false }] },
    effects: [
      { type: 'subtitle', copyKey: 'story.mainHall.replaced' },
      { type: 'add-ending', endingId: 'replaced' },
      { type: 'set-flag', flagId: 'main-hall-choice-made', value: true },
    ],
    repeat: 'once-per-loop',
  },
] as const satisfies readonly StoryEventDefinition[];
