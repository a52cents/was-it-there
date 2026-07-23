import {
  STORY_AUDIO_CUE_IDS,
  type StoryAudioCueId,
} from '../../audio/AudioManager';
import { resolveStorySubtitleCopy } from '../../content/story/StorySubtitleCatalog';
import {
  STORY_SCREEN_EFFECT_IDS,
  type StoryMemoryView,
  type StoryScreenEffectId,
} from '../../ui/StoryMemoryView';
import type { StorySubtitleView } from '../../ui/StorySubtitleView';
import type { StoryEffectExecution } from './StoryDirector';

export interface StoryAudioPort {
  play(id: StoryAudioCueId): void;
  stop(id: StoryAudioCueId): void;
}

export interface StoryEffectRuntimeOptions {
  readonly onHelperVisibility?: (
    bindingId: string,
    visible: boolean,
  ) => void;
}

export class StoryEffectRuntime {
  private roomExitHoldMs = 0;
  private paused = false;
  private readonly visibleHelperIds = new Set<string>();

  public constructor(
    private readonly audio: StoryAudioPort,
    private readonly subtitleView: StorySubtitleView,
    private readonly memoryView: StoryMemoryView,
    private readonly options: StoryEffectRuntimeOptions = {},
  ) {}

  public execute(execution: StoryEffectExecution): void {
    const { effect } = execution;

    switch (effect.type) {
      case 'subtitle': {
        const copy = resolveStorySubtitleCopy(effect.copyKey);
        this.subtitleView.show(copy);

        if (execution.context.phase === 'room-complete') {
          this.roomExitHoldMs = Math.max(
            this.roomExitHoldMs,
            copy.durationMs,
          );
        }
        break;
      }
      case 'audio': {
        const cueId = assertStoryAudioCueId(effect.cueId);
        this.audio[effect.action](cueId);
        break;
      }
      case 'screen-effect':
        this.memoryView.show(assertStoryScreenEffectId(effect.effectId));
        break;
      case 'helper-visibility':
        this.options.onHelperVisibility?.(
          effect.bindingId,
          effect.visible,
        );

        if (effect.visible) {
          this.visibleHelperIds.add(effect.bindingId);
        } else {
          this.visibleHelperIds.delete(effect.bindingId);
        }
        break;
      case 'add-discovery':
      case 'add-fragment':
      case 'add-ending':
      case 'set-flag':
        break;
      case 'lighting-preset':
      case 'animation':
      case 'failure-presentation':
        throw new Error(
          `Story effect "${effect.type}" has no registered runtime handler.`,
        );
    }
  }

  public update(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) {
      throw new RangeError(
        'Story effect delta must be finite and non-negative.',
      );
    }

    if (this.paused) {
      return;
    }

    this.subtitleView.update(deltaMs);
    this.memoryView.update(deltaMs);
    this.roomExitHoldMs = Math.max(0, this.roomExitHoldMs - deltaMs);
  }

  public pause(): void {
    this.paused = true;
    this.subtitleView.pause();
    this.memoryView.pause();
  }

  public resume(): void {
    this.paused = false;
    this.subtitleView.resume();
    this.memoryView.resume();
  }

  public reset(): void {
    for (const bindingId of this.visibleHelperIds) {
      this.options.onHelperVisibility?.(bindingId, false);
    }

    this.visibleHelperIds.clear();

    for (const cueId of STORY_AUDIO_CUE_IDS) {
      this.audio.stop(cueId);
    }

    this.subtitleView.reset();
    this.memoryView.reset();
    this.roomExitHoldMs = 0;
    this.paused = false;
  }

  public isRoomExitHeld(): boolean {
    return (
      this.roomExitHoldMs > 0 ||
      this.subtitleView.isVisible() ||
      this.memoryView.isVisible()
    );
  }
}

function assertStoryAudioCueId(cueId: string): StoryAudioCueId {
  if (!(STORY_AUDIO_CUE_IDS as readonly string[]).includes(cueId)) {
    throw new Error(`Unknown story audio cue id "${cueId}".`);
  }

  return cueId as StoryAudioCueId;
}

function assertStoryScreenEffectId(
  effectId: string,
): StoryScreenEffectId {
  if (!(STORY_SCREEN_EFFECT_IDS as readonly string[]).includes(effectId)) {
    throw new Error(`Unknown story screen effect id "${effectId}".`);
  }

  return effectId as StoryScreenEffectId;
}
