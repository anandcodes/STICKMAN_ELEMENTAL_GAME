## Android QA Checklist for Elemental Stickman

Use this checklist when testing local builds and Google Play internal/closed testing tracks.

### Functional tests

- Launch game from launcher icon without crashes.
- Verify:
  - Tutorial start and completion.
  - Campaign levels (1–20) load, can be completed, and return to menus correctly.
  - Endless wave mode starts, spawns waves, and escalates difficulty.
  - Shop upgrades can be purchased and persist across sessions.
  - Level complete, game over, and victory screens behave as expected.
  - Settings dialog opens from the in-game button and via keyboard, and all controls work.
- Test back button behavior:
  - In gameplay, back opens or routes through the pause menu (via JS handler).
  - From menus, back does not accidentally exit without confirmation.

### Device coverage

- Test on at least:
  - One low-end phone (2–3 GB RAM).
  - One mid/high-end phone.
  - One tall aspect-ratio device with a notch/punch-hole.

### Performance & stability

- Monitor:
  - Frame rate stays smooth during heavy combat and particle effects.
  - No obvious memory leaks after 20–30 minutes of continuous play.
- Background/foreground:
  - Lock/unlock device while playing; verify auto-pause and resume.
  - Switch between apps and return; check that the game continues or resumes without glitches.

### Monetization

- Ads:
  - Verify test interstitial ads load and show at expected moments (e.g., between runs).
  - Confirm that after “Remove Ads” is purchased, ads no longer show.
- In-app purchase:
  - Use a Google Play test account and test cards to buy “Remove Ads”.
  - Reinstall or install on another device with same account and confirm purchase is restored.

### Data & privacy

- Toggle analytics opt-out in Settings and confirm:
  - The toggle state persists across sessions.
  - Telemetry traffic stops when opt-out is enabled (as verified via logs or endpoint).

### Regression checks

- Run smoke tests after each major change to:
  - Web game logic.
  - Android WebView or bridge.
  - Ads or billing configuration.

