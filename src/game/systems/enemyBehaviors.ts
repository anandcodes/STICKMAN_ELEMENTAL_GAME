import type { GameState, Enemy } from '../types';
import { projectilePool } from '../services/poolManager';
import { spawnParticles } from './utils';

export interface EnemyBehavior {
  update(enemy: Enemy, state: GameState): void;
}

export const SlimeBehavior: EnemyBehavior = {
  update(enemy, state) {
    const s = state.stickman;
    const dx = (s.x + s.width / 2) - (enemy.x + enemy.width / 2);
    enemy.facing = dx > 0 ? 1 : -1;
    enemy.vx = enemy.facing * enemy.speed;
    if (enemy.onGround && Math.random() < 0.02) {
      enemy.vy = -5;
      enemy.onGround = false;
    }
  }
};

export const BatBehavior: EnemyBehavior = {
  update(enemy, state) {
    const s = state.stickman;
    const dx = (s.x + s.width / 2) - (enemy.x + enemy.width / 2);
    const dy = (s.y + s.height / 2) - (enemy.y + enemy.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 400) {
      enemy.vx += (dx / dist) * 0.15;
      enemy.vy += (dy / dist) * 0.15;
      enemy.vx *= 0.98;
      enemy.vy *= 0.98;
    }
  }
};

export const ArcherBehavior: EnemyBehavior = {
  update(enemy, state) {
    const s = state.stickman;
    const dx = (s.x + s.width / 2) - (enemy.x + enemy.width / 2);
    const dy = (s.y + s.height / 2) - (enemy.y + enemy.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    enemy.facing = dx > 0 ? 1 : -1;
    
    if (dist < 300) {
      enemy.attackTimer = (enemy.attackTimer || 0) + 1;
      if (enemy.attackTimer >= 90) {
        enemy.attackTimer = 0;
        const p = projectilePool.get();
        p.x = enemy.x + enemy.width / 2;
        p.y = enemy.y + enemy.height / 2;
        p.vx = (dx / dist) * 5;
        p.vy = (dy / dist) * 5;
        p.element = enemy.type === 'fire_spirit' ? 'fire' : 'water';
        p.life = 100;
        p.isEnemy = true;
        p.size = 10;
        state.projectiles.push(p);
      }
    }
  }
};

export const GolemBehavior: EnemyBehavior = {
  update(enemy, state) {
    const s = state.stickman;
    const dx = (s.x + s.width / 2) - (enemy.x + enemy.width / 2);
    const dist = Math.abs(dx);
    
    if (dist < 350) {
      enemy.state = 'chase';
      enemy.facing = dx > 0 ? 1 : -1;
      enemy.vx = enemy.facing * enemy.speed * 1.2;
      if (enemy.onGround && Math.random() < 0.01) {
        enemy.vy = -8;
        enemy.onGround = false;
      }
    } else {
      enemy.state = 'patrol';
    }
  }
};

export const Boss1Behavior: EnemyBehavior = {
  update(enemy, state) {
    const s = state.stickman;
    const dx = (s.x + s.width / 2) - (enemy.x + enemy.width / 2);
    const dy = (s.y + s.height / 2) - (enemy.y + enemy.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    enemy.facing = dx > 0 ? 1 : -1;
    enemy.attackTimer = (enemy.attackTimer || 0) + 1;

    if (enemy.attackTimer >= 100) {
      enemy.attackTimer = 0;
      const p = projectilePool.get();
      p.x = enemy.x + (enemy.facing === 1 ? enemy.width : -20);
      p.y = enemy.y + enemy.height / 2;
      p.vx = enemy.facing * 4; p.vy = -4;
      p.element = 'earth'; p.life = 100;
      p.isEnemy = true; p.size = 10;
      state.projectiles.push(p);
      spawnParticles(state, enemy.x + enemy.width / 2, enemy.y + enemy.height, 'earth', 20);
    }

    // Move slowly towards player
    if (dist > 200) {
      enemy.vx = enemy.facing * enemy.speed;
    } else {
      enemy.vx *= 0.9;
    }
  }
};

export const VoidTitanBehavior: EnemyBehavior = {
  update(enemy, state) {
    const s = state.stickman;
    const dx = (s.x + s.width / 2) - (enemy.x + enemy.width / 2);
    const dy = (s.y + s.height / 2) - (enemy.y + enemy.height / 2);
    
    enemy.attackTimer = (enemy.attackTimer || 0) + 1;
    if (enemy.attackTimer >= 200) {
      enemy.attackTimer = 0;
      const elements: import('../types').Element[] = ['fire', 'water', 'earth', 'wind'];
      const curIndex = elements.indexOf(enemy.resistance);
      const nextIndex = (curIndex + 1) % elements.length;

      enemy.resistance = elements[nextIndex];
      enemy.weakness = elements[(nextIndex + 2) % elements.length];
      
      const p = projectilePool.get();
      p.x = enemy.x + enemy.width / 2;
      p.y = enemy.y + enemy.height / 2;
      const angle = Math.atan2(dy, dx);
      p.vx = Math.cos(angle) * 6; p.vy = Math.sin(angle) * 6;
      p.element = enemy.resistance; p.life = 120;
      p.isEnemy = true; p.size = 12;
      state.projectiles.push(p);
      spawnParticles(state, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.resistance, 30);
    }
  }
};

export const BEHAVIORS: Partial<Record<Enemy['type'], EnemyBehavior>> = {
  slime: SlimeBehavior,
  bat: BatBehavior,
  fire_spirit: ArcherBehavior,
  ice_spirit: ArcherBehavior,
  golem: GolemBehavior,
  boss1: Boss1Behavior,
  void_titan: VoidTitanBehavior,
};
