import { useEffect, useRef, useState } from 'react';
import { update, spawnFloatingText, setEngineCanvasSize, selectRelic } from './game/engine';
import { render } from './game/renderer';
import type { Difficulty, Element, GameSettings, GameState, ShopTab, GraphicsQuality } from './game/types';
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
import { claimDailyReward, getProgressionSnapshot } from './game/services/progression';
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
import { assetLoader } from './game/services/assetLoader';

let CANVAS_W = 1200;
const CANVAS_H = 700;

const DIFFICULTY_CYCLE: Record<Difficulty, Difficulty> = {
  easy: 'normal',
  normal: 'hard',
  hard: 'insane',
  insane: 'easy'
};

function applySettingsToState(state: GameState, settings: GameSettings): void {
  state.locale = settings.locale;
  state.graphicsQuality = settings.graphicsQuality;
  state.textScale = settings.textScale;
  state.hapticsEnabled = settings.hapticsEnabled;
  state.reducedMotion = settings.reducedMotion;
  state.highContrast = settings.highContrast;
  state.controlsScale = settings.controlsScale;
  state.aimToShoot = settings.aimToShoot;
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
  const [assetsReady, setAssetsReady] = useState(false);
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
  const [canvasScale, setCanvasScale] = useState(1);
  const [settings, setSettings] = useState<GameSettings>(initialSettings);
  const settingsRef = useRef(settings);
  const lastLeaderboardRefreshRef = useRef(0);

  const patchSettings = (patch: Partial<GameSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  useEffect(() => {

    // Load all game assets
    assetLoader.loadAssets({
      boss1: '/bosses/boss1.png',
      boss2: '/bosses/boss2.png',
      controls: '/assets/controls.png'
    }).then(() => {
      setAssetsReady(true);
      // Set the controls icon sheet after it's loaded
      import('./game/touchControls').then(tc => {
        tc.setControlsIconSheet(assetLoader.getAsset('controls'));
      });
    }).catch(err => {
      console.error('Failed to load assets:', err);
      setFatalError('Failed to load game assets. Please refresh.');
    });
  }, []);

  const assignState = (next: GameState) => {
    applySettingsToState(next, settingsRef.current);
    stateRef.current = next;
  };

  const syncTouchLayout = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    updateTouchControlsLayout(touchControlsRef.current, stateRef.current, CANVAS_W, CANVAS_H, rect.width, rect.height);
  };

  /**
   * Map a screen-space coordinate (clientX, clientY) to canvas logical coordinates.
   */
  const screenToCanvas = (clientX: number, clientY: number, rect: DOMRect): { x: number; y: number } => {
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((clientY - rect.top) / rect.height) * CANVAS_H,
    };
  };

  const enterMobileImmersive = () => {
    if (!isMobileRef.current) return;

    const host = containerRef.current;
    if (host && !document.fullscreenElement && typeof host.requestFullscreen === 'function') {
      void host.requestFullscreen().catch(() => { });
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
        if (vw > vh) {
          // Landscape: scale to fill height, expand canvas width to fill screen
          s = vh / CANVAS_H;
          w = Math.max(1200, Math.floor(vw / s));
        } else {
          // Portrait: scale to fill width, letterbox vertically
          s = vw / CANVAS_H; // fill the phone width using canvas height dimension
          w = Math.max(1200, Math.floor(vw / s)); // make canvas wide enough
          // Recalculate: fill width based on a reasonable virtual width
          w = 1200;
          s = vw / w;
        }
      } else {
        const scaleX = vw / 1200;
        const scaleY = vh / CANVAS_H;
        s = Math.min(scaleX, scaleY);
      }

      CANVAS_W = w;
      setEngineCanvasSize(w, CANVAS_H);
      setCanvasWidth(w);
      setCanvasScale(s);
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
    settingsRef.current = settings;
    saveSettings(settings);
    applySettingsToState(stateRef.current, settings);

    Audio.setMasterVolume(settings.muteAll ? 0 : settings.masterVolume);
    Audio.setMusicVolume(settings.musicVolume);
    Audio.setSfxVolume(settings.sfxVolume);
    syncTouchLayout();
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
        (upg as unknown as Record<string, number>)[field] = (upg[field] as number) + 1;
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


        // Responsive Grid buttons
        const isMobileLayout = CANVAS_W < 600;
        const cardW = isMobileLayout ? CANVAS_W - 60 : 280;
        const cardH = isMobileLayout ? 85 : 120;
        const gap = isMobileLayout ? 12 : 30;
        const cols = isMobileLayout ? 1 : 2;
        const startX = CANVAS_W / 2 - (cols * cardW + (cols - 1) * gap) / 2;
        const startY = isMobileLayout ? 210 : 320;

        for (let i = 0; i < 4; i++) {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = startX + col * (cardW + gap);
          const y = startY + row * (cardH + gap);
          if (tx >= x && tx <= x + cardW && ty >= y && ty <= y + cardH) {
            Audio.playMenuSelect();
            if (i === 0) s.screen = 'levelSelect';
            if (i === 1) s.screen = 'survivalDifficulty';
            if (i === 2) s.screen = 'shop';
            if (i === 3) s.screen = 'challenges';
            enterMobileImmersive();
            return;
          }
        }

        // Settings Icon
        if (tx > CANVAS_W - 60 && ty < 80) {
          s.screen = 'settings';
          s.shopSelectionIndex = 0; // Use for settings navigation
          Audio.playMenuSelect();
          return;
        }
        return;
      }

      if (s.screen === 'survivalDifficulty') {
        if (tx === undefined || ty === undefined) return;

        const diffs: Difficulty[] = ['easy', 'normal', 'hard', 'insane'];
        const isMobileLayout = CANVAS_W < 600;
        const cardW = isMobileLayout ? CANVAS_W / 2 - 30 : 220;
        const cardH = isMobileLayout ? 260 : 300;
        const gap = 20;
        const cols = isMobileLayout ? 2 : 4;
        const startX = CANVAS_W / 2 - (cols * cardW + (cols - 1) * gap) / 2;
        const startY = isMobileLayout ? 160 : 200;

        for (let i = 0; i < 4; i++) {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = startX + col * (cardW + gap);
          const y = startY + row * (cardH + gap);
          if (tx >= x && tx <= x + cardW && ty >= y && ty <= y + cardH) {
            s.difficulty = diffs[i];
            const saved = loadSave();
            assignState(buildEndlessState(saved.highScore, s.difficulty));
            Audio.initAudio();
            Audio.playMenuSelect();
            Audio.startMusic(15);
            enterMobileImmersive();
            return;
          }
        }

        // Back button
        if (ty > CANVAS_H - 100) {
          s.screen = 'menu';
          Audio.playMenuSelect();
        }
        return;
      }

      if (s.screen === 'settings') {
        const tx_val = tx ?? s.mousePos.x;
        const ty_val = ty ?? s.mousePos.y;

        // Settings list hit test
        for (let i = 0; i < 5; i++) {
          const sy = 160 + i * 70;
          if (tx_val >= CANVAS_W / 2 - 250 && tx_val <= CANVAS_W / 2 + 250 && ty_val >= sy - 30 && ty_val <= sy + 30) {
            // Toggle setting
            if (i === 0) {
              const quality: GraphicsQuality[] = ['low', 'medium', 'high'];
              const idx = (quality.indexOf(settingsRef.current.graphicsQuality) + 1) % quality.length;
              patchSettings({ graphicsQuality: quality[idx] });
            } else if (i === 1) {
              patchSettings({ hapticsEnabled: !settingsRef.current.hapticsEnabled });
            } else if (i === 2) {
              patchSettings({ reducedMotion: !settingsRef.current.reducedMotion });
            } else if (i === 3) {
              patchSettings({ highContrast: !settingsRef.current.highContrast });
            } else if (i === 4) {
              patchSettings({ aimToShoot: !settingsRef.current.aimToShoot });
            }
            Audio.playMenuSelect();
            return;
          }
        }

        // Back button
        if (ty_val > CANVAS_H - 100) {
          s.screen = 'menu';
          Audio.playMenuSelect();
        }
        return;
      }

      if (s.screen === 'challenges') {
        if (tx === undefined || ty === undefined) return;

        // Claim buttons logic
        const snap = getProgressionSnapshot(s);
        const isMobileLayout = CANVAS_W < 600;
        const startY = 180;
        const cardW = isMobileLayout ? CANVAS_W - 40 : 600;
        const cardH = 100;
        const gap = 20;

        let claimed = false;
        snap.dailies.forEach((d, i) => {
          const y = startY + i * (cardH + gap);
          const cbW = 100;
          const cbH = 40;
          const cbX = CANVAS_W / 2 + cardW / 2 - cbW - 20;
          const cbY = y + 30;
          if (d.completed && !d.claimed) {
            if (tx >= cbX && tx <= cbX + cbW && ty >= cbY && ty <= cbY + cbH) {
              claimDailyReward(d.id, s);
              Audio.playGemCollect();
              claimed = true;
            }
          }
        });
        if (claimed) return;

        // Back button
        if (ty > CANVAS_H - 100) {
          s.screen = 'menu';
          Audio.playMenuSelect();
        }
        return;
      }

      if (s.screen === 'shop') {
        const tx_val = tx ?? s.mousePos.x;
        const ty_val = ty ?? s.mousePos.y;

        // Tabs
        const tabW = 160;
        const tabStartX = CANVAS_W / 2 - (tabW * 5) / 2;
        const tabY = 120;
        if (ty_val >= tabY && ty_val <= tabY + 44) {
          const tabIdx = Math.floor((tx_val - tabStartX) / tabW);
          if (tabIdx >= 0 && tabIdx < 5) {
            const tabs: ShopTab[] = ['upgrades', 'skins', 'powerups', 'currency', 'special'];
            s.shopTab = tabs[tabIdx];
            Audio.playMenuSelect();
            return;
          }
        }

        if (s.shopTab === 'upgrades') {
          const isMobileLayout = CANVAS_W < 600;
          const cardW = isMobileLayout ? CANVAS_W - 40 : 340;
          const cardH = isMobileLayout ? 75 : 140;
          const gap = isMobileLayout ? 10 : 20;
          const cols = isMobileLayout ? 1 : 2;
          const startX = CANVAS_W / 2 - (cols * cardW + (cols - 1) * gap) / 2;
          const startY = isMobileLayout ? 175 : 200;

          for (let i = 0; i < 6; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * (cardW + gap);
            const y = startY + row * (cardH + gap);
            if (tx_val >= x && tx_val <= x + cardW && ty_val >= y && ty_val <= y + cardH) {
              if (s.shopSelectionIndex === i) {
                handleShopPurchase(i);
              } else {
                s.shopSelectionIndex = i;
                Audio.playMenuSelect();
              }
              return;
            }
          }
        }

        // Back button
        if (ty_val > CANVAS_H - 100) {
          s.screen = 'menu';
          Audio.playMenuSelect();
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

        if (isMobileRef.current && tx !== undefined && ty !== undefined) {
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
        const cardW = 194; const cardH = 130; const gap = 16; const cols = 5;
        const startX = CANVAS_W / 2 - (cols * cardW + (cols - 1) * gap) / 2;
        const startY = 140;

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

      if (s.screen === 'relicSelection') {
        if (tx === undefined || ty === undefined) return;
        const cardW = 220; const cardH = 320; const gap = 20;
        const startX = CANVAS_W / 2 - 350;
        const startY = 180;

        for (let i = 0; i < s.relicChoices.length; i++) {
          const rx = startX + i * (cardW + gap);
          if (tx >= rx && tx <= rx + cardW && ty >= startY && ty <= startY + cardH) {
            assignState(selectRelic({ ...s }, i));
            Audio.playMenuSelect();
            return;
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

      if (keyLower === 'o') {
        s.screen = s.screen === 'settings' ? 'menu' : 'settings';
        s.shopSelectionIndex = 0;
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
          s.pauseSelection = Math.min(3, s.pauseSelection + 1);
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
          } else if (s.pauseSelection === 3) {
            s.screen = 'settings';
            s.shopSelectionIndex = 0;
            Audio.playMenuSelect();
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

        if (s.screen === 'relicSelection') {
          if (key === '1' || key === '2' || key === '3') {
            const index = parseInt(key) - 1;
            if (index < s.relicChoices.length) {
              assignState(selectRelic({ ...s }, index));
              Audio.playMenuSelect();
            }
          }
          return;
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
      const mapped = screenToCanvas(e.clientX, e.clientY, rect);
      const s = stateRef.current;
      s.mousePos = mapped;

      if (s.screen === 'settings') {
        const ty = s.mousePos.y;
        for (let i = 0; i < 5; i++) {
          const sy = 160 + i * 70;
          if (ty >= sy - 30 && ty <= sy + 30) {
            s.shopSelectionIndex = i;
            return;
          }
        }
      }

      if (s.screen === 'shop' && s.shopTab === 'upgrades') {
        const isMobileLayout = CANVAS_W < 600;
        const cardW = isMobileLayout ? CANVAS_W - 40 : 340;
        const cardH = isMobileLayout ? 75 : 140;
        const gap = isMobileLayout ? 10 : 20;
        const cols = isMobileLayout ? 1 : 2;
        const startX = CANVAS_W / 2 - (cols * cardW + (cols - 1) * gap) / 2;
        const startY = isMobileLayout ? 175 : 200;

        const tx = s.mousePos.x;
        const ty = s.mousePos.y;

        for (let i = 0; i < 6; i++) {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = startX + col * (cardW + gap);
          const y = startY + row * (cardH + gap);
          if (tx >= x && tx <= x + cardW && ty >= y && ty <= y + cardH) {
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
        handleScreenTransition();
        return;
      }

      if (s.screen !== 'playing') {
        handleScreenTransition(s.mousePos.x, s.mousePos.y);
        return;
      }

      // Handle pause menu clicks
      if (s.paused) {
        const mx = s.mousePos.x;
        const my = s.mousePos.y;
        for (let i = 0; i < 4; i++) {
          const optionY = CANVAS_H / 2 - 50 + i * 58;
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
            } else if (i === 3) {
              s.screen = 'settings';
              s.shopSelectionIndex = 0;
              Audio.playMenuSelect();
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

      // Helper: map first touch to canvas coords
      const mapFirstTouch = () => {
        const rect = canvas.getBoundingClientRect();
        const t0 = e.changedTouches[0];
        return screenToCanvas(t0.clientX, t0.clientY, rect);
      };

      if (s.screen !== 'playing') {
        const { x: tx, y: ty } = mapFirstTouch();
        handleScreenTransition(tx, ty);
        return;
      }

      // Mobile pause menu touch handling
      if (s.paused) {
        const { x: tx, y: ty } = mapFirstTouch();

        // Allow unpausing via the pause button cluster
        const pb = controls.pauseButton;
        const dist = Math.sqrt((tx - pb.x) ** 2 + (ty - pb.y) ** 2);
        if (dist < pb.radius * 2.2) {
          s.paused = false;
          Audio.playUnpause();
          return;
        }

        // Check each pause menu option
        for (let i = 0; i < 4; i++) {
          const optionY = CANVAS_H / 2 - 50 + i * 58;
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
            } else if (i === 3) {
              // Open Settings
              s.screen = 'settings';
              s.shopSelectionIndex = 0;
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
      handleTouchStart(newTouches, controls, s, canvas, CANVAS_W, CANVAS_H, screenToCanvas);
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const controls = touchControlsRef.current;
      const changedTouches = Array.from(e.changedTouches);
      handleTouchMove(changedTouches, controls, stateRef.current, canvas, CANVAS_W, CANVAS_H, screenToCanvas);
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

  if (!assetsReady) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#071226',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#90d3ff',
        fontFamily: '"Rajdhani", sans-serif'
      }}>
        <div style={{
          width: 40,
          height: 40,
          border: '3px solid rgba(144, 211, 255, 0.2)',
          borderTop: '3px solid #90d3ff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: 20
        }} />
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
        <div style={{ fontSize: 18, letterSpacing: '0.1em', fontWeight: 700 }}>
          LOADING ASSETS...
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
      {!isMobile && (
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => {
            const s = stateRef.current;
            s.screen = 'settings';
            s.shopSelectionIndex = 0;
            Audio.playMenuSelect();
          }}
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 30,
            border: '1.5px solid rgba(125, 184, 255, 0.4)',
            background: 'rgba(9, 23, 44, 0.7)',
            backdropFilter: 'blur(8px)',
            color: '#e8f2ff',
            borderRadius: 10,
            padding: '10px 18px',
            fontFamily: '"Rajdhani", "Trebuchet MS", sans-serif',
            fontWeight: 700,
            letterSpacing: '0.05em',
            fontSize: `${Math.round(13 * settings.textScale)}px`,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: '1.1em', opacity: 0.8 }}>⚙</span>
          {t(settings.locale, 'app_open_settings').toUpperCase()}
        </button>
      )}
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={CANVAS_H}
        id="game-canvas"
        aria-label="Game canvas"
        style={{
          display: 'block',
          width: Math.floor(canvasWidth * canvasScale),
          height: Math.floor(CANVAS_H * canvasScale),
          cursor: isMobile ? 'default' : 'crosshair',
          touchAction: 'none',
          imageRendering: 'auto',
        }}
      />
    </div>
  );
}

export default App;
