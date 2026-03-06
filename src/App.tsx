import { useEffect, useRef } from 'react';
import { createInitialState, update } from './game/engine';
import { render } from './game/renderer';
import type { Element, GameState } from './game/types';
import { TOTAL_LEVELS } from './game/levels';

const CANVAS_W = 1200;
const CANVAS_H = 700;

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<GameState>(createInitialState());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    containerRef.current?.focus();

    const handleScreenTransition = () => {
      const s = stateRef.current;

      if (s.screen === 'menu') {
        // Start game
        s.screen = 'playing';
        s.showLevelIntro = true;
        s.levelIntroTimer = 180;
        return;
      }

      if (s.screen === 'levelComplete') {
        const nextLevel = s.currentLevel + 1;
        if (nextLevel >= TOTAL_LEVELS) {
          // Victory!
          s.screen = 'victory';
          s.screenTimer = 0;
        } else {
          // Next level - carry over score, lives, highScore
          const newState = createInitialState(nextLevel, s.score, s.lives, s.highScore);
          newState.screen = 'playing';
          newState.showLevelIntro = true;
          newState.levelIntroTimer = 180;
          newState.totalGemsEver = s.totalGemsEver;
          newState.enemiesDefeated = s.enemiesDefeated;
          stateRef.current = newState;
        }
        return;
      }

      if (s.screen === 'gameOver' || s.screen === 'victory') {
        // Restart from beginning
        const newState = createInitialState(0, 0, 3, s.highScore);
        newState.screen = 'playing';
        newState.showLevelIntro = true;
        newState.levelIntroTimer = 180;
        stateRef.current = newState;
        return;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      const key = e.key;
      const keyLower = key.toLowerCase();

      // Screen transitions
      if (s.screen !== 'playing' && (key === 'Enter' || key === ' ')) {
        e.preventDefault();
        handleScreenTransition();
        return;
      }

      // Skip intro
      if (s.showLevelIntro && (key === 'Enter' || key === ' ')) {
        s.showLevelIntro = false;
        s.levelIntroTimer = 0;
        e.preventDefault();
        return;
      }

      s.keys.add(keyLower);

      // Element switching
      const elementMap: Record<string, Element> = {
        '1': 'fire', '2': 'water', '3': 'earth', '4': 'wind',
      };
      if (elementMap[key] && s.unlockedElements.includes(elementMap[key])) {
        s.selectedElement = elementMap[key];
      }

      const gameKeys = ['w', 'a', 's', 'd', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
      if (gameKeys.includes(keyLower)) e.preventDefault();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      stateRef.current.keys.delete(e.key.toLowerCase());
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      stateRef.current.mousePos = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      const s = stateRef.current;

      if (s.screen !== 'playing') {
        handleScreenTransition();
        return;
      }

      s.mouseDown = true;
      containerRef.current?.focus();
    };

    const onMouseUp = () => {
      stateRef.current.mouseDown = false;
    };

    const onBlur = () => {
      stateRef.current.keys.clear();
      stateRef.current.mouseDown = false;
    };

    // Touch support
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const s = stateRef.current;

      if (s.screen !== 'playing') {
        handleScreenTransition();
        return;
      }

      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      s.mousePos = {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
      s.mouseDown = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      stateRef.current.mousePos = {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      stateRef.current.mouseDown = false;
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    let animId: number;
    const gameLoop = () => {
      const currentState = stateRef.current;
      update(currentState);
      render(ctx, currentState, CANVAS_W, CANVAS_H);
      animId = requestAnimationFrame(gameLoop);
    };
    animId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animId);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-2 select-none outline-none"
    >
      <div className="relative rounded-lg overflow-hidden shadow-2xl shadow-purple-900/30 border border-gray-800">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="block cursor-crosshair"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2 justify-center items-center">
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-900 px-3 py-2 rounded-lg border border-gray-800">
          <span className="text-yellow-500">💡</span>
          <span>
            <strong className="text-gray-300">WASD/Arrows:</strong> Move |{' '}
            <strong className="text-red-400">1:🔥</strong>{' '}
            <strong className="text-blue-400">2:💧</strong>{' '}
            <strong className="text-green-400">3:🌿</strong>{' '}
            <strong className="text-cyan-300">4:🌪️</strong> |{' '}
            <strong className="text-gray-300">Click:</strong> Cast
          </span>
        </div>
      </div>
    </div>
  );
}

export default App;
