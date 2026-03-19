/**
 * Thumb Arc UI Rendering
 * Draws the professional mobile game UI with smooth animations
 */

import type { ThumbArcLayout, ThumbArcButtonState } from './thumbArc';

/**
 * Draw the complete Thumb Arc UI
 * Includes movement joystick and action button arc
 */
export function drawThumbArcUI(
  ctx: CanvasRenderingContext2D,
  layout: ThumbArcLayout,
  gameTime: number,
): void {
  if (!layout.visible) return;

  ctx.save();
  ctx.globalAlpha = layout.opacity;

  // Draw movement controls (left side)
  drawMovementPad(ctx, layout, gameTime);

  // Draw action button arc (right side)
  for (const button of layout.actionButtons.values()) {
    drawActionButton(ctx, button, gameTime);
  }

  ctx.restore();
}

/**
 * Draw the movement/joystick control on the left side
 */
function drawMovementPad(
  ctx: CanvasRenderingContext2D,
  layout: ThumbArcLayout,
  gameTime: number,
): void {
  const { x, y } = layout.movementCenter;
  const radius = layout.movementRadius;

  // Outer circle (base)
  ctx.save();
  ctx.strokeStyle = 'rgba(154, 230, 222, 0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Inner circle (hint)
  ctx.strokeStyle = 'rgba(154, 230, 222, 0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
  ctx.stroke();

  // Animated glow effect on active
  const hasMovement = layout.movementTouchId !== null;
  if (hasMovement) {
    ctx.fillStyle = 'rgba(98, 238, 184, 0.08)';
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Pulsing border
    const pulse = Math.sin(gameTime * 0.005) * 0.3 + 0.7;
    ctx.strokeStyle = `rgba(98, 238, 184, ${pulse * 0.4})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.05, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw a single action button with proper state visualization
 */
function drawActionButton(
  ctx: CanvasRenderingContext2D,
  button: ThumbArcButtonState,
  gameTime: number,
): void {
  const { x, y, radius, isPressed, cooldownProgress, isLocked, color, icon } = button;

  ctx.save();

  // Scale on press
  const scale = isPressed ? 1.1 : 1.0;
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.translate(-x, -y);

  // Button background with gradient
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);

  if (isLocked) {
    grad.addColorStop(0, 'rgba(85, 90, 112, 0.4)');
    grad.addColorStop(1, 'rgba(50, 55, 75, 0.3)');
  } else if (isPressed) {
    // Pressed state: brighter
    const pressColor = color.includes('rgb') ? color : hexToRgba(color, 0.6);
    grad.addColorStop(0, pressColor);
    grad.addColorStop(1, hexToRgba(color, 0.3));
  } else {
    // Normal state
    grad.addColorStop(0, hexToRgba(color, 0.4));
    grad.addColorStop(1, hexToRgba(color, 0.1));
  }

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Border
  ctx.strokeStyle = isPressed ? color : hexToRgba(color, 0.6);
  ctx.lineWidth = isPressed ? 3 : 2;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Glow effect when active
  if (isPressed) {
    const glowIntensity = Math.sin(gameTime * 0.006) * 0.3 + 0.7;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20 * glowIntensity;
    ctx.strokeStyle = hexToRgba(color, 0.8);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.15, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Button label
  ctx.fillStyle = isLocked ? 'rgba(255, 255, 255, 0.3)' : '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 12px Arial';
  ctx.fillText(button.label, x, y + radius * 0.7);

  // Icon emoji
  ctx.font = `${radius * 0.8}px Arial`;
  ctx.fillText(icon, x, y - radius * 0.15);

  // Cooldown arc (if on cooldown)
  if (cooldownProgress > 0 && cooldownProgress < 1) {
    ctx.strokeStyle = hexToRgba(color, 0.8);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - cooldownProgress));
    ctx.stroke();

    // Cooldown text
    ctx.fillStyle = color;
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cooldownPercent = Math.ceil(cooldownProgress * 100);
    ctx.fillText(`${cooldownPercent}%`, x, y);
  }

  // Lock indicator
  if (isLocked) {
    ctx.fillStyle = 'rgba(200, 100, 100, 0.8)';
    ctx.font = `${radius * 0.6}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔒', x, y);
  }

  ctx.restore();
}

/**
 * Draw a visual indicator showing current action/ability
 * Display above the button for feedback
 */
export function drawAbilityIndicator(
  ctx: CanvasRenderingContext2D,
  button: ThumbArcButtonState,
  y: number,
): void {
  if (!button.isPressed) return;

  const x = button.x;
  const w = 80;
  const h = 30;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(x - w / 2, y - h / 2, w, h);

  ctx.strokeStyle = button.color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - w / 2, y - h / 2, w, h);

  ctx.fillStyle = button.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 12px Arial';
  ctx.fillText(button.label, x, y);

  ctx.restore();
}

/**
 * Helper: Convert hex color to rgba
 */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Draw movement direction indicator
 * Shows player which direction they're moving
 */
export function drawMovementVector(
  ctx: CanvasRenderingContext2D,
  layout: ThumbArcLayout,
  direction: { x: number; y: number },
): void {
  const { x, y } = layout.movementCenter;
  if (Math.abs(direction.x) < 0.1 && Math.abs(direction.y) < 0.1) return;

  const vectorLength = 30;
  const endX = x + direction.x * vectorLength;
  const endY = y + direction.y * vectorLength;

  ctx.save();
  ctx.strokeStyle = 'rgba(98, 238, 184, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // Arrow head
  const angle = Math.atan2(direction.y, direction.x);
  const arrowSize = 8;
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX - arrowSize * Math.cos(angle - Math.PI / 6), endY - arrowSize * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(endX - arrowSize * Math.cos(angle + Math.PI / 6), endY - arrowSize * Math.sin(angle + Math.PI / 6));
  ctx.fill();

  ctx.restore();
}
