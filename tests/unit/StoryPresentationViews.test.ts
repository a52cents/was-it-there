import { describe, expect, it } from 'vitest';
import { StoryMemoryView } from '../../src/ui/StoryMemoryView';
import { StorySubtitleView } from '../../src/ui/StorySubtitleView';

class FakeDocument {
  public readonly elements: FakeElement[] = [];

  public createElement(tagName: string): FakeElement {
    const element = new FakeElement(this, tagName);
    this.elements.push(element);
    return element;
  }
}

class FakeElement {
  public className = '';
  public hidden = false;
  public textContent: string | null = null;
  public removed = false;
  public readonly children: unknown[] = [];
  public readonly dataset: Record<string, string> = {};

  public constructor(
    public readonly ownerDocument: FakeDocument,
    public readonly tagName: string,
  ) {}

  public setAttribute(_name: string, _value: string): void {}

  public append(...children: unknown[]): void {
    this.children.push(...children);
  }

  public remove(): void {
    this.removed = true;
  }
}

function getElement(
  document: FakeDocument,
  className: string,
): FakeElement {
  const element = document.elements.find(
    (candidate) => candidate.className === className,
  );

  if (element === undefined) {
    throw new Error(`Missing fake element .${className}.`);
  }

  return element;
}

describe('Story presentation views', () => {
  it('times subtitles using gameplay time and freezes them while paused', () => {
    const document = new FakeDocument();
    const root = document.createElement('div');
    const view = new StorySubtitleView(root as unknown as HTMLElement);
    const element = getElement(document, 'story-subtitle');
    const speaker = getElement(document, 'story-subtitle__speaker');
    const text = getElement(document, 'story-subtitle__text');

    view.show({ speaker: 'RADIO', text: 'The house forgot—', durationMs: 3_000 });
    expect(element.hidden).toBe(false);
    expect(speaker.textContent).toBe('RADIO');
    expect(text.textContent).toBe('The house forgot—');

    view.update(1_000);
    view.pause();
    view.update(10_000);
    expect(element.hidden).toBe(false);

    view.resume();
    view.update(2_000);
    expect(element.hidden).toBe(true);
  });

  it('shows and fully restores the bedroom memory overlay', () => {
    const document = new FakeDocument();
    const root = document.createElement('div');
    const view = new StoryMemoryView(root as unknown as HTMLElement);
    const element = getElement(document, 'story-memory');

    expect(element.hidden).toBe(true);
    view.show('bedroom-empty-place');
    expect(element.hidden).toBe(false);
    expect(element.dataset.effect).toBe('bedroom-empty-place');

    view.update(3_400);
    expect(element.hidden).toBe(true);
    expect(element.dataset.effect).toBeUndefined();

    view.dispose();
    expect(element.removed).toBe(true);
  });
});
