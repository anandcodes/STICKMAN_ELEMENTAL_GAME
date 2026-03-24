import type { Enemy, GameState } from '../types';
import { MOBILE_INPUT_CONFIG } from './config';

function normalizeAngle(angle: number): number {
  let next = angle;
  while (next > Math.PI) next -= Math.PI * 2;
  while (next < -Math.PI) next += Math.PI * 2;
  return next;
}

function angleDelta(a: number, b: number): number {
  return Math.abs(normalizeAngle(a - b));
}

export interface AimAssistResult {
  angle: number;
  target: Enemy | null;
  weight: number;
}

export function getAimAssist(state: GameState, rawAngle: number): AimAssistResult {
  const s = state.stickman;
  const originX = s.x + s.width / 2;
  const originY = s.y + s.height / 4;
  const maxCone = (MOBILE_INPUT_CONFIG.aimAssistConeDeg * Math.PI) / 180;

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

    const score = (1 - delta / maxCone) * 2 + (1 - distance / MOBILE_INPUT_CONFIG.aimAssistRange);
    if (score > bestScore) {
      best = enemy;
      bestScore = score;
      bestAngle = candidateAngle;
    }
  }

  if (!best) {
    return { angle: rawAngle, target: null, weight: 0 };
  }

  const weight = Math.min(1, MOBILE_INPUT_CONFIG.aimAssistStrength + bestScore * 0.1);
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
  const assisted = getAimAssist(state, rawAngle);
  const s = state.stickman;
  state.touchAimActive = true;
  state.isAiming = true;
  state.aimAngle = assisted.angle;
  state.aimAssistTargetId = assisted.target?.id;
  state.aimAssistWeight = assisted.weight;
  state.mousePos = {
    x: s.x + s.width / 2 + Math.cos(assisted.angle) * MOBILE_INPUT_CONFIG.aimIndicatorRange - state.camera.x,
    y: s.y + s.height / 4 + Math.sin(assisted.angle) * MOBILE_INPUT_CONFIG.aimIndicatorRange - state.camera.y,
  };
}
