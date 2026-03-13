import type { GameState } from '../types';
import { t } from '../i18n';
import { FONT_UI, FONT_DISPLAY } from './renderConstants';

export function uiScale(state: GameState): number {
  return Math.min(1.5, Math.max(0.85, state.textScale || 1));
}

export function setUiFont(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  size: number,
  weight = '',
  family = FONT_UI,
): void {
  const px = Math.round(size * uiScale(state));
  ctx.font = `${weight ? `${weight} ` : ''}${px}px ${family}`;
}

export function setDisplayFont(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  size: number,
  weight = '700',
): void {
  setUiFont(ctx, state, size, weight, FONT_DISPLAY);
}

export function tr(state: GameState, key: Parameters<typeof t>[1], vars?: Record<string, string | number>): string {
  return t(state.locale, key, vars);
}

export function formatFramesAsTime(frames: number): string {
  const mins = Math.floor(frames / 3600);
  const secs = Math.floor((frames % 3600) / 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
