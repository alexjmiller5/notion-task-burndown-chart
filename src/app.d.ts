// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
  namespace App {
    interface Platform {
      env: Env & { NOTION_API_KEY?: string };
      ctx: ExecutionContext;
      caches: CacheStorage;
      cf?: IncomingRequestCfProperties;
    }
  }
}

export {};
