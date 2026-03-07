# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses semantic versioning.

## [Unreleased]
### Added
- Optional client telemetry pipeline behind `VITE_TELEMETRY_*` environment flags.
- Release channel environment presets for staging and production modes.
- Release tag automation script (`npm run release:tag`).
- CI now validates both staging and production builds.
- Accessibility contrast validation script (`npm run contrast:check`) wired into CI.
- Persistent in-game settings dialog for language, controls, audio, graphics, and accessibility.
- Localization scaffolding for major game UI screens and HUD text.
- Save-data anti-corruption hardening with integrity hashing and impossible progression clamping.
- Cloud-save/account-linking service scaffold (`VITE_CLOUD_SAVE_*`) with best-effort sync on save.
- Endless mode leaderboard service with local ranking persistence and optional remote submission.
- Achievement and daily challenge progression tracking service.
- JSON content pack pipeline (`src/game/content-pack.json`) for level overrides/appends without code edits.
- Analytics instrumentation events for:
  - session start / return
  - level completion
  - player death
  - game over

## [0.0.0] - 2026-03-08
### Added
- Initial game scaffolding and core gameplay systems.
