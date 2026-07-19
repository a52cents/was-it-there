import type { StoryEventDefinition } from '../../gameplay/story/StoryEvent';
import {
  BATHROOM_STORY_OBJECT_IDS,
  BEDROOM_FAMILY_PHOTO_OBJECT_ID,
  BEDROOM_STORY_OBJECT_IDS,
  CORRIDOR_PHONE_OBJECT_ID,
} from './StoryInteractionCatalog';

export const STORY_EVENT_CATALOG = [
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
    id: 'bedroom-empty-place',
    roomId: 'greybox-bedroom',
    trigger: {
      type: 'object-examined',
      objectId: BEDROOM_FAMILY_PHOTO_OBJECT_ID,
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
      { type: 'add-discovery', discoveryId: 'bedroom-page-317' },
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
    id: 'bathroom-mirror-inspection',
    roomId: 'bathroom',
    trigger: {
      type: 'object-examined',
      objectId: BATHROOM_STORY_OBJECT_IDS.mirror,
    },
    effects: [
      { type: 'subtitle', copyKey: 'story.bathroom.inspectMirror' },
      { type: 'add-discovery', discoveryId: 'bathroom-inside-fingerprints' },
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
      { type: 'add-discovery', discoveryId: 'bathroom-duck-317' },
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
    id: 'bathroom-mirror-warning',
    roomId: 'bathroom',
    trigger: { type: 'room-completed' },
    effects: [
      {
        type: 'helper-visibility',
        bindingId: 'bathroom-mirror-fog',
        visible: true,
      },
      { type: 'audio', cueId: 'story-bathroom-warning', action: 'play' },
      { type: 'subtitle', copyKey: 'story.bathroom.mirrorWarning' },
      { type: 'add-discovery', discoveryId: 'bathroom-mirror-warning' },
      { type: 'add-fragment', fragmentId: 'memory-mirror-warning' },
    ],
    repeat: 'once-per-loop',
  },
  {
    id: 'bathroom-mirror-warning-fades',
    roomId: 'bathroom',
    trigger: {
      type: 'phase-elapsed',
      phase: 'room-complete',
      elapsedMs: 4_200,
    },
    conditions: {
      eventsTriggeredThisLoop: ['bathroom-mirror-warning'],
    },
    effects: [
      {
        type: 'helper-visibility',
        bindingId: 'bathroom-mirror-fog',
        visible: false,
      },
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
] as const satisfies readonly StoryEventDefinition[];
