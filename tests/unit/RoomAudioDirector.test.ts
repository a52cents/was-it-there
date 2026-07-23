import { describe, expect, it, vi } from 'vitest';
import { RoomAudioDirector } from '../../src/audio/RoomAudioDirector';
import type { BlackoutSnapshot } from '../../src/gameplay/anomalies/BlackoutTimeline';

function createHarness() {
  const audio = {
    play: vi.fn(),
    stop: vi.fn(),
  };
  return {
    audio,
    director: new RoomAudioDirector(audio),
  };
}

describe('RoomAudioDirector', () => {
  it('keeps the soundtrack continuous while changing room ambience', () => {
    const { audio, director } = createHarness();

    director.startRoom();
    director.finishRoom();
    director.startRoom();

    expect(audio.play.mock.calls).toEqual([
      ['game-soundtrack'],
      ['room-ambience'],
      ['game-soundtrack'],
      ['room-ambience'],
    ]);
    expect(audio.stop.mock.calls).toEqual([
      ['room-ambience'],
      ['ambient-knock'],
      ['ambient-footsteps'],
      ['ambient-whisper'],
    ]);
  });

  it('plays one light-return cue per blackout', () => {
    const { audio, director } = createHarness();

    director.beginBlackout();
    director.updateBlackout(createBlackoutSnapshot('full-black'));
    director.updateBlackout(createBlackoutSnapshot('reveal'));
    director.updateBlackout(createBlackoutSnapshot('reveal'));
    director.updateBlackout(createBlackoutSnapshot('complete'));

    expect(audio.play).toHaveBeenCalledWith('blackout-cue');
    expect(audio.play.mock.calls.filter(([id]) => id === 'lights-return')).toHaveLength(1);

    director.beginBlackout();
    director.updateBlackout(createBlackoutSnapshot('reveal'));
    expect(audio.play.mock.calls.filter(([id]) => id === 'lights-return')).toHaveLength(2);
  });

  it('separates the door unlock and opening effects', () => {
    const { audio, director } = createHarness();

    director.openExitDoor();

    expect(audio.play.mock.calls).toEqual([
      ['door-unlock'],
      ['door-open'],
    ]);
  });

  it('spaces out ambient scares and avoids an immediate repeat', () => {
    const { audio } = createHarness();
    const director = new RoomAudioDirector(audio, () => 0);

    director.startRoom();
    director.update(13_999);
    expect(audio.play).not.toHaveBeenCalledWith('ambient-knock');

    director.update(1);
    expect(audio.play).toHaveBeenCalledWith('ambient-knock');

    director.update(24_000);
    expect(
      audio.play.mock.calls.filter(([id]) =>
        String(id).startsWith('ambient-'),
      ),
    ).toEqual([
      ['ambient-knock'],
      ['ambient-footsteps'],
    ]);
  });

  it('stops every persistent or delayed room cue when reset', () => {
    const { audio, director } = createHarness();

    director.startRoom();
    director.beginBlackout();
    director.openExitDoor();
    director.reset();

    expect(audio.stop.mock.calls).toEqual([
      ['room-ambience'],
      ['ambient-knock'],
      ['ambient-footsteps'],
      ['ambient-whisper'],
      ['game-soundtrack'],
      ['blackout-cue'],
      ['lights-return'],
      ['door-unlock'],
      ['door-open'],
    ]);
  });
});

function createBlackoutSnapshot(
  stage: BlackoutSnapshot['stage'],
): BlackoutSnapshot {
  return {
    stage,
    elapsedMs: 0,
    overlayOpacity: 0,
    lightMultiplier: 1,
    anomalyApplicationDue: false,
    complete: stage === 'complete',
  };
}
