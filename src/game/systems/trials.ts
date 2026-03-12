import type { GameState, Element } from '../types';
import { nid } from '../levels/utils';

export function startTrial(state: GameState) {
  state.trialActive = true;
  const elements: Element[] = ['fire', 'water', 'earth', 'wind'];
  state.trialElement = elements[Math.floor(Math.random() * elements.length)];

  // Clear temporary trial objects from previous trial if any
  state.envObjects = state.envObjects.filter(obj => !obj.id.toString().startsWith('999'));

  // Apply environmental shifts based on element
  switch (state.trialElement) {
    case 'fire':
      // Magma pools and fire pits
      state.envObjects.push(
        { id: nid(), type: 'fire_pit', x: 200, y: 560, width: 80, height: 20, health: 100, maxHealth: 100, state: 'burning', solid: false },
        { id: nid(), type: 'fire_pit', x: 900, y: 560, width: 80, height: 20, health: 100, maxHealth: 100, state: 'burning', solid: false }
      );
      break;
    case 'water':
      // Ice platforms and currents
      state.platforms.forEach(p => {
        if (p.type === 'stone') p.type = 'ice';
      });
      state.envObjects.push({ 
        id: nid(), type: 'water_current', x: 400, y: 570, width: 400, height: 15, 
        health: 999, maxHealth: 999, state: 'normal', solid: false,
        currentSpeed: 1.2
      });
      break;
    case 'earth':
      // Spikes and falling hazards (simulated by spawning boulders/rocks)
      state.envObjects.push(
        { id: nid(), type: 'spike', x: 500, y: 565, width: 200, height: 15, health: 999, maxHealth: 999, state: 'normal', solid: false },
        { id: nid(), type: 'rock', x: 300, y: 540, width: 40, height: 40, health: 300, maxHealth: 300, state: 'normal', solid: true }
      );
      break;
    case 'wind':
      // Strong wind zones
      state.envObjects.push(
        { id: nid(), type: 'wind_zone', x: 0, y: 0, width: 600, height: 700, health: 999, maxHealth: 999, state: 'normal', solid: false, windDirection: 1, windStrength: 0.6 },
        { id: nid(), type: 'wind_zone', x: 600, y: 0, width: 600, height: 700, health: 999, maxHealth: 999, state: 'normal', solid: false, windDirection: -1, windStrength: 0.6 }
      );
      break;
  }
}

export function endTrial(state: GameState) {
  state.trialActive = false;
  state.trialElement = undefined;
  
  // Revert environment changes
  state.platforms.forEach(p => {
    if (p.type === 'ice') p.type = 'stone';
  });
  
  // Custom objects could be cleaned up if we tagged them, but for now we'll just let them stay or handle them in next trial start
}
