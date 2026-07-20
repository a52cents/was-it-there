import { describe, expect, it, vi } from 'vitest';
import {
  FIRST_STORY_CHAPTER_FINAL_ROOM_ID,
  isFirstStoryChapterFinalRoom,
  resolveFirstChapterOutcome,
} from '../../src/gameplay/story/StoryChapterOutcome';
import { StoryProgress } from '../../src/gameplay/story/StoryProgress';

describe('StoryProgress', () => {
  it('keeps discoveries across loops and clears loop event history', () => {
    const progress = new StoryProgress();
    expect(progress.beginLoop()).toBe(1);
    expect(progress.addDiscovery('empty-place')).toBe(true);
    expect(progress.addDiscovery('empty-place')).toBe(false);
    expect(progress.addFragment('bedroom-memory')).toBe(true);
    progress.markEventTriggered('bedroom-radio');

    expect(progress.beginLoop()).toBe(2);
    expect(progress.hasDiscovery('empty-place')).toBe(true);
    expect(progress.hasFragment('bedroom-memory')).toBe(true);
    expect(progress.wasEventTriggered('bedroom-radio')).toBe(true);
    expect(progress.wasEventTriggeredThisLoop('bedroom-radio')).toBe(false);
  });

  it('stores typed condition flags in deterministic snapshots', () => {
    const progress = new StoryProgress();
    progress.beginLoop();
    progress.setFlag('answered-phone', true);
    progress.setFlag('caller-name', 'unknown');
    progress.setFlag('attempt', 2);

    expect(progress.getSnapshot()).toMatchObject({
      loopNumber: 1,
      flags: {
        'answered-phone': true,
        attempt: 2,
        'caller-name': 'unknown',
      },
    });
  });

  it('rejects blank identifiers and non-finite numeric flags', () => {
    const progress = new StoryProgress();
    expect(() => progress.addDiscovery(' ')).toThrow('must not be empty');
    expect(() => progress.setFlag('attempt', Number.POSITIVE_INFINITY)).toThrow(
      'must be finite',
    );
  });

  it('hydrates durable progress and notifies persistence listeners', () => {
    const progress = new StoryProgress();
    const changed = vi.fn();
    progress.hydrate({
      loopNumber: 4,
      completedLoopCount: 1,
      failedLoopCount: 3,
      discoveries: ['empty-place'],
      fragments: ['bedroom-memory'],
      triggeredEventIds: ['bedroom-radio'],
      flags: { remembered: true },
      chapterOutcomeIds: ['chapter-one-complete'],
      endingIds: [],
    });
    progress.subscribe(changed);

    expect(progress.beginLoop()).toBe(5);
    progress.recordLoopOutcome('failed');

    expect(changed).toHaveBeenCalledTimes(2);
    expect(progress.getPersistentSnapshot()).toMatchObject({
      loopNumber: 5,
      completedLoopCount: 1,
      failedLoopCount: 4,
      discoveries: ['empty-place'],
      triggeredEventIds: ['bedroom-radio'],
      chapterOutcomeIds: ['chapter-one-complete'],
    });
    expect(progress.wasEventTriggeredThisLoop('bedroom-radio')).toBe(false);
  });

  it('resolves the first chapter from the four core memories', () => {
    expect(
      resolveFirstChapterOutcome([
        'memory-empty-place',
        'memory-mirror-warning',
        'memory-phone-prediction',
      ]),
    ).toBe('chapter-escaped');
    expect(
      resolveFirstChapterOutcome([
        'memory-empty-place',
        'memory-mirror-warning',
        'memory-phone-prediction',
        'memory-erased-name',
      ]),
    ).toBe('chapter-remembered');
  });

  it('continues Story through the office and ends the chapter in the kitchen', () => {
    expect(isFirstStoryChapterFinalRoom('office')).toBe(false);
    expect(isFirstStoryChapterFinalRoom('kitchen')).toBe(true);
    expect(FIRST_STORY_CHAPTER_FINAL_ROOM_ID).toBe('kitchen');
  });
});
