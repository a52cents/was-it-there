import type { StoryFlagValue } from './StoryEvent';
import type { PersistentStoryProgressSnapshot } from './StoryProgress';

export const STORY_SAVE_STORAGE_KEY = 'was-it-there.story.v1';

export interface StorySaveSnapshot {
  readonly escapeUnlocked: boolean;
  readonly progress: PersistentStoryProgressSnapshot;
}

export interface StorySaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface StorySaveV1 {
  readonly version: 1;
  readonly escapeUnlocked: boolean;
  readonly progress: PersistentStoryProgressSnapshot;
}

interface LegacyStoryAccessSaveV1 {
  readonly version: 1;
  readonly escapeUnlocked: boolean;
}

export class StorySaveRepository {
  public constructor(
    private readonly storage: StorySaveStorage | null = getBrowserStorage(),
  ) {}

  public load(): StorySaveSnapshot {
    if (this.storage === null) {
      return createEmptyStorySave();
    }

    try {
      const serialized = this.storage.getItem(STORY_SAVE_STORAGE_KEY);

      if (serialized === null) {
        return createEmptyStorySave();
      }

      const value: unknown = JSON.parse(serialized);

      if (isStorySaveV1(value)) {
        return cloneStorySave(value);
      }

      if (isLegacyStoryAccessSaveV1(value)) {
        return {
          escapeUnlocked: value.escapeUnlocked,
          progress: createEmptyStoryProgress(),
        };
      }

      return createEmptyStorySave();
    } catch {
      return createEmptyStorySave();
    }
  }

  public save(snapshot: StorySaveSnapshot): boolean {
    if (this.storage === null) {
      return false;
    }

    const save: StorySaveV1 = {
      version: 1,
      escapeUnlocked: snapshot.escapeUnlocked,
      progress: normalizeProgress(snapshot.progress),
    };

    try {
      this.storage.setItem(STORY_SAVE_STORAGE_KEY, JSON.stringify(save));
      return true;
    } catch {
      return false;
    }
  }

  public saveProgress(progress: PersistentStoryProgressSnapshot): boolean {
    return this.save({
      ...this.load(),
      progress,
    });
  }

  public unlockEscape(): boolean {
    return this.save({
      ...this.load(),
      escapeUnlocked: true,
    });
  }

  public eraseProgressPreservingAccess(): boolean {
    return this.save({
      escapeUnlocked: this.load().escapeUnlocked,
      progress: createEmptyStoryProgress(),
    });
  }
}

export function createEmptyStoryProgress(): PersistentStoryProgressSnapshot {
  return {
    loopNumber: 0,
    completedLoopCount: 0,
    failedLoopCount: 0,
    discoveries: [],
    fragments: [],
    triggeredEventIds: [],
    flags: {},
    chapterOutcomeIds: [],
    endingIds: [],
  };
}

function createEmptyStorySave(): StorySaveSnapshot {
  return {
    escapeUnlocked: false,
    progress: createEmptyStoryProgress(),
  };
}

function cloneStorySave(save: StorySaveV1): StorySaveSnapshot {
  return {
    escapeUnlocked: save.escapeUnlocked,
    progress: normalizeProgress(save.progress),
  };
}

function normalizeProgress(
  progress: PersistentStoryProgressSnapshot,
): PersistentStoryProgressSnapshot {
  return {
    loopNumber: progress.loopNumber,
    completedLoopCount: progress.completedLoopCount,
    failedLoopCount: progress.failedLoopCount,
    discoveries: [...new Set(progress.discoveries)].sort(),
    fragments: [...new Set(progress.fragments)].sort(),
    triggeredEventIds: [...new Set(progress.triggeredEventIds)].sort(),
    flags: Object.fromEntries(
      Object.entries(progress.flags).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
    chapterOutcomeIds: [...new Set(progress.chapterOutcomeIds)].sort(),
    endingIds: [...new Set(progress.endingIds)].sort(),
  };
}

function isStorySaveV1(value: unknown): value is StorySaveV1 {
  if (!isVersionedAccessSave(value)) {
    return false;
  }

  const candidate = value as Partial<StorySaveV1>;
  return isPersistentStoryProgress(candidate.progress);
}

function isLegacyStoryAccessSaveV1(
  value: unknown,
): value is LegacyStoryAccessSaveV1 {
  return isVersionedAccessSave(value) && !('progress' in value);
}

function isVersionedAccessSave(
  value: unknown,
): value is LegacyStoryAccessSaveV1 & Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<LegacyStoryAccessSaveV1>;
  return (
    candidate.version === 1 &&
    typeof candidate.escapeUnlocked === 'boolean'
  );
}

function isPersistentStoryProgress(
  value: unknown,
): value is PersistentStoryProgressSnapshot {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<PersistentStoryProgressSnapshot>;
  return (
    isNonNegativeInteger(candidate.loopNumber) &&
    isNonNegativeInteger(candidate.completedLoopCount) &&
    isNonNegativeInteger(candidate.failedLoopCount) &&
    isIdentifierArray(candidate.discoveries) &&
    isIdentifierArray(candidate.fragments) &&
    isIdentifierArray(candidate.triggeredEventIds) &&
    isFlagRecord(candidate.flags) &&
    isIdentifierArray(candidate.chapterOutcomeIds) &&
    isIdentifierArray(candidate.endingIds)
  );
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isIdentifierArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(
      (identifier: unknown) =>
        typeof identifier === 'string' && identifier.trim().length > 0,
    )
  );
}

function isFlagRecord(
  value: unknown,
): value is Record<string, StoryFlagValue> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.entries(value).every(
    ([flagId, flagValue]) =>
      flagId.trim().length > 0 &&
      (typeof flagValue === 'boolean' ||
        typeof flagValue === 'string' ||
        (typeof flagValue === 'number' && Number.isFinite(flagValue))),
  );
}

function getBrowserStorage(): StorySaveStorage | null {
  try {
    if (typeof globalThis.localStorage === 'undefined') {
      return null;
    }

    return globalThis.localStorage;
  } catch {
    return null;
  }
}
