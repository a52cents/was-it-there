import type { StorySubtitleCopy } from '../content/story/StorySubtitleCatalog';

export class StorySubtitleView {
  private readonly element: HTMLElement;
  private readonly speaker: HTMLElement;
  private readonly text: HTMLElement;
  private remainingMs = 0;
  private paused = false;

  public constructor(root: HTMLElement) {
    const document = root.ownerDocument;
    this.element = document.createElement('section');
    this.element.className = 'story-subtitle';
    this.element.hidden = true;
    this.element.setAttribute('role', 'status');
    this.element.setAttribute('aria-live', 'polite');

    this.speaker = document.createElement('span');
    this.speaker.className = 'story-subtitle__speaker';
    this.text = document.createElement('p');
    this.text.className = 'story-subtitle__text';
    this.element.append(this.speaker, this.text);
    root.append(this.element);
  }

  public show(copy: StorySubtitleCopy): void {
    if (!Number.isFinite(copy.durationMs) || copy.durationMs <= 0) {
      throw new RangeError('Story subtitle duration must be positive.');
    }

    this.speaker.textContent = copy.speaker;
    this.text.textContent = copy.text;
    this.remainingMs = copy.durationMs;
    this.element.hidden = false;
  }

  public update(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) {
      throw new RangeError(
        'Story subtitle delta must be finite and non-negative.',
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
