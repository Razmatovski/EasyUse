/// <reference types="vite/client" />

declare interface ImportMetaEnv {
  readonly VITE_GA4_MEASUREMENT_ID?: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}
