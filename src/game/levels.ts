import type { LevelDef, Platform, EnvObject, Enemy, Element } from './types';

let nextId = 1000;
function nid() { return nextId++; }

export function makeEnemy(
  type: Enemy['type'], x: number, y: number,
  weakness: Element, resistance: Element,
  patrolRange: number, damage: number, speed: number,
  hp: number
): Enemy {
  const sizes: Record<Enemy['type'], [number, number]> = {
    slime: [28, 22], bat: [30, 20], golem: [36, 44],
    fire_spirit: [26, 30], ice_spirit: [26, 30],
    boss1: [90, 110], boss2: [70, 90], // Boss sizes
  };
  const [w, h] = sizes[type];
  return {
    id: nid(), type, x, y: y - h, width: w, height: h,
    vx: 0, vy: 0, health: hp, maxHealth: hp,
    facing: 1, weakness, resistance,
    state: 'patrol', hurtTimer: 0,
    patrolRange, originX: x, animTimer: 0,
    damage, speed,
  };
}

function makeGem(x: number, y: number, color?: string): EnvObject {
  return {
    id: nid(), type: 'gem', x, y, width: 16, height: 16,
    health: 1, maxHealth: 1, state: 'normal', solid: false,
    gemColor: color || ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff'][Math.floor(Math.random() * 6)],
  };
}

function makePortal(x: number, y: number): EnvObject {
  return {
    id: nid(), type: 'portal', x, y: y - 60, width: 40, height: 60,
    health: 1, maxHealth: 1, state: 'normal', solid: false,
  };
}

function makeSpike(x: number, y: number, w: number): EnvObject {
  return {
    id: nid(), type: 'spike', x, y: y - 15, width: w, height: 15,
    health: 999, maxHealth: 999, state: 'normal', solid: false,
  };
}

function makeWindZone(x: number, y: number, w: number, h: number, direction: number, strength = 0.4): EnvObject {
  return {
    id: nid(), type: 'wind_zone', x, y, width: w, height: h,
    health: 999, maxHealth: 999, state: 'normal', solid: false,
    windDirection: direction, windStrength: strength,
  };
}

function makeWaterCurrent(x: number, y: number, w: number, speed = 0.5): EnvObject {
  return {
    id: nid(), type: 'water_current', x, y, width: w, height: 15,
    health: 999, maxHealth: 999, state: 'normal', solid: false,
    currentSpeed: speed,
  };
}

// ============ LEVEL 1: Forest Awakening ============
function level1(): LevelDef {
  const platforms: Platform[] = [
    { x: 0, y: 580, width: 2500, height: 120, type: 'ground' },
    { x: 250, y: 460, width: 150, height: 20, type: 'stone' },
    { x: 500, y: 380, width: 180, height: 20, type: 'stone' },
    { x: 800, y: 450, width: 140, height: 20, type: 'stone' },
    { x: 1050, y: 350, width: 160, height: 20, type: 'stone' },
    { x: 1350, y: 420, width: 180, height: 20, type: 'stone' },
    { x: 1650, y: 480, width: 150, height: 20, type: 'stone' },
    { x: 1900, y: 380, width: 200, height: 20, type: 'stone' },
    { x: 2150, y: 450, width: 160, height: 20, type: 'stone' },
  ];

  const envObjects: EnvObject[] = [
    // Crates to burn
    { id: nid(), type: 'crate', x: 350, y: 540, width: 40, height: 40, health: 100, maxHealth: 100, state: 'normal', solid: true },
    { id: nid(), type: 'crate', x: 390, y: 540, width: 40, height: 40, health: 100, maxHealth: 100, state: 'normal', solid: true },
    { id: nid(), type: 'crate', x: 370, y: 500, width: 40, height: 40, health: 100, maxHealth: 100, state: 'normal', solid: true },
    // Plants
    { id: nid(), type: 'plant', x: 650, y: 560, width: 20, height: 20, health: 100, maxHealth: 100, state: 'normal', solid: false, growthLevel: 0 },
    { id: nid(), type: 'plant', x: 1200, y: 560, width: 20, height: 20, health: 100, maxHealth: 100, state: 'normal', solid: false, growthLevel: 0 },
    // Fire pits
    { id: nid(), type: 'fire_pit', x: 900, y: 560, width: 40, height: 20, health: 100, maxHealth: 100, state: 'burning', solid: false },
    // Gems
    makeGem(270, 440), makeGem(550, 360), makeGem(830, 430),
    makeGem(1100, 330), makeGem(1400, 400), makeGem(1700, 460),
    makeGem(1950, 360), makeGem(2200, 430),
    // Portal at end
    makePortal(2350, 580),
  ];

  const enemies: Enemy[] = [
    makeEnemy('slime', 600, 580, 'fire', 'water', 120, 8, 1.2, 30),
    makeEnemy('slime', 1000, 580, 'fire', 'water', 100, 8, 1.0, 30),
    makeEnemy('bat', 1500, 400, 'wind', 'earth', 150, 6, 1.8, 20),
  ];

  return {
    name: 'Forest Awakening',
    subtitle: 'Learn the basics of elemental magic',
    worldWidth: 2500, worldHeight: 700,
    bgColors: ['#0a1a2e', '#0a2a1e', '#1a3a1e', '#0a1a1e'],
    platforms, envObjects, enemies,
    playerStart: { x: 80, y: 480 },
    gemsRequired: 5, totalGems: 8,
    elementHint: 'Use 🔥 Fire on crates and slimes!',
    timeLimit: 0,
  };
}

// ============ LEVEL 2: Ice Caverns ============
function level2(): LevelDef {
  const platforms: Platform[] = [
    { x: 0, y: 580, width: 600, height: 120, type: 'ground' },
    { x: 700, y: 580, width: 300, height: 120, type: 'ice' },
    { x: 1100, y: 580, width: 400, height: 120, type: 'ground' },
    { x: 1600, y: 580, width: 300, height: 120, type: 'ice' },
    { x: 2000, y: 580, width: 800, height: 120, type: 'ground' },
    // Upper platforms
    { x: 200, y: 440, width: 120, height: 20, type: 'stone' },
    { x: 450, y: 360, width: 140, height: 20, type: 'ice' },
    { x: 750, y: 440, width: 120, height: 20, type: 'ice' },
    { x: 1000, y: 350, width: 160, height: 20, type: 'stone' },
    { x: 1300, y: 430, width: 140, height: 20, type: 'stone' },
    { x: 1550, y: 350, width: 150, height: 20, type: 'ice' },
    { x: 1800, y: 450, width: 130, height: 20, type: 'stone' },
    { x: 2100, y: 380, width: 160, height: 20, type: 'stone' },
    { x: 2400, y: 450, width: 180, height: 20, type: 'stone' },
  ];

  const envObjects: EnvObject[] = [
    // Ice blocks
    { id: nid(), type: 'ice', x: 500, y: 540, width: 50, height: 40, health: 100, maxHealth: 100, state: 'normal', solid: true },
    { id: nid(), type: 'ice', x: 850, y: 540, width: 50, height: 40, health: 100, maxHealth: 100, state: 'normal', solid: true },
    { id: nid(), type: 'ice', x: 1700, y: 540, width: 50, height: 40, health: 100, maxHealth: 100, state: 'normal', solid: true },
    // Puddles
    { id: nid(), type: 'puddle', x: 1200, y: 570, width: 60, height: 10, health: 100, maxHealth: 100, state: 'normal', solid: false },
    { id: nid(), type: 'puddle', x: 2200, y: 570, width: 60, height: 10, health: 100, maxHealth: 100, state: 'normal', solid: false },
    // Gems
    makeGem(220, 420), makeGem(470, 340), makeGem(770, 420),
    makeGem(1050, 330), makeGem(1350, 410), makeGem(1600, 330),
    makeGem(1840, 430), makeGem(2140, 360), makeGem(2450, 430),
    makeGem(2600, 560),
    // Health potion
    { id: nid(), type: 'health_potion', x: 1400, y: 550, width: 16, height: 20, health: 1, maxHealth: 1, state: 'normal', solid: false },
    // Spikes
    makeSpike(650, 580, 40),
    makeSpike(1050, 580, 50),
    // IMP-13: Water currents in icy areas
    makeWaterCurrent(700, 570, 300, 0.6),
    makeWaterCurrent(1600, 570, 300, -0.5),
    // Portal
    makePortal(2650, 580),
  ];

  const enemies: Enemy[] = [
    makeEnemy('ice_spirit', 700, 500, 'fire', 'water', 130, 10, 1.5, 40),
    makeEnemy('slime', 1200, 580, 'fire', 'water', 100, 8, 1.0, 35),
    makeEnemy('ice_spirit', 1700, 480, 'fire', 'water', 120, 10, 1.3, 40),
    makeEnemy('bat', 2100, 380, 'wind', 'earth', 180, 7, 2.0, 25),
    makeEnemy('bat', 2400, 350, 'wind', 'earth', 140, 7, 1.8, 25),
  ];

  return {
    name: 'Ice Caverns',
    subtitle: 'Melt the ice, freeze the puddles',
    worldWidth: 2800, worldHeight: 700,
    bgColors: ['#0a0a3e', '#1a1a5e', '#2d3b6e', '#1a2a4e'],
    platforms, envObjects, enemies,
    playerStart: { x: 60, y: 480 },
    gemsRequired: 7, totalGems: 10,
    elementHint: 'Use 🔥 Fire to melt ice, 💧 Water to freeze puddles!',
    timeLimit: 0,
  };
}

// ============ LEVEL 3: Volcanic Forge ============
function level3(): LevelDef {
  const platforms: Platform[] = [
    { x: 0, y: 580, width: 400, height: 120, type: 'ground' },
    { x: 500, y: 580, width: 250, height: 120, type: 'ground' },
    { x: 850, y: 580, width: 300, height: 120, type: 'ground' },
    { x: 1250, y: 580, width: 200, height: 120, type: 'ground' },
    { x: 1550, y: 580, width: 350, height: 120, type: 'ground' },
    { x: 2000, y: 580, width: 500, height: 120, type: 'ground' },
    { x: 2600, y: 580, width: 400, height: 120, type: 'ground' },
    // Upper
    { x: 200, y: 430, width: 120, height: 20, type: 'stone' },
    { x: 500, y: 350, width: 140, height: 20, type: 'stone' },
    { x: 850, y: 430, width: 130, height: 20, type: 'stone' },
    { x: 1100, y: 330, width: 150, height: 20, type: 'stone' },
    { x: 1400, y: 420, width: 140, height: 20, type: 'stone' },
    { x: 1700, y: 350, width: 160, height: 20, type: 'stone' },
    { x: 2050, y: 430, width: 140, height: 20, type: 'stone' },
    { x: 2350, y: 350, width: 150, height: 20, type: 'stone' },
    { x: 2650, y: 420, width: 160, height: 20, type: 'stone' },
  ];

  const envObjects: EnvObject[] = [
    // Fire pits everywhere
    { id: nid(), type: 'fire_pit', x: 430, y: 560, width: 40, height: 20, health: 100, maxHealth: 100, state: 'burning', solid: false },
    { id: nid(), type: 'fire_pit', x: 780, y: 560, width: 40, height: 20, health: 100, maxHealth: 100, state: 'burning', solid: false },
    { id: nid(), type: 'fire_pit', x: 1180, y: 560, width: 40, height: 20, health: 100, maxHealth: 100, state: 'burning', solid: false },
    { id: nid(), type: 'fire_pit', x: 1500, y: 560, width: 40, height: 20, health: 100, maxHealth: 100, state: 'burning', solid: false },
    // Rocks
    { id: nid(), type: 'rock', x: 650, y: 550, width: 35, height: 30, health: 200, maxHealth: 200, state: 'normal', solid: true },
    { id: nid(), type: 'rock', x: 1350, y: 550, width: 35, height: 30, health: 200, maxHealth: 200, state: 'normal', solid: true },
    { id: nid(), type: 'rock', x: 2200, y: 550, width: 35, height: 30, health: 200, maxHealth: 200, state: 'normal', solid: true },
    // Crates
    { id: nid(), type: 'crate', x: 550, y: 540, width: 40, height: 40, health: 100, maxHealth: 100, state: 'normal', solid: true },
    { id: nid(), type: 'crate', x: 950, y: 540, width: 40, height: 40, health: 100, maxHealth: 100, state: 'normal', solid: true },
    // Spikes in gaps
    makeSpike(420, 580, 60), makeSpike(770, 580, 60),
    makeSpike(1170, 580, 60), makeSpike(1470, 580, 60),
    // Gems
    makeGem(220, 410), makeGem(530, 330), makeGem(880, 410),
    makeGem(1130, 310), makeGem(1440, 400), makeGem(1740, 330),
    makeGem(2090, 410), makeGem(2390, 330), makeGem(2700, 400),
    makeGem(2500, 560), makeGem(300, 560), makeGem(1000, 560),
    // Health & mana pickups
    { id: nid(), type: 'health_potion', x: 1100, y: 550, width: 16, height: 20, health: 1, maxHealth: 1, state: 'normal', solid: false },
    { id: nid(), type: 'mana_crystal', x: 2100, y: 550, width: 16, height: 20, health: 1, maxHealth: 1, state: 'normal', solid: false },
    // Portal
    makePortal(2850, 580),
  ];

  const enemies: Enemy[] = [
    makeEnemy('fire_spirit', 400, 520, 'water', 'fire', 120, 12, 1.5, 50),
    makeEnemy('golem', 900, 580, 'water', 'earth', 100, 15, 0.8, 80),
    makeEnemy('fire_spirit', 1300, 500, 'water', 'fire', 130, 12, 1.5, 50),
    makeEnemy('slime', 1700, 580, 'fire', 'water', 100, 10, 1.2, 40),
    makeEnemy('golem', 2200, 580, 'water', 'earth', 80, 15, 0.7, 90),
    makeEnemy('fire_spirit', 2600, 500, 'water', 'fire', 100, 12, 1.4, 50),
  ];

  return {
    name: 'Volcanic Forge',
    subtitle: 'Extinguish the flames, defeat the fire spirits',
    worldWidth: 3000, worldHeight: 700,
    bgColors: ['#2a0a0a', '#3a1a0a', '#4a1a0a', '#2a0a0a'],
    platforms, envObjects, enemies,
    playerStart: { x: 60, y: 480 },
    gemsRequired: 8, totalGems: 12,
    elementHint: 'Use 💧 Water on fire pits and fire spirits!',
    timeLimit: 0,
  };
}

// ============ LEVEL 4: Sky Fortress ============
function level4(): LevelDef {
  const platforms: Platform[] = [
    { x: 0, y: 580, width: 300, height: 120, type: 'ground' },
    { x: 400, y: 500, width: 160, height: 20, type: 'stone' },
    { x: 650, y: 420, width: 140, height: 20, type: 'stone' },
    { x: 900, y: 350, width: 160, height: 20, type: 'stone' },
    { x: 1150, y: 430, width: 140, height: 20, type: 'stone' },
    { x: 1400, y: 350, width: 150, height: 20, type: 'stone' },
    { x: 1650, y: 280, width: 160, height: 20, type: 'stone' },
    { x: 1900, y: 360, width: 140, height: 20, type: 'stone' },
    { x: 2100, y: 440, width: 160, height: 20, type: 'stone' },
    { x: 2350, y: 350, width: 180, height: 20, type: 'stone' },
    { x: 2600, y: 450, width: 160, height: 20, type: 'stone' },
    { x: 2850, y: 580, width: 350, height: 120, type: 'ground' },
  ];

  const envObjects: EnvObject[] = [
    // Plants (grow for extra platforms)
    { id: nid(), type: 'plant', x: 350, y: 560, width: 20, height: 20, health: 100, maxHealth: 100, state: 'normal', solid: false, growthLevel: 0 },
    { id: nid(), type: 'plant', x: 580, y: 560, width: 20, height: 20, health: 100, maxHealth: 100, state: 'normal', solid: false, growthLevel: 0 },
    { id: nid(), type: 'plant', x: 1050, y: 560, width: 20, height: 20, health: 100, maxHealth: 100, state: 'normal', solid: false, growthLevel: 0 },
    // Rocks to push
    { id: nid(), type: 'rock', x: 700, y: 390, width: 35, height: 30, health: 200, maxHealth: 200, state: 'normal', solid: true },
    { id: nid(), type: 'rock', x: 1450, y: 320, width: 35, height: 30, health: 200, maxHealth: 200, state: 'normal', solid: true },
    // Gems
    makeGem(430, 480), makeGem(690, 400), makeGem(940, 330),
    makeGem(1190, 410), makeGem(1440, 330), makeGem(1690, 260),
    makeGem(1940, 340), makeGem(2140, 420), makeGem(2400, 330),
    makeGem(2640, 430), makeGem(200, 560), makeGem(2900, 560),
    makeGem(1200, 560), makeGem(1700, 560),
    // Pickups
    { id: nid(), type: 'health_potion', x: 950, y: 550, width: 16, height: 20, health: 1, maxHealth: 1, state: 'normal', solid: false },
    { id: nid(), type: 'mana_crystal', x: 1900, y: 550, width: 16, height: 20, health: 1, maxHealth: 1, state: 'normal', solid: false },
    // IMP-12: Wind zones for platforming
    makeWindZone(600, 350, 80, 230, 1, 0.5),
    makeWindZone(1800, 280, 80, 300, -1, 0.4),
    makeWindZone(2400, 320, 80, 260, 1, 0.6),
    // Portal
    makePortal(3050, 580),
  ];

  const enemies: Enemy[] = [
    makeEnemy('bat', 500, 420, 'wind', 'earth', 200, 8, 2.0, 30),
    makeEnemy('bat', 800, 300, 'wind', 'earth', 180, 8, 2.2, 30),
    makeEnemy('slime', 1200, 580, 'fire', 'water', 100, 10, 1.2, 40),
    makeEnemy('bat', 1500, 280, 'wind', 'earth', 200, 9, 2.0, 35),
    makeEnemy('ice_spirit', 1800, 340, 'fire', 'water', 150, 12, 1.5, 45),
    makeEnemy('bat', 2200, 380, 'wind', 'earth', 180, 9, 2.2, 35),
    makeEnemy('golem', 2700, 580, 'water', 'earth', 80, 18, 0.6, 100),
  ];

  return {
    name: 'Sky Fortress',
    subtitle: 'Use wind to soar and earth to build bridges',
    worldWidth: 3200, worldHeight: 700,
    bgColors: ['#0a0a4e', '#1a2a6e', '#3a4a8e', '#2a3a6e'],
    platforms, envObjects, enemies,
    playerStart: { x: 60, y: 480 },
    gemsRequired: 10, totalGems: 14,
    elementHint: 'Use 🌪️ Wind for mobility and 🌿 Earth for platforms!',
    timeLimit: 0,
  };
}

// ============ LEVEL 5: Elemental Nexus (Final) ============
function level5(): LevelDef {
  const platforms: Platform[] = [
    { x: 0, y: 580, width: 350, height: 120, type: 'ground' },
    { x: 450, y: 500, width: 140, height: 20, type: 'stone' },
    { x: 700, y: 420, width: 130, height: 20, type: 'ice' },
    { x: 950, y: 500, width: 150, height: 20, type: 'stone' },
    { x: 1200, y: 400, width: 160, height: 20, type: 'stone' },
    { x: 1450, y: 320, width: 140, height: 20, type: 'ice' },
    { x: 1700, y: 420, width: 150, height: 20, type: 'stone' },
    { x: 1950, y: 500, width: 130, height: 20, type: 'stone' },
    { x: 2200, y: 400, width: 160, height: 20, type: 'stone' },
    { x: 2450, y: 320, width: 140, height: 20, type: 'stone' },
    { x: 2700, y: 420, width: 150, height: 20, type: 'stone' },
    { x: 2950, y: 580, width: 550, height: 120, type: 'ground' },
    // Floating platforms
    { x: 600, y: 300, width: 100, height: 20, type: 'stone' },
    { x: 1050, y: 280, width: 100, height: 20, type: 'stone' },
    { x: 1850, y: 300, width: 100, height: 20, type: 'stone' },
    { x: 2550, y: 240, width: 120, height: 20, type: 'stone' },
  ];

  const envObjects: EnvObject[] = [
    // All element objects
    { id: nid(), type: 'crate', x: 300, y: 540, width: 40, height: 40, health: 100, maxHealth: 100, state: 'normal', solid: true },
    { id: nid(), type: 'ice', x: 750, y: 380, width: 50, height: 40, health: 100, maxHealth: 100, state: 'normal', solid: true },
    { id: nid(), type: 'fire_pit', x: 1000, y: 560, width: 40, height: 20, health: 100, maxHealth: 100, state: 'burning', solid: false },
    { id: nid(), type: 'plant', x: 1300, y: 560, width: 20, height: 20, health: 100, maxHealth: 100, state: 'normal', solid: false, growthLevel: 0 },
    { id: nid(), type: 'rock', x: 1600, y: 550, width: 35, height: 30, health: 200, maxHealth: 200, state: 'normal', solid: true },
    { id: nid(), type: 'puddle', x: 1900, y: 570, width: 60, height: 10, health: 100, maxHealth: 100, state: 'normal', solid: false },
    { id: nid(), type: 'fire_pit', x: 2300, y: 560, width: 40, height: 20, health: 100, maxHealth: 100, state: 'burning', solid: false },
    { id: nid(), type: 'ice', x: 2500, y: 540, width: 50, height: 40, health: 100, maxHealth: 100, state: 'normal', solid: true },
    { id: nid(), type: 'crate', x: 2800, y: 540, width: 40, height: 40, health: 100, maxHealth: 100, state: 'normal', solid: true },
    // Spikes
    makeSpike(380, 580, 50), makeSpike(1120, 580, 50),
    makeSpike(1580, 580, 50), makeSpike(2100, 580, 50),
    // Lots of gems
    makeGem(470, 480), makeGem(640, 280), makeGem(740, 400),
    makeGem(990, 480), makeGem(1090, 260), makeGem(1240, 380),
    makeGem(1490, 300), makeGem(1740, 400), makeGem(1890, 280),
    makeGem(1990, 480), makeGem(2240, 380), makeGem(2490, 300),
    makeGem(2590, 220), makeGem(2740, 400), makeGem(3000, 560),
    makeGem(3200, 560),
    // Pickups
    { id: nid(), type: 'health_potion', x: 1200, y: 550, width: 16, height: 20, health: 1, maxHealth: 1, state: 'normal', solid: false },
    { id: nid(), type: 'mana_crystal', x: 2200, y: 550, width: 16, height: 20, health: 1, maxHealth: 1, state: 'normal', solid: false },
    { id: nid(), type: 'health_potion', x: 2900, y: 550, width: 16, height: 20, health: 1, maxHealth: 1, state: 'normal', solid: false },
    // IMP-12/13: Wind zones and water currents
    makeWindZone(1000, 300, 80, 280, 1, 0.5),
    makeWindZone(2500, 280, 80, 300, -1, 0.5),
    makeWaterCurrent(450, 570, 150, 0.7),
    makeWaterCurrent(1700, 570, 200, -0.6),
    // Portal
    makePortal(3350, 580),
  ];

  const enemies: Enemy[] = [
    makeEnemy('slime', 500, 580, 'fire', 'water', 100, 12, 1.4, 50),
    makeEnemy('ice_spirit', 800, 380, 'fire', 'water', 120, 14, 1.5, 55),
    makeEnemy('fire_spirit', 1100, 460, 'water', 'fire', 130, 14, 1.5, 55),
    makeEnemy('bat', 1350, 280, 'wind', 'earth', 200, 10, 2.2, 35),
    makeEnemy('golem', 1600, 580, 'water', 'earth', 80, 20, 0.7, 120),
    makeEnemy('bat', 2000, 350, 'wind', 'earth', 180, 10, 2.0, 35),
    makeEnemy('fire_spirit', 2400, 480, 'water', 'fire', 120, 14, 1.5, 55),
    // BOSS 1: Elemental Titan
    makeEnemy('boss1', 3000, 580, 'water', 'earth', 200, 30, 1.2, 800),
  ];

  return {
    name: 'Elemental Nexus',
    subtitle: 'The final challenge — master all elements!',
    worldWidth: 3500, worldHeight: 700,
    bgColors: ['#1a0a2e', '#2a1a4e', '#3a2a5e', '#2a1a3e'],
    platforms, envObjects, enemies,
    playerStart: { x: 60, y: 480 },
    gemsRequired: 12, totalGems: 16,
    elementHint: 'Switch elements to exploit enemy weaknesses!',
    timeLimit: 0,
  };
}

// ============ LEVEL 6: Forgotten Ruins ============
function level6(): LevelDef {
  const platforms: Platform[] = [
    { x: 0, y: 580, width: 400, height: 120, type: 'ground' },
    { x: 600, y: 580, width: 200, height: 120, type: 'ground' },
    { x: 1000, y: 580, width: 500, height: 120, type: 'ground' },
    { x: 1700, y: 580, width: 1000, height: 120, type: 'ground' },
    // Ruins structure
    { x: 200, y: 450, width: 100, height: 20, type: 'stone' },
    { x: 400, y: 380, width: 100, height: 20, type: 'stone' },
    { x: 650, y: 300, width: 100, height: 20, type: 'stone' },
    { x: 900, y: 380, width: 100, height: 20, type: 'stone' },
    { x: 1100, y: 450, width: 100, height: 20, type: 'stone' },
    { x: 1400, y: 400, width: 150, height: 20, type: 'stone' },
    { x: 1800, y: 350, width: 120, height: 20, type: 'stone' },
    { x: 2100, y: 450, width: 150, height: 20, type: 'stone' },
    { x: 2350, y: 350, width: 100, height: 20, type: 'stone' },
  ];

  const envObjects: EnvObject[] = [
    // Puzzles
    { id: nid(), type: 'rock', x: 250, y: 400, width: 35, height: 30, health: 200, maxHealth: 200, state: 'normal', solid: true },
    { id: nid(), type: 'rock', x: 1200, y: 540, width: 35, height: 30, health: 200, maxHealth: 200, state: 'normal', solid: true },
    { id: nid(), type: 'plant', x: 750, y: 560, width: 20, height: 20, health: 100, maxHealth: 100, state: 'normal', solid: false, growthLevel: 0 },
    { id: nid(), type: 'plant', x: 1550, y: 560, width: 20, height: 20, health: 100, maxHealth: 100, state: 'normal', solid: false, growthLevel: 0 },
    // Spikes
    makeSpike(450, 580, 100),
    makeSpike(850, 580, 100),
    makeSpike(1550, 580, 100),
    // Gems
    makeGem(450, 340), makeGem(690, 260), makeGem(940, 340),
    makeGem(1460, 360), makeGem(1850, 310), makeGem(2160, 410),
    makeGem(2390, 310), makeGem(1800, 560), makeGem(2000, 560),
    makeGem(2400, 560),
    // Consumables
    { id: nid(), type: 'health_potion', x: 1150, y: 420, width: 16, height: 20, health: 1, maxHealth: 1, state: 'normal', solid: false },
    { id: nid(), type: 'mana_crystal', x: 2150, y: 550, width: 16, height: 20, health: 1, maxHealth: 1, state: 'normal', solid: false },
    makePortal(2550, 580),
  ];

  const enemies: Enemy[] = [
    makeEnemy('golem', 1100, 580, 'water', 'earth', 80, 20, 0.7, 100),
    makeEnemy('slime', 1800, 580, 'fire', 'water', 100, 10, 1.2, 50),
    makeEnemy('bat', 1900, 250, 'wind', 'earth', 180, 12, 2.0, 40),
    makeEnemy('golem', 2200, 580, 'water', 'earth', 80, 20, 0.7, 100),
  ];

  return {
    name: 'Forgotten Ruins',
    subtitle: 'Move massive stones to proceed',
    worldWidth: 2700, worldHeight: 700,
    bgColors: ['#3a2a1a', '#4a3a2a', '#2a4a3a', '#1a2a1a'],
    platforms, envObjects, enemies,
    playerStart: { x: 60, y: 480 },
    gemsRequired: 8, totalGems: 10,
    elementHint: 'Use 🌱 Earth to move boulders and grow bridges.',
    timeLimit: 0,
  };
}

// ============ LEVEL 7: Frozen Archipelago ============
function level7(): LevelDef {
  const platforms: Platform[] = [
    { x: 0, y: 580, width: 250, height: 120, type: 'ground' },
    { x: 400, y: 580, width: 300, height: 120, type: 'ice' },
    { x: 800, y: 530, width: 150, height: 20, type: 'ice' },
    { x: 1050, y: 470, width: 150, height: 20, type: 'ice' },
    { x: 1300, y: 410, width: 150, height: 20, type: 'ice' },
    { x: 1600, y: 350, width: 200, height: 20, type: 'ice' },
    { x: 1950, y: 580, width: 500, height: 120, type: 'ground' },
    { x: 2550, y: 580, width: 350, height: 120, type: 'ice' },
  ];

  const envObjects: EnvObject[] = [
    // Water Currents
    makeWaterCurrent(100, 600, 1400, 1.2), // Huge underwater drag
    makeWaterCurrent(2000, 600, 400, -0.8), // Pulls left
    // Puddles & Ice
    { id: nid(), type: 'puddle', x: 450, y: 570, width: 80, height: 10, health: 100, maxHealth: 100, state: 'normal', solid: false },
    { id: nid(), type: 'ice', x: 600, y: 540, width: 40, height: 40, health: 100, maxHealth: 100, state: 'normal', solid: true },
    { id: nid(), type: 'ice', x: 2100, y: 540, width: 40, height: 40, health: 100, maxHealth: 100, state: 'normal', solid: true },
    { id: nid(), type: 'ice', x: 2200, y: 540, width: 40, height: 40, health: 100, maxHealth: 100, state: 'normal', solid: true },
    // Gems
    makeGem(500, 560), makeGem(650, 560), makeGem(860, 490),
    makeGem(1110, 430), makeGem(1360, 370), makeGem(1680, 310),
    makeGem(1750, 310), makeGem(2050, 560), makeGem(2250, 560),
    makeGem(2700, 560),
    // Consumables
    { id: nid(), type: 'health_potion', x: 1360, y: 380, width: 16, height: 20, health: 1, maxHealth: 1, state: 'normal', solid: false },
    makePortal(2750, 580),
  ];

  const enemies: Enemy[] = [
    makeEnemy('ice_spirit', 450, 500, 'fire', 'water', 150, 12, 1.8, 50),
    makeEnemy('bat', 1200, 250, 'wind', 'earth', 200, 10, 2.5, 40),
    makeEnemy('ice_spirit', 1650, 280, 'fire', 'water', 150, 12, 1.8, 50),
    makeEnemy('ice_spirit', 2150, 500, 'fire', 'water', 150, 12, 1.8, 50),
  ];

  return {
    name: 'Frozen Archipelago',
    subtitle: 'Don\'t fall in the freezing water',
    worldWidth: 2900, worldHeight: 700,
    bgColors: ['#0a1a3e', '#1a3a5e', '#5e7a9e', '#3a5a7e'],
    platforms, envObjects, enemies,
    playerStart: { x: 60, y: 480 },
    gemsRequired: 8, totalGems: 10,
    elementHint: 'Use 🔥 Fire to melt blockages, 💧 Water freezes puddles.',
    timeLimit: 0,
  };
}

// ============ LEVEL 8: Infernal Core ============
function level8(): LevelDef {
  const platforms: Platform[] = [
    { x: 0, y: 580, width: 200, height: 120, type: 'ground' },
    { x: 300, y: 520, width: 150, height: 20, type: 'stone' },
    { x: 550, y: 460, width: 150, height: 20, type: 'stone' },
    { x: 800, y: 580, width: 300, height: 120, type: 'ground' },
    { x: 1200, y: 400, width: 250, height: 20, type: 'stone' },
    { x: 1600, y: 580, width: 800, height: 120, type: 'ground' },
  ];

  const envObjects: EnvObject[] = [
    // Massive Crates
    { id: nid(), type: 'crate', x: 900, y: 460, width: 120, height: 120, health: 300, maxHealth: 300, state: 'normal', solid: true },
    { id: nid(), type: 'crate', x: 1250, y: 340, width: 60, height: 60, health: 150, maxHealth: 150, state: 'normal', solid: true },
    { id: nid(), type: 'crate', x: 1310, y: 340, width: 60, height: 60, health: 150, maxHealth: 150, state: 'normal', solid: true },
    // Spikes (Lava pits essentially)
    makeSpike(200, 580, 100),
    makeSpike(450, 580, 100),
    makeSpike(700, 580, 100),
    makeSpike(1100, 580, 500),
    // Fire pits
    { id: nid(), type: 'fire_pit', x: 1700, y: 560, width: 60, height: 20, health: 100, maxHealth: 100, state: 'burning', solid: false },
    { id: nid(), type: 'fire_pit', x: 1900, y: 560, width: 60, height: 20, health: 100, maxHealth: 100, state: 'burning', solid: false },
    { id: nid(), type: 'fire_pit', x: 2100, y: 560, width: 60, height: 20, health: 100, maxHealth: 100, state: 'burning', solid: false },
    // Gems
    makeGem(360, 480), makeGem(610, 420), makeGem(850, 560),
    makeGem(960, 420), makeGem(1280, 300), makeGem(1340, 300),
    makeGem(1730, 520), makeGem(1930, 520), makeGem(2130, 520),
    makeGem(2250, 560),
    // Consumables
    { id: nid(), type: 'mana_crystal', x: 820, y: 550, width: 16, height: 20, health: 1, maxHealth: 1, state: 'normal', solid: false },
    { id: nid(), type: 'health_potion', x: 1400, y: 370, width: 16, height: 20, health: 1, maxHealth: 1, state: 'normal', solid: false },
    makePortal(2300, 580),
  ];

  const enemies: Enemy[] = [
    makeEnemy('fire_spirit', 850, 500, 'water', 'fire', 160, 16, 1.8, 60),
    makeEnemy('fire_spirit', 1750, 500, 'water', 'fire', 160, 16, 1.8, 60),
    makeEnemy('fire_spirit', 1950, 500, 'water', 'fire', 160, 16, 1.8, 60),
    makeEnemy('bat', 1300, 200, 'wind', 'earth', 200, 12, 2.5, 40),
    makeEnemy('boss1', 2100, 580, 'water', 'earth', 200, 30, 1.0, 600),
  ];

  return {
    name: 'Infernal Core',
    subtitle: 'Burn obstacles, extinguish paths',
    worldWidth: 2400, worldHeight: 700,
    bgColors: ['#3e0a0a', '#5e1a0a', '#7e2a0a', '#4e1a0a'],
    platforms, envObjects, enemies,
    playerStart: { x: 60, y: 480 },
    gemsRequired: 8, totalGems: 10,
    elementHint: 'Use 🔥 Fire to burn large crates, 💧 Water for lava pits.',
    timeLimit: 0,
  };
}

// ============ LEVEL 9: Hurricane Valley ============
function level9(): LevelDef {
  const platforms: Platform[] = [
    { x: 0, y: 580, width: 250, height: 120, type: 'ground' },
    { x: 450, y: 500, width: 100, height: 20, type: 'stone' },
    { x: 750, y: 400, width: 100, height: 20, type: 'stone' },
    { x: 1050, y: 300, width: 150, height: 20, type: 'stone' },
    { x: 1400, y: 200, width: 100, height: 20, type: 'stone' },
    { x: 1750, y: 350, width: 150, height: 20, type: 'stone' },
    { x: 2100, y: 500, width: 100, height: 20, type: 'stone' },
    { x: 2400, y: 580, width: 400, height: 120, type: 'ground' },
  ];

  const envObjects: EnvObject[] = [
    // Huge Wind Zones
    makeWindZone(300, 200, 150, 500, 0.4, 0.6), // Up and right
    makeWindZone(600, 100, 100, 500, 0, 0.8),   // Straight UP
    makeWindZone(900, 0, 150, 500, -0.2, 0.6),  // Up and left
    makeWindZone(1250, 0, 150, 500, 0.5, 0.7),  // Strong up-right
    makeWindZone(1900, 200, 200, 500, 0, 0.5),  // gentle up
    // Spikes covering floor
    makeSpike(250, 580, 2150),
    // Gems
    makeGem(490, 460), makeGem(790, 360), makeGem(1110, 260),
    makeGem(1440, 160), makeGem(1810, 310), makeGem(2140, 460),
    makeGem(1300, 100), makeGem(900, 150), // airborne gems
    // Consumables
    { id: nid(), type: 'mana_crystal', x: 1120, y: 270, width: 16, height: 20, health: 1, maxHealth: 1, state: 'normal', solid: false },
    makePortal(2600, 580),
  ];

  const enemies: Enemy[] = [
    makeEnemy('bat', 600, 300, 'wind', 'earth', 250, 15, 3.0, 40),
    makeEnemy('bat', 1200, 150, 'wind', 'earth', 250, 15, 3.0, 40),
    makeEnemy('bat', 1600, 250, 'wind', 'earth', 250, 15, 3.0, 40),
    makeEnemy('bat', 2000, 400, 'wind', 'earth', 250, 15, 3.0, 40),
  ];

  return {
    name: 'Hurricane Valley',
    subtitle: 'Ride the drafts, fight the ravens',
    worldWidth: 2800, worldHeight: 700,
    bgColors: ['#1a2a4e', '#3a4a6e', '#5a6a8e', '#7a8aae'],
    platforms, envObjects, enemies,
    playerStart: { x: 60, y: 480 },
    gemsRequired: 6, totalGems: 8,
    elementHint: 'Jump into updrafts to soar higher. Cast 🌪️ Wind in mid-air!',
    timeLimit: 0,
  };
}

// ============ LEVEL 10: The Grand Trial (Final) ============
function level10(): LevelDef {
  const platforms: Platform[] = [
    { x: 0, y: 580, width: 300, height: 120, type: 'ground' }, // Start
    { x: 500, y: 500, width: 150, height: 20, type: 'ice' },     // Ice jump
    { x: 850, y: 420, width: 150, height: 20, type: 'stone' },   // Push rock area
    { x: 1200, y: 580, width: 400, height: 120, type: 'ground' }, // Rest stop 1
    { x: 1800, y: 480, width: 150, height: 20, type: 'stone' },   // High jump 
    { x: 2150, y: 380, width: 150, height: 20, type: 'ice' },     // Slips
    { x: 2500, y: 280, width: 150, height: 20, type: 'stone' },   // Top
    { x: 2800, y: 580, width: 800, height: 120, type: 'ground' }, // Final boss arena
  ];

  const envObjects: EnvObject[] = [
    // Traps and aids
    makeSpike(300, 580, 200),
    makeSpike(650, 580, 200),
    makeSpike(1000, 580, 200),
    makeSpike(1600, 580, 200),
    makeSpike(2650, 580, 150),

    makeWindZone(350, 300, 100, 300, 0.4, 0.5), // up to ice
    makeWaterCurrent(1600, 570, 200, 0.8), // pulls into spikes

    { id: nid(), type: 'rock', x: 900, y: 390, width: 35, height: 30, health: 200, maxHealth: 200, state: 'normal', solid: true },
    { id: nid(), type: 'crate', x: 2550, y: 240, width: 60, height: 60, health: 150, maxHealth: 150, state: 'normal', solid: true },

    makeGem(560, 460), makeGem(910, 380), makeGem(1300, 560),
    makeGem(1450, 560), makeGem(1860, 440), makeGem(2210, 340),
    makeGem(2560, 180), makeGem(2900, 560), makeGem(3050, 560),
    makeGem(3200, 560), makeGem(3350, 560), makeGem(3500, 560),

    { id: nid(), type: 'health_potion', x: 1250, y: 550, width: 16, height: 20, health: 1, maxHealth: 1, state: 'normal', solid: false },
    { id: nid(), type: 'mana_crystal', x: 1500, y: 550, width: 16, height: 20, health: 1, maxHealth: 1, state: 'normal', solid: false },

    makePortal(3450, 580),
  ];

  const enemies: Enemy[] = [
    makeEnemy('ice_spirit', 500, 400, 'fire', 'water', 200, 16, 2.0, 70),
    makeEnemy('golem', 1300, 580, 'water', 'earth', 120, 25, 0.8, 150),
    makeEnemy('bat', 1900, 300, 'wind', 'earth', 300, 15, 3.0, 50),
    makeEnemy('fire_spirit', 2150, 300, 'water', 'fire', 200, 20, 2.0, 70),
    // BOSS 2: Elemental Overlord
    makeEnemy('boss2', 3150, 580, 'wind', 'water', 300, 40, 1.5, 1500),
  ];

  return {
    name: 'The Grand Trial',
    subtitle: 'Everything you\'ve learned culminates here!',
    worldWidth: 3600, worldHeight: 700,
    bgColors: ['#100520', '#250535', '#3f1055', '#250535'],
    platforms, envObjects, enemies,
    playerStart: { x: 60, y: 480 },
    gemsRequired: 10, totalGems: 12,
    elementHint: 'Mastery of all 4 elements is required.',
    timeLimit: 0,
  };
}

// ============ LEVEL 11: Endless Survival Arena ============
export function endlessLevel(): LevelDef {
  const platforms: Platform[] = [
    { x: -50, y: 0, width: 50, height: 750, type: 'stone' }, // Left wall
    { x: 1200, y: 0, width: 50, height: 750, type: 'stone' }, // Right wall
    { x: 0, y: 580, width: 1200, height: 120, type: 'ground' }, // Main floor
    { x: 200, y: 440, width: 200, height: 20, type: 'stone' }, // Low platform left
    { x: 800, y: 440, width: 200, height: 20, type: 'stone' }, // Low platform right
    { x: 450, y: 280, width: 300, height: 20, type: 'stone' }, // High platform center
  ];

  const envObjects: EnvObject[] = [
    { id: nid(), type: 'health_potion', x: 250, y: 410, width: 16, height: 20, health: 1, maxHealth: 1, state: 'normal', solid: false },
    { id: nid(), type: 'mana_crystal', x: 900, y: 410, width: 16, height: 20, health: 1, maxHealth: 1, state: 'normal', solid: false },
  ];

  return {
    name: 'Endless Survival Arena',
    subtitle: 'Survive as many waves as possible!',
    worldWidth: 1200, worldHeight: 700,
    bgColors: ['#300000', '#200020', '#101030', '#0a0a0a'],
    platforms, envObjects, enemies: [], // Enemies spawned by wave director
    playerStart: { x: 550, y: 480 },
    gemsRequired: 9999, totalGems: 0, // No exit portal
    elementHint: 'The horde is infinite. Defend yourself.',
    timeLimit: 0,
  };
}

// ============ LEVEL 11: The Steam Pits ============
function level11(): LevelDef {
  const platforms: Platform[] = [
    { x: 0, y: 580, width: 400, height: 120, type: 'ground' },
    { x: 500, y: 580, width: 300, height: 120, type: 'ground' },
    { x: 900, y: 580, width: 600, height: 120, type: 'ground' },
    { x: 1600, y: 580, width: 500, height: 120, type: 'ground' },
    { x: 200, y: 450, width: 150, height: 20, type: 'stone' },
    { x: 550, y: 380, width: 120, height: 20, type: 'stone' },
    { x: 850, y: 460, width: 140, height: 20, type: 'stone' },
    { x: 1100, y: 350, width: 160, height: 20, type: 'stone' },
  ];
  const envObjects: EnvObject[] = [
    { id: nid(), type: 'fire_pit', x: 420, y: 560, width: 60, height: 20, health: 100, maxHealth: 100, state: 'burning', solid: false },
    { id: nid(), type: 'puddle', x: 820, y: 570, width: 60, height: 10, health: 100, maxHealth: 100, state: 'normal', solid: false },
    { id: nid(), type: 'fire_pit', x: 1520, y: 560, width: 60, height: 20, health: 100, maxHealth: 100, state: 'burning', solid: false },
    makeGem(250, 430), makeGem(600, 360), makeGem(900, 440), makeGem(1150, 330),
    makeGem(1400, 560), makeGem(100, 560),
    makePortal(1850, 580),
  ];
  const enemies: Enemy[] = [
    makeEnemy('fire_spirit', 450, 520, 'water', 'fire', 120, 20, 1.8, 80),
    makeEnemy('ice_spirit', 850, 500, 'fire', 'water', 120, 20, 1.8, 80),
    makeEnemy('slime', 1200, 580, 'fire', 'water', 100, 15, 1.5, 60),
  ];
  return {
    name: 'The Steam Pits', subtitle: 'Fire and Water create blinding steam!',
    worldWidth: 2200, worldHeight: 700,
    bgColors: ['#1a2a2a', '#2a3a3a', '#3a4a4a', '#2a3a3a'],
    platforms, envObjects, enemies, playerStart: { x: 60, y: 480 },
    gemsRequired: 5, totalGems: 6, elementHint: 'Combine 🔥 & 💧 for Steam!', timeLimit: 0,
  };
}

// ============ LEVEL 12: Dust Storm Desert ============
function level12(): LevelDef {
  const platforms: Platform[] = [
    { x: 0, y: 580, width: 2500, height: 120, type: 'ground' },
    { x: 300, y: 460, width: 150, height: 20, type: 'earth' },
    { x: 600, y: 380, width: 150, height: 20, type: 'earth' },
    { x: 900, y: 460, width: 150, height: 20, type: 'earth' },
  ];
  const envObjects: EnvObject[] = [
    makeWindZone(400, 0, 200, 580, -1, 0.4),
    makeWindZone(1200, 0, 200, 580, 1, 0.4),
    { id: nid(), type: 'rock', x: 800, y: 550, width: 35, height: 30, health: 200, maxHealth: 200, state: 'normal', solid: true },
    makeGem(350, 440), makeGem(650, 360), makeGem(950, 440),
    makeGem(1500, 560), makeGem(2000, 560),
    makePortal(2300, 580),
  ];
  const enemies: Enemy[] = [
    makeEnemy('golem', 1000, 580, 'water', 'earth', 150, 25, 0.8, 200),
    makeEnemy('bat', 1500, 300, 'wind', 'earth', 200, 15, 2.5, 60),
  ];
  return {
    name: 'Dust Storm Desert', subtitle: 'Wind and Earth stir up blinding sand!',
    worldWidth: 2500, worldHeight: 700,
    bgColors: ['#3a2a0a', '#4a3a1a', '#5a4a2a', '#3a2a0a'],
    platforms, envObjects, enemies, playerStart: { x: 60, y: 480 },
    gemsRequired: 4, totalGems: 5, elementHint: 'Combine 🌪️ & 🌱 for Sandstorm!', timeLimit: 0,
  };
}

// ============ LEVEL 13: The Glacial Core ============
function level13(): LevelDef {
  const platforms: Platform[] = [
    { x: 0, y: 580, width: 500, height: 120, type: 'ground' },
    { x: 600, y: 580, width: 1500, height: 120, type: 'ice' },
    { x: 2200, y: 580, width: 400, height: 120, type: 'ground' },
  ];
  const envObjects: EnvObject[] = [
    makeWaterCurrent(600, 570, 1500, 0.9),
    { id: nid(), type: 'ice', x: 800, y: 540, width: 40, height: 40, health: 100, maxHealth: 100, state: 'normal', solid: true },
    { id: nid(), type: 'ice', x: 1200, y: 540, width: 40, height: 40, health: 100, maxHealth: 100, state: 'normal', solid: true },
    makeGem(700, 560), makeGem(1100, 560), makeGem(1500, 560), makeGem(1900, 560),
    makePortal(2400, 580),
  ];
  const enemies: Enemy[] = [
    makeEnemy('boss1', 1500, 580, 'fire', 'water', 200, 35, 1.5, 1000),
  ];
  return {
    name: 'The Glacial Core', subtitle: 'The colossus guards the frozen heart',
    worldWidth: 2600, worldHeight: 700,
    bgColors: ['#000022', '#000044', '#111166', '#000022'],
    platforms, envObjects, enemies, playerStart: { x: 60, y: 480 },
    gemsRequired: 3, totalGems: 4, elementHint: 'The colossus is weak to 🔥 Fire!', timeLimit: 0,
  };
}

// ============ LEVEL 14: Magma Labyrinth ============
function level14(): LevelDef {
  const platforms: Platform[] = [
    { x: 0, y: 580, width: 400, height: 120, type: 'ground' },
    { x: 500, y: 480, width: 200, height: 20, type: 'earth' },
    { x: 800, y: 380, width: 200, height: 20, type: 'earth' },
    { x: 1100, y: 480, width: 200, height: 20, type: 'earth' },
    { x: 1400, y: 580, width: 1000, height: 120, type: 'ground' },
  ];
  const envObjects: EnvObject[] = [
    makeSpike(400, 580, 1000),
    { id: nid(), type: 'fire_pit', x: 1500, y: 560, width: 80, height: 20, health: 100, maxHealth: 100, state: 'burning', solid: false },
    { id: nid(), type: 'fire_pit', x: 1800, y: 560, width: 80, height: 20, health: 100, maxHealth: 100, state: 'burning', solid: false },
    makeGem(550, 460), makeGem(850, 360), makeGem(1150, 460),
    makeGem(1600, 560), makeGem(2000, 560),
    makePortal(2200, 580),
  ];
  const enemies: Enemy[] = [
    makeEnemy('fire_spirit', 1600, 500, 'water', 'fire', 150, 25, 2.0, 100),
    makeEnemy('fire_spirit', 1900, 500, 'water', 'fire', 150, 25, 2.0, 100),
  ];
  return {
    name: 'Magma Labyrinth', subtitle: 'Heat and Earth form deadly pools',
    worldWidth: 2500, worldHeight: 700,
    bgColors: ['#300', '#510', '#720', '#300'],
    platforms, envObjects, enemies, playerStart: { x: 60, y: 480 },
    gemsRequired: 4, totalGems: 5, elementHint: 'Combine 🔥 & 🌱 for Magma!', timeLimit: 0,
  };
}

// ============ LEVEL 15: The Final Singularity ============
function level15(): LevelDef {
  const platforms: Platform[] = [
    { x: 0, y: 580, width: 500, height: 120, type: 'ground' },
    { x: 700, y: 580, width: 2000, height: 120, type: 'ground' },
  ];
  const envObjects: EnvObject[] = [
    makeSpike(500, 580, 200),
    makeGem(200, 560), makeGem(1000, 560), makeGem(2000, 560),
    makePortal(2500, 580),
  ];
  const enemies: Enemy[] = [
    // THE OVERLORD
    makeEnemy('boss2', 1700, 580, 'wind', 'water', 400, 50, 2.0, 2500),
  ];
  return {
    name: 'The Final Singularity', subtitle: 'Witness the end of elements',
    worldWidth: 3000, worldHeight: 700,
    bgColors: ['#000', '#102', '#204', '#000'],
    platforms, envObjects, enemies, playerStart: { x: 60, y: 480 },
    gemsRequired: 3, totalGems: 3, elementHint: 'Use all Synergies to defeat the Overlord!', timeLimit: 0,
  };
}

export function getLevels(): LevelDef[] {
  return [level1(), level2(), level3(), level4(), level5(), level6(), level7(), level8(), level9(), level10(), level11(), level12(), level13(), level14(), level15(), endlessLevel()];
}

export function getLevel(index: number): LevelDef {
  const levels = getLevels();
  return levels[Math.min(index, levels.length - 1)];
}

export const TOTAL_LEVELS = 15; // Exclude endless from campaign tracking

