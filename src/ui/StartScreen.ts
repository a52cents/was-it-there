import type { GameMode } from "../gameplay/run/GameMode";

const START_SCREEN_COPY = {
  title: "WAS IT THERE?",
  loading: "LOADING",
  modes: {
    story: {
      play: "ENTER THE HOUSE",
    },
    escape: {
      play: "START ESCAPE",
    },
  },
  escapeLocked: "Complete Story to unlock Escape.",
  escapeUnlocked: "Find the changes. Race to the exit.",
} as const;

type StartHandler = (mode: GameMode) => Promise<void> | void;
type NotebookHandler = () => void;

export class StartScreen {
  private startHandler: StartHandler | null = null;
  private notebookHandler: NotebookHandler | null = null;
  private busy = true;
  private selectedMode: GameMode = "story";
  private escapeUnlocked = false;

  public constructor(
    private readonly root: HTMLElement,
    title: HTMLHeadingElement,
    private readonly playButton: HTMLButtonElement,
    private readonly storyModeButton: HTMLButtonElement,
    private readonly escapeModeButton: HTMLButtonElement,
    private readonly escapeModeDescription: HTMLElement,
    private readonly notebookButton: HTMLButtonElement,
    private readonly loader: HTMLElement,
    private readonly loaderLabel: HTMLElement,
    private readonly loaderValue: HTMLElement,
    private readonly loaderTrack: HTMLElement,
    private readonly loaderBar: HTMLElement,
  ) {
    title.setAttribute("aria-label", START_SCREEN_COPY.title);
    this.playButton.textContent = START_SCREEN_COPY.loading;
    this.playButton.disabled = true;
    this.storyModeButton.disabled = true;
    this.escapeModeButton.disabled = true;
    this.notebookButton.disabled = true;
    this.loader.hidden = false;
    this.playButton.addEventListener("click", this.handlePlayClick);
    this.storyModeButton.addEventListener("click", this.handleStoryModeClick);
    this.escapeModeButton.addEventListener("click", this.handleEscapeModeClick);
    this.notebookButton.addEventListener("click", this.handleNotebookClick);
    this.setEscapeUnlocked(false);
  }

  public onStart(handler: StartHandler): void {
    this.startHandler = handler;
  }

  public onNotebook(handler: NotebookHandler): void {
    this.notebookHandler = handler;
  }

  public setBusy(busy: boolean): void {
    this.busy = busy;
    this.playButton.disabled = busy;
    this.storyModeButton.disabled = busy;
    this.escapeModeButton.disabled = busy || !this.escapeUnlocked;
    this.notebookButton.disabled = busy;
    this.playButton.textContent = busy
      ? START_SCREEN_COPY.loading
      : START_SCREEN_COPY.modes[this.selectedMode].play;
    this.playButton.setAttribute("aria-busy", String(busy));
    this.root.classList.toggle("is-loading", busy);
    this.loader.hidden = !busy;
  }

  public setLoadingProgress(progress: number, label: string): void {
    const normalizedProgress = Number.isFinite(progress)
      ? Math.min(Math.max(progress, 0), 1)
      : 0;
    const percentage = Math.round(normalizedProgress * 100);

    this.loaderLabel.textContent = label;
    this.loaderValue.textContent = `${percentage}%`;
    this.loaderTrack.setAttribute("aria-valuenow", String(percentage));
    this.loaderBar.style.transform = `scaleX(${normalizedProgress})`;
  }

  public setEscapeUnlocked(unlocked: boolean): void {
    this.escapeUnlocked = unlocked;

    if (!unlocked && this.selectedMode === "escape") {
      this.selectedMode = "story";
      this.playButton.textContent = START_SCREEN_COPY.modes.story.play;
    }

    this.escapeModeButton.disabled = this.busy || !unlocked;
    this.escapeModeButton.setAttribute("aria-disabled", String(!unlocked));
    this.escapeModeButton.dataset.locked = String(!unlocked);
    this.escapeModeDescription.textContent = unlocked
      ? START_SCREEN_COPY.escapeUnlocked
      : START_SCREEN_COPY.escapeLocked;
    this.renderModeSelection();
  }

  public show(): void {
    this.root.hidden = false;
    this.root.setAttribute("aria-hidden", "false");
  }

  public hide(): void {
    this.root.hidden = true;
    this.root.setAttribute("aria-hidden", "true");
  }

  public dispose(): void {
    this.playButton.removeEventListener("click", this.handlePlayClick);
    this.storyModeButton.removeEventListener(
      "click",
      this.handleStoryModeClick,
    );
    this.escapeModeButton.removeEventListener(
      "click",
      this.handleEscapeModeClick,
    );
    this.notebookButton.removeEventListener("click", this.handleNotebookClick);
    this.startHandler = null;
    this.notebookHandler = null;
  }

  private selectMode(mode: GameMode): void {
    if (
      this.busy ||
      this.selectedMode === mode ||
      (mode === "escape" && !this.escapeUnlocked)
    ) {
      return;
    }

    this.selectedMode = mode;
    this.renderModeSelection();
    this.playButton.textContent = START_SCREEN_COPY.modes[mode].play;
  }

  private renderModeSelection(): void {
    const storySelected = this.selectedMode === "story";
    this.storyModeButton.classList.toggle("is-selected", storySelected);
    this.storyModeButton.setAttribute("aria-pressed", String(storySelected));
    this.escapeModeButton.classList.toggle("is-selected", !storySelected);
    this.escapeModeButton.setAttribute("aria-pressed", String(!storySelected));
  }

  private readonly handleStoryModeClick = (): void => {
    this.selectMode("story");
  };

  private readonly handleEscapeModeClick = (): void => {
    this.selectMode("escape");
  };

  private readonly handleNotebookClick = (): void => {
    if (!this.busy) {
      this.notebookHandler?.();
    }
  };

  private readonly handlePlayClick = (): void => {
    if (this.busy || this.startHandler === null) {
      return;
    }

    const mode = this.selectedMode;
    this.setBusy(true);
    this.hide();
    void this.runStartHandler(mode);
  };

  private async runStartHandler(mode: GameMode): Promise<void> {
    try {
      await this.startHandler?.(mode);
    } catch (error: unknown) {
      this.show();
      console.error("Unable to start the game experience.", error);
    } finally {
      this.setBusy(false);
    }
  }
}
