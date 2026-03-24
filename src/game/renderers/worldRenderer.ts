import type { GameState, Enemy, EnvObject } from '../types';
import { ELEMENT_COLORS, ELEMENT_GLOW, mobileRender, mobileSize } from './renderConstants';
import { roundRect } from './renderUtils';
import { assetLoader } from '../services/assetLoader';
import {
  getEnemyAssetKey,
  getEnvObjectAssetKey,
  getHeroAnimationAssetKey,
  getPlatformAssetKey,
  getProjectileAssetKey,
} from '../services/elementalAssetMap';

export function drawWorld(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  W: number,
  H: number,
  nowMs: number,
  shakeX: number,
  shakeY: number,
  _isMobile: boolean = false
) {
  const cam = state.camera;
  const highContrast = state.highContrast;
  const lowQuality = state.graphicsQuality === 'low';

  // Sky — nocturnal eclipse palette
  const bgColors = highContrast
    ? (['#050507', '#0a0a0f', '#0f1018', '#14151e'] as [string, string, string, string])
    : ['#07060c', '#0c0f1c', '#0f1222', '#0c0d16'];
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, bgColors[0]);
  skyGrad.addColorStop(0.35, bgColors[1]);
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
    const starSize = mobileRender.isMobile ? Math.max(1.5, star.size * 1.2) : star.size;
    ctx.arc(x, sy, starSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // Eclipse
  const eclipseX = W * 0.7 - cam.x * 0.04;
  ctx.save();
  ctx.translate(eclipseX, 95);
  const corona = ctx.createRadialGradient(0, 0, 10, 0, 0, 120);
  corona.addColorStop(0, 'rgba(255, 178, 94, 0.38)');
  corona.addColorStop(0.45, 'rgba(255, 152, 64, 0.24)');
  corona.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = corona;
  ctx.beginPath(); ctx.arc(0, 0, 120, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#0a0b10';
  ctx.beginPath(); ctx.arc(0, 0, 55, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255, 206, 130, 0.9)';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(0, 0, 64, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  drawMountains(ctx, cam.x, W, H, state);

  ctx.save();
  ctx.translate(-cam.x + shakeX, -cam.y + shakeY);

  drawPlatforms(ctx, state, cam.x, W);
  drawEnvObjects(ctx, state, cam.x, W, nowMs);
  drawBalanceGuides(ctx, state, cam.x, W);
  drawEnemies(ctx, state, cam.x, W, nowMs);
  drawProjectiles(ctx, state, nowMs);
  drawParticles(ctx, state);
  drawShockwaves(ctx, state);

  const s = state.stickman;
  if (s.invincibleTimer <= 0 || Math.floor(s.invincibleTimer / 4) % 2 === 0) {
    drawStickman(ctx, state, nowMs);
  }

  // Element aura
  ctx.fillStyle = ELEMENT_GLOW[state.selectedElement];
  const auraRadius = mobileSize(35);
  ctx.beginPath(); ctx.arc(s.x + s.width / 2, s.y + s.height / 2, auraRadius, 0, Math.PI * 2); ctx.fill();

  // Aim Indicator
  if (state.isAiming && state.aimAngle !== undefined) {
    const ax = s.x + s.width / 2;
    const ay = s.y + s.height / 4;
    const length = 112 + state.aimAssistWeight * 28;
    const ex = ax + Math.cos(state.aimAngle) * length;
    const ey = ay + Math.sin(state.aimAngle) * length;
    const crosshair = assetLoader.getAsset('crosshair');

    ctx.save();
    const guide = ctx.createLinearGradient(ax, ay, ex, ey);
    guide.addColorStop(0, 'rgba(255,255,255,0.25)');
    guide.addColorStop(1, state.aimAssistWeight > 0 ? '#92ffe0' : ELEMENT_COLORS[state.selectedElement]);
    ctx.strokeStyle = guide;
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    ctx.setLineDash([]);
    if (crosshair.complete && crosshair.naturalWidth > 0) {
      const size = 20 + state.aimAssistWeight * 8;
      ctx.drawImage(crosshair, ex - size / 2, ey - size / 2, size, size);
    } else {
      ctx.beginPath();
      ctx.arc(ex, ey, 7, 0, Math.PI * 2);
      ctx.stroke();
    }

    const lockedEnemy = state.enemies.find((enemy) => enemy.id === state.aimAssistTargetId && enemy.state !== 'dead');
    if (lockedEnemy) {
      const tx = lockedEnemy.x + lockedEnemy.width / 2;
      const ty = lockedEnemy.y + lockedEnemy.height / 2;
      ctx.strokeStyle = '#92ffe0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tx, ty, Math.max(18, lockedEnemy.width * 0.7), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();

  if (!lowQuality) {
    drawLights(ctx, state, W, H);
  }
}

function drawMountains(ctx: CanvasRenderingContext2D, camX: number, W: number, H: number, state: GameState) {
  // Parallax haze
  ctx.fillStyle = 'rgba(255, 224, 186, 0.04)';
  for (let x = 0; x <= W + 200; x += 200) {
    const wx = x + camX * 0.02;
    const y = 120 + Math.sin(wx * 0.005) * 40;
    ctx.beginPath(); ctx.ellipse(x % W, y, 70, 18, 0, 0, Math.PI * 2); ctx.fill();
  }

  // Furthest ridges
  ctx.fillStyle = state.bgColors[1] || '#151525';
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W + 50; x += 50) {
    const wx = x + camX * 0.05;
    ctx.lineTo(x, H - 250 - Math.sin(wx * 0.002) * 120 - Math.sin(wx * 0.005) * 60);
  }
  ctx.lineTo(W, H); ctx.fill();

  // Mid ruins silhouette
  ctx.fillStyle = state.bgColors[2] || '#1f2236';
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W + 50; x += 40) {
    const wx = x + camX * 0.12;
    ctx.lineTo(x, H - 150 - Math.sin(wx * 0.004) * 80 - Math.cos(wx * 0.009) * 40);
  }
  ctx.lineTo(W, H); ctx.fill();

  // Ruined pillars on the horizon
  ctx.fillStyle = 'rgba(64, 70, 92, 0.7)';
  for (let x = -100; x < W + 100; x += 140) {
    const hx = x + (camX * 0.1) % W;
    const h = 50 + (x % 2 === 0 ? 20 : 0);
    ctx.fillRect((hx % W) - 6, H - 200 - h, 12, h);
    ctx.fillRect((hx % W) + 16, H - 180 - h * 0.7, 8, h * 0.7);
  }
}

function drawPlatforms(ctx: CanvasRenderingContext2D, state: GameState, camX: number, W: number) {
  for (const p of state.platforms) {
    if (p.x + p.width < camX - 50 || p.x > camX + W + 50) continue;
    if (p.melting) ctx.globalAlpha = (p.meltTimer || 0) / 120;

    const platformSprite = getLoadedAsset(getPlatformAssetKey(p.type));
    if (platformSprite) {
      ctx.drawImage(platformSprite, p.x, p.y, p.width, p.height);
      if (p.type !== 'ice') {
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x, p.y, p.width, p.height);
      }
      ctx.globalAlpha = 1;
      continue;
    }

    if (p.type === 'ground') {
      const stone = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
      stone.addColorStop(0, '#4a4b4f');
      stone.addColorStop(0.3, '#343438');
      stone.addColorStop(1, '#1e1d20');
      ctx.fillStyle = stone;
      roundRect(ctx, p.x, p.y, p.width, p.height, 6); ctx.fill();

      // Moss on the lip
      const moss = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height * 0.25);
      moss.addColorStop(0, 'rgba(86, 128, 74, 0.9)');
      moss.addColorStop(1, 'rgba(56, 82, 52, 0.0)');
      ctx.fillStyle = moss;
      ctx.fillRect(p.x, p.y - 4, p.width, p.height * 0.3);

      // Carved runes with soft glow
      ctx.strokeStyle = 'rgba(126, 220, 205, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let rx = p.x + 12; rx < p.x + p.width - 12; rx += 32) {
        ctx.moveTo(rx, p.y + p.height * 0.35);
        ctx.lineTo(rx + 6, p.y + p.height * 0.55);
        ctx.lineTo(rx - 6, p.y + p.height * 0.75);
      }
      ctx.stroke();
    } else if (p.type === 'ice') {
      const iGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
      iGrad.addColorStop(0, '#aaddff'); iGrad.addColorStop(0.5, '#77ccff'); iGrad.addColorStop(1, '#44aaff');
      ctx.fillStyle = iGrad;
      roundRect(ctx, p.x, p.y, p.width, p.height, 4); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
    } else if (p.type === 'earth') {
      const eGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
      eGrad.addColorStop(0, '#5d5343'); eGrad.addColorStop(1, '#352c23');
      ctx.fillStyle = eGrad;
      roundRect(ctx, p.x, p.y, p.width, p.height, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(p.x + 10, p.y + 6); ctx.lineTo(p.x + 28, p.y + 14); ctx.stroke();
      ctx.strokeStyle = 'rgba(126, 220, 205, 0.32)';
      ctx.beginPath(); ctx.moveTo(p.x + 18, p.y + p.height * 0.45); ctx.lineTo(p.x + 24, p.y + p.height * 0.62); ctx.stroke();
    } else {
      ctx.fillStyle = '#3a3839';
      roundRect(ctx, p.x, p.y, p.width, p.height, 5); ctx.fill();
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

  if (drawEnemySprite(ctx, enemy, nowMs)) {
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
    return;
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
    const barH = mobileRender.isMobile ? 7 : 5;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(ctx, barX, barY, barW, barH, 2); ctx.fill();
    const hpGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    hpGrad.addColorStop(0, '#ff7f90'); hpGrad.addColorStop(1, '#ffd27a');
    ctx.fillStyle = hpGrad;
    roundRect(ctx, barX, barY, barW * hpRatio, barH, 2); ctx.fill();
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
  const envSprite = getLoadedAsset(getEnvObjectAssetKey(obj.type));

  if (envSprite) {
    const pulse = 1 + Math.sin(nowMs * 0.006 + obj.x * 0.02) * 0.03;
    const drawW = obj.width * pulse;
    const drawH = obj.height * pulse;
    const drawX = cx - drawW / 2;
    const drawY = cy - drawH / 2;
    ctx.drawImage(envSprite, drawX, drawY, drawW, drawH);
    return;
  }

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
      const color = obj.gemColor || '#f5d85c';
      ctx.shadowColor = color; ctx.shadowBlur = 18;
      const gcy = cy + bob;
      ctx.beginPath();
      ctx.moveTo(cx, gcy - 14);
      ctx.lineTo(cx + 8, gcy - 2);
      ctx.lineTo(cx + 4, gcy + 14);
      ctx.lineTo(cx, gcy + 18);
      ctx.lineTo(cx - 4, gcy + 14);
      ctx.lineTo(cx - 8, gcy - 2);
      ctx.closePath();
      const crystal = ctx.createLinearGradient(cx, gcy - 18, cx, gcy + 18);
      crystal.addColorStop(0, '#fff6d8');
      crystal.addColorStop(0.45, color);
      crystal.addColorStop(1, '#2f2c3a');
      ctx.fillStyle = crystal;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
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
    case 'fire_pit': {
      const active = obj.state === 'burning';
      const grad = ctx.createLinearGradient(obj.x, obj.y, obj.x, obj.y + obj.height);
      grad.addColorStop(0, '#552211'); grad.addColorStop(1, '#221100');
      ctx.fillStyle = grad;
      ctx.fillRect(obj.x, obj.y + 10, obj.width, obj.height - 10);
      
      if (active) {
        // Lava/Fire Surface
        ctx.fillStyle = '#ff4400';
        ctx.fillRect(obj.x + 4, obj.y + 5, obj.width - 8, 10);
        
        // Flames
        const now = performance.now();
        ctx.save();
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ff8800';
        for (let i = 0; i < 4; i++) {
          const fx = obj.x + 10 + i * (obj.width / 4);
          const fh = 15 + Math.sin(now * 0.01 + i) * 8;
          ctx.beginPath();
          ctx.moveTo(fx, obj.y + 10);
          ctx.lineTo(fx + 5, obj.y + 10 - fh);
          ctx.lineTo(fx + 10, obj.y + 10);
          ctx.fill();
        }
        ctx.restore();
      }
      break;
    }
    case 'spike': {
      ctx.fillStyle = '#5a3a2a';
      const spikeW = 15;
      const count = Math.ceil(obj.width / spikeW);
      for (let i = 0; i < count; i++) {
        const sx = obj.x + i * spikeW;
        const jag = (i % 2 === 0 ? 6 : -4);
        ctx.beginPath();
        ctx.moveTo(sx, obj.y + obj.height);
        ctx.lineTo(sx + spikeW / 2, obj.y + jag);
        ctx.lineTo(sx + spikeW, obj.y + obj.height);
        ctx.fill();
        // Rust highlight
        ctx.strokeStyle = '#c07a4a';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(sx + spikeW / 2, obj.y + jag);
        ctx.lineTo(sx + spikeW, obj.y + obj.height);
        ctx.stroke();
      }
      break;
    }
    case 'rock': {
      ctx.save();
      ctx.translate(cx, cy);
      const r = obj.width / 2;
      // Irregular rock shape
      ctx.fillStyle = '#4a3d35';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        const dist = r * (0.8 + Math.sin(i * 1.5) * 0.2);
        const px = Math.cos(angle) * dist;
        const py = Math.sin(angle) * dist;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      
      // Cracks/Texture
      ctx.strokeStyle = '#322822';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, -r * 0.2);
      ctx.lineTo(r * 0.2, r * 0.3);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'wind_zone': {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.setLineDash([20, 40]);
      ctx.lineWidth = 1;
      const speed = (obj.windDirection || 0) * (obj.windStrength || 1) * 5;
      const offset = (performance.now() * 0.1 * speed) % 60;
      for (let i = 0; i < 5; i++) {
        const rowY = obj.y + (i + 0.5) * (obj.height / 5);
        ctx.beginPath();
        ctx.moveTo(obj.x, rowY);
        ctx.lineTo(obj.x + obj.width, rowY);
        ctx.lineDashOffset = -offset - i * 15;
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'water_current': {
       const grad = ctx.createLinearGradient(obj.x, obj.y, obj.x, obj.y + obj.height);
       grad.addColorStop(0, 'rgba(0, 100, 255, 0.15)');
       grad.addColorStop(1, 'rgba(0, 100, 255, 0.05)');
       ctx.fillStyle = grad;
       ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
       
       // Surface bubbles/ripples
       ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
       const speed = obj.currentSpeed || 1;
       const offset = (performance.now() * 0.05 * speed) % 40;
       for (let i = 0; i < obj.width / 30; i++) {
         const bx = obj.x + (i * 30 + offset) % obj.width;
         ctx.beginPath();
         ctx.arc(bx, obj.y + 2, 2, 0, Math.PI * 2);
         ctx.fill();
       }
       }
       break;
    case 'puddle': {
      ctx.fillStyle = 'rgba(0, 100, 255, 0.4)';
      roundRect(ctx, obj.x, obj.y, obj.width, obj.height, 5);
      ctx.fill();
      break;
    }
    case 'mud_trap': {
      const grad = ctx.createLinearGradient(obj.x, obj.y, obj.x, obj.y + obj.height);
      grad.addColorStop(0, '#4b3c2a'); grad.addColorStop(1, '#2a1f12');
      ctx.fillStyle = grad;
      roundRect(ctx, obj.x, obj.y, obj.width, obj.height, 8);
      ctx.fill();
      // Mud bubbles
      const now = performance.now() * 0.002;
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      for (let i = 0; i < 3; i++) {
        const bx = obj.x + 20 + i * (obj.width / 4) + Math.sin(now + i) * 10;
        const br = 4 + Math.sin(now * 2 + i) * 2;
        ctx.beginPath(); ctx.arc(bx, obj.y + 5, br, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'magma_pool': {
      const now = performance.now();
      const pulse = Math.sin(now * 0.003) * 0.2 + 0.8;
      ctx.save();
      ctx.shadowColor = '#ff4400';
      ctx.shadowBlur = 15;
      const grad = ctx.createLinearGradient(obj.x, obj.y, obj.x, obj.y + obj.height);
      grad.addColorStop(0, '#ff4400'); grad.addColorStop(1, '#aa2200');
      ctx.fillStyle = grad;
      roundRect(ctx, obj.x, obj.y, obj.width, obj.height, 5);
      ctx.fill();
      
      ctx.fillStyle = `rgba(255, 200, 0, ${0.3 * pulse})`;
      for (let i = 0; i < 4; i++) {
        const bx = obj.x + 10 + i * 30 + Math.sin(now * 0.005 + i) * 10;
        ctx.beginPath(); ctx.arc(bx, obj.y + 10, 6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'steam_cloud': {
      const now = performance.now() * 0.001;
      ctx.save();
      ctx.globalAlpha = 0.4 + Math.sin(now) * 0.1;
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 5; i++) {
        const sx = cx + Math.cos(now + i) * 30;
        const sy = cy + Math.sin(now * 1.5 + i) * 20;
        ctx.beginPath(); ctx.arc(sx, sy, 30, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'dust_devil': {
      const now = performance.now() * 0.01;
      ctx.save();
      ctx.strokeStyle = 'rgba(180, 160, 120, 0.6)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const r = 10 + i * 8;
        const offset = Math.sin(now + i * 0.5) * 15;
        ctx.beginPath();
        ctx.ellipse(cx + offset, obj.y + obj.height - i * 15, r, r * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'synergy_zone': {
      const now = performance.now() * 0.005;
      ctx.save();
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, obj.width / 2);
      grad.addColorStop(0, 'rgba(255,255,255,0.8)');
      grad.addColorStop(0.5, `hsl(${now % 360}, 70%, 50%)`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, (obj.width / 2) * (0.9 + Math.sin(now) * 0.1), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
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
    const projectileSprite = getLoadedAsset(getProjectileAssetKey(p.element));
    if (projectileSprite) {
      const angle = Math.atan2(p.vy, p.vx);
      const spriteSize = Math.max(18, p.size * 3.2);
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);
      ctx.drawImage(projectileSprite, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
      ctx.restore();
      continue;
    }

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
      ctx.fillStyle = '#3e3422';
      // Rock shape for projectile
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6;
        const dist = p.size * (0.8 + Math.sin(i * 2) * 0.2);
        const px = Math.cos(angle) * dist;
        const py = Math.sin(angle) * dist;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      // Highlight side
      ctx.fillStyle = '#5a4d3a';
      ctx.beginPath(); ctx.arc(-p.size * 0.2, -p.size * 0.2, p.size * 0.3, 0, Math.PI * 2); ctx.fill();
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
    const pSize = mobileRender.isMobile ? Math.max(1.5, p.size * alpha * 1.15) : p.size * alpha;
    ctx.beginPath(); ctx.arc(p.x, p.y, pSize, 0, Math.PI * 2); ctx.fill();
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

function drawStickman(ctx: CanvasRenderingContext2D, state: GameState, nowMs: number) {
  if (state.deathAnimTimer > 0 && state.deathType !== 'fall') return;

  if (drawStickmanSprite(ctx, state, nowMs)) {
    return;
  }

  const s = state.stickman;
  const cx = s.x + s.width / 2;
  const headY = s.y + 10;
  const bodyTop = headY + 12;
  const bodyBot = s.y + s.height - 14;
  const f = s.facing;

  ctx.save();
  const accent = ELEMENT_COLORS[state.selectedElement];
  const leather = ctx.createLinearGradient(cx - 10, bodyTop, cx + 10, bodyBot);
  leather.addColorStop(0, '#4a3325');
  leather.addColorStop(1, '#2f221a');

  if (state.selectedElement === 'fire') {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = 'rgba(255, 120, 60, 0.4)';
    ctx.beginPath();
    ctx.ellipse(cx, bodyTop + 12, 26, 36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (state.selectedElement === 'wind') {
    ctx.save();
    ctx.strokeStyle = 'rgba(230, 240, 255, 0.4)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const offset = (i - 1) * 6;
      ctx.beginPath();
      ctx.moveTo(cx - 18, bodyTop + 8 + offset);
      ctx.quadraticCurveTo(cx - 32, bodyTop + 14 + offset, cx - 10, bodyBot - 6 + offset);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Dash afterimage
  if (s.isDashing && state.graphicsQuality !== 'low') {
    for (let i = 2; i > 0; i--) {
      const alpha = 0.12 * (4 - i);
      const trailX = cx - s.facing * i * 10;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgba(154, 225, 214, ${alpha})`;
      ctx.beginPath(); ctx.ellipse(trailX, headY + 6, 10, 16, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Cloak
  ctx.fillStyle = '#13111a';
  ctx.beginPath();
  ctx.moveTo(cx - 14, bodyTop);
  ctx.quadraticCurveTo(cx - 24, bodyTop + 26, cx - 10, bodyBot + 6);
  ctx.quadraticCurveTo(cx + 6, bodyBot + 18, cx + 16, bodyBot - 2);
  ctx.quadraticCurveTo(cx + 22, bodyTop + 14, cx + 8, bodyTop - 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 228, 188, 0.15)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Hooded head
  ctx.fillStyle = '#1a1822';
  ctx.beginPath(); ctx.ellipse(cx, headY, 12, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255, 196, 130, 0.18)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#0c0b12';
  ctx.beginPath(); ctx.arc(cx + f * 2, headY, 6, Math.PI * 0.25, Math.PI * 1.75); ctx.fill();
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.arc(cx + f * 4, headY - 2, 2.2, 0, Math.PI * 2); ctx.fill();

  // Torso / leather armor
  ctx.fillStyle = leather;
  ctx.beginPath();
  ctx.moveTo(cx - 8, bodyTop);
  ctx.lineTo(cx + 8, bodyTop);
  ctx.lineTo(cx + 10, bodyBot - 10);
  ctx.lineTo(cx - 10, bodyBot - 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#513724'; ctx.lineWidth = 1.2; ctx.stroke();

  // Belt and clasp
  ctx.fillStyle = '#2a2019';
  ctx.fillRect(cx - 10, bodyTop + 14, 20, 4);
  ctx.fillStyle = '#c49a5a';
  ctx.fillRect(cx - 3, bodyTop + 13, 6, 6);

  // Element sigil on chest
  ctx.save();
  ctx.translate(cx, bodyTop + 8);
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.75;
  ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(5, 0); ctx.lineTo(0, 6); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fill();
  ctx.restore();

  const walkCycle = s.walking ? Math.sin(s.animFrame * Math.PI / 2) * 0.4 : 0;

  // Arms
  ctx.strokeStyle = '#bda37a'; ctx.lineWidth = mobileSize(3.5); ctx.lineCap = 'round';
  if (s.casting) {
    const worldMouseX = state.mousePos.x + state.camera.x;
    const worldMouseY = state.mousePos.y + state.camera.y;
    const armAngle = Math.atan2(worldMouseY - (bodyTop + 8), worldMouseX - cx);
    const orbX = cx + Math.cos(armAngle) * 20;
    const orbY = bodyTop + 8 + Math.sin(armAngle) * 20;

    ctx.beginPath(); ctx.moveTo(cx, bodyTop + 8); ctx.lineTo(cx + Math.cos(armAngle) * 18, bodyTop + 8 + Math.sin(armAngle) * 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, bodyTop + 12); ctx.lineTo(cx - f * 12, bodyTop + 18 + walkCycle * 8); ctx.stroke();

    ctx.save();
    const tOrb = performance.now() * 0.01;
    const pulse = Math.sin(tOrb * 3) * 2;
    ctx.globalAlpha = 0.3; ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(orbX, orbY, 12 + pulse, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = accent; ctx.shadowBlur = 15; ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(orbX, orbY, 4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.6; ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(orbX, orbY, 6 + pulse * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else {
    ctx.beginPath(); ctx.moveTo(cx, bodyTop + 8); ctx.lineTo(cx + f * 12, bodyTop + 16 + walkCycle * 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, bodyTop + 12); ctx.lineTo(cx - f * 12, bodyTop + 18 - walkCycle * 8); ctx.stroke();
  }

  // Legs / boots
  ctx.strokeStyle = '#2a2623'; ctx.lineWidth = mobileSize(4); ctx.lineCap = 'round';
  if (s.jumping) {
    ctx.beginPath(); ctx.moveTo(cx, bodyBot); ctx.lineTo(cx + 10, bodyBot + 14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, bodyBot); ctx.lineTo(cx - 10, bodyBot + 14); ctx.stroke();
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

function getLoadedAsset(key?: string): HTMLImageElement | undefined {
  if (!key || !assetLoader.hasAsset(key)) {
    return undefined;
  }
  return assetLoader.getLoadedAsset(key);
}

function drawEnemySprite(ctx: CanvasRenderingContext2D, enemy: Enemy, nowMs: number): boolean {
  const spriteKey = getEnemyAssetKey(enemy.type);
  const sprite = getLoadedAsset(spriteKey);
  if (!sprite) {
    return false;
  }

  const bob = Math.sin(nowMs * 0.01 + enemy.id * 0.3) * (
    enemy.type === 'bat' || enemy.type === 'thunder_hawk' || enemy.type === 'fire_spirit' || enemy.type === 'ice_spirit' ? 2 : 0.8
  );
  const padX = enemy.width * 0.08;
  const padY = enemy.height * 0.08;
  ctx.drawImage(
    sprite,
    enemy.x - padX,
    enemy.y - padY + bob,
    enemy.width + padX * 2,
    enemy.height + padY * 2,
  );
  return true;
}

function drawStickmanSprite(ctx: CanvasRenderingContext2D, state: GameState, nowMs: number): boolean {
  const s = state.stickman;
  const animation =
    state.deathAnimTimer > 0
      ? 'death'
      : s.casting
        ? 'attack'
        : s.walking
          ? 'run'
          : 'idle';

  const spriteKey = getHeroAnimationAssetKey(state.selectedElement, animation);
  const sprite = getLoadedAsset(spriteKey);
  if (!sprite) {
    return false;
  }

  const frameCount = 8;
  const frameRate =
    animation === 'run'
      ? 12
      : animation === 'attack'
        ? 14
        : animation === 'death'
          ? 10
          : 8;
  const frameIndex = Math.floor((nowMs / (1000 / frameRate)) % frameCount);
  const frameWidth = sprite.naturalWidth / frameCount;
  const frameHeight = sprite.naturalHeight;

  const spriteSize = Math.max(84, s.height * 1.9);
  const drawX = s.x + s.width / 2 - spriteSize / 2;
  const drawY = s.y + s.height - spriteSize + 5;
  const facingLeft = s.facing < 0;

  ctx.save();
  if (facingLeft) {
    const centerX = s.x + s.width / 2;
    ctx.translate(centerX * 2, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(
    sprite,
    frameIndex * frameWidth,
    0,
    frameWidth,
    frameHeight,
    drawX,
    drawY,
    spriteSize,
    spriteSize,
  );
  ctx.restore();

  return true;
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

  // Guardian glow if present
  const boss = state.enemies.find((e) => e.type === 'guardian_aether');
  if (boss) {
    ctx.save();
    const color = boss.phase === 1 ? '#ff6b2d' : boss.phase === 2 ? '#9c7a4d' : '#6bc4ff';
    ctx.globalAlpha = 0.2;
    const g = ctx.createRadialGradient(boss.x - state.camera.x + boss.width / 2, boss.y - state.camera.y + boss.height / 2, 10, boss.x - state.camera.x + boss.width / 2, boss.y - state.camera.y + boss.height / 2, 160);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

function drawBalanceGuides(ctx: CanvasRenderingContext2D, state: GameState, camX: number, W: number) {
  if (!state.balanceCurve.showGuides || state.screen !== 'playing') return;

  ctx.save();
  for (const obj of state.envObjects) {
    if (obj.x + obj.width < camX - 60 || obj.x > camX + W + 60) continue;

    if (obj.type === 'spike' || obj.type === 'fire_pit') {
      ctx.fillStyle = 'rgba(255, 84, 84, 0.16)';
      ctx.strokeStyle = 'rgba(255, 128, 128, 0.45)';
      ctx.lineWidth = 2;
      roundRect(ctx, obj.x - 6, obj.y - 12, obj.width + 12, obj.height + 18, 8);
      ctx.fill();
      ctx.stroke();
    }

    if (obj.type === 'wind_zone' || obj.type === 'water_current') {
      ctx.strokeStyle = obj.type === 'wind_zone' ? 'rgba(127, 232, 255, 0.42)' : 'rgba(88, 150, 255, 0.42)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      roundRect(ctx, obj.x, obj.y, obj.width, obj.height, 10);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (obj.type === 'plant' || obj.type === 'crate' || obj.type === 'rock') {
      ctx.strokeStyle = 'rgba(255, 220, 120, 0.4)';
      ctx.lineWidth = 2;
      roundRect(ctx, obj.x - 4, obj.y - 4, obj.width + 8, obj.height + 8, 8);
      ctx.stroke();
    }
  }

  const s = state.stickman;
  if (s.onGround && !s.walking) {
    const originX = s.x + s.width / 2;
    const originY = s.y + s.height / 2;
    const direction = s.facing;

    ctx.strokeStyle = 'rgba(173, 234, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 6]);
    ctx.beginPath();
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const px = originX + direction * t * 180;
      const py = originY - Math.sin(t * Math.PI) * 90 + t * 12;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}
