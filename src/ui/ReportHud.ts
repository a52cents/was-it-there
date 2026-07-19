import type { GameState } from '../app/GameStateMachine';
import { ENGLISH_COPY } from '../content/strings/en';
import { GAME_TIMING_CONFIG } from '../core/time/GameTimingConfig';

const FEEDBACK_DURATION_MS = 650;
type ReportFeedback = 'correct' | 'incorrect' | 'timeout';

export interface ReportHudView {
  readonly state: GameState;
  readonly remainingCount: number;
  readonly aimedAtTarget: boolean;
  readonly storyInteractionLabel: string | null;
  readonly errorCount: number;
  readonly maximumErrors: number;
}

export class ReportHud {
  private readonly counter: HTMLElement;
  private readonly counterValue: HTMLOutputElement;
  private readonly errors: HTMLElement;
  private readonly errorsValue: HTMLOutputElement;
  private readonly reticle: HTMLElement;
  private readonly reticleSymbol: HTMLSpanElement;
  private readonly interactionLabel: HTMLElement;
  private readonly feedbackLabel: HTMLElement;
  private feedbackOutcome: ReportFeedback | null = null;
  private feedbackEndsAt = 0;

  public constructor(root: HTMLElement) {
    const document = root.ownerDocument;

    this.counter = document.createElement('div');
    this.counter.className = 'changes-left-display';
    this.counter.hidden = true;
    const counterLabel = document.createElement('span');
    counterLabel.className = 'hud-data-label';
    counterLabel.textContent = ENGLISH_COPY.changesLeft;
    this.counterValue = document.createElement('output');
    this.counterValue.className = 'hud-data-value';
    this.counter.append(counterLabel, this.counterValue);

    this.errors = document.createElement('div');
    this.errors.className = 'errors-display';
    this.errors.hidden = true;
    const errorsLabel = document.createElement('span');
    errorsLabel.className = 'hud-data-label';
    errorsLabel.textContent = ENGLISH_COPY.errors;
    this.errorsValue = document.createElement('output');
    this.errorsValue.className = 'hud-errors-value';
    this.errors.append(errorsLabel, this.errorsValue);

    this.reticle = document.createElement('div');
    this.reticle.className = 'target-reticle';
    this.reticle.hidden = true;
    this.reticle.setAttribute('aria-hidden', 'true');

    this.reticleSymbol = document.createElement('span');
    this.reticleSymbol.className = 'target-reticle-symbol';
    this.interactionLabel = document.createElement('span');
    this.interactionLabel.className = 'target-reticle-label';
    this.interactionLabel.hidden = true;
    this.reticle.append(this.reticleSymbol, this.interactionLabel);

    this.feedbackLabel = document.createElement('div');
    this.feedbackLabel.className = 'report-feedback-label';
    this.feedbackLabel.hidden = true;
    this.feedbackLabel.setAttribute('role', 'status');
    this.feedbackLabel.setAttribute('aria-live', 'polite');

    root.append(this.counter, this.errors, this.reticle, this.feedbackLabel);
  }

  public showFeedback(
    outcome: ReportFeedback,
    now = performance.now(),
  ): void {
    this.feedbackOutcome = outcome;
    this.feedbackEndsAt = now + FEEDBACK_DURATION_MS;
  }

  public update(view: ReportHudView, now = performance.now()): void {
    if (this.feedbackOutcome !== null && now >= this.feedbackEndsAt) {
      this.feedbackOutcome = null;
    }

    const searchActive = view.state === 'search';
    const feedbackActive = this.feedbackOutcome !== null;
    const showCompletionFeedback =
      view.state === 'room-complete' && feedbackActive;
    const feedbackVisible =
      feedbackActive && (searchActive || showCompletionFeedback);
    const storyInteractionActive =
      view.storyInteractionLabel !== null && !feedbackActive;

    this.counter.hidden = !searchActive && !showCompletionFeedback;
    this.counterValue.value = String(view.remainingCount);
    this.errors.hidden = !searchActive;
    this.errorsValue.value = `${view.errorCount} / ${view.maximumErrors}`;
    this.errors.classList.toggle('has-errors', view.errorCount > 0);

    this.reticle.hidden =
      !searchActive && !showCompletionFeedback && !storyInteractionActive;
    this.reticle.classList.toggle(
      'is-targeted',
      (searchActive && view.aimedAtTarget && !feedbackActive) ||
        storyInteractionActive,
    );
    this.reticle.classList.toggle('is-story', storyInteractionActive);
    this.reticle.classList.toggle(
      'is-correct',
      this.feedbackOutcome === 'correct',
    );
    this.reticle.classList.toggle(
      'is-incorrect',
      this.feedbackOutcome === 'incorrect' ||
        this.feedbackOutcome === 'timeout',
    );
    this.reticleSymbol.textContent =
      this.feedbackOutcome === 'correct'
        ? '✓'
        : this.feedbackOutcome === 'incorrect' ||
            this.feedbackOutcome === 'timeout'
          ? '×'
          : '';

    const interactionCopy = storyInteractionActive
      ? view.storyInteractionLabel
      : searchActive && view.aimedAtTarget && !feedbackActive
        ? 'REPORT'
        : null;
    this.interactionLabel.hidden = interactionCopy === null;
    this.interactionLabel.textContent = interactionCopy;

    this.feedbackLabel.hidden = !feedbackVisible;
    this.feedbackLabel.classList.toggle(
      'is-correct',
      this.feedbackOutcome === 'correct',
    );
    this.feedbackLabel.classList.toggle(
      'is-incorrect',
      this.feedbackOutcome === 'incorrect' ||
        this.feedbackOutcome === 'timeout',
    );
    this.feedbackLabel.textContent =
      this.feedbackOutcome === 'correct'
        ? ENGLISH_COPY.reportCorrect
        : this.feedbackOutcome === 'incorrect'
          ? `${ENGLISH_COPY.reportIncorrect} · ${formatPenalty(GAME_TIMING_CONFIG.penalties.incorrectReport)}`
          : this.feedbackOutcome === 'timeout'
            ? `${ENGLISH_COPY.searchTimeout} · ${formatPenalty(GAME_TIMING_CONFIG.penalties.timeout)}`
          : '';
  }

  public reset(): void {
    this.feedbackOutcome = null;
    this.feedbackEndsAt = 0;
    this.counter.hidden = true;
    this.errors.hidden = true;
    this.reticle.hidden = true;
    this.interactionLabel.hidden = true;
    this.feedbackLabel.hidden = true;
  }

  public dispose(): void {
    this.counter.remove();
    this.errors.remove();
    this.reticle.remove();
    this.feedbackLabel.remove();
  }
}

function formatPenalty(milliseconds: number): string {
  return `+${milliseconds / 1_000}s`;
}
