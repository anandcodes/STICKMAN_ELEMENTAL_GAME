type EnvSource = ImportMetaEnv | Record<string, unknown> | undefined;

function parseBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') return true;
    if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') return false;
  }
  return fallback;
}

function readEnv(source?: EnvSource): ImportMetaEnv {
  if (source && typeof source === 'object') {
    return source as ImportMetaEnv;
  }
  return import.meta.env;
}

export function areMobileQaToolsEnabled(source?: EnvSource): boolean {
  const env = readEnv(source);
  return Boolean(env.DEV) || parseBoolean(env.VITE_ENABLE_MOBILE_QA_TOOLS, false);
}

export function shouldEnableMobileDebugOverlay(search = '', source?: EnvSource): boolean {
  if (!areMobileQaToolsEnabled(source)) return false;
  return new URLSearchParams(search).get('mobileInputDebug') === '1';
}
