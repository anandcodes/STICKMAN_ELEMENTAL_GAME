import type { GameSettings, GraphicsQuality, KeyboardLayout, Locale } from './types';

export const SETTINGS_KEY = 'elemental_stickman_settings';
export const SETTINGS_SCHEMA_VERSION = 1;

export const DEFAULT_SETTINGS: GameSettings = {
  version: SETTINGS_SCHEMA_VERSION,
  locale: 'en',
  graphicsQuality: 'high',
  textScale: 1,
  reducedMotion: false,
  highContrast: false,
  keyboardLayout: 'both',
  autoPauseOnBlur: true,
  muteAll: false,
  masterVolume: 0.5,
  musicVolume: 0.25,
  sfxVolume: 0.7,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asLocale(value: unknown): Locale | null {
  return value === 'en' || value === 'hi' ? value : null;
}

function asGraphicsQuality(value: unknown): GraphicsQuality | null {
  return value === 'low' || value === 'medium' || value === 'high' ? value : null;
}

function asKeyboardLayout(value: unknown): KeyboardLayout | null {
  return value === 'wasd' || value === 'arrows' || value === 'both' ? value : null;
}

function normalizeSettings(raw: unknown): GameSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SETTINGS };
  }

  const data = raw as Record<string, unknown>;
  const locale = asLocale(data.locale) ?? DEFAULT_SETTINGS.locale;
  const graphicsQuality = asGraphicsQuality(data.graphicsQuality) ?? DEFAULT_SETTINGS.graphicsQuality;
  const keyboardLayout = asKeyboardLayout(data.keyboardLayout) ?? DEFAULT_SETTINGS.keyboardLayout;

  return {
    version: SETTINGS_SCHEMA_VERSION,
    locale,
    graphicsQuality,
    textScale: clamp(asNumber(data.textScale, DEFAULT_SETTINGS.textScale), 0.85, 1.5),
    reducedMotion: asBoolean(data.reducedMotion, DEFAULT_SETTINGS.reducedMotion),
    highContrast: asBoolean(data.highContrast, DEFAULT_SETTINGS.highContrast),
    keyboardLayout,
    autoPauseOnBlur: asBoolean(data.autoPauseOnBlur, DEFAULT_SETTINGS.autoPauseOnBlur),
    muteAll: asBoolean(data.muteAll, DEFAULT_SETTINGS.muteAll),
    masterVolume: clamp(asNumber(data.masterVolume, DEFAULT_SETTINGS.masterVolume), 0, 1),
    musicVolume: clamp(asNumber(data.musicVolume, DEFAULT_SETTINGS.musicVolume), 0, 1),
    sfxVolume: clamp(asNumber(data.sfxVolume, DEFAULT_SETTINGS.sfxVolume), 0, 1),
  };
}

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: GameSettings): GameSettings {
  const normalized = normalizeSettings(settings);
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
  } catch {
    // localStorage unavailable
  }
  return normalized;
}
