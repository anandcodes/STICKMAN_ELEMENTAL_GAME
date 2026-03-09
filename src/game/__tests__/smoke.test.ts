import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialState } from '../engine';
import { loadSave, saveProgress, SAVE_KEY, SAVE_SCHEMA_VERSION } from '../persistence';
import { buildEndlessState, buildMenuState, buildNextLevelState, buildRestartLevelState } from '../stateFactory';
import { TOTAL_LEVELS } from '../levels';
import { setMockStorage } from './testHelpers';

test('loadSave returns defaults when storage is empty', () => {
  setMockStorage();
  const save = loadSave();

  assert.equal(save.highScore, 0);
  assert.equal(save.furthestLevel, 0);
  assert.equal(save.gemsCurrency, 0);
  assert.equal(save.difficulty, 'normal');
  assert.equal(save.version, SAVE_SCHEMA_VERSION);
  assert.deepEqual(save.bestTimes, {});
});

test('saveProgress persists furthest unlocked level from state.furthestLevel', () => {
  const storage = setMockStorage();
  const state = createInitialState(2, 120, 120, 'normal');
  state.currentLevel = 2;
  state.furthestLevel = 7;
  state.totalGemsEver = 50;
  state.enemiesDefeated = 22;
  state.gemsCurrency = 99;

  saveProgress(state);

  const raw = storage.getItem(SAVE_KEY);
  assert.ok(raw);
  const parsed = JSON.parse(raw);

  assert.equal(parsed.version, SAVE_SCHEMA_VERSION);
  assert.equal(parsed.furthestLevel, 7);
  assert.equal(parsed.highScore, 120);
  assert.equal(parsed.totalGemsEver, 50);
  assert.equal(parsed.totalEnemiesDefeated, 22);
});

test('loadSave sanitizes malformed legacy save payloads', () => {
  setMockStorage({
    [SAVE_KEY]: JSON.stringify({
      highScore: 'not-a-number',
      furthestLevel: -5,
      totalGemsEver: 42.9,
      gemsCurrency: '1000',
      totalEnemiesDefeated: 12.4,
      difficulty: 'nightmare',
      upgrades: { healthLevel: 99, manaLevel: -2, regenLevel: 2.7, damageLevel: 'x' },
      bestTimes: { '0': 123.9, '1': -1, foo: 50 },
    }),
  });

  const save = loadSave();
  assert.equal(save.version, SAVE_SCHEMA_VERSION);
  assert.equal(save.highScore, 0);
  assert.equal(save.furthestLevel, 0);
  assert.equal(save.totalGemsEver, 42);
  assert.equal(save.gemsCurrency, 0);
  assert.equal(save.totalEnemiesDefeated, 12);
  assert.equal(save.difficulty, 'normal');
  assert.deepEqual(save.upgrades, { healthLevel: 1, manaLevel: 0, regenLevel: 0, damageLevel: 0, doubleJumpLevel: 0, dashDistanceLevel: 0 });
  assert.deepEqual(save.bestTimes, { 0: 123 });
});

test('loadSave clamps impossible progression values and economy budget', () => {
  setMockStorage({
    [SAVE_KEY]: JSON.stringify({
      version: SAVE_SCHEMA_VERSION,
      highScore: 999999999,
      furthestLevel: 999,
      totalGemsEver: 25,
      gemsCurrency: 999,
      totalEnemiesDefeated: 100,
      difficulty: 'hard',
      upgrades: { healthLevel: 5, manaLevel: 5, regenLevel: 5, damageLevel: 5 },
      bestTimes: { '0': 123, '999': 777 },
    }),
  });

  const save = loadSave();
  const spend =
    (save.upgrades.healthLevel * (save.upgrades.healthLevel + 1) * 30) / 2 +
    (save.upgrades.manaLevel * (save.upgrades.manaLevel + 1) * 30) / 2 +
    (save.upgrades.regenLevel * (save.upgrades.regenLevel + 1) * 50) / 2 +
    (save.upgrades.damageLevel * (save.upgrades.damageLevel + 1) * 60) / 2 +
    (save.upgrades.doubleJumpLevel * (save.upgrades.doubleJumpLevel + 1) * 100) / 2 +
    (save.upgrades.dashDistanceLevel * (save.upgrades.dashDistanceLevel + 1) * 80) / 2;

  assert.ok(save.furthestLevel <= TOTAL_LEVELS - 1);
  assert.ok(save.gemsCurrency <= save.totalGemsEver);
  assert.ok(spend + save.gemsCurrency <= save.totalGemsEver);
  assert.deepEqual(save.bestTimes, { 0: 123 });
});

test('loadSave resets economy fields when integrity hash is tampered', () => {
  setMockStorage({
    [SAVE_KEY]: JSON.stringify({
      version: SAVE_SCHEMA_VERSION,
      integrity: 'v2_badsignature',
      highScore: 500,
      furthestLevel: 5,
      totalGemsEver: 300,
      gemsCurrency: 300,
      totalEnemiesDefeated: 50,
      difficulty: 'normal',
      upgrades: { healthLevel: 5, manaLevel: 5, regenLevel: 5, damageLevel: 5 },
      bestTimes: { '0': 120 },
    }),
  });

  const save = loadSave();
  assert.equal(save.gemsCurrency, 0);
  assert.deepEqual(save.upgrades, { healthLevel: 0, manaLevel: 0, regenLevel: 0, damageLevel: 0, doubleJumpLevel: 0, dashDistanceLevel: 0 });
  assert.ok(typeof save.integrity === 'string' && save.integrity.length > 0);
});

test('stateFactory produces expected menu/endless states', () => {
  setMockStorage();
  const menu = buildMenuState(333, 'hard');
  assert.equal(menu.screen, 'menu');
  assert.equal(menu.difficulty, 'hard');

  const endless = buildEndlessState(333, 'easy');
  assert.equal(endless.screen, 'playing');
  assert.equal(endless.currentLevel, 15);
  assert.equal(endless.showLevelIntro, true);
  assert.equal(endless.levelIntroTimer, 180);
});

test('stateFactory next/restart transitions preserve intended fields', () => {
  setMockStorage();
  const current = createInitialState(4, 555, 1000, 'hard');
  current.totalGemsEver = 70;
  current.enemiesDefeated = 30;

  const next = buildNextLevelState(current, 1000);
  assert.equal(next.currentLevel, 5);
  assert.equal(next.score, 555);
  assert.equal(next.totalGemsEver, 70);
  assert.equal(next.enemiesDefeated, 30);
  assert.equal(next.difficulty, 'hard');

  const restart = buildRestartLevelState(current, 1000);
  assert.equal(restart.currentLevel, 4);
  assert.equal(restart.score, 0);
  assert.equal(restart.difficulty, 'hard');
});
