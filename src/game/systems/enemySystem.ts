import type { GameState } from '../types';
import { DIFFICULTY_SETTINGS } from '../engine';
import { spawnFloatingText, spawnParticles } from './utils';

export function updateEnemies(state: GameState) {
    const s = state.stickman;
    const GRAVITY = 0.6; // We redefine GRAVITY locally for systems

    for (const enemy of state.enemies) {
        if (enemy.state === 'dead') continue;

        enemy.animTimer++;

        if (enemy.state === 'hurt') {
            enemy.hurtTimer--;
            if (enemy.hurtTimer <= 0) enemy.state = 'patrol';
            enemy.vx *= 0.9;
            enemy.x += enemy.vx;
            continue;
        }

        // Check distance to player
        const dx = (s.x + s.width / 2) - (enemy.x + enemy.width / 2);
        const dy = (s.y + s.height / 2) - (enemy.y + enemy.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Chase if close
        if (dist < 250) {
            enemy.state = 'chase';
        } else {
            enemy.state = 'patrol';
        }

        if (enemy.state === 'chase') {
            const dir = dx > 0 ? 1 : -1;
            enemy.facing = dir as 1 | -1;

            if (enemy.type === 'bat' || enemy.type === 'boss2') {
                const ax = enemy.type === 'boss2' ? 0.05 : 0.1;
                enemy.vx += dir * enemy.speed * ax;
                enemy.vy += (dy > 0 ? 1 : -1) * ax;
                enemy.vx *= 0.95;
                enemy.vy *= 0.95;
            } else {
                enemy.vx = dir * enemy.speed;
            }

            // BOSS ATTACK LOGIC
            if (enemy.type === 'boss1' || enemy.type === 'boss2') {
                enemy.attackTimer = (enemy.attackTimer || 0) + 1;
                // Boss 1: Ground smashes / rock throws every 120 frames
                if (enemy.type === 'boss1' && enemy.attackTimer >= 100) {
                    enemy.attackTimer = 0;
                    const throwH = -4;
                    state.projectiles.push({
                        x: enemy.x + (dir === 1 ? enemy.width : -20),
                        y: enemy.y + enemy.height / 2,
                        vx: dir * 4, vy: throwH,
                        element: 'earth', life: 100,
                        isEnemy: true, size: 10
                    });
                    spawnParticles(state, enemy.x + enemy.width / 2, enemy.y + enemy.height, 'earth', 20);
                }
                // Boss 2: Rapid fire elemental blasts every 60 frames
                if (enemy.type === 'boss2' && enemy.attackTimer >= 60) {
                    enemy.attackTimer = 0;
                    const randomEl = (['fire', 'water', 'earth', 'wind'] as const)[Math.floor(Math.random() * 4)];
                    const angle = Math.atan2(dy, dx);
                    state.projectiles.push({
                        x: enemy.x + enemy.width / 2,
                        y: enemy.y + enemy.height / 2,
                        vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5,
                        element: randomEl, life: 100,
                        isEnemy: true, size: 8
                    });
                    spawnParticles(state, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, randomEl, 15);
                }
            }
        } else {
            // Patrol
            const distFromOrigin = enemy.x - enemy.originX;
            if (Math.abs(distFromOrigin) > enemy.patrolRange) {
                enemy.facing = distFromOrigin > 0 ? -1 : 1;
            }
            if (enemy.type === 'bat' || enemy.type === 'boss2') {
                enemy.vx = enemy.facing * enemy.speed * 0.5;
                enemy.vy = Math.sin(enemy.animTimer * 0.05) * (enemy.type === 'boss2' ? 0.4 : 0.8);
            } else {
                enemy.vx = enemy.facing * enemy.speed * 0.5;
            }
        }

        // Apply physics
        if (enemy.type !== 'bat' && enemy.type !== 'boss2') {
            enemy.vy += GRAVITY;
        }
        enemy.x += enemy.vx;
        enemy.y += enemy.vy;

        // Platform collision for non-flying enemies
        if (enemy.type !== 'bat' && enemy.type !== 'boss2') {
            for (const p of state.platforms) {
                if (p.melting) continue;
                if (
                    enemy.x + enemy.width > p.x &&
                    enemy.x < p.x + p.width &&
                    enemy.y + enemy.height > p.y &&
                    enemy.y + enemy.height < p.y + p.height + enemy.vy + 5 &&
                    enemy.vy >= 0
                ) {
                    enemy.y = p.y - enemy.height;
                    enemy.vy = 0;
                }
            }
        }

        // World bounds
        enemy.x = Math.max(0, Math.min(state.worldWidth - enemy.width, enemy.x));
        if (enemy.type === 'bat' || enemy.type === 'boss2') {
            enemy.y = Math.max(50, Math.min(state.worldHeight - 150, enemy.y));
        }

        // Damage player on contact
        if (s.invincibleTimer <= 0 &&
            s.x + s.width > enemy.x && s.x < enemy.x + enemy.width &&
            s.y + s.height > enemy.y && s.y < enemy.y + enemy.height
        ) {
            const ds = DIFFICULTY_SETTINGS[state.difficulty];
            const damage = Math.floor(enemy.damage * ds.enemyDamageMult);
            s.health -= damage;
            state.redFlash = 15; // Set red flash
            s.invincibleTimer = 60;
            s.vy = -8;
            s.vx = dx < 0 ? 5 : -5;
            spawnParticles(state, s.x + s.width / 2, s.y + s.height / 2, 'fire', 10);
            state.screenShake = 12; // IMP-4: Screen shake on damage
            spawnFloatingText(state, s.x + s.width / 2, s.y - 20, `-${damage}`, '#ff4444', 16);

            // Callback for audio in main engine loop
            if ((state as any)._onDamage) (state as any)._onDamage();
        }
    }
}
