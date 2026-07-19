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

    if (
      requirement === null ||
      requiredEventId === undefined ||
      this.progress.wasEventTriggeredThisLoop(requiredEventId)
    ) {
      return null;
    }

    return requirement;
  }
}
