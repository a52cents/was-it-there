const PAUSE_COPY = {
  eyebrow: 'SESSION SUSPENDED',
  title: 'PAUSED',
  description: 'The room is hidden. When you return, trust your memory.',
  hint: 'ESC OR CLICK TO CONTINUE',
} as const;

type NotebookHandler = () => void;

export class PauseScreen {
  private readonly element: HTMLElement;
  private readonly actionButton: HTMLButtonElement;
  private readonly notebookButton: HTMLButtonElement;
  private notebookHandler: NotebookHandler | null = null;

  public constructor(
    root: HTMLElement,
    actionButton: HTMLButtonElement,
    notebookHandler: NotebookHandler | null = null,
  ) {
    const document = root.ownerDocument;
    this.notebookHandler = notebookHandler;
    this.actionButton = actionButton;
    this.actionButton.classList.add('pause-resume-button');
    this.actionButton.hidden = false;

    this.element = document.createElement('section');
    this.element.className = 'pause-screen';
    this.element.hidden = true;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-labelledby', 'pause-screen-title');

    const atmosphere = document.createElement('div');
    atmosphere.className = 'pause-screen__atmosphere';
    atmosphere.setAttribute('aria-hidden', 'true');

    const panel = document.createElement('div');
    panel.className = 'pause-screen__panel';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'pause-screen__eyebrow';
    eyebrow.textContent = PAUSE_COPY.eyebrow;

    const title = document.createElement('h2');
    title.id = 'pause-screen-title';
    title.textContent = PAUSE_COPY.title;

    const description = document.createElement('p');
    description.className = 'pause-screen__description';
    description.textContent = PAUSE_COPY.description;

    const hint = document.createElement('p');
    hint.className = 'pause-screen__hint';
    hint.textContent = PAUSE_COPY.hint;

    const actions = document.createElement('div');
    actions.className = 'pause-screen__actions';
    this.notebookButton = document.createElement('button');
    this.notebookButton.type = 'button';
    this.notebookButton.className = 'pause-screen__notebook';
    this.notebookButton.textContent = 'OPEN NOTEBOOK';
    this.notebookButton.addEventListener(
      'click',
      this.handleNotebookClick,
    );
    actions.append(this.actionButton, this.notebookButton);

    panel.append(
      eyebrow,
      title,
      description,
      actions,
      hint,
    );
    this.element.append(atmosphere, panel);
    root.append(this.element);
  }

  public show(actionLabel: string): void {
    this.actionButton.textContent = actionLabel;
    this.actionButton.disabled = false;
    this.notebookButton.disabled = false;
    this.actionButton.setAttribute('aria-busy', 'false');
    this.element.hidden = false;
    this.actionButton.focus({ preventScroll: true });
  }

  public hide(): void {
    this.element.hidden = true;
    this.actionButton.disabled = false;
    this.notebookButton.disabled = false;
    this.actionButton.setAttribute('aria-busy', 'false');
  }

  public setBusy(busy: boolean): void {
    this.actionButton.disabled = busy;
    this.notebookButton.disabled = busy;
    this.actionButton.setAttribute('aria-busy', String(busy));
  }

  public dispose(): void {
    this.notebookButton.removeEventListener(
      'click',
      this.handleNotebookClick,
    );
    this.notebookHandler = null;
    this.element.remove();
  }

  private readonly handleNotebookClick = (): void => {
    if (!this.notebookButton.disabled) {
      this.notebookHandler?.();
    }
  };
}
