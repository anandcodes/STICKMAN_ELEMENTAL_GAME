/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TELEMETRY_ENABLED?: string;
  readonly VITE_TELEMETRY_ENDPOINT?: string;
  readonly VITE_TELEMETRY_SAMPLE_RATE?: string;
  readonly VITE_RELEASE_CHANNEL?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_ENABLE_MOBILE_QA_TOOLS?: string;
  readonly VITE_CLOUD_SAVE_ENABLED?: string;
  readonly VITE_CLOUD_SAVE_ENDPOINT?: string;
  readonly VITE_LEADERBOARD_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
