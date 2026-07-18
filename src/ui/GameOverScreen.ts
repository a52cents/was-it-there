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
}

type TryAgainHandler = () => Promise<void> | void;

export class GameOverScreen {
  private readonly element: HTMLElement;
  private readonly roomReached: HTMLElement;
  private readonly finalTime: HTMLTimeElement;
  private readonly errors: HTMLElement;
  private readonly anomalyReveal: HTMLElement;
  private readonly anomalyTarget: HTMLElement;
  private readonly anomalyChange: HTMLElement;
  private readonly tryAgainButton: HTMLButtonElement;
  private tryAgainHandler: TryAgainHandler | null = null;
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
    this.tryAgainButton.className = 'game-over-try-again';
    this.tryAgainButton.textContent = ENGLISH_COPY.tryAgain;
    this.tryAgainButton.addEventListener('click', this.handleTryAgain);

    panel.append(
      title,
      this.roomReached,
      this.finalTime,
      this.errors,
      this.anomalyReveal,
      this.tryAgainButton,
    );
    this.element.append(panel);
    root.append(this.element);
  }

  public onTryAgain(handler: TryAgainHandler): void {
    this.tryAgainHandler = handler;
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

    this.setBusy(false);
    this.element.hidden = false;
    this.tryAgainButton.focus({ preventScroll: true });
  }

  public hide(): void {
    this.element.hidden = true;
  }

  public dispose(): void {
    this.tryAgainButton.removeEventListener('click', this.handleTryAgain);
    this.tryAgainHandler = null;
    this.element.remove();
  }

  private setBusy(busy: boolean): void {
    this.busy = busy;
    this.tryAgainButton.disabled = busy;
    this.tryAgainButton.setAttribute('aria-busy', String(busy));
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
}
