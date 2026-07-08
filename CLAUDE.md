# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Stacked Task Chart is a SvelteKit web application that visualizes Notion task data as a stacked area chart over time. It runs on Deno and uses Chart.js for rendering. The app fetches task data from a Notion database, caches it locally, and provides interactive filtering and grouping controls.

## Running the App

```bash
deno task dev    # SvelteKit dev server on port 5173
deno task test   # Run unit tests (also: just test)
```

Requirements: Deno 2.x, 1Password CLI (`op`) for local secrets retrieval.

## Architecture

### Runtime & Framework
- **Deno** as the JavaScript/TypeScript runtime
- **SvelteKit** (Svelte 5 with runes) for full-stack framework
- **Chart.js** for chart rendering (loaded client-side via dynamic import)
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin
- **dayjs** for date manipulation in `src/lib/data/filters.ts` and `src/lib/data/history.ts`. All other date math is in `src/lib/data/timezone.ts` using `Intl.DateTimeFormat` for IANA timezone conversion (no dayjs plugins needed).

### Server Modules (`src/lib/server/`)
- `secrets.ts` — Retrieves Notion API key via 1Password CLI (`op item get "Stacked Task Chart Notion Internal Integration Secret" --fields credential --reveal`). Falls back to `NOTION_API_KEY` env var.
- `cache.ts` — Reads/writes `notion-cache.json` using Deno file APIs. Cache shape: `{ lastFullRefreshAt: string | null, pages: NotionPage[] }`. Legacy cache files (raw array) are auto-migrated on read.
- `notion.ts` — Notion API client with full and incremental fetch modes, `mergePages` (id-keyed), `getIncrementalSinceDate`.
- `refresh-policy.ts` — Pure decision: when to do a full vs incremental refresh. Triggers full when forced, when cache is empty, when no prior full has happened, or when the last full was ≥ 24 hours ago.

### Data Processing (`src/lib/data/`)
Pure TypeScript modules shared between server and client:
- `parser.ts` — Parses Notion pages into Task objects, applies base filters (cancelled, useless)
- `history.ts` — Parses "Tag & Date History" ledger field (format: `[YYYY-MM-DD HH:MM] --- Tags: [...], Due Date: ...`)
- `filters.ts` — Base filters (server-side) and view filters (client-side: legacy, incomplete)
- `timezone.ts` — `toLocalDateStr`, `addDays` (DST-safe via UTC arithmetic), `getCurrentDateStr`, plus the curated `TIMEZONES` list and `DEFAULT_TIMEZONE` (`America/New_York`).
- `presets.ts` — `getPresetRange(label, tz)` for the date-range preset buttons (7D/30D/90D/1Y/MTD/YTD/ALL).
- `events.ts` — Builds events Map keyed by date with created/completed/stateChange arrays. Takes a `tz` parameter so `created_time` (UTC ISO) buckets to the user's selected timezone.
- `calculator.ts` — Day-by-day running count calculation, O(days x tasks). Uses `addDays` from `timezone.ts` (DST-safe).

### Server Routes (`src/routes/`)
- `+page.server.ts` — Load function reads cache, parses tasks, returns immediately
- `api/refresh/+server.ts` — POST endpoint. Calls `shouldFullRefresh` to choose full vs incremental, fetches accordingly, writes cache (updating `lastFullRefreshAt` only on full), returns parsed tasks plus refresh metadata.

### Data Flow
1. Page load → server reads `notion-cache.json` → parses tasks → returns to client
2. Client renders chart immediately from cached data
3. `onMount` fires a background "Today" sync — POST `/api/refresh?since=<start of today in selected tz>` (same as the Today button). Page load never triggers an auto-full refresh.
4. Refresh endpoint: explicit `?since=` skips the full-refresh check (unless cache is empty); `?full=1` forces full; otherwise `shouldFullRefresh` decides. On full, replaces cache wholesale and updates `lastFullRefreshAt`; on incremental, fetches changed pages since the threshold and merges by id
5. User can manually click "Full Sync" → calls `/api/refresh?full=1` → forces a full refresh (used to catch deletions, since trashed pages silently disappear from Notion's data source query)
6. Client updates chart reactively via Svelte 5 `$derived` pipeline

### Components (`src/components/`)
- `TaskChart.svelte` — Chart.js stacked area chart (client-only via dynamic import)
- `RangeSlider.svelte` — Dual-handle date range slider

UI controls (range presets, group-by selector, timezone dropdown, Full Sync button, toggle switches) are inlined in `src/routes/+page.svelte` rather than extracted into components.

## Key Concepts

**Incremental fetching**: Instead of fetching all 3600+ pages, the refresh uses the earlier of `max(created_time)` and `max(last_edited_time)` across cached pages as a threshold, then queries Notion with `last_edited_time >= threshold`. Fresh pages are merged by ID.

**Deletions are invisible to incremental fetch**: Notion's data source query API (version `2026-03-11`) silently excludes trashed/archived pages and provides no way to query for them (no `in_trash` filter, no top-level `archived` param). The only way to detect a deletion is a full refresh that replaces the cache wholesale. The manual "Full Sync" button exists for this reason (page load no longer auto-triggers a full refresh; the 24h staleness rule in `refresh-policy.ts` only applies to plain `/api/refresh` calls with no `since` param).

**Timezone awareness**: The user picks a timezone from a curated list (default `America/New_York`). It is *not* persisted across reloads. The selected timezone affects: `created_time` → date bucketing, range presets ("today" anchor), the slider's right edge, and `totalActive`. It does *not* affect Notion `dueDate`/`completed` (already date-only strings) or history ledger dates (date-only strings written in the user's local TZ at edit time).

**DST safety**: `addDays` in `timezone.ts` uses `Date.UTC` + `setUTCDate` so calendar-day arithmetic never lands on the wrong day across DST transitions, regardless of host TZ.

**History ledger**: Tasks have a "Tag & Date History" rich text field that records tag/due date changes over time. This enables historical accuracy — the chart shows what tags a task had on any given past date.

**View filters**: Base filters (cancelled, useless) apply server-side. Toggle filters (legacy cutoff 2025-01-10, incomplete tasks) apply client-side for instant response.

## Nix module + hermetic build (`nix/`)

`nix/flake.nix` exports two outputs:

- `packages.<system>.default` — hermetic SvelteKit build via a two-derivation pattern (fixed-output dep cache pinned to `deno.lock`, then a sandboxed build using `--cached-only`). Built artifact contains `build/`, `node_modules/`, and copies of `package.json`/`deno.json`/`deno.lock`.
- `nixosModules.default` — `services.burndown` systemd unit + optional `tailscale serve` oneshot. Uses `DynamicUser` + `StateDirectory=burndown` so the cache file lives at `/var/lib/burndown/notion-cache.json`. Reads `NOTION_API_KEY` from `services.burndown.envFile` (default `/etc/burndown.env`, mode 0600).

Local build smoke test (Mac): `cd nix && nix build .#packages.aarch64-darwin.default && deno run -A result/build/index.js`.

## Deployment

Production deployment target is a Raspberry Pi running Ubuntu, on the user's tailnet, exposed only to the tailnet via `tailscale serve` (not funnel — that would be public).

- `deploy/burndown.service.template` — systemd unit, rendered with values from `.deploy.env` at deploy time.
- `deploy/setup.sh` — one-time Pi-side bootstrap (installs Deno via `curl | sh`, configures `tailscale serve`).
- `.deploy.env` (gitignored, copy from `.deploy.env.example`) — Pi hostname, user, port, `ORIGIN` URL.
- `justfile` — deploy targets:
  - `just deploy-bootstrap` — first time only: scp the unit + setup script, install Deno, configure tailscale serve, then deploy.
  - `just deploy` — build locally with `adapter-node`, rsync `build/` to the Pi, `systemctl restart burndown`.
  - `just deploy-logs` / `just deploy-status` / `just deploy-stop` / `just deploy-uninstall` — operational helpers.

Build is intentionally local (Pi is slow). `notion-cache.json` lives in the deploy directory on the Pi (set as `WorkingDirectory` in the unit) and is preserved across deploys.

Secrets on the Pi still come from the `op` CLI invoked at runtime by `secrets.ts` — same code path as local dev. The systemd service runs as the user that's signed into 1Password CLI on the Pi.

## Testing

Tests live next to the modules they cover (`*.test.ts`) and run via `deno test -A --unstable-sloppy-imports` (the `--unstable-sloppy-imports` flag lets Deno resolve the codebase's `.js` import suffixes against `.ts` files, matching SvelteKit's convention). The test runner is Deno's native one with `@std/assert`.

Coverage focuses on pure TS modules in `src/lib/data/` and `src/lib/server/` — the places where actual logic lives. Svelte component tests are intentionally not wired up.

## Code Conventions

- TypeScript throughout, Svelte 5 runes (`$state`, `$derived`, `$effect`)
- Deno APIs for file I/O in server modules (`Deno.readTextFile`, `Deno.Command`)
- Pure functions in `src/lib/data/` — no side effects, no DOM, no Deno APIs
- Tailwind CSS utility classes for styling
- Heroicons (inline SVG, sourced from `/Users/alexmiller/desktop/coding/reference-repos/heroicons`) for all icons; never emojis
