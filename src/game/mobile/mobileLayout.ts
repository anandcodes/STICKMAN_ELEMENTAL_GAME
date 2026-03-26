import type { Vec2 } from '../types';
import { MOBILE_INPUT_CONFIG } from './config';

export type LayoutProfile = 'compact' | 'phone' | 'tablet';

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface CachedCanvasRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface MobileLayoutMetrics {
  profile: LayoutProfile;
  safeArea: SafeAreaInsets;
  movementZoneTop: number;
  leftDock: Vec2;
  rightDock: Vec2;
  stickRadius: number;
  aimRadius: number;
  jumpButton: { x: number; y: number; radius: number };
  attackButton: { x: number; y: number; radius: number };
  swapButton: { x: number; y: number; radius: number };
  pauseButton: { x: number; y: number; radius: number };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createCachedCanvasRect(width = 1, height = 1): CachedCanvasRect {
  return { left: 0, top: 0, width, height };
}

export function updateCachedCanvasRect(target: CachedCanvasRect, rect: DOMRect | CachedCanvasRect): void {
  target.left = rect.left;
  target.top = rect.top;
  target.width = rect.width;
  target.height = rect.height;
}

export function classifyLayoutProfile(viewW: number, viewH: number): LayoutProfile {
  const shortSide = Math.min(viewW, viewH);
  if (shortSide <= MOBILE_INPUT_CONFIG.compactScreenMax) return 'compact';
  if (shortSide >= MOBILE_INPUT_CONFIG.tabletMinShortSide) return 'tablet';
  return 'phone';
}

export function measureSafeAreaInsets(): SafeAreaInsets {
  if (typeof window === 'undefined' || !window.visualViewport) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const vv = window.visualViewport;
  const top = Math.max(0, vv.offsetTop);
  const left = Math.max(0, vv.offsetLeft);
  const right = Math.max(0, window.innerWidth - vv.width - vv.offsetLeft);
  const bottom = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  return { top, right, bottom, left };
}

export function computeMobileLayout(
  canvasW: number,
  canvasH: number,
  viewW: number,
  viewH: number,
  controlsScale: number,
  safeArea: SafeAreaInsets = measureSafeAreaInsets(),
): MobileLayoutMetrics {
  const portrait = viewH > viewW;
  const profile = classifyLayoutProfile(viewW, viewH);
  const base = Math.min(canvasW, canvasH);
  const spreadFactor = profile === 'tablet'
    ? MOBILE_INPUT_CONFIG.tabletSpreadFactor
    : profile === 'compact'
      ? MOBILE_INPUT_CONFIG.compactSpreadFactor
      : 1;
  const scale = controlsScale || 1;
  const safeLeft = safeArea.left * (canvasW / Math.max(1, viewW));
  const safeRight = safeArea.right * (canvasW / Math.max(1, viewW));
  const safeTop = safeArea.top * (canvasH / Math.max(1, viewH));
  const safeBottom = safeArea.bottom * (canvasH / Math.max(1, viewH));

  const margin = clamp(
    base * MOBILE_INPUT_CONFIG.safeMarginFactor * scale * (profile === 'tablet' ? 1.18 : 1),
    16,
    profile === 'tablet' ? 52 : 44,
  );
  const stickRadius = clamp(
    base * MOBILE_INPUT_CONFIG.joystickBaseRadiusFactor * scale * (profile === 'tablet' ? 1.06 : 1),
    profile === 'compact' ? 40 : 42,
    profile === 'tablet' ? 146 : portrait ? 128 : 120,
  );
  const primaryRadius = clamp(
    base * MOBILE_INPUT_CONFIG.actionButtonRadiusFactor * scale * (profile === 'compact' ? 0.96 : 1),
    profile === 'compact' ? 32 : 34,
    profile === 'tablet' ? 88 : portrait ? 80 : 74,
  );
  const secondaryRadius = clamp(
    base * MOBILE_INPUT_CONFIG.secondaryButtonRadiusFactor * scale * (profile === 'compact' ? 0.96 : 1),
    24,
    profile === 'tablet' ? 66 : portrait ? 58 : 54,
  );
  const actionGap = primaryRadius * MOBILE_INPUT_CONFIG.actionButtonGapFactor;
  const movementZoneRatio = profile === 'compact'
    ? MOBILE_INPUT_CONFIG.bottomControlStartRatio - 0.03
    : profile === 'tablet'
      ? MOBILE_INPUT_CONFIG.bottomControlStartRatio + 0.04
      : MOBILE_INPUT_CONFIG.bottomControlStartRatio;

  const leftDock = {
    x: margin + safeLeft + stickRadius * (profile === 'tablet' ? 1.18 : 1.08),
    y: canvasH - margin - safeBottom - stickRadius * (profile === 'compact' ? 0.82 : 0.92),
  };

  const attackButton = {
    radius: primaryRadius,
    x: canvasW - margin - safeRight - primaryRadius * 1.02,
    y: canvasH - margin - safeBottom - primaryRadius * 0.98,
  };

  const swapButton = {
    radius: secondaryRadius,
    x: attackButton.x,
    y: attackButton.y - actionGap - secondaryRadius * 0.9,
  };

  const rightDock = {
    x: attackButton.x - primaryRadius * 2.45 * spreadFactor,
    y: attackButton.y - primaryRadius * (profile === 'compact' ? 0.26 : 0.4),
  };

  const jumpButton = {
    radius: secondaryRadius * 1.04,
    x: leftDock.x + stickRadius * (profile === 'tablet' ? 1.28 : 1.16),
    y: leftDock.y - stickRadius * (profile === 'compact' ? 0.92 : 0.62),
  };

  const pauseRadius = clamp(base * 0.03 * scale, 18, 32);
  const pauseButton = {
    radius: pauseRadius,
    x: canvasW - margin - safeRight - pauseRadius,
    y: margin + safeTop + pauseRadius,
  };

  return {
    profile,
    safeArea,
    movementZoneTop: canvasH * movementZoneRatio,
    leftDock,
    rightDock,
    stickRadius,
    aimRadius: stickRadius * 0.96,
    jumpButton,
    attackButton,
    swapButton,
    pauseButton,
  };
}
