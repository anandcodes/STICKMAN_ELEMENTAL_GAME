import { useEffect, useRef, useState } from 'react';
import { update, DIFFICULTY_SETTINGS, spawnFloatingText, setEngineCanvasSize } from './game/engine';
import { render } from './game/renderer';
import type { Difficulty, Element, GameSettings, GameState } from './game/types';
import { TOTAL_LEVELS } from './game/levels';
import * as Audio from './game/audio';
import { hydrateSaveFromCloud, loadSave, saveProgress } from './game/persistence';
import { advanceLoopClock, createLoopClock } from './game/loop';
import { initTelemetrySession, trackError } from './game/telemetry';
import { loadSettings, saveSettings } from './game/settings';
import { t } from './game/i18n';
import { refreshRemoteLeaderboard } from './game/services/leaderboard';
import {
  buildEndlessState,
  buildMenuState,
  buildNextLevelState,
  buildPlayingState,
  buildRestartLevelState,
} from './game/stateFactory';
import {
  createTouchControlsState,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  updateTouchControlsLayout,
  renderTouchControls,
  isMobileDevice,
  type TouchControlsState,
} from './game/touchControls';

let CANVAS_W = 1200;
const CANVAS_H = 700;

const DIFFICULTY_CYCLE: Record<Difficulty, Difficulty> = {
  easy: 'normal',
  normal: 'hard',
  hard: 'easy',
};

function applySettingsToState(state: GameState, settings: GameSettings): void {
  state.locale = settings.locale;
  state.graphicsQuality = settings.graphicsQuality;
  state.textScale = settings.textScale;
  state.reducedMotion = settings.reducedMotion;
  state.highContrast = settings.highContrast;
}

function tr(state: GameState, key: Parameters<typeof t>[1], vars?: Record<string, string | number>) {
  return t(state.locale, key, vars);
}

function mapGameplayKey(rawKey: string, settings: GameSettings): string | null {
  const k = rawKey.toLowerCase();
  if (settings.keyboardLayout === 'both') return k;

  if (settings.keyboardLayout === 'wasd') {
    if (k === 'arrowleft' || k === 'arrowright' || k === 'arrowup' || k === 'arrowdown') return null;
    return k;
  }

  if (k === 'a') return 'arrowleft';
  if (k === 'd') return 'arrowright';
  if (k === 'w') return 'arrowup';
  if (k === 's') return 'arrowdown';
  return k;
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialSettings = loadSettings();
  const initialSave = loadSave();
  const initialState = buildMenuState(initialSave.highScore, initialSave.difficulty || 'normal');
  applySettingsToState(initialState, initialSettings);
  const stateRef = useRef<GameState>(initialState);
  const touchControlsRef = useRef<TouchControlsState>(createTouchControlsState(CANVAS_W, CANVAS_H));
  const [isMobile, setIsMobile] = useState<boolean>(() => isMobileDevice());
  const isMobileRef = useRef(isMobile);
  const isPortraitMobileRef = useRef(false);
  const loopClockRef = useRef(createLoopClock());
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(1200);
  const [showSettings, setShowSettings] = useState(false);
  const showSettingsRef = useRef(showSettings);
  const [settings, setSettings] = useState<GameSettings>(initialSettings);
  const settingsRef = useRef(settings);
  const lastLeaderboardRefreshRef = useRef(0);

  const patchSettings = (patch: Partial<GameSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const assignState = (next: GameState) => {
    applySettingsToState(next, settingsRef.current);
    stateRef.current = next;
  };

  const syncTouchLayout = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    updateTouchControlsLayout(touchControlsRef.current, CANVAS_W, CANVAS_H, rect.width, rect.height);
  };

  const enterMobileImmersive = () => {
    if (!isMobileRef.current) return;

    const host = containerRef.current;
    if (host && !document.fullscreenElement && typeof host.requestFullscreen === 'function') {
      void host.requestFullscreen().catch(() => { });
    }

    try {
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (orientation:
          | 'any'
          | 'natural'
          | 'landscape'
          | 'portrait'
          | 'portrait-primary'
          | 'portrait-secondary'
          | 'landscape-primary'
          | 'landscape-secondary') => Promise<void>;
      };
      if (orientation && typeof orientation.lock === 'function') {
        void orientation.lock('landscape').catch(() => { });
      }
    } catch {
      // orientation lock unsupported
    }
  };

  // Compute scale to fill screen while preserving aspect ratio
  useEffect(() => {
    const computeScale = () => {
      const hostRect = containerRef.current?.getBoundingClientRect();
      const vw = hostRect?.width ?? window.visualViewport?.width ?? window.innerWidth;
      const vh = hostRect?.height ?? window.visualViewport?.height ?? window.innerHeight;
      let s;
      let w = 1200;
      if (isMobileRef.current) {
        // Dynamic aspect ratio scaling for mobile fullscreen
        if (vw > vh) { // Landscape
          s = vh / CANVAS_H;
          w = Math.max(1200, Math.floor(vw / s));
        } else { // Portrait
          s = vw / 1200;
          w = 1200;
        }
      } else {
        const scaleX = vw / 1200;
        const scaleY = vh / CANVAS_H;
        s = Math.min(scaleX, scaleY);
      }

      CANVAS_W = w;
      setEngineCanvasSize(w, CANVAS_H);
      setCanvasWidth(w);
      isPortraitMobileRef.current = isMobileRef.current && (vh > vw);
      requestAnimationFrame(syncTouchLayout);
    };
    computeScale();
    window.addEventListener('resize', computeScale);
    document.addEventListener('fullscreenchange', computeScale);
    window.visualViewport?.addEventListener('resize', computeScale);
    return () => {
      window.removeEventListener('resize', computeScale);
      document.removeEventListener('fullscreenchange', computeScale);
      window.visualViewport?.removeEventListener('resize', computeScale);
    };
  }, []);

  useEffect(() => {
    showSettingsRef.current = showSettings;
  }, [showSettings]);

  useEffect(() => {
    settingsRef.current = settings;
    saveSettings(settings);
    applySettingsToState(stateRef.current, settings);

    Audio.setMasterVolume(settings.muteAll ? 0 : settings.masterVolume);
    Audio.setMusicVolume(settings.musicVolume);
    Audio.setSfxVolume(settings.sfxVolume);
  }, [settings]);

  useEffect(() => {
    let cancelled = false;
    void hydrateSaveFromCloud().then((hydrated) => {
      if (cancelled) return;

      const s = stateRef.current;
      s.highScore = Math.max(s.highScore, hydrated.highScore);
      s.furthestLevel = Math.max(s.furthestLevel, hydrated.furthestLevel);
      s.totalGemsEver = Math.max(s.totalGemsEver, hydrated.totalGemsEver);
      s.gemsCurrency = Math.max(s.gemsCurrency, hydrated.gemsCurrency);
      s.enemiesDefeated = Math.max(s.enemiesDefeated, hydrated.totalEnemiesDefeated);
      s.upgrades = { ...hydrated.upgrades };
      if (s.screen === 'menu' && hydrated.difficulty) {
        s.difficulty = hydrated.difficulty;
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const mobile = isMobileRef.current;
    isMobileRef.current = mobile;
    touchControlsRef.current.visible = mobile;
    requestAnimationFrame(syncTouchLayout);

    const enableTouchOnFirst = () => {
      if (!isMobileRef.current) {
        isMobileRef.current = true;
        setIsMobile(true);
        touchControlsRef.current.visible = true;
        isPortraitMobileRef.current = window.innerHeight > window.innerWidth;
        requestAnimationFrame(syncTouchLayout);
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

    initTelemetrySession();
    containerRef.current?.focus();

    const handleDialogAdvance = (): boolean => {
      const s = stateRef.current;
      if (s.screen === 'playing' && s.activeDialog.length > 0 && !s.paused) {
        const textLen = s.activeDialog[0].text.length;
        if (s.dialogCharIndex < textLen) {
          s.dialogCharIndex = textLen; // Skip typewriter
        } else {
          s.activeDialog.shift();
          s.dialogCharIndex = 0;
        }
        return true;
      }
      return false;
    };

    const handleShopPurchase = (index: number) => {
      const s = stateRef.current;
      const upg = s.upgrades;
      const costs = [
        (upg.healthLevel + 1) * 30,
        (upg.manaLevel + 1) * 30,
        (upg.regenLevel + 1) * 50,
        (upg.damageLevel + 1) * 60,
        (upg.doubleJumpLevel + 1) * 100,
        (upg.dashDistanceLevel + 1) * 80,
      ];

      const keys: (keyof typeof upg)[] = ['healthLevel', 'manaLevel', 'regenLevel', 'damageLevel', 'doubleJumpLevel', 'dashDistanceLevel'];
      const field = keys[index];
      const cost = costs[index];

      if (s.gemsCurrency >= cost && (upg[field] as number) < 5) {
        s.gemsCurrency -= cost;
        (upg[field] as any)++;
        saveProgress(s);
        Audio.playGemCollect?.();
        spawnFloatingText(s, CANVAS_W / 2, 100, tr(s, 'shop_purchase_success' as any), '#8bffaf', 20);
      } else {
        Audio.playPause(); // Error sound
      }
    };

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
          enterMobileImmersive();
          return;
        }

        // Fullscreen Toggle on Mobile
        if (isMobile && tx > CANVAS_W - 100 && ty < 80) {
          enterMobileImmersive();
          return;
        }

        // Click Wave Survival -> Start Endless
        if (tx >= waveX && tx <= waveX + btnW && ty >= baseY && ty <= baseY + btnH) {
          const saved = loadSave();
          assignState(buildEndlessState(saved.highScore, s.difficulty));
          Audio.initAudio();
          Audio.playMenuSelect();
          Audio.startMusic(15);
          enterMobileImmersive();
          return;
        }

        // Bottom Bar: Difficulty + Shop
        const barY = baseY + btnH + 40;
        if (tx < CANVAS_W / 2 && ty >= barY - 20 && ty <= barY + 30) {
          s.difficulty = DIFFICULTY_CYCLE[s.difficulty];
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
          assignState(buildNextLevelState(s, saved.highScore));
          Audio.startMusic(nextLevel);
        }
        return;
      }

      if (s.screen === 'gameOver' || s.screen === 'victory') {
        const saved = loadSave();

        if (isMobile && tx !== undefined && ty !== undefined) {
          const btnW = 194; const btnH = 56; const gap = 30;
          const retryX = CANVAS_W / 2 - btnW - gap / 2;
          const quitX = CANVAS_W / 2 + gap / 2;
          const baseY = CANVAS_H / 2 + 85;

          // Hit Test Retry
          if (tx >= retryX && tx <= retryX + btnW && ty >= baseY && ty <= baseY + btnH) {
            assignState(buildRestartLevelState(s, saved.highScore));
            Audio.playMenuSelect();
            Audio.startMusic(s.currentLevel);
            enterMobileImmersive();
            return;
          }
          // Hit Test Quit
          if (tx >= quitX && tx <= quitX + btnW && ty >= baseY && ty <= baseY + btnH) {
            assignState(buildMenuState(saved.highScore, s.difficulty));
            Audio.playMenuSelect();
            Audio.stopMusic();
            return;
          }
          // Fallback if click missed buttons
          return;
        }

        if (s.screen === 'gameOver' && s.endlessWave === undefined) {
          assignState(buildRestartLevelState(s, saved.highScore));
          Audio.playMenuSelect();
          Audio.startMusic(s.currentLevel);
        } else {
          assignState(buildMenuState(saved.highScore, s.difficulty));
          Audio.playMenuSelect();
          Audio.stopMusic();
        }
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
              assignState(buildPlayingState(index, saved.highScore, s.difficulty));
              Audio.playMenuSelect();
              Audio.startMusic(index);
              enterMobileImmersive();
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
      const mappedKey = mapGameplayKey(keyLower, settingsRef.current);

      if (showSettingsRef.current) {
        if (key === 'Escape') {
          setShowSettings(false);
          e.preventDefault();
        }
        return;
      }

      if (keyLower === 'o') {
        setShowSettings((prev) => !prev);
        e.preventDefault();
        return;
      }

      // Pause toggle
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
            s.paused = false;
            Audio.playUnpause();
          } else if (s.pauseSelection === 1) {
            const saved = loadSave();
            assignState(buildRestartLevelState(s, saved.highScore));
            Audio.playMenuSelect();
            Audio.startMusic(s.currentLevel);
          } else if (s.pauseSelection === 2) {
            const saved = loadSave();
            assignState(buildMenuState(saved.highScore, s.difficulty));
            Audio.playMenuSelect();
            Audio.stopMusic();
          }
          e.preventDefault();
        }
        return;
      }

      if (s.screen !== 'playing') {
        if (s.screen === 'menu') {
          if (keyLower === 'a' || key === 'ArrowLeft' || keyLower === 'd' || key === 'ArrowRight') {
            s.selectedMenuButton = s.selectedMenuButton === 0 ? 1 : 0;
            Audio.playMenuSelect();
            return;
          }
          if (key === '1' || (s.selectedMenuButton === 0 && (key === 'Enter' || key === ' '))) {
            Audio.initAudio();
            Audio.playMenuSelect();
            s.screen = 'levelSelect';
            e.preventDefault();
            return;
          }
          if (key === '2' || keyLower === 'e' || (s.selectedMenuButton === 1 && (key === 'Enter' || key === ' '))) {
            const saved = loadSave();
            assignState(buildEndlessState(saved.highScore, s.difficulty));
            Audio.initAudio();
            Audio.playMenuSelect();
            Audio.startMusic(15);
            e.preventDefault();
            return;
          }
          if (keyLower === 'd') {
            s.difficulty = DIFFICULTY_CYCLE[s.difficulty];
            Audio.playMenuSelect();
            return;
          }
          if (keyLower === 'u') {
            s.screen = 'shop';
            Audio.playMenuSelect();
            return;
          }
          return;
        }

        if (s.screen === 'shop') {
          if (key === 'ArrowUp' || keyLower === 'w') {
            s.shopSelectionIndex = (s.shopSelectionIndex - 1 + 6) % 6;
            Audio.playMenuSelect();
          } else if (key === 'ArrowDown' || keyLower === 's') {
            s.shopSelectionIndex = (s.shopSelectionIndex + 1) % 6;
            Audio.playMenuSelect();
          } else if (key === 'Enter' || key === ' ') {
            handleShopPurchase(s.shopSelectionIndex);
          } else if (key === 'Escape' || keyLower === 'q' || keyLower === 'b') {
            const saved = loadSave();
            assignState(buildMenuState(saved.highScore, s.difficulty));
            Audio.playMenuSelect();
          }
          return;
        }

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
              assignState(buildPlayingState(s.levelSelectionIndex, saved.highScore, s.difficulty));
              Audio.playMenuSelect();
              Audio.startMusic(s.levelSelectionIndex);
            }
          }
          return;
        }

        if (s.screen === 'gameOver' && s.endlessWave === undefined) {
          if (keyLower === 'r') {
            const saved = loadSave();
            assignState(buildRestartLevelState(s, saved.highScore));
            Audio.playMenuSelect();
            Audio.startMusic(s.currentLevel);
            return;
          }
          if (keyLower === 'q' || key === 'Escape') {
            const saved = loadSave();
            assignState(buildMenuState(saved.highScore, s.difficulty));
            Audio.playMenuSelect();
            Audio.stopMusic();
            return;
          }
        }

        if (key === 'Enter' || key === ' ') {
          e.preventDefault();
          handleScreenTransition();
        }
        return;
      }

      if (s.activeDialog.length > 0 && (key === 'Enter' || key === ' ')) {
        handleDialogAdvance();
        e.preventDefault();
        return;
      }

      if (s.showLevelIntro && (key === 'Enter' || key === ' ')) {
        s.showLevelIntro = false;
        s.levelIntroTimer = 0;
        e.preventDefault();
        return;
      }

      if (mappedKey) {
        s.keys.add(mappedKey);
      }

      const elementMap: Record<string, Element> = {
        '1': 'fire', '2': 'water', '3': 'earth', '4': 'wind',
      };
      if (elementMap[key] && s.unlockedElements.includes(elementMap[key])) {
        s.selectedElement = elementMap[key];
        Audio.playElementSwitch();
      }

      const gameKeys = ['w', 'a', 's', 'd', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'];
      if (gameKeys.includes(keyLower)) e.preventDefault();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const rawKey = e.key.toLowerCase();
      const mapped = mapGameplayKey(rawKey, settingsRef.current);
      stateRef.current.keys.delete(rawKey);
      if (mapped) {
        stateRef.current.keys.delete(mapped);
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      const s = stateRef.current;
      s.mousePos = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };

      if (s.screen === 'shop') {
        const spacing = 72; const startY = 180;
        const ty = s.mousePos.y;
        for (let i = 0; i < 6; i++) {
          const rowY = startY + i * spacing;
          if (ty >= rowY - 28 && ty <= rowY + 32) {
            s.shopSelectionIndex = i;
            return;
          }
        }
      }

      if (s.screen === 'menu') {
        const tx = s.mousePos.x;
        const ty = s.mousePos.y;
        const btnW = 280; const btnH = 80; const gap = 40; const baseY = 320;
        const campX = CANVAS_W / 2 - btnW - gap / 2;
        const waveX = CANVAS_W / 2 + gap / 2;

        if (ty >= baseY && ty <= baseY + btnH) {
          if (tx >= campX && tx <= campX + btnW) s.selectedMenuButton = 0;
          else if (tx >= waveX && tx <= waveX + btnW) s.selectedMenuButton = 1;
          else s.selectedMenuButton = -1;
        } else {
          s.selectedMenuButton = -1;
        }
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      const s = stateRef.current;

      if (handleDialogAdvance()) return;

      if (s.screen === 'shop') {
        const spacing = 72; const startY = 180;
        const ty = s.mousePos.y;
        const tx = s.mousePos.x;
        if (isMobile && ty > CANVAS_H - 100) {
          const saved = loadSave();
          assignState(buildMenuState(saved.highScore, s.difficulty));
          Audio.playMenuSelect();
          return;
        }
        for (let i = 0; i < 6; i++) {
          const rowY = startY + i * spacing;
          if (ty >= rowY - 28 && ty <= rowY + 32 && tx >= CANVAS_W / 2 - 320 && tx <= CANVAS_W / 2 + 320) {
            handleShopPurchase(i);
            return;
          }
        }
      }

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
              assignState(buildRestartLevelState(s, saved.highScore));
              Audio.playMenuSelect();
              Audio.startMusic(s.currentLevel);
            } else if (i === 2) {
              const saved = loadSave();
              assignState(buildMenuState(saved.highScore, s.difficulty));
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
      if (settingsRef.current.autoPauseOnBlur && stateRef.current.screen === 'playing' && !stateRef.current.showLevelIntro) {
        stateRef.current.paused = true;
      }
    };

    const onWindowError = (event: ErrorEvent) => {
      trackError(event.error ?? event.message, {
        source: 'window_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
      setFatalError(event.message || 'Unexpected runtime error');
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackError(event.reason, { source: 'unhandled_rejection' });
      setFatalError('Unhandled promise rejection');
    };

    // Touch support - full mobile controls
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const s = stateRef.current;
      const controls = touchControlsRef.current;
      enterMobileImmersive();
      syncTouchLayout();

      if (handleDialogAdvance()) return;

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

        // Check Upgrade Rows
        const startY = 194;
        const spacing = 70;
        for (let i = 0; i < 6; i++) {
          const rowY = startY + i * spacing;
          if (ty > rowY - 30 && ty < rowY + 30) {
            // Replicate shop buy logic
            const key = (i + 1).toString();
            let bought = false;
            const costHealth = (s.upgrades.healthLevel + 1) * 30;
            const costMana = (s.upgrades.manaLevel + 1) * 30;
            const costRegen = (s.upgrades.regenLevel + 1) * 50;
            const costDamage = (s.upgrades.damageLevel + 1) * 60;
            const costDoubleJump = (s.upgrades.doubleJumpLevel + 1) * 100;
            const costDashDistance = (s.upgrades.dashDistanceLevel + 1) * 80;

            if (key === '1' && s.gemsCurrency >= costHealth && s.upgrades.healthLevel < 5) {
              s.gemsCurrency -= costHealth; s.upgrades.healthLevel++; bought = true;
            } else if (key === '2' && s.gemsCurrency >= costMana && s.upgrades.manaLevel < 5) {
              s.gemsCurrency -= costMana; s.upgrades.manaLevel++; bought = true;
            } else if (key === '3' && s.gemsCurrency >= costRegen && s.upgrades.regenLevel < 5) {
              s.gemsCurrency -= costRegen; s.upgrades.regenLevel++; bought = true;
            } else if (key === '4' && s.gemsCurrency >= costDamage && s.upgrades.damageLevel < 5) {
              s.gemsCurrency -= costDamage; s.upgrades.damageLevel++; bought = true;
            } else if (key === '5' && s.gemsCurrency >= costDoubleJump && s.upgrades.doubleJumpLevel < 5) {
              s.gemsCurrency -= costDoubleJump; s.upgrades.doubleJumpLevel++; bought = true;
            } else if (key === '6' && s.gemsCurrency >= costDashDistance && s.upgrades.dashDistanceLevel < 5) {
              s.gemsCurrency -= costDashDistance; s.upgrades.dashDistanceLevel++; bought = true;
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
            enterMobileImmersive();
            return;
          }

          // Wave Survival Button
          if (tx >= waveX && tx <= waveX + btnW && ty >= baseY && ty <= baseY + btnH) {
            const saved = loadSave();
            assignState(buildEndlessState(saved.highScore, s.difficulty));
            Audio.initAudio();
            Audio.playMenuSelect();
            Audio.startMusic(15);
            enterMobileImmersive();
            return;
          }

          // Difficulty cycle (bottom-left area)
          const barY = baseY + btnH + 40;
          if (tx < CANVAS_W / 2 && ty >= barY - 20 && ty <= barY + 30) {
            s.difficulty = DIFFICULTY_CYCLE[s.difficulty];
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

        // Game Over Screen (Campaign)
        if (s.screen === 'gameOver' && s.endlessWave === undefined) {
          const rect = canvas.getBoundingClientRect();
          const scaleX = CANVAS_W / rect.width;
          const scaleY = CANVAS_H / rect.height;
          const tx = (e.changedTouches[0].clientX - rect.left) * scaleX;
          const ty = (e.changedTouches[0].clientY - rect.top) * scaleY;

          const btnW = 180; const btnH = 50; const gap = 30; const baseY = CANVAS_H / 2 + 80;
          const retryX = CANVAS_W / 2 - btnW - gap / 2;
          const quitX = CANVAS_W / 2 + gap / 2;

          if (ty >= baseY - 15 && ty <= baseY + btnH - 15) {
            if (tx >= retryX && tx <= retryX + btnW) {
              const saved = loadSave();
              assignState(buildRestartLevelState(s, saved.highScore));
              Audio.playMenuSelect();
              Audio.startMusic(s.currentLevel);
              return;
            }
            if (tx >= quitX && tx <= quitX + btnW) {
              const saved = loadSave();
              assignState(buildMenuState(saved.highScore, s.difficulty));
              Audio.playMenuSelect();
              Audio.stopMusic();
              return;
            }
          }
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
              assignState(buildRestartLevelState(s, saved.highScore));
              Audio.playMenuSelect();
              Audio.startMusic(s.currentLevel);
            } else if (i === 2) {
              // Quit to Menu
              const saved = loadSave();
              assignState(buildMenuState(saved.highScore, s.difficulty));
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

    const onTouchCancel = (e: TouchEvent) => {
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
    canvas.addEventListener('touchcancel', onTouchCancel, { passive: false });
    window.addEventListener('error', onWindowError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    let animId: number;
    const gameLoop = (nowMs: number) => {
      try {
        const currentState = stateRef.current;
        if (currentState.screen === 'menu' && nowMs - lastLeaderboardRefreshRef.current > 30000) {
          lastLeaderboardRefreshRef.current = nowMs;
          void refreshRemoteLeaderboard(20);
        }

        const steps = advanceLoopClock(loopClockRef.current, nowMs);
        for (let i = 0; i < steps; i++) {
          update(currentState);
        }
        render(ctx, currentState, CANVAS_W, CANVAS_H, isMobileRef.current, isPortraitMobileRef.current);

        // Render touch controls on top
        if (touchControlsRef.current.visible && currentState.screen === 'playing' && !currentState.showLevelIntro) {
          syncTouchLayout();
          renderTouchControls(ctx, touchControlsRef.current, currentState);
        }

        animId = requestAnimationFrame(gameLoop);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown runtime error';
        console.error('Fatal game loop error', err);
        trackError(err, { source: 'game_loop' });
        setFatalError(msg);
      }
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
      canvas.removeEventListener('touchcancel', onTouchCancel);
      window.removeEventListener('error', onWindowError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  if (fatalError) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#090b15',
          color: '#f0f4ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '"Rajdhani", "Trebuchet MS", sans-serif',
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 640, textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, marginBottom: 12 }}>{t(settings.locale, 'app_runtime_error_title')}</h1>
          <p style={{ opacity: 0.85, marginBottom: 18 }}>
            {fatalError}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              border: '1px solid #88bbff',
              background: '#16233f',
              color: '#deecff',
              borderRadius: 8,
              padding: '10px 18px',
              cursor: 'pointer',
            }}
          >
            {t(settings.locale, 'app_reload_game')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      id="game-container"
      aria-label="Elemental Stickman game"
      role="application"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
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
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={showSettings}
        onClick={() => setShowSettings(true)}
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 30,
          border: '1px solid #7db8ff',
          background: 'rgba(9, 23, 44, 0.9)',
          color: '#e8f2ff',
          borderRadius: 8,
          padding: '8px 12px',
          fontFamily: '"Rajdhani", "Trebuchet MS", sans-serif',
          fontSize: `${Math.round(12 * settings.textScale)}px`,
          cursor: 'pointer',
        }}
      >
        {t(settings.locale, 'app_open_settings')}
      </button>
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={CANVAS_H}
        id="game-canvas"
        aria-label="Game canvas"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          cursor: isMobile ? 'default' : 'crosshair',
          touchAction: 'none',
          imageRendering: 'auto',
        }}
      />
      {showSettings && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t(settings.locale, 'settings_title')}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(3, 7, 16, 0.86)',
            padding: 16,
          }}
        >
          <div
            style={{
              width: 'min(760px, 96vw)',
              maxHeight: '92vh',
              overflowY: 'auto',
              borderRadius: 12,
              border: settings.highContrast ? '2px solid #ffffff' : '1px solid #6ca6ff',
              background: settings.highContrast ? '#000000' : '#071120',
              color: '#e9f3ff',
              padding: 18,
              fontFamily: '"Rajdhani", "Trebuchet MS", sans-serif',
              fontSize: `${Math.round(13 * settings.textScale)}px`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: `${Math.round(20 * settings.textScale)}px` }}>{t(settings.locale, 'settings_title')}</h2>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                style={{
                  border: '1px solid #96c4ff',
                  background: '#102440',
                  color: '#f0f7ff',
                  borderRadius: 8,
                  padding: '6px 10px',
                  cursor: 'pointer',
                }}
              >
                {t(settings.locale, 'settings_close')}
              </button>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              <section>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{t(settings.locale, 'settings_language')}</div>
                <select
                  value={settings.locale}
                  onChange={(e) => patchSettings({ locale: e.target.value as GameSettings['locale'] })}
                  style={{ width: '100%', padding: 8, borderRadius: 6 }}
                >
                  <option value="en">{t(settings.locale, 'settings_language_en')}</option>
                  <option value="hi">{t(settings.locale, 'settings_language_hi')}</option>
                </select>
              </section>

              <section>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{t(settings.locale, 'settings_audio')}</div>
                <label style={{ display: 'block', marginBottom: 6 }}>
                  {t(settings.locale, 'settings_mute_all')}
                  <input
                    type="checkbox"
                    checked={settings.muteAll}
                    onChange={(e) => patchSettings({ muteAll: e.target.checked })}
                    style={{ marginLeft: 8 }}
                  />
                </label>
                <label style={{ display: 'block', marginBottom: 6 }}>
                  {t(settings.locale, 'settings_master_volume')} ({Math.round(settings.masterVolume * 100)}%)
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.masterVolume}
                    onChange={(e) => patchSettings({ masterVolume: Number(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </label>
                <label style={{ display: 'block', marginBottom: 6 }}>
                  {t(settings.locale, 'settings_music_volume')} ({Math.round(settings.musicVolume * 100)}%)
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.musicVolume}
                    onChange={(e) => patchSettings({ musicVolume: Number(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </label>
                <label style={{ display: 'block' }}>
                  {t(settings.locale, 'settings_sfx_volume')} ({Math.round(settings.sfxVolume * 100)}%)
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.sfxVolume}
                    onChange={(e) => patchSettings({ sfxVolume: Number(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </label>
              </section>

              <section>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{t(settings.locale, 'settings_controls')}</div>
                <label style={{ display: 'block' }}>
                  {t(settings.locale, 'settings_keyboard_layout')}
                  <select
                    value={settings.keyboardLayout}
                    onChange={(e) => patchSettings({ keyboardLayout: e.target.value as GameSettings['keyboardLayout'] })}
                    style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 6 }}
                  >
                    <option value="wasd">{t(settings.locale, 'settings_keyboard_wasd')}</option>
                    <option value="arrows">{t(settings.locale, 'settings_keyboard_arrows')}</option>
                    <option value="both">{t(settings.locale, 'settings_keyboard_both')}</option>
                  </select>
                </label>
                <label style={{ display: 'block', marginTop: 8 }}>
                  {t(settings.locale, 'settings_auto_pause')}
                  <input
                    type="checkbox"
                    checked={settings.autoPauseOnBlur}
                    onChange={(e) => patchSettings({ autoPauseOnBlur: e.target.checked })}
                    style={{ marginLeft: 8 }}
                  />
                </label>
              </section>

              <section>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{t(settings.locale, 'settings_graphics')}</div>
                <label style={{ display: 'block' }}>
                  {t(settings.locale, 'settings_graphics_quality')}
                  <select
                    value={settings.graphicsQuality}
                    onChange={(e) => patchSettings({ graphicsQuality: e.target.value as GameSettings['graphicsQuality'] })}
                    style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 6 }}
                  >
                    <option value="low">{t(settings.locale, 'settings_quality_low')}</option>
                    <option value="medium">{t(settings.locale, 'settings_quality_medium')}</option>
                    <option value="high">{t(settings.locale, 'settings_quality_high')}</option>
                  </select>
                </label>
              </section>

              <section>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{t(settings.locale, 'settings_accessibility')}</div>
                <label style={{ display: 'block', marginBottom: 6 }}>
                  {t(settings.locale, 'settings_text_scale')} ({Math.round(settings.textScale * 100)}%)
                  <input
                    type="range"
                    min={0.85}
                    max={1.5}
                    step={0.05}
                    value={settings.textScale}
                    onChange={(e) => patchSettings({ textScale: Number(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </label>
                <label style={{ display: 'block', marginBottom: 6 }}>
                  {t(settings.locale, 'settings_reduced_motion')}
                  <input
                    type="checkbox"
                    checked={settings.reducedMotion}
                    onChange={(e) => patchSettings({ reducedMotion: e.target.checked })}
                    style={{ marginLeft: 8 }}
                  />
                </label>
                <label style={{ display: 'block' }}>
                  {t(settings.locale, 'settings_high_contrast')}
                  <input
                    type="checkbox"
                    checked={settings.highContrast}
                    onChange={(e) => patchSettings({ highContrast: e.target.checked })}
                    style={{ marginLeft: 8 }}
                  />
                </label>
              </section>

              <div style={{ color: '#9ab7d8' }}>{t(settings.locale, 'settings_hint_close')}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
