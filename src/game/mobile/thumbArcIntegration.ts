/**
 * Thumb Arc Integration with Game State
 * Maps touch input to character actions, handling multi-touch simultaneously
 */

import type { GameState } from '../types';
import type { ThumbArcLayout, ThumbArcButton } from './thumbArc';
import { isThumbArcButtonActive } from './thumbArc';

export interface ThumbArcInputState {
  movement: { x: number; y: number };
  jumpPressed: boolean;
  punchPressed: boolean;
  abilityPressed: ThumbArcButton | null;
  dashPressed: boolean;
  pausePressed: boolean;
}

/**
 * Update game state based on Thumb Arc input
 * Called once per game frame
 *
 * This is the critical function that maps UI input to character actions
 * Multi-touch is handled naturally: separate touch IDs can be active simultaneously
 */
export function applyThumbArcInputToGameState(
  state: GameState,
  layout: ThumbArcLayout,
  input: ThumbArcInputState,
): void {
  // Movement: Apply direction to player
  if (Math.abs(input.movement.x) > 0.1 || Math.abs(input.movement.y) > 0.1) {
    state.playerVelocityX = input.movement.x * state.maxSpeed;
    // Y movement could be used for climbing/swimming if needed
  } else {
    // Gentle deceleration when no input
    state.playerVelocityX *= 0.95;
  }

  // Jump: One-frame pulse (prevents continuous jumping)
  if (input.jumpPressed && !state.isJumping && state.isOnGround) {
    state.playerVelocityY = -state.jumpForce;
    state.isJumping = true;
    state.jumpFrames = 0;
  }

  // Abilities: Only one ability can be "casting" at a time
  // But input can come from different touch pointers
  if (input.abilityPressed && !state.isCasting) {
    const elementMap: Record<string, any> = {
      fire: 'fire',
      water: 'water',
      earth: 'earth',
      wind: 'wind',
    };

    const element = elementMap[input.abilityPressed];
    if (element) {
      state.selectedElement = element;
      state.isCasting = true;
      state.castingFrames = 0;
      state.mana -= 10;
    }
  }

  // Dash: Quick movement in current facing direction
  if (input.dashPressed && !state.isDashing && state.dashCooldown <= 0) {
    state.isDashing = true;
    state.dashFrames = 0;
    state.playerVelocityX = Math.sign(state.playerVelocityX || 1) * state.maxSpeed * 2;
    state.dashCooldown = 90; // 1.5s at 60fps
  }

  // Punch: Melee attack
  if (input.punchPressed && !state.isPunching && state.punchCooldown <= 0) {
    state.isPunching = true;
    state.punchFrames = 0;
    state.punchCooldown = 15; // 0.25s at 60fps
  }
}

/**
 * Collect current input from Thumb Arc layout
 * This reads the button states and returns normalized input
 */
export function collectThumbArcInput(layout: ThumbArcLayout): ThumbArcInputState {
  // Determine which ability button is currently pressed (if any)
  let abilityPressed: ThumbArcButton | null = null;
  for (const buttonId of ['fire', 'water', 'earth', 'wind'] as ThumbArcButton[]) {
    if (isThumbArcButtonActive(layout, buttonId)) {
      abilityPressed = buttonId;
      break; // Only process first ability press
    }
  }

  return {
    movement: { x: 0, y: 0 }, // Updated separately by movement touch handler
    jumpPressed: isThumbArcButtonActive(layout, 'jump'),
    punchPressed: isThumbArcButtonActive(layout, 'punch'),
    abilityPressed,
    dashPressed: isThumbArcButtonActive(layout, 'dash'),
    pausePressed: isThumbArcButtonActive(layout, 'pause'),
  };
}

/**
 * Reset input state when game is paused/unpaused
 */
export function resetThumbArcInput(input: ThumbArcInputState): void {
  input.movement = { x: 0, y: 0 };
  input.jumpPressed = false;
  input.punchPressed = false;
  input.abilityPressed = null;
  input.dashPressed = false;
  input.pausePressed = false;
}

/**
 * Validate that an ability can be cast given current game state
 * Checks: mana, cooldown, ability unlocked, etc.
 */
export function canCastAbility(state: GameState, abilityId: ThumbArcButton): boolean {
  if (!['fire', 'water', 'earth', 'wind'].includes(abilityId)) {
    return false;
  }

  // Check if ability is unlocked
  const abilityUnlocked = state.unlockedElements?.includes(abilityId as any) ?? true;
  if (!abilityUnlocked) {
    return false;
  }

  // Check cooldown
  const cooldownMap: Record<string, number> = {
    fire: state.fireSkillCooldown,
    water: state.waterSkillCooldown,
    earth: state.earthSkillCooldown,
    wind: state.windSkillCooldown,
  };

  if ((cooldownMap[abilityId] ?? 0) > 0) {
    return false;
  }

  // Check mana
  if (state.mana < 10) {
    return false;
  }

  return true;
}

/**
 * Create a debug visualization of the input state
 * Useful for debugging multi-touch issues
 */
export function drawThumbArcDebugInfo(
  ctx: CanvasRenderingContext2D,
  input: ThumbArcInputState,
  layout: ThumbArcLayout,
  x: number,
  y: number,
): void {
  const fontSize = 12;
  const lineHeight = fontSize + 2;
  let line = 0;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(x, y, 200, 150);

  ctx.fillStyle = '#00ff00';
  ctx.font = `bold ${fontSize}px monospace`;
  ctx.textAlign = 'left';

  const debugLines = [
    `Movement: [${input.movement.x.toFixed(2)}, ${input.movement.y.toFixed(2)}]`,
    `Jump: ${input.jumpPressed ? 'YES' : 'no'}`,
    `Punch: ${input.punchPressed ? 'YES' : 'no'}`,
    `Ability: ${input.abilityPressed ?? 'none'}`,
    `Dash: ${input.dashPressed ? 'YES' : 'no'}`,
    `Active Pointers: ${layout.activePointers.size}`,
  ];

  for (const text of debugLines) {
    ctx.fillText(text, x + 8, y + 15 + line * lineHeight);
    line++;
  }

  ctx.restore();
}
