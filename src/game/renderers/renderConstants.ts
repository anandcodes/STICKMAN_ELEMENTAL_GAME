import type { Element } from '../types';

// Element palette shifted to jewel-like glows that fit the ancient mystic fantasy skin.
export const ELEMENT_COLORS: Record<Element, string> = {
  fire: '#ff6b2d',
  water: '#5fc4ff',
  earth: '#9c7a4d',
  wind: '#d8f1ff',
};

export const ELEMENT_GLOW: Record<Element, string> = {
  fire: 'rgba(255, 125, 60, 0.32)',
  water: 'rgba(95, 196, 255, 0.3)',
  earth: 'rgba(156, 122, 77, 0.28)',
  wind: 'rgba(216, 241, 255, 0.32)',
};

export const UI_THEME = {
  paper: '#e8dfcf',
  muted: '#c8c0b0',
  accent: '#9ae6de',
  accentStrong: '#b2f5ff',
  success: '#f39f4a',
  warning: '#ffd36a',
  danger: '#ff7c5c',
  panelA: 'rgba(18, 16, 24, 0.94)',
  panelB: 'rgba(26, 28, 36, 0.9)',
  panelBorder: 'rgba(154, 192, 201, 0.4)',
  glassBg: 'rgba(255, 240, 214, 0.03)',
  glassBorder: 'rgba(255, 240, 214, 0.12)',
};

/** Scale factor applied to visual element sizes on mobile for clarity */
export const MOBILE_SCALE = 1.15;

/** Mutable render context shared across renderers */
export const mobileRender = {
  isMobile: false,
  /** Effective device-pixel-ratio (capped at 2 for perf) */
  dpr: 1,
};

/**
 * Returns the mobile-aware size: original value scaled up when on mobile.
 * Use for particle sizes, line widths, radii, etc.
 */
export function mobileSize(value: number): number {
  return mobileRender.isMobile ? value * MOBILE_SCALE : value;
}

// ── Cartoon HUD palette (matches reference image) ──
export const HUD_COLORS = {
  hpGreen: '#4cdb30',
  hpGreenDark: '#2a8c18',
  mpBlue: '#3a9bff',
  mpBlueDark: '#1e5ca0',
  panelBg: 'rgba(0, 0, 0, 0.55)',
  panelBorder: 'rgba(255, 255, 255, 0.18)',
  scoreText: '#ffffff',
  coinsText: '#ffd700',
  levelNameBg: 'rgba(0, 0, 0, 0.5)',
} as const;

export const DPAD_COLORS = {
  base: '#5C3A1E',
  baseLight: '#7B5230',
  baseDark: '#3D2510',
  arrow: '#ffffff',
  arrowActive: '#e0e0e0',
} as const;

export const ACTION_BTN = {
  jump: { bg: '#30c43c', label: 'A', labelColor: '#fff' },
  cancel: { bg: '#666', label: 'X', labelColor: '#fff' },
  ability: { bg: '#e63b2e', label: 'B', labelColor: '#fff' },
} as const;

export const ELEMENT_CHARACTER_NAMES: Record<Element, string> = {
  fire: 'Pyros',
  water: 'Aqualis',
  earth: 'Terran',
  wind: 'Zephyr',
};

export const ELEMENT_ABILITY_NAMES: Record<Element, string> = {
  fire: 'Meteor Strike',
  water: 'Tidal Wave',
  earth: 'Quake Slam',
  wind: 'Cyclone Burst',
};

export const ELEMENT_ICONS: Record<Element, string> = {
  fire: '🔥',
  water: '💧',
  earth: '🪨',
  wind: '🌪️',
};

// Rugged serif fantasy fonts
export const FONT_UI = '"Cormorant Garamond", "Georgia", serif';
export const FONT_DISPLAY = '"Cinzel", "Cinzel Decorative", serif';
