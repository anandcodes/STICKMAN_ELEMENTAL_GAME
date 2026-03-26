import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createInitialState } from '../engine';
import { createTouchControlsState, updateTouchControlsLayout } from '../touchControls';
import { resetMobileInputObservability, getMobileInputObservabilitySnapshot } from '../mobile/observability';
import { setMockAudioContext, setMockStorage } from './testHelpers';
import { SyntheticMultiTouchDriver } from './syntheticMultiTouchDriver';

function makePlayingState(level = 2) {
  setMockStorage();
  setMockAudioContext();
  const state = createInitialState(level, 0, 0, 'normal');
  state.screen = 'playing';
  state.showLevelIntro = false;
  state.paused = false;
  return state;
}

function makeCanvas(width = 1200, height = 700): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  Object.defineProperty(canvas, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left: 0,
      top: 0,
      width,
      height,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  });
  return canvas;
}

describe('mobile input integration', () => {
  let driver: SyntheticMultiTouchDriver;

  beforeEach(() => {
    resetMobileInputObservability();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('release-frame aim reconciliation uses the true final touch position', () => {
    const state = makePlayingState();
    const controls = createTouchControlsState(1200, 700);
    controls.visible = true;
    const canvas = makeCanvas();
    updateTouchControlsLayout(controls, state, 1200, 700, 1200, 700);
    driver = new SyntheticMultiTouchDriver(state, controls, canvas, 1200, 700);
    vi.spyOn(performance, 'now').mockImplementation(() => driver.nowMs);

    state.castCooldown = 12;
    driver.start(1, controls.rightDock.x, controls.rightDock.y);
    driver.step();
    driver.move(1, controls.rightDock.x + 32, controls.rightDock.y - 12);
    driver.step();
    driver.end(1, controls.rightDock.x - 84, controls.rightDock.y - 74);
    driver.step();

    expect(state.attackBufferFrames).toBeGreaterThan(0);
    expect(state.aimAngle).toBeLessThan(-2.1);
  });

  test('stacked ownership stays stable during simultaneous aim drag and dash taps', () => {
    const state = makePlayingState();
    const controls = createTouchControlsState(1200, 700);
    controls.visible = true;
    const canvas = makeCanvas();
    updateTouchControlsLayout(controls, state, 1200, 700, 1200, 700);
    driver = new SyntheticMultiTouchDriver(state, controls, canvas, 1200, 700);
    vi.spyOn(performance, 'now').mockImplementation(() => driver.nowMs);

    driver.start(1, controls.rightDock.x, controls.rightDock.y);
    driver.step();
    driver.move(1, controls.rightDock.x + 78, controls.rightDock.y - 26);
    driver.step();

    driver.start(2, controls.leftDock.x, controls.leftDock.y);
    driver.advanceTimings([30, 40]);
    driver.end(2, controls.leftDock.x, controls.leftDock.y);
    driver.advanceTimings([50]);
    driver.start(3, controls.leftDock.x + 6, controls.leftDock.y + 4);
    driver.advanceTimings([30, 40]);
    driver.end(3, controls.leftDock.x + 6, controls.leftDock.y + 4);
    driver.step();

    expect(controls.aimStick.touchId).toBe(1);
    expect(state.dashBufferFrames).toBe(state.balanceCurve.dashBufferFrames);
  });

  test('swap radial selection survives delayed release while an attack is buffered', () => {
    const state = makePlayingState(2);
    const controls = createTouchControlsState(1200, 700);
    controls.visible = true;
    const canvas = makeCanvas();
    updateTouchControlsLayout(controls, state, 1200, 700, 1200, 700);
    driver = new SyntheticMultiTouchDriver(state, controls, canvas, 1200, 700);
    vi.spyOn(performance, 'now').mockImplementation(() => driver.nowMs);

    state.castCooldown = 20;
    driver.start(1, controls.attackButton.x, controls.attackButton.y);
    driver.step();
    driver.start(2, controls.swapButton.x, controls.swapButton.y);
    driver.advanceTimings([360]);
    driver.move(2, controls.swapButton.x + controls.swapButton.radius * 2.7, controls.swapButton.y);
    driver.delayNext('end', 2, 2);
    driver.end(2, controls.swapButton.x + controls.swapButton.radius * 2.7, controls.swapButton.y);
    driver.advanceTimings([16, 16, 16]);

    expect(state.attackBufferFrames).toBeGreaterThan(state.castCooldown);
    expect(state.selectedElement).toBe('water');
  });

  test('frame drops, orientation changes, and pause cycles do not leave ghost ownership', () => {
    const state = makePlayingState();
    const controls = createTouchControlsState(1200, 700);
    controls.visible = true;
    const canvas = makeCanvas();
    updateTouchControlsLayout(controls, state, 1200, 700, 1200, 700);
    driver = new SyntheticMultiTouchDriver(state, controls, canvas, 1200, 700);
    vi.spyOn(performance, 'now').mockImplementation(() => driver.nowMs);

    driver.start(1, controls.leftDock.x, controls.leftDock.y);
    driver.advanceTimings([16, 50, 90]);
    updateTouchControlsLayout(controls, state, 1200, 700, 700, 1200);
    driver.move(1, controls.leftDock.x + 20, controls.leftDock.y - 10);
    driver.step();
    state.paused = true;
    driver.end(1, controls.leftDock.x + 20, controls.leftDock.y - 10);
    driver.step();
    state.paused = false;
    updateTouchControlsLayout(controls, state, 1600, 900, 1366, 1024);
    driver.step();

    expect(controls.movementStick.touchId).toBe(null);
    expect(controls.aimStick.touchId).toBe(null);
    expect(state.moveInputX).toBe(0);
    expect(getMobileInputObservabilitySnapshot().recentDecisions.length).toBeGreaterThan(0);
  });

  test('one-thumb mode auto-runs and supports contextual jump flicks with assisted layout scaling', () => {
    const state = makePlayingState();
    state.mobileControlMode = 'one_thumb';
    state.mobileAccessibilityPreset = 'assisted';
    const controls = createTouchControlsState(1200, 700);
    controls.visible = true;
    const canvas = makeCanvas();
    updateTouchControlsLayout(controls, state, 1200, 700, 1200, 700);
    driver = new SyntheticMultiTouchDriver(state, controls, canvas, 1200, 700);
    vi.spyOn(performance, 'now').mockImplementation(() => driver.nowMs);

    driver.step();
    expect(state.moveInputX).toBe(1);
    expect(controls.attackButton.radius).toBeGreaterThan(55);

    driver.start(1, 420, 380);
    driver.advanceTimings([12]);
    driver.move(1, 426, 300);
    driver.advanceTimings([12, 12]);

    expect(state.stickman.jumpBufferTimer).toBeGreaterThan(0);
  });
});
