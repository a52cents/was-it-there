import { describe, expect, it } from 'vitest';
import {
  STORY_ACCESS_STORAGE_KEY,
  StoryAccessRepository,
  type StoryAccessStorage,
} from '../../src/gameplay/story/StoryAccessRepository';

class MemoryStorage implements StoryAccessStorage {
  public readonly values = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('StoryAccessRepository', () => {
  it('keeps Escape locked until a Story completion is saved', () => {
    const storage = new MemoryStorage();
    const repository = new StoryAccessRepository(storage);

    expect(repository.load()).toEqual({ escapeUnlocked: false });
    expect(repository.unlockEscape()).toBe(true);
    expect(repository.load()).toEqual({ escapeUnlocked: true });
    expect(
      JSON.parse(storage.values.get(STORY_ACCESS_STORAGE_KEY) ?? '{}'),
    ).toMatchObject({
      version: 1,
      escapeUnlocked: true,
      progress: { loopNumber: 0, discoveries: [] },
    });
  });

  it('falls back to locked access for invalid or corrupt data', () => {
    const storage = new MemoryStorage();
    const repository = new StoryAccessRepository(storage);
    storage.values.set(STORY_ACCESS_STORAGE_KEY, '{broken');
    expect(repository.load()).toEqual({ escapeUnlocked: false });
    storage.values.set(
      STORY_ACCESS_STORAGE_KEY,
      '{"version":2,"escapeUnlocked":true}',
    );
    expect(repository.load()).toEqual({ escapeUnlocked: false });
  });

  it('continues safely when browser storage is unavailable', () => {
    const unavailable: StoryAccessStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    const repository = new StoryAccessRepository(unavailable);

    expect(repository.load()).toEqual({ escapeUnlocked: false });
    expect(repository.unlockEscape()).toBe(false);
  });
});
