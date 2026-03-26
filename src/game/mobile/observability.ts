import { trackEvent } from '../telemetry';

export type MobileInputMetric =
  | 'dead_zone_exit'
  | 'canceled_aim'
  | 'aim_session_start'
  | 'buffered_attack_queued'
  | 'buffered_attack_success'
  | 'buffered_attack_expired'
  | 'dash_trigger'
  | 'dash_false_positive'
  | 'missed_dash_attempt'
  | 'swap_radial_selection'
  | 'swap_radial_misselection'
  | 'movement_dead_zone_stall_ms'
  | 'aim_dead_zone_stall_ms'
  | 'one_thumb_jump_trigger'
  | 'one_thumb_dash_trigger'
  | 'one_thumb_attack_release'
  | 'one_thumb_platform_drop_error';

export interface MobileInputDecision {
  at: number;
  label: string;
  detail: string;
}

interface PersistedDecision {
  label: string;
  detail: string;
  ageMs: number;
}

interface PersistedMobileInputSnapshot {
  ts: number;
  reason: string;
  summary: ReturnType<typeof getMobileInputSummary>;
  counters: Record<MobileInputMetric, number>;
  recentDecisions: PersistedDecision[];
}

const METRIC_KEYS: MobileInputMetric[] = [
  'dead_zone_exit',
  'canceled_aim',
  'aim_session_start',
  'buffered_attack_queued',
  'buffered_attack_success',
  'buffered_attack_expired',
  'dash_trigger',
  'dash_false_positive',
  'missed_dash_attempt',
  'swap_radial_selection',
  'swap_radial_misselection',
  'movement_dead_zone_stall_ms',
  'aim_dead_zone_stall_ms',
  'one_thumb_jump_trigger',
  'one_thumb_dash_trigger',
  'one_thumb_attack_release',
  'one_thumb_platform_drop_error',
];

const totals: Record<MobileInputMetric, number> = {
  dead_zone_exit: 0,
  canceled_aim: 0,
  aim_session_start: 0,
  buffered_attack_queued: 0,
  buffered_attack_success: 0,
  buffered_attack_expired: 0,
  dash_trigger: 0,
  dash_false_positive: 0,
  missed_dash_attempt: 0,
  swap_radial_selection: 0,
  swap_radial_misselection: 0,
  movement_dead_zone_stall_ms: 0,
  aim_dead_zone_stall_ms: 0,
  one_thumb_jump_trigger: 0,
  one_thumb_dash_trigger: 0,
  one_thumb_attack_release: 0,
  one_thumb_platform_drop_error: 0,
};

const pending: Record<MobileInputMetric, number> = {
  dead_zone_exit: 0,
  canceled_aim: 0,
  aim_session_start: 0,
  buffered_attack_queued: 0,
  buffered_attack_success: 0,
  buffered_attack_expired: 0,
  dash_trigger: 0,
  dash_false_positive: 0,
  missed_dash_attempt: 0,
  swap_radial_selection: 0,
  swap_radial_misselection: 0,
  movement_dead_zone_stall_ms: 0,
  aim_dead_zone_stall_ms: 0,
  one_thumb_jump_trigger: 0,
  one_thumb_dash_trigger: 0,
  one_thumb_attack_release: 0,
  one_thumb_platform_drop_error: 0,
};

const recentDecisions: MobileInputDecision[] = [];
const FLUSH_INTERVAL_MS = 30000;
const CHECKPOINT_INTERVAL_MS = 10000;
const MAX_DECISIONS = 8;
const MAX_RECOVERY_EVENTS = 6;
const MOBILE_INPUT_CHECKPOINT_KEY = 'elemental_stickman_mobile_input_checkpoint';
const MOBILE_INPUT_RECOVERY_BUFFER_KEY = 'elemental_stickman_mobile_input_recovery_buffer';
let lastFlushAt = 0;
let lastCheckpointAt = 0;

export function recordMobileInputMetric(metric: MobileInputMetric, count = 1): void {
  totals[metric] += count;
  pending[metric] += count;
}

export function recordMobileInputDecision(label: string, detail: string): void {
  recentDecisions.push({ at: Date.now(), label, detail });
  while (recentDecisions.length > MAX_DECISIONS) {
    recentDecisions.shift();
  }
}

export function maybeFlushMobileInputTelemetry(nowMs = Date.now()): void {
  if (lastFlushAt > 0 && nowMs - lastFlushAt < FLUSH_INTERVAL_MS) return;
  if (!hasPendingMetrics()) return;

  trackEvent('mobile_input_summary', {
    summary: getMobileInputSummary(),
    counters: { ...pending },
    recentDecisions: recentDecisions.slice(-4).map((entry) => ({
      label: entry.label,
      detail: entry.detail,
      ageMs: Math.max(0, nowMs - entry.at),
    })),
  });

  resetPendingState(nowMs);
}

export function flushMobileInputTelemetry(reason: string, nowMs = Date.now(), extra: Record<string, unknown> = {}): void {
  if (!hasPendingMetrics()) return;
  trackEvent('mobile_input_summary', {
    reason,
    summary: getMobileInputSummary(),
    counters: { ...pending },
    recentDecisions: recentDecisions.slice(-6).map((entry) => ({
      label: entry.label,
      detail: entry.detail,
      ageMs: Math.max(0, nowMs - entry.at),
    })),
    ...extra,
  }, { force: true });

  resetPendingState(nowMs);
}

export function maybeCheckpointMobileInputTelemetry(nowMs = Date.now()): void {
  if (lastCheckpointAt > 0 && nowMs - lastCheckpointAt < CHECKPOINT_INTERVAL_MS) return;
  if (!hasPendingMetrics()) {
    clearPersistedSnapshots();
    return;
  }

  const snapshot = buildPersistedSnapshot('checkpoint', nowMs);
  writeJson(MOBILE_INPUT_CHECKPOINT_KEY, snapshot);

  const ring = readJson<PersistedMobileInputSnapshot[]>(MOBILE_INPUT_RECOVERY_BUFFER_KEY) ?? [];
  const previous = ring[ring.length - 1];
  if (!previous || previous.ts !== snapshot.ts) {
    ring.push(snapshot);
    while (ring.length > MAX_RECOVERY_EVENTS) {
      ring.shift();
    }
    writeJson(MOBILE_INPUT_RECOVERY_BUFFER_KEY, ring);
  }
  lastCheckpointAt = nowMs;
}

export function recoverMobileInputTelemetry(nowMs = Date.now()): number {
  const recovered = collectPersistedSnapshots();
  if (recovered.length === 0) return 0;

  recovered.forEach((snapshot) => {
    trackEvent('mobile_input_summary', {
      reason: `recovered_${snapshot.reason}`,
      summary: snapshot.summary,
      counters: snapshot.counters,
      checkpointTs: snapshot.ts,
      recoveredAt: nowMs,
      recentDecisions: snapshot.recentDecisions,
    }, { force: true });
  });

  clearPersistedSnapshots();
  lastFlushAt = nowMs;
  return recovered.length;
}

export function getMobileInputSummary() {
  const aimSessions = Math.max(1, totals.aim_session_start);
  const bufferedQueued = Math.max(1, totals.buffered_attack_queued);
  const swapTotal = Math.max(1, totals.swap_radial_selection + totals.swap_radial_misselection);
  const dashTriggers = Math.max(1, totals.dash_trigger);

  return {
    aimCancelRatio: totals.canceled_aim / aimSessions,
    deadZoneStallMs: {
      movement: totals.movement_dead_zone_stall_ms,
      aim: totals.aim_dead_zone_stall_ms,
    },
    dashFalsePositiveRate: totals.dash_false_positive / dashTriggers,
    swapRadialMisSelectionRate: totals.swap_radial_misselection / swapTotal,
    bufferedAttackSuccessRate: totals.buffered_attack_success / bufferedQueued,
    oneThumb: {
      jumpTriggers: totals.one_thumb_jump_trigger,
      dashTriggers: totals.one_thumb_dash_trigger,
      attackReleases: totals.one_thumb_attack_release,
      platformDropErrors: totals.one_thumb_platform_drop_error,
    },
  };
}

export function getMobileInputObservabilitySnapshot() {
  return {
    counters: { ...totals },
    summary: getMobileInputSummary(),
    recentDecisions: recentDecisions.slice(),
    lastFlushAt,
    lastCheckpointAt,
  };
}

export function resetMobileInputObservability(): void {
  for (const key of METRIC_KEYS) {
    totals[key] = 0;
    pending[key] = 0;
  }
  recentDecisions.length = 0;
  lastFlushAt = 0;
  lastCheckpointAt = 0;
  clearPersistedSnapshots();
}

function hasPendingMetrics(): boolean {
  return METRIC_KEYS.some((key) => pending[key] > 0);
}

function resetPendingState(nowMs: number): void {
  for (const key of METRIC_KEYS) {
    pending[key] = 0;
  }
  lastFlushAt = nowMs;
  lastCheckpointAt = nowMs;
  clearPersistedSnapshots();
}

function buildPersistedSnapshot(reason: string, nowMs: number): PersistedMobileInputSnapshot {
  return {
    ts: nowMs,
    reason,
    summary: getMobileInputSummary(),
    counters: { ...pending },
    recentDecisions: recentDecisions.slice(-6).map((entry) => ({
      label: entry.label,
      detail: entry.detail,
      ageMs: Math.max(0, nowMs - entry.at),
    })),
  };
}

function collectPersistedSnapshots(): PersistedMobileInputSnapshot[] {
  const ring = readJson<PersistedMobileInputSnapshot[]>(MOBILE_INPUT_RECOVERY_BUFFER_KEY) ?? [];
  const checkpoint = readJson<PersistedMobileInputSnapshot>(MOBILE_INPUT_CHECKPOINT_KEY);
  const merged = [...ring];
  if (checkpoint && !merged.some((entry) => entry.ts === checkpoint.ts)) {
    merged.push(checkpoint);
  }
  return merged.sort((a, b) => a.ts - b.ts);
}

function clearPersistedSnapshots(): void {
  removeKey(MOBILE_INPUT_CHECKPOINT_KEY);
  removeKey(MOBILE_INPUT_RECOVERY_BUFFER_KEY);
}

function readJson<T>(key: string): T | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
}

function removeKey(key: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(key);
  } catch {
    // ignore storage failures
  }
}
