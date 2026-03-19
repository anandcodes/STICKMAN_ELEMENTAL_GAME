/**
 * Thumb Arc Mobile UI System
 * Professional mobile gaming layout for action games
 * Optimized for simultaneous multi-touch (movement + ability casting)
 */

import type { Element, GameState, Vec2 } from '../types';
import { DASH_BASE_COOLDOWN, DASH_MANA_COST } from '../constants';
import { ELEMENT_COLORS } from '../renderers/renderConstants';

export type ThumbArcButton = 'jump' | 'punch' | 'fire' | 'water' | 'earth' | 'wind' | 'dash' | 'pause';

export interface ThumbArcButtonState {
  id: ThumbArcButton;
  label: string;
  x: number;
  y: number;
  radius: number;
  isPressed: boolean;
  touchId: number | null;
  color: string;
  icon: string;
  cooldownProgress: number;
  isLocked: boolean;
}

export interface ThumbArcLayout {
  // Left side: Movement controls
  movementCenter: { x: number; y: number };
  movementRadius: number;
  movementTouchId: number | null;
  movementTouchPoint: Vec2;
  movementVector: Vec2;

  // Right side: Action buttons (Punch + 3 Elemental skills)
  actionButtons: Map<ThumbArcButton, ThumbArcButtonState>;

  // Display properties
  visible: boolean;
  opacity: number;
  safeZoneMargin: number;

  // Multi-touch tracking
  activePointers: Map<number, { button: ThumbArcButton; startTime: number }>;
}

type ThumbArcHitTarget = ThumbArcButton | 'movement';

const ELEMENT_BUTTONS: Element[] = ['fire', 'water', 'earth', 'wind'];
const ELEMENT_MANA_COSTS: Record<Element, number> = {
  fire: 8,
  water: 6,
  earth: 15,
  wind: 5,
};
const MAX_CAST_COOLDOWN_FRAMES = 40;

/**
 * Initialize the Thumb Arc layout for a given screen size
 * Positions movement controls on left, action buttons on right
 */
export function initializeThumbArcLayout(
  canvasWidth: number,
  canvasHeight: number,
): ThumbArcLayout {
  const safeZone = Math.max(canvasWidth, canvasHeight) * 0.032; // 3.2% margin
  const rightSafeX = canvasWidth - safeZone;
  const bottomSafeY = canvasHeight - safeZone;

  // Movement controls: Bottom-left quadrant
  const movementCenter = {
    x: canvasWidth * 0.2,
    y: canvasHeight * 0.75,
  };
  const movementRadius = Math.min(canvasWidth, canvasHeight) * 0.105;

  // Action buttons: Bottom-right arc arrangement
  const actionCenter = {
    x: rightSafeX - canvasWidth * 0.12,
    y: bottomSafeY - canvasHeight * 0.12,
  };
  const actionRadius = Math.min(canvasWidth, canvasHeight) * 0.082;
  const arcRadius = actionRadius * 3; // Distance from center to button centers

  const actionButtons: Map<ThumbArcButton, ThumbArcButtonState> = new Map([
    [
      'jump',
      {
        id: 'jump',
        label: 'JUMP',
        x: actionCenter.x,
        y: actionCenter.y,
        radius: actionRadius * 0.98,
        isPressed: false,
        touchId: null,
        color: '#7fe8ff',
        icon: '⬆️',
        cooldownProgress: 0,
        isLocked: false,
      },
    ],
    [
      'punch',
      {
        id: 'punch',
        label: 'PUNCH',
        x: actionCenter.x,
        y: actionCenter.y - arcRadius,
        radius: actionRadius,
        isPressed: false,
        touchId: null,
        color: '#ff9c54',
        icon: '👊',
        cooldownProgress: 0,
        isLocked: false,
      },
    ],
    [
      'fire',
      {
        id: 'fire',
        label: 'FIRE',
        x: actionCenter.x + arcRadius * 0.866, // sin(60°)
        y: actionCenter.y - arcRadius * 0.5, // cos(60°)
        radius: actionRadius,
        isPressed: false,
        touchId: null,
        color: ELEMENT_COLORS.fire,
        icon: '🔥',
        cooldownProgress: 0,
        isLocked: false,
      },
    ],
    [
      'water',
      {
        id: 'water',
        label: 'WATER',
        x: actionCenter.x + arcRadius * 0.866,
        y: actionCenter.y + arcRadius * 0.5,
        radius: actionRadius,
        isPressed: false,
        touchId: null,
        color: ELEMENT_COLORS.water,
        icon: '💧',
        cooldownProgress: 0,
        isLocked: false,
      },
    ],
    [
      'earth',
      {
        id: 'earth',
        label: 'EARTH',
        x: actionCenter.x,
        y: actionCenter.y + arcRadius,
        radius: actionRadius,
        isPressed: false,
        touchId: null,
        color: ELEMENT_COLORS.earth,
        icon: '🌍',
        cooldownProgress: 0,
        isLocked: false,
      },
    ],
    [
      'wind',
      {
        id: 'wind',
        label: 'WIND',
        x: actionCenter.x - arcRadius * 0.866,
        y: actionCenter.y + arcRadius * 0.5,
        radius: actionRadius,
        isPressed: false,
        touchId: null,
        color: ELEMENT_COLORS.wind,
        icon: '🌪️',
        cooldownProgress: 0,
        isLocked: false,
      },
    ],
    [
      'dash',
      {
        id: 'dash',
        label: 'DASH',
        x: actionCenter.x - arcRadius * 0.866,
        y: actionCenter.y - arcRadius * 0.5,
        radius: actionRadius,
        isPressed: false,
        touchId: null,
        color: '#62eeb8',
        icon: '⚡',
        cooldownProgress: 0,
        isLocked: false,
      },
    ],
  ]);

  return {
    movementCenter,
    movementRadius,
    movementTouchId: null,
    movementTouchPoint: { ...movementCenter },
    movementVector: { x: 0, y: 0 },
    actionButtons,
    visible: true,
    opacity: 0.75,
    safeZoneMargin: safeZone,
    activePointers: new Map(),
  };
}

/**
 * Check if touch point hits a button
 * Uses hit-slop for easier mobile targeting
 */
export function getHitButton(
  layout: ThumbArcLayout,
  touchX: number,
  touchY: number,
  hitSlop: number = 1.85,
): ThumbArcHitTarget | null {
  // Check action buttons (right side)
  for (const [buttonId, button] of layout.actionButtons) {
    const dx = touchX - button.x;
    const dy = touchY - button.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance <= button.radius * hitSlop) {
      return buttonId;
    }
  }

  // Check movement controls (left side)
  const dx = touchX - layout.movementCenter.x;
  const dy = touchY - layout.movementCenter.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance <= layout.movementRadius * hitSlop) {
    return 'movement';
  }

  return null;
}

/**
 * Handle touch start - register pointer and determine action
 */
export function handleThumbArcTouchStart(
  layout: ThumbArcLayout,
  touchId: number,
  touchX: number,
  touchY: number,
): ThumbArcButton | null {
  const hitButton = getHitButton(layout, touchX, touchY);

  if (hitButton === 'movement') {
    if (layout.movementTouchId === null) {
      layout.movementTouchId = touchId;
      updateMovementTouch(layout, touchX, touchY);
    }
    return null;
  }

  if (hitButton && layout.actionButtons.has(hitButton)) {
    const button = layout.actionButtons.get(hitButton)!;
    if (!button.isLocked && button.touchId === null) {
      button.isPressed = true;
      button.touchId = touchId;
      layout.activePointers.set(touchId, { button: hitButton, startTime: performance.now() });
      return hitButton;
    }
  }

  return null;
}

/**
 * Handle touch move - update button state if still active
 */
export function handleThumbArcTouchMove(
  layout: ThumbArcLayout,
  touchId: number,
  touchX: number,
  touchY: number,
): void {
  if (touchId === layout.movementTouchId) {
    updateMovementTouch(layout, touchX, touchY);
    return;
  }

  const pointerData = layout.activePointers.get(touchId);
  if (!pointerData) return;

  const button = layout.actionButtons.get(pointerData.button);
  if (!button) return;

  // Check if finger moved outside button radius (cancel press)
  const dx = touchX - button.x;
  const dy = touchY - button.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > button.radius * 2.0) {
    button.isPressed = false;
  } else {
    button.isPressed = true;
  }
}

/**
 * Handle touch end - deactivate button
 */
export function handleThumbArcTouchEnd(layout: ThumbArcLayout, touchId: number): void {
  if (touchId === layout.movementTouchId) {
    layout.movementTouchId = null;
    layout.movementTouchPoint = { ...layout.movementCenter };
    layout.movementVector = { x: 0, y: 0 };
    return;
  }

  const pointerData = layout.activePointers.get(touchId);
  if (!pointerData) return;

  const button = layout.actionButtons.get(pointerData.button);
  if (button) {
    button.isPressed = false;
    button.touchId = null;
  }

  layout.activePointers.delete(touchId);
}

/**
 * Update button states (cooldowns, locks, etc.)
 * Called once per frame
 */
export function updateThumbArcLayout(layout: ThumbArcLayout, state: GameState): void {
  for (const [buttonId, button] of layout.actionButtons) {
    // This project uses a shared cast cooldown and a stickman-local dash cooldown.
    if (ELEMENT_BUTTONS.includes(buttonId as Element)) {
      button.cooldownProgress = state.castCooldown / MAX_CAST_COOLDOWN_FRAMES;
    } else if (buttonId === 'dash') {
      button.cooldownProgress = state.stickman.dashCooldown / DASH_BASE_COOLDOWN;
    } else {
      button.cooldownProgress = 0;
    }

    // Clamp cooldown progress to [0, 1]
    button.cooldownProgress = Math.max(0, Math.min(1, button.cooldownProgress));

    // Lock buttons based on game state
    if (ELEMENT_BUTTONS.includes(buttonId as Element)) {
      const element = buttonId as Element;
      button.isLocked = !state.unlockedElements.includes(element)
        || state.stickman.mana < getElementManaCost(state, element);
    } else if (buttonId === 'dash') {
      button.isLocked = state.stickman.dashCooldown > 0 || state.stickman.mana < DASH_MANA_COST;
    } else {
      button.isLocked = false;
    }
  }
}

/**
 * Get movement direction from touch input
 * Returns normalized direction vector [-1, 1]
 */
export function getMovementDirection(
  layout: ThumbArcLayout,
  touchX: number,
  touchY: number,
): { x: number; y: number } {
  const dx = touchX - layout.movementCenter.x;
  const dy = touchY - layout.movementCenter.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < layout.movementRadius * 0.14) {
    // Dead zone
    return { x: 0, y: 0 };
  }

  const maxDistance = layout.movementRadius;
  const clampedDistance = Math.min(distance, maxDistance);
  const safeDistance = Math.max(distance, 1);

  return {
    x: (dx / safeDistance) * (clampedDistance / maxDistance),
    y: (dy / safeDistance) * (clampedDistance / maxDistance),
  };
}

export function getCurrentMovementDirection(layout: ThumbArcLayout): Vec2 {
  return { ...layout.movementVector };
}

/**
 * Check if a specific button is currently active
 */
export function isThumbArcButtonActive(layout: ThumbArcLayout, buttonId: ThumbArcButton): boolean {
  const button = layout.actionButtons.get(buttonId);
  return button?.isPressed ?? false;
}

/**
 * Reset all button states (useful for pause/unpause)
 */
export function resetThumbArcLayout(layout: ThumbArcLayout): void {
  for (const button of layout.actionButtons.values()) {
    button.isPressed = false;
    button.touchId = null;
  }
  layout.movementTouchId = null;
  layout.movementTouchPoint = { ...layout.movementCenter };
  layout.movementVector = { x: 0, y: 0 };
  layout.activePointers.clear();
}

function updateMovementTouch(layout: ThumbArcLayout, touchX: number, touchY: number): void {
  layout.movementTouchPoint = { x: touchX, y: touchY };
  layout.movementVector = getMovementDirection(layout, touchX, touchY);
}

function getElementManaCost(state: GameState, element: Element): number {
  const baseCost = ELEMENT_MANA_COSTS[element];
  if (state.activeRelics.some((relic) => relic.type === 'mana_flux')) {
    return baseCost * 0.7;
  }
  return baseCost;
}
