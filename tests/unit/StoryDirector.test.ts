import { describe, expect, it, vi } from 'vitest';
import {
  StoryDirector,
  type StoryEffectExecution,
} from '../../src/gameplay/story/StoryDirector';
import type { StoryEventDefinition } from '../../src/gameplay/story/StoryEvent';
import { StoryProgress } from '../../src/gameplay/story/StoryProgress';

const BEDROOM_EVENTS = [
  {
    id: 'loop-warning',
    roomId: 'greybox-bedroom',
    trigger: { type: 'loop-started' },
    effects: [
      { type: 'add-discovery', discoveryId: 'house-forgot-someone' },
    ],
    repeat: 'once-ever',
  },
  {
    id: 'observation-radio',
    roomId: 'greybox-bedroom',
    trigger: {
      type: 'phase-elapsed',
      phase: 'observation',
      elapsedMs: 3_000,
    },
    effects: [{ type: 'subtitle', copyKey: 'story.bedroom.radio' }],
    repeat: 'once-per-loop',
  },
  {
    id: 'second-error-memory',
    roomId: 'greybox-bedroom',
    trigger: { type: 'run-error', kind: 'incorrect-report' },
    conditions: { minimumPressure: 2 },
    effects: [{ type: 'add-fragment', fragmentId: 'pressure-memory' }],
    repeat: 'once-ever',
  },
] as const satisfies readonly StoryEventDefinition[];

describe('StoryDirector', () => {
  it('stays inactive in Escape and starts authored events only in Story', () => {
    const progress = new StoryProgress();
    const effects: StoryEffectExecution[] = [];
    const director = new StoryDirector(BEDROOM_EVENTS, progress, {
      onEffect: (execution) => effects.push(execution),
    });

    expect(director.beginLoop('escape', 'greybox-bedroom')).toBe(false);
    expect(director.getSnapshot().active).toBe(false);
    expect(progress.getSnapshot().loopNumber).toBe(0);

    expect(director.beginLoop('story', 'greybox-bedroom')).toBe(true);
    expect(progress.hasDiscovery('house-forgot-someone')).toBe(true);
    expect(effects.map((execution) => execution.eventId)).toEqual([
      'loop-warning',
    ]);
  });

  it('advances phase events deterministically and freezes while paused', () => {
    const effect = vi.fn();
    const director = new StoryDirector(
      BEDROOM_EVENTS,
      new StoryProgress(),
      { onEffect: effect },
    );
    director.beginLoop('story', 'greybox-bedroom');
    director.startPhase('observation');
    effect.mockClear();

    expect(director.update(2_999)).toBe(0);
    expect(director.pause()).toBe(true);
    expect(director.update(5_000)).toBe(0);
    expect(director.getSnapshot().phaseElapsedMs).toBe(2_999);
    expect(director.resume()).toBe(true);
    expect(director.update(1)).toBe(1);
    expect(director.update(10_000)).toBe(0);
    expect(effect).toHaveBeenCalledTimes(1);
  });

  it('evaluates pressure conditions when their matching signal occurs', () => {
    const progress = new StoryProgress();
    const director = new StoryDirector(BEDROOM_EVENTS, progress);
    director.beginLoop('story', 'greybox-bedroom');

    director.setPressureLevel(1);
    expect(
      director.emit({ type: 'run-error', kind: 'incorrect-report' }),
    ).toBe(0);
    director.setPressureLevel(2);
    expect(
      director.emit({ type: 'run-error', kind: 'incorrect-report' }),
    ).toBe(1);
    expect(progress.hasFragment('pressure-memory')).toBe(true);
  });

  it('cancels room timelines and reports room cleanup', () => {
    const roomExited = vi.fn();
    const effect = vi.fn();
    const director = new StoryDirector(
      BEDROOM_EVENTS,
      new StoryProgress(),
      { onEffect: effect, onRoomExited: roomExited },
    );
    director.beginLoop('story', 'greybox-bedroom');
    director.startPhase('observation');
    effect.mockClear();

    expect(director.enterRoom('bathroom')).toBe(true);
    expect(roomExited).toHaveBeenCalledWith('greybox-bedroom');
    expect(director.update(10_000)).toBe(0);
    expect(effect).not.toHaveBeenCalled();
  });

  it('respects once-ever and once-per-loop repetition', () => {
    const effect = vi.fn();
    const director = new StoryDirector(
      BEDROOM_EVENTS,
      new StoryProgress(),
      { onEffect: effect },
    );
    director.beginLoop('story', 'greybox-bedroom');
    director.startPhase('observation');
    director.update(3_000);
    effect.mockClear();

    director.beginLoop('story', 'greybox-bedroom');
    director.startPhase('observation');
    director.update(3_000);

    expect(effect).toHaveBeenCalledTimes(1);
    expect(effect.mock.calls[0]?.[0]).toMatchObject({
      eventId: 'observation-radio',
    });
  });

  it('rejects invalid updates and pressure values', () => {
    const director = new StoryDirector([], new StoryProgress());
    expect(() => director.update(Number.NaN)).toThrow('delta must be finite');
    expect(() => director.setPressureLevel(4)).toThrow(
      'integer between zero and three',
    );
  });
});
