import { describe, expect, it } from 'vitest';
import { RoomCompleteBanner } from '../../src/ui/RoomCompleteBanner';

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
  public hidden = false;
  public textContent: string | null = null;
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

describe('RoomCompleteBanner', () => {
  it('keeps a required Story objective visible until the exit unlocks', () => {
    const document = new FakeDocument();
    const root = document.createElement('div');
    const banner = new RoomCompleteBanner(root as unknown as HTMLElement);
    const element = getElement(document, 'room-complete-banner');
    const instruction = getElement(
      document,
      'room-complete-banner__instruction',
    );

    banner.show(
      { instruction: 'EXAMINE THE ROOM', persistent: true },
      0,
    );
    banner.update(60_000);

    expect(element.hidden).toBe(false);
    expect(element.classList.contains('is-persistent')).toBe(true);
    expect(instruction.textContent).toBe('EXAMINE THE ROOM');

    banner.show({}, 60_000);
    expect(element.classList.contains('is-persistent')).toBe(false);
    expect(instruction.textContent).toBe('THE EXIT IS OPEN');
    banner.update(62_400);
    expect(element.hidden).toBe(true);
  });
});
