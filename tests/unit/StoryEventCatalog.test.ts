import { describe, expect, it, vi } from 'vitest';
import { STORY_EVENT_CATALOG } from '../../src/content/story/StoryEventCatalog';
import { StoryDirector } from '../../src/gameplay/story/StoryDirector';
import { StoryProgress } from '../../src/gameplay/story/StoryProgress';

describe('StoryEventCatalog', () => {
  it('plays the complete bedroom slice and records the empty-place memory', () => {
    const progress = new StoryProgress();
    const onEffect = vi.fn();
    const director = new StoryDirector(STORY_EVENT_CATALOG, progress, {
      onEffect,
    });
    director.beginLoop('story', 'greybox-bedroom');
    director.startPhase('observation');

    expect(director.update(2_499)).toBe(0);
    expect(director.update(1)).toBe(1);
    expect(onEffect).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 'bedroom-radio-burst' }),
    );

    expect(
      director.emit({
        type: 'object-examined',
        objectId: 'bedroom-family-photo',
      }),
    ).toBe(1);
    expect(progress.hasDiscovery('bedroom-empty-place')).toBe(true);
    expect(progress.hasFragment('memory-empty-place')).toBe(true);

    director.startPhase('room-complete');
    expect(director.emit({ type: 'room-completed' })).toBe(1);
    expect(onEffect).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 'bedroom-radio-complete' }),
    );
  });

  it('keeps authored bedroom events disabled in Escape', () => {
    const onEffect = vi.fn();
    const director = new StoryDirector(
      STORY_EVENT_CATALOG,
      new StoryProgress(),
      { onEffect },
    );

    expect(director.beginLoop('escape', 'greybox-bedroom')).toBe(false);
    expect(director.startPhase('observation')).toBe(false);
    expect(director.update(10_000)).toBe(0);
    expect(
      director.emit({
        type: 'object-examined',
        objectId: 'bedroom-family-photo',
      }),
    ).toBe(0);
    expect(onEffect).not.toHaveBeenCalled();
  });

  it('reveals strange descriptions when other bedroom objects are examined', () => {
    const progress = new StoryProgress();
    const onEffect = vi.fn();
    const director = new StoryDirector(STORY_EVENT_CATALOG, progress, {
      onEffect,
    });
    director.beginLoop('story', 'greybox-bedroom');
    director.startPhase('room-complete');

    expect(
      director.emit({
        type: 'object-examined',
        objectId: 'bedroom-television',
      }),
    ).toBe(1);
    expect(onEffect).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'bedroom-television-inspection',
        effect: {
          type: 'subtitle',
          copyKey: 'story.bedroom.inspectTelevision',
        },
      }),
    );
    expect(progress.hasDiscovery('bedroom-missing-reflection')).toBe(true);

    expect(
      director.emit({
        type: 'object-examined',
        objectId: 'bedroom-television',
      }),
    ).toBe(0);
  });

  it('starts the bedroom radio search on the third error only', () => {
    const onEffect = vi.fn();
    const director = new StoryDirector(
      STORY_EVENT_CATALOG,
      new StoryProgress(),
      { onEffect },
    );
    director.beginLoop('story', 'greybox-bedroom');

    director.setPressureLevel(2);
    expect(director.emit({ type: 'run-error', kind: 'timeout' })).toBe(0);
    director.setPressureLevel(3);
    expect(director.emit({ type: 'run-error', kind: 'timeout' })).toBe(1);
    expect(onEffect).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'bedroom-radio-failure',
        effect: {
          type: 'audio',
          cueId: 'story-radio-search',
          action: 'play',
        },
      }),
    );
  });

  it('shows the bathroom mirror warning only when the mirror is examined', () => {
    const progress = new StoryProgress();
    const onEffect = vi.fn();
    const director = new StoryDirector(STORY_EVENT_CATALOG, progress, {
      onEffect,
    });
    director.beginLoop('story', 'greybox-bedroom');
    director.enterRoom('bathroom');
    director.startPhase('observation');

    expect(director.update(1_799)).toBe(0);
    expect(director.update(1)).toBe(1);
    expect(onEffect).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 'bathroom-pipe-warning' }),
    );

    expect(
      director.emit({
        type: 'object-examined',
        objectId: 'bathroom-mirror',
      }),
    ).toBe(1);
    expect(progress.hasFragment('memory-mirror-warning')).toBe(true);
    expect(onEffect).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'bathroom-mirror-inspection',
        effect: {
          type: 'subtitle',
          copyKey: 'story.bathroom.mirrorWarning',
        },
      }),
    );

    expect(
      director.emit({
        type: 'object-examined',
        objectId: 'bathroom-rubber-duck',
      }),
    ).toBe(1);
    expect(progress.hasDiscovery('bathroom-duck-304')).toBe(true);

    director.startPhase('room-complete');
    expect(director.emit({ type: 'room-completed' })).toBe(0);
  });

  it('records the optional corridor prediction when the ringing phone is answered', () => {
    const progress = new StoryProgress();
    const onEffect = vi.fn();
    const director = new StoryDirector(STORY_EVENT_CATALOG, progress, {
      onEffect,
    });
    director.beginLoop('story', 'greybox-bedroom');
    director.enterRoom('first-corridor');
    director.startPhase('observation');

    expect(
      director.emit({
        type: 'object-examined',
        objectId: 'corridor-phone',
      }),
    ).toBe(0);
    expect(director.update(1_500)).toBe(1);
    expect(
      director.emit({
        type: 'object-examined',
        objectId: 'corridor-phone',
      }),
    ).toBe(1);

    expect(progress.hasFragment('memory-phone-prediction')).toBe(true);
    expect(progress.getFlag('corridor-phone-answered')).toBe(true);
    expect(onEffect).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'corridor-phone-answered',
        effect: {
          type: 'subtitle',
          copyKey: 'story.corridor.prediction',
        },
      }),
    );
    expect(
      director.emit({
        type: 'object-examined',
        objectId: 'corridor-phone',
      }),
    ).toBe(0);

    director.setPressureLevel(3);
    expect(director.emit({ type: 'run-error', kind: 'timeout' })).toBe(1);
    expect(onEffect).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'corridor-ringing-failure',
        effect: {
          type: 'screen-effect',
          effectId: 'corridor-ringing-failure',
        },
      }),
    );
  });

  it('pays off the corridor warning and reveals the erased name in the office', () => {
    const progress = new StoryProgress();
    const onEffect = vi.fn();
    const director = new StoryDirector(STORY_EVENT_CATALOG, progress, {
      onEffect,
    });
    director.beginLoop('story', 'greybox-bedroom');
    progress.setFlag('corridor-phone-answered', true);
    director.enterRoom('office');
    director.startPhase('observation');

    expect(director.update(1_799)).toBe(0);
    expect(director.update(1)).toBe(1);
    expect(director.update(3_400)).toBe(1);
    expect(progress.hasDiscovery('office-predicted-silence')).toBe(true);

    for (const objectId of [
      'office-radio',
      'office-phone',
      'office-wall-clock',
    ]) {
      expect(
        director.emit({ type: 'object-examined', objectId }),
        objectId,
      ).toBe(1);
    }

    expect(
      director.emit({
        type: 'object-examined',
        objectId: 'office-desk-photo',
      }),
    ).toBe(1);
    expect(progress.hasFragment('memory-erased-name')).toBe(true);
    expect(onEffect).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'office-erased-name-inspection',
        effect: {
          type: 'screen-effect',
          effectId: 'office-erased-name',
        },
      }),
    );

    director.startPhase('room-complete');
    expect(director.emit({ type: 'room-completed' })).toBe(1);
    director.setPressureLevel(3);
    expect(director.emit({ type: 'run-error', kind: 'timeout' })).toBe(1);
    expect(onEffect).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'office-radio-failure',
        effect: {
          type: 'audio',
          cueId: 'story-office-failure',
          action: 'play',
        },
      }),
    );
  });

  it('replays breakfast backwards and reveals the fourth place in the kitchen', () => {
    const progress = new StoryProgress();
    const onEffect = vi.fn();
    const director = new StoryDirector(STORY_EVENT_CATALOG, progress, {
      onEffect,
    });
    director.beginLoop('story', 'greybox-bedroom');
    director.enterRoom('kitchen');
    director.startPhase('observation');

    expect(director.update(1_599)).toBe(0);
    expect(director.update(1)).toBe(1);
    expect(onEffect).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'kitchen-reverse-breakfast',
        effect: {
          type: 'audio',
          cueId: 'story-kitchen-reverse-breakfast',
          action: 'play',
        },
      }),
    );
    expect(director.update(4_600)).toBe(1);

    for (const objectId of [
      'kitchen-fridge',
      'kitchen-microwave',
      'kitchen-sink',
      'kitchen-stove',
      'kitchen-coffee-machine',
      'kitchen-trashcan',
    ]) {
      expect(
        director.emit({ type: 'object-examined', objectId }),
        objectId,
      ).toBe(1);
    }

    expect(
      director.emit({
        type: 'object-examined',
        objectId: 'kitchen-breakfast-table',
      }),
    ).toBe(1);
    expect(progress.hasFragment('memory-kitchen-fourth-place')).toBe(true);
    expect(progress.hasDiscovery('kitchen-receipt-304')).toBe(true);
    expect(onEffect).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'kitchen-fourth-place-inspection',
        effect: {
          type: 'screen-effect',
          effectId: 'kitchen-service-ticket',
        },
      }),
    );

    director.startPhase('room-complete');
    expect(director.emit({ type: 'room-completed' })).toBe(1);
    director.setPressureLevel(3);
    expect(director.emit({ type: 'run-error', kind: 'timeout' })).toBe(1);
    expect(onEffect).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'kitchen-service-failure',
        effect: {
          type: 'audio',
          cueId: 'story-kitchen-failure',
          action: 'play',
        },
      }),
    );
  });
});
