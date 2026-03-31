# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Stacked Task Chart is a SvelteKit web application that visualizes Notion task data as a stacked area chart over time. It runs on Deno and uses Chart.js for rendering. The app fetches task data from a Notion database, caches it locally, and provides interactive filtering and grouping controls.

## Running the App

```bash
deno task dev
```

Starts the SvelteKit dev server (Vite) on port 5173. No separate backend needed — SvelteKit handles both frontend and API routes.

Requirements: Deno 2.x, 1Password CLI (`op`) for local secrets retrieval.

## Architecture

### Runtime & Framework
- **Deno** as the JavaScript/TypeScript runtime
- **SvelteKit** (Svelte 5 with runes) for full-stack framework
- **Chart.js** for chart rendering (loaded client-side via dynamic import)
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin
- **dayjs** for date manipulation

### Server Modules (`src/lib/server/`)
- `secrets.ts` — Retrieves Notion API key via 1Password CLI (`op item get "Stacked Task Chart Notion Internal Integration Secret" --fields credential --reveal`). Falls back to `NOTION_API_KEY` env var.
- `cache.ts` — Reads/writes `notion-cache.json` using Deno file APIs
- `notion.ts` — Notion API client with full and incremental fetch modes, plus page merging

### Data Processing (`src/lib/data/`)
Pure TypeScript modules shared between server and client:
- `parser.ts` — Parses Notion pages into Task objects, applies base filters (cancelled, useless)
- `history.ts` — Parses "Tag & Date History" ledger field (format: `[YYYY-MM-DD HH:MM] --- Tags: [...], Due Date: ...`)
- `filters.ts` — Base filters (server-side) and view filters (client-side: legacy, incomplete)
- `events.ts` — Builds events Map keyed by date with created/completed/stateChange arrays
- `calculator.ts` — Day-by-day running count calculation, O(days x tasks)

### Server Routes (`src/routes/`)
- `+page.server.ts` — Load function reads cache, parses tasks, returns immediately
- `api/refresh/+server.ts` — POST endpoint: incremental Notion fetch, merge with cache, return parsed tasks

### Data Flow
1. Page load → server reads `notion-cache.json` → parses tasks → returns to client
2. Client renders chart immediately from cached data
3. `onMount` fires background POST to `/api/refresh`
4. Refresh endpoint computes `min(max_created, max_last_edited)` from cache → fetches only changed tasks from Notion → merges → writes cache → returns
5. Client updates chart reactively via Svelte 5 `$derived` pipeline

### Components (`src/components/`)
- `TaskChart.svelte` — Chart.js stacked area chart (client-only via dynamic import)
- `GroupBySwitcher.svelte` — Tag / Due Date toggle
- `DateRangeControl.svelte` — Date range inputs + month shift buttons + keyboard shortcuts
- `MultiSelectDropdown.svelte` — Reusable checkbox dropdown for tags and status filters
- `OptionToggles.svelte` — Include Incomplete and Legacy View checkboxes

## Key Concepts

**Incremental fetching**: Instead of fetching all 3600+ pages, the refresh uses the earlier of `max(created_time)` and `max(last_edited_time)` across cached pages as a threshold, then queries Notion with `last_edited_time >= threshold`. Fresh pages are merged by ID.

**History ledger**: Tasks have a "Tag & Date History" rich text field that records tag/due date changes over time. This enables historical accuracy — the chart shows what tags a task had on any given past date.

**View filters**: Base filters (cancelled, useless) apply server-side. Toggle filters (legacy cutoff 2025-01-10, incomplete tasks) apply client-side for instant response.

## Code Conventions

- TypeScript throughout, Svelte 5 runes (`$state`, `$derived`, `$effect`)
- Deno APIs for file I/O in server modules (`Deno.readTextFile`, `Deno.Command`)
- Pure functions in `src/lib/data/` — no side effects, no DOM, no Deno APIs
- Tailwind CSS utility classes for styling
