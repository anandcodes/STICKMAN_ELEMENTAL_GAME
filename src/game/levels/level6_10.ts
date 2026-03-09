import type { LevelDef, Platform, EnvObject, Enemy } from '../types';
import { nid, makeEnemy, makeGem, makePortal, makeSpike, makeWindZone, makeWaterCurrent } from './utils';

// ============ LEVEL 6: Forgotten Ruins ============
export function level6(): LevelDef {
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
        makeEnemy('shadow_wolf', 700, 580, 'fire', 'wind', 160, 14, 2.2, 60),
        makeEnemy('shadow_wolf', 2400, 580, 'fire', 'wind', 140, 14, 2.4, 60),
    ];

    return {
        name: 'Ch 2 - Forgotten Ruins',
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
export function level7(): LevelDef {
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
        name: 'Ch 2 - The Sky Temple',
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
export function level8(): LevelDef {
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
        makeEnemy('lava_crab', 1000, 580, 'water', 'fire', 100, 18, 0.9, 120),
        makeEnemy('lava_crab', 2000, 580, 'water', 'fire', 100, 18, 0.9, 120),
        makeEnemy('bat', 1300, 200, 'wind', 'earth', 200, 12, 2.5, 40),
        makeEnemy('boss1', 2100, 580, 'water', 'earth', 200, 30, 1.0, 600),
    ];

    return {
        name: 'Ch 2 - The Shadowed Courtyard',
        subtitle: 'Burn obstacles, extinguish paths',
        worldWidth: 2400, worldHeight: 700,
        bgColors: ['#2e1a2e', '#4e1a4e', '#5e1a3e', '#3e1a3e'], // Dark purples/reds
        platforms, envObjects, enemies,
        playerStart: { x: 60, y: 480 },
        gemsRequired: 8, totalGems: 10,
        elementHint: 'Use 🔥 Fire to burn large crates, 💧 Water for lava pits.',
        timeLimit: 0,
    };
}

// ============ LEVEL 9: Hurricane Valley ============
export function level9(): LevelDef {
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
        makeEnemy('thunder_hawk', 600, 300, 'earth', 'wind', 250, 15, 2.5, 45),
        makeEnemy('thunder_hawk', 1200, 150, 'earth', 'wind', 250, 15, 2.8, 45),
        makeEnemy('bat', 1600, 250, 'wind', 'earth', 250, 15, 3.0, 40),
        makeEnemy('thunder_hawk', 2000, 400, 'earth', 'wind', 250, 15, 2.5, 45),
    ];

    return {
        name: 'Ch 2 - The High Bridges',
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
export function level10(): LevelDef {
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
        name: 'Ch 2 - The Storm Apex (Boss)',
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
