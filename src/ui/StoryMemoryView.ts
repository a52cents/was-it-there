export const STORY_SCREEN_EFFECT_IDS = [
  'bedroom-empty-place',
  'bathroom-condensation-failure',
  'corridor-ringing-failure',
] as const;
export type StoryScreenEffectId =
  (typeof STORY_SCREEN_EFFECT_IDS)[number];

const STORY_MEMORY_DURATION_MS = 3_400;

export class StoryMemoryView {
  private readonly element: HTMLElement;
  private remainingMs = 0;
  private paused = false;

  public constructor(root: HTMLElement) {
    const document = root.ownerDocument;
    this.element = document.createElement('aside');
    this.element.className = 'story-memory';
    this.element.hidden = true;
    this.element.setAttribute('aria-hidden', 'true');

    const photograph = document.createElement('div');
    photograph.className = 'story-memory__photograph';
    const figures = document.createElement('div');
    figures.className = 'story-memory__figures';

    for (let index = 0; index < 4; index += 1) {
      const figure = document.createElement('span');
      figure.className =
        index === 2
          ? 'story-memory__figure is-missing'
          : 'story-memory__figure';
      figures.append(figure);
    }

    const caption = document.createElement('p');
    caption.className = 'story-memory__caption';
    caption.textContent = 'FAMILY RECORD // SUBJECT MISSING';
    photograph.append(figures, caption);

    const condensation = document.createElement('div');
    condensation.className = 'story-memory__condensation';
    const warning = document.createElement('p');
    warning.textContent = '03:17';
    condensation.append(warning);

    const ringing = document.createElement('div');
    ringing.className = 'story-memory__ringing';
    const ringCore = document.createElement('span');
    ringCore.setAttribute('aria-hidden', 'true');
    const ringingCaption = document.createElement('p');
    ringingCaption.textContent = 'NO CALLER // 03:17';
    ringing.append(ringCore, ringingCaption);
    this.element.append(photograph, condensation, ringing);
    root.append(this.element);
  }

  public show(effectId: StoryScreenEffectId): void {
    this.element.hidden = true;
    void this.element.offsetWidth;
    this.element.dataset.effect = effectId;
    this.remainingMs = STORY_MEMORY_DURATION_MS;
    this.element.hidden = false;
  }

  public update(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) {
      throw new RangeError(
        'Story memory delta must be finite and non-negative.',
      );
    }

    if (this.paused || this.element.hidden) {
      return;
    }

    this.remainingMs = Math.max(0, this.remainingMs - deltaMs);

    if (this.remainingMs === 0) {
      this.hide();
    }
  }

  public pause(): void {
    this.paused = true;
  }

  public resume(): void {
    this.paused = false;
  }

  public hide(): void {
    this.remainingMs = 0;
    this.element.hidden = true;
    delete this.element.dataset.effect;
  }

  public reset(): void {
    this.paused = false;
    this.hide();
  }

  public dispose(): void {
    this.reset();
    this.element.remove();
  }
}
