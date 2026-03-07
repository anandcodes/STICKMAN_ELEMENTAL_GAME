import type { LevelDef, Platform, EnvObject } from '../types';
import { nid } from './utils';

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
