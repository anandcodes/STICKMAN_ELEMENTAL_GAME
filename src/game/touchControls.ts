import type { GameState, Element } from './types';

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
}

const DPAD_RADIUS = 55;

export function createTouchControlsState(canvasW: number, canvasH: number): TouchControlsState {
  const elementButtons: TouchControl[] = [
    { id: 'fire', x: 50, y: 50, radius: 24, label: '1', icon: '🔥', color: '#ff4400', active: false },
    { id: 'water', x: 105, y: 50, radius: 24, label: '2', icon: '💧', color: '#0088ff', active: false },
    { id: 'earth', x: 160, y: 50, radius: 24, label: '3', icon: '🌿', color: '#66aa33', active: false },
    { id: 'wind', x: 215, y: 50, radius: 24, label: '4', icon: '🌪', color: '#aabbee', active: false },
  ];

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
    elementButtons,
    jumpButton: {
      id: 'jump', x: canvasW - 90, y: canvasH - 100,
      radius: 40, label: 'JUMP', icon: '⬆', color: '#ffffff', active: false,
    },
    castButton: {
      id: 'cast', x: canvasW - 90, y: canvasH - 200,
      radius: 40, label: 'CAST', icon: '✨', color: '#ffcc00', active: false,
    },
    dashButton: {
      id: 'dash', x: canvasW - 90, y: canvasH - 300,
      radius: 30, label: 'DASH', icon: '💨', color: '#44ffaa', active: false,
    },
    dashActive: false,
    dashTouchId: null,
  };
}

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || ('ontouchstart' in window)
    || (navigator.maxTouchPoints > 0);
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
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

    // Check element buttons
    for (const btn of controls.elementButtons) {
      if (dist(tx, ty, btn.x, btn.y) < btn.radius * 1.5) {
        const elemMap: Record<string, Element> = { fire: 'fire', water: 'water', earth: 'earth', wind: 'wind' };
        const elem = elemMap[btn.id];
        if (elem && state.unlockedElements.includes(elem)) {
          state.selectedElement = elem;
        }
        return;
      }
    }

    // Check jump button
    if (dist(tx, ty, controls.jumpButton.x, controls.jumpButton.y) < controls.jumpButton.radius * 1.5 && controls.jumpTouchId === null) {
      controls.jumpActive = true;
      controls.jumpTouchId = touch.identifier;
      controls.jumpButton.active = true;
      state.keys.add(' ');
      continue;
    }

    // Check dash button
    if (dist(tx, ty, controls.dashButton.x, controls.dashButton.y) < controls.dashButton.radius * 1.5 && controls.dashTouchId === null) {
      controls.dashActive = true;
      controls.dashTouchId = touch.identifier;
      controls.dashButton.active = true;
      state.keys.add('shift');
      continue;
    }

    // Check d-pad area (left side of screen for dynamic centering, or near existing center)
    if (tx < canvasW * 0.4 && controls.dpadTouchId === null) {
      controls.dpadTouchId = touch.identifier;
      // Recenter d-pad where user touched if it's far from current center
      if (dist(tx, ty, controls.dpadCenter.x, controls.dpadCenter.y) > controls.dpadRadius) {
        controls.dpadCenter = { x: tx, y: ty };
      }
      controls.dpadDirection = { x: 0, y: 0 };
      continue;
    }

    // Check cast button
    if (dist(tx, ty, controls.castButton.x, controls.castButton.y) < controls.castButton.radius * 1.5) {
      controls.castActive = true;
      controls.castButton.active = true;
      controls.castTouchId = touch.identifier;
      // Aim forward based on facing direction
      const s = state.stickman;
      state.mousePos = {
        x: s.x + s.facing * 200 - state.camera.x,
        y: s.y - 40 - state.camera.y,
      };
      state.mouseDown = true;
      continue;
    }

    // If touching elsewhere on screen during gameplay, use as aim + cast
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

    // D-pad movement
    if (touch.identifier === controls.dpadTouchId) {
      const dx = tx - controls.dpadCenter.x;
      const dy = ty - controls.dpadCenter.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const clampedD = Math.min(d, controls.dpadRadius);
      controls.dpadDirection = { x: (dx / d) * (clampedD / controls.dpadRadius), y: (dy / d) * (clampedD / controls.dpadRadius) };
      updateDpadKeys(controls, state);
    }

    // Cast aim update
    if (touch.identifier === controls.castTouchId && controls.castActive) {
      state.mousePos = { x: tx, y: ty };
    }
  }
}

export function handleTouchEnd(
  touches: Touch[],
  controls: TouchControlsState,
  state: GameState,
): void {
  for (const touch of touches) {
    // D-pad release
    if (touch.identifier === controls.dpadTouchId) {
      controls.dpadTouchId = null;
      controls.dpadDirection = { x: 0, y: 0 };
      state.keys.delete('a');
      state.keys.delete('d');
      state.keys.delete('arrowleft');
      state.keys.delete('arrowright');
    }

    // Cast release
    if (touch.identifier === controls.castTouchId) {
      controls.castTouchId = null;
      controls.castActive = false;
      controls.castButton.active = false;
      state.mouseDown = false;
    }

    // Jump release
    if (touch.identifier === controls.jumpTouchId) {
      controls.jumpTouchId = null;
      controls.jumpActive = false;
      controls.jumpButton.active = false;
      state.keys.delete(' ');
    }

    // Dash release
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
    state.keys.add(' '); // jump
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

  // ===== D-PAD =====
  const dpc = controls.dpadCenter;

  // Outer ring
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(dpc.x, dpc.y, controls.dpadRadius, 0, Math.PI * 2);
  ctx.fill();

  // Inner background
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(dpc.x, dpc.y, controls.dpadRadius - 4, 0, Math.PI * 2);
  ctx.fill();

  // Direction arrows
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('◀', dpc.x - 35, dpc.y);
  ctx.fillText('▶', dpc.x + 35, dpc.y);
  ctx.fillText('▲', dpc.x, dpc.y - 35);

  // Joystick thumb
  const thumbX = dpc.x + controls.dpadDirection.x * controls.dpadRadius * 0.6;
  const thumbY = dpc.y + controls.dpadDirection.y * controls.dpadRadius * 0.6;
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(thumbX, thumbY, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#aaaaaa';
  ctx.beginPath();
  ctx.arc(thumbX, thumbY, 12, 0, Math.PI * 2);
  ctx.fill();

  // ===== JUMP BUTTON =====
  const jb = controls.jumpButton;
  ctx.globalAlpha = jb.active ? 0.6 : 0.3;
  ctx.fillStyle = jb.active ? '#44ff44' : '#ffffff';
  ctx.beginPath();
  ctx.arc(jb.x, jb.y, jb.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = jb.active ? 1 : 0.7;
  ctx.fillStyle = jb.active ? '#ffffff' : '#cccccc';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('JUMP', jb.x, jb.y);

  // ===== CAST BUTTON =====
  const cb = controls.castButton;
  const elemColor = {
    fire: '#ff4400', water: '#0088ff', earth: '#66aa33', wind: '#aabbee',
  }[state.selectedElement];

  ctx.globalAlpha = cb.active ? 0.6 : 0.3;
  ctx.fillStyle = cb.active ? elemColor : elemColor;
  ctx.beginPath();
  ctx.arc(cb.x, cb.y, cb.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = cb.active ? 1 : 0.7;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CAST', cb.x, cb.y);

  // ===== DASH BUTTON =====
  const db = controls.dashButton;
  const dashReady = state.stickman.dashCooldown <= 0;

  ctx.globalAlpha = db.active ? 0.6 : (dashReady ? 0.35 : 0.15);
  ctx.fillStyle = dashReady ? '#44ffaa' : '#555555';
  ctx.beginPath();
  ctx.arc(db.x, db.y, db.radius, 0, Math.PI * 2);
  ctx.fill();

  if (!dashReady) {
    // Cooldown arc
    const pct = 1 - (state.stickman.dashCooldown / 90);
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#44ffaa'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(db.x, db.y, db.radius, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalAlpha = dashReady ? 1 : 0.5;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DASH', db.x, db.y);

  // ===== ELEMENT BUTTONS (on mobile these replace the HUD element selector) =====
  // These are drawn near the top-right
  for (const btn of controls.elementButtons) {
    if (!state.unlockedElements.includes(btn.id as Element)) continue;
    const isSelected = state.selectedElement === btn.id;

    ctx.globalAlpha = isSelected ? 0.7 : 0.25;
    ctx.fillStyle = btn.color;
    ctx.beginPath();
    ctx.arc(btn.x, btn.y, btn.radius, 0, Math.PI * 2);
    ctx.fill();

    if (isSelected) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(btn.x, btn.y, btn.radius + 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = isSelected ? 1 : 0.6;
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.icon || btn.label, btn.x, btn.y);
  }

  ctx.restore();
}
