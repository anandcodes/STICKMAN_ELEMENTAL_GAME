import type { LevelDef, Platform, EnvObject, Enemy } from '../types';
import { nid, makeEnemy, makeGem, makePortal, makeSpike, makeWindZone } from './utils';

export function getTutorialLevel(): LevelDef {
  const platforms: Platform[] = [
    { x: 0, y: 580, width: 2500, height: 120, type: 'ground' }, // Main floor
    { x: 250, y: 500, width: 150, height: 20, type: 'stone' }, // Jump platform
    { x: 450, y: 580, width: 200, height: 120, type: 'ice' },  // Ice floor
    { x: 900, y: 480, width: 150, height: 20, type: 'stone' }, // Platform over spike
    { x: 1300, y: 580, width: 150, height: 120, type: 'earth' },// Something to dash over
    { x: 1700, y: 400, width: 200, height: 20, type: 'stone' }, // Reach via wind
  ];

  const envObjects: EnvObject[] = [
    // 1. Fire tutorial targets
    { id: nid(), type: 'crate', x: 370, y: 540, width: 40, height: 40, health: 100, maxHealth: 100, state: 'normal', solid: true },
    { id: nid(), type: 'crate', x: 410, y: 540, width: 40, height: 40, health: 100, maxHealth: 100, state: 'normal', solid: true },
    
    // 2. Water tutorial target (ice blocks blocking path)
    { id: nid(), type: 'ice', x: 700, y: 500, width: 40, height: 80, health: 100, maxHealth: 100, state: 'normal', solid: true },

    // 3. Dash tutorial obstacle (spikes)
    makeSpike(900, 560, 40),
    makeSpike(940, 560, 40),
    makeSpike(980, 560, 40),

    // 4. Plant growing tutorial
    { id: nid(), type: 'plant', x: 1100, y: 560, width: 20, height: 20, health: 100, maxHealth: 100, state: 'normal', solid: false, growthLevel: 0 },

    // 5. Wind tutorial
    makeWindZone(1450, 450, 100, 130, 0, 8),

    // Gems to open portal
    makeGem(270, 480), makeGem(600, 560), makeGem(1100, 540), makeGem(1450, 400), makeGem(1800, 380),

    // Portal
    makePortal(2200, 580),
  ];

  const enemies: Enemy[] = [
    makeEnemy('slime', 1900, 580, 'fire', 'water', 100, 0, 1.0, 10), // Dummy enemy
  ];

  return {
    name: 'Training Grounds',
    subtitle: 'Master the Elements',
    worldWidth: 2500,
    worldHeight: 700,
    bgColors: ['#33bbff', '#55ddff', '#99ffff', '#ccffff'], // Bright cheerful training bg
    platforms,
    envObjects,
    enemies,
    playerStart: { x: 50, y: 480 },
    gemsRequired: 5,
    totalGems: 5,
    powerups: [],
    elementHint: 'Follow the on-screen instructions.',
    timeLimit: 0,
  };
}
