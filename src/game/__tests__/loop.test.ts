import test from 'node:test';
import assert from 'node:assert/strict';

import { advanceLoopClock, createLoopClock } from '../loop';

test('advanceLoopClock initializes timestamp and returns zero steps on first tick', () => {
  const clock = createLoopClock();
  const steps = advanceLoopClock(clock, 100);

  assert.equal(steps, 0);
  assert.equal(clock.lastTimestampMs, 100);
  assert.equal(clock.accumulatorMs, 0);
});

test('advanceLoopClock carries remainder time between frames', () => {
  const clock = createLoopClock();
  advanceLoopClock(clock, 0, 10, 100, 10);

  const steps1 = advanceLoopClock(clock, 25, 10, 100, 10);
  assert.equal(steps1, 2);
  assert.equal(clock.accumulatorMs, 5);

  const steps2 = advanceLoopClock(clock, 35, 10, 100, 10);
  assert.equal(steps2, 1);
  assert.equal(clock.accumulatorMs, 5);
});

test('advanceLoopClock clamps huge deltas and caps updates per frame', () => {
  const clock = createLoopClock();
  advanceLoopClock(clock, 0, 10, 100, 5);

  const steps = advanceLoopClock(clock, 1000, 10, 100, 5);
  assert.equal(steps, 5);
  assert.equal(clock.accumulatorMs, 0);
});

test('advanceLoopClock ignores negative timestamp drift', () => {
  const clock = createLoopClock();
  advanceLoopClock(clock, 100, 10, 100, 5);

  const steps = advanceLoopClock(clock, 90, 10, 100, 5);
  assert.equal(steps, 0);
  assert.equal(clock.accumulatorMs, 0);
});
