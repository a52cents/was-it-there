export type HousePressureLevel = 0 | 1 | 2 | 3;

export interface HousePressureSnapshot {
  readonly pressureLevel: HousePressureLevel;
  readonly lightMultiplier: number;
  readonly coldShift: number;
  readonly calmIntensity: number;
  readonly vignetteOpacity: number;
  readonly failureProgress: number;
  readonly failureComplete: boolean;
}

export const HOUSE_CALM_DURATION_MS = 720;
export const HOUSE_FAILURE_DURATION_MS = 3_200;

const PRESSURE_LIGHT_MULTIPLIERS = [1, 0.91, 0.8, 0.72] as const;
const PRESSURE_COLD_SHIFTS = [0, 0.1, 0.25, 0.4] as const;
const PRESSURE_VIGNETTE_OPACITIES = [0, 0.12, 0.25, 0.36] as const;

export class HousePressureSystem {
  private pressureLevel: HousePressureLevel = 0;
  private calmElapsedMs = HOUSE_CALM_DURATION_MS;
  private failureElapsedMs = 0;
  private failureActive = false;
  private paused = false;

  public setPressureLevel(level: number): HousePressureSnapshot {
    this.pressureLevel = normalizePressureLevel(level);
    return this.getSnapshot();
  }

  public registerCorrectReport(): HousePressureSnapshot {
    if (!this.failureActive) {
      this.calmElapsedMs = 0;
    }

    return this.getSnapshot();
  }

  public beginFailure(): HousePressureSnapshot {
    this.pressureLevel = 3;
    this.calmElapsedMs = HOUSE_CALM_DURATION_MS;
    this.failureElapsedMs = 0;
    this.failureActive = true;
    return this.getSnapshot();
  }

  public update(deltaMs: number): HousePressureSnapshot {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) {
      throw new RangeError(
        'House pressure delta must be finite and non-negative.',
      );
    }

    if (this.paused) {
      return this.getSnapshot();
    }

    this.calmElapsedMs = Math.min(
      HOUSE_CALM_DURATION_MS,
      this.calmElapsedMs + deltaMs,
    );

    if (this.failureActive) {
      this.failureElapsedMs = Math.min(
        HOUSE_FAILURE_DURATION_MS,
        this.failureElapsedMs + deltaMs,
      );
    }

    return this.getSnapshot();
  }

  public pause(): void {
    this.paused = true;
  }

  public resume(): void {
    this.paused = false;
  }

  public reset(): HousePressureSnapshot {
    this.pressureLevel = 0;
    this.calmElapsedMs = HOUSE_CALM_DURATION_MS;
    this.failureElapsedMs = 0;
    this.failureActive = false;
    this.paused = false;
    return this.getSnapshot();
  }

  public getSnapshot(): HousePressureSnapshot {
    const failureProgress = this.failureActive
      ? this.failureElapsedMs / HOUSE_FAILURE_DURATION_MS
      : 0;
    const takeoverStrength = failureProgress * failureProgress;
    const calmIntensity = this.failureActive
      ? 0
      : 1 - this.calmElapsedMs / HOUSE_CALM_DURATION_MS;
    const baseLightMultiplier =
      PRESSURE_LIGHT_MULTIPLIERS[this.pressureLevel];
    const baseColdShift = PRESSURE_COLD_SHIFTS[this.pressureLevel];
    const baseVignetteOpacity =
      PRESSURE_VIGNETTE_OPACITIES[this.pressureLevel];

    return {
      pressureLevel: this.pressureLevel,
      lightMultiplier: Math.max(
        0.025,
        (baseLightMultiplier + calmIntensity * 0.08) *
          (1 - takeoverStrength * 0.965),
      ),
      coldShift: Math.min(
        0.72,
        baseColdShift + takeoverStrength * 0.32,
      ),
      calmIntensity,
      vignetteOpacity: Math.min(
        0.92,
        baseVignetteOpacity + takeoverStrength * 0.56,
      ),
      failureProgress,
      failureComplete:
        this.failureActive &&
        this.failureElapsedMs >= HOUSE_FAILURE_DURATION_MS,
    };
  }
}

function normalizePressureLevel(level: number): HousePressureLevel {
  if (!Number.isFinite(level)) {
    throw new RangeError('House pressure level must be finite.');
  }

  return Math.min(3, Math.max(0, Math.trunc(level))) as HousePressureLevel;
}
