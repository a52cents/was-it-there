import type {
  PlatformAdapter,
  RewardedAdLifecycle,
} from '../PlatformAdapter';

const CRAZYGAMES_SDK_SOURCE =
  'https://sdk.crazygames.com/crazygames-sdk-v3.js';

export type CrazyGamesEnvironment = 'local' | 'crazygames' | 'disabled';

export interface CrazyGamesAdError {
  readonly code?: string;
  readonly message?: string;
}

export interface CrazyGamesAdCallbacks {
  readonly adStarted: () => void;
  readonly adFinished: () => void;
  readonly adError: (error: CrazyGamesAdError) => void;
}

export interface CrazyGamesSdk {
  readonly environment: CrazyGamesEnvironment;
  readonly ad: {
    requestAd(
      type: 'midgame' | 'rewarded',
      callbacks: CrazyGamesAdCallbacks,
    ): void;
  };
  readonly game: {
    loadingStart(): void;
    loadingStop(): void;
    gameplayStart(): void;
    gameplayStop(): void;
  };
  init(): Promise<void>;
}

interface CrazyGamesWindow extends Window {
  readonly CrazyGames?: {
    readonly SDK?: CrazyGamesSdk;
  };
}

type NavigatorSnapshot = Pick<Navigator, 'language' | 'userAgent'>;

export interface CrazyGamesAdapterOptions {
  readonly rewardedAdsEnabled?: boolean;
  readonly loadSdk?: () => Promise<void>;
  readonly getSdk?: () => CrazyGamesSdk | undefined;
  readonly getNavigator?: () => NavigatorSnapshot | undefined;
}

let sdkLoadPromise: Promise<void> | null = null;

function getBrowserSdk(): CrazyGamesSdk | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return (window as CrazyGamesWindow).CrazyGames?.SDK;
}

function getBrowserNavigator(): NavigatorSnapshot | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator;
}

function loadCrazyGamesSdk(): Promise<void> {
  if (getBrowserSdk() !== undefined) {
    return Promise.resolve();
  }

  if (sdkLoadPromise !== null) {
    return sdkLoadPromise;
  }

  sdkLoadPromise = new Promise<void>((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('CrazyGames SDK requires a browser document.'));
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${CRAZYGAMES_SDK_SOURCE}"]`,
    );
    const script = existingScript ?? document.createElement('script');

    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener(
      'error',
      () => reject(new Error('CrazyGames SDK script could not be loaded.')),
      { once: true },
    );

    if (existingScript === null) {
      script.src = CRAZYGAMES_SDK_SOURCE;
      script.async = true;
      document.head.append(script);
    }
  });

  return sdkLoadPromise;
}

export class CrazyGamesAdapter implements PlatformAdapter {
  public readonly id = 'crazygames';

  private readonly rewardedAdsEnabled: boolean;
  private readonly loadSdk: () => Promise<void>;
  private readonly getSdk: () => CrazyGamesSdk | undefined;
  private readonly getNavigator: () => NavigatorSnapshot | undefined;
  private sdk: CrazyGamesSdk | null = null;
  private rewardedAdRequestPending = false;
  private rewardedAdsRejectedByHost = false;

  public constructor(options: CrazyGamesAdapterOptions = {}) {
    this.rewardedAdsEnabled = options.rewardedAdsEnabled ?? false;
    this.loadSdk = options.loadSdk ?? loadCrazyGamesSdk;
    this.getSdk = options.getSdk ?? getBrowserSdk;
    this.getNavigator = options.getNavigator ?? getBrowserNavigator;
  }

  public async initialize(): Promise<void> {
    await this.loadSdk();
    const sdk = this.getSdk();

    if (sdk === undefined) {
      throw new Error('CrazyGames SDK did not expose window.CrazyGames.SDK.');
    }

    await sdk.init();
    this.sdk = sdk;
  }

  public loadingStart(): void {
    this.withEnabledSdk((sdk) => sdk.game.loadingStart());
  }

  public loadingStop(): void {
    this.withEnabledSdk((sdk) => sdk.game.loadingStop());
  }

  public gameplayStart(): void {
    this.withEnabledSdk((sdk) => sdk.game.gameplayStart());
  }

  public gameplayStop(): void {
    this.withEnabledSdk((sdk) => sdk.game.gameplayStop());
  }

  public requestInterstitial(): Promise<void> {
    return Promise.resolve();
  }

  public isRewardedAdAvailable(): boolean {
    return (
      this.rewardedAdsEnabled &&
      !this.rewardedAdsRejectedByHost &&
      !this.rewardedAdRequestPending &&
      this.sdk !== null &&
      this.sdk.environment !== 'disabled'
    );
  }

  public requestRewardedAd(
    lifecycle: RewardedAdLifecycle = {},
  ): Promise<boolean> {
    const sdk = this.sdk;

    if (!this.isRewardedAdAvailable() || sdk === null) {
      return Promise.resolve(false);
    }

    this.rewardedAdRequestPending = true;

    return new Promise<boolean>((resolve) => {
      let adStarted = false;
      let settled = false;
      const settle = (rewardGranted: boolean): void => {
        if (settled) {
          return;
        }

        settled = true;
        this.rewardedAdRequestPending = false;

        if (adStarted) {
          lifecycle.onEnded?.();
        }

        resolve(rewardGranted);
      };

      try {
        sdk.ad.requestAd('rewarded', {
          adStarted: () => {
            adStarted = true;
            lifecycle.onStarted?.();
          },
          adFinished: () => settle(true),
          adError: (error) => {
            if (error.code === 'adsDisabledBasicLaunch') {
              this.rewardedAdsRejectedByHost = true;
            }

            console.info(
              `CrazyGames rewarded ad unavailable${error.code === undefined ? '' : ` (${error.code})`}.`,
            );
            settle(false);
          },
        });
      } catch (error: unknown) {
        console.warn('CrazyGames rewarded ad request failed.', error);
        settle(false);
      }
    });
  }

  public submitEscapeTime(_timeMs: number): Promise<void> {
    return Promise.resolve();
  }

  public getLocale(): string {
    const locale = this.getNavigator()?.language.trim();
    return locale === undefined || locale.length === 0 ? 'en' : locale;
  }

  public isMobile(): boolean {
    const userAgent = this.getNavigator()?.userAgent ?? '';
    return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(userAgent);
  }

  public setAudioMuted(_muted: boolean): void {
    // The game owns its Web Audio mixer; ad callbacks control it directly.
  }

  private withEnabledSdk(action: (sdk: CrazyGamesSdk) => void): void {
    if (this.sdk === null || this.sdk.environment === 'disabled') {
      return;
    }

    action(this.sdk);
  }
}
