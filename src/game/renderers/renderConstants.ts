import type { Element } from '../types';

export const ELEMENT_COLORS: Record<Element, string> = {
  fire: '#ff4400', water: '#0088ff', earth: '#66aa33', wind: '#aabbee',
};

export const ELEMENT_GLOW: Record<Element, string> = {
  fire: 'rgba(255, 100, 0, 0.3)', water: 'rgba(0, 100, 255, 0.3)',
  earth: 'rgba(80, 160, 40, 0.3)', wind: 'rgba(180, 200, 240, 0.3)',
};

export const UI_THEME = {
  paper: '#e9f2ff',
  muted: '#8aa2c6',
  accent: '#53b8ff',
  accentStrong: '#6ad2ff',
  success: '#62eeb8',
  warning: '#ffd36a',
  danger: '#ff7688',
  panelA: 'rgba(7, 18, 38, 0.92)',
  panelB: 'rgba(10, 35, 66, 0.85)',
  panelBorder: 'rgba(144, 211, 255, 0.35)',
  glassBg: 'rgba(255, 255, 255, 0.03)',
  glassBorder: 'rgba(255, 255, 255, 0.12)',
};

export const FONT_UI = '"Rajdhani", "Trebuchet MS", sans-serif';
export const FONT_DISPLAY = '"Orbitron", "Eurostile", sans-serif';
