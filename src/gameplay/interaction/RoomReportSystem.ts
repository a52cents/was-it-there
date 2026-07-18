import type { AnomalyPlan } from '../anomalies/AnomalyGenerator';

export type ReportOutcome =
  | 'correct'
  | 'incorrect'
  | 'already-found'
  | 'no-target';

export interface ReportResult {
  readonly outcome: ReportOutcome;
  readonly targetId: string | null;
  readonly remainingCount: number;
  readonly incorrectCount: number;
  readonly roomComplete: boolean;
}

export interface RoomReportSnapshot {
  readonly roundActive: boolean;
  readonly activeTargetIds: readonly string[];
  readonly foundTargetIds: readonly string[];
  readonly remainingCount: number;
  readonly incorrectCount: number;
  readonly lastResult: ReportResult | null;
}

export class RoomReportSystem {
  private readonly activeTargetIds = new Set<string>();
  private readonly foundTargetIds = new Set<string>();
  private incorrectCount = 0;
  private lastResult: ReportResult | null = null;
  private roundActive = false;

  public startRound(plan: AnomalyPlan): void {
    this.reset();

    for (const anomaly of plan.anomalies) {
      if (this.activeTargetIds.has(anomaly.targetId)) {
        throw new Error(
          `Cannot start reporting for room "${plan.roomId}": target "${anomaly.targetId}" appears more than once.`,
        );
      }

      this.activeTargetIds.add(anomaly.targetId);
    }

    this.roundActive = true;
  }

  public report(targetId: string | null): ReportResult {
    if (!this.roundActive) {
      throw new Error('Cannot report an anomaly before a reporting round starts.');
    }

    let outcome: ReportOutcome;

    if (targetId === null) {
      outcome = 'no-target';
    } else if (this.foundTargetIds.has(targetId)) {
      outcome = 'already-found';
    } else if (this.activeTargetIds.has(targetId)) {
      this.foundTargetIds.add(targetId);
      outcome = 'correct';
    } else {
      this.incorrectCount += 1;
      outcome = 'incorrect';
    }

    const result: ReportResult = {
      outcome,
      targetId,
      remainingCount: this.getRemainingCount(),
      incorrectCount: this.incorrectCount,
      roomComplete: this.getRemainingCount() === 0,
    };
    this.lastResult = result;
    return result;
  }

  public isTargetSelectable(targetId: string): boolean {
    return this.roundActive && !this.foundTargetIds.has(targetId);
  }

  public getSnapshot(): RoomReportSnapshot {
    return {
      roundActive: this.roundActive,
      activeTargetIds: [...this.activeTargetIds],
      foundTargetIds: [...this.foundTargetIds],
      remainingCount: this.getRemainingCount(),
      incorrectCount: this.incorrectCount,
      lastResult: this.lastResult,
    };
  }

  public reset(): void {
    this.activeTargetIds.clear();
    this.foundTargetIds.clear();
    this.incorrectCount = 0;
    this.lastResult = null;
    this.roundActive = false;
  }

  private getRemainingCount(): number {
    return this.activeTargetIds.size - this.foundTargetIds.size;
  }
}
