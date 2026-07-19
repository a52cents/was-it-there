import { normalizeSeed } from '../../core/random/SeededRandom';
import type { GameMode } from './GameMode';

export interface RunIdentity {
  readonly seed: number;
  readonly startedAt: number;
  readonly mode: GameMode;
}

export interface CreateRunIdentityOptions {
  readonly mode?: GameMode;
  readonly seed?: number;
  readonly startedAt?: number;
}

export function createRunIdentity(
  options: CreateRunIdentityOptions = {},
): RunIdentity {
  const seed = options.seed ?? createEntropySeed();
  const startedAt = options.startedAt ?? Date.now();

  if (!Number.isFinite(startedAt)) {
    throw new Error(`Run start time must be finite; received ${startedAt}.`);
  }

  return {
    seed: normalizeSeed(seed),
    startedAt: Math.trunc(startedAt),
    mode: options.mode ?? 'escape',
  };
}

function createEntropySeed(): number {
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    const seed = values[0];

    if (seed !== undefined) {
      return seed;
    }
  }

  const time = Date.now() >>> 0;
  const monotonic = Math.trunc(globalThis.performance?.now() ?? 0) >>> 0;
  return (time ^ Math.imul(monotonic, 2_654_435_761)) >>> 0;
}
