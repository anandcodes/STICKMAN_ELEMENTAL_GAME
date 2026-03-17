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

// Rugged serif fantasy fonts
export const FONT_UI = '"Cormorant Garamond", "Georgia", serif';
export const FONT_DISPLAY = '"Cinzel", "Cinzel Decorative", serif';
