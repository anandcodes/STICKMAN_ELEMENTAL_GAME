import type { GameState, Projectile, Element, EnvObject, Enemy } from './types';
import { getLevel, TOTAL_LEVELS } from './levels';

const GRAVITY = 0.6;
const FRICTION = 0.85;
const JUMP_FORCE = -13;
const MOVE_SPEED = 1.2;
const MAX_SPEED = 5.5;
const CANVAS_W = 1200;
const CANVAS_H = 700;

export function createInitialState(level = 0, score = 0, lives = 3, highScore = 0): GameState {
  const def = getLevel(level);

  const stickman = {
    x: def.playerStart.x, y: def.playerStart.y,
    vx: 0, vy: 0, width: 24, height: 50,
    onGround: false, facing: 1 as const,
    animFrame: 0, animTimer: 0,
    walking: false, jumping: false,
    casting: false, castTimer: 0,
    health: 100, maxHealth: 100,
    mana: 100, maxMana: 100,
    invincibleTimer: 60,
  };

  const bgStars = Array.from({ length: 80 }, () => ({
    x: Math.random() * def.worldWidth,
    y: Math.random() * 400,
    size: Math.random() * 2 + 0.5,
    twinkle: Math.random() * Math.PI * 2,
  }));

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
    lives,
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
    highScore: highScore,
    totalGemsEver: 0,
    enemiesDefeated: 0,
  };
}

function getUnlockedElements(level: number): Element[] {
  if (level === 0) return ['fire', 'water'];
  if (level === 1) return ['fire', 'water', 'earth'];
  return ['fire', 'water', 'earth', 'wind'];
}

function spawnParticles(state: GameState, x: number, y: number, element: Element, count: number) {
  const colors: Record<Element, string[]> = {
    fire: ['#ff4400', '#ff8800', '#ffcc00', '#ff6600'],
    water: ['#0088ff', '#00bbff', '#44ddff', '#0066cc'],
    earth: ['#886633', '#aa8844', '#66aa33', '#558822'],
    wind: ['#ccddff', '#aabbee', '#ddeeff', '#88aacc'],
  };

  for (let i = 0; i < count; i++) {
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
        obj.growthLevel = Math.min((obj.growthLevel || 0) + 1, 3);
        if (obj.growthLevel >= 3) {
          obj.state = 'grown'; obj.height = 80; obj.width = 40;
          obj.y = 540; obj.solid = true;
          addScore(state, 20);
        } else {
          obj.height = 20 + obj.growthLevel * 15;
          obj.width = 20 + obj.growthLevel * 5;
          obj.y = 580 - obj.height;
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
        obj.type = 'rock'; obj.solid = true; obj.width = 40; obj.height = 25; obj.y = 555;
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

function handleEnemyHit(state: GameState, proj: Projectile, enemy: Enemy) {
  const elem = proj.element;
  let dmg = 15;

  if (elem === enemy.weakness) {
    dmg = 35;
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
    dmg = 5;
    spawnParticles(state, enemy.x + enemy.width / 2, enemy.y, elem, 5);
  } else {
    spawnParticles(state, enemy.x + enemy.width / 2, enemy.y, elem, 10);
  }

  enemy.health -= dmg;
  enemy.state = 'hurt';
  enemy.hurtTimer = 15;
  enemy.vx = (proj.vx > 0 ? 1 : -1) * 3;

  if (enemy.health <= 0) {
    enemy.state = 'dead';
    spawnParticles(state, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, elem, 25);
    addScore(state, elem === enemy.weakness ? 50 : 25);
    state.enemiesDefeated++;
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

      if (enemy.type === 'bat') {
        enemy.vx += dir * enemy.speed * 0.1;
        enemy.vy += (dy > 0 ? 1 : -1) * 0.1;
        enemy.vx *= 0.95;
        enemy.vy *= 0.95;
      } else {
        enemy.vx = dir * enemy.speed;
      }
    } else {
      // Patrol
      const distFromOrigin = enemy.x - enemy.originX;
      if (Math.abs(distFromOrigin) > enemy.patrolRange) {
        enemy.facing = distFromOrigin > 0 ? -1 : 1;
      }
      if (enemy.type === 'bat') {
        enemy.vx = enemy.facing * enemy.speed * 0.5;
        enemy.vy = Math.sin(enemy.animTimer * 0.05) * 0.8;
      } else {
        enemy.vx = enemy.facing * enemy.speed * 0.5;
      }
    }

    // Apply physics
    if (enemy.type !== 'bat') {
      enemy.vy += GRAVITY;
    }
    enemy.x += enemy.vx;
    enemy.y += enemy.vy;

    // Platform collision for non-flying enemies
    if (enemy.type !== 'bat') {
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
    if (enemy.type === 'bat') {
      enemy.y = Math.max(50, Math.min(state.worldHeight - 150, enemy.y));
    }

    // Damage player on contact
    if (s.invincibleTimer <= 0 &&
      s.x + s.width > enemy.x && s.x < enemy.x + enemy.width &&
      s.y + s.height > enemy.y && s.y < enemy.y + enemy.height
    ) {
      s.health -= enemy.damage;
      s.invincibleTimer = 60;
      s.vy = -8;
      s.vx = dx < 0 ? 5 : -5;
      spawnParticles(state, s.x + s.width / 2, s.y + s.height / 2, 'fire', 10);
    }
  }
}

export function update(state: GameState): void {
  // Handle non-playing screens
  if (state.screen !== 'playing') {
    state.screenTimer++;
    return;
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
  }

  // Shooting
  if (state.mouseDown && state.castCooldown <= 0) {
    spawnProjectile(state);
  }
  if (state.castCooldown > 0) state.castCooldown--;

  // Invincibility
  if (s.invincibleTimer > 0) s.invincibleTimer--;

  // Physics
  s.vy += GRAVITY;
  s.vx *= FRICTION;
  s.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, s.vx));
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
      if (p.type === 'ice') s.vx *= 0.98;
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

  // Collectibles
  for (const obj of state.envObjects) {
    if (obj.state === 'collected' || obj.state === 'destroyed') continue;

    const touching = s.x + s.width > obj.x && s.x < obj.x + obj.width &&
      s.y + s.height > obj.y && s.y < obj.y + obj.height;

    if (!touching) continue;

    if (obj.type === 'gem') {
      obj.state = 'collected';
      state.gemsCollected++;
      state.totalGemsEver++;
      addScore(state, 25);
      spawnParticles(state, obj.x + obj.width / 2, obj.y + obj.height / 2, 'wind', 12);
      // Check portal
      if (state.gemsCollected >= state.gemsRequired && !state.portalOpen) {
        state.portalOpen = true;
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
    }
    if (obj.type === 'mana_crystal') {
      obj.state = 'collected';
      s.mana = Math.min(s.maxMana, s.mana + 50);
      spawnParticles(state, obj.x + 8, obj.y + 10, 'water', 10);
      addScore(state, 10);
    }
    if (obj.type === 'portal' && obj.state === 'active') {
      // Level complete!
      state.screen = 'levelComplete';
      state.screenTimer = 0;
      addScore(state, 100 + state.gemsCollected * 10);
      // Bonus for all gems
      if (state.gemsCollected >= state.totalGems) {
        addScore(state, 200);
      }
    }
    if (obj.type === 'spike' && s.invincibleTimer <= 0) {
      s.health -= 20;
      s.invincibleTimer = 60;
      s.vy = -10;
      spawnParticles(state, s.x + s.width / 2, s.y + s.height, 'fire', 8);
    }
  }

  // Fire pit damage
  for (const obj of state.envObjects) {
    if (obj.type === 'fire_pit' && obj.state === 'burning' && s.invincibleTimer <= 0) {
      const d = Math.abs((s.x + s.width / 2) - (obj.x + obj.width / 2));
      if (d < 40 && s.y + s.height > obj.y - 10) {
        s.health -= 0.3;
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
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    if (p.element !== 'wind') p.vy += GRAVITY * 0.3;
    p.x += p.vx;
    p.y += p.vy;
    p.life--;

    if (Math.random() > 0.3) spawnParticles(state, p.x, p.y, p.element, 1);

    let hit = false;

    // Hit enemies
    for (const enemy of state.enemies) {
      if (enemy.state === 'dead') continue;
      if (
        p.x > enemy.x - p.size && p.x < enemy.x + enemy.width + p.size &&
        p.y > enemy.y - p.size && p.y < enemy.y + enemy.height + p.size
      ) {
        handleEnemyHit(state, p, enemy);
        hit = true;
        break;
      }
    }

    // Hit env objects
    if (!hit) {
      for (const obj of state.envObjects) {
        if (obj.state === 'destroyed' || obj.state === 'melted' || obj.state === 'collected') continue;
        if (obj.type === 'gem' || obj.type === 'health_potion' || obj.type === 'mana_crystal' || obj.type === 'portal' || obj.type === 'spike') continue;
        if (
          p.x > obj.x - p.size && p.x < obj.x + obj.width + p.size &&
          p.y > obj.y - p.size && p.y < obj.y + obj.height + p.size
        ) {
          handleElementInteraction(state, p, obj);
          spawnParticles(state, p.x, p.y, p.element, 8);
          hit = true;
          break;
        }
      }
    }

    // Hit platforms
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
          hit = true;
          break;
        }
      }
    }

    if (hit || p.life <= 0 || p.y > state.worldHeight) {
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

  // Update env objects (burning etc)
  for (const obj of state.envObjects) {
    if (obj.state === 'burning' && obj.type !== 'fire_pit') {
      obj.health -= 0.5;
      if (Math.random() > 0.6) spawnParticles(state, obj.x + Math.random() * obj.width, obj.y, 'fire', 1);
      if (obj.health <= 0) {
        obj.state = 'destroyed'; obj.solid = false;
        spawnParticles(state, obj.x + obj.width / 2, obj.y + obj.height / 2, 'fire', 20);
        addScore(state, 10);
      }
    }
    if (obj.type === 'fire_pit' && obj.state === 'burning' && Math.random() > 0.5) {
      spawnParticles(state, obj.x + Math.random() * obj.width, obj.y - 5, 'fire', 1);
    }
  }

  // Update particles
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx; p.y += p.vy;
    if (p.element === 'fire') p.vy -= 0.05; else p.vy += 0.02;
    p.vx *= 0.98;
    p.life--;
    if (p.life <= 0) state.particles.splice(i, 1);
  }

  // Level timer
  if (state.levelTimer > 0) {
    state.levelTimer--;
    if (state.levelTimer <= 0) {
      s.health = 0; // time's up
    }
  }

  // Camera follow
  const targetCamX = s.x - CANVAS_W / 2 + s.width / 2;
  const targetCamY = Math.min(0, s.y - CANVAS_H / 2);
  state.camera.x += (targetCamX - state.camera.x) * 0.08;
  state.camera.y += (targetCamY - state.camera.y) * 0.08;
  state.camera.x = Math.max(0, Math.min(state.worldWidth - CANVAS_W, state.camera.x));
  state.camera.y = Math.max(state.worldHeight - CANVAS_H, Math.min(0, state.camera.y));

  // Background stars
  for (const star of state.backgroundStars) star.twinkle += 0.03;

  // Death check
  if (s.health <= 0) {
    state.lives--;
    if (state.lives <= 0) {
      state.screen = 'gameOver';
      state.screenTimer = 0;
    } else {
      // Respawn
      const def = getLevel(state.currentLevel);
      s.x = def.playerStart.x;
      s.y = def.playerStart.y;
      s.vx = 0; s.vy = 0;
      s.health = s.maxHealth;
      s.mana = s.maxMana;
      s.invincibleTimer = 120;
    }
  }
}
