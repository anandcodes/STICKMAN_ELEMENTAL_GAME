import type { GameState, Element } from './types';

const ELEMENT_COLORS: Record<Element, string> = {
  fire: '#ff4400', water: '#0088ff', earth: '#66aa33', wind: '#aabbee',
};
const ELEMENT_GLOW: Record<Element, string> = {
  fire: 'rgba(255, 100, 0, 0.3)', water: 'rgba(0, 100, 255, 0.3)',
  earth: 'rgba(80, 160, 40, 0.3)', wind: 'rgba(180, 200, 240, 0.3)',
};
const ELEMENT_NAMES: Record<Element, string> = {
  fire: '🔥 Fire', water: '💧 Water', earth: '🌿 Earth', wind: '🌪️ Wind',
};

const boss1Img = new Image();
boss1Img.src = '/bosses/boss1.png';

const boss2Img = new Image();
boss2Img.src = '/bosses/boss2.png';

export function render(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, isMobile = false): void {
  ctx.save();

  if (state.screen === 'menu') { drawMenuScreen(ctx, state, W, H, isMobile); ctx.restore(); return; }
  if (state.screen === 'shop') { drawShopScreen(ctx, state, W, H, isMobile); ctx.restore(); return; }
  if (state.screen === 'levelComplete') { drawLevelCompleteScreen(ctx, state, W, H, isMobile); ctx.restore(); return; }
  if (state.screen === 'gameOver') { drawGameOverScreen(ctx, state, W, H, isMobile); ctx.restore(); return; }
  if (state.screen === 'victory') { drawVictoryScreen(ctx, state, W, H, isMobile); ctx.restore(); return; }

  const cam = state.camera;

  // IMP-4: Screen shake offset
  let shakeX = 0, shakeY = 0;
  if (state.screenShake > 0) {
    const intensity = state.screenShake * 0.8;
    shakeX = (Math.random() - 0.5) * intensity;
    shakeY = (Math.random() - 0.5) * intensity;
  }

  // Sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, state.bgColors[0]);
  skyGrad.addColorStop(0.4, state.bgColors[1]);
  skyGrad.addColorStop(0.7, state.bgColors[2]);
  skyGrad.addColorStop(1, state.bgColors[3]);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // Stars
  for (const star of state.backgroundStars) {
    const sx = star.x * 0.3 - cam.x * 0.1;
    const sy = star.y * 0.5;
    if (sx < -10 || sx > W + 10) continue;
    const alpha = 0.4 + 0.4 * Math.sin(star.twinkle);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
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

  // Platforms
  for (const p of state.platforms) {
    if (p.x + p.width < cam.x - 50 || p.x > cam.x + W + 50) continue;
    if (p.melting) ctx.globalAlpha = (p.meltTimer || 0) / 120;

    if (p.type === 'ground') {
      const gGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
      gGrad.addColorStop(0, '#3a5a2a'); gGrad.addColorStop(0.05, '#2a4a1a');
      gGrad.addColorStop(0.3, '#5a3a1a'); gGrad.addColorStop(1, '#3a2a0a');
      ctx.fillStyle = gGrad;
      ctx.fillRect(p.x, p.y, p.width, p.height);
      ctx.fillStyle = '#4a8a2a';
      ctx.fillRect(p.x, p.y, p.width, 4);
      ctx.strokeStyle = '#5aaa3a'; ctx.lineWidth = 1.5;
      for (let gx = p.x; gx < p.x + p.width; gx += 8) {
        ctx.beginPath(); ctx.moveTo(gx, p.y);
        ctx.lineTo(gx + 2, p.y - 4 - Math.random() * 3); ctx.stroke();
      }
    } else if (p.type === 'ice') {
      ctx.fillStyle = 'rgba(150, 220, 255, 0.7)';
      ctx.fillRect(p.x, p.y, p.width, p.height);
      ctx.strokeStyle = 'rgba(200, 240, 255, 0.8)'; ctx.lineWidth = 1;
      ctx.strokeRect(p.x, p.y, p.width, p.height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(p.x + 5, p.y + 2, p.width * 0.3, 3);
    } else if (p.type === 'earth') {
      ctx.fillStyle = '#6a5a3a';
      ctx.fillRect(p.x, p.y, p.width, p.height);
      ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 1;
      ctx.strokeRect(p.x, p.y, p.width, p.height);
      ctx.fillStyle = 'rgba(100, 170, 50, 0.3)';
      ctx.fillRect(p.x - 2, p.y - 2, p.width + 4, p.height + 4);
    } else {
      const sGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
      sGrad.addColorStop(0, '#7a7a8a'); sGrad.addColorStop(1, '#5a5a6a');
      ctx.fillStyle = sGrad;
      ctx.fillRect(p.x, p.y, p.width, p.height);
      ctx.strokeStyle = '#9a9aaa'; ctx.lineWidth = 1;
      ctx.strokeRect(p.x, p.y, p.width, p.height);
    }
    ctx.globalAlpha = 1;
  }

  // Environment objects
  for (const obj of state.envObjects) {
    if (obj.state === 'destroyed' || obj.state === 'melted' || obj.state === 'collected') continue;
    if (obj.x + obj.width < cam.x - 50 || obj.x > cam.x + W + 50) continue;
    drawEnvObject(ctx, obj, state);
  }

  // Enemies
  for (const enemy of state.enemies) {
    if (enemy.state === 'dead') continue;
    drawEnemy(ctx, enemy);
  }

  // Projectiles
  for (const p of state.projectiles) {
    ctx.save();
    ctx.fillStyle = ELEMENT_COLORS[p.element];
    ctx.shadowColor = ELEMENT_COLORS[p.element];
    ctx.shadowBlur = 15;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Particles
  for (const p of state.particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Stickman
  const s = state.stickman;
  if (s.invincibleTimer <= 0 || Math.floor(s.invincibleTimer / 4) % 2 === 0) {
    drawStickman(ctx, state);
  }

  // Element aura
  ctx.fillStyle = ELEMENT_GLOW[state.selectedElement];
  ctx.beginPath(); ctx.arc(s.x + s.width / 2, s.y + s.height / 2, 35, 0, Math.PI * 2); ctx.fill();

  ctx.restore(); // world transform

  // HUD
  drawHUD(ctx, state, W, H);

  // IMP-7: Minimap (for levels wider than 1.5x the canvas)
  if (state.worldWidth > W * 1.5) {
    drawMinimap(ctx, state, W, H);
  }

  // Floating texts (screen-space but offset from world)
  for (const ft of state.floatingTexts) {
    const alpha = Math.max(0, ft.life / ft.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = ft.color;
    ctx.font = `bold ${ft.size}px monospace`;
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(ft.text, ft.x - cam.x + shakeX, ft.y - cam.y + shakeY);
    ctx.restore();
  }

  // Level intro overlay
  if (state.showLevelIntro) {
    drawLevelIntro(ctx, state, W, H);
  }

  // IMP-1: Pause overlay
  if (state.paused) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⏸ PAUSED', W / 2, H / 2 - 20);

    ctx.fillStyle = '#aaaaaa';
    ctx.font = '14px monospace';
    ctx.fillText('Press ESC or tap to resume', W / 2, H / 2 + 30);

    ctx.fillStyle = '#666666';
    ctx.font = '11px monospace';
    ctx.fillText(`Score: ${state.score}  |  Level ${state.currentLevel + 1}  |  High Score: ${state.highScore}`, W / 2, H / 2 + 60);
  }

  ctx.restore();
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

  // Foreground Trees/Hills
  ctx.fillStyle = state.bgColors[3] || '#1a2a1a';
  for (let x = 0; x < W + 100; x += 25) {
    const wx = x + camX * 0.2;
    const treeH = 40 + Math.sin(wx * 0.05) * 20 + Math.sin(wx * 0.13) * 15;
    const baseY = H - 80 - Math.sin(wx * 0.008) * 30;
    ctx.beginPath(); ctx.moveTo(x - 12, baseY); ctx.lineTo(x, baseY - treeH); ctx.lineTo(x + 12, baseY); ctx.fill();
  }
}

function drawEnvObject(ctx: CanvasRenderingContext2D, obj: GameState['envObjects'][number], state: GameState) {
  const t = Date.now() * 0.005;

  switch (obj.type) {
    case 'crate': {
      ctx.fillStyle = obj.state === 'burning' ? '#8a4400' : '#aa7733';
      ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
      ctx.strokeStyle = '#664422'; ctx.lineWidth = 2;
      ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
      ctx.beginPath();
      ctx.moveTo(obj.x, obj.y); ctx.lineTo(obj.x + obj.width, obj.y + obj.height);
      ctx.moveTo(obj.x + obj.width, obj.y); ctx.lineTo(obj.x, obj.y + obj.height);
      ctx.stroke();
      break;
    }
    case 'ice': {
      ctx.fillStyle = 'rgba(150, 220, 255, 0.8)';
      ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
      ctx.strokeStyle = 'rgba(200, 240, 255, 0.9)'; ctx.lineWidth = 1;
      ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillRect(obj.x + 5, obj.y + 5, 10, 5);
      break;
    }
    case 'plant': {
      const gl = obj.growthLevel || 0;
      ctx.fillStyle = obj.state === 'burning' ? '#aa4400' : obj.state === 'grown' ? '#228822' : '#44aa22';
      ctx.fillRect(obj.x + obj.width / 2 - 2, obj.y, 4, obj.height);
      if (gl >= 1) { ctx.beginPath(); ctx.ellipse(obj.x + obj.width / 2 - 8, obj.y + obj.height * 0.3, 8, 5, -0.3, 0, Math.PI * 2); ctx.fill(); }
      if (gl >= 2) { ctx.beginPath(); ctx.ellipse(obj.x + obj.width / 2 + 8, obj.y + obj.height * 0.5, 8, 5, 0.3, 0, Math.PI * 2); ctx.fill(); }
      if (gl >= 3 || obj.state === 'grown') {
        ctx.fillStyle = '#ff66aa';
        ctx.beginPath(); ctx.arc(obj.x + obj.width / 2, obj.y - 3, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath(); ctx.arc(obj.x + obj.width / 2, obj.y - 3, 3, 0, Math.PI * 2); ctx.fill();
      }
      if (gl === 0) {
        ctx.fillStyle = '#44aa22';
        ctx.beginPath(); ctx.ellipse(obj.x + obj.width / 2, obj.y + obj.height - 3, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'rock': {
      const rGrad = ctx.createLinearGradient(obj.x, obj.y, obj.x, obj.y + obj.height);
      rGrad.addColorStop(0, '#888899'); rGrad.addColorStop(1, '#666677');
      ctx.fillStyle = rGrad;
      ctx.beginPath();
      ctx.moveTo(obj.x + 3, obj.y + obj.height);
      ctx.lineTo(obj.x, obj.y + obj.height * 0.4);
      ctx.lineTo(obj.x + obj.width * 0.3, obj.y);
      ctx.lineTo(obj.x + obj.width * 0.7, obj.y + 2);
      ctx.lineTo(obj.x + obj.width, obj.y + obj.height * 0.3);
      ctx.lineTo(obj.x + obj.width - 2, obj.y + obj.height);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#999aab'; ctx.lineWidth = 1; ctx.stroke();
      break;
    }
    case 'fire_pit': {
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.ellipse(obj.x + obj.width / 2, obj.y + obj.height, obj.width / 2 + 5, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(obj.x + 2, obj.y + 5, obj.width - 4, 8);
      if (obj.state === 'burning') {
        ctx.save(); ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 20;
        for (let i = 0; i < 3; i++) {
          const fx = obj.x + obj.width / 2 + Math.sin(t + i * 2) * 5;
          const fy = obj.y - 5 - i * 4;
          const fSize = 6 - i * 1.5 + Math.sin(t * 2 + i) * 2;
          ctx.fillStyle = ['#ff4400', '#ff8800', '#ffcc00'][i];
          ctx.beginPath(); ctx.arc(fx, fy, fSize, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
      break;
    }
    case 'puddle': {
      if (obj.state === 'frozen') {
        ctx.fillStyle = 'rgba(150, 220, 255, 0.8)';
        ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
        ctx.strokeStyle = 'rgba(200, 240, 255, 0.9)'; ctx.lineWidth = 1;
        ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
      } else {
        ctx.fillStyle = 'rgba(30, 100, 200, 0.5)';
        ctx.beginPath(); ctx.ellipse(obj.x + obj.width / 2, obj.y + obj.height / 2, obj.width / 2, obj.height / 2 + 2, 0, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'gem': {
      const bob = Math.sin(t * 2 + obj.x) * 3;
      const glow = 0.5 + Math.sin(t * 3 + obj.x) * 0.3;
      ctx.save();
      ctx.shadowColor = obj.gemColor || '#ffffff';
      ctx.shadowBlur = 10 + glow * 5;
      ctx.fillStyle = obj.gemColor || '#ffff44';
      // Diamond shape
      const cx = obj.x + obj.width / 2;
      const cy = obj.y + obj.height / 2 + bob;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 8); ctx.lineTo(cx + 7, cy);
      ctx.lineTo(cx, cy + 8); ctx.lineTo(cx - 7, cy);
      ctx.closePath(); ctx.fill();
      // Inner shine
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 4); ctx.lineTo(cx + 3, cy);
      ctx.lineTo(cx, cy + 4); ctx.lineTo(cx - 3, cy);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      break;
    }
    case 'health_potion': {
      const bob = Math.sin(t * 2 + obj.x) * 2;
      // IMP-9: Pulsing glow circle underneath
      const glowAlpha = 0.3 + Math.sin(t * 3) * 0.2;
      ctx.save();
      ctx.globalAlpha = glowAlpha;
      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.arc(obj.x + 8, obj.y + 18 + bob, 12 + Math.sin(t * 4) * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
      ctx.save();
      ctx.shadowColor = '#ff4444'; ctx.shadowBlur = 8;
      // Bottle
      ctx.fillStyle = '#cc2222';
      ctx.fillRect(obj.x + 3, obj.y + 6 + bob, 10, 12);
      ctx.fillStyle = '#aa1111';
      ctx.fillRect(obj.x + 5, obj.y + 2 + bob, 6, 6);
      // Stopper
      ctx.fillStyle = '#886644';
      ctx.fillRect(obj.x + 5, obj.y + bob, 6, 3);
      // Cross
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(obj.x + 7, obj.y + 9 + bob, 2, 6);
      ctx.fillRect(obj.x + 5, obj.y + 11 + bob, 6, 2);
      ctx.restore();
      break;
    }
    case 'mana_crystal': {
      const bob = Math.sin(t * 2 + obj.x) * 2;
      // IMP-9: Pulsing glow circle underneath
      const glowAlpha2 = 0.3 + Math.sin(t * 3 + 1) * 0.2;
      ctx.save();
      ctx.globalAlpha = glowAlpha2;
      ctx.fillStyle = '#4488ff';
      ctx.beginPath();
      ctx.arc(obj.x + 8, obj.y + 18 + bob, 12 + Math.sin(t * 4 + 1) * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
      ctx.save();
      ctx.shadowColor = '#4488ff'; ctx.shadowBlur = 10;
      ctx.fillStyle = '#4488ff';
      const cx = obj.x + 8; const cy = obj.y + 10 + bob;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 10); ctx.lineTo(cx + 6, cy - 3);
      ctx.lineTo(cx + 4, cy + 8); ctx.lineTo(cx - 4, cy + 8);
      ctx.lineTo(cx - 6, cy - 3);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 6); ctx.lineTo(cx + 3, cy - 1);
      ctx.lineTo(cx, cy + 4); ctx.lineTo(cx - 3, cy - 1);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      break;
    }
    case 'portal': {
      const active = obj.state === 'active' || state.portalOpen;
      ctx.save();
      if (active) {
        ctx.shadowColor = '#aa44ff'; ctx.shadowBlur = 25;
        // Swirling portal
        const grad = ctx.createRadialGradient(
          obj.x + obj.width / 2, obj.y + obj.height / 2, 5,
          obj.x + obj.width / 2, obj.y + obj.height / 2, 30
        );
        grad.addColorStop(0, 'rgba(255,255,255,0.9)');
        grad.addColorStop(0.3, 'rgba(170,68,255,0.8)');
        grad.addColorStop(0.7, 'rgba(100,20,200,0.5)');
        grad.addColorStop(1, 'rgba(60,10,120,0.0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(obj.x + obj.width / 2, obj.y + obj.height / 2, 25, 30, 0, 0, Math.PI * 2);
        ctx.fill();
        // Swirl lines
        ctx.strokeStyle = 'rgba(200,150,255,0.6)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const angle = t * 2 + (i * Math.PI / 2);
          const r1 = 10; const r2 = 25;
          ctx.beginPath();
          ctx.arc(obj.x + obj.width / 2, obj.y + obj.height / 2, r1 + (r2 - r1) * 0.5, angle, angle + 1);
          ctx.stroke();
        }
        // "Enter" text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ENTER', obj.x + obj.width / 2, obj.y - 10);
      } else {
        // Inactive portal - dim
        ctx.fillStyle = 'rgba(100, 60, 150, 0.3)';
        ctx.beginPath();
        ctx.ellipse(obj.x + obj.width / 2, obj.y + obj.height / 2, 20, 25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(100, 60, 150, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Lock icon
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '14px serif';
        ctx.textAlign = 'center';
        ctx.fillText('🔒', obj.x + obj.width / 2, obj.y + obj.height / 2 + 5);
      }
      ctx.restore();
      break;
    }
    case 'spike': {
      ctx.fillStyle = '#666677';
      const spikes = Math.floor(obj.width / 12);
      for (let i = 0; i < spikes; i++) {
        const sx = obj.x + i * (obj.width / spikes);
        const sw = obj.width / spikes;
        ctx.beginPath();
        ctx.moveTo(sx, obj.y + obj.height);
        ctx.lineTo(sx + sw / 2, obj.y);
        ctx.lineTo(sx + sw, obj.y + obj.height);
        ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#8888aa';
      for (let i = 0; i < spikes; i++) {
        const sx = obj.x + i * (obj.width / spikes);
        const sw = obj.width / spikes;
        ctx.beginPath();
        ctx.moveTo(sx + sw * 0.3, obj.y + obj.height);
        ctx.lineTo(sx + sw / 2, obj.y + 3);
        ctx.lineTo(sx + sw * 0.7, obj.y + obj.height);
        ctx.closePath(); ctx.fill();
      }
      break;
    }
    case 'synergy_zone': {
      ctx.save();
      const cx = obj.x + obj.width / 2;
      const cy = obj.y + obj.height / 2;
      if (obj.state === 'burning') { // Firestorm
        ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 30;
        ctx.strokeStyle = 'rgba(255,100,0,0.4)'; ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
          const r = (obj.width / 2) * (0.5 + 0.5 * Math.sin(t * 2 + i));
          ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.4, 0, 0, Math.PI * 2); ctx.stroke();
        }
      } else if (obj.state === 'lightning') { // Lightning Storm
        ctx.shadowColor = '#44ffff'; ctx.shadowBlur = 20;
        ctx.strokeStyle = '#44ffff'; ctx.lineWidth = 2;
        if (Math.random() > 0.8) {
          ctx.beginPath(); ctx.moveTo(cx, cy - 30);
          ctx.lineTo(cx + (Math.random() - 0.5) * 40, cy + (Math.random() - 0.5) * 40);
          ctx.stroke();
        }
      }
      ctx.restore();
      break;
    }
    case 'mud_trap': {
      ctx.fillStyle = '#5a4a3a';
      roundRect(ctx, obj.x, obj.y, obj.width, obj.height, 4);
      ctx.fill();
      ctx.fillStyle = '#3a2a1a';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath(); ctx.arc(obj.x + Math.random() * obj.width, obj.y + Math.random() * obj.height, 3, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'magma_pool': {
      const grad = ctx.createLinearGradient(obj.x, obj.y, obj.x, obj.y + obj.height);
      grad.addColorStop(0, '#ff4400'); grad.addColorStop(1, '#aa2200');
      ctx.fillStyle = grad;
      roundRect(ctx, obj.x, obj.y, obj.width, obj.height, 5);
      ctx.fill();
      ctx.fillStyle = '#ffff00';
      if (Math.random() > 0.7) ctx.fillRect(obj.x + Math.random() * obj.width, obj.y, 4, 2);
      break;
    }
    case 'steam_cloud': {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 6; i++) {
        const sx = obj.x + Math.sin(t + i) * 20 + obj.width / 2;
        const sy = obj.y + Math.cos(t + i) * 20 + obj.height / 2;
        ctx.beginPath(); ctx.arc(sx, sy, 30 + Math.sin(t * 2 + i) * 10, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'dust_devil': {
      ctx.save();
      ctx.strokeStyle = 'rgba(200,180,150,0.6)'; ctx.lineWidth = 4;
      const cx = obj.x + obj.width / 2;
      for (let i = 0; i < 5; i++) {
        const r = 20 + i * 15;
        const off = Math.sin(t * 4 + i) * 10;
        ctx.beginPath(); ctx.ellipse(cx + off, obj.y + obj.height - i * 20, r, r / 3, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
      break;
    }
  }
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: GameState['enemies'][number]) {
  const cx = enemy.x + enemy.width / 2;
  const cy = enemy.y + enemy.height / 2;
  const t = Date.now() * 0.005;

  if (enemy.state === 'hurt') {
    ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.02) * 0.4;
  }

  // BUG-5 / IMP-5: Dead enemy fade-out and shrink animation
  if (enemy.state === 'dead') {
    const fadeProgress = Math.max(0, enemy.hurtTimer / 60);
    ctx.globalAlpha = fadeProgress * 0.7;
    const scale = 0.5 + fadeProgress * 0.5;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
  }

  ctx.save();

  switch (enemy.type) {
    case 'slime': {
      const squish = 1 + Math.sin(t * 3 + enemy.x) * 0.1;
      ctx.fillStyle = '#44cc44';
      ctx.beginPath();
      ctx.ellipse(cx, enemy.y + enemy.height - 5, enemy.width / 2 * squish, enemy.height / 2 / squish, 0, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(cx - 5 * enemy.facing, cy - 2, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 3 * enemy.facing, cy - 2, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(cx - 5 * enemy.facing + enemy.facing, cy - 2, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 3 * enemy.facing + enemy.facing, cy - 2, 2, 0, Math.PI * 2); ctx.fill();
      // Shine
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.arc(cx - 4, cy - 5, 3, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'bat': {
      const wingAngle = Math.sin(t * 8 + enemy.x) * 0.5;
      ctx.fillStyle = '#5a2a5a';
      // Body
      ctx.beginPath(); ctx.ellipse(cx, cy, 8, 10, 0, 0, Math.PI * 2); ctx.fill();
      // Wings
      ctx.fillStyle = '#7a3a7a';
      ctx.save(); ctx.translate(cx - 8, cy - 2); ctx.rotate(wingAngle);
      ctx.beginPath(); ctx.ellipse(-8, 0, 12, 5, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.translate(cx + 8, cy - 2); ctx.rotate(-wingAngle);
      ctx.beginPath(); ctx.ellipse(8, 0, 12, 5, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // Eyes
      ctx.fillStyle = '#ff4444';
      ctx.beginPath(); ctx.arc(cx - 3, cy - 3, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 3, cy - 3, 2, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'golem': {
      // Body
      ctx.fillStyle = '#887766';
      ctx.fillRect(enemy.x + 4, enemy.y + 10, enemy.width - 8, enemy.height - 14);
      // Head
      ctx.fillStyle = '#776655';
      ctx.fillRect(enemy.x + 8, enemy.y, enemy.width - 16, 14);
      // Arms
      ctx.fillRect(enemy.x - 2, enemy.y + 14, 8, 20);
      ctx.fillRect(enemy.x + enemy.width - 6, enemy.y + 14, 8, 20);
      // Legs
      ctx.fillRect(enemy.x + 6, enemy.y + enemy.height - 8, 10, 8);
      ctx.fillRect(enemy.x + enemy.width - 16, enemy.y + enemy.height - 8, 10, 8);
      // Eyes
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(enemy.x + 12, enemy.y + 4, 4, 4);
      ctx.fillRect(enemy.x + enemy.width - 16, enemy.y + 4, 4, 4);
      // Cracks
      ctx.strokeStyle = '#554433'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(enemy.x + 10, enemy.y + 15);
      ctx.lineTo(enemy.x + 18, enemy.y + 25); ctx.lineTo(enemy.x + 14, enemy.y + 35); ctx.stroke();
      break;
    }
    case 'fire_spirit': {
      ctx.save(); ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 15;
      ctx.fillStyle = '#ff6600';
      ctx.beginPath(); ctx.ellipse(cx, cy, 10, 12, 0, 0, Math.PI * 2); ctx.fill();
      // Flame top
      ctx.fillStyle = '#ff8800';
      const fh = 8 + Math.sin(t * 5) * 3;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy - 8); ctx.lineTo(cx, cy - 8 - fh);
      ctx.lineTo(cx + 6, cy - 8); ctx.fill();
      // Eyes
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
      // Crystal top
      ctx.fillStyle = 'rgba(150,220,255,0.9)';
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy - 8); ctx.lineTo(cx, cy - 16);
      ctx.lineTo(cx + 5, cy - 8); ctx.fill();
      // Eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(cx - 4, cy - 2, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 4, cy - 2, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0044aa';
      ctx.beginPath(); ctx.arc(cx - 4, cy - 2, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 4, cy - 2, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      break;
    }
    case 'boss1': {
      if (boss1Img.complete && boss1Img.naturalWidth > 0) {
        ctx.save();
        if (enemy.facing === -1) {
          ctx.scale(-1, 1);
          ctx.drawImage(boss1Img, -enemy.x - enemy.width, enemy.y, enemy.width, enemy.height);
        } else {
          ctx.drawImage(boss1Img, enemy.x, enemy.y, enemy.width, enemy.height);
        }
        ctx.restore();
      } else {
        ctx.fillStyle = '#443322';
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      }
      break;
    }
    case 'boss2': {
      if (boss2Img.complete && boss2Img.naturalWidth > 0) {
        ctx.save();
        if (enemy.facing === -1) {
          ctx.scale(-1, 1);
          ctx.drawImage(boss2Img, -enemy.x - enemy.width, enemy.y, enemy.width, enemy.height);
        } else {
          ctx.drawImage(boss2Img, enemy.x, enemy.y, enemy.width, enemy.height);
        }
        ctx.restore();
      } else {
        ctx.fillStyle = '#221144';
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      }
      break;
    }
  }

  // Health bar above enemy
  if (enemy.health < enemy.maxHealth) {
    const barW = enemy.width + 10;
    const barH = 4;
    const barX = enemy.x + (enemy.width - barW) / 2;
    const barY = enemy.y - 10;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = enemy.health > enemy.maxHealth * 0.3 ? '#44cc44' : '#ff4444';
    ctx.fillRect(barX, barY, barW * (enemy.health / enemy.maxHealth), barH);
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawStickman(ctx: CanvasRenderingContext2D, state: GameState) {
  const s = state.stickman;
  const cx = s.x + s.width / 2;
  const headY = s.y + 8;
  const bodyTop = headY + 10;
  const bodyBot = s.y + s.height - 16;
  const f = s.facing;

  ctx.save();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  // Head
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(cx, headY, 8, 0, Math.PI * 2); ctx.fill();
  // Eye
  ctx.fillStyle = ELEMENT_COLORS[state.selectedElement];
  ctx.beginPath(); ctx.arc(cx + f * 3, headY - 1, 2, 0, Math.PI * 2); ctx.fill();
  // Body
  ctx.beginPath(); ctx.moveTo(cx, bodyTop); ctx.lineTo(cx, bodyBot); ctx.stroke();

  const walkCycle = s.walking ? Math.sin(s.animFrame * Math.PI / 2) * 0.4 : 0;

  if (s.casting) {
    const worldMouseX = state.mousePos.x + state.camera.x;
    const worldMouseY = state.mousePos.y + state.camera.y;
    const armAngle = Math.atan2(worldMouseY - (bodyTop + 5), worldMouseX - cx);
    ctx.beginPath(); ctx.moveTo(cx, bodyTop + 5);
    ctx.lineTo(cx + Math.cos(armAngle) * 18, bodyTop + 5 + Math.sin(armAngle) * 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, bodyTop + 5);
    ctx.lineTo(cx - f * 12, bodyTop + 15 + walkCycle * 8); ctx.stroke();
    // Orb
    ctx.fillStyle = ELEMENT_COLORS[state.selectedElement];
    ctx.shadowColor = ELEMENT_COLORS[state.selectedElement]; ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(armAngle) * 20, bodyTop + 5 + Math.sin(armAngle) * 20, 4, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  } else {
    ctx.beginPath(); ctx.moveTo(cx, bodyTop + 5);
    ctx.lineTo(cx + f * 12, bodyTop + 12 + walkCycle * 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, bodyTop + 5);
    ctx.lineTo(cx - f * 12, bodyTop + 15 - walkCycle * 8); ctx.stroke();
  }

  // Legs
  if (s.jumping) {
    ctx.beginPath(); ctx.moveTo(cx, bodyBot);
    ctx.lineTo(cx + 8, bodyBot + 12); ctx.lineTo(cx + 5, bodyBot + 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, bodyBot);
    ctx.lineTo(cx - 8, bodyBot + 12); ctx.lineTo(cx - 5, bodyBot + 16); ctx.stroke();
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

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState, W: number, _H: number) {
  const s = state.stickman;

  // Dark panel top-left
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  roundRect(ctx, 10, 10, 220, 80, 8);
  ctx.fill();

  // Level indicator
  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`Level ${state.currentLevel + 1}: ${state.levelName}`, 18, 26);

  // Health bar
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(18, 32, 196, 14);
  const hpPct = Math.max(0, s.health / s.maxHealth);
  const hpGrad = ctx.createLinearGradient(18, 0, 214, 0);
  hpGrad.addColorStop(0, '#ff2222'); hpGrad.addColorStop(1, '#ff6644');
  ctx.fillStyle = hpGrad;
  ctx.fillRect(18, 32, 196 * hpPct, 14);
  ctx.strokeStyle = '#ffffff33'; ctx.lineWidth = 1;
  ctx.strokeRect(18, 32, 196, 14);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
  ctx.fillText(`HP ${Math.ceil(s.health)}/${s.maxHealth}`, 116, 43);

  // Mana bar
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(18, 50, 196, 12);
  const mpPct = s.mana / s.maxMana;
  const mpGrad = ctx.createLinearGradient(18, 0, 214, 0);
  mpGrad.addColorStop(0, '#2244ff'); mpGrad.addColorStop(1, '#44aaff');
  ctx.fillStyle = mpGrad;
  ctx.fillRect(18, 50, 196 * mpPct, 12);
  ctx.strokeStyle = '#ffffff33';
  ctx.strokeRect(18, 50, 196, 12);
  ctx.font = 'bold 8px monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText(`MP ${Math.ceil(s.mana)}/${s.maxMana}`, 116, 59);

  // Lives and Difficulty
  ctx.textAlign = 'left';
  ctx.font = '12px serif';
  let livesStr = '';
  for (let i = 0; i < state.lives; i++) livesStr += '❤️ ';
  ctx.fillText(livesStr, 18, 78);

  const ds = { easy: '#44cc44', normal: '#ffcc00', hard: '#ff4444' };
  ctx.fillStyle = ds[state.difficulty] || '#aaaaaa';
  ctx.font = 'bold 9px monospace';
  ctx.fillText(`Difficulty: ${state.difficulty.toUpperCase()}`, 110, 78);

  // Gem counter or Wave counter
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  roundRect(ctx, 10, 96, 170, 24, 6);
  ctx.fill();

  if (state.endlessWave !== undefined) {
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
    ctx.fillText(`🌊 WAVE: ${state.endlessWave} | Kills: ${state.endlessKills}`, 18, 113);
  } else {
    ctx.fillStyle = state.gemsCollected >= state.gemsRequired ? '#44ff44' : '#ffcc00';
    ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
    ctx.fillText(`💎 ${state.gemsCollected} / ${state.gemsRequired}`, 18, 113);
    if (state.portalOpen) {
      ctx.fillStyle = '#aa66ff';
      ctx.fillText('Portal Open!', 90, 113);
    }
  }

  // Element selector (center top)
  const elements: { elem: Element; icon: string; key: string }[] = [
    { elem: 'fire', icon: '🔥', key: '1' },
    { elem: 'water', icon: '💧', key: '2' },
    { elem: 'earth', icon: '🌿', key: '3' },
    { elem: 'wind', icon: '🌪️', key: '4' },
  ];

  const selW = 52;
  const totalW = state.unlockedElements.length * (selW + 5);
  const startX = W / 2 - totalW / 2;

  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  roundRect(ctx, startX - 8, 8, totalW + 12, 58, 8);
  ctx.fill();

  let idx = 0;
  for (const e of elements) {
    if (!state.unlockedElements.includes(e.elem)) continue;
    const bx = startX + idx * (selW + 5);
    const sel = state.selectedElement === e.elem;

    ctx.fillStyle = sel ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.3)';
    roundRect(ctx, bx, 12, selW, 48, 6);
    ctx.fill();

    if (sel) {
      ctx.strokeStyle = ELEMENT_COLORS[e.elem]; ctx.lineWidth = 2;
      ctx.shadowColor = ELEMENT_COLORS[e.elem]; ctx.shadowBlur = 8;
      roundRect(ctx, bx, 12, selW, 48, 6);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.font = '20px serif'; ctx.textAlign = 'center';
    ctx.fillText(e.icon, bx + selW / 2, 40);
    ctx.font = '9px monospace';
    ctx.fillStyle = sel ? '#fff' : '#888';
    ctx.fillText(`[${e.key}]`, bx + selW / 2, 54);
    idx++;
  }

  // Score panel (top right)
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  roundRect(ctx, W - 180, 10, 170, 55, 8);
  ctx.fill();

  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 14px monospace'; ctx.textAlign = 'right';
  ctx.fillText(`⭐ ${state.score}`, W - 20, 32);

  ctx.fillStyle = '#aaa';
  ctx.font = '10px monospace';
  ctx.fillText(`Best: ${state.highScore}`, W - 20, 46);

  // Enemies defeated
  ctx.fillText(`Enemies: ${state.enemiesDefeated}`, W - 20, 58);

  // Combo
  if (state.comboCount > 1 && state.comboTimer > 0) {
    const alpha = Math.min(1, state.comboTimer / 30);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffaa00';
    ctx.font = `bold ${14 + state.comboCount * 2}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`${state.comboCount}x COMBO!`, W / 2, _H - 60);
    ctx.globalAlpha = 1;
  }

  // Element hint (bottom center)
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '10px monospace'; ctx.textAlign = 'center';
  ctx.fillText(`${ELEMENT_NAMES[state.selectedElement]} selected  |  ${state.elementHint}`, W / 2, _H - 15);
}

function drawMinimap(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number) {
  const mapW = 160;
  const mapH = 50;
  const mx = W - mapW - 10;
  const my = H - mapH - 30;
  const scaleX = mapW / state.worldWidth;
  const scaleY = mapH / state.worldHeight;

  ctx.save();

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  roundRect(ctx, mx - 4, my - 4, mapW + 8, mapH + 8, 6);
  ctx.fill();

  // Border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  roundRect(ctx, mx - 4, my - 4, mapW + 8, mapH + 8, 6);
  ctx.stroke();

  // Label
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '7px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('MAP', mx, my - 6);

  // Platforms
  ctx.fillStyle = 'rgba(120, 120, 120, 0.6)';
  for (const p of state.platforms) {
    const px = mx + p.x * scaleX;
    const py = my + p.y * scaleY;
    const pw = Math.max(2, p.width * scaleX);
    const ph = Math.max(1, p.height * scaleY);
    ctx.fillRect(px, py, pw, ph);
  }

  // Gems
  for (const obj of state.envObjects) {
    if (obj.type === 'gem') {
      const gx = mx + obj.x * scaleX;
      const gy = my + obj.y * scaleY;
      ctx.fillStyle = obj.state === 'collected' ? 'rgba(0, 255, 0, 0.3)' : '#ffcc00';
      ctx.fillRect(gx - 1, gy - 1, 3, 3);
    }
    if (obj.type === 'portal') {
      const px = mx + obj.x * scaleX;
      const py = my + obj.y * scaleY;
      ctx.fillStyle = state.portalOpen ? '#aa44ff' : 'rgba(100, 50, 150, 0.4)';
      ctx.fillRect(px - 2, py - 3, 4, 6);
    }
    if (obj.type === 'health_potion' && obj.state !== 'collected') {
      const px = mx + obj.x * scaleX;
      const py = my + obj.y * scaleY;
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(px - 1, py - 1, 2, 2);
    }
    if (obj.type === 'mana_crystal' && obj.state !== 'collected') {
      const px = mx + obj.x * scaleX;
      const py = my + obj.y * scaleY;
      ctx.fillStyle = '#4488ff';
      ctx.fillRect(px - 1, py - 1, 2, 2);
    }
  }

  // Enemies
  for (const e of state.enemies) {
    if (e.state === 'dead') continue;
    const ex = mx + e.x * scaleX;
    const ey = my + e.y * scaleY;
    ctx.fillStyle = '#ff3333';
    ctx.beginPath();
    ctx.arc(ex, ey, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Viewport rectangle
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  const vx = mx + state.camera.x * scaleX;
  const vy = my + Math.max(0, state.camera.y) * scaleY;
  const vw = 1200 * scaleX; // CANVAS_W
  const vh = 700 * scaleY;  // CANVAS_H
  ctx.strokeRect(vx, vy, vw, vh);

  // Player dot (pulsing)
  const s = state.stickman;
  const playerX = mx + s.x * scaleX;
  const playerY = my + s.y * scaleY;
  const pulse = 2 + Math.sin(Date.now() * 0.008) * 0.8;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(playerX, playerY, pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawLevelIntro(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number) {
  const progress = 1 - state.levelIntroTimer / 180;
  const alpha = progress < 0.1 ? progress / 0.1 : progress > 0.8 ? (1 - progress) / 0.2 : 1;

  ctx.save();
  ctx.globalAlpha = Math.min(0.7, alpha);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  ctx.globalAlpha = alpha;

  // Level number
  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`LEVEL ${state.currentLevel + 1}`, W / 2, H / 2 - 40);

  // Level name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px monospace';
  ctx.fillText(state.levelName, W / 2, H / 2);

  // Subtitle
  ctx.fillStyle = '#aaaacc';
  ctx.font = '14px monospace';
  ctx.fillText(state.levelSubtitle, W / 2, H / 2 + 30);

  // Objective
  ctx.fillStyle = '#ffcc44';
  ctx.font = '12px monospace';
  ctx.fillText(`Collect ${state.gemsRequired} gems to open the portal`, W / 2, H / 2 + 60);

  // Element hint
  ctx.fillStyle = '#88ccff';
  ctx.fillText(state.elementHint, W / 2, H / 2 + 80);

  ctx.restore();
}

function drawMenuScreen(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, isMobile = false) {
  // Background
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, '#0a0a2e'); skyGrad.addColorStop(0.5, '#1a1a4e');
  skyGrad.addColorStop(1, '#2d1b4e');
  ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, H);

  // Stars
  for (const star of state.backgroundStars) {
    const alpha = 0.4 + 0.4 * Math.sin(star.twinkle + state.screenTimer * 0.03);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath(); ctx.arc(star.x * 0.4, star.y * 0.5, star.size, 0, Math.PI * 2); ctx.fill();
  }

  // Title
  const t = state.screenTimer * 0.02;
  ctx.save();
  ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 20;
  ctx.fillStyle = '#ff4400';
  ctx.font = 'bold 48px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('⚡ ELEMENTAL', W / 2, H / 2 - 100 + Math.sin(t) * 5);
  ctx.shadowColor = '#44aaff';
  ctx.fillStyle = '#44aaff';
  ctx.fillText('STICKMAN ⚡', W / 2, H / 2 - 50 + Math.sin(t + 1) * 5);
  ctx.restore();

  // Subtitle
  ctx.fillStyle = '#aaa';
  ctx.font = '14px monospace';
  ctx.fillText('Master the elements to conquer 10 levels', W / 2, H / 2 - 10);

  // Elements showcase
  const elems = ['🔥 Fire', '💧 Water', '🌿 Earth', '🌪️ Wind'];
  const colors = ['#ff4400', '#0088ff', '#66aa33', '#aabbee'];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = colors[i];
    ctx.font = '16px monospace';
    ctx.fillText(elems[i], W / 2 - 150 + i * 100, H / 2 + 30);
  }

  // Start prompt
  const blinkAlpha = 0.5 + Math.sin(state.screenTimer * 0.06) * 0.5;
  ctx.globalAlpha = blinkAlpha;
  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(isMobile ? 'Tap to Start' : 'Click or Press ENTER to Start', W / 2, H / 2 + 70);
  ctx.globalAlpha = 1;

  // IMP-14: Difficulty selector hint
  ctx.fillStyle = '#ff4444';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(`Current Difficulty: ${state.difficulty.toUpperCase()}`, W / 2, H / 2 + 105);
  ctx.fillStyle = '#666';
  ctx.font = '10px monospace';
  ctx.fillText(`[D] Cycle Difficulty    |    [U] Upgrade Shop    |    [E] Endless Arena`, W / 2, H / 2 + 125);

  // Controls
  ctx.fillStyle = '#666';
  ctx.font = '11px monospace';
  if (isMobile) {
    ctx.fillText('D-Pad: Move  |  Tap element icons to switch  |  CAST: Shoot', W / 2, H / 2 + 140);
    ctx.fillText('Collect gems to unlock the portal and advance!', W / 2, H / 2 + 160);
  } else {
    ctx.fillText('WASD / Arrows: Move & Jump  |  1-4: Switch Elements  |  Click: Cast Spell', W / 2, H / 2 + 140);
    ctx.fillText('Collect gems to unlock the portal and advance to the next level!', W / 2, H / 2 + 160);
  }
}

function drawLevelCompleteScreen(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, isMobile = false) {
  ctx.fillStyle = 'rgba(0,0,20,0.85)';
  ctx.fillRect(0, 0, W, H);

  const t = state.screenTimer * 0.03;

  ctx.save();
  ctx.shadowColor = '#44ff44'; ctx.shadowBlur = 20;
  ctx.fillStyle = '#44ff44';
  ctx.font = 'bold 40px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('LEVEL COMPLETE!', W / 2, H / 2 - 80 + Math.sin(t) * 3);
  ctx.restore();

  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(`Level ${state.currentLevel + 1}: ${state.levelName}`, W / 2, H / 2 - 35);

  // Stats
  ctx.fillStyle = '#ffffff'; ctx.font = '14px monospace';
  ctx.fillText(`Gems: ${state.gemsCollected} / ${state.totalGems}`, W / 2, H / 2 + 5);
  ctx.fillText(`Enemies Defeated: ${state.enemiesDefeated}`, W / 2, H / 2 + 25);
  ctx.fillText(`Score: ${state.score}`, W / 2, H / 2 + 45);

  if (state.gemsCollected >= state.totalGems) {
    ctx.fillStyle = '#ffaa00';
    ctx.fillText('★ ALL GEMS COLLECTED! +200 BONUS ★', W / 2, H / 2 + 70);
  }

  const blinkAlpha = 0.5 + Math.sin(state.screenTimer * 0.06) * 0.5;
  ctx.globalAlpha = blinkAlpha;
  ctx.fillStyle = '#44aaff';
  ctx.font = 'bold 18px monospace';
  if (state.currentLevel + 1 >= state.totalLevels) {
    ctx.fillText(isMobile ? 'Tap for Victory!' : 'Click or Press ENTER for Victory!', W / 2, H / 2 + 110);
  } else {
    ctx.fillText(isMobile ? 'Tap for Next Level' : 'Click or Press ENTER for Next Level', W / 2, H / 2 + 110);
  }
  ctx.globalAlpha = 1;
}

function drawGameOverScreen(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, isMobile = false) {
  ctx.fillStyle = 'rgba(20,0,0,0.9)';
  ctx.fillRect(0, 0, W, H);

  const t = state.screenTimer * 0.03;

  ctx.save();
  ctx.shadowColor = '#ff2222'; ctx.shadowBlur = 25;
  ctx.fillStyle = '#ff2222';
  ctx.font = 'bold 48px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', W / 2, H / 2 - 60 + Math.sin(t) * 3);
  ctx.restore();

  ctx.fillStyle = '#aaa'; ctx.font = '16px monospace';
  ctx.fillText(`Final Score: ${state.score}`, W / 2, H / 2 - 10);
  ctx.fillText(`Best Score: ${state.highScore}`, W / 2, H / 2 + 15);

  if (state.endlessWave !== undefined) {
    ctx.fillStyle = '#44aaff';
    ctx.fillText(`Survived to Wave: ${state.endlessWave}`, W / 2, H / 2 + 40);
    ctx.fillText(`Total Kills: ${state.endlessKills}`, W / 2, H / 2 + 65);
  } else {
    ctx.fillText(`Reached Level ${state.currentLevel + 1}: ${state.levelName}`, W / 2, H / 2 + 40);
  }

  const blinkAlpha = 0.5 + Math.sin(state.screenTimer * 0.06) * 0.5;
  ctx.globalAlpha = blinkAlpha;
  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(isMobile ? 'Tap to Try Again' : 'Click or Press ENTER to Try Again', W / 2, H / 2 + 90);
  ctx.globalAlpha = 1;
}

function drawVictoryScreen(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, isMobile = false) {
  // Rainbow gradient background
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#1a0a2e'); grad.addColorStop(0.3, '#0a2a4e');
  grad.addColorStop(0.6, '#0a3a2e'); grad.addColorStop(1, '#2a1a0e');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

  // Sparkles
  for (let i = 0; i < 20; i++) {
    const sx = (Math.sin(state.screenTimer * 0.02 + i * 1.3) * 0.5 + 0.5) * W;
    const sy = (Math.cos(state.screenTimer * 0.015 + i * 0.9) * 0.5 + 0.5) * H;
    const alpha = 0.3 + Math.sin(state.screenTimer * 0.05 + i) * 0.3;
    ctx.fillStyle = `rgba(255,255,100,${alpha})`;
    ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
  }

  const t = state.screenTimer * 0.03;

  ctx.save();
  ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 30;
  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 44px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('🏆 VICTORY! 🏆', W / 2, H / 2 - 80 + Math.sin(t) * 5);
  ctx.restore();

  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 18px monospace';
  ctx.fillText('You have mastered all the elements!', W / 2, H / 2 - 30);

  ctx.fillStyle = '#ffcc44'; ctx.font = '16px monospace';
  ctx.fillText(`Final Score: ${state.score}`, W / 2, H / 2 + 10);
  ctx.fillText(`Total Gems: ${state.totalGemsEver}`, W / 2, H / 2 + 35);
  ctx.fillText(`Enemies Defeated: ${state.enemiesDefeated}`, W / 2, H / 2 + 55);

  const blinkAlpha = 0.5 + Math.sin(state.screenTimer * 0.06) * 0.5;
  ctx.globalAlpha = blinkAlpha;
  ctx.fillStyle = '#44aaff';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(isMobile ? 'Tap to Play Again' : 'Click or Press ENTER to Play Again', W / 2, H / 2 + 100);
  ctx.globalAlpha = 1;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawShopScreen(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, isMobile = false) {
  // Deep gradient background
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, '#0a0a1a');
  skyGrad.addColorStop(1, '#1b1b2d');
  ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, H);

  // Floating shop items background
  for (let i = 0; i < 20; i++) {
    const x = (i * 100 + state.screenTimer) % W;
    const y = H / 2 + Math.sin(state.screenTimer * 0.01 + i) * 100;
    ctx.fillStyle = `rgba(100, 200, 255, 0.05)`;
    ctx.beginPath(); ctx.arc(x, y, 40, 0, Math.PI * 2); ctx.fill();
  }

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('🛒 UPGRADE SHOP', W / 2, 80);

  ctx.fillStyle = '#ffcc00';
  ctx.font = '24px monospace';
  ctx.fillText(`Currency: ${state.gemsCurrency} 💎`, W / 2, 130);

  // Draw Upgrades Options
  const upg = state.upgrades;
  const costH = (upg.healthLevel + 1) * 30;
  const costM = (upg.manaLevel + 1) * 30;
  const costR = (upg.regenLevel + 1) * 50;
  const costD = (upg.damageLevel + 1) * 60;

  const spacing = 100;
  const startY = 220;

  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'left';

  const drawRow = (idx: number, y: number, name: string, lvl: number, cost: number, max: boolean) => {
    ctx.fillStyle = max ? '#66aa33' : (state.gemsCurrency >= cost ? '#ffffff' : '#aa5555');
    ctx.fillText(`[${idx}] ${name}`, W / 2 - 250, y);

    // Level Box graphics
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i < lvl ? '#00bbff' : '#222';
      ctx.fillRect(W / 2 + i * 35 - 30, y - 18, 25, 20);
      ctx.strokeStyle = '#555'; ctx.strokeRect(W / 2 + i * 35 - 30, y - 18, 25, 20);
    }

    ctx.fillStyle = max ? '#66aa33' : '#ffcc00';
    ctx.fillText(max ? 'MAXED' : `${cost} 💎`, W / 2 + 180, y);
  };

  drawRow(1, startY, 'Max Health (+25)', upg.healthLevel, costH, upg.healthLevel >= 5);
  drawRow(2, startY + spacing, 'Max Mana (+25)', upg.manaLevel, costM, upg.manaLevel >= 5);
  drawRow(3, startY + spacing * 2, 'Mana Regen (+20%)', upg.regenLevel, costR, upg.regenLevel >= 5);
  drawRow(4, startY + spacing * 3, 'Spell Damage (+25%)', upg.damageLevel, costD, upg.damageLevel >= 5);

  ctx.fillStyle = '#aaa';
  ctx.textAlign = 'center';
  ctx.font = '16px monospace';

  if (isMobile) {
    ctx.fillText('Tap directly on an upgrade to buy it! (Tap Back to exit)', W / 2, H - 60);
  } else {
    ctx.fillText('Press 1, 2, 3, or 4 to buy upgrades.', W / 2, H - 80);
    ctx.fillText('Press [ESC] or [B] to return to Menu.', W / 2, H - 50);
  }
}
