import { getOrCreateAccountId } from './cloud';

export interface LeaderboardEntry {
  accountId: string;
  score: number;
  wave: number;
  kills: number;
  timestamp: number;
}

const LEADERBOARD_KEY = 'elemental_stickman_leaderboard';

function readLeaderboardEndpoint(env?: Record<string, string | undefined>): string {
  const source = env ?? ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {});
  return (source.VITE_LEADERBOARD_ENDPOINT || '').trim();
}

function loadLocalEntries(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry) => {
        const e = entry as Record<string, unknown>;
        return {
          accountId: typeof e.accountId === 'string' ? e.accountId : 'unknown',
          score: typeof e.score === 'number' ? Math.max(0, Math.floor(e.score)) : 0,
          wave: typeof e.wave === 'number' ? Math.max(0, Math.floor(e.wave)) : 0,
          kills: typeof e.kills === 'number' ? Math.max(0, Math.floor(e.kills)) : 0,
          timestamp: typeof e.timestamp === 'number' ? e.timestamp : 0,
        };
      });
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

export function getLeaderboard(limit = 20): LeaderboardEntry[] {
  return loadLocalEntries()
    .sort((a, b) => (b.score - a.score) || (b.wave - a.wave) || (b.kills - a.kills) || (a.timestamp - b.timestamp))
    .slice(0, Math.max(1, limit));
}

export async function submitLeaderboardEntry(score: number, wave: number, kills: number): Promise<void> {
  const entry: LeaderboardEntry = {
    accountId: getOrCreateAccountId(),
    score: Math.max(0, Math.floor(score)),
    wave: Math.max(0, Math.floor(wave)),
    kills: Math.max(0, Math.floor(kills)),
    timestamp: Date.now(),
  };

  const next = [entry, ...loadLocalEntries()]
    .sort((a, b) => (b.score - a.score) || (b.wave - a.wave) || (b.kills - a.kills) || (a.timestamp - b.timestamp))
    .slice(0, 100);
  saveLocalEntries(next);

  const endpoint = readLeaderboardEndpoint();
  if (!endpoint) return;

  await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
    keepalive: true,
  });
}
