# Mobile Release Authority Report

## Release Gate Status

Automated release validation is green:

- deterministic touch integration suite passes
- synthetic multi-touch stress suite passes
- browser multi-touch runner reaches live gameplay and captures in-level artifacts
- build, typecheck, and unit tests pass

Real-device validation is still a manual release gate. This repository cannot execute Android Chrome or iOS Safari/WebView hardware sessions by itself, so those runs remain required before declaring the mobile controls fully release-authorized.

## Required Real-Device Matrix

Devices:

- Android Chrome on a mid-range device
- iOS Safari and, if applicable, the shipping WebView wrapper

Scenarios:

- `aim_drag_dash_overlap`
- `swap_radial_buffered_attack`
- `pointer_leave_reenter`
- pause/orientation change mid-gesture
- rapid element swap spam

Acceptance:

- no ghost input
- no stuck ownership
- no aim release misfire
- consistent dash timing
- pointer-bridge and touch-fallback semantics match

## Telemetry Thresholds

Use short real-tester sessions to evaluate:

- `aimCancelRatio <= 0.18`
- `dashFalsePositiveRate <= 0.05`
- `bufferedAttackSuccessRate >= 0.9`
- `swapRadialMisSelectionRate <= 0.08`

If the metrics clear those thresholds, lock:

- control mode: `dual_stick`
- accessibility preset: `standard`
- skill preset: `standard`

Keep:

- `assisted` accessibility as recommended opt-in
- `one_thumb` as experimental until false-positive and platform-drop error rates stabilize

## Crash-Safe Telemetry

`src/game/mobile/observability.ts` now checkpoints pending mobile input telemetry into local storage on a timed interval and recovers it on the next session start.

Persistence behavior:

- periodic checkpoint writes
- local ring buffer for recent unsent snapshots
- recovery flush on startup with reason `recovered_checkpoint`

This reduces data loss from sudden tab or WebView termination, but it does not guarantee delivery if telemetry is disabled or storage is unavailable.

## Post-Launch Monitoring

- watch `mobile_input_summary` volume per release channel
- compare pointer-bridge versus fallback-heavy environments
- review dash false positives after the first 1k mobile sessions
- review one-thumb mode separately from dual-stick
- inspect recovered checkpoint volume to spot unload/termination loss
- keep QA overlay disabled in production unless `VITE_ENABLE_MOBILE_QA_TOOLS=true`
