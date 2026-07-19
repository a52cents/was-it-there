import {
  STORY_SAVE_STORAGE_KEY,
  StorySaveRepository,
  type StorySaveStorage,
} from './StorySaveRepository';

export const STORY_ACCESS_STORAGE_KEY = STORY_SAVE_STORAGE_KEY;

export interface StoryAccessSnapshot {
  readonly escapeUnlocked: boolean;
}

export type StoryAccessStorage = StorySaveStorage;

export class StoryAccessRepository {
  private readonly repository: StorySaveRepository;

  public constructor(
    storage?: StoryAccessStorage | null,
  ) {
    this.repository = new StorySaveRepository(storage);
  }

  public load(): StoryAccessSnapshot {
    return {
      escapeUnlocked: this.repository.load().escapeUnlocked,
    };
  }

  public unlockEscape(): boolean {
    return this.repository.unlockEscape();
  }
}
