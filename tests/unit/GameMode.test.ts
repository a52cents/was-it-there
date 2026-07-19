import { describe, expect, it } from 'vitest';
import {
  GAME_MODES,
  isGameMode,
} from '../../src/gameplay/run/GameMode';

describe('GameMode', () => {
  it('keeps the public mode order stable for the menu', () => {
    expect(GAME_MODES).toEqual(['story', 'escape']);
  });

  it('accepts only supported game modes', () => {
    expect(isGameMode('story')).toBe(true);
    expect(isGameMode('escape')).toBe(true);
    expect(isGameMode('endless')).toBe(false);
    expect(isGameMode(null)).toBe(false);
  });
});
