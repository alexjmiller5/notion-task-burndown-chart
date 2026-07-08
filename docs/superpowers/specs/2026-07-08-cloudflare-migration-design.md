# Cloudflare Migration Design

**Date:** 2026-07-08
**Status:** Approved

Migrate the task burndown dashboard from the Deno/OCI-NixOS stack to Alex's
cf-site paradigm: SvelteKit on Cloudflare Workers, cache in R2, Cloudflare
Access in front, installable as an iOS homescreen app.

## Goals

- Host on Cloudflare (free tier), private to Alex via Cloudflare Access.
- Hosted data layer: the Notion cache moves from a local JSON file to R2.
- Usable as an iOS "Add to Home Screen" app: sign-in rarely (monthly at
  worst), proper app icon and name.
- Repo lands in the exact shape of the `cf-site` template.

## Non-goals

- No scheduled/cron refresh (GHA full-sync variant considered and rejected).
- No paid Cloudflare plan — the design must fit Workers free tier
  (measured: hard 10ms CPU/request, 50 subrequests/request).

## Revision 2 (same day)

Measurement invalidated v1's "raw pages in R2, parse server-side" plan:
the cache is 16.9 MB / 4,302 raw pages; parse+stringify costs ~78 ms CPU
(vs the 10 ms free-tier cap → error 1102 on every request), and a full
refresh is 44 subrequests (cap 50). Parsed tasks weigh only 1.1 MB (15x
smaller). v2 therefore stores parsed tasks, streams them to the client,
and chunks the full refresh through the browser. Refresh _semantics_
(Today-sync on mount, manual Full Sync, 24h staleness rule) are preserved;
Full Sync becomes a ~20–30s progress loop instead of one blocking request.

## Decisions (settled during brainstorming)

| Decision          | Choice                                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hostname          | `task-burndown.<subdomain>.workers.dev` (no custom domain)                                                                                                    |
| Access login      | Cloudflare identity provider (sign in with Cloudflare account — zero-setup default IdP, verified working on Alex's account)                                   |
| Access session    | 1 month app session duration                                                                                                                                  |
| Data layer        | R2, single JSON object (cache is read/written wholesale — no D1/KV)                                                                                           |
| Refresh semantics | Unchanged (Today-sync on mount, manual Full Sync, 24h staleness rule)                                                                                         |
| Cache contents    | Parsed unfiltered `Task[]` (1.1 MB), NOT raw Notion pages (16.9 MB) — free-tier CPU forces this                                                               |
| Page load         | Worker streams the R2 object body straight through (~0 CPU); client parses + applies base filters                                                             |
| Full refresh      | Client-driven chunked loop (~3 Notion pages per Worker request), then client PUTs the assembled cache back; stays on free tier, erases the subrequest ceiling |
| OCI/NixOS stack   | Torn down (`terraform destroy` verified: state serial 15, 0 resources) — delete from repo                                                                     |

## Architecture

### 1. Runtime & stack

Deno + `adapter-node` → **Bun + SvelteKit + `@sveltejs/adapter-cloudflare`**,
copying the cf-site template verbatim: `package.json` scripts,
`wrangler.jsonc` (renamed `task-burndown`), justfile verbs
(`dev`/`test`/`check`/`fmt`/`build`/`deploy`/`logs`/`sync-secrets`),
prettier config, `.github/workflows/deploy.yml`.

Untouched: all pure modules in `src/lib/data/`, both components in
`src/components/`, the `$derived` pipeline in `+page.svelte`. Churn is
confined to `src/lib/server/`, routes' load/endpoint plumbing, and config.

### 2. Cache → R2 (parsed tasks, not raw pages)

- New bucket `task-burndown-cache`, bound as `CACHE` in `wrangler.jsonc`.
- The cached object `task-cache.json` stores **parsed, unfiltered tasks**:
  `{ lastFullRefreshAt: string | null, tasks: Task[], tagColors, allTags,
allPriorities, allProjects }`. Base filters (cancelled/useless) move
  client-side — they are already pure shared functions in
  `src/lib/data/filters.ts`. `Task` gains a `lastEditedTime` field so the
  incremental threshold can be computed from tasks instead of raw pages.
- `parser.ts` splits filtering out of parsing: `parseTasks(pages)` returns
  unfiltered tasks + metadata; callers apply `applyBaseFilters` themselves.
- `cache.ts`: R2 `bucket.get`/`bucket.put`, functions take the bucket
  binding as a parameter (callers pass `platform.env.CACHE`). No legacy
  file-format migration (the R2 object is born in the new shape).
- `BURNDOWN_CACHE_PATH` env handling removed.
- Local dev: the adapter's platform proxy provides miniflare R2, persisted
  under `.wrangler/state/`.
- One-time bootstrap is codified as a `just setup` recipe (idempotent):
  `wrangler r2 bucket create task-burndown-cache` + seeding local and prod
  with the parsed-task shape produced from the existing `notion-cache.json`
  by `scripts/seed-cache.ts`. Binding itself is IaC in `wrangler.jsonc`.

### 2b. Data flow & endpoints

1. **Page load**: `GET /api/tasks` streams the R2 object body straight
   through (`new Response(obj.body)`, ~0 CPU). The client fetches it on
   mount, parses the 1.1 MB JSON, applies base + view filters, renders.
   `+page.server.ts` is deleted (no SSR data — the chart is client-only
   already).
2. **Incremental refresh** (Today-sync on mount + plain refresh):
   `POST /api/refresh?since=<date>` — Worker reads cache (~2.5 ms parse),
   fetches changed pages from Notion, parses just those, merges tasks by
   id (a task whose fresh raw page is cancelled/useless still parses —
   filtering is client-side — so state changes propagate correctly),
   writes cache back (~2.3 ms stringify). Returns metadata only
   (`{ freshCount, lastFullRefreshAt }`); the client re-fetches
   `/api/tasks`. ≈ 6–8 ms CPU. The 24h staleness rule
   (`refresh-policy.ts`) still decides when a plain refresh should demand
   a full one — the endpoint then returns `{ needsFull: true }` and the
   client runs the chunked loop.
3. **Full refresh** (Full Sync button, deletion-catcher): client-driven
   loop —
   - `POST /api/refresh-chunk` (optionally `?cursor=`) → Worker fetches up
     to 3 Notion API pages (3 subrequests, ≈ 1.2 MB parsed ≈ 4–6 ms CPU),
     returns `{ tasks, tagColors, …, nextCursor }`.
   - Client accumulates chunks until `nextCursor` is null (≈ 15 sequential
     requests, ~20–30 s, progress shown on the button), then
   - `PUT /api/cache` with the assembled cache JSON → Worker streams the
     request body into R2 (~0 CPU) after a cheap sanity check
     (Content-Type + non-empty). Behind Access, only Alex can call it.

### 3. Secrets

- `secrets.ts` loses the `op` CLI invocation. Prod: `platform.env.NOTION_API_KEY`
  (Worker secret). Dev: `NOTION_API_KEY` env var injected by
  `op run --env-file=.env.tpl` (the existing env-var fallback path).
- `.env.tpl` is the only secrets file: one op:// reference for the Notion key.
- 1Password per-project isolation: new vault `Task Burndown`, the Notion
  integration secret item moves into it, service account `task-burndown-ci`
  scoped read-only to it. SA token = the repo's single GH secret
  (`OP_SERVICE_ACCOUNT_TOKEN`) for the deploy workflow.

### 4. Access + PWA

- Enable Access on the workers.dev domain via the built-in Workers toggle;
  Cloudflare identity provider policy restricted to Alex; app session
  duration 1 month.
- iOS homescreen behavior: standalone PWAs have an isolated cookie jar, so
  first launch requires one sign-in; the `CF_Authorization` cookie then
  persists for the session duration (~monthly re-auth, a quick
  Cloudflare-account redirect).
- `static/manifest.webmanifest`: name "Burndown", `display: standalone`,
  theme/background colors, 192/512 PNG icons. Linked in `app.html` with
  `crossorigin="use-credentials"` — browsers fetch manifests credentialless
  by default, and Access blocks cookie-less requests.
- `static/apple-touch-icon.png` (180×180) + `<link rel="apple-touch-icon">`.
- Icons: heroicons `chart-bar` (solid), white glyph on a solid rounded-corner
  background; generated by a one-off script in `scripts/`, PNGs committed.

### 5. Deletions

- `deploy/` entirely (Terraform files, tfstate + backup, justfile, scripts,
  flake) — OCI resources already destroyed.
- `nix/` entirely (hermetic build derivation, NixOS module).
- `docs/superpowers/specs/2026-05-21-oci-deploy-via-nixos-modules-design.md`
  and the OCI plans under `docs/superpowers/plans/`.
- `.deploy.env.example`, `deno.json`, Deno lockfile, adapter-node dependency.
- CLAUDE.md and README rewritten for the new stack.

### 6. Tests

Port from `deno test` + `@std/assert` to **vitest** (`bun run test`).
Mechanical: assertion-call swaps; the `--unstable-sloppy-imports` workaround
disappears (Vite resolves `.js` → `.ts` natively). Coverage philosophy
unchanged: pure modules in `src/lib/data/` and `src/lib/server/` only, no
component tests.

## Manual steps (README, per no-uncodified-click-ops rule)

Only the genuinely un-codifiable:

1. Workers dashboard: enable Access on the workers.dev domain; set session
   duration to 1 month in the auto-created Access app.
2. 1Password vault + SA creation (exact `op` commands pasted for Alex to
   run; SA creation can't be done by CI).
3. GH repo secret `OP_SERVICE_ACCOUNT_TOKEN`.

## Risks (accepted)

| Risk                                                                                                    | Ceiling                                                                               | Fallback                                                                                |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Incremental refresh CPU (parse + stringify 1.1 MB cache ≈ 5–7 ms) sits near the 10 ms cap               | Cache growing ~2x (≈ 7,500 tasks)                                                     | Shrink stored fields, or $5 paid tier                                                   |
| Large incremental (e.g. after weeks away, hundreds of changed pages) could exceed chunk-free CPU budget | Rare in practice                                                                      | User runs Full Sync (button) — the client surfaces the error but does not auto-fallback |
| Full-sync loop leaves a stale cache if abandoned mid-loop                                               | Cache only replaced by the final PUT — partial loops are harmless (no partial writes) | —                                                                                       |

## Testing the migration

- Existing unit tests pass under vitest.
- `just dev` serves the dashboard from local R2 seeded with the real cache.
- Post-deploy smoke: page load, Today sync, Full Sync, PWA install on
  iPhone (manifest loads through Access, icon and standalone mode correct).
