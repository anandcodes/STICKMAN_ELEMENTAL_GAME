import test from 'node:test';
import assert from 'node:assert/strict';

import {
  __clearLeaderboardStateForTests,
  __setLeaderboardEndpointForTests,
  getLeaderboard,
  refreshRemoteLeaderboard,
  submitLeaderboardEntry,
} from '../services/leaderboard';
import { setMockStorage } from './testHelpers';

test('leaderboard stores entries and returns sorted results', async () => {
  setMockStorage();
  __clearLeaderboardStateForTests();

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

test('refreshRemoteLeaderboard merges remote entries with local board', async () => {
  setMockStorage();
  __clearLeaderboardStateForTests();
  __setLeaderboardEndpointForTests('https://api.example/leaderboard');

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (method === 'GET') {
      return {
        ok: true,
        json: async () => ({
          entries: [
            { accountId: 'remote_a', score: 999, wave: 12, kills: 88, timestamp: Date.now() - 1000 },
            { accountId: 'remote_b', score: 640, wave: 9, kills: 63, timestamp: Date.now() - 900 },
          ],
        }),
      } as Response;
    }
    return { ok: true } as Response;
  }) as typeof fetch;

  await submitLeaderboardEntry(120, 3, 10);
  await refreshRemoteLeaderboard(10);
  const board = getLeaderboard(3);

  assert.equal(board[0].accountId, 'remote_a');
  assert.equal(board[0].score, 999);
  assert.ok(board.length >= 2);

  globalThis.fetch = originalFetch;
  __setLeaderboardEndpointForTests(null);
});
