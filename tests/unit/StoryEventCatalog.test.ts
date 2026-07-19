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

  it('reveals and restores the bathroom mirror warning after reporting', () => {
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
    expect(progress.hasDiscovery('bathroom-inside-fingerprints')).toBe(true);
    expect(onEffect).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'bathroom-mirror-inspection',
        effect: {
          type: 'subtitle',
          copyKey: 'story.bathroom.inspectMirror',
        },
      }),
    );

    expect(
      director.emit({
        type: 'object-examined',
        objectId: 'bathroom-rubber-duck',
      }),
    ).toBe(1);
    expect(progress.hasDiscovery('bathroom-duck-317')).toBe(true);

    director.startPhase('room-complete');
    expect(director.emit({ type: 'room-completed' })).toBe(1);
    expect(progress.hasFragment('memory-mirror-warning')).toBe(true);
    expect(onEffect).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'bathroom-mirror-warning',
        effect: {
          type: 'helper-visibility',
          bindingId: 'bathroom-mirror-fog',
          visible: true,
        },
      }),
    );

    expect(director.update(4_200)).toBe(1);
    expect(onEffect).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'bathroom-mirror-warning-fades',
        effect: {
          type: 'helper-visibility',
          bindingId: 'bathroom-mirror-fog',
          visible: false,
        },
      }),
    );
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
});
