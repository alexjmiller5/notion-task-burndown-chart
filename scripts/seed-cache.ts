// One-off: convert the legacy raw-pages cache file into the parsed TaskCache
// shape and stage it for `wrangler r2 object put` (see `just setup`).
// Run: bun scripts/seed-cache.ts   (bun resolves $lib via tsconfig paths;
// run `bun run prepare` first so .svelte-kit/tsconfig.json exists)
import { parseTasks } from "../src/lib/data/parser.ts";
import type { NotionPage, TaskCache } from "../src/lib/types.ts";

const raw = JSON.parse(await Bun.file("notion-cache.json").text());
const pages: NotionPage[] = Array.isArray(raw) ? raw : raw.pages;
const cache: TaskCache = {
  lastFullRefreshAt: Array.isArray(raw) ? null : (raw.lastFullRefreshAt ?? null),
  ...parseTasks(pages),
};
await Bun.write("/tmp/task-cache-seed.json", JSON.stringify(cache));
console.log(`seeded ${cache.tasks.length} tasks from ${pages.length} pages -> /tmp/task-cache-seed.json`);
