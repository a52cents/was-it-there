import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GAME_SETTINGS,
  SETTINGS_STORAGE_KEY,
  SettingsStore,
  type SettingsStorage,
} from '../../src/settings/SettingsStore';

class MemoryStorage implements SettingsStorage {
  public readonly values = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('SettingsStore', () => {
  it('returns defaults when no save exists', () => {
    expect(new SettingsStore(new MemoryStorage()).load()).toEqual(
      DEFAULT_GAME_SETTINGS,
    );
  });

  it('saves and restores every player setting', () => {
    const storage = new MemoryStorage();
    const store = new SettingsStore(storage);
    const settings = {
      lookSensitivity: 1.35,
      masterVolume: 0.8,
      musicVolume: 0.25,
      ambienceVolume: 0.4,
      effectsVolume: 0.65,
    };

    store.save(settings);

    expect(store.load()).toEqual(settings);
  });

  it('clamps invalid persisted values and fills missing settings', () => {
    const storage = new MemoryStorage();
    storage.values.set(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        settings: {
          lookSensitivity: 99,
          masterVolume: -1,
          musicVolume: 4,
        },
      }),
    );

    expect(new SettingsStore(storage).load()).toEqual({
      ...DEFAULT_GAME_SETTINGS,
      lookSensitivity: 2,
      masterVolume: 0,
      musicVolume: 1,
    });
  });

  it('ignores malformed and obsolete documents', () => {
    const storage = new MemoryStorage();
    storage.values.set(SETTINGS_STORAGE_KEY, '{broken');
    expect(new SettingsStore(storage).load()).toEqual(DEFAULT_GAME_SETTINGS);

    storage.values.set(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ version: 2, settings: { masterVolume: 0 } }),
    );
    expect(new SettingsStore(storage).load()).toEqual(DEFAULT_GAME_SETTINGS);
  });
});
