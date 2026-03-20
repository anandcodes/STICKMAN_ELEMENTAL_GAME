import type { MobileControlAssetKey } from './config';

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
  assets: ControlAssetMap,
  center: { x: number; y: number },
  vector: { x: number; y: number },
  radius: number,
  active: boolean,
): void {
  const alpha = active ? 0.94 : 0.52;
  const base = assets.joystickBase;
  const knob = assets.joystickKnob;
  const tilt = Math.min(1, Math.sqrt(vector.x * vector.x + vector.y * vector.y));
  const knobX = center.x + vector.x * radius * 0.68;
  const knobY = center.y + vector.y * radius * 0.68;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = active ? 'rgba(184, 255, 214, 0.55)' : 'rgba(6, 12, 18, 0.28)';
  ctx.shadowBlur = active ? 26 : 12;

  if (base && base.complete && base.naturalWidth > 0) {
    const size = radius * 2.25;
    ctx.drawImage(base, center.x - size / 2, center.y - size / 2, size, size);
  } else {
    // Stone dial with rune etchings and gem sockets
    const ring = ctx.createRadialGradient(center.x, center.y, radius * 0.2, center.x, center.y, radius * 1.08);
    ring.addColorStop(0, '#353434');
    ring.addColorStop(0.55, '#2c2a2f');
    ring.addColorStop(1, '#1a1a1f');
    ctx.fillStyle = ring;
    ctx.beginPath(); ctx.arc(center.x, center.y, radius * 1.02, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = 'rgba(186, 214, 209, 0.35)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(center.x, center.y, radius * 1.08, 0, Math.PI * 2); ctx.stroke();

    // Rune scratches
    ctx.strokeStyle = 'rgba(120, 190, 190, 0.2)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6;
      const sx = center.x + Math.cos(a) * radius * 0.4;
      const sy = center.y + Math.sin(a) * radius * 0.4;
      const ex = center.x + Math.cos(a) * radius * 0.75;
      const ey = center.y + Math.sin(a) * radius * 0.75;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    }

    // Gem sockets
    const gemColors = ['#f5f3e4', '#ff5f2d', '#6bc8ff', '#9b6b3d'];
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + (Math.PI / 2) * i;
      const gx = center.x + Math.cos(a) * radius * 0.9;
      const gy = center.y + Math.sin(a) * radius * 0.9;
      const g = ctx.createRadialGradient(gx, gy, 1, gx, gy, radius * 0.18);
      g.addColorStop(0, '#fefdf8');
      g.addColorStop(0.4, gemColors[i]);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(gx, gy, radius * 0.16, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(gx, gy, radius * 0.16, 0, Math.PI * 2); ctx.stroke();
    }
  }

  ctx.restore();

  ctx.save();
  ctx.globalAlpha = active ? 0.98 : 0.82;
  ctx.shadowColor = 'rgba(255,230,160,0.32)';
  ctx.shadowBlur = active ? 18 + tilt * 6 : 10 + tilt * 4;
  if (knob && knob.complete && knob.naturalWidth > 0) {
    const size = radius * 1.18;
    ctx.drawImage(knob, knobX - size / 2, knobY - size / 2, size, size);
  } else {
    // Bronze lever with a simplified dragon-like silhouette
    ctx.save();
    ctx.translate(knobX, knobY);
    ctx.rotate(Math.atan2(vector.y, vector.x || 0.01) + Math.PI / 2);
    const bodyGrad = ctx.createLinearGradient(0, -radius * 0.8, 0, radius * 0.2);
    bodyGrad.addColorStop(0, '#7f5326');
    bodyGrad.addColorStop(1, '#c28a3f');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.8);
    ctx.quadraticCurveTo(radius * 0.22, -radius * 0.25, radius * 0.14, radius * 0.15);
    ctx.lineTo(-radius * 0.14, radius * 0.15);
    ctx.quadraticCurveTo(-radius * 0.22, -radius * 0.25, 0, -radius * 0.8);
    ctx.closePath();
    ctx.fill();

    // Dragon crest
    ctx.fillStyle = '#e9d3a3';
    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.78);
    ctx.lineTo(radius * 0.16, -radius * 0.62);
    ctx.lineTo(0, -radius * 0.55);
    ctx.lineTo(-radius * 0.16, -radius * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
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
  const scale = active ? 0.95 : 1;
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.translate(-x, -y);

  ctx.globalAlpha = disabled ? 0.48 : active ? 0.98 : 0.9;
  ctx.shadowColor = active ? color : 'rgba(32, 24, 14, 0.55)';
  ctx.shadowBlur = active ? 22 : 14 + glow * 10;

  // Stone base
  const stone = ctx.createRadialGradient(x - radius * 0.2, y - radius * 0.2, radius * 0.2, x, y, radius * 1.1);
  stone.addColorStop(0, '#2f2a26');
  stone.addColorStop(1, '#141312');
  ctx.fillStyle = stone;
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();

  // Bronze ring
  const bronze = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
  bronze.addColorStop(0, '#7c5a2e');
  bronze.addColorStop(1, '#c59852');
  ctx.strokeStyle = disabled ? 'rgba(124, 90, 46, 0.45)' : bronze;
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(x, y, radius - 2, 0, Math.PI * 2); ctx.stroke();

  // Rune scratch
  ctx.strokeStyle = 'rgba(224, 212, 184, 0.22)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.64, Math.PI * 0.25, Math.PI * 1.4);
  ctx.stroke();

  if (active) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.arc(x, y, radius - 1, 0, Math.PI * 2); ctx.fill();
  } else if (!disabled) {
    // Subtle breathing glow for idle action buttons
    const breath = 0.06 + 0.04 * Math.sin(performance.now() * 0.003);
    ctx.fillStyle = `rgba(255, 230, 180, ${breath})`;
    ctx.beginPath(); ctx.arc(x, y, radius + 2, 0, Math.PI * 2); ctx.fill();
  }

  drawGlyph(ctx, iconKey ? assets[iconKey] : undefined, x, y, radius * 1.1, fallbackLabel);

  if (cooldownProgress < 1) {
    ctx.fillStyle = 'rgba(5, 5, 8, 0.68)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, radius + 1, -Math.PI / 2, -Math.PI / 2 + (1 - cooldownProgress) * Math.PI * 2, false);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(154, 225, 214, 0.95)';
    ctx.lineWidth = 3.2;
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
