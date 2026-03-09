import { TOTAL_LEVELS } from '../levels';
import type { GameState } from '../types';

export type AchievementId = 'first_blood' | 'collector_100' | 'collector_500' | 'campaign_clear' | 'wave_10' | 'wave_30' | 'score_10k' | 'score_50k';
export type DailyChallengeId = 'gems_20' | 'kills_50' | 'reach_wave_5' | 'reach_level_5';

interface ProgressionStore {
  achievements: AchievementId[];
  dailyCompletedByDate: Record<string, DailyChallengeId>;
}

export interface DailyChallenge {
  id: DailyChallengeId;
  title: string;
  target: number;
}

export interface ProgressionUpdate {
  unlockedAchievements: AchievementId[];
  dailyChallenge: DailyChallenge;
  dailyCompleted: boolean;
  dailyJustCompleted: boolean;
}

export interface DailyChallengeProgress extends DailyChallenge {
  current: number;
  progress: number;
  completed: boolean;
}

export interface ProgressionSnapshot {
  achievementsUnlocked: AchievementId[];
  totalAchievements: number;
  daily: DailyChallengeProgress;
}

const PROGRESSION_KEY = 'elemental_stickman_progression';

const DEFAULT_STORE: ProgressionStore = {
  achievements: [],
  dailyCompletedByDate: {},
};

const ACHIEVEMENT_LABELS: Record<AchievementId, string> = {
  first_blood: 'First Blood',
  collector_100: 'Gem Hoarder',
  collector_500: 'Gem Lord',
  campaign_clear: 'Campaign Conqueror',
  wave_10: 'Wave Slayer',
  wave_30: 'Void Survivor',
  score_10k: 'Score Legend',
  score_50k: 'Score Master',
};

const DAILY_CHALLENGES: DailyChallenge[] = [
  { id: 'gems_20', title: 'Collect 20 gems total', target: 20 },
  { id: 'kills_50', title: 'Defeat 50 enemies total', target: 50 },
  { id: 'reach_wave_5', title: 'Reach wave 5 in endless', target: 5 },
  { id: 'reach_level_5', title: 'Reach level 5 in campaign', target: 5 },
];

function isDailyChallengeId(value: unknown): value is DailyChallengeId {
  return value === 'gems_20' || value === 'kills_50' || value === 'reach_wave_5' || value === 'reach_level_5';
}

function loadStore(): ProgressionStore {
  try {
    const raw = localStorage.getItem(PROGRESSION_KEY);
    if (!raw) return { ...DEFAULT_STORE };
    const parsed = JSON.parse(raw) as Partial<ProgressionStore>;
    return {
      achievements: Array.isArray(parsed.achievements)
        ? parsed.achievements.filter((v): v is AchievementId => typeof v === 'string' && v in ACHIEVEMENT_LABELS)
        : [],
      dailyCompletedByDate: parsed.dailyCompletedByDate && typeof parsed.dailyCompletedByDate === 'object'
        ? Object.fromEntries(
          Object.entries(parsed.dailyCompletedByDate)
            .filter(([dateKey, value]) => /^\d{4}-\d{2}-\d{2}$/.test(dateKey) && isDailyChallengeId(value)),
        ) as Record<string, DailyChallengeId>
        : {},
    };
  } catch {
    return { ...DEFAULT_STORE };
  }
}

function saveStore(store: ProgressionStore): void {
  try {
    localStorage.setItem(PROGRESSION_KEY, JSON.stringify(store));
  } catch {
    // localStorage unavailable
  }
}

function evaluateAchievements(state: GameState): AchievementId[] {
  const out: AchievementId[] = [];
  if (state.enemiesDefeated >= 1) out.push('first_blood');
  if (state.totalGemsEver >= 100) out.push('collector_100');
  if (state.totalGemsEver >= 500) out.push('collector_500');
  if (state.furthestLevel >= Math.max(TOTAL_LEVELS - 1, 0)) out.push('campaign_clear');
  if ((state.endlessWave ?? 0) >= 10) out.push('wave_10');
  if ((state.endlessWave ?? 0) >= 30) out.push('wave_30');
  if (state.score >= 10_000) out.push('score_10k');
  if (state.score >= 50_000) out.push('score_50k');
  return out;
}

function todayKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDailyChallenge(now = new Date()): DailyChallenge {
  const dayIndex = Math.floor(now.getTime() / 86_400_000);
  return DAILY_CHALLENGES[Math.abs(dayIndex) % DAILY_CHALLENGES.length];
}

function isDailyChallengeComplete(challenge: DailyChallenge, state: GameState): boolean {
  if (challenge.id === 'gems_20') return state.totalGemsEver >= challenge.target;
  if (challenge.id === 'kills_50') return state.enemiesDefeated >= challenge.target;
  if (challenge.id === 'reach_wave_5') return (state.endlessWave ?? 0) >= challenge.target;
  return state.furthestLevel + 1 >= challenge.target;
}

function getDailyChallengeCurrent(challenge: DailyChallenge, state: GameState): number {
  if (challenge.id === 'gems_20') return state.totalGemsEver;
  if (challenge.id === 'kills_50') return state.enemiesDefeated;
  if (challenge.id === 'reach_wave_5') return state.endlessWave ?? 0;
  return state.furthestLevel + 1;
}

export function getAchievementLabel(id: AchievementId): string {
  return ACHIEVEMENT_LABELS[id];
}

export function getProgressionSnapshot(state: GameState): ProgressionSnapshot {
  const store = loadStore();
  const challenge = getDailyChallenge();
  const current = Math.max(0, getDailyChallengeCurrent(challenge, state));
  const completed = isDailyChallengeComplete(challenge, state) || store.dailyCompletedByDate[todayKey()] === challenge.id;

  return {
    achievementsUnlocked: [...store.achievements],
    totalAchievements: Object.keys(ACHIEVEMENT_LABELS).length,
    daily: {
      ...challenge,
      current,
      progress: Math.min(1, current / Math.max(1, challenge.target)),
      completed,
    },
  };
}

export function updateProgression(state: GameState): ProgressionUpdate {
  const store = loadStore();
  const unlockedNow = evaluateAchievements(state).filter((id) => !store.achievements.includes(id));

  if (unlockedNow.length > 0) {
    store.achievements = [...store.achievements, ...unlockedNow];
  }

  const challenge = getDailyChallenge();
  const key = todayKey();
  const completedAlready = store.dailyCompletedByDate[key] === challenge.id;
  const completedNow = !completedAlready && isDailyChallengeComplete(challenge, state);
  if (completedNow) {
    store.dailyCompletedByDate[key] = challenge.id;
  }

  saveStore(store);

  return {
    unlockedAchievements: unlockedNow,
    dailyChallenge: challenge,
    dailyCompleted: completedAlready || completedNow,
    dailyJustCompleted: completedNow,
  };
}
