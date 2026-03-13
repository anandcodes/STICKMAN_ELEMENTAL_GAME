import { test, expect, describe } from 'vitest';

import { createInitialState } from '../engine';
import { loadSave, saveProgress, SAVE_KEY, SAVE_SCHEMA_VERSION } from '../persistence';
import { buildEndlessState, buildMenuState, buildNextLevelState, buildRestartLevelState } from '../stateFactory';
import { TOTAL_LEVELS } from '../levels';
import { setMockStorage } from './testHelpers';

test('loadSave returns defaults when storage is empty', () => {
  setMockStorage();
  const save = loadSave();

  expect(save.highScore).toBe(0);
  expect(save.furthestLevel).toBe(0);
  expect(save.gemsCurrency).toBe(0);
  expect(save.difficulty).toBe('normal');
  expect(save.version).toBe(SAVE_SCHEMA_VERSION);
  expect(save.bestTimes).toEqual({});
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
  expect(raw).toBeTruthy();
  const parsed = JSON.parse(raw!);

  expect(parsed.version).toBe(SAVE_SCHEMA_VERSION);
  expect(parsed.furthestLevel).toBe(7);
  expect(parsed.highScore).toBe(120);
  expect(parsed.totalGemsEver).toBe(50);
  expect(parsed.totalEnemiesDefeated).toBe(22);
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
  expect(save.version).toBe(SAVE_SCHEMA_VERSION);
  expect(save.highScore).toBe(0);
  expect(save.furthestLevel).toBe(0);
  expect(save.totalGemsEver).toBe(42);
  expect(save.gemsCurrency).toBe(0);
  expect(save.totalEnemiesDefeated).toBe(12);
  expect(save.difficulty).toBe('normal');
  expect(save.upgrades).toEqual({ healthLevel: 1, manaLevel: 0, regenLevel: 0, damageLevel: 0, doubleJumpLevel: 0, dashDistanceLevel: 0 });
  expect(save.bestTimes).toEqual({ 0: 123 });
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

  expect(save.furthestLevel).toBeLessThanOrEqual(TOTAL_LEVELS - 1);
  expect(save.gemsCurrency).toBeLessThanOrEqual(save.totalGemsEver);
  expect(spend + save.gemsCurrency).toBeLessThanOrEqual(save.totalGemsEver);
  expect(save.bestTimes).toEqual({ 0: 123 });
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
  expect(save.gemsCurrency).toBe(0);
  expect(save.upgrades).toEqual({ healthLevel: 0, manaLevel: 0, regenLevel: 0, damageLevel: 0, doubleJumpLevel: 0, dashDistanceLevel: 0 });
  expect(typeof save.integrity).toBe('string');
  expect(save.integrity!.length).toBeGreaterThan(0);
});

test('stateFactory produces expected menu/endless states', () => {
  setMockStorage();
  const menu = buildMenuState(333, 'hard');
  expect(menu.screen).toBe('menu');
  expect(menu.difficulty).toBe('hard');

  const endless = buildEndlessState(333, 'easy');
  expect(endless.screen).toBe('playing');
  expect(endless.currentLevel).toBe(15);
  expect(endless.showLevelIntro).toBe(true);
  expect(endless.levelIntroTimer).toBe(180);
});

test('stateFactory next/restart transitions preserve intended fields', () => {
  setMockStorage();
  const current = createInitialState(4, 555, 1000, 'hard');
  current.totalGemsEver = 70;
  current.enemiesDefeated = 30;

  const next = buildNextLevelState(current, 1000);
  expect(next.currentLevel).toBe(5);
  expect(next.score).toBe(555);
  expect(next.totalGemsEver).toBe(70);
  expect(next.enemiesDefeated).toBe(30);
  expect(next.difficulty).toBe('hard');

  const restart = buildRestartLevelState(current, 1000);
  expect(restart.currentLevel).toBe(4);
  expect(restart.score).toBe(0);
  // Restarts of campaign levels use level-based difficulty (Level 4 = Easy)
  expect(restart.difficulty).toBe('easy');
});
