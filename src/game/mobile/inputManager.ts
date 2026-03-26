import type { GameState, Vec2 } from '../types';
import { MOBILE_INPUT_CONFIG } from './config';
import { measureInputDistance } from './controlMath';
import { recordMobileInputMetric } from './observability';
import { getEffectiveAttackBufferBaseFrames } from './runtimeConfig';

export interface DynamicStickController {
  anchor: Vec2;
  current: Vec2;
  target: Vec2;
  vector: Vec2;
  radius: number;
  touchId: number | null;
  visibleAlpha: number;
  activationPulse: number;
  lastMagnitude: number;
}

function assignVec2(target: Vec2, x: number, y: number): void {
  target.x = x;
  target.y = y;
}

export function createDynamicStick(anchor: Vec2 = { x: 0, y: 0 }, radius = 0): DynamicStickController {
  return {
    anchor: { ...anchor },
    current: { ...anchor },
    target: { x: 0, y: 0 },
    vector: { x: 0, y: 0 },
    radius,
    touchId: null,
    visibleAlpha: 0,
    activationPulse: 0,
    lastMagnitude: 0,
  };
}

export function beginDynamicStick(stick: DynamicStickController, x: number, y: number): void {
  assignVec2(stick.anchor, x, y);
  assignVec2(stick.current, x, y);
  assignVec2(stick.target, 0, 0);
  assignVec2(stick.vector, 0, 0);
  stick.visibleAlpha = 1;
  stick.activationPulse = 1;
  stick.lastMagnitude = 0;
}

export function updateDynamicStick(stick: DynamicStickController, x: number, y: number): void {
  assignVec2(stick.current, x, y);
  const dx = x - stick.anchor.x;
  const dy = y - stick.anchor.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const safeDistance = distance || 1;
  const radius = Math.max(1, stick.radius);
  const clampedDistance = Math.min(distance, radius);
  const normalizedX = (dx / safeDistance) * (clampedDistance / radius);
  const normalizedY = (dy / safeDistance) * (clampedDistance / radius);

  assignVec2(stick.target, normalizedX, normalizedY);
  stick.lastMagnitude = Math.min(1, distance / radius);
}

export function releaseDynamicStick(stick: DynamicStickController): void {
  stick.touchId = null;
  assignVec2(stick.target, 0, 0);
  stick.lastMagnitude = 0;
}

export function stepDynamicStick(stick: DynamicStickController): void {
  const active = stick.touchId !== null;
  const vectorLerp = active
    ? MOBILE_INPUT_CONFIG.joystickFollowLerp
    : MOBILE_INPUT_CONFIG.joystickReleaseLerp;
  const opacityLerp = active
    ? MOBILE_INPUT_CONFIG.joystickVisibleLerp
    : MOBILE_INPUT_CONFIG.joystickFadeLerp;

  stick.vector.x += (stick.target.x - stick.vector.x) * vectorLerp;
  stick.vector.y += (stick.target.y - stick.vector.y) * vectorLerp;

  stick.visibleAlpha += ((active ? 1 : 0) - stick.visibleAlpha) * opacityLerp;
  if (!active && stick.visibleAlpha < 0.02) {
    stick.visibleAlpha = 0;
  }

  stick.activationPulse = Math.max(0, stick.activationPulse - MOBILE_INPUT_CONFIG.joystickActivationDecay);
}

export function applyMovementFromStick(state: GameState, stick: DynamicStickController): void {
  const magnitude = measureInputDistance(
    stick.vector.x,
    stick.vector.y,
    MOBILE_INPUT_CONFIG.joystickDeadZoneShape,
  );
  const axisX = magnitude >= MOBILE_INPUT_CONFIG.joystickDeadZone
    ? clampAxis(stick.vector.x)
    : 0;

  state.moveInputX = axisX;
  state.moveInputY = 0;
}

export function queueBufferedJump(state: GameState): void {
  state.stickman.jumpBufferTimer = Math.max(
    state.stickman.jumpBufferTimer,
    state.balanceCurve.jumpBufferFrames,
  );
}

export function queueBufferedDash(state: GameState): void {
  state.dashBufferFrames = Math.max(
    state.dashBufferFrames,
    state.balanceCurve.dashBufferFrames,
  );
}

export function queueBufferedAttack(state: GameState): void {
  syncAttackAim(state);

  if (state.castCooldown <= 0) {
    state.shootQueued = true;
    state.attackBufferFrames = 0;
    return;
  }

  state.attackBufferFrames = Math.max(
    state.attackBufferFrames,
    Math.min(
      MOBILE_INPUT_CONFIG.maxAttackBufferFrames,
      getEffectiveAttackBufferBaseFrames(state) + state.castCooldown,
    ),
  );
  recordMobileInputMetric('buffered_attack_queued');
}

export function queuePlatformDrop(state: GameState): void {
  state.platformDropFrames = Math.max(
    state.platformDropFrames,
    MOBILE_INPUT_CONFIG.platformDropFrames,
  );
  state.stickman.jumpBufferTimer = 0;
  state.stickman.onGround = false;
  state.stickman.vy = Math.max(state.stickman.vy, MOBILE_INPUT_CONFIG.platformDropVelocity);
}

export function syncAttackAim(state: GameState): void {
  if (state.aimAngle === undefined) {
    state.aimAngle = state.stickman.facing === 1 ? 0 : Math.PI;
  }
}

function clampAxis(value: number): number {
  return Math.max(-1, Math.min(1, value));
}
