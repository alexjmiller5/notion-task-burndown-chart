import type { NotionPage } from "$lib/types.js";

export function getCachePath(): string {
  return Deno.env.get("BURNDOWN_CACHE_PATH") ?? "./notion-cache.json";
}

export interface CacheData {
  lastFullRefreshAt: string | null;
  pages: NotionPage[];
}

export async function readCache(path: string = getCachePath()): Promise<CacheData> {
  try {
    const text = await Deno.readTextFile(path);
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return { lastFullRefreshAt: null, pages: parsed as NotionPage[] };
    }
    return {
      lastFullRefreshAt: parsed.lastFullRefreshAt ?? null,
      pages: (parsed.pages ?? []) as NotionPage[],
    };
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return { lastFullRefreshAt: null, pages: [] };
    }
    throw e;
  }
}

export async function writeCache(
  data: CacheData,
  path: string = getCachePath(),
): Promise<void> {
  await Deno.writeTextFile(path, JSON.stringify(data));
}
