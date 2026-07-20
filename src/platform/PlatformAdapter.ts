export interface RewardedAdLifecycle {
  readonly onStarted?: () => void;
  readonly onEnded?: () => void;
}

export interface PlatformAdapter {
  readonly id: string;

  initialize(): Promise<void>;

  loadingStart(): void;
  loadingStop(): void;

  gameplayStart(): void;
  gameplayStop(): void;

  requestInterstitial(): Promise<void>;
  isRewardedAdAvailable(): boolean;
  requestRewardedAd(lifecycle?: RewardedAdLifecycle): Promise<boolean>;

  submitEscapeTime(timeMs: number): Promise<void>;

  getLocale(): string;
  isMobile(): boolean;

  setAudioMuted(muted: boolean): void;
}
