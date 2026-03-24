import type { Difficulty, DifficultySettings } from './types';

export const GRAVITY = 0.75;
export const FRICTION = 0.88;
export const JUMP_FORCE = -13.5;
export const MOVE_SPEED = 0.9;
export const MAX_SPEED = 4.5;
export const DASH_BASE_SPEED = 13;
export const DASH_SPEED_PER_UPGRADE = 1.8;
export const DASH_BASE_DURATION = 10;
export const DASH_DURATION_PER_UPGRADE = 2;
export const DASH_BASE_COOLDOWN = 72;
export const DASH_MANA_COST = 4;
export const BASE_CANVAS_W = 1200;
export const BASE_CANVAS_H = 700;

export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  easy: { playerHealth: 150, playerMana: 150, enemyDamageMult: 0.5, enemySpeedMult: 0.8, manaRegenRate: 0.15, label: 'Easy', color: '#44cc44' },
  normal: { playerHealth: 100, playerMana: 100, enemyDamageMult: 1.0, enemySpeedMult: 1.0, manaRegenRate: 0.08, label: 'Normal', color: '#ffcc00' },
  hard: { playerHealth: 75, playerMana: 80, enemyDamageMult: 1.5, enemySpeedMult: 1.3, manaRegenRate: 0.04, label: 'Hard', color: '#ff4444' },
  insane: { playerHealth: 50, playerMana: 60, enemyDamageMult: 2.2, enemySpeedMult: 1.6, manaRegenRate: 0.02, label: 'Insane', color: '#aa00ff' },
};

export function getDifficultyForLevel(level: number): Difficulty {
  if (level < 7) return 'easy';
  if (level < 13) return 'normal';
  return 'hard';
}
