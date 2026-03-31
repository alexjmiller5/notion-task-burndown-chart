import type { NotionPage } from "$lib/types.js";

const CACHE_FILE = "notion-cache.json";

function getCachePath(): string {
  // Resolve relative to the project root
  return CACHE_FILE;
}

export async function readCache(): Promise<NotionPage[]> {
  try {
    const text = await Deno.readTextFile(getCachePath());
    return JSON.parse(text) as NotionPage[];
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return [];
    }
    throw e;
  }
}

export async function writeCache(pages: NotionPage[]): Promise<void> {
  await Deno.writeTextFile(getCachePath(), JSON.stringify(pages));
}
