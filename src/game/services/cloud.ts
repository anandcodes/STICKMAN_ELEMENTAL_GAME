import type { SaveData } from '../types';

const ACCOUNT_ID_KEY = 'elemental_stickman_account_id';

interface CloudConfig {
  enabled: boolean;
  endpoint: string;
}

function readCloudConfig(env?: Record<string, string | undefined>): CloudConfig {
  const source = env ?? ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {});
  const endpoint = (source.VITE_CLOUD_SAVE_ENDPOINT || '').trim();
  return {
    enabled: source.VITE_CLOUD_SAVE_ENABLED === 'true' && endpoint.length > 0,
    endpoint,
  };
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function getOrCreateAccountId(): string {
  try {
    const existing = localStorage.getItem(ACCOUNT_ID_KEY);
    if (existing) return existing;
    const next = `anon_${Date.now().toString(36)}_${randomId()}`;
    localStorage.setItem(ACCOUNT_ID_KEY, next);
    return next;
  } catch {
    return `ephemeral_${Date.now().toString(36)}_${randomId()}`;
  }
}

export async function syncCloudSave(save: SaveData): Promise<void> {
  const cfg = readCloudConfig();
  if (!cfg.enabled) return;

  const payload = {
    accountId: getOrCreateAccountId(),
    timestamp: Date.now(),
    save,
  };

  await fetch(cfg.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  });
}
