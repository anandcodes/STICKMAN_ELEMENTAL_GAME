import { beforeEach, afterEach, describe, expect, test, vi } from 'vitest';

import { createInitialState } from '../engine';
import { MOBILE_INPUT_CONFIG } from '../mobile/config';
import {
  createTouchControlsState,
  handleTouchEnd,
  handleTouchMove,
  handleTouchStart,
  updateTouchControlsInput,
  updateTouchControlsLayout,
} from '../touchControls';
import { setMockAudioContext, setMockStorage } from './testHelpers';

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

function touch(id: number, x: number, y: number): Touch {
  return {
    identifier: id,
    clientX: x,
    clientY: y,
  } as Touch;
}

describe('touchControls mobile scheme', () => {
  let timeMs = 0;

  beforeEach(() => {
    vi.spyOn(performance, 'now').mockImplementation(() => timeMs);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('releasing the aim stick buffers an attack when cast cooldown is active', () => {
    const state = makePlayingState();
    const controls = createTouchControlsState(1200, 700);
    controls.visible = true;
    const canvas = makeCanvas();
    updateTouchControlsLayout(controls, state, 1200, 700, 1200, 700);

    state.castCooldown = 5;

    handleTouchStart([touch(1, controls.rightDock.x, controls.rightDock.y)], controls, state, canvas, 1200, 700);
    handleTouchMove([touch(1, controls.rightDock.x + 90, controls.rightDock.y - 40)], controls, state, canvas, 1200, 700);
    updateTouchControlsInput(controls, state);
    handleTouchEnd([touch(1, controls.rightDock.x + 90, controls.rightDock.y - 40)], controls, state);

    expect(state.attackBufferFrames).toBeGreaterThanOrEqual(MOBILE_INPUT_CONFIG.attackBufferFrames);
    expect(state.touchAimActive).toBe(false);
  });

  test('double tap on the movement side queues a dash', () => {
    const state = makePlayingState();
    const controls = createTouchControlsState(1200, 700);
    controls.visible = true;
    const canvas = makeCanvas();
    updateTouchControlsLayout(controls, state, 1200, 700, 1200, 700);

    const x = controls.leftDock.x;
    const y = controls.leftDock.y;

    timeMs = 0;
    handleTouchStart([touch(1, x, y)], controls, state, canvas, 1200, 700);
    timeMs = 80;
    handleTouchEnd([touch(1, x, y)], controls, state);

    timeMs = 170;
    handleTouchStart([touch(2, x + 8, y + 4)], controls, state, canvas, 1200, 700);
    timeMs = 220;
    handleTouchEnd([touch(2, x + 8, y + 4)], controls, state);

    expect(state.dashBufferFrames).toBe(state.balanceCurve.dashBufferFrames);
  });

  test('swipe down on the movement stick triggers a fast platform drop', () => {
    const state = makePlayingState();
    const controls = createTouchControlsState(1200, 700);
    controls.visible = true;
    const canvas = makeCanvas();
    updateTouchControlsLayout(controls, state, 1200, 700, 1200, 700);

    const x = controls.leftDock.x;
    const y = controls.leftDock.y;

    handleTouchStart([touch(1, x, y)], controls, state, canvas, 1200, 700);
    handleTouchMove(
      [touch(1, x + 6, y + MOBILE_INPUT_CONFIG.dropSwipeDistance + 18)],
      controls,
      state,
      canvas,
      1200,
      700,
    );

    expect(state.platformDropFrames).toBe(MOBILE_INPUT_CONFIG.platformDropFrames);
    expect(state.stickman.vy).toBeGreaterThanOrEqual(MOBILE_INPUT_CONFIG.platformDropVelocity);
  });

  test('swap button tap cycles elements while long press opens the radial selector', () => {
    const state = makePlayingState(2);
    const controls = createTouchControlsState(1200, 700);
    controls.visible = true;
    const canvas = makeCanvas();
    updateTouchControlsLayout(controls, state, 1200, 700, 1200, 700);

    const swapX = controls.swapButton.x;
    const swapY = controls.swapButton.y;

    timeMs = 0;
    handleTouchStart([touch(1, swapX, swapY)], controls, state, canvas, 1200, 700);
    timeMs = 120;
    handleTouchEnd([touch(1, swapX, swapY)], controls, state);
    expect(state.selectedElement).toBe('water');

    state.selectedElement = 'fire';
    timeMs = 0;
    handleTouchStart([touch(2, swapX, swapY)], controls, state, canvas, 1200, 700);
    timeMs = MOBILE_INPUT_CONFIG.swapLongPressMs + 20;
    updateTouchControlsInput(controls, state);

    expect(controls.swapLongPressActive).toBe(true);

    handleTouchMove([touch(2, swapX + controls.swapButton.radius * 2.5, swapY)], controls, state, canvas, 1200, 700);
    handleTouchEnd([touch(2, swapX + controls.swapButton.radius * 2.5, swapY)], controls, state);

    expect(state.selectedElement).toBe('water');
  });

  test('button ownership is not stolen by a second touch on the same button', () => {
    const state = makePlayingState();
    const controls = createTouchControlsState(1200, 700);
    controls.visible = true;
    const canvas = makeCanvas();
    updateTouchControlsLayout(controls, state, 1200, 700, 1200, 700);

    handleTouchStart([touch(1, controls.jumpButton.x, controls.jumpButton.y)], controls, state, canvas, 1200, 700);
    handleTouchStart([touch(2, controls.jumpButton.x, controls.jumpButton.y)], controls, state, canvas, 1200, 700);

    expect(controls.jumpButton.touchId).toBe(1);

    handleTouchEnd([touch(1, controls.jumpButton.x, controls.jumpButton.y)], controls, state);
    expect(controls.jumpButton.touchId).toBe(null);
  });

  test('missing touchend events recover ownership on the next active-touch sync', () => {
    const state = makePlayingState();
    const controls = createTouchControlsState(1200, 700);
    controls.visible = true;
    const canvas = makeCanvas();
    updateTouchControlsLayout(controls, state, 1200, 700, 1200, 700);

    const moveTouch = touch(1, controls.leftDock.x, controls.leftDock.y);
    handleTouchStart([moveTouch], controls, state, canvas, 1200, 700, undefined, [moveTouch]);
    expect(controls.movementStick.touchId).toBe(1);

    handleTouchMove([], controls, state, canvas, 1200, 700, undefined, []);

    expect(controls.movementStick.touchId).toBe(null);
    expect(state.moveInputX).toBe(0);
  });

  test('aim updates continue while swap is held until the radial menu actually opens', () => {
    const state = makePlayingState();
    const controls = createTouchControlsState(1200, 700);
    controls.visible = true;
    const canvas = makeCanvas();
    updateTouchControlsLayout(controls, state, 1200, 700, 1200, 700);

    handleTouchStart([touch(1, controls.swapButton.x, controls.swapButton.y)], controls, state, canvas, 1200, 700);
    const aimStartX = controls.rightDock.x - controls.aimStick.radius * 0.2;
    const aimStartY = controls.rightDock.y - controls.aimStick.radius * 0.9;
    handleTouchStart([touch(2, aimStartX, aimStartY)], controls, state, canvas, 1200, 700);
    expect(controls.aimStick.touchId).toBe(2);
    handleTouchMove([touch(2, aimStartX + 60, aimStartY - 20)], controls, state, canvas, 1200, 700);
    updateTouchControlsInput(controls, state);

    expect(controls.swapLongPressActive).toBe(false);
    expect(state.touchAimActive).toBe(true);
    expect(state.aimAngle).not.toBeUndefined();
  });

  test('swap hold, aim drag, and dash taps can coexist without stealing ownership', () => {
    const state = makePlayingState();
    const controls = createTouchControlsState(1200, 700);
    controls.visible = true;
    const canvas = makeCanvas();
    updateTouchControlsLayout(controls, state, 1200, 700, 1200, 700);

    const swapTouch = touch(1, controls.swapButton.x, controls.swapButton.y);
    const aimTouch = touch(2, controls.rightDock.x, controls.rightDock.y);
    handleTouchStart([swapTouch], controls, state, canvas, 1200, 700, undefined, [swapTouch]);
    handleTouchStart([aimTouch], controls, state, canvas, 1200, 700, undefined, [swapTouch, aimTouch]);

    const movedAimTouch = touch(2, controls.rightDock.x + 84, controls.rightDock.y - 36);
    handleTouchMove([movedAimTouch], controls, state, canvas, 1200, 700, undefined, [swapTouch, movedAimTouch]);
    updateTouchControlsInput(controls, state);

    timeMs = 0;
    const dashTapOne = touch(3, controls.leftDock.x, controls.leftDock.y);
    handleTouchStart([dashTapOne], controls, state, canvas, 1200, 700, undefined, [swapTouch, movedAimTouch, dashTapOne]);
    timeMs = 80;
    handleTouchEnd([dashTapOne], controls, state, canvas, 1200, 700, undefined, [swapTouch, movedAimTouch]);

    timeMs = 150;
    const dashTapTwo = touch(4, controls.leftDock.x + 6, controls.leftDock.y + 4);
    handleTouchStart([dashTapTwo], controls, state, canvas, 1200, 700, undefined, [swapTouch, movedAimTouch, dashTapTwo]);
    timeMs = 210;
    handleTouchEnd([dashTapTwo], controls, state, canvas, 1200, 700, undefined, [swapTouch, movedAimTouch]);

    expect(controls.swapButton.touchId).toBe(1);
    expect(controls.aimStick.touchId).toBe(2);
    expect(state.touchAimActive).toBe(true);
    expect(state.dashBufferFrames).toBe(state.balanceCurve.dashBufferFrames);
  });

  test('attack buffering stretches to cover the current cooldown window', () => {
    const state = makePlayingState();
    const controls = createTouchControlsState(1200, 700);
    controls.visible = true;
    const canvas = makeCanvas();
    updateTouchControlsLayout(controls, state, 1200, 700, 1200, 700);

    state.castCooldown = 20;
    handleTouchStart([touch(1, controls.attackButton.x, controls.attackButton.y)], controls, state, canvas, 1200, 700);

    expect(state.attackBufferFrames).toBeGreaterThan(state.castCooldown);
  });

  test('aim release during cooldown preserves attack buffering while other touches stay live', () => {
    const state = makePlayingState();
    const controls = createTouchControlsState(1200, 700);
    controls.visible = true;
    const canvas = makeCanvas();
    updateTouchControlsLayout(controls, state, 1200, 700, 1200, 700);

    state.castCooldown = 18;
    const moveTouch = touch(1, controls.leftDock.x, controls.leftDock.y);
    const aimTouch = touch(2, controls.rightDock.x, controls.rightDock.y);
    handleTouchStart([moveTouch], controls, state, canvas, 1200, 700, undefined, [moveTouch]);
    handleTouchStart([aimTouch], controls, state, canvas, 1200, 700, undefined, [moveTouch, aimTouch]);

    const movedAimTouch = touch(2, controls.rightDock.x + 92, controls.rightDock.y - 28);
    handleTouchMove([movedAimTouch], controls, state, canvas, 1200, 700, undefined, [moveTouch, movedAimTouch]);
    handleTouchEnd([movedAimTouch], controls, state, canvas, 1200, 700, undefined, [moveTouch]);

    expect(controls.movementStick.touchId).toBe(1);
    expect(controls.aimStick.touchId).toBe(null);
    expect(state.attackBufferFrames).toBeGreaterThan(state.castCooldown);
  });

  test('layout adapts for compact phones and tablets without collapsing button spacing', () => {
    const state = makePlayingState();
    const controls = createTouchControlsState(1200, 700);

    updateTouchControlsLayout(controls, state, 1200, 700, 700, 1200);
    expect(controls.layoutProfile).toBe('compact');
    expect(controls.jumpButton.y).toBeLessThan(controls.leftDock.y);

    updateTouchControlsLayout(controls, state, 1600, 900, 1366, 1024);
    expect(controls.layoutProfile).toBe('tablet');
    expect(controls.attackButton.x - controls.rightDock.x).toBeGreaterThan(controls.attackButton.radius * 2);
  });
});
