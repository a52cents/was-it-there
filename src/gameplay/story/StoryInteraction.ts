import type { StoryPhase } from './StoryEvent';

export interface StoryInteractionDefinition {
  readonly id: string;
  readonly roomId: string;
  readonly targetId: string;
  readonly actionLabel: string;
  readonly phases: readonly StoryPhase[];
  readonly requiredEventIdBeforeExit?: string;
  readonly exitInstruction?: string;
}

export class StoryInteractionRegistry {
  private readonly interactions = new Map<
    string,
    StoryInteractionDefinition
  >();
  private readonly exitRequirements = new Map<
    string,
    StoryInteractionDefinition
  >();

  public constructor(
    definitions: readonly StoryInteractionDefinition[],
  ) {
    const interactionIds = new Set<string>();

    for (const definition of definitions) {
      assertText(definition.id, 'Story interaction id');
      assertText(definition.roomId, `Story interaction "${definition.id}" room id`);
      assertText(
        definition.targetId,
        `Story interaction "${definition.id}" target id`,
      );
      assertText(
        definition.actionLabel,
        `Story interaction "${definition.id}" action label`,
      );

      if (definition.phases.length === 0) {
        throw new Error(
          `Story interaction "${definition.id}" requires at least one phase.`,
        );
      }

      if (interactionIds.has(definition.id)) {
        throw new Error(`Duplicate story interaction id "${definition.id}".`);
      }

      const bindingKey = createBindingKey(
        definition.roomId,
        definition.targetId,
      );

      if (this.interactions.has(bindingKey)) {
        throw new Error(
          `Duplicate story interaction binding "${bindingKey}".`,
        );
      }

      const hasRequiredEvent =
        definition.requiredEventIdBeforeExit !== undefined;
      const hasExitInstruction = definition.exitInstruction !== undefined;

      if (hasRequiredEvent !== hasExitInstruction) {
        throw new Error(
          `Story interaction "${definition.id}" must define both its exit event and instruction.`,
        );
      }

      if (hasRequiredEvent && hasExitInstruction) {
        assertText(
          definition.requiredEventIdBeforeExit,
          `Story interaction "${definition.id}" exit event id`,
        );
        assertText(
          definition.exitInstruction,
          `Story interaction "${definition.id}" exit instruction`,
        );

        if (this.exitRequirements.has(definition.roomId)) {
          throw new Error(
            `Room "${definition.roomId}" has more than one required exit interaction.`,
          );
        }

        this.exitRequirements.set(definition.roomId, definition);
      }

      interactionIds.add(definition.id);
      this.interactions.set(bindingKey, definition);
    }
  }

  public resolve(
    roomId: string,
    targetId: string,
    phase: StoryPhase,
  ): StoryInteractionDefinition | null {
    const interaction = this.interactions.get(
      createBindingKey(roomId, targetId),
    );

    if (interaction === undefined || !interaction.phases.includes(phase)) {
      return null;
    }

    return interaction;
  }

  public getExitRequirement(
    roomId: string,
  ): StoryInteractionDefinition | null {
    return this.exitRequirements.get(roomId) ?? null;
  }
}

function createBindingKey(roomId: string, targetId: string): string {
  return `${roomId.trim()}::${targetId.trim()}`;
}

function assertText(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${label} must not be empty.`);
  }
}
