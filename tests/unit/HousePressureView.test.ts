import { describe, expect, it } from 'vitest';
import type { HousePressureSnapshot } from '../../src/gameplay/story/HousePressureSystem';
import { HousePressureView } from '../../src/ui/HousePressureView';

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

  public remove(value: string): void {
    this.values.delete(value);
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
  public textContent: string | null = null;
  public removed = false;
  public readonly children: unknown[] = [];
  public readonly classList = new FakeClassList();
  public readonly dataset: Record<string, string> = {};
  public readonly style: Record<string, string> = {};

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

const FAILURE_SNAPSHOT: HousePressureSnapshot = {
  pressureLevel: 3,
  lightMultiplier: 0.25,
  coldShift: 0.6,
  calmIntensity: 0,
  vignetteOpacity: 0.8,
  failureProgress: 0.75,
  failureComplete: false,
};

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

describe('HousePressureView', () => {
  it('starts neutral and renders the failure presentation', () => {
    const document = new FakeDocument();
    const root = document.createElement('div');
    const view = new HousePressureView(root as unknown as HTMLElement);
    const overlay = getElement(document, 'house-pressure-overlay');
    const vignette = getElement(
      document,
      'house-pressure-overlay__vignette',
    );
    const time = getElement(document, 'house-pressure-overlay__time');

    expect(vignette.style.opacity).toBe('0');
    expect(time.style.opacity).toBe('0');

    view.apply(FAILURE_SNAPSHOT);

    expect(overlay.classList.contains('is-failing')).toBe(true);
    expect(vignette.style.opacity).toBe('0.8000');
    expect(Number(time.style.opacity)).toBeGreaterThan(0);
  });

  it('announces pressure accessibly and cleans up its elements', () => {
    const document = new FakeDocument();
    const root = document.createElement('div');
    const view = new HousePressureView(root as unknown as HTMLElement);
    const overlay = getElement(document, 'house-pressure-overlay');
    const announcement = getElement(document, 'house-pressure-announcement');

    view.announcePressure(2);
    expect(announcement.textContent).toBe('THE HOUSE IS WATCHING.');
    expect(announcement.dataset.pressure).toBe('2');

    view.dispose();
    expect(overlay.removed).toBe(true);
    expect(announcement.removed).toBe(true);
  });
});
