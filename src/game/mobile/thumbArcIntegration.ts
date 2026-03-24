/**
 * Thumb Arc -> Player controller bridge
 *
 * This layer is designed to be called once per render frame before the fixed-step
 * game update. It translates multi-touch UI state into player intent, preserves
 * movement while actions fire, and buffers tap actions so short mistimings are
 * still honored by the gameplay loop.
 */

import type { Element, GameState, Vec2 } from '../types';
import { DASH_MANA_COST } from '../constants';
import type { ThumbArcButton, ThumbArcLayout } from './thumbArc';
import { getCurrentMovementDirection, isThumbArcButtonActive } from './thumbArc';

export type PlayerLocomotionState = 'idle' | 'run' | 'airborne' | 'dash';

export interface ThumbArcInputState {
  movement: Vec2;
  jumpHeld: boolean;
  punchHeld: boolean;
  dashHeld: boolean;
  pauseHeld: boolean;
  elementHeld: Element | null;
}

export interface PlayerStateMachine {
  locomotion: PlayerLocomotionState;
  queueJump(): void;
  queueDash(): void;
  canTriggerElementSkill(element: Element): boolean;
  triggerElementSkill(element: Element): boolean;
  canTriggerPunch(): boolean;
  triggerPunch(): boolean;
}

export interface ThumbArcBufferConfig {
  skillBufferFrames: number;
  punchBufferFrames: number;
  onPunch?: (state: GameState) => boolean;
}

interface BufferedSkill {
  element: Element | null;
  framesRemaining: number;
}

type BufferedButtonKey = 'jump' | 'punch' | 'dash' | 'pause' | Element;

export interface ThumbArcBridgeState {
  previousButtons: Record<BufferedButtonKey, boolean>;
  pendingSkill: BufferedSkill;
  pendingPunchFrames: number;
  config: ThumbArcBufferConfig;
}

const DEFAULT_BUFFER_CONFIG: ThumbArcBufferConfig = {
  skillBufferFrames: 12,
  punchBufferFrames: 8,
};

const EDGE_BUTTONS: BufferedButtonKey[] = [
  'jump',
  'punch',
  'dash',
  'pause',
  'fire',
  'water',
  'earth',
  'wind',
];

const ELEMENT_MANA_COSTS: Record<Element, number> = {
  fire: 8,
  water: 6,
  earth: 15,
  wind: 5,
};

/**
 * Own one of these next to the Thumb Arc layout. Feed it through the bridge
 * each frame so tap actions can survive brief cooldown/landing mismatches.
 */
export function createThumbArcBridgeState(
  config: Partial<ThumbArcBufferConfig> = {},
): ThumbArcBridgeState {
  return {
    previousButtons: {
      jump: false,
      punch: false,
      dash: false,
      pause: false,
      fire: false,
      water: false,
      earth: false,
      wind: false,
    },
    pendingSkill: {
      element: null,
      framesRemaining: 0,
    },
    pendingPunchFrames: 0,
    config: {
      ...DEFAULT_BUFFER_CONFIG,
      ...config,
    },
  };
}

/**
 * Build a lightweight state-machine facade over the current player/runtime state.
 * Movement is intentionally independent from actions, so running can continue
 * while buffered jump/skill requests are consumed.
 */
export function createPlayerStateMachine(
  state: GameState,
  onPunch?: (state: GameState) => boolean,
): PlayerStateMachine {
  return {
    locomotion: resolveLocomotionState(state),
    queueJump() {
      state.stickman.jumpBufferTimer = Math.max(
        state.stickman.jumpBufferTimer,
        state.balanceCurve.jumpBufferFrames,
      );
    },
    queueDash() {
      state.dashBufferFrames = Math.max(
        state.dashBufferFrames,
        state.balanceCurve.dashBufferFrames,
      );
    },
    canTriggerElementSkill(element) {
      return canCastAbility(state, element);
    },
    triggerElementSkill(element) {
      if (!canCastAbility(state, element)) {
        return false;
      }

      state.selectedElement = element;
      state.shootQueued = true;
      state.buttonFireActive = true;
      return true;
    },
    canTriggerPunch() {
      return typeof onPunch === 'function';
    },
    triggerPunch() {
      if (typeof onPunch !== 'function') {
        return false;
      }
      return onPunch(state);
    },
  };
}

/**
 * Reads the current Thumb Arc state and returns a normalized snapshot.
 * The bridge handles edge detection and buffering on top of this held-state view.
 */
export function collectThumbArcInput(layout: ThumbArcLayout): ThumbArcInputState {
  let elementHeld: Element | null = null;
  for (const element of ['fire', 'water', 'earth', 'wind'] as const) {
    if (isThumbArcButtonActive(layout, element)) {
      elementHeld = element;
      break;
    }
  }

  return {
    movement: getCurrentMovementDirection(layout),
    jumpHeld: isThumbArcButtonActive(layout, 'jump'),
    punchHeld: isThumbArcButtonActive(layout, 'punch'),
    dashHeld: isThumbArcButtonActive(layout, 'dash'),
    pauseHeld: isThumbArcButtonActive(layout, 'pause'),
    elementHeld,
  };
}

/**
 * Main loop entry point.
 *
 * Call this once per render frame before the fixed `update(state)` step.
 * It will:
 * 1. Push left-pad movement into `moveInputX/moveInputY`
 * 2. Convert tap edges into jump/dash buffers that `playerSystem.ts` already consumes
 * 3. Buffer elemental skills/punch so brief timing mismatches do not drop the action
 */
export function applyThumbArcInputToGameState(
  state: GameState,
  input: ThumbArcInputState,
  bridge: ThumbArcBridgeState,
): PlayerStateMachine {
  state.moveInputX = clampAxis(input.movement.x);
  state.moveInputY = clampAxis(input.movement.y);

  const stateMachine = createPlayerStateMachine(state, bridge.config.onPunch);

  if (consumeJustPressed(bridge, 'jump', input.jumpHeld)) {
    stateMachine.queueJump();
  }

  if (consumeJustPressed(bridge, 'dash', input.dashHeld)) {
    stateMachine.queueDash();
  }

  if (consumeJustPressed(bridge, 'pause', input.pauseHeld)) {
    state.paused = !state.paused;
  }

  for (const element of ['fire', 'water', 'earth', 'wind'] as const) {
    const isHeld = input.elementHeld === element;
    if (consumeJustPressed(bridge, element, isHeld)) {
      bridge.pendingSkill = {
        element,
        framesRemaining: bridge.config.skillBufferFrames,
      };
    }
  }

  if (consumeJustPressed(bridge, 'punch', input.punchHeld)) {
    bridge.pendingPunchFrames = Math.max(
      bridge.pendingPunchFrames,
      bridge.config.punchBufferFrames,
    );
  }

  consumeBufferedSkill(stateMachine, bridge);
  consumeBufferedPunch(stateMachine, bridge);

  if (!input.elementHeld) {
    state.buttonFireActive = false;
  }

  return stateMachine;
}

export function resetThumbArcInput(
  input: ThumbArcInputState,
  bridge?: ThumbArcBridgeState,
): void {
  input.movement = { x: 0, y: 0 };
  input.jumpHeld = false;
  input.punchHeld = false;
  input.elementHeld = null;
  input.dashHeld = false;
  input.pauseHeld = false;

  if (bridge) {
    for (const button of EDGE_BUTTONS) {
      bridge.previousButtons[button] = false;
    }
    bridge.pendingSkill = { element: null, framesRemaining: 0 };
    bridge.pendingPunchFrames = 0;
  }
}

/**
 * Matches the projectile rules in `engine.ts`.
 */
export function canCastAbility(state: GameState, abilityId: ThumbArcButton): abilityId is Element {
  if (!isElementButton(abilityId)) {
    return false;
  }

  if (!state.unlockedElements.includes(abilityId)) {
    return false;
  }

  if (state.castCooldown > 0) {
    return false;
  }

  return state.stickman.mana >= getElementManaCost(state, abilityId);
}

export function drawThumbArcDebugInfo(
  ctx: CanvasRenderingContext2D,
  input: ThumbArcInputState,
  layout: ThumbArcLayout,
  bridge: ThumbArcBridgeState,
  x: number,
  y: number,
): void {
  const fontSize = 12;
  const lineHeight = fontSize + 2;
  let line = 0;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(x, y, 230, 166);

  ctx.fillStyle = '#00ff00';
  ctx.font = `bold ${fontSize}px monospace`;
  ctx.textAlign = 'left';

  const debugLines = [
    `Movement: [${input.movement.x.toFixed(2)}, ${input.movement.y.toFixed(2)}]`,
    `Jump: ${input.jumpHeld ? 'HELD' : 'idle'}`,
    `Punch Buffer: ${bridge.pendingPunchFrames}`,
    `Element Held: ${input.elementHeld ?? 'none'}`,
    `Element Buffer: ${bridge.pendingSkill.element ?? 'none'} (${bridge.pendingSkill.framesRemaining})`,
    `Dash: ${input.dashHeld ? 'HELD' : 'idle'}`,
    `Action Pointers: ${layout.activePointers.size}`,
    `Movement Active: ${layout.movementTouchId !== null ? 'YES' : 'no'}`,
  ];

  for (const text of debugLines) {
    ctx.fillText(text, x + 8, y + 15 + line * lineHeight);
    line++;
  }

  ctx.restore();
}

function resolveLocomotionState(state: GameState): PlayerLocomotionState {
  if (state.stickman.isDashing) {
    return 'dash';
  }
  if (!state.stickman.onGround) {
    return 'airborne';
  }
  if (Math.abs(state.moveInputX) >= 0.08) {
    return 'run';
  }
  return 'idle';
}

function clampAxis(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

function consumeJustPressed(
  bridge: ThumbArcBridgeState,
  button: BufferedButtonKey,
  isDown: boolean,
): boolean {
  const wasDown = bridge.previousButtons[button];
  bridge.previousButtons[button] = isDown;
  return isDown && !wasDown;
}

function consumeBufferedSkill(
  stateMachine: PlayerStateMachine,
  bridge: ThumbArcBridgeState,
): void {
  const { element, framesRemaining } = bridge.pendingSkill;
  if (!element || framesRemaining <= 0) {
    bridge.pendingSkill = { element: null, framesRemaining: 0 };
    return;
  }

  if (stateMachine.canTriggerElementSkill(element) && stateMachine.triggerElementSkill(element)) {
    bridge.pendingSkill = { element: null, framesRemaining: 0 };
    return;
  }

  bridge.pendingSkill.framesRemaining--;
  if (bridge.pendingSkill.framesRemaining <= 0) {
    bridge.pendingSkill = { element: null, framesRemaining: 0 };
  }
}

function consumeBufferedPunch(
  stateMachine: PlayerStateMachine,
  bridge: ThumbArcBridgeState,
): void {
  if (bridge.pendingPunchFrames <= 0) {
    bridge.pendingPunchFrames = 0;
    return;
  }

  if (stateMachine.canTriggerPunch() && stateMachine.triggerPunch()) {
    bridge.pendingPunchFrames = 0;
    return;
  }

  bridge.pendingPunchFrames--;
}

function isElementButton(button: ThumbArcButton): button is Element {
  return button === 'fire' || button === 'water' || button === 'earth' || button === 'wind';
}

function getElementManaCost(state: GameState, element: Element): number {
  const baseCost = ELEMENT_MANA_COSTS[element];
  if (state.activeRelics.some((relic) => relic.type === 'mana_flux')) {
    return baseCost * 0.7;
  }
  return baseCost;
}

export function getDashReady(state: GameState): boolean {
  return state.stickman.dashCooldown <= 0 && state.stickman.mana >= DASH_MANA_COST;
}
