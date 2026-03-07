import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_SETTINGS, SETTINGS_KEY, loadSettings, saveSettings } from '../settings';
import { setMockStorage } from './testHelpers';

test('loadSettings returns defaults when empty', () => {
  setMockStorage();
  const settings = loadSettings();
  assert.deepEqual(settings, DEFAULT_SETTINGS);
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
  assert.equal(settings.locale, 'en');
  assert.equal(settings.graphicsQuality, 'high');
  assert.equal(settings.textScale, 1.5);
  assert.equal(settings.reducedMotion, false);
  assert.equal(settings.highContrast, true);
  assert.equal(settings.keyboardLayout, 'both');
  assert.equal(settings.autoPauseOnBlur, false);
  assert.equal(settings.muteAll, false);
  assert.equal(settings.masterVolume, 0);
  assert.equal(settings.musicVolume, 1);
  assert.equal(settings.sfxVolume, 0.33);
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
  });

  const reloaded = loadSettings();
  assert.equal(saved.locale, 'hi');
  assert.equal(reloaded.locale, 'hi');
  assert.equal(reloaded.graphicsQuality, 'medium');
  assert.equal(reloaded.textScale, 1.2);
  assert.equal(reloaded.muteAll, true);

  const raw = storage.getItem(SETTINGS_KEY);
  assert.ok(raw);
});
