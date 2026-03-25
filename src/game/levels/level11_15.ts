import type { LevelDef, Platform, EnvObject, Enemy } from '../types';
import { nid, makeEnemy, makeGem, makePortal, makeSpike, makeWindZone, makeWaterCurrent } from './utils';

// ============ LEVEL 11: The Steam Pits ============
export function level11(): LevelDef {
    const platforms: Platform[] = [
        { x: 0, y: 580, width: 400, height: 120, type: 'ground' },
        { x: 500, y: 580, width: 300, height: 120, type: 'ground' },
        { x: 900, y: 580, width: 600, height: 120, type: 'ground' },
        { x: 1600, y: 580, width: 500, height: 120, type: 'ground' },
        { x: 200, y: 450, width: 150, height: 20, type: 'stone' },
        { x: 550, y: 380, width: 120, height: 20, type: 'stone' },
        { x: 850, y: 460, width: 140, height: 20, type: 'stone' },
        { x: 1100, y: 350, width: 160, height: 20, type: 'stone' },
        { x: 1350, y: 350, width: 100, height: 20, type: 'stone', isCrumbling: true, crumbleState: 'idle', crumbleTimer: 0 },
        { x: 1550, y: 350, width: 100, height: 20, type: 'stone', isCrumbling: true, crumbleState: 'idle', crumbleTimer: 0 },
    ];

    const hazards: import('../types').Hazard[] = [
        { id: nid(), type: 'laser', x: 700, y: 300, width: 0, height: 280, vx: 2, vy: 0, damage: 0.5, active: true, timer: 0 },
        { id: nid(), type: 'blade', x: 1400, y: 500, width: 60, height: 60, vx: 0, vy: 0, damage: 1, active: true, timer: 0, angle: 0, angularVelocity: 0.1 },
    ];

    const envObjects: EnvObject[] = [
        { id: nid(), type: 'magma_pool', x: 420, y: 560, width: 80, height: 20, health: 100, maxHealth: 100, state: 'magma', solid: false },
        { id: nid(), type: 'mud_trap', x: 820, y: 570, width: 60, height: 10, health: 100, maxHealth: 100, state: 'mud', solid: false },
        { id: nid(), type: 'fire_pit', x: 1520, y: 560, width: 60, height: 20, health: 100, maxHealth: 100, state: 'burning', solid: false },
        makeGem(250, 430), makeGem(600, 360), makeGem(900, 440), makeGem(1150, 330),
        makeGem(1400, 560), makeGem(100, 560),
        makePortal(1850, 580),
    ];
    const enemies: Enemy[] = [
        makeEnemy('fire_spirit', 450, 520, 'water', 'fire', 120, 20, 1.8, 80),
        makeEnemy('ice_spirit', 850, 500, 'fire', 'water', 120, 20, 1.8, 80),
        makeEnemy('slime', 1200, 580, 'fire', 'water', 100, 15, 1.5, 60),
        makeEnemy('shadow_wolf', 600, 580, 'fire', 'wind', 150, 18, 2.2, 70),
    ];
    return {
        name: 'Ch 3 - The Shattered Rift', subtitle: 'Void crystals drain your mana!',
        worldWidth: 2200, worldHeight: 700,
        bgColors: ['#ff66cc', '#ff99dd', '#ffccff', '#ff99dd'], // Candy pink sky
        platforms, envObjects, enemies, hazards, playerStart: { x: 60, y: 480 },
        gemsRequired: 5, totalGems: 6, elementHint: 'Watch out for Corrupted Crystals!',
        powerups: [], timeLimit: 0,
    };
}

// ============ LEVEL 12: Dust Storm Desert ============
export function level12(): LevelDef {
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
        makeEnemy('thunder_hawk', 1500, 200, 'earth', 'wind', 200, 15, 2.5, 60),
        makeEnemy('thunder_hawk', 2000, 200, 'earth', 'wind', 200, 15, 2.5, 60),
    ];
    return {
        name: 'Ch 3 - Corrupted Citadel', subtitle: 'Teleporting wraiths roam the void',
        worldWidth: 2500, worldHeight: 700,
        bgColors: ['#99ff99', '#ccffcc', '#eeffff', '#99ff99'], // Vivid mint
        platforms, envObjects, enemies, hazards: [], playerStart: { x: 60, y: 480 },
        gemsRequired: 4, totalGems: 5, elementHint: 'Stay mobile to dodge the Wraiths.',
        powerups: [], timeLimit: 0,
    };
}

// ============ LEVEL 13: The Glacial Core ============
export function level13(): LevelDef {
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
        name: 'Ch 3 - The Lava Caldera', subtitle: 'Magma pools and Void Brutes abound',
        worldWidth: 2600, worldHeight: 700,
        bgColors: ['#ffcc00', '#ffee66', '#ffffaa', '#ffee66'], // Golden noon
        platforms, envObjects, enemies, hazards: [], playerStart: { x: 60, y: 480 },
        gemsRequired: 3, totalGems: 4, elementHint: 'Dodge the charging Brutes!',
        powerups: [], timeLimit: 0,
    };
}

// ============ LEVEL 14: Magma Labyrinth ============
export function level14(): LevelDef {
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
        makeEnemy('lava_crab', 700, 580, 'water', 'fire', 120, 22, 0.9, 140),
        makeEnemy('lava_crab', 1300, 580, 'water', 'fire', 120, 22, 0.9, 140),
    ];
    return {
        name: 'Ch 3 - The Convergence Zone', subtitle: 'All elements collide in the void',
        worldWidth: 2500, worldHeight: 700,
        bgColors: ['#55ccff', '#88ddff', '#bbffff', '#55ccff'], // Crystalline blue
        platforms, envObjects, enemies, hazards: [], playerStart: { x: 60, y: 480 },
        gemsRequired: 4, totalGems: 5, elementHint: 'Use elemental synergies to survive.',
        powerups: [], timeLimit: 0,
    };
}

// ============ LEVEL 15: The Final Singularity ============
export function level15(): LevelDef {
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
        // THE OVERLORD + elite guard
        makeEnemy('shadow_wolf', 900, 580, 'fire', 'wind', 300, 25, 2.8, 150),
        makeEnemy('thunder_hawk', 1200, 200, 'earth', 'wind', 300, 20, 3.0, 120),
        makeEnemy('lava_crab', 1400, 580, 'water', 'fire', 200, 22, 1.0, 200),
        makeEnemy('boss2', 1700, 580, 'wind', 'water', 400, 50, 2.0, 2500),
    ];
    return {
        name: 'Ch 3 - The Void Titan (Final Boss)', subtitle: 'The end of the campaign',
        worldWidth: 3000, worldHeight: 700,
        bgColors: ['#ff5588', '#ff88aa', '#ffbbcc', '#ff5588'], // Bubblegum neon
        platforms, envObjects, enemies, hazards: [], playerStart: { x: 60, y: 480 },
        gemsRequired: 3, totalGems: 3, elementHint: 'Match your magic to the Titan\'s glowing orb weakness!',
        powerups: [], timeLimit: 0,
    };
}
