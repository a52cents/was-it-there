import type { InputAction } from './InputActions';

type MovementAction = Extract<
  InputAction,
  'move-forward' | 'move-backward' | 'move-left' | 'move-right'
>;

interface TouchInputManager {
  setActionPressed(
    action: InputAction,
    pressed: boolean,
    sourceId?: string,
  ): void;
  addPointerDelta(x: number, y: number): void;
}

interface TouchInputOptions {
  readonly inputManager: TouchInputManager;
  readonly canvas: HTMLCanvasElement;
  readonly hudLayer: HTMLElement;
  readonly onPause: () => void;
  readonly detectTouchDevice?: () => boolean;
}

export interface JoystickActions {
  readonly forward: boolean;
  readonly backward: boolean;
  readonly left: boolean;
  readonly right: boolean;
}

const TOUCH_SOURCE_PREFIX = 'touch';
const LOOK_SENSITIVITY_MULTIPLIER = 1.2;
const JOYSTICK_DEAD_ZONE = 0.26;

export function resolveJoystickActions(
  horizontal: number,
  vertical: number,
  deadZone = JOYSTICK_DEAD_ZONE,
): JoystickActions {
  return {
    forward: vertical < -deadZone,
    backward: vertical > deadZone,
    left: horizontal < -deadZone,
    right: horizontal > deadZone,
  };
}

const defaultTouchDetection = (): boolean =>
  window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

export class TouchInput {
  private readonly inputManager: TouchInputManager;
  private readonly canvas: HTMLCanvasElement;
  private readonly onPause: () => void;
  private readonly root: HTMLDivElement;
  private readonly joystick: HTMLDivElement;
  private readonly joystickKnob: HTMLDivElement;
  private readonly actionButton: HTMLButtonElement;
  private readonly pauseButton: HTMLButtonElement;
  private readonly supported: boolean;
  private attached = false;
  private gameplayActive = false;
  private joystickPointerId: number | null = null;
  private lookPointerId: number | null = null;
  private lookX = 0;
  private lookY = 0;

  public constructor(options: TouchInputOptions) {
    this.inputManager = options.inputManager;
    this.canvas = options.canvas;
    this.onPause = options.onPause;
    this.supported = (options.detectTouchDevice ?? defaultTouchDetection)();

    const document = options.hudLayer.ownerDocument;
    this.root = document.createElement('div');
    this.root.className = 'touch-controls';
    this.root.setAttribute('aria-label', 'Touch controls');

    this.joystick = document.createElement('div');
    this.joystick.className = 'touch-controls__joystick';
    this.joystick.setAttribute('aria-label', 'Movement joystick');
    this.joystickKnob = document.createElement('div');
    this.joystickKnob.className = 'touch-controls__joystick-knob';
    this.joystick.append(this.joystickKnob);

    this.actionButton = document.createElement('button');
    this.actionButton.className = 'touch-controls__action';
    this.actionButton.type = 'button';
    this.actionButton.textContent = 'ACTION';
    this.actionButton.disabled = true;

    this.pauseButton = document.createElement('button');
    this.pauseButton.className = 'touch-controls__pause';
    this.pauseButton.type = 'button';
    this.pauseButton.textContent = 'II';
    this.pauseButton.setAttribute('aria-label', 'Pause');

    this.root.append(this.joystick, this.actionButton, this.pauseButton);
    options.hudLayer.append(this.root);
  }

  public get isSupported(): boolean {
    return this.supported;
  }

  public get isActive(): boolean {
    return this.supported && this.attached && this.gameplayActive;
  }

  public attach(): void {
    if (this.attached || !this.supported) {
      return;
    }

    this.attached = true;
    this.canvas.addEventListener('pointerdown', this.handleLookStart);
    this.canvas.addEventListener('pointermove', this.handleLookMove);
    this.canvas.addEventListener('pointerup', this.handleLookEnd);
    this.canvas.addEventListener('pointercancel', this.handleLookEnd);
    this.joystick.addEventListener('pointerdown', this.handleJoystickStart);
    this.joystick.addEventListener('pointermove', this.handleJoystickMove);
    this.joystick.addEventListener('pointerup', this.handleJoystickEnd);
    this.joystick.addEventListener('pointercancel', this.handleJoystickEnd);
    this.actionButton.addEventListener('pointerdown', this.handleActionStart);
    this.actionButton.addEventListener('pointerup', this.handleActionEnd);
    this.actionButton.addEventListener('pointercancel', this.handleActionEnd);
    this.pauseButton.addEventListener('click', this.handlePause);
  }

  public detach(): void {
    if (this.attached) {
      this.canvas.removeEventListener('pointerdown', this.handleLookStart);
      this.canvas.removeEventListener('pointermove', this.handleLookMove);
      this.canvas.removeEventListener('pointerup', this.handleLookEnd);
      this.canvas.removeEventListener('pointercancel', this.handleLookEnd);
      this.joystick.removeEventListener('pointerdown', this.handleJoystickStart);
      this.joystick.removeEventListener('pointermove', this.handleJoystickMove);
      this.joystick.removeEventListener('pointerup', this.handleJoystickEnd);
      this.joystick.removeEventListener('pointercancel', this.handleJoystickEnd);
      this.actionButton.removeEventListener('pointerdown', this.handleActionStart);
      this.actionButton.removeEventListener('pointerup', this.handleActionEnd);
      this.actionButton.removeEventListener('pointercancel', this.handleActionEnd);
      this.pauseButton.removeEventListener('click', this.handlePause);
    }

    this.attached = false;
    this.setGameplayActive(false);
    this.root.remove();
  }

  public setGameplayActive(active: boolean): void {
    this.gameplayActive = this.supported && active;
    this.root.classList.toggle('is-visible', this.gameplayActive);

    if (!this.gameplayActive) {
      this.resetTouches();
    }
  }

  public setActionContext(label: 'ACTION' | 'REPORT' | 'EXAMINE', enabled: boolean): void {
    this.actionButton.textContent = label;
    this.actionButton.disabled = !this.gameplayActive || !enabled;
  }

  private readonly handleLookStart: EventListener = (event): void => {
    const pointerEvent = event as PointerEvent;

    if (
      !this.isActive ||
      pointerEvent.pointerType !== 'touch' ||
      this.lookPointerId !== null
    ) {
      return;
    }

    event.preventDefault();
    this.lookPointerId = pointerEvent.pointerId;
    this.lookX = pointerEvent.clientX;
    this.lookY = pointerEvent.clientY;
    this.capturePointer(this.canvas, pointerEvent.pointerId);
  };

  private readonly handleLookMove: EventListener = (event): void => {
    const pointerEvent = event as PointerEvent;

    if (!this.isActive || pointerEvent.pointerId !== this.lookPointerId) {
      return;
    }

    event.preventDefault();
    const deltaX = pointerEvent.clientX - this.lookX;
    const deltaY = pointerEvent.clientY - this.lookY;
    this.lookX = pointerEvent.clientX;
    this.lookY = pointerEvent.clientY;
    this.inputManager.addPointerDelta(
      deltaX * LOOK_SENSITIVITY_MULTIPLIER,
      deltaY * LOOK_SENSITIVITY_MULTIPLIER,
    );
  };

  private readonly handleLookEnd: EventListener = (event): void => {
    const pointerEvent = event as PointerEvent;

    if (pointerEvent.pointerId === this.lookPointerId) {
      this.lookPointerId = null;
    }
  };

  private readonly handleJoystickStart: EventListener = (event): void => {
    const pointerEvent = event as PointerEvent;

    if (!this.isActive || this.joystickPointerId !== null) {
      return;
    }

    event.preventDefault();
    this.joystickPointerId = pointerEvent.pointerId;
    this.capturePointer(this.joystick, pointerEvent.pointerId);
    this.updateJoystick(pointerEvent);
  };

  private readonly handleJoystickMove: EventListener = (event): void => {
    const pointerEvent = event as PointerEvent;

    if (!this.isActive || pointerEvent.pointerId !== this.joystickPointerId) {
      return;
    }

    event.preventDefault();
    this.updateJoystick(pointerEvent);
  };

  private readonly handleJoystickEnd: EventListener = (event): void => {
    const pointerEvent = event as PointerEvent;

    if (pointerEvent.pointerId !== this.joystickPointerId) {
      return;
    }

    this.joystickPointerId = null;
    this.joystickKnob.style.transform = 'translate3d(0, 0, 0)';
    this.setMovementActions(resolveJoystickActions(0, 0));
  };

  private readonly handleActionStart: EventListener = (event): void => {
    if (!this.isActive || this.actionButton.disabled) {
      return;
    }

    event.preventDefault();
    const pointerEvent = event as PointerEvent;
    this.capturePointer(this.actionButton, pointerEvent.pointerId);
    this.inputManager.setActionPressed('interact', true, `${TOUCH_SOURCE_PREFIX}:action`);
  };

  private readonly handleActionEnd: EventListener = (event): void => {
    event.preventDefault();
    this.inputManager.setActionPressed('interact', false, `${TOUCH_SOURCE_PREFIX}:action`);
  };

  private readonly handlePause = (): void => {
    if (this.isActive) {
      this.onPause();
    }
  };

  private updateJoystick(pointerEvent: PointerEvent): void {
    const bounds = this.joystick.getBoundingClientRect();
    const radius = Math.max(1, Math.min(bounds.width, bounds.height) * 0.38);
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const rawX = pointerEvent.clientX - centerX;
    const rawY = pointerEvent.clientY - centerY;
    const length = Math.hypot(rawX, rawY);
    const scale = length > radius ? radius / length : 1;
    const x = rawX * scale;
    const y = rawY * scale;
    this.joystickKnob.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    this.setMovementActions(resolveJoystickActions(x / radius, y / radius));
  }

  private setMovementActions(actions: JoystickActions): void {
    const states: readonly [MovementAction, boolean][] = [
      ['move-forward', actions.forward],
      ['move-backward', actions.backward],
      ['move-left', actions.left],
      ['move-right', actions.right],
    ];

    for (const [action, pressed] of states) {
      this.inputManager.setActionPressed(
        action,
        pressed,
        `${TOUCH_SOURCE_PREFIX}:joystick`,
      );
    }
  }

  private resetTouches(): void {
    this.joystickPointerId = null;
    this.lookPointerId = null;
    this.joystickKnob.style.transform = 'translate3d(0, 0, 0)';
    this.setMovementActions(resolveJoystickActions(0, 0));
    this.inputManager.setActionPressed('interact', false, `${TOUCH_SOURCE_PREFIX}:action`);
  }

  private capturePointer(element: HTMLElement, pointerId: number): void {
    try {
      element.setPointerCapture(pointerId);
    } catch {
      // Pointer capture is optional on older embedded mobile browsers.
    }
  }
}
