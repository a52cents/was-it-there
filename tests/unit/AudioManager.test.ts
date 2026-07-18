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
  private readonly samples: Float32Array;

  public readonly frameCount: number;

  public constructor(frameCount: number) {
    this.frameCount = frameCount;
    this.samples = new Float32Array(frameCount);
  }

  public getChannelData(_channel: number): Float32Array {
    return this.samples;
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
    _channels: number,
    frameCount: number,
    _sampleRate: number,
  ): FakeAudioBuffer {
    return new FakeAudioBuffer(frameCount);
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

  it('keeps one deterministic ambience loop and stops all of its sources', async () => {
    const context = new FakeAudioContext();
    const manager = new AudioManager(
      () => context as unknown as AudioContext,
    );
    await manager.unlock();

    manager.play('room-ambience');
    manager.play('room-ambience');

    expect(context.bufferSources).toHaveLength(2);
    expect(context.bufferSources.every((source) => source.loop)).toBe(true);
    expect(
      context.bufferSources.map((source) => source.buffer?.frameCount),
    ).toEqual([200, 1_800]);
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

  it('routes transient cues, preserves ambience while muted, and updates mixer volumes', async () => {
    const context = new FakeAudioContext();
    const manager = new AudioManager(
      () => context as unknown as AudioContext,
    );
    await manager.unlock();
    manager.play('room-ambience');
    manager.play('blackout-cue');
    manager.play('lights-return');
    manager.play('report-correct');
    manager.play('report-incorrect');
    manager.play('door-unlock');
    manager.play('door-open');

    expect(manager.getSnapshot().activeCueIds).toEqual([
      'room-ambience',
      'blackout-cue',
      'lights-return',
      'report-correct',
      'report-incorrect',
      'door-unlock',
      'door-open',
    ]);

    manager.setCategoryVolume('ambience', 0.25);
    expect(context.gains[2]?.gain.value).toBe(0.25);
    manager.setMuted(true);
    expect(context.gains[0]?.gain.value).toBe(0);
    expect(manager.getSnapshot().activeCueIds).toContain('room-ambience');
    manager.setMuted(false);
    expect(context.gains[0]?.gain.value).toBe(1);
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
