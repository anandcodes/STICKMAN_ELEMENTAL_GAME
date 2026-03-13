import { test, expect, vi } from 'vitest';

import type { SaveData } from '../types';
import {
  __clearCloudStateForTests,
  __setCloudConfigForTests,
  getCloudSyncStatus,
  hydrateCloudSave,
  syncCloudSave,
} from '../services/cloud';
import { setMockStorage } from './testHelpers';

function makeSave(overrides: Partial<SaveData> = {}): SaveData {
  return {
    version: 2,
    integrity: '',
    highScore: 100,
    furthestLevel: 2,
    totalGemsEver: 80,
    gemsCurrency: 20,
    totalEnemiesDefeated: 12,
    difficulty: 'normal',
    upgrades: { healthLevel: 1, manaLevel: 1, regenLevel: 0, damageLevel: 0, doubleJumpLevel: 0, dashDistanceLevel: 0 },
    bestTimes: { 0: 120, 1: 140 },
    hapticsEnabled: true,
    graphicsQuality: 'high',
    ...overrides,
  };
}

test('cloud sync queues failed posts and retries on next sync', async () => {
  setMockStorage();
  __clearCloudStateForTests();
  __setCloudConfigForTests({ enabled: true, endpoint: 'https://api.example/cloud-save' });

  let postCalls = 0;
  const mockFetch = vi.fn().mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (method === 'POST') {
      postCalls++;
      if (postCalls === 1) {
        throw new Error('offline');
      }
      return { ok: true } as Response;
    }
    return { ok: false, json: async () => ({}) } as Response;
  });
  globalThis.fetch = mockFetch;

  await syncCloudSave(makeSave({ highScore: 150 }));
  expect(getCloudSyncStatus().pending).toBe(1);

  await syncCloudSave(makeSave({ highScore: 190 }));
  expect(getCloudSyncStatus().pending).toBe(0);
  expect(postCalls).toBeGreaterThanOrEqual(2);

  __setCloudConfigForTests(null);
});

test('hydrateCloudSave merges local and remote progress', async () => {
  setMockStorage();
  __clearCloudStateForTests();
  __setCloudConfigForTests({ enabled: true, endpoint: 'https://api.example/cloud-save' });

  let postCalls = 0;
  const remote = makeSave({
    highScore: 300,
    furthestLevel: 6,
    totalGemsEver: 220,
    gemsCurrency: 90,
    totalEnemiesDefeated: 99,
    upgrades: { healthLevel: 2, manaLevel: 2, regenLevel: 1, damageLevel: 1, doubleJumpLevel: 0, dashDistanceLevel: 0 },
    bestTimes: { 0: 110, 2: 190 },
  });

  const mockFetch = vi.fn().mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (method === 'GET') {
      return {
        ok: true,
        json: async () => ({ save: remote }),
      } as Response;
    }
    postCalls++;
    return { ok: true } as Response;
  });
  globalThis.fetch = mockFetch;

  const merged = await hydrateCloudSave(makeSave({ highScore: 500, furthestLevel: 4, totalGemsEver: 180 }));
  expect(merged.highScore).toBe(500);
  expect(merged.furthestLevel).toBe(6);
  expect(merged.totalEnemiesDefeated).toBe(99);
  expect(Object.keys(merged.bestTimes).length).toBeGreaterThanOrEqual(3);
  expect(postCalls).toBeGreaterThanOrEqual(1);

  __setCloudConfigForTests(null);
});
