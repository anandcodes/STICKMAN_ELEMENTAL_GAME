import type { GameState, Element, Difficulty, TutorialHint, Vec2, WeatherType } from './types';
import { createTutorialSteps, updateTutorial } from './systems/tutorial';
import { updateHazards } from './systems/hazardSystem';
import { getLevel, TOTAL_LEVELS, makeEnemy } from './levels';
import { updateFloatingTexts, updateShockwaves, spawnFloatingText, spawnParticles, vibrate } from './systems/utils';
import { updateEnemies } from './systems/enemySystem';
import { handlePlayerInput, updatePlayer } from './systems/playerSystem';
import { applyPhysics } from './systems/physicsSystem';
import { updateCollectibles } from './systems/collectibleSystem';
import { updateEnvironment } from './systems/environmentSystem';
import * as Audio from './audio';
import { loadSave, saveProgress } from './persistence';
import { trackEvent } from './telemetry';
import { loadSettings } from './settings';
import { recordMobileInputMetric } from './mobile/observability';
import { submitLeaderboardEntry } from './services/leaderboard';
import { getAchievementLabel, updateProgression } from './services/progression';
import { getRandomRelics, applyRelicEffects } from './relics';
import { startTrial, endTrial } from './systems/trials';
import { particlePool, projectilePool } from './services/poolManager';
import { BASE_CANVAS_W, BASE_CANVAS_H, DIFFICULTY_SETTINGS, getDifficultyForLevel } from './constants';
import { getRespawnPoint, scaleLevelForProgression } from './difficultyCurve';
import { updateUltimates } from './systems/ultimates';

let CANVAS_W = BASE_CANVAS_W;
let CANVAS_H = BASE_CANVAS_H;

export function setEngineCanvasSize(w: number, h: number) {
  CANVAS_W = w;
  CANVAS_H = h;
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

export function createInitialState(
  level = 0,
  score = 0,
  highScore = 0,
  difficulty: Difficulty = 'normal',
  deathStreak = 0,
  checkpointIndex = 0,
  requestedRespawnPoint?: Vec2,
): GameState {
  const { levelDef: def, balanceCurve, checkpoints, assistTier } = scaleLevelForProgression(
    getLevel(level),
    level,
    deathStreak,
  );
  const respawnPoint = requestedRespawnPoint
    ? { ...requestedRespawnPoint }
    : getRespawnPoint(checkpoints, checkpointIndex, def.playerStart);

  // Level-based difficulty scaling for campaign (except menu/survival)
  const isCampaign = level > 0 && level < 15;
  const actualDifficulty = isCampaign && score === 0 ? getDifficultyForLevel(level) : difficulty;
  const ds = DIFFICULTY_SETTINGS[actualDifficulty];

  const savedData = loadSave();
  const runtimeSettings = loadSettings();
  const effectiveHighScore = Math.max(highScore, savedData.highScore);
  const upg = savedData.upgrades;

  const stickman = {
    x: respawnPoint.x, y: respawnPoint.y,
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
    hurtTimer: 0,
    dashCooldown: 0,
    dashTimer: 0,
    isDashing: false,
    lastDamageTime: -100,
    lastHealTime: -100,
    landTimer: 0,
    jumpSquash: 0,
    ultCharge: 0,
    ultActive: false,
    ultTimer: 0,
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
    hazards: [],
    powerups: [...(def.powerups || [])],
    projectiles: [],
    particles: [],
    uiParticles: [],
    activePowerups: { speedTimer: 0, shieldTimer: 0, rapidfireTimer: 0 },
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
    moveInputX: 0,
    moveInputY: 0,
    mousePos: { x: 0, y: 0 },
    mouseDown: false,
    isAiming: false,
    aimAngle: 0,
    aimAssistTargetId: undefined,
    aimAssistWeight: 0,
    touchAimActive: false,
    shootQueued: false,
    buttonFireActive: false,
    attackBufferFrames: 0,
    dashBufferFrames: 0,
    platformDropFrames: 0,
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
    balanceCurve,
    deathStreak,
    assistTier,
    checkpoints,
    checkpointIndex: clampCheckpointIndex(checkpointIndex, checkpoints.length),
    respawnPoint,
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
    hapticsEnabled: runtimeSettings.hapticsEnabled,
    reducedMotion: runtimeSettings.reducedMotion,
    highContrast: runtimeSettings.highContrast,
    controlsScale: runtimeSettings.controlsScale,
    aimToShoot: runtimeSettings.aimToShoot,
    mobileControlMode: runtimeSettings.mobileControlMode,
    mobileAccessibilityPreset: runtimeSettings.mobileAccessibilityPreset,
    mobileSkillPreset: runtimeSettings.mobileSkillPreset,
    mobileDebugOverlay: false,
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
    ultimateReady: false,
    ultimateTrigger: false,
    elementMastery: {},
    slowmoTimer: 0,
    slowmoFactor: 1,
    ultimateHintShown: false,
    bossDefeated: false,
    endingShown: false,
    favoriteElement: undefined,
    elementUsage: { fire: 0, water: 0, earth: 0, wind: 0 },
    continueButton: undefined,
    menuParallax: { x: 0, y: 0 },
    screenTransition: undefined,
    weather: { type: 'clear', intensity: 0, timer: 0 },
    activeSynergies: [],
  };
}

function clampCheckpointIndex(index: number, length: number): number {
  return Math.max(0, Math.min(index, Math.max(0, length - 1)));
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

  let vx, vy;
  if (state.aimToShoot && state.aimAngle !== undefined) {
    vx = Math.cos(state.aimAngle);
    vy = Math.sin(state.aimAngle);
  } else {
    vx = dx / dist;
    vy = dy / dist;
  }

  const speed = state.selectedElement === 'wind' ? 10 : 8;

  const manaCostRaw: Record<Element, number> = { fire: 8, water: 6, earth: 15, wind: 5 };
  let cost = manaCostRaw[state.selectedElement];
  if (state.activeRelics.some(r => r.type === 'mana_flux')) cost *= 0.7;

  if (s.mana < cost) return;
  s.mana -= cost;

  const p = projectilePool.get();
  p.x = s.x + s.width / 2 + vx * 20;
  p.y = s.y + s.height / 4;
  p.vx = vx * speed;
  p.vy = vy * speed;
  p.element = state.selectedElement;
  p.life = state.selectedElement === 'earth' ? 40 : 80;
  p.size = state.selectedElement === 'earth' ? 12 : 8;
  p.isEnemy = false;
  state.projectiles.push(p);

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
    s.vx -= vx * 2;
    s.vy -= vy * 2;
  }

  // Track favorite element usage
  state.elementUsage = state.elementUsage || { fire: 0, water: 0, earth: 0, wind: 0 };
  state.elementUsage[state.selectedElement] = (state.elementUsage[state.selectedElement] || 0) + 1;
}

function triggerElementalBurst(state: GameState) {
  const s = state.stickman;
  const burstElement = state.selectedElement;
  const cx = s.x + s.width / 2;
  const cy = s.y + s.height / 2;
  
  // Massive Elemental Particle Explosion (360 degrees)
  const numParticles = 80;
  const colors: Record<Element, string[]> = {
    fire: ['#ff4500', '#ff8c00', '#ffd700', '#ffffff'],
    water: ['#00bfff', '#1e90ff', '#87cefa', '#ffffff'],
    earth: ['#8b4513', '#a0522d', '#cd853f', '#32cd32'],
    wind: ['#e0ffff', '#afeeee', '#f0ffff', '#ffffff']
  };
  
  for (let i = 0; i < numParticles; i++) {
    const angle = (Math.PI * 2 * i) / numParticles;
    const speed = 10 + Math.random() * 15; // fast explosion
    const p = particlePool.get();
    p.x = cx; p.y = cy;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.life = 40 + Math.random() * 20;
    p.maxLife = p.life;
    p.element = burstElement;
    p.size = 6 + Math.random() * 8; // huge particles
    p.color = colors[burstElement][Math.floor(Math.random() * colors[burstElement].length)];
    state.particles.push(p);
  }

  // Multi-layered Shockwaves
  const swColor = colors[burstElement][0];
  state.shockwaves.push({ x: cx, y: cy, radius: 10, life: 30, color: swColor });
  state.shockwaves.push({ x: cx, y: cy, radius: 40, life: 25, color: '#ffffff' });
  state.shockwaves.push({ x: cx, y: cy, radius: 80, life: 20, color: swColor });

  for (const enemy of state.enemies) {
    if (enemy.state !== 'dead') {
      enemy.health = 0; // Insta-kill
      enemy.state = 'dead';
      enemy.hurtTimer = 30;
      spawnFloatingText(state, enemy.x + enemy.width / 2, enemy.y, 'BURST!', '#ffffff', 20);
    }
  }
  
  // Extreme Screen Shake
  state.screenShake = Math.max(state.screenShake, 45);
  
  s.mana = 0;
  state.ultimateTrigger = false;
  state.ultimateReady = false;
  
  // Dramatic Slow-motion effect
  state.slowmoTimer = 45;
  state.slowmoFactor = 0.05;
  const hasGuardian = state.enemies.some((e) => e.type === 'guardian_aether');
  const isFinalLevel = state.currentLevel >= TOTAL_LEVELS - 1;
  if (state.enemies.every((e) => e.state === 'dead') && (hasGuardian || isFinalLevel)) {
    state.bossDefeated = true;
    state.screen = 'victory';
    state.slowmoTimer = 0;
    state.slowmoFactor = 1;
    // Set favorite element summary
    if (state.elementUsage) {
      const sorted = Object.entries(state.elementUsage).sort((a, b) => b[1] - a[1]);
      state.favoriteElement = sorted[0]?.[0] as Element;
    }
  }
}


export function update(state: GameState): void {
  // Handle non-playing screens
  if (state.screen !== 'playing') {
    state.screenTimer++;
    updateFloatingTexts(state);

    if (state.screenTransition?.active) {
      state.screenTransition.timer++;
      if (state.screenTransition.timer >= state.screenTransition.duration) {
        if (state.screenTransition.phase === 'out') {
          state.screen = state.screenTransition.target;
          state.screenTimer = 0;
          state.screenTransition.phase = 'in';
          state.screenTransition.timer = 0;
        } else {
          state.screenTransition.active = false;
        }
      }
    }

    if (state.screen === 'relicSelection') return;
    if (state.screen === 'victory') {
      state.endingShown = true;
    }
    if (state.screenTimer === 1 && (state.screen === 'map' || state.screen === 'skillTree')) {
      Audio.playStoneOpen();
    }

    if (state.screen === 'levelComplete' && state.screenTimer === 1) {
      state.furthestLevel = Math.max(state.furthestLevel, state.currentLevel + 1);
      saveProgress(state);
    }
    return;
  }

  // IMP-1: Pause check
  if (state.paused) return;

  if (state.slowmoTimer && state.slowmoTimer > 0) {
    state.slowmoTimer--;
    if (state.slowmoTimer <= 0) state.slowmoFactor = 1;
  }

  state.timeElapsed++;
  applyRelicEffects(state);

  // Dialog active check
  if (state.activeDialog.length > 0) {
    state.dialogCharIndex += 0.5; // Typewriter speed
    updateParticles(state);
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

  // Hazards & Environmental Updates
  updateHazards(state, 1);

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
    state.moveInputX = 0;
    state.moveInputY = 0;
    state.attackBufferFrames = 0;
  }

  // Process Active Powerups Timers
  if (state.activePowerups) {
    if (state.activePowerups.speedTimer > 0) state.activePowerups.speedTimer--;
    if (state.activePowerups.shieldTimer > 0) {
      state.activePowerups.shieldTimer--;
      s.invincibleTimer = 5; // keep invincible while shield is active
    }
    if (state.activePowerups.rapidfireTimer > 0) state.activePowerups.rapidfireTimer--;
  }

  // Input & Player update (inputs run at full rate; movement scaled via dt)
  handlePlayerInput(state);
  const dt = state.slowmoFactor || 1;
  updatePlayer(state, dt);
  const prevUltimate = state.ultimateReady;
  state.ultimateReady = state.stickman.mana >= state.stickman.maxMana - 0.001;
  if (!prevUltimate && state.ultimateReady) {
    Audio.playUltimateReady();
    if (!state.ultimateHintShown) {
      state.activeDialog = [{ speaker: 'ANCIENT VOICE', text: 'Your mana overflows. Tap the runic center to unleash your elemental burst.' }];
      state.dialogCharIndex = 0;
      state.ultimateHintShown = true;
    }
  }
  if (state.ultimateTrigger && state.ultimateReady) {
    Audio.duckMusicForUltimate();
    triggerElementalBurst(state);
  }

  // Shooting Logic
  if (state.activePowerups && state.activePowerups.rapidfireTimer > 0 && state.castCooldown > 3) {
    state.castCooldown = 3; // super fast shooting
  }
  if (state.castCooldown > 0) state.castCooldown--;
  const prevAttackBufferFrames = state.attackBufferFrames;
  if (state.attackBufferFrames > 0 && !state.shootQueued) {
    state.attackBufferFrames--;
  }

  const usingButtonFire = state.buttonFireActive || state.shootQueued || state.attackBufferFrames > 0;

  if (usingButtonFire && state.castCooldown <= 0) {
    if (state.attackBufferFrames > 0) {
      recordMobileInputMetric('buffered_attack_success');
    }
    state.isAiming = true;
    spawnProjectile(state);
    state.shootQueued = false;
    state.attackBufferFrames = 0;
  } else if (state.aimToShoot && !state.touchAimActive) {
    if (state.mouseDown && state.castCooldown <= 0) {
      state.isAiming = true;
      const s = state.stickman;
      const worldMouseX = state.mousePos.x + state.camera.x;
      const worldMouseY = state.mousePos.y + state.camera.y;
      state.aimAngle = Math.atan2(worldMouseY - (s.y + s.height / 4), worldMouseX - (s.x + s.width / 2));
    } else if (state.isAiming && !state.mouseDown) {
      state.isAiming = false;
      if (state.castCooldown <= 0) {
        spawnProjectile(state);
      } else {
        state.attackBufferFrames = Math.max(state.attackBufferFrames, 12);
      }
    }
  } else {
    if (state.touchAimActive) {
      state.isAiming = true;
    } else if (!usingButtonFire) {
      state.isAiming = false;
    }

    if (state.mouseDown && state.castCooldown <= 0 && !usingButtonFire) {
      spawnProjectile(state);
    }
  }

  if (prevAttackBufferFrames > 0 && state.attackBufferFrames === 0 && state.castCooldown > 0 && !state.shootQueued) {
    recordMobileInputMetric('buffered_attack_expired');
  }

  // Physics & Collision
  state.onIce = false;
  applyPhysics(state, dt);
  updateUltimates(state);

  // IMP-15: Tutorial Hint triggers
  for (const hint of state.tutorialHints) {
    if (!hint.triggered && Math.abs((s.x + s.width / 2) - hint.x) < hint.triggerRadius && Math.abs((s.y + s.height / 2) - hint.y) < hint.triggerRadius) {
      hint.triggered = true;
      spawnFloatingText(state, hint.x, hint.y - 40, hint.text, '#ffffff', 14);
      Audio.playPotionCollect(); // Gentle ping sound
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
  updateCollectibles(state);
  updateEnvironment(state);
  updateCheckpointProgress(state);

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

  // Ambient Leaves for Forest Biome
  if (state.currentLevel >= 15 && state.currentLevel <= 19) {
    if (Math.random() < 0.1) {
      const p = particlePool.get();
      p.x = state.camera.x + Math.random() * (CANVAS_W + 200) - 100;
      p.y = state.camera.y - 10;
      p.vx = 0;
      p.vy = Math.random() * 0.5 + 0.5;
      p.life = 300; p.maxLife = 300;
      p.element = 'wind';
      p.size = Math.random() * 2 + 2;
      p.color = ['#228B22', '#32CD32', '#006400'][Math.floor(Math.random() * 3)];
      state.particles.push(p);
    }
  }

  updateParticles(state);

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
  updateUIParticles(state);
  if (state.screenShake > 0) state.screenShake--;
  if (state.redFlash > 0) state.redFlash--;
  if (state.levelTimer > 0) {
    state.levelTimer--;
    if (state.levelTimer <= 0) s.health = 0;
  }

  // Camera follow
  const leadX = Math.max(-120, Math.min(120, s.vx * 20 || s.facing * 40));
  const fovBoostX = state.selectedElement === 'wind' ? s.facing * 80 : 0;
  const fovBoostY = state.selectedElement === 'wind' ? -20 : 0;
  const targetCamX = s.x - CANVAS_W / 2 + s.width / 2 + fovBoostX + leadX;
  const targetCamY = Math.min(0, s.y - CANVAS_H / 2 + fovBoostY);
  state.camera.x += (targetCamX - state.camera.x) * 0.08;
  const verticalLerp = state.selectedElement === 'wind' ? 0.06 : 0.08;
  state.camera.y += (targetCamY - state.camera.y) * verticalLerp;

  // Clamp camera to world bounds
  state.camera.x = Math.max(0, Math.min(state.worldWidth - CANVAS_W, state.camera.x));
  // Handle coordinate systems where world grows upwards (negative y)
  if (state.worldHeight < 0) {
    state.camera.y = Math.max(state.worldHeight - CANVAS_H, Math.min(0, state.camera.y));
  } else {
    state.camera.y = Math.max(0, Math.min(state.worldHeight - CANVAS_H, state.camera.y));
  }

  for (const star of state.backgroundStars) star.twinkle += 0.03;

  // Death Animation Logic
  if (s.health <= 0) {
    updateDeathAnimation(state);
  }

  // Wave Director (Endless Mode)
  if (state.endlessWave !== undefined && state.endlessTimer !== undefined) {
    updateWaveDirector(state);
  }

  updateWeather(state);
}

function updateWeather(state: GameState) {
  state.weather.timer++;
  
  // Change weather every ~20 seconds (1200 frames)
  if (state.weather.timer > 1200) {
    state.weather.timer = 0;
    const types: WeatherType[] = ['clear', 'rain', 'snow', 'windy', 'storm'];
    // Storm is rare
    const newType = Math.random() < 0.1 ? 'storm' : types[Math.floor(Math.random() * 4)];
    state.weather.type = newType;
    state.weather.intensity = 0; // Fade in intensity
  }

  if (state.weather.intensity < 1) {
    state.weather.intensity += 0.002;
  }

  // Weather effects on gameplay
  if (state.weather.type === 'rain' || state.weather.type === 'storm') {
    // Rain slowly restores mana but slightly reduces fire damage (simulated by mana cost)
    state.stickman.mana = Math.min(state.stickman.maxMana, state.stickman.mana + 0.02 * state.weather.intensity);
  } else if (state.weather.type === 'snow') {
    // Snow makes movement slightly slippery
    // This will be handled in physicsSystem
  } else if (state.weather.type === 'windy') {
    // Wind pushes player (handled in updateWeather or physics)
    const windPush = Math.sin(state.timeElapsed * 0.01) * 0.2 * state.weather.intensity;
    state.stickman.vx += windPush;
  }
}

function updateParticles(state: GameState) {
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
    if (p.life <= 0) {
      state.particles.splice(i, 1);
      particlePool.release(p);
    }
  }
}

function updateDeathAnimation(state: GameState) {
  const s = state.stickman;
  if (state.deathAnimTimer === 0) {
    state.deathStreak++;
    state.screenShake = 20;
    trackEvent('player_death', {
      mode: state.endlessWave !== undefined ? 'endless' : 'campaign',
      level: state.currentLevel + 1,
      score: state.score,
    });
    Audio.stopMusic();
    vibrate(state, [80, 40, 80, 40, 120]);
    if (!state.deathType) state.deathType = 'enemy';
    spawnParticles(state, s.x + s.width / 2, s.y + s.height / 2, 'fire', 20); // Boom
    s.vy = -5; // knock up
  }

  state.deathAnimTimer++;
  if (state.deathType !== 'fall') {
    s.vx *= 0.8; s.vy += 0.2;
  } else {
    s.vx *= 0.95; s.vy += 0.8;
  }

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
      void submitLeaderboardEntry(state.score, state.endlessWave, state.endlessKills ?? state.enemiesDefeated).catch(() => { });
    }
  }
}

function updateCheckpointProgress(state: GameState) {
  const nextCheckpoint = state.checkpoints[state.checkpointIndex + 1];
  if (!nextCheckpoint) return;
  if (state.stickman.x + state.stickman.width / 2 < nextCheckpoint.x) return;

  state.checkpointIndex++;
  state.respawnPoint = { ...nextCheckpoint };
  spawnFloatingText(state, nextCheckpoint.x, nextCheckpoint.y - 16, 'CHECKPOINT', '#7fe8ff', 14);
}

function updateWaveDirector(state: GameState) {
  const s = state.stickman;
  state.endlessTimer!++;
  const aliveEnemies = state.enemies.filter(e => e.state !== 'dead').length;

  if (aliveEnemies === 0 && state.endlessTimer! > 180) {
    state.endlessWave!++;
    if (state.endlessWave! % 3 === 0) {
      state.screen = 'relicSelection';
      state.relicChoices = getRandomRelics(3, state.activeRelics.map(r => r.type));
    }
    if (state.endlessWave! % 10 === 0) {
      startTrial(state);
    } else if (state.trialActive) {
      endTrial(state);
    }

    state.endlessTimer = 0;
    s.health = Math.min(s.health + 25, s.maxHealth);
    spawnFloatingText(state, s.x + s.width / 2, s.y - 20, 'WAVE ' + state.endlessWave, '#ffff00', 24);

    const isBossWave = state.endlessWave! % 5 === 0;
    const isTitanWave = state.endlessWave! % 15 === 0;
    const numEnemies = isBossWave
      ? (isTitanWave ? 1 : 1 + Math.floor(state.endlessWave! / 10))
      : Math.min(20, Math.max(2, Math.round((3 + Math.floor(state.endlessWave! * 1.2)) * state.balanceCurve.enemyDensityMultiplier)));

    for (let i = 0; i < numEnemies; i++) {
      const spawnX = 100 + Math.random() * (state.worldWidth - 200);
      if (isBossWave && i < (isTitanWave ? 1 : 1 + Math.floor(state.endlessWave! / 10))) {
        const bType = isTitanWave ? 'void_titan' : (state.endlessWave! % 10 === 0 ? 'boss2' : 'boss1');
        const maxHpMod = (bType === 'void_titan') ? 3000 : (bType === 'boss2' ? 1500 : 800);
        state.enemies.push(makeEnemy(
          bType,
          spawnX,
          530,
          'water',
          'earth',
          200,
          30 + state.endlessWave! * 3,
          1.5,
          maxHpMod + state.endlessWave! * 150
        ));
      } else {
        let availableTypes: import('./types').Enemy['type'][] = ['slime', 'bat', 'golem', 'fire_spirit', 'ice_spirit'];
        if (state.endlessWave! > 2) availableTypes = [...availableTypes, 'shadow_wolf'];
        if (state.endlessWave! > 4) availableTypes = [...availableTypes, 'lava_crab', 'thunder_hawk'];
        if (state.endlessWave! > 7) availableTypes = [...availableTypes, 'void_brute', 'corrupted_wraith'];
        const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        state.enemies.push(makeEnemy(
          type,
          spawnX,
          530,
          'fire',
          'water',
          150,
          15 + state.endlessWave!,
          0.8 + state.endlessWave! * 0.05,
          30 + state.endlessWave! * 15
        ));
      }
    }
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

function updateUIParticles(state: GameState) {
  for (let i = state.uiParticles.length - 1; i >= 0; i--) {
    const p = state.uiParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.95;
    p.vy *= 0.95;
    p.life--;
    if (p.life <= 0) {
      state.uiParticles.splice(i, 1);
    }
  }
}
