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
import { parseTasks } from "$lib/data/parser.js";

export const POST: RequestHandler = async ({ url }) => {
  const forceFullRefresh = url.searchParams.get("full") === "1";
  const apiKey = await getNotionApiKey();
  const cached = await readCache();
  const since = !forceFullRefresh ? getIncrementalSinceDate(cached) : null;

  let freshPages;
  if (since) {
    freshPages = await fetchIncrementalPages(apiKey, since);
    console.log(`Fetched ${freshPages.length} pages incrementally since ${since}`);
  } else {
    freshPages = await fetchAllPages(apiKey);
    console.log(`Full fetch: ${freshPages.length} pages`);
  }

  const allPages = since ? mergePages(cached, freshPages) : freshPages;
  await writeCache(allPages);

  const { tasks, allTags, allPriorities, allProjects, tagColors } = parseTasks(allPages);
  return json({ tasks, allTags, allPriorities, allProjects, tagColors });
};
