import type { BlackoutSnapshot } from '../gameplay/anomalies/BlackoutTimeline';
import type { AudioCueId, AudioManager } from './AudioManager';

type AudioPlayback = Pick<AudioManager, 'play' | 'stop'>;

const TRANSIENT_ROOM_CUES: readonly AudioCueId[] = [
  'blackout-cue',
  'lights-return',
  'door-unlock',
  'door-open',
];

const AMBIENT_EVENT_CUE_IDS = [
  'ambient-knock',
  'ambient-footsteps',
  'ambient-whisper',
] as const satisfies readonly AudioCueId[];

const AMBIENT_EVENT_CUES = [
  'ambient-knock',
  'ambient-knock',
  'ambient-footsteps',
  'ambient-footsteps',
  'ambient-whisper',
] as const satisfies readonly AudioCueId[];

const FIRST_AMBIENT_EVENT_DELAY_MS = {
  minimum: 14_000,
  maximum: 28_000,
} as const;

const REPEATED_AMBIENT_EVENT_DELAY_MS = {
  minimum: 24_000,
  maximum: 50_000,
} as const;

export class RoomAudioDirector {
  private roomActive = false;
  private lightsReturnPlayed = false;
  private ambientEventDelayMs: number | null = null;
  private lastAmbientEvent: AudioCueId | null = null;

  public constructor(
    private readonly audio: AudioPlayback,
    private readonly random: () => number = Math.random,
  ) {}

  public startRoom(): void {
    const wasActive = this.roomActive;
    this.roomActive = true;
    this.audio.play('game-soundtrack');
    this.audio.play('room-ambience');

    if (!wasActive || this.ambientEventDelayMs === null) {
      this.ambientEventDelayMs = this.randomDelay(
        FIRST_AMBIENT_EVENT_DELAY_MS,
      );
    }
  }

  public beginBlackout(): void {
    this.lightsReturnPlayed = false;
    this.audio.play('blackout-cue');
  }

  public updateBlackout(snapshot: BlackoutSnapshot): void {
    if (
      !this.lightsReturnPlayed &&
      (snapshot.stage === 'reveal' || snapshot.stage === 'complete')
    ) {
      this.lightsReturnPlayed = true;
      this.audio.play('lights-return');
    }
  }

  public openExitDoor(): void {
    this.audio.play('door-unlock');
    this.audio.play('door-open');
  }

  public update(deltaMs: number): void {
    if (
      !this.roomActive ||
      this.ambientEventDelayMs === null ||
      !Number.isFinite(deltaMs) ||
      deltaMs <= 0
    ) {
      return;
    }

    this.ambientEventDelayMs -= deltaMs;

    if (this.ambientEventDelayMs > 0) {
      return;
    }

    const cue = this.selectAmbientEvent();
    this.audio.play(cue);
    this.lastAmbientEvent = cue;
    this.ambientEventDelayMs = this.randomDelay(
      REPEATED_AMBIENT_EVENT_DELAY_MS,
    );
  }

  public finishRoom(): void {
    this.roomActive = false;
    this.ambientEventDelayMs = null;
    this.audio.stop('room-ambience');

    for (const cue of AMBIENT_EVENT_CUE_IDS) {
      this.audio.stop(cue);
    }
  }

  public reset(): void {
    this.finishRoom();
    this.audio.stop('game-soundtrack');
    this.lightsReturnPlayed = false;
    this.lastAmbientEvent = null;

    for (const cue of TRANSIENT_ROOM_CUES) {
      this.audio.stop(cue);
    }
  }

  public resume(): void {
    if (this.roomActive) {
      this.audio.play('game-soundtrack');
      this.audio.play('room-ambience');
    }
  }

  private selectAmbientEvent(): AudioCueId {
    const candidates = AMBIENT_EVENT_CUES.filter(
      (cue) => cue !== this.lastAmbientEvent,
    );
    const index = Math.min(
      candidates.length - 1,
      Math.floor(this.safeRandom() * candidates.length),
    );
    return candidates[index] ?? 'ambient-knock';
  }

  private randomDelay(range: {
    readonly minimum: number;
    readonly maximum: number;
  }): number {
    return range.minimum +
      this.safeRandom() * (range.maximum - range.minimum);
  }

  private safeRandom(): number {
    const value = this.random();
    return Number.isFinite(value)
      ? Math.min(0.999_999, Math.max(0, value))
      : 0.5;
  }
}
