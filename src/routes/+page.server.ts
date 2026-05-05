import { readCache } from "$lib/server/cache.js";
import { parseTasks } from "$lib/data/parser.js";
import type { PageServerLoad } from "./$types.js";

export const load: PageServerLoad = async () => {
  const cache = await readCache();
  const { tasks, allTags, allPriorities, allProjects, tagColors } = parseTasks(cache.pages);
  return { tasks, allTags, allPriorities, allProjects, tagColors };
};
