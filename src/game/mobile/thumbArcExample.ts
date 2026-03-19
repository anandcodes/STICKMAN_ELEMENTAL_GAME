/**
 * Thumb Arc Integration Example
 * Shows how to wire the Thumb Arc UI into your game loop
 */

import type { GameState } from '../types';
import {
  initializeThumbArcLayout,
  handleThumbArcTouchStart,
  handleThumbArcTouchMove,
  handleThumbArcTouchEnd,
  updateThumbArcLayout,
  getMovementDirection,
} from './thumbArc';
import {
  collectThumbArcInput,
  applyThumbArcInputToGameState,
} from './thumbArcIntegration';
import { drawThumbArcUI, drawMovementVector } from './thumbArcRenderer';

/**
 * Example setup in your React App component
 */
export function setupThumbArcExample(
  canvasElement: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  gameStateRef: React.MutableRefObject<GameState>,
) {
  // Step 1: Initialize layout (do this once at app startup)
  const thumbArcLayout = initializeThumbArcLayout(canvasWidth, canvasHeight);

  // Step 2: Register touch event listeners
  function handleCanvasTouchStart(event: TouchEvent) {
    event.preventDefault(); // Prevent scrolling

    for (const touch of Array.from(event.touches)) {
      const rect = canvasElement.getBoundingClientRect();
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;

      // Register touch with Thumb Arc
      handleThumbArcTouchStart(thumbArcLayout, touch.identifier, touchX, touchY);
    }
  }

  function handleCanvasTouchMove(event: TouchEvent) {
    event.preventDefault();

    for (const touch of Array.from(event.touches)) {
      const rect = canvasElement.getBoundingClientRect();
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;

      // Update touch position in Thumb Arc
      handleThumbArcTouchMove(thumbArcLayout, touch.identifier, touchX, touchY);
    }
  }

  function handleCanvasTouchEnd(event: TouchEvent) {
    for (const touch of Array.from(event.changedTouches)) {
      // Deregister touch
      handleThumbArcTouchEnd(thumbArcLayout, touch.identifier);
    }
  }

  // Attach listeners
  canvasElement.addEventListener('touchstart', handleCanvasTouchStart, { passive: false });
  canvasElement.addEventListener('touchmove', handleCanvasTouchMove, { passive: false });
  canvasElement.addEventListener('touchend', handleCanvasTouchEnd, { passive: false });

  // Step 3: Create game loop function
  function gameLoopTick() {
    const state = gameStateRef.current;

    // Update Thumb Arc layout based on current game state
    // (This handles cooldowns, locked abilities, etc.)
    updateThumbArcLayout(thumbArcLayout, state);

    // Collect current input from Thumb Arc
    const thumbArcInput = collectThumbArcInput(thumbArcLayout);

    // Get movement direction for visualization (optional)
    const movementDir = getMovementDirection(
      thumbArcLayout,
      thumbArcLayout.movementCenter.x,
      thumbArcLayout.movementCenter.y,
    );

    // Apply input to game state (updates velocity, abilities, etc.)
    applyThumbArcInputToGameState(state, thumbArcLayout, thumbArcInput);

    // ... rest of game update logic (physics, AI, enemies, etc.)

    // Render game world
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    // renderGameScene(ctx, state);

    // Render Thumb Arc UI (on top)
    drawThumbArcUI(ctx, thumbArcLayout, state.frameCount);

    // Optional: Debug visualization
    if (false) {
      // Show movement direction vector
      drawMovementVector(ctx, thumbArcLayout, movementDir);
    }
  }

  // Return cleanup function
  return () => {
    canvasElement.removeEventListener('touchstart', handleCanvasTouchStart);
    canvasElement.removeEventListener('touchmove', handleCanvasTouchMove);
    canvasElement.removeEventListener('touchend', handleCanvasTouchEnd);
  };
}

/**
 * Advanced: Multi-finger input handling
 * Demonstrates how to handle complex simultaneous inputs
 */
export function advancedMultiTouchExample() {
  // Example: Player can press Punch while moving
  // The Thumb Arc will track both touches independently

  const example = `
  Frame 1: User touches movement pad with left thumb
    └─ Touch ID #1 registered on movement area
    └─ Movement vector starts updating

  Frame 2: User touches Punch button with right thumb (while still moving)
    └─ Touch ID #2 registered on punch button
    └─ Movement continues independently
    └─ Punch animation starts
    
  Frame 3: User drags movement pad to the right
    └─ Touch #1 updates with new position
    └─ Player velocity updates (right)
    └─ Touch #2 still active on punch
    
  Frame 4: User releases punch button
    └─ Touch #2 ends
    └─ Punch animation completes
    └─ Movement still active on touch #1
    
  Frame 5: User releases movement pad
    └─ Touch #1 ends
    └─ Movement stops
    └─ Player coasts to a stop
  `;

  console.log(example);
}

/**
 * Helper: Create input from Thumb Arc for testing
 */
export function createMockThumbArcInput() {
  return {
    movement: { x: 0.5, y: 0 }, // Moving right
    jumpPressed: false,
    punchPressed: true,
    abilityPressed: null,
    dashPressed: false,
    pausePressed: false,
  };
}

/**
 * Helper: Simulate touch events for testing/demonstration
 */
export function simulateTouchInput(
  layout: any,
  action: 'start' | 'move' | 'end',
  button: string,
  x: number,
  y: number,
) {
  const touchId = Math.random() * 1000;

  if (action === 'start') {
    handleThumbArcTouchStart(layout, touchId, x, y);
  } else if (action === 'move') {
    handleThumbArcTouchMove(layout, touchId, x, y);
  } else if (action === 'end') {
    handleThumbArcTouchEnd(layout, touchId);
  }
}

/**
 * Configuration: Customize button sizes and positions
 */
export const THUMB_ARC_CONFIG = {
  // Movement pad settings
  movementPadSize: 0.105, // Multiplier of screen size (10.5%)
  movementDeadZone: 0.14, // 14% dead zone radius
  movementHitSlop: 1.85, // 1.85x hit area for easier touch

  // Action buttons settings
  actionButtonSize: 0.082, // Multiplier of screen size (8.2%)
  actionButtonArcRadius: 3.0, // Distance from center to button (in radius units)
  actionButtonHitSlop: 1.85, // 1.85x hit area for easier touch

  // Layout settings
  safeMarginPercent: 0.032, // 3.2% margin from screen edges
  buttonSpacing: 24, // Gap between buttons

  // Animation settings
  buttonPressScale: 1.08, // Scale factor when pressed
  glowPulseDuration: 300, // Milliseconds for glow pulse
  cooldownUpdateFrequency: 30, // Update cooldown every N frames

  // Mobile optimization
  enableHapticFeedback: true, // Vibrate on button press
  useGPUAcceleration: true, // Use CSS transforms for smooth animation
};

export default {
  setupThumbArcExample,
  advancedMultiTouchExample,
  createMockThumbArcInput,
  simulateTouchInput,
  THUMB_ARC_CONFIG,
};
