import {
  deriveRoomSeed,
  SeededRandom,
} from '../../core/random/SeededRandom';

export type EscapeDifficulty =
  | 'introduction'
  | 'easy'
  | 'moderate'
  | 'hard'
  | 'very-hard'
  | 'final';

export interface EscapeRoomStep {
  readonly roomIndex: number;
  readonly roomNumber: number;
  readonly id: string;
  readonly displayName: string;
  readonly difficulty: EscapeDifficulty;
  readonly difficultyRank: number;
  readonly observationDurationMs: number;
  readonly searchDurationMs: number;
  readonly anomalyCount: {
    readonly min: number;
    readonly max: number;
  };
}

export const ESCAPE_ROUTE = [
  createStep(0, 'greybox-bedroom', 'Bedroom', 'introduction', 1, 10, 30, 1, 1),
  createStep(1, 'bathroom', 'Bathroom', 'easy', 1, 10, 30, 1, 1),
  createStep(2, 'first-corridor', 'Corridor', 'easy', 2, 15, 45, 2, 2),
  createStep(3, 'office', 'Office', 'moderate', 2, 15, 30, 1, 2),
  createStep(4, 'kitchen', 'Kitchen', 'moderate', 3, 13, 28, 2, 2),
  createStep(5, 'dining-room', 'Dining Room', 'moderate', 3, 13, 28, 2, 2),
  createStep(6, 'living-room', 'Living Room', 'hard', 4, 11, 25, 2, 3),
  createStep(7, 'laundry-room', 'Laundry Room', 'hard', 4, 11, 25, 2, 3),
  createStep(8, 'entrance-corridor', 'Entrance Corridor', 'very-hard', 5, 10, 22, 3, 3),
  createStep(9, 'main-hall', 'Main Hall', 'final', 6, 10, 25, 3, 4),
] as const satisfies readonly EscapeRoomStep[];

export class EscapeRouteProgression {
  private activeRoomIndex = 0;

  public get currentStep(): EscapeRoomStep {
    return getEscapeRoomStep(this.activeRoomIndex);
  }

  public get hasNextRoom(): boolean {
    return this.activeRoomIndex < ESCAPE_ROUTE.length - 1;
  }

  public advance(): EscapeRoomStep | null {
    if (!this.hasNextRoom) {
      return null;
    }

    this.activeRoomIndex += 1;
    return this.currentStep;
  }

  public select(roomIndex: number): EscapeRoomStep {
    const step = getEscapeRoomStep(roomIndex);
    this.activeRoomIndex = step.roomIndex;
    return step;
  }

  public reset(): void {
    this.activeRoomIndex = 0;
  }
}

export function getEscapeRoomStep(roomIndex: number): EscapeRoomStep {
  if (!Number.isInteger(roomIndex) || roomIndex < 0) {
    throw new RangeError(
      `Escape room index must be a non-negative integer; received ${roomIndex}.`,
    );
  }

  const step = ESCAPE_ROUTE[roomIndex];

  if (step === undefined) {
    throw new RangeError(
      `Escape room index ${roomIndex} is outside the ${ESCAPE_ROUTE.length}-room route.`,
    );
  }

  return step;
}

export function selectAnomalyCount(
  step: EscapeRoomStep,
  runSeed: number,
): number {
  const range = step.anomalyCount.max - step.anomalyCount.min + 1;

  if (range <= 1) {
    return step.anomalyCount.min;
  }

  const seed = deriveRoomSeed(
    runSeed,
    step.roomIndex,
    `${step.id}:anomaly-count`,
  );
  return step.anomalyCount.min + new SeededRandom(seed).nextInteger(range);
}

function createStep(
  roomIndex: number,
  id: string,
  displayName: string,
  difficulty: EscapeDifficulty,
  difficultyRank: number,
  observationSeconds: number,
  searchSeconds: number,
  anomalyCountMin: number,
  anomalyCountMax: number,
): EscapeRoomStep {
  return {
    roomIndex,
    roomNumber: roomIndex + 1,
    id,
    displayName,
    difficulty,
    difficultyRank,
    observationDurationMs: observationSeconds * 1_000,
    searchDurationMs: searchSeconds * 1_000,
    anomalyCount: {
      min: anomalyCountMin,
      max: anomalyCountMax,
    },
  };
}
