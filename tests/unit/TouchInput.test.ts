import { describe, expect, it } from 'vitest';
import { resolveJoystickActions } from '../../src/input/TouchInput';

describe('TouchInput joystick', () => {
  it('keeps the player still inside the dead zone', () => {
    expect(resolveJoystickActions(0.2, -0.2)).toEqual({
      forward: false,
      backward: false,
      left: false,
      right: false,
    });
  });

  it('supports diagonal movement', () => {
    expect(resolveJoystickActions(0.8, -0.7)).toEqual({
      forward: true,
      backward: false,
      left: false,
      right: true,
    });
  });

  it('maps every cardinal direction independently', () => {
    expect(resolveJoystickActions(-0.9, 0)).toMatchObject({ left: true });
    expect(resolveJoystickActions(0.9, 0)).toMatchObject({ right: true });
    expect(resolveJoystickActions(0, -0.9)).toMatchObject({ forward: true });
    expect(resolveJoystickActions(0, 0.9)).toMatchObject({ backward: true });
  });
});
