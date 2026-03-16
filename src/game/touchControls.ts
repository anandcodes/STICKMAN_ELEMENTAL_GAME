import type { GameState } from './types';
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
}

const controlAssets: ControlAssetMap = {};

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

    if (hitActionButton(controls.pauseButton, tx, ty, MOBILE_INPUT_CONFIG.buttonHitSlop)) {
      controls.pauseButton.active = true;
      state.paused = !state.paused;
      if (state.paused) Audio.playPause(); else Audio.playUnpause();
      return;
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
      if (!state.buttonFireActive) {
        state.isAiming = false;
      }
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

  const aimActive = controls.castActive || controls.castDragActive;
  const shootGlow = state.buttonFireActive ? 0.55 : state.aimAssistWeight * 0.7;
  const dashProgress = getDashCooldownProgress(state);
  const aimCurrent = controls.castActive ? controls.castPosition : controls.castDragPos;

  ctx.save();
  drawFloatingJoystick(ctx, controlAssets, controls.dpadCenter, controls.dpadDirection, controls.dpadRadius, controls.dpadTouchId !== null);

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
