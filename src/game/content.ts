import type { LevelDef } from './types';

export interface LevelOverride {
  index: number;
  data: Partial<LevelDef>;
}

export interface ContentPack {
  levelOverrides?: LevelOverride[];
  appendedLevels?: LevelDef[];
}

export function applyContentPack(baseLevels: LevelDef[], pack: ContentPack): LevelDef[] {
  const next = baseLevels.map((level) => ({
    ...level,
    platforms: [...level.platforms],
    envObjects: [...level.envObjects],
    enemies: [...level.enemies],
  }));

  for (const override of pack.levelOverrides || []) {
    if (typeof override.index !== 'number') continue;
    const index = Math.max(0, Math.floor(override.index));
    if (index >= next.length) continue;

    const current = next[index];
    const patch = override.data || {};
    next[index] = {
      ...current,
      ...patch,
      platforms: patch.platforms ? [...patch.platforms] : current.platforms,
      envObjects: patch.envObjects ? [...patch.envObjects] : current.envObjects,
      enemies: patch.enemies ? [...patch.enemies] : current.enemies,
    };
  }

  if (Array.isArray(pack.appendedLevels)) {
    for (const level of pack.appendedLevels) {
      next.push({
        ...level,
        platforms: [...level.platforms],
        envObjects: [...level.envObjects],
        enemies: [...level.enemies],
      });
    }
  }

  return next;
}
