import type { Checkpoint, Enemy, EnvObject, LevelBalanceCurve, LevelDef, Platform, Vec2 } from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Math.round(value);
}

function getBaseCurve(level: number): LevelBalanceCurve {
  if (level <= 2) {
    return {
      phase: 'teach',
      platformWidthMultiplier: 1.32,
      gapDistanceMultiplier: 0.8,
      hazardSpeedMultiplier: 0.62,
      enemyDensityMultiplier: 0.45,
      verticalityFactor: 0.78,
      checkpointInterval: 420,
      movingPlatformFrequency: 0,
      coyoteFrames: 11,
      jumpBufferFrames: 10,
      dashBufferFrames: 14,
      landingAssist: 24,
      safeLandingWidth: 104,
      showGuides: true,
    };
  }

  if (level <= 6) {
    return {
      phase: 'test',
      platformWidthMultiplier: 1.14,
      gapDistanceMultiplier: 0.9,
      hazardSpeedMultiplier: 0.82,
      enemyDensityMultiplier: 0.72,
      verticalityFactor: 0.88,
      checkpointInterval: 520,
      movingPlatformFrequency: 0.2,
      coyoteFrames: 9,
      jumpBufferFrames: 8,
      dashBufferFrames: 12,
      landingAssist: 18,
      safeLandingWidth: 84,
      showGuides: true,
    };
  }

  if (level <= 11) {
    return {
      phase: 'twist',
      platformWidthMultiplier: 1,
      gapDistanceMultiplier: 1,
      hazardSpeedMultiplier: 1,
      enemyDensityMultiplier: 1,
      verticalityFactor: 1,
      checkpointInterval: 620,
      movingPlatformFrequency: 0.5,
      coyoteFrames: 7,
      jumpBufferFrames: 7,
      dashBufferFrames: 10,
      landingAssist: 10,
      safeLandingWidth: 64,
      showGuides: false,
    };
  }

  return {
    phase: 'master',
    platformWidthMultiplier: 0.92,
    gapDistanceMultiplier: 1.06,
    hazardSpeedMultiplier: 1.08,
    enemyDensityMultiplier: 1.08,
    verticalityFactor: 1.08,
    checkpointInterval: 760,
    movingPlatformFrequency: 1,
    coyoteFrames: 6,
    jumpBufferFrames: 6,
    dashBufferFrames: 10,
    landingAssist: 4,
    safeLandingWidth: 0,
    showGuides: false,
  };
}

export function getLevelBalanceCurve(level: number, deathStreak: number): LevelBalanceCurve {
  const base = getBaseCurve(level);
  const assistTier = clamp(Math.floor(deathStreak / 2), 0, 3);
  if (assistTier === 0) return base;

  return {
    ...base,
    platformWidthMultiplier: base.platformWidthMultiplier + assistTier * 0.08,
    gapDistanceMultiplier: Math.max(0.74, base.gapDistanceMultiplier - assistTier * 0.05),
    hazardSpeedMultiplier: Math.max(0.55, base.hazardSpeedMultiplier - assistTier * 0.08),
    enemyDensityMultiplier: Math.max(0.3, base.enemyDensityMultiplier - assistTier * 0.12),
    verticalityFactor: Math.max(0.72, base.verticalityFactor - assistTier * 0.05),
    checkpointInterval: Math.max(320, base.checkpointInterval - assistTier * 80),
    movingPlatformFrequency: Math.max(0, base.movingPlatformFrequency - assistTier * 0.2),
    coyoteFrames: base.coyoteFrames + assistTier,
    jumpBufferFrames: base.jumpBufferFrames + assistTier,
    dashBufferFrames: base.dashBufferFrames + assistTier * 2,
    landingAssist: base.landingAssist + assistTier * 6,
    safeLandingWidth: base.safeLandingWidth + assistTier * 18,
    showGuides: true,
  };
}

function createHelperPlatforms(platforms: Platform[], curve: LevelBalanceCurve): Platform[] {
  if (curve.safeLandingWidth <= 0) return [];

  const sorted = [...platforms].sort((a, b) => a.x - b.x);
  const helpers: Platform[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    const gap = next.x - (current.x + current.width);
    if (gap < curve.safeLandingWidth * 1.8 || gap > curve.safeLandingWidth * 4.2) continue;
    if (helpers.length >= 5) break;

    const y = round((current.y + next.y) / 2);
    helpers.push({
      x: round(current.x + current.width + gap / 2 - curve.safeLandingWidth / 2),
      y,
      width: curve.safeLandingWidth,
      height: 16,
      type: 'stone',
    });
  }
  return helpers;
}

function scalePlatform(platform: Platform, curve: LevelBalanceCurve): Platform {
  const widthScale = platform.type === 'ground'
    ? 1 + (curve.platformWidthMultiplier - 1) * 0.35
    : curve.platformWidthMultiplier;
  const widenedWidth = round(platform.width * widthScale);
  const widthDelta = widenedWidth - platform.width;

  return {
    ...platform,
    x: Math.max(0, round(platform.x - widthDelta / 2)),
    y: platform.y,
    width: widenedWidth,
  };
}

function shouldKeepMovingPlatform(obj: EnvObject, curve: LevelBalanceCurve): boolean {
  if (obj.type !== 'moving_platform') return true;
  const sample = (obj.id % 10) / 10;
  return sample < curve.movingPlatformFrequency;
}

function scaleEnvObject(obj: EnvObject, curve: LevelBalanceCurve): EnvObject | null {
  if (!shouldKeepMovingPlatform(obj, curve)) return null;

  const hazardAreaScale = 0.7 + curve.hazardSpeedMultiplier * 0.3;
  const scaledWidth = obj.type === 'spike'
    ? round(obj.width * hazardAreaScale)
    : obj.type === 'moving_platform'
      ? round(obj.width * curve.platformWidthMultiplier)
      : obj.width;

  const next: EnvObject = {
    ...obj,
    x: obj.type === 'spike' ? round(obj.x + (obj.width - scaledWidth) / 2) : obj.x,
    y: obj.y,
    width: scaledWidth,
  };

  if (obj.type === 'wind_zone' && obj.windStrength !== undefined) {
    next.windStrength = obj.windStrength * curve.hazardSpeedMultiplier;
    next.windDirection = obj.windDirection;
  }
  if (obj.type === 'water_current' && obj.currentSpeed !== undefined) {
    next.currentSpeed = obj.currentSpeed * curve.hazardSpeedMultiplier;
  }
  if (obj.type === 'moving_platform') {
    next.vx = (obj.vx || 0) * curve.hazardSpeedMultiplier;
    next.vy = (obj.vy || 0) * curve.hazardSpeedMultiplier;
    next.moveOriginX = next.x;
    next.moveOriginY = next.y;
    next.moveRange = obj.moveRange;
  }

  return next;
}

function scaleEnemy(enemy: Enemy, curve: LevelBalanceCurve): Enemy {
  const healthScale = clamp(0.8 + curve.enemyDensityMultiplier * 0.25, 0.75, 1.05);
  return {
    ...enemy,
    x: enemy.x,
    y: enemy.y,
    originX: enemy.originX,
    patrolRange: enemy.patrolRange,
    speed: Number((enemy.speed * curve.hazardSpeedMultiplier).toFixed(2)),
    damage: round(enemy.damage * (0.8 + curve.hazardSpeedMultiplier * 0.2)),
    health: round(enemy.health * healthScale),
    maxHealth: round(enemy.maxHealth * healthScale),
  };
}

function reduceEnemies(enemies: Enemy[], curve: LevelBalanceCurve): Enemy[] {
  if (curve.enemyDensityMultiplier >= 0.99) {
    return enemies.map((enemy) => scaleEnemy(enemy, curve));
  }

  const maxEnemies = Math.max(1, Math.round(enemies.length * curve.enemyDensityMultiplier));
  return enemies
    .map((enemy) => scaleEnemy(enemy, curve))
    .filter((_, index) => index < maxEnemies);
}

function findCheckpointPlatform(platforms: Platform[], targetX: number): Platform | null {
  let best: Platform | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const platform of platforms) {
    const centerX = platform.x + platform.width / 2;
    const distance = Math.abs(centerX - targetX);
    const heightBias = Math.abs(platform.y - 580) * 0.25;
    const score = distance + heightBias;
    if (score < bestScore) {
      best = platform;
      bestScore = score;
    }
  }

  return best;
}

function buildCheckpoints(def: LevelDef, curve: LevelBalanceCurve): Checkpoint[] {
  const standable = def.platforms.filter((platform) => platform.width >= 80);
  const checkpoints: Checkpoint[] = [{ x: def.playerStart.x, y: def.playerStart.y }];

  if (curve.checkpointInterval <= 0) return checkpoints;

  for (let x = curve.checkpointInterval; x < def.worldWidth - 180; x += curve.checkpointInterval) {
    const platform = findCheckpointPlatform(standable, x);
    if (!platform) continue;
    const checkpoint: Checkpoint = {
      x: clamp(round(x), platform.x + 20, platform.x + platform.width - 40),
      y: platform.y - 52,
    };

    const prev = checkpoints[checkpoints.length - 1];
    if (checkpoint.x - prev.x < curve.checkpointInterval * 0.55) continue;
    checkpoints.push(checkpoint);
  }

  return checkpoints;
}

export function scaleLevelForProgression(base: LevelDef, level: number, deathStreak: number): {
  levelDef: LevelDef;
  balanceCurve: LevelBalanceCurve;
  checkpoints: Checkpoint[];
  assistTier: number;
} {
  const balanceCurve = getLevelBalanceCurve(level, deathStreak);
  const platforms = base.platforms.map((platform) => scalePlatform(platform, balanceCurve));
  platforms.push(...createHelperPlatforms(platforms, balanceCurve));
  platforms.sort((a, b) => a.x - b.x);

  const envObjects = base.envObjects
    .map((obj) => scaleEnvObject(obj, balanceCurve))
    .filter((obj): obj is EnvObject => Boolean(obj));

  const enemies = reduceEnemies(base.enemies, balanceCurve);
  const worldWidth = Math.max(
    round(base.worldWidth * balanceCurve.gapDistanceMultiplier + balanceCurve.safeLandingWidth * 1.5),
    ...platforms.map((platform) => platform.x + platform.width + 120),
    ...envObjects.map((obj) => obj.x + obj.width + 120),
  );

  const levelDef: LevelDef = {
    ...base,
    worldWidth: Math.max(base.worldWidth, worldWidth),
    platforms,
    envObjects,
    enemies,
    playerStart: {
      x: base.playerStart.x,
      y: base.playerStart.y,
    },
  };

  const checkpoints = buildCheckpoints(levelDef, balanceCurve);
  return {
    levelDef,
    balanceCurve,
    checkpoints,
    assistTier: clamp(Math.floor(deathStreak / 2), 0, 3),
  };
}

export function getRespawnPoint(checkpoints: Checkpoint[], checkpointIndex: number, fallback: Vec2): Vec2 {
  const checkpoint = checkpoints[clamp(checkpointIndex, 0, checkpoints.length - 1)];
  return checkpoint ? { x: checkpoint.x, y: checkpoint.y } : fallback;
}
