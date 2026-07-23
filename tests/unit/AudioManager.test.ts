import { describe, expect, it, vi } from 'vitest';
import { AudioManager } from '../../src/audio/AudioManager';

class FakeAudioParam {
  public value = 0;

  public cancelScheduledValues(_startTime: number): void {}

  public setValueAtTime(value: number, _startTime: number): void {
    this.value = value;
  }

  public linearRampToValueAtTime(value: number, _endTime: number): void {
    this.value = value;
  }

  public exponentialRampToValueAtTime(value: number, _endTime: number): void {
    this.value = value;
  }
}

class FakeAudioNode {
  public disconnected = false;
  public readonly connections: FakeAudioNode[] = [];

  public connect(destination: FakeAudioNode): FakeAudioNode {
    this.connections.push(destination);
    return destination;
  }

  public disconnect(): void {
    this.disconnected = true;
    this.connections.length = 0;
  }
}

class FakeScheduledSourceNode extends FakeAudioNode {
  public onended: (() => void) | null = null;
  public readonly starts: number[] = [];
  public readonly stops: (number | undefined)[] = [];

  public start(when = 0): void {
    this.starts.push(when);
  }

  public stop(when?: number): void {
    this.stops.push(when);
  }
}

class FakeOscillatorNode extends FakeScheduledSourceNode {
  public type: OscillatorType = 'sine';
  public readonly frequency = new FakeAudioParam();
}

class FakeAudioBufferSourceNode extends FakeScheduledSourceNode {
  public buffer: FakeAudioBuffer | null = null;
  public loop = false;
}

class FakeGainNode extends FakeAudioNode {
  public readonly gain = new FakeAudioParam();
}

class FakeBiquadFilterNode extends FakeAudioNode {
  public type: BiquadFilterType = 'lowpass';
  public readonly frequency = new FakeAudioParam();
  public readonly Q = new FakeAudioParam();
}

class FakeAudioBuffer {
  private readonly channels: readonly Float32Array[];

  public readonly frameCount: number;

  public constructor(numberOfChannels: number, frameCount: number) {
    this.frameCount = frameCount;
    this.channels = Array.from(
      { length: numberOfChannels },
      () => new Float32Array(frameCount),
    );
  }

  public getChannelData(channel: number): Float32Array {
    const samples = this.channels[channel];

    if (samples === undefined) {
      throw new RangeError(`Audio channel ${channel} is unavailable.`);
    }

    return samples;
  }
}

class FakeAudioContext {
  public state: AudioContextState = 'suspended';
  public readonly currentTime = 2;
  public readonly sampleRate = 100;
  public readonly destination = new FakeAudioNode();
  public readonly gains: FakeGainNode[] = [];
  public readonly oscillators: FakeOscillatorNode[] = [];
  public readonly bufferSources: FakeAudioBufferSourceNode[] = [];
  public readonly resume = vi.fn(() => {
    this.state = 'running';
    return Promise.resolve();
  });
  public readonly suspend = vi.fn(() => {
    this.state = 'suspended';
    return Promise.resolve();
  });
  public readonly close = vi.fn(() => {
    this.state = 'closed';
    return Promise.resolve();
  });

  public createGain(): FakeGainNode {
    const gain = new FakeGainNode();
    this.gains.push(gain);
    return gain;
  }

  public createOscillator(): FakeOscillatorNode {
    const oscillator = new FakeOscillatorNode();
    this.oscillators.push(oscillator);
    return oscillator;
  }

  public createBufferSource(): FakeAudioBufferSourceNode {
    const source = new FakeAudioBufferSourceNode();
    this.bufferSources.push(source);
    return source;
  }

  public createBiquadFilter(): FakeBiquadFilterNode {
    return new FakeBiquadFilterNode();
  }

  public createBuffer(
    channels: number,
    frameCount: number,
    _sampleRate: number,
  ): FakeAudioBuffer {
    return new FakeAudioBuffer(channels, frameCount);
  }
}

describe('AudioManager', () => {
  it('defers Web Audio creation until unlock and builds the category mixer once', async () => {
    const context = new FakeAudioContext();
    const factory = vi.fn(() => context as unknown as AudioContext);
    const manager = new AudioManager(factory);

    await manager.initialize();
    expect(factory).not.toHaveBeenCalled();
    expect(manager.getSnapshot().contextState).toBe('uninitialized');
    expect(manager.getSnapshot().volumes).toEqual({
      master: 1,
      music: 0.5,
      ambience: 0.5,
      effects: 0.5,
      interface: 0.5,
    });

    await manager.unlock();
    await manager.unlock();
    expect(factory).toHaveBeenCalledOnce();
    expect(context.resume).toHaveBeenCalledOnce();
    expect(context.gains).toHaveLength(5);
    expect(manager.getSnapshot().contextState).toBe('running');
  });

  it('keeps one deterministic room tone and stops all of its sources', async () => {
    const context = new FakeAudioContext();
    const manager = new AudioManager(
      () => context as unknown as AudioContext,
    );
    await manager.unlock();

    manager.play('room-ambience');
    manager.play('room-ambience');

    expect(context.bufferSources).toHaveLength(1);
    expect(context.bufferSources.every((source) => source.loop)).toBe(true);
    expect(
      context.bufferSources.map((source) => source.buffer?.frameCount),
    ).toEqual([200]);
    expect(context.oscillators).toHaveLength(2);
    expect(manager.getSnapshot().activeCueIds).toEqual(['room-ambience']);

    manager.stop('room-ambience');
    expect(
      [...context.bufferSources, ...context.oscillators].every(
        (source) => source.stops.length === 1,
      ),
    ).toBe(true);
    expect(manager.getSnapshot().activeCueIds).toEqual([]);
  });

  it('keeps the soundtrack playing continuously while room ambience changes', async () => {
    const context = new FakeAudioContext();
    const manager = new AudioManager(
      () => context as unknown as AudioContext,
    );
    await manager.unlock();

    manager.play('game-soundtrack');
    manager.play('game-soundtrack');
    const soundtrack = context.bufferSources[0];

    expect(soundtrack?.buffer?.frameCount).toBe(8_400);
    expect(soundtrack?.loop).toBe(true);
    expect(context.bufferSources).toHaveLength(1);

    manager.play('room-ambience');
    manager.stop('room-ambience');
    manager.play('room-ambience');
    manager.play('game-soundtrack');

    expect(context.bufferSources).toHaveLength(3);
    expect(soundtrack?.starts).toHaveLength(1);
    expect(soundtrack?.stops).toHaveLength(0);
    expect(manager.getSnapshot().activeCueIds).toEqual([
      'game-soundtrack',
      'room-ambience',
    ]);

    manager.stop('game-soundtrack');
    expect(soundtrack?.stops).toHaveLength(1);
  });

  it('routes transient cues, preserves ambience while muted, and updates mixer volumes', async () => {
    const context = new FakeAudioContext();
    const manager = new AudioManager(
      () => context as unknown as AudioContext,
    );
    await manager.unlock();
    manager.play('room-ambience');
    manager.play('game-soundtrack');
    manager.play('blackout-cue');
    manager.play('lights-return');
    manager.play('report-correct');
    manager.play('report-incorrect');
    manager.play('house-calm');
    manager.play('house-pressure-1');
    manager.play('house-pressure-2');
    manager.play('house-takeover');
    manager.play('story-radio-burst');
    manager.play('story-photo-memory');
    manager.play('story-radio-message');
    manager.play('story-radio-search');
    manager.play('story-bathroom-pipes');
    manager.play('story-bathroom-warning');
    manager.play('story-bathroom-failure');
    manager.play('story-corridor-ring');
    manager.play('story-corridor-prediction');
    manager.play('story-corridor-failure');
    manager.play('story-office-radio-pattern');
    manager.play('story-office-radio-silence');
    manager.play('story-office-erased-name');
    manager.play('story-office-failure');
    manager.play('story-kitchen-reverse-breakfast');
    manager.play('story-kitchen-chair-scrape');
    manager.play('story-kitchen-failure');
    manager.play('story-dining-voices');
    manager.play('story-dining-memory-pulse');
    manager.play('story-dining-archive');
    manager.play('story-dining-failure');
    manager.play('door-unlock');
    manager.play('door-open');

    expect(manager.getSnapshot().activeCueIds).toEqual([
      'game-soundtrack',
      'room-ambience',
      'blackout-cue',
      'lights-return',
      'report-correct',
      'report-incorrect',
      'house-calm',
      'house-pressure-1',
      'house-pressure-2',
      'house-takeover',
      'story-radio-burst',
      'story-photo-memory',
      'story-radio-message',
      'story-radio-search',
      'story-bathroom-pipes',
      'story-bathroom-warning',
      'story-bathroom-failure',
      'story-corridor-ring',
      'story-corridor-prediction',
      'story-corridor-failure',
      'story-office-radio-pattern',
      'story-office-radio-silence',
      'story-office-erased-name',
      'story-office-failure',
      'story-kitchen-reverse-breakfast',
      'story-kitchen-chair-scrape',
      'story-kitchen-failure',
      'story-dining-voices',
      'story-dining-memory-pulse',
      'story-dining-archive',
      'story-dining-failure',
      'door-unlock',
      'door-open',
    ]);

    manager.setCategoryVolume('ambience', 0.25);
    expect(context.gains[2]?.gain.value).toBe(0.25);
    manager.setMuted(true);
    expect(context.gains[0]?.gain.value).toBe(0);
    expect(manager.getSnapshot().activeCueIds).toContain('room-ambience');
    expect(manager.getSnapshot().activeCueIds).toContain('game-soundtrack');
    manager.setMuted(false);
    expect(context.gains[0]?.gain.value).toBe(1);
  });

  it('synthesizes stereo knocks, footsteps, and whispers as ambience', async () => {
    const context = new FakeAudioContext();
    const manager = new AudioManager(
      () => context as unknown as AudioContext,
    );
    await manager.unlock();

    manager.play('ambient-knock');
    manager.play('ambient-footsteps');
    manager.play('ambient-whisper');

    expect(context.bufferSources).toHaveLength(3);
    expect(
      context.bufferSources.map((source) => source.buffer?.frameCount),
    ).toEqual([74, 315, 285]);
    expect(manager.getSnapshot().activeCueIds).toEqual([
      'ambient-knock',
      'ambient-footsteps',
      'ambient-whisper',
    ]);
  });

  it('validates volumes and disposes the complete audio graph idempotently', async () => {
    const context = new FakeAudioContext();
    const manager = new AudioManager(
      () => context as unknown as AudioContext,
    );

    expect(() => manager.setCategoryVolume('master', -0.1)).toThrow(
      RangeError,
    );
    expect(() => manager.setCategoryVolume('effects', 1.1)).toThrow(
      RangeError,
    );

    await manager.unlock();
    manager.play('room-ambience');
    await manager.suspend();
    expect(context.state).toBe('suspended');
    await manager.unlock();
    await manager.dispose();
    await manager.dispose();
    expect(context.close).toHaveBeenCalledOnce();
    expect(manager.getSnapshot().contextState).toBe('uninitialized');
  });
});
