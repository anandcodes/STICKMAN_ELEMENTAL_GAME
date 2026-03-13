import type { GameState, Element } from '../types';
import * as Audio from '../audio';
import { 
  MOVE_SPEED, MAX_SPEED, JUMP_FORCE, 
  DASH_BASE_SPEED, DASH_SPEED_PER_UPGRADE, 
  DASH_BASE_DURATION, DASH_DURATION_PER_UPGRADE, 
  DASH_BASE_COOLDOWN, DASH_MANA_COST 
} from '../constants';
import { spawnParticles, vibrate } from './utils';

export function handlePlayerInput(state: GameState) {
  const s = state.stickman;

  // Input handling
  s.walking = false;
  let targetVx = 0;
  if (state.keys.has('a') || state.keys.has('arrowleft')) {
    targetVx -= MOVE_SPEED;
    s.facing = -1;
    s.walking = true;
  }
  if (state.keys.has('d') || state.keys.has('arrowright')) {
    targetVx += MOVE_SPEED;
    s.facing = 1;
    s.walking = true;
  }

  if (s.walking) {
    if (targetVx > 0 && s.vx < MAX_SPEED) {
      s.vx = Math.min(MAX_SPEED, s.vx + targetVx);
    } else if (targetVx < 0 && s.vx > -MAX_SPEED) {
      s.vx = Math.max(-MAX_SPEED, s.vx + targetVx);
    }
  }

  // Jump buffering
  if (state.keys.has('w') || state.keys.has('arrowup') || state.keys.has(' ')) {
    s.jumpBufferTimer = 6;
    state.keys.delete('w'); state.keys.delete('arrowup'); state.keys.delete(' ');
  } else if (s.jumpBufferTimer > 0) {
    s.jumpBufferTimer--;
  }

  // Dash input
  if ((state.keys.has('shift') || state.keys.has('q')) && s.dashCooldown <= 0 && s.mana >= DASH_MANA_COST) {
    s.isDashing = true;
    s.dashTimer = DASH_BASE_DURATION + (state.upgrades.dashDistanceLevel * DASH_DURATION_PER_UPGRADE);
    s.dashCooldown = DASH_BASE_COOLDOWN;
    s.mana -= DASH_MANA_COST;
    s.invincibleTimer = s.dashTimer + 5;
    const speed = DASH_BASE_SPEED + (state.upgrades.dashDistanceLevel * DASH_SPEED_PER_UPGRADE);
    s.vx = s.facing * speed;
    s.vy = 0;
    Audio.playDash();
    vibrate(state, 40);
    spawnParticles(state, s.x + s.width / 2, s.y + s.height / 2, 'wind', 15);
    state.keys.delete('shift'); state.keys.delete('q');
  }
}

export function updatePlayer(state: GameState) {
  const s = state.stickman;

  // Coyote timer
  if (s.onGround) {
    s.coyoteTimer = 6;
    s.jumpsUsed = 0;
  } else {
    if (s.coyoteTimer > 0) s.coyoteTimer--;
    else if (s.jumpsUsed === 0) s.jumpsUsed = 1; // walk off ledge
  }

  const maxJumps = 1 + (state.upgrades.doubleJumpLevel > 0 ? 1 : 0);
  const canJump = (s.coyoteTimer > 0 && s.jumpsUsed === 0) || (!s.onGround && s.jumpsUsed < maxJumps);

  if (s.jumpBufferTimer > 0 && canJump) {
    let jf = JUMP_FORCE;
    if (state.selectedElement === 'wind' && state.activeRelics.some(r => r.type === 'storm_crown')) {
      jf *= 1.2;
    }
    s.vy = jf;
    s.onGround = false;
    s.jumping = true;
    s.jumpsUsed++;
    s.jumpBufferTimer = 0;
    s.coyoteTimer = 0;
    Audio.playJump();
    spawnParticles(state, s.x + s.width / 2, s.y + s.height, 'wind', 8);
  }

  // Dash logic
  if (s.isDashing) {
    s.dashTimer--;
    s.vy = 0; // maintain height
    if (s.dashTimer <= 0) s.isDashing = false;
    
    // Performance optimization: fewer particles during dash on low quality
    const particleInterval = state.graphicsQuality === 'low' ? 5 : 2;
    if (s.dashTimer % particleInterval === 0) {
      spawnParticles(state, s.x + s.width / 2, s.y + s.height / 2, 'wind', 1);
    }
  }
  if (s.dashCooldown > 0) s.dashCooldown--;

  // Mana regen
  const ds = state.difficulty ? (state.difficulty === 'easy' ? 0.15 : state.difficulty === 'normal' ? 0.08 : 0.04) : 0.08;
  const regenBonus = 1 + (state.upgrades.regenLevel * 0.4);
  s.mana = Math.min(s.maxMana, s.mana + ds * regenBonus);

  // Invincibility
  if (s.invincibleTimer > 0) s.invincibleTimer--;
}
