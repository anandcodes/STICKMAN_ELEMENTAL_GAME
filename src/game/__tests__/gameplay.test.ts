import { test, expect } from 'vitest';

import { update, createInitialState } from '../engine';
import { loadSave } from '../persistence';
import { buildRestartLevelState } from '../stateFactory';
import { handleElementInteraction, updateProjectiles } from '../systems/combat';
import { setMockAudioContext, setMockStorage, withMockedRandom } from './testHelpers';
import type { Projectile } from '../types';

test('plant grows upward consistently after repeated water hits', () => {
  setMockStorage();
  const state = createInitialState(0, 0, 0, 'normal');
  const plant = {
    id: 1001,
    type: 'plant' as const,
    x: 200,
    y: 300,
    width: 20,
    height: 20,
    health: 100,
    maxHealth: 100,
    state: 'normal' as const,
    solid: false,
  };

  const waterProj: Projectile = { x: 210, y: 295, vx: 1, vy: 0, element: 'water' as const, life: 10, size: 8, isEnemy: false };

  handleElementInteraction(state, waterProj, plant);
  handleElementInteraction(state, waterProj, plant);
  handleElementInteraction(state, waterProj, plant);

  expect(plant.state).toBe('grown');
  expect(plant.solid).toBe(true);
  expect(plant.width).toBe(40);
  expect(plant.height).toBe(80);
  expect(plant.y).toBe(240); // Base Y stays anchored at original 320
});

test('water + earth projectile synergy creates mud trap and consumes both projectiles', () => {
  setMockStorage();
  const state = createInitialState(0, 0, 0, 'normal');
  state.envObjects = [];
  state.enemies = [];
  state.platforms = [];
  state.projectiles = [
    { x: 100, y: 100, vx: 0, vy: 0, element: 'water', life: 20, size: 8, isEnemy: false },
    { x: 103, y: 102, vx: 0, vy: 0, element: 'earth', life: 20, size: 8, isEnemy: false },
  ];

  withMockedRandom(0.5, () => updateProjectiles(state));

  expect(state.projectiles.length).toBe(0);
  const zone = state.envObjects.find(o => o.type === 'mud_trap');
  expect(zone).toBeTruthy();
  expect(zone!.state).toBe('mud');
});

test('earth projectile hitting platform creates temporary earth platform', () => {
  setMockStorage();
  const state = createInitialState(0, 0, 0, 'normal');
  state.platforms = [{ x: 0, y: 100, width: 300, height: 20, type: 'stone' }];
  state.envObjects = [];
  state.enemies = [];
  state.projectiles = [{ x: 120, y: 105, vx: 0, vy: 0, element: 'earth', life: 20, size: 8, isEnemy: false }];

  withMockedRandom(0.5, () => updateProjectiles(state));

  expect(state.projectiles.length).toBe(0);
  const earthPlatform = state.platforms.find(p => p.type === 'earth');
  expect(earthPlatform).toBeTruthy();
  expect(earthPlatform!.meltTimer).toBe(300);
});

test('touching active portal transitions to levelComplete and persists progression unlock', () => {
  setMockStorage();
  setMockAudioContext();

  const state = createInitialState(2, 0, 0, 'normal');
  state.screen = 'playing';
  state.showLevelIntro = false;
  state.paused = false;
  state.currentLevel = 2;
  state.furthestLevel = 2;
  state.enemies = [];
  state.projectiles = [];
  state.platforms = [];
  state.envObjects = [{
    id: 1,
    type: 'portal',
    x: 100,
    y: 100,
    width: 40,
    height: 60,
    health: 1,
    maxHealth: 1,
    state: 'active',
    solid: false,
  }];
  state.stickman.x = 105;
  state.stickman.y = 105;
  state.stickman.vx = 0;
  state.stickman.vy = 0;

  update(state);

  expect(state.screen).toBe('levelComplete');
  expect(state.furthestLevel).toBe(3);
  expect(loadSave().furthestLevel).toBe(3);
});

test('dash trigger is consumed so holding shift does not auto-recast', () => {
  setMockStorage();
  setMockAudioContext();

  const state = createInitialState(1, 0, 0, 'normal');
  state.screen = 'playing';
  state.showLevelIntro = false;
  state.paused = false;
  state.enemies = [];
  state.envObjects = [];
  state.platforms = [];
  state.keys = new Set(['shift']);
  state.stickman.mana = 100;
  state.stickman.dashCooldown = 0;
  state.stickman.isDashing = false;
  state.stickman.dashTimer = 0;

  update(state);
  expect(state.stickman.isDashing).toBe(true);
  expect(state.keys.has('shift')).toBe(false);

  // Simulate dash end + cooldown expiry while key is still physically held:
  // since update consumed the key, it should not auto-trigger a second dash.
  state.stickman.isDashing = false;
  state.stickman.dashTimer = 0;
  state.stickman.dashCooldown = 0;
  update(state);
  expect(state.stickman.isDashing).toBe(false);
});

test('dashing into an enemy deals dash impact damage and can secure a kill', () => {
  setMockStorage();
  setMockAudioContext();

  const state = createInitialState(1, 0, 0, 'normal');
  state.screen = 'playing';
  state.showLevelIntro = false;
  state.paused = false;
  state.platforms = [];
  state.envObjects = [];
  state.selectedElement = 'fire';
  state.keys = new Set(['shift']);
  state.stickman.x = 200;
  state.stickman.y = 200;
  state.stickman.facing = 1;
  state.stickman.health = state.stickman.maxHealth;
  state.enemies = [{
    id: 999,
    type: 'slime',
    x: 206,
    y: 206,
    width: 28,
    height: 22,
    vx: 0,
    vy: 0,
    health: 20,
    maxHealth: 20,
    facing: -1,
    weakness: 'fire',
    resistance: 'water',
    state: 'patrol',
    hurtTimer: 0,
    patrolRange: 40,
    originX: 206,
    animTimer: 0,
    damage: 8,
    speed: 0,
  }];

  update(state);

  expect(state.enemies[0].state).toBe('dead');
  expect(state.enemiesDefeated).toBe(1);
  expect(state.stickman.health).toBe(state.stickman.maxHealth);
});

test('early levels widen terrain and reduce enemy density after repeated deaths', () => {
  setMockStorage();

  const baseline = createInitialState(1, 0, 0, 'normal', 0);
  const assisted = createInitialState(1, 0, 0, 'normal', 4);

  expect(assisted.balanceCurve.phase).toBe('teach');
  expect(assisted.assistTier).toBe(2);
  expect(assisted.platforms[1].width).toBeGreaterThan(baseline.platforms[1].width);
  expect(assisted.balanceCurve.enemyDensityMultiplier).toBeLessThan(baseline.balanceCurve.enemyDensityMultiplier);
  expect(assisted.checkpoints.length).toBeGreaterThanOrEqual(baseline.checkpoints.length);
});

test('restart state respawns from unlocked checkpoint while preserving adaptive assist', () => {
  setMockStorage();

  const current = createInitialState(2, 0, 0, 'normal', 3);
  current.screen = 'playing';
  current.showLevelIntro = false;
  current.checkpointIndex = Math.min(1, current.checkpoints.length - 1);
  current.respawnPoint = { ...current.checkpoints[current.checkpointIndex] };

  const restarted = buildRestartLevelState(current, 0);

  expect(restarted.deathStreak).toBe(current.deathStreak);
  expect(restarted.checkpointIndex).toBe(current.checkpointIndex);
  expect(restarted.stickman.x).toBe(restarted.checkpoints[restarted.checkpointIndex].x);
  expect(restarted.stickman.y).toBe(restarted.checkpoints[restarted.checkpointIndex].y);
  expect(restarted.balanceCurve.showGuides).toBe(true);
});
