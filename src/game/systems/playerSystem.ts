import type { GameState } from '../types';
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
  const keyboardAxis = (state.keys.has('d') || state.keys.has('arrowright') ? 1 : 0)
    - (state.keys.has('a') || state.keys.has('arrowleft') ? 1 : 0);
  const moveAxis = keyboardAxis !== 0 ? keyboardAxis : state.moveInputX;

  // Dead-zone: ignore tiny floating-point residue from joystick
  const effectiveAxis = Math.abs(moveAxis) < 0.08 ? 0 : moveAxis;

  if (effectiveAxis < 0) {
    s.facing = -1;
    s.walking = true;
  }
  if (effectiveAxis > 0) {
    s.facing = 1;
    s.walking = true;
  }

  if (s.walking) {
    // Target-based velocity: smoothly accelerate toward desired speed
    let speedMult = 1;
    if (state.activePowerups && state.activePowerups.speedTimer > 0) {
      speedMult = 1.8; // Not quite double to keep it controllable, but very fast
    }
    
    const targetVx = effectiveAxis * MAX_SPEED * speedMult;
    const accel = MOVE_SPEED * speedMult * (0.7 + Math.abs(effectiveAxis) * 0.3);
    if (targetVx > s.vx) {
      s.vx = Math.min(targetVx, s.vx + accel);
    } else if (targetVx < s.vx) {
      s.vx = Math.max(targetVx, s.vx - accel);
    }
  } else if (!s.isDashing) {
    // No input: apply friction even in the air to prevent drift
    const airFriction = s.onGround ? 0.82 : 0.95;
    s.vx *= airFriction;
    if (Math.abs(s.vx) < 0.15) s.vx = 0;
  }

  // Jump buffering
  if (state.keys.has('w') || state.keys.has('arrowup') || state.keys.has(' ')) {
    s.jumpBufferTimer = state.balanceCurve.jumpBufferFrames;
    state.keys.delete('w'); state.keys.delete('arrowup'); state.keys.delete(' ');
  } else if (s.jumpBufferTimer > 0) {
    s.jumpBufferTimer--;
  }

  if (state.dashBufferFrames > 0) {
    state.dashBufferFrames--;
  }

  if (state.keys.has('shift') || state.keys.has('q')) {
    state.dashBufferFrames = Math.max(state.dashBufferFrames, state.balanceCurve.dashBufferFrames);
  }

  // Dash input
  const dashCooldownMult = (state.activePowerups && state.activePowerups.speedTimer > 0) ? 0.4 : 1;
  
  if (state.dashBufferFrames > 0 && s.dashCooldown <= 0 && s.mana >= DASH_MANA_COST) {
    s.isDashing = true;
    s.dashTimer = DASH_BASE_DURATION + (state.upgrades.dashDistanceLevel * DASH_DURATION_PER_UPGRADE);
    s.dashCooldown = DASH_BASE_COOLDOWN * dashCooldownMult;
    s.mana -= DASH_MANA_COST;
    s.invincibleTimer = s.dashTimer + 5;
    const speed = DASH_BASE_SPEED + (state.upgrades.dashDistanceLevel * DASH_SPEED_PER_UPGRADE);
    s.vx = s.facing * speed;
    s.vy = 0;
    Audio.playDash();
    vibrate(state, 40);
    spawnParticles(state, s.x + s.width / 2, s.y + s.height / 2, 'wind', 15);
    state.dashBufferFrames = 0;
    state.keys.delete('shift'); state.keys.delete('q');
  }
}

export function updatePlayer(state: GameState, _dt = 1) {
  const s = state.stickman;

  // Coyote timer
  if (s.onGround) {
    s.coyoteTimer = state.balanceCurve.coyoteFrames;
    s.jumpsUsed = 0;
  } else {
    if (s.coyoteTimer > 0) s.coyoteTimer--;
    else if (s.jumpsUsed === 0) s.jumpsUsed = 1; // walk off ledge
  }

  const maxJumps = 1 + (state.upgrades.doubleJumpLevel > 0 ? 1 : 0) + (state.selectedElement === 'wind' ? 1 : 0);
  const canJump = (s.coyoteTimer > 0 && s.jumpsUsed === 0) || (!s.onGround && s.jumpsUsed < maxJumps);

  if (s.jumpBufferTimer > 0 && canJump) {
    let jf = JUMP_FORCE;
    if (state.selectedElement === 'earth') jf *= 0.9;
    if (state.selectedElement === 'wind') jf *= 1.05;
    if (state.selectedElement === 'wind' && state.activeRelics.some(r => r.type === 'storm_crown')) jf *= 1.2;
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
  if (s.hurtTimer > 0) s.hurtTimer--;
}
