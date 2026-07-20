import type { RunTiming } from '../app/RunTimer';
import { ENGLISH_COPY } from '../content/strings/en';
import { formatElapsedMilliseconds } from '../core/time/TimeFormatting';
import type { AnomalyRevealCopy } from '../gameplay/anomalies/AnomalyPresentation';

export interface GameOverSummary {
  readonly roomNumber: number;
  readonly timing: RunTiming;
  readonly errorCount: number;
  readonly maximumErrors: number;
  readonly missedAnomaly: AnomalyRevealCopy | null;
  readonly rewardedContinueAvailable: boolean;
}

type TryAgainHandler = () => Promise<void> | void;
type RewardedContinueHandler = () => Promise<boolean> | boolean;

export class GameOverScreen {
  private readonly element: HTMLElement;
  private readonly roomReached: HTMLElement;
  private readonly finalTime: HTMLTimeElement;
  private readonly errors: HTMLElement;
  private readonly anomalyReveal: HTMLElement;
  private readonly anomalyTarget: HTMLElement;
  private readonly anomalyChange: HTMLElement;
  private readonly rewardedContinueButton: HTMLButtonElement;
  private readonly tryAgainButton: HTMLButtonElement;
  private readonly rewardedStatus: HTMLElement;
  private tryAgainHandler: TryAgainHandler | null = null;
  private rewardedContinueHandler: RewardedContinueHandler | null = null;
  private busy = false;

  public constructor(root: HTMLElement) {
    const document = root.ownerDocument;
    this.element = document.createElement('section');
    this.element.className = 'game-over-screen';
    this.element.hidden = true;
    this.element.setAttribute('aria-labelledby', 'game-over-title');

    const panel = document.createElement('div');
    panel.className = 'game-over-panel';
    const title = document.createElement('h2');
    title.id = 'game-over-title';
    title.textContent = ENGLISH_COPY.gameOver;

    this.roomReached = document.createElement('p');
    this.roomReached.className = 'game-over-room';
    this.finalTime = document.createElement('time');
    this.finalTime.className = 'game-over-time';
    this.errors = document.createElement('p');
    this.errors.className = 'game-over-errors';
    this.anomalyReveal = document.createElement('div');
    this.anomalyReveal.className = 'game-over-reveal';
    const anomalyHeading = document.createElement('p');
    anomalyHeading.className = 'game-over-reveal-heading';
    anomalyHeading.textContent = ENGLISH_COPY.missedAnomaly;
    this.anomalyTarget = document.createElement('strong');
    this.anomalyTarget.className = 'game-over-reveal-target';
    this.anomalyChange = document.createElement('p');
    this.anomalyChange.className = 'game-over-reveal-change';
    const anomalyHint = document.createElement('p');
    anomalyHint.className = 'game-over-reveal-hint';
    anomalyHint.textContent = ENGLISH_COPY.anomalyRevealHint;
    this.anomalyReveal.append(
      anomalyHeading,
      this.anomalyTarget,
      this.anomalyChange,
      anomalyHint,
    );
    this.tryAgainButton = document.createElement('button');
    this.tryAgainButton.type = 'button';
    this.tryAgainButton.className = 'game-over-action game-over-try-again';
    this.tryAgainButton.textContent = ENGLISH_COPY.tryAgain;
    this.tryAgainButton.addEventListener('click', this.handleTryAgain);

    this.rewardedContinueButton = document.createElement('button');
    this.rewardedContinueButton.type = 'button';
    this.rewardedContinueButton.className =
      'game-over-action game-over-rewarded-continue';
    this.rewardedContinueButton.textContent = ENGLISH_COPY.rewardedContinue;
    this.rewardedContinueButton.addEventListener(
      'click',
      this.handleRewardedContinue,
    );

    const actions = document.createElement('div');
    actions.className = 'game-over-actions';
    actions.append(this.tryAgainButton, this.rewardedContinueButton);

    this.rewardedStatus = document.createElement('p');
    this.rewardedStatus.className = 'game-over-rewarded-status';
    this.rewardedStatus.setAttribute('role', 'status');
    this.rewardedStatus.setAttribute('aria-live', 'polite');
    this.rewardedStatus.hidden = true;

    panel.append(
      title,
      this.roomReached,
      this.finalTime,
      this.errors,
      this.anomalyReveal,
      actions,
      this.rewardedStatus,
    );
    this.element.append(panel);
    root.append(this.element);
  }

  public onTryAgain(handler: TryAgainHandler): void {
    this.tryAgainHandler = handler;
  }

  public onRewardedContinue(handler: RewardedContinueHandler): void {
    this.rewardedContinueHandler = handler;
  }

  public show(summary: GameOverSummary): void {
    const formattedTime = formatElapsedMilliseconds(summary.timing.finalTimeMs);
    this.roomReached.textContent = `${ENGLISH_COPY.roomReached}: ${summary.roomNumber}`;
    this.finalTime.textContent = `${ENGLISH_COPY.finalTime}: ${formattedTime}`;
    this.finalTime.dateTime = `PT${Math.floor(summary.timing.finalTimeMs / 1_000)}S`;
    this.errors.textContent = `${ENGLISH_COPY.errors}: ${summary.errorCount} / ${summary.maximumErrors}`;
    this.anomalyReveal.hidden = summary.missedAnomaly === null;

    if (summary.missedAnomaly !== null) {
      this.anomalyTarget.textContent = summary.missedAnomaly.targetLabel;
      this.anomalyChange.textContent = summary.missedAnomaly.changeLabel;
    }

    this.rewardedContinueButton.hidden =
      !summary.rewardedContinueAvailable;
    this.rewardedStatus.hidden = true;
    this.rewardedStatus.textContent = '';
    this.setBusy(false);
    this.element.hidden = false;
    this.tryAgainButton.focus({ preventScroll: true });
  }

  public hide(): void {
    this.element.hidden = true;
  }

  public dispose(): void {
    this.tryAgainButton.removeEventListener('click', this.handleTryAgain);
    this.rewardedContinueButton.removeEventListener(
      'click',
      this.handleRewardedContinue,
    );
    this.tryAgainHandler = null;
    this.rewardedContinueHandler = null;
    this.element.remove();
  }

  private setBusy(busy: boolean): void {
    this.busy = busy;
    this.tryAgainButton.disabled = busy;
    this.rewardedContinueButton.disabled = busy;
    this.tryAgainButton.setAttribute('aria-busy', String(busy));
    this.rewardedContinueButton.setAttribute('aria-busy', String(busy));
  }

  private readonly handleTryAgain = (): void => {
    if (this.busy || this.tryAgainHandler === null) {
      return;
    }

    this.setBusy(true);
    void this.runTryAgainHandler();
  };

  private async runTryAgainHandler(): Promise<void> {
    try {
      await this.tryAgainHandler?.();
    } catch (error: unknown) {
      console.error('Unable to restart the game.', error);
      this.setBusy(false);
    }
  }

  private readonly handleRewardedContinue = (): void => {
    if (this.busy || this.rewardedContinueHandler === null) {
      return;
    }

    this.setBusy(true);
    this.rewardedStatus.textContent = ENGLISH_COPY.rewardedAdLoading;
    this.rewardedStatus.hidden = false;
    void this.runRewardedContinueHandler();
  };

  private async runRewardedContinueHandler(): Promise<void> {
    try {
      const rewardGranted = await this.rewardedContinueHandler?.();

      if (rewardGranted === true) {
        return;
      }
    } catch (error: unknown) {
      console.error('Unable to request a rewarded continue.', error);
    }

    this.rewardedContinueButton.hidden = true;
    this.rewardedStatus.textContent = ENGLISH_COPY.rewardedAdUnavailable;
    this.setBusy(false);
    this.tryAgainButton.focus({ preventScroll: true });
  }
}
