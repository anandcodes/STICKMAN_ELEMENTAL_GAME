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
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);

  // Compute scale to fill screen while preserving aspect ratio
  useEffect(() => {
    const computeScale = () => {
      const scaleX = window.innerWidth / CANVAS_W;
      const scaleY = window.innerHeight / CANVAS_H;
      const s = Math.min(scaleX, scaleY);
      setScale(s);
      scaleRef.current = s;
    };
    computeScale();
    window.addEventListener('resize', computeScale);
    document.addEventListener('fullscreenchange', computeScale);
    return () => {
      window.removeEventListener('resize', computeScale);
      document.removeEventListener('fullscreenchange', computeScale);
    };
  }, []);

  useEffect(() => {
    const mobile = isMobileDevice();
    setIsMobile(mobile);
    isMobileRef.current = mobile;
    touchControlsRef.current.visible = mobile;

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

    const handleScreenTransition = (tx?: number, ty?: number) => {
      const s = stateRef.current;

      if (s.screen === 'menu') {
        if (tx === undefined || ty === undefined) return;

        // Mode Buttons logic (synchronized with renderer coordinates)
        const btnW = 280; const btnH = 80; const gap = 40; const baseY = 320;
        const campX = CANVAS_W / 2 - btnW - gap / 2;
        const waveX = CANVAS_W / 2 + gap / 2;

        // Click Campaign -> Go to Level Select
        if (tx >= campX && tx <= campX + btnW && ty >= baseY && ty <= baseY + btnH) {
          Audio.initAudio();
          Audio.playMenuSelect();
          s.screen = 'levelSelect';
          // Request fullscreen when entering the game
          if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(() => { });
          }
          return;
        }

        // Click Wave Survival -> Start Endless
        if (tx >= waveX && tx <= waveX + btnW && ty >= baseY && ty <= baseY + btnH) {
          const saved = loadSave();
          const newState = createInitialState(15, 0, 3, saved.highScore, saved.difficulty || 'normal');
          newState.screen = 'playing';
          newState.showLevelIntro = true;
          newState.levelIntroTimer = 180;
          stateRef.current = newState;
          Audio.initAudio();
          Audio.playMenuSelect();
          Audio.startMusic(15);
          // Request fullscreen
          if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(() => { });
          }
          return;
        }

        // Bottom Bar: Difficulty + Shop
        const barY = baseY + btnH + 40;
        if (tx < CANVAS_W / 2 && ty >= barY - 20 && ty <= barY + 30) {
          const dict: Record<string, string> = { 'easy': 'normal', 'normal': 'hard', 'hard': 'easy' };
          s.difficulty = (dict[s.difficulty] || 'normal') as any;
          Audio.playMenuSelect();
          return;
        }
        if (tx > CANVAS_W / 2 + 20 && tx < CANVAS_W / 2 + 220 && ty >= barY - 18 && ty <= barY + 22) {
          s.screen = 'shop';
          Audio.playMenuSelect();
          return;
        }
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
        newState.screen = 'menu';
        stateRef.current = newState;
        Audio.playMenuSelect();
        Audio.stopMusic();
        return;
      }

      if (s.screen === 'levelSelect') {
        if (tx === undefined || ty === undefined) return;
        const cardW = 180; const cardH = 120; const gap = 20; const cols = 5;
        const startX = CANVAS_W / 2 - (cols * cardW + (cols - 1) * gap) / 2;
        const startY = 150;

        // Precise hit test - only count clicks within card bounds, not in gaps
        const relX = tx - startX;
        const relY = ty - startY;
        const col = Math.floor(relX / (cardW + gap));
        const row = Math.floor(relY / (cardH + gap));
        // Make sure click is inside the card tile, not the gap
        const localX = relX - col * (cardW + gap);
        const localY = relY - row * (cardH + gap);
        if (col >= 0 && col < cols && row >= 0 && localX >= 0 && localX <= cardW && localY >= 0 && localY <= cardH) {
          const index = row * cols + col;
          if (index >= 0 && index < s.totalLevels) {
            if (index <= s.furthestLevel) {
              const saved = loadSave();
              const newState = createInitialState(index, 0, 3, saved.highScore, saved.difficulty);
              newState.screen = 'playing';
              newState.showLevelIntro = true;
              newState.levelIntroTimer = 180;
              stateRef.current = newState;
              Audio.playMenuSelect();
              Audio.startMusic(index);
              return;
            }
            // Locked level — show selection highlight only
            s.levelSelectionIndex = index;
            Audio.playMenuSelect();
          }
        }
        return;
      }

      s.screen = 'menu';
      Audio.playMenuSelect();
      return;
    }

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

      // If paused, handle pause menu navigation
      if (s.paused) {
        if (keyLower === 'w' || key === 'ArrowUp') {
          s.pauseSelection = Math.max(0, s.pauseSelection - 1);
          Audio.playMenuSelect();
          e.preventDefault();
        } else if (keyLower === 's' || key === 'ArrowDown') {
          s.pauseSelection = Math.min(2, s.pauseSelection + 1);
          Audio.playMenuSelect();
          e.preventDefault();
        } else if (key === 'Enter' || key === ' ') {
          if (s.pauseSelection === 0) {
            // Resume
            s.paused = false;
            Audio.playUnpause();
          } else if (s.pauseSelection === 1) {
            // Restart Level
            const saved = loadSave();
            const newState = createInitialState(s.currentLevel, 0, s.lives, saved.highScore, saved.difficulty);
            newState.screen = 'playing';
            newState.showLevelIntro = true;
            newState.levelIntroTimer = 180;
            stateRef.current = newState;
            Audio.playMenuSelect();
            Audio.startMusic(s.currentLevel);
          } else if (s.pauseSelection === 2) {
            // Quit to Menu
            const saved = loadSave();
            const newState = createInitialState(0, 0, 3, saved.highScore, saved.difficulty);
            newState.screen = 'menu';
            stateRef.current = newState;
            Audio.playMenuSelect();
            Audio.stopMusic();
          }
          e.preventDefault();
        }
        return;
      }

      if (s.screen !== 'playing') {
        // Menu-specific keys
        if (s.screen === 'menu') {
          // [D] Cycle Difficulty
          if (keyLower === 'd') {
            const dict: Record<string, string> = { 'easy': 'normal', 'normal': 'hard', 'hard': 'easy' };
            s.difficulty = (dict[s.difficulty] || 'normal') as any;
            Audio.playMenuSelect();
            return;
          }

          // [1] Go to Level Select
          if (key === '1' || key === 'Enter' || key === ' ') {
            Audio.initAudio();
            Audio.playMenuSelect();
            s.screen = 'levelSelect';
            e.preventDefault();
            return;
          }

          // [2] or [E] Start Wave Survival
          if (key === '2' || keyLower === 'e') {
            const saved = loadSave();
            const newState = createInitialState(15, 0, 3, saved.highScore, saved.difficulty || 'normal');
            newState.screen = 'playing';
            newState.showLevelIntro = true;
            newState.levelIntroTimer = 180;
            stateRef.current = newState;
            Audio.initAudio();
            Audio.playMenuSelect();
            Audio.startMusic(15);
            e.preventDefault();
            return;
          }

          // [U] Upgrade Shop
          if (keyLower === 'u') {
            s.screen = 'shop';
            Audio.playMenuSelect();
            return;
          }
          return;
        }

        // Level Select Screen Interactions
        if (s.screen === 'levelSelect') {
          if (key === 'Escape' || keyLower === 'b') {
            s.screen = 'menu';
            Audio.playMenuSelect();
            return;
          }

          const cols = 5;
          if (key === 'ArrowRight' || keyLower === 'd') {
            s.levelSelectionIndex = Math.min(s.totalLevels - 1, s.levelSelectionIndex + 1);
            Audio.playMenuSelect();
          } else if (key === 'ArrowLeft' || keyLower === 'a') {
            s.levelSelectionIndex = Math.max(0, s.levelSelectionIndex - 1);
            Audio.playMenuSelect();
          } else if (key === 'ArrowDown' || keyLower === 's') {
            s.levelSelectionIndex = Math.min(s.totalLevels - 1, s.levelSelectionIndex + cols);
            Audio.playMenuSelect();
          } else if (key === 'ArrowUp' || keyLower === 'w') {
            s.levelSelectionIndex = Math.max(0, s.levelSelectionIndex - cols);
            Audio.playMenuSelect();
          } else if (key === 'Enter' || key === ' ') {
            if (s.levelSelectionIndex <= s.furthestLevel) {
              const saved = loadSave();
              const newState = createInitialState(s.levelSelectionIndex, 0, 3, saved.highScore, saved.difficulty);
              newState.screen = 'playing';
              newState.showLevelIntro = true;
              newState.levelIntroTimer = 180;
              stateRef.current = newState;
              Audio.playMenuSelect();
              Audio.startMusic(s.levelSelectionIndex);
            }
          }
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

        // Other non-playing screens (levelComplete, gameOver, victory)
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
        handleScreenTransition(s.mousePos.x, s.mousePos.y);
        return;
      }

      // Handle pause menu clicks
      if (s.paused) {
        const mx = s.mousePos.x;
        const my = s.mousePos.y;
        for (let i = 0; i < 3; i++) {
          const optionY = CANVAS_H / 2 - 30 + i * 55;
          if (mx > CANVAS_W / 2 - 160 && mx < CANVAS_W / 2 + 160 &&
            my > optionY - 18 && my < optionY + 24) {
            if (i === 0) {
              s.paused = false;
              Audio.playUnpause();
            } else if (i === 1) {
              const saved = loadSave();
              const newState = createInitialState(s.currentLevel, 0, s.lives, saved.highScore, saved.difficulty);
              newState.screen = 'playing';
              newState.showLevelIntro = true;
              newState.levelIntroTimer = 180;
              stateRef.current = newState;
              Audio.playMenuSelect();
              Audio.startMusic(s.currentLevel);
            } else if (i === 2) {
              const saved = loadSave();
              const newState = createInitialState(0, 0, 3, saved.highScore, saved.difficulty);
              newState.screen = 'menu';
              stateRef.current = newState;
              Audio.playMenuSelect();
              Audio.stopMusic();
            }
            return;
          }
        }
        return; // Clicked outside pause menu
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
        // Menu touch handling with proper button hit-testing
        if (s.screen === 'menu') {
          const rect = canvas.getBoundingClientRect();
          const scaleX = CANVAS_W / rect.width;
          const scaleY = CANVAS_H / rect.height;
          const tx = (e.changedTouches[0].clientX - rect.left) * scaleX;
          const ty = (e.changedTouches[0].clientY - rect.top) * scaleY;

          // Button layout matches renderer: btnW=280, btnH=80, gap=40, baseY=320
          const btnW = 280; const btnH = 80; const gap = 40; const baseY = 320;
          const campX = CANVAS_W / 2 - btnW - gap / 2;
          const waveX = CANVAS_W / 2 + gap / 2;

          // Campaign Button -> GO TO LEVEL SELECT
          if (tx >= campX && tx <= campX + btnW && ty >= baseY && ty <= baseY + btnH) {
            Audio.initAudio();
            Audio.playMenuSelect();
            s.screen = 'levelSelect';
            return;
          }

          // Wave Survival Button
          if (tx >= waveX && tx <= waveX + btnW && ty >= baseY && ty <= baseY + btnH) {
            const saved = loadSave();
            const newState = createInitialState(15, 0, 3, saved.highScore, saved.difficulty || 'normal');
            newState.screen = 'playing';
            newState.showLevelIntro = true;
            newState.levelIntroTimer = 180;
            stateRef.current = newState;
            Audio.initAudio();
            Audio.playMenuSelect();
            Audio.startMusic(15);
            return;
          }

          // Difficulty cycle (bottom-left area)
          const barY = baseY + btnH + 40;
          if (tx < CANVAS_W / 2 && ty >= barY - 20 && ty <= barY + 30) {
            const dict: Record<string, string> = { 'easy': 'normal', 'normal': 'hard', 'hard': 'easy' };
            s.difficulty = (dict[s.difficulty] || 'normal') as any;
            Audio.playMenuSelect();
            return;
          }

          // Shop button (bottom-right area)
          if (tx > CANVAS_W / 2 + 20 && tx < CANVAS_W / 2 + 220 && ty >= barY - 18 && ty <= barY + 22) {
            s.screen = 'shop';
            Audio.playMenuSelect();
            return;
          }

          return; // On menu but no button hit
        }

        // Other non-playing screens
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_W / rect.width;
        const scaleY = CANVAS_H / rect.height;
        const tx = (e.changedTouches[0].clientX - rect.left) * scaleX;
        const ty = (e.changedTouches[0].clientY - rect.top) * scaleY;
        handleScreenTransition(tx, ty);
        return;
      }

      // Mobile pause menu touch handling
      if (s.paused) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_W / rect.width;
        const scaleY = CANVAS_H / rect.height;
        const tx = (e.changedTouches[0].clientX - rect.left) * scaleX;
        const ty = (e.changedTouches[0].clientY - rect.top) * scaleY;

        // Check each pause menu option (matches renderer layout: y = H/2 - 30 + i * 55)
        for (let i = 0; i < 3; i++) {
          const optionY = CANVAS_H / 2 - 30 + i * 55;
          if (tx > CANVAS_W / 2 - 160 && tx < CANVAS_W / 2 + 160 &&
            ty > optionY - 18 && ty < optionY + 24) {
            if (i === 0) {
              // Resume
              s.paused = false;
              Audio.playUnpause();
            } else if (i === 1) {
              // Restart Level
              const saved = loadSave();
              const newState = createInitialState(s.currentLevel, 0, s.lives, saved.highScore, saved.difficulty);
              newState.screen = 'playing';
              newState.showLevelIntro = true;
              newState.levelIntroTimer = 180;
              stateRef.current = newState;
              Audio.playMenuSelect();
              Audio.startMusic(s.currentLevel);
            } else if (i === 2) {
              // Quit to Menu
              const saved = loadSave();
              const newState = createInitialState(0, 0, 3, saved.highScore, saved.difficulty);
              newState.screen = 'menu';
              stateRef.current = newState;
              Audio.playMenuSelect();
              Audio.stopMusic();
            }
            return;
          }
        }
        return; // Tapped outside buttons, do nothing
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
        position: 'fixed',
        inset: 0,
        backgroundColor: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        outline: 'none',
        overflow: 'hidden',
        touchAction: 'none',
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
          touchAction: 'none',
          transformOrigin: 'center center',
          transform: `scale(${scale})`,
          imageRendering: 'auto',
        }}
      />
    </div>
  );
}

export default App;

