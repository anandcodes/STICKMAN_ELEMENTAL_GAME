import type { GameState, Projectile, EnvObject } from '../types';
import { DIFFICULTY_SETTINGS } from '../constants';
import { spawnParticles, spawnFloatingText, addScore, createSynergyZone, handleEnemyHit } from './utils';

import { projectilePool } from '../services/poolManager';

export function handleElementInteraction(state: GameState, proj: Projectile, obj: EnvObject) {
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
                // BUG-2 FIX: Calculate base Y from current position, grow upward
                const plantBaseY = obj.y + obj.height;
                obj.growthLevel = Math.min((obj.growthLevel || 0) + 1, 3);
                if (obj.growthLevel >= 3) {
                    obj.state = 'grown'; obj.height = 80; obj.width = 40;
                    obj.y = plantBaseY - obj.height; obj.solid = true;
                    addScore(state, 20);
                    spawnFloatingText(state, obj.x + obj.width / 2, obj.y - 10, '+20 GROWN!', '#66aa33');
                } else {
                    obj.height = 20 + obj.growthLevel * 15;
                    obj.width = 20 + obj.growthLevel * 5;
                    obj.y = plantBaseY - obj.height;
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
                obj.state = 'destroyed'; obj.solid = false;
                spawnParticles(state, obj.x + obj.width / 2, obj.y, 'earth', 20);
                addScore(state, 15);
                state.screenShake = Math.max(state.screenShake, 14);
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
                // BUG-3 FIX: Use puddle position instead of hardcoded Y
                const puddleBaseY = obj.y + obj.height;
                obj.type = 'rock'; obj.solid = true; obj.width = 40; obj.height = 25;
                obj.y = puddleBaseY - obj.height;
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

export function updateProjectiles(state: GameState) {
    const GRAVITY = 0.6;
    const s = state.stickman;

    for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const p = state.projectiles[i];
        if (p.element !== 'wind') p.vy += GRAVITY * 0.3;
        p.x += p.vx; p.y += p.vy;
        p.life--;
        if (Math.random() > 0.3) spawnParticles(state, p.x, p.y, p.element, 1);

        let hit = false;
        if (p.isEnemy) {
            if (s.invincibleTimer <= 0 && p.x > s.x - p.size && p.x < s.x + s.width + p.size &&
                p.y > s.y - p.size && p.y < s.y + s.height + p.size) {
                const ds = DIFFICULTY_SETTINGS[state.difficulty];
                let damage = Math.floor(20 * ds.enemyDamageMult);
                if (state.selectedElement === 'fire' && p.element === 'fire') damage *= 0.5;
                if (state.selectedElement === 'fire' && p.element === 'water') damage *= 2;
                s.health -= damage; s.invincibleTimer = 60; s.hurtTimer = 15;
                s.lastDamageTime = state.timeElapsed; // UI Feedback
                if (state.selectedElement === 'earth') {
                    s.vy = -3; s.vx = 0;
                } else {
                    s.vy = -6; s.vx = p.vx > 0 ? 4 : -4;
                }
                state.redFlash = 15;
                spawnParticles(state, s.x + s.width / 2, s.y + s.height / 2, p.element, 15);
                state.screenShake = 15; spawnFloatingText(state, s.x + s.width / 2, s.y - 20, `-${damage}`, '#ff4444', 16);
                // We will call this from engine to avoid circular deps for Audio
                state.onDamage?.();
                hit = true;
            }
        } else {
            // Synergy Check
            let synergyHit = false;
            for (let j = 0; j < state.projectiles.length; j++) {
                if (i === j) continue;
                const o = state.projectiles[j];
                if (o.isEnemy || o.element === p.element) continue;
                const dist = Math.sqrt((p.x - o.x) ** 2 + (p.y - o.y) ** 2);
                if (dist < p.size + o.size + 15) {
                    createSynergyZone(state, (p.x + o.x) / 2, (p.y + o.y) / 2, p.element, o.element);
                    
                    // Specific Synergy Actions
                    const elements = [p.element, o.element];
                    if (elements.includes('fire') && elements.includes('wind')) {
                        // Firestorm: Create a large fire projectile effectively
                        const storm = projectilePool.get();
                        storm.x = (p.x + o.x) / 2; storm.y = (p.y + o.y) / 2;
                        storm.vx = (p.vx + o.vx) * 1.5; storm.vy = (p.vy + o.vy) * 1.5;
                        storm.element = 'fire'; storm.size = 24; storm.life = 100;
                        state.projectiles.push(storm);
                        state.activeSynergies.push('Firestorm');
                    } else if (elements.includes('water') && elements.includes('wind')) {
                        // Blizzard: Slow all nearby enemies
                        state.enemies.forEach(e => {
                           const d = Math.sqrt((e.x - p.x)**2 + (e.y - p.y)**2);
                           if (d < 200) { e.speed *= 0.5; e.stunTimer = 60; }
                        });
                        spawnFloatingText(state, p.x, p.y, 'BLIZZARD!', '#ffffff', 20);
                    } else if (elements.includes('earth') && elements.includes('water')) {
                        // Mud: Create slowing puddles
                        state.envObjects.push({
                            id: Date.now(), type: 'mud_trap',
                            x: p.x - 40, y: p.y - 10, width: 80, height: 10,
                            health: 100, maxHealth: 100, state: 'mud', solid: false
                        });
                    }

                    // then remove lower. Both projectiles are consumed by the synergy.
                    state.projectiles.splice(Math.max(i, j), 1);
                    state.projectiles.splice(Math.min(i, j), 1);
                    projectilePool.release(p);
                    projectilePool.release(o);
                    // Adjust i so the outer loop doesn't revisit or over-skip
                    if (j < i) i--;
                    synergyHit = true; break;
                }
            }
            // If synergy consumed both projectiles, skip remaining collision checks
            if (synergyHit) continue;
            if (!hit) {
                for (const enemy of state.enemies) {
                    if (enemy.state === 'dead') continue;
                    if (p.x > enemy.x - p.size && p.x < enemy.x + enemy.width + p.size &&
                        p.y > enemy.y - p.size && p.y < enemy.y + enemy.height + p.size) {
                        handleEnemyHit(state, p, enemy); hit = true; break;
                    }
                }
            }
            if (!hit) {
                for (const obj of state.envObjects) {
                    if (obj.state === 'destroyed' || obj.state === 'melted' || obj.state === 'collected') continue;
                    if (obj.type === 'gem' || obj.type === 'health_potion' || obj.type === 'mana_crystal' || obj.type === 'portal' || obj.type === 'spike') continue;
                    if (p.x > obj.x - p.size && p.x < obj.x + obj.width + p.size &&
                        p.y > obj.y - p.size && p.y < obj.y + obj.height + p.size) {
                        handleElementInteraction(state, p, obj); spawnParticles(state, p.x, p.y, p.element, 8); hit = true; break;
                    }
                }
            }
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
                        hit = true; break;
                    }
                }
            }
        }
        if (hit || p.life <= 0 || p.x < -500 || p.x > state.worldWidth + 500 || p.y < -500 || p.y > state.worldHeight + 500) {
            state.projectiles.splice(i, 1);
            projectilePool.release(p);
        }
    }
}
