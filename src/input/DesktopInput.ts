import type { InputAction } from './InputActions';
import type {
  DesktopInputDocument,
  DesktopInputOptions,
  DesktopInputWindow,
  PointerLockCanvas,
} from './types';

const KEYBOARD_ACTIONS = new Map<string, InputAction>([
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
]);

const PREVENT_DEFAULT_CODES = new Set([...KEYBOARD_ACTIONS.keys(), 'Space']);
const POINTER_LOCK_REQUEST_TIMEOUT_MS = 1_500;
const PRIMARY_MOUSE_BUTTON = 0;

export class PointerLockRequestError extends Error {
  public constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'PointerLockRequestError';
  }
}

export class DesktopInput {
  private readonly inputManager: DesktopInputOptions['inputManager'];
  private readonly canvas: PointerLockCanvas;
  private readonly document: DesktopInputDocument;
  private readonly window: DesktopInputWindow;
  private readonly onPointerLockChange:
    | ((locked: boolean) => void)
    | undefined;
  private readonly onPointerLockError: ((error: Error) => void) | undefined;
  private attached = false;
  private restorePauseAfterPointerUnlock = false;

  public constructor(options: DesktopInputOptions) {
    this.inputManager = options.inputManager;
    this.canvas = options.canvas;
    this.document = options.document ?? document;
    this.window = options.window ?? window;
    this.onPointerLockChange = options.onPointerLockChange;
    this.onPointerLockError = options.onPointerLockError;
  }

  public attach(): void {
    if (this.attached) {
      return;
    }

    this.attached = true;
    this.document.addEventListener('keydown', this.handleKeyDown);
    this.document.addEventListener('keyup', this.handleKeyUp);
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.window.addEventListener('mouseup', this.handleMouseUp);
    this.document.addEventListener('mousemove', this.handleMouseMove);
    this.document.addEventListener(
      'pointerlockchange',
      this.handlePointerLockChange,
    );
    this.document.addEventListener(
      'pointerlockerror',
      this.handlePointerLockError,
    );
    this.window.addEventListener('blur', this.handleBlur);
    this.document.addEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
    );
  }

  public detach(): void {
    if (this.attached) {
      this.attached = false;
      this.document.removeEventListener('keydown', this.handleKeyDown);
      this.document.removeEventListener('keyup', this.handleKeyUp);
      this.canvas.removeEventListener('mousedown', this.handleMouseDown);
      this.window.removeEventListener('mouseup', this.handleMouseUp);
      this.document.removeEventListener('mousemove', this.handleMouseMove);
      this.document.removeEventListener(
        'pointerlockchange',
        this.handlePointerLockChange,
      );
      this.document.removeEventListener(
        'pointerlockerror',
        this.handlePointerLockError,
      );
      this.window.removeEventListener('blur', this.handleBlur);
      this.document.removeEventListener(
        'visibilitychange',
        this.handleVisibilityChange,
      );
    }

    this.inputManager.reset();
    this.restorePauseAfterPointerUnlock = false;

    if (this.isPointerLocked()) {
      this.exitPointerLock();
    }
  }

  public async requestPointerLock(): Promise<void> {
    const requestPointerLock = this.canvas.requestPointerLock;

    if (typeof requestPointerLock !== 'function') {
      throw new PointerLockRequestError(
        'Pointer lock is unavailable in this browser or iframe.',
      );
    }

    this.restorePauseAfterPointerUnlock = false;
    this.inputManager.reset();
    this.canvas.focus({ preventScroll: true });

    try {
      const request = Promise.resolve(requestPointerLock.call(this.canvas));
      await this.waitForPointerLock(request);
    } catch (error: unknown) {
      if (error instanceof PointerLockRequestError) {
        throw error;
      }

      throw new PointerLockRequestError(
        'Pointer lock was refused. Click to retry.',
        error,
      );
    }
  }

  public isPointerLocked(): boolean {
    return this.document.pointerLockElement === this.canvas;
  }

  public releasePointerLock(): void {
    this.restorePauseAfterPointerUnlock = false;
    this.inputManager.reset();

    if (this.isPointerLocked()) {
      this.exitPointerLock();
    }
  }

  private isCanvasActive(): boolean {
    return (
      this.isPointerLocked() || this.document.activeElement === this.canvas
    );
  }

  private waitForPointerLock(request: Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;

      const cleanup = (): void => {
        this.document.removeEventListener(
          'pointerlockchange',
          handlePointerLockChange,
        );
        this.document.removeEventListener('pointerlockerror', handleError);
        globalThis.clearTimeout(timeoutId);
      };

      const settle = (callback: () => void): void => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        callback();
      };

      const handlePointerLockChange: EventListener = (): void => {
        if (this.isPointerLocked()) {
          settle(() => resolve());
        }
      };

      const handleError: EventListener = (): void => {
        settle(() => {
          reject(
            new PointerLockRequestError(
              'Pointer lock failed. Check browser or iframe permissions and retry.',
            ),
          );
        });
      };

      this.document.addEventListener(
        'pointerlockchange',
        handlePointerLockChange,
      );
      this.document.addEventListener('pointerlockerror', handleError);
      const timeoutId = globalThis.setTimeout(() => {
        settle(() => {
          reject(
            new PointerLockRequestError(
              'Pointer lock did not respond. Click to retry.',
            ),
          );
        });
      }, POINTER_LOCK_REQUEST_TIMEOUT_MS);

      void request.catch((error: unknown) => {
        const reason =
          error instanceof Error
            ? error
            : new PointerLockRequestError(
                'Pointer lock was refused. Click to retry.',
                error,
              );
        settle(() => reject(reason));
      });

      if (this.isPointerLocked()) {
        settle(() => resolve());
      }
    });
  }

  private exitPointerLock(): void {
    try {
      this.document.exitPointerLock();
    } catch (error: unknown) {
      this.handlePointerLockFailure(
        new PointerLockRequestError('Unable to release pointer lock.', error),
      );
    }
  }

  private resetAfterFocusLoss(): void {
    this.restorePauseAfterPointerUnlock = false;
    this.inputManager.reset();

    if (this.isPointerLocked()) {
      this.exitPointerLock();
    }
  }

  private handlePointerLockFailure(error: Error): void {
    this.restorePauseAfterPointerUnlock = false;
    this.inputManager.reset();
    this.onPointerLockError?.(error);
  }

  private readonly handleKeyDown: EventListener = (event): void => {
    const keyboardEvent = event as KeyboardEvent;
    const action = KEYBOARD_ACTIONS.get(keyboardEvent.code);

    if (
      !this.isCanvasActive() ||
      keyboardEvent.ctrlKey ||
      keyboardEvent.metaKey ||
      keyboardEvent.altKey
    ) {
      return;
    }

    if (PREVENT_DEFAULT_CODES.has(keyboardEvent.code)) {
      keyboardEvent.preventDefault();
    }

    if (action === undefined) {
      return;
    }

    // Repeated keydown events reuse the same source and cannot add transitions.
    this.inputManager.setActionPressed(
      action,
      true,
      `keyboard:${keyboardEvent.code}`,
    );

    if (keyboardEvent.code === 'Escape' && this.isPointerLocked()) {
      this.restorePauseAfterPointerUnlock = true;
      this.exitPointerLock();
    }
  };

  private readonly handleKeyUp: EventListener = (event): void => {
    const keyboardEvent = event as KeyboardEvent;
    const action = KEYBOARD_ACTIONS.get(keyboardEvent.code);

    if (this.isCanvasActive() && PREVENT_DEFAULT_CODES.has(keyboardEvent.code)) {
      keyboardEvent.preventDefault();
    }

    if (action !== undefined) {
      this.inputManager.setActionPressed(
        action,
        false,
        `keyboard:${keyboardEvent.code}`,
      );
    }
  };

  private readonly handleMouseDown: EventListener = (event): void => {
    const mouseEvent = event as MouseEvent;

    if (mouseEvent.button !== PRIMARY_MOUSE_BUTTON || !this.isPointerLocked()) {
      return;
    }

    mouseEvent.preventDefault();

    // A resume click happens before lock is restored, so it cannot leak here.
    this.inputManager.setActionPressed('interact', true, 'mouse:primary');
  };

  private readonly handleMouseUp: EventListener = (event): void => {
    const mouseEvent = event as MouseEvent;

    if (mouseEvent.button === PRIMARY_MOUSE_BUTTON) {
      this.inputManager.setActionPressed(
        'interact',
        false,
        'mouse:primary',
      );
    }
  };

  private readonly handleMouseMove: EventListener = (event): void => {
    if (!this.isPointerLocked()) {
      return;
    }

    const mouseEvent = event as MouseEvent;
    this.inputManager.addPointerDelta(
      mouseEvent.movementX,
      mouseEvent.movementY,
    );
  };

  private readonly handlePointerLockChange: EventListener = (): void => {
    const locked = this.isPointerLocked();

    if (!locked) {
      const restorePause = this.restorePauseAfterPointerUnlock;
      this.restorePauseAfterPointerUnlock = false;
      this.inputManager.reset();

      if (restorePause) {
        this.inputManager.setActionPressed(
          'pause',
          true,
          'keyboard:Escape',
        );
      }
    }

    this.onPointerLockChange?.(locked);
  };

  private readonly handlePointerLockError: EventListener = (): void => {
    this.handlePointerLockFailure(
      new PointerLockRequestError(
        'Pointer lock failed. Check browser or iframe permissions and retry.',
      ),
    );
  };

  private readonly handleBlur: EventListener = (): void => {
    this.resetAfterFocusLoss();
  };

  private readonly handleVisibilityChange: EventListener = (): void => {
    if (this.document.hidden) {
      this.resetAfterFocusLoss();
    }
  };
}
