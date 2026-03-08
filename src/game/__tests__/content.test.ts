import test from 'node:test';
import assert from 'node:assert/strict';

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

  assert.equal(next.length, 3);
  assert.equal(next[1].name, 'B2');
  assert.equal(next[1].gemsRequired, 3);
  assert.equal(next[2].name, 'C');
  assert.equal(base[1].name, 'B');
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

  assert.equal(next.length, 3);
  assert.equal(next[1].name, 'B3');
  assert.equal(next[1].worldWidth, 1200);
  assert.equal(next[2].name, 'C');
});
