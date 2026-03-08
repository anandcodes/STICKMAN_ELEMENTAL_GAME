import type { SaveData } from '../types';

const ACCOUNT_ID_KEY = 'elemental_stickman_account_id';
const CLOUD_QUEUE_KEY = 'elemental_stickman_cloud_sync_queue';

interface CloudConfig {
  enabled: boolean;
  endpoint: string;
}

interface CloudSyncPayload {
  accountId: string;
  timestamp: number;
  save: SaveData;
}

interface QueuedCloudSync extends CloudSyncPayload {
  attempts: number;
}

let testConfigOverride: CloudConfig | null = null;

function readCloudConfig(env?: Record<string, string | undefined>): CloudConfig {
  const source = env ?? ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {});
  const endpoint = (source.VITE_CLOUD_SAVE_ENDPOINT || '').trim();
  return {
    enabled: source.VITE_CLOUD_SAVE_ENABLED === 'true' && endpoint.length > 0,
    endpoint,
  };
}

function getCloudConfig(): CloudConfig {
  return testConfigOverride ?? readCloudConfig();
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function getOrCreateAccountId(): string {
  try {
    const existing = localStorage.getItem(ACCOUNT_ID_KEY);
    if (existing) return existing;
    const next = `anon_${Date.now().toString(36)}_${randomId()}`;
    localStorage.setItem(ACCOUNT_ID_KEY, next);
    return next;
  } catch {
    return `ephemeral_${Date.now().toString(36)}_${randomId()}`;
  }
}

function sanitizeSaveForCloud(save: SaveData): SaveData {
  return {
    version: typeof save.version === 'number' ? Math.max(0, Math.floor(save.version)) : 0,
    integrity: typeof save.integrity === 'string' ? save.integrity : '',
    highScore: Math.max(0, Math.floor(save.highScore || 0)),
    furthestLevel: Math.max(0, Math.floor(save.furthestLevel || 0)),
    totalGemsEver: Math.max(0, Math.floor(save.totalGemsEver || 0)),
    gemsCurrency: Math.max(0, Math.floor(save.gemsCurrency || 0)),
    totalEnemiesDefeated: Math.max(0, Math.floor(save.totalEnemiesDefeated || 0)),
    difficulty: save.difficulty === 'easy' || save.difficulty === 'hard' ? save.difficulty : 'normal',
    upgrades: {
      healthLevel: Math.max(0, Math.min(5, Math.floor(save.upgrades?.healthLevel || 0))),
      manaLevel: Math.max(0, Math.min(5, Math.floor(save.upgrades?.manaLevel || 0))),
      regenLevel: Math.max(0, Math.min(5, Math.floor(save.upgrades?.regenLevel || 0))),
      damageLevel: Math.max(0, Math.min(5, Math.floor(save.upgrades?.damageLevel || 0))),
    },
    bestTimes: save.bestTimes && typeof save.bestTimes === 'object'
      ? Object.fromEntries(
        Object.entries(save.bestTimes)
          .map(([k, v]) => [k, Math.max(1, Math.floor(Number(v) || 0))])
          .filter(([, v]) => Number.isFinite(v)),
      )
      : {},
  };
}

function upgradeSpendForLevel(level: number, perLevelCost: number): number {
  const l = Math.max(0, Math.min(5, Math.floor(level)));
  return (l * (l + 1) * perLevelCost) / 2;
}

function totalUpgradeSpend(save: SaveData): number {
  return (
    upgradeSpendForLevel(save.upgrades.healthLevel, 30) +
    upgradeSpendForLevel(save.upgrades.manaLevel, 30) +
    upgradeSpendForLevel(save.upgrades.regenLevel, 50) +
    upgradeSpendForLevel(save.upgrades.damageLevel, 60)
  );
}

function clampEconomy(save: SaveData): SaveData {
  const next = {
    ...save,
    upgrades: { ...save.upgrades },
  };

  const spend = totalUpgradeSpend(next);
  const maxCurrency = Math.max(0, next.totalGemsEver - spend);
  next.gemsCurrency = Math.min(next.gemsCurrency, maxCurrency);
  return next;
}

function mergeBestTimes(local: Record<number, number>, remote: Record<number, number>): Record<number, number> {
  const merged: Record<number, number> = { ...local };
  for (const [k, v] of Object.entries(remote)) {
    const key = Number(k);
    const time = Math.max(1, Math.floor(Number(v) || 0));
    if (!Number.isFinite(key) || !Number.isFinite(time)) continue;
    const prev = merged[key];
    merged[key] = typeof prev === 'number' ? Math.min(prev, time) : time;
  }
  return merged;
}

export function mergeCloudSave(local: SaveData, remote: SaveData): SaveData {
  const a = sanitizeSaveForCloud(local);
  const b = sanitizeSaveForCloud(remote);

  const totalGemsEver = Math.max(a.totalGemsEver, b.totalGemsEver);
  const merged: SaveData = {
    version: Math.max(a.version || 0, b.version || 0),
    integrity: a.integrity || b.integrity || '',
    highScore: Math.max(a.highScore, b.highScore),
    furthestLevel: Math.max(a.furthestLevel, b.furthestLevel),
    totalGemsEver,
    gemsCurrency: Math.max(a.gemsCurrency, b.gemsCurrency),
    totalEnemiesDefeated: Math.max(a.totalEnemiesDefeated, b.totalEnemiesDefeated),
    difficulty: b.furthestLevel > a.furthestLevel ? b.difficulty : a.difficulty,
    upgrades: {
      healthLevel: Math.max(a.upgrades.healthLevel, b.upgrades.healthLevel),
      manaLevel: Math.max(a.upgrades.manaLevel, b.upgrades.manaLevel),
      regenLevel: Math.max(a.upgrades.regenLevel, b.upgrades.regenLevel),
      damageLevel: Math.max(a.upgrades.damageLevel, b.upgrades.damageLevel),
    },
    bestTimes: mergeBestTimes(a.bestTimes, b.bestTimes),
  };

  return clampEconomy(merged);
}

function loadQueue(): QueuedCloudSync[] {
  try {
    const raw = localStorage.getItem(CLOUD_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item === 'object')
      .map((item) => {
        const entry = item as Partial<QueuedCloudSync>;
        return {
          accountId: typeof entry.accountId === 'string' ? entry.accountId : getOrCreateAccountId(),
          timestamp: typeof entry.timestamp === 'number' ? entry.timestamp : Date.now(),
          attempts: typeof entry.attempts === 'number' ? Math.max(0, Math.floor(entry.attempts)) : 0,
          save: sanitizeSaveForCloud((entry.save ?? {}) as SaveData),
        };
      });
  } catch {
    return [];
  }
}

function saveQueue(entries: QueuedCloudSync[]): void {
  try {
    if (entries.length === 0) {
      localStorage.removeItem(CLOUD_QUEUE_KEY);
      return;
    }
    localStorage.setItem(CLOUD_QUEUE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage unavailable
  }
}

function queueSync(save: SaveData): void {
  const accountId = getOrCreateAccountId();
  const nextEntry: QueuedCloudSync = {
    accountId,
    timestamp: Date.now(),
    save: sanitizeSaveForCloud(save),
    attempts: 0,
  };

  const queue = loadQueue()
    .filter((item) => item.accountId !== accountId)
    .slice(0, 19);
  saveQueue([nextEntry, ...queue]);
}

async function postSync(cfg: CloudConfig, payload: CloudSyncPayload): Promise<void> {
  await fetch(cfg.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  });
}

export async function flushCloudSyncQueue(): Promise<void> {
  const cfg = getCloudConfig();
  if (!cfg.enabled) return;

  const queue = loadQueue();
  if (queue.length === 0) return;

  const remaining: QueuedCloudSync[] = [];
  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    try {
      await postSync(cfg, item);
    } catch {
      const attempts = item.attempts + 1;
      if (attempts < 6) {
        remaining.push({ ...item, attempts });
      }
      if (i + 1 < queue.length) {
        remaining.push(...queue.slice(i + 1));
      }
      break;
    }
  }

  saveQueue(remaining);
}

export async function syncCloudSave(save: SaveData): Promise<void> {
  const cfg = getCloudConfig();
  if (!cfg.enabled) return;

  queueSync(save);
  await flushCloudSyncQueue();
}

function extractRemoteSave(input: unknown): SaveData | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const save = raw.save && typeof raw.save === 'object' ? raw.save : raw;
  return sanitizeSaveForCloud(save as SaveData);
}

async function readRemoteSave(cfg: CloudConfig): Promise<SaveData | null> {
  const accountId = getOrCreateAccountId();
  const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  const url = new URL(cfg.endpoint, baseOrigin);
  url.searchParams.set('accountId', accountId);

  const response = await fetch(url.toString(), { method: 'GET', headers: { Accept: 'application/json' } });
  if (!response.ok) return null;
  const json = await response.json() as unknown;
  return extractRemoteSave(json);
}

function hasMeaningfulSaveDelta(a: SaveData, b: SaveData): boolean {
  const aTimes = Object.entries(a.bestTimes).sort((x, y) => Number(x[0]) - Number(y[0]));
  const bTimes = Object.entries(b.bestTimes).sort((x, y) => Number(x[0]) - Number(y[0]));
  const bestTimesDiffer = aTimes.length !== bTimes.length ||
    aTimes.some(([k, v], idx) => k !== bTimes[idx]?.[0] || v !== bTimes[idx]?.[1]);

  return (
    a.highScore !== b.highScore ||
    a.furthestLevel !== b.furthestLevel ||
    a.totalGemsEver !== b.totalGemsEver ||
    a.gemsCurrency !== b.gemsCurrency ||
    a.totalEnemiesDefeated !== b.totalEnemiesDefeated ||
    a.upgrades.healthLevel !== b.upgrades.healthLevel ||
    a.upgrades.manaLevel !== b.upgrades.manaLevel ||
    a.upgrades.regenLevel !== b.upgrades.regenLevel ||
    a.upgrades.damageLevel !== b.upgrades.damageLevel ||
    bestTimesDiffer
  );
}

export async function hydrateCloudSave(local: SaveData): Promise<SaveData> {
  const cfg = getCloudConfig();
  const sanitizedLocal = sanitizeSaveForCloud(local);
  if (!cfg.enabled) return sanitizedLocal;

  const remote = await readRemoteSave(cfg).catch(() => null);
  if (!remote) return sanitizedLocal;

  const merged = mergeCloudSave(sanitizedLocal, remote);
  if (hasMeaningfulSaveDelta(merged, remote)) {
    await syncCloudSave(merged).catch(() => {
      // hydrate push-back is best-effort
    });
  }
  return merged;
}

export function getCloudSyncStatus(): { enabled: boolean; pending: number } {
  const cfg = getCloudConfig();
  return {
    enabled: cfg.enabled,
    pending: loadQueue().length,
  };
}

export function __setCloudConfigForTests(config: CloudConfig | null): void {
  testConfigOverride = config;
}

export function __clearCloudStateForTests(): void {
  try {
    localStorage.removeItem(CLOUD_QUEUE_KEY);
    localStorage.removeItem(ACCOUNT_ID_KEY);
  } catch {
    // localStorage unavailable
  }
}
