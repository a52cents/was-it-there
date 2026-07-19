import { describe, expect, it } from 'vitest';
import { StoryIntroScreen } from '../../src/ui/StoryIntroScreen';

type FakeListener = (event: Event) => void;

class FakeDocument {
  public readonly elements: FakeElement[] = [];

  public createElement(tagName: string): FakeElement {
    const element = new FakeElement(this, tagName);
    this.elements.push(element);
    return element;
  }
}

class FakeElement {
  public hidden = false;
  public id = '';
  public className = '';
  public textContent: string | null = null;
  public type = '';
  public removed = false;
  public focused = false;
  public readonly children: unknown[] = [];
  private readonly listeners = new Map<string, FakeListener>();

  public constructor(
    public readonly ownerDocument: FakeDocument,
    public readonly tagName: string,
  ) {}

  public setAttribute(_name: string, _value: string): void {}

  public append(...children: unknown[]): void {
    this.children.push(...children);
  }

  public addEventListener(type: string, listener: FakeListener): void {
    this.listeners.set(type, listener);
  }

  public removeEventListener(type: string, listener: FakeListener): void {
    if (this.listeners.get(type) === listener) {
      this.listeners.delete(type);
    }
  }

  public focus(): void {
    this.focused = true;
  }

  public click(): void {
    this.listeners.get('click')?.({} as Event);
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

describe('StoryIntroScreen', () => {
  it('waits for an explicit wake-up action before resolving', async () => {
    const document = new FakeDocument();
    const root = document.createElement('div');
    const screen = new StoryIntroScreen(root as unknown as HTMLElement);
    const element = getElement(document, 'story-intro-screen');
    const button = getElement(document, 'story-intro-screen__continue');

    const continued = screen.present();

    expect(element.hidden).toBe(false);
    expect(button.focused).toBe(true);

    button.click();
    await continued;

    expect(element.hidden).toBe(true);
  });

  it('resolves a pending introduction when disposed', async () => {
    const document = new FakeDocument();
    const root = document.createElement('div');
    const screen = new StoryIntroScreen(root as unknown as HTMLElement);
    const element = getElement(document, 'story-intro-screen');
    const continued = screen.present();

    screen.dispose();
    await continued;

    expect(element.hidden).toBe(true);
    expect(element.removed).toBe(true);
  });
});
