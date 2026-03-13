import { ObjectPool } from './objectPool';
import type { Particle, Projectile } from '../types';

export const particlePool = new ObjectPool<Particle>(
  () => ({
    x: 0, y: 0, vx: 0, vy: 0,
    life: 0, maxLife: 0, element: 'fire',
    size: 0, color: ''
  }),
  (p) => {
    p.x = 0; p.y = 0; p.vx = 0; p.vy = 0;
    p.life = 0; p.maxLife = 0;
  },
  200 // Initial size
);

export const projectilePool = new ObjectPool<Projectile>(
  () => ({
    x: 0, y: 0, vx: 0, vy: 0,
    element: 'fire', life: 0, size: 0,
    isEnemy: false
  }),
  (p) => {
    p.x = 0; p.y = 0; p.vx = 0; p.vy = 0;
    p.life = 0; p.isEnemy = false;
  },
  50 // Initial size
);
