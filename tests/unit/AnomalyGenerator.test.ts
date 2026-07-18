import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateAnomalyPlan } from '../../src/gameplay/anomalies/AnomalyGenerator';
import { GreyboxBedroom } from '../../src/world/rooms/GreyboxBedroom';
import { WorldCollision } from '../../src/world/WorldCollision';

describe('generateAnomalyPlan', () => {
  let room: GreyboxBedroom;

  beforeEach(() => {
    room = new GreyboxBedroom();
    room.mount({
      scene: new THREE.Scene(),
      worldCollision: new WorldCollision(),
    });
  });

  afterEach(() => {
    room.unmount();
    vi.restoreAllMocks();
  });

  function generate(runSeed: number, count = 1) {
    return generateAnomalyPlan({
      runSeed,
      roomIndex: 0,
      roomId: room.definition.id,
      difficulty: 1,
      count,
      targets: room.getAnomalyTargets(),
    });
  }

  it('returns the exact same ordered plan for the same seed', () => {
    expect(generate(42, 3)).toEqual(generate(42, 3));
    expect(generate(42, 3).roomSeed).toBe(generate(42, 3).roomSeed);
  });

  it('uses only the seeded generator and never Math.random', () => {
    vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('Math.random must not be used.');
    });

    expect(generate(9_001, 3).anomalies).toHaveLength(3);
  });

  it('never selects the same target twice in one plan', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const plan = generate(seed, 6);
      const targetIds = plan.anomalies.map((anomaly) => anomaly.targetId);

      expect(new Set(targetIds).size).toBe(targetIds.length);
    }
  });

  it('selects only prepared variants allowed by their target', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      for (const anomaly of generate(seed, 3).anomalies) {
        const target = room
          .getAnomalyTargetRegistry()
          .getById(anomaly.targetId);
        const variant = target?.variants.find(
          (candidate) => candidate.id === anomaly.variantId,
        );

        expect(target).not.toBeNull();
        expect(variant?.kind).toBe(anomaly.kind);
        expect(target?.allowedKinds).toContain(anomaly.kind);
      }
    }
  });

  it('can deterministically reach every currently applicable anomaly kind', () => {
    const kinds = new Set<string>();

    for (let seed = 0; seed < 2_000 && kinds.size < 3; seed += 1) {
      kinds.add(generate(seed).anomalies[0]?.kind ?? '');
    }

    expect(kinds).toEqual(new Set(['hide', 'rotate', 'color']));
  });

  it('rejects an unreachable requested anomaly count explicitly', () => {
    expect(() => generate(123, 7)).toThrow(
      'cannot generate 7 anomalies from 6 eligible targets',
    );
  });
});
