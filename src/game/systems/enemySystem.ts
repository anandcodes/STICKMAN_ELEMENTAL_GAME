import type { GameState } from '../types';
import { DIFFICULTY_SETTINGS } from '../engine';
import { spawnFloatingText, spawnParticles } from './utils';

const FLYING_TYPES = new Set(['bat', 'boss2', 'thunder_hawk']);

export function updateEnemies(state: GameState) {
    const s = state.stickman;
    const GRAVITY = 0.6;

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

        const dx = (s.x + s.width / 2) - (enemy.x + enemy.width / 2);
        const dy = (s.y + s.height / 2) - (enemy.y + enemy.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Chase radius varies by type
        const chaseRadius = enemy.type === 'shadow_wolf' ? 350
            : enemy.type === 'thunder_hawk' ? 300
                : enemy.type === 'lava_crab' ? 180
                    : 250;

        if (dist < chaseRadius) {
            enemy.state = 'chase';
        } else {
            enemy.state = 'patrol';
        }

        if (enemy.state === 'chase') {
            const dir = dx > 0 ? 1 : -1;
            enemy.facing = dir as 1 | -1;

            if (FLYING_TYPES.has(enemy.type)) {
                // Flying movement: accelerate toward player
                const ax = enemy.type === 'boss2' ? 0.05
                    : enemy.type === 'thunder_hawk' ? 0.18  // faster dive
                        : 0.1;
                enemy.vx += dir * enemy.speed * ax;
                // thunder_hawk: dive steeply at player
                const vyFactor = enemy.type === 'thunder_hawk' ? 0.25 : (dy > 0 ? 1 : -1) * ax;
                enemy.vy += typeof vyFactor === 'number' ? vyFactor : 0;
                enemy.vx *= 0.95;
                enemy.vy *= 0.95;
            } else if (enemy.type === 'shadow_wolf') {
                // Leap toward player with burst speed
                enemy.vx = dir * enemy.speed * 1.1;
                // Occasional pounce
                if (dist < 120 && Math.abs(dy) < 60 && (enemy.animTimer % 80 === 0)) {
                    enemy.vy = -10; // leap
                }
            } else if (enemy.type === 'lava_crab') {
                // Slow heavy charge
                enemy.vx = dir * enemy.speed * 0.8;
                // Charge attack when close
                if (dist < 150 && (enemy.attackTimer || 0) === 0) {
                    enemy.attackTimer = 90;
                    enemy.vx = dir * enemy.speed * 3;
                }
            } else {
                enemy.vx = dir * enemy.speed;
            }

            // BOSS & SPECIAL ATTACK LOGIC
            if (enemy.type === 'boss1' || enemy.type === 'boss2') {
                enemy.attackTimer = (enemy.attackTimer || 0) + 1;
                if (enemy.type === 'boss1' && enemy.attackTimer >= 100) {
                    enemy.attackTimer = 0;
                    state.projectiles.push({
                        x: enemy.x + (dir === 1 ? enemy.width : -20),
                        y: enemy.y + enemy.height / 2,
                        vx: dir * 4, vy: -4,
                        element: 'earth', life: 100,
                        isEnemy: true, size: 10,
                    });
                    spawnParticles(state, enemy.x + enemy.width / 2, enemy.y + enemy.height, 'earth', 20);
                }
                if (enemy.type === 'boss2' && enemy.attackTimer >= 60) {
                    enemy.attackTimer = 0;
                    const angle = Math.atan2(dy, dx);
                    const randomEl = (['fire', 'water', 'earth', 'wind'] as const)[Math.floor(Math.random() * 4)];
                    state.projectiles.push({
                        x: enemy.x + enemy.width / 2,
                        y: enemy.y + enemy.height / 2,
                        vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5,
                        element: randomEl, life: 100,
                        isEnemy: true, size: 8,
                    });
                    spawnParticles(state, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, randomEl, 15);
                }
            }

            // Shadow wolf: leaves shadow particles
            if (enemy.type === 'shadow_wolf' && enemy.animTimer % 4 === 0) {
                spawnParticles(state, enemy.x + enemy.width / 2, enemy.y + enemy.height, 'wind', 2);
            }

            // Thunder hawk: fires lightning bolt every 90 frames
            if (enemy.type === 'thunder_hawk') {
                enemy.attackTimer = (enemy.attackTimer || 0) + 1;
                if (enemy.attackTimer >= 90) {
                    enemy.attackTimer = 0;
                    const angle = Math.atan2(dy, dx);
                    state.projectiles.push({
                        x: enemy.x + enemy.width / 2,
                        y: enemy.y + enemy.height / 2,
                        vx: Math.cos(angle) * 7, vy: Math.sin(angle) * 7,
                        element: 'wind', life: 60,
                        isEnemy: true, size: 7,
                    });
                    spawnParticles(state, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 'wind', 12);
                }
            }

            // Lava crab: spits fire when close
            if (enemy.type === 'lava_crab') {
                if ((enemy.attackTimer || 0) > 0) enemy.attackTimer! -= 1;
                if (dist < 200 && (enemy.attackTimer || 0) === 0) {
                    enemy.attackTimer = 70;
                    const angle = Math.atan2(dy, dx);
                    state.projectiles.push({
                        x: enemy.x + enemy.width / 2,
                        y: enemy.y + enemy.height / 3,
                        vx: Math.cos(angle) * 4, vy: Math.sin(angle) * 4 - 2,
                        element: 'fire', life: 80,
                        isEnemy: true, size: 9,
                    });
                    spawnParticles(state, enemy.x + enemy.width / 2, enemy.y + enemy.height / 3, 'fire', 10);
                }
            }

        } else {
            // Patrol
            const distFromOrigin = enemy.x - enemy.originX;
            if (Math.abs(distFromOrigin) > enemy.patrolRange) {
                enemy.facing = distFromOrigin > 0 ? -1 : 1;
            }
            if (FLYING_TYPES.has(enemy.type)) {
                enemy.vx = enemy.facing * enemy.speed * 0.5;
                const bobSpeed = enemy.type === 'thunder_hawk' ? 0.06 : 0.05;
                const bobAmp = enemy.type === 'boss2' ? 0.4 : 0.8;
                enemy.vy = Math.sin(enemy.animTimer * bobSpeed) * bobAmp;
            } else if (enemy.type === 'shadow_wolf') {
                enemy.vx = enemy.facing * enemy.speed * 0.6;
            } else if (enemy.type === 'lava_crab') {
                enemy.vx = enemy.facing * enemy.speed * 0.3; // slow patrol
            } else {
                enemy.vx = enemy.facing * enemy.speed * 0.5;
            }
        }

        // Physics
        if (!FLYING_TYPES.has(enemy.type)) {
            enemy.vy += GRAVITY;
        }
        enemy.x += enemy.vx;
        enemy.y += enemy.vy;

        // Platform and Box collision for ground enemies
        if (!FLYING_TYPES.has(enemy.type)) {
            // Check platforms
            for (const p of state.platforms) {
                if (p.melting && (p.meltTimer ?? 1) <= 0) continue;
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

            // Check Boxes / Crates (User Request #4)
            for (const obj of state.envObjects) {
                if (obj.state === 'destroyed' || obj.state === 'melted' || obj.state === 'collected') continue;
                if (obj.type === 'crate' || obj.type === 'rock' || obj.type === 'ice') {
                    // Vertical (floor)
                    if (
                        enemy.x + enemy.width - 4 > obj.x &&
                        enemy.x + 4 < obj.x + obj.width &&
                        enemy.y + enemy.height > obj.y &&
                        enemy.y + enemy.height < obj.y + obj.height + enemy.vy + 2 &&
                        enemy.vy >= 0
                    ) {
                        enemy.y = obj.y - enemy.height;
                        enemy.vy = 0;
                    }
                    // Horizontal (wall)
                    if (
                        enemy.y + enemy.height > obj.y + 4 &&
                        enemy.y < obj.y + obj.height - 4
                    ) {
                        if (enemy.x + enemy.width > obj.x && enemy.x < obj.x + 10 && enemy.vx > 0) {
                            enemy.x = obj.x - enemy.width;
                            enemy.facing *= -1;
                        } else if (enemy.x < obj.x + obj.width && enemy.x + enemy.width > obj.x + obj.width - 10 && enemy.vx < 0) {
                            enemy.x = obj.x + obj.width;
                            enemy.facing *= -1;
                        }
                    }
                }
            }
        }

        // World bounds
        enemy.x = Math.max(0, Math.min(state.worldWidth - enemy.width, enemy.x));
        if (FLYING_TYPES.has(enemy.type)) {
            const minY = enemy.type === 'thunder_hawk' ? 80 : 50;
            enemy.y = Math.max(minY, Math.min(state.worldHeight - 150, enemy.y));
        }

        // Damage player on contact
        if (s.invincibleTimer <= 0 &&
            s.x + s.width > enemy.x && s.x < enemy.x + enemy.width &&
            s.y + s.height > enemy.y && s.y < enemy.y + enemy.height
        ) {
            const ds = DIFFICULTY_SETTINGS[state.difficulty];
            const damage = Math.floor(enemy.damage * ds.enemyDamageMult);
            s.health -= damage;
            state.redFlash = 15;
            s.invincibleTimer = 60;
            s.vy = -8;
            s.vx = dx < 0 ? 5 : -5;
            const particleEl = enemy.type === 'lava_crab' ? 'fire'
                : enemy.type === 'thunder_hawk' ? 'wind'
                    : enemy.type === 'shadow_wolf' ? 'earth'
                        : 'fire';
            spawnParticles(state, s.x + s.width / 2, s.y + s.height / 2, particleEl, 10);
            state.screenShake = 12;
            spawnFloatingText(state, s.x + s.width / 2, s.y - 20, `-${damage}`, '#ff4444', 16);
            state.onDamage?.();
        }
    }
}
