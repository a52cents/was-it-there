import { describe, expect, it } from 'vitest';
import {
  STORY_SAVE_STORAGE_KEY,
  StorySaveRepository,
  createEmptyStoryProgress,
  type StorySaveStorage,
} from '../../src/gameplay/story/StorySaveRepository';

class MemoryStorage implements StorySaveStorage {
  public readonly values = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('StorySaveRepository', () => {
  it('migrates the legacy Escape-only save without losing access', () => {
    const storage = new MemoryStorage();
    storage.values.set(
      STORY_SAVE_STORAGE_KEY,
      '{"version":1,"escapeUnlocked":true}',
    );

    expect(new StorySaveRepository(storage).load()).toEqual({
      escapeUnlocked: true,
      progress: createEmptyStoryProgress(),
    });
  });

  it('round-trips durable progress and keeps deterministic arrays', () => {
    const storage = new MemoryStorage();
    const repository = new StorySaveRepository(storage);
    const progress = {
      ...createEmptyStoryProgress(),
      loopNumber: 3,
      failedLoopCount: 2,
      discoveries: ['photo', 'radio', 'photo'],
      fragments: ['memory-empty-place'],
      triggeredEventIds: ['bedroom-empty-place'],
      flags: { remembered: true },
    } as const;

    expect(repository.save({ escapeUnlocked: false, progress })).toBe(true);
    expect(repository.load()).toMatchObject({
      escapeUnlocked: false,
      progress: {
        loopNumber: 3,
        failedLoopCount: 2,
        discoveries: ['photo', 'radio'],
      },
    });
  });

  it('erases Story discoveries while preserving Escape access', () => {
    const storage = new MemoryStorage();
    const repository = new StorySaveRepository(storage);
    repository.save({
      escapeUnlocked: true,
      progress: {
        ...createEmptyStoryProgress(),
        loopNumber: 5,
        fragments: ['memory-empty-place'],
      },
    });

    expect(repository.eraseProgressPreservingAccess()).toBe(true);
    expect(repository.load()).toEqual({
      escapeUnlocked: true,
      progress: createEmptyStoryProgress(),
    });
  });

  it('falls back cleanly for corrupt progress data', () => {
    const storage = new MemoryStorage();
    storage.values.set(
      STORY_SAVE_STORAGE_KEY,
      '{"version":1,"escapeUnlocked":true,"progress":{"loopNumber":-1}}',
    );

    expect(new StorySaveRepository(storage).load()).toEqual({
      escapeUnlocked: false,
      progress: createEmptyStoryProgress(),
    });
  });
});
