import { assertEquals } from "@std/assert";
import { readCache, writeCache } from "./cache.ts";
import type { NotionPage } from "$lib/types.js";

function makePage(id: string): NotionPage {
  return {
    id,
    created_time: "2026-05-01T00:00:00.000Z",
    last_edited_time: "2026-05-01T00:00:00.000Z",
    properties: {},
    archived: false,
    in_trash: false,
    url: "",
  };
}

async function withTempCache<T>(fn: (path: string) => Promise<T>): Promise<T> {
  const dir = await Deno.makeTempDir();
  const path = `${dir}/cache.json`;
  try {
    return await fn(path);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}

Deno.test("readCache — missing file returns empty cache with null timestamp", async () => {
  await withTempCache(async (path) => {
    const cache = await readCache(path);
    assertEquals(cache.pages, []);
    assertEquals(cache.lastFullRefreshAt, null);
  });
});

Deno.test("readCache — legacy array format migrates to {lastFullRefreshAt:null, pages}", async () => {
  await withTempCache(async (path) => {
    const legacy = [makePage("a"), makePage("b")];
    await Deno.writeTextFile(path, JSON.stringify(legacy));
    const cache = await readCache(path);
    assertEquals(cache.pages.length, 2);
    assertEquals(cache.lastFullRefreshAt, null);
  });
});

Deno.test("readCache — new structured format round-trips", async () => {
  await withTempCache(async (path) => {
    const data = {
      lastFullRefreshAt: "2026-05-04T10:00:00.000Z",
      pages: [makePage("a")],
    };
    await Deno.writeTextFile(path, JSON.stringify(data));
    const cache = await readCache(path);
    assertEquals(cache.lastFullRefreshAt, "2026-05-04T10:00:00.000Z");
    assertEquals(cache.pages.length, 1);
    assertEquals(cache.pages[0].id, "a");
  });
});

Deno.test("writeCache — writes new structured format", async () => {
  await withTempCache(async (path) => {
    await writeCache({
      lastFullRefreshAt: "2026-05-04T10:00:00.000Z",
      pages: [makePage("x")],
    }, path);
    const text = await Deno.readTextFile(path);
    const parsed = JSON.parse(text);
    assertEquals(parsed.lastFullRefreshAt, "2026-05-04T10:00:00.000Z");
    assertEquals(parsed.pages.length, 1);
    assertEquals(parsed.pages[0].id, "x");
  });
});

Deno.test("writeCache then readCache — round trip", async () => {
  await withTempCache(async (path) => {
    const data = {
      lastFullRefreshAt: "2026-05-04T10:00:00.000Z",
      pages: [makePage("a"), makePage("b")],
    };
    await writeCache(data, path);
    const back = await readCache(path);
    assertEquals(back.lastFullRefreshAt, data.lastFullRefreshAt);
    assertEquals(back.pages.length, 2);
  });
});
