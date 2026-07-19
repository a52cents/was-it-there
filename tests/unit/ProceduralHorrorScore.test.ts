import { describe, expect, it } from 'vitest';
import {
  createProceduralHorrorScore,
  PROCEDURAL_HORROR_SCORE_DURATION_SECONDS,
} from '../../src/audio/ProceduralHorrorScore';

class TestAudioBuffer {
  private readonly channels: readonly Float32Array[];

  public constructor(
    public readonly numberOfChannels: number,
    public readonly length: number,
    public readonly sampleRate: number,
  ) {
    this.channels = Array.from(
      { length: numberOfChannels },
      () => new Float32Array(length),
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

class TestAudioContext {
  public readonly sampleRate = 400;

  public createBuffer(
    numberOfChannels: number,
    length: number,
    sampleRate: number,
  ): AudioBuffer {
    return new TestAudioBuffer(
      numberOfChannels,
      length,
      sampleRate,
    ) as unknown as AudioBuffer;
  }
}

describe('createProceduralHorrorScore', () => {
  it('renders a deterministic, evolving stereo score with a safe peak', () => {
    const context = new TestAudioContext();
    const first = createProceduralHorrorScore(context);
    const second = createProceduralHorrorScore(context);
    const left = first.getChannelData(0);
    const right = first.getChannelData(1);

    expect(first.numberOfChannels).toBe(2);
    expect(first.length).toBe(
      context.sampleRate * PROCEDURAL_HORROR_SCORE_DURATION_SECONDS,
    );
    expect(left).toEqual(second.getChannelData(0));
    expect(right).toEqual(second.getChannelData(1));
    expect(left).not.toEqual(right);

    let peak = 0;

    for (let frame = 0; frame < left.length; frame += 1) {
      peak = Math.max(
        peak,
        Math.abs(left[frame] ?? 0),
        Math.abs(right[frame] ?? 0),
      );
    }

    expect(peak).toBeGreaterThan(0.75);
    expect(peak).toBeLessThanOrEqual(0.821);

    const movementEnergy = [0, 21, 42, 63].map((startsAt) => {
      const startFrame = startsAt * context.sampleRate;
      const endFrame = (startsAt + 21) * context.sampleRate;
      let energy = 0;

      for (let frame = startFrame; frame < endFrame; frame += 1) {
        energy += Math.abs(left[frame] ?? 0) + Math.abs(right[frame] ?? 0);
      }

      return energy;
    });

    expect(movementEnergy.every((energy) => energy > 20)).toBe(true);
    expect(new Set(movementEnergy.map((energy) => energy.toFixed(1))).size).toBe(4);
  });
});
