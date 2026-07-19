import { describe, expect, it } from 'vitest';
import {
  ESCAPE_ROUTE,
  EscapeRouteProgression,
  getEscapeRoomStep,
  selectAnomalyCount,
} from '../../src/gameplay/progression/EscapeRoute';

describe('EscapeRoute', () => {
  it('defines the ten rooms in their canonical house order', () => {
    expect(ESCAPE_ROUTE).toHaveLength(10);
    expect(ESCAPE_ROUTE.map((step) => step.id)).toEqual([
      'greybox-bedroom',
      'bathroom',
      'first-corridor',
      'office',
      'kitchen',
      'dining-room',
      'living-room',
      'laundry-room',
      'entrance-corridor',
      'main-hall',
    ]);

    for (const [index, step] of ESCAPE_ROUTE.entries()) {
      expect(step.roomIndex).toBe(index);
      expect(step.roomNumber).toBe(index + 1);
      expect(step.anomalyCount.min).toBeLessThanOrEqual(
        step.anomalyCount.max,
      );
    }
  });

  it('matches the data-driven difficulty table from the game design', () => {
    expect(
      ESCAPE_ROUTE.map((step) => ({
        observation: step.observationDurationMs,
        search: step.searchDurationMs,
        anomalies: step.anomalyCount,
      })),
    ).toEqual([
      { observation: 10_000, search: 30_000, anomalies: { min: 1, max: 1 } },
      { observation: 10_000, search: 30_000, anomalies: { min: 1, max: 1 } },
      { observation: 15_000, search: 45_000, anomalies: { min: 2, max: 2 } },
      { observation: 15_000, search: 30_000, anomalies: { min: 1, max: 2 } },
      { observation: 13_000, search: 28_000, anomalies: { min: 2, max: 2 } },
      { observation: 13_000, search: 28_000, anomalies: { min: 2, max: 2 } },
      { observation: 11_000, search: 25_000, anomalies: { min: 2, max: 3 } },
      { observation: 11_000, search: 25_000, anomalies: { min: 2, max: 3 } },
      { observation: 10_000, search: 22_000, anomalies: { min: 3, max: 3 } },
      { observation: 10_000, search: 25_000, anomalies: { min: 3, max: 4 } },
    ]);
  });

  it('advances without wrapping past the final room and resets cleanly', () => {
    const progression = new EscapeRouteProgression();
    expect(progression.currentStep.roomNumber).toBe(1);

    for (let roomNumber = 2; roomNumber <= 10; roomNumber += 1) {
      expect(progression.hasNextRoom).toBe(true);
      expect(progression.advance()?.roomNumber).toBe(roomNumber);
    }

    expect(progression.hasNextRoom).toBe(false);
    expect(progression.advance()).toBeNull();
    expect(progression.currentStep.roomNumber).toBe(10);
    progression.reset();
    expect(progression.currentStep.roomNumber).toBe(1);
  });

  it('selects variable anomaly counts deterministically', () => {
    const step = getEscapeRoomStep(9);
    const first = selectAnomalyCount(step, 123_456);
    expect(selectAnomalyCount(step, 123_456)).toBe(first);
    expect(first).toBeGreaterThanOrEqual(3);
    expect(first).toBeLessThanOrEqual(4);

    const reachedCounts = new Set<number>();

    for (let seed = 0; seed < 100; seed += 1) {
      reachedCounts.add(selectAnomalyCount(step, seed));
    }

    expect(reachedCounts).toEqual(new Set([3, 4]));
    expect(selectAnomalyCount(getEscapeRoomStep(0), 999)).toBe(1);
  });

  it('rejects invalid room indices explicitly', () => {
    expect(() => getEscapeRoomStep(-1)).toThrow('non-negative integer');
    expect(() => getEscapeRoomStep(1.5)).toThrow('non-negative integer');
    expect(() => getEscapeRoomStep(10)).toThrow('outside the 10-room route');
  });
});
