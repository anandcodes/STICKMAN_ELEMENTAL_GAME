import type { Vec2 } from '../types';
import { MOBILE_INPUT_CONFIG } from './config';
import { measureInputDistance } from './controlMath';
import { recordMobileInputDecision, recordMobileInputMetric } from './observability';
import type { MobileControlButton, MobileControlCommand } from './mobileCommandBus';

export type TouchOwner = 'movement' | 'aim' | MobileControlButton | 'free';

export interface GestureTouchPoint {
  id: number;
  x: number;
  y: number;
}

export interface GestureTouchTrace {
  owner: TouchOwner;
  start: Vec2;
  last: Vec2;
  startedAt: number;
  lastMovedAt: number;
  velocityX: number;
  velocityY: number;
  tapEligible: boolean;
  jumpSwipeConsumed: boolean;
  dropSwipeConsumed: boolean;
  dashCandidate: boolean;
}

export interface GestureHitCircle {
  x: number;
  y: number;
  radius: number;
}

export interface MobileGestureLayout {
  movementZoneTop: number;
  movementSideBoundary: number;
  aimSideBoundary: number;
  movementRadius: number;
  aimRadius: number;
  buttonHitSlop: number;
  jumpSwipeDistance: number;
  dropSwipeDistance: number;
  swipeDirectionBias: number;
  doubleTapWindowMs: number;
  doubleTapMaxDistance: number;
  swapLongPressMs: number;
  controlMode: 'dual_stick' | 'one_thumb';
  oneThumbJumpVelocity: number;
  oneThumbDashVelocity: number;
  oneThumbDashDistance: number;
  aimReleaseFireThreshold: number;
  pauseButton: GestureHitCircle;
  jumpButton: GestureHitCircle;
  attackButton: GestureHitCircle;
  swapButton: GestureHitCircle;
}

export interface MobileGestureState {
  traces: Map<number, GestureTouchTrace>;
  liveTouchIds: Set<number>;
  movementTouchId: number | null;
  aimTouchId: number | null;
  buttonTouchIds: Record<MobileControlButton, number | null>;
  swapHoldTouchId: number | null;
  lastTapAt: number;
  lastTapPos: Vec2 | null;
}

function setVec2(target: Vec2, x: number, y: number): void {
  target.x = x;
  target.y = y;
}

function hitCircle(circle: GestureHitCircle, x: number, y: number, slop: number): boolean {
  const dx = x - circle.x;
  const dy = y - circle.y;
  return dx * dx + dy * dy <= (circle.radius * slop) ** 2;
}

function createTrace(point: GestureTouchPoint, timestamp: number, layout: MobileGestureLayout): GestureTouchTrace {
  return {
    owner: 'free',
    start: { x: point.x, y: point.y },
    last: { x: point.x, y: point.y },
    startedAt: timestamp,
    lastMovedAt: timestamp,
    velocityX: 0,
    velocityY: 0,
    tapEligible: true,
    jumpSwipeConsumed: false,
    dropSwipeConsumed: false,
    dashCandidate: point.x <= layout.movementSideBoundary && point.y >= layout.movementZoneTop,
  };
}

function releaseTouchOwnership(
  state: MobileGestureState,
  touchId: number,
  layout: MobileGestureLayout,
  timestamp: number,
): MobileControlCommand[] {
  const commands: MobileControlCommand[] = [];
  const trace = state.traces.get(touchId);
  if (!trace) return commands;

  if (touchId === state.movementTouchId) {
    state.movementTouchId = null;
    commands.push({ type: 'movement_end', touchId });
    maybeQueueDash(commands, state, trace, layout, timestamp);
  }

  if (touchId === state.aimTouchId) {
    state.aimTouchId = null;
    const dx = trace.last.x - trace.start.x;
    const dy = trace.last.y - trace.start.y;
    let fire = measureInputDistance(dx, dy, MOBILE_INPUT_CONFIG.aimDeadZoneShape)
      >= layout.aimRadius * layout.aimReleaseFireThreshold;
    if (
      layout.controlMode === 'one_thumb'
      && Math.abs(trace.velocityX) >= layout.oneThumbDashVelocity
      && Math.abs(dx) >= layout.oneThumbDashDistance
      && Math.abs(dx) > Math.abs(dy) * layout.swipeDirectionBias
    ) {
      commands.push({ type: 'dash_trigger' });
      recordMobileInputDecision('one_thumb_dash', `vx=${trace.velocityX.toFixed(2)}`);
      fire = false;
    }
    commands.push({ type: 'aim_end', touchId, fire, x: trace.last.x, y: trace.last.y });
  }

  for (const button of ['jump', 'attack', 'swap', 'pause'] as const) {
    if (state.buttonTouchIds[button] !== touchId) continue;
    state.buttonTouchIds[button] = null;
    commands.push({ type: 'button_release', button, touchId });
    if (button === 'swap') {
      commands.push({ type: 'swap_hold_end', touchId });
      if (state.swapHoldTouchId === touchId) {
        state.swapHoldTouchId = null;
        const heldMs = timestamp - trace.startedAt;
        if (heldMs < layout.swapLongPressMs) {
          commands.push({ type: 'swap_tap' });
        }
      }
    }
  }

  if (trace.owner === 'free') {
    maybeQueueDash(commands, state, trace, layout, timestamp);
  }

  state.traces.delete(touchId);
  return commands;
}

function maybeQueueDash(
  commands: MobileControlCommand[],
  state: MobileGestureState,
  trace: GestureTouchTrace,
  layout: MobileGestureLayout,
  timestamp: number,
): void {
  if (!trace.dashCandidate || !trace.tapEligible) return;
  if (timestamp - trace.startedAt > MOBILE_INPUT_CONFIG.tapMaxDurationMs) return;

  if (
    state.lastTapPos
    && state.lastTapAt > 0
    && timestamp - state.lastTapAt <= layout.doubleTapWindowMs
  ) {
    const dx = trace.last.x - state.lastTapPos.x;
    const dy = trace.last.y - state.lastTapPos.y;
    if (dx * dx + dy * dy <= layout.doubleTapMaxDistance ** 2) {
      commands.push({ type: 'dash_trigger' });
      recordMobileInputDecision('dash_trigger', `dt=${timestamp - state.lastTapAt}`);
      state.lastTapAt = 0;
      state.lastTapPos = null;
      return;
    }
    recordMobileInputMetric('missed_dash_attempt');
    recordMobileInputDecision('dash_miss', `distance=${Math.sqrt(dx * dx + dy * dy).toFixed(1)}`);
  }

  state.lastTapAt = timestamp;
  state.lastTapPos = { x: trace.last.x, y: trace.last.y };
}

export function createMobileGestureState(): MobileGestureState {
  return {
    traces: new Map(),
    liveTouchIds: new Set(),
    movementTouchId: null,
    aimTouchId: null,
    buttonTouchIds: {
      jump: null,
      attack: null,
      swap: null,
      pause: null,
    },
    swapHoldTouchId: null,
    lastTapAt: 0,
    lastTapPos: null,
  };
}

export function syncActiveGestureTouches(
  state: MobileGestureState,
  activeTouches: readonly GestureTouchPoint[],
  layout: MobileGestureLayout,
  timestamp: number,
): MobileControlCommand[] {
  state.liveTouchIds.clear();
  for (const touch of activeTouches) {
    state.liveTouchIds.add(touch.id);
  }

  const commands: MobileControlCommand[] = [];
  for (const touchId of state.traces.keys()) {
    if (state.liveTouchIds.has(touchId)) continue;
    commands.push(...releaseTouchOwnership(state, touchId, layout, timestamp));
  }
  return commands;
}

export function recognizeGestureStart(
  state: MobileGestureState,
  layout: MobileGestureLayout,
  touches: readonly GestureTouchPoint[],
  timestamp: number,
): MobileControlCommand[] {
  const commands: MobileControlCommand[] = [];

  for (const touch of touches) {
    const trace = createTrace(touch, timestamp, layout);
    state.traces.set(touch.id, trace);

    if (hitCircle(layout.pauseButton, touch.x, touch.y, layout.buttonHitSlop) && state.buttonTouchIds.pause === null) {
      trace.owner = 'pause';
      state.buttonTouchIds.pause = touch.id;
      commands.push({ type: 'button_press', button: 'pause', touchId: touch.id }, { type: 'pause_toggle' });
      recordMobileInputDecision('button_press', 'pause');
      continue;
    }

    if (hitCircle(layout.jumpButton, touch.x, touch.y, layout.buttonHitSlop) && state.buttonTouchIds.jump === null) {
      trace.owner = 'jump';
      state.buttonTouchIds.jump = touch.id;
      commands.push({ type: 'button_press', button: 'jump', touchId: touch.id }, { type: 'jump_trigger', source: 'button' });
      recordMobileInputDecision('button_press', 'jump');
      continue;
    }

    if (hitCircle(layout.attackButton, touch.x, touch.y, layout.buttonHitSlop) && state.buttonTouchIds.attack === null) {
      trace.owner = 'attack';
      state.buttonTouchIds.attack = touch.id;
      commands.push({ type: 'button_press', button: 'attack', touchId: touch.id }, { type: 'attack_trigger', source: 'button' });
      recordMobileInputDecision('button_press', 'attack');
      continue;
    }

    if (hitCircle(layout.swapButton, touch.x, touch.y, layout.buttonHitSlop) && state.buttonTouchIds.swap === null) {
      trace.owner = 'swap';
      state.buttonTouchIds.swap = touch.id;
      state.swapHoldTouchId = touch.id;
      commands.push({ type: 'button_press', button: 'swap', touchId: touch.id }, { type: 'swap_hold_begin', touchId: touch.id });
      recordMobileInputDecision('button_press', 'swap');
      continue;
    }

    if (
      layout.controlMode === 'dual_stick'
      && touch.x <= layout.movementSideBoundary
      && touch.y >= layout.movementZoneTop
      && state.movementTouchId === null
    ) {
      trace.owner = 'movement';
      state.movementTouchId = touch.id;
      commands.push({ type: 'movement_start', touchId: touch.id, x: touch.x, y: touch.y });
      recordMobileInputDecision('owner_lock', `movement:${touch.id}`);
      continue;
    }

    const canClaimAim = layout.controlMode === 'one_thumb'
      ? state.aimTouchId === null
      : touch.x >= layout.aimSideBoundary && touch.y >= layout.movementZoneTop && state.aimTouchId === null;
    if (canClaimAim) {
      trace.owner = 'aim';
      state.aimTouchId = touch.id;
      commands.push({ type: 'aim_start', touchId: touch.id, x: touch.x, y: touch.y });
      recordMobileInputDecision('owner_lock', `aim:${touch.id}`);
    }
  }

  return commands;
}

export function recognizeGestureMove(
  state: MobileGestureState,
  layout: MobileGestureLayout,
  touches: readonly GestureTouchPoint[],
  timestamp: number,
): MobileControlCommand[] {
  const commands: MobileControlCommand[] = [];

  for (const touch of touches) {
    const trace = state.traces.get(touch.id);
    if (!trace) continue;

    const prevX = trace.last.x;
    const prevY = trace.last.y;
    const dt = Math.max(1, timestamp - trace.lastMovedAt);
    trace.velocityX = (touch.x - prevX) / dt;
    trace.velocityY = (touch.y - prevY) / dt;
    trace.lastMovedAt = timestamp;
    setVec2(trace.last, touch.x, touch.y);
    const dx = touch.x - trace.start.x;
    const dy = touch.y - trace.start.y;
    if (dx * dx + dy * dy > MOBILE_INPUT_CONFIG.tapMaxTravel ** 2) {
      trace.tapEligible = false;
    }

    if (touch.id === state.movementTouchId) {
      commands.push({ type: 'movement_move', touchId: touch.id, x: touch.x, y: touch.y });
      const verticalDominant = Math.abs(dy) > Math.abs(dx) * layout.swipeDirectionBias;
      if (!trace.jumpSwipeConsumed && dy <= -layout.jumpSwipeDistance && verticalDominant) {
        trace.jumpSwipeConsumed = true;
        commands.push({ type: 'jump_trigger', source: 'swipe' });
        recordMobileInputDecision('gesture_jump', 'movement_swipe');
      }
      if (!trace.dropSwipeConsumed && dy >= layout.dropSwipeDistance && verticalDominant) {
        trace.dropSwipeConsumed = true;
        commands.push({ type: 'drop_trigger' });
        recordMobileInputDecision('gesture_drop', 'movement_swipe');
      }
      continue;
    }

    if (touch.id === state.aimTouchId) {
      commands.push({ type: 'aim_move', touchId: touch.id, x: touch.x, y: touch.y });
      if (
        layout.controlMode === 'one_thumb'
        && !trace.jumpSwipeConsumed
        && dy <= -layout.jumpSwipeDistance * 0.75
        && Math.abs(trace.velocityY) >= layout.oneThumbJumpVelocity
        && Math.abs(dy) > Math.abs(dx) * layout.swipeDirectionBias
      ) {
        trace.jumpSwipeConsumed = true;
        commands.push({ type: 'jump_trigger', source: 'swipe' });
        recordMobileInputDecision('one_thumb_jump', `vy=${trace.velocityY.toFixed(2)}`);
      }
    }
  }

  return commands;
}

export function recognizeGestureEnd(
  state: MobileGestureState,
  layout: MobileGestureLayout,
  touches: readonly GestureTouchPoint[],
  timestamp: number,
): MobileControlCommand[] {
  const commands: MobileControlCommand[] = [];
  for (const touch of touches) {
    const trace = state.traces.get(touch.id);
    if (trace) {
      setVec2(trace.last, touch.x, touch.y);
      trace.lastMovedAt = timestamp;
    }
    commands.push(...releaseTouchOwnership(state, touch.id, layout, timestamp));
  }
  return commands;
}
