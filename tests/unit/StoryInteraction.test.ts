import { describe, expect, it } from 'vitest';
import { STORY_INTERACTION_CATALOG } from '../../src/content/story/StoryInteractionCatalog';
import { StoryInteractionRegistry } from '../../src/gameplay/story/StoryInteraction';

describe('StoryInteractionRegistry', () => {
  it('resolves examinable room objects only during authored Story phases', () => {
    const registry = new StoryInteractionRegistry(
      STORY_INTERACTION_CATALOG,
    );

    expect(
      registry.resolve('greybox-bedroom', 'photo-frame', 'observation'),
    ).toMatchObject({
      id: 'bedroom-family-photo',
      actionLabel: 'EXAMINE',
      requiredEventIdBeforeExit: 'bedroom-empty-place',
    });
    expect(
      registry.resolve('greybox-bedroom', 'photo-frame', 'room-complete'),
    ).not.toBeNull();
    expect(
      registry.resolve('greybox-bedroom', 'photo-frame', 'search'),
    ).toBeNull();
    expect(
      registry.resolve('greybox-bedroom', 'radio', 'observation'),
    ).toMatchObject({
      id: 'bedroom-radio',
      actionLabel: 'EXAMINE',
    });
    expect(
      registry.resolve('greybox-bedroom', 'wardrobe', 'room-complete'),
    ).not.toBeNull();
    expect(
      registry.resolve('greybox-bedroom', 'television', 'search'),
    ).toBeNull();
    expect(registry.getExitRequirement('greybox-bedroom')).toMatchObject({
      id: 'bedroom-family-photo',
      exitInstruction: 'EXAMINE THE ROOM',
    });
    expect(
      registry.resolve('bathroom', 'mirror', 'observation'),
    ).toMatchObject({
      id: 'bathroom-mirror',
      actionLabel: 'EXAMINE',
      requiredEventIdBeforeExit: 'bathroom-mirror-inspection',
    });
    expect(
      registry.resolve('bathroom', 'rubber-duck', 'room-complete'),
    ).toMatchObject({
      id: 'bathroom-rubber-duck',
      actionLabel: 'EXAMINE',
    });
    expect(registry.resolve('bathroom', 'mirror', 'search')).toBeNull();
    expect(registry.getExitRequirement('bathroom')).toMatchObject({
      id: 'bathroom-mirror',
      exitInstruction: 'EXAMINE THE ROOM',
    });
    expect(
      registry.resolve('first-corridor', 'phone', 'observation'),
    ).toMatchObject({
      id: 'corridor-phone',
      actionLabel: 'ANSWER',
    });
    expect(
      registry.resolve('first-corridor', 'phone', 'search'),
    ).toBeNull();
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
