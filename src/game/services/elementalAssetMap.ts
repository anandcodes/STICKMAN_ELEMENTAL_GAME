import type { Element, Enemy, EnvObject, Platform } from '../types';

type HeroAnimation = 'idle' | 'run' | 'attack' | 'death';
type VisualElement = 'fire' | 'water' | 'earth' | 'air';

export const elementalAssetMap: Record<string, string> = {
  hero_fire_idle: '/assets/stickman-elemental/animated/spritesheets/png/character/hero_fire_idle.png',
  hero_fire_run: '/assets/stickman-elemental/animated/spritesheets/png/character/hero_fire_run.png',
  hero_fire_attack: '/assets/stickman-elemental/animated/spritesheets/png/character/hero_fire_attack.png',
  hero_fire_death: '/assets/stickman-elemental/animated/spritesheets/png/character/hero_fire_death.png',
  hero_water_idle: '/assets/stickman-elemental/animated/spritesheets/png/character/hero_water_idle.png',
  hero_water_run: '/assets/stickman-elemental/animated/spritesheets/png/character/hero_water_run.png',
  hero_water_attack: '/assets/stickman-elemental/animated/spritesheets/png/character/hero_water_attack.png',
  hero_water_death: '/assets/stickman-elemental/animated/spritesheets/png/character/hero_water_death.png',
  hero_earth_idle: '/assets/stickman-elemental/animated/spritesheets/png/character/hero_earth_idle.png',
  hero_earth_run: '/assets/stickman-elemental/animated/spritesheets/png/character/hero_earth_run.png',
  hero_earth_attack: '/assets/stickman-elemental/animated/spritesheets/png/character/hero_earth_attack.png',
  hero_earth_death: '/assets/stickman-elemental/animated/spritesheets/png/character/hero_earth_death.png',
  hero_air_idle: '/assets/stickman-elemental/animated/spritesheets/png/character/hero_air_idle.png',
  hero_air_run: '/assets/stickman-elemental/animated/spritesheets/png/character/hero_air_run.png',
  hero_air_attack: '/assets/stickman-elemental/animated/spritesheets/png/character/hero_air_attack.png',
  hero_air_death: '/assets/stickman-elemental/animated/spritesheets/png/character/hero_air_death.png',
  monster_fire_imp: '/assets/stickman-elemental/images/monsters/monster_fire_imp.svg',
  monster_water_slime: '/assets/stickman-elemental/images/monsters/monster_water_slime.svg',
  monster_earth_brute: '/assets/stickman-elemental/images/monsters/monster_earth_brute.svg',
  monster_air_wisp: '/assets/stickman-elemental/images/monsters/monster_air_wisp.svg',
  monster_void_hunter: '/assets/stickman-elemental/images/monsters/monster_void_hunter.svg',
  env_platform_stone: '/assets/stickman-elemental/images/environment/platform_stone.svg',
  env_platform_lava: '/assets/stickman-elemental/images/environment/platform_lava.svg',
  env_platform_water: '/assets/stickman-elemental/images/environment/platform_water.svg',
  env_platform_cloud: '/assets/stickman-elemental/images/environment/platform_cloud.svg',
  env_totem_fire: '/assets/stickman-elemental/images/environment/totem_fire.svg',
  env_totem_water: '/assets/stickman-elemental/images/environment/totem_water.svg',
  env_totem_earth: '/assets/stickman-elemental/images/environment/totem_earth.svg',
  env_totem_air: '/assets/stickman-elemental/images/environment/totem_air.svg',
  projectile_fire: '/assets/stickman-elemental/images/effects/projectile_fire.svg',
  projectile_water: '/assets/stickman-elemental/images/effects/projectile_water.svg',
  projectile_earth: '/assets/stickman-elemental/images/effects/projectile_earth.svg',
  projectile_air: '/assets/stickman-elemental/images/effects/projectile_air.svg',
};

function mapElement(element: Element): VisualElement {
  if (element === 'wind') {
    return 'air';
  }
  return element;
}

export function getHeroAnimationAssetKey(element: Element, animation: HeroAnimation): string {
  return `hero_${mapElement(element)}_${animation}`;
}

export function getProjectileAssetKey(element: Element): string {
  return `projectile_${mapElement(element)}`;
}

export function getEnemyAssetKey(type: Enemy['type']): string | undefined {
  switch (type) {
    case 'slime':
    case 'ice_spirit':
      return 'monster_water_slime';
    case 'golem':
    case 'tree_guardian':
      return 'monster_earth_brute';
    case 'fire_spirit':
    case 'lava_crab':
      return 'monster_fire_imp';
    case 'bat':
    case 'thunder_hawk':
      return 'monster_air_wisp';
    case 'shadow_wolf':
    case 'corrupted_wraith':
    case 'void_brute':
    case 'void_titan':
      return 'monster_void_hunter';
    default:
      return undefined;
  }
}

export function getPlatformAssetKey(type: Platform['type']): string {
  switch (type) {
    case 'ice':
      return 'env_platform_water';
    case 'earth':
      return 'env_platform_lava';
    case 'ground':
    case 'stone':
    default:
      return 'env_platform_stone';
  }
}

export function getEnvObjectAssetKey(type: EnvObject['type']): string | undefined {
  switch (type) {
    case 'rock':
      return 'env_platform_stone';
    case 'ice':
      return 'env_platform_water';
    case 'moving_platform':
      return 'env_platform_cloud';
    case 'fire_pit':
    case 'magma_pool':
      return 'env_totem_fire';
    case 'puddle':
    case 'water_current':
      return 'env_totem_water';
    case 'plant':
    case 'vine':
      return 'env_totem_earth';
    case 'wind_zone':
    case 'dust_devil':
    case 'steam_cloud':
      return 'env_totem_air';
    default:
      return undefined;
  }
}
