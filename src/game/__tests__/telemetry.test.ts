import test from 'node:test';
import assert from 'node:assert/strict';

import {
  __setTelemetryConfigForTests,
  initTelemetrySession,
  readTelemetryConfig,
  trackError,
  trackEvent,
  type TelemetryConfig,
} from '../telemetry';
import { setMockStorage } from './testHelpers';

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

  assert.equal(cfg.enabled, true);
  assert.equal(cfg.endpoint, 'https://example.com/telemetry');
  assert.equal(cfg.sampleRate, 1);
  assert.equal(cfg.releaseChannel, 'production');
  assert.equal(cfg.appVersion, '9.9.9');
});

test('trackEvent sends payload with force option when telemetry enabled', async () => {
  const sent: Record<string, unknown>[] = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const body = String(init?.body ?? '{}');
    sent.push(JSON.parse(body) as Record<string, unknown>);
    return { ok: true } as Response;
  }) as typeof fetch;

  __setTelemetryConfigForTests(makeConfig());
  trackEvent('session_start', { source: 'unit_test' }, { force: true });
  await Promise.resolve();

  assert.equal(sent.length, 1);
  assert.equal(sent[0].event, 'session_start');
  assert.equal(sent[0].releaseChannel, 'staging');
  assert.equal((sent[0].payload as Record<string, unknown>).source, 'unit_test');

  globalThis.fetch = originalFetch;
  __setTelemetryConfigForTests(null);
});

test('initTelemetrySession emits session_return when previous session exists', async () => {
  const sent: Record<string, unknown>[] = [];
  const originalFetch = globalThis.fetch;
  const now = Date.now();
  setMockStorage({ elemental_stickman_last_session_at: String(now - 2 * 24 * 60 * 60 * 1000) });

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    sent.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>);
    return { ok: true } as Response;
  }) as typeof fetch;

  __setTelemetryConfigForTests(makeConfig());
  initTelemetrySession();
  await Promise.resolve();

  const names = sent.map((e) => String(e.event));
  assert.ok(names.includes('session_start'));
  assert.ok(names.includes('session_return'));

  const returnEvent = sent.find((e) => e.event === 'session_return');
  assert.ok(returnEvent);
  assert.equal(typeof (returnEvent.payload as Record<string, unknown>).daysSinceLastSession, 'number');

  globalThis.fetch = originalFetch;
  __setTelemetryConfigForTests(null);
});

test('trackError deduplicates repeated errors in a short window', async () => {
  const sent: Record<string, unknown>[] = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    sent.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>);
    return { ok: true } as Response;
  }) as typeof fetch;

  __setTelemetryConfigForTests(makeConfig());

  trackError(new Error('boom'), { source: 'unit_test' });
  trackError(new Error('boom'), { source: 'unit_test' });
  await Promise.resolve();

  assert.equal(sent.filter((e) => e.event === 'client_error').length, 1);

  globalThis.fetch = originalFetch;
  __setTelemetryConfigForTests(null);
});
