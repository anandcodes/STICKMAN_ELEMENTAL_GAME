export type Element = 'fire' | 'water' | 'earth' | 'wind';
export type GameScreen = 'menu' | 'playing' | 'levelComplete' | 'gameOver' | 'victory';

export interface Vec2 { x: number; y: number; }

export interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; element: Element;
  size: number; color: string;
}

export interface Projectile {
  x: number; y: number; vx: number; vy: number;
  element: Element; life: number; size: number;
}

export interface EnvObject {
  id: number;
  type: 'crate' | 'ice' | 'plant' | 'rock' | 'puddle' | 'fire_pit' | 'gem' | 'health_potion' | 'mana_crystal' | 'portal' | 'spike' | 'moving_platform';
  x: number; y: number; width: number; height: number;
  health: number; maxHealth: number;
  state: 'normal' | 'burning' | 'frozen' | 'grown' | 'destroyed' | 'melted' | 'extinguished' | 'collected' | 'active';
  solid: boolean;
  growthLevel?: number;
  vx?: number; vy?: number;
  moveRange?: number; moveOriginX?: number; moveOriginY?: number;
  gemColor?: string;
}

export interface Enemy {
  id: number;
  type: 'slime' | 'bat' | 'golem' | 'fire_spirit' | 'ice_spirit';
  x: number; y: number; width: number; height: number;
  vx: number; vy: number;
  health: number; maxHealth: number;
  facing: 1 | -1;
  weakness: Element;
  resistance: Element;
  state: 'patrol' | 'chase' | 'hurt' | 'dead';
  hurtTimer: number;
  patrolRange: number;
  originX: number;
  animTimer: number;
  damage: number;
  speed: number;
}

export interface Platform {
  x: number; y: number; width: number; height: number;
  type: 'ground' | 'stone' | 'ice' | 'earth';
  melting?: boolean; meltTimer?: number;
}

export interface Stickman {
  x: number; y: number; vx: number; vy: number;
  width: number; height: number;
  onGround: boolean; facing: 1 | -1;
  animFrame: number; animTimer: number;
  walking: boolean; jumping: boolean;
  casting: boolean; castTimer: number;
  health: number; maxHealth: number;
  mana: number; maxMana: number;
  invincibleTimer: number;
}

export interface LevelDef {
  name: string;
  subtitle: string;
  worldWidth: number;
  worldHeight: number;
  bgColors: [string, string, string, string];
  platforms: Platform[];
  envObjects: EnvObject[];
  enemies: Enemy[];
  playerStart: Vec2;
  gemsRequired: number;
  totalGems: number;
  elementHint: string;
  timeLimit: number; // seconds, 0 = no limit
}

export interface GameState {
  screen: GameScreen;
  currentLevel: number;
  totalLevels: number;
  stickman: Stickman;
  platforms: Platform[];
  envObjects: EnvObject[];
  enemies: Enemy[];
  projectiles: Projectile[];
  particles: Particle[];
  selectedElement: Element;
  unlockedElements: Element[];
  camera: Vec2;
  worldWidth: number;
  worldHeight: number;
  score: number;
  lives: number;
  gemsCollected: number;
  gemsRequired: number;
  totalGems: number;
  keys: Set<string>;
  mousePos: Vec2;
  mouseDown: boolean;
  castCooldown: number;
  wind: { active: boolean; direction: number; timer: number };
  backgroundStars: { x: number; y: number; size: number; twinkle: number }[];
  bgColors: [string, string, string, string];
  levelTimer: number; // frames remaining
  portalOpen: boolean;
  screenTimer: number; // for transition screens
  levelName: string;
  levelSubtitle: string;
  elementHint: string;
  showLevelIntro: boolean;
  levelIntroTimer: number;
  comboCount: number;
  comboTimer: number;
  highScore: number;
  totalGemsEver: number;
  enemiesDefeated: number;
}
