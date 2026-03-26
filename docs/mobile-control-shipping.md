# Mobile Control Shipping Guide

## Shared Gesture Contract

The deterministic driver, browser multi-touch runner, and future device automation should all use the gesture contract in `src/game/mobile/gestureContract.ts`.

- `GestureScenario` is the top-level scripted choreography.
- `GestureScenarioStep` batches concurrent contacts for the same frame.
- `GestureContactFrame.phase` supports `start`, `move`, `end`, and `cancel`.
- Timing knobs:
  - `waitFrames`: deterministic frame advance count
  - `jitterMs`: per-frame latency/jitter injection

Canonical reusable scenarios live in `src/game/mobile/testScenarios.ts`.

## Browser Runner

Run concurrent browser touch scenarios with:

```bash
npm run mobile:test:multitouch -- --url "http://127.0.0.1:4173/?mobileControls=1&mobileInputDebug=1" --flow campaign_level0 --scenario aim_drag_dash_overlap
```

Artifacts are written to `output/mobile-multitouch/`.

The runner supports two entry-flow mechanisms:

- Registered flows via `--flow`
- Built-in preludes via `--prelude`
- Custom JSON step arrays via `--prelude-json`

Available automation flow:

- `campaign_level0`: enter Campaign, wait for `levelSelect`, start level 1, dismiss the intro screen, then run shared gameplay touch scenarios.

Run all scenarios registered to a flow with:

```bash
npm run mobile:test:multitouch -- --url "http://127.0.0.1:4173/?mobileControls=1" --flow campaign_level0 --run-all-scenarios
```

List registered flows and scenarios with:

```bash
npm run mobile:test:multitouch -- --list
```

Supported prelude step types:

- `clickSelector`
- `pressKey`
- `tapCanvas`
- `waitFrames`
- `waitForState`

Use `waitForState` against `render_game_to_text` fields such as `screen`, `intro`, or `mobileControls.mode` to keep the browser runner aligned with the deterministic contract.

Template for onboarding a new mode or menu tree:

1. Register a flow in `src/game/mobile/automationFlows.ts`.
2. Point that flow at one or more shared gesture scenarios from `src/game/mobile/testScenarios.ts`.
3. Add any mode-specific `waitForState` or `tapCanvas` steps to the flow prelude.
4. Validate the flow with `--run-all-scenarios`.

## Telemetry Interpretation

Mobile input summaries are aggregated in `src/game/mobile/observability.ts`.

Key summary fields:

- `aimCancelRatio`: canceled aims / aim sessions
- `deadZoneStallMs`: total time spent active but under dead-zone thresholds
- `dashFalsePositiveRate`: potential unintended dash triggers / total dash triggers
- `swapRadialMisSelectionRate`: radial mis-selections / total radial outcomes
- `bufferedAttackSuccessRate`: successful buffered attacks / queued buffered attacks
- `oneThumb`: contextual jump/dash/attack counters and drop-error counter

Flush reasons currently include:

- `pause`
- `level_end`
- `visibility_hidden`
- `pagehide`
- `beforeunload`
- `blur`
- `recovered_checkpoint`

## Tuning Controls

Base mobile constants remain in `src/game/mobile/config.ts`.

Runtime modifications layer in this order:

1. Base config
2. Accessibility preset modifiers from `src/game/mobile/runtimeConfig.ts`
3. Skill preset modifiers from `src/game/mobile/runtimeConfig.ts`

Recommended shipping defaults:

- Control mode: `dual_stick`
- Accessibility preset: `standard`
- Skill preset: `standard`

QA overlays are gated behind development builds or `VITE_ENABLE_MOBILE_QA_TOOLS=true`. The `?mobileInputDebug=1` query param alone is no longer enough in production builds.

## Adding New Gestures or Abilities

1. Add a new command type in `src/game/mobile/mobileCommandBus.ts`.
2. Teach ownership/gesture detection in `src/game/mobile/mobileGestures.ts`.
3. Dispatch gameplay effects in `src/game/touchControls.ts`.
4. Extend deterministic scenarios in `src/game/mobile/testScenarios.ts`.
5. Add integration coverage with the synthetic driver and, if applicable, the browser runner.

Keep gameplay mutations out of the gesture recognizer. The recognizer should only emit commands.
