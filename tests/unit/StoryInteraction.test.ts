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
      bathroom: ['mirror'],
      office: ['desk-photo'],
      kitchen: ['breakfast-table'],
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
    expect(registry.getExitRequirement('first-corridor')).toBeNull();
    expect(registry.getExitRequirement('office')).toMatchObject({
      id: 'office-desk-photo',
      exitInstruction: 'EXAMINE THE DESK PHOTO',
    });
    expect(registry.getExitRequirement('kitchen')).toMatchObject({
      id: 'kitchen-breakfast-table',
      exitInstruction: 'COUNT THE PLACES',
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
