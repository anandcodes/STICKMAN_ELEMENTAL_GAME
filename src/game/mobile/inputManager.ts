import type { GameState, Vec2 } from '../types';
import { MOBILE_INPUT_CONFIG } from './config';

export interface FloatingJoystickController {
  dpadCenter: Vec2;
  dpadDirection: Vec2;
  dpadTargetDirection: Vec2;
  dpadRadius: number;
  shootHeldFrames: number;
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
  const isMoving = controls.dpadTargetDirection.x !== 0 || controls.dpadTargetDirection.y !== 0;

  controls.dpadDirection = {
    x: controls.dpadDirection.x + (controls.dpadTargetDirection.x - controls.dpadDirection.x) * (isMoving ? MOBILE_INPUT_CONFIG.joystickFollowLerp : MOBILE_INPUT_CONFIG.joystickReleaseLerp),
    y: controls.dpadDirection.y + (controls.dpadTargetDirection.y - controls.dpadDirection.y) * (isMoving ? MOBILE_INPUT_CONFIG.joystickFollowLerp : MOBILE_INPUT_CONFIG.joystickReleaseLerp),
  };

  const deadzone = MOBILE_INPUT_CONFIG.joystickDeadZone;
  const axisX = Math.abs(controls.dpadDirection.x) < deadzone ? 0 : controls.dpadDirection.x;
  const axisY = Math.abs(controls.dpadDirection.y) < deadzone ? 0 : controls.dpadDirection.y;

  // Strict zeroing for non-mobile or inactive joystick to prevent drift
  if (!isMoving && Math.abs(controls.dpadDirection.x) < 0.01) {
    state.moveInputX = 0;
    state.moveInputY = 0;
    controls.dpadDirection = { x: 0, y: 0 };
  } else {
    state.moveInputX = axisX;
    state.moveInputY = axisY;
  }
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
