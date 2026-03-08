import { getOrCreateAccountId } from './cloud';

export interface LeaderboardEntry {
  accountId: string;
  score: number;
  wave: number;
  kills: number;
  timestamp: number;
}

const LEADERBOARD_KEY = 'elemental_stickman_leaderboard';
const LEADERBOARD_QUEUE_KEY = 'elemental_stickman_leaderboard_queue';
const LOCAL_KEEP_LIMIT = 100;

let remoteCache: LeaderboardEntry[] = [];
let testEndpointOverride: string | null = null;

function readLeaderboardEndpoint(env?: Record<string, string | undefined>): string {
  const source = env ?? ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {});
  return (source.VITE_LEADERBOARD_ENDPOINT || '').trim();
}

function getLeaderboardEndpoint(): string {
  if (testEndpointOverride !== null) return testEndpointOverride;
  return readLeaderboardEndpoint();
}

function sanitizeEntry(entry: unknown): LeaderboardEntry | null {
  if (!entry || typeof entry !== 'object') return null;
  const e = entry as Record<string, unknown>;
  return {
    accountId: typeof e.accountId === 'string' ? e.accountId : 'unknown',
    score: typeof e.score === 'number' ? Math.max(0, Math.floor(e.score)) : 0,
    wave: typeof e.wave === 'number' ? Math.max(0, Math.floor(e.wave)) : 0,
    kills: typeof e.kills === 'number' ? Math.max(0, Math.floor(e.kills)) : 0,
    timestamp: typeof e.timestamp === 'number' ? e.timestamp : 0,
  };
}

function loadLocalEntries(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizeEntry).filter((entry): entry is LeaderboardEntry => Boolean(entry));
  } catch {
    return [];
  }
}

function saveLocalEntries(entries: LeaderboardEntry[]): void {
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
  } catch {
    // localStorage unavailable
  }
}

function sortEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return entries.sort((a, b) => (b.score - a.score) || (b.wave - a.wave) || (b.kills - a.kills) || (a.timestamp - b.timestamp));
}

function mergeAllEntries(): LeaderboardEntry[] {
  return [...loadLocalEntries(), ...remoteCache];
}

function loadQueue(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizeEntry).filter((entry): entry is LeaderboardEntry => Boolean(entry));
  } catch {
    return [];
  }
}

function saveQueue(queue: LeaderboardEntry[]): void {
  try {
    if (queue.length === 0) {
      localStorage.removeItem(LEADERBOARD_QUEUE_KEY);
      return;
    }
    localStorage.setItem(LEADERBOARD_QUEUE_KEY, JSON.stringify(queue.slice(0, LOCAL_KEEP_LIMIT)));
  } catch {
    // localStorage unavailable
  }
}

function pushLocalEntry(entry: LeaderboardEntry): void {
  const next = sortEntries([entry, ...loadLocalEntries()]).slice(0, LOCAL_KEEP_LIMIT);
  saveLocalEntries(next);
}

function queueSubmission(entry: LeaderboardEntry): void {
  saveQueue([entry, ...loadQueue()].slice(0, LOCAL_KEEP_LIMIT));
}

async function postEntry(endpoint: string, entry: LeaderboardEntry): Promise<void> {
  await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
    keepalive: true,
  });
}

export async function flushLeaderboardQueue(): Promise<void> {
  const endpoint = getLeaderboardEndpoint();
  if (!endpoint) return;

  const queue = loadQueue();
  if (queue.length === 0) return;

  const remaining: LeaderboardEntry[] = [];
  for (let i = 0; i < queue.length; i++) {
    const entry = queue[i];
    try {
      await postEntry(endpoint, entry);
    } catch {
      remaining.push(entry);
      if (i + 1 < queue.length) {
        remaining.push(...queue.slice(i + 1));
      }
      break;
    }
  }
  saveQueue(remaining);
}

export function getLeaderboard(limit = 20): LeaderboardEntry[] {
  return sortEntries(mergeAllEntries()).slice(0, Math.max(1, limit));
}

export async function submitLeaderboardEntry(score: number, wave: number, kills: number): Promise<void> {
  const entry: LeaderboardEntry = {
    accountId: getOrCreateAccountId(),
    score: Math.max(0, Math.floor(score)),
    wave: Math.max(0, Math.floor(wave)),
    kills: Math.max(0, Math.floor(kills)),
    timestamp: Date.now(),
  };

  pushLocalEntry(entry);
  queueSubmission(entry);
  await flushLeaderboardQueue();
}

function parseRemoteEntries(input: unknown): LeaderboardEntry[] {
  if (Array.isArray(input)) {
    return input.map(sanitizeEntry).filter((entry): entry is LeaderboardEntry => Boolean(entry));
  }
  if (input && typeof input === 'object') {
    const boxed = input as Record<string, unknown>;
    if (Array.isArray(boxed.entries)) {
      return boxed.entries.map(sanitizeEntry).filter((entry): entry is LeaderboardEntry => Boolean(entry));
    }
  }
  return [];
}

export async function refreshRemoteLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  const endpoint = getLeaderboardEndpoint();
  if (!endpoint) return getLeaderboard(limit);

  try {
    const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const url = new URL(endpoint, baseOrigin);
    url.searchParams.set('limit', String(Math.max(1, Math.floor(limit))));
    const res = await fetch(url.toString(), { method: 'GET', headers: { Accept: 'application/json' } });
    if (!res.ok) return getLeaderboard(limit);

    const json = await res.json() as unknown;
    remoteCache = sortEntries(parseRemoteEntries(json)).slice(0, LOCAL_KEEP_LIMIT);
  } catch {
    // best effort remote refresh
  }

  return getLeaderboard(limit);
}

export function getLeaderboardStatus(): { remoteEnabled: boolean; cachedRemoteEntries: number; pendingSubmissions: number } {
  return {
    remoteEnabled: getLeaderboardEndpoint().length > 0,
    cachedRemoteEntries: remoteCache.length,
    pendingSubmissions: loadQueue().length,
  };
}

export function __setLeaderboardEndpointForTests(endpoint: string | null): void {
  testEndpointOverride = endpoint;
}

export function __clearLeaderboardStateForTests(): void {
  remoteCache = [];
  testEndpointOverride = null;
  try {
    localStorage.removeItem(LEADERBOARD_KEY);
    localStorage.removeItem(LEADERBOARD_QUEUE_KEY);
  } catch {
    // localStorage unavailable
  }
}
