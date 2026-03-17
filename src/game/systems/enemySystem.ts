import type { GameState } from '../types';
import { DIFFICULTY_SETTINGS } from '../constants';
import { handleEnemyHit, vibrate, spawnParticles } from './utils';

import { BEHAVIORS } from './enemyBehaviors';

export function updateEnemies(state: GameState): void {
    const s = state.stickman;
    const diff = DIFFICULTY_SETTINGS[state.difficulty || 'normal'];

    for (const enemy of state.enemies) {
        if (enemy.state === 'dead') continue;

        if (enemy.burnTimer && enemy.burnTimer > 0) {
            enemy.burnTimer--;
            enemy.health -= 0.3;
            spawnParticles(state, enemy.x + enemy.width / 2, enemy.y, 'fire', 1);
            if (enemy.health <= 0) enemy.state = 'dead';
        }

        if (enemy.type === 'guardian_aether') {
            updateGuardianAether(state, enemy, s);
            continue;
        }

        enemy.animTimer++;
        const dx = (s.x + s.width / 2) - (enemy.x + enemy.width / 2);
        const dy = (s.y + s.height / 2) - (enemy.y + enemy.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Apply specialized behavior if defined
        const behavior = BEHAVIORS[enemy.type];
        if (behavior) {
            behavior.update(enemy, state);
        } else {
            // Default Patrol Behavior
            if (enemy.state === 'patrol') {
                enemy.vx = enemy.facing * (enemy.speed * diff.enemySpeedMult);
                if (Math.abs(enemy.x - enemy.originX) > enemy.patrolRange) {
                    enemy.facing = (enemy.x > enemy.originX ? -1 : 1);
                }
                if (dist < 250) enemy.state = 'chase';
            } else if (enemy.state === 'chase') {
                enemy.facing = dx > 0 ? 1 : -1;
                enemy.vx = enemy.facing * (enemy.speed * 1.5 * diff.enemySpeedMult);
                if (dist > 400) enemy.state = 'patrol';
            }
        }

        // Common Physics
        if (enemy.type !== 'bat' && enemy.type !== 'fire_spirit' && enemy.type !== 'ice_spirit' && enemy.type !== 'thunder_hawk' && enemy.type !== 'void_titan') {
            enemy.vy += 0.5; // Gravity
        }

        enemy.x += enemy.vx;
        enemy.y += enemy.vy;

        // Ground collision for enemies
        (enemy as any).onGround = false;
        if (enemy.y + enemy.height > state.worldHeight - 40) {
            enemy.y = state.worldHeight - 40 - enemy.height;
            enemy.vy = 0;
            (enemy as any).onGround = true;
        }
        for (const plat of state.platforms) {
            if (enemy.vx > 0 && enemy.x + enemy.width > plat.x && enemy.x < plat.x + plat.width && enemy.y + enemy.height > plat.y + 5 && enemy.y < plat.y + plat.height - 5) {
                enemy.x = plat.x - enemy.width; enemy.vx *= -1; enemy.facing *= -1;
            } else if (enemy.vx < 0 && enemy.x < plat.x + plat.width && enemy.x + enemy.width > plat.x && enemy.y + enemy.height > plat.y + 5 && enemy.y < plat.y + plat.height - 5) {
                enemy.x = plat.x + plat.width; enemy.vx *= -1; enemy.facing *= -1;
            }
            if (enemy.vy > 0 && enemy.y + enemy.height > plat.y && enemy.y < plat.y + plat.height && enemy.x + enemy.width > plat.x + 5 && enemy.x < plat.x + plat.width - 5) {
                enemy.y = plat.y - enemy.height; enemy.vy = 0; (enemy as any).onGround = true;
            }
        }

        // Player Collision
        const touchingPlayer = s.x + s.width > enemy.x && s.x < enemy.x + enemy.width &&
            s.y + s.height > enemy.y && s.y < enemy.y + enemy.height;

        if (touchingPlayer && s.isDashing) {
            handleEnemyHit(state, {
                x: s.x + s.width / 2,
                y: s.y + s.height / 2,
                vx: s.facing * 8,
                vy: 0,
                element: state.selectedElement,
                life: 1,
                size: 10,
                isEnemy: false
            }, enemy);
            // Small mana refund rewards aggressive dash usage
            s.mana = Math.min(s.maxMana, s.mana + 1 + state.upgrades.dashDistanceLevel * 0.25);
            continue;
        }

        if (s.invincibleTimer <= 0 && touchingPlayer) {
            s.health -= enemy.damage * diff.enemyDamageMult;
            s.invincibleTimer = 60;
            state.redFlash = 10;
            state.screenShake = 10;
            if (state.selectedElement === 'earth') {
                s.vx = 0;
                s.vy = -3;
            } else {
                s.vx = (s.x < enemy.x ? -8 : 8);
                s.vy = -4;
            }
            vibrate(state, 50);
            if (state.onDamage) state.onDamage();
        }
    }
}

function updateGuardianAether(state: GameState, enemy: any, s: any) {
    const hpRatio = enemy.health / enemy.maxHealth;
    enemy.phase = hpRatio > 0.66 ? 1 : hpRatio > 0.33 ? 2 : 3;
    if (enemy.stunTimer && enemy.stunTimer > 0) enemy.stunTimer--;

    // Phase behaviors
    if (enemy.phase === 1) {
        if (!enemy.stunTimer) {
            // Fire wave damage if player not water
            const dx = Math.abs((s.x + s.width / 2) - (enemy.x + enemy.width / 2));
            if (dx < 220 && state.selectedElement !== 'water' && s.invincibleTimer <= 0) {
                s.health -= 0.3;
            }
        }
    } else if (enemy.phase === 2) {
        // Ground slam every 240 frames
        enemy.attackTimer = (enemy.attackTimer || 0) + 1;
        if (enemy.attackTimer > 240) {
            enemy.attackTimer = 0;
            state.screenShake = 20;
            if (state.selectedElement !== 'wind' && s.onGround) s.health = 0;
        }
    } else if (enemy.phase === 3) {
        if (!enemy.shieldBroken) {
            enemy.invulnerable = true;
        } else {
            enemy.invulnerable = false;
        }
    }

    // Rising hazard when low hp
    if (hpRatio < 0.25) {
        for (const plat of state.platforms) {
            if (plat.type === 'ground') plat.y += 0.15;
        }
    }
}
