import { expect, test } from "vitest";
import { CACHE_KEY, EMPTY_CACHE, readCache, writeCache } from "./cache.ts";
import type { TaskCache } from "$lib/types.js";

function fakeBucket() {
  const store = new Map<string, string>();
  return {
    store,
    async get(key: string) {
      const v = store.get(key);
      return v === undefined ? null : { json: async () => JSON.parse(v) };
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
  };
}

test("readCache returns EMPTY_CACHE when object missing", async () => {
  const bucket = fakeBucket();
  expect(await readCache(bucket as unknown as R2Bucket)).toEqual(EMPTY_CACHE);
});

test("writeCache then readCache round-trips", async () => {
  const bucket = fakeBucket();
  const data: TaskCache = { ...EMPTY_CACHE, lastFullRefreshAt: "2026-07-08T00:00:00.000Z" };
  await writeCache(bucket as unknown as R2Bucket, data);
  expect(bucket.store.has(CACHE_KEY)).toEqual(true);
  expect(await readCache(bucket as unknown as R2Bucket)).toEqual(data);
});

test("readCache returns a fresh object each call (no shared singleton)", async () => {
  const bucket = fakeBucket();
  const first = await readCache(bucket as unknown as R2Bucket);
  first.tasks.push({} as never);
  const second = await readCache(bucket as unknown as R2Bucket);
  expect(second.tasks).toEqual([]);
  expect(EMPTY_CACHE.tasks).toEqual([]);
});
