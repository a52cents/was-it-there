import { describe, expect, it } from 'vitest';
import { InputManager } from '../../src/input/InputManager';

describe('InputManager', () => {
  it('starts with actions and pointer movement inactive', () => {
    const input = new InputManager();

    expect(input.isActionPressed('move-forward')).toBe(false);
    expect(input.wasActionPressed('move-forward')).toBe(false);
    expect(input.wasActionReleased('move-forward')).toBe(false);
    expect(input.getPointerDelta()).toEqual({ x: 0, y: 0 });
  });

  it('keeps a held action active while clearing its press transition', () => {
    const input = new InputManager();

    input.setActionPressed('move-forward', true);

    expect(input.isActionPressed('move-forward')).toBe(true);
    expect(input.wasActionPressed('move-forward')).toBe(true);

    input.endFrame();

    expect(input.isActionPressed('move-forward')).toBe(true);
    expect(input.wasActionPressed('move-forward')).toBe(false);

    input.endFrame();

    expect(input.isActionPressed('move-forward')).toBe(true);
    expect(input.wasActionPressed('move-forward')).toBe(false);
  });

  it('reports a release only during the frame where it occurs', () => {
    const input = new InputManager();
    input.setActionPressed('move-left', true);
    input.endFrame();

    input.setActionPressed('move-left', false);

    expect(input.isActionPressed('move-left')).toBe(false);
    expect(input.wasActionReleased('move-left')).toBe(true);

    input.endFrame();

    expect(input.wasActionReleased('move-left')).toBe(false);
  });

  it('accumulates pointer movement and clears it at the end of the frame', () => {
    const input = new InputManager();

    input.addPointerDelta(4, -2);
    input.addPointerDelta(-1, 7);

    expect(input.getPointerDelta()).toEqual({ x: 3, y: 5 });

    input.endFrame();

    expect(input.getPointerDelta()).toEqual({ x: 0, y: 0 });
  });

  it('fully resets held actions, transitions, and pointer movement', () => {
    const input = new InputManager();
    input.setActionPressed('move-fast', true);
    input.setActionPressed('interact', true);
    input.addPointerDelta(10, -8);

    input.reset();

    expect(input.isActionPressed('move-fast')).toBe(false);
    expect(input.isActionPressed('interact')).toBe(false);
    expect(input.wasActionPressed('move-fast')).toBe(false);
    expect(input.wasActionReleased('move-fast')).toBe(false);
    expect(input.getPointerDelta()).toEqual({ x: 0, y: 0 });
  });

  it('keeps an action held until every physical source is released', () => {
    const input = new InputManager();

    input.setActionPressed('move-forward', true, 'keyboard:KeyW');
    input.endFrame();
    input.setActionPressed('move-forward', true, 'keyboard:KeyZ');
    input.setActionPressed('move-forward', false, 'keyboard:KeyW');

    expect(input.isActionPressed('move-forward')).toBe(true);
    expect(input.wasActionPressed('move-forward')).toBe(false);
    expect(input.wasActionReleased('move-forward')).toBe(false);

    input.setActionPressed('move-forward', false, 'keyboard:KeyZ');

    expect(input.isActionPressed('move-forward')).toBe(false);
    expect(input.wasActionReleased('move-forward')).toBe(true);
  });
});
