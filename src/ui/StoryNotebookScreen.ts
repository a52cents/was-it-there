import {
  STORY_NOTEBOOK_CATALOG,
  getUnlockedStoryNotebookEntries,
} from '../content/story/StoryNotebookCatalog';
import type { PersistentStoryProgressSnapshot } from '../gameplay/story/StoryProgress';

interface StoryNotebookShowOptions {
  readonly allowErase: boolean;
}

type EraseHandler = () => void;

export class StoryNotebookScreen {
  private readonly document: Document;
  private readonly element: HTMLElement;
  private readonly progressSummary: HTMLElement;
  private readonly collectionSummary: HTMLElement;
  private readonly entryList: HTMLElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly eraseButton: HTMLButtonElement;
  private eraseHandler: EraseHandler | null = null;
  private eraseConfirmationArmed = false;
  private returnFocusTarget: HTMLElement | null = null;
  private currentProgress: PersistentStoryProgressSnapshot | null = null;

  public constructor(root: HTMLElement) {
    this.document = root.ownerDocument;
    this.element = this.document.createElement('section');
    this.element.className = 'story-notebook';
    this.element.hidden = true;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-labelledby', 'story-notebook-title');

    const atmosphere = this.document.createElement('div');
    atmosphere.className = 'story-notebook__atmosphere';
    atmosphere.setAttribute('aria-hidden', 'true');

    const panel = this.document.createElement('div');
    panel.className = 'story-notebook__panel';

    const header = this.document.createElement('header');
    header.className = 'story-notebook__header';
    const eyebrow = this.document.createElement('p');
    eyebrow.className = 'story-notebook__eyebrow';
    eyebrow.textContent = 'RECOVERED RECORD / STORY';
    const title = this.document.createElement('h2');
    title.id = 'story-notebook-title';
    title.textContent = 'THE NOTEBOOK';
    const description = this.document.createElement('p');
    description.textContent =
      'What the house allowed you to remember persists between loops.';
    header.append(eyebrow, title, description);

    const statistics = this.document.createElement('div');
    statistics.className = 'story-notebook__statistics';
    this.progressSummary = this.document.createElement('p');
    this.collectionSummary = this.document.createElement('p');
    statistics.append(this.progressSummary, this.collectionSummary);

    this.entryList = this.document.createElement('div');
    this.entryList.className = 'story-notebook__entries';

    const actions = this.document.createElement('div');
    actions.className = 'story-notebook__actions';
    this.closeButton = this.document.createElement('button');
    this.closeButton.type = 'button';
    this.closeButton.className = 'story-notebook__close';
    this.closeButton.textContent = 'CLOSE NOTEBOOK';
    this.closeButton.addEventListener('click', this.handleClose);
    this.eraseButton = this.document.createElement('button');
    this.eraseButton.type = 'button';
    this.eraseButton.className = 'story-notebook__erase';
    this.eraseButton.textContent = 'ERASE STORY PROGRESS';
    this.eraseButton.addEventListener('click', this.handleErase);
    actions.append(this.closeButton, this.eraseButton);

    panel.append(header, statistics, this.entryList, actions);
    this.element.append(atmosphere, panel);
    root.append(this.element);
    this.document.addEventListener('keydown', this.handleKeyDown);
  }

  public onErase(handler: EraseHandler): void {
    this.eraseHandler = handler;
  }

  public show(
    progress: PersistentStoryProgressSnapshot,
    options: StoryNotebookShowOptions,
  ): void {
    const activeElement = this.document.activeElement;
    this.returnFocusTarget =
      activeElement instanceof HTMLElement ? activeElement : null;
    this.currentProgress = progress;
    this.eraseButton.hidden = !options.allowErase;
    this.resetEraseConfirmation();
    this.renderProgress(progress);
    this.element.hidden = false;
    this.closeButton.focus({ preventScroll: true });
  }

  public refresh(progress: PersistentStoryProgressSnapshot): void {
    this.currentProgress = progress;

    if (!this.element.hidden) {
      this.renderProgress(progress);
    }
  }

  public hide(): void {
    if (this.element.hidden) {
      return;
    }

    this.element.hidden = true;
    this.resetEraseConfirmation();
    this.returnFocusTarget?.focus({ preventScroll: true });
    this.returnFocusTarget = null;
  }

  public dispose(): void {
    this.document.removeEventListener('keydown', this.handleKeyDown);
    this.closeButton.removeEventListener('click', this.handleClose);
    this.eraseButton.removeEventListener('click', this.handleErase);
    this.eraseHandler = null;
    this.element.remove();
  }

  private renderProgress(progress: PersistentStoryProgressSnapshot): void {
    const entries = getUnlockedStoryNotebookEntries(progress);
    this.progressSummary.textContent =
      `LOOPS ${progress.loopNumber} / COMPLETED ${progress.completedLoopCount} / FAILED ${progress.failedLoopCount}`;
    this.collectionSummary.textContent =
      `ENTRIES ${entries.length} / ${STORY_NOTEBOOK_CATALOG.length} / FRAGMENTS ${progress.fragments.length}`;
    this.entryList.replaceChildren();

    for (const entry of entries) {
      const article = this.document.createElement('article');
      article.className = 'story-notebook-entry';
      const category = this.document.createElement('p');
      category.className = 'story-notebook-entry__category';
      category.textContent = entry.category.toUpperCase();
      const title = this.document.createElement('h3');
      title.textContent = entry.title;
      const body = this.document.createElement('p');
      body.className = 'story-notebook-entry__body';
      body.textContent = entry.body;
      article.append(category, title, body);
      this.entryList.append(article);
    }
  }

  private resetEraseConfirmation(): void {
    this.eraseConfirmationArmed = false;
    this.eraseButton.textContent = 'ERASE STORY PROGRESS';
  }

  private readonly handleClose = (): void => {
    this.hide();
  };

  private readonly handleErase = (): void => {
    if (this.eraseHandler === null || this.currentProgress === null) {
      return;
    }

    if (!this.eraseConfirmationArmed) {
      this.eraseConfirmationArmed = true;
      this.eraseButton.textContent = 'CONFIRM ERASE';
      return;
    }

    this.eraseHandler();
    this.resetEraseConfirmation();
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.element.hidden && event.code === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.hide();
    }
  };
}
