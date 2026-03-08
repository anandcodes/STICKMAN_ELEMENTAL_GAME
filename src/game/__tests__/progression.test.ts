import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialState } from '../engine';
import { getDailyChallenge, getProgressionSnapshot, updateProgression } from '../services/progression';
import { setMockStorage } from './testHelpers';

test('updateProgression unlocks achievements based on state milestones', () => {
  setMockStorage();
  const state = createInitialState(0, 12000, 3, 12000, 'normal');
  state.enemiesDefeated = 80;
  state.totalGemsEver = 200;
  state.furthestLevel = 99;
  state.endlessWave = 12;

  const update = updateProgression(state);
  assert.ok(update.unlockedAchievements.length >= 4);

  const second = updateProgression(state);
  assert.equal(second.unlockedAchievements.length, 0);
});

test('getDailyChallenge is deterministic for same date', () => {
  const date = new Date('2026-03-08T00:00:00.000Z');
  const a = getDailyChallenge(date);
  const b = getDailyChallenge(date);
  assert.equal(a.id, b.id);
  assert.equal(a.title, b.title);
});

test('getProgressionSnapshot returns challenge progress and achievement totals', () => {
  setMockStorage();
  const state = createInitialState(0, 5000, 3, 5000, 'normal');
  state.totalGemsEver = 12;
  state.enemiesDefeated = 6;
  state.furthestLevel = 3;
  state.endlessWave = 2;

  const snapshot = getProgressionSnapshot(state);
  assert.equal(typeof snapshot.totalAchievements, 'number');
  assert.ok(snapshot.totalAchievements >= 5);
  assert.ok(snapshot.daily.progress >= 0);
  assert.ok(snapshot.daily.progress <= 1);
});
