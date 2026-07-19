import type {
  HousePressureLevel,
  HousePressureSnapshot,
} from '../gameplay/story/HousePressureSystem';

const PRESSURE_MESSAGES: Readonly<
  Partial<Record<HousePressureLevel, string>>
> = {
  1: 'THE HOUSE NOTICED.',
  2: 'THE HOUSE IS WATCHING.',
  3: 'IT REMEMBERS YOU.',
};

export class HousePressureView {
  private readonly element: HTMLElement;
  private readonly vignette: HTMLElement;
  private readonly calmPulse: HTMLElement;
  private readonly announcement: HTMLElement;
  private readonly failureMessage: HTMLElement;
  private readonly failureTime: HTMLElement;

  public constructor(root: HTMLElement) {
    const document = root.ownerDocument;
    this.element = document.createElement('div');
    this.element.className = 'house-pressure-overlay';
    this.element.setAttribute('aria-hidden', 'true');

    this.vignette = document.createElement('div');
    this.vignette.className = 'house-pressure-overlay__vignette';
    this.calmPulse = document.createElement('div');
    this.calmPulse.className = 'house-pressure-overlay__calm';

    const failure = document.createElement('div');
    failure.className = 'house-pressure-overlay__failure';
    this.failureMessage = document.createElement('p');
    this.failureMessage.className = 'house-pressure-overlay__message';
    this.failureMessage.textContent = 'IT REMEMBERS YOU';
    this.failureTime = document.createElement('p');
    this.failureTime.className = 'house-pressure-overlay__time';
    this.failureTime.textContent = '03:17';
    failure.append(this.failureMessage, this.failureTime);

    this.announcement = document.createElement('div');
    this.announcement.className = 'house-pressure-announcement';
    this.announcement.setAttribute('role', 'status');
    this.announcement.setAttribute('aria-live', 'polite');

    this.element.append(this.vignette, this.calmPulse, failure);
    root.append(this.element, this.announcement);
    this.reset();
  }

  public apply(snapshot: HousePressureSnapshot): void {
    const failureVisibility = Math.max(
      0,
      (snapshot.failureProgress - 0.18) / 0.82,
    );
    const timeVisibility = Math.max(
      0,
      (snapshot.failureProgress - 0.68) / 0.32,
    );

    this.element.classList.toggle(
      'is-failing',
      snapshot.failureProgress > 0,
    );
    this.element.style.backgroundColor = `rgb(2 3 4 / ${(snapshot.failureProgress * 0.88).toFixed(4)})`;
    this.vignette.style.opacity = snapshot.vignetteOpacity.toFixed(4);
    this.calmPulse.style.opacity = snapshot.calmIntensity.toFixed(4);
    this.failureMessage.style.opacity = failureVisibility.toFixed(4);
    this.failureTime.style.opacity = timeVisibility.toFixed(4);
  }

  public announcePressure(level: HousePressureLevel): void {
    const message = PRESSURE_MESSAGES[level];

    if (message === undefined) {
      return;
    }

    this.announcement.textContent = message;
    this.announcement.dataset.pressure = String(level);
  }

  public reset(): void {
    this.element.classList.remove('is-failing');
    this.element.style.backgroundColor = 'transparent';
    this.vignette.style.opacity = '0';
    this.calmPulse.style.opacity = '0';
    this.failureMessage.style.opacity = '0';
    this.failureTime.style.opacity = '0';
    this.announcement.textContent = '';
    delete this.announcement.dataset.pressure;
  }

  public dispose(): void {
    this.reset();
    this.element.remove();
    this.announcement.remove();
  }
}
