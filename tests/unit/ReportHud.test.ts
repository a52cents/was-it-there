import { describe, expect, it } from 'vitest';
import { ReportHud } from '../../src/ui/ReportHud';

class FakeClassList {
  private readonly values = new Set<string>();

  public toggle(value: string, force?: boolean): boolean {
    const enabled = force ?? !this.values.has(value);

    if (enabled) {
      this.values.add(value);
    } else {
      this.values.delete(value);
    }

    return enabled;
  }

  public contains(value: string): boolean {
    return this.values.has(value);
  }
}

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
  public value = '';
  public readonly children: unknown[] = [];
  public readonly classList = new FakeClassList();

  public constructor(
    public readonly ownerDocument: FakeDocument,
    public readonly tagName: string,
  ) {}

  public setAttribute(_name: string, _value: string): void {}

  public append(...children: unknown[]): void {
    this.children.push(...children);
  }

  public remove(): void {}
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

describe('ReportHud story prompts', () => {
  it('distinguishes EXAMINE during Story from REPORT during search', () => {
    const document = new FakeDocument();
    const root = document.createElement('div');
    const hud = new ReportHud(root as unknown as HTMLElement);
    const reticle = getElement(document, 'target-reticle');
    const label = getElement(document, 'target-reticle-label');

    hud.update(
      {
        state: 'observation',
        remainingCount: 0,
        aimedAtTarget: true,
        storyInteractionLabel: 'EXAMINE',
        errorCount: 0,
        maximumErrors: 3,
      },
      0,
    );

    expect(reticle.hidden).toBe(false);
    expect(reticle.classList.contains('is-story')).toBe(true);
    expect(label.textContent).toBe('EXAMINE');

    hud.update(
      {
        state: 'search',
        remainingCount: 1,
        aimedAtTarget: true,
        storyInteractionLabel: null,
        errorCount: 0,
        maximumErrors: 3,
      },
      0,
    );

    expect(reticle.classList.contains('is-story')).toBe(false);
    expect(label.textContent).toBe('REPORT');
  });
});
