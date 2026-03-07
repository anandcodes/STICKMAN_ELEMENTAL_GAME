# Release Process

## Build Channels
- Staging build: `npm run build:staging`
- Production build: `npm run build:production`

Environment files:
- `.env.staging`
- `.env.production`
- `.env.example` (template)

## Telemetry Flags
- `VITE_TELEMETRY_ENABLED`
- `VITE_TELEMETRY_ENDPOINT`
- `VITE_TELEMETRY_SAMPLE_RATE`
- `VITE_RELEASE_CHANNEL`
- `VITE_APP_VERSION`
- `VITE_CLOUD_SAVE_ENABLED`
- `VITE_CLOUD_SAVE_ENDPOINT`
- `VITE_LEADERBOARD_ENDPOINT`

Telemetry is disabled unless both:
- `VITE_TELEMETRY_ENABLED=true`
- `VITE_TELEMETRY_ENDPOINT` is non-empty.

Cloud save sync is disabled unless:
- `VITE_CLOUD_SAVE_ENABLED=true`
- `VITE_CLOUD_SAVE_ENDPOINT` is non-empty.

Leaderboard upload is disabled unless:
- `VITE_LEADERBOARD_ENDPOINT` is non-empty.

## Content Pipeline
- Structured content pack file: `src/game/content-pack.json`
- Supports:
  - `levelOverrides` for patching built-in levels without code edits
  - `appendedLevels` for adding fully defined extra levels

## Tagging A Release
1. Update `package.json` version and `CHANGELOG.md`.
2. Commit your changes.
3. Create tag:
   - Local: `npm run release:tag`
   - Local + push: `npm run release:tag:push`
