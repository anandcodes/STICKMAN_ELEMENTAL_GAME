import type { GameState, Element } from './types';
import * as Audio from './audio';
import { MOBILE_INPUT_CONFIG, type MobileControlAssetKey } from './mobile/config';
import { setAimFromVector } from './mobile/aimSystem';
import { hitActionButton, getDashCooldownProgress } from './mobile/actionButtons';
import { drawActionButton, drawAimPad, drawAbilitySlot, drawFloatingJoystick, type ControlAssetMap } from './mobile/uiFeedback';
import { beginFloatingJoystick, beginShootInput, endShootInput, holdShootInput, releaseFloatingJoystick, stepMobileInput, updateFloatingJoystick } from './mobile/inputManager';

export interface TouchControl {
  id: string;
  x: number;
  y: number;
  radius: number;
  label: string;
  color: string;
  iconKey?: MobileControlAssetKey;
  active: boolean;
}

export interface TouchControlsState {
  visible: boolean;
  dpadCenter: { x: number; y: number };
  dpadRadius: number;
  dpadTouchId: number | null;
  dpadDirection: { x: number; y: number };
  dpadTargetDirection: { x: number; y: number };
  jumpActive: boolean;
  jumpTouchId: number | null;
  castActive: boolean;
  castTouchId: number | null;
  castPosition: { x: number; y: number };
  jumpButton: TouchControl;
  castButton: TouchControl;
  shootButton: TouchControl;
  dashButton: TouchControl;
  cycleButton: TouchControl;
  pauseButton: TouchControl;
  abilitySlots: TouchControl[];
  dashActive: boolean;
  dashTouchId: number | null;
  shootTouchId: number | null;
  shootHeldFrames: number;
  castDragActive: boolean;
  castDragPos: { x: number; y: number };
  lastElement: Element | null;
  elementFlashTimer: number;
}

const controlAssets: ControlAssetMap = {};

function modulateHex(hex: string, factor: number): string {
  const h = hex.replace('#', '');
  const r = Math.min(255, Math.round(parseInt(h.slice(0, 2), 16) * factor));
  const g = Math.min(255, Math.round(parseInt(h.slice(2, 4), 16) * factor));
  const b = Math.min(255, Math.round(parseInt(h.slice(4, 6), 16) * factor));
  return `rgb(${r}, ${g}, ${b})`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function defaultButton(id: string, label: string, color: string, iconKey?: MobileControlAssetKey): TouchControl {
  return { id, label, color, iconKey, x: 0, y: 0, radius: 24, active: false };
}

export function setControlAsset(key: MobileControlAssetKey, img: HTMLImageElement): void {
  controlAssets[key] = img;
}

export function setControlsAssets(assets: Partial<Record<MobileControlAssetKey, HTMLImageElement>>): void {
  Object.assign(controlAssets, assets);
}

export function createTouchControlsState(canvasW: number, canvasH: number): TouchControlsState {
  return {
    visible: false,
    dpadCenter: { x: 120, y: canvasH - 120 },
    dpadRadius: 64,
    dpadTouchId: null,
    dpadDirection: { x: 0, y: 0 },
    dpadTargetDirection: { x: 0, y: 0 },
    jumpActive: false,
    jumpTouchId: null,
    castActive: false,
    castTouchId: null,
    castPosition: { x: canvasW * 0.75, y: canvasH * 0.7 },
    jumpButton: defaultButton('jump', 'JUMP', '#7fe8ff', 'jump'),
    castButton: defaultButton('aim', 'AIM', '#58c0ff', 'crosshair'),
    shootButton: defaultButton('shoot', 'FIRE', '#ff8f52', 'shoot'),
    dashButton: defaultButton('dash', 'DASH', '#75ffd4', 'dash'),
    cycleButton: defaultButton('cycle', 'SWAP', '#7aa6ff', 'cycle'),
    pauseButton: defaultButton('pause', 'PAUSE', '#ffffff', 'pause'),
    abilitySlots: [
      defaultButton('ability-1', 'A1', '#9cb6d1', 'abilitySlot'),
      defaultButton('ability-2', 'A2', '#9cb6d1', 'abilitySlot'),
    ],
    dashActive: false,
    dashTouchId: null,
    shootTouchId: null,
    shootHeldFrames: 0,
    castDragActive: false,
    castDragPos: { x: canvasW * 0.75, y: canvasH * 0.7 },
    lastElement: null,
    elementFlashTimer: 0,
  };
}

export function updateTouchControlsLayout(
  controls: TouchControlsState,
  state: GameState,
  canvasW: number,
  canvasH: number,
  viewW: number,
  viewH: number,
): void {
  const portrait = viewH > viewW;
  const base = Math.min(canvasW, canvasH);
  const scale = state.controlsScale || 1;
  const margin = clamp(base * MOBILE_INPUT_CONFIG.safeMarginFactor, 16, 46) * scale;
  const joystickRadius = clamp(base * MOBILE_INPUT_CONFIG.joystickBaseRadiusFactor * scale, 42, portrait ? 148 : 134);
  controls.dpadRadius = joystickRadius;

  if (controls.dpadTouchId === null) {
    controls.dpadCenter = {
      x: margin + joystickRadius * 1.02,
      y: canvasH - margin - joystickRadius * 0.95,
    };
  }

  const actionRadius = clamp(base * MOBILE_INPUT_CONFIG.rightClusterRadiusFactor * scale, 34, portrait ? 92 : 104);
  const clusterX = canvasW - margin - actionRadius * 1.9;
  const clusterY = canvasH - margin - actionRadius * (portrait ? 1.9 : 1.55);

  controls.castButton.radius = actionRadius * 1.05;
  if (controls.castTouchId === null) {
    controls.castButton.x = clusterX;
    controls.castButton.y = clusterY;
    controls.castDragPos = { x: clusterX, y: clusterY };
    controls.castPosition = { x: clusterX, y: clusterY };
  }

  controls.shootButton.radius = actionRadius * 0.98;
  controls.shootButton.x = clusterX + actionRadius * 1.42;
  controls.shootButton.y = clusterY + actionRadius * 0.72;

  controls.jumpButton.radius = actionRadius * 0.82;
  controls.jumpButton.x = clusterX + actionRadius * 0.92;
  controls.jumpButton.y = clusterY - actionRadius * 1.16;

  controls.dashButton.radius = actionRadius * 0.74;
  controls.dashButton.x = clusterX - actionRadius * 1.18;
  controls.dashButton.y = clusterY - actionRadius * 0.12;

  controls.cycleButton.radius = actionRadius * 0.68;
  controls.cycleButton.x = clusterX - actionRadius * 1.28;
  controls.cycleButton.y = clusterY + actionRadius * 1.02;

  controls.abilitySlots[0].radius = actionRadius * 0.58;
  controls.abilitySlots[0].x = clusterX - actionRadius * 0.2;
  controls.abilitySlots[0].y = clusterY - actionRadius * 1.98;
  controls.abilitySlots[1].radius = actionRadius * 0.58;
  controls.abilitySlots[1].x = clusterX + actionRadius * 0.98;
  controls.abilitySlots[1].y = clusterY - actionRadius * 2.12;

  controls.pauseButton.radius = clamp(base * 0.03 * scale, 18, 34);
  controls.pauseButton.x = canvasW - margin - controls.pauseButton.radius;
  controls.pauseButton.y = margin + controls.pauseButton.radius;
}

export function updateTouchControlsInput(controls: TouchControlsState, state: GameState): void {
  stepMobileInput(controls, state);

  if (controls.shootTouchId !== null) {
    holdShootInput(controls, state);
  } else if (!state.shootQueued) {
    state.buttonFireActive = false;
  }

  if (!controls.castActive && !state.buttonFireActive) {
    state.touchAimActive = false;
    if (!state.mouseDown) {
      state.isAiming = false;
    }
  }
}

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || ('ontouchstart' in window)
    || (navigator.maxTouchPoints > 0);
}

export function handleTouchStart(
  touches: Touch[],
  controls: TouchControlsState,
  state: GameState,
  canvas: HTMLCanvasElement,
  canvasW: number,
  canvasH: number,
  coordTransform?: (clientX: number, clientY: number, rect: DOMRect) => { x: number; y: number },
): void {
  const rect = canvas.getBoundingClientRect();
  const defaultTransform = (cx: number, cy: number, r: DOMRect) => ({
    x: (cx - r.left) * (canvasW / r.width),
    y: (cy - r.top) * (canvasH / r.height),
  });
  const toCanvas = coordTransform || defaultTransform;

  for (const touch of touches) {
    const { x: tx, y: ty } = toCanvas(touch.clientX, touch.clientY, rect);

    // Element switcher tap-to-switch (direct element selection)
    if (state._elementSwitcherBounds && state.screen === 'playing' && !state.paused) {
      let switched = false;
      for (const bound of state._elementSwitcherBounds) {
        if (tx >= bound.x && tx <= bound.x + bound.w && ty >= bound.y && ty <= bound.y + bound.h) {
          if (state.unlockedElements.includes(bound.element) && bound.element !== state.selectedElement) {
            state.selectedElement = bound.element;
            Audio.playElementSwitch();
            switched = true;
          }
          break;
        }
      }
      if (switched) continue;
    }

    if (hitActionButton(controls.pauseButton, tx, ty, MOBILE_INPUT_CONFIG.buttonHitSlop)) {
      controls.pauseButton.active = true;
      state.paused = !state.paused;
      if (state.paused) Audio.playPause(); else Audio.playUnpause();
      return;
    }

    if (hitActionButton(controls.castButton, tx, ty, MOBILE_INPUT_CONFIG.buttonHitSlop) && state.ultimateReady && !controls.castActive) {
      controls.castButton.active = true;
      state.ultimateTrigger = true;
      continue;
    }

    if (state.screen === 'victory' && state.continueButton) {
      const b = state.continueButton;
      const inside = tx >= b.x && tx <= b.x + b.w && ty >= b.y && ty <= b.y + b.h;
      if (inside) {
        state.screen = 'map';
        state.screenTimer = 0;
        state.bossDefeated = false;
        state.endingShown = false;
        state.continueButton = undefined;
        continue;
      }
    }

    if (hitActionButton(controls.cycleButton, tx, ty, MOBILE_INPUT_CONFIG.buttonHitSlop) && state.unlockedElements.length > 1) {
      const idx = state.unlockedElements.indexOf(state.selectedElement);
      state.selectedElement = state.unlockedElements[(idx + 1) % state.unlockedElements.length];
      controls.cycleButton.active = true;
      Audio.playElementSwitch();
      continue;
    }

    if (hitActionButton(controls.jumpButton, tx, ty, MOBILE_INPUT_CONFIG.buttonHitSlop) && controls.jumpTouchId === null) {
      controls.jumpTouchId = touch.identifier;
      controls.jumpButton.active = true;
      state.keys.add(' ');
      continue;
    }

    if (hitActionButton(controls.dashButton, tx, ty, MOBILE_INPUT_CONFIG.buttonHitSlop) && controls.dashTouchId === null) {
      controls.dashTouchId = touch.identifier;
      controls.dashButton.active = true;
      controls.dashActive = true;
      state.dashBufferFrames = Math.max(state.dashBufferFrames, state.balanceCurve.dashBufferFrames);
      continue;
    }

    if (hitActionButton(controls.shootButton, tx, ty, MOBILE_INPUT_CONFIG.buttonHitSlop) && controls.shootTouchId === null) {
      controls.shootTouchId = touch.identifier;
      controls.shootButton.active = true;
      beginShootInput(controls, state);
      continue;
    }

    if (tx <= canvasW * MOBILE_INPUT_CONFIG.movementSideRatio && controls.dpadTouchId === null) {
      controls.dpadTouchId = touch.identifier;
      beginFloatingJoystick(controls, tx, ty);
      continue;
    }

    if (tx > canvasW * MOBILE_INPUT_CONFIG.movementSideRatio && controls.castTouchId === null) {
      controls.castTouchId = touch.identifier;
      controls.castActive = true;
      controls.castDragActive = true;
      controls.castButton.active = true;
      controls.castDragPos = { x: tx, y: ty };
      controls.castPosition = { x: tx, y: ty };
      controls.castButton.x = tx;
      controls.castButton.y = ty;
      setAimFromVector(state, state.stickman.facing, 0);
    }
  }
}

export function handleTouchMove(
  touches: Touch[],
  controls: TouchControlsState,
  state: GameState,
  canvas: HTMLCanvasElement,
  canvasW: number,
  canvasH: number,
  coordTransform?: (clientX: number, clientY: number, rect: DOMRect) => { x: number; y: number },
): void {
  const rect = canvas.getBoundingClientRect();
  const defaultTransform = (cx: number, cy: number, r: DOMRect) => ({
    x: (cx - r.left) * (canvasW / r.width),
    y: (cy - r.top) * (canvasH / r.height),
  });
  const toCanvas = coordTransform || defaultTransform;

  for (const touch of touches) {
    const { x: tx, y: ty } = toCanvas(touch.clientX, touch.clientY, rect);

    if (touch.identifier === controls.dpadTouchId) {
      updateFloatingJoystick(controls, tx, ty);
      continue;
    }

    if (touch.identifier === controls.castTouchId && controls.castActive) {
      controls.castDragActive = true;
      controls.castPosition = { x: tx, y: ty };
      setAimFromVector(state, tx - controls.castDragPos.x, ty - controls.castDragPos.y);
      continue;
    }
  }
}

export function handleTouchEnd(
  touches: Touch[],
  controls: TouchControlsState,
  state: GameState,
): void {
  for (const touch of touches) {
    if (touch.identifier === controls.dpadTouchId) {
      controls.dpadTouchId = null;
      releaseFloatingJoystick(controls);
    }

    if (touch.identifier === controls.castTouchId) {
      controls.castTouchId = null;
      controls.castActive = false;
      controls.castDragActive = false;
      controls.castButton.active = false;
      state.touchAimActive = false;
      state.aimAssistTargetId = undefined;
      state.aimAssistWeight = 0;
      // Note: We don't set state.isAiming = false here.
      // This allows the game loop to see state.isAiming === true AND state.touchAimActive === false
      // on the next frame, which triggers the projectile spawn in the 'aimToShoot' logic.
    }

    if (touch.identifier === controls.shootTouchId) {
      controls.shootTouchId = null;
      controls.shootButton.active = false;
      endShootInput(state);
    }

    if (touch.identifier === controls.jumpTouchId) {
      controls.jumpTouchId = null;
      controls.jumpButton.active = false;
      state.keys.delete(' ');
    }

    if (touch.identifier === controls.dashTouchId) {
      controls.dashTouchId = null;
      controls.dashButton.active = false;
      controls.dashActive = false;
    }
  }

  controls.cycleButton.active = false;
  controls.pauseButton.active = false;
}

export function renderTouchControls(
  ctx: CanvasRenderingContext2D,
  controls: TouchControlsState,
  state: GameState,
): void {
  if (!controls.visible) return;

  const runeColors: Record<Element, string> = {
    fire: '#ff6b2d',
    water: '#5fc4ff',
    earth: '#9c7a4d',
    wind: '#d8f1ff',
  };

  if (controls.lastElement !== state.selectedElement) {
    controls.lastElement = state.selectedElement;
    controls.elementFlashTimer = 280;
  }
  controls.elementFlashTimer = Math.max(0, controls.elementFlashTimer - 16);

  const aimActive = controls.castActive || controls.castDragActive;
  const shootGlow = state.buttonFireActive ? 0.55 : state.aimAssistWeight * 0.7;
  const dashProgress = getDashCooldownProgress(state);
  const aimCurrent = controls.castActive ? controls.castPosition : controls.castDragPos;

  ctx.save();
  const inputDir = controls.dpadDirection;
  const mag = Math.hypot(inputDir.x, inputDir.y);
  let renderDir = inputDir;
  if (mag > 0.35) {
    const cardinals = [
      { x: 0, y: -1 }, // up - wind
      { x: 1, y: 0 },  // fire
      { x: 0, y: 1 },  // earth
      { x: -1, y: 0 }, // water
    ];
    let best = { x: 0, y: 0 };
    let bestDot = -Infinity;
    for (const cand of cardinals) {
      const dot = (inputDir.x * cand.x + inputDir.y * cand.y) / Math.max(0.001, mag);
      if (dot > bestDot) {
        best = cand;
        bestDot = dot;
      }
    }
    const snapStrength = Math.min(1, (mag - 0.35) / 0.5) * 0.7;
    renderDir = {
      x: inputDir.x * (1 - snapStrength) + best.x * snapStrength,
      y: inputDir.y * (1 - snapStrength) + best.y * snapStrength,
    };
  }
  drawFloatingJoystick(ctx, controlAssets, controls.dpadCenter, renderDir, controls.dpadRadius, controls.dpadTouchId !== null);

  // Runic ability wheel behind the aim pad
  const wheelR = controls.castButton.radius * 1.08;
  const petals: Array<{ angle: number; color: string; element: Element; icon: () => void }> = [
    { angle: -Math.PI / 2, color: runeColors.wind, element: 'wind', icon: () => { ctx.beginPath(); ctx.moveTo(controls.castButton.x, controls.castButton.y - wheelR * 0.55); ctx.quadraticCurveTo(controls.castButton.x + 8, controls.castButton.y - wheelR * 0.85, controls.castButton.x, controls.castButton.y - wheelR * 0.2); ctx.fill(); } },
    { angle: 0, color: runeColors.fire, element: 'fire', icon: () => { ctx.beginPath(); ctx.ellipse(controls.castButton.x + wheelR * 0.55, controls.castButton.y, wheelR * 0.16, wheelR * 0.26, 0, 0, Math.PI * 2); ctx.fill(); } },
    { angle: Math.PI / 2, color: runeColors.earth, element: 'earth', icon: () => { ctx.beginPath(); ctx.moveTo(controls.castButton.x, controls.castButton.y + wheelR * 0.56); ctx.lineTo(controls.castButton.x - wheelR * 0.12, controls.castButton.y + wheelR * 0.2); ctx.lineTo(controls.castButton.x + wheelR * 0.12, controls.castButton.y + wheelR * 0.2); ctx.closePath(); ctx.fill(); } },
    { angle: Math.PI, color: runeColors.water, element: 'water', icon: () => { ctx.beginPath(); ctx.arc(controls.castButton.x - wheelR * 0.55, controls.castButton.y, wheelR * 0.16, Math.PI * 0.2, Math.PI * 1.8); ctx.stroke(); } },
  ];

  ctx.globalAlpha = aimActive ? 0.95 : 0.75;
  const stone = ctx.createLinearGradient(controls.castButton.x - wheelR, controls.castButton.y - wheelR, controls.castButton.x + wheelR, controls.castButton.y + wheelR);
  stone.addColorStop(0, '#2b2822'); stone.addColorStop(1, '#171511');
  ctx.fillStyle = stone;
  ctx.beginPath(); ctx.arc(controls.castButton.x, controls.castButton.y, wheelR, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(190, 213, 206, 0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(controls.castButton.x, controls.castButton.y, wheelR - 4, 0, Math.PI * 2); ctx.stroke();

  petals.forEach((p) => {
    ctx.save();
    const isSelected = p.element === state.selectedElement;
    const color = isSelected ? modulateHex(p.color, 1.5) : p.color;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.translate(controls.castButton.x, controls.castButton.y);
    ctx.rotate(p.angle);
    ctx.translate(-controls.castButton.x, -controls.castButton.y);
    p.icon();
    ctx.restore();
  });

  if (controls.elementFlashTimer > 0) {
    const alpha = Math.min(1, controls.elementFlashTimer / 280);
    ctx.save();
    ctx.globalAlpha = 0.5 * alpha;
    const color = runeColors[state.selectedElement];
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 + performance.now() * 0.002;
      const dist = wheelR + 6 + (i % 2) * 6;
      const px = controls.castButton.x + Math.cos(angle) * dist;
      const py = controls.castButton.y + Math.sin(angle) * dist;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  if (state.ultimateReady) {
    ctx.save();
    const glow = ctx.createRadialGradient(controls.castButton.x, controls.castButton.y, wheelR * 0.4, controls.castButton.x, controls.castButton.y, wheelR * 1.2);
    glow.addColorStop(0, 'rgba(255, 240, 200, 0.3)');
    glow.addColorStop(1, 'rgba(255, 180, 90, 0)');
    ctx.fillStyle = glow;
    ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(controls.castButton.x, controls.castButton.y, wheelR * 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255, 240, 200, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(controls.castButton.x, controls.castButton.y, wheelR * 1.3, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // Center stone with carved stickman
  drawActionButton(ctx, controlAssets, {
    x: controls.castButton.x,
    y: controls.castButton.y,
    radius: controls.castButton.radius * 0.78,
    color: '#c5b38d',
    iconKey: 'crosshair',
    fallbackLabel: '⚔',
    active: aimActive,
  });

  drawAimPad(
    ctx,
    controlAssets,
    controls.castDragPos,
    aimCurrent,
    controls.castButton.radius * 1.1,
    state.aimAssistWeight > 0 ? '#8dffdf' : controls.castButton.color,
    aimActive,
    state.aimAssistWeight,
  );

  drawActionButton(ctx, controlAssets, {
    x: controls.shootButton.x,
    y: controls.shootButton.y,
    radius: controls.shootButton.radius,
    color: state.aimAssistWeight > 0 ? '#8dffdf' : controls.shootButton.color,
    iconKey: controls.shootButton.iconKey,
    fallbackLabel: controls.shootButton.label,
    active: controls.shootButton.active || state.buttonFireActive,
    glow: shootGlow,
  });

  drawActionButton(ctx, controlAssets, {
    x: controls.jumpButton.x,
    y: controls.jumpButton.y,
    radius: controls.jumpButton.radius,
    color: controls.jumpButton.color,
    iconKey: controls.jumpButton.iconKey,
    fallbackLabel: controls.jumpButton.label,
    active: controls.jumpButton.active,
  });

  drawActionButton(ctx, controlAssets, {
    x: controls.dashButton.x,
    y: controls.dashButton.y,
    radius: controls.dashButton.radius,
    color: controls.dashButton.color,
    iconKey: controls.dashButton.iconKey,
    fallbackLabel: controls.dashButton.label,
    active: controls.dashButton.active,
    disabled: dashProgress < 1,
    cooldownProgress: dashProgress,
  });

  if (state.unlockedElements.length > 1) {
    drawActionButton(ctx, controlAssets, {
      x: controls.cycleButton.x,
      y: controls.cycleButton.y,
      radius: controls.cycleButton.radius,
      color: controls.cycleButton.color,
      iconKey: controls.cycleButton.iconKey,
      fallbackLabel: controls.cycleButton.label,
      active: controls.cycleButton.active,
    });
  }

  drawActionButton(ctx, controlAssets, {
    x: controls.pauseButton.x,
    y: controls.pauseButton.y,
    radius: controls.pauseButton.radius,
    color: controls.pauseButton.color,
    iconKey: controls.pauseButton.iconKey,
    fallbackLabel: 'II',
    active: controls.pauseButton.active,
  });

  controls.abilitySlots.forEach((slot) => {
    drawAbilitySlot(ctx, controlAssets, slot.x, slot.y, slot.radius);
  });
  ctx.restore();
}
