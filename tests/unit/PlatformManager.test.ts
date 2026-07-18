import { describe, expect, it, vi } from 'vitest';
import type { PlatformAdapter } from '../../src/platform/PlatformAdapter';
import {
  PlatformInitializationError,
  PlatformManager,
} from '../../src/platform/PlatformManager';

function createAdapter(
  overrides: Partial<PlatformAdapter> = {},
): PlatformAdapter {
  return {
    id: 'test',
    initialize: vi.fn(() => Promise.resolve()),
    loadingStart: vi.fn(),
    loadingStop: vi.fn(),
    gameplayStart: vi.fn(),
    gameplayStop: vi.fn(),
    requestInterstitial: vi.fn(() => Promise.resolve()),
    requestRewardedAd: vi.fn(() => Promise.resolve(false)),
    submitEscapeTime: vi.fn(() => Promise.resolve()),
    getLocale: vi.fn(() => 'en'),
    isMobile: vi.fn(() => false),
    setAudioMuted: vi.fn(),
    ...overrides,
  };
}

describe('PlatformManager', () => {
  it('initializes its adapter and exposes it as active', async () => {
    const initialize = vi.fn(() => Promise.resolve());
    const adapter = createAdapter({ initialize });
    const manager = new PlatformManager(adapter);

    await manager.initialize();

    expect(initialize).toHaveBeenCalledOnce();
    expect(manager.activeAdapter).toBe(adapter);
    expect(manager.initializationStatus).toBe('ready');
  });

  it('wraps initialization failures in an explicit platform error', async () => {
    const failure = new Error('SDK unavailable');
    const adapter = createAdapter({
      initialize: vi.fn(() => Promise.reject(failure)),
    });
    const manager = new PlatformManager(adapter);

    await expect(manager.initialize()).rejects.toEqual(
      expect.objectContaining({
        name: PlatformInitializationError.name,
        adapterId: 'test',
        cause: failure,
      }),
    );
    expect(manager.initializationStatus).toBe('failed');
  });
});
