import { test, expect, vi } from 'vitest';

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
  expect(board.length).toBe(3);
  expect(board[0].score).toBe(220);
  expect(board[0].wave).toBe(4);
  expect(board[1].score).toBe(220);
  expect(board[2].score).toBe(120);
});

test('refreshRemoteLeaderboard merges remote entries with local board', async () => {
  setMockStorage();
  __clearLeaderboardStateForTests();
  __setLeaderboardEndpointForTests('https://api.example/leaderboard');

  const mockFetch = vi.fn().mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
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
  });
  globalThis.fetch = mockFetch;

  await submitLeaderboardEntry(120, 3, 10);
  await refreshRemoteLeaderboard(10);
  const board = getLeaderboard(3);

  expect(board[0].accountId).toBe('remote_a');
  expect(board[0].score).toBe(999);
  expect(board.length).toBeGreaterThanOrEqual(2);

  __setLeaderboardEndpointForTests(null);
});
