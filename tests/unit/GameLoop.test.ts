import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_FIXED_STEP_SECONDS,
  GameLoop,
  type FrameCallback,
  type FrameScheduler,
} from '../../src/app/GameLoop';

class FakeFrameScheduler implements FrameScheduler {
  private readonly callbacks = new Map<number, FrameCallback>();
  private nextRequestId = 1;

  public requestCount = 0;
  public cancelCount = 0;
  public currentTimeMs = 0;

  public get pendingFrameCount(): number {
    return this.callbacks.size;
  }

  public requestFrame(callback: FrameCallback): number {
    const requestId = this.nextRequestId;
    this.nextRequestId += 1;
    this.requestCount += 1;
    this.callbacks.set(requestId, callback);
    return requestId;
  }

  public cancelFrame(requestId: number): void {
    this.cancelCount += 1;
    this.callbacks.delete(requestId);
  }

  public now(): number {
    return this.currentTimeMs;
  }

  public runNextFrame(timestampMs: number): void {
    for (const [requestId, callback] of this.callbacks) {
      this.callbacks.delete(requestId);
      this.currentTimeMs = timestampMs;
      callback(timestampMs);
      return;
    }

    throw new Error('No frame is pending.');
  }
}

describe('GameLoop', () => {
  it('does not schedule multiple loops when start is called repeatedly', () => {
    const scheduler = new FakeFrameScheduler();
    const loop = new GameLoop(vi.fn(), vi.fn(), scheduler);

    loop.start();
    loop.start();

    expect(scheduler.requestCount).toBe(1);
    expect(scheduler.pendingFrameCount).toBe(1);
    expect(loop.isRunning).toBe(true);

    loop.stop();
  });

  it('cancels its pending frame when stopped', () => {
    const scheduler = new FakeFrameScheduler();
    const update = vi.fn();
    const loop = new GameLoop(update, vi.fn(), scheduler);

    loop.start();
    loop.stop();

    expect(scheduler.cancelCount).toBe(1);
    expect(scheduler.pendingFrameCount).toBe(0);
    expect(loop.isRunning).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it('clamps an abnormally large delta and caps fixed sub-steps', () => {
    const scheduler = new FakeFrameScheduler();
    const update = vi.fn();
    const loop = new GameLoop(update, vi.fn(), scheduler);

    loop.start();
    scheduler.runNextFrame(750);

    expect(update).toHaveBeenCalledTimes(5);
    expect(update).toHaveBeenCalledWith(DEFAULT_FIXED_STEP_SECONDS);
    expect(loop.fixedStepsLastFrame).toBe(5);

    loop.stop();
  });

  it('renders once for each processed frame', () => {
    const scheduler = new FakeFrameScheduler();
    const render = vi.fn();
    const loop = new GameLoop(vi.fn(), render, scheduler);

    loop.start();
    scheduler.runNextFrame(17);

    expect(render).toHaveBeenCalledOnce();
    expect(scheduler.pendingFrameCount).toBe(1);

    loop.stop();
  });

  it('ends each input frame once after update and render', () => {
    const scheduler = new FakeFrameScheduler();
    const callOrder: string[] = [];
    const loop = new GameLoop(
      () => callOrder.push('update'),
      () => callOrder.push('render'),
      scheduler,
      { onFrameEnd: () => callOrder.push('end-frame') },
    );

    loop.start();
    scheduler.runNextFrame(17);

    expect(callOrder).toEqual(['update', 'render', 'end-frame']);

    loop.stop();
  });

  it('uses an exact 1/60 second fixed step', () => {
    const scheduler = new FakeFrameScheduler();
    const update = vi.fn();
    const loop = new GameLoop(update, vi.fn(), scheduler);

    loop.start();
    scheduler.runNextFrame(50);

    expect(update).toHaveBeenCalledTimes(3);
    expect(update).toHaveBeenNthCalledWith(1, 1 / 60);
    expect(update).toHaveBeenNthCalledWith(2, 1 / 60);
    expect(update).toHaveBeenNthCalledWith(3, 1 / 60);

    loop.stop();
  });

  it('reports clamped frame delta once to frame-level updates', () => {
    const scheduler = new FakeFrameScheduler();
    const onFrameStart = vi.fn();
    const loop = new GameLoop(vi.fn(), vi.fn(), scheduler, {
      onFrameStart,
    });

    loop.start();
    scheduler.runNextFrame(750);

    expect(onFrameStart).toHaveBeenCalledOnce();
    expect(onFrameStart).toHaveBeenCalledWith(0.1);
    expect(loop.frameDeltaSecondsLastFrame).toBe(0.1);

    loop.stop();
    expect(loop.frameDeltaSecondsLastFrame).toBe(0);
  });

  it('does not repeat frame-level mouse consumption across sub-steps', () => {
    const scheduler = new FakeFrameScheduler();
    const consumePointerDelta = vi.fn();
    const fixedUpdate = vi.fn();
    const loop = new GameLoop(fixedUpdate, vi.fn(), scheduler, {
      onFrameStart: consumePointerDelta,
    });

    loop.start();
    scheduler.runNextFrame(100);

    expect(consumePointerDelta).toHaveBeenCalledOnce();
    expect(fixedUpdate).toHaveBeenCalledTimes(5);

    loop.stop();
  });
});
