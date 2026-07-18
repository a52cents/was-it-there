import { describe, expect, it } from 'vitest';
import type { AnomalyPlan } from '../../src/gameplay/anomalies/AnomalyGenerator';
import { RoomReportSystem } from '../../src/gameplay/interaction/RoomReportSystem';

function createPlan(...targetIds: readonly string[]): AnomalyPlan {
  return {
    runSeed: 42,
    roomSeed: 84,
    roomId: 'greybox-bedroom',
    roomIndex: 0,
    difficulty: 1,
    anomalies: targetIds.map((targetId) => ({
      targetId,
      kind: 'hide',
      variantId: `${targetId}-hidden`,
    })),
  };
}

describe('RoomReportSystem', () => {
  it('counts each active anomaly once and completes after the last one', () => {
    const reports = new RoomReportSystem();
    reports.startRound(createPlan('chair', 'picture'));

    expect(reports.report('chair')).toMatchObject({
      outcome: 'correct',
      remainingCount: 1,
      incorrectCount: 0,
      roomComplete: false,
    });
    expect(reports.isTargetSelectable('chair')).toBe(false);
    expect(reports.report('chair')).toMatchObject({
      outcome: 'already-found',
      remainingCount: 1,
      incorrectCount: 0,
      roomComplete: false,
    });
    expect(reports.report('picture')).toMatchObject({
      outcome: 'correct',
      remainingCount: 0,
      incorrectCount: 0,
      roomComplete: true,
    });
    expect(reports.getSnapshot().foundTargetIds).toEqual([
      'chair',
      'picture',
    ]);
  });

  it('counts a non-anomalous target as incorrect but ignores empty space', () => {
    const reports = new RoomReportSystem();
    reports.startRound(createPlan('television'));

    expect(reports.report(null)).toMatchObject({
      outcome: 'no-target',
      incorrectCount: 0,
      remainingCount: 1,
    });
    expect(reports.report('lamp')).toMatchObject({
      outcome: 'incorrect',
      incorrectCount: 1,
      remainingCount: 1,
      roomComplete: false,
    });
  });

  it('resets all report state when a new round starts', () => {
    const reports = new RoomReportSystem();
    reports.startRound(createPlan('chair'));
    reports.report('lamp');
    reports.report('chair');

    reports.startRound(createPlan('books'));

    expect(reports.getSnapshot()).toMatchObject({
      roundActive: true,
      activeTargetIds: ['books'],
      foundTargetIds: [],
      remainingCount: 1,
      incorrectCount: 0,
      lastResult: null,
    });
    expect(reports.isTargetSelectable('chair')).toBe(true);
  });

  it('rejects reporting before a round and duplicate plan targets', () => {
    const reports = new RoomReportSystem();

    expect(() => reports.report('chair')).toThrow(/before a reporting round/u);
    expect(() => reports.startRound(createPlan('chair', 'chair'))).toThrow(
      /appears more than once/u,
    );
  });
});
