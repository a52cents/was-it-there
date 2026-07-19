export class StoryIntroScreen {
  private readonly element: HTMLElement;
  private readonly continueButton: HTMLButtonElement;
  private continueResolver: (() => void) | null = null;

  public constructor(root: HTMLElement) {
    const document = root.ownerDocument;
    this.element = document.createElement('section');
    this.element.className = 'story-intro-screen';
    this.element.hidden = true;
    this.element.setAttribute('aria-labelledby', 'story-intro-title');

    const panel = document.createElement('div');
    panel.className = 'story-intro-screen__panel';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'story-intro-screen__eyebrow';
    eyebrow.textContent = 'LOOP 01';

    const title = document.createElement('h2');
    title.id = 'story-intro-title';
    title.textContent = '03:17';

    const message = document.createElement('p');
    message.className = 'story-intro-screen__message';
    message.append(
      'The house forgot someone.',
      document.createElement('br'),
      'Find what changed before it forgets you.',
    );

    this.continueButton = document.createElement('button');
    this.continueButton.type = 'button';
    this.continueButton.className = 'story-intro-screen__continue';
    this.continueButton.textContent = 'WAKE UP';
    this.continueButton.addEventListener('click', this.handleContinue);

    panel.append(eyebrow, title, message, this.continueButton);
    this.element.append(panel);
    root.append(this.element);
  }

  public present(): Promise<void> {
    if (this.continueResolver !== null) {
      return Promise.reject(
        new Error('Story introduction is already being presented.'),
      );
    }

    this.element.hidden = false;
    this.continueButton.focus({ preventScroll: true });

    return new Promise((resolve) => {
      this.continueResolver = resolve;
    });
  }

  public hide(): void {
    this.element.hidden = true;
  }

  public dispose(): void {
    this.continueButton.removeEventListener('click', this.handleContinue);
    this.hide();
    const resolve = this.continueResolver;
    this.continueResolver = null;
    resolve?.();
    this.element.remove();
  }

  private readonly handleContinue = (): void => {
    const resolve = this.continueResolver;

    if (resolve === null) {
      return;
    }

    this.continueResolver = null;
    this.hide();
    resolve();
  };
}
