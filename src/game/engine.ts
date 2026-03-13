import type { GameState, Element, Difficulty, DifficultySettings, TutorialHint } from './types';
import { createTutorialSteps, updateTutorial } from './systems/tutorial';
import { getLevel, TOTAL_LEVELS, makeEnemy } from './levels';
import { spawnFloatingText, spawnParticles, addScore, handleEnemyHit } from './systems/utils';
import { updateEnemies } from './systems/enemySystem';
import * as Audio from './audio';
import { loadSave, saveProgress } from './persistence';
import { trackEvent } from './telemetry';
import { loadSettings } from './settings';
import { submitLeaderboardEntry } from './services/leaderboard';
import { getAchievementLabel, updateProgression } from './services/progression';
import { getRandomRelics, applyRelicEffects } from './relics';
import { startTrial, endTrial } from './systems/trials';

const GRAVITY = 0.75;
const FRICTION = 0.88;
const JUMP_FORCE = -13.5;
const MOVE_SPEED = 0.9;
const MAX_SPEED = 4.5;
const DASH_BASE_SPEED = 13;
const DASH_SPEED_PER_UPGRADE = 1.8;
const DASH_BASE_DURATION = 10;
const DASH_DURATION_PER_UPGRADE = 2;
export const DASH_BASE_COOLDOWN = 72;
const DASH_MANA_COST = 4;
let CANVAS_W = 1200;
let CANVAS_H = 700;

export function setEngineCanvasSize(w: number, h: number) {
  CANVAS_W = w;
  CANVAS_H = h;
}

/** Phase 2: Haptic feedback for mobile devices */
export function vibrate(pattern: number | number[]): void {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch { /* vibration not supported / blocked */ }
}

// IMP-14: Difficulty presets
export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  easy: { playerHealth: 150, playerMana: 150, enemyDamageMult: 0.5, enemySpeedMult: 0.8, manaRegenRate: 0.15, label: 'Easy', color: '#44cc44' },
  normal: { playerHealth: 100, playerMana: 100, enemyDamageMult: 1.0, enemySpeedMult: 1.0, manaRegenRate: 0.08, label: 'Normal', color: '#ffcc00' },
  hard: { playerHealth: 75, playerMana: 80, enemyDamageMult: 1.5, enemySpeedMult: 1.3, manaRegenRate: 0.04, label: 'Hard', color: '#ff4444' },
  insane: { playerHealth: 50, playerMana: 60, enemyDamageMult: 2.2, enemySpeedMult: 1.6, manaRegenRate: 0.02, label: 'Insane', color: '#aa00ff' },
};

/**
 * Returns difficulty settings based on the player's level/progression.
 * Early: 0-4, Mid: 5-9, High: 10+
 */
export function getDifficultyForLevel(level: number): Difficulty {
  if (level < 5) return 'easy';
  if (level < 10) return 'normal';
  return 'hard';
}

function createTutorialHints(level: number): TutorialHint[] {
  if (level !== -1) return [];
  return [
    { x: 350, y: 520, text: 'Press 1 and click to burn crates', triggered: false, triggerRadius: 120 },
    { x: 650, y: 540, text: 'Press 2 and click to grow plants', triggered: false, triggerRadius: 120 },
    { x: 900, y: 540, text: 'Use Water on fire pits to extinguish', triggered: false, triggerRadius: 100 },
    { x: 270, y: 420, text: 'Jump on platforms to reach gems', triggered: false, triggerRadius: 100 },
  ];
}

export function createInitialState(level = 0, score = 0, highScore = 0, difficulty: Difficulty = 'normal'): GameState {
  const def = getLevel(level);
  
  // Level-based difficulty scaling for campaign, otherwise use provided difficulty (for survival)
  const actualDifficulty = level === 15 ? difficulty : getDifficultyForLevel(level);
  const ds = DIFFICULTY_SETTINGS[actualDifficulty];

  const savedData = loadSave();
  const runtimeSettings = loadSettings();
  const effectiveHighScore = Math.max(highScore, savedData.highScore);
  const upg = savedData.upgrades;

  const stickman = {
    x: def.playerStart.x, y: def.playerStart.y,
    vx: 0, vy: 0, width: 24, height: 50,
    onGround: false, facing: 1 as const,
    jumpsUsed: 0,
    jumpBufferTimer: 0, coyoteTimer: 0,
    animFrame: 0, animTimer: 0,
    walking: false, jumping: false,
    casting: false, castTimer: 0,
    health: ds.playerHealth + upg.healthLevel * 25,
    maxHealth: ds.playerHealth + upg.healthLevel * 25,
    mana: ds.playerMana + upg.manaLevel * 25,
    maxMana: ds.playerMana + upg.manaLevel * 25,
    invincibleTimer: 0,
    dashCooldown: 0,
    dashTimer: 0,
    isDashing: false,
  };

  const bgStars = Array.from({ length: 80 }, () => ({
    x: Math.random() * def.worldWidth,
    y: Math.random() * 400,
    size: Math.random() * 2 + 0.5,
    twinkle: Math.random() * Math.PI * 2,
    speed: 0.1 + Math.random() * 0.4, // Star parallax speed
  }));

  // savedData and effectiveHighScore are generated above

  return {
    screen: level === 0 && score === 0 ? 'menu' : 'playing',
    currentLevel: level,
    furthestLevel: savedData.furthestLevel || 0,
    levelSelectionIndex: level,
    totalLevels: TOTAL_LEVELS,
    stickman,
    platforms: [...def.platforms],
    envObjects: [...def.envObjects],
    enemies: [...def.enemies],
    projectiles: [],
    particles: [],
    selectedElement: 'fire',
    unlockedElements: getUnlockedElements(level),
    camera: { x: 0, y: 0 },
    worldWidth: def.worldWidth,
    worldHeight: def.worldHeight,
    score,
    gemsCollected: 0,
    gemsRequired: def.gemsRequired,
    totalGems: def.totalGems,
    keys: new Set(),
    mousePos: { x: 0, y: 0 },
    mouseDown: false,
    castCooldown: 0,
    wind: { active: false, direction: 0, timer: 0 },
    backgroundStars: bgStars,
    bgColors: def.bgColors,
    levelTimer: def.timeLimit > 0 ? def.timeLimit * 60 : 0,
    portalOpen: false,
    screenTimer: 0,
    levelName: def.name,
    levelSubtitle: def.subtitle,
    elementHint: def.elementHint,
    showLevelIntro: true,
    levelIntroTimer: 180,
    comboCount: 0,
    comboTimer: 0,
    highScore: effectiveHighScore,
    totalGemsEver: savedData.totalGemsEver || 0,
    gemsCurrency: savedData.gemsCurrency,
    enemiesDefeated: savedData.totalEnemiesDefeated || 0,
    activeDialog: [],
    dialogCharIndex: 0,
    paused: false,
    screenShake: 0,
    floatingTexts: [],
    difficulty: actualDifficulty,
    upgrades: upg,
    onIce: false,
    shopTab: 'upgrades',
    tutorialHints: createTutorialHints(level),
    tutorialSteps: createTutorialSteps(level),
    tutorialStepIndex: 0,
    tutorialActive: level === -1, // Tutorial active only for the dedicated tutorial module
    redFlash: 0,
    pauseSelection: 0,
    bestTimes: savedData.bestTimes || {},
    timeElapsed: 0,
    locale: runtimeSettings.locale,
    graphicsQuality: runtimeSettings.graphicsQuality,
    textScale: runtimeSettings.textScale,
    reducedMotion: runtimeSettings.reducedMotion,
    highContrast: runtimeSettings.highContrast,
    endlessWave: level === 15 ? 1 : undefined,
    endlessKills: level === 15 ? 0 : undefined,
    endlessTimer: level === 15 ? 0 : undefined,
    selectedMenuButton: 0,
    shopSelectionIndex: 0,
    deathAnimTimer: 0,
    activeRelics: [],
    relicChoices: [],
    trialActive: false,
    shockwaves: [],
  };
}

function getUnlockedElements(level: number): Element[] {
  if (level === -1) return ['fire', 'water']; // Tutorial module
  if (level === 0) return ['fire', 'water']; // Campaign L1
  if (level === 1) return ['fire', 'water', 'earth']; // Campaign L2
  return ['fire', 'water', 'earth', 'wind']; // Campaign L3+ & Endless
}

export { spawnParticles, spawnFloatingText, addScore, createSynergyZone, handleEnemyHit } from './systems/utils';

import { updateProjectiles } from './systems/combat';

function spawnProjectile(state: GameState) {
  const s = state.stickman;
  const worldMouseX = state.mousePos.x + state.camera.x;
  const worldMouseY = state.mousePos.y + state.camera.y;
  const dx = worldMouseX - (s.x + s.width / 2);
  const dy = worldMouseY - (s.y + s.height / 4);
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const speed = state.selectedElement === 'wind' ? 10 : 8;

  const manaCostRaw: Record<Element, number> = { fire: 8, water: 6, earth: 15, wind: 5 };
  let cost = manaCostRaw[state.selectedElement];
  if (state.activeRelics.some(r => r.type === 'mana_flux')) cost *= 0.7;
  
  if (s.mana < cost) return;
  s.mana -= cost;

  state.projectiles.push({
    x: s.x + s.width / 2 + (dx / dist) * 20,
    y: s.y + s.height / 4,
    vx: (dx / dist) * speed,
    vy: (dy / dist) * speed,
    element: state.selectedElement,
    life: state.selectedElement === 'earth' ? 40 : 80,
    size: state.selectedElement === 'earth' ? 12 : 8,
  });

  s.casting = true;
  s.castTimer = 15;
  state.castCooldown = state.selectedElement === 'earth' ? 40 : 24;

  // IMP-2: Cast sound per element
  const castSounds: Record<Element, () => void> = {
    fire: Audio.playCastFire, water: Audio.playCastWater,
    earth: Audio.playCastEarth, wind: Audio.playCastWind,
  };
  castSounds[state.selectedElement]();

  if (state.selectedElement === 'wind') {
    s.vx -= (dx / dist) * 2;
    s.vy -= (dy / dist) * 2;
  }
}


export function update(state: GameState): void {
  // Handle non-playing screens
  if (state.screen !== 'playing') {
    state.screenTimer++;
    // Still update floating texts on non-playing screens
    updateFloatingTexts(state);
    if (state.screen === 'relicSelection') return;
    return;
  }

  // IMP-1: Pause check
  if (state.paused) return;

  state.timeElapsed++;
  applyRelicEffects(state);

  // Dialog active check
  if (state.activeDialog.length > 0) {
    state.dialogCharIndex += 0.5; // Typewriter speed
    // Allow Visuals to continue updating
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx; p.y += p.vy;
      if (p.maxLife === 300) {
        p.vy = Math.min(p.vy + 0.01, 2);
        p.vx = Math.sin(state.timeElapsed * 0.03 + p.y * 0.02) * 1.5 + 0.5;
      } else {
        if (p.element === 'fire') p.vy -= 0.05; else p.vy += 0.02;
        p.vx *= 0.98;
      }
      p.life--;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
    updateFloatingTexts(state);
    for (const star of state.backgroundStars) star.twinkle += 0.03;
    return; // Pause game object logic
  }

  // Level intro
  if (state.showLevelIntro) {
    state.levelIntroTimer--;
    if (state.levelIntroTimer <= 0) {
      state.showLevelIntro = false;
    }
    return;
  }

  const s = state.stickman;

  // Tutorial system update
  updateTutorial(state);

  // Combo timer
  if (state.comboTimer > 0) {
    state.comboTimer--;
    if (state.comboTimer <= 0) state.comboCount = 0;
  }

  // Disable input during death animation
  if (state.deathAnimTimer > 0) {
    state.keys.clear();
    state.mouseDown = false;
  }

  // Input handling
  s.walking = false;
  let targetVx = 0;
  if (state.keys.has('a') || state.keys.has('arrowleft')) {
    targetVx -= MOVE_SPEED;
    s.facing = -1;
    s.walking = true;
  }
  if (state.keys.has('d') || state.keys.has('arrowright')) {
    targetVx += MOVE_SPEED;
    s.facing = 1;
    s.walking = true;
  }

  if (s.walking) {
    if (targetVx > 0 && s.vx < MAX_SPEED) {
      s.vx = Math.min(MAX_SPEED, s.vx + targetVx);
    } else if (targetVx < 0 && s.vx > -MAX_SPEED) {
      s.vx = Math.max(-MAX_SPEED, s.vx + targetVx);
    }
  }
  // Jump buffering
  if (state.keys.has('w') || state.keys.has('arrowup') || state.keys.has(' ')) {
    s.jumpBufferTimer = 6;
    state.keys.delete('w'); state.keys.delete('arrowup'); state.keys.delete(' ');
  } else if (s.jumpBufferTimer > 0) {
    s.jumpBufferTimer--;
  }

  // Coyote timer
  if (s.onGround) {
    s.coyoteTimer = 6;
    s.jumpsUsed = 0;
  } else {
    if (s.coyoteTimer > 0) s.coyoteTimer--;
    else if (s.jumpsUsed === 0) s.jumpsUsed = 1; // walk off ledge
  }

  const maxJumps = 1 + (state.upgrades.doubleJumpLevel > 0 ? 1 : 0);
  const canJump = (s.coyoteTimer > 0 && s.jumpsUsed === 0) || (!s.onGround && s.jumpsUsed < maxJumps);

  if (s.jumpBufferTimer > 0 && canJump) {
    let jf = JUMP_FORCE;
    if (state.selectedElement === 'wind' && state.activeRelics.some(r => r.type === 'storm_crown')) {
      jf *= 1.25;
    }
    s.vy = jf;
    s.onGround = false;
    s.jumping = true;
    s.coyoteTimer = 0;
    s.jumpBufferTimer = 0;
    if (s.jumpsUsed >= 1) {
      spawnParticles(state, s.x + s.width / 2, s.y + s.height, 'wind', 8);
    }
    s.jumpsUsed++;
    Audio.playJump();
  }

  // DASH ABILITY - short directional burst that can be used for repositioning or aggressive engage
  const dashSpeed = DASH_BASE_SPEED + state.upgrades.dashDistanceLevel * DASH_SPEED_PER_UPGRADE;
  const dashCost = state.activeRelics.some(r => r.type === 'mana_flux') ? DASH_MANA_COST * 0.7 : DASH_MANA_COST;

  if (state.keys.has('shift') && s.dashCooldown <= 0 && !s.isDashing && s.mana >= dashCost) {
    const movingLeft = state.keys.has('a') || state.keys.has('arrowleft');
    const movingRight = state.keys.has('d') || state.keys.has('arrowright');
    const dashDir = movingLeft && !movingRight ? -1 : movingRight && !movingLeft ? 1 : s.facing;
    s.facing = dashDir;
    s.isDashing = true;
    s.dashTimer = DASH_BASE_DURATION + state.upgrades.dashDistanceLevel * DASH_DURATION_PER_UPGRADE;
    s.dashCooldown = DASH_BASE_COOLDOWN;
    s.mana -= dashCost;
    s.vx = dashDir * dashSpeed;
    s.vy *= 0.35;
    s.invincibleTimer = Math.max(s.invincibleTimer, 10 + state.upgrades.dashDistanceLevel * DASH_DURATION_PER_UPGRADE);
    spawnParticles(state, s.x + s.width / 2, s.y + s.height / 2, state.selectedElement, 12);

    // Relic: Static Field (Wind shockwave on dash)
    if (state.activeRelics.some(r => r.type === 'static_static')) {
      spawnFloatingText(state, s.x, s.y - 20, "STATIC CHARGE!", "#aabbee", 12);
      state.shockwaves.push({ x: s.x + s.width / 2, y: s.y + s.height / 2, radius: 150, life: 20, color: '#aabbee' });
      spawnParticles(state, s.x, s.y, 'wind', 20);
      state.enemies.forEach(e => {
        const dx = (e.x + e.width / 2) - (s.x + s.width / 2);
        const dy = (e.y + e.height / 2) - (s.y + s.height / 2);
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 150) {
          handleEnemyHit(state, { x: s.x, y: s.y, vx: dx / d * 5, vy: dy / d * 5, element: 'wind', life: 1, size: 10 }, e);
        }
      });
    }

    state.screenShake = Math.max(state.screenShake, 4);
    Audio.playJump();
    vibrate([30, 20, 40]); // Dash haptic burst
    // Consume the trigger so holding SHIFT does not auto-chain once cooldown expires.
    state.keys.delete('shift');
  }
  if (s.dashTimer > 0) {
    const dashDir = s.vx === 0 ? s.facing : (s.vx > 0 ? 1 : -1);
    s.vx = dashDir * dashSpeed;
    s.vy = Math.min(s.vy, 1.4);
    s.dashTimer--;
    if (s.dashTimer <= 0) {
      s.isDashing = false;
      s.vx *= 0.6;
    }
  }
  if (s.dashCooldown > 0) s.dashCooldown--;

  // Shooting
  if (state.mouseDown && state.castCooldown <= 0) {
    spawnProjectile(state);
  }
  if (state.castCooldown > 0) state.castCooldown--;

  // Invincibility
  if (s.invincibleTimer > 0) s.invincibleTimer--;

  // IMP-14: Mana regeneration
  if (s.mana < s.maxMana) {
    const ds = DIFFICULTY_SETTINGS[state.difficulty];
    let regenRate = ds.manaRegenRate;
    if (state.activeRelics.some(r => r.type === 'sea_blessing')) {
      regenRate *= 1.4;
    }
    const regenBonus = 1 + (state.upgrades.regenLevel * 0.20);
    s.mana = Math.min(s.maxMana, s.mana + (regenRate * regenBonus));
  }

  // Phase 4: Moving platforms and Vine physics
  let touchingVine = false;
  let plfX = 0, plfY = 0;
  for (const obj of state.envObjects) {
    if (obj.type === 'moving_platform') {
      const prevY = obj.y;
      obj.x += obj.vx || 0;
      obj.y += obj.vy || 0;
      const dx = obj.x - (obj.moveOriginX || obj.x);
      const dy = obj.y - (obj.moveOriginY || obj.y);
      if (Math.sqrt(dx * dx + dy * dy) > (obj.moveRange || 0)) {
        if (obj.vx) obj.vx *= -1;
        if (obj.vy) obj.vy *= -1;
      }
      
      // Moving platform stickiness
      if (s.x + s.width > obj.x && s.x < obj.x + obj.width &&
          s.y + s.height >= prevY - 2 && s.y + s.height <= prevY + 5 && s.vy >= 0) {
        plfX = obj.vx || 0;
        plfY = obj.vy || 0;
        s.y = obj.y - s.height; // Snap exactly to top of platform
        s.onGround = true;      // Ground stick
      }
    }
    if (obj.type === 'vine') {
      if (s.x + s.width > obj.x && s.x < obj.x + obj.width &&
          s.y + s.height > obj.y && s.y < obj.y + obj.height) {
        touchingVine = true;
      }
    }
  }

  // Physics
  if (touchingVine) {
    if (state.keys.has('w') || state.keys.has('arrowup') || state.keys.has(' ')) {
      s.vy = -3;
    } else if (state.keys.has('s') || state.keys.has('arrowdown')) {
      s.vy = 3;
    } else {
      s.vy = 0;
    }
    s.jumpsUsed = 0;
    s.onGround = true;
    s.isDashing = false;
    s.jumpBufferTimer = 0;
  } else {
    s.vy += s.isDashing ? Math.min(GRAVITY * 0.2, 0) : GRAVITY; // Ensure dash stays horizontal mostly
  }
  
  s.x += plfX;
  s.y += plfY;

  // Ice slippery physics (based on onIce state from previous frame's collision)
  if (!s.isDashing) {
    const currentFriction = state.onIce ? 0.98 : FRICTION;
    // Apply friction
    s.vx *= currentFriction;
  }

  // Apply velocity
  s.x += s.vx;

  s.y += s.vy;

  // World bounds
  s.x = Math.max(0, Math.min(state.worldWidth - s.width, s.x));

  // Fall death
  if (s.y > state.worldHeight + 50) {
    s.health = 0;
  }

  // Platform collision
  s.onGround = false;
  state.onIce = false;
  for (const p of state.platforms) {
    if (p.melting && (p.meltTimer ?? 1) <= 0) continue;
    if (
      s.x + s.width > p.x && s.x < p.x + p.width &&
      s.y + s.height > p.y && s.y + s.height < p.y + p.height + s.vy + 5 &&
      s.vy >= 0
    ) {
      s.y = p.y - s.height;
      s.vy = 0;
      s.onGround = true;
      s.jumpsUsed = 0;
      s.jumping = false;
      if (p.type === 'ice') {
        state.onIce = true;
      }
    }
  }

  // Env object collision
  for (const obj of state.envObjects) {
    if (!obj.solid || obj.state === 'destroyed' || obj.state === 'melted' || obj.state === 'collected') continue;
    // Top collision
    if (
      s.x + s.width > obj.x && s.x < obj.x + obj.width &&
      s.y + s.height > obj.y && s.y + s.height < obj.y + obj.height + s.vy + 5 &&
      s.vy >= 0
    ) {
      s.y = obj.y - s.height;
      s.vy = 0;
      s.onGround = true;
      s.jumpsUsed = 0;
      s.jumping = false;
    }
    // Bottom collision (hitting head)
    if (s.vy < 0 && s.y > obj.y + obj.height - 10 && s.y < obj.y + obj.height && s.x + s.width > obj.x + 5 && s.x < obj.x + obj.width - 5) {
       s.y = obj.y + obj.height;
       s.vy = 0;
    }
    // Side collision
    if (s.y + s.height > obj.y + 5 && s.y < obj.y + obj.height - 5) {
      if (s.x + s.width > obj.x && s.x + s.width < obj.x + obj.width / 2 && s.vx > 0) {
        s.x = obj.x - s.width; s.vx = 0;
      }
      if (s.x < obj.x + obj.width && s.x > obj.x + obj.width / 2 && s.vx < 0) {
        s.x = obj.x + obj.width; s.vx = 0;
      }
    }
  }

  // Collectibles and environment zones
  for (const obj of state.envObjects) {
    // Wind zone / water current effect check (doesn't need to be solid or uncollected)
    if (obj.type === 'wind_zone' || obj.type === 'water_current' || obj.type === 'anti_gravity_zone') {
      const touchingZone = s.x + s.width > obj.x && s.x < obj.x + obj.width &&
        s.y + s.height > obj.y && s.y < obj.y + obj.height;

      if (touchingZone) {
        // IMP-12: Wind zone mechanics
        if (obj.type === 'wind_zone') {
          s.vy -= (obj.windStrength || 0);
          s.vx += (obj.windDirection || 0) * (obj.windStrength || 0);
          if (Math.random() < 0.2) {
            state.particles.push({
              x: obj.x + Math.random() * obj.width,
              y: obj.y + Math.random() * obj.height,
              vx: (obj.windDirection || 0) * 2,
              vy: -(obj.windStrength || 0.4) * 4,
              life: 30, maxLife: 30, element: 'wind',
              size: 3, color: 'rgba(255,255,255,0.4)'
            });
          }
        }
        // IMP-13: Water current mechanics
        if (obj.type === 'water_current') {
          s.vx += (obj.currentSpeed || 0);
          if (Math.random() < 0.2) {
            state.particles.push({
              x: obj.x + Math.random() * obj.width,
              y: obj.y + 5 + Math.random() * 10,
              vx: obj.currentSpeed || 0,
              vy: -0.5,
              life: 20, maxLife: 20, element: 'water',
              size: 3, color: '#4488ff'
            });
          }
        }
        if (obj.type === 'anti_gravity_zone') {
          s.vy += (-4 - s.vy) * 0.15; // Smoothly approach -4 velocity upwards (terminal anti-gravity check)
          s.onGround = false;
          s.jumping = false;
          if (Math.random() < 0.3) {
            state.particles.push({
              x: obj.x + Math.random() * obj.width,
              y: obj.y + Math.random() * obj.height,
              vx: (Math.random() - 0.5),
              vy: -2 - Math.random() * 2,
              life: 40, maxLife: 40, element: 'wind', // reuse element typing for render style
              size: 2, color: '#8a2be2'
            });
          }
        }
      }
    }

    // Corrupted Crystal global pulse logic
    if (obj.type === 'corrupted_crystal' && obj.state !== 'destroyed') {
      obj.energyTimer = (obj.energyTimer || 0) + 1;
      if (obj.energyTimer === 121) {
        // Boom! 1-frame explosive radius
        for (let j = 0; j < 15; j++) {
          state.particles.push({
            x: obj.x + Math.random() * obj.width,
            y: obj.y + Math.random() * obj.height,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 40, maxLife: 40, element: 'earth',
            size: 4, color: '#39ff14' // Neon green
          });
        }
        // Radius check for damage
        const cx = obj.x + obj.width / 2;
        const cy = obj.y + obj.height / 2;
        const dist = Math.sqrt(Math.pow((s.x + s.width / 2) - cx, 2) + Math.pow((s.y + s.height / 2) - cy, 2));
        if (dist < 100) {
          s.health -= 25;
          s.mana = Math.max(0, s.mana - 30); // Bypasses invincibility and drains mana!
          s.vy = -6;
          s.vx = (s.x < cx ? -6 : 6);
          s.invincibleTimer = 40;
          state.redFlash = 15;
          state.screenShake = 15;
          Audio.playHit();
        }
      }
      if (obj.energyTimer > 180) {
        obj.energyTimer = 0; // Reset pulse
      }
    }

    if (obj.state === 'collected' || obj.state === 'destroyed') continue;

    const touching = s.x + s.width > obj.x && s.x < obj.x + obj.width &&
      s.y + s.height > obj.y && s.y < obj.y + obj.height;

    if (!touching) continue;

    if (obj.type === 'gem') {
      obj.state = 'collected';
      state.gemsCollected++;
      state.totalGemsEver++;
      state.gemsCurrency++;
      addScore(state, 25);
      spawnFloatingText(state, obj.x + obj.width / 2, obj.y - 10, '+25 💎', '#ffcc00');
      spawnParticles(state, obj.x + obj.width / 2, obj.y + obj.height / 2, 'wind', 12);
      Audio.playGemCollect();
      // Check portal
      if (state.gemsCollected >= state.gemsRequired && !state.portalOpen) {
        state.portalOpen = true;
        Audio.playPortalOpen();
        // Activate portal
        for (const o of state.envObjects) {
          if (o.type === 'portal') o.state = 'active';
        }
      }
    }
    if (obj.type === 'health_potion') {
      obj.state = 'collected';
      s.health = Math.min(s.maxHealth, s.health + 40);
      spawnParticles(state, obj.x + 8, obj.y + 10, 'fire', 10);
      addScore(state, 10);
      Audio.playPotionCollect();
    }
    if (obj.type === 'lore_tome' && obj.dialogue) {
      obj.state = 'collected';
      state.activeDialog = [...obj.dialogue];
      state.dialogCharIndex = 0;
      spawnParticles(state, obj.x + 8, obj.y + 10, 'wind', 20);
      Audio.playGemCollect();
    }
    if (obj.type === 'mana_crystal') {
      obj.state = 'collected';
      s.mana = Math.min(s.maxMana, s.mana + 50);
      spawnParticles(state, obj.x + 8, obj.y + 10, 'water', 10);
      addScore(state, 10);
      Audio.playPotionCollect();
    }
    if (obj.type === 'portal' && obj.state === 'active') {
      // Level complete!
      state.screen = 'levelComplete';
      state.screenTimer = 0;
      state.furthestLevel = Math.max(state.furthestLevel, state.currentLevel + 1);
      addScore(state, 100 + state.gemsCollected * 10);
      Audio.playPortalEnter();
      Audio.playLevelComplete();
      Audio.stopMusic();
      // Bonus for all gems
      if (state.gemsCollected >= state.totalGems) {
        addScore(state, 200);
      }
      // Speedrun Best Time update
      const currentBest = state.bestTimes[state.currentLevel];
      if (!currentBest || state.timeElapsed < currentBest) {
        state.bestTimes[state.currentLevel] = state.timeElapsed;
        spawnFloatingText(state, s.x + s.width / 2, s.y - 60, 'NEW BEST TIME!', '#44ffff', 18);
      }
      trackEvent('level_complete', {
        mode: state.endlessWave !== undefined ? 'endless' : 'campaign',
        level: state.currentLevel + 1,
        gemsCollected: state.gemsCollected,
        totalGems: state.totalGems,
        timeFrames: state.timeElapsed,
        score: state.score,
      });
      saveProgress(state);
      const progression = updateProgression(state);
      let offset = 85;
      for (const achievementId of progression.unlockedAchievements) {
        spawnFloatingText(state, s.x + s.width / 2, s.y - offset, `ACHIEVEMENT: ${getAchievementLabel(achievementId)}`, '#ffe066', 14);
        offset += 20;
      }
      if (progression.dailiesCompleted.length > 0) {
        spawnFloatingText(state, s.x + s.width / 2, s.y - offset, `${progression.dailiesCompleted.length} DAILY CHALLENGES COMPLETE!`, '#66ffcc', 12);
        Audio.playSuperEffective();
      }
    }
    if (obj.type === 'spike' && s.invincibleTimer <= 0) {
      const ds = DIFFICULTY_SETTINGS[state.difficulty];
      const damage = Math.floor(20 * ds.enemyDamageMult);
      s.health -= damage;
      state.redFlash = 15;
      s.invincibleTimer = 60;
      s.vy = -10;
      spawnParticles(state, s.x + s.width / 2, s.y + s.height, 'fire', 8);
      state.screenShake = 10;
      spawnFloatingText(state, s.x + s.width / 2, s.y - 20, `-${damage}`, '#ff4444', 16);
      Audio.playSpikeHit();
      vibrate(50); // Damage haptic
    }
  }

  // IMP-15: Tutorial Hint triggers
  for (const hint of state.tutorialHints) {
    if (!hint.triggered && Math.abs((s.x + s.width / 2) - hint.x) < hint.triggerRadius && Math.abs((s.y + s.height / 2) - hint.y) < hint.triggerRadius) {
      hint.triggered = true;
      spawnFloatingText(state, hint.x, hint.y - 40, hint.text, '#ffffff', 14);
      Audio.playPotionCollect(); // Gentle ping sound
    }
  }

  // Fire pit damage
  for (const obj of state.envObjects) {
    if (obj.type === 'fire_pit' && obj.state === 'burning' && s.invincibleTimer <= 0) {
      const d = Math.abs((s.x + s.width / 2) - (obj.x + obj.width / 2));
      if (d < 40 && s.y + s.height > obj.y - 10) {
        s.health -= 0.3;
        if (Math.random() > 0.9) state.redFlash = 10;
      }
    }
  }

  // Animation
  s.animTimer++;
  if (s.walking && s.animTimer % 6 === 0) {
    s.animFrame = (s.animFrame + 1) % 4;
  }
  if (!s.walking && s.onGround) s.animFrame = 0;
  if (s.castTimer > 0) s.castTimer--;
  if (s.castTimer <= 0) s.casting = false;

  // Update enemies
  updateEnemies(state);

  // Inject audio player to state avoiding cyclic
  state.onDamage = Audio.playDamage;

  updateProjectiles(state);

  // Update melting/earth platforms
  for (let i = state.platforms.length - 1; i >= 0; i--) {
    const p = state.platforms[i];
    if (p.melting && p.meltTimer !== undefined) {
      p.meltTimer--;
      if (p.meltTimer <= 0) {
        if (p.type === 'earth') state.platforms.splice(i, 1);
        else p.melting = false;
      }
    }
    if (p.type === 'earth' && !p.melting) {
      p.meltTimer = (p.meltTimer || 300) - 1;
      if (p.meltTimer <= 0) state.platforms.splice(i, 1);
    }
  }

  // == Synergy Zone Behaviors & Object Updates ==
  for (const obj of state.envObjects) {
    if (obj.state === 'burning' && obj.type !== 'fire_pit') {
      obj.health -= 0.5;
      if (Math.random() > 0.6) spawnParticles(state, obj.x + Math.random() * obj.width, obj.y, 'fire', 1);
      if (obj.health <= 0) {
        obj.state = 'destroyed'; obj.solid = false;
        spawnParticles(state, obj.x + obj.width / 2, obj.y + obj.height / 2, 'fire', 20);
        addScore(state, 10); Audio.playCrateBreak();
      }
    }
    if (obj.type === 'synergy_zone' || obj.type === 'magma_pool' || obj.type === 'mud_trap') {
      obj.health -= 1;
      if (obj.health <= 0) obj.state = 'destroyed';
      const centerX = obj.x + obj.width / 2, centerY = obj.y + obj.height / 2;
      if (obj.state === 'burning') { // Firestorm
        for (const e of state.enemies) {
          const dx = centerX - (e.x + e.width / 2), dy = centerY - (e.y + e.height / 2);
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            const safeDist = Math.max(dist, 1);
            e.vx += (dx / safeDist) * 0.5; e.vy += (dy / safeDist) * 0.2;
            if (dist < 40 && Math.random() > 0.9) { e.health -= 2; e.state = 'hurt'; e.hurtTimer = 5; spawnParticles(state, e.x + e.width / 2, e.y + e.height / 2, 'fire', 2); }
          }
        }
      }
      if (obj.state === 'mud') {
        for (const e of state.enemies) {
          if (e.x + e.width > obj.x && e.x < obj.x + obj.width && e.y + e.height > obj.y && e.y + e.height < obj.y + obj.height + 10) {
            // BUG-FIX: Only slow vx (velocity), not e.speed (permanent stat)
            e.vx *= 0.2;
          }
        }
      }
      if (obj.state === 'lightning' && (obj.health % 30) === 0) {
        const targets = state.enemies.filter(e => Math.sqrt((e.x - centerX) ** 2 + (e.y - centerY) ** 2) < 200).slice(0, 3);
        targets.forEach(t => {
          t.health -= 10; t.state = 'hurt'; t.hurtTimer = 10; spawnParticles(state, t.x + t.width / 2, t.y + t.height / 2, 'wind', 10);
        });
      }
      if (obj.state === 'steam') { // Steam Cloud
        for (const e of state.enemies) {
          if (Math.sqrt((e.x - centerX) ** 2 + (e.y - centerY) ** 2) < 140) {
            if (Math.random() > 0.95) { e.health -= 5; spawnParticles(state, e.x + e.width / 2, e.y + e.height / 2, 'water', 3); }
            e.vx += (Math.random() - 0.5) * 2; // Confused movement
          }
        }
        if (Math.random() > 0.7) spawnParticles(state, centerX + (Math.random() - 0.5) * 100, centerY + (Math.random() - 0.5) * 100, 'wind', 1);
      }
      if (obj.state === 'sand') { // Dust Devil
        for (const e of state.enemies) {
          const dx = (e.x + e.width / 2) - centerX, dy = (e.y + e.height / 2) - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            const safeDist = Math.max(dist, 1);
            e.vx += (dx / safeDist) * 1.5; e.vy -= 1.2; // Blow away
            // BUG-FIX: Don't mutate e.speed (permanent stat), only apply velocity impulse
          }
        }
        if (Math.random() > 0.5) spawnParticles(state, centerX, centerY, 'earth', 2);
      }
    }
  }

  // Ambient Leaves for Forest Biome
  if (state.currentLevel >= 15 && state.currentLevel <= 19) {
    if (Math.random() < 0.1) {
      state.particles.push({
        x: state.camera.x + Math.random() * (CANVAS_W + 200) - 100,
        y: state.camera.y - 10,
        vx: 0,
        vy: Math.random() * 0.5 + 0.5,
        life: 300, maxLife: 300,
        element: 'wind', // reuse element typing
        size: Math.random() * 2 + 2,
        color: ['#228B22', '#32CD32', '#006400'][Math.floor(Math.random() * 3)]
      });
    }
  }

  // Update particles
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx; p.y += p.vy;
    
    if (p.maxLife === 300) {
      // Leaf drift logic
      p.vy = Math.min(p.vy + 0.01, 2);
      p.vx = Math.sin(state.timeElapsed * 0.03 + p.y * 0.02) * 1.5 + 0.5; 
    } else {
      if (p.element === 'fire') p.vy -= 0.05; else p.vy += 0.02;
      p.vx *= 0.98; 
    }
    
    p.life--;
    if (p.life <= 0) state.particles.splice(i, 1);
  }

  // Clean up dead enemies
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    if (state.enemies[i].state === 'dead') {
      state.enemies[i].hurtTimer--;
      if (state.enemies[i].hurtTimer <= 0) state.enemies.splice(i, 1);
    }
  }

  // Effects & HUD updates
  updateShockwaves(state);
  updateFloatingTexts(state);
  if (state.screenShake > 0) state.screenShake--;
  if (state.redFlash > 0) state.redFlash--;
  if (state.levelTimer > 0) {
    state.levelTimer--;
    if (state.levelTimer <= 0) s.health = 0;
  }
  state.timeElapsed++;

  // Camera follow
  const targetCamX = s.x - CANVAS_W / 2 + s.width / 2;
  const targetCamY = Math.min(0, s.y - CANVAS_H / 2);
  state.camera.x += (targetCamX - state.camera.x) * 0.08;
  state.camera.y += (targetCamY - state.camera.y) * 0.08;
  state.camera.x = Math.max(0, Math.min(state.worldWidth - CANVAS_W, state.camera.x));
  state.camera.y = Math.max(state.worldHeight - CANVAS_H, Math.min(0, state.camera.y));

  for (const star of state.backgroundStars) star.twinkle += 0.03;

  // Death Animation Logic
  if (s.health <= 0) {
    if (state.deathAnimTimer === 0) {
      state.screenShake = 20;
      trackEvent('player_death', {
        mode: state.endlessWave !== undefined ? 'endless' : 'campaign',
        level: state.currentLevel + 1,
        score: state.score,
      });
      Audio.stopMusic();
      vibrate([80, 40, 80, 40, 120]);

      if (!state.deathType) state.deathType = 'enemy';

      // Dramatic explosions for non-fall death
      if (state.deathType !== 'fall') {
        spawnParticles(state, s.x + s.width / 2, s.y + s.height / 2, state.selectedElement, 60);
        spawnParticles(state, s.x + s.width / 2, s.y + s.height / 2, 'fire', 20); // Boom
        s.vy = -5; // knock up
      } else {
        s.vy = 8; // fast fall
      }
    }

    state.deathAnimTimer++;

    // Freeze or fall down
    if (state.deathType !== 'fall') {
      s.vx *= 0.8; 
      s.vy += 0.2; // slow drift 
    } else {
      s.vx *= 0.95;
      s.vy += 0.8;
    }

    // After ~1.5 seconds, transition to Game Over
    if (state.deathAnimTimer > 90) {
      state.screen = 'gameOver';
      state.screenTimer = 0;
      trackEvent('game_over', {
        mode: state.endlessWave !== undefined ? 'endless' : 'campaign',
        level: state.currentLevel + 1,
        score: state.score,
        enemiesDefeated: state.enemiesDefeated,
        endlessWave: state.endlessWave ?? null,
      }, { force: true });
      saveProgress(state);
      Audio.playGameOver();
      
      const progression = updateProgression(state);
      let offset = 85;
      for (const achievementId of progression.unlockedAchievements) {
        spawnFloatingText(state, s.x + s.width / 2, s.y - offset, `ACHIEVEMENT: ${getAchievementLabel(achievementId)}`, '#ffe066', 14);
        offset += 20;
      }
      if (state.endlessWave !== undefined) {
        void submitLeaderboardEntry(state.score, state.endlessWave, state.endlessKills ?? state.enemiesDefeated).catch(() => {});
      }
    }
  }

  // Wave Director (Endless Mode)
  if (state.endlessWave !== undefined && state.endlessTimer !== undefined) {
    state.endlessTimer++;
    const aliveEnemies = state.enemies.filter(e => e.state !== 'dead').length;

    // Timer logic: Advance wave 180 frames (3s) after the last enemy dies
    if (aliveEnemies === 0 && state.endlessTimer > 180) {
      state.endlessWave++;
      // Trigger Relic Selection every 3 waves
      if (state.endlessWave % 3 === 0) {
        state.screen = 'relicSelection';
        state.relicChoices = getRandomRelics(3, state.activeRelics.map(r => r.type));
      }

      // Trigger Elemental Trial every 10 waves
      if (state.endlessWave % 10 === 0) {
        startTrial(state);
      } else if (state.trialActive) {
        endTrial(state);
      }

      state.endlessTimer = 0;
      s.health = Math.min(s.health + 25, s.maxHealth);
      spawnFloatingText(state, s.x + s.width / 2, s.y - 20, 'WAVE ' + state.endlessWave, '#ffff00', 24);

      const isBossWave = state.endlessWave % 5 === 0;
      const isTitanWave = state.endlessWave % 15 === 0;

      // Significantly increase enemy count scaling, capping at 20 enemies for perf
      const numEnemies = isBossWave
        ? (isTitanWave ? 1 : 1 + Math.floor(state.endlessWave / 10))
        : Math.min(20, 3 + Math.floor(state.endlessWave * 1.2));

      for (let i = 0; i < numEnemies; i++) {
        // Spawn across entire arena to prevent immediate clump deaths
        const spawnX = 100 + Math.random() * 1000;

        if (isBossWave && i < (isTitanWave ? 1 : 1 + Math.floor(state.endlessWave / 10))) {
          const bType = isTitanWave ? 'void_titan' : (state.endlessWave % 10 === 0 ? 'boss2' : 'boss1');
          const maxHpMod = (bType === 'void_titan') ? 3000 : (bType === 'boss2' ? 1500 : 800);
          state.enemies.push(makeEnemy(
            bType,
            spawnX,
            530,
            'water',
            'earth',
            200,
            30 + state.endlessWave * 3,
            1.5,
            maxHpMod + state.endlessWave * 150
          ));
        } else {
          let availableTypes: import('./types').Enemy['type'][] = ['slime', 'bat', 'golem', 'fire_spirit', 'ice_spirit'];
          if (state.endlessWave > 2) availableTypes = [...availableTypes, 'shadow_wolf'];
          if (state.endlessWave > 4) availableTypes = [...availableTypes, 'lava_crab', 'thunder_hawk'];
          if (state.endlessWave > 7) availableTypes = [...availableTypes, 'void_brute', 'corrupted_wraith'];

          const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];

          state.enemies.push(makeEnemy(
            type,
            spawnX,
            580 - (Math.random() * 100), // Slight vertical variance so fliers don't clip
            'water',
            'fire',
            150,
            15 + state.endlessWave * 1.5,
            1.5 + (state.endlessWave * 0.05), // speed scaling 
            50 + state.endlessWave * 20
          ));
        }
      }
    }
  }
}

function updateFloatingTexts(state: GameState): void {
  for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
    const ft = state.floatingTexts[i];
    ft.y -= 1;
    ft.life--;
    if (ft.life <= 0) state.floatingTexts.splice(i, 1);
  }
}

function updateShockwaves(state: GameState): void {
  for (let i = state.shockwaves.length - 1; i >= 0; i--) {
    const sw = state.shockwaves[i];
    sw.life--;
    if (sw.life <= 0) state.shockwaves.splice(i, 1);
  }
}

export function selectRelic(state: GameState, index: number): GameState {
  if (state.screen !== 'relicSelection' || !state.relicChoices[index]) return state;
  
  const relic = state.relicChoices[index];
  state.activeRelics.push(relic);
  
  // Instant effects
  if (relic.type === 'vitality_core') {
    state.stickman.maxHealth += 50;
    state.stickman.health = state.stickman.maxHealth;
  }
  
  state.screen = 'playing';
  state.relicChoices = [];
  spawnFloatingText(state, state.stickman.x + state.stickman.width / 2, state.stickman.y - 40, 'RELIC ACQUIRED: ' + relic.name, '#00ffcc', 20);
  return state;
}
