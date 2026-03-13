import type { Difficulty, GameState, ShopTab } from '../types';
import { TOTAL_LEVELS } from '../levels';
import { DIFFICULTY_SETTINGS } from '../constants';
import { getLeaderboard, getLeaderboardStatus } from '../services/leaderboard';
import { getProgressionSnapshot } from '../services/progression';
import { UI_THEME, ELEMENT_COLORS } from './renderConstants';
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

export function drawUIRenderer(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  W: number,
  H: number,
  nowMs: number,
  isMobile: boolean,
  isPortraitMobile: boolean,
) {
  switch (state.screen) {
    case 'menu':
      drawMenuScreen(ctx, state, W, H, nowMs, isMobile);
      return;
    case 'survivalDifficulty':
      drawSurvivalDifficultyScreen(ctx, state, W, H, isMobile);
      return;
    case 'challenges':
      drawChallengesScreen(ctx, state, W, H, nowMs, isMobile);
      return;
    case 'levelSelect':
      drawLevelSelectScreen(ctx, state, W, H, isMobile);
      return;
    case 'levelComplete':
      drawLevelCompleteScreen(ctx, state, W, H, isMobile);
      return;
    case 'gameOver':
      drawGameOverScreen(ctx, state, W, H, isMobile);
      return;
    case 'victory':
      drawVictoryScreen(ctx, state, W, H, isMobile);
      return;
    case 'shop':
      drawShopScreen(ctx, state, W, H);
      return;
    case 'settings':
      drawSettingsScreen(ctx, state, W, H);
      return;
    case 'relicSelection':
      drawRelicSelectionScreen(ctx, state, W, H, isMobile);
      return;
    case 'playing':
      break;
  }

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
) {
  drawBackdrop(ctx, state, W, H, ['#050914', '#0d1833', '#091120']);
  const pulse = 0.5 + 0.5 * Math.sin(nowMs * 0.0025);

  const aura = ctx.createRadialGradient(W * 0.5, 170, 40, W * 0.5, 170, 280);
  aura.addColorStop(0, 'rgba(83, 184, 255, 0.18)');
  aura.addColorStop(1, 'rgba(83, 184, 255, 0)');
  ctx.fillStyle = aura;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#d7f1ff';
  setDisplayFont(ctx, state, 52, '900');
  ctx.fillText(tr(state, 'menu_title_line_1'), W / 2, 96);
  ctx.fillStyle = '#ffffff';
  setDisplayFont(ctx, state, 68, '900');
  ctx.fillText(tr(state, 'menu_title_line_2'), W / 2, 154);
  ctx.fillStyle = UI_THEME.muted;
  setUiFont(ctx, state, 16, '600');
  ctx.fillText(tr(state, 'menu_subtitle'), W / 2, 186);

  const diffConfig = DIFFICULTY_SETTINGS[state.difficulty];
  drawPanel(ctx, state, W / 2 - 120, 208, 240, 44, 12, diffConfig.color, 0.92);
  ctx.fillStyle = '#ffffff';
  setUiFont(ctx, state, 15, '700');
  ctx.fillText(
    tr(state, 'menu_difficulty', { difficulty: diffConfig.label.toUpperCase() }),
    W / 2,
    237,
  );

  const isMobileLayout = W < 600;
  const cardW = isMobileLayout ? W - 60 : 280;
  const cardH = isMobileLayout ? 85 : 120;
  const gap = isMobileLayout ? 12 : 30;
  const cols = isMobileLayout ? 1 : 2;
  const startX = W / 2 - (cols * cardW + (cols - 1) * gap) / 2;
  const startY = isMobileLayout ? 282 : 320;
  const menuCards = [
    {
      title: tr(state, 'menu_campaign'),
      subtitle: tr(state, 'menu_campaign_subtitle'),
      hint: isMobile ? tr(state, 'menu_tap_play') : tr(state, 'menu_key_campaign'),
      accent: '#62eeb8',
      selected: state.selectedMenuButton === 0,
    },
    {
      title: tr(state, 'menu_wave'),
      subtitle: tr(state, 'menu_wave_subtitle'),
      hint: isMobile ? tr(state, 'menu_tap_play') : tr(state, 'menu_key_wave'),
      accent: '#ffb463',
      selected: state.selectedMenuButton === 1,
    },
    {
      title: tr(state, 'menu_shop'),
      subtitle: tr(state, 'shop_currency', { gems: state.gemsCurrency }),
      hint: isMobile ? tr(state, 'menu_tap_open') : tr(state, 'menu_key_open'),
      accent: '#ffd37f',
      selected: false,
    },
    {
      title: 'DAILY CHALLENGES',
      subtitle: 'Claim rewards and track progression',
      hint: 'Open missions',
      accent: '#c693ff',
      selected: false,
    },
  ] as const;

  menuCards.forEach((card, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = startX + col * (cardW + gap);
    const y = startY + row * (cardH + gap);
    drawPanel(ctx, state, x, y, cardW, cardH, 16, card.accent, card.selected ? 1 : 0.86);
    if (card.selected) {
      ctx.save();
      ctx.globalAlpha = 0.16 + pulse * 0.08;
      ctx.fillStyle = card.accent;
      roundRect(ctx, x + 8, y + 8, cardW - 16, cardH - 16, 12);
      ctx.fill();
      ctx.restore();
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    setUiFont(ctx, state, isMobileLayout ? 18 : 22, '800');
    ctx.fillText(card.title, x + 20, y + (isMobileLayout ? 32 : 40));
    ctx.fillStyle = UI_THEME.muted;
    setUiFont(ctx, state, isMobileLayout ? 11 : 13, '600');
    ctx.fillText(card.subtitle, x + 20, y + (isMobileLayout ? 54 : 68));
    ctx.fillStyle = card.accent;
    setUiFont(ctx, state, isMobileLayout ? 11 : 12, '700');
    ctx.fillText(card.hint, x + 20, y + cardH - 18);
  });

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
  const sidebarY = isMobileLayout ? startY + cardH * 2 + gap * 2 + 8 : 84;
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
) {
  drawBackdrop(ctx, state, W, H, ['#080d1f', '#102545', '#140f2c']);
  drawScreenHeading(ctx, state, 'SURVIVAL MODE', 'Choose the challenge level for endless waves', W, 92);
 
  const diffs: Difficulty[] = ['easy', 'normal', 'hard', 'insane'];
  const isMobileLayout = W < 600;
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

  const isMobileLayout = W < 600;
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
) {
  drawBackdrop(ctx, state, W, H, ['#050914', '#0d1833', '#091120']);
  drawScreenHeading(ctx, state, tr(state, 'level_select_title'), 'Select a campaign level', W, 86);

  const cardW = 194;
  const cardH = 130;
  const gap = 16;
  const cols = 5;
  const startX = W / 2 - (cols * cardW + (cols - 1) * gap) / 2;
  const startY = 140;

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
    H - 48,
  );
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

function drawVictoryScreen(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, isMobile: boolean) {
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
    drawPanel(ctx, state, 10, 10, leftW, 104, 12, '#7bd3ff');
    drawPanel(ctx, state, W - rightW - 10, 10, rightW, 104, 12, '#88d8ff');

    ctx.fillStyle = '#d8eeff';
    setUiFont(ctx, state, 11, '700');
    ctx.textAlign = 'left';
    ctx.fillText(tr(state, 'hud_level', { level: state.currentLevel + 1, name: (state.levelName || '').toUpperCase() }), 20, 28);

    const healthRatio = Math.max(0, s.health / Math.max(1, s.maxHealth));
    const manaRatio = Math.max(0, s.mana / Math.max(1, s.maxMana));

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, 20, 36, leftW - 20, 12, 5);
    ctx.fill();
    ctx.fillStyle = '#78f3b6';
    roundRect(ctx, 20, 36, (leftW - 20) * healthRatio, 12, 5);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, 20, 54, leftW - 20, 10, 5);
    ctx.fill();
    ctx.fillStyle = '#6bb8ff';
    roundRect(ctx, 20, 54, (leftW - 20) * manaRatio, 10, 5);
    ctx.fill();

    ctx.fillStyle = '#f3fbff';
    setDisplayFont(ctx, state, 22, '800');
    ctx.textAlign = 'right';
    ctx.fillText(String(state.score), W - 20, 40);

    drawGemIcon(ctx, state, W - 165, 75, 8, nowMs);
    setUiFont(ctx, state, 16, '700');
    ctx.textAlign = 'left';
    ctx.fillText(String(state.gemsCurrency), W - 150, 80);
  } else {
    const hudW = 320;
    const hudX = 20;
    const hudY = 20;
    drawPanel(ctx, state, hudX, hudY, hudW, 110, 15, ELEMENT_COLORS[state.selectedElement]);

    ctx.fillStyle = '#ffffff';
    setUiFont(ctx, state, 14, '700');
    ctx.textAlign = 'left';
    ctx.fillText(tr(state, 'hud_level', { level: state.currentLevel + 1, name: (state.levelName || '').toUpperCase() }), hudX + 20, hudY + 30);

    const healthRatio = Math.max(0, s.health / Math.max(1, s.maxHealth));
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    roundRect(ctx, hudX + 20, hudY + 45, hudW - 40, 18, 9);
    ctx.fill();
    ctx.fillStyle = '#62eeb8';
    roundRect(ctx, hudX + 20, hudY + 45, (hudW - 40) * healthRatio, 18, 9);
    ctx.fill();

    const manaRatio = Math.max(0, s.mana / Math.max(1, s.maxMana));
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    roundRect(ctx, hudX + 20, hudY + 75, hudW - 40, 14, 7);
    ctx.fill();
    ctx.fillStyle = '#53b8ff';
    roundRect(ctx, hudX + 20, hudY + 75, (hudW - 40) * manaRatio, 14, 7);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    setDisplayFont(ctx, state, 32, '900');
    ctx.textAlign = 'right';
    ctx.fillText(String(state.score), W - 30, 55);

    drawGemIcon(ctx, state, W - 120, 95, 10, nowMs);
    setUiFont(ctx, state, 20, '700');
    ctx.textAlign = 'left';
    ctx.fillText(String(state.gemsCurrency), W - 100, 102);
  }
}

function drawShopScreen(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number) {
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

    const isMobileLayout = W < 600;
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
