import type { GameState, Element } from './types';
import { elementName, t } from './i18n';
import { getLeaderboard, getLeaderboardStatus } from './services/leaderboard';
import { getCloudSyncStatus } from './services/cloud';
import { getProgressionSnapshot } from './services/progression';

const ELEMENT_COLORS: Record<Element, string> = {
  fire: '#ff4400', water: '#0088ff', earth: '#66aa33', wind: '#aabbee',
};
const ELEMENT_GLOW: Record<Element, string> = {
  fire: 'rgba(255, 100, 0, 0.3)', water: 'rgba(0, 100, 255, 0.3)',
  earth: 'rgba(80, 160, 40, 0.3)', wind: 'rgba(180, 200, 240, 0.3)',
};

const UI_THEME = {
  paper: '#e9f2ff',
  muted: '#8aa2c6',
  accent: '#53b8ff',
  accentStrong: '#6ad2ff',
  success: '#62eeb8',
  warning: '#ffd36a',
  danger: '#ff7688',
  panelA: 'rgba(7, 17, 36, 0.88)',
  panelB: 'rgba(13, 31, 63, 0.78)',
  panelBorder: 'rgba(144, 211, 255, 0.28)',
};

const FONT_UI = '"Rajdhani", "Trebuchet MS", sans-serif';
const FONT_DISPLAY = '"Orbitron", "Eurostile", sans-serif';

const boss1Img = new Image();
boss1Img.src = '/bosses/boss1.png';

const boss2Img = new Image();
boss2Img.src = '/bosses/boss2.png';

function uiScale(state: GameState): number {
  return Math.min(1.5, Math.max(0.85, state.textScale || 1));
}

function setUiFont(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  size: number,
  weight = '',
  family = FONT_UI,
): void {
  const px = Math.round(size * uiScale(state));
  ctx.font = `${weight ? `${weight} ` : ''}${px}px ${family}`;
}

function setDisplayFont(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  size: number,
  weight = '700',
): void {
  setUiFont(ctx, state, size, weight, FONT_DISPLAY);
}

function tr(state: GameState, key: Parameters<typeof t>[1], vars?: Record<string, string | number>): string {
  return t(state.locale, key, vars);
}

function formatFramesAsTime(frames: number): string {
  const mins = Math.floor(frames / 3600);
  const secs = Math.floor((frames % 3600) / 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function shortAccountId(accountId: string): string {
  if (!accountId) return 'UNKNOWN';
  const compact = accountId.replace(/^anon_/, '').replace(/^ephemeral_/, '');
  return compact.slice(-8).toUpperCase();
}

function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  W: number,
  H: number,
  palette: [string, string, string],
): void {
  const time = state.reducedMotion ? 0 : state.screenTimer * 0.01;
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, palette[0]);
  bg.addColorStop(0.55, palette[1]);
  bg.addColorStop(1, palette[2]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  if (!state.graphicsQuality || state.graphicsQuality !== 'low') {
    for (let i = 0; i < 5; i++) {
      const cx = (Math.sin(time * (0.6 + i * 0.08) + i * 1.7) * 0.5 + 0.5) * W;
      const cy = (Math.cos(time * (0.45 + i * 0.07) + i) * 0.5 + 0.5) * H;
      const radius = 180 + i * 70;
      const orb = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      orb.addColorStop(0, `rgba(110, 206, 255, ${0.07 - i * 0.008})`);
      orb.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = orb;
      ctx.fillRect(0, 0, W, H);
    }
  }

  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = '#89d4ff';
  ctx.lineWidth = 1;
  const spacing = 38;
  for (let y = -spacing; y < H + spacing; y += spacing) {
    const offset = state.reducedMotion ? 0 : Math.sin(time + y * 0.03) * 16;
    ctx.beginPath();
    ctx.moveTo(-20, y + offset);
    ctx.lineTo(W + 20, y - offset * 0.4);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 14,
  accent = UI_THEME.accent,
): void {
  const bg = ctx.createLinearGradient(x, y, x + w, y + h);
  bg.addColorStop(0, UI_THEME.panelA);
  bg.addColorStop(1, UI_THEME.panelB);
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, h, radius);
  ctx.fill();

  ctx.strokeStyle = UI_THEME.panelBorder;
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, radius);
  ctx.stroke();

  ctx.fillStyle = accent;
  roundRect(ctx, x, y, w, 3, 2);
  ctx.fill();
}

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  W: number,
  H: number,
  isMobile = false,
  isPortraitMobile = false,
): void {
  ctx.save();
  const nowMs = state.reducedMotion ? 0 : performance.now();
  const lowQuality = state.graphicsQuality === 'low';
  const highContrast = state.highContrast;

  if (state.screen === 'menu') { drawMenuScreen(ctx, state, W, H, isMobile); ctx.restore(); return; }
  if (state.screen === 'shop') { drawShopScreen(ctx, state, W, H, isMobile); ctx.restore(); return; }
  if (state.screen === 'levelSelect') { drawLevelSelectScreen(ctx, state, W, H, isMobile); ctx.restore(); return; }
  if (state.screen === 'levelComplete') { drawLevelCompleteScreen(ctx, state, W, H, isMobile); ctx.restore(); return; }
  if (state.screen === 'gameOver') { drawGameOverScreen(ctx, state, W, H, isMobile); ctx.restore(); return; }
  if (state.screen === 'victory') { drawVictoryScreen(ctx, state, W, H, isMobile); ctx.restore(); return; }

  const cam = state.camera;

  // Smooth screen shake using time-based sine — no per-frame Math.random() jitter
  let shakeX = 0, shakeY = 0;
  if (state.screenShake > 0 && !state.reducedMotion) {
    const t2 = nowMs * 0.04;
    const intensity = state.screenShake * 0.4; // gentler than before
    shakeX = Math.sin(t2 * 7.3) * intensity;
    shakeY = Math.cos(t2 * 5.9) * intensity;
  }

  // Sky
  const bgColors = highContrast ? (['#000000', '#050505', '#0a0a0a', '#101010'] as [string, string, string, string]) : state.bgColors;
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, bgColors[0]);
  skyGrad.addColorStop(0.4, bgColors[1]);
  skyGrad.addColorStop(0.7, bgColors[2]);
  skyGrad.addColorStop(1, bgColors[3]);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // Damage flash - subtle vignette, not a full-screen overlay
  if (state.redFlash > 0) {
    const flashAlpha = state.redFlash * 0.01; // max ~0.15 at flash=15
    ctx.fillStyle = `rgba(255, 0, 0, ${flashAlpha})`;
    ctx.fillRect(0, 0, W, H);
  }

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

  // Platforms
  for (const p of state.platforms) {
    if (p.x + p.width < cam.x - 50 || p.x > cam.x + W + 50) continue;
    if (p.melting) ctx.globalAlpha = (p.meltTimer || 0) / 120;

    if (p.type === 'ground') {
      // Rich layered ground
      const gGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
      gGrad.addColorStop(0, '#4a6a30'); gGrad.addColorStop(0.08, '#3a5520');
      gGrad.addColorStop(0.25, '#5a3a18'); gGrad.addColorStop(1, '#2e1e08');
      ctx.fillStyle = gGrad;
      ctx.fillRect(p.x, p.y, p.width, p.height);
      // Grass top strip
      const grassGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + 6);
      grassGrad.addColorStop(0, '#5ec830'); grassGrad.addColorStop(1, '#3a8820');
      ctx.fillStyle = grassGrad;
      ctx.fillRect(p.x, p.y, p.width, 6);
      // Bright edge highlight
      ctx.fillStyle = 'rgba(120,255,60,0.18)';
      ctx.fillRect(p.x, p.y, p.width, 2);
      // Deterministic grass blades
      ctx.strokeStyle = '#6ee840'; ctx.lineWidth = 1.5;
      for (let gx = p.x + 4; gx < p.x + p.width - 4; gx += 9) {
        const blade = Math.sin(gx * 0.31) * 3;
        ctx.beginPath(); ctx.moveTo(gx, p.y);
        ctx.lineTo(gx + blade, p.y - 5 - Math.abs(Math.sin(gx * 0.17)) * 3); ctx.stroke();
      }
      // Soil texture
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(p.x + Math.sin(i * 77 + p.x) * p.width * 0.4 + p.width * 0.5, p.y + 10 + i * 8, 20, 3);
      }
    } else if (p.type === 'ice') {
      // Glassy ice platform
      const iceGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
      iceGrad.addColorStop(0, 'rgba(180,240,255,0.85)');
      iceGrad.addColorStop(0.4, 'rgba(120,200,240,0.70)');
      iceGrad.addColorStop(1, 'rgba(80,150,210,0.60)');
      ctx.fillStyle = iceGrad;
      ctx.fillRect(p.x, p.y, p.width, p.height);
      // Top shine stripe
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(p.x + 4, p.y + 2, p.width - 8, 3);
      // Crystal facet lines
      ctx.strokeStyle = 'rgba(200,240,255,0.5)'; ctx.lineWidth = 1;
      for (let fx = p.x + 12; fx < p.x + p.width - 8; fx += 22) {
        ctx.beginPath(); ctx.moveTo(fx, p.y); ctx.lineTo(fx - 6, p.y + p.height); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(160,220,255,0.3)'; ctx.lineWidth = 1;
      ctx.strokeRect(p.x, p.y, p.width, p.height);
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
    drawEnvObject(ctx, obj, state, nowMs);
  }

  // Enemies
  for (const enemy of state.enemies) {
    if (enemy.state === 'dead') continue;
    drawEnemy(ctx, enemy, nowMs);
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

  // Pass 2: Global Lights (Screen space)
  if (!lowQuality) {
    drawLights(ctx, state, W);
  }

  // Slightly follow camera movement and hit shake to keep HUD/score visually cohesive.
  const hudFollowX = Math.max(-28, Math.min(28, -cam.x * 0.03));
  const hudFollowY = Math.max(-16, Math.min(16, -cam.y * 0.03));
  const uiShakeX = shakeX * 0.35;
  const uiShakeY = shakeY * 0.35;

  ctx.save();
  ctx.translate(hudFollowX + uiShakeX, hudFollowY + uiShakeY);

  // HUD
  drawHUD(ctx, state, W, H, nowMs, isPortraitMobile);

  // IMP-7: Minimap (for levels wider than 1.5x the canvas)
  if (!lowQuality && !isPortraitMobile && state.worldWidth > W * 1.5) {
    drawMinimap(ctx, state, W, H, nowMs);
  }
  ctx.restore();

  // Floating texts (screen-space but offset from world)
  for (const ft of state.floatingTexts) {
    const alpha = Math.max(0, ft.life / ft.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = ft.color;
    ctx.font = `700 ${ft.size}px ${FONT_UI}`;
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

  // Active Dialog
  if (state.activeDialog.length > 0) {
    drawDialogSystem(ctx, state, W, H, isPortraitMobile);
  }

  // IMP-1: Pause overlay with full menu
  if (state.paused) {
    ctx.fillStyle = 'rgba(4, 8, 16, 0.82)';
    ctx.fillRect(0, 0, W, H);

    if (!lowQuality) {
      drawLights(ctx, state, W);
    }

    drawPanel(ctx, W / 2 - 260, H / 2 - 170, 520, 340, 18, '#8cd7ff');
    ctx.fillStyle = '#ecf7ff';
    setDisplayFont(ctx, state, 46, '800');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tr(state, 'pause_title'), W / 2, H / 2 - 124);

    // Menu options
    const options = [tr(state, 'pause_resume'), tr(state, 'pause_restart'), tr(state, 'pause_quit')];
    const optionColors = ['#8bf5c8', '#ffd782', '#ff9da8'];
    for (let i = 0; i < options.length; i++) {
      const y = H / 2 - 34 + i * 62;
      const selected = state.pauseSelection === i;

      // Background
      const rowGrad = ctx.createLinearGradient(W / 2 - 190, y, W / 2 + 190, y + 44);
      rowGrad.addColorStop(0, selected ? 'rgba(88, 182, 255, 0.4)' : 'rgba(10, 20, 40, 0.86)');
      rowGrad.addColorStop(1, selected ? 'rgba(98, 235, 208, 0.33)' : 'rgba(18, 36, 68, 0.8)');
      ctx.fillStyle = rowGrad;
      roundRect(ctx, W / 2 - 190, y - 22, 380, 46, 11);
      ctx.fill();

      if (selected) {
        ctx.save();
        ctx.strokeStyle = optionColors[i]; ctx.lineWidth = 2;
        ctx.shadowColor = optionColors[i]; ctx.shadowBlur = 14;
        roundRect(ctx, W / 2 - 190, y - 22, 380, 46, 11);
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = selected ? optionColors[i] : '#9ab2d3';
      setUiFont(ctx, state, selected ? 22 : 19, selected ? '700' : '600');
      ctx.textAlign = 'center';
      ctx.fillText(options[i], W / 2, y + 8);
    }

    // Stats footer
    ctx.fillStyle = UI_THEME.paper;
    setUiFont(ctx, state, 12, '700');
    ctx.fillText(tr(state, 'pause_stats', {
      score: state.score,
      level: state.currentLevel + 1,
      best: state.highScore,
      kills: state.enemiesDefeated,
    }), W / 2, H / 2 + 126);

    // Controls hint
    ctx.fillStyle = UI_THEME.muted;
    setUiFont(ctx, state, 11, '600');
    ctx.fillText(isMobile ? tr(state, 'pause_mobile_hint') : tr(state, 'pause_desktop_hint'), W / 2, H / 2 + 150);
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

function drawEnvObject(ctx: CanvasRenderingContext2D, obj: GameState['envObjects'][number], state: GameState, nowMs: number) {
  const t = nowMs * 0.005;

  switch (obj.type) {
    case 'lore_tome': {
      ctx.save();
      const cx = obj.x + obj.width / 2;
      const cy = obj.y + obj.height / 2 + Math.sin(t * 3) * 3; // Float effect

      ctx.shadowColor = '#7ae8ff';
      ctx.shadowBlur = 15 + Math.sin(t * 5) * 5;

      // Book cover (spine and pages)
      ctx.fillStyle = '#102545';
      roundRect(ctx, cx - 12, cy - 14, 24, 28, 3);
      ctx.fill();

      // Pages
      ctx.fillStyle = '#fdf8e1';
      ctx.fillRect(cx - 10, cy - 12, 20, 24);

      // Bookmark / Ribbons
      ctx.fillStyle = '#d32f2f';
      ctx.fillRect(cx - 3, cy - 14, 6, 34);

      // Book border / details
      ctx.strokeStyle = '#7ae8ff';
      ctx.lineWidth = 2;
      roundRect(ctx, cx - 12, cy - 14, 24, 28, 3);
      ctx.stroke();

      ctx.restore();
      break;
    }
    case 'crate': {
      // Detailed wooden crate
      const burning = obj.state === 'burning';
      const baseColor = burning ? '#7a3800' : '#c08830';
      const darkColor = burning ? '#5a2000' : '#8a5818';
      ctx.fillStyle = baseColor;
      ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
      // Wood grain lines
      ctx.strokeStyle = darkColor; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(obj.x, obj.y + obj.height * 0.33); ctx.lineTo(obj.x + obj.width, obj.y + obj.height * 0.33);
      ctx.moveTo(obj.x, obj.y + obj.height * 0.67); ctx.lineTo(obj.x + obj.width, obj.y + obj.height * 0.67);
      ctx.moveTo(obj.x + obj.width * 0.33, obj.y); ctx.lineTo(obj.x + obj.width * 0.33, obj.y + obj.height);
      ctx.moveTo(obj.x + obj.width * 0.67, obj.y); ctx.lineTo(obj.x + obj.width * 0.67, obj.y + obj.height);
      ctx.stroke();
      // Border & diagonal X
      ctx.strokeStyle = darkColor; ctx.lineWidth = 2;
      ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(obj.x + 3, obj.y + 3); ctx.lineTo(obj.x + obj.width - 3, obj.y + obj.height - 3);
      ctx.moveTo(obj.x + obj.width - 3, obj.y + 3); ctx.lineTo(obj.x + 3, obj.y + obj.height - 3);
      ctx.stroke();
      // Nails at corners
      ctx.fillStyle = burning ? '#cc6622' : '#ccaa66';
      const nailR = 2.5;
      [[obj.x + 5, obj.y + 5], [obj.x + obj.width - 5, obj.y + 5], [obj.x + 5, obj.y + obj.height - 5], [obj.x + obj.width - 5, obj.y + obj.height - 5]].forEach(([nx, ny]) => {
        ctx.beginPath(); ctx.arc(nx, ny, nailR, 0, Math.PI * 2); ctx.fill();
      });
      // Highlight edge
      ctx.fillStyle = 'rgba(255,200,100,0.18)';
      ctx.fillRect(obj.x, obj.y, obj.width, 3);
      if (burning) {
        ctx.save(); ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 12;
        ctx.strokeStyle = '#ff6600'; ctx.lineWidth = 1;
        ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
        ctx.restore();
      }
      break;
    }
    case 'ice': {
      // Detailed ice block with facets
      ctx.save();
      const iceBlockGrad = ctx.createLinearGradient(obj.x, obj.y, obj.x + obj.width, obj.y + obj.height);
      iceBlockGrad.addColorStop(0, 'rgba(200,245,255,0.9)');
      iceBlockGrad.addColorStop(0.5, 'rgba(140,210,250,0.75)');
      iceBlockGrad.addColorStop(1, 'rgba(80,160,220,0.60)');
      ctx.fillStyle = iceBlockGrad;
      ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
      // Inner glow
      ctx.shadowColor = '#88ccff'; ctx.shadowBlur = 8;
      ctx.strokeStyle = 'rgba(200,240,255,0.9)'; ctx.lineWidth = 1.5;
      ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
      // Top shine
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(obj.x + 4, obj.y + 3, obj.width * 0.4, 3);
      // Crack lines
      ctx.strokeStyle = 'rgba(180,230,255,0.6)'; ctx.lineWidth = 1; ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(obj.x + obj.width * 0.3, obj.y); ctx.lineTo(obj.x + obj.width * 0.5, obj.y + obj.height);
      ctx.moveTo(obj.x + obj.width * 0.65, obj.y + obj.height * 0.2); ctx.lineTo(obj.x + obj.width * 0.8, obj.y + obj.height);
      ctx.stroke();
      ctx.restore();
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
        ctx.fillText('LOCK', obj.x + obj.width / 2, obj.y + obj.height / 2 + 5);
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
      // Deterministic mud texture bumps via sin, no random per frame
      ctx.fillStyle = '#3a2a1a';
      for (let i = 0; i < 5; i++) {
        const bx = obj.x + (i / 5) * obj.width + Math.sin(i * 1.7) * 5;
        const by = obj.y + Math.cos(i * 2.3) * obj.height * 0.3 + obj.height * 0.5;
        ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'magma_pool': {
      const grad = ctx.createLinearGradient(obj.x, obj.y, obj.x, obj.y + obj.height);
      grad.addColorStop(0, '#ff4400'); grad.addColorStop(1, '#aa2200');
      ctx.fillStyle = grad;
      roundRect(ctx, obj.x, obj.y, obj.width, obj.height, 5);
      ctx.fill();
      // Animated lava bubble using time, not Math.random()
      const bubble = Math.sin(t * 3 + obj.x * 0.1);
      if (bubble > 0.7) {
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(obj.x + (obj.x % obj.width), obj.y, 4, 2);
      }
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
    case 'anti_gravity_zone': {
      ctx.save();
      const grad = ctx.createLinearGradient(obj.x, obj.y + obj.height, obj.x, obj.y);
      grad.addColorStop(0, 'rgba(138, 43, 226, 0.4)'); // Purple
      grad.addColorStop(1, 'rgba(138, 43, 226, 0.05)');
      ctx.fillStyle = grad;
      ctx.fillRect(obj.x, obj.y, obj.width, obj.height);

      // Floating arrow particles
      ctx.fillStyle = 'rgba(200, 150, 255, 0.5)';
      const arrows = 4;
      for (let i = 0; i < arrows; i++) {
        const hOffset = (t * 20 + i * (obj.height / arrows)) % obj.height;
        ctx.beginPath();
        ctx.moveTo(obj.x + obj.width / 2, obj.y + obj.height - hOffset - 10);
        ctx.lineTo(obj.x + obj.width / 2 - 5, obj.y + obj.height - hOffset);
        ctx.lineTo(obj.x + obj.width / 2 + 5, obj.y + obj.height - hOffset);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'corrupted_crystal': {
      ctx.save();
      const cx = obj.x + obj.width / 2;
      const cy = obj.y + obj.height / 2;
      const pulse = obj.energyTimer ? (obj.energyTimer / 120) : 0;

      ctx.shadowColor = '#39ff14';
      ctx.shadowBlur = 10 + pulse * 20;

      // Base crystal shape
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.moveTo(cx, obj.y);
      ctx.lineTo(obj.x + obj.width, cy);
      ctx.lineTo(cx, obj.y + obj.height);
      ctx.lineTo(obj.x, cy);
      ctx.fill();

      // Corrupted veins
      ctx.strokeStyle = `rgba(57, 255, 20, ${0.5 + pulse * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, obj.y);
      ctx.lineTo(cx, obj.y + obj.height);
      ctx.moveTo(obj.x, cy);
      ctx.lineTo(obj.x + obj.width, cy);
      ctx.stroke();

      // Pulse ring when about to erupt
      if (pulse > 0.8) {
        ctx.strokeStyle = '#39ff14';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, (pulse - 0.8) * 5 * 100, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
      break;
    }
  }
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: GameState['enemies'][number], nowMs: number) {
  const cx = enemy.x + enemy.width / 2;
  const cy = enemy.y + enemy.height / 2;
  const t = nowMs * 0.005;

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Apply fade-out and shrink for dead enemies
  if (enemy.state === 'dead') {
    const fadeProgress = Math.max(0, enemy.hurtTimer / 60); // hurtTimer counts down from 60
    ctx.globalAlpha = fadeProgress * 0.7;
    const scale = 0.5 + fadeProgress * 0.5;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
  } else if (enemy.state === 'hurt') {
    // Pulsating effect for hurt enemies
    ctx.globalAlpha = 0.6 + Math.sin(nowMs * 0.02) * 0.4;
  }

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
      ctx.shadowColor = '#73d6ff';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#5d8fff';
      ctx.beginPath();
      ctx.moveTo(cx, enemy.y + 2);
      ctx.lineTo(enemy.x + enemy.width - 3, cy + 3);
      ctx.lineTo(cx, enemy.y + enemy.height - 2);
      ctx.lineTo(enemy.x + 3, cy + 3);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#dff2ff';
      ctx.beginPath();
      ctx.moveTo(cx + 2, cy - 2);
      ctx.lineTo(cx + 8, cy + 2);
      ctx.lineTo(cx + 3, cy + 9);
      ctx.lineTo(cx + 9, cy + 9);
      ctx.lineTo(cx, cy + 16);
      ctx.lineTo(cx - 4, cy + 7);
      ctx.lineTo(cx - 1, cy + 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'boss1': {
      if (boss1Img.complete && boss1Img.naturalWidth > 0) {
        ctx.drawImage(boss1Img, enemy.x, enemy.y, enemy.width, enemy.height);
      } else {
        ctx.fillStyle = '#6f5f52';
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      }
      break;
    }
    case 'boss2': {
      if (boss2Img.complete && boss2Img.naturalWidth > 0) {
        ctx.drawImage(boss2Img, enemy.x, enemy.y, enemy.width, enemy.height);
      } else {
        ctx.fillStyle = '#4c5c7e';
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      }
      break;
    }
    case 'corrupted_wraith': {
      ctx.save();
      // Glitchy wraith appearance
      ctx.fillStyle = Math.random() > 0.9 ? '#111' : '#4a0e4e';
      ctx.globalAlpha = 0.8 + Math.sin(t * 15) * 0.2;

      const glitchX = (Math.random() - 0.5) * 4;
      const glitchY = (Math.random() - 0.5) * 4;

      ctx.fillRect(enemy.x + glitchX, enemy.y + glitchY, enemy.width, enemy.height);

      // Neon green eyes
      ctx.fillStyle = '#39ff14';
      ctx.fillRect(enemy.x + (enemy.facing === 1 ? enemy.width - 6 : 2) + glitchX, enemy.y + 6 + glitchY, 4, 4);

      ctx.restore();
      break;
    }
    case 'void_brute': {
      ctx.save();
      ctx.shadowColor = '#8a2be2';
      ctx.shadowBlur = 10;

      ctx.fillStyle = '#1e0521';
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y + enemy.height);
      ctx.lineTo(enemy.x + enemy.width / 2, enemy.y);
      ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height);
      ctx.fill();

      // Armor plates
      ctx.fillStyle = '#4a0e4e';
      ctx.fillRect(enemy.x + 2, enemy.y + enemy.height / 2, enemy.width - 4, enemy.height / 3);

      // Charge aura
      if ((enemy.attackTimer || 0) > 0) {
        ctx.strokeStyle = '#39ff14';
        ctx.lineWidth = 2;
        ctx.strokeRect(enemy.x - 2, enemy.y - 2, enemy.width + 4, enemy.height + 4);
      }
      ctx.restore();
      break;
    }
    case 'void_titan': {
      ctx.save();
      // Hovering dark monolith
      const hover = Math.sin(t * 5) * 10;

      const shieldGradient = ctx.createRadialGradient(cx, cy + hover, 20, cx, cy + hover, 60);
      const resColor = ELEMENT_COLORS[enemy.resistance];
      shieldGradient.addColorStop(0, '#111');
      shieldGradient.addColorStop(0.8, `${resColor}88`); // tinted edge
      shieldGradient.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = shieldGradient;
      ctx.fillRect(enemy.x - 20, enemy.y - 20 + hover, enemy.width + 40, enemy.height + 40);

      // Core
      ctx.fillStyle = '#8a2be2';
      ctx.fillRect(enemy.x + 10, enemy.y + 10 + hover, enemy.width - 20, enemy.height - 20);

      // Eye
      ctx.fillStyle = '#39ff14';
      ctx.beginPath();
      ctx.arc(cx, cy + hover, 8 + Math.sin(t * 10) * 2, 0, Math.PI * 2);
      ctx.fill();

      // Weakness Telegraph
      const weakColor = ELEMENT_COLORS[enemy.weakness];
      ctx.fillStyle = weakColor;
      ctx.beginPath();
      ctx.arc(cx, enemy.y - 20 + hover, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
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
    roundRect(ctx, barX, barY, barW, 5, 2);
    ctx.fill();

    const hpGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    hpGrad.addColorStop(0, '#ff7f90');
    hpGrad.addColorStop(1, '#ffd27a');
    ctx.fillStyle = hpGrad;
    roundRect(ctx, barX, barY, barW * hpRatio, 5, 2);
    ctx.fill();
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
  const accent = ELEMENT_COLORS[state.selectedElement];
  ctx.strokeStyle = '#f6fbff'; ctx.lineWidth = 3;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  // Elemental outer glow around player body
  ctx.save();
  ctx.shadowColor = accent;
  ctx.shadowBlur = 16;
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.24;
  ctx.beginPath(); ctx.arc(cx, headY, 12, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, bodyTop); ctx.lineTo(cx, bodyBot + 2); ctx.stroke();
  ctx.restore();

  // DASH AFTERIMAGE TRAIL
  if (s.isDashing) {
    for (let i = 3; i > 0; i--) {
      const alpha = 0.15 * (4 - i);
      const trailX = cx - s.facing * i * 12;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      // Ghost body
      ctx.beginPath(); ctx.arc(trailX, headY, 8, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(trailX, bodyTop); ctx.lineTo(trailX, bodyBot); ctx.stroke();
      // Ghost legs
      ctx.beginPath(); ctx.moveTo(trailX, bodyBot); ctx.lineTo(trailX - 8, s.y + s.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(trailX, bodyBot); ctx.lineTo(trailX + 8, s.y + s.height); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
  }

  // Head
  const headGrad = ctx.createRadialGradient(cx - 2, headY - 2, 1, cx, headY, 9);
  headGrad.addColorStop(0, '#ffffff');
  headGrad.addColorStop(1, '#d9ecff');
  ctx.fillStyle = headGrad;
  ctx.beginPath(); ctx.arc(cx, headY, 8, 0, Math.PI * 2); ctx.fill();
  // Eye
  ctx.fillStyle = accent;
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

function drawHUD(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  W: number,
  _H: number,
  nowMs: number,
  isPortraitMobile = false,
) {
  const s = state.stickman;
  const tSec = nowMs * 0.001;

  if (isPortraitMobile) {
    const leftW = 236;
    const rightW = 190;

    drawPanel(ctx, 10, 10, leftW, 104, 12, '#7bd3ff');
    drawPanel(ctx, W - rightW - 10, 10, rightW, 104, 12, '#88d8ff');

    ctx.fillStyle = '#d8eeff';
    setUiFont(ctx, state, 11, '700');
    ctx.textAlign = 'left';
    ctx.fillText(tr(state, 'hud_level', { level: state.currentLevel + 1, name: state.levelName.toUpperCase() }), 20, 28);

    const healthRatioCompact = Math.max(0, s.health / Math.max(1, s.maxHealth));
    const manaRatioCompact = Math.max(0, s.mana / Math.max(1, s.maxMana));

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, 20, 36, leftW - 20, 12, 5); ctx.fill();
    ctx.fillStyle = '#78f3b6';
    roundRect(ctx, 20, 36, (leftW - 20) * healthRatioCompact, 12, 5); ctx.fill();
    ctx.fillStyle = '#0d2343';
    setUiFont(ctx, state, 9, '800');
    ctx.textAlign = 'center';
    ctx.fillText(tr(state, 'hud_health', { health: Math.ceil(s.health), maxHealth: s.maxHealth }), 20 + (leftW - 20) / 2, 45);

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, 20, 54, leftW - 20, 10, 5); ctx.fill();
    ctx.fillStyle = '#6bb8ff';
    roundRect(ctx, 20, 54, (leftW - 20) * manaRatioCompact, 10, 5); ctx.fill();
    ctx.fillStyle = '#d8eeff';
    setUiFont(ctx, state, 9, '700');
    ctx.fillText(tr(state, 'hud_mana', { mana: Math.ceil(s.mana), maxMana: s.maxMana }), 20 + (leftW - 20) / 2, 62);

    ctx.fillStyle = '#9ec1e6';
    setUiFont(ctx, state, 10, '700');
    ctx.textAlign = 'left';
    if (state.endlessWave !== undefined) {
      ctx.fillText(tr(state, 'hud_wave', { wave: state.endlessWave, kills: state.endlessKills ?? 0 }), 20, 80);
    } else {
      ctx.fillText(tr(state, 'hud_gems', { collected: state.gemsCollected, required: state.gemsRequired }), 20, 80);
    }
    ctx.fillText(tr(state, 'hud_lives', { lives: Math.max(0, Math.min(12, state.lives)) }), 20, 96);

    ctx.fillStyle = '#f3fbff';
    setDisplayFont(ctx, state, 22, '800');
    ctx.textAlign = 'right';
    ctx.fillText(String(state.score), W - 20, 40);

    ctx.fillStyle = UI_THEME.muted;
    setUiFont(ctx, state, 10, '700');
    ctx.fillText(tr(state, 'hud_best', { best: state.highScore }), W - 20, 58);
    const dashReadyCompact = s.dashCooldown <= 0;
    ctx.fillStyle = dashReadyCompact ? '#8bf4c7' : '#ffb0ba';
    ctx.fillText(
      dashReadyCompact ? tr(state, 'hud_dash_ready') : tr(state, 'hud_dash_cd', { seconds: Math.ceil(s.dashCooldown / 6) }),
      W - 20,
      76,
    );
    ctx.fillStyle = UI_THEME.muted;
    ctx.fillText(tr(state, 'hud_kills', { kills: state.enemiesDefeated }), W - 20, 94);

    if (state.comboCount > 1 && state.comboTimer > 0) {
      const alpha = Math.min(1, state.comboTimer / 30);
      const pulse = state.reducedMotion ? 1 : 1 + Math.sin(tSec * 9) * 0.05;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(W / 2, _H - 76);
      ctx.scale(pulse, pulse);
      ctx.shadowColor = '#7de8ff';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#d9f8ff';
      setDisplayFont(ctx, state, 20, '800');
      ctx.textAlign = 'center';
      ctx.fillText(tr(state, 'hud_combo', { count: state.comboCount }), 0, 0);
      ctx.restore();
    }

    const bossCompact = state.enemies.find((enemy) => enemy.type === 'boss1' || enemy.type === 'boss2');
    if (bossCompact && bossCompact.state !== 'dead') {
      const barW = 380;
      const barH = 18;
      const bx = W / 2 - barW / 2;
      const by = 118;
      const pct = Math.max(0, bossCompact.health / Math.max(1, bossCompact.maxHealth));
      drawPanel(ctx, bx - 10, by - 18, barW + 20, 48, 9, '#ff90a0');
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      roundRect(ctx, bx, by, barW, barH, 7); ctx.fill();
      const bossGrad = ctx.createLinearGradient(bx, 0, bx + barW, 0);
      bossGrad.addColorStop(0, '#ff6f86');
      bossGrad.addColorStop(1, '#ffd27f');
      ctx.fillStyle = bossGrad;
      roundRect(ctx, bx, by, barW * pct, barH, 7); ctx.fill();
      ctx.fillStyle = '#ffe1e6';
      setUiFont(ctx, state, 11, '700');
      ctx.textAlign = 'center';
      ctx.fillText(
        bossCompact.type === 'boss1' ? tr(state, 'hud_boss_stone') : tr(state, 'hud_boss_wraith'),
        W / 2,
        by - 4,
      );
    }

    return;
  }

  const vignette = ctx.createRadialGradient(W / 2, _H / 2, _H * 0.28, W / 2, _H / 2, _H * 0.9);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, state.highContrast ? 'rgba(0,0,0,0.68)' : 'rgba(0,0,0,0.46)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, _H);

  drawPanel(ctx, 10, 10, 286, 132, 12, '#7bd3ff');

  ctx.fillStyle = '#d8eeff';
  setUiFont(ctx, state, 12, '700');
  ctx.textAlign = 'left';
  ctx.fillText(tr(state, 'hud_level', { level: state.currentLevel + 1, name: state.levelName.toUpperCase() }), 22, 30);

  const bestTime = state.bestTimes[state.currentLevel];
  if (bestTime) {
    ctx.fillStyle = UI_THEME.muted;
    setUiFont(ctx, state, 10, '600');
    ctx.textAlign = 'right';
    ctx.fillText(tr(state, 'hud_best_time', { time: formatFramesAsTime(bestTime) }), 286, 30);
  }

  const healthRatio = Math.max(0, s.health / Math.max(1, s.maxHealth));
  const healthColor = healthRatio > 0.55 ? '#6bffb6' : healthRatio > 0.25 ? '#ffd97a' : '#ff7b89';

  // HP Bar Pulse for low health
  const lowHPPulse = (healthRatio < 0.25 && !state.reducedMotion) ? 1 + Math.sin(tSec * 15) * 0.05 : 1;

  ctx.save();
  if (lowHPPulse !== 1) {
    ctx.translate(148, 46);
    ctx.scale(lowHPPulse, lowHPPulse);
    ctx.translate(-148, -46);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRect(ctx, 22, 38, 252, 16, 6); ctx.fill();
  const hpGrad = ctx.createLinearGradient(22, 0, 274, 0);
  hpGrad.addColorStop(0, healthColor);
  hpGrad.addColorStop(1, '#ffffff');
  ctx.fillStyle = hpGrad;
  roundRect(ctx, 22, 38, 252 * healthRatio, 16, 6); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#10213d';
  setUiFont(ctx, state, 10, '800');
  ctx.textAlign = 'center';
  ctx.fillText(tr(state, 'hud_health', { health: Math.ceil(s.health), maxHealth: s.maxHealth }), 148, 50);

  const manaRatio = Math.max(0, s.mana / Math.max(1, s.maxMana));
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRect(ctx, 22, 60, 252, 12, 5); ctx.fill();
  const manaGrad = ctx.createLinearGradient(22, 0, 274, 0);
  manaGrad.addColorStop(0, '#4a7fff');
  manaGrad.addColorStop(1, '#82ecff');
  ctx.fillStyle = manaGrad;
  roundRect(ctx, 22, 60, 252 * manaRatio, 12, 5); ctx.fill();

  // Mana Shine Effect when full
  if (manaRatio >= 1 && !state.reducedMotion) {
    const shinePos = (state.screenTimer * 4) % 600;
    const shineGrad = ctx.createLinearGradient(22 + shinePos - 60, 0, 22 + shinePos + 60, 0);
    shineGrad.addColorStop(0, 'rgba(255,255,255,0)');
    shineGrad.addColorStop(0.5, 'rgba(255,255,255,0.4)');
    shineGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shineGrad;
    roundRect(ctx, 22, 60, 252, 12, 5); ctx.fill();
  }
  ctx.fillStyle = '#d7e8ff';
  setUiFont(ctx, state, 9, '700');
  ctx.fillText(tr(state, 'hud_mana', { mana: Math.ceil(s.mana), maxMana: s.maxMana }), 148, 70);

  ctx.fillStyle = '#aac4e7';
  setUiFont(ctx, state, 11, '600');
  ctx.textAlign = 'left';
  ctx.fillText(tr(state, 'hud_lives', { lives: Math.max(0, Math.min(12, state.lives)) }), 22, 91);

  if (state.endlessWave === undefined) {
    const tm = Math.floor(state.timeElapsed / 3600);
    const ts = Math.floor((state.timeElapsed % 3600) / 60);
    const tms = Math.floor((state.timeElapsed % 60) / 0.6);
    ctx.textAlign = 'right';
    ctx.fillText(`${tm}:${ts.toString().padStart(2, '0')}.${tms.toString().padStart(2, '0')}`, 274, 91);
  }

  ctx.fillStyle = state.endlessWave !== undefined ? '#ffe08f' : '#8ff4cb';
  setUiFont(ctx, state, 11, '700');
  ctx.textAlign = 'left';
  if (state.endlessWave !== undefined) {
    ctx.fillText(tr(state, 'hud_wave', { wave: state.endlessWave, kills: state.endlessKills ?? 0 }), 22, 113);
  } else {
    ctx.fillText(tr(state, 'hud_gems', { collected: state.gemsCollected, required: state.gemsRequired }), 22, 113);
    if (state.portalOpen) {
      ctx.textAlign = 'right';
      ctx.fillText(tr(state, 'hud_portal_open'), 274, 113);
    }
  }

  const elements: { elem: Element; key: string }[] = [
    { elem: 'fire', key: '1' },
    { elem: 'water', key: '2' },
    { elem: 'earth', key: '3' },
    { elem: 'wind', key: '4' },
  ];
  const unlocked = elements.filter((entry) => state.unlockedElements.includes(entry.elem));
  const tileW = 70;
  const tileGap = 8;
  const totalW = unlocked.length * (tileW + tileGap) - tileGap;
  const startX = W / 2 - totalW / 2;
  drawPanel(ctx, startX - 12, 10, totalW + 24, 72, 12, ELEMENT_COLORS[state.selectedElement]);

  for (let i = 0; i < unlocked.length; i++) {
    const entry = unlocked[i];
    const x = startX + i * (tileW + tileGap);
    const selected = state.selectedElement === entry.elem;
    const color = ELEMENT_COLORS[entry.elem];

    // Pulsing background for selected element
    const selectorPulse = (selected && !state.reducedMotion) ? 1 + Math.sin(tSec * 6) * 0.04 : 1;

    ctx.save();
    if (selectorPulse !== 1) {
      ctx.translate(x + tileW / 2, 18 + 28);
      ctx.scale(selectorPulse, selectorPulse);
      ctx.translate(-(x + tileW / 2), -(18 + 28));
    }

    ctx.fillStyle = selected ? color + '66' : 'rgba(255,255,255,0.06)';
    roundRect(ctx, x, 18, tileW, 56, 9); ctx.fill();
    if (selected) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = '#e7f4ff';
    setUiFont(ctx, state, 11, '700');
    ctx.textAlign = 'center';
    ctx.fillText(elementName(state.locale, entry.elem).toUpperCase(), x + tileW / 2, 42);
    ctx.fillStyle = UI_THEME.muted;
    setUiFont(ctx, state, 10, '700');
    ctx.fillText(`[${entry.key}]`, x + tileW / 2, 61);
  }

  drawPanel(ctx, W - 214, 10, 204, 106, 12, '#88d8ff');
  ctx.fillStyle = '#f3fbff';
  setDisplayFont(ctx, state, 26, '800');
  ctx.textAlign = 'right';
  ctx.fillText(String(state.score), W - 20, 42);

  ctx.fillStyle = UI_THEME.muted;
  setUiFont(ctx, state, 11, '700');
  ctx.fillText(tr(state, 'hud_best', { best: state.highScore }), W - 20, 60);
  ctx.fillText(tr(state, 'hud_kills', { kills: state.enemiesDefeated }), W - 20, 77);

  const dashReady = s.dashCooldown <= 0;
  ctx.fillStyle = dashReady ? '#8bf4c7' : '#ffb0ba';
  setUiFont(ctx, state, 11, '700');
  ctx.fillText(dashReady ? tr(state, 'hud_dash_ready') : tr(state, 'hud_dash_cd', { seconds: Math.ceil(s.dashCooldown / 6) }), W - 20, 96);

  if (state.comboCount > 1 && state.comboTimer > 0) {
    const alpha = Math.min(1, state.comboTimer / 30);
    const pulse = state.reducedMotion ? 1 : 1 + Math.sin(tSec * 9) * 0.05;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(W / 2, _H - 64);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = '#7de8ff';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#d9f8ff';
    setDisplayFont(ctx, state, 24, '800');
    ctx.textAlign = 'center';
    ctx.fillText(tr(state, 'hud_combo', { count: state.comboCount }), 0, 0);
    ctx.restore();
  }

  const boss = state.enemies.find((enemy) => enemy.type === 'boss1' || enemy.type === 'boss2');
  if (boss && boss.state !== 'dead') {
    const barW = 520;
    const barH = 22;
    const bx = W / 2 - barW / 2;
    const by = 88;
    const pct = Math.max(0, boss.health / Math.max(1, boss.maxHealth));

    drawPanel(ctx, bx - 12, by - 22, barW + 24, 58, 10, '#ff90a0');
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    roundRect(ctx, bx, by, barW, barH, 8); ctx.fill();

    const bossGrad = ctx.createLinearGradient(bx, 0, bx + barW, 0);
    bossGrad.addColorStop(0, '#ff6f86');
    bossGrad.addColorStop(1, '#ffd27f');
    ctx.fillStyle = bossGrad;
    roundRect(ctx, bx, by, barW * pct, barH, 8); ctx.fill();

    ctx.fillStyle = '#3f1119';
    setUiFont(ctx, state, 11, '800');
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(boss.health)} / ${boss.maxHealth}`, W / 2, by + 15);

    ctx.fillStyle = '#ffe1e6';
    setUiFont(ctx, state, 12, '700');
    ctx.fillText(boss.type === 'boss1' ? tr(state, 'hud_boss_stone') : tr(state, 'hud_boss_wraith'), W / 2, by - 6);
  }

  drawPanel(ctx, W / 2 - 300, _H - 36, 600, 28, 9, '#7bcaff');
  ctx.fillStyle = '#d9ecff';
  setUiFont(ctx, state, 11, '600');
  ctx.textAlign = 'center';
  ctx.fillText(
    tr(state, 'hud_bottom_hint', {
      element: elementName(state.locale, state.selectedElement),
      hint: state.elementHint,
    }),
    W / 2,
    _H - 17,
  );

  if (state.endlessWave === undefined) {
    const barW = W - 40;
    const barH = 5;
    const barX = 20;
    const barY = _H - 7;

    let portalX = state.worldWidth;
    for (const obj of state.envObjects) {
      if (obj.type === 'portal') {
        portalX = obj.x;
        break;
      }
    }

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    roundRect(ctx, barX, barY, barW, barH, 3); ctx.fill();

    const playerPct = Math.min(1, s.x / Math.max(1, state.worldWidth));
    ctx.fillStyle = 'rgba(156, 224, 255, 0.8)';
    roundRect(ctx, barX, barY, barW * playerPct, barH, 3); ctx.fill();

    const portalPct = portalX / Math.max(1, state.worldWidth);
    const portalMarkerX = barX + barW * portalPct;
    ctx.fillStyle = state.portalOpen ? '#a67dff' : '#6a5f8f';
    ctx.fillRect(portalMarkerX - 2, barY - 2, 4, barH + 4);

    const playerMarkerX = barX + barW * playerPct;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(playerMarkerX, barY + barH / 2, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawMinimap(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, nowMs: number) {
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
  setUiFont(ctx, state, 7);
  ctx.textAlign = 'left';
  ctx.fillText(tr(state, 'hud_map'), mx, my - 6);

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
  const pulse = state.reducedMotion ? 2.5 : 2 + Math.sin(nowMs * 0.008) * 0.8;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(playerX, playerY, pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawLevelIntro(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number) {
  const progress = 1 - state.levelIntroTimer / 180;
  const alpha = progress < 0.1 ? progress / 0.1 : progress > 0.8 ? (1 - progress) / 0.2 : 1;

  // Juicy scale-pop effect at the start
  const scale = state.reducedMotion ? 1 : progress < 0.4 ? (0.8 + Math.sin(progress * 1.5 * Math.PI) * 0.2) : 1;

  ctx.save();
  ctx.globalAlpha = Math.min(0.85, alpha);
  ctx.fillStyle = 'rgba(3, 7, 15, 0.95)';
  ctx.fillRect(0, 0, W, H);

  ctx.translate(W / 2, H / 2);
  ctx.scale(scale, scale);
  ctx.translate(-W / 2, -H / 2);

  drawPanel(ctx, W / 2 - 320, H / 2 - 130, 640, 260, 20, '#78cfff');

  // Staggered element alphas
  const alphaTitle = Math.min(alpha, progress > 0.15 ? (progress - 0.15) / 0.1 : 0);
  const alphaSubtitle = Math.min(alpha, progress > 0.25 ? (progress - 0.25) / 0.1 : 0);
  const alphaHint = Math.min(alpha, progress > 0.45 ? (progress - 0.45) / 0.1 : 0);

  ctx.globalAlpha = alphaTitle;
  ctx.fillStyle = UI_THEME.accentStrong;
  setUiFont(ctx, state, 14, '700');
  ctx.textAlign = 'center';
  ctx.fillText(tr(state, 'level_intro_header', { level: state.currentLevel + 1 }), W / 2, H / 2 - 62);

  ctx.fillStyle = UI_THEME.paper;
  setDisplayFont(ctx, state, 36, '800');
  ctx.fillText(state.levelName, W / 2, H / 2 - 14);

  ctx.globalAlpha = alphaSubtitle;
  ctx.fillStyle = '#a7b9d8';
  setUiFont(ctx, state, 14, '600');
  ctx.fillText(state.levelSubtitle, W / 2, H / 2 + 20);

  ctx.fillStyle = UI_THEME.warning;
  setUiFont(ctx, state, 13, '700');
  ctx.fillText(tr(state, 'level_intro_objective', { gems: state.gemsRequired }), W / 2, H / 2 + 55);

  ctx.globalAlpha = alphaHint;
  ctx.fillStyle = '#9fcbff';
  setUiFont(ctx, state, 12, '600');
  ctx.fillText(state.elementHint, W / 2, H / 2 + 82);
  ctx.restore();
}
function drawMenuScreen(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, isMobile = false) {
  drawBackdrop(ctx, state, W, H, ['#060b1f', '#0d1e45', '#1d1033']);
  const progression = getProgressionSnapshot(state);
  const leaderboard = getLeaderboard(3);
  const boardStatus = getLeaderboardStatus();
  const cloudStatus = getCloudSyncStatus();

  const tSec = state.reducedMotion ? 0 : state.screenTimer * 0.02;
  ctx.save();
  ctx.fillStyle = UI_THEME.paper;
  setUiFont(ctx, state, 12, '600');
  ctx.textAlign = 'center';
  ctx.globalAlpha = 0.78;
  ctx.fillText('ELEMENTAL ACTION PLATFORMER', W / 2, 82);
  ctx.globalAlpha = 1;

  ctx.shadowColor = '#49c8ff';
  ctx.shadowBlur = Math.sin(tSec * 2) * 5 + 15;
  ctx.fillStyle = '#e8f3ff';
  setDisplayFont(ctx, state, 64, '800');
  ctx.fillText(tr(state, 'menu_title_line_1'), W / 2, 140 + Math.sin(tSec) * 4);

  ctx.shadowColor = '#74f0d4';
  ctx.shadowBlur = Math.sin(tSec * 2 + 1) * 5 + 15;
  ctx.fillStyle = '#95e9ff';
  setDisplayFont(ctx, state, 58, '800');
  ctx.fillText(tr(state, 'menu_title_line_2'), W / 2, 205 + Math.sin(tSec + 0.7) * 4);
  ctx.restore();

  ctx.fillStyle = '#a1b6d1';
  setUiFont(ctx, state, 16, '600');
  ctx.fillText(tr(state, 'menu_subtitle'), W / 2, 250);

  const elements: Element[] = ['fire', 'water', 'earth', 'wind'];
  const colors = ['#ff845f', '#61b9ff', '#8de67f', '#d5e3ff'];
  for (let i = 0; i < elements.length; i++) {
    drawPanel(ctx, W / 2 - 245 + i * 122, 265, 112, 36, 10, colors[i]);
    ctx.fillStyle = colors[i];
    setUiFont(ctx, state, 13, '700');
    ctx.fillText(elementName(state.locale, elements[i]).toUpperCase(), W / 2 - 189 + i * 122, 288);
  }

  const btnW = 280;
  const btnH = 80;
  const gap = 40;
  const baseY = 320;
  const campX = W / 2 - btnW - gap / 2;
  const waveX = W / 2 + gap / 2;

  // Draw Campaign Button
  const isCampHovered = state.selectedMenuButton === 0;
  ctx.save();
  if (isCampHovered && !state.reducedMotion) {
    ctx.shadowColor = '#75f2b4';
    ctx.shadowBlur = 25;
  }
  drawPanel(ctx, campX, baseY, btnW, btnH, 16, isCampHovered ? '#8dfbcc' : '#64e5a4');
  ctx.restore();

  ctx.fillStyle = isCampHovered ? '#ffffff' : '#cbffe9';
  setDisplayFont(ctx, state, 22, '700');
  ctx.textAlign = 'center';
  ctx.fillText(tr(state, 'menu_campaign'), campX + btnW / 2, baseY + 35);
  ctx.fillStyle = isCampHovered ? '#aaffde' : '#88d9b7';
  setUiFont(ctx, state, 12, '600');
  ctx.fillText(tr(state, 'menu_campaign_subtitle'), campX + btnW / 2, baseY + 56);
  ctx.fillStyle = isCampHovered ? '#2d654f' : '#3e765f';
  setUiFont(ctx, state, 11, '800');
  ctx.fillText(isMobile ? tr(state, 'menu_tap_play') : tr(state, 'menu_key_campaign'), campX + btnW / 2, baseY + 74);

  // Draw Wave Button
  const isWaveHovered = state.selectedMenuButton === 1;
  ctx.save();
  if (isWaveHovered && !state.reducedMotion) {
    ctx.shadowColor = '#ff9e7b';
    ctx.shadowBlur = 25;
  }
  drawPanel(ctx, waveX, baseY, btnW, btnH, 16, isWaveHovered ? '#ffaa8b' : '#f08964');
  ctx.restore();

  ctx.fillStyle = isWaveHovered ? '#ffffff' : '#ffe5db';
  setDisplayFont(ctx, state, 22, '700');
  ctx.fillText(tr(state, 'menu_wave'), waveX + btnW / 2, baseY + 35);
  ctx.fillStyle = isWaveHovered ? '#ffded1' : '#ffc3af';
  setUiFont(ctx, state, 12, '600');
  ctx.fillText(tr(state, 'menu_wave_subtitle'), waveX + btnW / 2, baseY + 56);
  ctx.fillStyle = isWaveHovered ? '#693728' : '#8a4b37';
  setUiFont(ctx, state, 11, '800');
  ctx.fillText(isMobile ? tr(state, 'menu_tap_play') : tr(state, 'menu_key_wave'), waveX + btnW / 2, baseY + 74);

  const barY = baseY + btnH + 40;
  const diffColors: Record<string, string> = { easy: '#7df6b9', normal: '#ffd56e', hard: '#ff8896' };
  drawPanel(ctx, W / 2 - 255, barY - 24, 230, 58, 12, diffColors[state.difficulty] || '#ffd56e');
  ctx.fillStyle = diffColors[state.difficulty] || '#ffd56e';
  setUiFont(ctx, state, 14, '700');
  ctx.fillText(tr(state, 'menu_difficulty', { difficulty: state.difficulty.toUpperCase() }), W / 2 - 140, barY - 2);
  ctx.fillStyle = UI_THEME.muted;
  setUiFont(ctx, state, 11, '600');
  ctx.fillText(isMobile ? tr(state, 'menu_tap_cycle') : tr(state, 'menu_key_cycle'), W / 2 - 140, barY + 18);

  drawPanel(ctx, W / 2 + 20, barY - 24, 220, 58, 12, '#89d8ff');
  ctx.fillStyle = '#dff5ff';
  setUiFont(ctx, state, 16, '700');
  ctx.fillText(tr(state, 'menu_shop'), W / 2 + 130, barY - 1);
  ctx.fillStyle = UI_THEME.muted;
  setUiFont(ctx, state, 11, '600');
  ctx.fillText(isMobile ? tr(state, 'menu_tap_open') : tr(state, 'menu_key_open'), W / 2 + 130, barY + 18);

  drawPanel(ctx, W - 355, 84, 320, 236, 14, '#84cfff');
  ctx.fillStyle = '#def3ff';
  setUiFont(ctx, state, 13, '700');
  ctx.textAlign = 'left';
  ctx.fillText(tr(state, 'menu_daily_title'), W - 340, 110);

  ctx.fillStyle = '#aac4e7';
  setUiFont(ctx, state, 11, '600');
  ctx.fillText(progression.daily.title, W - 340, 130);
  ctx.fillStyle = progression.daily.completed ? '#74f0b8' : '#ffe28f';
  ctx.fillText(
    progression.daily.completed
      ? tr(state, 'menu_daily_complete')
      : tr(state, 'menu_daily_progress', { current: progression.daily.current, target: progression.daily.target }),
    W - 340,
    147,
  );

  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  roundRect(ctx, W - 340, 154, 290, 10, 5);
  ctx.fill();
  ctx.fillStyle = progression.daily.completed ? '#66efc0' : '#84c8ff';
  roundRect(ctx, W - 340, 154, 290 * progression.daily.progress, 10, 5);
  ctx.fill();

  ctx.fillStyle = '#def3ff';
  setUiFont(ctx, state, 12, '700');
  ctx.fillText(tr(state, 'menu_achievements_title'), W - 340, 182);
  ctx.fillStyle = '#8fdcbf';
  setUiFont(ctx, state, 11, '700');
  ctx.fillText(tr(state, 'menu_achievements_progress', {
    unlocked: progression.achievementsUnlocked.length,
    total: progression.totalAchievements,
  }), W - 340, 199);

  ctx.fillStyle = '#def3ff';
  setUiFont(ctx, state, 12, '700');
  ctx.fillText(tr(state, 'menu_leaderboard_title'), W - 340, 222);
  if (leaderboard.length === 0) {
    ctx.fillStyle = '#8ca6ca';
    setUiFont(ctx, state, 11, '600');
    ctx.fillText(tr(state, 'menu_leaderboard_empty'), W - 340, 241);
  } else {
    for (let i = 0; i < leaderboard.length; i++) {
      const row = leaderboard[i];
      ctx.fillStyle = i === 0 ? '#ffe18f' : '#a9c9ea';
      setUiFont(ctx, state, 11, '700');
      ctx.fillText(
        tr(state, 'menu_leaderboard_row', {
          rank: i + 1,
          player: shortAccountId(row.accountId),
          score: row.score,
        }),
        W - 340,
        241 + i * 18,
      );
    }
  }

  ctx.fillStyle = '#8199bb';
  setUiFont(ctx, state, 10, '600');
  ctx.fillText(
    tr(state, 'menu_sync_status', {
      queue: cloudStatus.pending + boardStatus.pendingSubmissions,
      remote: boardStatus.remoteEnabled ? 'online' : 'local',
    }),
    W - 340,
    305,
  );

  drawPanel(ctx, W / 2 - 350, H - 72, 700, 52, 12, '#6fb2ff');
  ctx.fillStyle = UI_THEME.paper;
  setUiFont(ctx, state, 12, '700');
  ctx.fillText(tr(state, 'menu_stats', {
    best: state.highScore,
    gems: state.gemsCurrency,
    level: state.furthestLevel + 1,
  }), W / 2, H - 48);

  ctx.fillStyle = UI_THEME.muted;
  setUiFont(ctx, state, 11, '600');
  ctx.fillText(isMobile ? tr(state, 'menu_controls_mobile') : tr(state, 'menu_controls_desktop'), W / 2, H - 30);
}
function drawLevelCompleteScreen(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, isMobile = false) {
  drawBackdrop(ctx, state, W, H, ['#051527', '#0f2e45', '#143e39']);

  drawPanel(ctx, W / 2 - 360, H / 2 - 160, 720, 320, 20, '#64f0c0');
  const tSec = state.reducedMotion ? 0 : state.screenTimer * 0.03;

  ctx.save();
  ctx.shadowColor = '#63ffcb';
  ctx.shadowBlur = 26;
  ctx.fillStyle = '#d8ffee';
  setDisplayFont(ctx, state, 44, '800');
  ctx.textAlign = 'center';
  ctx.fillText(tr(state, 'level_complete_title'), W / 2, H / 2 - 92 + Math.sin(tSec) * 4);
  ctx.restore();
  ctx.textAlign = 'center';

  ctx.fillStyle = UI_THEME.warning;
  setUiFont(ctx, state, 18, '700');
  ctx.fillText(tr(state, 'level_complete_level_name', { level: state.currentLevel + 1, name: state.levelName }), W / 2, H / 2 - 48);

  ctx.fillStyle = UI_THEME.paper;
  setUiFont(ctx, state, 15, '600');
  ctx.fillText(tr(state, 'level_complete_gems', { collected: state.gemsCollected, total: state.totalGems }), W / 2, H / 2 - 8);
  ctx.fillText(tr(state, 'level_complete_enemies', { count: state.enemiesDefeated }), W / 2, H / 2 + 20);
  ctx.fillText(tr(state, 'level_complete_score', { score: state.score }), W / 2, H / 2 + 48);

  if (state.gemsCollected >= state.totalGems) {
    ctx.fillStyle = '#ffe38a';
    setUiFont(ctx, state, 14, '700');
    ctx.fillText(tr(state, 'level_complete_all_gems_bonus'), W / 2, H / 2 + 74);
  }

  const blinkAlpha = state.reducedMotion ? 1 : 0.55 + Math.sin(state.screenTimer * 0.07) * 0.45;
  ctx.globalAlpha = blinkAlpha;
  ctx.fillStyle = '#96dcff';
  setUiFont(ctx, state, 16, '700');
  if (state.currentLevel + 1 >= state.totalLevels) {
    ctx.fillText(isMobile ? tr(state, 'level_complete_tap_victory') : tr(state, 'level_complete_click_victory'), W / 2, H / 2 + 116);
  } else {
    ctx.fillText(isMobile ? tr(state, 'level_complete_tap_next') : tr(state, 'level_complete_click_next'), W / 2, H / 2 + 116);
  }
  ctx.globalAlpha = 1;
}
function drawGameOverScreen(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, isMobile = false) {
  drawBackdrop(ctx, state, W, H, ['#220611', '#321126', '#12040b']);
  drawPanel(ctx, W / 2 - 360, H / 2 - 160, 720, 320, 20, '#ff8fa1');

  const tSec = state.reducedMotion ? 0 : state.screenTimer * 0.03;
  ctx.save();
  ctx.shadowColor = '#ff5a74';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#ffdce3';
  setDisplayFont(ctx, state, 46, '800');
  ctx.textAlign = 'center';
  ctx.fillText(state.endlessWave !== undefined ? tr(state, 'game_over_wave') : tr(state, 'game_over_title'), W / 2, H / 2 - 72 + Math.sin(tSec) * 3);
  ctx.restore();
  ctx.textAlign = 'center';

  ctx.fillStyle = '#f3b7c4';
  setUiFont(ctx, state, 16, '600');
  ctx.fillText(tr(state, 'game_over_final_score', { score: state.score }), W / 2, H / 2 - 24);
  ctx.fillText(tr(state, 'game_over_best_score', { score: state.highScore }), W / 2, H / 2 + 4);

  ctx.fillStyle = '#ffd5a2';
  if (state.endlessWave !== undefined) {
    ctx.fillText(tr(state, 'game_over_survived_wave', { wave: state.endlessWave }), W / 2, H / 2 + 34);
    ctx.fillText(tr(state, 'game_over_total_kills', { kills: state.endlessKills ?? 0 }), W / 2, H / 2 + 60);
  } else {
    ctx.fillText(tr(state, 'game_over_reached_level', { level: state.currentLevel + 1, name: state.levelName }), W / 2, H / 2 + 34);
  }

  const blinkAlpha = state.reducedMotion ? 1 : 0.55 + Math.sin(state.screenTimer * 0.06) * 0.45;
  ctx.globalAlpha = blinkAlpha;
  ctx.fillStyle = '#ffdf9a';
  setUiFont(ctx, state, 16, '700');
  ctx.fillText(isMobile ? tr(state, 'game_over_tap_return') : tr(state, 'game_over_press_return'), W / 2, H / 2 + 112);
  ctx.globalAlpha = 1;
}
function drawVictoryScreen(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, isMobile = false) {
  drawBackdrop(ctx, state, W, H, ['#0d142f', '#1e2f6f', '#163d4c']);
  drawPanel(ctx, W / 2 - 360, H / 2 - 160, 720, 320, 20, '#8ce8ff');

  if (!state.reducedMotion) {
    for (let i = 0; i < 26; i++) {
      const sx = (Math.sin(state.screenTimer * 0.024 + i * 1.37) * 0.5 + 0.5) * W;
      const sy = (Math.cos(state.screenTimer * 0.017 + i * 0.91) * 0.5 + 0.5) * H;
      const alpha = 0.24 + Math.sin(state.screenTimer * 0.05 + i) * 0.2;
      ctx.fillStyle = `rgba(140, 238, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tSec = state.reducedMotion ? 0 : state.screenTimer * 0.03;
  ctx.save();
  ctx.shadowColor = '#7ce4ff';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#ecfbff';
  setDisplayFont(ctx, state, 48, '800');
  ctx.textAlign = 'center';
  ctx.fillText(tr(state, 'victory_title'), W / 2, H / 2 - 86 + Math.sin(tSec) * 5);
  ctx.restore();
  ctx.textAlign = 'center';

  ctx.fillStyle = '#d8efff';
  setUiFont(ctx, state, 18, '700');
  ctx.fillText(tr(state, 'victory_subtitle'), W / 2, H / 2 - 36);

  ctx.fillStyle = '#ffe49a';
  setUiFont(ctx, state, 16, '600');
  ctx.fillText(tr(state, 'victory_final_score', { score: state.score }), W / 2, H / 2 + 6);
  ctx.fillText(tr(state, 'victory_total_gems', { gems: state.totalGemsEver }), W / 2, H / 2 + 32);
  ctx.fillText(tr(state, 'victory_enemies', { count: state.enemiesDefeated }), W / 2, H / 2 + 58);

  const blinkAlpha = state.reducedMotion ? 1 : 0.5 + Math.sin(state.screenTimer * 0.06) * 0.5;
  ctx.globalAlpha = blinkAlpha;
  ctx.fillStyle = '#9ce3ff';
  setUiFont(ctx, state, 16, '700');
  ctx.fillText(isMobile ? tr(state, 'victory_tap_again') : tr(state, 'victory_click_again'), W / 2, H / 2 + 112);
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
  drawBackdrop(ctx, state, W, H, ['#080d1f', '#102545', '#0f1631']);
  drawPanel(ctx, W / 2 - 370, 36, 740, 620, 22, '#75cbff');

  ctx.fillStyle = UI_THEME.paper;
  setDisplayFont(ctx, state, 40, '800');
  ctx.textAlign = 'center';
  ctx.fillText(tr(state, 'shop_title'), W / 2, 92);

  drawPanel(ctx, W / 2 - 180, 110, 360, 56, 12, '#ffd37f');
  ctx.fillStyle = '#ffeab7';
  setUiFont(ctx, state, 22, '700');
  ctx.fillText(tr(state, 'shop_currency', { gems: state.gemsCurrency }), W / 2, 146);

  const upg = state.upgrades;
  const costs = {
    health: (upg.healthLevel + 1) * 30,
    mana: (upg.manaLevel + 1) * 30,
    regen: (upg.regenLevel + 1) * 50,
    damage: (upg.damageLevel + 1) * 60,
    doubleJump: (upg.doubleJumpLevel + 1) * 100,
    dashDistance: (upg.dashDistanceLevel + 1) * 80,
  };

  const spacing = 70;
  const startY = 194;
  setUiFont(ctx, state, 18, '700');
  ctx.textAlign = 'left';

  const drawRow = (idx: number, y: number, name: string, level: number, cost: number, maxed: boolean) => {
    drawPanel(ctx, W / 2 - 290, y - 30, 580, 58, 12, maxed ? '#71de8f' : '#7acaff');
    ctx.fillStyle = maxed ? '#b3ffc2' : (state.gemsCurrency >= cost ? UI_THEME.paper : '#ffb6be');
    ctx.fillText(`[${idx}] ${name}`, W / 2 - 250, y + 4);

    for (let i = 0; i < 5; i++) {
      const boxX = W / 2 + i * 35 - 24;
      ctx.fillStyle = i < level ? '#6be2ff' : 'rgba(255,255,255,0.08)';
      roundRect(ctx, boxX, y - 18, 27, 24, 5);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.stroke();
    }

    ctx.fillStyle = maxed ? '#8effaf' : '#ffe08f';
    ctx.textAlign = 'right';
    ctx.fillText(maxed ? tr(state, 'shop_maxed') : `${cost}`, W / 2 + 252, y + 4);
    ctx.textAlign = 'left';
  };

  drawRow(1, startY, tr(state, 'shop_max_health'), upg.healthLevel, costs.health, upg.healthLevel >= 5);
  drawRow(2, startY + spacing, tr(state, 'shop_max_mana'), upg.manaLevel, costs.mana, upg.manaLevel >= 5);
  drawRow(3, startY + spacing * 2, tr(state, 'shop_mana_regen'), upg.regenLevel, costs.regen, upg.regenLevel >= 5);
  drawRow(4, startY + spacing * 3, tr(state, 'shop_spell_damage'), upg.damageLevel, costs.damage, upg.damageLevel >= 5);
  drawRow(5, startY + spacing * 4, tr(state, 'shop_double_jump' as any), upg.doubleJumpLevel, costs.doubleJump, upg.doubleJumpLevel >= 5);
  drawRow(6, startY + spacing * 5, tr(state, 'shop_dash_distance' as any), upg.dashDistanceLevel, costs.dashDistance, upg.dashDistanceLevel >= 5);

  drawPanel(ctx, W / 2 - 325, H - 104, 650, 74, 12, '#89d6ff');
  ctx.fillStyle = UI_THEME.muted;
  ctx.textAlign = 'center';
  setUiFont(ctx, state, 15, '600');

  if (isMobile) {
    ctx.fillText(tr(state, 'shop_tap_buy'), W / 2, H - 78);
    ctx.fillStyle = 'rgba(11, 20, 35, 0.95)';
    roundRect(ctx, W / 2 - 60, H - 70, 120, 40, 10);
    ctx.fill();
    ctx.strokeStyle = '#8cc5ff';
    ctx.stroke();
    ctx.fillStyle = '#d8ecff';
    setUiFont(ctx, state, 14, '700');
    ctx.fillText(tr(state, 'shop_back'), W / 2, H - 44);
  } else {
    ctx.fillText(tr(state, 'shop_press_buy'), W / 2, H - 78);
    ctx.fillText(tr(state, 'shop_press_back'), W / 2, H - 52);
  }
}
function drawLights(ctx: CanvasRenderingContext2D, state: GameState, W: number) {
  const cam = state.camera;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // 1. Player light
  const s = state.stickman;
  const px = s.x + s.width / 2 - cam.x;
  const py = s.y + s.height / 2 - cam.y;
  const pGrad = ctx.createRadialGradient(px, py, 0, px, py, 120);
  const pColor = ELEMENT_COLORS[state.selectedElement];
  pGrad.addColorStop(0, pColor + '44');
  pGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = pGrad;
  ctx.beginPath();
  ctx.arc(px, py, 120, 0, Math.PI * 2);
  ctx.fill();

  // 2. Projectile lights
  for (const p of state.projectiles) {
    const lx = p.x - cam.x;
    const ly = p.y - cam.y;
    const lGrad = ctx.createRadialGradient(lx, ly, 0, lx, ly, 60);
    lGrad.addColorStop(0, ELEMENT_COLORS[p.element] + '66');
    lGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = lGrad;
    ctx.beginPath(); ctx.arc(lx, ly, 60, 0, Math.PI * 2); ctx.fill();
  }

  // 3. Env Light Sources
  for (const obj of state.envObjects) {
    if (obj.state === 'collected' || obj.state === 'destroyed') continue;
    const ox = obj.x + obj.width / 2 - cam.x;
    const oy = obj.y + obj.height / 2 - cam.y;
    if (ox < -150 || ox > W + 150) continue;

    let lightColor = '';
    let size = 60;

    if (obj.type === 'gem') { lightColor = '#ffcc0044'; size = 50; }
    else if (obj.type === 'mana_crystal') { lightColor = '#0088ff44'; size = 50; }
    else if (obj.type === 'portal') { lightColor = state.portalOpen ? '#aa44ff66' : '#5522aa33'; size = 180; }
    else if (obj.type === 'fire_pit' || obj.state === 'burning') { lightColor = '#ff440044'; size = 90; }

    if (lightColor) {
      const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, size);
      g.addColorStop(0, lightColor);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(ox, oy, size, 0, Math.PI * 2); ctx.fill();
    }
  }

  ctx.restore();
}

function drawLevelSelectScreen(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, isMobile = false) {
  drawBackdrop(ctx, state, W, H, ['#0a1230', '#112755', '#14193d']);
  drawPanel(ctx, W / 2 - 520, 36, 1040, 624, 22, '#74c8ff');

  ctx.fillStyle = UI_THEME.paper;
  setDisplayFont(ctx, state, 40, '800');
  ctx.textAlign = 'center';
  ctx.fillText(tr(state, 'level_select_title'), W / 2, 92);

  const cols = 5;
  const cardW = 180;
  const cardH = 120;
  const gap = 20;
  const startX = W / 2 - (cols * cardW + (cols - 1) * gap) / 2;
  const startY = 150;

  for (let i = 0; i < state.totalLevels; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const lx = startX + col * (cardW + gap);
    const ly = startY + row * (cardH + gap);

    const unlocked = i <= state.furthestLevel;
    const selected = state.levelSelectionIndex === i;

    const cardGrad = ctx.createLinearGradient(lx, ly, lx + cardW, ly + cardH);
    cardGrad.addColorStop(0, selected ? 'rgba(95, 184, 255, 0.33)' : 'rgba(11, 20, 40, 0.88)');
    cardGrad.addColorStop(1, selected ? 'rgba(80, 227, 194, 0.24)' : 'rgba(18, 37, 70, 0.82)');
    ctx.fillStyle = cardGrad;
    roundRect(ctx, lx, ly, cardW, cardH, 10);
    ctx.fill();

    if (selected) {
      ctx.strokeStyle = '#7ad3ff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#7ad3ff';
      ctx.shadowBlur = 18;
      roundRect(ctx, lx, ly, cardW, cardH, 10);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = 'rgba(145, 199, 255, 0.25)';
      ctx.lineWidth = 1;
      roundRect(ctx, lx, ly, cardW, cardH, 10);
      ctx.stroke();
    }

    if (unlocked) {
      ctx.fillStyle = '#dff4ff';
      setDisplayFont(ctx, state, 28, '700');
      ctx.textAlign = 'center';
      ctx.fillText(`${i + 1}`, lx + cardW / 2, ly + 50);

      const best = state.bestTimes[i];
      if (best) {
        ctx.fillStyle = '#8ef8c6';
        setUiFont(ctx, state, 11, '700');
        ctx.fillText(tr(state, 'level_select_best', { time: formatFramesAsTime(best) }), lx + cardW / 2, ly + 80);
      } else {
        ctx.fillStyle = '#6d89ae';
        setUiFont(ctx, state, 11, '600');
        ctx.fillText(tr(state, 'level_select_none'), lx + cardW / 2, ly + 80);
      }
    } else {
      ctx.fillStyle = '#95a7c2';
      setUiFont(ctx, state, 18, '700');
      ctx.textAlign = 'center';
      ctx.fillText(tr(state, 'level_select_locked'), lx + cardW / 2, ly + 65);
    }
  }

  drawPanel(ctx, W / 2 - 430, H - 86, 860, 56, 12, '#86d2ff');
  ctx.fillStyle = '#d8ecff';
  setUiFont(ctx, state, 14, '700');
  ctx.fillText(isMobile ? tr(state, 'level_select_tap_start') : tr(state, 'level_select_click_start'), W / 2, H - 58);

  ctx.fillStyle = UI_THEME.muted;
  setUiFont(ctx, state, 11, '600');
  ctx.fillText(tr(state, 'level_select_locked_hint'), W / 2, H - 39);
}

function drawDialogSystem(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, isPortraitMobile: boolean) {
  const dialog = state.activeDialog[0];
  if (!dialog) return;

  const panelH = isPortraitMobile ? 180 : 160;
  const panelW = isPortraitMobile ? W - 40 : Math.min(W - 80, 800);
  const panelX = W / 2 - panelW / 2;
  const panelY = H - panelH - (isPortraitMobile ? 40 : 60);

  ctx.save();
  // Semi-transparent overlay to focus attention
  ctx.fillStyle = 'rgba(4, 8, 16, 0.5)';
  ctx.fillRect(0, 0, W, H);

  // Dialog Box Background
  drawPanel(ctx, panelX, panelY, panelW, panelH, 12, '#ffffff');

  // Speaker Name Plate
  const nameW = Math.max(140, ctx.measureText(dialog.speaker).width + 60);
  drawPanel(ctx, panelX + 20, panelY - 18, nameW, 36, 6, '#7ae8ff');
  ctx.fillStyle = '#102545';
  setDisplayFont(ctx, state, 18, '800');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(dialog.speaker.toUpperCase(), panelX + 20 + nameW / 2, panelY);

  // Speaker Portrait Box
  const portraitSize = isPortraitMobile ? 80 : 100;
  const portraitX = panelX + 20;
  const portraitY = panelY + 30;

  // Enhanced Portrait Container
  drawPanel(ctx, portraitX, portraitY, portraitSize, portraitSize, 12, 'rgba(16, 37, 69, 0.85)');
  ctx.strokeStyle = 'rgba(122, 232, 255, 0.5)';
  ctx.lineWidth = 2;
  roundRect(ctx, portraitX, portraitY, portraitSize, portraitSize, 12);
  ctx.stroke();

  // Draw portrait placeholder or color if provided
  if (dialog.portrait) {
    if (Object.values(ELEMENT_COLORS).includes(dialog.portrait)) {
      ctx.fillStyle = dialog.portrait;
    } else {
      ctx.fillStyle = '#6d89ae'; // fallback
    }
    roundRect(ctx, portraitX + 4, portraitY + 4, portraitSize - 8, portraitSize - 8, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    setDisplayFont(ctx, state, 30, '800');
    // Draw initial if no sprite is present
    ctx.fillText(dialog.speaker[0]?.toUpperCase() || '?', portraitX + portraitSize / 2, portraitY + portraitSize / 2);
  }

  // Typewriter Text
  const textX = portraitX + portraitSize + 20;
  const textY = panelY + 40;
  const maxWidth = panelW - (portraitSize + 60);
  const textToDraw = dialog.text.substring(0, Math.floor(state.dialogCharIndex));

  ctx.fillStyle = '#e9f2ff';
  setUiFont(ctx, state, isPortraitMobile ? 14 : 18, '600');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Word wrap for dialog
  const words = textToDraw.split(' ');
  let line = '';
  let lineY = textY;
  const lineHeight = isPortraitMobile ? 22 : 28;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, textX, lineY);
      line = words[n] + ' ';
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, textX, lineY);

  // Blink indicator when fully typed
  if (Math.floor(state.dialogCharIndex) >= dialog.text.length) {
    const blinkAlpha = 0.5 + Math.sin(Date.now() * 0.005) * 0.5;
    ctx.globalAlpha = blinkAlpha;
    ctx.fillStyle = '#7ae8ff';
    ctx.beginPath();
    ctx.arc(panelX + panelW - 24, panelY + panelH - 24, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

