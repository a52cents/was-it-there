import type { GameState } from '../app/GameStateMachine';
import type { RunTimerSnapshot } from '../app/RunTimer';
import { formatRemainingMilliseconds } from '../core/time/TimeFormatting';

const PHASE_COPY = {
  observation: 'MEMORIZE THE ROOM',
  search: 'WHAT CHANGED?',
  paused: 'PAUSED',
} as const;

export class PhaseTimerDisplay {
  private readonly element: HTMLElement;
  private readonly label: HTMLElement;
  private readonly countdown: HTMLTimeElement;
  private lastLabel = '';
  private lastCountdown = '';

  public constructor(root: HTMLElement) {
    this.element = root.ownerDocument.createElement('section');
    this.element.className = 'phase-timer-display';
    this.element.hidden = true;
    this.element.setAttribute('role', 'timer');
    this.element.setAttribute('aria-live', 'off');

    this.label = root.ownerDocument.createElement('span');
    this.label.className = 'phase-timer-label';
    this.countdown = root.ownerDocument.createElement('time');
    this.countdown.className = 'phase-timer-countdown';
    this.element.append(this.label, this.countdown);
    root.append(this.element);
  }

  public update(state: GameState, timing: RunTimerSnapshot): void {
    if (timing.phase === null) {
      this.element.hidden = true;
      return;
    }

    const label =
      state === 'paused' ? PHASE_COPY.paused : PHASE_COPY[timing.phase.phase];
    const countdown = formatRemainingMilliseconds(timing.phase.remainingMs);

    if (label !== this.lastLabel) {
      this.label.textContent = label;
      this.lastLabel = label;
    }

    if (countdown !== this.lastCountdown) {
      this.countdown.textContent = countdown;
      this.countdown.dateTime = `PT${Math.ceil(timing.phase.remainingMs / 1_000)}S`;
      this.lastCountdown = countdown;
    }

    this.element.setAttribute(
      'aria-label',
      `${label}, ${countdown} remaining`,
    );
    this.element.hidden = false;
  }

  public dispose(): void {
    this.element.remove();
  }
}
