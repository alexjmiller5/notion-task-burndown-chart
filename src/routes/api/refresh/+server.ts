import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { getNotionApiKey } from "$lib/server/secrets.js";
import { readCache, writeCache } from "$lib/server/cache.js";
import {
  fetchAllPages,
  fetchIncrementalPages,
  getIncrementalSinceDate,
  mergePages,
} from "$lib/server/notion.js";
import { shouldFullRefresh } from "$lib/server/refresh-policy.js";
import { parseTasks } from "$lib/data/parser.js";

export const POST: RequestHandler = async ({ url }) => {
  const forceFull = url.searchParams.get("full") === "1";
  const apiKey = await getNotionApiKey();
  const cache = await readCache();

  const doFull = shouldFullRefresh({
    forceFull,
    hasCache: cache.pages.length > 0,
    lastFullRefreshAt: cache.lastFullRefreshAt,
  });

  let allPages;
  let lastFullRefreshAt = cache.lastFullRefreshAt;

  if (doFull) {
    allPages = await fetchAllPages(apiKey);
    lastFullRefreshAt = new Date().toISOString();
    console.log(`Full refresh: ${allPages.length} pages`);
  } else {
    const since = getIncrementalSinceDate(cache.pages)!;
    const fresh = await fetchIncrementalPages(apiKey, since);
    allPages = mergePages(cache.pages, fresh);
    console.log(`Incremental: ${fresh.length} fresh pages since ${since}`);
  }

  await writeCache({ lastFullRefreshAt, pages: allPages });

  const { tasks, allTags, allPriorities, allProjects, tagColors } = parseTasks(allPages);
  return json({
    tasks,
    allTags,
    allPriorities,
    allProjects,
    tagColors,
    lastFullRefreshAt,
    didFullRefresh: doFull,
  });
};
