import type { GameState, Projectile, Element, EnvObject, Enemy, SaveData, Difficulty, DifficultySettings, TutorialHint } from './types';
import { getLevel, TOTAL_LEVELS, makeEnemy } from './levels';
import * as Audio from './audio';

const MAX_PARTICLES = 300;
const SAVE_KEY = 'elemental_stickman_save';
const nid = () => Date.now() + Math.random();

const GRAVITY = 0.6;
const FRICTION = 0.85;
const JUMP_FORCE = -13;
const MOVE_SPEED = 1.2;
const MAX_SPEED = 5.5;
const CANVAS_W = 1200;
const CANVAS_H = 700;

// IMP-14: Difficulty presets
export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  easy: { playerHealth: 150, playerMana: 150, lives: 5, enemyDamageMult: 0.5, enemySpeedMult: 0.8, manaRegenRate: 0.15, label: 'Easy', color: '#44cc44' },
  normal: { playerHealth: 100, playerMana: 100, lives: 3, enemyDamageMult: 1.0, enemySpeedMult: 1.0, manaRegenRate: 0.08, label: 'Normal', color: '#ffcc00' },
  hard: { playerHealth: 75, playerMana: 80, lives: 2, enemyDamageMult: 1.5, enemySpeedMult: 1.3, manaRegenRate: 0.04, label: 'Hard', color: '#ff4444' },
};

function createTutorialHints(level: number): TutorialHint[] {
  if (level !== 0) return [];
  return [
    { x: 350, y: 520, text: '🔥 Press 1 → Click to burn crates!', triggered: false, triggerRadius: 120 },
    { x: 650, y: 540, text: '💧 Press 2 → Click to water plants!', triggered: false, triggerRadius: 120 },
    { x: 900, y: 540, text: '💧 Use Water on fire pits to extinguish!', triggered: false, triggerRadius: 100 },
    { x: 270, y: 420, text: '⬆ Jump on platforms to reach gems!', triggered: false, triggerRadius: 100 },
  ];
}

export function createInitialState(level = 0, score = 0, lives = 3, highScore = 0, difficulty: Difficulty = 'normal'): GameState {
  const def = getLevel(level);
  const ds = DIFFICULTY_SETTINGS[difficulty];

  const savedData = loadSave();
  const effectiveHighScore = Math.max(highScore, savedData.highScore);
  const upg = savedData.upgrades;

  const stickman = {
    x: def.playerStart.x, y: def.playerStart.y,
    vx: 0, vy: 0, width: 24, height: 50,
    onGround: false, facing: 1 as const,
    animFrame: 0, animTimer: 0,
    walking: false, jumping: false,
    casting: false, castTimer: 0,
    health: ds.playerHealth + upg.healthLevel * 25,
    maxHealth: ds.playerHealth + upg.healthLevel * 25,
    mana: ds.playerMana + upg.manaLevel * 25,
    maxMana: ds.playerMana + upg.manaLevel * 25,
    invincibleTimer: 60,
  };

  const bgStars = Array.from({ length: 80 }, () => ({
    x: Math.random() * def.worldWidth,
    y: Math.random() * 400,
    size: Math.random() * 2 + 0.5,
    twinkle: Math.random() * Math.PI * 2,
  }));

  // savedData and effectiveHighScore are generated above

  return {
    screen: level === 0 && score === 0 ? 'menu' : 'playing',
    currentLevel: level,
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
    lives: lives === 3 ? ds.lives : lives,
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
    totalGemsEver: 0,
    gemsCurrency: savedData.gemsCurrency,
    enemiesDefeated: 0,
    paused: false,
    screenShake: 0,
    floatingTexts: [],
    difficulty,
    upgrades: upg,
    onIce: false,
    tutorialHints: createTutorialHints(level),
    redFlash: 0,
    endlessWave: level === 10 ? 1 : undefined,
    endlessKills: level === 10 ? 0 : undefined,
    endlessTimer: level === 10 ? 0 : undefined,
  };
}

function getUnlockedElements(level: number): Element[] {
  if (level === 0) return ['fire', 'water'];
  if (level === 1) return ['fire', 'water', 'earth'];
  // Level 10 is endless, give all elements
  return ['fire', 'water', 'earth', 'wind'];
}

function spawnParticles(state: GameState, x: number, y: number, element: Element, count: number) {
  // BUG-7 FIX: Cap particles to prevent frame drops on mobile
  if (state.particles.length >= MAX_PARTICLES) return;
  const available = MAX_PARTICLES - state.particles.length;
  const actual = Math.min(count, available);

  const colors: Record<Element, string[]> = {
    fire: ['#ff4400', '#ff8800', '#ffcc00', '#ff6600'],
    water: ['#0088ff', '#00bbff', '#44ddff', '#0066cc'],
    earth: ['#886633', '#aa8844', '#66aa33', '#558822'],
    wind: ['#ccddff', '#aabbee', '#ddeeff', '#88aacc'],
  };

  for (let i = 0; i < actual; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    state.particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 30 + Math.random() * 30,
      maxLife: 60,
      element,
      size: Math.random() * 4 + 2,
      color: colors[element][Math.floor(Math.random() * colors[element].length)],
    });
  }
}

function spawnFloatingText(state: GameState, x: number, y: number, text: string, color: string, size = 14) {
  state.floatingTexts.push({ x, y, text, color, life: 60, maxLife: 60, size });
}

function spawnProjectile(state: GameState) {
  const s = state.stickman;
  const worldMouseX = state.mousePos.x + state.camera.x;
  const worldMouseY = state.mousePos.y + state.camera.y;
  const dx = worldMouseX - (s.x + s.width / 2);
  const dy = worldMouseY - (s.y + s.height / 4);
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const speed = state.selectedElement === 'wind' ? 10 : 8;

  const manaCost: Record<Element, number> = { fire: 8, water: 6, earth: 15, wind: 5 };
  if (s.mana < manaCost[state.selectedElement]) return;
  s.mana -= manaCost[state.selectedElement];

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
  state.castCooldown = state.selectedElement === 'earth' ? 25 : 12;

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

function addScore(state: GameState, amount: number) {
  if (state.comboTimer > 0) {
    state.comboCount++;
    amount = Math.floor(amount * (1 + state.comboCount * 0.25));
  } else {
    state.comboCount = 1;
  }
  state.comboTimer = 120;
  state.score += amount;
  if (state.score > state.highScore) {
    state.highScore = state.score;
  }
  // Save progress whenever score changes
  saveProgress(state);
}

function handleElementInteraction(state: GameState, proj: Projectile, obj: EnvObject) {
  const elem = proj.element;

  switch (obj.type) {
    case 'crate':
      if (elem === 'fire' && obj.state !== 'burning' && obj.state !== 'destroyed') {
        obj.state = 'burning';
        spawnParticles(state, obj.x + obj.width / 2, obj.y, 'fire', 15);
        addScore(state, 10);
      }
      if (elem === 'wind' && obj.state !== 'destroyed') {
        obj.x += (proj.vx > 0 ? 1 : -1) * 30;
        spawnParticles(state, obj.x + obj.width / 2, obj.y + obj.height / 2, 'wind', 8);
      }
      if (elem === 'water' && obj.state === 'burning') {
        obj.state = 'normal'; obj.health = obj.maxHealth;
        spawnParticles(state, obj.x + obj.width / 2, obj.y, 'water', 10);
        addScore(state, 5);
      }
      break;

    case 'ice':
      if (elem === 'fire') {
        obj.health -= 50;
        spawnParticles(state, obj.x + obj.width / 2, obj.y + obj.height / 2, 'water', 10);
        if (obj.health <= 0) {
          obj.state = 'melted'; obj.solid = false;
          state.envObjects.push({
            id: Date.now(), type: 'puddle',
            x: obj.x, y: obj.y + obj.height - 10,
            width: obj.width + 10, height: 10,
            health: 100, maxHealth: 100, state: 'normal', solid: false,
          });
          addScore(state, 15);
        }
      }
      if (elem === 'wind') {
        obj.x += (proj.vx > 0 ? 1 : -1) * 20;
        spawnParticles(state, obj.x + obj.width / 2, obj.y + obj.height / 2, 'wind', 5);
      }
      break;

    case 'plant':
      if (elem === 'water' && obj.state !== 'destroyed') {
        // BUG-2 FIX: Calculate base Y from current position, grow upward
        const plantBaseY = obj.y + obj.height;
        obj.growthLevel = Math.min((obj.growthLevel || 0) + 1, 3);
        if (obj.growthLevel >= 3) {
          obj.state = 'grown'; obj.height = 80; obj.width = 40;
          obj.y = plantBaseY - obj.height; obj.solid = true;
          addScore(state, 20);
          spawnFloatingText(state, obj.x + obj.width / 2, obj.y - 10, '+20 GROWN!', '#66aa33');
        } else {
          obj.height = 20 + obj.growthLevel * 15;
          obj.width = 20 + obj.growthLevel * 5;
          obj.y = plantBaseY - obj.height;
        }
        spawnParticles(state, obj.x + obj.width / 2, obj.y, 'earth', 8);
      }
      if (elem === 'fire' && obj.state !== 'destroyed') {
        obj.state = 'burning';
        spawnParticles(state, obj.x + obj.width / 2, obj.y, 'fire', 12);
      }
      break;

    case 'rock':
      if (elem === 'wind') {
        obj.x += (proj.vx > 0 ? 1 : -1) * 40;
        spawnParticles(state, obj.x + obj.width / 2, obj.y + obj.height / 2, 'wind', 8);
        addScore(state, 5);
      }
      if (elem === 'earth') {
        obj.width += 5; obj.height += 5; obj.y -= 5;
        spawnParticles(state, obj.x + obj.width / 2, obj.y, 'earth', 10);
        addScore(state, 5);
      }
      break;

    case 'fire_pit':
      if (elem === 'water') {
        obj.state = 'extinguished';
        spawnParticles(state, obj.x + obj.width / 2, obj.y, 'water', 15);
        addScore(state, 15);
      }
      if (elem === 'wind') {
        spawnParticles(state, obj.x + obj.width / 2, obj.y - 20, 'fire', 20);
        state.envObjects.forEach(o => {
          if (o.type === 'crate' && o.state === 'normal') {
            const d = Math.abs((o.x + o.width / 2) - (obj.x + obj.width / 2));
            if (d < 100) { o.state = 'burning'; addScore(state, 10); }
          }
        });
      }
      break;

    case 'puddle':
      if (elem === 'water') {
        obj.state = 'frozen'; obj.solid = true; obj.height = 15; obj.y -= 5;
        spawnParticles(state, obj.x + obj.width / 2, obj.y, 'water', 10);
        addScore(state, 10);
      }
      if (elem === 'earth') {
        // BUG-3 FIX: Use puddle position instead of hardcoded Y
        const puddleBaseY = obj.y + obj.height;
        obj.type = 'rock'; obj.solid = true; obj.width = 40; obj.height = 25;
        obj.y = puddleBaseY - obj.height;
        spawnParticles(state, obj.x + obj.width / 2, obj.y, 'earth', 12);
        addScore(state, 10);
      }
      if (elem === 'fire') {
        obj.state = 'destroyed';
        spawnParticles(state, obj.x + obj.width / 2, obj.y, 'water', 8);
        addScore(state, 5);
      }
      break;
  }
}

function createSynergyZone(state: GameState, x: number, y: number, e1: Element, e2: Element) {
  const elems = new Set([e1, e2]);
  let type: EnvObject['type'] = 'synergy_zone';
  let stateStr: EnvObject['state'] = 'active';
  let w = 80; let h = 80;

  if (elems.has('fire') && elems.has('wind')) {
    stateStr = 'burning'; w = 120; h = 120; // Firestorm
  } else if (elems.has('water') && elems.has('earth')) {
    type = 'mud_trap'; stateStr = 'mud'; w = 150; h = 30; // Mud Trap
  } else if (elems.has('wind') && elems.has('water')) {
    stateStr = 'lightning'; w = 100; h = 100; // Lightning
  } else if (elems.has('fire') && elems.has('earth')) {
    type = 'magma_pool'; stateStr = 'magma'; w = 120; h = 25; // Magma
  } else if (elems.has('fire') && elems.has('water')) {
    type = 'steam_cloud'; stateStr = 'steam'; w = 140; h = 140; // Steam
  } else if (elems.has('wind') && elems.has('earth')) {
    type = 'dust_devil'; stateStr = 'sand'; w = 110; h = 110; // Sandstorm
  }

  state.envObjects.push({
    id: nid(), type, x: x - w / 2, y: y - h / 2, width: w, height: h,
    health: 300, maxHealth: 300, state: stateStr, solid: false
  });

  spawnParticles(state, x, y, e1, 15);
  spawnParticles(state, x, y, e2, 15);
  spawnFloatingText(state, x, y - 20, 'COMBINATION!', '#ffcc00', 14);
}

function handleEnemyHit(state: GameState, proj: Projectile, enemy: Enemy) {
  const elem = proj.element;
  const dmgMul = 1 + (state.upgrades.damageLevel * 0.25);
  let dmg = 15 * dmgMul;

  if (elem === enemy.weakness) {
    dmg = 35 * dmgMul;
    spawnParticles(state, enemy.x + enemy.width / 2, enemy.y, elem, 20);
    // Show "SUPER EFFECTIVE" particles
    for (let i = 0; i < 5; i++) {
      state.particles.push({
        x: enemy.x + enemy.width / 2 + (Math.random() - 0.5) * 20,
        y: enemy.y - 10,
        vx: (Math.random() - 0.5) * 2,
        vy: -2 - Math.random() * 2,
        life: 40, maxLife: 40, element: elem,
        size: 5, color: '#ffff00',
      });
    }
  } else if (elem === enemy.resistance) {
    dmg = 5 * dmgMul;
    spawnParticles(state, enemy.x + enemy.width / 2, enemy.y, elem, 5);
  } else {
    spawnParticles(state, enemy.x + enemy.width / 2, enemy.y, elem, 10);
  }

  enemy.health -= dmg;
  enemy.state = 'hurt';
  enemy.hurtTimer = 15;
  enemy.vx = (proj.vx > 0 ? 1 : -1) * 3;
  Audio.playEnemyHit();

  if (enemy.health <= 0) {
    enemy.state = 'dead';
    enemy.hurtTimer = 60; // BUG-5: Use hurtTimer as death fade timer
    spawnParticles(state, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, elem, 25);
    const killScore = elem === enemy.weakness ? 50 : 25;
    addScore(state, killScore);
    spawnFloatingText(state, enemy.x + enemy.width / 2, enemy.y - 20, `+${killScore}`, '#ffcc00', 16);
    if (elem === enemy.weakness) {
      spawnFloatingText(state, enemy.x + enemy.width / 2, enemy.y - 40, 'SUPER EFFECTIVE!', '#ff4444', 12);
      Audio.playSuperEffective();
    }
    Audio.playEnemyDeath();
    state.enemiesDefeated++;
    if (state.endlessKills !== undefined) state.endlessKills++;
  }
}

function updateEnemies(state: GameState) {
  const s = state.stickman;

  for (const enemy of state.enemies) {
    if (enemy.state === 'dead') continue;

    enemy.animTimer++;

    if (enemy.state === 'hurt') {
      enemy.hurtTimer--;
      if (enemy.hurtTimer <= 0) enemy.state = 'patrol';
      enemy.vx *= 0.9;
      enemy.x += enemy.vx;
      continue;
    }

    // Check distance to player
    const dx = (s.x + s.width / 2) - (enemy.x + enemy.width / 2);
    const dy = (s.y + s.height / 2) - (enemy.y + enemy.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Chase if close
    if (dist < 250) {
      enemy.state = 'chase';
    } else {
      enemy.state = 'patrol';
    }

    if (enemy.state === 'chase') {
      const dir = dx > 0 ? 1 : -1;
      enemy.facing = dir as 1 | -1;

      if (enemy.type === 'bat' || enemy.type === 'boss2') {
        const ax = enemy.type === 'boss2' ? 0.05 : 0.1;
        enemy.vx += dir * enemy.speed * ax;
        enemy.vy += (dy > 0 ? 1 : -1) * ax;
        enemy.vx *= 0.95;
        enemy.vy *= 0.95;
      } else {
        enemy.vx = dir * enemy.speed;
      }

      // BOSS ATTACK LOGIC
      if (enemy.type === 'boss1' || enemy.type === 'boss2') {
        enemy.attackTimer = (enemy.attackTimer || 0) + 1;
        // Boss 1: Ground smashes / rock throws every 120 frames
        if (enemy.type === 'boss1' && enemy.attackTimer >= 100) {
          enemy.attackTimer = 0;
          const throwH = -4;
          state.projectiles.push({
            x: enemy.x + (dir === 1 ? enemy.width : -20),
            y: enemy.y + enemy.height / 2,
            vx: dir * 4, vy: throwH,
            element: 'earth', life: 100,
            isEnemy: true, size: 10
          });
          spawnParticles(state, enemy.x + enemy.width / 2, enemy.y + enemy.height, 'earth', 20);
        }
        // Boss 2: Rapid fire elemental blasts every 60 frames
        if (enemy.type === 'boss2' && enemy.attackTimer >= 60) {
          enemy.attackTimer = 0;
          const randomEl = (['fire', 'water', 'earth', 'wind'] as const)[Math.floor(Math.random() * 4)];
          const angle = Math.atan2(dy, dx);
          state.projectiles.push({
            x: enemy.x + enemy.width / 2,
            y: enemy.y + enemy.height / 2,
            vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5,
            element: randomEl, life: 100,
            isEnemy: true, size: 8
          });
          spawnParticles(state, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, randomEl, 15);
        }
      }
    } else {
      // Patrol
      const distFromOrigin = enemy.x - enemy.originX;
      if (Math.abs(distFromOrigin) > enemy.patrolRange) {
        enemy.facing = distFromOrigin > 0 ? -1 : 1;
      }
      if (enemy.type === 'bat' || enemy.type === 'boss2') {
        enemy.vx = enemy.facing * enemy.speed * 0.5;
        enemy.vy = Math.sin(enemy.animTimer * 0.05) * (enemy.type === 'boss2' ? 0.4 : 0.8);
      } else {
        enemy.vx = enemy.facing * enemy.speed * 0.5;
      }
    }

    // Apply physics
    if (enemy.type !== 'bat' && enemy.type !== 'boss2') {
      enemy.vy += GRAVITY;
    }
    enemy.x += enemy.vx;
    enemy.y += enemy.vy;

    // Platform collision for non-flying enemies
    if (enemy.type !== 'bat' && enemy.type !== 'boss2') {
      for (const p of state.platforms) {
        if (p.melting) continue;
        if (
          enemy.x + enemy.width > p.x &&
          enemy.x < p.x + p.width &&
          enemy.y + enemy.height > p.y &&
          enemy.y + enemy.height < p.y + p.height + enemy.vy + 5 &&
          enemy.vy >= 0
        ) {
          enemy.y = p.y - enemy.height;
          enemy.vy = 0;
        }
      }
    }

    // World bounds
    enemy.x = Math.max(0, Math.min(state.worldWidth - enemy.width, enemy.x));
    if (enemy.type === 'bat' || enemy.type === 'boss2') {
      enemy.y = Math.max(50, Math.min(state.worldHeight - 150, enemy.y));
    }

    // Damage player on contact
    if (s.invincibleTimer <= 0 &&
      s.x + s.width > enemy.x && s.x < enemy.x + enemy.width &&
      s.y + s.height > enemy.y && s.y < enemy.y + enemy.height
    ) {
      const ds = DIFFICULTY_SETTINGS[state.difficulty];
      const damage = Math.floor(enemy.damage * ds.enemyDamageMult);
      s.health -= damage;
      state.redFlash = 15; // Set red flash
      s.invincibleTimer = 60;
      s.vy = -8;
      s.vx = dx < 0 ? 5 : -5;
      spawnParticles(state, s.x + s.width / 2, s.y + s.height / 2, 'fire', 10);
      state.screenShake = 12; // IMP-4: Screen shake on damage
      spawnFloatingText(state, s.x + s.width / 2, s.y - 20, `-${damage}`, '#ff4444', 16);
      Audio.playDamage();
    }
  }
}

export function update(state: GameState): void {
  // Handle non-playing screens
  if (state.screen !== 'playing') {
    state.screenTimer++;
    // Still update floating texts on non-playing screens
    updateFloatingTexts(state);
    return;
  }

  // IMP-1: Pause check
  if (state.paused) return;

  // Level intro
  if (state.showLevelIntro) {
    state.levelIntroTimer--;
    if (state.levelIntroTimer <= 0) {
      state.showLevelIntro = false;
    }
    return;
  }

  const s = state.stickman;

  // Combo timer
  if (state.comboTimer > 0) {
    state.comboTimer--;
    if (state.comboTimer <= 0) state.comboCount = 0;
  }

  // Input handling
  s.walking = false;
  if (state.keys.has('a') || state.keys.has('arrowleft')) {
    s.vx -= MOVE_SPEED;
    s.facing = -1;
    s.walking = true;
  }
  if (state.keys.has('d') || state.keys.has('arrowright')) {
    s.vx += MOVE_SPEED;
    s.facing = 1;
    s.walking = true;
  }
  if ((state.keys.has('w') || state.keys.has('arrowup') || state.keys.has(' ')) && s.onGround) {
    s.vy = JUMP_FORCE;
    s.onGround = false;
    s.jumping = true;
    Audio.playJump();
  }

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
    const regenBonus = 1 + (state.upgrades.regenLevel * 0.20);
    s.mana = Math.min(s.maxMana, s.mana + (ds.manaRegenRate * regenBonus));
  }

  // Physics
  s.vy += GRAVITY;

  // Base friction (modified later by ice)
  let currentFriction = FRICTION;
  // Apply friction
  s.vx *= currentFriction;

  // Apply velocity
  s.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, s.vx));
  s.x += s.vx;

  // Late-apply ice friction (since onGround calculation happens lower down)
  if (state.onIce) {
    s.vx /= (FRICTION * 0.90); // Counteracts some friction
  }

  s.y += s.vy;

  // World bounds
  s.x = Math.max(0, Math.min(state.worldWidth - s.width, s.x));

  // Fall death
  if (s.y > state.worldHeight + 50) {
    s.health = 0;
  }

  // Platform collision
  s.onGround = false;
  for (const p of state.platforms) {
    if (p.melting) continue;
    if (
      s.x + s.width > p.x && s.x < p.x + p.width &&
      s.y + s.height > p.y && s.y + s.height < p.y + p.height + s.vy + 5 &&
      s.vy >= 0
    ) {
      s.y = p.y - s.height;
      s.vy = 0;
      s.onGround = true;
      s.jumping = false;
      // BUG-6 FIX: Ice should be SLIPPERY (less friction), not stickier
      if (p.type === 'ice') s.vx /= (FRICTION * 0.88);
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
      s.jumping = false;
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
    if (obj.type === 'wind_zone' || obj.type === 'water_current') {
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
      addScore(state, 100 + state.gemsCollected * 10);
      Audio.playPortalEnter();
      Audio.playLevelComplete();
      Audio.stopMusic();
      // Bonus for all gems
      if (state.gemsCollected >= state.totalGems) {
        addScore(state, 200);
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

  // Mana regen
  s.mana = Math.min(s.maxMana, s.mana + 0.15);

  // Update enemies
  updateEnemies(state);

  // Update projectiles
  // Update projectiles logic (including synergy)
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    if (p.element !== 'wind') p.vy += GRAVITY * 0.3;
    p.x += p.vx; p.y += p.vy;
    p.life--;
    if (Math.random() > 0.3) spawnParticles(state, p.x, p.y, p.element, 1);

    let hit = false;
    if (p.isEnemy) {
      if (s.invincibleTimer <= 0 && p.x > s.x - p.size && p.x < s.x + s.width + p.size &&
        p.y > s.y - p.size && p.y < s.y + s.height + p.size) {
        const ds = DIFFICULTY_SETTINGS[state.difficulty];
        const damage = Math.floor(20 * ds.enemyDamageMult);
        s.health -= damage; s.invincibleTimer = 60; s.vy = -6; s.vx = p.vx > 0 ? 4 : -4;
        state.redFlash = 15;
        spawnParticles(state, s.x + s.width / 2, s.y + s.height / 2, p.element, 15);
        state.screenShake = 15; spawnFloatingText(state, s.x + s.width / 2, s.y - 20, `-${damage}`, '#ff4444', 16);
        Audio.playDamage(); hit = true;
      }
    } else {
      // Synergy Check
      for (let j = 0; j < state.projectiles.length; j++) {
        if (i === j) continue;
        const o = state.projectiles[j];
        if (o.isEnemy || o.element === p.element) continue;
        const dist = Math.sqrt((p.x - o.x) ** 2 + (p.y - o.y) ** 2);
        if (dist < p.size + o.size + 10) {
          createSynergyZone(state, (p.x + o.x) / 2, (p.y + o.y) / 2, p.element, o.element);
          state.projectiles.splice(Math.max(i, j), 1);
          state.projectiles.splice(Math.min(i, j), 1);
          if (j < i) i--;
          hit = true; break;
        }
      }
      if (!hit) {
        for (const enemy of state.enemies) {
          if (enemy.state === 'dead') continue;
          if (p.x > enemy.x - p.size && p.x < enemy.x + enemy.width + p.size &&
            p.y > enemy.y - p.size && p.y < enemy.y + enemy.height + p.size) {
            handleEnemyHit(state, p, enemy); hit = true; break;
          }
        }
      }
      if (!hit) {
        for (const obj of state.envObjects) {
          if (obj.state === 'destroyed' || obj.state === 'melted' || obj.state === 'collected') continue;
          if (obj.type === 'gem' || obj.type === 'health_potion' || obj.type === 'mana_crystal' || obj.type === 'portal' || obj.type === 'spike') continue;
          if (p.x > obj.x - p.size && p.x < obj.x + obj.width + p.size &&
            p.y > obj.y - p.size && p.y < obj.y + obj.height + p.size) {
            handleElementInteraction(state, p, obj); spawnParticles(state, p.x, p.y, p.element, 8); hit = true; break;
          }
        }
      }
      if (!hit) {
        for (const plat of state.platforms) {
          if (p.x > plat.x && p.x < plat.x + plat.width && p.y > plat.y && p.y < plat.y + plat.height) {
            spawnParticles(state, p.x, p.y, p.element, 5);
            if (p.element === 'earth') {
              state.platforms.push({ x: p.x - 30, y: p.y - 15, width: 60, height: 15, type: 'earth', meltTimer: 300 });
              addScore(state, 5);
            }
            if (p.element === 'fire' && plat.type === 'ice') {
              plat.melting = true; plat.meltTimer = 120;
              spawnParticles(state, p.x, p.y, 'water', 10);
              addScore(state, 10);
            }
            hit = true; break;
          }
        }
      }
    }
    if (hit || p.life <= 0 || p.y > state.worldHeight + 100) {
      state.projectiles.splice(i, 1);
    }
  }

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
            e.vx += (dx / dist) * 0.5; e.vy += (dy / dist) * 0.2;
            if (dist < 40 && Math.random() > 0.9) { e.health -= 2; e.state = 'hurt'; e.hurtTimer = 5; spawnParticles(state, e.x + e.width / 2, e.y + e.height / 2, 'fire', 2); }
          }
        }
      }
      if (obj.state === 'mud') {
        for (const e of state.enemies) {
          if (e.x + e.width > obj.x && e.x < obj.x + obj.width && e.y + e.height > obj.y && e.y + e.height < obj.y + obj.height + 10) {
            e.vx *= 0.2; e.speed *= 0.1;
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
            e.vx += (dx / dist) * 1.5; e.vy -= 1.2; // Blow away
            e.speed *= 0.5;
          }
        }
        if (Math.random() > 0.5) spawnParticles(state, centerX, centerY, 'earth', 2);
      }
    }
  }

  // Update particles
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx; p.y += p.vy;
    if (p.element === 'fire') p.vy -= 0.05; else p.vy += 0.02;
    p.vx *= 0.98; p.life--;
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
  updateFloatingTexts(state);
  if (state.screenShake > 0) state.screenShake--;
  if (state.redFlash > 0) state.redFlash--;
  if (state.levelTimer > 0) {
    state.levelTimer--;
    if (state.levelTimer <= 0) s.health = 0;
  }

  // Camera follow
  const targetCamX = s.x - CANVAS_W / 2 + s.width / 2;
  const targetCamY = Math.min(0, s.y - CANVAS_H / 2);
  state.camera.x += (targetCamX - state.camera.x) * 0.08;
  state.camera.y += (targetCamY - state.camera.y) * 0.08;
  state.camera.x = Math.max(0, Math.min(state.worldWidth - CANVAS_W, state.camera.x));
  state.camera.y = Math.max(state.worldHeight - CANVAS_H, Math.min(0, state.camera.y));

  for (const star of state.backgroundStars) star.twinkle += 0.03;

  // Death
  if (s.health <= 0) {
    state.lives--; state.screenShake = 20;
    if (state.lives <= 0) {
      state.screen = 'gameOver'; state.screenTimer = 0;
      saveProgress(state); Audio.playGameOver(); Audio.stopMusic();
    } else {
      const def = getLevel(state.currentLevel);
      s.x = def.playerStart.x; s.y = def.playerStart.y;
      s.vx = 0; s.vy = 0; s.health = s.maxHealth; s.mana = s.maxMana;
      s.invincibleTimer = 120; Audio.playDeath();
    }
  }

  // Wave Director (Endless Mode)
  if (state.endlessWave !== undefined && state.endlessTimer !== undefined) {
    state.endlessTimer++;
    const aliveEnemies = state.enemies.filter(e => e.state !== 'dead').length;
    if (aliveEnemies === 0 && state.endlessTimer > 180) {
      state.endlessWave++; state.endlessTimer = 0;
      s.health = Math.min(s.health + 25, s.maxHealth);
      spawnFloatingText(state, s.x + s.width / 2, s.y - 20, 'WAVE ' + state.endlessWave, '#ffff00', 24);
      const isBossWave = state.endlessWave % 5 === 0;
      const numEnemies = isBossWave ? 1 : Math.min(10, 2 + Math.floor(state.endlessWave * 0.8));
      for (let i = 0; i < numEnemies; i++) {
        const spawnX = Math.random() > 0.5 ? 100 + Math.random() * 200 : 900 - Math.random() * 200;
        if (isBossWave && i === 0) {
          const bType = state.endlessWave % 10 === 0 ? 'boss2' : 'boss1';
          state.enemies.push(makeEnemy(bType, spawnX, 530, 'water', 'earth', 200, 30 + state.endlessWave * 2, 1.5, bType === 'boss2' ? 1500 + state.endlessWave * 100 : 800 + state.endlessWave * 50));
        } else {
          const types = ['slime', 'bat', 'golem', 'fire_spirit', 'ice_spirit'] as const;
          const type = types[Math.floor(Math.random() * types.length)];
          state.enemies.push(makeEnemy(type, spawnX, 580, 'water', 'fire', 150, 15 + state.endlessWave, 1.5, 50 + state.endlessWave * 10));
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

// ===== IMP-3: LocalStorage Save/Load =====
export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as SaveData;
      return {
        ...data,
        gemsCurrency: data.gemsCurrency || 0,
        upgrades: data.upgrades || { healthLevel: 0, manaLevel: 0, regenLevel: 0, damageLevel: 0 }
      };
    }
  } catch { /* ignore */ }
  return {
    highScore: 0, furthestLevel: 0, totalGemsEver: 0,
    totalEnemiesDefeated: 0, difficulty: 'normal',
    gemsCurrency: 0, upgrades: { healthLevel: 0, manaLevel: 0, regenLevel: 0, damageLevel: 0 }
  };
}

export function saveProgress(state: GameState): void {
  try {
    const existing = loadSave();
    const data: SaveData = {
      highScore: Math.max(state.highScore, existing.highScore),
      furthestLevel: Math.max(state.currentLevel, existing.furthestLevel),
      totalGemsEver: Math.max(state.totalGemsEver, existing.totalGemsEver),
      totalEnemiesDefeated: Math.max(state.enemiesDefeated, existing.totalEnemiesDefeated),
      difficulty: state.difficulty,
      gemsCurrency: state.gemsCurrency,
      upgrades: state.upgrades,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch { /* ignore if localStorage unavailable */ }
}
