import type { GameState } from '../types';
import { DASH_BASE_COOLDOWN } from '../constants';

export interface ActionButtonState {
  x: number;
  y: number;
  radius: number;
  active: boolean;
  color: string;
}

export function hitActionButton(button: ActionButtonState, x: number, y: number, slop = 1.85): boolean {
  const dx = x - button.x;
  const dy = y - button.y;
  return dx * dx + dy * dy <= (button.radius * slop) ** 2;
}

export function getDashCooldownProgress(state: GameState): number {
  if (state.stickman.dashCooldown <= 0) return 1;
  return Math.max(0, Math.min(1, 1 - state.stickman.dashCooldown / DASH_BASE_COOLDOWN));
}
