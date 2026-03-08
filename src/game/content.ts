import type { LevelDef } from './types';

export interface LevelOverride {
  index: number;
  data: Partial<LevelDef>;
}

export interface ContentPack {
  levelOverrides?: LevelOverride[];
  appendedLevels?: LevelDef[];
}

function cloneLevel(level: LevelDef): LevelDef {
  return {
    ...level,
    platforms: [...level.platforms],
    envObjects: [...level.envObjects],
    enemies: [...level.enemies],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isValidLevel(level: unknown): level is LevelDef {
  if (!isRecord(level)) return false;
  return (
    typeof level.name === 'string' &&
    typeof level.subtitle === 'string' &&
    typeof level.worldWidth === 'number' &&
    typeof level.worldHeight === 'number' &&
    Array.isArray(level.bgColors) &&
    Array.isArray(level.platforms) &&
    Array.isArray(level.envObjects) &&
    Array.isArray(level.enemies) &&
    isRecord(level.playerStart) &&
    typeof level.playerStart.x === 'number' &&
    typeof level.playerStart.y === 'number' &&
    typeof level.gemsRequired === 'number' &&
    typeof level.totalGems === 'number' &&
    typeof level.elementHint === 'string' &&
    typeof level.timeLimit === 'number'
  );
}

function applyLevelPatch(current: LevelDef, patch: Partial<LevelDef>): LevelDef {
  const next = { ...current };

  if (typeof patch.name === 'string') next.name = patch.name;
  if (typeof patch.subtitle === 'string') next.subtitle = patch.subtitle;
  if (typeof patch.worldWidth === 'number' && Number.isFinite(patch.worldWidth)) next.worldWidth = patch.worldWidth;
  if (typeof patch.worldHeight === 'number' && Number.isFinite(patch.worldHeight)) next.worldHeight = patch.worldHeight;
  if (Array.isArray(patch.bgColors) && patch.bgColors.length === 4) {
    next.bgColors = [...patch.bgColors] as LevelDef['bgColors'];
  }
  if (Array.isArray(patch.platforms)) next.platforms = [...patch.platforms];
  if (Array.isArray(patch.envObjects)) next.envObjects = [...patch.envObjects];
  if (Array.isArray(patch.enemies)) next.enemies = [...patch.enemies];
  if (patch.playerStart && typeof patch.playerStart.x === 'number' && typeof patch.playerStart.y === 'number') {
    next.playerStart = { ...patch.playerStart };
  }
  if (typeof patch.gemsRequired === 'number' && Number.isFinite(patch.gemsRequired)) next.gemsRequired = patch.gemsRequired;
  if (typeof patch.totalGems === 'number' && Number.isFinite(patch.totalGems)) next.totalGems = patch.totalGems;
  if (typeof patch.elementHint === 'string') next.elementHint = patch.elementHint;
  if (typeof patch.timeLimit === 'number' && Number.isFinite(patch.timeLimit)) next.timeLimit = patch.timeLimit;

  return next;
}

export function applyContentPack(baseLevels: LevelDef[], pack: ContentPack): LevelDef[] {
  const next = baseLevels.filter(isValidLevel).map(cloneLevel);

  for (const override of pack.levelOverrides || []) {
    if (!override || typeof override !== 'object' || typeof override.index !== 'number') continue;
    const index = Math.max(0, Math.floor(override.index));
    if (index >= next.length) continue;

    const current = next[index];
    const patch = (override.data && typeof override.data === 'object') ? override.data : {};
    next[index] = applyLevelPatch(current, patch);
  }

  if (Array.isArray(pack.appendedLevels)) {
    for (const level of pack.appendedLevels) {
      if (!isValidLevel(level)) continue;
      next.push(cloneLevel(level));
    }
  }

  return next;
}
