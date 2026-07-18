import { describe, expect, it } from 'vitest';
import type { AnomalyPlan } from '../../src/gameplay/anomalies/AnomalyGenerator';
import { describeFirstAnomaly } from '../../src/gameplay/anomalies/AnomalyPresentation';

describe('describeFirstAnomaly', () => {
  it.each([
    ['hide', 'hidden', 'IT DISAPPEARED'],
    ['show', 'appeared', 'IT APPEARED'],
    ['rotate', 'turned-left', 'ITS ORIENTATION CHANGED'],
    ['color', 'case-red', 'ITS COLOR CHANGED'],
  ] as const)('describes a %s anomaly for Game Over', (kind, variantId, copy) => {
    const plan = createPlan('radio', kind, variantId);

    expect(describeFirstAnomaly(plan)).toEqual({
      targetId: 'radio',
      targetLabel: 'RADIO',
      changeLabel: copy,
    });
  });

  it('formats an unknown target id and handles an absent plan', () => {
    expect(
      describeFirstAnomaly(createPlan('alarm-clock', 'color', 'red')),
    ).toMatchObject({ targetLabel: 'ALARM CLOCK' });
    expect(describeFirstAnomaly(null)).toBeNull();
  });

  it('explains when the anomaly restores the original color', () => {
    expect(
      describeFirstAnomaly(
        createPlan('television', 'color', 'restored-base-color'),
      ),
    ).toMatchObject({ changeLabel: 'ITS ORIGINAL COLOR RETURNED' });
  });
});

function createPlan(
  targetId: string,
  kind: AnomalyPlan['anomalies'][number]['kind'],
  variantId: string,
): AnomalyPlan {
  return {
    runSeed: 1,
    roomSeed: 2,
    roomId: 'greybox-bedroom',
    roomIndex: 0,
    difficulty: 1,
    anomalies: [{ targetId, kind, variantId }],
  };
}
