import type { Enemy, EnvObject, Element } from '../types';

let nextId = 1000;
export function nid() { return nextId++; }

export function makeEnemy(
  type: Enemy['type'], x: number, y: number,
  weakness: Element, resistance: Element,
  patrolRange: number, damage: number, speed: number,
  hp: number
): Enemy {
  const sizes: Record<Enemy['type'], [number, number]> = {
    slime: [28, 22], bat: [30, 20], golem: [36, 44],
    fire_spirit: [26, 30], ice_spirit: [26, 30],
    boss1: [90, 110], boss2: [70, 90], // Boss sizes
  };
  const [w, h] = sizes[type];
  return {
    id: nid(), type, x, y: y - h, width: w, height: h,
    vx: 0, vy: 0, health: hp, maxHealth: hp,
    facing: 1, weakness, resistance,
    state: 'patrol', hurtTimer: 0,
    patrolRange, originX: x, animTimer: 0,
    damage, speed,
  };
}

export function makeGem(x: number, y: number, color?: string): EnvObject {
  return {
    id: nid(), type: 'gem', x, y, width: 16, height: 16,
    health: 1, maxHealth: 1, state: 'normal', solid: false,
    gemColor: color || ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff'][Math.floor(Math.random() * 6)],
  };
}

export function makePortal(x: number, y: number): EnvObject {
  return {
    id: nid(), type: 'portal', x, y: y - 60, width: 40, height: 60,
    health: 1, maxHealth: 1, state: 'normal', solid: false,
  };
}

export function makeSpike(x: number, y: number, w: number): EnvObject {
  return {
    id: nid(), type: 'spike', x, y: y - 15, width: w, height: 15,
    health: 999, maxHealth: 999, state: 'normal', solid: false,
  };
}

export function makeWindZone(x: number, y: number, w: number, h: number, direction: number, strength = 0.4): EnvObject {
  return {
    id: nid(), type: 'wind_zone', x, y, width: w, height: h,
    health: 999, maxHealth: 999, state: 'normal', solid: false,
    windDirection: direction, windStrength: strength,
  };
}

export function makeWaterCurrent(x: number, y: number, w: number, speed = 0.5): EnvObject {
  return {
    id: nid(), type: 'water_current', x, y, width: w, height: 15,
    health: 999, maxHealth: 999, state: 'normal', solid: false,
    currentSpeed: speed,
  };
}
