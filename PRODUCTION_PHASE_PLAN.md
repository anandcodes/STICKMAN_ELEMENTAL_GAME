# Elemental Stickman Production Phase Plan

## Phase 1 (Now): Stability And Release Safety
- Add save schema versioning + migration/sanitization.
- Add runtime crash containment (error boundary + loop fail-safe fallback).
- Add CI gate (`typecheck`, smoke tests, production build).
- Keep smoke tests for persistence + state transitions green on every change.

## Phase 2: Quality Baseline
- Add deterministic simulation timing (`deltaTime`) and cap frame spikes.
- Add gameplay regression tests for combat interactions and progression unlocks.
- Add linting and formatting gate (`eslint`, `prettier`) in CI.
- Add asset budget checks (max bundle and image size thresholds).

## Phase 3: Observability And Operations
- Add client-side error telemetry (Sentry or equivalent) behind env flags.
- Add release channel strategy (`staging` and `production` deploys).
- Add versioned changelog and semantic release tagging.
- Add basic analytics events for session start, level completion, deaths, and retention.

## Phase 4: Product Hardening
- Add localization-ready text extraction for all UI strings.
- Add accessibility pass: keyboard-only navigation, color contrast checks, scalable text.
- Add settings screen with persisted controls/audio/graphics options.
- Add anti-corruption checks for save tampering and impossible progression values.

### Phase 4 Status
- Done: i18n layer added and core UI text moved to translation keys.
- Done: keyboard-accessible settings dialog and scalable/high-contrast/reduced-motion options.
- Done: automated contrast checker added to CI (`npm run contrast:check`).
- Done: save integrity hash + progression/economy sanity clamping.

## Phase 5: Growth Features
- Add cloud save/account linking.
- Add leaderboard service for endless mode.
- Add achievements and daily challenges.
- Add structured content pipeline for new levels/enemies without code edits.

### Phase 5 Status
- In progress: cloud-save/account service scaffold and best-effort sync hook.
- In progress: endless leaderboard local ranking + optional remote submit endpoint.
- In progress: achievements and daily challenge progression service with persistence.
- In progress: JSON content pack pipeline (`src/game/content-pack.json`) for level overrides/appends.
