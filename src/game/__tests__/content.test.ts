import { test, expect } from 'vitest';

import { applyContentPack } from '../content';
import type { LevelDef } from '../types';

function makeLevel(name: string): LevelDef {
  return {
    name,
    subtitle: `${name} subtitle`,
    worldWidth: 1200,
    worldHeight: 700,
    bgColors: ['#000', '#111', '#222', '#333'],
    platforms: [],
    envObjects: [],
    enemies: [],
    playerStart: { x: 0, y: 0 },
    gemsRequired: 1,
    totalGems: 1,
    elementHint: 'hint',
    timeLimit: 0,
  };
}

test('applyContentPack overrides existing level metadata and appends new levels', () => {
  const base = [makeLevel('A'), makeLevel('B')];
  const next = applyContentPack(base, {
    levelOverrides: [{ index: 1, data: { name: 'B2', gemsRequired: 3 } }],
    appendedLevels: [makeLevel('C')],
  });

  expect(next.length).toBe(3);
  expect(next[1].name).toBe('B2');
  expect(next[1].gemsRequired).toBe(3);
  expect(next[2].name).toBe('C');
  expect(base[1].name).toBe('B');
});

test('applyContentPack ignores malformed overrides and malformed appended levels', () => {
  const base = [makeLevel('A'), makeLevel('B')];
  const next = applyContentPack(base, {
    levelOverrides: [
      { index: -1, data: { name: 'InvalidIndex' } },
      { index: 99, data: { name: 'TooHigh' } },
      { index: 1, data: { name: 'B3', worldWidth: Number.NaN } },
    ],
    appendedLevels: [
      makeLevel('C'),
      { bad: 'shape' } as unknown as LevelDef,
    ],
  });

  expect(next.length).toBe(3);
  expect(next[1].name).toBe('B3');
  expect(next[1].worldWidth).toBe(1200);
  expect(next[2].name).toBe('C');
});
