# Mobile redesign + preference persistence

**Status:** Approved (blanket approval, 2026-05-19)
**Scope:** Two concurrent changes to the dashboard — make the mobile view usable, and persist user-controlled inputs to `localStorage` so they survive reloads.

## Goals & non-goals

**Goals**
1. Phone-sized viewports (`< 640px`) render without horizontal overflow, without the four header stats squashing together, and without the controls bar collapsing into a ragged multi-line block.
2. Touch targets ≥ 44px (iOS HIG minimum) on the range slider handles, pill buttons, and toggle switches.
3. All user-controlled inputs persist across visits, with preset-driven date ranges re-anchored to "today" on each load.
4. Inline hex/rgba values across the codebase replaced with `@theme` token references — leverages the existing token block in `src/app.css`.

**Non-goals**
- Palette/branding changes. Same colors, same vibe.
- Mobile-specific routes, drawer/sheet UI patterns, or breakpoint-conditional component swaps.
- Refactoring `+page.svelte` into smaller components (that's a separate concern).
- New analytics, settings page, or "reset preferences" UI.

## Architecture

### Design tokens

Extend the existing `@theme` block in `src/app.css`. Tailwind v4 emits utility classes automatically from these (`bg-bitcoin`, `text-muted`, `rounded-card`, etc.).

```css
@theme {
  /* Existing — kept */
  --color-void, --color-surface, --color-surface-light, --color-border,
  --color-muted, --color-bitcoin, --color-bitcoin-deep, --color-gold;

  /* New — semantic alpha layers replacing inline rgba() */
  --color-border-subtle: rgba(255, 255, 255, 0.05);
  --color-border-default: rgba(255, 255, 255, 0.10);
  --color-border-strong: rgba(255, 255, 255, 0.15);
  --color-bitcoin-glow-soft: rgba(247, 147, 26, 0.05);
  --color-bitcoin-glow-medium: rgba(247, 147, 26, 0.30);
  --color-bitcoin-glow-strong: rgba(247, 147, 26, 0.50);

  /* New — radii used multiple places */
  --radius-card: 1rem;
  --radius-control: 0.5rem;
  --radius-pill: 0.375rem;

  /* New — chart heights per breakpoint */
  --chart-height-mobile: 360px;
  --chart-height-tablet: 500px;
  --chart-height-desktop: 550px;

  /* New — touch */
  --tap-min: 44px;
}
```

Files touched for hex→token sweep:
- `src/routes/+page.svelte` (heaviest)
- `src/components/RangeSlider.svelte`
- `src/components/TaskChart.svelte` (audit pass; likely small)
- `src/app.html` (drop inline `style="background-color: #030304"`, replace with `bg-void` class in app.css)

Dynamic inline `style=""` blocks (toggle thumb position, slider glow intensity) stay inline but reference `var(--color-bitcoin)` etc. instead of raw hex.

### Mobile layout

Default Tailwind breakpoints. Targeted changes per region:

**Header**
- Title: `text-2xl sm:text-3xl md:text-4xl lg:text-5xl` (was `text-3xl sm:text-4xl md:text-5xl`).
- The "Live"/"Syncing"/"Sync failed" badge is hidden on `< sm` (the `glow-dot` is decorative; users on mobile don't need a status pill).

**Stats row**
- `< sm`: 2-column grid via `grid grid-cols-2 gap-x-6 gap-y-4`, no vertical separators.
- `≥ sm`: current flex row with vertical separators.
- Numbers shrink: `text-xl sm:text-2xl md:text-3xl` (was `text-2xl sm:text-3xl`).

**Controls bar**
- `< sm`: split into two `flex-wrap` rows.
  - Row 1: range-presets pill bar + group-by pill bar (the "view shape" controls).
  - Row 2: timezone select + refresh today + full sync + legacy/projects toggles.
- `≥ sm`: current single-row flex layout with `justify-between`.
- Button padding bumped to `py-2.5 sm:py-1.5` so the pill buttons meet 44px on touch.

**Chart**
- Container height: `h-[var(--chart-height-mobile)] sm:h-[var(--chart-height-tablet)] lg:h-[var(--chart-height-desktop)]` — 360 / 500 / 550.

**Range slider** (`RangeSlider.svelte`)
- Track height bumped from `h-10` to `h-12` on `< sm`.
- Handle sizes scale up: idle/hover/drag sizes become `20 / 24 / 28` on `< sm` (were `14 / 18 / 20`), enlarging the effective tap area to ≥ 44px when combined with the track.
- Detection: a `$state` boolean set via `matchMedia("(pointer: coarse)")` toggled at mount + on `change`. Touch devices get the larger sizes regardless of viewport.

**Background gradient blob**
- The fixed radial gradient (`w-[600px] h-[400px]`) is hidden on `< sm` — it overflows on phones and adds nothing functionally.

### Persistence

New module: `src/lib/data/preferences.ts`.

```ts
interface StoredPreferences {
  version: 1;
  timezone: string;
  groupBy: GroupBy;
  showLegacyTags: boolean;
  includeProjectTasks: boolean;
  preset: PresetLabel | null;  // null when slider is manually dragged
  dateStart?: string;          // only set when preset === null
  dateEnd?: string;
}

export function loadPreferences(): Partial<StoredPreferences> | null;
export function savePreferences(prefs: StoredPreferences): void;
```

- Storage key: `burndown:prefs:v1`.
- Versioning: stored payloads not matching `version: 1` are ignored (treat as no saved prefs). Lets us evolve schema later without crashing.
- `loadPreferences()` returns `null` if missing/invalid (try/catch around `JSON.parse`, validate `version`). Returns `Partial<StoredPreferences>` for graceful field-level missing handling — caller fills with defaults.
- SSR safety: both functions no-op (return null / nothing) when `typeof localStorage === "undefined"`. SSR uses defaults; client hydration applies stored prefs on mount.

**Init flow** (in `+page.svelte`):

1. `$state` initializers use defaults (NY tz, "90D" preset, etc.) — same as today.
2. In `onMount`, call `loadPreferences()`. If present:
   - Restore `timezone`, `groupBy`, `showLegacyTags`, `includeProjectTasks` directly.
   - If `preset !== null`: set `activePreset = stored.preset` and recompute `dateStart`/`dateEnd` via `getPresetRange(preset, timezone)` against *current* `new Date()` — so "90D" stays "last 90 days".
   - If `preset === null`: restore `dateStart`/`dateEnd` from storage.
3. After load, an `$effect` watches all those state vars and calls `savePreferences()` on every change. Effects don't run during SSR, so there's no clobber on first server render.

### Testing

`src/lib/data/preferences.test.ts`:
- `loadPreferences` returns null when storage is empty.
- `loadPreferences` returns null when JSON is malformed.
- `loadPreferences` returns null when `version !== 1`.
- `loadPreferences` round-trips a valid payload.
- `savePreferences` writes under the expected key.
- Preset-only payload omits `dateStart`/`dateEnd`.
- Slider-drag payload (`preset === null`) includes both dates.

Mock `localStorage` with an in-memory `Map`-backed stub in tests; assign to `globalThis.localStorage` before each test, restore after. Deno doesn't have a native `localStorage` in test runs; stub keeps tests pure.

No UI component tests (consistent with current policy).

## EARS requirements

- **Ubiquitous:** The dashboard shall render without horizontal overflow at viewport widths ≥ 320px.
- **Ubiquitous:** Pill buttons, toggle switches, and slider handles shall meet a 44×44px effective tap area on touch devices.
- **State-driven:** While the viewport is `< 640px`, the dashboard shall render the stats grid in 2 columns and the controls bar in two rows.
- **State-driven:** While the user's primary input is touch (`matchMedia("(pointer: coarse)")` matches), the range slider handles and track shall use enlarged sizes.
- **Event-driven:** When any persisted preference changes, the dashboard shall write the full preference payload to `localStorage`.
- **Event-driven:** When the page mounts and valid stored preferences are present, the dashboard shall apply them — preset-driven ranges re-anchored to the current date, explicit ranges restored verbatim.
- **Unwanted behavior:** If stored preferences are missing, malformed, or version-mismatched, the dashboard shall fall back to defaults without throwing.

## Implementation order

1. Extend `@theme` block with new tokens.
2. Mechanical hex→token sweep across `+page.svelte`, `RangeSlider.svelte`, `TaskChart.svelte`, `app.html`.
3. Build `preferences.ts` + tests (TDD).
4. Wire persistence into `+page.svelte`.
5. Mobile layout changes — stats grid, controls rows, chart height, slider sizes, badge hiding, gradient hiding.
6. Build, run tests, smoke test in browser at 375px viewport.
7. `just deploy`, smoke test on phone via the tailnet URL.
8. Update `CLAUDE.md` with the new tokens, persistence module, and mobile breakpoints.

## Files touched (final list)

- `src/app.css` — extended `@theme`, plus a `body { background: var(--color-void); }` rule replacing the inline app.html style.
- `src/app.html` — drop inline `style="..."`.
- `src/routes/+page.svelte` — layout + persistence wiring + token sweep.
- `src/components/RangeSlider.svelte` — token sweep + responsive sizes + touch-pointer media query.
- `src/components/TaskChart.svelte` — token audit.
- `src/lib/data/preferences.ts` — NEW.
- `src/lib/data/preferences.test.ts` — NEW.
- `CLAUDE.md` — short addition documenting the token system + persistence module.
