import type { BlackoutSnapshot } from '../gameplay/anomalies/BlackoutTimeline';
import type { AudioCueId, AudioManager } from './AudioManager';

type AudioPlayback = Pick<AudioManager, 'play' | 'stop'>;

const TRANSIENT_ROOM_CUES: readonly AudioCueId[] = [
  'blackout-cue',
  'lights-return',
  'door-unlock',
  'door-open',
];

export class RoomAudioDirector {
  private roomActive = false;
  private lightsReturnPlayed = false;

  public constructor(private readonly audio: AudioPlayback) {}

  public startRoom(): void {
    this.roomActive = true;
    this.audio.play('room-ambience');
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

  public finishRoom(): void {
    this.roomActive = false;
    this.audio.stop('room-ambience');
  }

  public reset(): void {
    this.finishRoom();
    this.lightsReturnPlayed = false;

    for (const cue of TRANSIENT_ROOM_CUES) {
      this.audio.stop(cue);
    }
  }

  public resume(): void {
    if (this.roomActive) {
      this.audio.play('room-ambience');
    }
  }
}
