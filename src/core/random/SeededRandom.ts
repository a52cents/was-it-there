const UINT32_RANGE = 4_294_967_296;

export function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) {
    throw new Error(`Seed must be finite; received ${String(seed)}.`);
  }

  return Math.trunc(seed) >>> 0;
}

export function deriveRoomSeed(
  runSeed: number,
  roomIndex: number,
  roomId: string,
): number {
  if (!Number.isInteger(roomIndex) || roomIndex < 0) {
    throw new Error(`Room index must be a non-negative integer; received ${roomIndex}.`);
  }

  if (roomId.length === 0) {
    throw new Error('Room id must not be empty when deriving a seed.');
  }

  const source = `${normalizeSeed(runSeed)}|${roomIndex}|${roomId}`;
  let hash = 2_166_136_261;

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
}

export class SeededRandom {
  private state: number;

  public constructor(seed: number) {
    this.state = normalizeSeed(seed);
  }

  public nextFloat(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
  }

  public nextInteger(maxExclusive: number): number {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new Error(
        `Random integer upper bound must be a positive integer; received ${maxExclusive}.`,
      );
    }

    return Math.floor(this.nextFloat() * maxExclusive);
  }
}
