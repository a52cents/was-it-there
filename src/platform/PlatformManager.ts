import type { PlatformAdapter } from './PlatformAdapter';

export type PlatformInitializationStatus =
  | 'idle'
  | 'initializing'
  | 'ready'
  | 'failed';

export class PlatformInitializationError extends Error {
  public constructor(
    public readonly adapterId: string,
    cause: unknown,
  ) {
    super(`Failed to initialize platform adapter "${adapterId}".`, { cause });
    this.name = 'PlatformInitializationError';
  }
}

export class PlatformManager {
  private status: PlatformInitializationStatus = 'idle';
  private initializationPromise: Promise<void> | null = null;

  public constructor(private readonly adapter: PlatformAdapter) {}

  public get activeAdapter(): PlatformAdapter {
    return this.adapter;
  }

  public get initializationStatus(): PlatformInitializationStatus {
    return this.status;
  }

  public async initialize(): Promise<void> {
    if (this.status === 'ready') {
      return;
    }

    if (this.initializationPromise !== null) {
      return this.initializationPromise;
    }

    this.status = 'initializing';
    const initialization = this.initializeAdapter();
    this.initializationPromise = initialization;

    try {
      await initialization;
    } finally {
      if (this.initializationPromise === initialization) {
        this.initializationPromise = null;
      }
    }
  }

  private async initializeAdapter(): Promise<void> {
    try {
      await this.adapter.initialize();
      this.status = 'ready';
    } catch (error: unknown) {
      this.status = 'failed';
      throw new PlatformInitializationError(this.adapter.id, error);
    }
  }
}
