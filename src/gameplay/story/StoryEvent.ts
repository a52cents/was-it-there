import type { RunErrorKind } from '../run/RunErrorTracker';

export const STORY_PHASES = [
  'room-intro',
  'observation',
  'blackout',
  'search',
  'room-complete',
] as const;

export type StoryPhase = (typeof STORY_PHASES)[number];
export type StoryEventRepeat =
  | 'once-ever'
  | 'once-per-loop'
  | 'every-match';
export type StoryFlagValue = string | number | boolean;

export type StoryEventTrigger =
  | { readonly type: 'loop-started' }
  | { readonly type: 'room-entered' }
  | {
      readonly type: 'phase-started';
      readonly phase: StoryPhase;
    }
  | {
      readonly type: 'phase-elapsed';
      readonly phase: StoryPhase;
      readonly elapsedMs: number;
    }
  | {
      readonly type: 'object-examined';
      readonly objectId: string;
    }
  | {
      readonly type: 'correct-report';
      readonly targetId?: string;
    }
  | {
      readonly type: 'run-error';
      readonly kind?: RunErrorKind;
    }
  | { readonly type: 'room-completed' }
  | { readonly type: 'loop-failed' }
  | { readonly type: 'chapter-completed' };

export type StorySignal =
  | { readonly type: 'loop-started' }
  | { readonly type: 'room-entered' }
  | {
      readonly type: 'phase-started';
      readonly phase: StoryPhase;
    }
  | {
      readonly type: 'object-examined';
      readonly objectId: string;
    }
  | {
      readonly type: 'correct-report';
      readonly targetId: string;
    }
  | {
      readonly type: 'run-error';
      readonly kind: RunErrorKind;
    }
  | { readonly type: 'room-completed' }
  | { readonly type: 'loop-failed' }
  | { readonly type: 'chapter-completed' };

export interface StoryFlagCondition {
  readonly flagId: string;
  readonly value: StoryFlagValue;
}

export interface StoryConditionSet {
  readonly minimumLoop?: number;
  readonly maximumLoop?: number;
  readonly minimumPressure?: number;
  readonly maximumPressure?: number;
  readonly discoveriesPresent?: readonly string[];
  readonly discoveriesAbsent?: readonly string[];
  readonly fragmentsPresent?: readonly string[];
  readonly fragmentsAbsent?: readonly string[];
  readonly eventsTriggeredThisLoop?: readonly string[];
  readonly flags?: readonly StoryFlagCondition[];
}

export type StoryEffectDefinition =
  | {
      readonly type: 'subtitle';
      readonly copyKey: string;
    }
  | {
      readonly type: 'audio';
      readonly cueId: string;
      readonly action: 'play' | 'stop';
    }
  | {
      readonly type: 'lighting-preset';
      readonly presetId: string;
    }
  | {
      readonly type: 'helper-visibility';
      readonly bindingId: string;
      readonly visible: boolean;
    }
  | {
      readonly type: 'animation';
      readonly bindingId: string;
      readonly animationId: string;
    }
  | {
      readonly type: 'add-discovery';
      readonly discoveryId: string;
    }
  | {
      readonly type: 'add-fragment';
      readonly fragmentId: string;
    }
  | {
      readonly type: 'set-flag';
      readonly flagId: string;
      readonly value: StoryFlagValue;
    }
  | {
      readonly type: 'screen-effect';
      readonly effectId: string;
    }
  | {
      readonly type: 'failure-presentation';
      readonly presentationId: string;
    };

export interface StoryEventDefinition {
  readonly id: string;
  readonly roomId: string;
  readonly trigger: StoryEventTrigger;
  readonly conditions?: StoryConditionSet;
  readonly effects: readonly StoryEffectDefinition[];
  readonly repeat: StoryEventRepeat;
}

export function assertValidStoryEventCatalog(
  events: readonly StoryEventDefinition[],
): void {
  const eventIds = new Set<string>();

  for (const event of events) {
    assertNonEmptyIdentifier(event.id, 'Story event id');
    assertNonEmptyIdentifier(event.roomId, `Story event "${event.id}" room id`);

    if (eventIds.has(event.id)) {
      throw new Error(`Duplicate story event id "${event.id}".`);
    }

    eventIds.add(event.id);

    if (
      event.repeat !== 'once-ever' &&
      event.repeat !== 'once-per-loop' &&
      event.repeat !== 'every-match'
    ) {
      throw new Error(`Story event "${event.id}" has an invalid repeat rule.`);
    }

    if (event.effects.length === 0) {
      throw new Error(`Story event "${event.id}" must contain an effect.`);
    }

    validateTrigger(event);
    validateConditions(event);

    for (const effect of event.effects) {
      validateEffect(event.id, effect);
    }
  }
}

function validateTrigger(event: StoryEventDefinition): void {
  const trigger = event.trigger;

  if (trigger.type === 'phase-elapsed') {
    assertStoryPhase(event.id, trigger.phase);

    if (!Number.isFinite(trigger.elapsedMs) || trigger.elapsedMs < 0) {
      throw new RangeError(
        `Story event "${event.id}" elapsed time must be finite and non-negative.`,
      );
    }
  } else if (trigger.type === 'phase-started') {
    assertStoryPhase(event.id, trigger.phase);
  } else if (trigger.type === 'object-examined') {
    assertNonEmptyIdentifier(
      trigger.objectId,
      `Story event "${event.id}" object id`,
    );
  } else if (
    trigger.type === 'correct-report' &&
    trigger.targetId !== undefined
  ) {
    assertNonEmptyIdentifier(
      trigger.targetId,
      `Story event "${event.id}" report target id`,
    );
  }
}

function assertStoryPhase(eventId: string, phase: StoryPhase): void {
  if (!STORY_PHASES.some((candidate) => candidate === phase)) {
    throw new Error(`Story event "${eventId}" has an invalid story phase.`);
  }
}

function validateConditions(event: StoryEventDefinition): void {
  const conditions = event.conditions;

  if (conditions === undefined) {
    return;
  }

  validateIntegerRange(
    event.id,
    'loop',
    conditions.minimumLoop,
    conditions.maximumLoop,
    1,
  );
  validateIntegerRange(
    event.id,
    'pressure',
    conditions.minimumPressure,
    conditions.maximumPressure,
    0,
    3,
  );

  for (const [label, identifiers] of [
    ['discovery', conditions.discoveriesPresent],
    ['absent discovery', conditions.discoveriesAbsent],
    ['fragment', conditions.fragmentsPresent],
    ['absent fragment', conditions.fragmentsAbsent],
    ['loop event', conditions.eventsTriggeredThisLoop],
  ] as const) {
    for (const identifier of identifiers ?? []) {
      assertNonEmptyIdentifier(
        identifier,
        `Story event "${event.id}" ${label}`,
      );
    }
  }

  for (const flag of conditions.flags ?? []) {
    assertNonEmptyIdentifier(
      flag.flagId,
      `Story event "${event.id}" condition flag id`,
    );
    assertFiniteFlagNumber(event.id, flag.value);
  }
}

function validateEffect(
  eventId: string,
  effect: StoryEffectDefinition,
): void {
  const identifiers: readonly [string, string][] = (() => {
    switch (effect.type) {
      case 'subtitle':
        return [['copy key', effect.copyKey]];
      case 'audio':
        return [['audio cue id', effect.cueId]];
      case 'lighting-preset':
        return [['lighting preset id', effect.presetId]];
      case 'helper-visibility':
        return [['helper binding id', effect.bindingId]];
      case 'animation':
        return [
          ['animation binding id', effect.bindingId],
          ['animation id', effect.animationId],
        ];
      case 'add-discovery':
        return [['discovery id', effect.discoveryId]];
      case 'add-fragment':
        return [['fragment id', effect.fragmentId]];
      case 'set-flag':
        assertFiniteFlagNumber(eventId, effect.value);
        return [['flag id', effect.flagId]];
      case 'screen-effect':
        return [['screen effect id', effect.effectId]];
      case 'failure-presentation':
        return [['failure presentation id', effect.presentationId]];
    }
  })();

  for (const [label, identifier] of identifiers) {
    assertNonEmptyIdentifier(
      identifier,
      `Story event "${eventId}" ${label}`,
    );
  }
}

function validateIntegerRange(
  eventId: string,
  label: string,
  minimum: number | undefined,
  maximum: number | undefined,
  allowedMinimum: number,
  allowedMaximum?: number,
): void {
  for (const [bound, value] of [
    ['minimum', minimum],
    ['maximum', maximum],
  ] as const) {
    if (value === undefined) {
      continue;
    }

    if (
      !Number.isInteger(value) ||
      value < allowedMinimum ||
      (allowedMaximum !== undefined && value > allowedMaximum)
    ) {
      throw new RangeError(
        `Story event "${eventId}" ${label} ${bound} is outside its allowed range.`,
      );
    }
  }

  if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
    throw new RangeError(
      `Story event "${eventId}" ${label} minimum exceeds its maximum.`,
    );
  }
}

function assertFiniteFlagNumber(
  eventId: string,
  value: StoryFlagValue,
): void {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new RangeError(
      `Story event "${eventId}" flag value must be finite.`,
    );
  }
}

function assertNonEmptyIdentifier(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${label} must not be empty.`);
  }
}
