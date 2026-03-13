import type { GameState, Element, Projectile, Enemy, EnvObject } from '../types';
import { ELEMENT_COLORS, ELEMENT_GLOW, FONT_UI } from './renderConstants';
import { roundRect, setUiFont, setDisplayFont } from './renderUtils';
import { assetLoader } from '../services/assetLoader';

export function drawWorld(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  W: number,
  H: number,
  nowMs: number,
  shakeX: number,
  shakeY: number,
  isMobile: boolean = false
) {
  const cam = state.camera;
  const highContrast = state.highContrast;
  const lowQuality = state.graphicsQuality === 'low';

  // Sky
  const bgColors = highContrast ? (['#000000', '#050505', '#0a0a0a', '#101010'] as [string, string, string, string]) : state.bgColors;
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, bgColors[0]);
  skyGrad.addColorStop(0.4, bgColors[1]);
  skyGrad.addColorStop(0.7, bgColors[2]);
  skyGrad.addColorStop(1, bgColors[3]);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // Stars
  for (let i = 0; i < state.backgroundStars.length; i++) {
    if (lowQuality && i % 3 !== 0) continue;
    const star = state.backgroundStars[i];
    const sx = (star.x - cam.x * (star.speed || 0.1)) % W;
    const sy = star.y * 0.5;
    const x = sx < 0 ? sx + W : sx;
    if (x < -10 || x > W + 10) continue;
    const alpha = 0.4 + 0.4 * Math.sin(star.twinkle);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, sy, star.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Moon
  const moonX = 900 - cam.x * 0.05;
  ctx.fillStyle = 'rgba(255, 255, 220, 0.15)';
  ctx.beginPath(); ctx.arc(moonX, 80, 60, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 220, 0.8)';
  ctx.beginPath(); ctx.arc(moonX, 80, 30, 0, Math.PI * 2); ctx.fill();

  drawMountains(ctx, cam.x, W, H, state);

  ctx.save();
  ctx.translate(-cam.x + shakeX, -cam.y + shakeY);

  drawPlatforms(ctx, state, cam.x, W);
  drawEnvObjects(ctx, state, cam.x, W, nowMs);
  drawEnemies(ctx, state, cam.x, W, nowMs);
  drawProjectiles(ctx, state, nowMs);
  drawParticles(ctx, state);
  drawShockwaves(ctx, state);

  const s = state.stickman;
  if (s.invincibleTimer <= 0 || Math.floor(s.invincibleTimer / 4) % 2 === 0) {
    drawStickman(ctx, state);
  }

  // Element aura
  ctx.fillStyle = ELEMENT_GLOW[state.selectedElement];
  ctx.beginPath(); ctx.arc(s.x + s.width / 2, s.y + s.height / 2, 35, 0, Math.PI * 2); ctx.fill();

  // Aim Indicator
  if (state.isAiming && state.aimAngle !== undefined) {
    const ax = s.x + s.width / 2;
    const ay = s.y + s.height / 4;
    const length = 100;
    const ex = ax + Math.cos(state.aimAngle) * length;
    const ey = ay + Math.sin(state.aimAngle) * length;

    ctx.save();
    ctx.strokeStyle = ELEMENT_COLORS[state.selectedElement];
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    // Crosshair at the end
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(ex, ey, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();

  if (!lowQuality) {
    drawLights(ctx, state, W, H);
  }
}

function drawMountains(ctx: CanvasRenderingContext2D, camX: number, W: number, H: number, state: GameState) {
  // Parallax Clouds
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  for (let x = 0; x <= W + 200; x += 200) {
    const wx = x + camX * 0.02;
    const y = 100 + Math.sin(wx * 0.005) * 50;
    ctx.beginPath(); ctx.ellipse(x % W, y, 80, 25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse((x % W) + 30, y - 15, 50, 25, 0, 0, Math.PI * 2); ctx.fill();
  }

  // Furthest Mountains
  ctx.fillStyle = state.bgColors[1] || '#1a1a3e';
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W + 50; x += 50) {
    const wx = x + camX * 0.05;
    ctx.lineTo(x, H - 250 - Math.sin(wx * 0.002) * 120 - Math.sin(wx * 0.005) * 60);
  }
  ctx.lineTo(W, H); ctx.fill();

  // Mid Mountains
  ctx.fillStyle = state.bgColors[2] || '#252545';
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W + 50; x += 40) {
    const wx = x + camX * 0.12;
    ctx.lineTo(x, H - 150 - Math.sin(wx * 0.004) * 80 - Math.cos(wx * 0.009) * 40);
  }
  ctx.lineTo(W, H); ctx.fill();
}

function drawPlatforms(ctx: CanvasRenderingContext2D, state: GameState, camX: number, W: number) {
  for (const p of state.platforms) {
    if (p.x + p.width < camX - 50 || p.x > camX + W + 50) continue;
    if (p.melting) ctx.globalAlpha = (p.meltTimer || 0) / 120;

    if (p.type === 'ground') {
      const gGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
      gGrad.addColorStop(0, '#4a6a30'); gGrad.addColorStop(0.08, '#3a5520');
      gGrad.addColorStop(0.12, '#2d4015'); gGrad.addColorStop(1, '#1a2a0a');
      ctx.fillStyle = gGrad;
      roundRect(ctx, p.x, p.y, p.width, p.height, 4); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1; ctx.stroke();
    } else if (p.type === 'ice') {
      const iGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
      iGrad.addColorStop(0, '#aaddff'); iGrad.addColorStop(0.5, '#77ccff'); iGrad.addColorStop(1, '#44aaff');
      ctx.fillStyle = iGrad;
      roundRect(ctx, p.x, p.y, p.width, p.height, 4); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
    } else {
      ctx.fillStyle = '#555';
      roundRect(ctx, p.x, p.y, p.width, p.height, 4); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function drawEnemies(ctx: CanvasRenderingContext2D, state: GameState, camX: number, W: number, nowMs: number) {
  for (const enemy of state.enemies) {
    if (enemy.x + enemy.width < camX - 100 || enemy.x > camX + W + 100) continue;
    drawEnemy(ctx, enemy, nowMs);
  }
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, nowMs: number) {
  const cx = enemy.x + enemy.width / 2;
  const cy = enemy.y + enemy.height / 2;
  const t = nowMs * 0.005;

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (enemy.state === 'dead') {
    const fadeProgress = Math.max(0, enemy.hurtTimer / 60);
    ctx.globalAlpha = fadeProgress * 0.7;
    const scale = 0.5 + fadeProgress * 0.5;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
  } else if (enemy.state === 'hurt') {
    ctx.globalAlpha = 0.6 + Math.sin(nowMs * 0.02) * 0.4;
  }

  switch (enemy.type) {
    case 'slime': {
      const squish = 1 + Math.sin(t * 3 + enemy.x) * 0.1;
      ctx.fillStyle = '#44cc44';
      ctx.beginPath();
      ctx.ellipse(cx, enemy.y + enemy.height - 5, enemy.width / 2 * squish, enemy.height / 2 / squish, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(cx - 5 * enemy.facing, cy - 2, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 3 * enemy.facing, cy - 2, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(cx - 5 * enemy.facing + enemy.facing, cy - 2, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 3 * enemy.facing + enemy.facing, cy - 2, 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.arc(cx - 4, cy - 5, 3, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'bat': {
      const wingAngle = Math.sin(t * 8 + enemy.x) * 0.5;
      ctx.fillStyle = '#5a2a5a';
      ctx.beginPath(); ctx.ellipse(cx, cy, 8, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7a3a7a';
      ctx.save(); ctx.translate(cx - 8, cy - 2); ctx.rotate(wingAngle);
      ctx.beginPath(); ctx.ellipse(-8, 0, 12, 5, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.translate(cx + 8, cy - 2); ctx.rotate(-wingAngle);
      ctx.beginPath(); ctx.ellipse(8, 0, 12, 5, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#ff4444';
      ctx.beginPath(); ctx.arc(cx - 3, cy - 3, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 3, cy - 3, 2, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'golem': {
      ctx.fillStyle = '#887766';
      ctx.fillRect(enemy.x + 4, enemy.y + 10, enemy.width - 8, enemy.height - 14);
      ctx.fillStyle = '#776655';
      ctx.fillRect(enemy.x + 8, enemy.y, enemy.width - 16, 14);
      ctx.fillRect(enemy.x - 2, enemy.y + 14, 8, 20);
      ctx.fillRect(enemy.x + enemy.width - 6, enemy.y + 14, 8, 20);
      ctx.fillRect(enemy.x + 6, enemy.y + enemy.height - 8, 10, 8);
      ctx.fillRect(enemy.x + enemy.width - 16, enemy.y + enemy.height - 8, 10, 8);
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(enemy.x + 12, enemy.y + 4, 4, 4);
      ctx.fillRect(enemy.x + enemy.width - 16, enemy.y + 4, 4, 4);
      ctx.strokeStyle = '#554433'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(enemy.x + 10, enemy.y + 15);
      ctx.lineTo(enemy.x + 18, enemy.y + 25); ctx.lineTo(enemy.x + 14, enemy.y + 35); ctx.stroke();
      break;
    }
    case 'fire_spirit': {
      ctx.save(); ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 15;
      ctx.fillStyle = '#ff6600';
      ctx.beginPath(); ctx.ellipse(cx, cy, 10, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff8800';
      const fh = 8 + Math.sin(t * 5) * 3;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy - 8); ctx.lineTo(cx, cy - 8 - fh);
      ctx.lineTo(cx + 6, cy - 8); ctx.fill();
      ctx.fillStyle = '#ffff88';
      ctx.beginPath(); ctx.arc(cx - 4, cy - 2, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 4, cy - 2, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff0000';
      ctx.beginPath(); ctx.arc(cx - 4, cy - 2, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 4, cy - 2, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      break;
    }
    case 'ice_spirit': {
      ctx.save(); ctx.shadowColor = '#44aaff'; ctx.shadowBlur = 15;
      ctx.fillStyle = 'rgba(100,200,255,0.8)';
      ctx.beginPath(); ctx.ellipse(cx, cy, 10, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(150,220,255,0.9)';
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy - 8); ctx.lineTo(cx, cy - 16);
      ctx.lineTo(cx + 5, cy - 8); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(cx - 4, cy - 2, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 4, cy - 2, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0044aa';
      ctx.beginPath(); ctx.arc(cx - 4, cy - 2, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 4, cy - 2, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      break;
    }
    case 'shadow_wolf': {
      ctx.fillStyle = '#2b2b35';
      ctx.beginPath();
      ctx.moveTo(enemy.x + 2, enemy.y + enemy.height - 6);
      ctx.lineTo(enemy.x + 12, enemy.y + 6);
      ctx.lineTo(enemy.x + enemy.width - 8, enemy.y + 3);
      ctx.lineTo(enemy.x + enemy.width - 2, enemy.y + enemy.height - 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3f3f4d';
      ctx.fillRect(enemy.x + 8, enemy.y + 12, enemy.width - 16, enemy.height - 16);
      ctx.fillStyle = '#ff5b6a';
      ctx.beginPath(); ctx.arc(enemy.x + enemy.width - 10, enemy.y + 11, 2.5, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'lava_crab': {
      ctx.fillStyle = '#c14522';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 4, enemy.width * 0.45, enemy.height * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff9a4e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(enemy.x + 4, enemy.y + enemy.height - 8);
      ctx.lineTo(enemy.x - 4, enemy.y + enemy.height - 2);
      ctx.moveTo(enemy.x + enemy.width - 4, enemy.y + enemy.height - 8);
      ctx.lineTo(enemy.x + enemy.width + 4, enemy.y + enemy.height - 2);
      ctx.stroke();
      ctx.fillStyle = '#ffd37a';
      ctx.beginPath(); ctx.arc(cx - 4, cy + 2, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 4, cy + 2, 2, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'thunder_hawk': {
      ctx.save();
      ctx.shadowColor = '#73d6ff'; ctx.shadowBlur = 12;
      ctx.fillStyle = '#5d8fff';
      ctx.beginPath();
      ctx.moveTo(cx, enemy.y + 2);
      ctx.lineTo(enemy.x + enemy.width - 3, cy + 3);
      ctx.lineTo(cx, enemy.y + enemy.height - 2);
      ctx.lineTo(enemy.x + 3, cy + 3);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#dff2ff';
      ctx.beginPath();
      ctx.moveTo(cx + 2, cy - 2); ctx.lineTo(cx + 8, cy + 2); ctx.lineTo(cx + 3, cy + 9);
      ctx.lineTo(cx + 9, cy + 9); ctx.lineTo(cx, cy + 16); ctx.lineTo(cx - 4, cy + 7);
      ctx.lineTo(cx - 1, cy + 7); ctx.closePath(); ctx.fill();
      ctx.restore();
      break;
    }
    case 'boss1': {
      const boss1Img = assetLoader.getAsset('boss1');
      if (boss1Img.complete && boss1Img.naturalWidth > 0) {
        ctx.drawImage(boss1Img, enemy.x, enemy.y, enemy.width, enemy.height);
      } else {
        ctx.fillStyle = '#6f5f52';
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      }
      break;
    }
    case 'boss2': {
      const boss2Img = assetLoader.getAsset('boss2');
      if (boss2Img.complete && boss2Img.naturalWidth > 0) {
        ctx.drawImage(boss2Img, enemy.x, enemy.y, enemy.width, enemy.height);
      } else {
        ctx.fillStyle = '#4c5c7e';
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      }
      break;
    }
    case 'void_titan': {
      ctx.save();
      const hover = Math.sin(t * 5) * 10;
      const shieldGradient = ctx.createRadialGradient(cx, cy + hover, 20, cx, cy + hover, 60);
      const resColor = ELEMENT_COLORS[enemy.resistance];
      shieldGradient.addColorStop(0, '#111');
      shieldGradient.addColorStop(0.8, `${resColor}88`);
      shieldGradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = shieldGradient;
      ctx.fillRect(enemy.x - 20, enemy.y - 20 + hover, enemy.width + 40, enemy.height + 40);
      ctx.fillStyle = '#8a2be2';
      ctx.fillRect(enemy.x + 10, enemy.y + 10 + hover, enemy.width - 20, enemy.height - 20);
      ctx.fillStyle = '#39ff14';
      ctx.beginPath(); ctx.arc(cx, cy + hover, 8 + Math.sin(t * 10) * 2, 0, Math.PI * 2); ctx.fill();
      const weakColor = ELEMENT_COLORS[enemy.weakness];
      ctx.fillStyle = weakColor;
      ctx.beginPath(); ctx.arc(cx, enemy.y - 20 + hover, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
      break;
    }
    case 'tree_guardian': {
      ctx.fillStyle = '#4B3621';
      ctx.fillRect(enemy.x + 10, enemy.y + 30, enemy.width - 20, enemy.height - 30);
      ctx.fillStyle = '#2E8B57';
      ctx.beginPath(); ctx.arc(cx, enemy.y + 30, enemy.width / 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFA500';
      ctx.fillRect(cx - 15, enemy.y + 45, 8, 8); ctx.fillRect(cx + 7, enemy.y + 45, 8, 8);
      break;
    }
    default: {
      ctx.fillStyle = '#777';
      ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      break;
    }
  }

  if (enemy.state !== 'dead') {
    const hpRatio = Math.max(0, enemy.health / Math.max(1, enemy.maxHealth));
    const barX = enemy.x + 1;
    const barY = enemy.y - 9;
    const barW = Math.max(18, enemy.width - 2);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(ctx, barX, barY, barW, 5, 2); ctx.fill();
    const hpGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    hpGrad.addColorStop(0, '#ff7f90'); hpGrad.addColorStop(1, '#ffd27a');
    ctx.fillStyle = hpGrad;
    roundRect(ctx, barX, barY, barW * hpRatio, 5, 2); ctx.fill();
  }
  ctx.restore();
}

function drawEnvObjects(ctx: CanvasRenderingContext2D, state: GameState, camX: number, W: number, nowMs: number) {
  for (const obj of state.envObjects) {
    if (obj.x + obj.width < camX - 100 || obj.x > camX + W + 100) continue;
    if (obj.state === 'collected' || obj.state === 'destroyed') continue;
    drawEnvObject(ctx, obj, state, nowMs);
  }
}

function drawEnvObject(ctx: CanvasRenderingContext2D, obj: EnvObject, state: GameState, nowMs: number) {
  const t = nowMs * 0.005;
  const cx = obj.x + obj.width / 2;
  const cy = obj.y + obj.height / 2;

  switch (obj.type) {
    case 'lore_tome': {
      ctx.save();
      const floatY = cy + Math.sin(t * 3) * 3;
      ctx.shadowColor = '#7ae8ff'; ctx.shadowBlur = 15 + Math.sin(t * 5) * 5;
      ctx.fillStyle = '#102545'; roundRect(ctx, cx - 12, floatY - 14, 24, 28, 3); ctx.fill();
      ctx.fillStyle = '#fdf8e1'; ctx.fillRect(cx - 10, floatY - 12, 20, 24);
      ctx.fillStyle = '#d32f2f'; ctx.fillRect(cx - 3, floatY - 14, 6, 34);
      ctx.strokeStyle = '#7ae8ff'; ctx.lineWidth = 2; roundRect(ctx, cx - 12, floatY - 14, 24, 28, 3); ctx.stroke();
      ctx.restore();
      break;
    }
    case 'crate': {
      const burning = obj.state === 'burning';
      const baseColor = burning ? '#7a3800' : '#c08830';
      const darkColor = burning ? '#5a2000' : '#8a5818';
      ctx.fillStyle = baseColor; ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
      ctx.strokeStyle = darkColor; ctx.lineWidth = 1; ctx.beginPath();
      ctx.moveTo(obj.x, obj.y + obj.height * 0.33); ctx.lineTo(obj.x + obj.width, obj.y + obj.height * 0.33);
      ctx.moveTo(obj.x, obj.y + obj.height * 0.67); ctx.lineTo(obj.x + obj.width, obj.y + obj.height * 0.67);
      ctx.moveTo(obj.x + obj.width * 0.33, obj.y); ctx.lineTo(obj.x + obj.width * 0.33, obj.y + obj.height);
      ctx.moveTo(obj.x + obj.width * 0.67, obj.y); ctx.lineTo(obj.x + obj.width * 0.67, obj.y + obj.height);
      ctx.stroke();
      ctx.strokeStyle = darkColor; ctx.lineWidth = 2; ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
      ctx.beginPath(); ctx.moveTo(obj.x + 3, obj.y + 3); ctx.lineTo(obj.x + obj.width - 3, obj.y + obj.height - 3);
      ctx.moveTo(obj.x + obj.width - 3, obj.y + 3); ctx.lineTo(obj.x + 3, obj.y + obj.height - 3); ctx.stroke();
      ctx.fillStyle = burning ? '#cc6622' : '#ccaa66';
      [[obj.x + 5, obj.y + 5], [obj.x + obj.width - 5, obj.y + 5], [obj.x + 5, obj.y + obj.height - 5], [obj.x + obj.width - 5, obj.y + obj.height - 5]].forEach(([nx, ny]) => {
        ctx.beginPath(); ctx.arc(nx, ny, 2.5, 0, Math.PI * 2); ctx.fill();
      });
      if (burning) {
        ctx.save(); ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 12; ctx.strokeStyle = '#ff6600'; ctx.lineWidth = 1; ctx.strokeRect(obj.x, obj.y, obj.width, obj.height); ctx.restore();
      }
      break;
    }
    case 'ice': {
      ctx.save();
      const iceBlockGrad = ctx.createLinearGradient(obj.x, obj.y, obj.x + obj.width, obj.y + obj.height);
      iceBlockGrad.addColorStop(0, 'rgba(200,245,255,0.9)'); iceBlockGrad.addColorStop(0.5, 'rgba(140,210,250,0.75)'); iceBlockGrad.addColorStop(1, 'rgba(80,160,220,0.60)');
      ctx.fillStyle = iceBlockGrad; ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
      ctx.shadowColor = '#88ccff'; ctx.shadowBlur = 8; ctx.strokeStyle = 'rgba(200,240,255,0.9)'; ctx.lineWidth = 1.5; ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
      ctx.restore();
      break;
    }
    case 'gem': {
      const bob = Math.sin(t * 2 + obj.x) * 3;
      ctx.save();
      ctx.shadowColor = obj.gemColor || '#ffffff'; ctx.shadowBlur = 15;
      ctx.fillStyle = obj.gemColor || '#ffff44';
      const gcy = cy + bob;
      ctx.beginPath(); ctx.moveTo(cx, gcy - 8); ctx.lineTo(cx + 7, gcy); ctx.lineTo(cx, gcy + 8); ctx.lineTo(cx - 7, gcy); ctx.closePath(); ctx.fill();
      ctx.restore();
      break;
    }
    case 'portal': {
      const active = obj.state === 'active' || state.portalOpen;
      if (active) {
        ctx.save(); ctx.shadowColor = '#aa44ff'; ctx.shadowBlur = 25;
        const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 30);
        grad.addColorStop(0, 'rgba(255,255,255,0.9)'); grad.addColorStop(0.3, 'rgba(170,68,255,0.8)'); grad.addColorStop(1, 'rgba(60,10,120,0.0)');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.ellipse(cx, cy, 25, 30, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = 'rgba(100, 60, 150, 0.3)'; ctx.beginPath(); ctx.ellipse(cx, cy, 20, 25, 0, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    // Add other cases as needed or use a default
    default: {
        ctx.fillStyle = '#777';
        ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
        break;
    }
  }
}

function drawProjectiles(ctx: CanvasRenderingContext2D, state: GameState, nowMs: number) {
  for (const p of state.projectiles) {
    ctx.save();
    const color = ELEMENT_COLORS[p.element];
    const t = nowMs * 0.01;
    ctx.shadowColor = color; ctx.shadowBlur = 15 + Math.sin(t * 2) * 5;

    if (p.element === 'fire') {
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
      grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.6, color); grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + Math.sin(t * 5) * 0.2), 0, Math.PI * 2); ctx.fill();
    } else if (p.element === 'water') {
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; ctx.beginPath(); ctx.arc(p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.3, 0, Math.PI * 2); ctx.fill();
    } else if (p.element === 'earth') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(t * (p.vx > 0 ? 1.5 : -1.5));
      ctx.fillStyle = '#3e3422'; ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (p.element === 'wind') {
      ctx.strokeStyle = 'rgba(220, 240, 255, 0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size * 1.2, p.size * 0.5, Math.atan2(p.vy, p.vx), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const p of state.particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha; ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawShockwaves(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const sw of state.shockwaves) {
    const alpha = sw.life / 20;
    const currentRadius = sw.radius * (1 - alpha) + 20;
    ctx.globalAlpha = alpha; ctx.strokeStyle = sw.color; ctx.lineWidth = 4 * alpha;
    ctx.beginPath(); ctx.arc(sw.x, sw.y, currentRadius, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawStickman(ctx: CanvasRenderingContext2D, state: GameState) {
  if (state.deathAnimTimer > 0 && state.deathType !== 'fall') return;
  const s = state.stickman;
  const cx = s.x + s.width / 2;
  const headY = s.y + 8;
  const bodyTop = headY + 10;
  const bodyBot = s.y + s.height - 16;
  const f = s.facing;

  ctx.save();
  const accent = ELEMENT_COLORS[state.selectedElement];
  ctx.strokeStyle = '#f6fbff'; ctx.lineWidth = 3;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  const t = performance.now() * 0.005;
  ctx.save();
  ctx.shadowColor = accent; ctx.shadowBlur = 12 + Math.sin(t * 3) * 6;
  ctx.strokeStyle = accent; ctx.globalAlpha = 0.28;

  for (let i = 0; i < 3; i++) {
    const angle = t * 2 + (i * Math.PI * 2 / 3);
    const gx = cx + Math.cos(angle) * 22;
    const gy = headY + Math.sin(angle) * 12;
    ctx.beginPath(); ctx.arc(gx, gy, 2.5, 0, Math.PI * 2); ctx.stroke();
  }

  ctx.beginPath(); ctx.arc(cx, headY, 14, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, bodyTop); ctx.lineTo(cx, bodyBot + 4); ctx.stroke();
  ctx.restore();

  if (s.isDashing && state.graphicsQuality !== 'low') {
    for (let i = 2; i > 0; i--) { // Reduced from 3 to 2 for better perf
      const alpha = 0.15 * (4 - i);
      const trailX = cx - s.facing * i * 12;
      ctx.globalAlpha = alpha; ctx.strokeStyle = accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(trailX, headY, 8, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(trailX, bodyTop); ctx.lineTo(trailX, bodyBot); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(trailX, bodyBot); ctx.lineTo(trailX - 8, s.y + s.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(trailX, bodyBot); ctx.lineTo(trailX + 8, s.y + s.height); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
  }

  const headGrad = ctx.createRadialGradient(cx - 2, headY - 2, 1, cx, headY, 9);
  headGrad.addColorStop(0, '#ffffff'); headGrad.addColorStop(1, '#d9ecff');
  ctx.fillStyle = headGrad; ctx.beginPath(); ctx.arc(cx, headY, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(cx + f * 3, headY - 1, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx, bodyTop); ctx.lineTo(cx, bodyBot); ctx.stroke();

  const walkCycle = s.walking ? Math.sin(s.animFrame * Math.PI / 2) * 0.4 : 0;

  if (s.casting) {
    const worldMouseX = state.mousePos.x + state.camera.x;
    const worldMouseY = state.mousePos.y + state.camera.y;
    const armAngle = Math.atan2(worldMouseY - (bodyTop + 5), worldMouseX - cx);
    const orbX = cx + Math.cos(armAngle) * 20;
    const orbY = bodyTop + 5 + Math.sin(armAngle) * 20;

    ctx.beginPath(); ctx.moveTo(cx, bodyTop + 5); ctx.lineTo(cx + Math.cos(armAngle) * 18, bodyTop + 5 + Math.sin(armAngle) * 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, bodyTop + 5); ctx.lineTo(cx - f * 12, bodyTop + 15 + walkCycle * 8); ctx.stroke();

    ctx.save();
    const tOrb = performance.now() * 0.01;
    const pulse = Math.sin(tOrb * 3) * 2;
    ctx.globalAlpha = 0.3; ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(orbX, orbY, 12 + pulse, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = accent; ctx.shadowBlur = 15; ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(orbX, orbY, 4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.6; ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(orbX, orbY, 6 + pulse * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else {
    ctx.beginPath(); ctx.moveTo(cx, bodyTop + 5); ctx.lineTo(cx + f * 12, bodyTop + 12 + walkCycle * 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, bodyTop + 5); ctx.lineTo(cx - f * 12, bodyTop + 15 - walkCycle * 8); ctx.stroke();
  }

  if (s.jumping) {
    ctx.beginPath(); ctx.moveTo(cx, bodyBot); ctx.lineTo(cx + 8, bodyBot + 12); ctx.lineTo(cx + 5, bodyBot + 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, bodyBot); ctx.lineTo(cx - 8, bodyBot + 12); ctx.lineTo(cx - 5, bodyBot + 16); ctx.stroke();
  } else if (s.walking) {
    const legAngle = Math.sin(s.animFrame * Math.PI / 2) * 10;
    ctx.beginPath(); ctx.moveTo(cx, bodyBot); ctx.lineTo(cx + legAngle, bodyBot + 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, bodyBot); ctx.lineTo(cx - legAngle, bodyBot + 16); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(cx, bodyBot); ctx.lineTo(cx + 6, bodyBot + 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, bodyBot); ctx.lineTo(cx - 6, bodyBot + 16); ctx.stroke();
  }
  ctx.restore();
}

function drawLights(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const s = state.stickman;
    const cx = s.x - state.camera.x + s.width / 2;
    const cy = s.y - state.camera.y + s.height / 2;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 150);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
}
