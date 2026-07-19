import { describe, expect, it } from 'vitest';
import { STORY_INTERACTION_CATALOG } from '../../src/content/story/StoryInteractionCatalog';
import { StoryExitGate } from '../../src/gameplay/story/StoryExitGate';
import { StoryInteractionRegistry } from '../../src/gameplay/story/StoryInteraction';
import { StoryProgress } from '../../src/gameplay/story/StoryProgress';

describe('StoryExitGate', () => {
  it('requires the bedroom photo once per Story loop', () => {
    const progress = new StoryProgress();
    const gate = new StoryExitGate(
      new StoryInteractionRegistry(STORY_INTERACTION_CATALOG),
      progress,
    );
    progress.beginLoop();

    expect(
      gate.getPendingRequirement('story', 'greybox-bedroom'),
    ).toMatchObject({
      id: 'bedroom-family-photo',
      exitInstruction: 'EXAMINE THE ROOM',
    });

    progress.markEventTriggered('bedroom-empty-place');
    expect(
      gate.getPendingRequirement('story', 'greybox-bedroom'),
    ).toBeNull();

    progress.beginLoop();
    expect(
      gate.getPendingRequirement('story', 'greybox-bedroom'),
    ).not.toBeNull();
  });

  it('requires the bathroom mirror once per Story loop', () => {
    const progress = new StoryProgress();
    const gate = new StoryExitGate(
      new StoryInteractionRegistry(STORY_INTERACTION_CATALOG),
      progress,
    );
    progress.beginLoop();

    expect(gate.getPendingRequirement('story', 'bathroom')).toMatchObject({
      id: 'bathroom-mirror',
      exitInstruction: 'EXAMINE THE ROOM',
    });

    progress.markEventTriggered('bathroom-mirror-inspection');
    expect(gate.getPendingRequirement('story', 'bathroom')).toBeNull();
  });

  it('never gates Escape or rooms without a required interaction', () => {
    const progress = new StoryProgress();
    const gate = new StoryExitGate(
      new StoryInteractionRegistry(STORY_INTERACTION_CATALOG),
      progress,
    );
    progress.beginLoop();

    expect(
      gate.getPendingRequirement('escape', 'greybox-bedroom'),
    ).toBeNull();
    expect(gate.getPendingRequirement('story', 'first-corridor')).toBeNull();
  });
});
