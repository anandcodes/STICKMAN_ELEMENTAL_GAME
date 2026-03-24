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

  // Sky — bright daytime cartoon palette
  const bgColors = highContrast
    ? (['#33aaff', '#44bbff', '#66ccff', '#88ddff'] as [string, string, string, string])
    : ['#28a0ff', '#4fb8ff', '#85d4ff', '#b5e8ff'];
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, bgColors[0]);
  skyGrad.addColorStop(0.35, bgColors[1]);
  skyGrad.addColorStop(0.7, bgColors[2]);
  skyGrad.addColorStop(1, bgColors[3]);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // Fluffy Parallax Clouds (replacing stars)
  for (let i = 0; i < state.backgroundStars.length; i++) {
    if (lowQuality && i % 3 !== 0) continue;
    const cloud = state.backgroundStars[i];
    const sx = (cloud.x - cam.x * (cloud.speed || 0.1) * 0.5) % W;
    const sy = cloud.y * 0.4;
    const x = sx < 0 ? sx + W : sx;
    if (x < -60 || x > W + 60) continue;
    
    ctx.save();
    ctx.translate(x, sy);
    const alpha = 0.6 + 0.3 * Math.sin(cloud.twinkle);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    const scale = (mobileRender.isMobile ? Math.max(1.5, cloud.size * 1.2) : cloud.size) * 3;
    
    // Draw fluffy cloud shape
    ctx.beginPath();
    ctx.arc(0, 0, scale, 0, Math.PI * 2);
    ctx.arc(-scale * 1.2, scale * 0.2, scale * 0.8, 0, Math.PI * 2);
    ctx.arc(scale * 1.2, scale * 0.2, scale * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Cartoon Sun (replacing eclipse)
  const sunX = W * 0.8 - cam.x * 0.02;
  const sunY = 90;
  ctx.save();
  ctx.translate(sunX, sunY);
  
  // Sun Rays (rotating)
  ctx.rotate(nowMs * 0.0005);
  ctx.fillStyle = 'rgba(255, 235, 120, 0.2)';
  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-20, -180);
    ctx.lineTo(20, -180);
    ctx.fill();
    ctx.rotate((Math.PI * 2) / 12);
  }
  ctx.rotate(-nowMs * 0.0005);

  // Sun Core
  ctx.fillStyle = '#ffcf33';
  ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff1a0';
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI * 2); ctx.stroke();
  
  // Sun Face (cute)
  ctx.fillStyle = '#cc8c14';
  ctx.beginPath(); ctx.arc(-12, -8, 6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(12, -8, 6, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(0, 5, 12, 0.2, Math.PI - 0.2); ctx.stroke();
  
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

function drawMountains(ctx: CanvasRenderingContext2D, camX: number, W: number, H: number, _state: GameState) {
  // Furthest hills (background, light green)
  ctx.fillStyle = '#6ab85c';
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W + 50; x += 30) {
    const wx = x + camX * 0.05;
    ctx.lineTo(x, H - 220 - Math.sin(wx * 0.003) * 60 - Math.cos(wx * 0.005) * 40);
  }
  ctx.lineTo(W, H);
  ctx.fill();

  // Mid hills (medium green)
  ctx.fillStyle = '#559c48';
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W + 50; x += 30) {
    const wx = x + camX * 0.12;
    ctx.lineTo(x, H - 150 - Math.sin(wx * 0.004 + 1) * 70 - Math.cos(wx * 0.007) * 30);
  }
  ctx.lineTo(W, H);
  ctx.fill();

  // Foreground hills (darker green silhouette near ground)
  ctx.fillStyle = '#407a35';
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W + 50; x += 40) {
    const wx = x + camX * 0.25;
    ctx.lineTo(x, H - 80 - Math.sin(wx * 0.006) * 40 - Math.sin(wx * 0.01) * 20);
  }
  ctx.lineTo(W, H);
  ctx.fill();
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
      // Grass-topped dirt block
      const dirt = ctx.createLinearGradient(p.x, p.y + 10, p.x, p.y + p.height);
      dirt.addColorStop(0, '#8a5c32');
      dirt.addColorStop(1, '#5c3a1e');
      ctx.fillStyle = dirt;
      roundRect(ctx, p.x, p.y, p.width, p.height, 8);
      ctx.fill();

      // Grass top
      ctx.fillStyle = '#4cdb30';
      ctx.beginPath();
      ctx.moveTo(p.x + 8, p.y);
      ctx.lineTo(p.x + p.width - 8, p.y);
      ctx.quadraticCurveTo(p.x + p.width, p.y, p.x + p.width, p.y + 8);
      ctx.lineTo(p.x + p.width, p.y + 14);
      // Grass ragged edge
      for (let x = p.x + p.width; x >= p.x; x -= 10) {
        ctx.lineTo(x, p.y + 14 + (Math.sin(x * 0.5) * 4));
      }
      ctx.lineTo(p.x, p.y + 8);
      ctx.quadraticCurveTo(p.x, p.y, p.x + 8, p.y);
      ctx.fill();
    } else if (p.type === 'ice') {
      const iGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
      iGrad.addColorStop(0, '#cceeff'); iGrad.addColorStop(0.5, '#99ddff'); iGrad.addColorStop(1, '#66ccff');
      ctx.fillStyle = iGrad;
      roundRect(ctx, p.x, p.y, p.width, p.height, 6); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke();
    } else if (p.type === 'earth') {
      const eGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
      eGrad.addColorStop(0, '#9c7a4d'); eGrad.addColorStop(1, '#694d2d');
      ctx.fillStyle = eGrad;
      roundRect(ctx, p.x, p.y, p.width, p.height, 8); ctx.fill();
      ctx.strokeStyle = '#c49e6f'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.x + 10, p.y + 6); ctx.lineTo(p.x + 28, p.y + 14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p.x + 18, p.y + p.height * 0.45); ctx.lineTo(p.x + 24, p.y + p.height * 0.62); ctx.stroke();
    } else {
      ctx.fillStyle = '#8e96a3';
      roundRect(ctx, p.x, p.y, p.width, p.height, 8); ctx.fill();
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

  const drawGooglyEyes = (ex: number, ey: number, lookDir = enemy.facing) => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(ex - 4, ey, 4.5, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(ex + 4, ey, 4.5, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(ex - 4 + lookDir * 1.5, ey, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + 4 + lookDir * 1.5, ey, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(ex - 4 + lookDir * 1.5 - 1, ey - 1, 1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + 4 + lookDir * 1.5 - 1, ey - 1, 1, 0, Math.PI * 2); ctx.fill();
  };

  switch (enemy.type) {
    case 'slime': {
      const squish = 1 + Math.sin(t * 5 + enemy.x) * 0.15;
      ctx.fillStyle = '#4cdb30'; // Bright cartoon green
      ctx.beginPath();
      ctx.ellipse(cx, enemy.y + enemy.height - 6, enemy.width * 0.55 * squish, enemy.height * 0.45 / squish, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2a8c18'; ctx.lineWidth = 2; ctx.stroke();
      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.ellipse(cx - 4, enemy.y + enemy.height - 10, 6, 3, -0.2, 0, Math.PI * 2); ctx.fill();
      
      drawGooglyEyes(cx, cy - 2);
      break;
    }
    case 'bat': {
      const wingAngle = Math.sin(t * 12 + enemy.x) * 0.8;
      const bob = Math.sin(t * 8) * 3;
      ctx.save(); ctx.translate(0, bob);
      
      // Cute purple body
      ctx.fillStyle = '#8a5cff';
      ctx.beginPath(); ctx.ellipse(cx, cy, 10, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#4a2c99'; ctx.lineWidth = 2; ctx.stroke();
      
      // Flapping wings
      ctx.fillStyle = '#6744c4';
      ctx.save(); ctx.translate(cx - 9, cy - 2); ctx.rotate(wingAngle);
      ctx.beginPath(); ctx.ellipse(-8, 0, 12, 6, -0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.save(); ctx.translate(cx + 9, cy - 2); ctx.rotate(-wingAngle);
      ctx.beginPath(); ctx.ellipse(8, 0, 12, 6, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
      
      drawGooglyEyes(cx, cy - 1);
      
      // Little fangs
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(cx - 3, cy + 4); ctx.lineTo(cx - 1, cy + 8); ctx.lineTo(cx + 1, cy + 4); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + 3, cy + 4); ctx.lineTo(cx + 1, cy + 8); ctx.lineTo(cx - 1, cy + 4); ctx.fill();
      ctx.restore();
      break;
    }
    case 'golem': {
      // Chunky earth block
      ctx.fillStyle = '#9c7a4d';
      roundRect(ctx, enemy.x + 2, enemy.y + 4, enemy.width - 4, enemy.height - 4, 8); ctx.fill();
      ctx.strokeStyle = '#694d2d'; ctx.lineWidth = 2.5; ctx.stroke();
      // Grass top
      ctx.fillStyle = '#4cdb30';
      ctx.beginPath(); ctx.moveTo(enemy.x + 2, enemy.y + 12);
      ctx.quadraticCurveTo(cx, enemy.y, enemy.x + enemy.width - 2, enemy.y + 12);
      ctx.lineTo(enemy.x + enemy.width - 2, enemy.y + 4); 
      ctx.lineTo(enemy.x + 2, enemy.y + 4); ctx.fill();
      
      // Chunky arms
      const armSwing = Math.sin(t * 3) * 4;
      ctx.fillStyle = '#8a6b42';
      roundRect(ctx, enemy.x - 4, cy + armSwing, 10, 16, 4); ctx.fill(); ctx.stroke();
      roundRect(ctx, enemy.x + enemy.width - 6, cy - armSwing, 10, 16, 4); ctx.fill(); ctx.stroke();
      
      drawGooglyEyes(cx, cy - 4);
      break;
    }
    case 'fire_spirit': {
      const bob = Math.sin(t * 6 + enemy.x) * 4;
      ctx.save(); ctx.translate(0, bob);
      ctx.fillStyle = '#ff6b2d';
      ctx.beginPath();
      // Teardrop shape
      ctx.moveTo(cx, enemy.y);
      ctx.quadraticCurveTo(cx + 14, cy, cx + 12, cy + 8);
      ctx.arc(cx, cy + 8, 12, 0, Math.PI, false);
      ctx.quadraticCurveTo(cx - 14, cy, cx, enemy.y);
      ctx.fill();
      
      // Bright inner flame
      ctx.fillStyle = '#ffcf33';
      ctx.beginPath(); ctx.arc(cx, cy + 10, 6, 0, Math.PI * 2); ctx.fill();
      
      drawGooglyEyes(cx, cy + 6);
      ctx.restore();
      break;
    }
    case 'ice_spirit': {
      const bob = Math.sin(t * 4 + enemy.x) * 3;
      ctx.save(); ctx.translate(0, bob);
      ctx.fillStyle = '#aaddff';
      // Crystal shape
      ctx.beginPath();
      ctx.moveTo(cx, enemy.y - 4);
      ctx.lineTo(cx + 12, cy);
      ctx.lineTo(cx, enemy.y + enemy.height + 4);
      ctx.lineTo(cx - 12, cy);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#5fc4ff'; ctx.lineWidth = 2; ctx.stroke();
      
      drawGooglyEyes(cx, cy);
      ctx.restore();
      break;
    }
    case 'shadow_wolf': {
      // Cute dark doggo
      const runBounce = Math.abs(Math.sin(t * 10)) * 4;
      ctx.save(); ctx.translate(0, -runBounce);
      ctx.fillStyle = '#4a5568';
      // Body capsule
      roundRect(ctx, enemy.x + 4, cy, enemy.width - 8, enemy.height / 2, 8); ctx.fill();
      // Head
      ctx.beginPath(); ctx.arc(enemy.facing > 0 ? cx + 8 : cx - 8, cy - 2, 10, 0, Math.PI * 2); ctx.fill();
      // Ears
      ctx.beginPath(); ctx.moveTo(enemy.facing > 0 ? cx + 2 : cx - 2, cy - 10); ctx.lineTo(enemy.facing > 0 ? cx + 6 : cx - 6, cy - 18); ctx.lineTo(enemy.facing > 0 ? cx + 12 : cx - 12, cy - 8); ctx.fill();
      
      // Angry googly eyes
      const ex = enemy.facing > 0 ? cx + 10 : cx - 10;
      drawGooglyEyes(ex, cy - 4);
      ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ex - 6, cy - 9); ctx.lineTo(ex, cy - 6); ctx.lineTo(ex + 6, cy - 9); ctx.stroke(); // angry eyebrows
      ctx.restore();
      break;
    }
    case 'lava_crab': {
      const walkWobble = Math.sin(t * 15) * 0.2;
      ctx.save(); ctx.translate(cx, cy + 4); ctx.rotate(walkWobble);
      // Crab shell
      ctx.fillStyle = '#ff4757';
      ctx.beginPath(); ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#c12622'; ctx.lineWidth = 2.5; ctx.stroke();
      
      // Big cartoon claws
      ctx.fillStyle = '#ff6b2d';
      ctx.beginPath(); ctx.arc(-14, -6, 8, 0.5, Math.PI); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(14, -6, 8, 0, Math.PI - 0.5); ctx.fill(); ctx.stroke();
      
      // Eye stalks
      ctx.fillStyle = '#c12622';
      ctx.fillRect(-6, -10, 2, 6); ctx.fillRect(4, -10, 2, 6);
      drawGooglyEyes(0, -10);
      ctx.restore();
      break;
    }
    case 'thunder_hawk': {
      const flightPath = Math.sin(t * 10 + enemy.x) * 6;
      ctx.save(); ctx.translate(cx, cy + flightPath);
      // Bird body
      ctx.fillStyle = '#3a9bff';
      ctx.beginPath(); ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
      // Yellow beak
      ctx.fillStyle = '#ffcf33';
      ctx.beginPath(); ctx.moveTo(12 * enemy.facing, -2); ctx.lineTo(20 * enemy.facing, 2); ctx.lineTo(12 * enemy.facing, 6); ctx.fill();
      
      drawGooglyEyes(6 * enemy.facing, -2);
      
      // Flapping wings
      ctx.fillStyle = '#66ccff';
      const wingFlap = Math.sin(t * 20) * 10;
      ctx.beginPath(); ctx.ellipse(-2, -wingFlap, 8, 14, 0.5 * enemy.facing, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      break;
    }
    case 'void_titan': {
      const hover = Math.sin(t * 4) * 8;
      ctx.save(); ctx.translate(0, hover);
      // Giant blob boss
      ctx.fillStyle = '#8a5cff';
      ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#4a2c99'; ctx.lineWidth = 4; ctx.stroke();
      
      // Giant googly eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(cx - 10, cy - 4, 10, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 10, cy - 4, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(cx - 10 + enemy.facing * 4, cy - 4, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 10 + enemy.facing * 4, cy - 4, 4, 0, Math.PI * 2); ctx.fill();
      
      // Orbiting elemental weakness/resistance markers
      const orbit = t * 3;
      ctx.fillStyle = ELEMENT_COLORS[enemy.resistance];
      ctx.beginPath(); ctx.arc(cx + Math.cos(orbit) * 35, cy + Math.sin(orbit) * 35, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ELEMENT_COLORS[enemy.weakness];
      ctx.beginPath(); ctx.arc(cx + Math.cos(orbit + Math.PI) * 35, cy + Math.sin(orbit + Math.PI) * 35, 6, 0, Math.PI * 2); ctx.fill();
      
      ctx.restore();
      break;
    }
    case 'tree_guardian': {
      // Big angry stump boss
      ctx.fillStyle = '#8a5c32';
      roundRect(ctx, enemy.x + 4, enemy.y + 20, enemy.width - 8, enemy.height - 20, 6); ctx.fill();
      ctx.strokeStyle = '#5c3a1e'; ctx.lineWidth = 3; ctx.stroke();
      // Bushy canopy
      ctx.fillStyle = '#4cdb30';
      ctx.beginPath(); ctx.arc(cx, enemy.y + 16, 24, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx - 16, enemy.y + 24, 16, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 16, enemy.y + 24, 16, 0, Math.PI * 2); ctx.fill();
      
      drawGooglyEyes(cx, cy + 4);
      // Angry unibrow
      ctx.strokeStyle = '#111'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - 12, cy - 2); ctx.lineTo(cx, cy + 2); ctx.lineTo(cx + 12, cy - 2); ctx.stroke();
      break;
    }
    case 'boss1':
    case 'boss2':
    default: {
      // Fallback cartoon blob
      ctx.fillStyle = '#ff4757';
      roundRect(ctx, enemy.x, enemy.y, enemy.width, enemy.height, 12); ctx.fill();
      drawGooglyEyes(cx, cy - 5);
      break;
    }
  }

  if (enemy.state !== 'dead') {
    const hpRatio = Math.max(0, enemy.health / Math.max(1, enemy.maxHealth));
    const barW = Math.max(24, enemy.width);
    const barX = cx - barW / 2;
    const barY = enemy.y - 12;
    const barH = mobileRender.isMobile ? 8 : 6;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(ctx, barX, barY, barW, barH, barH / 2); ctx.fill();
    const hpGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    hpGrad.addColorStop(0, '#ff4757'); hpGrad.addColorStop(1, '#ff6b2d');
    ctx.fillStyle = hpGrad;
    roundRect(ctx, barX, barY, barW * hpRatio, barH, barH / 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; roundRect(ctx, barX, barY, barW, barH, barH / 2); ctx.stroke();
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

    const t = nowMs * 0.01;
    ctx.translate(p.x, p.y);
    
    // Cartoon Projectiles
    if (p.element === 'fire') {
      const angle = Math.atan2(p.vy, p.vx);
      ctx.rotate(angle);
      // Main fireball body
      ctx.fillStyle = '#ff6b2d';
      ctx.beginPath();
      ctx.moveTo(p.size * 1.5, 0);
      ctx.quadraticCurveTo(0, p.size * 1.2, -p.size * 2, 0);
      ctx.quadraticCurveTo(0, -p.size * 1.2, p.size * 1.5, 0);
      ctx.fill();
      ctx.strokeStyle = '#c12622'; ctx.lineWidth = 2; ctx.stroke();
      // Inner bright yellow flame
      ctx.fillStyle = '#ffcf33';
      ctx.beginPath();
      ctx.moveTo(p.size, 0);
      ctx.quadraticCurveTo(0, p.size * 0.6, -p.size, 0);
      ctx.quadraticCurveTo(0, -p.size * 0.6, p.size, 0);
      ctx.fill();
    } else if (p.element === 'water') {
      const angle = Math.atan2(p.vy, p.vx);
      ctx.rotate(angle);
      // Droplet shape
      ctx.fillStyle = '#4fa8ff';
      ctx.beginPath();
      ctx.moveTo(p.size * 1.2, 0);
      ctx.quadraticCurveTo(-p.size * 0.5, p.size, -p.size * 1.5, 0);
      ctx.quadraticCurveTo(-p.size * 0.5, -p.size, p.size * 1.2, 0);
      ctx.fill();
      ctx.strokeStyle = '#2b78d9'; ctx.lineWidth = 2; ctx.stroke();
      // Sparkle/shine
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(-p.size * 0.4, -p.size * 0.3, p.size * 0.4, p.size * 0.2, -0.2, 0, Math.PI * 2); ctx.fill();
    } else if (p.element === 'earth') {
      ctx.rotate(t * (p.vx > 0 ? 1.5 : -1.5));
      ctx.fillStyle = '#a68158';
      // Spinning cartoon rock
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
      ctx.strokeStyle = '#6e4f2b'; ctx.lineWidth = 2.5; ctx.stroke();
      // Edge highlight
      ctx.fillStyle = '#c49e6f';
      ctx.beginPath(); ctx.arc(-p.size * 0.2, -p.size * 0.2, p.size * 0.3, 0, Math.PI * 2); ctx.fill();
    } else if (p.element === 'wind') {
      const angle = Math.atan2(p.vy, p.vx);
      ctx.rotate(angle);
      ctx.strokeStyle = '#e6f4ff'; 
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      // Spiraling air blade
      ctx.beginPath(); 
      ctx.arc(0, 0, p.size, -Math.PI * 0.8, Math.PI * 0.8); 
      ctx.stroke();
      ctx.strokeStyle = '#99d6ff';
      ctx.lineWidth = 2;
      ctx.beginPath(); 
      ctx.arc(0, 0, p.size * 0.6, Math.PI * 0.2, Math.PI * 1.8); 
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const p of state.particles) {
    const lifeRatio = p.life / p.maxLife;
    // Cartoon particles stay solid mostly, then shrink
    const pSize = Math.max(0.1, p.size * (0.2 + lifeRatio * 0.8));
    
    ctx.fillStyle = p.color;
    // Instead of glowing fading circles, we do solid pop stars or puffs
    ctx.beginPath(); 
    if (p.color.indexOf('rgba') === -1 && lifeRatio > 0.5) {
      // Draw as a neat little solid star/cross for impact burst
      ctx.moveTo(p.x, p.y - pSize * 1.5);
      ctx.lineTo(p.x + pSize * 0.4, p.y - pSize * 0.4);
      ctx.lineTo(p.x + pSize * 1.5, p.y);
      ctx.lineTo(p.x + pSize * 0.4, p.y + pSize * 0.4);
      ctx.lineTo(p.x, p.y + pSize * 1.5);
      ctx.lineTo(p.x - pSize * 0.4, p.y + pSize * 0.4);
      ctx.lineTo(p.x - pSize * 1.5, p.y);
      ctx.lineTo(p.x - pSize * 0.4, p.y - pSize * 0.4);
      ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
    } else {
      // Solid puff 
      ctx.arc(p.x, p.y, mobileRender.isMobile ? Math.max(1.5, pSize * 1.2) : pSize, 0, Math.PI * 2); 
      ctx.fill();
    }
  }
}

function drawShockwaves(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const sw of state.shockwaves) {
    // We normalize life to a 0-1 scale depending on how long it was created for.
    // Assuming max life is generally ~30 for ultimates, but some are 20.
    // We'll just use a generic decay based on life.
    const alpha = Math.min(1, sw.life / 25);
    const progress = 1 - alpha;
    const currentRadius = sw.radius * progress + 20;
    
    ctx.globalAlpha = alpha;
    
    // Draw thick outer ring
    ctx.strokeStyle = sw.color;
    ctx.lineWidth = 15 * alpha;
    ctx.beginPath(); ctx.arc(sw.x, sw.y, currentRadius, 0, Math.PI * 2); ctx.stroke();
    
    // Draw thin bright inner core for the ring
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4 * alpha;
    ctx.beginPath(); ctx.arc(sw.x, sw.y, currentRadius, 0, Math.PI * 2); ctx.stroke();
    
    // Slight colored fill inside the shockwave to give it body
    ctx.fillStyle = sw.color;
    ctx.globalAlpha = alpha * 0.2;
    ctx.beginPath(); ctx.arc(sw.x, sw.y, currentRadius, 0, Math.PI * 2); ctx.fill();
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
  const cy = s.y + s.height / 2;
  const f = s.facing;
  const isDead = s.health <= 0 || state.deathAnimTimer > 0;
  const isHurt = s.hurtTimer > 0 && !isDead;
  const t = performance.now() * 0.005;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  const mainColor = ELEMENT_COLORS[state.selectedElement];
  const bodyColor = '#fff';
  const limbColor = '#ddf3ff';
  const outlineColor = '#1a2a40'; // Soft dark blue outline
  
  // Dash afterimage
  if (s.isDashing && state.graphicsQuality !== 'low') {
    for (let i = 2; i > 0; i--) {
      const alpha = 0.2 * (3 - i);
      const trailX = cx - s.facing * i * 14;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = mainColor;
      ctx.beginPath(); ctx.arc(trailX, cy - 8, 14, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Determine current animation state
  const headSize = 16;
  let bodyW = 20, bodyH = 26;
  let headY = cy - 8, bodyTop = headY + 12, bodyBot = s.y + s.height - 4;
  let walkCycle = 0, armAngleFront = 0, armAngleBack = 0;
  let legStride = 0;
  
  if (isDead) {
    // Squashed / Dead
    headY = s.y + s.height - 8;
    bodyTop = s.y + s.height - 4; 
    bodyBot = s.y + s.height;
    bodyH = 6; bodyW = 26;
    armAngleFront = Math.PI * 0.2;
    armAngleBack = -Math.PI * 0.2;
  } else if (isHurt) {
    // Hurt / Flinch (crunched)
    headY = cy;
    bodyTop = cy + 10;
    bodyH = 20; bodyW = 22;
    armAngleFront = -Math.PI * 0.8;
    armAngleBack = -Math.PI * 0.9;
  } else if (s.casting) {
    // Casting (arm thrust forward, leaning)
    headY = cy - 6;
    bodyTop = headY + 12;
    const worldMouseX = state.mousePos.x + state.camera.x;
    const worldMouseY = state.mousePos.y + state.camera.y;
    armAngleFront = Math.atan2(worldMouseY - (bodyTop + 4), worldMouseX - cx);
    armAngleBack = Math.PI; // back arm sweeps back
    if (!s.onGround) {
      legStride = 6;
    }
  } else if (!s.onGround) {
    // Jumping / Falling
    if (s.vy < 0) {
      // Rising
      headY = cy - 14; bodyH = 30; bodyW = 16;
      armAngleFront = -Math.PI / 2 + 0.5 * f;
      armAngleBack = -Math.PI / 2 - 0.5 * f;
      legStride = 4;
    } else {
      // Falling
      headY = cy - 10; bodyH = 24; bodyW = 22;
      armAngleFront = -Math.PI + 0.5 * f;
      armAngleBack = 0.5 * f;
      legStride = 8;
    }
  } else if (s.walking) {
    // Running
    walkCycle = Math.sin(s.animFrame * Math.PI / 1.5);
    const bounce = Math.abs(Math.sin(s.animFrame * Math.PI / 1.5)) * 4;
    headY = cy - 6 - bounce;
    bodyTop = headY + 12;
    bodyH = 22; bodyW = 22; // leaning slightly
    armAngleFront = walkCycle;
    armAngleBack = -walkCycle;
    legStride = walkCycle * 14;
  } else {
    // Idle
    const breathe = Math.sin(t) * 2;
    headY = cy - 10 + breathe * 0.5;
    bodyTop = headY + 14;
    bodyH = 24 - breathe;
    armAngleFront = Math.PI / 2 - 0.2 * f;
    armAngleBack = Math.PI / 2 + 0.2 * f;
  }

  // Draw shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath(); ctx.ellipse(cx, bodyBot + 4, 12, 4, 0, 0, Math.PI * 2); ctx.fill();

  // Draw Back Arm
  ctx.strokeStyle = outlineColor; ctx.lineWidth = mobileSize(6);
  ctx.beginPath(); ctx.moveTo(cx, bodyTop + 4); 
  ctx.lineTo(cx + Math.cos(armAngleBack) * 12, bodyTop + 4 + Math.sin(armAngleBack) * 12); ctx.stroke();
  ctx.strokeStyle = limbColor; ctx.lineWidth = mobileSize(4);
  ctx.beginPath(); ctx.moveTo(cx, bodyTop + 4); 
  ctx.lineTo(cx + Math.cos(armAngleBack) * 12, bodyTop + 4 + Math.sin(armAngleBack) * 12); ctx.stroke();

  // Draw Legs
  ctx.strokeStyle = outlineColor; ctx.lineWidth = mobileSize(6);
  if (isDead) {
    ctx.beginPath(); ctx.moveTo(cx, bodyBot); ctx.lineTo(cx + 10, bodyBot); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, bodyBot); ctx.lineTo(cx - 10, bodyBot); ctx.stroke();
  } else if (!s.onGround) {
    // Airborne legs (tucked or stretched)
    ctx.beginPath(); ctx.moveTo(cx, bodyBot); ctx.lineTo(cx - f * 4, bodyBot + 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, bodyBot); ctx.lineTo(cx + f * legStride, bodyBot + 8); ctx.stroke();
    ctx.strokeStyle = mainColor; ctx.lineWidth = mobileSize(4);
    ctx.beginPath(); ctx.moveTo(cx, bodyBot); ctx.lineTo(cx - f * 4, bodyBot + 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, bodyBot); ctx.lineTo(cx + f * legStride, bodyBot + 8); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(cx, bodyBot); ctx.lineTo(cx + legStride, bodyBot + 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, bodyBot); ctx.lineTo(cx - legStride + (s.walking ? 0 : 5), bodyBot + 10); ctx.stroke();
    ctx.strokeStyle = mainColor; ctx.lineWidth = mobileSize(4);
    ctx.beginPath(); ctx.moveTo(cx, bodyBot); ctx.lineTo(cx + legStride, bodyBot + 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, bodyBot); ctx.lineTo(cx - legStride + (s.walking ? 0 : 5), bodyBot + 10); ctx.stroke();
  }

  // Draw Torso
  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  roundRect(ctx, cx - bodyW / 2, bodyTop, bodyW, bodyH, 10);
  ctx.fill(); ctx.stroke();
  
  // Belly accent
  ctx.fillStyle = mainColor;
  ctx.globalAlpha = 0.8;
  ctx.beginPath(); ctx.arc(cx, bodyTop + bodyH / 2, 5, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Draw Front Arm
  ctx.strokeStyle = outlineColor; ctx.lineWidth = mobileSize(6);
  let armEndX = cx + Math.cos(armAngleFront) * 14;
  let armEndY = bodyTop + 4 + Math.sin(armAngleFront) * 14;
  
  // Stretch arm if casting
  if (s.casting) {
    armEndX = cx + Math.cos(armAngleFront) * 18;
    armEndY = bodyTop + 4 + Math.sin(armAngleFront) * 18;
    // Magic Orb
    ctx.save();
    const pulse = Math.sin(t * 8) * 3;
    ctx.globalAlpha = 0.4; ctx.fillStyle = mainColor; ctx.beginPath(); ctx.arc(armEndX, armEndY, 14 + pulse, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = mainColor; ctx.shadowBlur = 20; 
    ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(armEndX, armEndY, 6, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.8; ctx.fillStyle = mainColor; ctx.beginPath(); ctx.arc(armEndX, armEndY, 8 + pulse * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.beginPath(); ctx.moveTo(cx, bodyTop + 4); ctx.lineTo(armEndX, armEndY); ctx.stroke();
  ctx.strokeStyle = limbColor; ctx.lineWidth = mobileSize(4);
  ctx.beginPath(); ctx.moveTo(cx, bodyTop + 4); ctx.lineTo(armEndX, armEndY); ctx.stroke();

  // Draw Head
  ctx.fillStyle = outlineColor;
  ctx.beginPath(); ctx.arc(cx + (s.walking ? f * 3 : 0), headY, headSize + 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = mainColor;
  ctx.beginPath(); ctx.arc(cx + (s.walking ? f * 3 : 0), headY, headSize, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; // Highlight
  ctx.beginPath(); ctx.arc(cx + (s.walking ? f * 3 : 0) - 4, headY - 6, headSize * 0.4, 0, Math.PI * 2); ctx.fill();

  // Draw Face
  const faceX = cx + (s.walking ? f * 3 : 0);
  const eyeRadius = 4.5;
  const eyeOffsetX = f * 4;
  
  if (isDead || isHurt) {
    // X Eyes
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.5;
    const drawX = (ex: number) => {
      ctx.beginPath(); ctx.moveTo(ex - 3, headY - 3); ctx.lineTo(ex + 3, headY + 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex + 3, headY - 3); ctx.lineTo(ex - 3, headY + 3); ctx.stroke();
    };
    drawX(faceX + eyeOffsetX - 4);
    drawX(faceX + eyeOffsetX + 5);
  } else if (s.casting) {
    // Angry squint
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(faceX + eyeOffsetX - 8, headY - 3); ctx.lineTo(faceX + eyeOffsetX, headY + 2); ctx.lineTo(faceX + eyeOffsetX - 2, headY - 4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(faceX + eyeOffsetX + 10, headY - 3); ctx.lineTo(faceX + eyeOffsetX + 2, headY + 2); ctx.lineTo(faceX + eyeOffsetX + 4, headY - 4); ctx.fill();
  } else {
    // Normal / Blinking
    const isBlinking = (Math.floor(t * 10) % 60) === 0;
    if (isBlinking) {
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(faceX + eyeOffsetX - 7, headY); ctx.lineTo(faceX + eyeOffsetX - 1, headY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(faceX + eyeOffsetX + 2, headY); ctx.lineTo(faceX + eyeOffsetX + 8, headY); ctx.stroke();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(faceX + eyeOffsetX - 4, headY - 2, eyeRadius, eyeRadius + 1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(faceX + eyeOffsetX + 5, headY - 2, eyeRadius, eyeRadius + 1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath(); ctx.arc(faceX + eyeOffsetX - 4 + f * 1.5, headY - 2, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(faceX + eyeOffsetX + 5 + f * 1.5, headY - 2, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(faceX + eyeOffsetX - 4 + f * 1.5 - 1, headY - 3, 1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(faceX + eyeOffsetX + 5 + f * 1.5 - 1, headY - 3, 1, 0, Math.PI * 2); ctx.fill();
    }
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
