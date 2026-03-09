import test from 'node:test';
import assert from 'node:assert/strict';

import { update, createInitialState } from '../engine';
import { loadSave } from '../persistence';
import { handleElementInteraction, updateProjectiles } from '../systems/combat';
import { setMockAudioContext, setMockStorage, withMockedRandom } from './testHelpers';

test('plant grows upward consistently after repeated water hits', () => {
  setMockStorage();
  const state = createInitialState(0, 0, 3, 0, 'normal');
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

  const waterProj = { x: 210, y: 295, vx: 1, vy: 0, element: 'water' as const, life: 10, size: 8 };

  handleElementInteraction(state, waterProj, plant);
  handleElementInteraction(state, waterProj, plant);
  handleElementInteraction(state, waterProj, plant);

  assert.equal(plant.state, 'grown');
  assert.equal(plant.solid, true);
  assert.equal(plant.width, 40);
  assert.equal(plant.height, 80);
  assert.equal(plant.y, 240); // Base Y stays anchored at original 320
});

test('water + earth projectile synergy creates mud trap and consumes both projectiles', () => {
  setMockStorage();
  const state = createInitialState(0, 0, 3, 0, 'normal');
  state.envObjects = [];
  state.enemies = [];
  state.platforms = [];
  state.projectiles = [
    { x: 100, y: 100, vx: 0, vy: 0, element: 'water', life: 20, size: 8 },
    { x: 103, y: 102, vx: 0, vy: 0, element: 'earth', life: 20, size: 8 },
  ];

  withMockedRandom(0.5, () => updateProjectiles(state));

  assert.equal(state.projectiles.length, 0);
  const zone = state.envObjects.find(o => o.type === 'mud_trap');
  assert.ok(zone);
  assert.equal(zone.state, 'mud');
});

test('earth projectile hitting platform creates temporary earth platform', () => {
  setMockStorage();
  const state = createInitialState(0, 0, 3, 0, 'normal');
  state.platforms = [{ x: 0, y: 100, width: 300, height: 20, type: 'stone' }];
  state.envObjects = [];
  state.enemies = [];
  state.projectiles = [{ x: 120, y: 105, vx: 0, vy: 0, element: 'earth', life: 20, size: 8 }];

  withMockedRandom(0.5, () => updateProjectiles(state));

  assert.equal(state.projectiles.length, 0);
  const earthPlatform = state.platforms.find(p => p.type === 'earth');
  assert.ok(earthPlatform);
  assert.equal(earthPlatform.meltTimer, 300);
});

test('touching active portal transitions to levelComplete and persists progression unlock', () => {
  setMockStorage();
  setMockAudioContext();

  const state = createInitialState(2, 0, 3, 0, 'normal');
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

  assert.equal(state.screen, 'levelComplete');
  assert.equal(state.furthestLevel, 3);
  assert.equal(loadSave().furthestLevel, 3);
});

test('dash trigger is consumed so holding shift does not auto-recast', () => {
  setMockStorage();
  setMockAudioContext();

  const state = createInitialState(1, 0, 3, 0, 'normal');
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
  assert.equal(state.stickman.isDashing, true);
  assert.equal(state.keys.has('shift'), false);

  // Simulate dash end + cooldown expiry while key is still physically held:
  // since update consumed the key, it should not auto-trigger a second dash.
  state.stickman.isDashing = false;
  state.stickman.dashTimer = 0;
  state.stickman.dashCooldown = 0;
  update(state);
  assert.equal(state.stickman.isDashing, false);
});

test('dashing into an enemy deals dash impact damage and can secure a kill', () => {
  setMockStorage();
  setMockAudioContext();

  const state = createInitialState(1, 0, 3, 0, 'normal');
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

  assert.equal(state.enemies[0].state, 'dead');
  assert.equal(state.enemiesDefeated, 1);
  assert.equal(state.stickman.health, state.stickman.maxHealth);
});
