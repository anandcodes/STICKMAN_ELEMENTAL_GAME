import type { GameState } from '../types';
import { GRAVITY, FRICTION } from '../constants';

export function applyPhysics(state: GameState) {
  const s = state.stickman;
  const landingAssist = state.balanceCurve.landingAssist;
  const prevX = s.x;
  const prevY = s.y;

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
    const currentLeft = s.x;
    const currentRight = s.x + s.width;
    const currentTop = s.y;
    const currentBottom = s.y + s.height;
    const prevLeft = prevX;
    const prevRight = prevX + s.width;
    const prevTop = prevY;
    const prevBottom = prevY + s.height;
    const overlapX = currentRight > plat.x + 5 && currentLeft < plat.x + plat.width - 5;
    const overlapY = currentBottom > plat.y + 5 && currentTop < plat.y + plat.height - 5;

    if (s.vy >= 0 && prevBottom <= plat.y + 6 && currentBottom >= plat.y && overlapX) {
      s.y = plat.y - s.height;
      s.vy = 0;
      s.onGround = true;
      s.jumping = false;

      if (landingAssist > 0 && Math.abs(s.vx) < 2.2) {
        const targetX = plat.x + (plat.width - s.width) / 2;
        const correction = Math.max(-3, Math.min(3, (targetX - s.x) * 0.15));
        s.x += correction;
      }

      if (plat.type === 'ice') state.onIce = true;
      continue;
    }

    if (s.vy < 0 && prevTop >= plat.y + plat.height - 6 && currentTop <= plat.y + plat.height && overlapX) {
      s.y = plat.y + plat.height;
      s.vy = 0;
      continue;
    }

    if (s.vx > 0 && prevRight <= plat.x + 6 && currentRight >= plat.x && overlapY) {
      s.x = plat.x - s.width;
      s.vx = 0;
      continue;
    }

    if (s.vx < 0 && prevLeft >= plat.x + plat.width - 6 && currentLeft <= plat.x + plat.width && overlapY) {
      s.x = plat.x + plat.width;
      s.vx = 0;
    }
  }

  // EnvObject collisions (crates, etc)
  for (const obj of state.envObjects) {
    if (!obj.solid || obj.state === 'destroyed' || obj.state === 'collected') continue;
    const currentLeft = s.x;
    const currentRight = s.x + s.width;
    const currentTop = s.y;
    const currentBottom = s.y + s.height;
    const prevLeft = prevX;
    const prevRight = prevX + s.width;
    const prevTop = prevY;
    const prevBottom = prevY + s.height;
    const overlapX = currentRight > obj.x + 5 && currentLeft < obj.x + obj.width - 5;
    const overlapY = currentBottom > obj.y + 5 && currentTop < obj.y + obj.height - 5;

    if (s.vy >= 0 && prevBottom <= obj.y + 6 && currentBottom >= obj.y && overlapX) {
      s.y = obj.y - s.height;
      s.vy = 0;
      s.onGround = true;
      s.jumping = false;
      continue;
    }
    if (s.vy < 0 && prevTop >= obj.y + obj.height - 6 && currentTop <= obj.y + obj.height && overlapX) {
      s.y = obj.y + obj.height;
      s.vy = 0;
      continue;
    }
    if (s.vx > 0 && prevRight <= obj.x + 6 && currentRight >= obj.x && overlapY) {
      s.x = obj.x - s.width;
      s.vx = 0;
      continue;
    }
    if (s.vx < 0 && prevLeft >= obj.x + obj.width - 6 && currentLeft <= obj.x + obj.width && overlapY) {
      s.x = obj.x + obj.width;
      s.vx = 0;
    }
  }
}
