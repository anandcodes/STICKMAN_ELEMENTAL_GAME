import { test, expect, vi } from 'vitest';

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
