export interface GameSettings {
  readonly lookSensitivity: number;
  readonly masterVolume: number;
  readonly musicVolume: number;
  readonly ambienceVolume: number;
  readonly effectsVolume: number;
}

export interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface StoredSettingsDocument {
  readonly version: 1;
  readonly settings: Partial<GameSettings>;
}

export const SETTINGS_STORAGE_KEY = 'was-it-there.settings.v1';
export const MIN_LOOK_SENSITIVITY = 0.5;
export const MAX_LOOK_SENSITIVITY = 2;

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  lookSensitivity: 1,
  masterVolume: 1,
  musicVolume: 0.5,
  ambienceVolume: 0.5,
  effectsVolume: 0.5,
};

export class SettingsStore {
  public constructor(
    private readonly storage: SettingsStorage | null = getBrowserStorage(),
  ) {}

  public load(): GameSettings {
    if (this.storage === null) {
      return { ...DEFAULT_GAME_SETTINGS };
    }

    try {
      const serialized = this.storage.getItem(SETTINGS_STORAGE_KEY);

      if (serialized === null) {
        return { ...DEFAULT_GAME_SETTINGS };
      }

      const value: unknown = JSON.parse(serialized);

      if (!isStoredSettingsDocument(value)) {
        return { ...DEFAULT_GAME_SETTINGS };
      }

      return normalizeGameSettings(value.settings);
    } catch {
      return { ...DEFAULT_GAME_SETTINGS };
    }
  }

  public save(settings: GameSettings): void {
    if (this.storage === null) {
      return;
    }

    const document: StoredSettingsDocument = {
      version: 1,
      settings: normalizeGameSettings(settings),
    };

    try {
      this.storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(document));
    } catch {
      // Storage can be blocked or full in private and embedded browsers.
    }
  }
}

export function normalizeGameSettings(
  settings: Partial<GameSettings>,
): GameSettings {
  return {
    lookSensitivity: clampFinite(
      settings.lookSensitivity,
      MIN_LOOK_SENSITIVITY,
      MAX_LOOK_SENSITIVITY,
      DEFAULT_GAME_SETTINGS.lookSensitivity,
    ),
    masterVolume: normalizeVolume(
      settings.masterVolume,
      DEFAULT_GAME_SETTINGS.masterVolume,
    ),
    musicVolume: normalizeVolume(
      settings.musicVolume,
      DEFAULT_GAME_SETTINGS.musicVolume,
    ),
    ambienceVolume: normalizeVolume(
      settings.ambienceVolume,
      DEFAULT_GAME_SETTINGS.ambienceVolume,
    ),
    effectsVolume: normalizeVolume(
      settings.effectsVolume,
      DEFAULT_GAME_SETTINGS.effectsVolume,
    ),
  };
}

function normalizeVolume(value: number | undefined, fallback: number): number {
  return clampFinite(value, 0, 1, fallback);
}

function clampFinite(
  value: number | undefined,
  minimum: number,
  maximum: number,
  fallback: number,
): number {
  return value !== undefined && Number.isFinite(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : fallback;
}

function isStoredSettingsDocument(
  value: unknown,
): value is StoredSettingsDocument {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<StoredSettingsDocument>;
  return (
    candidate.version === 1 &&
    typeof candidate.settings === 'object' &&
    candidate.settings !== null
  );
}

function getBrowserStorage(): SettingsStorage | null {
  try {
    return typeof globalThis.localStorage === 'undefined'
      ? null
      : globalThis.localStorage;
  } catch {
    return null;
  }
}
