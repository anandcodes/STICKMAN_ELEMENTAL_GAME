import test from 'node:test';
import assert from 'node:assert/strict';

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
    ...overrides,
  };
}

test('cloud sync queues failed posts and retries on next sync', async () => {
  setMockStorage();
  __clearCloudStateForTests();
  __setCloudConfigForTests({ enabled: true, endpoint: 'https://api.example/cloud-save' });

  const originalFetch = globalThis.fetch;
  let postCalls = 0;

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (method === 'POST') {
      postCalls++;
      if (postCalls === 1) {
        throw new Error('offline');
      }
      return { ok: true } as Response;
    }
    return { ok: false, json: async () => ({}) } as Response;
  }) as typeof fetch;

  await syncCloudSave(makeSave({ highScore: 150 }));
  assert.equal(getCloudSyncStatus().pending, 1);

  await syncCloudSave(makeSave({ highScore: 190 }));
  assert.equal(getCloudSyncStatus().pending, 0);
  assert.ok(postCalls >= 2);

  globalThis.fetch = originalFetch;
  __setCloudConfigForTests(null);
});

test('hydrateCloudSave merges local and remote progress', async () => {
  setMockStorage();
  __clearCloudStateForTests();
  __setCloudConfigForTests({ enabled: true, endpoint: 'https://api.example/cloud-save' });

  const originalFetch = globalThis.fetch;
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

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (method === 'GET') {
      return {
        ok: true,
        json: async () => ({ save: remote }),
      } as Response;
    }
    postCalls++;
    return { ok: true } as Response;
  }) as typeof fetch;

  const merged = await hydrateCloudSave(makeSave({ highScore: 500, furthestLevel: 4, totalGemsEver: 180 }));
  assert.equal(merged.highScore, 500);
  assert.equal(merged.furthestLevel, 6);
  assert.equal(merged.totalEnemiesDefeated, 99);
  assert.ok(Object.keys(merged.bestTimes).length >= 3);
  assert.ok(postCalls >= 1);

  globalThis.fetch = originalFetch;
  __setCloudConfigForTests(null);
});
