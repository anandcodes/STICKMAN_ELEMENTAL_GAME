import { test, expect, vi } from 'vitest';

import {
  __setTelemetryConfigForTests,
  initTelemetrySession,
  readTelemetryConfig,
  trackError,
  trackEvent,
  type TelemetryConfig,
} from '../telemetry';
import {
  getMobileInputObservabilitySnapshot,
  maybeCheckpointMobileInputTelemetry,
  maybeFlushMobileInputTelemetry,
  recordMobileInputDecision,
  recordMobileInputMetric,
  recoverMobileInputTelemetry,
  resetMobileInputObservability,
} from '../mobile/observability';
import { setMockStorage } from './testHelpers';
import { areMobileQaToolsEnabled, shouldEnableMobileDebugOverlay } from '../mobile/debugFlags';

function makeConfig(overrides: Partial<TelemetryConfig> = {}): TelemetryConfig {
  return {
    enabled: true,
    endpoint: 'https://telemetry.example/events',
    sampleRate: 1,
    releaseChannel: 'staging',
    appVersion: '1.2.3',
    ...overrides,
  };
}

test('readTelemetryConfig parses environment flags and clamps sample rate', () => {
  const cfg = readTelemetryConfig({
    VITE_TELEMETRY_ENABLED: 'true',
    VITE_TELEMETRY_ENDPOINT: ' https://example.com/telemetry ',
    VITE_TELEMETRY_SAMPLE_RATE: '2.5',
    VITE_RELEASE_CHANNEL: 'production',
    VITE_APP_VERSION: '9.9.9',
  });

  expect(cfg.enabled).toBe(true);
  expect(cfg.endpoint).toBe('https://example.com/telemetry');
  expect(cfg.sampleRate).toBe(1);
  expect(cfg.releaseChannel).toBe('production');
  expect(cfg.appVersion).toBe('9.9.9');
});

test('trackEvent sends payload with force option when telemetry enabled', async () => {
  const sent: Record<string, unknown>[] = [];
  const mockFetch = vi.fn().mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
    const body = String(init?.body ?? '{}');
    sent.push(JSON.parse(body) as Record<string, unknown>);
    return { ok: true } as Response;
  });
  globalThis.fetch = mockFetch;

  __setTelemetryConfigForTests(makeConfig());
  trackEvent('session_start', { source: 'unit_test' }, { force: true });
  await Promise.resolve();

  expect(sent.length).toBe(1);
  expect(sent[0].event).toBe('session_start');
  expect(sent[0].releaseChannel).toBe('staging');
  expect((sent[0].payload as Record<string, unknown>).source).toBe('unit_test');

  __setTelemetryConfigForTests(null);
});

test('initTelemetrySession emits session_return when previous session exists', async () => {
  const sent: Record<string, unknown>[] = [];
  const now = Date.now();
  setMockStorage({ elemental_stickman_last_session_at: String(now - 2 * 24 * 60 * 60 * 1000) });

  const mockFetch = vi.fn().mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
    sent.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>);
    return { ok: true } as Response;
  });
  globalThis.fetch = mockFetch;

  __setTelemetryConfigForTests(makeConfig());
  initTelemetrySession();
  await Promise.resolve();

  const names = sent.map((e) => String(e.event));
  expect(names).toContain('session_start');
  expect(names).toContain('session_return');

  const returnEvent = sent.find((e) => e.event === 'session_return');
  expect(returnEvent).toBeTruthy();
  expect(typeof (returnEvent!.payload as Record<string, unknown>).daysSinceLastSession).toBe('number');

  __setTelemetryConfigForTests(null);
});

test('trackError deduplicates repeated errors in a short window', async () => {
  const sent: Record<string, unknown>[] = [];
  const mockFetch = vi.fn().mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
    sent.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>);
    return { ok: true } as Response;
  });
  globalThis.fetch = mockFetch;

  __setTelemetryConfigForTests(makeConfig());

  trackError(new Error('boom'), { source: 'unit_test' });
  trackError(new Error('boom'), { source: 'unit_test' });
  await Promise.resolve();

  expect(sent.filter((e) => e.event === 'client_error').length).toBe(1);

  __setTelemetryConfigForTests(null);
});

test('mobile input observability flushes aggregated telemetry', async () => {
  const sent: Record<string, unknown>[] = [];
  const mockFetch = vi.fn().mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
    sent.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>);
    return { ok: true } as Response;
  });
  globalThis.fetch = mockFetch;

  resetMobileInputObservability();
  __setTelemetryConfigForTests(makeConfig());
  recordMobileInputMetric('dead_zone_exit');
  recordMobileInputMetric('buffered_attack_success');
  recordMobileInputDecision('dash_trigger', 'dt=180');
  maybeFlushMobileInputTelemetry(35000);
  await Promise.resolve();

  const snapshot = getMobileInputObservabilitySnapshot();
  expect(snapshot.counters.dead_zone_exit).toBe(1);
  expect(sent.some((event) => event.event === 'mobile_input_summary')).toBe(true);

  __setTelemetryConfigForTests(null);
});

test('mobile input telemetry checkpoints recover after abrupt termination', async () => {
  const sent: Record<string, unknown>[] = [];
  setMockStorage();
  const mockFetch = vi.fn().mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
    sent.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>);
    return { ok: true } as Response;
  });
  globalThis.fetch = mockFetch;

  resetMobileInputObservability();
  __setTelemetryConfigForTests(makeConfig());
  recordMobileInputMetric('buffered_attack_queued');
  recordMobileInputMetric('dash_trigger');
  recordMobileInputDecision('ownership_recover', 'aim_touch=4');
  maybeCheckpointMobileInputTelemetry(10000);

  const recovered = recoverMobileInputTelemetry(20000);
  await Promise.resolve();

  expect(recovered).toBe(1);
  expect(sent.some((event) => {
    if (event.event !== 'mobile_input_summary') return false;
    const payload = event.payload as Record<string, unknown>;
    return payload.reason === 'recovered_checkpoint';
  })).toBe(true);

  __setTelemetryConfigForTests(null);
});

test('mobile QA tools are disabled in production unless explicitly enabled', () => {
  expect(areMobileQaToolsEnabled({ DEV: false, VITE_ENABLE_MOBILE_QA_TOOLS: 'false' })).toBe(false);
  expect(shouldEnableMobileDebugOverlay('?mobileInputDebug=1', { DEV: false, VITE_ENABLE_MOBILE_QA_TOOLS: 'false' })).toBe(false);
  expect(shouldEnableMobileDebugOverlay('?mobileInputDebug=1', { DEV: false, VITE_ENABLE_MOBILE_QA_TOOLS: 'true' })).toBe(true);
});
