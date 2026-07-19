import type { StoryFlagValue } from './StoryEvent';

export interface StoryProgressSnapshot {
  readonly loopNumber: number;
  readonly completedLoopCount: number;
  readonly failedLoopCount: number;
  readonly discoveries: readonly string[];
  readonly fragments: readonly string[];
  readonly triggeredEventIds: readonly string[];
  readonly triggeredThisLoop: readonly string[];
  readonly flags: Readonly<Record<string, StoryFlagValue>>;
  readonly chapterOutcomeIds: readonly string[];
  readonly endingIds: readonly string[];
}

export type PersistentStoryProgressSnapshot = Omit<
  StoryProgressSnapshot,
  'triggeredThisLoop'
>;

type StoryProgressListener = (
  snapshot: PersistentStoryProgressSnapshot,
) => void;

export class StoryProgress {
  private loopNumber = 0;
  private completedLoopCount = 0;
  private failedLoopCount = 0;
  private readonly discoveries = new Set<string>();
  private readonly fragments = new Set<string>();
  private readonly triggeredEventIds = new Set<string>();
  private readonly triggeredThisLoop = new Set<string>();
  private readonly flags = new Map<string, StoryFlagValue>();
  private readonly chapterOutcomeIds = new Set<string>();
  private readonly endingIds = new Set<string>();
  private readonly listeners = new Set<StoryProgressListener>();

  public beginLoop(): number {
    this.loopNumber += 1;
    this.triggeredThisLoop.clear();
    this.notifyListeners();
    return this.loopNumber;
  }

  public addDiscovery(discoveryId: string): boolean {
    const normalizedId = assertIdentifier(discoveryId, 'Discovery id');
    const alreadyPresent = this.discoveries.has(normalizedId);
    this.discoveries.add(normalizedId);

    if (!alreadyPresent) {
      this.notifyListeners();
    }

    return !alreadyPresent;
  }

  public hasDiscovery(discoveryId: string): boolean {
    return this.discoveries.has(discoveryId);
  }

  public addFragment(fragmentId: string): boolean {
    const normalizedId = assertIdentifier(fragmentId, 'Fragment id');
    const alreadyPresent = this.fragments.has(normalizedId);
    this.fragments.add(normalizedId);

    if (!alreadyPresent) {
      this.notifyListeners();
    }

    return !alreadyPresent;
  }

  public hasFragment(fragmentId: string): boolean {
    return this.fragments.has(fragmentId);
  }

  public markEventTriggered(eventId: string): void {
    const normalizedId = assertIdentifier(eventId, 'Story event id');
    const alreadyPersisted = this.triggeredEventIds.has(normalizedId);
    this.triggeredEventIds.add(normalizedId);
    this.triggeredThisLoop.add(normalizedId);

    if (!alreadyPersisted) {
      this.notifyListeners();
    }
  }

  public wasEventTriggered(eventId: string): boolean {
    return this.triggeredEventIds.has(eventId);
  }

  public wasEventTriggeredThisLoop(eventId: string): boolean {
    return this.triggeredThisLoop.has(eventId);
  }

  public setFlag(flagId: string, value: StoryFlagValue): void {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new RangeError('Story flag numbers must be finite.');
    }

    const normalizedId = assertIdentifier(flagId, 'Story flag id');

    if (Object.is(this.flags.get(normalizedId), value)) {
      return;
    }

    this.flags.set(normalizedId, value);
    this.notifyListeners();
  }

  public getFlag(flagId: string): StoryFlagValue | undefined {
    return this.flags.get(flagId);
  }

  public recordLoopOutcome(outcome: 'completed' | 'failed'): void {
    if (outcome === 'completed') {
      this.completedLoopCount += 1;
    } else {
      this.failedLoopCount += 1;
    }

    this.notifyListeners();
  }

  public addChapterOutcome(outcomeId: string): boolean {
    const normalizedId = assertIdentifier(outcomeId, 'Chapter outcome id');
    const alreadyPresent = this.chapterOutcomeIds.has(normalizedId);
    this.chapterOutcomeIds.add(normalizedId);

    if (!alreadyPresent) {
      this.notifyListeners();
    }

    return !alreadyPresent;
  }

  public addEnding(endingId: string): boolean {
    const normalizedId = assertIdentifier(endingId, 'Ending id');
    const alreadyPresent = this.endingIds.has(normalizedId);
    this.endingIds.add(normalizedId);

    if (!alreadyPresent) {
      this.notifyListeners();
    }

    return !alreadyPresent;
  }

  public hydrate(snapshot: PersistentStoryProgressSnapshot): void {
    this.loopNumber = snapshot.loopNumber;
    this.completedLoopCount = snapshot.completedLoopCount;
    this.failedLoopCount = snapshot.failedLoopCount;
    replaceSet(this.discoveries, snapshot.discoveries);
    replaceSet(this.fragments, snapshot.fragments);
    replaceSet(this.triggeredEventIds, snapshot.triggeredEventIds);
    this.triggeredThisLoop.clear();
    this.flags.clear();

    for (const [flagId, value] of Object.entries(snapshot.flags)) {
      this.flags.set(flagId, value);
    }

    replaceSet(this.chapterOutcomeIds, snapshot.chapterOutcomeIds);
    replaceSet(this.endingIds, snapshot.endingIds);
  }

  public subscribe(listener: StoryProgressListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getSnapshot(): StoryProgressSnapshot {
    const flags = Object.fromEntries(
      [...this.flags.entries()].sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ) as Record<string, StoryFlagValue>;

    return {
      loopNumber: this.loopNumber,
      completedLoopCount: this.completedLoopCount,
      failedLoopCount: this.failedLoopCount,
      discoveries: [...this.discoveries].sort(),
      fragments: [...this.fragments].sort(),
      triggeredEventIds: [...this.triggeredEventIds].sort(),
      triggeredThisLoop: [...this.triggeredThisLoop].sort(),
      flags,
      chapterOutcomeIds: [...this.chapterOutcomeIds].sort(),
      endingIds: [...this.endingIds].sort(),
    };
  }

  public getPersistentSnapshot(): PersistentStoryProgressSnapshot {
    const snapshot = this.getSnapshot();
    return {
      loopNumber: snapshot.loopNumber,
      completedLoopCount: snapshot.completedLoopCount,
      failedLoopCount: snapshot.failedLoopCount,
      discoveries: snapshot.discoveries,
      fragments: snapshot.fragments,
      triggeredEventIds: snapshot.triggeredEventIds,
      flags: snapshot.flags,
      chapterOutcomeIds: snapshot.chapterOutcomeIds,
      endingIds: snapshot.endingIds,
    };
  }

  private notifyListeners(): void {
    const snapshot = this.getPersistentSnapshot();

    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

function replaceSet(target: Set<string>, values: readonly string[]): void {
  target.clear();

  for (const value of values) {
    target.add(value);
  }
}

function assertIdentifier(value: string, label: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error(`${label} must not be empty.`);
  }

  return normalized;
}
