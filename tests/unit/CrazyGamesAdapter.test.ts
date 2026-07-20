import { describe, expect, it, vi } from 'vitest';
import {
  CrazyGamesAdapter,
  type CrazyGamesAdCallbacks,
  type CrazyGamesEnvironment,
  type CrazyGamesSdk,
} from '../../src/platform/adapters/CrazyGamesAdapter';

function createSdk(
  environment: CrazyGamesEnvironment = 'local',
): {
  readonly sdk: CrazyGamesSdk;
  readonly spies: {
    readonly init: ReturnType<typeof vi.fn>;
    readonly loadingStart: ReturnType<typeof vi.fn>;
    readonly loadingStop: ReturnType<typeof vi.fn>;
    readonly gameplayStart: ReturnType<typeof vi.fn>;
    readonly gameplayStop: ReturnType<typeof vi.fn>;
  };
} {
  const spies = {
    init: vi.fn(() => Promise.resolve()),
    loadingStart: vi.fn(),
    loadingStop: vi.fn(),
    gameplayStart: vi.fn(),
    gameplayStop: vi.fn(),
  };

  return {
    sdk: {
      environment,
      init: spies.init,
      ad: {
        requestAd: vi.fn(),
      },
      game: {
        loadingStart: spies.loadingStart,
        loadingStop: spies.loadingStop,
        gameplayStart: spies.gameplayStart,
        gameplayStop: spies.gameplayStop,
      },
    },
    spies,
  };
}

describe('CrazyGamesAdapter', () => {
  it('initializes the v3 SDK and forwards game lifecycle events', async () => {
    const { sdk, spies } = createSdk();
    const adapter = new CrazyGamesAdapter({
      rewardedAdsEnabled: true,
      loadSdk: vi.fn(() => Promise.resolve()),
      getSdk: () => sdk,
    });

    await adapter.initialize();
    adapter.loadingStart();
    adapter.loadingStop();
    adapter.gameplayStart();
    adapter.gameplayStop();

    expect(spies.init).toHaveBeenCalledOnce();
    expect(spies.loadingStart).toHaveBeenCalledOnce();
    expect(spies.loadingStop).toHaveBeenCalledOnce();
    expect(spies.gameplayStart).toHaveBeenCalledOnce();
    expect(spies.gameplayStop).toHaveBeenCalledOnce();
    expect(adapter.isRewardedAdAvailable()).toBe(true);
  });

  it('grants a reward only after adFinished and brackets the ad lifecycle', async () => {
    let callbacks: CrazyGamesAdCallbacks | null = null;
    const { sdk } = createSdk();
    sdk.ad.requestAd = vi.fn(
      (_type: 'midgame' | 'rewarded', nextCallbacks: CrazyGamesAdCallbacks) => {
      callbacks = nextCallbacks;
      nextCallbacks.adStarted();
      nextCallbacks.adFinished();
      },
    );
    const onStarted = vi.fn();
    const onEnded = vi.fn();
    const adapter = new CrazyGamesAdapter({
      rewardedAdsEnabled: true,
      loadSdk: () => Promise.resolve(),
      getSdk: () => sdk,
    });
    await adapter.initialize();

    await expect(
      adapter.requestRewardedAd({ onStarted, onEnded }),
    ).resolves.toBe(true);

    expect(callbacks).not.toBeNull();
    expect(onStarted).toHaveBeenCalledOnce();
    expect(onEnded).toHaveBeenCalledOnce();
    expect(adapter.isRewardedAdAvailable()).toBe(true);
  });

  it('does not reward ad errors and disables Basic Launch offers', async () => {
    const { sdk } = createSdk('crazygames');
    sdk.ad.requestAd = vi.fn(
      (_type: 'midgame' | 'rewarded', callbacks: CrazyGamesAdCallbacks) => {
        callbacks.adStarted();
        callbacks.adError({
          code: 'adsDisabledBasicLaunch',
          message: 'Ads are disabled during Basic Launch.',
        });
      },
    );
    const onEnded = vi.fn();
    const adapter = new CrazyGamesAdapter({
      rewardedAdsEnabled: true,
      loadSdk: () => Promise.resolve(),
      getSdk: () => sdk,
    });
    await adapter.initialize();

    await expect(
      adapter.requestRewardedAd({ onEnded }),
    ).resolves.toBe(false);

    expect(onEnded).toHaveBeenCalledOnce();
    expect(adapter.isRewardedAdAvailable()).toBe(false);
  });

  it('keeps ads and SDK calls disabled outside supported environments', async () => {
    const { sdk, spies } = createSdk('disabled');
    const adapter = new CrazyGamesAdapter({
      rewardedAdsEnabled: true,
      loadSdk: () => Promise.resolve(),
      getSdk: () => sdk,
    });
    await adapter.initialize();

    adapter.gameplayStart();

    expect(spies.gameplayStart).not.toHaveBeenCalled();
    expect(adapter.isRewardedAdAvailable()).toBe(false);
    await expect(adapter.requestRewardedAd()).resolves.toBe(false);
  });
});
