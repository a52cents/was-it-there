import type { InputAction } from './InputActions';
import type { PointerDelta } from './types';

const DEFAULT_SOURCE_ID = 'default';

export class InputManager {
  private readonly activeSources = new Map<InputAction, Set<string>>();
  private readonly pressedThisFrame = new Set<InputAction>();
  private readonly releasedThisFrame = new Set<InputAction>();
  private readonly pointerDelta: PointerDelta = { x: 0, y: 0 };

  public setActionPressed(
    action: InputAction,
    pressed: boolean,
    sourceId = DEFAULT_SOURCE_ID,
  ): void {
    if (pressed) {
      const sources = this.getActiveSources(action);

      if (sources.has(sourceId)) {
        return;
      }

      const actionWasPressed = sources.size > 0;
      sources.add(sourceId);

      if (!actionWasPressed) {
        this.pressedThisFrame.add(action);
      }

      return;
    }

    const sources = this.activeSources.get(action);

    if (sources === undefined) {
      return;
    }

    if (!sources.delete(sourceId)) {
      return;
    }

    if (sources.size === 0) {
      this.activeSources.delete(action);
      this.releasedThisFrame.add(action);
    }
  }

  public isActionPressed(action: InputAction): boolean {
    return (this.activeSources.get(action)?.size ?? 0) > 0;
  }

  public wasActionPressed(action: InputAction): boolean {
    return this.pressedThisFrame.has(action);
  }

  public wasActionReleased(action: InputAction): boolean {
    return this.releasedThisFrame.has(action);
  }

  public addPointerDelta(x: number, y: number): void {
    this.pointerDelta.x += x;
    this.pointerDelta.y += y;
  }

  public getPointerDelta(): Readonly<PointerDelta> {
    return this.pointerDelta;
  }

  public endFrame(): void {
    this.pressedThisFrame.clear();
    this.releasedThisFrame.clear();
    this.resetPointerDelta();
  }

  public reset(): void {
    this.activeSources.clear();
    this.pressedThisFrame.clear();
    this.releasedThisFrame.clear();
    this.resetPointerDelta();
  }

  private getActiveSources(action: InputAction): Set<string> {
    const currentSources = this.activeSources.get(action);

    if (currentSources !== undefined) {
      return currentSources;
    }

    const sources = new Set<string>();
    this.activeSources.set(action, sources);
    return sources;
  }

  private resetPointerDelta(): void {
    this.pointerDelta.x = 0;
    this.pointerDelta.y = 0;
  }
}
