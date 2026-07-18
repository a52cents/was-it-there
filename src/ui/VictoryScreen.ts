import type { RunTiming } from '../app/RunTimer';
import { ENGLISH_COPY } from '../content/strings/en';
import { formatElapsedMilliseconds } from '../core/time/TimeFormatting';

export interface VictorySummary {
  readonly timing: RunTiming;
  readonly errorCount: number;
  readonly maximumErrors: number;
}

type PlayAgainHandler = () => Promise<void> | void;

export class VictoryScreen {
  private readonly element: HTMLElement;
  private readonly activeTime: HTMLTimeElement;
  private readonly penalties: HTMLElement;
  private readonly finalTime: HTMLTimeElement;
  private readonly errors: HTMLElement;
  private readonly perfectRun: HTMLElement;
  private readonly playAgainButton: HTMLButtonElement;
  private playAgainHandler: PlayAgainHandler | null = null;
  private busy = false;

  public constructor(root: HTMLElement) {
    const document = root.ownerDocument;
    this.element = document.createElement('section');
    this.element.className = 'victory-screen';
    this.element.hidden = true;
    this.element.setAttribute('aria-labelledby', 'victory-title');

    const panel = document.createElement('div');
    panel.className = 'victory-panel';
    const title = document.createElement('h2');
    title.id = 'victory-title';
    title.textContent = ENGLISH_COPY.victory;

    this.activeTime = document.createElement('time');
    this.activeTime.className = 'victory-active-time';
    this.penalties = document.createElement('p');
    this.penalties.className = 'victory-penalties';
    this.finalTime = document.createElement('time');
    this.finalTime.className = 'victory-final-time';
    this.errors = document.createElement('p');
    this.errors.className = 'victory-errors';
    this.perfectRun = document.createElement('p');
    this.perfectRun.className = 'victory-perfect-run';
    this.playAgainButton = document.createElement('button');
    this.playAgainButton.type = 'button';
    this.playAgainButton.className = 'victory-play-again';
    this.playAgainButton.textContent = ENGLISH_COPY.playAgain;
    this.playAgainButton.addEventListener('click', this.handlePlayAgain);

    panel.append(
      title,
      this.activeTime,
      this.penalties,
      this.finalTime,
      this.errors,
      this.perfectRun,
      this.playAgainButton,
    );
    this.element.append(panel);
    root.append(this.element);
  }

  public onPlayAgain(handler: PlayAgainHandler): void {
    this.playAgainHandler = handler;
  }

  public show(summary: VictorySummary): void {
    const activeTime = formatElapsedMilliseconds(summary.timing.activeTimeMs);
    const penaltyTime = formatElapsedMilliseconds(summary.timing.penaltyTimeMs);
    const finalTime = formatElapsedMilliseconds(summary.timing.finalTimeMs);
    this.activeTime.textContent = `${ENGLISH_COPY.activeTime}: ${activeTime}`;
    this.activeTime.dateTime = `PT${Math.floor(summary.timing.activeTimeMs / 1_000)}S`;
    this.penalties.textContent = `${ENGLISH_COPY.penalties}: +${penaltyTime}`;
    this.finalTime.textContent = `${ENGLISH_COPY.finalTime}: ${finalTime}`;
    this.finalTime.dateTime = `PT${Math.floor(summary.timing.finalTimeMs / 1_000)}S`;
    this.errors.textContent = `${ENGLISH_COPY.errors}: ${summary.errorCount} / ${summary.maximumErrors}`;
    this.perfectRun.textContent = ENGLISH_COPY.perfectRun;
    this.perfectRun.hidden = summary.errorCount !== 0;
    this.setBusy(false);
    this.element.hidden = false;
    this.playAgainButton.focus({ preventScroll: true });
  }

  public hide(): void {
    this.element.hidden = true;
  }

  public dispose(): void {
    this.playAgainButton.removeEventListener('click', this.handlePlayAgain);
    this.playAgainHandler = null;
    this.element.remove();
  }

  private setBusy(busy: boolean): void {
    this.busy = busy;
    this.playAgainButton.disabled = busy;
    this.playAgainButton.setAttribute('aria-busy', String(busy));
  }

  private readonly handlePlayAgain = (): void => {
    if (this.busy || this.playAgainHandler === null) {
      return;
    }

    this.setBusy(true);
    void this.runPlayAgainHandler();
  };

  private async runPlayAgainHandler(): Promise<void> {
    try {
      await this.playAgainHandler?.();
    } catch (error: unknown) {
      console.error('Unable to start another run.', error);
      this.setBusy(false);
    }
  }
}
