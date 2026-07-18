const START_SCREEN_COPY = {
  title: 'WAS IT THERE?',
  play: 'ENTER THE ROOM',
  loading: 'PREPARING THE ROOM',
} as const;

type StartHandler = () => Promise<void> | void;

export class StartScreen {
  private startHandler: StartHandler | null = null;
  private busy = true;

  public constructor(
    private readonly root: HTMLElement,
    title: HTMLHeadingElement,
    private readonly playButton: HTMLButtonElement,
  ) {
    title.textContent = START_SCREEN_COPY.title;
    title.dataset.text = START_SCREEN_COPY.title;
    this.playButton.textContent = START_SCREEN_COPY.play;
    this.playButton.disabled = true;
    this.playButton.addEventListener('click', this.handlePlayClick);
  }

  public onStart(handler: StartHandler): void {
    this.startHandler = handler;
  }

  public setBusy(busy: boolean): void {
    this.busy = busy;
    this.playButton.disabled = busy;
    this.playButton.textContent = busy
      ? START_SCREEN_COPY.loading
      : START_SCREEN_COPY.play;
    this.playButton.setAttribute('aria-busy', String(busy));
    this.root.classList.toggle('is-loading', busy);
  }

  public show(): void {
    this.root.hidden = false;
    this.root.setAttribute('aria-hidden', 'false');
  }

  public hide(): void {
    this.root.hidden = true;
    this.root.setAttribute('aria-hidden', 'true');
  }

  public dispose(): void {
    this.playButton.removeEventListener('click', this.handlePlayClick);
    this.startHandler = null;
  }

  private readonly handlePlayClick = (): void => {
    if (this.busy || this.startHandler === null) {
      return;
    }

    this.setBusy(true);
    this.hide();
    void this.runStartHandler();
  };

  private async runStartHandler(): Promise<void> {
    try {
      await this.startHandler?.();
    } catch (error: unknown) {
      this.show();
      console.error('Unable to start the game experience.', error);
    } finally {
      this.setBusy(false);
    }
  }
}
