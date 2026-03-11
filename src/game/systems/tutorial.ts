/**
 * Tutorial System – Phase 1: Player Onboarding
 *
 * Provides a step-by-step guided tutorial for the first 4 levels:
 *   Level 1: Movement basics (walk, jump, platform traversal)
 *   Level 2: Element introduction (switch, cast, burn crates)
 *   Level 3: Dash ability (dash, i-frames, dodge obstacles)
 *   Level 4: Elemental interaction puzzles (water + plants, fire + pits)
 *
 * Each level gets a sequence of TutorialSteps. The engine checks completion
 * conditions every frame and advances to the next step automatically.
 */

import type { GameState, TutorialStep } from '../types';

// ─── Step Definitions ────────────────────────────────────────────────────────

export function createTutorialSteps(level: number): TutorialStep[] {
  switch (level) {
    case 0: return level1Steps();
    case 1: return level2Steps();
    case 2: return level3Steps();
    case 3: return level4Steps();
    default: return []; // No tutorial for later levels
  }
}

/**
 * Level 1 (Forest Awakening): Movement basics
 * - Walk right/left, jump, climb platform, collect gem, reach portal
 * Match: Level has ground at y:580, platform at (250,460), gem at (270,440)
 */
function level1Steps(): TutorialStep[] {
  return [
    {
      action: 'move_right',
      promptDesktop: '→  Press D or → to move right',
      promptMobile: '→  Use the JOYSTICK to move right',
      completed: false,
      showArrow: false,
    },
    {
      action: 'move_left',
      promptDesktop: '←  Press A or ← to move left',
      promptMobile: '←  Push the JOYSTICK left',
      completed: false,
      showArrow: false,
    },
    {
      action: 'jump',
      promptDesktop: '⬆  Press W, ↑, or SPACE to jump',
      promptMobile: '⬆  Tap the JUMP button',
      completed: false,
      showArrow: false,
    },
    {
      action: 'jump_platform',
      promptDesktop: '🔼  Jump onto the stone platform!',
      promptMobile: '🔼  Jump onto the stone platform!',
      worldX: 320, worldY: 460, triggerRadius: 100,
      completed: false,
      showArrow: true,
    },
    {
      action: 'switch_fire',
      promptDesktop: '🔥  Press 1 to select Fire element',
      promptMobile: '🔥  Tap the FIRE button',
      element: 'fire',
      completed: false,
      showArrow: false,
    },
    {
      action: 'cast_fire',
      promptDesktop: '🔥  Click to cast a Fireball at the crates!',
      promptMobile: '🔥  Use the CAST area to throw a Fireball!',
      element: 'fire',
      worldX: 370, worldY: 540, triggerRadius: 200,
      completed: false,
      showArrow: true,
    },
    {
      action: 'collect_gem',
      promptDesktop: '💎  Collect gems to open the exit Portal!',
      promptMobile: '💎  Collect gems to open the exit Portal!',
      worldX: 270, worldY: 440, triggerRadius: 80,
      completed: false,
      showArrow: true,
    },
    {
      action: 'reach_portal',
      promptDesktop: '🌀  Keep exploring! Collect 5 gems and reach the Portal!',
      promptMobile: '🌀  Collect 5 gems and reach the Portal!',
      completed: false,
      showArrow: false,
    },
  ];
}

/**
 * Level 2 (Ice Caverns): Water element + ice mechanics
 * - Switch water, cast water, learn ice physics
 * Match: Level has ice blocks at (500,540)(850,540), puddles, water currents
 */
function level2Steps(): TutorialStep[] {
  return [
    {
      action: 'switch_water',
      promptDesktop: '💧  Press 2 to switch to Water element',
      promptMobile: '💧  Tap the WATER button to switch',
      element: 'water',
      completed: false,
      showArrow: false,
    },
    {
      action: 'cast_water',
      promptDesktop: '💧  Click to cast Water! Melt ice blocks in your path.',
      promptMobile: '💧  Cast Water to melt ice blocks!',
      element: 'water',
      worldX: 500, worldY: 540, triggerRadius: 200,
      completed: false,
      showArrow: true,
    },
    {
      action: 'none',
      promptDesktop: '🧊  Careful! Ice platforms are slippery – control your momentum!',
      promptMobile: '🧊  Ice platforms are slippery – control your momentum!',
      worldX: 750, worldY: 440, triggerRadius: 120,
      completed: false,
      showArrow: true,
    },
    {
      action: 'reach_portal',
      promptDesktop: '🌀  Master the ice and collect gems to reach the Portal!',
      promptMobile: '🌀  Collect gems and reach the Portal!',
      completed: false,
      showArrow: false,
    },
  ];
}

/**
 * Level 3 (Volcanic Forge): Dash ability
 * - Learn dash, dash through spikes
 * Match: Level has spikes at (420,580)(770,580), fire pits, fire spirits
 */
function level3Steps(): TutorialStep[] {
  return [
    {
      action: 'dash',
      promptDesktop: '💨  Press SHIFT to Dash! You are briefly invincible while dashing.',
      promptMobile: '💨  Tap the DASH button! You are briefly invincible.',
      completed: false,
      showArrow: false,
    },
    {
      action: 'dash_through',
      promptDesktop: '💨  Dash across the spike gap to avoid damage!',
      promptMobile: '💨  Dash over the spikes to stay safe!',
      worldX: 420, worldY: 570, triggerRadius: 200,
      completed: false,
      showArrow: true,
    },
    {
      action: 'switch_water',
      promptDesktop: '💧  Switch to Water (2) to extinguish fire pits and fight fire spirits!',
      promptMobile: '💧  Switch to Water to extinguish fire!',
      element: 'water',
      completed: false,
      showArrow: false,
    },
    {
      action: 'reach_portal',
      promptDesktop: '🌀  Use Dash to survive and reach the Portal!',
      promptMobile: '🌀  Dash, fight, and reach the Portal!',
      completed: false,
      showArrow: false,
    },
  ];
}

/**
 * Level 4 (Sky Fortress): Element interactions + wind zones
 * - Grow plants with water, ride wind zones
 * Match: Level has plants at (350,560)(580,560), wind zones at (600,350)
 */
function level4Steps(): TutorialStep[] {
  return [
    {
      action: 'grow_plant',
      promptDesktop: '🌱  Switch to Water (2) and shoot the plant to grow it!',
      promptMobile: '🌱  Switch to Water and shoot the plant!',
      worldX: 350, worldY: 555, triggerRadius: 200,
      element: 'water',
      completed: false,
      showArrow: true,
    },
    {
      action: 'none',
      promptDesktop: '🌪️  Step into the Wind Zone — it pushes you upward!',
      promptMobile: '🌪️  Step into the Wind Zone to fly up!',
      worldX: 640, worldY: 400, triggerRadius: 120,
      completed: false,
      showArrow: true,
    },
    {
      action: 'none',
      promptDesktop: '⚡  Switch elements with 1-4 to exploit enemy weaknesses!',
      promptMobile: '⚡  Switch elements to exploit enemy weaknesses!',
      worldX: 900, worldY: 350, triggerRadius: 150,
      completed: false,
      showArrow: false,
    },
    {
      action: 'reach_portal',
      promptDesktop: '🌀  You have learned all the basics! Reach the Portal!',
      promptMobile: '🌀  You know the basics! Reach the Portal!',
      completed: false,
      showArrow: false,
    },
  ];
}

// ─── Update Logic ────────────────────────────────────────────────────────────

/**
 * Called every frame during gameplay. Checks if the current tutorial step
 * has been completed and advances to the next one.
 */
export function updateTutorial(state: GameState): void {
  if (!state.tutorialActive || state.tutorialSteps.length === 0) return;
  if (state.tutorialStepIndex >= state.tutorialSteps.length) {
    state.tutorialActive = false;
    return;
  }

  const step = state.tutorialSteps[state.tutorialStepIndex];
  if (step.completed) {
    state.tutorialStepIndex++;
    return;
  }

  const s = state.stickman;
  const px = s.x + s.width / 2;
  const py = s.y + s.height / 2;

  switch (step.action) {
    case 'move_right':
      if (state.keys.has('d') || state.keys.has('arrowright')) {
        step.completed = true;
      }
      break;

    case 'move_left':
      if (state.keys.has('a') || state.keys.has('arrowleft')) {
        step.completed = true;
      }
      break;

    case 'jump':
      if (s.jumping || s.vy < -2) {
        step.completed = true;
      }
      break;

    case 'jump_platform':
      // Complete when player is on a platform above the ground
      if (step.worldY !== undefined && s.onGround && s.y < step.worldY) {
        step.completed = true;
      }
      break;

    case 'switch_fire':
      if (state.selectedElement === 'fire') {
        step.completed = true;
      }
      break;

    case 'cast_fire':
      if (state.selectedElement === 'fire' && state.projectiles.some(p => p.element === 'fire')) {
        step.completed = true;
      }
      break;

    case 'burn_crate':
      if (state.envObjects.some(o => o.type === 'crate' && (o.state === 'burning' || o.state === 'destroyed'))) {
        step.completed = true;
      }
      break;

    case 'collect_gem':
      if (state.gemsCollected > 0) {
        step.completed = true;
      }
      break;

    case 'dash':
      if (s.isDashing) {
        step.completed = true;
      }
      break;

    case 'dash_through':
      // Complete when player dashes past the spike area
      if (step.worldX !== undefined) {
        if (px > step.worldX + 60) {
          step.completed = true;
        }
      }
      break;

    case 'switch_water':
      if (state.selectedElement === 'water') {
        step.completed = true;
      }
      break;

    case 'cast_water':
      if (state.selectedElement === 'water' && state.projectiles.some(p => p.element === 'water')) {
        step.completed = true;
      }
      break;

    case 'grow_plant':
      if (state.envObjects.some(o => o.type === 'plant' && (o.growthLevel ?? 0) > 0)) {
        step.completed = true;
      }
      break;

    case 'reach_portal':
      // This step auto-completes when the level is complete (never gating)
      break;

    case 'none':
      // Position-based only: complete when player reaches the target area
      if (step.worldX !== undefined && step.worldY !== undefined && step.triggerRadius) {
        const dx = px - step.worldX;
        const dy = py - step.worldY;
        if (Math.sqrt(dx * dx + dy * dy) < step.triggerRadius) {
          step.completed = true;
        }
      }
      break;
  }
}

/**
 * Returns the current active tutorial step, or null if tutorial is inactive.
 */
export function getCurrentTutorialStep(state: GameState): TutorialStep | null {
  if (!state.tutorialActive || state.tutorialStepIndex >= state.tutorialSteps.length) {
    return null;
  }
  return state.tutorialSteps[state.tutorialStepIndex];
}
