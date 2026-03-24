import type { MobileControlAssetKey } from './config';
import { DPAD_COLORS } from '../renderers/renderConstants';

export type ControlAssetMap = Partial<Record<MobileControlAssetKey, HTMLImageElement>>;

function drawGlyph(ctx: CanvasRenderingContext2D, image: HTMLImageElement | undefined, x: number, y: number, size: number, fallback: string) {
  if (image && image.complete && image.naturalWidth > 0) {
    ctx.drawImage(image, x - size / 2, y - size / 2, size, size);
    return;
  }

  ctx.fillStyle = '#f4ead8';
  ctx.font = `700 ${Math.round(size * 0.52)}px "Cormorant Garamond", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(fallback, x, y);
}

export function drawFloatingJoystick(
  ctx: CanvasRenderingContext2D,
  _assets: ControlAssetMap,
  center: { x: number; y: number },
  vector: { x: number; y: number },
  radius: number,
  active: boolean,
): void {
  const alpha = active ? 0.94 : 0.55;
  const tilt = Math.min(1, Math.sqrt(vector.x * vector.x + vector.y * vector.y));
  const knobX = center.x + vector.x * radius * 0.45;
  const knobY = center.y + vector.y * radius * 0.45;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Brown circular base
  const baseGrad = ctx.createRadialGradient(center.x, center.y, radius * 0.1, center.x, center.y, radius * 1.05);
  baseGrad.addColorStop(0, DPAD_COLORS.baseLight);
  baseGrad.addColorStop(0.7, DPAD_COLORS.base);
  baseGrad.addColorStop(1, DPAD_COLORS.baseDark);
  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Subtle border
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.stroke();

  // White directional arrows
  const arrowSize = radius * 0.22;
  const arrowDist = radius * 0.55;
  ctx.fillStyle = DPAD_COLORS.arrow;
  ctx.strokeStyle = DPAD_COLORS.arrow;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Up arrow
  ctx.beginPath();
  ctx.moveTo(center.x, center.y - arrowDist - arrowSize);
  ctx.lineTo(center.x - arrowSize, center.y - arrowDist + arrowSize * 0.5);
  ctx.lineTo(center.x + arrowSize, center.y - arrowDist + arrowSize * 0.5);
  ctx.closePath();
  ctx.fill();

  // Down arrow
  ctx.beginPath();
  ctx.moveTo(center.x, center.y + arrowDist + arrowSize);
  ctx.lineTo(center.x - arrowSize, center.y + arrowDist - arrowSize * 0.5);
  ctx.lineTo(center.x + arrowSize, center.y + arrowDist - arrowSize * 0.5);
  ctx.closePath();
  ctx.fill();

  // Left arrow
  ctx.beginPath();
  ctx.moveTo(center.x - arrowDist - arrowSize, center.y);
  ctx.lineTo(center.x - arrowDist + arrowSize * 0.5, center.y - arrowSize);
  ctx.lineTo(center.x - arrowDist + arrowSize * 0.5, center.y + arrowSize);
  ctx.closePath();
  ctx.fill();

  // Right arrow
  ctx.beginPath();
  ctx.moveTo(center.x + arrowDist + arrowSize, center.y);
  ctx.lineTo(center.x + arrowDist - arrowSize * 0.5, center.y - arrowSize);
  ctx.lineTo(center.x + arrowDist - arrowSize * 0.5, center.y + arrowSize);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // Knob indicator when active
  if (active && tilt > 0.1) {
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(knobX, knobY, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function drawActionButton(
  ctx: CanvasRenderingContext2D,
  _assets: ControlAssetMap,
  opts: {
    x: number;
    y: number;
    radius: number;
    color: string;
    iconKey?: MobileControlAssetKey;
    fallbackLabel: string;
    active?: boolean;
    disabled?: boolean;
    cooldownProgress?: number;
    glow?: number;
  },
): void {
  const {
    x, y, radius, color, fallbackLabel,
    active = false, disabled = false, cooldownProgress = 1,
  } = opts;

  ctx.save();
  const scale = active ? 0.92 : 1;
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.translate(-x, -y);

  ctx.globalAlpha = disabled ? 0.45 : active ? 0.98 : 0.88;

  // Colored circle base
  const baseGrad = ctx.createRadialGradient(x - radius * 0.2, y - radius * 0.2, radius * 0.1, x, y, radius);
  baseGrad.addColorStop(0, color);
  baseGrad.addColorStop(1, darkenHex(color, 0.65));
  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Slight border
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Inner highlight
  if (!active) {
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(x, y - radius * 0.15, radius * 0.75, Math.PI * 1.1, Math.PI * 1.9);
    ctx.fill();
  }

  // Bold letter label
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.round(radius * 0.9)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(fallbackLabel, x, y + 1);

  // Cooldown overlay
  if (cooldownProgress < 1) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, radius + 1, -Math.PI / 2, -Math.PI / 2 + (1 - cooldownProgress) * Math.PI * 2, false);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, radius + 3, -Math.PI / 2, -Math.PI / 2 + cooldownProgress * Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/** Darken a hex color by a factor (0=black, 1=unchanged) */
function darkenHex(hex: string, factor: number): string {
  const h = hex.replace('#', '').replace(/^rgb\(/, '').replace(/\)$/, '');
  if (h.length === 6) {
    const r = Math.round(parseInt(h.slice(0, 2), 16) * factor);
    const g = Math.round(parseInt(h.slice(2, 4), 16) * factor);
    const b = Math.round(parseInt(h.slice(4, 6), 16) * factor);
    return `rgb(${r},${g},${b})`;
  }
  return hex;
}

export function drawAimPad(
  ctx: CanvasRenderingContext2D,
  assets: ControlAssetMap,
  center: { x: number; y: number },
  current: { x: number; y: number },
  radius: number,
  color: string,
  active: boolean,
  assistWeight: number,
): void {
  ctx.save();
  ctx.globalAlpha = active ? 0.9 : 0.32;

  // Outer runic circle
  const rune = ctx.createRadialGradient(center.x, center.y, radius * 0.4, center.x, center.y, radius * 1.05);
  rune.addColorStop(0, 'rgba(255, 235, 198, 0.14)');
  rune.addColorStop(1, 'rgba(126, 229, 222, 0.18)');
  ctx.fillStyle = rune;
  ctx.beginPath(); ctx.arc(center.x, center.y, radius * 1.08, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.setLineDash([12, 9]);
  ctx.beginPath(); ctx.arc(center.x, center.y, radius, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);

  const dx = current.x - center.x;
  const dy = current.y - center.y;
  const magnitude = Math.min(radius * 1.35, Math.sqrt(dx * dx + dy * dy));
  const angle = Math.atan2(dy, dx || 1);
  const endX = center.x + Math.cos(angle) * magnitude;
  const endY = center.y + Math.sin(angle) * magnitude;

  ctx.strokeStyle = assistWeight > 0 ? '#95ffe4' : color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(center.x, center.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  const crosshair = assets.crosshair;
  drawGlyph(ctx, crosshair, endX, endY, radius * 0.58, '+');
  ctx.restore();
}

export function drawAbilitySlot(
  ctx: CanvasRenderingContext2D,
  assets: ControlAssetMap,
  x: number,
  y: number,
  radius: number,
): void {
  ctx.save();
  ctx.globalAlpha = 0.42;
  const stone = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
  stone.addColorStop(0, '#2c2925');
  stone.addColorStop(1, '#1a1816');
  ctx.fillStyle = stone;
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(166, 214, 210, 0.35)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  drawGlyph(ctx, assets.abilitySlot, x, y, radius * 0.96, '.');
  ctx.restore();
}
