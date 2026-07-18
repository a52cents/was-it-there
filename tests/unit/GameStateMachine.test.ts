import { describe, expect, it, vi } from 'vitest';
import {
  GameStateMachine,
  InvalidGameStateTransitionError,
} from '../../src/app/GameStateMachine';

function reachSearch(machine: GameStateMachine): void {
  machine.transitionTo('loading');
  machine.transitionTo('main-menu');
  machine.transitionTo('room-intro');
  machine.transitionTo('observation');
  machine.transitionTo('blackout');
  machine.transitionTo('search');
}

describe('GameStateMachine', () => {
  it('starts in boot and follows the canonical route to search', () => {
    const machine = new GameStateMachine();

    expect(machine.currentState).toBe('boot');
    reachSearch(machine);

    expect(machine.currentState).toBe('search');
  });

  it('supports room completion, transition, and the next room', () => {
    const machine = new GameStateMachine();
    reachSearch(machine);

    machine.transitionTo('room-complete');
    machine.transitionTo('room-transition');
    machine.transitionTo('room-intro');

    expect(machine.currentState).toBe('room-intro');
  });

  it('supports the game-over and victory branches', () => {
    const failedRun = new GameStateMachine();
    reachSearch(failedRun);
    failedRun.transitionTo('game-over');
    failedRun.transitionTo('main-menu');

    const completedRun = new GameStateMachine();
    reachSearch(completedRun);
    completedRun.transitionTo('room-complete');
    completedRun.transitionTo('victory');
    completedRun.transitionTo('main-menu');

    expect(failedRun.currentState).toBe('main-menu');
    expect(completedRun.currentState).toBe('main-menu');
  });

  it('can restart directly from Game Over into a fresh room intro', () => {
    const machine = new GameStateMachine();
    reachSearch(machine);
    machine.transitionTo('game-over');

    machine.transitionTo('room-intro');

    expect(machine.currentState).toBe('room-intro');
  });

  it('can restart directly from victory into a fresh room intro', () => {
    const machine = new GameStateMachine();
    reachSearch(machine);
    machine.transitionTo('room-complete');
    machine.transitionTo('victory');

    machine.transitionTo('room-intro');

    expect(machine.currentState).toBe('room-intro');
  });

  it('rejects direct transitions that are not authorized', () => {
    const machine = new GameStateMachine();

    expect(() => machine.transitionTo('observation')).toThrow(
      InvalidGameStateTransitionError,
    );
    expect(machine.currentState).toBe('boot');
  });

  it('pauses and restores the exact interrupted state', () => {
    const machine = new GameStateMachine();
    reachSearch(machine);

    expect(machine.pause()).toBe(true);
    expect(machine.currentState).toBe('paused');
    expect(machine.stateBeforePause).toBe('search');
    expect(machine.resume()).toBe(true);
    expect(machine.currentState).toBe('search');
    expect(machine.stateBeforePause).toBeNull();
  });

  it('does not pause non-gameplay states or resume when not paused', () => {
    const machine = new GameStateMachine();

    expect(machine.pause()).toBe(false);
    expect(machine.resume()).toBe(false);
    expect(machine.currentState).toBe('boot');
  });

  it('can leave pause for the main menu without retaining a resume state', () => {
    const machine = new GameStateMachine();
    reachSearch(machine);
    machine.pause();

    machine.transitionTo('main-menu');

    expect(machine.currentState).toBe('main-menu');
    expect(machine.stateBeforePause).toBeNull();
  });

  it('notifies subscribers and supports clean unsubscription', () => {
    const machine = new GameStateMachine();
    const listener = vi.fn();
    const unsubscribe = machine.subscribe(listener);

    machine.transitionTo('loading');
    unsubscribe();
    machine.transitionTo('main-menu');

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ from: 'boot', to: 'loading' });
  });
});
