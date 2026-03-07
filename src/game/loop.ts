export const TARGET_FPS = 60;
export const STEP_MS = 1000 / TARGET_FPS;
export const MAX_DELTA_MS = 100;
export const MAX_STEPS_PER_FRAME = 5;

export interface LoopClock {
  lastTimestampMs: number | null;
  accumulatorMs: number;
}

export function createLoopClock(): LoopClock {
  return { lastTimestampMs: null, accumulatorMs: 0 };
}

export function advanceLoopClock(
  clock: LoopClock,
  nowMs: number,
  stepMs = STEP_MS,
  maxDeltaMs = MAX_DELTA_MS,
  maxStepsPerFrame = MAX_STEPS_PER_FRAME,
): number {
  if (clock.lastTimestampMs === null) {
    clock.lastTimestampMs = nowMs;
    return 0;
  }

  let deltaMs = nowMs - clock.lastTimestampMs;
  clock.lastTimestampMs = nowMs;

  if (!Number.isFinite(deltaMs) || deltaMs < 0) deltaMs = 0;
  if (deltaMs > maxDeltaMs) deltaMs = maxDeltaMs;

  clock.accumulatorMs += deltaMs;

  const availableSteps = Math.floor(clock.accumulatorMs / stepMs);
  const steps = Math.min(availableSteps, maxStepsPerFrame);
  clock.accumulatorMs -= steps * stepMs;

  // Drop excess backlog after long stalls to prevent spiral-of-death updates.
  if (availableSteps > maxStepsPerFrame) {
    clock.accumulatorMs = 0;
  }

  return steps;
}
