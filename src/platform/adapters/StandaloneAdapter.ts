import type { PlatformAdapter } from '../PlatformAdapter';

type BrowserNavigator = Pick<Navigator, 'language' | 'userAgent'>;
type NavigatorProvider = () => BrowserNavigator | undefined;

function getBrowserNavigator(): BrowserNavigator | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator;
}

export class StandaloneAdapter implements PlatformAdapter {
  public readonly id = 'standalone';

  public constructor(
    private readonly navigatorProvider: NavigatorProvider = getBrowserNavigator,
  ) {}

  public initialize(): Promise<void> {
    return Promise.resolve();
  }

  public loadingStart(): void {
    // Standalone builds have no host loading lifecycle to notify.
  }

  public loadingStop(): void {
    // Standalone builds have no host loading lifecycle to notify.
  }

  public gameplayStart(): void {
    // Standalone builds have no host gameplay lifecycle to notify.
  }

  public gameplayStop(): void {
    // Standalone builds have no host gameplay lifecycle to notify.
  }

  public requestInterstitial(): Promise<void> {
    return Promise.resolve();
  }

  public requestRewardedAd(): Promise<boolean> {
    return Promise.resolve(false);
  }

  public submitEscapeTime(_timeMs: number): Promise<void> {
    return Promise.resolve();
  }

  public getLocale(): string {
    const locale = this.navigatorProvider()?.language.trim();
    return locale === undefined || locale.length === 0 ? 'en' : locale;
  }

  public isMobile(): boolean {
    const userAgent = this.navigatorProvider()?.userAgent ?? '';

    // A user-agent heuristic is sufficient for the initial platform boundary.
    return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(userAgent);
  }

  public setAudioMuted(_muted: boolean): void {
    // Audio is not part of the current milestone.
  }
}
