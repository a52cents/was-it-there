import { describe, expect, it, vi } from 'vitest';
import { StartScreen } from '../../src/ui/StartScreen';

class FakeClassList {
  private readonly values = new Set<string>();

  public toggle(name: string, force?: boolean): boolean {
    const enabled = force ?? !this.values.has(name);

    if (enabled) {
      this.values.add(name);
    } else {
      this.values.delete(name);
    }

    return enabled;
  }

  public contains(name: string): boolean {
    return this.values.has(name);
  }
}

class FakeElement {
  public hidden = false;
  public textContent: string | null = null;
  public readonly dataset: Record<string, string> = {};
  public readonly classList = new FakeClassList();
  private readonly attributes = new Map<string, string>();

  public setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  public getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }
}

class FakeButton extends FakeElement {
  public disabled = false;
  private readonly listeners = new Map<string, EventListener>();

  public addEventListener(type: string, listener: EventListener): void {
    this.listeners.set(type, listener);
  }

  public removeEventListener(type: string, listener: EventListener): void {
    if (this.listeners.get(type) === listener) {
      this.listeners.delete(type);
    }
  }

  public click(): void {
    if (this.disabled) {
      return;
    }

    this.listeners.get('click')?.({} as Event);
  }
}

function createStartScreen(): {
  readonly screen: StartScreen;
  readonly root: FakeElement;
  readonly play: FakeButton;
  readonly story: FakeButton;
  readonly escape: FakeButton;
  readonly notebook: FakeButton;
  readonly escapeDescription: FakeElement;
} {
  const root = new FakeElement();
  const title = new FakeElement();
  const play = new FakeButton();
  const story = new FakeButton();
  const escape = new FakeButton();
  const notebook = new FakeButton();
  const escapeDescription = new FakeElement();
  const screen = new StartScreen(
    root as unknown as HTMLElement,
    title as unknown as HTMLHeadingElement,
    play as unknown as HTMLButtonElement,
    story as unknown as HTMLButtonElement,
    escape as unknown as HTMLButtonElement,
    escapeDescription as unknown as HTMLElement,
    notebook as unknown as HTMLButtonElement,
  );

  return {
    screen,
    root,
    play,
    story,
    escape,
    notebook,
    escapeDescription,
  };
}

describe('StartScreen', () => {
  it('defaults to Story and exposes the selected mode to the start handler', () => {
    const { screen, root, play, story, escape } = createStartScreen();
    const start = vi.fn();
    screen.onStart(start);
    screen.setBusy(false);

    expect(story.getAttribute('aria-pressed')).toBe('true');
    expect(story.classList.contains('is-selected')).toBe(true);
    expect(escape.getAttribute('aria-pressed')).toBe('false');
    expect(play.textContent).toBe('BEGIN THE STORY');

    play.click();

    expect(start).toHaveBeenCalledWith('story');
    expect(root.hidden).toBe(true);
    expect(root.getAttribute('aria-hidden')).toBe('true');
  });

  it('lets the player select Escape before starting', () => {
    const { screen, play, story, escape } = createStartScreen();
    const start = vi.fn();
    screen.onStart(start);
    screen.setEscapeUnlocked(true);
    screen.setBusy(false);

    escape.click();

    expect(story.getAttribute('aria-pressed')).toBe('false');
    expect(escape.getAttribute('aria-pressed')).toBe('true');
    expect(escape.classList.contains('is-selected')).toBe(true);
    expect(play.textContent).toBe('START ESCAPE');

    play.click();

    expect(start).toHaveBeenCalledWith('escape');
  });

  it('keeps Escape locked until Story completion is recorded', () => {
    const { screen, escape, escapeDescription } = createStartScreen();
    screen.setBusy(false);

    expect(escape.disabled).toBe(true);
    expect(escape.getAttribute('aria-disabled')).toBe('true');
    expect(escapeDescription.textContent).toBe(
      'Complete Story to unlock Escape.',
    );

    screen.setEscapeUnlocked(true);

    expect(escape.disabled).toBe(false);
    expect(escape.getAttribute('aria-disabled')).toBe('false');
    expect(escapeDescription.textContent).toBe(
      'Find the changes. Race to the exit.',
    );
  });

  it('disables mode selection and starting while loading', () => {
    const { screen, play, story, escape, notebook } = createStartScreen();
    const start = vi.fn();
    screen.onStart(start);

    escape.click();
    play.click();

    expect(start).not.toHaveBeenCalled();
    expect(play.textContent).toBe('PREPARING THE ROOM');
    expect(story.disabled).toBe(true);
    expect(escape.disabled).toBe(true);
    expect(notebook.disabled).toBe(true);
  });

  it('opens the persistent Story notebook from the mode menu', () => {
    const { screen, notebook } = createStartScreen();
    const openNotebook = vi.fn();
    screen.onNotebook(openNotebook);
    screen.setBusy(false);

    notebook.click();

    expect(openNotebook).toHaveBeenCalledOnce();
  });
});
