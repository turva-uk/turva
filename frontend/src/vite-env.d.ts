/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Where the API lives. Defaults to a same-origin `/api/v1` so a built
   *  bundle served by Caddy needs no configuration. */
  readonly VITE_API_ROOT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
