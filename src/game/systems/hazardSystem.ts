import type { GameState } from '../types';
import { spawnParticles } from './utils';

export function updateHazards(state: GameState, dt: number) {
    const s = state.stickman;

    // 1. Crumbling Platforms
    state.platforms.forEach((plat) => {
        if (!plat.isCrumbling) return;

        // Detect if player is on this platform
        const onPlat = s.onGround && 
                       s.y + s.height >= plat.y - 2 && 
                       s.y + s.height <= plat.y + 10 &&
                       s.x + s.width > plat.x && 
                       s.x < plat.x + plat.width;

        if (onPlat && plat.crumbleState === 'idle') {
            plat.crumbleState = 'shaking';
            plat.crumbleTimer = 45; // 0.75s at 60fps
        }

        if (plat.crumbleState === 'shaking') {
            plat.crumbleTimer! -= dt;
            plat.shakeOffset = Math.sin(Date.now() * 0.1) * 3;
            if (plat.crumbleTimer! <= 0) {
                plat.crumbleState = 'falling';
                plat.crumbleTimer = 60; // fall time
            }
        }

        if (plat.crumbleState === 'falling') {
            plat.y += 8 * dt; // Fall down
            plat.crumbleTimer! -= dt;
            if (plat.crumbleTimer! <= 0) {
                // Technically we could remove it, but let's just move it far away
                plat.y = 10000;
            }
        }
    });

    // 2. Toxic Pools (EnvObjects)
    state.envObjects.forEach(obj => {
        if (obj.type === 'magma_pool' || obj.type === 'mud_trap') {
            const overlapX = s.x + s.width > obj.x && s.x < obj.x + obj.width;
            const overlapY = s.y + s.height > obj.y && s.y < obj.y + obj.height;
            
            if (overlapX && overlapY) {
                if (obj.type === 'magma_pool' && s.invincibleTimer <= 0) {
                    s.health -= 0.5 * dt;
                    s.hurtTimer = 5;
                    if (Math.random() > 0.8) spawnParticles(state, s.x + s.width/2, s.y + s.height, 'fire', 2);
                }
                if (obj.type === 'mud_trap') {
                   s.vx *= 0.8; // Slow down
                }
            }
        }
    });

    // 3. Moving Hazards (Lasers, Blades)
    state.hazards.forEach(h => {
        if (!h.active) return;

        // Update movement
        if (h.vx || h.vy) {
            h.x += h.vx * dt;
            h.y += h.vy * dt;
            // Simple bounce or loop could be added here
        }
        
        if (h.angularVelocity) {
            h.angle = (h.angle || 0) + h.angularVelocity * dt;
        }

        // Collision detection
        const overlapX = s.x + s.width > h.x && s.x < h.x + h.width;
        const overlapY = s.y + s.height > h.y && s.y < h.y + h.height;

        if (overlapX && overlapY && s.invincibleTimer <= 0) {
            s.health -= h.damage * dt;
            s.hurtTimer = 10;
            s.vx += (s.x < h.x ? -5 : 5); // Knockback
            s.vy = -3;
        }
    });
}
