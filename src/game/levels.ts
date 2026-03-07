import type { LevelDef } from './types';
import { level1, level2, level3, level4, level5 } from './levels/level1_5';
import { level6, level7, level8, level9, level10 } from './levels/level6_10';
import { level11, level12, level13, level14, level15 } from './levels/level11_15';
import { endlessLevel } from './levels/endlessLevel';
import type { ContentPack } from './content';
import { applyContentPack } from './content';
import contentPackJson from './content-pack.json';

export { makeEnemy } from './levels/utils';

const CONTENT_PACK = contentPackJson as ContentPack;

export function getLevels(): LevelDef[] {
  const base = [
    level1(), level2(), level3(), level4(), level5(),
    level6(), level7(), level8(), level9(), level10(),
    level11(), level12(), level13(), level14(), level15(),
    endlessLevel(),
  ];
  return applyContentPack(base, CONTENT_PACK);
}

export function getLevel(index: number): LevelDef {
  const levels = getLevels();
  return levels[Math.min(index, levels.length - 1)];
}

export const TOTAL_LEVELS = 15; // Exclude endless from campaign tracking
