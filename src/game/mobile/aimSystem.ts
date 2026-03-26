import type { Enemy, GameState } from '../types';
import { MOBILE_INPUT_CONFIG } from './config';
import { clamp01 } from './controlMath';
import {
  getEffectiveAimAssistConeDeg,
  getEffectiveAimAssistCurveExponent,
  getEffectiveAimAssistInnerConeDeg,
  getEffectiveAimAssistMaxStrength,
  getEffectiveAimSmoothing,
  getEffectiveAimAssistStrength,
} from './runtimeConfig';

function normalizeAngle(angle: number): number {
  let next = angle;
  while (next > Math.PI) next -= Math.PI * 2;
  while (next < -Math.PI) next += Math.PI * 2;
  return next;
}

function angleDelta(a: number, b: number): number {
  return Math.abs(normalizeAngle(a - b));
}

function lerpAngle(from: number, to: number, alpha: number): number {
  return normalizeAngle(from + normalizeAngle(to - from) * alpha);
}

export interface AimAssistResult {
  angle: number;
  target: Enemy | null;
  weight: number;
}

export function getAimAssist(state: GameState, rawAngle: number): AimAssistResult {
  if (!MOBILE_INPUT_CONFIG.aimAssistEnabled) {
    return { angle: rawAngle, target: null, weight: 0 };
  }

  const s = state.stickman;
  const originX = s.x + s.width / 2;
  const originY = s.y + s.height / 4;
  const maxCone = (getEffectiveAimAssistConeDeg(state) * Math.PI) / 180;
  const innerCone = (getEffectiveAimAssistInnerConeDeg(state) * Math.PI) / 180;

  let best: Enemy | null = null;
  let bestScore = -Infinity;
  let bestAngle = rawAngle;

  for (const enemy of state.enemies) {
    if (enemy.state === 'dead') continue;
    const ex = enemy.x + enemy.width / 2;
    const ey = enemy.y + enemy.height / 2;
    const dx = ex - originX;
    const dy = ey - originY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > MOBILE_INPUT_CONFIG.aimAssistRange) continue;

    const candidateAngle = Math.atan2(dy, dx);
    const delta = angleDelta(candidateAngle, rawAngle);
    if (delta > maxCone) continue;

    const coneBonus = delta <= innerCone
      ? 1.15
      : 1 - (delta - innerCone) / Math.max(0.001, maxCone - innerCone);
    const angleScore = clamp01(coneBonus);
    const distanceScore = clamp01(1 - distance / MOBILE_INPUT_CONFIG.aimAssistRange);
    const score = clamp01(angleScore * 0.72 + distanceScore * 0.28);
    if (score > bestScore) {
      best = enemy;
      bestScore = score;
      bestAngle = candidateAngle;
    }
  }

  if (!best) {
    return { angle: rawAngle, target: null, weight: 0 };
  }

  const curvedScore = Math.pow(clamp01(bestScore), getEffectiveAimAssistCurveExponent(state));
  const baseStrength = getEffectiveAimAssistStrength(state);
  const maxStrength = getEffectiveAimAssistMaxStrength(state);
  const weight = baseStrength + (maxStrength - baseStrength) * curvedScore;
  return {
    angle: normalizeAngle(rawAngle + normalizeAngle(bestAngle - rawAngle) * weight),
    target: best,
    weight,
  };
}

export function setAimFromVector(state: GameState, dx: number, dy: number): void {
  const magnitude = Math.sqrt(dx * dx + dy * dy);
  if (magnitude < 1) {
    state.touchAimActive = false;
    state.aimAssistTargetId = undefined;
    state.aimAssistWeight = 0;
    return;
  }

  const rawAngle = Math.atan2(dy, dx * MOBILE_INPUT_CONFIG.aimSensitivity);
  const inputMagnitude = Math.min(1, magnitude);
  const assisted = inputMagnitude >= MOBILE_INPUT_CONFIG.aimAssistInputThreshold
    ? getAimAssist(state, rawAngle)
    : { angle: rawAngle, target: null, weight: 0 };
  const s = state.stickman;
  const smoothedAngle = state.touchAimActive && state.aimAngle !== undefined
    ? lerpAngle(state.aimAngle, assisted.angle, getEffectiveAimSmoothing(state))
    : assisted.angle;
  state.touchAimActive = true;
  state.isAiming = true;
  state.aimAngle = smoothedAngle;
  state.aimAssistTargetId = assisted.target?.id;
  state.aimAssistWeight = assisted.weight;
  state.mousePos = {
    x: s.x + s.width / 2 + Math.cos(smoothedAngle) * MOBILE_INPUT_CONFIG.aimIndicatorRange - state.camera.x,
    y: s.y + s.height / 4 + Math.sin(smoothedAngle) * MOBILE_INPUT_CONFIG.aimIndicatorRange - state.camera.y,
  };
}
