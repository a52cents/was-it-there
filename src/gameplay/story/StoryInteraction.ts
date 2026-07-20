import type { StoryPhase } from './StoryEvent';

export type StoryInteractionPhase = Extract<StoryPhase, 'room-complete'>;

export interface StoryExitInstructionStage {
  readonly untilEventId?: string;
  readonly untilAnyEventIds?: readonly string[];
  readonly instruction: string;
}

export interface StoryInteractionDefinition {
  readonly id: string;
  readonly roomId: string;
  readonly targetId: string;
  readonly actionLabel: string;
  readonly phases: readonly StoryInteractionPhase[];
  readonly requiredEventIdBeforeExit?: string;
  readonly requiredAnyEventIdsBeforeExit?: readonly string[];
  readonly exitInstruction?: string;
  readonly exitInstructionStages?: readonly StoryExitInstructionStage[];
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

      const hasSingleRequiredEvent =
        definition.requiredEventIdBeforeExit !== undefined;
      const hasAnyRequiredEvents =
        definition.requiredAnyEventIdsBeforeExit !== undefined;
      const hasRequiredEvent = hasSingleRequiredEvent || hasAnyRequiredEvents;
      const hasExitInstruction = definition.exitInstruction !== undefined;

      if (hasRequiredEvent !== hasExitInstruction) {
        throw new Error(
          `Story interaction "${definition.id}" must define both its exit event and instruction.`,
        );
      }

      if (hasRequiredEvent && hasExitInstruction) {
        if (hasSingleRequiredEvent === hasAnyRequiredEvents) {
          throw new Error(
            `Story interaction "${definition.id}" must define one exit requirement form.`,
          );
        }
        if (definition.requiredEventIdBeforeExit !== undefined) {
          assertText(definition.requiredEventIdBeforeExit, `Story interaction "${definition.id}" exit event id`);
        }
        if (definition.requiredAnyEventIdsBeforeExit !== undefined) {
          if (definition.requiredAnyEventIdsBeforeExit.length === 0) {
            throw new Error(`Story interaction "${definition.id}" requires at least one alternative exit event.`);
          }
          definition.requiredAnyEventIdsBeforeExit.forEach((eventId) =>
            assertText(eventId, `Story interaction "${definition.id}" alternative exit event id`),
          );
        }
        assertText(
          definition.exitInstruction,
          `Story interaction "${definition.id}" exit instruction`,
        );

        if (this.exitRequirements.has(definition.roomId)) {
          throw new Error(
            `Room "${definition.roomId}" has more than one required exit interaction.`,
          );
        }

        for (const [index, stage] of (
          definition.exitInstructionStages ?? []
        ).entries()) {
          const hasStageEvent = stage.untilEventId !== undefined;
          const hasStageAlternatives = stage.untilAnyEventIds !== undefined;
          if (hasStageEvent === hasStageAlternatives) {
            throw new Error(`Story interaction "${definition.id}" exit stage ${index + 1} must define one event requirement.`);
          }
          if (stage.untilEventId !== undefined) {
            assertText(stage.untilEventId, `Story interaction "${definition.id}" exit stage ${index + 1} event id`);
          }
          if (stage.untilAnyEventIds !== undefined) {
            if (stage.untilAnyEventIds.length === 0) {
              throw new Error(`Story interaction "${definition.id}" exit stage ${index + 1} has no alternative event.`);
            }
            stage.untilAnyEventIds.forEach((eventId) => assertText(eventId, `Story interaction "${definition.id}" exit stage ${index + 1} alternative event id`));
          }
          assertText(
            stage.instruction,
            `Story interaction "${definition.id}" exit stage ${index + 1} instruction`,
          );
        }

        this.exitRequirements.set(definition.roomId, definition);
      } else if ((definition.exitInstructionStages?.length ?? 0) > 0) {
        throw new Error(
          `Story interaction "${definition.id}" cannot define exit stages without an exit requirement.`,
        );
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

    if (
      interaction === undefined ||
      phase !== 'room-complete' ||
      !interaction.phases.includes(phase)
    ) {
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
