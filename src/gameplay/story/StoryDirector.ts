import type { GameMode } from '../run/GameMode';
import {
  assertValidStoryEventCatalog,
  type StoryConditionSet,
  type StoryEffectDefinition,
  type StoryEventDefinition,
  type StoryPhase,
  type StorySignal,
} from './StoryEvent';
import { StoryProgress } from './StoryProgress';

export interface StoryEventContext {
  readonly roomId: string;
  readonly loopNumber: number;
  readonly pressureLevel: number;
  readonly phase: StoryPhase | null;
  readonly phaseElapsedMs: number;
}

export interface StoryEffectExecution {
  readonly eventId: string;
  readonly effect: StoryEffectDefinition;
  readonly context: StoryEventContext;
}

export interface StoryDirectorOptions {
  readonly onEffect?: (execution: StoryEffectExecution) => void;
  readonly onEventTriggered?: (
    event: StoryEventDefinition,
    context: StoryEventContext,
  ) => void;
  readonly onRoomExited?: (roomId: string) => void;
}

export interface StoryDirectorSnapshot {
  readonly active: boolean;
  readonly paused: boolean;
  readonly roomId: string | null;
  readonly phase: StoryPhase | null;
  readonly phaseElapsedMs: number;
  readonly pressureLevel: number;
  readonly loopNumber: number;
}

export class StoryDirector {
  private readonly eventsByRoom = new Map<
    string,
    readonly StoryEventDefinition[]
  >();
  private active = false;
  private paused = false;
  private roomId: string | null = null;
  private phase: StoryPhase | null = null;
  private phaseElapsedMs = 0;
  private pressureLevel = 0;
  private readonly elapsedEventsTriggeredForPhase = new Set<string>();

  public constructor(
    events: readonly StoryEventDefinition[],
    private readonly progress: StoryProgress,
    private readonly options: StoryDirectorOptions = {},
  ) {
    assertValidStoryEventCatalog(events);

    for (const event of events) {
      const roomEvents = this.eventsByRoom.get(event.roomId) ?? [];
      this.eventsByRoom.set(event.roomId, [...roomEvents, event]);
    }
  }

  public beginLoop(mode: GameMode, initialRoomId: string): boolean {
    this.stop();

    if (mode !== 'story') {
      return false;
    }

    this.active = true;
    this.roomId = assertRoomId(initialRoomId);
    this.progress.beginLoop();
    this.emit({ type: 'loop-started' });
    this.emit({ type: 'room-entered' });
    return true;
  }

  public enterRoom(roomId: string): boolean {
    if (!this.active) {
      return false;
    }

    this.exitActiveRoom();
    this.roomId = assertRoomId(roomId);
    this.phase = null;
    this.phaseElapsedMs = 0;
    this.elapsedEventsTriggeredForPhase.clear();
    this.emit({ type: 'room-entered' });
    return true;
  }

  public leaveRoom(): boolean {
    if (!this.active || this.roomId === null) {
      return false;
    }

    this.exitActiveRoom();
    return true;
  }

  public startPhase(phase: StoryPhase): boolean {
    if (!this.active || this.roomId === null) {
      return false;
    }

    this.phase = phase;
    this.phaseElapsedMs = 0;
    this.elapsedEventsTriggeredForPhase.clear();
    this.emit({ type: 'phase-started', phase });
    this.triggerElapsedEvents();
    return true;
  }

  public emit(signal: StorySignal): number {
    if (!this.active || this.roomId === null) {
      return 0;
    }

    let triggeredCount = 0;

    for (const event of this.eventsByRoom.get(this.roomId) ?? []) {
      if (
        event.trigger.type !== 'phase-elapsed' &&
        triggerMatchesSignal(event, signal) &&
        this.tryTriggerEvent(event)
      ) {
        triggeredCount += 1;
      }
    }

    return triggeredCount;
  }

  public update(deltaMs: number): number {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) {
      throw new RangeError(
        'Story Director delta must be finite and non-negative.',
      );
    }

    if (!this.active || this.paused || this.phase === null) {
      return 0;
    }

    this.phaseElapsedMs += deltaMs;
    return this.triggerElapsedEvents();
  }

  public setPressureLevel(pressureLevel: number): void {
    if (
      !Number.isInteger(pressureLevel) ||
      pressureLevel < 0 ||
      pressureLevel > 3
    ) {
      throw new RangeError(
        'Story pressure level must be an integer between zero and three.',
      );
    }

    this.pressureLevel = pressureLevel;
  }

  public pause(): boolean {
    if (!this.active || this.paused) {
      return false;
    }

    this.paused = true;
    return true;
  }

  public resume(): boolean {
    if (!this.active || !this.paused) {
      return false;
    }

    this.paused = false;
    return true;
  }

  public stop(): void {
    this.exitActiveRoom();
    this.active = false;
    this.paused = false;
    this.phase = null;
    this.phaseElapsedMs = 0;
    this.pressureLevel = 0;
    this.elapsedEventsTriggeredForPhase.clear();
  }

  public getSnapshot(): StoryDirectorSnapshot {
    return {
      active: this.active,
      paused: this.paused,
      roomId: this.roomId,
      phase: this.phase,
      phaseElapsedMs: Math.floor(this.phaseElapsedMs),
      pressureLevel: this.pressureLevel,
      loopNumber: this.progress.getSnapshot().loopNumber,
    };
  }

  private triggerElapsedEvents(): number {
    const roomId = this.roomId;
    const phase = this.phase;

    if (roomId === null || phase === null) {
      return 0;
    }

    const candidates = (this.eventsByRoom.get(roomId) ?? [])
      .filter(
        (event) =>
          event.trigger.type === 'phase-elapsed' &&
          event.trigger.phase === phase &&
          event.trigger.elapsedMs <= this.phaseElapsedMs &&
          !this.elapsedEventsTriggeredForPhase.has(event.id),
      )
      .sort((left, right) => {
        if (
          left.trigger.type !== 'phase-elapsed' ||
          right.trigger.type !== 'phase-elapsed'
        ) {
          return 0;
        }

        return left.trigger.elapsedMs - right.trigger.elapsedMs;
      });
    let triggeredCount = 0;

    for (const event of candidates) {
      if (this.tryTriggerEvent(event)) {
        this.elapsedEventsTriggeredForPhase.add(event.id);
        triggeredCount += 1;
      }
    }

    return triggeredCount;
  }

  private tryTriggerEvent(event: StoryEventDefinition): boolean {
    if (!this.canRepeat(event) || !this.conditionsMatch(event.conditions)) {
      return false;
    }

    this.progress.markEventTriggered(event.id);

    for (const effect of event.effects) {
      this.applyProgressEffect(effect);
      this.options.onEffect?.({
        eventId: event.id,
        effect,
        context: this.createContext(),
      });
    }

    this.options.onEventTriggered?.(event, this.createContext());
    return true;
  }

  private canRepeat(event: StoryEventDefinition): boolean {
    if (event.repeat === 'once-ever') {
      return !this.progress.wasEventTriggered(event.id);
    }

    if (event.repeat === 'once-per-loop') {
      return !this.progress.wasEventTriggeredThisLoop(event.id);
    }

    return true;
  }

  private conditionsMatch(conditions: StoryConditionSet | undefined): boolean {
    if (conditions === undefined) {
      return true;
    }

    const loopNumber = this.progress.getSnapshot().loopNumber;

    if (
      conditions.minimumLoop !== undefined &&
      loopNumber < conditions.minimumLoop
    ) {
      return false;
    }

    if (
      conditions.maximumLoop !== undefined &&
      loopNumber > conditions.maximumLoop
    ) {
      return false;
    }

    if (
      conditions.minimumPressure !== undefined &&
      this.pressureLevel < conditions.minimumPressure
    ) {
      return false;
    }

    if (
      conditions.maximumPressure !== undefined &&
      this.pressureLevel > conditions.maximumPressure
    ) {
      return false;
    }

    if (
      !(conditions.discoveriesPresent ?? []).every((id) =>
        this.progress.hasDiscovery(id),
      ) ||
      !(conditions.discoveriesAbsent ?? []).every(
        (id) => !this.progress.hasDiscovery(id),
      ) ||
      !(conditions.fragmentsPresent ?? []).every((id) =>
        this.progress.hasFragment(id),
      ) ||
      !(conditions.fragmentsAbsent ?? []).every(
        (id) => !this.progress.hasFragment(id),
      ) ||
      !(conditions.eventsTriggeredThisLoop ?? []).every((id) =>
        this.progress.wasEventTriggeredThisLoop(id),
      ) ||
      !(conditions.flags ?? []).every(
        (flag) => this.progress.getFlag(flag.flagId) === flag.value,
      )
    ) {
      return false;
    }

    return true;
  }

  private applyProgressEffect(effect: StoryEffectDefinition): void {
    if (effect.type === 'add-discovery') {
      this.progress.addDiscovery(effect.discoveryId);
    } else if (effect.type === 'add-fragment') {
      this.progress.addFragment(effect.fragmentId);
    } else if (effect.type === 'add-ending') {
      this.progress.addEnding(effect.endingId);
    } else if (effect.type === 'set-flag') {
      this.progress.setFlag(effect.flagId, effect.value);
    }
  }

  private createContext(): StoryEventContext {
    if (this.roomId === null) {
      throw new Error('Story event context requires an active room.');
    }

    return {
      roomId: this.roomId,
      loopNumber: this.progress.getSnapshot().loopNumber,
      pressureLevel: this.pressureLevel,
      phase: this.phase,
      phaseElapsedMs: Math.floor(this.phaseElapsedMs),
    };
  }

  private exitActiveRoom(): void {
    const previousRoomId = this.roomId;
    this.roomId = null;
    this.phase = null;
    this.phaseElapsedMs = 0;
    this.elapsedEventsTriggeredForPhase.clear();

    if (previousRoomId !== null) {
      this.options.onRoomExited?.(previousRoomId);
    }
  }
}

function triggerMatchesSignal(
  event: StoryEventDefinition,
  signal: StorySignal,
): boolean {
  const trigger = event.trigger;

  if (trigger.type !== signal.type) {
    return false;
  }

  if (trigger.type === 'phase-started' && signal.type === 'phase-started') {
    return trigger.phase === signal.phase;
  }

  if (
    trigger.type === 'object-examined' &&
    signal.type === 'object-examined'
  ) {
    return trigger.objectId === signal.objectId;
  }

  if (
    trigger.type === 'correct-report' &&
    signal.type === 'correct-report'
  ) {
    return trigger.targetId === undefined || trigger.targetId === signal.targetId;
  }

  if (trigger.type === 'run-error' && signal.type === 'run-error') {
    return trigger.kind === undefined || trigger.kind === signal.kind;
  }

  return true;
}

function assertRoomId(roomId: string): string {
  const normalized = roomId.trim();

  if (normalized.length === 0) {
    throw new Error('Story room id must not be empty.');
  }

  return normalized;
}
