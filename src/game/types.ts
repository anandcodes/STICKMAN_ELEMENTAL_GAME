export type Element = 'fire' | 'water' | 'earth' | 'wind';
export type GameScreen = 'menu' | 'levelSelect' | 'playing' | 'levelComplete' | 'gameOver' | 'victory' | 'shop' | 'challenges' | 'survivalDifficulty' | 'relicSelection' | 'settings';
export type Difficulty = 'easy' | 'normal' | 'hard' | 'insane';
export type ShopTab = 'upgrades' | 'skins' | 'powerups' | 'currency' | 'special' | 'relics';
export type Locale = 'en' | 'hi';
export type GraphicsQuality = 'low' | 'medium' | 'high';
export type KeyboardLayout = 'wasd' | 'arrows' | 'both';
export type RelicType = 'burning_soul' | 'storm_crown' | 'earth_heart' | 'sea_blessing' | 'vitality_core' | 'mana_flux' | 'berserker_blood' | 'static_static';

export interface Relic {
  type: RelicType;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'legendary';
}

export interface Vec2 { x: number; y: number; }

export interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; element: Element;
  size: number; color: string;
}

export interface Projectile {
  x: number; y: number; vx: number; vy: number;
  element: Element; life: number; size: number;
  isEnemy?: boolean;
}

export interface EnvObject {
  id: number;
  type: 'crate' | 'ice' | 'plant' | 'rock' | 'puddle' | 'fire_pit' | 'gem' | 'health_potion' | 'mana_crystal' | 'portal' | 'spike' | 'moving_platform' | 'vine' | 'wind_zone' | 'water_current' | 'synergy_zone' | 'magma_pool' | 'mud_trap' | 'steam_cloud' | 'dust_devil' | 'lore_tome' | 'anti_gravity_zone' | 'corrupted_crystal';
  x: number; y: number; width: number; height: number;
  health: number; maxHealth: number;
  state: 'normal' | 'burning' | 'frozen' | 'grown' | 'destroyed' | 'melted' | 'extinguished' | 'collected' | 'active' | 'magma' | 'mud' | 'lightning' | 'steam' | 'sand';
  solid: boolean;
  growthLevel?: number;
  vx?: number; vy?: number;
  moveRange?: number; moveOriginX?: number; moveOriginY?: number;
  gemColor?: string;
  windDirection?: number; // for wind_zone: -1 left, 1 right
  windStrength?: number;  // for wind_zone
  currentSpeed?: number;  // for water_current
  dialogue?: DialogNode[]; // for lore_tome
  energyTimer?: number; // for corrupted_crystal pulse
}

export interface Enemy {
  id: number;
  type: 'slime' | 'bat' | 'golem' | 'fire_spirit' | 'ice_spirit' | 'boss1' | 'boss2' | 'tree_guardian' | 'shadow_wolf' | 'lava_crab' | 'thunder_hawk' | 'corrupted_wraith' | 'void_brute' | 'void_titan';
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
  onGround?: boolean;   // Added for slime jumping etc
  attackTimer?: number; // For boss attacks
  chargeTimer?: number; // For brute dashes
  phase?: number;       // For boss phases
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
  jumpsUsed: number;
  jumpBufferTimer: number;
  coyoteTimer: number;
  animFrame: number; animTimer: number;
  walking: boolean; jumping: boolean;
  casting: boolean; castTimer: number;
  health: number; maxHealth: number;
  mana: number; maxMana: number;
  invincibleTimer: number;
  dashCooldown: number;
  dashTimer: number;
  isDashing: boolean;
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

export interface FloatingText {
  x: number; y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export interface Upgrades {
  healthLevel: number;
  manaLevel: number;
  regenLevel: number;
  damageLevel: number;
  doubleJumpLevel: number;
  dashDistanceLevel: number;
}

export interface SaveData {
  version?: number;
  integrity?: string;
  highScore: number;
  furthestLevel: number;
  totalGemsEver: number;
  gemsCurrency: number;
  totalEnemiesDefeated: number;
  difficulty?: Difficulty;
  upgrades: Upgrades;
  bestTimes: Record<number, number>; // level index -> time in frames
  hapticsEnabled: boolean;
  graphicsQuality: GraphicsQuality;
}
export interface DifficultySettings {
  playerHealth: number;
  playerMana: number;
  enemyDamageMult: number;
  enemySpeedMult: number;
  manaRegenRate: number;
  label: string;
  color: string;
}

export interface TutorialHint {
  x: number; y: number; // world position
  text: string;
  triggered: boolean;
  triggerRadius: number;
}

export type TutorialAction =
  | 'move_right'
  | 'move_left'
  | 'jump'
  | 'jump_platform'
  | 'switch_fire'
  | 'cast_fire'
  | 'burn_crate'
  | 'collect_gem'
  | 'dash'
  | 'dash_through'
  | 'switch_water'
  | 'cast_water'
  | 'grow_plant'
  | 'reach_portal'
  | 'none';

export interface TutorialStep {
  action: TutorialAction;
  promptDesktop: string;
  promptMobile: string;
  worldX?: number;        // optional world position for arrow indicator
  worldY?: number;
  triggerRadius?: number; // how close to get for position-based steps
  element?: Element;      // required element for element steps
  completed: boolean;
  showArrow: boolean;     // show directional arrow to target
}

export interface DialogNode {
  speaker: string;
  text: string;
  portrait?: string; // Optional element icon name or specific color
}

export interface GameSettings {
  version?: number;
  locale: Locale;
  graphicsQuality: GraphicsQuality;
  textScale: number;
  hapticsEnabled: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  keyboardLayout: KeyboardLayout;
  autoPauseOnBlur: boolean;
  muteAll: boolean;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  controlsScale: number;
  aimToShoot: boolean;
}

export interface GameState {
  screen: GameScreen;
  currentLevel: number;
  furthestLevel: number;
  levelSelectionIndex: number;
  selectedMenuButton: number;
  shopSelectionIndex: number;
  shopTab: ShopTab;
  totalLevels: number;
  stickman: Stickman;
  platforms: Platform[];
  envObjects: EnvObject[];
  enemies: Enemy[];
  endlessWave?: number;
  endlessKills?: number;
  endlessTimer?: number;
  projectiles: Projectile[];
  particles: Particle[];
  selectedElement: Element;
  unlockedElements: Element[];
  camera: Vec2;
  worldWidth: number;
  worldHeight: number;
  score: number;
  gemsCollected: number;
  gemsRequired: number;
  totalGems: number;
  keys: Set<string>;
  mousePos: Vec2;
  mouseDown: boolean;
  isAiming?: boolean;   // Current aiming state
  aimAngle?: number;    // Current aim direction
  castCooldown: number;
  wind: { active: boolean; direction: number; timer: number };
  backgroundStars: { x: number; y: number; size: number; twinkle: number; speed?: number }[];
  bgColors: [string, string, string, string];
  levelTimer: number; // frames remaining
  portalOpen: boolean;
  screenTimer: number; // for transition screens
  levelName: string;
  levelSubtitle: string;
  elementHint: string;
  showLevelIntro: boolean;
  levelIntroTimer: number;
  activeDialog: DialogNode[];
  dialogCharIndex: number; // for typewriter effect
  comboCount: number;
  comboTimer: number;
  highScore: number;
  totalGemsEver: number;
  gemsCurrency: number;
  enemiesDefeated: number;
  paused: boolean;
  screenShake: number; // frames remaining
  floatingTexts: FloatingText[];
  difficulty: Difficulty;
  upgrades: Upgrades;
  onIce: boolean; // IMP-10: currently standing on ice
  tutorialHints: TutorialHint[];
  tutorialSteps: TutorialStep[];
  tutorialStepIndex: number;
  tutorialActive: boolean;
  redFlash: number; // frames for damage flash
  pauseSelection: number; // 0=Resume, 1=Restart, 2=Quit
  bestTimes: Record<number, number>;
  timeElapsed: number; // frames since level start
  locale: Locale;
  graphicsQuality: GraphicsQuality;
  textScale: number;
  hapticsEnabled: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  controlsScale: number;
  aimToShoot: boolean;
  onDamage?: () => void;
  deathAnimTimer: number;
  deathType?: 'fall' | 'enemy' | 'spike';
  activeRelics: Relic[];
  relicChoices: Relic[];
  trialActive: boolean;
  trialElement?: Element;
  shockwaves: { x: number, y: number, radius: number, life: number, color: string }[];
}
