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
  castActive: boolean;
  castTouchId: number | null;
  castPosition: { x: number; y: number };
  elementButtons: TouchControl[];
  jumpButton: TouchControl;
  castButton: TouchControl;
}

const DPAD_RADIUS = 55;
const BUTTON_RADIUS = 30;

export function createTouchControlsState(canvasW: number, canvasH: number): TouchControlsState {
  const dpadCenterX = 90;
  const dpadCenterY = canvasH - 100;

  const elementButtons: TouchControl[] = [
    { id: 'fire', x: canvasW - 160, y: 30, radius: 22, label: '1', icon: '🔥', color: '#ff4400', active: false },
    { id: 'water', x: canvasW - 110, y: 30, radius: 22, label: '2', icon: '💧', color: '#0088ff', active: false },
    { id: 'earth', x: canvasW - 60, y: 30, radius: 22, label: '3', icon: '🌿', color: '#66aa33', active: false },
    { id: 'wind', x: canvasW - 10, y: 30, radius: 22, label: '4', icon: '🌪', color: '#aabbee', active: false },
  ];

  return {
    visible: false,
    dpadCenter: { x: dpadCenterX, y: dpadCenterY },
    dpadRadius: DPAD_RADIUS,
    dpadTouchId: null,
    dpadDirection: { x: 0, y: 0 },
    jumpActive: false,
    castActive: false,
    castTouchId: null,
    castPosition: { x: canvasW / 2, y: canvasH / 2 },
    elementButtons,
    jumpButton: {
      id: 'jump', x: canvasW - 80, y: canvasH - 90,
      radius: BUTTON_RADIUS, label: 'JUMP', icon: '⬆', color: '#ffffff', active: false,
    },
    castButton: {
      id: 'cast', x: canvasW - 80, y: canvasH - 160,
      radius: BUTTON_RADIUS, label: 'CAST', icon: '✨', color: '#ffcc00', active: false,
    },
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
      if (dist(tx, ty, btn.x, btn.y) < btn.radius + 10) {
        const elemMap: Record<string, Element> = { fire: 'fire', water: 'water', earth: 'earth', wind: 'wind' };
        const elem = elemMap[btn.id];
        if (elem && state.unlockedElements.includes(elem)) {
          state.selectedElement = elem;
        }
        return;
      }
    }

    // Check jump button
    if (dist(tx, ty, controls.jumpButton.x, controls.jumpButton.y) < controls.jumpButton.radius + 15) {
      controls.jumpActive = true;
      controls.jumpButton.active = true;
      state.keys.add(' ');
      return;
    }

    // Check cast button
    if (dist(tx, ty, controls.castButton.x, controls.castButton.y) < controls.castButton.radius + 15) {
      controls.castActive = true;
      controls.castButton.active = true;
      controls.castTouchId = touch.identifier;
      // Aim forward based on facing direction
      const s = state.stickman;
      state.mousePos = {
        x: s.x + s.facing * 200 - state.camera.x,
        y: s.y - 20 - state.camera.y,
      };
      state.mouseDown = true;
      return;
    }

    // Check d-pad area
    if (dist(tx, ty, controls.dpadCenter.x, controls.dpadCenter.y) < controls.dpadRadius + 25) {
      controls.dpadTouchId = touch.identifier;
      const dx = tx - controls.dpadCenter.x;
      const dy = ty - controls.dpadCenter.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      controls.dpadDirection = { x: dx / d, y: dy / d };
      updateDpadKeys(controls, state);
      return;
    }

    // If touching elsewhere on screen during gameplay, use as aim + cast
    if (state.screen === 'playing' && !state.showLevelIntro) {
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
  }

  // Jump release (any ended touch)
  if (controls.jumpActive) {
    controls.jumpActive = false;
    controls.jumpButton.active = false;
    state.keys.delete(' ');
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
  _W: number,
  _H: number,
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
