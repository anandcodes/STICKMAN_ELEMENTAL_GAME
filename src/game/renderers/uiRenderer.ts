import type { GameState, ShopTab, Enemy, EnvObject } from '../types';
import { UI_THEME, ELEMENT_COLORS, FONT_UI, FONT_DISPLAY } from './renderConstants';
import { roundRect, setUiFont, setDisplayFont, tr, uiScale } from './renderUtils';
import { assetLoader } from '../services/assetLoader';

export function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: GameState,
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
  state: GameState,
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
  state: GameState,
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
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 60) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
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
  if (state.screen === 'shop') {
    drawShopScreen(ctx, state, W, H, nowMs);
    return;
  }

  if (state.screen === 'settings') {
    drawSettingsScreen(ctx, state, W, H, nowMs);
    return;
  }

  if (state.screen === 'relicSelection') {
    drawRelicSelectionScreen(ctx, state, W, H, isMobile);
    return;
  }

  drawHUD(ctx, state, W, H, nowMs, isMobile, isPortraitMobile);

  if (state.activeDialog.length > 0) {
    drawDialogSystem(ctx, state, W, H, nowMs, isPortraitMobile);
  }

  if (state.paused) {
    drawPauseOverlay(ctx, state, W, H);
  }

  if (state.showLevelIntro) {
    drawLevelIntro(ctx, state, W, H);
  }
}

function drawHUD(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  W: number,
  H: number,
  nowMs: number,
  isMobile: boolean,
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
    roundRect(ctx, 20, 36, leftW - 20, 12, 5); ctx.fill();
    ctx.fillStyle = '#78f3b6';
    roundRect(ctx, 20, 36, (leftW - 20) * healthRatio, 12, 5); ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, 20, 54, leftW - 20, 10, 5); ctx.fill();
    ctx.fillStyle = '#6bb8ff';
    roundRect(ctx, 20, 54, (leftW - 20) * manaRatio, 10, 5); ctx.fill();

    ctx.fillStyle = '#f3fbff';
    setDisplayFont(ctx, state, 22, '800');
    ctx.textAlign = 'right';
    ctx.fillText(String(state.score), W - 20, 40);

    // Gem Currency
    drawGemIcon(ctx, state, W - 165, 75, 8, nowMs);
    setUiFont(ctx, state, 16, '700');
    ctx.textAlign = 'left';
    ctx.fillText(String(state.gemsCurrency), W - 150, 80);
  } else {
    // Desktop/Landscape HUD
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
    roundRect(ctx, hudX + 20, hudY + 45, hudW - 40, 18, 9); ctx.fill();
    ctx.fillStyle = '#62eeb8';
    roundRect(ctx, hudX + 20, hudY + 45, (hudW - 40) * healthRatio, 18, 9); ctx.fill();

    const manaRatio = Math.max(0, s.mana / Math.max(1, s.maxMana));
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    roundRect(ctx, hudX + 20, hudY + 75, hudW - 40, 14, 7); ctx.fill();
    ctx.fillStyle = '#53b8ff';
    roundRect(ctx, hudX + 20, hudY + 75, (hudW - 40) * manaRatio, 14, 7); ctx.fill();

    // Score
    ctx.fillStyle = '#ffffff';
    setDisplayFont(ctx, state, 32, '900');
    ctx.textAlign = 'right';
    ctx.fillText(String(state.score), W - 30, 55);

    // Gem Currency
    drawGemIcon(ctx, state, W - 120, 95, 10, nowMs);
    setUiFont(ctx, state, 20, '700');
    ctx.textAlign = 'left';
    ctx.fillText(String(state.gemsCurrency), W - 100, 102);
  }
}

function drawShopScreen(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, nowMs: number) {
  drawBackdrop(ctx, state, W, H, ['#080d1f', '#102545', '#0f1631']);
  ctx.fillStyle = '#ffffff';
  setDisplayFont(ctx, state, 48, '800');
  ctx.textAlign = 'center';
  ctx.fillText("ELEMENTAL SHOP", W / 2, 80);
  
  // Tabs
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

  // Items
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
      ctx.fillText(isMaxed ? tr(state, 'shop_maxed') : `${item.cost} 💎`, ix + cardW - 20, iy + (isMobileLayout ? 45 : 45));
      
      // Progress dots
      for (let dot = 0; dot < 5; dot++) {
        ctx.fillStyle = dot < item.level ? UI_THEME.accent : 'rgba(255,255,255,0.1)';
        ctx.beginPath();
        ctx.arc(ix + 20 + dot * 15, iy + (isMobileLayout ? 65 : 100), 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // Back button
  const backY = H - 80;
  drawPanel(ctx, state, W / 2 - 100, backY, 200, 50, 12, '#ff7688');
  ctx.fillStyle = '#ffffff';
  setUiFont(ctx, state, 18, '700');
  ctx.textAlign = 'center';
  ctx.fillText("BACK", W / 2, backY + 32);
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

  // Speaker Name Tag
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

  // Placeholder for portrait icon
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath(); ctx.arc(portraitX + portraitSize / 2, portraitY + portraitSize / 2, portraitSize * 0.35, 0, Math.PI * 2); ctx.fill();

  const textX = portraitX + portraitSize + 20;
  const textY = panelY + 40;
  const maxWidth = panelW - (portraitSize + 60);
  const textToDraw = dialog.text.substring(0, Math.floor(state.dialogCharIndex));

  ctx.fillStyle = '#e9f2ff';
  setUiFont(ctx, state, isPortraitMobile ? 14 : 18, '600');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  // Basic line wrapping
  const words = textToDraw.split(' ');
  let line = '';
  let lineY = textY;
  const lineHeight = isPortraitMobile ? 20 : 24;

  for (const word of words) {
    const testLine = line + word + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line !== '') {
      ctx.fillText(line, textX, lineY);
      line = word + ' ';
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, textX, lineY);

  // Prompt to continue
  if (Math.floor(nowMs / 500) % 2 === 0) {
    ctx.fillStyle = UI_THEME.accent;
    setUiFont(ctx, state, 12, '700');
    ctx.textAlign = 'right';
    ctx.fillText(isPortraitMobile ? "TAP TO CONTINUE" : "PRESS ENTER TO CONTINUE", panelX + panelW - 20, panelY + panelH - 25);
  }

  ctx.restore();
}

function drawPauseOverlay(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number) {
  ctx.fillStyle = 'rgba(4, 8, 16, 0.82)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff';
  setDisplayFont(ctx, state, 46, '800');
  ctx.textAlign = 'center';
  ctx.fillText(tr(state, 'pause_title').toUpperCase(), W / 2, H / 2 - 110);
}

function drawRelicSelectionScreen(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, isMobile = false) {
  drawBackdrop(ctx, state, W, H, ['#051020', '#102040', '#0a1020']);
  ctx.fillStyle = '#ffffff';
  setDisplayFont(ctx, state, 48, '900');
  ctx.textAlign = 'center';
  ctx.fillText(tr(state, 'relic_selection_title'), W / 2, 100);

  const choices = state.relicChoices || [];
  choices.forEach((relic, i) => {
    const rx = W / 2 - 350 + i * 240;
    const ry = 180;
    const selected = state.shopSelectionIndex === i;
    
    drawPanel(ctx, state, rx, ry, 220, 320, 15, selected ? UI_THEME.accent : UI_THEME.panelBorder, selected ? 1 : 0.85);
    
    // Icon (Placeholder)
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    roundRect(ctx, rx + 40, ry + 30, 140, 140, 10); ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    setUiFont(ctx, state, 20, '800');
    ctx.textAlign = 'center';
    ctx.fillText(relic.name.toUpperCase(), rx + 110, ry + 200);
    
    setUiFont(ctx, state, 14, '600');
    ctx.fillStyle = UI_THEME.muted;
    // Multi-line wrap would be better, but for now simple
    ctx.fillText(relic.description, rx + 110, ry + 230);
    
    const rarityColors = { common: '#8aa2c6', rare: '#53b8ff', legendary: '#aa44ff' };
    ctx.fillStyle = rarityColors[relic.rarity];
    setUiFont(ctx, state, 12, '800');
    ctx.fillText(relic.rarity.toUpperCase(), rx + 110, ry + 20);
  });
}

function drawSettingsScreen(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number, nowMs: number) {
  drawBackdrop(ctx, state, W, H, ['#0a1020', '#152540', '#0a1020']);
  ctx.fillStyle = '#ffffff';
  setDisplayFont(ctx, state, 42, '800');
  ctx.textAlign = 'center';
  ctx.fillText("SETTINGS", W / 2, 80);

  const settings = [
    { label: 'Graphics Quality', value: state.graphicsQuality.toUpperCase() },
    { label: 'Haptic Feedback', value: state.hapticsEnabled ? 'ENABLED' : 'DISABLED' },
    { label: 'Reduced Motion', value: state.reducedMotion ? 'ON' : 'OFF' },
    { label: 'High Contrast', value: state.highContrast ? 'ON' : 'OFF' },
    { label: 'Aim to Shoot', value: state.aimToShoot ? 'ON' : 'OFF' },
  ];

  settings.forEach((s, i) => {
    const sy = 160 + i * 70;
    const selected = state.shopSelectionIndex === i;
    drawPanel(ctx, state, W / 2 - 250, sy - 30, 500, 60, 8, selected ? UI_THEME.accent : UI_THEME.panelBorder, selected ? 1 : 0.8);
    
    ctx.fillStyle = '#ffffff';
    setUiFont(ctx, state, 18, '700');
    ctx.textAlign = 'left';
    ctx.fillText(s.label, W / 2 - 220, sy + 8);
    
    ctx.textAlign = 'right';
    ctx.fillStyle = selected ? UI_THEME.accentStrong : UI_THEME.muted;
    ctx.fillText(s.value, W / 2 + 220, sy + 8);
  });

  // Back button
  const backY = H - 80;
  drawPanel(ctx, state, W / 2 - 100, backY, 200, 50, 12, '#ff7688');
  ctx.fillStyle = '#ffffff';
  setUiFont(ctx, state, 18, '700');
  ctx.textAlign = 'center';
  ctx.fillText("BACK", W / 2, backY + 32);
}
