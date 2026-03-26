import type { Element, GameState, Vec2 } from './types';
import * as Audio from './audio';
import { MOBILE_INPUT_CONFIG, type MobileControlAssetKey } from './mobile/config';
import { setAimFromVector } from './mobile/aimSystem';
import { clamp01, measureInputDistance } from './mobile/controlMath';
import {
  getMobileInputObservabilitySnapshot,
  recordMobileInputDecision,
  recordMobileInputMetric,
} from './mobile/observability';
import type { InputContact } from './mobile/pointerBridge';
import {
  getEffectiveButtonHitSlop,
  getEffectiveControlsScale,
  getEffectiveDoubleTapMaxDistance,
  getEffectiveDoubleTapWindowMs,
  getEffectiveDropSwipeDistance,
  getEffectiveJumpSwipeDistance,
  getEffectiveSwapLongPressMs,
  getEffectiveAimVelocityLerp,
} from './mobile/runtimeConfig';
import { drawActionButton, drawAimPad, drawFloatingJoystick, type ControlAssetMap } from './mobile/uiFeedback';
import {
  applyMovementFromStick,
  beginDynamicStick,
  createDynamicStick,
  queueBufferedAttack,
  queueBufferedDash,
  queueBufferedJump,
  queuePlatformDrop,
  releaseDynamicStick,
  stepDynamicStick,
  updateDynamicStick,
  type DynamicStickController,
} from './mobile/inputManager';
import {
  createCachedCanvasRect,
  type CachedCanvasRect,
  computeMobileLayout,
  type LayoutProfile,
  measureSafeAreaInsets,
  type MobileLayoutMetrics,
  type SafeAreaInsets,
  updateCachedCanvasRect,
} from './mobile/mobileLayout';
import {
  createMobileCommandBusState,
  drainMobileCommands,
  enqueueMobileCommands,
  type MobileCommandBusState,
} from './mobile/mobileCommandBus';
import {
  createMobileGestureState,
  recognizeGestureEnd,
  recognizeGestureMove,
  recognizeGestureStart,
  syncActiveGestureTouches,
  type GestureTouchPoint,
  type GestureTouchTrace,
  type MobileGestureLayout,
  type MobileGestureState,
} from './mobile/mobileGestures';

export type TouchTrace = GestureTouchTrace;

export interface TouchControl {
  id: string;
  x: number;
  y: number;
  radius: number;
  label: string;
  color: string;
  iconKey?: MobileControlAssetKey;
  active: boolean;
  touchId: number | null;
  flashFrames: number;
  renderScale: number;
  renderOpacity: number;
}

export interface TouchControlsState {
  visible: boolean;
  layoutProfile: LayoutProfile;
  safeAreaInsets: SafeAreaInsets;
  canvasRect: CachedCanvasRect;
  layoutMetrics: MobileLayoutMetrics | null;
  gestureState: MobileGestureState;
  commandBus: MobileCommandBusState;
  movementStick: DynamicStickController;
  aimStick: DynamicStickController;
  leftDock: Vec2;
  rightDock: Vec2;
  touchTraces: Map<number, TouchTrace>;
  movementZoneTop: number;
  jumpButton: TouchControl;
  attackButton: TouchControl;
  swapButton: TouchControl;
  pauseButton: TouchControl;
  swapHoldTouchId: number | null;
  swapLongPressActive: boolean;
  swapLongPressProgress: number;
  swapRadialSelection: Element | null;
  movementDeadZoneArmed: boolean;
  aimDeadZoneArmed: boolean;
  observabilityLastSampleMs: number;
  aimVelocityFactor: number;
}

const controlAssets: ControlAssetMap = {};
const ELEMENT_ORDER: Element[] = ['fire', 'water', 'earth', 'wind'];
const ELEMENT_COLORS: Record<Element, string> = {
  fire: '#ff7d48',
  water: '#5fc4ff',
  earth: '#b89359',
  wind: '#d6fbff',
};
const ELEMENT_LABELS: Record<Element, string> = {
  fire: 'F',
  water: 'W',
  earth: 'E',
  wind: 'A',
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function setVec2(target: Vec2, x: number, y: number): void {
  target.x = x;
  target.y = y;
}

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function defaultButton(
  id: string,
  label: string,
  color: string,
  iconKey?: MobileControlAssetKey,
): TouchControl {
  return {
    id,
    label,
    color,
    iconKey,
    x: 0,
    y: 0,
    radius: 24,
    active: false,
    touchId: null,
    flashFrames: 0,
    renderScale: 1,
    renderOpacity: 0.88,
  };
}

function createFallbackLayout(canvasW: number, canvasH: number): MobileLayoutMetrics {
  return computeMobileLayout(canvasW, canvasH, canvasW, canvasH, 1, measureSafeAreaInsets());
}

function buildGestureLayout(controls: TouchControlsState, canvasW: number): MobileGestureLayout {
  return {
    movementZoneTop: controls.movementZoneTop,
    movementSideBoundary: canvasW * MOBILE_INPUT_CONFIG.movementSideRatio,
    aimSideBoundary: canvasW * MOBILE_INPUT_CONFIG.aimSideStartRatio,
    movementRadius: controls.movementStick.radius,
    aimRadius: controls.aimStick.radius,
    buttonHitSlop: MOBILE_INPUT_CONFIG.buttonHitSlop,
    jumpSwipeDistance: MOBILE_INPUT_CONFIG.jumpSwipeDistance,
    dropSwipeDistance: MOBILE_INPUT_CONFIG.dropSwipeDistance,
    swipeDirectionBias: MOBILE_INPUT_CONFIG.swipeDirectionBias,
    doubleTapWindowMs: MOBILE_INPUT_CONFIG.doubleTapWindowMs,
    doubleTapMaxDistance: MOBILE_INPUT_CONFIG.doubleTapMaxDistance,
    swapLongPressMs: MOBILE_INPUT_CONFIG.swapLongPressMs,
    controlMode: 'dual_stick',
    oneThumbJumpVelocity: 0.34,
    oneThumbDashVelocity: 0.46,
    oneThumbDashDistance: 44,
    aimReleaseFireThreshold: MOBILE_INPUT_CONFIG.aimReleaseFireDeadZone,
    pauseButton: controls.pauseButton,
    jumpButton: controls.jumpButton,
    attackButton: controls.attackButton,
    swapButton: controls.swapButton,
  };
}

function touchPointFrom(
  controls: TouchControlsState,
  touch: InputContact,
  canvasW: number,
  canvasH: number,
  coordTransform?: (clientX: number, clientY: number, rect: DOMRect | CachedCanvasRect) => { x: number; y: number },
): GestureTouchPoint {
  const rect = controls.canvasRect;
  const mapped = coordTransform
    ? coordTransform(touch.clientX, touch.clientY, rect)
    : {
      x: (touch.clientX - rect.left) * (canvasW / rect.width),
      y: (touch.clientY - rect.top) * (canvasH / rect.height),
    };
  return { id: touch.identifier, x: mapped.x, y: mapped.y };
}

function ensureCanvasRectCached(
  controls: TouchControlsState,
  canvas: HTMLCanvasElement,
): void {
  if (controls.canvasRect.width > 1 && controls.canvasRect.height > 1) return;
  updateCachedCanvasRect(controls.canvasRect, canvas.getBoundingClientRect());
}

function buildFallbackActivePoints(
  controls: TouchControlsState,
  changedTouchIds: Set<number>,
  changedPoints?: readonly GestureTouchPoint[],
): GestureTouchPoint[] {
  const active: GestureTouchPoint[] = [];
  for (const [id, trace] of controls.gestureState.traces) {
    if (changedTouchIds.has(id)) continue;
    active.push({ id, x: trace.last.x, y: trace.last.y });
  }
  if (changedPoints) {
    for (const point of changedPoints) {
      active.push(point);
    }
  }
  return active;
}

function mapActiveTouches(
  controls: TouchControlsState,
  activeTouches: readonly InputContact[] | undefined,
  changedTouches: readonly InputContact[],
  changedPoints: readonly GestureTouchPoint[],
  canvas: HTMLCanvasElement,
  canvasW: number,
  canvasH: number,
  coordTransform?: (clientX: number, clientY: number, rect: DOMRect | CachedCanvasRect) => { x: number; y: number },
): GestureTouchPoint[] {
  ensureCanvasRectCached(controls, canvas);
  if (!activeTouches) {
    const changedIds = new Set(changedTouches.map((touch) => touch.identifier));
    return buildFallbackActivePoints(controls, changedIds, changedPoints);
  }
  const points: GestureTouchPoint[] = [];
  for (const touch of activeTouches) {
    points.push(touchPointFrom(controls, touch, canvasW, canvasH, coordTransform));
  }
  return points;
}

function mapChangedTouches(
  controls: TouchControlsState,
  touches: readonly InputContact[],
  canvas: HTMLCanvasElement,
  canvasW: number,
  canvasH: number,
  coordTransform?: (clientX: number, clientY: number, rect: DOMRect | CachedCanvasRect) => { x: number; y: number },
): GestureTouchPoint[] {
  ensureCanvasRectCached(controls, canvas);
  const points: GestureTouchPoint[] = [];
  for (const touch of touches) {
    points.push(touchPointFrom(controls, touch, canvasW, canvasH, coordTransform));
  }
  return points;
}

function applyAimPointToState(
  state: GameState,
  controls: TouchControlsState,
  x: number,
  y: number,
  snapToRelease = false,
): void {
  const rawDx = x - controls.aimStick.anchor.x;
  const rawDy = y - controls.aimStick.anchor.y;
  const rawMagnitude = measureInputDistance(rawDx, rawDy, MOBILE_INPUT_CONFIG.aimDeadZoneShape);
  if (rawMagnitude < controls.aimStick.radius * MOBILE_INPUT_CONFIG.aimDeadZone) {
    state.touchAimActive = false;
    state.aimAssistTargetId = undefined;
    state.aimAssistWeight = 0;
    state.isAiming = false;
    return;
  }

  const planarSpeed = Math.sqrt(state.stickman.vx * state.stickman.vx + state.stickman.vy * state.stickman.vy);
  const targetVelocityFactor = 1 + Math.min(
    MOBILE_INPUT_CONFIG.aimVelocitySensitivityBoost,
    (planarSpeed / MOBILE_INPUT_CONFIG.aimVelocitySensitivityMaxSpeed) * MOBILE_INPUT_CONFIG.aimVelocitySensitivityBoost,
  );
  controls.aimVelocityFactor += (targetVelocityFactor - controls.aimVelocityFactor) * getEffectiveAimVelocityLerp(state);
  if (snapToRelease) {
    state.touchAimActive = false;
  }
  setAimFromVector(state, rawDx * controls.aimVelocityFactor, rawDy * controls.aimVelocityFactor);
}

function cycleElement(state: GameState): boolean {
  if (state.unlockedElements.length <= 1) return false;
  const idx = state.unlockedElements.indexOf(state.selectedElement);
  state.selectedElement = state.unlockedElements[(idx + 1) % state.unlockedElements.length];
  Audio.playElementSwitch();
  return true;
}

function applyQueuedControlCommands(
  controls: TouchControlsState,
  state: GameState,
): void {
  const commands = drainMobileCommands(controls.commandBus);
  if (commands.length === 0) return;

  for (const command of commands) {
    switch (command.type) {
      case 'pause_toggle':
        state.paused = !state.paused;
        flashButton(controls.pauseButton);
        if (state.paused) Audio.playPause(); else Audio.playUnpause();
        break;
      case 'button_press':
        getButtonState(controls, command.button).touchId = command.touchId;
        getButtonState(controls, command.button).active = true;
        flashButton(getButtonState(controls, command.button));
        break;
      case 'button_release':
        getButtonState(controls, command.button).touchId = null;
        getButtonState(controls, command.button).active = false;
        break;
      case 'movement_start':
        controls.movementStick.touchId = command.touchId;
        beginDynamicStick(controls.movementStick, command.x, command.y);
        break;
      case 'movement_move':
        if (controls.movementStick.touchId === command.touchId) {
          updateDynamicStick(controls.movementStick, command.x, command.y);
        }
        break;
      case 'movement_end':
        if (controls.movementStick.touchId === command.touchId) {
          controls.movementStick.touchId = null;
          releaseDynamicStick(controls.movementStick);
        }
        break;
      case 'aim_start':
        controls.aimStick.touchId = command.touchId;
        beginDynamicStick(controls.aimStick, command.x, command.y);
        recordMobileInputMetric('aim_session_start');
        break;
      case 'aim_move':
        if (controls.aimStick.touchId === command.touchId) {
          updateDynamicStick(controls.aimStick, command.x, command.y);
          if (!controls.swapLongPressActive) {
            applyAimPointToState(state, controls, command.x, command.y);
          }
        }
        break;
      case 'aim_end':
        if (controls.aimStick.touchId === command.touchId) {
          if (command.fire) {
            applyAimPointToState(state, controls, command.x, command.y, true);
          }
          controls.aimStick.touchId = null;
          releaseDynamicStick(controls.aimStick);
        }
        if (!command.fire) {
          recordMobileInputMetric('canceled_aim');
          recordMobileInputDecision('aim_cancel', `touch=${command.touchId}`);
        }
        state.touchAimActive = false;
        state.aimAssistTargetId = undefined;
        state.aimAssistWeight = 0;
        state.isAiming = false;
        if (command.fire) {
          if (state.mobileControlMode === 'one_thumb') {
            recordMobileInputMetric('one_thumb_attack_release');
          }
          flashButton(controls.attackButton);
          queueBufferedAttack(state);
        }
        break;
      case 'jump_trigger':
        if (state.mobileControlMode === 'one_thumb') {
          recordMobileInputMetric('one_thumb_jump_trigger');
        }
        flashButton(controls.jumpButton);
        queueBufferedJump(state);
        break;
      case 'attack_trigger':
        flashButton(controls.attackButton);
        queueBufferedAttack(state);
        break;
      case 'dash_trigger':
        recordMobileInputMetric('dash_trigger');
        if (controls.aimStick.touchId !== null) {
          recordMobileInputMetric('dash_false_positive');
        }
        if (state.mobileControlMode === 'one_thumb') {
          recordMobileInputMetric('one_thumb_dash_trigger');
        }
        queueBufferedDash(state);
        break;
      case 'drop_trigger':
        if (state.mobileControlMode === 'one_thumb') {
          recordMobileInputMetric('one_thumb_platform_drop_error');
        }
        queuePlatformDrop(state);
        break;
      case 'swap_hold_begin':
        controls.swapHoldTouchId = command.touchId;
        controls.swapLongPressActive = false;
        controls.swapLongPressProgress = 0;
        controls.swapRadialSelection = state.selectedElement;
        break;
      case 'swap_hold_end':
        if (controls.swapHoldTouchId === command.touchId) {
          if (controls.swapLongPressActive) {
            const nextElement = controls.swapRadialSelection;
            if (nextElement && state.unlockedElements.includes(nextElement) && nextElement !== state.selectedElement) {
              state.selectedElement = nextElement;
              Audio.playElementSwitch();
              recordMobileInputMetric('swap_radial_selection');
            } else {
              recordMobileInputMetric('swap_radial_misselection');
              recordMobileInputDecision('swap_miss', String(nextElement ?? state.selectedElement));
            }
          }
          controls.swapHoldTouchId = null;
          controls.swapLongPressActive = false;
          controls.swapLongPressProgress = 0;
          controls.swapRadialSelection = null;
        }
        break;
      case 'swap_tap':
        flashButton(controls.swapButton);
        cycleElement(state);
        break;
    }
  }
}

function getButtonState(
  controls: TouchControlsState,
  button: 'jump' | 'attack' | 'swap' | 'pause',
): TouchControl {
  if (button === 'jump') return controls.jumpButton;
  if (button === 'attack') return controls.attackButton;
  if (button === 'swap') return controls.swapButton;
  return controls.pauseButton;
}

function updateSwapHoldState(controls: TouchControlsState, state: GameState): void {
  if (controls.swapHoldTouchId === null) {
    controls.swapLongPressProgress = 0;
    return;
  }

  const trace = controls.gestureState.traces.get(controls.swapHoldTouchId);
  if (!trace) {
    controls.swapHoldTouchId = null;
    controls.swapLongPressActive = false;
    controls.swapLongPressProgress = 0;
    controls.swapRadialSelection = null;
    return;
  }

  const heldMs = nowMs() - trace.startedAt;
  const longPressMs = getEffectiveSwapLongPressMs(state);
  controls.swapLongPressProgress = clamp(heldMs / longPressMs, 0, 1);
  if (!controls.swapLongPressActive && heldMs >= longPressMs) {
    controls.swapLongPressActive = true;
    controls.swapRadialSelection = state.selectedElement;
  }

  if (controls.swapLongPressActive) {
    controls.swapRadialSelection = getSwapRadialSelection(controls, state, trace.last);
  }
}

export function setControlAsset(key: MobileControlAssetKey, img: HTMLImageElement): void {
  controlAssets[key] = img;
}

export function setControlsAssets(assets: Partial<Record<MobileControlAssetKey, HTMLImageElement>>): void {
  Object.assign(controlAssets, assets);
}

export function createTouchControlsState(canvasW: number, canvasH: number): TouchControlsState {
  const fallbackLayout = createFallbackLayout(canvasW, canvasH);
  const gestureState = createMobileGestureState();
  return {
    visible: false,
    layoutProfile: fallbackLayout.profile,
    safeAreaInsets: fallbackLayout.safeArea,
    canvasRect: createCachedCanvasRect(canvasW, canvasH),
    layoutMetrics: fallbackLayout,
    gestureState,
    commandBus: createMobileCommandBusState(),
    movementStick: createDynamicStick(fallbackLayout.leftDock, fallbackLayout.stickRadius),
    aimStick: createDynamicStick(fallbackLayout.rightDock, fallbackLayout.aimRadius),
    leftDock: { ...fallbackLayout.leftDock },
    rightDock: { ...fallbackLayout.rightDock },
    touchTraces: gestureState.traces,
    movementZoneTop: fallbackLayout.movementZoneTop,
    jumpButton: defaultButton('jump', 'J', '#79e5ff', 'jump'),
    attackButton: defaultButton('attack', 'F', '#ff8e58', 'shoot'),
    swapButton: defaultButton('swap', 'S', '#7da9ff', 'cycle'),
    pauseButton: defaultButton('pause', 'P', '#ffffff', 'pause'),
    swapHoldTouchId: null,
    swapLongPressActive: false,
    swapLongPressProgress: 0,
    swapRadialSelection: null,
    movementDeadZoneArmed: false,
    aimDeadZoneArmed: false,
    observabilityLastSampleMs: nowMs(),
    aimVelocityFactor: 1,
  };
}

export function cacheTouchCanvasRect(controls: TouchControlsState, rect: DOMRect): void {
  updateCachedCanvasRect(controls.canvasRect, rect);
}

export function updateTouchControlsLayout(
  controls: TouchControlsState,
  state: GameState,
  canvasW: number,
  canvasH: number,
  viewW: number,
  viewH: number,
): void {
  const metrics = computeMobileLayout(
    canvasW,
    canvasH,
    viewW,
    viewH,
    getEffectiveControlsScale(state),
    measureSafeAreaInsets(),
  );
  controls.layoutMetrics = metrics;
  controls.layoutProfile = metrics.profile;
  controls.safeAreaInsets = metrics.safeArea;
  controls.movementZoneTop = metrics.movementZoneTop;
  setVec2(controls.leftDock, metrics.leftDock.x, metrics.leftDock.y);
  setVec2(controls.rightDock, metrics.rightDock.x, metrics.rightDock.y);

  controls.attackButton.radius = metrics.attackButton.radius;
  controls.attackButton.x = metrics.attackButton.x;
  controls.attackButton.y = metrics.attackButton.y;
  controls.swapButton.radius = metrics.swapButton.radius;
  controls.swapButton.x = metrics.swapButton.x;
  controls.swapButton.y = metrics.swapButton.y;
  controls.jumpButton.radius = metrics.jumpButton.radius;
  controls.jumpButton.x = metrics.jumpButton.x;
  controls.jumpButton.y = metrics.jumpButton.y;
  controls.pauseButton.radius = metrics.pauseButton.radius;
  controls.pauseButton.x = metrics.pauseButton.x;
  controls.pauseButton.y = metrics.pauseButton.y;
  controls.movementStick.radius = metrics.stickRadius;
  controls.aimStick.radius = metrics.aimRadius;

  if (controls.movementStick.touchId === null && controls.movementStick.visibleAlpha === 0) {
    setVec2(controls.movementStick.anchor, controls.leftDock.x, controls.leftDock.y);
    setVec2(controls.movementStick.current, controls.leftDock.x, controls.leftDock.y);
  }

  if (controls.aimStick.touchId === null && controls.aimStick.visibleAlpha === 0) {
    setVec2(controls.aimStick.anchor, controls.rightDock.x, controls.rightDock.y);
    setVec2(controls.aimStick.current, controls.rightDock.x, controls.rightDock.y);
  }
}

export function updateTouchControlsInput(controls: TouchControlsState, state: GameState): void {
  applyQueuedControlCommands(controls, state);
  stepDynamicStick(controls.movementStick);
  stepDynamicStick(controls.aimStick);

  if (!controls.visible || state.screen !== 'playing' || state.paused || state.showLevelIntro) {
    state.moveInputX = 0;
    state.moveInputY = 0;
    state.buttonFireActive = false;
    state.touchAimActive = false;
    state.isAiming = false;
    return;
  }

  if (state.mobileControlMode === 'one_thumb') {
    const aimAxis = controls.aimStick.touchId !== null ? controls.aimStick.vector.x : state.stickman.facing;
    state.moveInputX = Math.abs(aimAxis) > 0.12 ? Math.sign(aimAxis) : state.stickman.facing;
    state.moveInputY = 0;
  } else {
    applyMovementFromStick(state, controls.movementStick);
  }
  updateSwapHoldState(controls, state);
  trackDeadZoneExits(controls);
  trackDeadZoneStalls(controls);

  state.buttonFireActive = false;
  animateButton(controls.jumpButton);
  animateButton(controls.attackButton);
  animateButton(controls.swapButton);
  animateButton(controls.pauseButton);
}

export function isMobileDevice(): boolean {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mobileControls') === '1') return true;
  }
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || ('ontouchstart' in window)
    || (navigator.maxTouchPoints > 0);
}

export function handleTouchStart(
  touches: InputContact[],
  controls: TouchControlsState,
  state: GameState,
  canvas: HTMLCanvasElement,
  canvasW: number,
  canvasH: number,
  coordTransform?: (clientX: number, clientY: number, rect: DOMRect | CachedCanvasRect) => { x: number; y: number },
  activeTouches?: InputContact[],
): void {
  const changedPoints = mapChangedTouches(controls, touches, canvas, canvasW, canvasH, coordTransform);
  const activePoints = mapActiveTouches(controls, activeTouches, touches, changedPoints, canvas, canvasW, canvasH, coordTransform);
  const timestamp = nowMs();
  const layout = buildGestureLayoutForState(controls, state, canvasW);
  enqueueMobileCommands(controls.commandBus, syncActiveGestureTouches(controls.gestureState, activePoints, layout, timestamp));
  enqueueMobileCommands(controls.commandBus, recognizeGestureStart(controls.gestureState, layout, changedPoints, timestamp));
  applyQueuedControlCommands(controls, state);
}

export function handleTouchMove(
  touches: InputContact[],
  controls: TouchControlsState,
  state: GameState,
  canvas: HTMLCanvasElement,
  canvasW: number,
  canvasH: number,
  coordTransform?: (clientX: number, clientY: number, rect: DOMRect | CachedCanvasRect) => { x: number; y: number },
  activeTouches?: InputContact[],
): void {
  const changedPoints = mapChangedTouches(controls, touches, canvas, canvasW, canvasH, coordTransform);
  const activePoints = mapActiveTouches(controls, activeTouches, touches, changedPoints, canvas, canvasW, canvasH, coordTransform);
  const timestamp = nowMs();
  const layout = buildGestureLayoutForState(controls, state, canvasW);
  enqueueMobileCommands(controls.commandBus, syncActiveGestureTouches(controls.gestureState, activePoints, layout, timestamp));
  enqueueMobileCommands(controls.commandBus, recognizeGestureMove(controls.gestureState, layout, changedPoints, timestamp));
  applyQueuedControlCommands(controls, state);
}

export function handleTouchEnd(
  touches: InputContact[],
  controls: TouchControlsState,
  state: GameState,
  canvas?: HTMLCanvasElement,
  canvasW?: number,
  canvasH?: number,
  coordTransform?: (clientX: number, clientY: number, rect: DOMRect | CachedCanvasRect) => { x: number; y: number },
  activeTouches?: InputContact[],
): void {
  const timestamp = nowMs();
  const resolvedCanvasW = canvasW ?? 1200;
  const resolvedCanvasH = canvasH ?? 700;
  const layout = buildGestureLayoutForState(controls, state, resolvedCanvasW);
  updateSwapHoldState(controls, state);
  const endedPoints = canvas
    ? mapChangedTouches(controls, touches, canvas, resolvedCanvasW, resolvedCanvasH, coordTransform)
    : touches.map((touch) => ({
      id: touch.identifier,
      x: controls.gestureState.traces.get(touch.identifier)?.last.x ?? 0,
      y: controls.gestureState.traces.get(touch.identifier)?.last.y ?? 0,
    }));
  const activePoints = activeTouches
    ? activeTouches.map((touch) => ({
      id: touch.identifier,
      x: controls.gestureState.traces.get(touch.identifier)?.last.x ?? 0,
      y: controls.gestureState.traces.get(touch.identifier)?.last.y ?? 0,
    }))
    : buildFallbackActivePoints(controls, new Set(touches.map((touch) => touch.identifier)));

  enqueueMobileCommands(controls.commandBus, recognizeGestureEnd(controls.gestureState, layout, endedPoints, timestamp));
  enqueueMobileCommands(controls.commandBus, syncActiveGestureTouches(controls.gestureState, activePoints, layout, timestamp));
  applyQueuedControlCommands(controls, state);
}

export function resetTouchControlsState(controls: TouchControlsState, state?: GameState): void {
  controls.gestureState = createMobileGestureState();
  controls.touchTraces = controls.gestureState.traces;
  controls.commandBus.queue.length = 0;
  controls.movementStick.touchId = null;
  controls.aimStick.touchId = null;
  releaseDynamicStick(controls.movementStick);
  releaseDynamicStick(controls.aimStick);
  controls.movementStick.visibleAlpha = 0;
  controls.aimStick.visibleAlpha = 0;
  controls.jumpButton.active = false;
  controls.jumpButton.touchId = null;
  controls.attackButton.active = false;
  controls.attackButton.touchId = null;
  controls.swapButton.active = false;
  controls.swapButton.touchId = null;
  controls.pauseButton.active = false;
  controls.pauseButton.touchId = null;
  controls.swapHoldTouchId = null;
  controls.swapLongPressActive = false;
  controls.swapLongPressProgress = 0;
  controls.swapRadialSelection = null;
  controls.movementDeadZoneArmed = false;
  controls.aimDeadZoneArmed = false;
  controls.observabilityLastSampleMs = nowMs();
  controls.aimVelocityFactor = 1;

  if (state) {
    state.moveInputX = 0;
    state.moveInputY = 0;
    state.touchAimActive = false;
    state.aimAssistTargetId = undefined;
    state.aimAssistWeight = 0;
    state.buttonFireActive = false;
    state.isAiming = false;
  }
}

export function renderTouchControls(
  ctx: CanvasRenderingContext2D,
  controls: TouchControlsState,
  state: GameState,
): void {
  if (!controls.visible) return;

  const attackGlow = state.attackBufferFrames > 0 ? 0.38 : state.aimAssistWeight * 0.7;
  const attackCooldownProgress = state.castCooldown > 0
    ? clamp01(1 - state.castCooldown / MOBILE_INPUT_CONFIG.attackCooldownVisualFrames)
    : 1;

  drawFloatingJoystick(
    ctx,
    controlAssets,
    controls.movementStick.anchor,
    controls.movementStick.vector,
    controls.movementStick.radius,
    controls.movementStick.touchId !== null,
    controls.movementStick.visibleAlpha,
    controls.movementStick.activationPulse,
  );

  drawFloatingJoystick(
    ctx,
    controlAssets,
    controls.aimStick.anchor,
    controls.aimStick.vector,
    controls.aimStick.radius,
    controls.aimStick.touchId !== null,
    controls.aimStick.visibleAlpha,
    controls.aimStick.activationPulse,
  );

  if (controls.aimStick.visibleAlpha > 0.04) {
    const current = {
      x: controls.aimStick.anchor.x + controls.aimStick.vector.x * controls.aimStick.radius * 1.1,
      y: controls.aimStick.anchor.y + controls.aimStick.vector.y * controls.aimStick.radius * 1.1,
    };
    drawAimPad(
      ctx,
      controlAssets,
      controls.aimStick.anchor,
      current,
      controls.aimStick.radius * 0.92,
      state.aimAssistWeight > 0 ? '#8dffdf' : '#6ad2ff',
      controls.aimStick.touchId !== null,
      state.aimAssistWeight,
      controls.aimStick.touchId !== null
        ? Math.max(controls.aimStick.visibleAlpha, MOBILE_INPUT_CONFIG.aimIndicatorActiveOpacity)
        : Math.max(controls.aimStick.visibleAlpha * 0.6, MOBILE_INPUT_CONFIG.aimIndicatorIdleOpacity),
    );
  }

  drawActionButton(ctx, controlAssets, {
    x: controls.jumpButton.x,
    y: controls.jumpButton.y,
    radius: controls.jumpButton.radius,
    color: controls.jumpButton.color,
    iconKey: controls.jumpButton.iconKey,
    fallbackLabel: controls.jumpButton.label,
    active: isButtonVisuallyActive(controls.jumpButton),
    opacity: controls.jumpButton.renderOpacity,
    scale: controls.jumpButton.renderScale,
  });

  drawActionButton(ctx, controlAssets, {
    x: controls.attackButton.x,
    y: controls.attackButton.y,
    radius: controls.attackButton.radius,
    color: state.aimAssistWeight > 0 ? '#8dffdf' : controls.attackButton.color,
    iconKey: controls.attackButton.iconKey,
    fallbackLabel: controls.attackButton.label,
    active: isButtonVisuallyActive(controls.attackButton),
    cooldownProgress: attackCooldownProgress,
    glow: attackGlow,
    opacity: controls.attackButton.renderOpacity,
    scale: controls.attackButton.renderScale,
  });

  drawActionButton(ctx, controlAssets, {
    x: controls.swapButton.x,
    y: controls.swapButton.y,
    radius: controls.swapButton.radius,
    color: controls.swapButton.color,
    iconKey: controls.swapButton.iconKey,
    fallbackLabel: controls.swapButton.label,
    active: isButtonVisuallyActive(controls.swapButton),
    glow: controls.swapLongPressProgress * 0.32,
    opacity: controls.swapButton.renderOpacity,
    scale: controls.swapButton.renderScale,
  });

  drawActionButton(ctx, controlAssets, {
    x: controls.pauseButton.x,
    y: controls.pauseButton.y,
    radius: controls.pauseButton.radius,
    color: '#efefe9',
    iconKey: controls.pauseButton.iconKey,
    fallbackLabel: controls.pauseButton.label,
    active: isButtonVisuallyActive(controls.pauseButton),
    opacity: 0.72,
    scale: controls.pauseButton.renderScale,
  });

  if (controls.swapLongPressActive) {
    drawSwapRadialMenu(ctx, controls, state);
  }

  if (state.mobileDebugOverlay) {
    drawMobileDebugOverlay(ctx, controls, state);
  }
}

function animateButton(button: TouchControl): void {
  const visualActive = isButtonVisuallyActive(button);
  if (button.flashFrames > 0) {
    button.flashFrames--;
  }
  const targetScale = visualActive ? 0.92 : 1;
  const targetOpacity = visualActive ? 0.98 : 0.86;
  button.renderScale += (targetScale - button.renderScale) * 0.34;
  button.renderOpacity += (targetOpacity - button.renderOpacity) * 0.28;
}

function flashButton(button: TouchControl): void {
  button.flashFrames = 6;
}

function isButtonVisuallyActive(button: TouchControl): boolean {
  return button.active || button.flashFrames > 0;
}

function getSwapRadialSelection(
  controls: TouchControlsState,
  state: GameState,
  point: Vec2,
): Element | null {
  const available = ELEMENT_ORDER.filter((element) => state.unlockedElements.includes(element));
  if (available.length === 0) return null;

  const dx = point.x - controls.swapButton.x;
  const dy = point.y - controls.swapButton.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const innerRadius = controls.swapButton.radius * MOBILE_INPUT_CONFIG.radialMenuDeadZoneFactor;
  const outerRadius = controls.swapButton.radius * MOBILE_INPUT_CONFIG.radialMenuOuterFactor;
  if (distance < innerRadius || distance > outerRadius) {
    return state.selectedElement;
  }

  const startAngle = getSwapRadialStartAngle(available.length);
  const normalized = normalizeAngle(Math.atan2(dy, dx) - startAngle);
  const slice = (Math.PI * 2) / available.length;
  const index = Math.floor(normalized / slice) % available.length;
  return available[index];
}

function buildGestureLayoutForState(
  controls: TouchControlsState,
  state: GameState,
  canvasW: number,
): MobileGestureLayout {
  return {
    ...buildGestureLayout(controls, canvasW),
    buttonHitSlop: getEffectiveButtonHitSlop(state),
    jumpSwipeDistance: getEffectiveJumpSwipeDistance(state),
    dropSwipeDistance: getEffectiveDropSwipeDistance(state),
    doubleTapWindowMs: getEffectiveDoubleTapWindowMs(state),
    doubleTapMaxDistance: getEffectiveDoubleTapMaxDistance(state),
    swapLongPressMs: getEffectiveSwapLongPressMs(state),
    controlMode: state.mobileControlMode,
  };
}

function trackDeadZoneExits(controls: TouchControlsState): void {
  const movementMagnitude = measureInputDistance(
    controls.movementStick.vector.x,
    controls.movementStick.vector.y,
    MOBILE_INPUT_CONFIG.joystickDeadZoneShape,
  );
  const movementActive = movementMagnitude >= MOBILE_INPUT_CONFIG.joystickDeadZone;
  if (movementActive && !controls.movementDeadZoneArmed) {
    controls.movementDeadZoneArmed = true;
    recordMobileInputMetric('dead_zone_exit');
  } else if (!movementActive) {
    controls.movementDeadZoneArmed = false;
  }

  const aimMagnitude = measureInputDistance(
    controls.aimStick.vector.x,
    controls.aimStick.vector.y,
    MOBILE_INPUT_CONFIG.aimDeadZoneShape,
  );
  const aimActive = aimMagnitude >= MOBILE_INPUT_CONFIG.aimDeadZone;
  if (aimActive && !controls.aimDeadZoneArmed) {
    controls.aimDeadZoneArmed = true;
    recordMobileInputMetric('dead_zone_exit');
  } else if (!aimActive) {
    controls.aimDeadZoneArmed = false;
  }
}

function trackDeadZoneStalls(controls: TouchControlsState): void {
  const currentMs = nowMs();
  const dt = Math.max(0, currentMs - controls.observabilityLastSampleMs);
  controls.observabilityLastSampleMs = currentMs;
  if (dt === 0) return;

  const movementMagnitude = measureInputDistance(
    controls.movementStick.vector.x,
    controls.movementStick.vector.y,
    MOBILE_INPUT_CONFIG.joystickDeadZoneShape,
  );
  if (controls.movementStick.touchId !== null && movementMagnitude < MOBILE_INPUT_CONFIG.joystickDeadZone) {
    recordMobileInputMetric('movement_dead_zone_stall_ms', dt);
  }

  const aimMagnitude = measureInputDistance(
    controls.aimStick.vector.x,
    controls.aimStick.vector.y,
    MOBILE_INPUT_CONFIG.aimDeadZoneShape,
  );
  if (controls.aimStick.touchId !== null && aimMagnitude < MOBILE_INPUT_CONFIG.aimDeadZone) {
    recordMobileInputMetric('aim_dead_zone_stall_ms', dt);
  }
}

function drawMobileDebugOverlay(
  ctx: CanvasRenderingContext2D,
  controls: TouchControlsState,
  state: GameState,
): void {
  const snapshot = getMobileInputObservabilitySnapshot();
  const x = 20;
  const y = 110;
  const width = 290;
  const height = 240;

  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = 'rgba(6, 13, 24, 0.82)';
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = 'rgba(120, 215, 255, 0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);

  ctx.fillStyle = '#e9f7ff';
  ctx.font = '600 14px "Rajdhani", sans-serif';
  ctx.fillText('MOBILE INPUT DEBUG', x + 12, y + 20);

  const rows = [
    `mode: ${state.mobileControlMode} / ${state.mobileAccessibilityPreset}`,
    `move: ${controls.movementStick.vector.x.toFixed(2)}, ${controls.movementStick.vector.y.toFixed(2)}`,
    `aim: ${controls.aimStick.vector.x.toFixed(2)}, ${controls.aimStick.vector.y.toFixed(2)}`,
    `owners: m=${controls.movementStick.touchId ?? '-'} a=${controls.aimStick.touchId ?? '-'}`,
    `buttons: j=${controls.jumpButton.touchId ?? '-'} atk=${controls.attackButton.touchId ?? '-'} sw=${controls.swapButton.touchId ?? '-'} p=${controls.pauseButton.touchId ?? '-'}`,
    `buffers: atk=${state.attackBufferFrames} dash=${state.dashBufferFrames} drop=${state.platformDropFrames}`,
    `assist: ${state.aimAssistWeight.toFixed(2)} angle=${state.aimAngle?.toFixed(2) ?? '-'}`,
  ];

  ctx.fillStyle = '#bfe5f7';
  ctx.font = '500 12px "Rajdhani", sans-serif';
  rows.forEach((row, index) => {
    ctx.fillText(row, x + 12, y + 42 + index * 18);
  });

  ctx.fillStyle = '#92ffe0';
  ctx.fillText(
    `metrics: dz=${snapshot.counters.dead_zone_exit} aimX=${snapshot.counters.canceled_aim} dashMiss=${snapshot.counters.missed_dash_attempt}`,
    x + 12,
    y + 160,
  );
  ctx.fillText(
    `buffer q/s/e=${snapshot.counters.buffered_attack_queued}/${snapshot.counters.buffered_attack_success}/${snapshot.counters.buffered_attack_expired}`,
    x + 12,
    y + 178,
  );
  ctx.fillText(
    `summary: aimC=${snapshot.summary.aimCancelRatio.toFixed(2)} dashF=${snapshot.summary.dashFalsePositiveRate.toFixed(2)} atk=${snapshot.summary.bufferedAttackSuccessRate.toFixed(2)}`,
    x + 12,
    y + 196,
  );

  ctx.fillStyle = '#f9d78b';
  snapshot.recentDecisions.slice(-2).forEach((entry, index) => {
    ctx.fillText(`${entry.label}: ${entry.detail}`, x + 12, y + 214 + index * 14);
  });
  ctx.restore();
}

function getSwapRadialStartAngle(optionCount: number): number {
  return optionCount === 2 ? Math.PI / 2 : -Math.PI / 2;
}

function normalizeAngle(angle: number): number {
  let next = angle;
  while (next < 0) next += Math.PI * 2;
  while (next >= Math.PI * 2) next -= Math.PI * 2;
  return next;
}

function drawSwapRadialMenu(
  ctx: CanvasRenderingContext2D,
  controls: TouchControlsState,
  state: GameState,
): void {
  const available = ELEMENT_ORDER.filter((element) => state.unlockedElements.includes(element));
  if (available.length === 0) return;

  const cx = controls.swapButton.x;
  const cy = controls.swapButton.y;
  const orbit = controls.swapButton.radius * 2.45;
  const slice = (Math.PI * 2) / available.length;
  const startAngle = getSwapRadialStartAngle(available.length);

  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = 'rgba(9, 18, 32, 0.46)';
  ctx.beginPath();
  ctx.arc(cx, cy, orbit + controls.swapButton.radius * 0.85, 0, Math.PI * 2);
  ctx.fill();

  available.forEach((element, index) => {
    const angle = startAngle + slice * index;
    const x = cx + Math.cos(angle) * orbit;
    const y = cy + Math.sin(angle) * orbit;
    const selected = element === controls.swapRadialSelection;
    drawActionButton(ctx, controlAssets, {
      x,
      y,
      radius: controls.swapButton.radius * 0.8,
      color: selected ? lightenColor(ELEMENT_COLORS[element], 1.12) : ELEMENT_COLORS[element],
      fallbackLabel: ELEMENT_LABELS[element],
      active: selected,
      opacity: selected ? 0.98 : 0.84,
      scale: selected ? 1.04 : 0.96,
    });
  });

  ctx.restore();
}

function lightenColor(hex: string, factor: number): string {
  const h = hex.replace('#', '');
  const r = clamp(Math.round(parseInt(h.slice(0, 2), 16) * factor), 0, 255);
  const g = clamp(Math.round(parseInt(h.slice(2, 4), 16) * factor), 0, 255);
  const b = clamp(Math.round(parseInt(h.slice(4, 6), 16) * factor), 0, 255);
  return `rgb(${r}, ${g}, ${b})`;
}
