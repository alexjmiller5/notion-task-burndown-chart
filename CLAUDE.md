# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Task Burndown is a SvelteKit web application that visualizes Notion task data as a stacked area chart over time. It runs on Cloudflare Workers with cache in R2, protected by Cloudflare Access, and is installable as an iOS homescreen PWA.

## Running the App

```bash
just dev     # SvelteKit dev server on port 5173 (secrets injected via op run)
just test    # Run unit tests (vitest)
just check   # All static analysis: wrangler types + svelte-check + prettier
just deploy  # test + build + wrangler deploy
```

Requirements: Bun, 1Password CLI (`op`), wrangler (via Bun).

## Architecture

### Runtime & Framework

- **Bun** as the JavaScript/TypeScript runtime and package manager
- **SvelteKit** (Svelte 5 with runes) + **`@sveltejs/adapter-cloudflare`** — deployed as a Cloudflare Worker
- **Vite** config only (`vite.config.ts`); no `svelte.config.js`
- **Chart.js** for chart rendering (loaded client-side via dynamic import)
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin
- **dayjs** for date manipulation in `src/lib/data/filters.ts` and `src/lib/data/history.ts`. All other date math is in `src/lib/data/timezone.ts` using `Intl.DateTimeFormat` for IANA timezone conversion (no dayjs plugins needed).

### Cache — R2

- Bucket: `task-burndown-cache`; binding: `CACHE` (wrangler.jsonc IaC).
- Object: `task-cache.json`; shape: `TaskCache` = `ParsedData & { lastFullRefreshAt: string | null }`, where `ParsedData = { tasks: Task[], allTags, allPriorities, allProjects, tagColors }`.
- Stores **parsed, unfiltered tasks** (~4,300 tasks, ~1.1 MB). Raw Notion pages (~16.9 MB, ~78 ms CPU to parse) exceed the Workers free-tier 10 ms CPU cap, so parsing is done once during Full Sync and the result is cached.
- Local dev: miniflare R2 via the SvelteKit platform proxy, state persisted under `.wrangler/state/`.
- One-time bootstrap: `just setup` (creates bucket, seeds local and prod via `scripts/seed-cache.ts` from legacy `notion-cache.json`).

### Server Modules (`src/lib/server/`)

- `secrets.ts` — `getNotionApiKey(env)`: reads `platform.env.NOTION_API_KEY` (Worker secret); falls back to `process.env.NOTION_API_KEY` (injected by `op run` in dev).
- `cache.ts` — R2 `bucket.get` / `bucket.put`; functions take the `R2Bucket` binding as a parameter. `readCache` returns `EMPTY_CACHE` on miss. No legacy migration.
- `notion.ts` — Notion API client with full and incremental fetch modes; `fetchPageChunk` for the chunked full-sync loop (3 Notion pages per request ≈ 4–6 ms CPU, 3 subrequests).
- `refresh-policy.ts` — Pure decision: `shouldFullRefresh` triggers true when cache is empty, when no prior full has happened, or when `lastFullRefreshAt` is ≥ 24 hours ago.

### Data Processing (`src/lib/data/`)

Pure TypeScript modules shared between server and client:

- `parser.ts` — `parseTasks(pages): ParsedData` parses Notion pages into **unfiltered** Task objects + metadata. No filtering; callers call `applyBaseFilters` themselves.
- `merge.ts` — `mergeParsedData` (id-keyed merge of incremental result into cached tasks); `getIncrementalSince` (threshold from `max(lastEditedTime)` across cached tasks).
- `history.ts` — Parses "Tag & Date History" ledger field (format: `[YYYY-MM-DD HH:MM] --- Tags: [...], Due Date: ...`)
- `filters.ts` — `applyBaseFilters` (cancelled/useless, called client-side after loading cache) and `applyViewFilters` (legacy cutoff, incomplete, project tasks — also client-side toggles).
- `timezone.ts` — `toLocalDateStr`, `addDays` (DST-safe via UTC arithmetic), `getCurrentDateStr`, plus the curated `TIMEZONES` list and `DEFAULT_TIMEZONE` (`America/New_York`).
- `presets.ts` — `getPresetRange(label, tz)` for the date-range preset buttons (7D/30D/90D/1Y/MTD/YTD/ALL).
- `events.ts` — Builds events Map keyed by date with created/completed/stateChange arrays. Takes a `tz` parameter so `created_time` (UTC ISO) buckets to the user's selected timezone.
- `calculator.ts` — Day-by-day running count calculation, O(days × tasks). Uses `addDays` from `timezone.ts` (DST-safe).

### Server Routes (`src/routes/`)

No `+page.server.ts` — chart is client-only; page has no SSR data load.

- `GET /api/tasks` — streams the R2 object body straight through (`new Response(obj.body)`, ~0 CPU); client parses + applies filters.
- `POST /api/refresh?since=<date>` — incremental sync. Reads cache (~2.5 ms parse), fetches changed pages from Notion, merges tasks by id, writes cache back (~2.3 ms stringify). Returns `{ needsFull: true }` when cache is empty or stale with no `since` param (the 24h staleness rule); returns `{ needsFull: false, freshCount, lastFullRefreshAt }` on success.
- `POST /api/refresh-chunk?cursor=<cursor>` — one step of the chunked Full Sync loop. Fetches up to 3 Notion API pages (~3 subrequests, ~4–6 ms CPU), returns `{ tasks, tagColors, …, nextCursor }`. Client accumulates chunks until `nextCursor` is null.
- `PUT /api/cache` — client streams the assembled `TaskCache` JSON into R2 after completing the chunk loop. Cheap sanity check only (non-empty, starts with `{`); CF Access restricts callers.

### Data Flow

1. **Page load**: client `onMount` → `GET /api/tasks` → streams 1.1 MB JSON → client parses, applies `applyBaseFilters` + view filters → renders chart.
2. **Today sync** (on mount, background): `POST /api/refresh?since=<start of today in selected tz>`. If `needsFull: true` → falls into Full Sync flow.
3. **Full Sync** (button or on `needsFull`): client loops `POST /api/refresh-chunk` (~15 sequential requests, ~20–30 s, "Sync N" progress on button) until `nextCursor` is null, assembles `TaskCache`, then `PUT /api/cache`. Client re-fetches `/api/tasks` after PUT.
4. Client updates chart reactively via Svelte 5 `$derived` pipeline.

**Why chunked full sync?** Workers free tier: 10 ms CPU/request + 50 subrequests/request. Parsing 16.9 MB of raw pages costs ~78 ms CPU. Storing parsed tasks (1.1 MB) and chunking the full refresh through the browser stays within both limits.

### Components (`src/components/`)

- `TaskChart.svelte` — Chart.js stacked area chart (client-only via dynamic import)
- `RangeSlider.svelte` — Dual-handle date range slider

UI controls (range presets, group-by selector, timezone dropdown, Full Sync button, toggle switches) are inlined in `src/routes/+page.svelte` rather than extracted into components.

## Secrets

- `.env.tpl` — canonical secrets manifest (op:// references, safe to commit). Single entry: `NOTION_API_KEY`.
- Local dev: `just dev` = `op run --env-file=.env.tpl -- bun run dev`.
- Production: `just sync-secrets` (or the GHA deploy workflow) runs `scripts/sync-secrets.sh` to push Worker secrets via `wrangler secret put`.
- 1Password vault: `Task Burndown`; service account: `task-burndown-ci` (read-only to that vault); SA token = repo GH secret `OP_SERVICE_ACCOUNT_TOKEN`.

## Deployment

- `just deploy` — `bun run test && bun run build && bunx wrangler deploy`.
- `just logs` — `bunx wrangler tail`.
- `just sync-secrets` — push Worker secrets from `.env.tpl` via `scripts/sync-secrets.sh`.
- GHA: `.github/workflows/deploy.yml` triggers on push to `main`; uses 1P service account for both Cloudflare credentials and Worker secrets.
- One-time `bunx wrangler login` (or `CLOUDFLARE_API_TOKEN` env var) needed before the first local deploy.

## Access & PWA

- **Cloudflare Access**: enabled on the `workers.dev` domain via the Workers dashboard toggle. Policy: Cloudflare identity provider restricted to Alex's account. App session duration: 1 month. _(Manual setup — see README.)_
- **PWA manifest**: `static/manifest.webmanifest` — name "Task Burndown" / short_name "Burndown", `display: standalone`, theme/background `#030304`, 192/512 PNG icons. Linked in `app.html` with `crossorigin="use-credentials"` — browsers fetch manifests credentialless by default, and Access blocks cookie-less requests.
- **apple-touch-icon**: `static/apple-touch-icon.png` (180×180); `<link rel="apple-touch-icon">` in `app.html`.
- **Icons**: generated by `scripts/generate-icons.ts` (heroicons chart-bar, white on #030304 rounded background); PNGs committed.
- **iOS homescreen**: standalone PWAs have an isolated cookie jar → one sign-in on first launch, then ~monthly re-auth.

## Testing

Tests live next to the modules they cover (`*.test.ts`) and run via `bun run test` (vitest). 87 tests as of the CF migration.

Coverage focuses on pure TS modules in `src/lib/data/` and `src/lib/server/` — the places where actual logic lives. Svelte component tests are intentionally not wired up.

## Key Concepts

**Incremental fetching**: Instead of fetching all ~4,300 tasks, the refresh uses `max(lastEditedTime)` across cached tasks as a threshold, then queries Notion with `last_edited_time >= threshold`. Fresh tasks are merged by ID into the cache.

**Deletions are invisible to incremental fetch**: Notion's data source query API (version `2026-03-11`) silently excludes trashed/archived pages. The only way to detect a deletion is a full refresh that replaces the cache wholesale. The chunked Full Sync loop exists partly for this reason.

**Timezone awareness**: The user picks a timezone from a curated list (default `America/New_York`). It is _not_ persisted across reloads. The selected timezone affects: `created_time` → date bucketing, range presets ("today" anchor), the slider's right edge, and `totalActive`. It does _not_ affect Notion `dueDate`/`completed` (already date-only strings) or history ledger dates (date-only strings written in the user's local TZ at edit time).

**DST safety**: `addDays` in `timezone.ts` uses `Date.UTC` + `setUTCDate` so calendar-day arithmetic never lands on the wrong day across DST transitions, regardless of host TZ.

**History ledger**: Tasks have a "Tag & Date History" rich text field that records tag/due date changes over time. This enables historical accuracy — the chart shows what tags a task had on any given past date.

**View filters**: Base filters (cancelled, useless) apply client-side via `applyBaseFilters` after loading the cache. Toggle filters (legacy cutoff 2025-01-10, incomplete tasks, project tasks) apply client-side for instant response.

## Code Conventions

- TypeScript throughout, Svelte 5 runes (`$state`, `$derived`, `$effect`)
- Cloudflare Workers APIs for server modules; pure functions in `src/lib/data/` — no side effects, no DOM, no platform APIs
- Tailwind CSS utility classes for styling
- Heroicons (inline SVG, sourced from `/Users/alexmiller/desktop/coding/reference-repos/heroicons`) for all icons; never emojis
- `wrangler.jsonc` is the IaC; worker name `task-burndown`, R2 bucket `task-burndown-cache`
