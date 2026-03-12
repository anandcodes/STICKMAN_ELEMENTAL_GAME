import { createInitialState, update, selectRelic } from '../engine';
import { handleEnemyHit } from '../systems/utils';
import type { Enemy, Projectile } from '../types';

describe('Relic System', () => {
  it('should trigger relic selection after 3 waves in endless mode', () => {
    // Endless mode is index 20
    const state = createInitialState(20);
    state.screen = 'playing';
    state.endlessWave = 3;
    state.enemies = []; // All enemies dead
    state.endlessTimer = 181; // Trigger wave advance
    
    // Step the engine
    update(state);
    
    // It should now transition to relicSelection screen (wave becomes 4)
    // Wait, the logic was: 
    // state.endlessWave++;
    // if (state.endlessWave % 3 === 0)
    // So if wave was 2 and it advances to 3, it should trigger.
    
    let s2 = createInitialState(20);
    s2.screen = 'playing';
    s2.endlessWave = 2; // Before advance
    s2.enemies = [];
    s2.endlessTimer = 181;
    update(s2);
    
    expect(s2.endlessWave).toBe(3);
    expect(s2.screen).toBe('relicSelection');
    expect(s2.relicChoices.length).toBe(3);
  });

  it('should apply Vitality Core correctly (Instant Effect)', () => {
    const state = createInitialState(20);
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
    const state = createInitialState(20);
    const enemy: Enemy = {
      id: 1, type: 'slime', x: 0, y: 0, width: 20, height: 20,
      vx: 0, vy: 0, health: 100, maxHealth: 100, facing: 1,
      weakness: 'water', resistance: 'earth', state: 'patrol',
      hurtTimer: 0, patrolRange: 0, originX: 0, animTimer: 0,
      damage: 10, speed: 1
    };
    
    const proj: Projectile = { x: 0, y: 0, vx: 5, vy: 0, element: 'fire', life: 10, size: 5 };
    
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

// Mocking expect/describe/it since they might not be in global scope for Node's test runner if not configured
function describe(name: string, fn: () => void) { console.log(`\nSuite: ${name}`); fn(); }
function it(name: string, fn: () => void) { 
  try { 
    fn(); 
    console.log(`  ✓ ${name}`); 
  } catch (e) { 
    console.log(`  ✗ ${name}`); 
    console.error(e);
    process.exit(1);
  } 
}
function expect(actual: any) {
  return {
    toBe: (expected: any) => { if (actual !== expected) throw new Error(`Expected ${expected} but got ${actual}`); },
    toBeGreaterThan: (expected: any) => { if (actual <= expected) throw new Error(`Expected > ${expected} but got ${actual}`); },
    toBeCloseTo: (expected: any) => { if (Math.abs(actual - expected) > 0.1) throw new Error(`Expected close to ${expected} but got ${actual}`); }
  };
}
