import type { GameState } from '../types';
import { spawnParticles, spawnFloatingText } from './utils';
import { projectilePool } from '../services/poolManager';
import * as Audio from '../audio';

export function updateUltimates(state: GameState) {
    const s = state.stickman;
    if (!s.ultActive) return;

    // Trigger effect based on timer milestones
    const t = s.ultTimer;

    switch (state.selectedElement) {
        case 'fire':
            updateFireUltimate(state, t);
            break;
        case 'water':
            updateIceUltimate(state, t);
            break;
        case 'earth':
            updateEarthUltimate(state, t);
            break;
        case 'wind':
            updateWindUltimate(state, t);
            break;
    }
}

function updateFireUltimate(state: GameState, t: number) {
    // Inferno: Rain of fireballs every 5 frames
    if (t % 5 === 0) {
        const fireball = projectilePool.get();
        fireball.x = state.camera.x + Math.random() * 1200;
        fireball.y = state.camera.y - 100;
        fireball.vx = (Math.random() - 0.5) * 4;
        fireball.vy = 8 + Math.random() * 5;
        fireball.element = 'fire';
        fireball.size = 20 + Math.random() * 10;
        fireball.life = 120;
        fireball.isEnemy = false;
        state.projectiles.push(fireball);
        
        state.screenShake = Math.max(state.screenShake, 5);
        if (t === 180) Audio.playExplosion(); // Initial roar
    }
}

function updateIceUltimate(state: GameState, t: number) {
    // Absolute Zero: Burst on frame 1, freeze thereafter
    if (t === 180) {
        state.screenShake = 25;
        state.enemies.forEach(e => {
            if (e.state === 'dead') return;
            const dist = Math.abs(e.x - state.stickman.x);
            if (dist < 800) {
                e.health -= 60;
                e.stunTimer = 240; // 4 seconds of freeze
                spawnParticles(state, e.x + e.width / 2, e.y + e.height / 2, 'water', 20);
            }
        });
        spawnFloatingText(state, state.stickman.x, state.stickman.y - 50, 'ABSOLUTE ZERO', '#ffffff', 24);
        Audio.playIceSpikes();
    }
}

function updateEarthUltimate(state: GameState, t: number) {
    // Tectonic Rift: Spikes erupt under enemies periodically
    if (t % 15 === 0) {
        state.enemies.forEach(e => {
            if (e.state === 'dead') return;
            const dist = Math.abs(e.x - state.stickman.x);
            if (dist < 600) {
                e.health -= 15;
                e.vy = -8;
                spawnParticles(state, e.x + e.width / 2, e.y + e.height, 'earth', 12);
                state.screenShake = Math.max(state.screenShake, 8);
            }
        });
        if (t === 180) Audio.playEarthquake();
    }
}

function updateWindUltimate(state: GameState, t: number) {
    // Cyclogenesis: Pull enemies toward center, then explode
    const cx = state.stickman.x + state.stickman.width / 2;
    const cy = state.stickman.y + state.stickman.height / 2;

    state.enemies.forEach(e => {
        if (e.state === 'dead') return;
        const dx = cx - e.x;
        const dy = cy - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 500) {
            const force = 0.15 * (1 - dist / 500);
            e.vx += dx * force;
            e.vy += dy * force;
            if (t % 10 === 0) e.health -= 2;
        }
    });

    if (t % 3 === 0) spawnParticles(state, cx, cy, 'wind', 3);
    
    if (t === 1) { // Final burst
        state.screenShake = 30;
        state.enemies.forEach(e => {
             const dist = Math.abs(e.x - cx);
             if (dist < 300) {
                 e.health -= 40;
                 e.vx = (e.x > cx ? 1 : -1) * 15;
                 e.vy = -10;
             }
        });
        Audio.playWindGust();
    }
}
