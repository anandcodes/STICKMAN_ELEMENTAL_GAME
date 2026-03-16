import { createInitialState } from './engine';
import type { Difficulty, GameState } from './types';

function withPlayingIntro(state: GameState): GameState {
  state.screen = 'playing';
  state.showLevelIntro = true;
  state.levelIntroTimer = 180;
  return state;
}

export function buildMenuState(highScore: number, difficulty: Difficulty): GameState {
  const state = createInitialState(0, 0, highScore, difficulty);
  state.screen = 'menu';
  return state;
}

export function buildPlayingState(
  level: number,
  highScore: number,
  difficulty: Difficulty,
  score = 0,
): GameState {
  return withPlayingIntro(createInitialState(level, score, highScore, difficulty));
}

export function buildTutorialState(highScore: number, difficulty: Difficulty): GameState {
  return buildPlayingState(-1, highScore, difficulty, 0);
}

export function buildEndlessState(highScore: number, difficulty: Difficulty): GameState {
  return buildPlayingState(15, highScore, difficulty, 0);
}

export function buildNextLevelState(current: GameState, highScore: number): GameState {
  const state = buildPlayingState(
    current.currentLevel + 1,
    highScore,
    current.difficulty,
    current.score,
  );
  state.totalGemsEver = current.totalGemsEver;
  state.enemiesDefeated = current.enemiesDefeated;
  return state;
}

export function buildRestartLevelState(current: GameState, highScore: number): GameState {
  return withPlayingIntro(createInitialState(
    current.currentLevel,
    0,
    highScore,
    current.difficulty,
    current.deathStreak,
    current.checkpointIndex,
  ));
}
