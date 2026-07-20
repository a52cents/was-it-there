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
      exitInstruction: 'EXAMINE THE FAMILY PHOTO',
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
      exitInstruction: 'EXAMINE THE MIRROR',
    });

    progress.markEventTriggered('bathroom-mirror-inspection');
    expect(gate.getPendingRequirement('story', 'bathroom')).toBeNull();
  });

  it('requires the erased desk photo before leaving the office', () => {
    const progress = new StoryProgress();
    const gate = new StoryExitGate(
      new StoryInteractionRegistry(STORY_INTERACTION_CATALOG),
      progress,
    );
    progress.beginLoop();

    expect(gate.getPendingRequirement('story', 'office')).toMatchObject({
      id: 'office-desk-photo',
      exitInstruction: 'EXAMINE THE DESK PHOTO',
    });
    progress.markEventTriggered('office-erased-name-inspection');
    expect(gate.getPendingRequirement('story', 'office')).toBeNull();
  });

  it('requires counting the breakfast places before leaving the kitchen', () => {
    const progress = new StoryProgress();
    const gate = new StoryExitGate(
      new StoryInteractionRegistry(STORY_INTERACTION_CATALOG),
      progress,
    );
    progress.beginLoop();

    expect(gate.getPendingRequirement('story', 'kitchen')).toMatchObject({
      id: 'kitchen-breakfast-table',
      exitInstruction: 'COUNT THE PLACES',
    });
    progress.markEventTriggered('kitchen-fourth-place-inspection');
    expect(gate.getPendingRequirement('story', 'kitchen')).toBeNull();
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
