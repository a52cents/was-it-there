import { describe, expect, it } from 'vitest';
import {
  STORY_DISAPPEARANCE_PROTECTED_TARGET_IDS_BY_ROOM,
  STORY_INTERACTION_CATALOG,
} from '../../src/content/story/StoryInteractionCatalog';
import { StoryInteractionRegistry } from '../../src/gameplay/story/StoryInteraction';

describe('StoryInteractionRegistry', () => {
  it('protects the bedroom radio and family photo from Story disappearances', () => {
    expect(STORY_DISAPPEARANCE_PROTECTED_TARGET_IDS_BY_ROOM).toEqual({
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
    });
  });

  it('unlocks every Story interaction only after anomaly search completes', () => {
    const registry = new StoryInteractionRegistry(
      STORY_INTERACTION_CATALOG,
    );

    for (const interaction of STORY_INTERACTION_CATALOG) {
      expect(interaction.phases).toEqual(['room-complete']);
      expect(
        registry.resolve(
          interaction.roomId,
          interaction.targetId,
          'observation',
        ),
      ).toBeNull();
      expect(
        registry.resolve(
          interaction.roomId,
          interaction.targetId,
          'search',
        ),
      ).toBeNull();
      expect(
        registry.resolve(
          interaction.roomId,
          interaction.targetId,
          'room-complete',
        ),
      ).toMatchObject({ id: interaction.id });
    }

    expect(registry.getExitRequirement('greybox-bedroom')).toMatchObject({
      id: 'bedroom-family-photo',
      exitInstruction: 'EXAMINE THE FAMILY PHOTO',
    });
    expect(registry.getExitRequirement('bathroom')).toMatchObject({
      id: 'bathroom-mirror',
      exitInstruction: 'EXAMINE THE MIRROR',
    });
    expect(registry.getExitRequirement('first-corridor')).toMatchObject({
      id: 'corridor-wall-clock',
      exitInstruction: 'CHECK THE WALL CLOCK',
    });
    expect(registry.getExitRequirement('office')).toMatchObject({
      id: 'office-desk-photo',
      exitInstruction: 'EXAMINE THE DESK PHOTO',
    });
    expect(registry.getExitRequirement('kitchen')).toMatchObject({
      id: 'kitchen-breakfast-table',
      exitInstruction: 'COUNT THE PLACES',
    });
    expect(registry.getExitRequirement('dining-room')).toMatchObject({
      id: 'dining-fourth-place',
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
    });
    expect(registry.getExitRequirement('living-room')).toMatchObject({
      id: 'living-television',
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
    });
    expect(registry.getExitRequirement('laundry-room')).toMatchObject({
      id: 'laundry-disposal-bin',
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
    });
  });

  it('rejects duplicate ids, bindings, and phase-less definitions', () => {
    expect(
      () =>
        new StoryInteractionRegistry([
          ...STORY_INTERACTION_CATALOG,
          { ...STORY_INTERACTION_CATALOG[0] },
        ]),
    ).toThrow('Duplicate story interaction id');

    expect(
      () =>
        new StoryInteractionRegistry([
          {
            id: 'invalid',
            roomId: 'bedroom',
            targetId: 'photo',
            actionLabel: 'EXAMINE',
            phases: [],
          },
        ]),
    ).toThrow('at least one phase');

    expect(
      () =>
        new StoryInteractionRegistry([
          {
            id: 'incomplete-exit-rule',
            roomId: 'bedroom',
            targetId: 'photo',
            actionLabel: 'EXAMINE',
            phases: ['room-complete'],
            requiredEventIdBeforeExit: 'photo-examined',
          },
        ]),
    ).toThrow('both its exit event and instruction');
  });
});
