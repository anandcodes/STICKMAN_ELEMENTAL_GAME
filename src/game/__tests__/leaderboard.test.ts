import test from 'node:test';
import assert from 'node:assert/strict';

import { getLeaderboard, submitLeaderboardEntry } from '../services/leaderboard';
import { setMockStorage } from './testHelpers';

test('leaderboard stores entries and returns sorted results', async () => {
  setMockStorage();

  await submitLeaderboardEntry(120, 3, 10);
  await submitLeaderboardEntry(220, 2, 9);
  await submitLeaderboardEntry(220, 4, 12);

  const board = getLeaderboard(3);
  assert.equal(board.length, 3);
  assert.equal(board[0].score, 220);
  assert.equal(board[0].wave, 4);
  assert.equal(board[1].score, 220);
  assert.equal(board[2].score, 120);
});
