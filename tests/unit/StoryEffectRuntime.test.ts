import { describe, expect, it, vi } from 'vitest';
import { STORY_AUDIO_CUE_IDS } from '../../src/audio/AudioManager';
import { StoryEffectRuntime } from '../../src/gameplay/story/StoryEffectRuntime';
import type { StoryEffectExecution } from '../../src/gameplay/story/StoryDirector';
import type { StoryEffectDefinition } from '../../src/gameplay/story/StoryEvent';
import type { StoryMemoryView } from '../../src/ui/StoryMemoryView';
import type { StorySubtitleView } from '../../src/ui/StorySubtitleView';

function createExecution(
  effect: StoryEffectDefinition,
  phase: StoryEffectExecution['context']['phase'] = 'observation',
): StoryEffectExecution {
  return {
    eventId: 'bedroom-test',
    effect,
    context: {
      roomId: 'greybox-bedroom',
      loopNumber: 1,
      pressureLevel: 0,
      phase,
      phaseElapsedMs: 2_500,
    },
  };
}

describe('StoryEffectRuntime', () => {
  it('routes registered subtitles, audio, and screen effects', () => {
    const audio = { play: vi.fn(), stop: vi.fn() };
    const subtitle = {
      show: vi.fn(),
      update: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      reset: vi.fn(),
    };
    const memory = {
      show: vi.fn(),
      update: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      reset: vi.fn(),
    };
    const runtime = new StoryEffectRuntime(
      audio,
      subtitle as unknown as StorySubtitleView,
      memory as unknown as StoryMemoryView,
    );

    runtime.execute(
      createExecution({
        type: 'subtitle',
        copyKey: 'story.bedroom.emptyPlace',
      }),
    );
    runtime.execute(
      createExecution({
        type: 'audio',
        cueId: 'story-photo-memory',
        action: 'play',
      }),
    );
    runtime.execute(
      createExecution({
        type: 'screen-effect',
        effectId: 'bedroom-empty-place',
      }),
    );

    expect(subtitle.show).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'There were four of us. Someone cut Elise out of the photograph.',
      }),
    );
    expect(audio.play).toHaveBeenCalledWith('story-photo-memory');
    expect(memory.show).toHaveBeenCalledWith('bedroom-empty-place');
  });

  it('freezes presentation timing and restores every transient effect', () => {
    const audio = { play: vi.fn(), stop: vi.fn() };
    const subtitle = {
      show: vi.fn(),
      update: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      reset: vi.fn(),
    };
    const memory = {
      show: vi.fn(),
      update: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      reset: vi.fn(),
    };
    const runtime = new StoryEffectRuntime(
      audio,
      subtitle as unknown as StorySubtitleView,
      memory as unknown as StoryMemoryView,
    );

    runtime.update(16);
    runtime.execute(
      createExecution(
        {
          type: 'subtitle',
          copyKey: 'story.bedroom.radioComplete',
        },
        'room-complete',
      ),
    );
    expect(runtime.isRoomExitHeld()).toBe(true);
    runtime.pause();
    runtime.update(3_600);
    expect(runtime.isRoomExitHeld()).toBe(true);
    runtime.resume();
    runtime.update(3_600);
    expect(runtime.isRoomExitHeld()).toBe(false);
    runtime.reset();

    expect(subtitle.update).toHaveBeenCalledWith(16);
    expect(subtitle.pause).toHaveBeenCalledOnce();
    expect(memory.resume).toHaveBeenCalledOnce();
    expect(audio.stop).toHaveBeenCalledTimes(STORY_AUDIO_CUE_IDS.length);
    expect(subtitle.reset).toHaveBeenCalledOnce();
    expect(memory.reset).toHaveBeenCalledOnce();
  });

  it('applies and restores non-reportable room helpers', () => {
    const helperVisibility = vi.fn();
    const runtime = new StoryEffectRuntime(
      { play: vi.fn(), stop: vi.fn() },
      { reset: vi.fn() } as unknown as StorySubtitleView,
      { reset: vi.fn() } as unknown as StoryMemoryView,
      { onHelperVisibility: helperVisibility },
    );

    runtime.execute(
      createExecution({
        type: 'helper-visibility',
        bindingId: 'story-room-helper',
        visible: true,
      }),
    );
    expect(helperVisibility).toHaveBeenLastCalledWith(
      'story-room-helper',
      true,
    );

    runtime.reset();
    expect(helperVisibility).toHaveBeenLastCalledWith(
      'story-room-helper',
      false,
    );
  });

  it('rejects unregistered authored effect identifiers', () => {
    const runtime = new StoryEffectRuntime(
      { play: vi.fn(), stop: vi.fn() },
      {
        show: vi.fn(),
      } as unknown as StorySubtitleView,
      {
        show: vi.fn(),
      } as unknown as StoryMemoryView,
    );

    expect(() =>
      runtime.execute(
        createExecution({
          type: 'audio',
          cueId: 'missing-cue',
          action: 'play',
        }),
      ),
    ).toThrow('Unknown story audio cue');
    expect(() =>
      runtime.execute(
        createExecution({
          type: 'screen-effect',
          effectId: 'missing-effect',
        }),
      ),
    ).toThrow('Unknown story screen effect');
  });
});
