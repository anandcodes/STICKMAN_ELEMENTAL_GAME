import type { LevelDef, Platform, EnvObject, Enemy } from '../types';
import { nid, makeEnemy, makeGem, makePortal, makeSpike, makeWindZone, makeWaterCurrent, makePowerup } from './utils';

// ============ LEVEL 1: Forest Awakening ============
export function level1(): LevelDef {
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
        // Lore tome
        {
            id: nid(), type: 'lore_tome', x: 200, y: 540, width: 30, height: 40, health: 100, maxHealth: 100, state: 'normal', solid: false,
            dialogue: [
                { speaker: 'Ancient Guide', text: 'Welcome to the Elemental Realm. Your journey starts here.', portrait: '#7ae8ff' },
                { speaker: 'Ancient Guide', text: 'Gather the gems scattered throughout to awaken the gateway.', portrait: '#7ae8ff' }
            ]
        },
        // Fire pits
        { id: nid(), type: 'fire_pit', x: 900, y: 560, width: 40, height: 20, health: 100, maxHealth: 100, state: 'burning', solid: false },
        // Gems
        makeGem(270, 440), makeGem(550, 360), makeGem(830, 430),
        makeGem(1100, 330), makeGem(1400, 400), makeGem(1700, 460),
        makeGem(1950, 360), makeGem(2200, 430),
        // Portal at end
        makePortal(2350, 580),
    ];

    const powerups: import('../types').Powerup[] = [
        makePowerup('speed', 1250, 540),
    ];

    const enemies: Enemy[] = [
        makeEnemy('slime', 600, 580, 'fire', 'water', 120, 8, 1.2, 30),
        makeEnemy('slime', 1000, 580, 'fire', 'water', 100, 8, 1.0, 30),
        makeEnemy('bat', 1500, 400, 'wind', 'earth', 150, 6, 1.8, 20),
    ];

    return {
        name: 'Ch 1 - Forest Awakening',
        subtitle: 'Learn the basics of primal magic',
        worldWidth: 2500, worldHeight: 700,
        bgColors: ['#66ccff', '#88eeaa', '#aaff77', '#44cc55'], // Bright daytime forest
        platforms, envObjects, enemies, powerups,
        playerStart: { x: 80, y: 480 },
        gemsRequired: 5, totalGems: 8,
        elementHint: 'Use 🔥 Fire on crates and slimes!',
        timeLimit: 0,
    };
}

// ============ LEVEL 2: Ice Caverns ============
export function level2(): LevelDef {
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

    const powerups: import('../types').Powerup[] = [
        makePowerup('shield', 1500, 540),
    ];

    const enemies: Enemy[] = [
        makeEnemy('ice_spirit', 700, 500, 'fire', 'water', 130, 10, 1.5, 40),
        makeEnemy('slime', 1200, 580, 'fire', 'water', 100, 8, 1.0, 35),
        makeEnemy('ice_spirit', 1700, 480, 'fire', 'water', 120, 10, 1.3, 40),
        makeEnemy('bat', 2100, 380, 'wind', 'earth', 180, 7, 2.0, 25),
        makeEnemy('bat', 2400, 350, 'wind', 'earth', 140, 7, 1.8, 25),
    ];

    return {
        name: 'Ch 1 - The Glacial Pass',
        subtitle: 'Melt the ice, freeze the puddles',
        worldWidth: 2800, worldHeight: 700,
        bgColors: ['#aaddff', '#ccf5ff', '#eeffff', '#88ccff'], // Bright frosted daytime
        platforms, envObjects, enemies, powerups,
        playerStart: { x: 60, y: 480 },
        gemsRequired: 7, totalGems: 10,
        elementHint: 'Use 🔥 Fire to melt ice, 💧 Water to freeze puddles!',
        timeLimit: 0,
    };
}

// ============ LEVEL 3: Volcanic Forge ============
export function level3(): LevelDef {
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

    const powerups: import('../types').Powerup[] = [
        makePowerup('rapidfire', 2000, 540),
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
        name: 'Ch 1 - Deep Caverns',
        subtitle: 'Extinguish the subterranean flames',
        worldWidth: 3000, worldHeight: 700,
        bgColors: ['#ff5522', '#ffaa33', '#ffcc44', '#cc4411'], // Vivid explosive sunset
        platforms, envObjects, enemies, powerups,
        playerStart: { x: 60, y: 480 },
        gemsRequired: 8, totalGems: 12,
        elementHint: 'Use 💧 Water on fire pits and fire spirits!',
        timeLimit: 0,
    };
}

// ============ LEVEL 4: Sky Fortress ============
export function level4(): LevelDef {
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
        name: 'Ch 1 - River\'s Edge',
        subtitle: 'Navigate the currents to proceed',
        worldWidth: 3200, worldHeight: 700,
        bgColors: ['#2288ff', '#55aaff', '#99ccff', '#ddf0ff'], // Bright open sky
        platforms, envObjects, enemies, powerups: [],
        playerStart: { x: 60, y: 480 },
        gemsRequired: 10, totalGems: 14,
        elementHint: 'Use 🌪️ Wind for mobility and 🌿 Earth for platforms!',
        timeLimit: 0,
    };
}

// ============ LEVEL 5: Elemental Nexus (Final) ============
export function level5(): LevelDef {
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
        name: 'Ch 1 - The Overgrowth (Boss)',
        subtitle: 'Defeat the Earth Guardian to escape the forest',
        worldWidth: 3500, worldHeight: 700,
        bgColors: ['#33aa44', '#55cc66', '#aaff88', '#228833'], // Deep but vivid enchanted green
        platforms, envObjects, enemies, powerups: [],
        playerStart: { x: 60, y: 480 },
        gemsRequired: 12, totalGems: 16,
        elementHint: 'Switch elements to exploit enemy weaknesses!',
        timeLimit: 0,
    };
}
