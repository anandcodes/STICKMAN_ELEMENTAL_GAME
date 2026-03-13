import { test, expect } from 'vitest';

import { advanceLoopClock, createLoopClock } from '../loop';

test('advanceLoopClock initializes timestamp and returns zero steps on first tick', () => {
  const clock = createLoopClock();
  const steps = advanceLoopClock(clock, 100);

  expect(steps).toBe(0);
  expect(clock.lastTimestampMs).toBe(100);
  expect(clock.accumulatorMs).toBe(0);
});

test('advanceLoopClock carries remainder time between frames', () => {
  const clock = createLoopClock();
  advanceLoopClock(clock, 0, 10, 100, 10);

  const steps1 = advanceLoopClock(clock, 25, 10, 100, 10);
  expect(steps1).toBe(2);
  expect(clock.accumulatorMs).toBe(5);

  const steps2 = advanceLoopClock(clock, 35, 10, 100, 10);
  expect(steps2).toBe(1);
  expect(clock.accumulatorMs).toBe(5);
});

test('advanceLoopClock clamps huge deltas and caps updates per frame', () => {
  const clock = createLoopClock();
  advanceLoopClock(clock, 0, 10, 100, 5);

  const steps = advanceLoopClock(clock, 1000, 10, 100, 5);
  expect(steps).toBe(5);
  expect(clock.accumulatorMs).toBe(0);
});

test('advanceLoopClock ignores negative timestamp drift', () => {
  const clock = createLoopClock();
  advanceLoopClock(clock, 100, 10, 100, 5);

  const steps = advanceLoopClock(clock, 90, 10, 100, 5);
  expect(steps).toBe(0);
  expect(clock.accumulatorMs).toBe(0);
});
