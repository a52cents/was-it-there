import type { InputAction } from './InputActions';

export interface PointerDelta {
  x: number;
  y: number;
}

export interface DomEventSource {
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
  ): void;
}

export interface PointerLockCanvas extends DomEventSource {
  requestPointerLock?: () => Promise<void> | void;
  focus(options?: FocusOptions): void;
}

export interface DesktopInputDocument extends DomEventSource {
  readonly activeElement: DomEventSource | null;
  readonly hidden: boolean;
  readonly pointerLockElement: DomEventSource | null;
  exitPointerLock(): void;
}

export type DesktopInputWindow = DomEventSource;

export interface DesktopInputOptions {
  readonly inputManager: {
    setActionPressed(
      action: InputAction,
      pressed: boolean,
      sourceId?: string,
    ): void;
    reset(): void;
    addPointerDelta(x: number, y: number): void;
  };
  readonly canvas: PointerLockCanvas;
  readonly document?: DesktopInputDocument;
  readonly window?: DesktopInputWindow;
  readonly onPointerLockChange?: (locked: boolean) => void;
  readonly onPointerLockError?: (error: Error) => void;
}
