/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_OPENAI_API_KEY: string;
  readonly VITE_HUGGINGFACE_API_KEY: string;
  readonly VITE_AI_CACHE_TTL: string;
  readonly VITE_AI_RATE_LIMIT_REQUESTS: string;
  readonly VITE_AI_RATE_LIMIT_INTERVAL: string;
  readonly VITE_NODE_ENV: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
