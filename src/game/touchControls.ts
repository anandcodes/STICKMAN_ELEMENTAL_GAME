import type { GameState } from './types';
import * as Audio from './audio';
import { DASH_BASE_COOLDOWN } from './engine';

export interface TouchControl {
  id: string;
  x: number;
  y: number;
  radius: number;
  label: string;
  icon?: string;
  color: string;
  active: boolean;
}

export interface TouchControlsState {
  visible: boolean;
  dpadCenter: { x: number; y: number };
  dpadRadius: number;
  dpadTouchId: number | null;
  dpadDirection: { x: number; y: number };
  jumpActive: boolean;
  jumpTouchId: number | null;
  castActive: boolean;
  castTouchId: number | null;
  castPosition: { x: number; y: number };
  elementButtons: TouchControl[];
  jumpButton: TouchControl;
  castButton: TouchControl;
  dashButton: TouchControl;
  cycleButton: TouchControl;
  pauseButton: TouchControl;
  dashActive: boolean;
  dashTouchId: number | null;
  castDragActive: boolean;
  castDragPos: { x: number; y: number };
}

const DPAD_RADIUS = 55;
let controlsIconSheet: HTMLImageElement | null = null;

export function setControlsIconSheet(img: HTMLImageElement) {
  controlsIconSheet = img;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function createTouchControlsState(canvasW: number, canvasH: number): TouchControlsState {
  return {
    visible: false,
    dpadCenter: { x: 120, y: canvasH - 120 },
    dpadRadius: DPAD_RADIUS,
    dpadTouchId: null,
    dpadDirection: { x: 0, y: 0 },
    jumpActive: false,
    jumpTouchId: null,
    castActive: false,
    castTouchId: null,
    castPosition: { x: canvasW / 2, y: canvasH / 2 },
    elementButtons: [], // Deprecated in favor of cycleButton for better layout
    jumpButton: {
      id: 'jump', x: canvasW - 90, y: canvasH - 100,
      radius: 40, label: 'JUMP', icon: '⬆️', color: '#ffffff', active: false,
    },
    castButton: {
      id: 'cast', x: canvasW - 90, y: canvasH - 200,
      radius: 46, label: 'CAST', icon: '🎯', color: '#ffcc00', active: false,
    },
    dashButton: {
      id: 'dash', x: canvasW - 90, y: canvasH - 300,
      radius: 30, label: 'DASH', icon: '💨', color: '#44ffaa', active: false,
    },
    cycleButton: {
      id: 'cycle', x: canvasW - 200, y: canvasH - 200,
      radius: 32, label: 'SWAP', icon: '🔄', color: '#55aaff', active: false,
    },
    pauseButton: {
      id: 'pause', x: canvasW - 50, y: 50,
      radius: 25, label: '||', icon: '⏸️', color: '#ffffff', active: false,
    },
    dashActive: false,
    dashTouchId: null,
    castDragActive: false,
    castDragPos: { x: 0, y: 0 },
  };
}

export function updateTouchControlsLayout(
  controls: TouchControlsState,
  state: GameState,
  canvasW: number,
  canvasH: number,
  viewW: number,
  viewH: number,
): void {
  const safeViewW = Math.max(1, viewW);
  const safeViewH = Math.max(1, viewH);
  const portrait = safeViewH > safeViewW;

  // Base everything on logical canvas size so that controls
  // stay in consistent places regardless of device DPI.
  const base = Math.min(canvasW, canvasH);
  const scale = state.controlsScale || 1;
  const margin = clamp(base * (portrait ? 0.035 : 0.025), 10, 40);

  const dpadRadius = clamp(base * (portrait ? 0.11 : 0.09) * scale, 30, portrait ? 150 : 130);
  controls.dpadRadius = dpadRadius;

  if (controls.dpadTouchId === null) {
    controls.dpadCenter = {
      x: margin + dpadRadius * 1.05,
      y: canvasH - margin - dpadRadius * (portrait ? 0.9 : 0.7),
    };
  }

  // Right Side Action Cluster – relative to canvas, not viewport pixels.
  const actionRadius = clamp(base * (portrait ? 0.085 : 0.075) * scale, 25, portrait ? 140 : 120);
  const clusterX = canvasW - margin - actionRadius * 2.1;
  const clusterY = canvasH - margin - actionRadius * (portrait ? 2.1 : 1.9);

  // Main Cast Button (Center of cluster)
  controls.castButton.radius = actionRadius * 1.15;
  controls.castButton.x = clusterX;
  controls.castButton.y = clusterY;

  // Jump Button (Bottom Right of Cast)
  controls.jumpButton.radius = actionRadius * 0.85;
  controls.jumpButton.x = clusterX + actionRadius * 1.5;
  controls.jumpButton.y = clusterY + actionRadius * 0.75;

  // Dash Button (Top Right of Cast)
  controls.dashButton.radius = actionRadius * 0.7;
  controls.dashButton.x = clusterX + actionRadius * 1.1;
  controls.dashButton.y = clusterY - actionRadius * 1.25;

  // Cycle Button (Left of Cast)
  controls.cycleButton.radius = actionRadius * 0.7;
  controls.cycleButton.x = clusterX - actionRadius * 1.5;
  controls.cycleButton.y = clusterY - actionRadius * 0.1;

  // Adjustment for portrait
  if (portrait) {
    controls.jumpButton.x = clusterX + actionRadius * 1.35;
    controls.jumpButton.y = clusterY + actionRadius * 1.15;
    controls.dashButton.x = clusterX + actionRadius * 1.15;
    controls.dashButton.y = clusterY - actionRadius * 1.05;
    controls.cycleButton.x = clusterX - actionRadius * 1.25;
    controls.cycleButton.y = clusterY + actionRadius * 0.1;
  }

  // Pause Button (Top Right corner)
  controls.pauseButton.radius = clamp(base * 0.03 * scale, 15, 60);
  controls.pauseButton.x = canvasW - margin - controls.pauseButton.radius;
  controls.pauseButton.y = margin + controls.pauseButton.radius;
}

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || ('ontouchstart' in window)
    || (navigator.maxTouchPoints > 0);
}

export function handleTouchStart(
  touches: Touch[],
  controls: TouchControlsState,
  state: GameState,
  canvas: HTMLCanvasElement,
  canvasW: number,
  canvasH: number,
  coordTransform?: (clientX: number, clientY: number, rect: DOMRect) => { x: number; y: number },
): void {
  const rect = canvas.getBoundingClientRect();
  const defaultTransform = (cx: number, cy: number, r: DOMRect) => ({
    x: (cx - r.left) * (canvasW / r.width),
    y: (cy - r.top) * (canvasH / r.height),
  });
  const toCanvas = coordTransform || defaultTransform;

  for (const touch of touches) {
    const { x: tx, y: ty } = toCanvas(touch.clientX, touch.clientY, rect);

    if (dist(tx, ty, controls.pauseButton.x, controls.pauseButton.y) < controls.pauseButton.radius * 2.5) {
      if (state.screen === 'playing') {
        state.paused = !state.paused;
        if (state.paused) Audio.playPause(); else Audio.playUnpause();
      }
      return;
    }

    if (dist(tx, ty, controls.cycleButton.x, controls.cycleButton.y) < controls.cycleButton.radius * 2.2) {
      const idx = state.unlockedElements.indexOf(state.selectedElement);
      const nextIdx = (idx + 1) % state.unlockedElements.length;
      state.selectedElement = state.unlockedElements[nextIdx];
      controls.cycleButton.active = true;
      Audio.playElementSwitch();
      return;
    }

    if (dist(tx, ty, controls.jumpButton.x, controls.jumpButton.y) < controls.jumpButton.radius * 2.2 && controls.jumpTouchId === null) {
      controls.jumpActive = true;
      controls.jumpTouchId = touch.identifier;
      controls.jumpButton.active = true;
      state.keys.add(' ');
      continue;
    }

    if (dist(tx, ty, controls.dashButton.x, controls.dashButton.y) < controls.dashButton.radius * 2.2 && controls.dashTouchId === null) {
      controls.dashActive = true;
      controls.dashTouchId = touch.identifier;
      controls.dashButton.active = true;
      state.keys.add('shift');
      continue;
    }

    if (tx < canvasW * 0.48 && controls.dpadTouchId === null) {
      controls.dpadTouchId = touch.identifier;
      // Fixed joystick or floating? Let's keep it fixed for now but allow small offset
      if (dist(tx, ty, controls.dpadCenter.x, controls.dpadCenter.y) > controls.dpadRadius * 1.5) {
        controls.dpadCenter = { x: tx, y: ty };
      }
      controls.dpadDirection = { x: 0, y: 0 };
      continue;
    }

    if (dist(tx, ty, controls.castButton.x, controls.castButton.y) < controls.castButton.radius * 2.5) {
      controls.castActive = true;
      controls.castButton.active = true;
      controls.castTouchId = touch.identifier;
      controls.castDragActive = false;
      controls.castDragPos = { x: tx, y: ty };
      
      if (!state.aimToShoot) {
        state.mouseDown = true;
      }
      continue;
    }

    // Canvas tap for direct aiming/casting
    if (state.screen === 'playing' && !state.showLevelIntro && controls.castTouchId === null) {
      controls.castTouchId = touch.identifier;
      controls.castActive = true;
      state.mousePos = { x: tx, y: ty };
      state.mouseDown = true;
    }
  }
}

export function handleTouchMove(
  touches: Touch[],
  controls: TouchControlsState,
  state: GameState,
  canvas: HTMLCanvasElement,
  canvasW: number,
  canvasH: number,
  coordTransform?: (clientX: number, clientY: number, rect: DOMRect) => { x: number; y: number },
): void {
  const rect = canvas.getBoundingClientRect();
  const defaultTransform = (cx: number, cy: number, r: DOMRect) => ({
    x: (cx - r.left) * (canvasW / r.width),
    y: (cy - r.top) * (canvasH / r.height),
  });
  const toCanvas = coordTransform || defaultTransform;

  for (const touch of touches) {
    const { x: tx, y: ty } = toCanvas(touch.clientX, touch.clientY, rect);

    if (touch.identifier === controls.dpadTouchId) {
      const dx = tx - controls.dpadCenter.x;
      const dy = ty - controls.dpadCenter.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const clampedD = Math.min(d, controls.dpadRadius);
      controls.dpadDirection = {
        x: (dx / d) * (clampedD / controls.dpadRadius),
        y: (dy / d) * (clampedD / controls.dpadRadius),
      };
      updateDpadKeys(controls, state);
    }

    if (touch.identifier === controls.castTouchId && controls.castActive) {
      const dx = tx - controls.castDragPos.x;
      const dy = ty - controls.castDragPos.y;
      const mag = Math.sqrt(dx * dx + dy * dy);
      
      if (mag > 15) {
        controls.castDragActive = true;
        
        // If aimToShoot is on, we don't rapid fire while dragging
        if (state.aimToShoot) {
          state.mouseDown = false;
        } else {
          state.mouseDown = true;
        }

        const s = state.stickman;
        const range = 280;
        state.mousePos = {
          x: s.x + s.width / 2 + (dx / mag) * range - state.camera.x,
          y: s.y + s.height / 2 + (dy / mag) * range - state.camera.y,
        };
      } else if (!state.aimToShoot) {
        controls.castDragActive = false;
        state.mouseDown = true;
      }
    }
  }
}

export function handleTouchEnd(
  touches: Touch[],
  controls: TouchControlsState,
  state: GameState,
): void {
  for (const touch of touches) {
    if (touch.identifier === controls.dpadTouchId) {
      controls.dpadTouchId = null;
      controls.dpadDirection = { x: 0, y: 0 };
      state.keys.delete('a');
      state.keys.delete('d');
      state.keys.delete('arrowleft');
      state.keys.delete('arrowright');
    }

    if (touch.identifier === controls.castTouchId) {
      if (state.aimToShoot && controls.castDragActive) {
        // Shoot on release
        state.mouseDown = true;
        setTimeout(() => {
          state.mouseDown = false;
        }, 30);
      } else {
        state.mouseDown = false;
      }
      controls.castTouchId = null;
      controls.castActive = false;
      controls.castButton.active = false;
      controls.castDragActive = false;
    }

    if (touch.identifier === controls.jumpTouchId) {
      controls.jumpTouchId = null;
      controls.jumpActive = false;
      controls.jumpButton.active = false;
      state.keys.delete(' ');
    }

    if (touch.identifier === controls.dashTouchId) {
      controls.dashTouchId = null;
      controls.dashActive = false;
      controls.dashButton.active = false;
      state.keys.delete('shift');
    }

    controls.cycleButton.active = false;
    controls.pauseButton.active = false;
  }
}

function updateDpadKeys(controls: TouchControlsState, state: GameState): void {
  const { x, y } = controls.dpadDirection;
  const threshold = 0.3;

  state.keys.delete('a');
  state.keys.delete('d');
  state.keys.delete('arrowleft');
  state.keys.delete('arrowright');

  if (x < -threshold) {
    state.keys.add('a');
  } else if (x > threshold) {
    state.keys.add('d');
  }

  if (y < -threshold * 1.5) {
    state.keys.add(' ');
    setTimeout(() => state.keys.delete(' '), 100);
  }
}

export function renderTouchControls(
  ctx: CanvasRenderingContext2D,
  controls: TouchControlsState,
  state: GameState,
): void {
  if (!controls.visible) return;

  ctx.save();

  // Helper for drawing premium buttons
  const drawPremiumButton = (
    x: number,
    y: number,
    radius: number,
    color: string,
    label: string,
    active: boolean,
    icon?: string,
    alpha = 0.3,
  ) => {
    ctx.save();
    
    const isLow = state.graphicsQuality === 'low';

    // Outer Glow - DISABLED ON LOW
    if (active && !isLow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
    }

    // Main Circle
    const grad = ctx.createRadialGradient(x, y - radius * 0.2, 0, x, y, radius);
    grad.addColorStop(0, active ? color : 'rgba(255, 255, 255, 0.4)');
    grad.addColorStop(1, active ? color : 'rgba(255, 255, 255, 0.15)');
    
    ctx.globalAlpha = active ? 0.8 : alpha;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.strokeStyle = active ? '#ffffff' : 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text/Icon
    ctx.globalAlpha = active ? 1.0 : 0.8;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (controlsIconSheet && icon) {
        // Map icon labels to sprite regions
        type IconKey = 'jump' | 'shoot' | 'dash' | 'swap' | 'pause';
        const regions: Record<IconKey, [number, number, number, number]> = {
            jump: [40, 40, 430, 430],
            shoot: [550, 40, 430, 430],
            dash: [300, 300, 424, 424],
            swap: [40, 550, 430, 430],
            pause: [550, 550, 430, 430]
        };
        const keyMap: Record<string, IconKey> = {
            '⬆️': 'jump', '🎯': 'shoot', '💨': 'dash', '🔄': 'swap', '⏸️': 'pause',
            '🔥': 'swap', '💧': 'swap', '🪨': 'swap', '🌪️': 'swap'
        };
        const region = regions[keyMap[icon as string] || 'shoot'];
        if (region) {
            const iconSize = radius * 1.3;
            ctx.drawImage(controlsIconSheet, region[0], region[1], region[2], region[3], x - iconSize / 2, y - iconSize / 2, iconSize, iconSize);
        }
    } else if (icon) {
      ctx.font = `700 ${Math.round(radius * 0.9)}px sans-serif`;
      ctx.fillText(icon, x, y);
    } else {
      ctx.font = `800 ${Math.round(radius * 0.4)}px sans-serif`;
      ctx.fillText(label, x, y);
    }

    ctx.restore();
  };

  // 1. Render Joystick (DPAD)
  const dpc = controls.dpadCenter;
  const isMoving = controls.dpadTouchId !== null;

  // Outer Ring
  ctx.save();
  ctx.globalAlpha = isMoving ? 0.3 : 0.15;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(dpc.x, dpc.y, controls.dpadRadius, 0, Math.PI * 2);
  ctx.stroke();
  
  // Inner base
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.fill();
  ctx.restore();

  // Cardinal Arrows
  const arrowDist = controls.dpadRadius * 0.7;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '700 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('▲', dpc.x, dpc.y - arrowDist);
  ctx.fillText('▼', dpc.x, dpc.y + arrowDist);
  ctx.fillText('◀', dpc.x - arrowDist, dpc.y);
  ctx.fillText('▶', dpc.x + arrowDist, dpc.y);

  // Thumb
  const thumbX = dpc.x + controls.dpadDirection.x * controls.dpadRadius * 0.8;
  const thumbY = dpc.y + controls.dpadDirection.y * controls.dpadRadius * 0.8;
  const thumbR = controls.dpadRadius * 0.4;
  
  const thumbGrad = ctx.createRadialGradient(thumbX, thumbY, 0, thumbX, thumbY, thumbR);
  thumbGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  thumbGrad.addColorStop(1, 'rgba(200, 200, 200, 0.4)');
  
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = thumbGrad;
  ctx.beginPath();
  ctx.arc(thumbX, thumbY, thumbR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // 2. Render Action Cluster
  const elemColor = {
    fire: '#ff4400', water: '#0088ff', earth: '#66aa33', wind: '#aabbee',
  }[state.selectedElement];

  const cb = controls.castButton;
  const isAiming = controls.castActive || controls.castDragActive;
  const castBaseAlpha = isAiming ? 0.75 : 0.4;

  drawPremiumButton(
    cb.x,
    cb.y,
    cb.radius,
    elemColor,
    cb.label.toUpperCase(),
    cb.active || controls.castDragActive,
    cb.icon,
    castBaseAlpha,
  );

  if (isAiming) {
    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.strokeStyle = elemColor;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(cb.x, cb.y, cb.radius * 1.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  const jb = controls.jumpButton;
  drawPremiumButton(jb.x, jb.y, jb.radius, '#ffffff', jb.label.toUpperCase(), jb.active, jb.icon);

  const db = controls.dashButton;
  const dashReady = state.stickman.dashCooldown <= 0;
  drawPremiumButton(db.x, db.y, db.radius, dashReady ? '#44ffaa' : '#555555', db.label.toUpperCase(), db.active, db.icon, dashReady ? 0.3 : 0.1);
  
  if (!dashReady) {
    const pct = 1 - (state.stickman.dashCooldown / DASH_BASE_COOLDOWN);
    const isLow = state.graphicsQuality === 'low';
    ctx.strokeStyle = '#44ffaa';
    ctx.lineWidth = isLow ? 2 : 3;
    ctx.beginPath();
    ctx.arc(db.x, db.y, db.radius + 3, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
    ctx.stroke();
  }

  const cyb = controls.cycleButton;
  const showCycle = state.unlockedElements.length > 1;
  if (showCycle) {
    const elemIcon = { fire: '🔥', water: '💧', earth: '🪨', wind: '🌪️' }[state.selectedElement];
    drawPremiumButton(cyb.x, cyb.y, cyb.radius, elemColor, 'SWAP', cyb.active, elemIcon);
  }

  // 3. Pause Button
  const pb = controls.pauseButton;
  drawPremiumButton(pb.x, pb.y, pb.radius, '#ffffff', pb.label, pb.active, pb.icon);

  ctx.restore();
}
