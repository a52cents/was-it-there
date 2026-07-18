export interface PlatformAdapter {
  readonly id: string;

  initialize(): Promise<void>;

  loadingStart(): void;
  loadingStop(): void;

  gameplayStart(): void;
  gameplayStop(): void;

  requestInterstitial(): Promise<void>;
  requestRewardedAd(): Promise<boolean>;

  submitEscapeTime(timeMs: number): Promise<void>;

  getLocale(): string;
  isMobile(): boolean;

  setAudioMuted(muted: boolean): void;
}
