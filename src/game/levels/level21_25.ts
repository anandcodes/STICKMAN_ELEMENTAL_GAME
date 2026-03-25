import type { LevelDef, Platform } from '../types';
import { makeEnemy, makeGem, makePortal, makeMovingPlatform, makePowerup } from './utils';

const voidBg: [string, string, string, string] = ['#0a001a', '#1a0033', '#2a004d', '#3b0066'];

export function level21(): LevelDef {
  const platforms: Platform[] = [
    { x: 0, y: 580, width: 600, height: 120, type: 'metal' },
    { x: 700, y: 500, width: 250, height: 20, type: 'stone' },
    { x: 1050, y: 420, width: 250, height: 20, type: 'stone' },
    { x: 1400, y: 580, width: 800, height: 120, type: 'metal' },
  ];
  return {
    name: 'Void Realm: The Threshold', subtitle: 'Abyssal Winds',
    worldWidth: 2500, worldHeight: 700,
    bgColors: voidBg, platforms, hazards: [],
    envObjects: [
      makeGem(750, 460), makeGem(1100, 380), makeGem(1500, 500), makeGem(1800, 500),
      makePortal(2200, 580)
    ],
    enemies: [
      makeEnemy('void_brute', 500, 580, 'wind', 'earth', 200, 25, 1.5, 300),
      makeEnemy('void_brute', 1600, 580, 'wind', 'earth', 200, 25, 1.5, 300),
    ],
    playerStart: { x: 50, y: 480 }, gemsRequired: 3, totalGems: 4, powerups: [], timeLimit: 0,
    elementHint: 'Void creatures are susceptible to Wind!'
  };
}

export function level22(): LevelDef {
  const platforms: Platform[] = [
    { x: 0, y: 580, width: 400, height: 120, type: 'metal' },
    { x: 2000, y: 580, width: 600, height: 120, type: 'metal' },
  ];
  return {
    name: 'Void Realm: Gravity\'s End', subtitle: 'Falling Upwards',
    worldWidth: 2800, worldHeight: 700,
    bgColors: voidBg, platforms, hazards: [],
    envObjects: [
      makeMovingPlatform(500, 500, 120, 20, 300, 2.5, 0),
      makeMovingPlatform(1000, 400, 120, 20, 400, 0, 3),
      makeMovingPlatform(1500, 300, 120, 20, 300, -2, 0),
      makeGem(550, 450), makeGem(1050, 200), makeGem(1550, 250), makeGem(2100, 500),
      makePortal(2600, 580)
    ],
    enemies: [
       makeEnemy('bat', 800, 200, 'earth', 'wind', 400, 20, 2.5, 100),
       makeEnemy('bat', 1200, 150, 'earth', 'wind', 400, 20, 2.5, 100),
    ],
    playerStart: { x: 50, y: 480 }, gemsRequired: 3, totalGems: 4, powerups: [], timeLimit: 0,
    elementHint: 'Platform timing is critical in zero-G.'
  };
}

export function level23(): LevelDef {
  return {
    name: 'Void Realm: Event Horizon', subtitle: 'The Singularity',
    worldWidth: 3000, worldHeight: 800,
    bgColors: voidBg,
    platforms: [
      { x: 0, y: 680, width: 3000, height: 120, type: 'metal' },
      { x: 400, y: 550, width: 200, height: 20, type: 'stone' },
      { x: 800, y: 420, width: 200, height: 20, type: 'stone' },
      { x: 1200, y: 300, width: 200, height: 20, type: 'stone' },
      { x: 1600, y: 420, width: 200, height: 20, type: 'stone' },
      { x: 2000, y: 550, width: 200, height: 20, type: 'stone' },
    ], 
    hazards: [],
    envObjects: [
      makeGem(450, 510), makeGem(850, 380), makeGem(1250, 260), makeGem(1650, 380), makeGem(2050, 510),
      makePortal(2800, 680)
    ],
    enemies: [
      makeEnemy('void_brute', 600, 680, 'wind', 'earth', 200, 30, 2.0, 400),
      makeEnemy('void_brute', 1800, 680, 'wind', 'earth', 200, 30, 2.0, 400),
      makeEnemy('void_titan', 2400, 680, 'fire', 'wind', 0, 50, 0, 2000),
    ],
    playerStart: { x: 50, y: 580 }, gemsRequired: 5, totalGems: 5, powerups: [], timeLimit: 0,
    elementHint: 'The Titan awaits.'
  };
}

export function level24(): LevelDef {
  return {
    name: 'Void Realm: Null Point', subtitle: 'Silent Abyss',
    worldWidth: 2000, worldHeight: 700,
    bgColors: voidBg,
    platforms: [{ x: 0, y: 580, width: 2000, height: 120, type: 'metal' }],
    hazards: [],
    envObjects: [makeGem(500, 540), makeGem(1000, 540), makeGem(1500, 540), makePortal(1800, 580)],
    enemies: [
      makeEnemy('void_brute', 800, 580, 'wind', 'earth', 100, 40, 2.5, 500),
      makeEnemy('bat', 1000, 200, 'earth', 'wind', 1000, 25, 3.0, 150),
      makeEnemy('bat', 1200, 300, 'earth', 'wind', 1000, 25, 3.0, 150),
    ],
    playerStart: { x: 50, y: 480 }, gemsRequired: 3, totalGems: 3, powerups: [], timeLimit: 120,
    elementHint: 'Survive the countdown.'
  };
}

export function level25(): LevelDef {
  return {
    name: 'Void Realm: Genesis Zenith', subtitle: 'The End of All Things',
    worldWidth: 4000, worldHeight: 900,
    bgColors: ['#000', '#111', '#222', '#333'],
    platforms: [
      { x: 0, y: 780, width: 1000, height: 120, type: 'metal' },
      { x: 1200, y: 680, width: 200, height: 20, type: 'stone' },
      { x: 1600, y: 580, width: 200, height: 20, type: 'stone' },
      { x: 2000, y: 480, width: 200, height: 20, type: 'stone' },
      { x: 2400, y: 580, width: 200, height: 20, type: 'stone' },
      { x: 2800, y: 680, width: 200, height: 20, type: 'stone' },
      { x: 3200, y: 780, width: 800, height: 120, type: 'metal' },
    ],
    hazards: [],
    envObjects: [
      makeGem(1300, 640), makeGem(1700, 540), makeGem(2100, 440), makeGem(2500, 540), makeGem(2900, 640),
      makePortal(3800, 780)
    ],
    enemies: [
      makeEnemy('guardian_aether', 3500, 780, 'fire', 'wind', 0, 60, 0, 5000),
    ],
    playerStart: { x: 50, y: 680 }, gemsRequired: 5, totalGems: 5, powerups: [makePowerup('shield', 500, 740)], timeLimit: 0,
    elementHint: 'The Guardian of Aether requires all your ultimate strength!'
  };
}
