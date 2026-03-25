import type { LevelDef } from './types';
import { level1, level2, level3, level4, level5 } from './levels/level1_5';
import { level6, level7, level8, level9, level10 } from './levels/level6_10';
import { level11, level12, level13, level14, level15 } from './levels/level11_15';
import { level16, level17, level18, level19, level20 } from './levels/level16_20';
import { level21, level22, level23, level24, level25 } from './levels/level21_25';
import { endlessLevel } from './levels/endlessLevel';
import { getTutorialLevel } from './levels/tutorial';
import type { ContentPack } from './content';
import { applyContentPack } from './content';
import contentPackJson from './content-pack.json';

export { makeEnemy } from './levels/utils';
export { getTutorialLevel };

const CONTENT_PACK = contentPackJson as ContentPack;

export function getLevels(): LevelDef[] {
  const base = [
    level1(), level2(), level3(), level4(), level5(),
    level6(), level7(), level8(), level9(), level10(),
    level11(), level12(), level13(), level14(), level15(),
    level16(), level17(), level18(), level19(), level20(),
    level21(), level22(), level23(), level24(), level25(),
    endlessLevel(),
  ];
  return applyContentPack(base, CONTENT_PACK);
}

export function getLevel(index: number): LevelDef {
  if (index === -1) return getTutorialLevel();
  const levels = getLevels();
  return levels[Math.min(index, levels.length - 1)];
}

export const TOTAL_LEVELS = 25; // Exclude endless from campaign tracking
