type EnvLike = Record<string, unknown>;

export interface TelemetryConfig {
  enabled: boolean;
  endpoint: string;
  sampleRate: number;
  releaseChannel: string;
  appVersion: string;
}

interface EventPayload {
  event: string;
  ts: number;
  sessionId: string;
  releaseChannel: string;
  appVersion: string;
  payload: Record<string, unknown>;
}

const LAST_SESSION_KEY = 'elemental_stickman_last_session_at';
const TELEMETRY_OPT_OUT_KEY = 'elemental_stickman_telemetry_opt_out';
const DAY_MS = 24 * 60 * 60 * 1000;
const ERROR_DEDUPE_MS = 2000;

let sessionId = makeSessionId();
const recentErrorMap = new Map<string, number>();
let testConfigOverride: TelemetryConfig | null = null;

function makeSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readEnv(): EnvLike {
  const env = (import.meta as ImportMeta & { env?: EnvLike }).env;
  return env ?? {};
}

function parseBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  }
  return fallback;
}

function parseSampleRate(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.max(0, Math.min(1, n));
}

export function readTelemetryConfig(env: EnvLike = readEnv()): TelemetryConfig {
  const enabled = parseBoolean(env.VITE_TELEMETRY_ENABLED, false);
  const endpoint = typeof env.VITE_TELEMETRY_ENDPOINT === 'string' ? env.VITE_TELEMETRY_ENDPOINT.trim() : '';
  const releaseChannel = typeof env.VITE_RELEASE_CHANNEL === 'string' && env.VITE_RELEASE_CHANNEL.trim()
    ? env.VITE_RELEASE_CHANNEL.trim()
    : 'development';
  const appVersion = typeof env.VITE_APP_VERSION === 'string' && env.VITE_APP_VERSION.trim()
    ? env.VITE_APP_VERSION.trim()
    : '0.0.0';

  return {
    enabled,
    endpoint,
    sampleRate: parseSampleRate(env.VITE_TELEMETRY_SAMPLE_RATE),
    releaseChannel,
    appVersion,
  };
}

function isOptedOut(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(TELEMETRY_OPT_OUT_KEY) === '1';
  } catch {
    return false;
  }
}

function getConfig(): TelemetryConfig {
  return testConfigOverride ?? readTelemetryConfig();
}

function shouldSend(config: TelemetryConfig, force = false): boolean {
  if (!config.enabled || !config.endpoint) return false;
  if (isOptedOut()) return false;
  if (force) return true;
  return Math.random() <= config.sampleRate;
}

function sendEvent(payload: EventPayload): void {
  const config = getConfig();
  if (!shouldSend(config, true)) return;

  const body = JSON.stringify(payload);

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function' && typeof Blob !== 'undefined') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(config.endpoint, blob);
      return;
    }
  } catch {
    // fallback to fetch
  }

  if (typeof fetch === 'function') {
    void fetch(config.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      // ignore telemetry transport errors
    });
  }
}

export function trackEvent(
  event: string,
  payload: Record<string, unknown> = {},
  opts: { force?: boolean } = {},
): void {
  const config = getConfig();
  if (!shouldSend(config, opts.force === true)) return;

  sendEvent({
    event,
    payload,
    ts: Date.now(),
    sessionId,
    releaseChannel: config.releaseChannel,
    appVersion: config.appVersion,
  });
}

export function trackError(error: unknown, context: Record<string, unknown> = {}): void {
  const errObj = error instanceof Error ? error : new Error(String(error));
  const key = `${errObj.message}|${context.source ?? 'unknown'}`;
  const now = Date.now();
  const prev = recentErrorMap.get(key);
  if (prev && now - prev < ERROR_DEDUPE_MS) return;
  recentErrorMap.set(key, now);

  trackEvent('client_error', {
    message: errObj.message,
    name: errObj.name,
    stack: errObj.stack ?? '',
    ...context,
  }, { force: true });
}

export function initTelemetrySession(): void {
  const now = Date.now();
  let daysSinceLastSession: number | null = null;

  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LAST_SESSION_KEY);
      if (raw) {
        const last = Number(raw);
        if (Number.isFinite(last) && last > 0) {
          daysSinceLastSession = Math.floor((now - last) / DAY_MS);
        }
      }
      localStorage.setItem(LAST_SESSION_KEY, String(now));
    }
  } catch {
    // ignore storage failures
  }

  trackEvent('session_start', { userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown' }, { force: true });
  if (daysSinceLastSession !== null && daysSinceLastSession > 0) {
    trackEvent('session_return', { daysSinceLastSession }, { force: true });
  }
}

export function __setTelemetryConfigForTests(config: TelemetryConfig | null): void {
  testConfigOverride = config;
  sessionId = makeSessionId();
  recentErrorMap.clear();
}

export function setTelemetryOptOut(enabled: boolean): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(TELEMETRY_OPT_OUT_KEY, enabled ? '1' : '0');
  } catch {
    // ignore storage failures
  }
}
