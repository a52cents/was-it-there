import type { GameState } from '../app/GameStateMachine';
import type { RunTimerSnapshot } from '../app/RunTimer';
import type { AudioManagerSnapshot } from '../audio/AudioManager';
import type { AnomalyPlan } from '../gameplay/anomalies/AnomalyGenerator';
import type { BlackoutSnapshot } from '../gameplay/anomalies/BlackoutTimeline';
import type { RoomBaselineSnapshot } from '../gameplay/anomalies/RoomAnomalySystem';
import type { RoomReportSnapshot } from '../gameplay/interaction/RoomReportSystem';
import type { ExitDoorSnapshot } from '../gameplay/progression/ExitDoorController';
import type { RunErrorSnapshot } from '../gameplay/run/RunErrorTracker';
import type { RunIdentity } from '../gameplay/run/RunIdentity';

export interface DebugVector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface DebugSnapshot {
  readonly app: {
    readonly gameState: GameState;
    readonly gameActive: boolean;
    readonly pointerLocked: boolean;
  };
  readonly audio: AudioManagerSnapshot;
  readonly room: {
    readonly id: string;
    readonly visualObjectCount: number;
    readonly collisionObjectCount: number;
    readonly observationTargetCount: number;
    readonly exitDoorFound: boolean;
  };
  readonly interaction: {
    readonly aimedTargetId: string | null;
    readonly lastSelectedTargetId: string | null;
  };
  readonly reporting: RoomReportSnapshot;
  readonly errors: RunErrorSnapshot;
  readonly progression: {
    readonly exitDoor: ExitDoorSnapshot;
  };
  readonly anomaly: {
    readonly runIdentity: RunIdentity | null;
    readonly pendingPlan: AnomalyPlan | null;
    readonly activePlan: AnomalyPlan | null;
    readonly baseline: RoomBaselineSnapshot | null;
    readonly blackout: BlackoutSnapshot;
    readonly appliedDuringBlackout: boolean;
    readonly error: string | null;
  };
  readonly player: {
    readonly position: DebugVector3;
    readonly yaw: number;
    readonly pitch: number;
    readonly horizontalSpeed: number;
    readonly verticalVelocity: number;
    readonly grounded: boolean;
  };
  readonly capsule: {
    readonly radius: number;
    readonly start: DebugVector3;
    readonly end: DebugVector3;
  };
  readonly physics: {
    readonly fixedSteps: number;
    readonly worldColliderReady: boolean;
  };
  readonly rendering: {
    readonly fps: number;
    readonly frameDeltaSeconds: number;
    readonly drawCalls: number;
    readonly triangles: number;
  };
  readonly timing: RunTimerSnapshot;
}
