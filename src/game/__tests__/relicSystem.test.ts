import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialState, update, selectRelic } from '../engine';
import { handleEnemyHit } from '../systems/utils';
import type { Enemy, Projectile } from '../types';
import { setMockAudioContext } from './testHelpers';

describe('Relic System', () => {
  beforeEach(() => {
    setMockAudioContext();
  });

  it('should trigger relic selection after 3 waves in endless mode', () => {
    // Survival mode is level 15+
    const state = createInitialState(15);
    state.screen = 'playing';
    state.showLevelIntro = false; // Bypass intro for test
    state.endlessWave = 2; // Before advance
    state.endlessTimer = 181;
    state.enemies = [];
    
    // update() should:
    // 1. increment endlessTimer (but we already set it to 181)
    // 2. see aliveEnemies === 0 and endlessTimer > 180
    // 3. increment endlessWave to 3
    // 4. see 3 % 3 === 0
    // 5. set screen to relicSelection
    update(state);
    
    expect(state.endlessWave).toBe(3);
    expect(state.screen).toBe('relicSelection');
    expect(state.relicChoices?.length).toBe(3);
  });

  it('should apply Vitality Core correctly (Instant Effect)', () => {
    const state = createInitialState(15);
    const initialMaxHp = state.stickman.maxHealth;
    
    state.screen = 'relicSelection';
    state.relicChoices = [
      { type: 'vitality_core', name: 'Vitality Core', description: '+50 Max HP', icon: '💎', rarity: 'common' }
    ];
    
    selectRelic(state, 0);
    
    expect(state.stickman.maxHealth).toBe(initialMaxHp + 50);
    expect(state.stickman.health).toBe(state.stickman.maxHealth);
    expect(state.screen).toBe('playing');
  });

  it('should apply Burning Soul damage bonus (Passive Effect)', () => {
    const state = createInitialState(15);
    const enemy: Enemy = {
      id: 1, type: 'slime', x: 0, y: 0, width: 20, height: 20,
      vx: 0, vy: 0, health: 100, maxHealth: 100, facing: 1,
      weakness: 'water', resistance: 'earth', state: 'patrol',
      hurtTimer: 0, patrolRange: 0, originX: 0, animTimer: 0,
      damage: 10, speed: 1
    };
    
    const proj: Projectile = { x: 0, y: 0, vx: 5, vy: 0, element: 'fire', life: 10, size: 5, isEnemy: false };
    
    // Case 1: No relic
    state.activeRelics = [];
    const healthBefore1 = enemy.health;
    handleEnemyHit(state, proj, enemy);
    const dmg1 = healthBefore1 - enemy.health;
    
    // Case 2: With Burning Soul
    enemy.health = 100; // Reset
    state.activeRelics = [{ type: 'burning_soul', name: 'BS', description: '', icon: '', rarity: 'common' }];
    const healthBefore2 = enemy.health;
    handleEnemyHit(state, proj, enemy);
    const dmg2 = healthBefore2 - enemy.health;
    
    expect(dmg2).toBeCloseTo(dmg1 * 1.5);
  });
});
