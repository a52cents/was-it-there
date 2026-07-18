import { describe, expect, it } from 'vitest';
import {
  DesktopInput,
  PointerLockRequestError,
} from '../../src/input/DesktopInput';
import type { InputAction } from '../../src/input/InputActions';
import { InputManager } from '../../src/input/InputManager';
import type {
  DesktopInputDocument,
  DomEventSource,
  PointerLockCanvas,
} from '../../src/input/types';

class FakeEventSource implements DomEventSource {
  private readonly listeners = new Map<
    string,
    Set<EventListenerOrEventListenerObject>
  >();

  public addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
  ): void {
    const listenersForType = this.listeners.get(type) ?? new Set();
    listenersForType.add(listener);
    this.listeners.set(type, listenersForType);
  }

  public removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
  ): void {
    this.listeners.get(type)?.delete(listener);
  }

  public emit(type: string, event = new Event(type)): void {
    for (const listener of this.listeners.get(type) ?? []) {
      if (typeof listener === 'function') {
        listener(event);
      } else {
        listener.handleEvent(event);
      }
    }
  }

  public listenerCount(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}

class FakeDocument
  extends FakeEventSource
  implements DesktopInputDocument
{
  public activeElement: DomEventSource | null = null;
  public hidden = false;
  public pointerLockElement: DomEventSource | null = null;

  public exitPointerLock(): void {
    this.pointerLockElement = null;
    this.emit('pointerlockchange');
  }
}

class FakeCanvas extends FakeEventSource implements PointerLockCanvas {
  public constructor(private readonly document: FakeDocument) {
    super();
  }

  public focus(_options?: FocusOptions): void {
    this.document.activeElement = this;
  }

  public requestPointerLock(): Promise<void> {
    this.document.pointerLockElement = this;
    this.document.emit('pointerlockchange');
    return Promise.resolve();
  }
}

class FakeCanvasWithoutPointerLock
  extends FakeEventSource
  implements PointerLockCanvas
{
  public focus(_options?: FocusOptions): void {
    // The unavailable path fails before focus is needed.
  }
}

interface DesktopInputHarness {
  readonly canvas: FakeCanvas;
  readonly desktopInput: DesktopInput;
  readonly document: FakeDocument;
  readonly input: InputManager;
  readonly window: FakeEventSource;
}

function createHarness(): DesktopInputHarness {
  const document = new FakeDocument();
  const canvas = new FakeCanvas(document);
  const window = new FakeEventSource();
  const input = new InputManager();
  const desktopInput = new DesktopInput({
    inputManager: input,
    canvas,
    document,
    window,
  });

  return { canvas, desktopInput, document, input, window };
}

function createKeyboardEvent(
  type: string,
  code: string,
  repeat = false,
): Event {
  const event = new Event(type, { cancelable: true });

  Object.defineProperties(event, {
    code: { value: code },
    repeat: { value: repeat },
    ctrlKey: { value: false },
    metaKey: { value: false },
    altKey: { value: false },
  });

  return event;
}

function createMouseEvent(
  type: string,
  options: { readonly button?: number; readonly x?: number; readonly y?: number },
): Event {
  const event = new Event(type, { cancelable: true });

  Object.defineProperties(event, {
    button: { value: options.button ?? 0 },
    movementX: { value: options.x ?? 0 },
    movementY: { value: options.y ?? 0 },
  });

  return event;
}

function lockPointer(harness: DesktopInputHarness): void {
  harness.document.activeElement = harness.canvas;
  harness.document.pointerLockElement = harness.canvas;
  harness.document.emit('pointerlockchange');
}

function pressKey(harness: DesktopInputHarness, code: string): void {
  harness.document.emit('keydown', createKeyboardEvent('keydown', code));
}

describe('DesktopInput', () => {
  it('attaches each browser listener only once', () => {
    const harness = createHarness();

    harness.desktopInput.attach();
    harness.desktopInput.attach();

    expect(harness.document.listenerCount('keydown')).toBe(1);
    expect(harness.document.listenerCount('keyup')).toBe(1);
    expect(harness.canvas.listenerCount('mousedown')).toBe(1);
    expect(harness.window.listenerCount('mouseup')).toBe(1);
    expect(harness.document.listenerCount('mousemove')).toBe(1);
    expect(harness.document.listenerCount('pointerlockchange')).toBe(1);
    expect(harness.window.listenerCount('blur')).toBe(1);
  });

  it('detaches listeners idempotently and resets active input', () => {
    const harness = createHarness();
    harness.desktopInput.attach();
    lockPointer(harness);
    pressKey(harness, 'KeyW');

    harness.desktopInput.detach();
    harness.desktopInput.detach();

    expect(harness.document.listenerCount('keydown')).toBe(0);
    expect(harness.canvas.listenerCount('mousedown')).toBe(0);
    expect(harness.window.listenerCount('blur')).toBe(0);
    expect(harness.input.isActionPressed('move-forward')).toBe(false);

    pressKey(harness, 'KeyW');
    expect(harness.input.isActionPressed('move-forward')).toBe(false);
  });

  it.each(
    [
      ['KeyW', 'move-forward'],
      ['KeyZ', 'move-forward'],
      ['ArrowUp', 'move-forward'],
      ['KeyS', 'move-backward'],
      ['ArrowDown', 'move-backward'],
      ['KeyA', 'move-left'],
      ['KeyQ', 'move-left'],
      ['ArrowLeft', 'move-left'],
      ['KeyD', 'move-right'],
      ['ArrowRight', 'move-right'],
      ['ShiftLeft', 'move-fast'],
      ['ShiftRight', 'move-fast'],
      ['Escape', 'pause'],
      ['KeyH', 'toggle-debug'],
    ] as const,
  )('maps %s to %s', (code, action: InputAction) => {
    const harness = createHarness();
    harness.desktopInput.attach();
    lockPointer(harness);

    pressKey(harness, code);

    expect(harness.input.isActionPressed(action)).toBe(true);
  });

  it('keeps a shared action active while another mapped key is held', () => {
    const harness = createHarness();
    harness.desktopInput.attach();
    lockPointer(harness);

    pressKey(harness, 'KeyW');
    pressKey(harness, 'KeyZ');
    harness.document.emit('keyup', createKeyboardEvent('keyup', 'KeyW'));

    expect(harness.input.isActionPressed('move-forward')).toBe(true);

    harness.document.emit('keyup', createKeyboardEvent('keyup', 'KeyZ'));

    expect(harness.input.isActionPressed('move-forward')).toBe(false);
  });

  it('does not repeat a press transition during keyboard auto-repeat', () => {
    const harness = createHarness();
    harness.desktopInput.attach();
    lockPointer(harness);
    pressKey(harness, 'KeyW');
    harness.input.endFrame();

    harness.document.emit(
      'keydown',
      createKeyboardEvent('keydown', 'KeyW', true),
    );

    expect(harness.input.isActionPressed('move-forward')).toBe(true);
    expect(harness.input.wasActionPressed('move-forward')).toBe(false);
  });

  it('prevents game keys only while the canvas is active', () => {
    const harness = createHarness();
    harness.desktopInput.attach();
    const inactiveArrow = createKeyboardEvent('keydown', 'ArrowUp');

    harness.document.emit('keydown', inactiveArrow);

    expect(inactiveArrow.defaultPrevented).toBe(false);

    harness.document.activeElement = harness.canvas;
    const activeArrow = createKeyboardEvent('keydown', 'ArrowUp');
    const activeSpace = createKeyboardEvent('keydown', 'Space');
    harness.document.emit('keydown', activeArrow);
    harness.document.emit('keydown', activeSpace);

    expect(activeArrow.defaultPrevented).toBe(true);
    expect(activeSpace.defaultPrevented).toBe(true);
  });

  it('maps the primary mouse button to interact while pointer-locked', () => {
    const harness = createHarness();
    harness.desktopInput.attach();
    lockPointer(harness);

    harness.canvas.emit('mousedown', createMouseEvent('mousedown', {}));

    expect(harness.input.isActionPressed('interact')).toBe(true);

    harness.window.emit('mouseup', createMouseEvent('mouseup', {}));

    expect(harness.input.isActionPressed('interact')).toBe(false);
    expect(harness.input.wasActionReleased('interact')).toBe(true);
  });

  it('resets every input when the window loses focus', () => {
    const harness = createHarness();
    harness.desktopInput.attach();
    lockPointer(harness);
    pressKey(harness, 'KeyW');

    harness.window.emit('blur');

    expect(harness.input.isActionPressed('move-forward')).toBe(false);
  });

  it('resets every input when the document becomes hidden', () => {
    const harness = createHarness();
    harness.desktopInput.attach();
    lockPointer(harness);
    pressKey(harness, 'KeyQ');
    harness.document.hidden = true;

    harness.document.emit('visibilitychange');

    expect(harness.input.isActionPressed('move-left')).toBe(false);
  });

  it('resets every input when pointer lock is lost', () => {
    const harness = createHarness();
    harness.desktopInput.attach();
    lockPointer(harness);
    pressKey(harness, 'ShiftLeft');
    harness.document.pointerLockElement = null;

    harness.document.emit('pointerlockchange');

    expect(harness.input.isActionPressed('move-fast')).toBe(false);
  });

  it('ignores mouse movement without pointer lock', () => {
    const harness = createHarness();
    harness.desktopInput.attach();

    harness.document.emit(
      'mousemove',
      createMouseEvent('mousemove', { x: 8, y: -3 }),
    );

    expect(harness.input.getPointerDelta()).toEqual({ x: 0, y: 0 });
  });

  it('records relative mouse movement while pointer-locked', () => {
    const harness = createHarness();
    harness.desktopInput.attach();
    lockPointer(harness);

    harness.document.emit(
      'mousemove',
      createMouseEvent('mousemove', { x: 8, y: -3 }),
    );
    harness.document.emit(
      'mousemove',
      createMouseEvent('mousemove', { x: -2, y: 5 }),
    );

    expect(harness.input.getPointerDelta()).toEqual({ x: 6, y: 2 });
  });

  it('requests pointer lock only through an explicit call', async () => {
    const harness = createHarness();
    harness.desktopInput.attach();

    expect(harness.desktopInput.isPointerLocked()).toBe(false);

    await harness.desktopInput.requestPointerLock();

    expect(harness.desktopInput.isPointerLocked()).toBe(true);
    expect(harness.document.activeElement).toBe(harness.canvas);
  });

  it('releases pointer lock and clears active input for a terminal screen', () => {
    const harness = createHarness();
    harness.desktopInput.attach();
    lockPointer(harness);
    pressKey(harness, 'KeyW');

    harness.desktopInput.releasePointerLock();

    expect(harness.desktopInput.isPointerLocked()).toBe(false);
    expect(harness.input.isActionPressed('move-forward')).toBe(false);
  });

  it('reports an understandable error when pointer lock is unavailable', async () => {
    const document = new FakeDocument();
    const canvas = new FakeCanvasWithoutPointerLock();
    const desktopInput = new DesktopInput({
      inputManager: new InputManager(),
      canvas,
      document,
      window: new FakeEventSource(),
    });

    await expect(desktopInput.requestPointerLock()).rejects.toThrowError(
      new PointerLockRequestError(
        'Pointer lock is unavailable in this browser or iframe.',
      ),
    );
  });
});
