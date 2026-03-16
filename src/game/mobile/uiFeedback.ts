import type { MobileControlAssetKey } from './config';

export type ControlAssetMap = Partial<Record<MobileControlAssetKey, HTMLImageElement>>;

function drawGlyph(ctx: CanvasRenderingContext2D, image: HTMLImageElement | undefined, x: number, y: number, size: number, fallback: string) {
  if (image && image.complete && image.naturalWidth > 0) {
    ctx.drawImage(image, x - size / 2, y - size / 2, size, size);
    return;
  }

  ctx.fillStyle = '#f4fbff';
  ctx.font = `700 ${Math.round(size * 0.46)}px "Rajdhani", sans-serif`;
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
): void {
  const alpha = active ? 0.88 : 0.42;
  const base = assets.joystickBase;
  const knob = assets.joystickKnob;
  const knobX = center.x + vector.x * radius * 0.72;
  const knobY = center.y + vector.y * radius * 0.72;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = active ? 'rgba(96, 212, 255, 0.55)' : 'rgba(6, 18, 34, 0.3)';
  ctx.shadowBlur = active ? 22 : 10;

  if (base && base.complete && base.naturalWidth > 0) {
    const size = radius * 2.25;
    ctx.drawImage(base, center.x - size / 2, center.y - size / 2, size, size);
  } else {
    const ring = ctx.createRadialGradient(center.x, center.y, radius * 0.1, center.x, center.y, radius * 1.1);
    ring.addColorStop(0, 'rgba(147, 215, 255, 0.22)');
    ring.addColorStop(1, 'rgba(15, 28, 48, 0.78)');
    ctx.fillStyle = ring;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(205, 238, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();

  ctx.save();
  ctx.globalAlpha = active ? 0.95 : 0.78;
  ctx.shadowColor = 'rgba(255,255,255,0.28)';
  ctx.shadowBlur = 12;
  if (knob && knob.complete && knob.naturalWidth > 0) {
    const size = radius * 1.18;
    ctx.drawImage(knob, knobX - size / 2, knobY - size / 2, size, size);
  } else {
    const grad = ctx.createRadialGradient(knobX, knobY - radius * 0.14, radius * 0.1, knobX, knobY, radius * 0.46);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#73d4ff');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(knobX, knobY, radius * 0.42, 0, Math.PI * 2);
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
  },
): void {
  const {
    x, y, radius, color, iconKey, fallbackLabel,
    active = false, disabled = false, cooldownProgress = 1, glow = 0.2,
  } = opts;

  ctx.save();
  ctx.globalAlpha = disabled ? 0.48 : active ? 0.98 : 0.88;
  ctx.shadowColor = active ? color : 'rgba(11, 27, 44, 0.4)';
  ctx.shadowBlur = active ? 20 : 10 + glow * 10;

  const fill = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
  fill.addColorStop(0, disabled ? 'rgba(70, 79, 94, 0.92)' : 'rgba(18, 34, 58, 0.94)');
  fill.addColorStop(1, disabled ? 'rgba(40, 45, 56, 0.92)' : 'rgba(10, 18, 31, 0.98)');
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = disabled ? 'rgba(185, 199, 214, 0.18)' : color;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.arc(x, y, radius - 6, Math.PI * 1.08, Math.PI * 1.82);
  ctx.stroke();

  drawGlyph(ctx, iconKey ? assets[iconKey] : undefined, x, y, radius * 1.05, fallbackLabel);

  if (cooldownProgress < 1) {
    ctx.fillStyle = 'rgba(3, 8, 16, 0.64)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, radius + 1, -Math.PI / 2, -Math.PI / 2 + (1 - cooldownProgress) * Math.PI * 2, false);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(110, 239, 194, 0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, radius + 3, -Math.PI / 2, -Math.PI / 2 + cooldownProgress * Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
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
  ctx.globalAlpha = active ? 0.92 : 0.26;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
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
  ctx.globalAlpha = 0.34;
  ctx.fillStyle = 'rgba(10, 18, 32, 0.82)';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(140, 187, 214, 0.28)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  drawGlyph(ctx, assets.abilitySlot, x, y, radius * 0.96, '.');
  ctx.restore();
}
