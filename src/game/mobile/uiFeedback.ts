import type { MobileControlAssetKey } from './config';
import { DPAD_COLORS } from '../renderers/renderConstants';

export type ControlAssetMap = Partial<Record<MobileControlAssetKey, HTMLImageElement>>;

function drawGlyph(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | undefined,
  x: number,
  y: number,
  size: number,
  fallback: string,
): void {
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
  assets: ControlAssetMap,
  center: { x: number; y: number },
  vector: { x: number; y: number },
  radius: number,
  active: boolean,
  opacity: number,
  activationPulse: number,
): void {
  if (opacity <= 0.02) return;

  const tilt = Math.min(1, Math.sqrt(vector.x * vector.x + vector.y * vector.y));
  const knobTravel = radius * 0.46;
  const knobX = center.x + vector.x * knobTravel;
  const knobY = center.y + vector.y * knobTravel;
  const baseAsset = assets.joystickBase;
  const knobAsset = assets.joystickKnob;

  ctx.save();
  ctx.globalAlpha = opacity * (active ? 0.98 : 0.7);

  if (activationPulse > 0) {
    const pulseRadius = radius * (1.1 + (1 - activationPulse) * 0.55);
    ctx.strokeStyle = `rgba(148, 255, 232, ${activationPulse * 0.28})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(center.x, center.y, pulseRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  const baseGrad = ctx.createRadialGradient(
    center.x - radius * 0.18,
    center.y - radius * 0.2,
    radius * 0.15,
    center.x,
    center.y,
    radius * 1.05,
  );
  baseGrad.addColorStop(0, DPAD_COLORS.baseLight);
  baseGrad.addColorStop(0.65, DPAD_COLORS.base);
  baseGrad.addColorStop(1, DPAD_COLORS.baseDark);
  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fill();

  if (baseAsset && baseAsset.complete && baseAsset.naturalWidth > 0) {
    ctx.globalAlpha = opacity * (active ? 0.42 : 0.28);
    ctx.drawImage(baseAsset, center.x - radius, center.y - radius, radius * 2, radius * 2);
    ctx.globalAlpha = opacity * (active ? 0.98 : 0.7);
  }

  ctx.strokeStyle = active ? 'rgba(214, 255, 249, 0.7)' : 'rgba(255,255,255,0.22)';
  ctx.lineWidth = active ? 3.5 : 2.2;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(center.x - radius * 0.58, center.y);
  ctx.lineTo(center.x + radius * 0.58, center.y);
  ctx.moveTo(center.x, center.y - radius * 0.58);
  ctx.lineTo(center.x, center.y + radius * 0.58);
  ctx.stroke();

  const knobRadius = radius * (active ? 0.44 : 0.4);
  const knobGrad = ctx.createRadialGradient(
    knobX - knobRadius * 0.2,
    knobY - knobRadius * 0.2,
    knobRadius * 0.12,
    knobX,
    knobY,
    knobRadius,
  );
  knobGrad.addColorStop(0, 'rgba(255,255,255,0.85)');
  knobGrad.addColorStop(1, 'rgba(143, 191, 205, 0.88)');
  ctx.fillStyle = knobGrad;
  ctx.beginPath();
  ctx.arc(knobX, knobY, knobRadius, 0, Math.PI * 2);
  ctx.fill();

  if (knobAsset && knobAsset.complete && knobAsset.naturalWidth > 0) {
    ctx.globalAlpha = opacity * 0.82;
    ctx.drawImage(knobAsset, knobX - knobRadius, knobY - knobRadius, knobRadius * 2, knobRadius * 2);
  }

  if (active && tilt > 0.1) {
    ctx.globalAlpha = opacity * 0.35;
    ctx.fillStyle = 'rgba(142, 255, 228, 0.8)';
    ctx.beginPath();
    ctx.arc(knobX, knobY, knobRadius * 1.35, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawActionButton(
  ctx: CanvasRenderingContext2D,
  assets: ControlAssetMap,
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
    opacity?: number;
    scale?: number;
  },
): void {
  const {
    x,
    y,
    radius,
    color,
    fallbackLabel,
    active = false,
    disabled = false,
    cooldownProgress = 1,
    glow = 0,
    opacity = 1,
    scale = 1,
    iconKey,
  } = opts;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * (active ? 0.94 : 1), scale * (active ? 0.94 : 1));
  ctx.translate(-x, -y);

  if (glow > 0) {
    ctx.globalAlpha = opacity * glow;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.28, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = opacity * (disabled ? 0.42 : active ? 0.98 : 0.86);

  const baseGrad = ctx.createRadialGradient(
    x - radius * 0.22,
    y - radius * 0.22,
    radius * 0.12,
    x,
    y,
    radius,
  );
  baseGrad.addColorStop(0, color);
  baseGrad.addColorStop(1, darkenHex(color, 0.58));
  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = active ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.35)';
  ctx.lineWidth = active ? 3.4 : 2.6;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();

  if (!active) {
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.arc(x, y - radius * 0.22, radius * 0.72, Math.PI * 1.15, Math.PI * 1.88);
    ctx.fill();
  }

  drawGlyph(
    ctx,
    iconKey ? assets[iconKey] : undefined,
    x,
    y,
    radius * 1.02,
    fallbackLabel,
  );

  if (cooldownProgress < 1) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(
      x,
      y,
      radius + 1,
      -Math.PI / 2,
      -Math.PI / 2 + (1 - cooldownProgress) * Math.PI * 2,
      false,
    );
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, radius + 3, -Math.PI / 2, -Math.PI / 2 + cooldownProgress * Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function darkenHex(hex: string, factor: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;

  const r = Math.round(parseInt(h.slice(0, 2), 16) * factor);
  const g = Math.round(parseInt(h.slice(2, 4), 16) * factor);
  const b = Math.round(parseInt(h.slice(4, 6), 16) * factor);
  return `rgb(${r},${g},${b})`;
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
  opacity: number,
): void {
  if (opacity <= 0.02) return;

  ctx.save();
  ctx.globalAlpha = opacity * (active ? 0.92 : 0.55);

  const rune = ctx.createRadialGradient(center.x, center.y, radius * 0.4, center.x, center.y, radius * 1.05);
  rune.addColorStop(0, 'rgba(255, 235, 198, 0.16)');
  rune.addColorStop(1, 'rgba(126, 229, 222, 0.2)');
  ctx.fillStyle = rune;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius * 1.04, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  const dx = current.x - center.x;
  const dy = current.y - center.y;
  const magnitude = Math.min(radius * 1.35, Math.sqrt(dx * dx + dy * dy));
  const angle = Math.atan2(dy, dx || 1);
  const endX = center.x + Math.cos(angle) * magnitude;
  const endY = center.y + Math.sin(angle) * magnitude;

  ctx.strokeStyle = assistWeight > 0 ? '#95ffe4' : color;
  ctx.lineWidth = active ? 3.5 : 2.6;
  ctx.beginPath();
  ctx.moveTo(center.x, center.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  drawGlyph(ctx, assets.crosshair, endX, endY, radius * 0.56, '+');
  ctx.restore();
}
