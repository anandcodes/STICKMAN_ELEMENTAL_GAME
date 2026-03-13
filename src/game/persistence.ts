import type { Difficulty, GameState, SaveData } from './types';
import { TOTAL_LEVELS } from './levels';
import { hydrateCloudSave, syncCloudSave } from './services/cloud';

export const SAVE_KEY = 'elemental_stickman_save';
export const SAVE_SCHEMA_VERSION = 2;
const MAX_HIGH_SCORE = 10_000_000;
const MAX_COUNTER = 50_000_000;

const DEFAULT_SAVE: SaveData = {
  version: SAVE_SCHEMA_VERSION,
  integrity: '',
  highScore: 0,
  furthestLevel: 19, // Unlocked for testing
  totalGemsEver: 0,
  totalEnemiesDefeated: 0,
  difficulty: 'normal',
  gemsCurrency: 0,
  upgrades: { healthLevel: 0, manaLevel: 0, regenLevel: 0, damageLevel: 0, doubleJumpLevel: 0, dashDistanceLevel: 0 },
  bestTimes: {},
  hapticsEnabled: true,
  graphicsQuality: 'high',
};

function coerceNonNegativeInt(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isDifficulty(value: unknown): value is Difficulty {
  return value === 'easy' || value === 'normal' || value === 'hard';
}

function sanitizeBestTimes(raw: unknown): Record<number, number> {
  if (!raw || typeof raw !== 'object') return {};
  const input = raw as Record<string, unknown>;
  const out: Record<number, number> = {};

  for (const [k, v] of Object.entries(input)) {
    const key = Number(k);
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    const time = Math.floor(v);
    if (Number.isInteger(key) && key >= 0 && key < TOTAL_LEVELS && time > 0 && time <= 2_160_000) {
      out[key] = time;
    }
  }
  return out;
}

function upgradeSpendForLevel(level: number, perLevelCost: number): number {
  const l = clamp(Math.floor(level), 0, 5);
  return (l * (l + 1) * perLevelCost) / 2;
}

function totalUpgradeSpend(upgrades: SaveData['upgrades']): number {
  return (
    upgradeSpendForLevel(upgrades.healthLevel, 30) +
    upgradeSpendForLevel(upgrades.manaLevel, 30) +
    upgradeSpendForLevel(upgrades.regenLevel, 50) +
    upgradeSpendForLevel(upgrades.damageLevel, 60) +
    upgradeSpendForLevel(upgrades.doubleJumpLevel, 100) +
    upgradeSpendForLevel(upgrades.dashDistanceLevel, 80)
  );
}

function toIntegrityPayload(save: SaveData): Omit<SaveData, 'integrity'> {
  const copy = { ...save };
  delete copy.integrity;
  return copy;
}

function computeIntegrity(save: Omit<SaveData, 'integrity'>): string {
  const payload = [
    save.version ?? SAVE_SCHEMA_VERSION,
    save.highScore,
    save.furthestLevel,
    save.totalGemsEver,
    save.gemsCurrency,
    save.totalEnemiesDefeated,
    save.difficulty ?? 'normal',
    save.upgrades.healthLevel,
    save.upgrades.manaLevel,
    save.upgrades.regenLevel,
    save.upgrades.damageLevel,
    save.upgrades.doubleJumpLevel,
    save.upgrades.dashDistanceLevel,
    ...Object.entries(save.bestTimes).sort((a, b) => Number(a[0]) - Number(b[0])).flat(),
  ].join('|');

  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return `v2_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function clampImpossibleEconomy(save: SaveData): SaveData {
  const next = { ...save, upgrades: { ...save.upgrades } };
  next.gemsCurrency = Math.min(next.gemsCurrency, next.totalGemsEver);

  let spend = totalUpgradeSpend(next.upgrades);
  while (spend + next.gemsCurrency > next.totalGemsEver) {
    if (next.upgrades.dashDistanceLevel > 0) next.upgrades.dashDistanceLevel--;
    else if (next.upgrades.doubleJumpLevel > 0) next.upgrades.doubleJumpLevel--;
    else if (next.upgrades.damageLevel > 0) next.upgrades.damageLevel--;
    else if (next.upgrades.regenLevel > 0) next.upgrades.regenLevel--;
    else if (next.upgrades.healthLevel > 0) next.upgrades.healthLevel--;
    else if (next.upgrades.manaLevel > 0) next.upgrades.manaLevel--;
    else break;
    spend = totalUpgradeSpend(next.upgrades);
  }

  return next;
}

function normalizeSaveData(raw: unknown): SaveData {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SAVE };
  const data = raw as Record<string, unknown>;
  const upgrades = (data.upgrades && typeof data.upgrades === 'object') ? data.upgrades as Record<string, unknown> : {};

  let normalized: SaveData = {
    version: SAVE_SCHEMA_VERSION,
    integrity: typeof data.integrity === 'string' ? data.integrity : '',
    highScore: clamp(coerceNonNegativeInt(data.highScore, DEFAULT_SAVE.highScore), 0, MAX_HIGH_SCORE),
    furthestLevel: TOTAL_LEVELS - 1,
    totalGemsEver: clamp(coerceNonNegativeInt(data.totalGemsEver, DEFAULT_SAVE.totalGemsEver), 0, MAX_COUNTER),
    gemsCurrency: clamp(coerceNonNegativeInt(data.gemsCurrency, DEFAULT_SAVE.gemsCurrency), 0, MAX_COUNTER),
    totalEnemiesDefeated: clamp(coerceNonNegativeInt(data.totalEnemiesDefeated, DEFAULT_SAVE.totalEnemiesDefeated), 0, MAX_COUNTER),
    difficulty: isDifficulty(data.difficulty) ? data.difficulty : DEFAULT_SAVE.difficulty,
    upgrades: {
      healthLevel: Math.min(5, coerceNonNegativeInt(upgrades.healthLevel, DEFAULT_SAVE.upgrades.healthLevel)),
      manaLevel: Math.min(5, coerceNonNegativeInt(upgrades.manaLevel, DEFAULT_SAVE.upgrades.manaLevel)),
      regenLevel: Math.min(5, coerceNonNegativeInt(upgrades.regenLevel, DEFAULT_SAVE.upgrades.regenLevel)),
      damageLevel: Math.min(5, coerceNonNegativeInt(upgrades.damageLevel, DEFAULT_SAVE.upgrades.damageLevel)),
      doubleJumpLevel: Math.min(5, coerceNonNegativeInt(upgrades.doubleJumpLevel, DEFAULT_SAVE.upgrades.doubleJumpLevel)),
      dashDistanceLevel: Math.min(5, coerceNonNegativeInt(upgrades.dashDistanceLevel, DEFAULT_SAVE.upgrades.dashDistanceLevel)),
    },
    bestTimes: sanitizeBestTimes(data.bestTimes),
    hapticsEnabled: typeof data.hapticsEnabled === 'boolean' ? data.hapticsEnabled : true,
    graphicsQuality: (data.graphicsQuality === 'low' || data.graphicsQuality === 'medium' || data.graphicsQuality === 'high') ? data.graphicsQuality : 'high',
  };

  normalized = clampImpossibleEconomy(normalized);

  if (normalized.integrity) {
    const { integrity, ...withoutIntegrity } = normalized;
    if (integrity !== computeIntegrity(withoutIntegrity)) {
      normalized.upgrades = { ...DEFAULT_SAVE.upgrades };
      normalized.gemsCurrency = 0;
      normalized = clampImpossibleEconomy(normalized);
    }
  }

  normalized.integrity = computeIntegrity(toIntegrityPayload(normalized));
  return normalized;
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      return normalizeSaveData(JSON.parse(raw));
    }
  } catch {
    // localStorage unavailable or corrupted
  }

  return { ...DEFAULT_SAVE, furthestLevel: TOTAL_LEVELS - 1 };
}

export function saveProgress(state: GameState): void {
  try {
    const existing = loadSave();
    const withoutIntegrity: Omit<SaveData, 'integrity'> = {
      version: SAVE_SCHEMA_VERSION,
      highScore: Math.max(state.highScore, existing.highScore),
      furthestLevel: Math.max(state.furthestLevel, existing.furthestLevel),
      totalGemsEver: Math.max(state.totalGemsEver, existing.totalGemsEver),
      totalEnemiesDefeated: Math.max(state.enemiesDefeated, existing.totalEnemiesDefeated),
      difficulty: state.difficulty,
      gemsCurrency: state.gemsCurrency,
      upgrades: state.upgrades,
      bestTimes: state.bestTimes,
      hapticsEnabled: state.hapticsEnabled,
      graphicsQuality: state.graphicsQuality,
    };
    const data: SaveData = {
      ...clampImpossibleEconomy({ ...withoutIntegrity, integrity: '' }),
      integrity: '',
    };
    data.integrity = computeIntegrity(toIntegrityPayload(data));
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    void syncCloudSave(data).catch(() => {
      // network sync is best-effort
    });
  } catch {
    // localStorage unavailable
  }
}

export async function hydrateSaveFromCloud(): Promise<SaveData> {
  const local = loadSave();

  try {
    const merged = await hydrateCloudSave(local);
    const normalized = normalizeSaveData(merged);
    localStorage.setItem(SAVE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return local;
  }
}
