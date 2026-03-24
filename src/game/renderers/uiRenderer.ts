import type { Difficulty, GameState, ShopTab } from '../types';
import { TOTAL_LEVELS } from '../levels';
import { DIFFICULTY_SETTINGS } from '../constants';
import { getLeaderboard, getLeaderboardStatus } from '../services/leaderboard';
import { getProgressionSnapshot } from '../services/progression';
import { UI_THEME, ELEMENT_COLORS, HUD_COLORS, ELEMENT_CHARACTER_NAMES, ELEMENT_ABILITY_NAMES, ELEMENT_ICONS } from './renderConstants';
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

  // Panel background
  const grad = ctx.createLinearGradient(x, y, x, y + height);
  grad.addColorStop(0, UI_THEME.panelA);
  grad.addColorStop(1, UI_THEME.panelB);
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, width, height, radius);
  ctx.fill();

  // White border
  ctx.strokeStyle = UI_THEME.panelBorder;
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, width, height, radius);
  ctx.stroke();

  // Colored left accent bar
  ctx.fillStyle = accentColor;
  ctx.globalAlpha = alpha * 0.7;
  roundRect(ctx, x, y, 4, height, radius);
  ctx.fill();

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
  stone.addColorStop(0, '#ffffff');
  stone.addColorStop(1, '#e6f0fa');
  ctx.fillStyle = stone;
  roundRect(ctx, x, y, width, height, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(150, 180, 255, 0.5)';
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
  ctx.fillStyle = 'rgba(120, 140, 180, 0.5)';
  const rivets = [
    [x + 12, y + 12], [x + width - 12, y + 12],
    [x + 12, y + height - 12], [x + width - 12, y + height - 12],
  ];
  rivets.forEach(([rx, ry]) => { ctx.beginPath(); ctx.arc(rx, ry, 3, 0, Math.PI * 2); ctx.fill(); });
}

export function drawTexturedBar(
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
    swirl.addColorStop(1, '#ffffff');
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
  base.addColorStop(0, 'rgba(255, 255, 255, 0.94)');
  base.addColorStop(1, 'rgba(230, 240, 255, 0.88)');
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
  ctx.fillStyle = '#111522';
  setUiFont(ctx, state, 17, '800');
  ctx.fillText(title, x + 70, titleY);
  ctx.fillStyle = 'rgba(20, 30, 50, 0.7)';
  setUiFont(ctx, state, 12, '600');
  ctx.fillText(subtitle, x + 70, subtitleY);

  ctx.restore();
}

function drawMapScreen(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, nowMs: number) {
  ctx.fillStyle = '#82caaf';
  ctx.fillRect(0, 0, W, H);
  const parchment = ctx.createLinearGradient(0, 0, W, H);
  parchment.addColorStop(0, '#ffffff');
  parchment.addColorStop(1, '#e0f2f1');
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
    ctx.fillStyle = '#ffffff';
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
  ctx.fillStyle = '#0c1830';
  ctx.fillRect(0, 0, W, H);
  drawStoneHudPanel(ctx, 20, 20, W - 40, H - 40, '#9ae6de');

  const centerX = W / 2;
  const centerY = H / 2;
  const pulse = 0.9 + 0.1 * Math.sin(nowMs * 0.003);
  ctx.fillStyle = '#1a2a50';
  ctx.beginPath(); ctx.arc(centerX, centerY, 48 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c0c8d8';
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
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(b.label, endX, endY + 38);
  });

  setUiFont(ctx, state, 18, '800');
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(`CRYSTAL SHARDS: ${state.gemsCurrency}`, centerX, 60);
  ctx.fillText('Tap nodes to unlock sub-abilities (visual only placeholder)', centerX, 90);
}

function drawEndingScroll(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number) {
  ctx.fillStyle = '#82caaf';
  ctx.fillRect(0, 0, W, H);
  const parchment = ctx.createLinearGradient(0, 0, W, H);
  parchment.addColorStop(0, '#ffffff');
  parchment.addColorStop(1, '#e6f0fa');
  const inset = 50;
  ctx.fillStyle = parchment;
  roundRect(ctx, inset, inset, W - inset * 2, H - inset * 2, 24);
  ctx.fill();
  ctx.strokeStyle = 'rgba(100, 160, 220, 0.5)';
  ctx.lineWidth = 4;
  roundRect(ctx, inset, inset, W - inset * 2, H - inset * 2, 24);
  ctx.stroke();

  setDisplayFont(ctx, state, 42, '900');
  ctx.fillStyle = '#ffffff';
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
  setDisplayFont(ctx, state, 52, '900');
  ctx.fillText(title, W / 2, topY);
  ctx.fillStyle = '#c0c8d8';
  setUiFont(ctx, state, 17, '600');
  ctx.fillText(subtitle, W / 2, topY + 38);
}

function drawPrimaryButton(
  ctx: CanvasRenderingContext2D,
  _state: GameState,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  accent: string,
  _selected = false,
) {
  ctx.save();
  // Vibrant colored pill
  ctx.fillStyle = accent;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  // Highlight sheen
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(ctx, x + 4, y + 2, w - 8, h / 2 - 2, h / 4);
  ctx.fill();
  // Border
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.stroke();
  // Label
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.max(14, Math.min(22, h * 0.35))}px Arial, sans-serif`;
  ctx.fillText(label, x + w / 2, y + h / 2 + 6);
  ctx.restore();
}

function drawTopRightSettingsHotspot(ctx: CanvasRenderingContext2D, state: GameState, W: number) {
  const x = W - 62;
  const y = 18;
  drawPanel(ctx, state, x, y, 44, 44, 10, '#86d5ff', 0.92);
  ctx.strokeStyle = '#ffffff';
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
  sky.addColorStop(0, '#4aaeff');
  sky.addColorStop(0.5, '#73c5ff');
  sky.addColorStop(1, '#a6ddff');
  ctx.fillStyle = sky;
  ctx.fillRect(-60, -60, W + 120, H + 120);

  const eclipseX = W * 0.5;
  const eclipseY = 120;
  const corona = ctx.createRadialGradient(eclipseX, eclipseY, 30, eclipseX, eclipseY, 400);
  corona.addColorStop(0, 'rgba(255, 255, 200, 0.6)');
  corona.addColorStop(1, 'rgba(255, 255, 255, 0)');
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
  ctx.fillStyle = '#ffffff';
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
  ctx.fillStyle = '#ffffff';
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
    { title: tr(state, 'menu_campaign'), subtitle: tr(state, 'menu_campaign_subtitle'), color: ELEMENT_COLORS.fire, icon: 'map' as const, active: state.selectedMenuButton === 0 },
    { title: tr(state, 'menu_wave'), subtitle: tr(state, 'menu_wave_subtitle'), color: ELEMENT_COLORS.wind, icon: 'swords' as const, active: state.selectedMenuButton === 1 },
    { title: tr(state, 'menu_shop'), subtitle: tr(state, 'shop_currency', { gems: state.gemsCurrency }), color: ELEMENT_COLORS.earth, icon: 'bag' as const, active: false },
    { title: 'DAILY CHALLENGES', subtitle: 'Claim rewards and track progression', color: '#9ae6de', icon: 'star' as const, active: false },
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
  ctx.fillStyle = '#e0e8f0';
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
        ctx.fillStyle = '#e0e8f0';
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
  drawBackdrop(ctx, state, W, H, ['#0c1a3a', '#1a3568', '#0f1e45']);
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
  drawBackdrop(ctx, state, W, H, ['#0e1838', '#1c3b6e', '#121e48']);
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
  // Premium fantasy backdrop with subtle parallax effect
  drawBackdrop(ctx, state, W, H, ['#0a1530', '#152c58', '#0f1e42']);
  
  // Subtle animated parallax layer
  const parallaxOffset = (Date.now() * 0.01) % 100;
  ctx.save();
  ctx.fillStyle = 'rgba(154, 230, 222, 0.02)';
  ctx.fillRect(-parallaxOffset, 0, W + parallaxOffset, H);
  ctx.restore();
  
  // Decorative header with element-inspired design
  ctx.save();
  ctx.fillStyle = 'rgba(154, 230, 222, 0.08)';
  ctx.fillRect(0, 0, W, 140);
  
  // Decorative top line with glow
  ctx.strokeStyle = 'rgba(154, 230, 222, 0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, 75);
  ctx.lineTo(W - 60, 75);
  ctx.stroke();
  
  ctx.restore();

  // Main title with fantasy styling
  drawScreenHeading(ctx, state, tr(state, 'level_select_title'), 'Select your next challenge', W, 86);

  // Grid layout - optimized for visual balance
  const cardW = compactMobileLayout ? Math.floor((W - 72) / 3) : 200;
  const cardH = compactMobileLayout ? 145 : 180;
  const gap = compactMobileLayout ? 16 : 24;
  const cols = compactMobileLayout ? 3 : 4;
  const startX = W / 2 - (cols * cardW + (cols - 1) * gap) / 2;
  const startY = compactMobileLayout ? 130 : 160;

  // Draw level cards with premium styling and micro-interactions
  for (let index = 0; index < TOTAL_LEVELS; index++) {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = startX + col * (cardW + gap);
    const y = startY + row * (cardH + gap);
    const unlocked = index <= state.furthestLevel;
    const selected = index === state.levelSelectionIndex;
    const bestTime = state.bestTimes[index];

    ctx.save();
    
    // Apply hover/selection scale effect for micro-interaction
    const scaleAmount = selected ? 1.08 : 1.0;
    const cardCenterX = x + cardW / 2;
    const cardCenterY = y + cardH / 2;
    ctx.translate(cardCenterX, cardCenterY);
    ctx.scale(scaleAmount, scaleAmount);
    ctx.translate(-cardCenterX, -cardCenterY);
    
    // Premium shadow with depth
    if (unlocked) {
      ctx.shadowColor = selected ? 'rgba(98, 238, 184, 0.5)' : 'rgba(154, 230, 222, 0.25)';
      ctx.shadowBlur = selected ? 28 : 14;
      ctx.shadowOffsetY = selected ? 14 : 8;
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 6;
    }

    // Create luxurious gradient background
    const bgGrad = ctx.createLinearGradient(x, y, x, y + cardH);
    if (unlocked) {
      if (selected) {
        // Premium selected state - bright cyan/green glow
        bgGrad.addColorStop(0, 'rgba(98, 238, 184, 0.25)');
        bgGrad.addColorStop(0.5, 'rgba(123, 211, 255, 0.18)');
        bgGrad.addColorStop(1, 'rgba(98, 238, 184, 0.12)');
      } else {
        // Unlocked - subtle cyan
        bgGrad.addColorStop(0, 'rgba(123, 211, 255, 0.14)');
        bgGrad.addColorStop(0.5, 'rgba(95, 196, 255, 0.08)');
        bgGrad.addColorStop(1, 'rgba(123, 211, 255, 0.06)');
      }
    } else {
      // Locked - dark muted
      bgGrad.addColorStop(0, 'rgba(85, 90, 112, 0.06)');
      bgGrad.addColorStop(1, 'rgba(50, 55, 75, 0.04)');
    }
    
    ctx.fillStyle = bgGrad;
    roundRect(ctx, x, y, cardW, cardH, 14);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    
    // Luxurious border with multiple strokes for depth
    if (selected) {
      // Inner glow for selected
      ctx.strokeStyle = 'rgba(98, 238, 184, 0.5)';
      ctx.lineWidth = 2;
      roundRect(ctx, x + 2, y + 2, cardW - 4, cardH - 4, 12);
      ctx.stroke();
      
      // Outer accent
      ctx.strokeStyle = 'rgba(123, 211, 255, 0.6)';
      ctx.lineWidth = 2;
      roundRect(ctx, x, y, cardW, cardH, 14);
      ctx.stroke();
    } else {
      // Standard border
      ctx.strokeStyle = unlocked ? 'rgba(123, 211, 255, 0.4)' : 'rgba(85, 90, 112, 0.3)';
      ctx.lineWidth = 2;
      roundRect(ctx, x, y, cardW, cardH, 14);
      ctx.stroke();
    }

    // Decorative top accent bar
    if (unlocked) {
      const accentGrad = ctx.createLinearGradient(x, y, x + cardW, y);
      if (selected) {
        accentGrad.addColorStop(0, 'rgba(98, 238, 184, 0)');
        accentGrad.addColorStop(0.5, 'rgba(98, 238, 184, 0.6)');
        accentGrad.addColorStop(1, 'rgba(98, 238, 184, 0)');
      } else {
        accentGrad.addColorStop(0, 'rgba(123, 211, 255, 0)');
        accentGrad.addColorStop(0.5, 'rgba(123, 211, 255, 0.4)');
        accentGrad.addColorStop(1, 'rgba(123, 211, 255, 0)');
      }
      ctx.fillStyle = accentGrad;
      ctx.fillRect(x, y, cardW, 3);
    }

    ctx.restore();

    // Element icon/symbol (cycling animation)
    const elementSymbols = ['🔥', '💧', '🌍', '🌪️'];
    const elementIndex = index % 4;
    const elementSymbol = elementSymbols[elementIndex];
    ctx.save();
    ctx.fillStyle = unlocked ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.15)';
    ctx.font = `${cardH > 150 ? 20 : 16}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(elementSymbol, x + cardW / 2, y + 28);
    ctx.restore();

    // Level number - large and bold (aggressive gaming font)
    ctx.textAlign = 'center';
    ctx.fillStyle = unlocked ? (selected ? '#62eeb8' : '#b8e0ff') : 'rgba(255,255,255,0.35)';
    setDisplayFont(ctx, state, cardH > 150 ? 44 : 36, '900');
    ctx.fillText(`${index + 1}`, x + cardW / 2, y + 65);

    // Status badge with styling
    if (unlocked) {
      const statusColor = selected ? '#62eeb8' : '#9ae6de';
      ctx.fillStyle = statusColor;
      setUiFont(ctx, state, 12, '800');
      const statusText = selected ? 'READY' : 'UNLOCKED';
      ctx.fillText(statusText, x + cardW / 2, y + 95);
    } else {
      ctx.fillStyle = 'rgba(200, 192, 176, 0.5)';
      setUiFont(ctx, state, 11, '700');
      ctx.fillText(tr(state, 'level_select_locked'), x + cardW / 2, y + 95);
    }

    // Star rating for completed levels
    if (index < state.furthestLevel) {
      // Show stars if level is completed
      const stars = (state.bestTimes[index] ? 3 : 0); // Placeholder: full completion = 3 stars
      ctx.save();
      ctx.fillStyle = '#ffd36a';
      ctx.textAlign = 'center';
      ctx.font = `bold 10px Arial`;
      let starText = '';
      for (let s = 0; s < 3; s++) {
        starText += s < stars ? '★' : '☆';
      }
      ctx.fillText(starText, x + cardW / 2, y + cardH - 22);
      ctx.restore();
    }

    // Best time with elegant styling
    if (bestTime) {
      ctx.fillStyle = unlocked ? '#8ab9d1' : 'rgba(200, 192, 176, 0.4)';
      setUiFont(ctx, state, 10, '600');
      const timeText = formatFramesAsTime(bestTime);
      ctx.fillText(`TIME: ${timeText}`, x + cardW / 2, y + cardH - 8);
    } else {
      ctx.fillStyle = 'rgba(200, 192, 176, 0.35)';
      setUiFont(ctx, state, 9, '500');
      ctx.fillText('NO RECORD', x + cardW / 2, y + cardH - 8);
    }
  }

  // Progress stats bar - total completion indicator
  ctx.save();
  const completedLevels = state.furthestLevel + 1;
  const maxStars = TOTAL_LEVELS * 3;
  const currentStars = Object.values(state.bestTimes).filter(t => t !== undefined).length * 3;
  
  ctx.fillStyle = 'rgba(232, 223, 207, 0.7)';
  ctx.textAlign = 'center';
  setUiFont(ctx, state, 12, '600');
  ctx.fillText(
    `⭐ ${currentStars} / ${maxStars} STARS  •  PROGRESS: ${Math.floor((completedLevels / TOTAL_LEVELS) * 100)}%`,
    W / 2,
    H - 135,
  );
  ctx.restore();

  // Instruction text with elegant styling
  ctx.save();
  ctx.fillStyle = 'rgba(232, 223, 207, 0.6)';
  ctx.textAlign = 'center';
  setUiFont(ctx, state, 13, '600');
  ctx.fillText(
    isMobile ? 'TAP A LEVEL TO START YOUR QUEST' : 'CLICK A LEVEL TO BEGIN YOUR ADVENTURE',
    W / 2,
    H - 110,
  );
  ctx.restore();

  // Premium back button with elegant styling and hover effect
  ctx.save();
  const isBackButtonSelected = false; // Add this to state if needed for proper hover
  const backScale = isBackButtonSelected ? 1.05 : 1.0;
  
  const backBtnX = W / 2 - 110;
  const backBtnY = H - 85;
  const backBtnW = 220;
  const backBtnH = 55;
  
  const backCenterX = backBtnX + backBtnW / 2;
  const backCenterY = backBtnY + backBtnH / 2;
  ctx.translate(backCenterX, backCenterY);
  ctx.scale(backScale, backScale);
  ctx.translate(-backCenterX, -backCenterY);
  
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 6;
  
  const backGrad = ctx.createLinearGradient(backBtnX, backBtnY, backBtnX, backBtnY + backBtnH);
  backGrad.addColorStop(0, 'rgba(255, 118, 136, 0.22)');
  backGrad.addColorStop(1, 'rgba(255, 118, 136, 0.12)');
  ctx.fillStyle = backGrad;
  roundRect(ctx, backBtnX, backBtnY, backBtnW, backBtnH, 12);
  ctx.fill();
  
  ctx.strokeStyle = 'rgba(255, 118, 136, 0.5)';
  ctx.lineWidth = 2;
  roundRect(ctx, backBtnX, backBtnY, backBtnW, backBtnH, 12);
  ctx.stroke();
  
  ctx.fillStyle = '#ff8896';
  ctx.textAlign = 'center';
  setDisplayFont(ctx, state, 18, '700');
  ctx.fillText('BACK', W / 2, backBtnY + 38);
  
  ctx.restore();
}

function drawLevelCompleteScreen(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, isMobile: boolean) {
  drawBackdrop(ctx, state, W, H, ['#0c2230', '#1a4a60', '#0e2838']);
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

  ctx.fillStyle = '#e0e8f0';
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
  drawBackdrop(ctx, state, W, H, ['#2a0815', '#4a1428', '#1e0810']);
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

export function drawVictoryScreen(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, isMobile: boolean) {
  drawBackdrop(ctx, state, W, H, ['#0c2a2e', '#1a5058', '#0e2e32']);
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
  _nowMs: number,
  _isPortraitMobile: boolean,
) {
  const s = state.stickman;
  const elementColor = ELEMENT_COLORS[state.selectedElement];
  const charName = ELEMENT_CHARACTER_NAMES[state.selectedElement];

  // ═══════════════════════════════════════════
  // CHARACTER PANEL (top-left)
  // ═══════════════════════════════════════════
  const panelX = 14;
  const panelY = 10;
  const avatarR = 38;
  const avatarCX = panelX + avatarR + 6;
  const avatarCY = panelY + avatarR + 6;

  // Avatar outer ring with element glow
  ctx.save();
  ctx.shadowColor = elementColor;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = elementColor;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(avatarCX, avatarCY, avatarR + 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Avatar background fill
  ctx.fillStyle = elementColor;
  ctx.beginPath();
  ctx.arc(avatarCX, avatarCY, avatarR, 0, Math.PI * 2);
  ctx.fill();

  // White inner border
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(avatarCX, avatarCY, avatarR - 3, 0, Math.PI * 2);
  ctx.stroke();

  // Stickman silhouette — bigger
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(avatarCX, avatarCY - 14, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  // Body
  ctx.beginPath(); ctx.moveTo(avatarCX, avatarCY - 3); ctx.lineTo(avatarCX, avatarCY + 16); ctx.stroke();
  // Arms
  ctx.beginPath(); ctx.moveTo(avatarCX - 12, avatarCY + 6); ctx.lineTo(avatarCX + 12, avatarCY + 6); ctx.stroke();
  // Left leg
  ctx.beginPath(); ctx.moveTo(avatarCX, avatarCY + 16); ctx.lineTo(avatarCX - 10, avatarCY + 30); ctx.stroke();
  // Right leg
  ctx.beginPath(); ctx.moveTo(avatarCX, avatarCY + 16); ctx.lineTo(avatarCX + 10, avatarCY + 30); ctx.stroke();
  ctx.restore();

  // ─── HP / MP BARS ───
  const barX = panelX + (avatarR + 6) * 2 + 14;
  const barW = 220;
  const barH = 18;
  const barGap = 6;

  // HP bar background
  const healthRatio = Math.max(0, s.health / Math.max(1, s.maxHealth));
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(ctx, barX, panelY + 8, barW, barH, 9);
  ctx.fill();
  // HP bar fill
  const hpGrad = ctx.createLinearGradient(barX, panelY + 8, barX + barW, panelY + 8);
  hpGrad.addColorStop(0, '#5fe63a');
  hpGrad.addColorStop(1, '#2daa14');
  ctx.fillStyle = hpGrad;
  if (healthRatio > 0) {
    roundRect(ctx, barX, panelY + 8, barW * healthRatio, barH, 9);
    ctx.fill();
  }
  // HP bar border
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, barX, panelY + 8, barW, barH, 9);
  ctx.stroke();
  // HP text
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.ceil(s.health)}/${Math.ceil(s.maxHealth)}`, barX + barW / 2, panelY + 8 + barH - 4);

  // MP bar background
  const manaRatio = Math.max(0, s.mana / Math.max(1, s.maxMana));
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(ctx, barX, panelY + 8 + barH + barGap, barW, barH, 9);
  ctx.fill();
  // MP bar fill
  const mpGrad = ctx.createLinearGradient(barX, panelY + 8 + barH + barGap, barX + barW, panelY + 8 + barH + barGap);
  mpGrad.addColorStop(0, '#4a9eff');
  mpGrad.addColorStop(1, '#1a6ad4');
  ctx.fillStyle = mpGrad;
  if (manaRatio > 0) {
    roundRect(ctx, barX, panelY + 8 + barH + barGap, barW * manaRatio, barH, 9);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, barX, panelY + 8 + barH + barGap, barW, barH, 9);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.fillText(`${Math.ceil(s.mana)}/${Math.ceil(s.maxMana)}`, barX + barW / 2, panelY + 8 + barH + barGap + barH - 4);

  // ─── Character name + level label ───
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.fillText(charName, barX, panelY + 8 + barH * 2 + barGap + 20);
  ctx.fillStyle = '#bbb';
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.fillText(`Level ${state.currentLevel + 1}`, barX + ctx.measureText(charName).width + 12, panelY + 8 + barH * 2 + barGap + 20);

  // ═══════════════════════════════════════════
  // SCORE & COINS (below character info)
  // ═══════════════════════════════════════════
  const scoreY = panelY + 8 + barH * 2 + barGap + 42;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Score: ${state.score.toLocaleString()}`, panelX + 4, scoreY);
  ctx.fillStyle = HUD_COLORS.coinsText;
  ctx.font = 'bold 18px Arial, sans-serif';
  ctx.fillText(`Coins: ${state.gemsCurrency.toLocaleString()}`, panelX + 4, scoreY + 24);

  // ═══════════════════════════════════════════
  // ELEMENT SWITCHER (left side, below score)
  // ═══════════════════════════════════════════
  const elements: Array<import('../types').Element> = ['fire', 'water', 'earth', 'wind'];
  const elemStartY = scoreY + 40;
  const elemSlotH = 58;
  const elemIconR = 24;
  const cooldownValues: Record<string, string> = { fire: '', water: '0.5s', earth: '1.2s', wind: '0.6s' };
  const elLabels: Record<string, string> = { fire: 'FIRE', water: 'WATER', earth: 'EARTH', wind: 'AIR' };

  elements.forEach((elem, i) => {
    const ey = elemStartY + i * elemSlotH;
    const isActive = elem === state.selectedElement;
    const isUnlocked = state.unlockedElements.includes(elem);
    const eColor = ELEMENT_COLORS[elem];

    ctx.save();
    ctx.globalAlpha = isUnlocked ? (isActive ? 1 : 0.7) : 0.2;

    // Element icon circle — large and vivid
    ctx.fillStyle = isActive ? eColor : 'rgba(60,60,60,0.7)';
    ctx.beginPath();
    ctx.arc(panelX + elemIconR + 6, ey + elemIconR + 4, elemIconR, 0, Math.PI * 2);
    ctx.fill();

    // Border ring
    ctx.strokeStyle = isActive ? '#fff' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = isActive ? 3 : 2;
    ctx.beginPath();
    ctx.arc(panelX + elemIconR + 6, ey + elemIconR + 4, elemIconR, 0, Math.PI * 2);
    ctx.stroke();

    // Element icon emoji — bigger
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ELEMENT_ICONS[elem], panelX + elemIconR + 6, ey + elemIconR + 5);
    ctx.textBaseline = 'alphabetic';

    // Element label — bigger, bold
    const labelX = panelX + elemIconR * 2 + 20;
    ctx.fillStyle = isActive ? '#fff' : '#bbb';
    ctx.font = isActive ? 'bold 15px Arial, sans-serif' : 'bold 13px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(elLabels[elem], labelX, ey + 16);

    // Active element: show percentage
    if (isActive) {
      ctx.fillStyle = eColor;
      ctx.font = 'bold 13px Arial, sans-serif';
      ctx.fillText('100%', labelX, ey + 36);
    }

    // Unlocked non-active: show cooldown + tap hint
    if (isUnlocked && !isActive) {
      ctx.fillStyle = '#aaa';
      ctx.font = 'bold 12px Arial, sans-serif';
      const cd = cooldownValues[elem];
      if (cd) ctx.fillText(cd, labelX, ey + 34);

      ctx.fillStyle = '#888';
      ctx.font = '11px Arial, sans-serif';
      ctx.fillText('Tap to switch', labelX + (cd ? 36 : 0), ey + 34);
    }

    ctx.restore();
  });

  // Store element switcher bounds for touch hit testing
  state._elementSwitcherBounds = elements.map((elem, i) => ({
    element: elem,
    x: panelX,
    y: elemStartY + i * elemSlotH,
    w: elemIconR * 2 + 140,
    h: elemSlotH,
  }));

  // ═══════════════════════════════════════════
  // LEVEL NAME (top-right)
  // ═══════════════════════════════════════════
  ctx.save();
  const levelText = (state.levelName || '').toUpperCase();
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.textAlign = 'right';
  const lvlTextW = ctx.measureText(levelText).width;
  // Background pill
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(ctx, W - lvlTextW - 100, panelY + 2, lvlTextW + 24, 32, 8);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(levelText, W - 84, panelY + 26);
  ctx.restore();

  // ═══════════════════════════════════════════
  // PAUSE & SETTINGS (top-right corner)
  // ═══════════════════════════════════════════
  const btnR = 20;
  const pauseX = W - 56;
  const settX = W - 18;
  const btnCY = panelY + 18;

  // Pause
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath(); ctx.arc(pauseX, btnCY, btnR, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(pauseX, btnCY, btnR, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('❚❚', pauseX, btnCY);
  ctx.restore();

  // Settings
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath(); ctx.arc(settX, btnCY, btnR, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(settX, btnCY, btnR, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = '18px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚙', settX, btnCY);
  ctx.restore();

  // ═══════════════════════════════════════════
  // ABILITY NAME (bottom-right, above action btn area)
  // ═══════════════════════════════════════════
  const abilityName = ELEMENT_ABILITY_NAMES[state.selectedElement];
  ctx.save();
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.textAlign = 'right';
  const abilTotalW = ctx.measureText(`B  ${abilityName}`).width;
  // Background pill
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(ctx, W - abilTotalW - 36, 320, abilTotalW + 28, 28, 8);
  ctx.fill();
  ctx.fillStyle = elementColor;
  ctx.fillText('B', W - abilTotalW - 8, 339);
  ctx.fillStyle = '#e0e0e0';
  ctx.fillText(abilityName, W - 16, 339);
  ctx.restore();
}

function drawShopScreen(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, compactMobileLayout: boolean) {
  drawBackdrop(ctx, state, W, H, ['#0c1a3a', '#1a3568', '#121e48']);
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
        const dotSize = isMobileLayout ? 6 : 4;
        ctx.beginPath();
        ctx.arc(ix + 20 + dot * (isMobileLayout ? 18 : 15), iy + (isMobileLayout ? 65 : 100), dotSize, 0, Math.PI * 2);
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

  ctx.fillStyle = '#e0e8f0';
  setUiFont(ctx, state, isPortraitMobile ? 16 : 18, '600');
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
    const panelW = isMobile ? 360 : 320;
    drawPanel(ctx, state, W / 2 - panelW / 2, optionY - 18, panelW, 42, 10, selected ? '#7bd3ff' : UI_THEME.panelBorder, selected ? 1 : 0.82);
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
  drawBackdrop(ctx, state, W, H, ['#0a1838', '#182e58', '#101e38']);
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

    ctx.fillStyle = '#e0e8f0';
    setUiFont(ctx, state, 12, '700');
    ctx.fillText(isMobile ? tr(state, 'relic_tap_select') : tr(state, 'relic_press_select', { key: i + 1 }), rx + 110, ry + 286);
  });
}

function drawSettingsScreen(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number) {
  drawBackdrop(ctx, state, W, H, ['#0e1838', '#1e3858', '#121e38']);
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
