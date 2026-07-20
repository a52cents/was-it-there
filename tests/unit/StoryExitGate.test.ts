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
      exitInstruction: 'TUNE THE RADIO',
    });

    progress.markEventTriggered('bedroom-radio-inspection');
    expect(
      gate.getPendingRequirement('story', 'greybox-bedroom'),
    ).toMatchObject({ exitInstruction: 'EXAMINE THE FAMILY PHOTO' });

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
      exitInstruction: 'COUNT THE TOOTHBRUSHES',
    });

    progress.markEventTriggered('bathroom-toothbrushes-inspection');
    expect(gate.getPendingRequirement('story', 'bathroom')).toMatchObject({
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
      exitInstruction: 'TRACE THE RADIO SIGNAL',
    });
    progress.markEventTriggered('office-radio-inspection');
    expect(gate.getPendingRequirement('story', 'office')).toMatchObject({
      exitInstruction: 'CHECK THE WALL CLOCK',
    });
    progress.markEventTriggered('office-clock-inspection');
    expect(gate.getPendingRequirement('story', 'office')).toMatchObject({
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
      exitInstruction: 'READ THE DISCARDED RECEIPT',
    });
    progress.markEventTriggered('kitchen-trashcan-inspection');
    expect(gate.getPendingRequirement('story', 'kitchen')).toMatchObject({
      exitInstruction: 'COUNT THE PLACES',
    });
    progress.markEventTriggered('kitchen-fourth-place-inspection');
    expect(gate.getPendingRequirement('story', 'kitchen')).toBeNull();
  });

  it('guides the three-stage dining-room reconstruction', () => {
    const progress = new StoryProgress();
    const gate = new StoryExitGate(
      new StoryInteractionRegistry(STORY_INTERACTION_CATALOG),
      progress,
    );
    progress.beginLoop();

    expect(gate.getPendingRequirement('story', 'dining-room')).toMatchObject({
      exitInstruction: "READ THE BEAR'S TAG",
    });
    progress.markEventTriggered('dining-bear-tag-read');
    expect(gate.getPendingRequirement('story', 'dining-room')).toMatchObject({
      exitInstruction: 'OPEN THE SIDEBOARD',
    });
    progress.markEventTriggered('dining-deletion-order-read');
    expect(gate.getPendingRequirement('story', 'dining-room')).toMatchObject({
      exitInstruction: 'RETURN TO THE FOURTH PLACE',
    });
    progress.markEventTriggered('dining-reconstruction-truth');
    expect(gate.getPendingRequirement('story', 'dining-room')).toBeNull();
  });

  it("recovers Noah's recording in three living-room stages", () => {
    const progress = new StoryProgress();
    const gate = new StoryExitGate(
      new StoryInteractionRegistry(STORY_INTERACTION_CATALOG),
      progress,
    );
    progress.beginLoop();

    expect(gate.getPendingRequirement('story', 'living-room')).toMatchObject({
      exitInstruction: 'FIND THE RECORDING TAPE',
    });
    progress.markEventTriggered('living-tape-label-read');
    expect(gate.getPendingRequirement('story', 'living-room')).toMatchObject({
      exitInstruction: 'PLAY THE TAPE',
    });
    progress.markEventTriggered('living-recording-played');
    expect(gate.getPendingRequirement('story', 'living-room')).toMatchObject({
      exitInstruction: 'WATCH THE TELEVISION',
    });
    progress.markEventTriggered('living-noah-recording-revealed');
    expect(gate.getPendingRequirement('story', 'living-room')).toBeNull();
  });

  it('traces the discarded copies through the laundry room', () => {
    const progress = new StoryProgress();
    const gate = new StoryExitGate(
      new StoryInteractionRegistry(STORY_INTERACTION_CATALOG),
      progress,
    );
    progress.beginLoop();

    expect(gate.getPendingRequirement('story', 'laundry-room')).toMatchObject({
      exitInstruction: 'READ THE WASHER TAG',
    });
    progress.markEventTriggered('laundry-washer-tag-read');
    expect(gate.getPendingRequirement('story', 'laundry-room')).toMatchObject({
      exitInstruction: 'MATCH THE GARMENT LABELS',
    });
    progress.markEventTriggered('laundry-labels-matched');
    expect(gate.getPendingRequirement('story', 'laundry-room')).toMatchObject({
      exitInstruction: 'OPEN THE DISPOSAL BIN',
    });
    progress.markEventTriggered('laundry-discarded-copies-revealed');
    expect(gate.getPendingRequirement('story', 'laundry-room')).toBeNull();
  });

  it('gates the corridor clock in Story but never gates Escape', () => {
    const progress = new StoryProgress();
    const gate = new StoryExitGate(
      new StoryInteractionRegistry(STORY_INTERACTION_CATALOG),
      progress,
    );
    progress.beginLoop();

    expect(
      gate.getPendingRequirement('escape', 'greybox-bedroom'),
    ).toBeNull();
    expect(
      gate.getPendingRequirement('story', 'first-corridor'),
    ).toMatchObject({
      id: 'corridor-wall-clock',
      exitInstruction: 'CHECK THE WALL CLOCK',
    });
    progress.markEventTriggered('corridor-clock-inspection');
    expect(gate.getPendingRequirement('story', 'first-corridor')).toBeNull();
  });

  it('opens the final exit after any one explicit archive choice', () => {
    const progress = new StoryProgress();
    const gate = new StoryExitGate(
      new StoryInteractionRegistry(STORY_INTERACTION_CATALOG),
      progress,
    );
    progress.beginLoop();

    expect(gate.getPendingRequirement('story', 'main-hall')).toMatchObject({
      exitInstruction: 'OPEN THE ARCHIVE',
    });
    progress.markEventTriggered('main-hall-archive-opened');
    expect(gate.getPendingRequirement('story', 'main-hall')).toMatchObject({
      exitInstruction: 'CHOOSE WHAT SURVIVES',
    });
    progress.markEventTriggered('main-hall-remember-chosen');
    expect(gate.getPendingRequirement('story', 'main-hall')).toBeNull();
  });
});
