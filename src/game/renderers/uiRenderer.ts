import type { Difficulty, GameState, ShopTab } from '../types';
import { TOTAL_LEVELS } from '../levels';
import { DIFFICULTY_SETTINGS } from '../constants';
import { getLeaderboard, getLeaderboardStatus } from '../services/leaderboard';
import { getProgressionSnapshot } from '../services/progression';
import { UI_THEME, ELEMENT_COLORS } from './renderConstants';
import { assetLoader } from '../services/assetLoader';
import { formatFramesAsTime, roundRect, setUiFont, setDisplayFont, tr } from './renderUtils';

export function drawPanel(
  ctx: CanvasRenderingContext2D,
  _state: GameState,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  accentColor: string = UI_THEME.accent,
  alpha: number = 0.95,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const grad = ctx.createLinearGradient(x, y, x, y + height);
  grad.addColorStop(0, UI_THEME.panelA);
  grad.addColorStop(1, UI_THEME.panelB);
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, width, height, radius);
  ctx.fill();
  ctx.strokeStyle = UI_THEME.panelBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + radius + 10, y);
  ctx.lineTo(x + width - radius - 10, y);
  ctx.stroke();
  ctx.restore();
}

export function drawGemIcon(
  ctx: CanvasRenderingContext2D,
  _state: GameState,
  x: number,
  y: number,
  size: number,
  nowMs: number,
) {
  const bob = Math.sin(nowMs * 0.005) * 2;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.rotate(nowMs * 0.001);
  ctx.fillStyle = '#ffd37f';
  ctx.shadowColor = '#ffd37f';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size, 0);
  ctx.lineTo(0, size);
  ctx.lineTo(-size, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  _state: GameState,
  W: number,
  H: number,
  colors: [string, string, string],
) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(0.5, colors[1]);
  grad.addColorStop(1, colors[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
}

function drawStoneHudPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  accentColor: string = '#9ae6de',
) {
  const stone = ctx.createLinearGradient(x, y, x, y + height);
  stone.addColorStop(0, '#26252b');
  stone.addColorStop(1, '#141419');
  ctx.fillStyle = stone;
  roundRect(ctx, x, y, width, height, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(240, 226, 196, 0.2)';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, width, height, 12);
  ctx.stroke();

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 14, y + 6);
  ctx.lineTo(x + width - 14, y + 6);
  ctx.stroke();

  // Rivets
  ctx.fillStyle = 'rgba(189, 170, 136, 0.7)';
  const rivets = [
    [x + 12, y + 12], [x + width - 12, y + 12],
    [x + 12, y + height - 12], [x + width - 12, y + height - 12],
  ];
  rivets.forEach(([rx, ry]) => { ctx.beginPath(); ctx.arc(rx, ry, 3, 0, Math.PI * 2); ctx.fill(); });
}

function drawTexturedBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  ratio: number,
  type: 'fire' | 'wind',
  timeMs: number,
  opts: { lowHealth?: boolean } = {},
) {
  ctx.save();
  roundRect(ctx, x, y, width, height, height / 2);
  ctx.clip();

  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(x, y, width, height);

  const len = Math.max(0, Math.min(1, ratio));
  if (type === 'fire') {
    const grad = ctx.createLinearGradient(x, y, x + width, y + height);
    grad.addColorStop(0, '#2d0c0c');
    grad.addColorStop(1, '#531616');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, width * len, height);

    const flame = ctx.createLinearGradient(x, y, x, y + height);
    flame.addColorStop(0, '#ffb347');
    flame.addColorStop(1, '#ff512f');
    ctx.fillStyle = flame;
    ctx.fillRect(x, y, width * len, height * 0.9);

    // Flicker overlay
    const flicker = 0.18 + 0.12 * Math.sin(timeMs * 0.03);
    ctx.globalAlpha = flicker;
    ctx.fillStyle = 'rgba(255,180,90,0.7)';
    ctx.fillRect(x, y, width * len, height);
    ctx.globalAlpha = 1;

    // Scrolling embers
    const scroll = (timeMs * 0.12) % 40;
    ctx.save();
    ctx.translate(-scroll, 0);
    const stripe = ctx.createLinearGradient(x, y, x + 24, y);
    stripe.addColorStop(0, 'rgba(255,230,170,0.35)');
    stripe.addColorStop(1, 'rgba(255,140,70,0)');
    ctx.fillStyle = stripe;
    ctx.globalAlpha = 0.45;
    ctx.fillRect(x, y, width + 40, height);
    ctx.restore();
  } else {
    const grad = ctx.createLinearGradient(x, y, x + width, y + height);
    grad.addColorStop(0, '#0d1c2a');
    grad.addColorStop(1, '#163347');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, width * len, height);

    const swirl = ctx.createLinearGradient(x, y, x, y + height);
    swirl.addColorStop(0, '#9de6ff');
    swirl.addColorStop(1, '#e8f6ff');
    ctx.fillStyle = swirl;
    ctx.fillRect(x, y, width * len, height * 0.85);

    // Horizontal swirl motion
    const scroll = (timeMs * 0.08) % 50;
    ctx.save();
    ctx.translate(-scroll, 0);
    const streak = ctx.createLinearGradient(x, y, x + 30, y + height);
    streak.addColorStop(0, 'rgba(155,230,222,0.28)');
    streak.addColorStop(1, 'rgba(155,230,222,0)');
    ctx.fillStyle = streak;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(x, y, width + 60, height);
    ctx.restore();
  }

  ctx.restore();
  ctx.strokeStyle = 'rgba(240, 226, 196, 0.35)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, width, height, height / 2);
  ctx.stroke();

  if (type === 'fire' && opts.lowHealth) {
    const pulse = 0.45 + 0.4 * Math.sin(timeMs * 0.02);
    ctx.strokeStyle = `rgba(255, 80, 60, ${pulse})`;
    ctx.lineWidth = 3.5;
    roundRect(ctx, x + 2, y + 2, width - 4, height - 4, height / 2);
    ctx.stroke();
  }
}

function drawMenuCard(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  opts: {
    x: number; y: number; w: number; h: number;
    title: string; subtitle: string;
    glowColor: string; icon: 'map' | 'swords' | 'bag' | 'star';
    elementColor: string;
    active: boolean;
  },
) {
  const { x, y, w, h, title, subtitle, glowColor, icon, elementColor, active } = opts;
  const scale = active ? 1.04 : 1;
  const cx = x + w / 2;
  const cy = y + h / 2;

  // Simple shadow + base card
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);

  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;

  const base = ctx.createLinearGradient(x, y, x, y + h);
  base.addColorStop(0, 'rgba(34,32,36,0.9)');
  base.addColorStop(1, 'rgba(16,14,18,0.85)');
  ctx.fillStyle = base;
  roundRect(ctx, x, y, w, h, 18);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Active glow border
  if (active) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 6;
    roundRect(ctx, x + 3, y + 3, w - 6, h - 6, 16);
    ctx.stroke();
    ctx.restore();
  }

  // Icon bubble
  const iconSize = 38;
  const iconX = x + 28;
  const iconY = y + h / 2;

  ctx.save();
  ctx.fillStyle = elementColor;
  ctx.globalAlpha = 0.14;
  ctx.beginPath();
  ctx.arc(iconX, iconY, iconSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = elementColor;
  ctx.lineWidth = 2.5;
  if (icon === 'map') {
    ctx.strokeRect(iconX - 10, iconY - 10, 20, 20);
    ctx.beginPath(); ctx.moveTo(iconX - 6, iconY - 4); ctx.lineTo(iconX, iconY - 2); ctx.lineTo(iconX + 6, iconY - 6); ctx.stroke();
  } else if (icon === 'swords') {
    ctx.beginPath(); ctx.moveTo(iconX - 10, iconY - 10); ctx.lineTo(iconX + 10, iconY + 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(iconX + 10, iconY - 10); ctx.lineTo(iconX - 10, iconY + 10); ctx.stroke();
  } else if (icon === 'bag') {
    ctx.beginPath(); ctx.arc(iconX, iconY, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(iconX - 5, iconY - 7); ctx.lineTo(iconX + 5, iconY - 7); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(iconX, iconY - 12); ctx.lineTo(iconX + 4, iconY - 2); ctx.lineTo(iconX + 14, iconY - 2); ctx.lineTo(iconX + 6, iconY + 4);
    ctx.lineTo(iconX + 10, iconY + 14); ctx.lineTo(iconX, iconY + 8); ctx.lineTo(iconX - 10, iconY + 14); ctx.lineTo(iconX - 6, iconY + 4);
    ctx.lineTo(iconX - 14, iconY - 2); ctx.lineTo(iconX - 4, iconY - 2); ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();

  // Text
  ctx.textAlign = 'left';
  const titleY = y + h / 2 - 6;
  const subtitleY = y + h / 2 + 16;
  ctx.fillStyle = '#f3ead6';
  setUiFont(ctx, state, 17, '800');
  ctx.fillText(title, x + 70, titleY);
  ctx.fillStyle = '#d6c49e';
  setUiFont(ctx, state, 12, '600');
  ctx.fillText(subtitle, x + 70, subtitleY);

  ctx.restore();
}

function drawMapScreen(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, nowMs: number) {
  ctx.fillStyle = '#1a1610';
  ctx.fillRect(0, 0, W, H);
  const parchment = ctx.createLinearGradient(0, 0, W, H);
  parchment.addColorStop(0, '#3a3329');
  parchment.addColorStop(1, '#2a241c');
  ctx.fillStyle = parchment;
  const inset = 30;
  roundRect(ctx, inset, inset, W - inset * 2, H - inset * 2, 18);
  ctx.fill();

  // Rune nodes
  const nodeCount = state.totalLevels;
  for (let i = 0; i < nodeCount; i++) {
    const x = inset + 80 + (i % 6) * ((W - inset * 2 - 120) / 5);
    const y = inset + 120 + Math.floor(i / 6) * 90;
    const unlocked = i <= state.furthestLevel;
    const isBoss = i === nodeCount - 1 && state.bossDefeated;
    ctx.save();
    ctx.globalAlpha = unlocked ? 1 : 0.3;
    const glow = ctx.createRadialGradient(x, y, 4, x, y, 28);
    glow.addColorStop(0, isBoss ? '#ffd06a' : unlocked ? '#cbe7ff' : '#111');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y, 28, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = isBoss ? '#ffd06a' : unlocked ? '#9ae6de' : '#555';
    ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
    setUiFont(ctx, state, 12, '700');
    ctx.fillStyle = '#f3ead6';
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), x, y + 4);
    ctx.restore();
  }

  // Fog of war
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = 'rgba(8,8,12,0.7)';
  ctx.beginPath(); ctx.rect(inset, inset, W - inset * 2, H - inset * 2); ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i <= state.furthestLevel; i++) {
    const x = inset + 80 + (i % 6) * ((W - inset * 2 - 120) / 5);
    const y = inset + 120 + Math.floor(i / 6) * 90;
    ctx.beginPath(); ctx.arc(x, y, 34 + Math.sin(nowMs * 0.002 + i) * 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawSkillTreeScreen(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, nowMs: number) {
  ctx.fillStyle = '#0f0e12';
  ctx.fillRect(0, 0, W, H);
  drawStoneHudPanel(ctx, 20, 20, W - 40, H - 40, '#9ae6de');

  const centerX = W / 2;
  const centerY = H / 2;
  const pulse = 0.9 + 0.1 * Math.sin(nowMs * 0.003);
  ctx.fillStyle = '#1c191f';
  ctx.beginPath(); ctx.arc(centerX, centerY, 48 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#d8c6a3';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(centerX, centerY, 50, 0, Math.PI * 2); ctx.stroke();

  const branches: Array<{ angle: number; color: string; label: string }> = [
    { angle: -Math.PI / 2, color: '#ff6b2d', label: 'FIRE TRAIL' },
    { angle: 0, color: '#5fc4ff', label: 'CHAIN LIGHT' },
    { angle: Math.PI / 2, color: '#9c7a4d', label: 'STONE SKIN' },
    { angle: Math.PI, color: '#d8f1ff', label: 'WATER SLIDE' },
  ];

  branches.forEach((b) => {
    const endX = centerX + Math.cos(b.angle) * 200;
    const endY = centerY + Math.sin(b.angle) * 200;
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(centerX, centerY); ctx.lineTo(endX, endY); ctx.stroke();
    ctx.fillStyle = b.color;
    ctx.beginPath(); ctx.arc(endX, endY, 24, 0, Math.PI * 2); ctx.fill();
    setUiFont(ctx, state, 14, '800');
    ctx.fillStyle = '#f3ead6';
    ctx.textAlign = 'center';
    ctx.fillText(b.label, endX, endY + 38);
  });

  setUiFont(ctx, state, 18, '800');
  ctx.fillStyle = '#f3ead6';
  ctx.textAlign = 'center';
  ctx.fillText(`CRYSTAL SHARDS: ${state.gemsCurrency}`, centerX, 60);
  ctx.fillText('Tap nodes to unlock sub-abilities (visual only placeholder)', centerX, 90);
}

function drawEndingScroll(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number) {
  ctx.fillStyle = '#0c0a0f';
  ctx.fillRect(0, 0, W, H);
  const parchment = ctx.createLinearGradient(0, 0, W, H);
  parchment.addColorStop(0, '#3b3126');
  parchment.addColorStop(1, '#2a241c');
  const inset = 50;
  ctx.fillStyle = parchment;
  roundRect(ctx, inset, inset, W - inset * 2, H - inset * 2, 24);
  ctx.fill();
  ctx.strokeStyle = 'rgba(214,184,126,0.6)';
  ctx.lineWidth = 4;
  roundRect(ctx, inset, inset, W - inset * 2, H - inset * 2, 24);
  ctx.stroke();

  setDisplayFont(ctx, state, 42, '900');
  ctx.fillStyle = '#f3ead6';
  ctx.textAlign = 'center';
  ctx.fillText('ENDING SCROLL', W / 2, inset + 80);

  const logo = assetLoader.getAsset('logo');
  if (logo?.complete && logo.naturalWidth > 0) {
    const lw = Math.min(logo.naturalWidth, W * 0.5);
    const lh = (logo.naturalHeight / logo.naturalWidth) * lw;
    ctx.drawImage(logo, W / 2 - lw / 2, inset + 90, lw, lh);
  }

  setUiFont(ctx, state, 20, '800');
  ctx.fillText(`Total Gems Collected: ${state.totalGemsEver}`, W / 2, inset + 140);
  ctx.fillText(`Enemies Vanquished: ${state.enemiesDefeated}`, W / 2, inset + 180);

  const title = state.favoriteElement === 'fire' ? 'THE PYROMANCER'
    : state.favoriteElement === 'water' ? 'THE TIDEWALKER'
    : state.favoriteElement === 'earth' ? 'THE EARTH-SHAKER'
    : state.favoriteElement === 'wind' ? 'THE STORMDANCER'
    : 'THE WANDERER';
  setDisplayFont(ctx, state, 32, '800');
  ctx.fillText(title, W / 2, inset + 240);

  const btnW = 220;
  const btnH = 56;
  const btnX = W / 2 - btnW / 2;
  const btnY = H - inset - btnH - 30;
  drawStoneHudPanel(ctx, btnX, btnY, btnW, btnH, '#ffd06a');
  setUiFont(ctx, state, 18, '800');
  ctx.fillStyle = '#0f0c10';
  ctx.fillText('CONTINUE', W / 2, btnY + 35);

  // Mark continue zone
  state.continueButton = { x: btnX, y: btnY, w: btnW, h: btnH };
}

function drawScreenTransitionOverlay(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number) {
  const transition = state.screenTransition;
  if (!transition?.active) return;
  const progress = Math.min(1, transition.timer / transition.duration);
  const alpha = transition.phase === 'out' ? progress : 1 - progress;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#050408';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

export function drawUIRenderer(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  W: number,
  H: number,
  nowMs: number,
  isMobile: boolean,
  isPortraitMobile: boolean,
  compactMobileLayout: boolean,
) {
  let isPlaying = false;
  switch (state.screen) {
    case 'map':
      drawMapScreen(ctx, state, W, H, nowMs);
      break;
    case 'skillTree':
      drawSkillTreeScreen(ctx, state, W, H, nowMs);
      break;
    case 'victory':
      drawEndingScroll(ctx, state, W, H);
      break;
    case 'menu':
      drawMenuScreen(ctx, state, W, H, nowMs, isMobile, compactMobileLayout);
      break;
    case 'survivalDifficulty':
      drawSurvivalDifficultyScreen(ctx, state, W, H, isMobile, compactMobileLayout);
      break;
    case 'challenges':
      drawChallengesScreen(ctx, state, W, H, nowMs, isMobile, compactMobileLayout);
      break;
    case 'levelSelect':
      drawLevelSelectScreen(ctx, state, W, H, isMobile, compactMobileLayout);
      break;
    case 'levelComplete':
      drawLevelCompleteScreen(ctx, state, W, H, isMobile);
      break;
    case 'gameOver':
      drawGameOverScreen(ctx, state, W, H, isMobile);
      break;
    case 'shop':
      drawShopScreen(ctx, state, W, H, compactMobileLayout);
      break;
    case 'settings':
      drawSettingsScreen(ctx, state, W, H);
      break;
    case 'relicSelection':
      drawRelicSelectionScreen(ctx, state, W, H, isMobile);
      break;
    case 'playing':
      isPlaying = true;
      break;
  }

  if (isPlaying) {
    drawHUD(ctx, state, W, nowMs, isPortraitMobile);

    if (state.activeDialog.length > 0) {
      drawDialogSystem(ctx, state, W, H, nowMs, isPortraitMobile);
    }

    if (state.paused) {
      drawPauseOverlay(ctx, state, W, H, isMobile);
    }

    if (state.showLevelIntro) {
      drawLevelIntro(ctx, state, W, H);
    }
  }

  drawScreenTransitionOverlay(ctx, state, W, H);
}

function drawScreenHeading(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  title: string,
  subtitle: string,
  W: number,
  topY: number,
) {
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  setDisplayFont(ctx, state, 48, '800');
  ctx.fillText(title, W / 2, topY);
  ctx.fillStyle = UI_THEME.muted;
  setUiFont(ctx, state, 16, '600');
  ctx.fillText(subtitle, W / 2, topY + 34);
}

function drawPrimaryButton(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  accent: string,
  selected = false,
) {
  drawPanel(ctx, state, x, y, w, h, 12, accent, selected ? 1 : 0.86);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  setUiFont(ctx, state, Math.max(14, Math.min(22, h * 0.28)), '800');
  ctx.fillText(label, x + w / 2, y + h / 2 + 7);
}

function drawTopRightSettingsHotspot(ctx: CanvasRenderingContext2D, state: GameState, W: number) {
  const x = W - 62;
  const y = 18;
  drawPanel(ctx, state, x, y, 44, 44, 10, '#86d5ff', 0.92);
  ctx.strokeStyle = '#e8f6ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + 22, y + 22, 8, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6;
    const sx = x + 22 + Math.cos(angle) * 10;
    const sy = y + 22 + Math.sin(angle) * 10;
    const ex = x + 22 + Math.cos(angle) * 14;
    const ey = y + 22 + Math.sin(angle) * 14;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }
}

function drawMenuScreen(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  W: number,
  H: number,
  nowMs: number,
  isMobile: boolean,
  compactMobileLayout: boolean,
) {
  const parallax = state.menuParallax ?? { x: 0, y: 0 };
  const bgOffsetX = parallax.x * 18;
  const bgOffsetY = parallax.y * 12;

  // Cinematic ruins night sky with eclipse (parallaxed)
  ctx.save();
  ctx.translate(bgOffsetX, bgOffsetY);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#0a0b12');
  sky.addColorStop(0.5, '#0f1220');
  sky.addColorStop(1, '#0c0d16');
  ctx.fillStyle = sky;
  ctx.fillRect(-60, -60, W + 120, H + 120);

  const eclipseX = W * 0.5;
  const eclipseY = 120;
  const corona = ctx.createRadialGradient(eclipseX, eclipseY, 20, eclipseX, eclipseY, 180);
  corona.addColorStop(0, 'rgba(255, 160, 80, 0.22)');
  corona.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = corona;
  ctx.fillRect(-60, -60, W + 120, H + 120);

  // Subtle starfield background (fewer particles for better performance)
  ctx.save();
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 40; i++) {
    const x = ((i * 89 + nowMs * 0.02) % (W + 120)) - 60;
    const y = ((i * 61 + nowMs * 0.015) % (H + 100)) - 50;
    const size = 1 + (i % 2);
    ctx.fillStyle = i % 4 === 0 ? 'rgba(255,255,255,0.35)' : 'rgba(150,200,255,0.22)';
    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  ctx.restore();

  const titleY = 60;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  setDisplayFont(ctx, state, 40, '900');
  ctx.fillText('ELEMENTAL', W / 2, titleY);
  setDisplayFont(ctx, state, 34, '800');
  ctx.fillText('STICKMAN', W / 2, titleY + 42);

  const statsH = 52;
  const statsY = titleY + 62;
  const statsW = Math.min(W - 60, 720);
  const statsX = W / 2 - statsW / 2;
  drawStoneHudPanel(ctx, statsX, statsY, statsW, statsH, '#ffd06a');
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f3ead6';
  setUiFont(ctx, state, 14, '800');
  const statsCol = statsW / 3;
  const baseY = statsY + 34;
  ctx.fillText(`BEST: ${state.highScore}`, statsX + statsCol * 0.5, baseY);
  ctx.fillText(`FURTHEST: ${Math.max(1, state.furthestLevel + 1)} / ${state.totalLevels}`, statsX + statsCol * 2.5, baseY);

  const upg = state.upgrades;
  const upgradeLevels = [
    upg.healthLevel, upg.manaLevel, upg.regenLevel,
    upg.damageLevel, upg.doubleJumpLevel, upg.dashDistanceLevel,
  ];
  const upgradeCosts = [
    (upg.healthLevel + 1) * 30,
    (upg.manaLevel + 1) * 30,
    (upg.regenLevel + 1) * 50,
    (upg.damageLevel + 1) * 60,
    (upg.doubleJumpLevel + 1) * 100,
    (upg.dashDistanceLevel + 1) * 80,
  ];
  const canAffordUpgrade = upgradeCosts.some((cost, idx) => upgradeLevels[idx] < 5 && state.gemsCurrency >= cost);
  const pulsePhase = (nowMs % 5000) / 5000;
  const pulse = canAffordUpgrade ? Math.max(0, Math.sin(pulsePhase * Math.PI * 2)) : 0;
  const gemIconX = statsX + statsCol * 1.5 - 22;
  const gemIconY = baseY - 6;

  ctx.save();
  ctx.translate(gemIconX, gemIconY);
  const gemScale = 1 + pulse * 0.18;
  ctx.scale(gemScale, gemScale);
  ctx.shadowColor = `rgba(255, 214, 120, ${0.25 + pulse * 0.5})`;
  ctx.shadowBlur = 10 + pulse * 8;
  ctx.fillStyle = '#7bd3ff';
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(6, 0);
  ctx.lineTo(0, 7);
  ctx.lineTo(-6, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  ctx.fillText(`GEMS: ${state.gemsCurrency}`, statsX + statsCol * 1.5 + 10, baseY);

  const logo = assetLoader.getAsset('logo');
  const logoMaxH = H * 0.25;
  const logoMaxW = Math.min(W * 0.7, 720);
  let logoH = Math.min(logoMaxH, 160);
  const logoY = statsY + statsH + 18;
  if (logo?.complete && logo.naturalWidth > 0) {
    const scale = Math.min(logoMaxW / logo.naturalWidth, logoMaxH / logo.naturalHeight);
    const lw = logo.naturalWidth * scale;
    logoH = logo.naturalHeight * scale;
    ctx.drawImage(logo, W / 2 - lw / 2, logoY, lw, logoH);
  }

  const diffConfig = DIFFICULTY_SETTINGS[state.difficulty];
  const toggleW = Math.min(280, W - 80);
  const toggleH = 52;
  const toggleX = W / 2 - toggleW / 2;
  const toggleY = logoY + logoH + 12;
  ctx.save();
  const toggleStone = ctx.createLinearGradient(toggleX, toggleY, toggleX, toggleY + toggleH);
  toggleStone.addColorStop(0, '#2b2621');
  toggleStone.addColorStop(1, '#161311');
  ctx.fillStyle = toggleStone;
  roundRect(ctx, toggleX, toggleY, toggleW, toggleH, 18);
  ctx.fill();
  const bronze = ctx.createLinearGradient(toggleX, toggleY, toggleX, toggleY + toggleH);
  bronze.addColorStop(0, '#7c5a2e');
  bronze.addColorStop(1, '#c59852');
  ctx.strokeStyle = bronze;
  ctx.lineWidth = 3;
  roundRect(ctx, toggleX, toggleY, toggleW, toggleH, 18);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 214, 120, 0.35)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, toggleX + 5, toggleY + 5, toggleW - 10, toggleH - 10, 14);
  ctx.stroke();
  ctx.fillStyle = '#ffd36a'; ctx.beginPath(); ctx.arc(toggleX + 20, toggleY + toggleH / 2, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#9ae6de'; ctx.beginPath(); ctx.arc(toggleX + toggleW - 20, toggleY + toggleH / 2, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f3ead6';
  setUiFont(ctx, state, 16, '800');
  ctx.textAlign = 'center';
  ctx.fillText(`DIFFICULTY: ${diffConfig.label.toUpperCase()}`, toggleX + toggleW / 2, toggleY + 33);
  ctx.restore();

  const isMobileLayout = compactMobileLayout;
  const cardW = isMobileLayout ? W - 60 : 280;
  const cardH = isMobileLayout ? 85 : 120;
  const gapX = isMobileLayout ? 0 : 24;
  const gapY = 15;
  const cols = isMobileLayout ? 1 : 2;
  const startX = W / 2 - (cols * cardW + (cols - 1) * gapX) / 2;
  const startY = toggleY + toggleH + (isMobileLayout ? 22 : 28);
  const menuCards = [
    { title: tr(state, 'menu_campaign'), subtitle: tr(state, 'menu_campaign_subtitle'), color: ELEMENT_COLORS.fire, icon: 'map', active: state.selectedMenuButton === 0 },
    { title: tr(state, 'menu_wave'), subtitle: tr(state, 'menu_wave_subtitle'), color: ELEMENT_COLORS.wind, icon: 'swords', active: state.selectedMenuButton === 1 },
    { title: tr(state, 'menu_shop'), subtitle: tr(state, 'shop_currency', { gems: state.gemsCurrency }), color: ELEMENT_COLORS.earth, icon: 'bag', active: false },
    { title: 'DAILY CHALLENGES', subtitle: 'Claim rewards and track progression', color: '#9ae6de', icon: 'star', active: false },
  ];

  const drawCardAt = (card: typeof menuCards[number], index: number) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = startX + col * (cardW + gapX);
    const y = startY + row * (cardH + gapY);
    drawMenuCard(ctx, state, {
      x, y, w: cardW, h: cardH,
      title: card.title,
      subtitle: card.subtitle,
      glowColor: card.color,
      icon: card.icon,
      elementColor: card.color,
      active: card.active,
    });
  };
  menuCards.forEach((card, index) => { if (!card.active) drawCardAt(card, index); });
  menuCards.forEach((card, index) => { if (card.active) drawCardAt(card, index); });

  drawPanel(ctx, state, 24, H - 92, W - 48, 56, 14, '#7bd3ff', 0.78);
  ctx.fillStyle = '#dff4ff';
  ctx.textAlign = 'center';
  setUiFont(ctx, state, isMobile ? 11 : 13, '700');
  ctx.fillText(
    isMobile ? tr(state, 'menu_controls_mobile') : tr(state, 'menu_controls_desktop'),
    W / 2,
    H - 57,
  );

  const leaderboard = getLeaderboard(3);
  const lbStatus = getLeaderboardStatus();
  const snapshot = getProgressionSnapshot(state);
  const sidebarW = isMobileLayout ? W - 60 : 250;
  const sidebarX = isMobileLayout ? 30 : W - sidebarW - 30;
  const sidebarY = isMobileLayout ? startY + cardH * 2 + gapY * 2 + 8 : 84;
  const daily = snapshot.dailies[0];

  if (sidebarY + 180 < H - 110) {
    drawPanel(ctx, state, sidebarX, sidebarY, sidebarW, 172, 16, '#7bd3ff', 0.84);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    setUiFont(ctx, state, 16, '800');
    ctx.fillText(tr(state, 'menu_leaderboard_title'), sidebarX + 18, sidebarY + 28);

    if (leaderboard.length === 0) {
      ctx.fillStyle = UI_THEME.muted;
      setUiFont(ctx, state, 13, '600');
      ctx.fillText(tr(state, 'menu_leaderboard_empty'), sidebarX + 18, sidebarY + 56);
    } else {
      leaderboard.forEach((entry, index) => {
        ctx.fillStyle = '#dff4ff';
        setUiFont(ctx, state, 13, '700');
        ctx.fillText(
          tr(state, 'menu_leaderboard_row', {
            rank: index + 1,
            player: entry.accountId.slice(0, 6),
            score: entry.score,
          }),
          sidebarX + 18,
          sidebarY + 56 + index * 26,
        );
      });
    }

    ctx.fillStyle = UI_THEME.muted;
    setUiFont(ctx, state, 12, '600');
    ctx.fillText(
      tr(state, 'menu_sync_status', {
        queue: lbStatus.pendingSubmissions,
        remote: lbStatus.remoteEnabled ? 'online' : 'local',
      }),
      sidebarX + 18,
      sidebarY + 146,
    );
  }

  drawPanel(ctx, state, 30, 84, isMobileLayout ? W - 60 : 320, 92, 14, '#62eeb8', 0.8);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  setUiFont(ctx, state, 15, '700');
  ctx.fillText(
    tr(state, 'menu_stats', {
      best: state.highScore,
      gems: state.gemsCurrency,
      level: state.furthestLevel + 1,
    }),
    48,
    118,
  );
  ctx.fillStyle = UI_THEME.muted;
  setUiFont(ctx, state, 13, '600');
  ctx.fillText(
    daily
      ? `${tr(state, 'menu_daily_title')}: ${daily.title} (${daily.current}/${daily.target})`
      : tr(state, 'menu_achievements_progress', {
          unlocked: snapshot.achievementsUnlocked.length,
          total: snapshot.totalAchievements,
        }),
    48,
    148,
  );

  drawTopRightSettingsHotspot(ctx, state, W);
}

function drawSurvivalDifficultyScreen(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  W: number,
  H: number,
  isMobile: boolean,
  compactMobileLayout: boolean,
) {
  drawBackdrop(ctx, state, W, H, ['#080d1f', '#102545', '#140f2c']);
  drawScreenHeading(ctx, state, 'SURVIVAL MODE', 'Choose the challenge level for endless waves', W, 92);
 
  const diffs: Difficulty[] = ['easy', 'normal', 'hard', 'insane'];
  const isMobileLayout = compactMobileLayout;
  const cardW = isMobileLayout ? W / 2 - 30 : 220;
  const cardH = isMobileLayout ? 260 : 300;
  const gap = 20;
  const cols = isMobileLayout ? 2 : 4;
  const startX = W / 2 - (cols * cardW + (cols - 1) * gap) / 2;
  const startY = isMobileLayout ? 160 : 200;

  diffs.forEach((diff, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = startX + col * (cardW + gap);
    const y = startY + row * (cardH + gap);
    const config = DIFFICULTY_SETTINGS[diff];
    const selected = state.difficulty === diff;

    drawPanel(ctx, state, x, y, cardW, cardH, 16, config.color, selected ? 1 : 0.88);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    setDisplayFont(ctx, state, isMobileLayout ? 24 : 28, '800');
    ctx.fillText(config.label.toUpperCase(), x + cardW / 2, y + 44);

    ctx.fillStyle = config.color;
    setUiFont(ctx, state, 14, '800');
    ctx.fillText(`${Math.round(config.enemyDamageMult * 100)}% ENEMY DAMAGE`, x + cardW / 2, y + 80);

    ctx.fillStyle = UI_THEME.paper;
    setUiFont(ctx, state, 13, '600');
    const lines = [
      `HP ${config.playerHealth}`,
      `MP ${config.playerMana}`,
      `Enemy speed ${config.enemySpeedMult.toFixed(1)}x`,
      `Mana regen ${config.manaRegenRate.toFixed(2)}`,
    ];
    lines.forEach((line, lineIndex) => {
      ctx.fillText(line, x + cardW / 2, y + 126 + lineIndex * 28);
    });

    drawPrimaryButton(
      ctx,
      state,
      x + 20,
      y + cardH - 70,
      cardW - 40,
      46,
      isMobile ? 'TAP TO START' : 'START RUN',
      config.color,
      selected,
    );
  });

  drawPrimaryButton(ctx, state, W / 2 - 100, H - 80, 200, 50, 'BACK', '#ff7688');
}

function drawChallengesScreen(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  W: number,
  H: number,
  nowMs: number,
  _isMobile: boolean,
  compactMobileLayout: boolean,
) {
  drawBackdrop(ctx, state, W, H, ['#0a1020', '#14294d', '#0e1430']);
  drawScreenHeading(ctx, state, 'DAILY CHALLENGES', 'Complete missions and claim reward gems', W, 88);

  const snapshot = getProgressionSnapshot(state);
  drawPanel(ctx, state, W / 2 - 220, 110, 440, 44, 12, '#ffd37f', 0.85);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  setUiFont(ctx, state, 14, '700');
  ctx.fillText(
    `${snapshot.achievementsUnlocked.length}/${snapshot.totalAchievements} achievements  |  milestone ${snapshot.milestoneProgress}/${snapshot.milestoneTarget}`,
    W / 2,
    139,
  );

  const isMobileLayout = compactMobileLayout;
  const startY = 180;
  const cardW = isMobileLayout ? W - 40 : 600;
  const cardH = 100;
  const gap = 20;
  const claimPulse = 0.82 + Math.sin(nowMs * 0.006) * 0.08;

  snapshot.dailies.forEach((daily, index) => {
    const y = startY + index * (cardH + gap);
    drawPanel(ctx, state, W / 2 - cardW / 2, y, cardW, cardH, 14, daily.completed ? '#62eeb8' : '#7bd3ff', 0.9);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    setUiFont(ctx, state, 18, '800');
    ctx.fillText(daily.title.toUpperCase(), W / 2 - cardW / 2 + 24, y + 34);

    ctx.fillStyle = UI_THEME.muted;
    setUiFont(ctx, state, 13, '600');
    ctx.fillText(`${daily.current} / ${daily.target}   Reward: ${daily.rewardAmount} gems`, W / 2 - cardW / 2 + 24, y + 62);

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, W / 2 - cardW / 2 + 24, y + 74, cardW - 170, 10, 5);
    ctx.fill();
    ctx.fillStyle = daily.completed ? '#62eeb8' : '#53b8ff';
    roundRect(ctx, W / 2 - cardW / 2 + 24, y + 74, (cardW - 170) * daily.progress, 10, 5);
    ctx.fill();

    const cbW = 100;
    const cbH = 40;
    const cbX = W / 2 + cardW / 2 - cbW - 20;
    const cbY = y + 30;
    const buttonAccent = daily.claimed ? '#8aa2c6' : daily.completed ? '#ffd37f' : '#7a8aa6';
    drawPanel(ctx, state, cbX, cbY, cbW, cbH, 10, buttonAccent, daily.completed && !daily.claimed ? claimPulse : 0.84);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    setUiFont(ctx, state, 13, '800');
    ctx.fillText(daily.claimed ? 'CLAIMED' : daily.completed ? 'CLAIM' : 'LOCKED', cbX + cbW / 2, cbY + 26);
  });

  drawPrimaryButton(ctx, state, W / 2 - 100, H - 80, 200, 50, 'BACK', '#ff7688');
}

function drawLevelSelectScreen(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  W: number,
  H: number,
  isMobile: boolean,
  compactMobileLayout: boolean,
) {
  drawBackdrop(ctx, state, W, H, ['#050914', '#0d1833', '#091120']);
  drawScreenHeading(ctx, state, tr(state, 'level_select_title'), 'Select a campaign level', W, 86);

  const cardW = compactMobileLayout ? Math.floor((W - 72) / 3) : 194;
  const cardH = compactMobileLayout ? 110 : 130;
  const gap = compactMobileLayout ? 12 : 16;
  const cols = compactMobileLayout ? 3 : 5;
  const startX = W / 2 - (cols * cardW + (cols - 1) * gap) / 2;
  const startY = compactMobileLayout ? 118 : 140;

  for (let index = 0; index < TOTAL_LEVELS; index++) {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = startX + col * (cardW + gap);
    const y = startY + row * (cardH + gap);
    const unlocked = index <= state.furthestLevel;
    const selected = index === state.levelSelectionIndex;
    const bestTime = state.bestTimes[index];

    drawPanel(ctx, state, x, y, cardW, cardH, 14, unlocked ? (selected ? '#62eeb8' : '#7bd3ff') : '#555a70', unlocked ? 0.94 : 0.55);
    ctx.textAlign = 'center';
    ctx.fillStyle = unlocked ? '#ffffff' : 'rgba(255,255,255,0.5)';
    setDisplayFont(ctx, state, 30, '900');
    ctx.fillText(`L${index + 1}`, x + cardW / 2, y + 42);

    ctx.fillStyle = unlocked ? UI_THEME.paper : UI_THEME.muted;
    setUiFont(ctx, state, 13, '700');
    ctx.fillText(state.levelSelectionIndex === index && unlocked ? 'READY' : unlocked ? 'UNLOCKED' : tr(state, 'level_select_locked'), x + cardW / 2, y + 70);

    ctx.fillStyle = UI_THEME.muted;
    setUiFont(ctx, state, 12, '600');
    ctx.fillText(
      bestTime ? tr(state, 'level_select_best', { time: formatFramesAsTime(bestTime) }) : tr(state, 'level_select_none'),
      x + cardW / 2,
      y + 96,
    );
  }

  ctx.fillStyle = UI_THEME.muted;
  ctx.textAlign = 'center';
  setUiFont(ctx, state, 14, '600');
  ctx.fillText(
    isMobile ? tr(state, 'level_select_tap_start') : tr(state, 'level_select_click_start'),
    W / 2,
    H - 104,
  );

  drawPrimaryButton(ctx, state, W / 2 - 100, H - 80, 200, 50, 'BACK', '#ff7688');
}

function drawLevelCompleteScreen(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, isMobile: boolean) {
  drawBackdrop(ctx, state, W, H, ['#07131c', '#123542', '#0b1824']);
  drawScreenHeading(ctx, state, tr(state, 'level_complete_title'), state.levelSubtitle || state.levelName, W, 120);

  drawPanel(ctx, state, W / 2 - 250, 190, 500, 240, 18, '#62eeb8', 0.92);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  setDisplayFont(ctx, state, 30, '800');
  ctx.fillText(
    tr(state, 'level_complete_level_name', { level: state.currentLevel + 1, name: state.levelName.toUpperCase() }),
    W / 2,
    240,
  );

  const lines = [
    tr(state, 'level_complete_gems', { collected: state.gemsCollected, total: state.totalGems }),
    tr(state, 'level_complete_enemies', { count: state.enemiesDefeated }),
    tr(state, 'level_complete_score', { score: state.score }),
  ];

  ctx.fillStyle = UI_THEME.paper;
  setUiFont(ctx, state, 18, '700');
  lines.forEach((line, index) => {
    ctx.fillText(line, W / 2, 292 + index * 34);
  });

  if (state.gemsCollected >= state.totalGems && state.totalGems > 0) {
    ctx.fillStyle = '#ffd37f';
    setUiFont(ctx, state, 18, '800');
    ctx.fillText(tr(state, 'level_complete_all_gems_bonus'), W / 2, 394);
  }

  ctx.fillStyle = '#dff4ff';
  setUiFont(ctx, state, 16, '700');
  ctx.fillText(
    state.currentLevel + 1 >= TOTAL_LEVELS
      ? (isMobile ? tr(state, 'level_complete_tap_victory') : tr(state, 'level_complete_click_victory'))
      : (isMobile ? tr(state, 'level_complete_tap_next') : tr(state, 'level_complete_click_next')),
    W / 2,
    474,
  );
}

function drawGameOverScreen(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, isMobile: boolean) {
  drawBackdrop(ctx, state, W, H, ['#13040a', '#2f0d18', '#11060b']);
  const endless = state.endlessWave !== undefined;
  drawScreenHeading(
    ctx,
    state,
    endless ? tr(state, 'game_over_wave') : tr(state, 'game_over_title'),
    state.deathType === 'fall' ? tr(state, 'game_over_cause_fall') : tr(state, 'game_over_cause_health'),
    W,
    120,
  );

  drawPanel(ctx, state, W / 2 - 260, 190, 520, 210, 18, '#ff7688', 0.92);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  setUiFont(ctx, state, 20, '800');
  ctx.fillText(tr(state, 'game_over_final_score', { score: state.score }), W / 2, 246);
  ctx.fillText(tr(state, 'game_over_best_score', { score: state.highScore }), W / 2, 284);
  ctx.fillText(tr(state, 'game_over_total_kills', { kills: state.enemiesDefeated }), W / 2, 322);
  ctx.fillText(
    endless
      ? tr(state, 'game_over_survived_wave', { wave: state.endlessWave ?? 0 })
      : tr(state, 'game_over_reached_level', { level: state.currentLevel + 1, name: state.levelName }),
    W / 2,
    360,
  );

  if (isMobile) {
    const btnW = 194;
    const btnH = 56;
    const gap = 30;
    const retryX = W / 2 - btnW - gap / 2;
    const quitX = W / 2 + gap / 2;
    const baseY = H / 2 + 85;
    drawPrimaryButton(ctx, state, retryX, baseY, btnW, btnH, tr(state, 'game_over_mobile_retry'), '#62eeb8');
    drawPrimaryButton(ctx, state, quitX, baseY, btnW, btnH, tr(state, 'game_over_mobile_quit'), '#ff7688');
  } else {
    ctx.fillStyle = UI_THEME.paper;
    setUiFont(ctx, state, 16, '700');
    ctx.fillText(tr(state, 'game_over_retry'), W / 2, 462);
    ctx.fillText(tr(state, 'game_over_quit'), W / 2, 492);
  }
}

function _drawVictoryScreen(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, isMobile: boolean) {
  drawBackdrop(ctx, state, W, H, ['#08181a', '#143642', '#091418']);
  drawScreenHeading(ctx, state, tr(state, 'victory_title'), tr(state, 'victory_subtitle'), W, 118);

  drawPanel(ctx, state, W / 2 - 240, 194, 480, 188, 18, '#62eeb8', 0.92);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  setUiFont(ctx, state, 20, '800');
  ctx.fillText(tr(state, 'victory_final_score', { score: state.score }), W / 2, 244);
  ctx.fillText(tr(state, 'victory_total_gems', { gems: state.totalGemsEver }), W / 2, 286);
  ctx.fillText(tr(state, 'victory_enemies', { count: state.enemiesDefeated }), W / 2, 328);

  if (isMobile) {
    drawPrimaryButton(ctx, state, W / 2 - 110, 436, 220, 56, 'PLAY AGAIN', '#62eeb8');
  } else {
    ctx.fillStyle = UI_THEME.paper;
    setUiFont(ctx, state, 16, '700');
    ctx.fillText(tr(state, 'victory_click_again'), W / 2, 454);
  }
}

function drawHUD(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  W: number,
  nowMs: number,
  isPortraitMobile: boolean,
) {
  const s = state.stickman;

  if (isPortraitMobile) {
    const leftW = 236;
    const rightW = 190;
    drawStoneHudPanel(ctx, 10, 10, leftW, 104);
    drawStoneHudPanel(ctx, W - rightW - 10, 10, rightW, 104);

    ctx.fillStyle = '#e8dfcf';
    setUiFont(ctx, state, 12, '800');
    ctx.textAlign = 'left';
    ctx.fillText(tr(state, 'hud_level', { level: state.currentLevel + 1, name: (state.levelName || '').toUpperCase() }), 20, 30);

    const healthRatio = Math.max(0, s.health / Math.max(1, s.maxHealth));
    const manaRatio = Math.max(0, s.mana / Math.max(1, s.maxMana));

    drawTexturedBar(ctx, 20, 40, leftW - 24, 14, healthRatio, 'fire', nowMs, { lowHealth: healthRatio < 0.25 });
    drawTexturedBar(ctx, 20, 62, leftW - 24, 12, manaRatio, 'wind', nowMs);

    ctx.fillStyle = '#f3ead6';
    setDisplayFont(ctx, state, 22, '800');
    ctx.textAlign = 'right';
    ctx.fillText(String(state.score), W - 20, 42);

    drawGemIcon(ctx, state, W - 165, 78, 8, nowMs);
    setUiFont(ctx, state, 16, '700');
    ctx.textAlign = 'left';
    ctx.fillText(String(state.gemsCurrency), W - 150, 83);
  } else {
    const hudW = 320;
    const hudX = 20;
    const hudY = 20;
    drawStoneHudPanel(ctx, hudX, hudY, hudW, 112, ELEMENT_COLORS[state.selectedElement]);

    ctx.fillStyle = '#e8dfcf';
    setUiFont(ctx, state, 14, '800');
    ctx.textAlign = 'left';
    ctx.fillText(tr(state, 'hud_level', { level: state.currentLevel + 1, name: (state.levelName || '').toUpperCase() }), hudX + 18, hudY + 32);

    const healthRatio = Math.max(0, s.health / Math.max(1, s.maxHealth));
    drawTexturedBar(ctx, hudX + 18, hudY + 46, hudW - 36, 18, healthRatio, 'fire', nowMs, { lowHealth: healthRatio < 0.25 });

    const manaRatio = Math.max(0, s.mana / Math.max(1, s.maxMana));
    drawTexturedBar(ctx, hudX + 18, hudY + 76, hudW - 36, 14, manaRatio, 'wind', nowMs);

    ctx.fillStyle = '#f6ebd8';
    setDisplayFont(ctx, state, 32, '900');
    ctx.textAlign = 'right';
    ctx.fillText(String(state.score), W - 30, 58);

    drawGemIcon(ctx, state, W - 120, 98, 10, nowMs);
    setUiFont(ctx, state, 20, '800');
    ctx.textAlign = 'left';
    ctx.fillText(String(state.gemsCurrency), W - 100, 104);
  }
}

function drawShopScreen(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, compactMobileLayout: boolean) {
  drawBackdrop(ctx, state, W, H, ['#080d1f', '#102545', '#0f1631']);
  ctx.fillStyle = '#ffffff';
  setDisplayFont(ctx, state, 48, '800');
  ctx.textAlign = 'center';
  ctx.fillText(tr(state, 'shop_title'), W / 2, 80);

  const tabs: ShopTab[] = ['upgrades', 'skins', 'powerups', 'currency', 'special'];
  const tabW = 160;
  const tabStartX = W / 2 - (tabW * tabs.length) / 2;
  const tabY = 140;

  tabs.forEach((tab, i) => {
    const tx = tabStartX + i * tabW + tabW / 2;
    const active = state.shopTab === tab;
    drawPanel(ctx, state, tx - 70, tabY - 25, 140, 44, 8, active ? UI_THEME.accent : UI_THEME.muted, active ? 1 : 0.6);
    ctx.fillStyle = '#ffffff';
    setUiFont(ctx, state, 14, '700');
    ctx.textAlign = 'center';
    ctx.fillText(tab.toUpperCase(), tx, tabY + 4);
  });

  if (state.shopTab === 'upgrades') {
    const upg = state.upgrades;
    const items = [
      { name: tr(state, 'shop_max_health'), level: upg.healthLevel, cost: (upg.healthLevel + 1) * 30 },
      { name: tr(state, 'shop_max_mana'), level: upg.manaLevel, cost: (upg.manaLevel + 1) * 30 },
      { name: tr(state, 'shop_mana_regen'), level: upg.regenLevel, cost: (upg.regenLevel + 1) * 50 },
      { name: tr(state, 'shop_spell_damage'), level: upg.damageLevel, cost: (upg.damageLevel + 1) * 60 },
      { name: tr(state, 'shop_double_jump'), level: upg.doubleJumpLevel, cost: (upg.doubleJumpLevel + 1) * 100 },
      { name: tr(state, 'shop_dash_distance'), level: upg.dashDistanceLevel, cost: (upg.dashDistanceLevel + 1) * 80 },
    ];

    const isMobileLayout = compactMobileLayout;
    const cardW = isMobileLayout ? W - 40 : 340;
    const cardH = isMobileLayout ? 75 : 140;
    const gap = isMobileLayout ? 10 : 20;
    const cols = isMobileLayout ? 1 : 2;
    const startX = W / 2 - (cols * cardW + (cols - 1) * gap) / 2;
    const startY = isMobileLayout ? 175 : 200;

    items.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const ix = startX + col * (cardW + gap);
      const iy = startY + row * (cardH + gap);
      const selected = state.shopSelectionIndex === i;
      const isMaxed = item.level >= 5;

      drawPanel(ctx, state, ix, iy, cardW, cardH, 8, selected ? UI_THEME.accent : UI_THEME.panelBorder, selected ? 1 : 0.8);

      ctx.fillStyle = '#ffffff';
      setUiFont(ctx, state, isMobileLayout ? 16 : 20, '700');
      ctx.textAlign = 'left';
      ctx.fillText(item.name, ix + 20, iy + (isMobileLayout ? 30 : 45));

      setUiFont(ctx, state, isMobileLayout ? 12 : 14, '600');
      ctx.fillStyle = UI_THEME.muted;
      ctx.fillText(`LVL ${item.level} / 5`, ix + 20, iy + (isMobileLayout ? 55 : 75));

      ctx.textAlign = 'right';
      ctx.fillStyle = isMaxed ? '#ffd37f' : '#ffffff';
      setUiFont(ctx, state, isMobileLayout ? 14 : 18, '800');
      ctx.fillText(isMaxed ? tr(state, 'shop_maxed') : `${item.cost} G`, ix + cardW - 20, iy + (isMobileLayout ? 45 : 45));

      for (let dot = 0; dot < 5; dot++) {
        ctx.fillStyle = dot < item.level ? UI_THEME.accent : 'rgba(255,255,255,0.1)';
        ctx.beginPath();
        ctx.arc(ix + 20 + dot * 15, iy + (isMobileLayout ? 65 : 100), 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  const backY = H - 80;
  drawPanel(ctx, state, W / 2 - 100, backY, 200, 50, 12, '#ff7688');
  ctx.fillStyle = '#ffffff';
  setUiFont(ctx, state, 18, '700');
  ctx.textAlign = 'center';
  ctx.fillText(tr(state, 'shop_back'), W / 2, backY + 32);
}

function drawLevelIntro(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff';
  setDisplayFont(ctx, state, 60, '900');
  ctx.textAlign = 'center';
  ctx.fillText(tr(state, 'hud_level', { level: state.currentLevel + 1, name: (state.levelName || '').toUpperCase() }), W / 2, H / 2);
  ctx.restore();
}

function drawDialogSystem(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, nowMs: number, isPortraitMobile: boolean) {
  const dialog = state.activeDialog[0];
  if (!dialog) return;

  const panelH = isPortraitMobile ? 180 : 160;
  const panelW = isPortraitMobile ? W - 40 : Math.min(W - 80, 800);
  const panelX = W / 2 - panelW / 2;
  const panelY = H - panelH - (isPortraitMobile ? 40 : 60);

  ctx.save();
  ctx.fillStyle = 'rgba(4, 8, 16, 0.5)';
  ctx.fillRect(0, 0, W, H);
  drawPanel(ctx, state, panelX, panelY, panelW, panelH, 12, '#ffffff');

  const nameW = Math.max(140, ctx.measureText(dialog.speaker).width + 60);
  drawPanel(ctx, state, panelX + 20, panelY - 18, nameW, 36, 6, '#7ae8ff');
  ctx.fillStyle = '#102545';
  setDisplayFont(ctx, state, 18, '800');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((dialog.speaker || '').toUpperCase(), panelX + 20 + nameW / 2, panelY);

  const portraitSize = isPortraitMobile ? 80 : 100;
  const portraitX = panelX + 20;
  const portraitY = panelY + 30;
  drawPanel(ctx, state, portraitX, portraitY, portraitSize, portraitSize, 12, 'rgba(16, 37, 69, 0.85)');

  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath();
  ctx.arc(portraitX + portraitSize / 2, portraitY + portraitSize / 2, portraitSize * 0.35, 0, Math.PI * 2);
  ctx.fill();

  const textX = portraitX + portraitSize + 20;
  const textY = panelY + 40;
  const maxWidth = panelW - (portraitSize + 60);
  const textToDraw = dialog.text.substring(0, Math.floor(state.dialogCharIndex));
  // Typewriter effect is already driven by dialogCharIndex increment in engine

  ctx.fillStyle = '#e9f2ff';
  setUiFont(ctx, state, isPortraitMobile ? 14 : 18, '600');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const words = textToDraw.split(' ');
  let line = '';
  let lineY = textY;
  const lineHeight = isPortraitMobile ? 20 : 24;

  for (const word of words) {
    const testLine = `${line}${word} `;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line !== '') {
      ctx.fillText(line, textX, lineY);
      line = `${word} `;
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, textX, lineY);

  if (Math.floor(nowMs / 500) % 2 === 0) {
    ctx.fillStyle = UI_THEME.accent;
    setUiFont(ctx, state, 12, '700');
    ctx.textAlign = 'right';
    ctx.fillText(isPortraitMobile ? 'TAP TO CONTINUE' : 'PRESS ENTER TO CONTINUE', panelX + panelW - 20, panelY + panelH - 25);
  }

  ctx.restore();
}

function drawPauseOverlay(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, isMobile: boolean) {
  ctx.fillStyle = 'rgba(4, 8, 16, 0.82)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  setDisplayFont(ctx, state, 46, '800');
  ctx.fillText(tr(state, 'pause_title').toUpperCase(), W / 2, H / 2 - 110);

  const options = [
    tr(state, 'pause_resume'),
    tr(state, 'pause_restart'),
    tr(state, 'pause_quit'),
    'Settings',
  ];

  options.forEach((option, index) => {
    const optionY = H / 2 - 50 + index * 58;
    const selected = state.pauseSelection === index;
    drawPanel(ctx, state, W / 2 - 160, optionY - 18, 320, 42, 10, selected ? '#7bd3ff' : UI_THEME.panelBorder, selected ? 1 : 0.82);
    ctx.fillStyle = '#ffffff';
    setUiFont(ctx, state, 18, '700');
    ctx.fillText(option.toUpperCase(), W / 2, optionY + 9);
  });

  ctx.fillStyle = UI_THEME.muted;
  setUiFont(ctx, state, 13, '600');
  ctx.fillText(
    tr(state, 'pause_stats', {
      score: state.score,
      level: state.currentLevel + 1,
      best: state.bestTimes[state.currentLevel] ? formatFramesAsTime(state.bestTimes[state.currentLevel]) : '--:--',
      kills: state.enemiesDefeated,
    }),
    W / 2,
    H / 2 + 210,
  );
  ctx.fillText(isMobile ? tr(state, 'pause_mobile_hint') : tr(state, 'pause_desktop_hint'), W / 2, H / 2 + 238);
}

function drawRelicSelectionScreen(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, isMobile: boolean) {
  drawBackdrop(ctx, state, W, H, ['#051020', '#102040', '#0a1020']);
  ctx.fillStyle = '#ffffff';
  setDisplayFont(ctx, state, 48, '900');
  ctx.textAlign = 'center';
  ctx.fillText(tr(state, 'relic_selection_title'), W / 2, 100);
  ctx.fillStyle = UI_THEME.muted;
  setUiFont(ctx, state, 15, '600');
  ctx.fillText(tr(state, 'relic_selection_subtitle'), W / 2, 132);

  const choices = state.relicChoices || [];
  choices.forEach((relic, i) => {
    const rx = W / 2 - 350 + i * 240;
    const ry = 180;
    const selected = state.shopSelectionIndex === i;

    drawPanel(ctx, state, rx, ry, 220, 320, 15, selected ? UI_THEME.accent : UI_THEME.panelBorder, selected ? 1 : 0.85);

    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    roundRect(ctx, rx + 40, ry + 30, 140, 140, 10);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    setUiFont(ctx, state, 20, '800');
    ctx.textAlign = 'center';
    ctx.fillText(relic.name.toUpperCase(), rx + 110, ry + 200);

    ctx.fillStyle = UI_THEME.muted;
    setUiFont(ctx, state, 13, '600');
    wrapCenteredText(ctx, relic.description, rx + 110, ry + 228, 180, 18);

    const rarityColors = { common: '#8aa2c6', rare: '#53b8ff', legendary: '#aa44ff' };
    ctx.fillStyle = rarityColors[relic.rarity];
    setUiFont(ctx, state, 12, '800');
    ctx.fillText(relic.rarity.toUpperCase(), rx + 110, ry + 20);

    ctx.fillStyle = '#dff4ff';
    setUiFont(ctx, state, 12, '700');
    ctx.fillText(isMobile ? tr(state, 'relic_tap_select') : tr(state, 'relic_press_select', { key: i + 1 }), rx + 110, ry + 286);
  });
}

function drawSettingsScreen(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number) {
  drawBackdrop(ctx, state, W, H, ['#0a1020', '#152540', '#0a1020']);
  ctx.fillStyle = '#ffffff';
  setDisplayFont(ctx, state, 42, '800');
  ctx.textAlign = 'center';
  ctx.fillText('SETTINGS', W / 2, 80);

  const settings = [
    { label: 'Graphics Quality', value: state.graphicsQuality.toUpperCase() },
    { label: 'Haptic Feedback', value: state.hapticsEnabled ? 'ENABLED' : 'DISABLED' },
    { label: 'Reduced Motion', value: state.reducedMotion ? 'ON' : 'OFF' },
    { label: 'High Contrast', value: state.highContrast ? 'ON' : 'OFF' },
    { label: 'Aim to Shoot', value: state.aimToShoot ? 'ON' : 'OFF' },
  ];

  settings.forEach((entry, i) => {
    const sy = 160 + i * 70;
    const selected = state.shopSelectionIndex === i;
    drawPanel(ctx, state, W / 2 - 250, sy - 30, 500, 60, 8, selected ? UI_THEME.accent : UI_THEME.panelBorder, selected ? 1 : 0.8);

    ctx.fillStyle = '#ffffff';
    setUiFont(ctx, state, 18, '700');
    ctx.textAlign = 'left';
    ctx.fillText(entry.label, W / 2 - 220, sy + 8);

    ctx.textAlign = 'right';
    ctx.fillStyle = selected ? UI_THEME.accentStrong : UI_THEME.muted;
    ctx.fillText(entry.value, W / 2 + 220, sy + 8);
  });

  const backY = H - 80;
  drawPanel(ctx, state, W / 2 - 100, backY, 200, 50, 12, '#ff7688');
  ctx.fillStyle = '#ffffff';
  setUiFont(ctx, state, 18, '700');
  ctx.textAlign = 'center';
  ctx.fillText('BACK', W / 2, backY + 32);
}

function wrapCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(' ');
  let line = '';
  let y = startY;

  for (const word of words) {
    const testLine = `${line}${word} `;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line.trim(), centerX, y);
      line = `${word} `;
      y += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) {
    ctx.fillText(line.trim(), centerX, y);
  }
}
