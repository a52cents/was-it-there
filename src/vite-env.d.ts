/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PLATFORM?: string;
  readonly VITE_CRAZYGAMES_REWARDED_ADS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
