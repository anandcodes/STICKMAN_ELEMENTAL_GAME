import type { GameState } from '../types';
import { particlePool } from '../services/poolManager';
import { spawnParticles, addScore, spawnFloatingText } from './utils';
import * as Audio from '../audio';

export function updateEnvironment(state: GameState) {
  const s = state.stickman;

  for (const obj of state.envObjects) {
    // Wind zone / water current effect check (doesn't need to be solid or uncollected)
    if (obj.type === 'wind_zone' || obj.type === 'water_current' || obj.type === 'anti_gravity_zone') {
      const touchingZone = s.x + s.width > obj.x && s.x < obj.x + obj.width &&
        s.y + s.height > obj.y && s.y < obj.y + obj.height;

      if (touchingZone) {
        if (obj.type === 'wind_zone') {
          s.vy -= (obj.windStrength || 0);
          s.vx += (obj.windDirection || 0) * (obj.windStrength || 0);
          if (Math.random() < 0.2) {
            const p = particlePool.get();
            p.x = obj.x + Math.random() * obj.width;
            p.y = obj.y + Math.random() * obj.height;
            p.vx = (obj.windDirection || 0) * 2;
            p.vy = -(obj.windStrength || 0.4) * 4;
            p.life = 30; p.maxLife = 30; p.element = 'wind';
            p.size = 3; p.color = 'rgba(255,255,255,0.4)';
            state.particles.push(p);
          }
        }
        if (obj.type === 'water_current') {
          s.vx += (obj.currentSpeed || 0);
          if (Math.random() < 0.2) {
            const p = particlePool.get();
            p.x = obj.x + Math.random() * obj.width;
            p.y = obj.y + 5 + Math.random() * 10;
            p.vx = obj.currentSpeed || 0;
            p.vy = -0.5;
            p.life = 20; p.maxLife = 20; p.element = 'water';
            p.size = 3; p.color = '#4488ff';
            state.particles.push(p);
          }
        }
        if (obj.type === 'anti_gravity_zone') {
          s.vy += (-4 - s.vy) * 0.15; // Smoothly approach -4 velocity upwards
          s.onGround = false;
          s.jumping = false;
          if (Math.random() < 0.3) {
            const p = particlePool.get();
            p.x = obj.x + Math.random() * obj.width;
            p.y = obj.y + Math.random() * obj.height;
            p.vx = (Math.random() - 0.5);
            p.vy = -2 - Math.random() * 2;
            p.life = 40; p.maxLife = 40; p.element = 'wind';
            p.size = 2; p.color = '#8a2be2';
            state.particles.push(p);
          }
        }
      }
    }

    // Corrupted Crystal global pulse logic
    if (obj.type === 'corrupted_crystal' && obj.state !== 'destroyed') {
      obj.energyTimer = (obj.energyTimer || 0) + 1;
      if (obj.energyTimer === 121) {
        for (let j = 0; j < 15; j++) {
          const p = particlePool.get();
          p.x = obj.x + Math.random() * obj.width;
          p.y = obj.y + Math.random() * obj.height;
          p.vx = (Math.random() - 0.5) * 8;
          p.vy = (Math.random() - 0.5) * 8;
          p.life = 40; p.maxLife = 40; p.element = 'earth';
          p.size = 4; p.color = '#39ff14';
          state.particles.push(p);
        }
        const cx = obj.x + obj.width / 2;
        const cy = obj.y + obj.height / 2;
        const dist = Math.sqrt(Math.pow((s.x + s.width / 2) - cx, 2) + Math.pow((s.y + s.height / 2) - cy, 2));
        if (dist < 100) {
          s.health -= 25;
          s.mana = Math.max(0, s.mana - 30);
          s.vy = -6;
          s.vx = (s.x < cx ? -6 : 6);
          s.invincibleTimer = 40;
          state.redFlash = 15;
          state.screenShake = 15;
          Audio.playHit();
        }
      }
      if (obj.energyTimer > 180) obj.energyTimer = 0;
    }

    if (obj.state === 'burning' && obj.type !== 'fire_pit') {
      obj.health -= 0.5;
      if (Math.random() > 0.6) spawnParticles(state, obj.x + Math.random() * obj.width, obj.y, 'fire', 1);
      if (obj.health <= 0) {
        obj.state = 'destroyed'; obj.solid = false;
        spawnParticles(state, obj.x + obj.width / 2, obj.y + obj.height / 2, 'fire', 20);
        addScore(state, 10); Audio.playCrateBreak();
      }
    }

    // Fire pit damage
    if (obj.type === 'fire_pit' && obj.state === 'burning' && s.invincibleTimer <= 0) {
      const d = Math.abs((s.x + s.width / 2) - (obj.x + obj.width / 2));
      if (d < 40 && s.y + s.height > obj.y - 10 && state.selectedElement !== 'fire') {
        s.health -= 0.3;
        if (Math.random() > 0.9) state.redFlash = 10;
      }
    }

    // Cracked rock hint
    if (obj.type === 'rock' && state.selectedElement !== 'earth') {
      const dx = Math.abs((s.x + s.width / 2) - (obj.x + obj.width / 2));
      const dy = Math.abs((s.y + s.height / 2) - (obj.y + obj.height / 2));
      if (dx < 40 && dy < 60) {
        (obj as any).hintTimer = ((obj as any).hintTimer || 0) + 1;
        if ((obj as any).hintTimer === 180) {
          spawnFloatingText(state, obj.x + obj.width / 2, obj.y - 10, 'Only the strength of Earth can break this.', '#e8dfcf', 12);
        }
      } else {
        (obj as any).hintTimer = 0;
      }
    }
  }
}
