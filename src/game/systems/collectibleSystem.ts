import type { GameState } from '../types';
import { spawnFloatingText, spawnParticles, addScore } from './utils';
import * as Audio from '../audio';
import { saveProgress } from '../persistence';

export function updateCollectibles(state: GameState) {
  const s = state.stickman;

  for (const obj of state.envObjects) {
    if (obj.state === 'collected' || obj.state === 'destroyed') continue;

    const touching = s.x + s.width > obj.x && s.x < obj.x + obj.width &&
      s.y + s.height > obj.y && s.y < obj.y + obj.height;

    if (!touching) continue;

    if (obj.type === 'gem') {
      obj.state = 'collected';
      state.gemsCollected++;
      state.totalGemsEver++;
      state.gemsCurrency++;
      addScore(state, 25);
      spawnFloatingText(state, obj.x + obj.width / 2, obj.y - 10, '+25 💎', '#ffcc00');
      spawnParticles(state, obj.x + obj.width / 2, obj.y + obj.height / 2, 'wind', 12);
      Audio.playGemCollect();
      // Check portal
      if (state.gemsCollected >= state.gemsRequired && !state.portalOpen) {
        state.portalOpen = true;
        Audio.playPortalOpen();
        // Activate portal
        for (const o of state.envObjects) {
          if (o.type === 'portal') o.state = 'active';
        }
      }
    }
    if (obj.type === 'health_potion') {
      obj.state = 'collected';
      s.health = Math.min(s.maxHealth, s.health + 40);
      s.lastHealTime = state.timeElapsed; // UI Feedback
      spawnParticles(state, obj.x + 8, obj.y + 10, 'fire', 10);
      addScore(state, 10);
      Audio.playPotionCollect();
    }
    if (obj.type === 'lore_tome' && obj.dialogue) {
      obj.state = 'collected';
      state.activeDialog = [...obj.dialogue];
      state.dialogCharIndex = 0;
      spawnParticles(state, obj.x + 8, obj.y + 10, 'wind', 20);
      Audio.playGemCollect();
    }
    if (obj.type === 'mana_crystal') {
      obj.state = 'collected';
      s.mana = Math.min(s.maxMana, s.mana + 50);
      s.lastHealTime = state.timeElapsed; // Reuse for mana feedback too
      spawnParticles(state, obj.x + 8, obj.y + 10, 'water', 10);
      addScore(state, 10);
      Audio.playPotionCollect();
    }
    if (obj.type === 'portal' && obj.state === 'active') {
      // Level complete!
      state.screen = 'levelComplete';
      state.screenTimer = 0;
      state.furthestLevel = Math.max(state.furthestLevel, state.currentLevel + 1);
      saveProgress(state);
      Audio.playLevelComplete();
    }
  }

  // Handle Powerups
  for (const p of state.powerups) {
    if (!p.active) continue;
    
    // Floating animation
    p.bobTimer += 0.05;
    
    const touching = s.x + s.width > p.x && s.x < p.x + p.width &&
      s.y + s.height > p.y && s.y < p.y + p.height;
      
    if (touching) {
      p.active = false;
      addScore(state, 50);
      Audio.playPotionCollect();
      
      const cx = s.x + s.width / 2;
      if (p.type === 'shield') {
         state.activePowerups.shieldTimer = 480; // 8 seconds
         spawnFloatingText(state, cx, s.y - 10, 'SHIELD!', '#00ffff', 24, { wiggle: true });
         spawnParticles(state, cx, s.y + s.height / 2, 'water', 20);
      } else if (p.type === 'speed') {
         state.activePowerups.speedTimer = 480; // 8 seconds
         spawnFloatingText(state, cx, s.y - 10, 'SPEED UP!', '#ffff00', 24, { wiggle: true });
         spawnParticles(state, cx, s.y + s.height / 2, 'wind', 20);
      } else if (p.type === 'rapidfire') {
         state.activePowerups.rapidfireTimer = 300; // 5 seconds
         spawnFloatingText(state, cx, s.y - 10, 'RAPID FIRE!', '#ff3300', 24, { wiggle: true });
         spawnParticles(state, cx, s.y + s.height / 2, 'fire', 20);
      }
    }
  }
}
