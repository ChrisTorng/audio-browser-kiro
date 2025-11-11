/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEV_PORT: string;
  readonly VITE_DEV_HOST: string;
  readonly VITE_PREVIEW_PORT: string;
  readonly VITE_PREVIEW_HOST: string;
  readonly VITE_API_HOST: string;
  readonly VITE_API_PORT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Global constants defined in vite.config.ts
declare const __APP_VERSION__: string;
declare const __DEV__: boolean;
