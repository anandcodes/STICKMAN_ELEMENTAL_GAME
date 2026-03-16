import type { GameState, Vec2 } from '../types';
import { MOBILE_INPUT_CONFIG } from './config';

export interface FloatingJoystickController {
  dpadCenter: Vec2;
  dpadDirection: Vec2;
  dpadTargetDirection: Vec2;
  dpadRadius: number;
  shootHeldFrames: number;
}

function syncMovementKeys(state: GameState, axisX: number): void {
  state.keys.delete('a');
  state.keys.delete('d');
  state.keys.delete('arrowleft');
  state.keys.delete('arrowright');

  if (axisX < -MOBILE_INPUT_CONFIG.joystickDeadZone) {
    state.keys.add('a');
  } else if (axisX > MOBILE_INPUT_CONFIG.joystickDeadZone) {
    state.keys.add('d');
  }
}

export function beginFloatingJoystick(controls: FloatingJoystickController, x: number, y: number): void {
  controls.dpadCenter = { x, y };
  controls.dpadDirection = { x: 0, y: 0 };
  controls.dpadTargetDirection = { x: 0, y: 0 };
}

export function updateFloatingJoystick(controls: FloatingJoystickController, x: number, y: number): void {
  const dx = x - controls.dpadCenter.x;
  const dy = y - controls.dpadCenter.y;
  const distance = Math.sqrt(dx * dx + dy * dy) || 1;
  const clamped = Math.min(distance, controls.dpadRadius);
  controls.dpadTargetDirection = {
    x: (dx / distance) * (clamped / controls.dpadRadius),
    y: (dy / distance) * (clamped / controls.dpadRadius),
  };
}

export function releaseFloatingJoystick(controls: FloatingJoystickController): void {
  controls.dpadTargetDirection = { x: 0, y: 0 };
}

export function stepMobileInput(controls: FloatingJoystickController, state: GameState): void {
  controls.dpadDirection = {
    x: controls.dpadDirection.x + (controls.dpadTargetDirection.x - controls.dpadDirection.x) * (controls.dpadTargetDirection.x === 0 ? MOBILE_INPUT_CONFIG.joystickReleaseLerp : MOBILE_INPUT_CONFIG.joystickFollowLerp),
    y: controls.dpadDirection.y + (controls.dpadTargetDirection.y - controls.dpadDirection.y) * (controls.dpadTargetDirection.y === 0 ? MOBILE_INPUT_CONFIG.joystickReleaseLerp : MOBILE_INPUT_CONFIG.joystickFollowLerp),
  };

  const axisX = Math.abs(controls.dpadDirection.x) < MOBILE_INPUT_CONFIG.joystickDeadZone ? 0 : controls.dpadDirection.x;
  const axisY = Math.abs(controls.dpadDirection.y) < MOBILE_INPUT_CONFIG.joystickDeadZone ? 0 : controls.dpadDirection.y;
  state.moveInputX = axisX;
  state.moveInputY = axisY;
  syncMovementKeys(state, axisX);
}

export function beginShootInput(controls: FloatingJoystickController, state: GameState): void {
  controls.shootHeldFrames = 0;
  state.shootQueued = true;
  state.buttonFireActive = true;
  if (state.aimAngle === undefined) {
    state.aimAngle = state.stickman.facing === 1 ? 0 : Math.PI;
  }
}

export function holdShootInput(controls: FloatingJoystickController, state: GameState): void {
  controls.shootHeldFrames++;
  if (controls.shootHeldFrames >= MOBILE_INPUT_CONFIG.shootHoldThresholdFrames) {
    state.buttonFireActive = true;
  }
}

export function endShootInput(state: GameState): void {
  state.buttonFireActive = false;
}
