import type { Relic, RelicType, GameState } from './types';

export const ALL_RELICS: Relic[] = [
  {
    type: 'burning_soul',
    name: 'Burning Soul',
    description: 'Fire spells deal 50% more damage.',
    icon: '🔥',
    rarity: 'common'
  },
  {
    type: 'storm_crown',
    name: 'Storm Crown',
    description: 'Wind Jumps are 20% higher.',
    icon: '⚡',
    rarity: 'rare'
  },
  {
    type: 'earth_heart',
    name: 'Earth Heart',
    description: 'Heal 1 HP every 2 seconds while on solid ground.',
    icon: '🌿',
    rarity: 'rare'
  },
  {
    type: 'sea_blessing',
    name: 'Sea Blessing',
    description: 'Mana regenerates 40% faster.',
    icon: '🌊',
    rarity: 'common'
  },
  {
    type: 'vitality_core',
    name: 'Vitality Core',
    description: '+50 Max HP and full heal.',
    icon: '💎',
    rarity: 'common'
  },
  {
    type: 'mana_flux',
    name: 'Mana Flux',
    description: 'Spells cost 30% less mana.',
    icon: '✨',
    rarity: 'rare'
  },
  {
    type: 'berserker_blood',
    name: 'Berserker Blood',
    description: 'Deal more damage as your health gets lower.',
    icon: '🩸',
    rarity: 'legendary'
  },
  {
    type: 'static_static',
    name: 'Static Field',
    description: 'Dashing releases a shockwave of wind damage.',
    icon: '🌀',
    rarity: 'rare'
  }
];

export function getRandomRelics(count: number, exclude: RelicType[]): Relic[] {
  const available = ALL_RELICS.filter(r => !exclude.includes(r.type));
  const shuffled = [...available].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export function applyRelicEffects(state: GameState) {
  // Most relic effects are handled in engine.ts logic checks,
  // but some might need periodic application here.
  const s = state.stickman;
  
  if (state.activeRelics.some(r => r.type === 'earth_heart')) {
    if (state.timeElapsed % 120 === 0 && s.onGround && s.health < s.maxHealth) {
      s.health = Math.min(s.maxHealth, s.health + 1);
    }
  }
}
