import type { GameState } from '../types';

export type AchievementId = 'first_blood' | 'collector_100' | 'collector_500' | 'campaign_clear' | 'wave_10' | 'wave_30' | 'score_10k' | 'score_50k';
export type DailyChallengeId = 'gems_20' | 'kills_50' | 'reach_wave_5' | 'reach_level_5' | 'spend_100_gems' | 'collect_50_gems' | 'defeat_100_enemies';

interface ProgressionStore {
  achievements: AchievementId[];
  dailyCompletedByDate: Record<string, DailyChallengeId[]>;
  dailyClaimedByDate: Record<string, DailyChallengeId[]>;
  milestoneProgress: number; // For extra rewards (e.g. 10 challenges completed)
}

export interface DailyChallenge {
  id: DailyChallengeId;
  title: string;
  target: number;
  rewardType: 'gems' | 'booster';
  rewardAmount: number;
}

export interface DailyChallengeProgress extends DailyChallenge {
  current: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export interface ProgressionSnapshot {
  achievementsUnlocked: AchievementId[];
  totalAchievements: number;
  dailies: DailyChallengeProgress[];
  milestoneProgress: number;
  milestoneTarget: number;
}

export interface ProgressionUpdate {
  unlockedAchievements: AchievementId[];
  dailiesCompleted: DailyChallengeId[];
}

const PROGRESSION_KEY = 'elemental_stickman_progression';

const DEFAULT_STORE: ProgressionStore = {
  achievements: [],
  dailyCompletedByDate: {},
  dailyClaimedByDate: {},
  milestoneProgress: 0,
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
  { id: 'gems_20', title: 'Collect 20 gems', target: 20, rewardType: 'gems', rewardAmount: 50 },
  { id: 'kills_50', title: 'Defeat 50 enemies', target: 50, rewardType: 'gems', rewardAmount: 75 },
  { id: 'reach_wave_5', title: 'Reach wave 5 in Endless', target: 5, rewardType: 'gems', rewardAmount: 100 },
  { id: 'reach_level_5', title: 'Reach Level 5 in Campaign', target: 5, rewardType: 'gems', rewardAmount: 120 },
  { id: 'spend_100_gems', title: 'Spend 100 gems in Shop', target: 100, rewardType: 'gems', rewardAmount: 150 },
  { id: 'collect_50_gems', title: 'Collect 50 gems', target: 50, rewardType: 'gems', rewardAmount: 100 },
  { id: 'defeat_100_enemies', title: 'Defeat 100 enemies', target: 100, rewardType: 'gems', rewardAmount: 200 },
];

function loadStore(): ProgressionStore {
  try {
    const raw = localStorage.getItem(PROGRESSION_KEY);
    if (!raw) return { ...DEFAULT_STORE };
    const parsed = JSON.parse(raw) as Partial<ProgressionStore>;
    return {
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
      dailyCompletedByDate: parsed.dailyCompletedByDate || {},
      dailyClaimedByDate: parsed.dailyClaimedByDate || {},
      milestoneProgress: parsed.milestoneProgress || 0,
    };
  } catch {
    return { ...DEFAULT_STORE };
  }
}

function saveStore(store: ProgressionStore): void {
  try {
    localStorage.setItem(PROGRESSION_KEY, JSON.stringify(store));
  } catch {}
}

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

export function getDailyChallengesForToday(): DailyChallenge[] {
  const now = new Date();
  const dayIndex = Math.floor(now.getTime() / 86400000);
  const out: DailyChallenge[] = [];
  for (let i = 0; i < 3; i++) {
    out.push(DAILY_CHALLENGES[(Math.abs(dayIndex) + i) % DAILY_CHALLENGES.length]);
  }
  return out;
}

function getChallengeProgress(id: DailyChallengeId, state: GameState): number {
  switch (id) {
    case 'gems_20':
    case 'collect_50_gems':
      return state.totalGemsEver; // Using totalGemsEver as a proxy for lifetime or session progress for now
    case 'kills_50':
    case 'defeat_100_enemies':
      return state.enemiesDefeated;
    case 'reach_wave_5':
      return state.endlessWave || 0;
    case 'reach_level_5':
      return state.furthestLevel + 1;
    default:
      return 0;
  }
}

export function getProgressionSnapshot(state: GameState): ProgressionSnapshot {
  const store = loadStore();
  const dateKey = todayKey();
  const todayDailies = getDailyChallengesForToday();
  const completedToday = store.dailyCompletedByDate[dateKey] || [];
  const claimedToday = store.dailyClaimedByDate[dateKey] || [];

  const dailies = todayDailies.map(challenge => {
    const current = getChallengeProgress(challenge.id, state);
    const completed = completedToday.includes(challenge.id) || current >= challenge.target;
    return {
      ...challenge,
      current,
      progress: Math.min(1, current / challenge.target),
      completed,
      claimed: claimedToday.includes(challenge.id),
    };
  });

  return {
    achievementsUnlocked: store.achievements,
    totalAchievements: Object.keys(ACHIEVEMENT_LABELS).length,
    dailies,
    milestoneProgress: store.milestoneProgress,
    milestoneTarget: 10,
  };
}

export function updateProgression(state: GameState): ProgressionUpdate {
  const store = loadStore();
  const dateKey = todayKey();
  const todayDailies = getDailyChallengesForToday();
  
  if (!store.dailyCompletedByDate[dateKey]) store.dailyCompletedByDate[dateKey] = [];
  
  const newlyCompleted: DailyChallengeId[] = [];
  
  todayDailies.forEach(challenge => {
    if (!store.dailyCompletedByDate[dateKey].includes(challenge.id)) {
      const current = getChallengeProgress(challenge.id, state);
      if (current >= challenge.target) {
        store.dailyCompletedByDate[dateKey].push(challenge.id);
        newlyCompleted.push(challenge.id);
      }
    }
  });

  // Achievements
  const unlockedAchievements: AchievementId[] = [];
  if (state.enemiesDefeated >= 1 && !store.achievements.includes('first_blood')) {
    store.achievements.push('first_blood');
    unlockedAchievements.push('first_blood');
  }
  // ... (Add other achievement evaluations as needed)

  saveStore(store);
  return { unlockedAchievements, dailiesCompleted: newlyCompleted };
}

export function claimDailyReward(challengeId: DailyChallengeId, state: GameState): boolean {
  const store = loadStore();
  const dateKey = todayKey();
  
  if (!store.dailyCompletedByDate[dateKey]?.includes(challengeId)) return false;
  if (!store.dailyClaimedByDate[dateKey]) store.dailyClaimedByDate[dateKey] = [];
  if (store.dailyClaimedByDate[dateKey].includes(challengeId)) return false;

  const challenge = DAILY_CHALLENGES.find(c => c.id === challengeId);
  if (!challenge) return false;

  store.dailyClaimedByDate[dateKey].push(challengeId);
  store.milestoneProgress++;
  
  if (challenge.rewardType === 'gems') {
    state.gemsCurrency += challenge.rewardAmount;
  }
  
  saveStore(store);
  return true;
}

export function getAchievementLabel(id: AchievementId): string {
  return ACHIEVEMENT_LABELS[id] || id;
}
