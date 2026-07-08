import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { getNotionApiKey } from "$lib/server/secrets.js";
import { readCache, writeCache } from "$lib/server/cache.js";
import { fetchIncrementalPages } from "$lib/server/notion.js";
import { shouldFullRefresh } from "$lib/server/refresh-policy.js";
import { parseTasks } from "$lib/data/parser.js";
import { getIncrementalSince, mergeParsedData } from "$lib/data/merge.js";

export const POST: RequestHandler = async ({ url, platform }) => {
  const env = platform!.env;
  const sinceParam = url.searchParams.get("since");
  const cache = await readCache(env.CACHE);
  const hasCache = cache.tasks.length > 0;

  // Full syncs are the client's job (chunked loop) — this endpoint only says so.
  const needsFull =
    !hasCache ||
    (sinceParam === null &&
      shouldFullRefresh({ forceFull: false, hasCache, lastFullRefreshAt: cache.lastFullRefreshAt }));
  if (needsFull) return json({ needsFull: true });

  const since = sinceParam ?? getIncrementalSince(cache.tasks)!;
  const fresh = await fetchIncrementalPages(getNotionApiKey(env), since);
  const merged = mergeParsedData(cache, parseTasks(fresh));
  const data = { ...merged, lastFullRefreshAt: cache.lastFullRefreshAt };
  await writeCache(env.CACHE, data);
  return json({ needsFull: false, freshCount: fresh.length, lastFullRefreshAt: data.lastFullRefreshAt });
};
