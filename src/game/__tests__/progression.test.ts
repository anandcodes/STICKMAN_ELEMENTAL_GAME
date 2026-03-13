import { test, expect } from 'vitest';

import { createInitialState } from '../engine';
import { getProgressionSnapshot, updateProgression, getDailyChallengesForToday } from '../services/progression';
import { setMockStorage } from './testHelpers';

test('updateProgression unlocks achievements based on state milestones', () => {
  setMockStorage();
  const state = createInitialState(0, 12000, 12000, 'normal');
  state.enemiesDefeated = 80;
  state.totalGemsEver = 200;
  state.furthestLevel = 99;
  state.endlessWave = 12;

  const update = updateProgression(state);
  expect(update.unlockedAchievements.length).toBeGreaterThanOrEqual(4);

  const second = updateProgression(state);
  expect(second.unlockedAchievements.length).toBe(0);
});

test('getDailyChallengesForToday returns consistent results', () => {
  const a = getDailyChallengesForToday();
  const b = getDailyChallengesForToday();
  expect(a.length).toBeGreaterThan(0);
  expect(a[0].id).toBe(b[0].id);
});

test('getProgressionSnapshot returns challenge progress and achievement totals', () => {
  setMockStorage();
  const state = createInitialState(0, 5000, 5000, 'normal');
  state.totalGemsEver = 12;
  state.enemiesDefeated = 6;
  state.furthestLevel = 3;
  state.endlessWave = 2;

  const snapshot = getProgressionSnapshot(state);
  expect(typeof snapshot.totalAchievements).toBe('number');
  expect(snapshot.totalAchievements).toBeGreaterThanOrEqual(5);
  expect(snapshot.dailies.length).toBeGreaterThan(0);
  expect(snapshot.dailies[0].progress).toBeGreaterThanOrEqual(0);
  expect(snapshot.dailies[0].progress).toBeLessThanOrEqual(1);
});
