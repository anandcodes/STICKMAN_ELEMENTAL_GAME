import type { LevelDef, Platform } from '../types';
import { makeEnemy, makeGem, makePortal, makeSpike, makeVine, makeMovingPlatform } from './utils';

// Forest Ruins bg colors
const forestBg: [string, string, string, string] = ['#33cc33', '#55ee55', '#aaff77', '#ccff99'];

export function level16(): LevelDef {
  const platforms: Platform[] = [
    { x: 0, y: 580, width: 800, height: 120, type: 'earth' },
    { x: 900, y: 500, width: 200, height: 20, type: 'stone' },
    { x: 1200, y: 400, width: 200, height: 20, type: 'stone' },
    { x: 1500, y: 580, width: 1000, height: 120, type: 'earth' },
  ];
  return {
    name: 'Forest Ruins: Entrance', subtitle: 'A New Biome',
    worldWidth: 2500, worldHeight: 700,
    bgColors: forestBg, platforms,
    envObjects: [
      makeSpike(900, 580, 200),
      makeSpike(1200, 580, 200),
      // Introducing vines
      makeVine(800, 200, 20, 380),
      makeVine(1450, 200, 20, 380),
      makeGem(950, 460), makeGem(1250, 360), makeGem(1700, 500), makeGem(1900, 500), makeGem(2100, 500),
      makePortal(2300, 580)
    ],
    enemies: [
      makeEnemy('slime', 500, 580, 'fire', 'water', 200, 10, 1.2, 50),
      makeEnemy('slime', 1600, 580, 'fire', 'water', 200, 10, 1.2, 50),
      makeEnemy('bat', 1100, 300, 'earth', 'wind', 200, 15, 1.5, 40),
    ],
    playerStart: { x: 50, y: 480 }, gemsRequired: 5, totalGems: 5, powerups: [], timeLimit: 0,
    elementHint: 'Vines might help you climb...'
  };
}

export function level17(): LevelDef {
  const platforms: Platform[] = [
    { x: 0, y: 580, width: 400, height: 120, type: 'earth' },
    { x: 2200, y: 580, width: 600, height: 120, type: 'earth' },
  ];
  return {
    name: 'Forest Ruins: Canopy', subtitle: 'Swing Across',
    worldWidth: 2500, worldHeight: 700,
    bgColors: forestBg, platforms,
    envObjects: [
      makeSpike(400, 680, 1800), // Huge bottom spike
      makeVine(600, 100, 20, 400),
      makeVine(1000, 50, 20, 450),
      makeVine(1400, 100, 20, 400),
      makeVine(1800, 50, 20, 450),
      makeGem(600, 300), makeGem(1000, 350), makeGem(1400, 300), makeGem(1800, 350), makeGem(2300, 500),
      makePortal(2600, 580)
    ],
    enemies: [
      makeEnemy('bat', 800, 300, 'earth', 'wind', 150, 15, 1.5, 40),
      makeEnemy('bat', 1200, 350, 'earth', 'wind', 150, 15, 1.5, 40),
      makeEnemy('bat', 1600, 300, 'earth', 'wind', 150, 15, 1.5, 40),
    ],
    playerStart: { x: 50, y: 480 }, gemsRequired: 5, totalGems: 5, powerups: [], timeLimit: 0,
    elementHint: 'Don\'t look down.'
  };
}

export function level18(): LevelDef {
  const platforms: Platform[] = [
    { x: 0, y: 580, width: 300, height: 120, type: 'earth' },
    { x: 2600, y: 580, width: 400, height: 120, type: 'earth' },
  ];
  return {
    name: 'Forest Ruins: Moving Grounds', subtitle: 'Mind Your Step',
    worldWidth: 3000, worldHeight: 700,
    bgColors: forestBg, platforms,
    envObjects: [
      makeSpike(300, 680, 2300), 
      // Horizontal moving
      makeMovingPlatform(400, 580, 150, 20, 300, 2, 0),
      makeMovingPlatform(900, 480, 150, 20, 200, 1.5, 0),
      // Vertical moving
      makeMovingPlatform(1300, 400, 150, 20, 200, 0, 2),
      makeMovingPlatform(1700, 300, 150, 20, 250, 0, 2.5),
      makeMovingPlatform(2100, 480, 150, 20, 300, -2, 0),
      
      makeGem(550, 500), makeGem(1000, 400), makeGem(1375, 200), makeGem(1775, 50), makeGem(2200, 400),
      makePortal(2800, 580)
    ],
    enemies: [
      makeEnemy('slime', 2700, 580, 'fire', 'water', 150, 15, 1.3, 60),
    ],
    playerStart: { x: 50, y: 480 }, gemsRequired: 5, totalGems: 5, powerups: [], timeLimit: 0,
    elementHint: 'Wait for the right moment.'
  };
}

export function level19(): LevelDef {
  const platforms: Platform[] = [
    { x: 0, y: 580, width: 3000, height: 120, type: 'earth' },
    { x: 400, y: 460, width: 200, height: 20, type: 'stone' },
    { x: 1000, y: 350, width: 200, height: 20, type: 'stone' },
    { x: 1600, y: 250, width: 200, height: 20, type: 'stone' },
    { x: 2200, y: 350, width: 200, height: 20, type: 'stone' },
  ];
  return {
    name: 'Forest Ruins: Deep Jungle', subtitle: 'Enemy Territory',
    worldWidth: 3000, worldHeight: 700,
    bgColors: forestBg, platforms,
    envObjects: [
      makeSpike(700, 580, 200),
      makeSpike(1300, 580, 200),
      makeSpike(1900, 580, 200),
      makeVine(1000, 100, 20, 250),
      makeVine(1600, 50, 20, 200),
      makeMovingPlatform(550, 200, 100, 20, 200, 1, 0),
      makeGem(450, 420), makeGem(1050, 310), makeGem(1650, 210), makeGem(2250, 310), makeGem(2800, 500),
      makePortal(2900, 580)
    ],
    enemies: [
      makeEnemy('slime', 500, 580, 'fire', 'water', 150, 15, 1.4, 70),
      makeEnemy('slime', 1100, 580, 'fire', 'water', 150, 15, 1.4, 70),
      makeEnemy('slime', 1700, 580, 'fire', 'water', 150, 15, 1.4, 70),
      makeEnemy('slime', 2300, 580, 'fire', 'water', 150, 15, 1.4, 70),
      makeEnemy('bat', 900, 250, 'earth', 'wind', 250, 20, 1.6, 60),
      makeEnemy('bat', 1500, 150, 'earth', 'wind', 250, 20, 1.6, 60),
      makeEnemy('bat', 2100, 250, 'earth', 'wind', 250, 20, 1.6, 60),
    ],
    playerStart: { x: 50, y: 480 }, gemsRequired: 5, totalGems: 5, powerups: [], timeLimit: 0,
    elementHint: 'Use your elements wisely.'
  };
}

export function level20(): LevelDef {
  const platforms: Platform[] = [
    { x: 0, y: 580, width: 2500, height: 120, type: 'earth' },
    { x: 300, y: 450, width: 150, height: 20, type: 'stone' },
    { x: 800, y: 350, width: 150, height: 20, type: 'stone' },
    { x: 1300, y: 450, width: 150, height: 20, type: 'stone' },
    { x: 1800, y: 350, width: 150, height: 20, type: 'stone' },
  ];
  return {
    name: 'Forest Ruins: Ancient Core', subtitle: 'The Tree Guardian',
    worldWidth: 2500, worldHeight: 700,
    bgColors: forestBg, platforms,
    envObjects: [
      makeVine(300, 150, 20, 300),
      makeVine(1300, 150, 20, 300),
      makeGem(350, 410), makeGem(850, 310), makeGem(1350, 410), makeGem(1850, 310), makeGem(2200, 500),
      makePortal(2400, 580)
    ],
    enemies: [
      makeEnemy('tree_guardian', 1600, 580, 'fire', 'earth', 400, 40, 0.8, 1200),
      makeEnemy('bat', 500, 200, 'earth', 'wind', 500, 15, 1.5, 50),
      makeEnemy('bat', 2000, 200, 'earth', 'wind', 500, 15, 1.5, 50),
    ],
    playerStart: { x: 50, y: 480 }, gemsRequired: 5, totalGems: 5, powerups: [], timeLimit: 0,
    elementHint: 'Fire is highly effective against the ancient roots!'
  };
}
