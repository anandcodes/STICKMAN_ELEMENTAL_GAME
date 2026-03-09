import type { Element, GameState } from './types';
import { setUiFont, tr } from './renderer';

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
  dashActive: boolean;
  dashTouchId: number | null;
  castDragActive: boolean;
  castDragPos: { x: number; y: number };
}

const DPAD_RADIUS = 55;

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
    elementButtons: [
      { id: 'fire', x: 50, y: 50, radius: 24, label: '1', icon: 'F', color: '#ff4400', active: false },
      { id: 'water', x: 105, y: 50, radius: 24, label: '2', icon: 'W', color: '#0088ff', active: false },
      { id: 'earth', x: 160, y: 50, radius: 24, label: '3', icon: 'E', color: '#66aa33', active: false },
      { id: 'wind', x: 215, y: 50, radius: 24, label: '4', icon: 'A', color: '#aabbee', active: false },
    ],
    jumpButton: {
      id: 'jump', x: canvasW - 90, y: canvasH - 100,
      radius: 40, label: 'JUMP', color: '#ffffff', active: false,
    },
    castButton: {
      id: 'cast', x: canvasW - 90, y: canvasH - 200,
      radius: 40, label: 'CAST', color: '#ffcc00', active: false,
    },
    dashButton: {
      id: 'dash', x: canvasW - 90, y: canvasH - 300,
      radius: 30, label: 'DASH', color: '#44ffaa', active: false,
    },
    dashActive: false,
    dashTouchId: null,
    castDragActive: false,
    castDragPos: { x: 0, y: 0 },
  };
}

export function updateTouchControlsLayout(
  controls: TouchControlsState,
  canvasW: number,
  canvasH: number,
  viewW: number,
  viewH: number,
): void {
  const safeViewW = Math.max(1, viewW);
  const safeViewH = Math.max(1, viewH);
  const portrait = safeViewH > safeViewW;

  const logicalPerPixelX = canvasW / safeViewW;
  const logicalPerPixelY = canvasH / safeViewH;
  // Reduce scale for landscape to keep controls smaller
  const scale = clamp(Math.max(logicalPerPixelX, logicalPerPixelY), 0.7, portrait ? 4 : 1.2);

  const margin = (portrait ? 18 : 10) * scale;
  const dpadRadius = clamp((portrait ? 72 : 48) * scale, 40, portrait ? 230 : 120);
  controls.dpadRadius = dpadRadius;
  if (controls.dpadTouchId === null) {
    controls.dpadCenter = {
      x: margin + dpadRadius,
      y: canvasH - margin - dpadRadius,
    };
  }

  const actionRadius = clamp((portrait ? 54 : 36) * scale, 30, portrait ? 180 : 100);
  controls.jumpButton.radius = actionRadius;
  controls.castButton.radius = actionRadius;
  controls.dashButton.radius = clamp(actionRadius * 0.72, 22, 90);

  const actionX = canvasW - margin - actionRadius;
  controls.jumpButton.x = actionX;
  controls.jumpButton.y = canvasH - margin - actionRadius;
  controls.castButton.x = actionX - (portrait ? 0 : actionRadius * 2.2 + 10 * scale);
  controls.castButton.y = portrait ? controls.jumpButton.y - (actionRadius * 2 + 18 * scale) : controls.jumpButton.y;
  controls.dashButton.x = actionX;
  controls.dashButton.y = controls.castButton.y - (portrait ? (controls.dashButton.radius + actionRadius + 14 * scale) : (actionRadius * 2.2 + 10 * scale));
  if (!portrait) {
    controls.dashButton.y = controls.jumpButton.y;
    controls.dashButton.x = controls.castButton.x - (actionRadius + controls.dashButton.radius + 15 * scale);
  }

  const elementRadius = clamp((portrait ? 30 : 24) * scale, 18, 120);
  const gap = 10 * scale;
  const totalW = controls.elementButtons.length * (elementRadius * 2) + (controls.elementButtons.length - 1) * gap;
  let x = canvasW - margin - totalW + elementRadius;
  const y = margin + elementRadius;
  for (const btn of controls.elementButtons) {
    btn.radius = elementRadius;
    btn.x = x;
    btn.y = y;
    x += elementRadius * 2 + gap;
  }
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
): void {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvasW / rect.width;
  const scaleY = canvasH / rect.height;

  for (const touch of touches) {
    const tx = (touch.clientX - rect.left) * scaleX;
    const ty = (touch.clientY - rect.top) * scaleY;

    for (const btn of controls.elementButtons) {
      if (dist(tx, ty, btn.x, btn.y) < btn.radius * 2.0) {
        const elemMap: Record<string, Element> = { fire: 'fire', water: 'water', earth: 'earth', wind: 'wind' };
        const elem = elemMap[btn.id];
        if (elem && state.unlockedElements.includes(elem)) {
          state.selectedElement = elem;
        }
        return;
      }
    }

    if (dist(tx, ty, controls.jumpButton.x, controls.jumpButton.y) < controls.jumpButton.radius * 1.8 && controls.jumpTouchId === null) {
      controls.jumpActive = true;
      controls.jumpTouchId = touch.identifier;
      controls.jumpButton.active = true;
      state.keys.add(' ');
      continue;
    }

    if (dist(tx, ty, controls.dashButton.x, controls.dashButton.y) < controls.dashButton.radius * 1.8 && controls.dashTouchId === null) {
      controls.dashActive = true;
      controls.dashTouchId = touch.identifier;
      controls.dashButton.active = true;
      state.keys.add('shift');
      continue;
    }

    if (tx < canvasW * 0.48 && controls.dpadTouchId === null) {
      controls.dpadTouchId = touch.identifier;
      if (dist(tx, ty, controls.dpadCenter.x, controls.dpadCenter.y) > controls.dpadRadius) {
        controls.dpadCenter = { x: tx, y: ty };
      }
      controls.dpadDirection = { x: 0, y: 0 };
      continue;
    }

    if (dist(tx, ty, controls.castButton.x, controls.castButton.y) < controls.castButton.radius * 1.8) {
      controls.castActive = true;
      controls.castButton.active = true;
      controls.castTouchId = touch.identifier;
      controls.castDragActive = false;
      controls.castDragPos = { x: tx, y: ty };
      const s = state.stickman;
      // Initial aim
      state.mousePos = {
        x: s.x + s.facing * 220 - state.camera.x,
        y: s.y - 20 - state.camera.y,
      };
      // Start shooting only if not dragging yet
      state.mouseDown = true;
      continue;
    }

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
): void {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvasW / rect.width;
  const scaleY = canvasH / rect.height;

  for (const touch of touches) {
    const tx = (touch.clientX - rect.left) * scaleX;
    const ty = (touch.clientY - rect.top) * scaleY;

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
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        controls.castDragActive = true;
        // User is aiming; stop rapid firing
        state.mouseDown = false;
        const s = state.stickman;
        const mag = Math.sqrt(dx * dx + dy * dy);
        const range = 260;
        state.mousePos = {
          x: s.x + s.width / 2 + (dx / mag) * range - state.camera.x,
          y: s.y + s.height / 2 + (dy / mag) * range - state.camera.y,
        };
      } else {
        // User moved back to center or didn't move far enough
        controls.castDragActive = false;
        state.mousePos = { x: tx, y: ty };
        state.mouseDown = true; // resume rapid fire if in center
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
      if (controls.castDragActive) {
        // Trigger a shot on release since they were aiming
        state.mouseDown = true;
        setTimeout(() => {
          state.mouseDown = false;
        }, 50);
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

  const dpc = controls.dpadCenter;

  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(dpc.x, dpc.y, controls.dpadRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(dpc.x, dpc.y, controls.dpadRadius - 4, 0, Math.PI * 2);
  ctx.fill();

  const arrowOffset = controls.dpadRadius * 0.62;
  const arrowFont = Math.max(16, Math.round(controls.dpadRadius * 0.34));
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${arrowFont}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('<', dpc.x - arrowOffset, dpc.y);
  ctx.fillText('>', dpc.x + arrowOffset, dpc.y);
  ctx.fillText('^', dpc.x, dpc.y - arrowOffset);

  const thumbX = dpc.x + controls.dpadDirection.x * controls.dpadRadius * 0.6;
  const thumbY = dpc.y + controls.dpadDirection.y * controls.dpadRadius * 0.6;
  const thumbOuter = Math.max(16, controls.dpadRadius * 0.32);
  const thumbInner = thumbOuter * 0.66;
  ctx.globalAlpha = 0.62;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(thumbX, thumbY, thumbOuter, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.86;
  ctx.fillStyle = '#aaaaaa';
  ctx.beginPath();
  ctx.arc(thumbX, thumbY, thumbInner, 0, Math.PI * 2);
  ctx.fill();

  const jb = controls.jumpButton;
  ctx.globalAlpha = jb.active ? 0.6 : 0.25;
  ctx.fillStyle = jb.active ? '#44ff44' : '#ffffff';
  ctx.beginPath();
  ctx.arc(jb.x, jb.y, jb.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = jb.active ? 1 : 0.8;
  ctx.fillStyle = jb.active ? '#ffffff' : '#cccccc';
  ctx.font = `700 ${Math.max(10, Math.round(jb.radius * 0.36))}px sans-serif`;
  ctx.fillText((tr(state, 'jump_label' as any) || 'JUMP').toUpperCase(), jb.x, jb.y);

  const cb = controls.castButton;
  const elemColor = {
    fire: '#ff4400', water: '#0088ff', earth: '#66aa33', wind: '#aabbee',
  }[state.selectedElement];
  ctx.globalAlpha = cb.active ? 0.6 : 0.25;
  ctx.fillStyle = elemColor;
  ctx.beginPath();
  ctx.arc(cb.x, cb.y, cb.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = cb.active ? 1 : 0.6;
  ctx.fillStyle = '#ffffff';
  setUiFont(ctx, state, Math.max(9, Math.round(cb.radius * 0.34)), '800');
  ctx.fillText((tr(state, 'cast_label' as any) || 'CAST').toUpperCase(), cb.x, cb.y);

  if (controls.castDragActive) {
    const s = state.stickman;
    const px = s.x + s.width / 2 - state.camera.x;
    const py = s.y + s.height / 2 - state.camera.y;
    const mx = state.mousePos.x;
    const my = state.mousePos.y;

    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = elemColor;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 12]);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(mx, my);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = elemColor;
    ctx.beginPath();
    ctx.arc(mx, my, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  const db = controls.dashButton;
  const dashReady = state.stickman.dashCooldown <= 0;
  ctx.globalAlpha = db.active ? 0.6 : (dashReady ? 0.25 : 0.15);
  ctx.fillStyle = dashReady ? '#44ffaa' : '#555555';
  ctx.beginPath();
  ctx.arc(db.x, db.y, db.radius, 0, Math.PI * 2);
  ctx.fill();

  if (!dashReady) {
    const pct = 1 - (state.stickman.dashCooldown / 90);
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#44ffaa';
    ctx.lineWidth = Math.max(2, db.radius * 0.11);
    ctx.beginPath();
    ctx.arc(db.x, db.y, db.radius, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalAlpha = dashReady ? 1 : 0.58;
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${Math.max(9, Math.round(db.radius * 0.38))}px sans-serif`;
  ctx.fillText((tr(state, 'dash_label' as any) || 'DASH').toUpperCase(), db.x, db.y);

  for (const btn of controls.elementButtons) {
    if (!state.unlockedElements.includes(btn.id as Element)) continue;
    const isSelected = state.selectedElement === btn.id;

    ctx.globalAlpha = isSelected ? 0.6 : 0.25;
    ctx.fillStyle = btn.color;
    ctx.beginPath();
    ctx.arc(btn.x, btn.y, btn.radius, 0, Math.PI * 2);
    ctx.fill();

    if (isSelected) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, btn.radius * 0.12);
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ctx.arc(btn.x, btn.y, btn.radius + 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = isSelected ? 1 : 0.78;
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${Math.max(12, Math.round(btn.radius * 0.78))}px sans-serif`;
    ctx.fillText(btn.icon || btn.label, btn.x, btn.y);
  }

  ctx.restore();
}
