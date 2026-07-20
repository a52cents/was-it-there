import type { GameMode } from '../run/GameMode';
import type {
  StoryInteractionDefinition,
  StoryInteractionRegistry,
} from './StoryInteraction';
import type { StoryProgress } from './StoryProgress';

export class StoryExitGate {
  public constructor(
    private readonly interactions: StoryInteractionRegistry,
    private readonly progress: StoryProgress,
  ) {}

  public getPendingRequirement(
    mode: GameMode,
    roomId: string,
  ): StoryInteractionDefinition | null {
    if (mode !== 'story') {
      return null;
    }

    const requirement = this.interactions.getExitRequirement(roomId);
    const requiredEventId = requirement?.requiredEventIdBeforeExit;
    const requiredAnyEventIds = requirement?.requiredAnyEventIdsBeforeExit;
    const requirementSatisfied = requiredEventId !== undefined
      ? this.progress.wasEventTriggeredThisLoop(requiredEventId)
      : (requiredAnyEventIds ?? []).some((eventId) =>
          this.progress.wasEventTriggeredThisLoop(eventId),
        );

    if (
      requirement === null ||
      (requiredEventId === undefined && requiredAnyEventIds === undefined) ||
      requirementSatisfied
    ) {
      return null;
    }

    const pendingStage = requirement.exitInstructionStages?.find((stage) =>
      stage.untilEventId !== undefined
        ? !this.progress.wasEventTriggeredThisLoop(stage.untilEventId)
        : !(stage.untilAnyEventIds ?? []).some((eventId) =>
            this.progress.wasEventTriggeredThisLoop(eventId),
          ),
    );

    return pendingStage === undefined
      ? requirement
      : { ...requirement, exitInstruction: pendingStage.instruction };
  }
}
