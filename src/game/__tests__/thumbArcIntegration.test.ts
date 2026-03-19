import { expect, test } from 'vitest';

import { createInitialState } from '../engine';
import {
  applyThumbArcInputToGameState,
  createThumbArcBridgeState,
  type ThumbArcInputState,
} from '../mobile/thumbArcIntegration';
import { setMockAudioContext, setMockStorage } from './testHelpers';

function makePlayingState() {
  setMockStorage();
  setMockAudioContext();

  const state = createInitialState(1, 0, 0, 'normal');
  state.screen = 'playing';
  state.showLevelIntro = false;
  state.paused = false;
  return state;
}

test('movement keeps updating while an elemental skill waits in the input buffer', () => {
  const state = makePlayingState();
  const bridge = createThumbArcBridgeState({ skillBufferFrames: 4 });
  const heldWater: ThumbArcInputState = {
    movement: { x: 0.85, y: 0 },
    jumpHeld: false,
    punchHeld: false,
    dashHeld: false,
    pauseHeld: false,
    elementHeld: 'water',
  };

  state.castCooldown = 2;
  applyThumbArcInputToGameState(state, heldWater, bridge);

  expect(state.moveInputX).toBeCloseTo(0.85);
  expect(state.shootQueued).toBe(false);
  expect(bridge.pendingSkill.element).toBe('water');

  state.castCooldown = 1;
  applyThumbArcInputToGameState(state, heldWater, bridge);

  expect(state.moveInputX).toBeCloseTo(0.85);
  expect(state.shootQueued).toBe(false);
  expect(bridge.pendingSkill.framesRemaining).toBe(2);

  state.castCooldown = 0;
  applyThumbArcInputToGameState(state, { ...heldWater, elementHeld: null }, bridge);

  expect(state.moveInputX).toBeCloseTo(0.85);
  expect(state.selectedElement).toBe('water');
  expect(state.shootQueued).toBe(true);
  expect(bridge.pendingSkill.element).toBe(null);
});

test('jump taps are forwarded into the existing player jump buffer without interrupting movement', () => {
  const state = makePlayingState();
  const bridge = createThumbArcBridgeState();

  applyThumbArcInputToGameState(state, {
    movement: { x: -0.65, y: 0 },
    jumpHeld: true,
    punchHeld: false,
    dashHeld: false,
    pauseHeld: false,
    elementHeld: null,
  }, bridge);

  expect(state.moveInputX).toBeCloseTo(-0.65);
  expect(state.stickman.jumpBufferTimer).toBe(state.balanceCurve.jumpBufferFrames);
});

test('held elemental buttons do not retrigger every frame', () => {
  const state = makePlayingState();
  const bridge = createThumbArcBridgeState();
  const heldFire: ThumbArcInputState = {
    movement: { x: 0.4, y: 0 },
    jumpHeld: false,
    punchHeld: false,
    dashHeld: false,
    pauseHeld: false,
    elementHeld: 'fire',
  };

  applyThumbArcInputToGameState(state, heldFire, bridge);
  expect(state.shootQueued).toBe(true);

  state.shootQueued = false;
  applyThumbArcInputToGameState(state, heldFire, bridge);

  expect(state.moveInputX).toBeCloseTo(0.4);
  expect(state.shootQueued).toBe(false);
});
