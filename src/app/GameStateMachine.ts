export const GAME_STATES = [
  'boot',
  'loading',
  'main-menu',
  'room-intro',
  'observation',
  'blackout',
  'search',
  'failure-sequence',
  'room-complete',
  'room-transition',
  'paused',
  'game-over',
  'victory',
] as const;

export type GameState = (typeof GAME_STATES)[number];
type ResumableGameState = Exclude<GameState, 'paused'>;

export interface GameStateTransition {
  readonly from: GameState;
  readonly to: GameState;
}

export type GameStateTransitionListener = (
  transition: GameStateTransition,
) => void;

const TRANSITION_TARGETS = {
  boot: ['loading'],
  loading: ['main-menu'],
  'main-menu': ['room-intro'],
  'room-intro': ['observation'],
  observation: ['blackout'],
  blackout: ['search'],
  search: ['room-complete', 'failure-sequence'],
  'failure-sequence': ['game-over'],
  'room-complete': ['room-transition', 'victory'],
  'room-transition': ['room-intro'],
  paused: [],
  'game-over': ['room-intro', 'main-menu'],
  victory: ['room-intro', 'main-menu'],
} as const satisfies Readonly<Record<GameState, readonly GameState[]>>;

const PAUSABLE_STATES: ReadonlySet<GameState> = new Set([
  'room-intro',
  'observation',
  'blackout',
  'search',
  'failure-sequence',
  'room-complete',
  'room-transition',
]);

export class InvalidGameStateTransitionError extends Error {
  public constructor(
    public readonly from: GameState,
    public readonly to: GameState,
  ) {
    super(`Game state transition from "${from}" to "${to}" is not allowed.`);
    this.name = 'InvalidGameStateTransitionError';
  }
}

export class GameStateMachine {
  private state: GameState = 'boot';
  private suspendedState: ResumableGameState | null = null;
  private readonly listeners = new Set<GameStateTransitionListener>();

  public get currentState(): GameState {
    return this.state;
  }

  public get stateBeforePause(): ResumableGameState | null {
    return this.suspendedState;
  }

  public get isPaused(): boolean {
    return this.state === 'paused';
  }

  public canTransitionTo(nextState: GameState): boolean {
    if (nextState === 'paused') {
      return PAUSABLE_STATES.has(this.state);
    }

    if (this.state === 'paused') {
      return nextState === this.suspendedState || nextState === 'main-menu';
    }

    return TRANSITION_TARGETS[this.state].some(
      (candidate) => candidate === nextState,
    );
  }

  public transitionTo(nextState: GameState): void {
    if (!this.canTransitionTo(nextState)) {
      throw new InvalidGameStateTransitionError(this.state, nextState);
    }

    if (nextState === 'paused') {
      this.pause();
      return;
    }

    if (this.state === 'paused') {
      if (nextState === this.suspendedState) {
        this.resume();
        return;
      }

      this.suspendedState = null;
    }

    this.applyTransition(nextState);
  }

  public pause(): boolean {
    if (!PAUSABLE_STATES.has(this.state)) {
      return false;
    }

    this.suspendedState = this.state as ResumableGameState;
    this.applyTransition('paused');
    return true;
  }

  public resume(): boolean {
    if (this.state !== 'paused' || this.suspendedState === null) {
      return false;
    }

    const stateToRestore = this.suspendedState;
    this.suspendedState = null;
    this.applyTransition(stateToRestore);
    return true;
  }

  public subscribe(listener: GameStateTransitionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private applyTransition(nextState: GameState): void {
    const transition: GameStateTransition = {
      from: this.state,
      to: nextState,
    };
    this.state = nextState;

    for (const listener of this.listeners) {
      listener(transition);
    }
  }
}
