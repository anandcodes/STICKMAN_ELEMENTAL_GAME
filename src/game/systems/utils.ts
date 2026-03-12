import type { GameState, Element } from '../types';
import * as Audio from '../audio';

const MAX_PARTICLES = 300;

export function spawnParticles(state: GameState, x: number, y: number, element: Element, count: number) {
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

export function spawnFloatingText(state: GameState, x: number, y: number, text: string, color: string, size = 14) {
    state.floatingTexts.push({ x, y, text, color, life: 60, maxLife: 60, size });
}

export function addScore(state: GameState, amount: number) {
    if (state.comboTimer > 0) {
        state.comboCount++;
        amount = Math.floor(amount * (1 + state.comboCount * 0.25));
    } else {
        state.comboCount = 0; // BUG-FIX: Start at 0; first real combo hit increments to 1
    }
    state.comboTimer = 120;
    state.score += amount;
    if (state.score > state.highScore) {
        state.highScore = state.score;
    }
    // BUG-FIX: Removed excessive saveProgress() here — saves now only happen at
    // level complete and game over to avoid heavy localStorage thrashing per frame
}

const nids = () => Date.now() + Math.random();

export function createSynergyZone(state: GameState, x: number, y: number, e1: Element, e2: Element) {
    const elems = new Set([e1, e2]);
    let type: import('../types').EnvObject['type'] = 'synergy_zone';
    let stateStr: import('../types').EnvObject['state'] = 'active';
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
        id: nids(), type, x: x - w / 2, y: y - h / 2, width: w, height: h,
        health: 300, maxHealth: 300, state: stateStr, solid: false
    });

    spawnParticles(state, x, y, e1, 15);
    spawnParticles(state, x, y, e2, 15);
    spawnFloatingText(state, x, y - 20, 'COMBINATION!', '#ffcc00', 14);
}

export function handleEnemyHit(state: GameState, proj: import('../types').Projectile, enemy: import('../types').Enemy) {
    const elem = proj.element;
    const dmgMul = 1 + (state.upgrades.damageLevel * 0.25);
    let dmg = 15 * dmgMul;

    // Relic: Burning Soul (50% Fire Damage)
    if (elem === 'fire' && state.activeRelics.some(r => r.type === 'burning_soul')) {
        dmg *= 1.5;
    }

    // Relic: Berserker Blood (Increased damage at low health)
    if (state.activeRelics.some(r => r.type === 'berserker_blood')) {
        const healthRatio = state.stickman.health / state.stickman.maxHealth;
        const berserkBonus = 1 + (1 - healthRatio) * 1.5; // Up to 150% more damage at near 0 HP
        dmg *= berserkBonus;
    }

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
    state.screenShake = Math.max(state.screenShake, elem === enemy.weakness ? 6 : 3);
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
        state.screenShake = 12; // Increased screen shake on death
        state.enemiesDefeated++;

        // Chance to drop mana crystal
        if (Math.random() < 0.3) {
            state.envObjects.push({
                id: nids(),
                type: 'mana_crystal',
                x: enemy.x + enemy.width / 2 - 8,
                y: enemy.y + enemy.height / 2 - 10,
                width: 16, height: 20,
                health: 1, maxHealth: 1,
                state: 'normal',
                solid: false
            });
        }

        if (state.endlessKills !== undefined) state.endlessKills++;
    }
}
