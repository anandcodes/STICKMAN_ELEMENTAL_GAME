import type { GameState, Enemy } from '../types';
import { projectilePool } from '../services/poolManager';
import { spawnParticles } from './utils';

export interface EnemyBehavior {
  update(enemy: Enemy, state: GameState): void;
}

function checkProjectileThreat(enemy: Enemy, state: GameState): number {
  const threatDist = 200;
  for (const p of state.projectiles) {
    if (p.isEnemy) continue;
    const dx = p.x - (enemy.x + enemy.width / 2);
    const dy = p.y - (enemy.y + enemy.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < threatDist) {
      // Is it moving towards us?
      const dot = p.vx * -dx + p.vy * -dy;
      if (dot > 0) {
        return dx > 0 ? -1 : 1; // Return dodge direction
      }
    }
  }
  return 0;
}

export const SlimeBehavior: EnemyBehavior = {
  update(enemy, state) {
    const s = state.stickman;
    const dx = (s.x + s.width / 2) - (enemy.x + enemy.width / 2);
    
    // Simple Flanking Logic
    let targetX = s.x + s.width / 2;
    const others = state.enemies.filter(e => e.type === 'slime' && e.id !== enemy.id && Math.abs(e.x - s.x) < 300);
    if (others.length > 0 && others[0].x < s.x && dx < 0) {
       targetX += 150; // Try to move to the other side
    } else if (others.length > 0 && others[0].x > s.x && dx > 0) {
       targetX -= 150;
    }

    const moveDx = targetX - (enemy.x + enemy.width / 2);
    enemy.facing = moveDx > 0 ? 1 : -1;
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
      // Swarm mechanics: maintain some distance or flank
      let steerX = dx / dist;
      let steerY = dy / dist;
      
      const allies = state.enemies.filter(e => e.type === 'bat' && e.id !== enemy.id && Math.sqrt((e.x-enemy.x)**2 + (e.y-enemy.y)**2) < 60);
      if (allies.length > 0) {
        steerX -= (allies[0].x - enemy.x) * 0.05;
        steerY -= (allies[0].y - enemy.y) * 0.05;
      }

      enemy.vx += steerX * 0.15;
      enemy.vy += steerY * 0.15;
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
    
    // Dodging Logic
    const dodgeDir = checkProjectileThreat(enemy, state);
    if (dodgeDir !== 0 && enemy.onGround) {
      enemy.vy = -6;
      enemy.vx = dodgeDir * 4;
      enemy.onGround = false;
      return;
    }

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
    
    // Charge logic
    if (enemy.isCharging) {
      enemy.chargeTimer = (enemy.chargeTimer || 0) - 1;
      enemy.vx = (enemy.chargeDir || 0) * enemy.speed * 4;
      if (enemy.chargeTimer <= 0) {
        enemy.isCharging = false;
        enemy.vx = 0;
      }
      return;
    }

    if (dist < 350) {
      enemy.state = 'chase';
      enemy.facing = dx > 0 ? 1 : -1;
      enemy.vx = enemy.facing * enemy.speed * 1.2;
      
      // Trigger charge
      if (dist > 150 && dist < 250 && Math.abs(s.y - enemy.y) < 50 && Math.random() < 0.01) {
        enemy.isCharging = true;
        enemy.chargeTimer = 30;
        enemy.chargeDir = enemy.facing;
        spawnParticles(state, enemy.x + enemy.width / 2, enemy.y, 'fire', 10);
      }

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
    
    // Dodging
    const dodgeDir = checkProjectileThreat(enemy, state);
    if (dodgeDir !== 0 && Math.random() < 0.3) {
      enemy.vx = dodgeDir * 6;
    }

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
    
    // Phase 2 Transition
    if (enemy.health < enemy.maxHealth * 0.5 && (enemy.phase || 1) < 2) {
      enemy.phase = 2;
      state.screenShake = 40;
      spawnParticles(state, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 'fire', 50);
    }

    if (enemy.phase === 2) {
      // Phase 2: Aggressive Laser and Minions
      if (enemy.attackTimer % 180 === 0) {
        state.enemies.push({
           ...enemy, id: Date.now() + Math.random(), type: 'void_brute',
           health: 100, maxHealth: 100, phase: 1, x: enemy.x + (Math.random() - 0.5) * 200
        });
      }
      // Laser Hazard spawning
      if (enemy.attackTimer % 60 === 0) {
        state.hazards.push({
           id: Date.now(), type: 'laser', x: 0, y: s.y, width: state.worldWidth, height: 10,
           vx: 0, vy: 0, damage: 1, active: true, timer: 30
        });
      }
    }

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

export const TreeGuardianBehavior: EnemyBehavior = {
  update(enemy, state) {
    const s = state.stickman;
    const dx = s.x - enemy.x;
    
    enemy.attackTimer = (enemy.attackTimer || 0) + 1;

    // Phase 2 Transition
    if (enemy.health < enemy.maxHealth * 0.5 && (enemy.phase || 1) < 2) {
      enemy.phase = 2;
      enemy.speed = 0; // Roots himself
      state.screenShake = 20;
    }

    if (enemy.phase === 2) {
      if (enemy.attackTimer % 45 === 0) {
        // Spawn spikes near player
        state.hazards.push({
          id: Date.now(), type: 'spike_trap', x: s.x - 20, y: state.worldHeight - 40, width: 40, height: 40,
          vx: 0, vy: 0, damage: 15, active: true, timer: 60
        });
      }
    } else {
      // Phase 1: Normal movement
      enemy.facing = dx > 0 ? 1 : -1;
      enemy.vx = enemy.facing * enemy.speed;
    }

    if (enemy.attackTimer % 120 === 0) {
       // Shoot leaf projectiles
       const p = projectilePool.get();
       p.x = enemy.x + enemy.width/2; p.y = enemy.y + 20;
       p.vx = (dx > 0 ? 1 : -1) * 5; p.vy = -3;
       p.element = 'earth'; p.life = 100; p.isEnemy = true; p.size = 8;
       state.projectiles.push(p);
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
  tree_guardian: TreeGuardianBehavior,
};
