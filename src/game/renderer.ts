import type { GameState } from './types';
import { drawWorld } from './renderers/worldRenderer';
import { drawUIRenderer } from './renderers/uiRenderer';

/**
 * Main Game Renderer (Coordinator)
 * Orchestrates the drawing of the game world and UI.
 */
export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  W: number,
  H: number,
  isMobile: boolean = false,
  isPortraitMobile: boolean = false,
  compactMobileLayout: boolean = false,
): void {
  const nowMs = performance.now();
  const shakeX = (Math.random() - 0.5) * state.screenShake * 2;
  const shakeY = (Math.random() - 0.5) * state.screenShake * 2;

  ctx.clearRect(0, 0, W, H);

  // 1. Draw Game World (World Space)
  drawWorld(ctx, state, W, H, nowMs, shakeX, shakeY, isMobile);

  // 2. Draw UI (Screen Space)
  ctx.save();
  if (state.screen === 'playing') {
    // Slightly follow camera movement and hit shake for UI cohesion during gameplay only.
    const cam = state.camera;
    const hudFollowX = Math.max(-28, Math.min(28, -cam.x * 0.03));
    const hudFollowY = Math.max(-16, Math.min(16, -cam.y * 0.03));
    const uiShakeX = shakeX * 0.35;
    const uiShakeY = shakeY * 0.35;
    ctx.translate(hudFollowX + uiShakeX, hudFollowY + uiShakeY);
  }

  drawUIRenderer(ctx, state, W, H, nowMs, isMobile, isPortraitMobile, compactMobileLayout);
  ctx.restore();
}
