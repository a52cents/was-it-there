import { describe, expect, it } from 'vitest';
import type { RunTimerSnapshot } from '../../src/app/RunTimer';
import { PhaseTimerDisplay } from '../../src/ui/PhaseTimerDisplay';

class FakeDocument {
  public readonly elements: FakeElement[] = [];

  public createElement(): FakeElement {
    const element = new FakeElement(this);
    this.elements.push(element);
    return element;
  }
}

class FakeElement {
  public className = '';
  public hidden = false;
  public textContent = '';
  public dateTime = '';

  public constructor(public readonly ownerDocument: FakeDocument) {}

  public append(..._children: FakeElement[]): void {}
  public remove(): void {}
  public setAttribute(_name: string, _value: string): void {}
}

const OBSERVATION_SNAPSHOT: RunTimerSnapshot = {
  started: true,
  running: true,
  finished: false,
  activeTimeMs: 0,
  penaltyTimeMs: 0,
  finalTimeMs: 0,
  phase: {
    phase: 'observation',
    durationMs: 10_000,
    elapsedMs: 0,
    remainingMs: 10_000,
    expired: false,
  },
};

describe('PhaseTimerDisplay', () => {
  it('uses the authored Story examination mission without changing the default', () => {
    const document = new FakeDocument();
    const root = new FakeElement(document);
    const display = new PhaseTimerDisplay(root as unknown as HTMLElement);
    const label = document.elements.find(
      (element) => element.className === 'phase-timer-label',
    );

    display.update('observation', OBSERVATION_SNAPSHOT);
    expect(label?.textContent).toBe('MEMORIZE THE ROOM');

    display.update(
      'observation',
      OBSERVATION_SNAPSHOT,
      'EXAMINE THE ROOM',
    );
    expect(label?.textContent).toBe('EXAMINE THE ROOM');
  });
});
