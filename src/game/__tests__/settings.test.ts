import { test, expect } from 'vitest';

import { DEFAULT_SETTINGS, SETTINGS_KEY, loadSettings, saveSettings } from '../settings';
import { setMockStorage } from './testHelpers';

test('loadSettings returns defaults when empty', () => {
  setMockStorage();
  const settings = loadSettings();
  expect(settings).toEqual(DEFAULT_SETTINGS);
});

test('loadSettings sanitizes malformed values', () => {
  setMockStorage({
    [SETTINGS_KEY]: JSON.stringify({
      locale: 'xx',
      graphicsQuality: 'ultra',
      textScale: 10,
      reducedMotion: 'yes',
      highContrast: true,
      keyboardLayout: 'vim',
      autoPauseOnBlur: false,
      muteAll: 1,
      masterVolume: -10,
      musicVolume: 2,
      sfxVolume: 0.33,
    }),
  });

  const settings = loadSettings();
  expect(settings.locale).toBe('en');
  expect(settings.graphicsQuality).toBe('low');
  expect(settings.textScale).toBe(1.5);
  expect(settings.reducedMotion).toBe(false);
  expect(settings.highContrast).toBe(true);
  expect(settings.keyboardLayout).toBe('both');
  expect(settings.autoPauseOnBlur).toBe(false);
  expect(settings.muteAll).toBe(false);
  expect(settings.masterVolume).toBe(0);
  expect(settings.musicVolume).toBe(1);
  expect(settings.sfxVolume).toBe(0.33);
  expect(settings.mobileControlMode).toBe('dual_stick');
  expect(settings.mobileAccessibilityPreset).toBe('standard');
  expect(settings.mobileSkillPreset).toBe('standard');
});

test('saveSettings persists normalized payload', () => {
  const storage = setMockStorage();

  const saved = saveSettings({
    ...DEFAULT_SETTINGS,
    locale: 'hi',
    graphicsQuality: 'medium',
    textScale: 1.2,
    muteAll: true,
    masterVolume: 0.65,
    mobileControlMode: 'one_thumb',
    mobileAccessibilityPreset: 'assisted',
    mobileSkillPreset: 'precision',
  });

  const reloaded = loadSettings();
  expect(saved.locale).toBe('hi');
  expect(reloaded.locale).toBe('hi');
  expect(reloaded.graphicsQuality).toBe('medium');
  expect(reloaded.textScale).toBe(1.2);
  expect(reloaded.muteAll).toBe(true);
  expect(reloaded.mobileControlMode).toBe('one_thumb');
  expect(reloaded.mobileAccessibilityPreset).toBe('assisted');
  expect(reloaded.mobileSkillPreset).toBe('precision');

  const raw = storage.getItem(SETTINGS_KEY);
  expect(raw).toBeTruthy();
});
