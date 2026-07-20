import {
  MAX_LOOK_SENSITIVITY,
  MIN_LOOK_SENSITIVITY,
  type GameSettings,
} from '../settings/SettingsStore';

const PAUSE_COPY = {
  eyebrow: 'SESSION SUSPENDED',
  title: 'PAUSED',
  description: 'The room is hidden. When you return, trust your memory.',
  hint: 'ESC OR CLICK TO CONTINUE',
} as const;

type NotebookHandler = () => void;

export interface PauseScreenOptions {
  readonly notebookHandler?: NotebookHandler | null;
  readonly initialSettings: GameSettings;
  readonly onSettingsChange: (settings: GameSettings) => void;
}

type SliderSetting = keyof GameSettings;

export class PauseScreen {
  private readonly element: HTMLElement;
  private readonly mainPanel: HTMLElement;
  private readonly settingsPanel: HTMLElement;
  private readonly actionButton: HTMLButtonElement;
  private readonly notebookButton: HTMLButtonElement;
  private readonly settingsButton: HTMLButtonElement;
  private readonly backButton: HTMLButtonElement;
  private notebookHandler: NotebookHandler | null;
  private settings: GameSettings;

  public constructor(
    root: HTMLElement,
    actionButton: HTMLButtonElement,
    private readonly options: PauseScreenOptions,
  ) {
    const document = root.ownerDocument;
    this.notebookHandler = options.notebookHandler ?? null;
    this.settings = { ...options.initialSettings };
    this.actionButton = actionButton;
    this.actionButton.classList.add('pause-resume-button');
    this.actionButton.hidden = false;

    this.element = document.createElement('section');
    this.element.className = 'pause-screen';
    this.element.hidden = true;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-labelledby', 'pause-screen-title');
    this.element.addEventListener('keydown', this.handleKeyDown);

    const atmosphere = document.createElement('div');
    atmosphere.className = 'pause-screen__atmosphere';
    atmosphere.setAttribute('aria-hidden', 'true');

    this.mainPanel = document.createElement('div');
    this.mainPanel.className = 'pause-screen__panel';

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
    this.notebookButton = this.createSecondaryButton(
      document,
      'OPEN NOTEBOOK',
    );
    this.notebookButton.addEventListener(
      'click',
      this.handleNotebookClick,
    );
    this.settingsButton = this.createSecondaryButton(document, 'SETTINGS');
    this.settingsButton.addEventListener(
      'click',
      this.handleSettingsClick,
    );
    actions.append(
      this.actionButton,
      this.notebookButton,
      this.settingsButton,
    );

    this.mainPanel.append(eyebrow, title, description, actions, hint);
    this.settingsPanel = this.createSettingsPanel(document);
    this.backButton = this.settingsPanel.querySelector<HTMLButtonElement>(
      '.pause-screen__settings-back',
    ) as HTMLButtonElement;
    this.backButton.addEventListener('click', this.handleBackClick);
    this.settingsPanel.hidden = true;

    this.element.append(atmosphere, this.mainPanel, this.settingsPanel);
    root.append(this.element);
  }

  public show(actionLabel: string): void {
    this.actionButton.textContent = actionLabel;
    this.setBusy(false);
    this.showMainPanel();
    this.element.hidden = false;
    this.actionButton.focus({ preventScroll: true });
  }

  public hide(): void {
    this.element.hidden = true;
    this.setBusy(false);
    this.showMainPanel();
  }

  public setBusy(busy: boolean): void {
    this.actionButton.disabled = busy;
    this.notebookButton.disabled = busy;
    this.settingsButton.disabled = busy;
    this.backButton.disabled = busy;
    this.actionButton.setAttribute('aria-busy', String(busy));
  }

  public dispose(): void {
    this.element.removeEventListener('keydown', this.handleKeyDown);
    this.notebookButton.removeEventListener(
      'click',
      this.handleNotebookClick,
    );
    this.settingsButton.removeEventListener(
      'click',
      this.handleSettingsClick,
    );
    this.backButton.removeEventListener('click', this.handleBackClick);
    this.notebookHandler = null;
    this.element.remove();
  }

  private createSettingsPanel(document: Document): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'pause-screen__panel pause-screen__panel--settings';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'pause-screen__eyebrow';
    eyebrow.textContent = 'PLAYER PREFERENCES';
    const title = document.createElement('h2');
    title.id = 'pause-settings-title';
    title.textContent = 'SETTINGS';
    const description = document.createElement('p');
    description.className = 'pause-screen__description';
    description.textContent = 'Changes are applied immediately and saved.';
    const controls = document.createElement('div');
    controls.className = 'pause-screen__settings-controls';

    controls.append(
      this.createSlider(
        document,
        'CAMERA SENSITIVITY',
        'lookSensitivity',
        MIN_LOOK_SENSITIVITY,
        MAX_LOOK_SENSITIVITY,
        0.05,
        formatSensitivity,
      ),
      this.createSlider(
        document,
        'MASTER VOLUME',
        'masterVolume',
        0,
        1,
        0.05,
        formatVolume,
      ),
      this.createSlider(
        document,
        'MUSIC',
        'musicVolume',
        0,
        1,
        0.05,
        formatVolume,
      ),
      this.createSlider(
        document,
        'AMBIENCE',
        'ambienceVolume',
        0,
        1,
        0.05,
        formatVolume,
      ),
      this.createSlider(
        document,
        'SOUND EFFECTS',
        'effectsVolume',
        0,
        1,
        0.05,
        formatVolume,
      ),
    );

    const backButton = this.createSecondaryButton(document, 'BACK');
    backButton.classList.add('pause-screen__settings-back');
    panel.append(eyebrow, title, description, controls, backButton);
    return panel;
  }

  private createSlider(
    document: Document,
    label: string,
    setting: SliderSetting,
    minimum: number,
    maximum: number,
    step: number,
    formatter: (value: number) => string,
  ): HTMLElement {
    const control = document.createElement('label');
    control.className = 'pause-screen__setting';
    const name = document.createElement('span');
    name.textContent = label;
    const output = document.createElement('output');
    output.value = formatter(this.settings[setting]);
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(minimum);
    input.max = String(maximum);
    input.step = String(step);
    input.value = String(this.settings[setting]);
    input.setAttribute('aria-label', label);
    input.addEventListener('input', () => {
      const value = Number(input.value);
      output.value = formatter(value);
      this.settings = { ...this.settings, [setting]: value };
      this.options.onSettingsChange(this.settings);
    });
    control.append(name, output, input);
    return control;
  }

  private createSecondaryButton(
    document: Document,
    label: string,
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pause-screen__notebook';
    button.textContent = label;
    return button;
  }

  private showMainPanel(): void {
    this.mainPanel.hidden = false;
    this.settingsPanel.hidden = true;
    this.element.setAttribute('aria-labelledby', 'pause-screen-title');
  }

  private showSettingsPanel(): void {
    this.mainPanel.hidden = true;
    this.settingsPanel.hidden = false;
    this.element.setAttribute('aria-labelledby', 'pause-settings-title');
    this.settingsPanel
      .querySelector<HTMLInputElement>('input')
      ?.focus({ preventScroll: true });
  }

  private readonly handleNotebookClick = (): void => {
    if (!this.notebookButton.disabled) {
      this.notebookHandler?.();
    }
  };

  private readonly handleSettingsClick = (): void => {
    if (!this.settingsButton.disabled) {
      this.showSettingsPanel();
    }
  };

  private readonly handleBackClick = (): void => {
    if (!this.backButton.disabled) {
      this.showMainPanel();
      this.settingsButton.focus({ preventScroll: true });
    }
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && !this.settingsPanel.hidden) {
      event.preventDefault();
      event.stopPropagation();
      this.handleBackClick();
    }
  };
}

function formatVolume(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatSensitivity(value: number): string {
  return `${Math.round(value * 100)}%`;
}
