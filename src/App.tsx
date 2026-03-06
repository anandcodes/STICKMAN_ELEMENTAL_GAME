import { useEffect, useRef, useState } from 'react';
import { createInitialState, update, loadSave, DIFFICULTY_SETTINGS, saveProgress } from './game/engine';
import { render } from './game/renderer';
import type { Element, GameState } from './game/types';
import { TOTAL_LEVELS } from './game/levels';
import * as Audio from './game/audio';
import {
  createTouchControlsState,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  renderTouchControls,
  isMobileDevice,
  type TouchControlsState,
} from './game/touchControls';

const CANVAS_W = 1200;
const CANVAS_H = 700;

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialSave = loadSave();
  const stateRef = useRef<GameState>(createInitialState(0, 0, 3, initialSave.highScore, initialSave.difficulty || 'normal'));
  const touchControlsRef = useRef<TouchControlsState>(createTouchControlsState(CANVAS_W, CANVAS_H));
  const [isMobile, setIsMobile] = useState(false);
  const isMobileRef = useRef(false);

  useEffect(() => {
    const mobile = isMobileDevice();
    setIsMobile(mobile);
    isMobileRef.current = mobile;
    touchControlsRef.current.visible = mobile;

    // Fallback: if touch event fires but we didn't detect mobile, enable touch controls
    const enableTouchOnFirst = () => {
      if (!isMobileRef.current) {
        isMobileRef.current = true;
        setIsMobile(true);
        touchControlsRef.current.visible = true;
      }
      window.removeEventListener('touchstart', enableTouchOnFirst);
    };
    if (!mobile) {
      window.addEventListener('touchstart', enableTouchOnFirst, { once: true });
    }

    return () => {
      window.removeEventListener('touchstart', enableTouchOnFirst);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    containerRef.current?.focus();

    const handleScreenTransition = () => {
      const s = stateRef.current;

      if (s.screen === 'menu') {
        Audio.initAudio();
        Audio.playMenuSelect();
        s.screen = 'playing';
        s.showLevelIntro = true;
        s.levelIntroTimer = 180;
        Audio.startMusic(s.currentLevel);
        return;
      }

      if (s.screen === 'levelComplete') {
        const nextLevel = s.currentLevel + 1;
        if (nextLevel >= TOTAL_LEVELS) {
          s.screen = 'victory';
          s.screenTimer = 0;
        } else {
          const saved = loadSave();
          const newState = createInitialState(nextLevel, s.score, s.lives, saved.highScore, saved.difficulty);
          newState.screen = 'playing';
          newState.showLevelIntro = true;
          newState.levelIntroTimer = 180;
          newState.totalGemsEver = s.totalGemsEver;
          newState.enemiesDefeated = s.enemiesDefeated;
          stateRef.current = newState;
          Audio.startMusic(nextLevel);
        }
        return;
      }

      if (s.screen === 'gameOver' || s.screen === 'victory') {
        const saved = loadSave();
        const newState = createInitialState(0, 0, 3, saved.highScore, saved.difficulty);
        newState.screen = 'playing';
        newState.showLevelIntro = true;
        newState.levelIntroTimer = 180;
        stateRef.current = newState;
        Audio.playMenuSelect();
        Audio.startMusic(0);
        return;
      }

      if (s.screen === 'shop') {
        s.screen = 'menu';
        Audio.playMenuSelect();
        return;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      const key = e.key;
      const keyLower = key.toLowerCase();

      // IMP-1: Pause toggle
      if (key === 'Escape' && s.screen === 'playing' && !s.showLevelIntro) {
        s.paused = !s.paused;
        if (s.paused) Audio.playPause(); else Audio.playUnpause();
        e.preventDefault();
        return;
      }

      // If paused, only allow unpause
      if (s.paused) {
        if (key === 'Enter' || key === ' ') {
          s.paused = false;
          e.preventDefault();
        }
        return;
      }

      if (s.screen !== 'playing') {
        // IMP-14: Change difficulty on Menu
        if (s.screen === 'menu' && keyLower === 'd') {
          const dict: Record<string, string> = { 'easy': 'normal', 'normal': 'hard', 'hard': 'easy' };
          s.difficulty = (dict[s.difficulty] || 'normal') as any;
          Audio.playMenuSelect();
          return;
        }

        // Endless Arena Trigger
        if (s.screen === 'menu' && keyLower === 'e') {
          const saved = loadSave();
          const newState = createInitialState(10, 0, 3, saved.highScore, saved.difficulty || 'normal');
          newState.screen = 'playing';
          newState.showLevelIntro = true;
          newState.levelIntroTimer = 180;
          stateRef.current = newState;
          Audio.initAudio();
          Audio.playMenuSelect();
          Audio.startMusic(10);
          return;
        }

        // Shop Screen Trigger
        if (s.screen === 'menu' && keyLower === 'u') {
          s.screen = 'shop';
          Audio.playMenuSelect();
          return;
        }

        // Shop Screen Interactions
        if (s.screen === 'shop') {
          if (key === 'Escape' || keyLower === 'b') {
            s.screen = 'menu';
            Audio.playMenuSelect();
            return;
          }

          let bought = false;
          // Upgrade Costs Logic
          const costHealth = (s.upgrades.healthLevel + 1) * 30;
          const costMana = (s.upgrades.manaLevel + 1) * 30;
          const costRegen = (s.upgrades.regenLevel + 1) * 50;
          const costDamage = (s.upgrades.damageLevel + 1) * 60;

          if (key === '1' && s.gemsCurrency >= costHealth && s.upgrades.healthLevel < 5) {
            s.gemsCurrency -= costHealth; s.upgrades.healthLevel++; bought = true;
          }
          if (key === '2' && s.gemsCurrency >= costMana && s.upgrades.manaLevel < 5) {
            s.gemsCurrency -= costMana; s.upgrades.manaLevel++; bought = true;
          }
          if (key === '3' && s.gemsCurrency >= costRegen && s.upgrades.regenLevel < 5) {
            s.gemsCurrency -= costRegen; s.upgrades.regenLevel++; bought = true;
          }
          if (key === '4' && s.gemsCurrency >= costDamage && s.upgrades.damageLevel < 5) {
            s.gemsCurrency -= costDamage; s.upgrades.damageLevel++; bought = true;
          }

          if (bought) {
            Audio.playGemCollect();
            saveProgress(s);
            const ds = DIFFICULTY_SETTINGS[s.difficulty];
            s.stickman.maxHealth = ds.playerHealth + s.upgrades.healthLevel * 25;
            s.stickman.maxMana = ds.playerMana + s.upgrades.manaLevel * 25;
            s.stickman.health = s.stickman.maxHealth;
            s.stickman.mana = s.stickman.maxMana;
          }
          return;
        }

        if (key === 'Enter' || key === ' ') {
          e.preventDefault();
          handleScreenTransition();
        }
        return;
      }

      if (s.showLevelIntro && (key === 'Enter' || key === ' ')) {
        s.showLevelIntro = false;
        s.levelIntroTimer = 0;
        e.preventDefault();
        return;
      }

      s.keys.add(keyLower);

      const elementMap: Record<string, Element> = {
        '1': 'fire', '2': 'water', '3': 'earth', '4': 'wind',
      };
      if (elementMap[key] && s.unlockedElements.includes(elementMap[key])) {
        s.selectedElement = elementMap[key];
        Audio.playElementSwitch();
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
      // Auto-pause when losing focus
      if (stateRef.current.screen === 'playing' && !stateRef.current.showLevelIntro) {
        stateRef.current.paused = true;
      }
    };

    // Touch support - full mobile controls
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const s = stateRef.current;
      const controls = touchControlsRef.current;

      if (s.screen === 'shop') {
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_W / rect.width;
        const scaleY = CANVAS_H / rect.height;
        const tx = (e.changedTouches[0].clientX - rect.left) * scaleX;
        const ty = (e.changedTouches[0].clientY - rect.top) * scaleY;

        // Check Back Button (roughly W/2 - 60, H - 70, 120x40)
        if (tx > CANVAS_W / 2 - 80 && tx < CANVAS_W / 2 + 80 && ty > CANVAS_H - 90 && ty < CANVAS_H - 10) {
          s.screen = 'menu';
          Audio.playMenuSelect();
          return;
        }

        // Check Upgrade Rows (startY = 220, spacing = 100)
        const startY = 220;
        const spacing = 100;
        for (let i = 0; i < 4; i++) {
          const rowY = startY + i * spacing;
          if (ty > rowY - 30 && ty < rowY + 30) {
            // Replicate shop buy logic
            const key = (i + 1).toString();
            let bought = false;
            const costHealth = (s.upgrades.healthLevel + 1) * 30;
            const costMana = (s.upgrades.manaLevel + 1) * 30;
            const costRegen = (s.upgrades.regenLevel + 1) * 50;
            const costDamage = (s.upgrades.damageLevel + 1) * 60;

            if (key === '1' && s.gemsCurrency >= costHealth && s.upgrades.healthLevel < 5) {
              s.gemsCurrency -= costHealth; s.upgrades.healthLevel++; bought = true;
            } else if (key === '2' && s.gemsCurrency >= costMana && s.upgrades.manaLevel < 5) {
              s.gemsCurrency -= costMana; s.upgrades.manaLevel++; bought = true;
            } else if (key === '3' && s.gemsCurrency >= costRegen && s.upgrades.regenLevel < 5) {
              s.gemsCurrency -= costRegen; s.upgrades.regenLevel++; bought = true;
            } else if (key === '4' && s.gemsCurrency >= costDamage && s.upgrades.damageLevel < 5) {
              s.gemsCurrency -= costDamage; s.upgrades.damageLevel++; bought = true;
            }

            if (bought) {
              Audio.playGemCollect();
              saveProgress(s);
              const ds = DIFFICULTY_SETTINGS[s.difficulty];
              s.stickman.maxHealth = ds.playerHealth + s.upgrades.healthLevel * 25;
              s.stickman.maxMana = ds.playerMana + s.upgrades.manaLevel * 25;
              s.stickman.health = s.stickman.maxHealth;
              s.stickman.mana = s.stickman.maxMana;
            }
            return;
          }
        }
        return;
      }

      if (s.screen !== 'playing') {
        // Special case: Menu taps
        if (s.screen === 'menu') {
          const rect = canvas.getBoundingClientRect();
          const scaleX = CANVAS_W / rect.width;
          const scaleY = CANVAS_H / rect.height;
          const tx = (e.changedTouches[0].clientX - rect.left) * scaleX;
          const ty = (e.changedTouches[0].clientY - rect.top) * scaleY;

          // Tap right side for Endless, Left for Level 1, or just trigger transition
          if (ty > 450) {
            if (tx > CANVAS_W / 2 + 50) {
              // Manual Trigger for Endless on Tap
              const saved = loadSave();
              const newState = createInitialState(10, 0, 3, saved.highScore, saved.difficulty || 'normal');
              newState.screen = 'playing';
              newState.endlessWave = 1; newState.endlessKills = 0; newState.endlessTimer = 0;
              stateRef.current = newState;
              Audio.playMenuSelect(); Audio.startMusic(10);
              return;
            }
            if (tx < CANVAS_W / 2 - 150) {
              s.screen = 'shop'; Audio.playMenuSelect(); return;
            }
          }
        }
        handleScreenTransition();
        return;
      }

      // Tap to unpause on mobile
      if (s.paused) {
        s.paused = false;
        return;
      }

      // Skip intro on tap
      if (s.showLevelIntro) {
        s.showLevelIntro = false;
        s.levelIntroTimer = 0;
        return;
      }

      const newTouches = Array.from(e.changedTouches);
      handleTouchStart(newTouches, controls, s, canvas, CANVAS_W, CANVAS_H);
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const controls = touchControlsRef.current;
      const changedTouches = Array.from(e.changedTouches);
      handleTouchMove(changedTouches, controls, stateRef.current, canvas, CANVAS_W, CANVAS_H);
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      const controls = touchControlsRef.current;
      const endedTouches = Array.from(e.changedTouches);
      handleTouchEnd(endedTouches, controls, stateRef.current);
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
      render(ctx, currentState, CANVAS_W, CANVAS_H, isMobileRef.current);

      // Render touch controls on top
      if (touchControlsRef.current.visible && currentState.screen === 'playing' && !currentState.showLevelIntro) {
        renderTouchControls(ctx, touchControlsRef.current, currentState, CANVAS_W, CANVAS_H);
      }

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
      id="game-container"
      style={{
        minHeight: '100dvh',
        width: '100vw',
        backgroundColor: '#050510',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0',
        userSelect: 'none',
        outline: 'none',
        overflow: 'hidden',
        touchAction: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100vw',
          height: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          id="game-canvas"
          style={{
            display: 'block',
            cursor: isMobile ? 'default' : 'crosshair',
            maxWidth: '100%',
            maxHeight: '100%',
            width: 'auto',
            height: 'auto',
            aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
            objectFit: 'contain',
            touchAction: 'none',
            boxShadow: isMobile ? 'none' : '0 0 50px rgba(0,0,0,0.5)',
          }}
        />
      </div>

      {/* Desktop controls hint - hidden on mobile */}
      {!isMobile && (
        <div
          style={{
            marginTop: '12px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: '#666',
              backgroundColor: '#111',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #222',
            }}
          >
            <span style={{ color: '#eab308' }}>💡</span>
            <span>
              <strong style={{ color: '#d1d5db' }}>WASD/Arrows:</strong> Move |{' '}
              <strong style={{ color: '#ef4444' }}>1:🔥</strong>{' '}
              <strong style={{ color: '#3b82f6' }}>2:💧</strong>{' '}
              <strong style={{ color: '#22c55e' }}>3:🌿</strong>{' '}
              <strong style={{ color: '#67e8f9' }}>4:🌪️</strong> |{' '}
              <strong style={{ color: '#d1d5db' }}>Click:</strong> Cast
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
