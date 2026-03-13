import type { GameState } from '../types';
import { GRAVITY, FRICTION } from '../constants';

export function applyPhysics(state: GameState) {
  const s = state.stickman;

  // Apply gravity
  if (!s.onGround && !s.isDashing) {
    s.vy += GRAVITY;
  }

  // Apply friction
  if (!s.walking && s.onGround) {
    s.vx *= FRICTION;
    if (Math.abs(s.vx) < 0.1) s.vx = 0;
  }

  // Update position
  s.x += s.vx;
  s.y += s.vy;

  // Ground collision (simple floor)
  if (s.y + s.height > state.worldHeight - 40) {
    s.y = state.worldHeight - 40 - s.height;
    s.vy = 0;
    s.onGround = true;
    s.jumping = false;
  } else {
    s.onGround = false;
  }

  // Platform collisions
  for (const plat of state.platforms) {
    if (s.vx > 0) {
      if (s.x + s.width > plat.x && s.x < plat.x + plat.width && s.y + s.height > plat.y + 5 && s.y < plat.y + plat.height - 5) {
        s.x = plat.x - s.width; s.vx = 0;
      }
    } else if (s.vx < 0) {
      if (s.x < plat.x + plat.width && s.x + s.width > plat.x && s.y + s.height > plat.y + 5 && s.y < plat.y + plat.height - 5) {
        s.x = plat.x + plat.width; s.vx = 0;
      }
    }

    if (s.vy > 0) {
      if (s.y + s.height > plat.y && s.y < plat.y + plat.height && s.x + s.width > plat.x + 5 && s.x < plat.x + plat.width - 5) {
        s.y = plat.y - s.height;
        s.vy = 0;
        s.onGround = true;
        s.jumping = false;
        if (plat.type === 'ice') state.onIce = true;
      }
    } else if (s.vy < 0) {
      if (s.y < plat.y + plat.height && s.y + s.height > plat.y && s.x + s.width > plat.x + 5 && s.x < plat.x + plat.width - 5) {
        s.y = plat.y + plat.height;
        s.vy = 0;
      }
    }
  }

  // EnvObject collisions (crates, etc)
  for (const obj of state.envObjects) {
    if (!obj.solid || obj.state === 'destroyed' || obj.state === 'collected') continue;

    // Top collision
    if (s.vy > 0 && s.y + s.height > obj.y && s.y < obj.y + 10 && s.x + s.width > obj.x + 5 && s.x < obj.x + obj.width - 5) {
      s.y = obj.y - s.height;
      s.vy = 0;
      s.onGround = true;
      s.jumping = false;
    }
    // Bottom collision
    if (s.vy < 0 && s.y > obj.y + obj.height - 10 && s.y < obj.y + obj.height && s.x + s.width > obj.x + 5 && s.x < obj.x + obj.width - 5) {
      s.y = obj.y + obj.height;
      s.vy = 0;
    }
    // Side collision
    if (s.y + s.height > obj.y + 5 && s.y < obj.y + obj.height - 5) {
      if (s.x + s.width > obj.x && s.x + s.width < obj.x + obj.width / 2 && s.vx > 0) {
        s.x = obj.x - s.width; s.vx = 0;
      }
      if (s.x < obj.x + obj.width && s.x > obj.x + obj.width / 2 && s.vx < 0) {
        s.x = obj.x + obj.width; s.vx = 0;
      }
    }
  }
}
