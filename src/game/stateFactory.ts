import { createInitialState } from './engine';
import type { Difficulty, GameState } from './types';

function withPlayingIntro(state: GameState): GameState {
  state.screen = 'playing';
  state.showLevelIntro = true;
  state.levelIntroTimer = 180;
  return state;
}

export function buildMenuState(highScore: number, difficulty: Difficulty): GameState {
  const state = createInitialState(0, 0, 3, highScore, difficulty);
  state.screen = 'menu';
  return state;
}

export function buildPlayingState(
  level: number,
  highScore: number,
  difficulty: Difficulty,
  score = 0,
  lives = 3,
): GameState {
  return withPlayingIntro(createInitialState(level, score, lives, highScore, difficulty));
}

export function buildEndlessState(highScore: number, difficulty: Difficulty): GameState {
  return buildPlayingState(15, highScore, difficulty, 0, 3);
}

export function buildNextLevelState(current: GameState, highScore: number): GameState {
  const state = buildPlayingState(
    current.currentLevel + 1,
    highScore,
    current.difficulty,
    current.score,
    current.lives,
  );
  state.totalGemsEver = current.totalGemsEver;
  state.enemiesDefeated = current.enemiesDefeated;
  return state;
}

export function buildRestartLevelState(current: GameState, highScore: number): GameState {
  return buildPlayingState(current.currentLevel, highScore, current.difficulty, 0, current.lives);
}
