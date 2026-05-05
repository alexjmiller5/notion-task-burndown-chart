<script lang="ts">
  import { onMount } from "svelte";
  import type { Task, DayCount, GroupBy } from "$lib/types.js";
  import { applyViewFilters } from "$lib/data/filters.js";
  import { buildEventsMap, getMinDate } from "$lib/data/events.js";
  import { calculateDailyCounts } from "$lib/data/calculator.js";
  import {
    DEFAULT_TIMEZONE,
    TIMEZONES,
    getCurrentDateStr,
    getStartOfDayUTC,
  } from "$lib/data/timezone.js";
  import { getPresetRange, PRESET_LABELS, type PresetLabel } from "$lib/data/presets.js";
  import TaskChart from "../components/TaskChart.svelte";
  import RangeSlider from "../components/RangeSlider.svelte";

  // svelte-ignore state_referenced_locally
  const { data } = $props();

  const DEFAULT_TAGS = [
    "Learning", "Chore", "Work", "Westport",
    "Social Planning", "Shopping", "Errand", "Finances",
  ];

  const GROUP_BY_OPTIONS: { value: GroupBy; label: string }[] = [
    { value: "tag", label: "Tag" },
    { value: "priority", label: "Priority" },
    { value: "project", label: "Project" },
  ];

  const SLIDER_MIN = "2025-01-10";

  let allTasks: Task[] = $state(data.tasks);
  let allTags: string[] = $state(data.allTags);
  let allPriorities: string[] = $state(data.allPriorities ?? ["High", "Medium", "Low", "(No Priority)"]);
  let allProjects: string[] = $state(data.allProjects ?? ["(No Project)"]);
  let tagColors: Record<string, string> = $state(data.tagColors ?? {});

  let timezone: string = $state(DEFAULT_TIMEZONE);
  const initial90D = getPresetRange("90D", DEFAULT_TIMEZONE);
  let activePreset: string = $state("90D");
  let dateStart: string = $state(initial90D.start);
  let dateEnd: string = $state(initial90D.end);
  let includeProjectTasks: boolean = $state(true);
  let showLegacyTags: boolean = $state(false);
  let groupBy: GroupBy = $state("tag");

  let SLIDER_MAX = $derived.by(() => {
    const today = getCurrentDateStr(timezone);
    const [y, m, d] = today.split("-").map(Number);
    const month2 = m + 2;
    const newY = month2 > 12 ? y + 1 : y;
    const newM = month2 > 12 ? month2 - 12 : month2;
    return `${newY}-${String(newM).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  });

  let isFullSyncing: boolean = $state(false);
  let isRefreshingToday: boolean = $state(false);

  let isRefreshing: boolean = $state(false);
  let refreshError: string | null = $state(null);

  let filteredTasks = $derived(
    applyViewFilters(allTasks, {
      includeLegacy: false,
      includeIncomplete: true,
      includeProjectTasks,
    }),
  );

  // Categories and selection based on groupBy mode
  let allCategories = $derived.by(() => {
    switch (groupBy) {
      case "tag": return allTags;
      case "priority": return allPriorities;
      case "project": return allProjects;
    }
  });

  let selectedCategories = $derived.by(() => {
    switch (groupBy) {
      case "tag":
        return showLegacyTags
          ? new Set(allTags)
          : new Set(DEFAULT_TAGS.filter((t) => allTags.includes(t)));
      case "priority":
        return new Set(allPriorities);
      case "project":
        return new Set(allProjects);
    }
  });

  // Categories to hide by default in Chart.js legend (user can click to re-enable)
  let hiddenByDefault = $derived(
    groupBy === "project" ? ["(No Project)"] : [],
  );

  let eventsMap = $derived(buildEventsMap(filteredTasks, timezone));
  let minDate = $derived(getMinDate(filteredTasks, timezone));

  let dailyCounts: DayCount[] = $derived(
    calculateDailyCounts({
      events: eventsMap,
      minDate,
      limitDate: SLIDER_MAX,
      groupBy,
      allCategories,
      selectedCategories,
    }),
  );

  let categories = $derived([...selectedCategories].sort());

  let totalActive = $derived.by(() => {
    if (dailyCounts.length === 0) return 0;
    const today = getCurrentDateStr(timezone);
    const todayEntry = dailyCounts.find((d) => d.date === today);
    if (todayEntry) return todayEntry.total as number;
    return dailyCounts[dailyCounts.length - 1].total as number;
  });

  let taskCount = $derived(filteredTasks.length);
  let projectCount = $derived(allTasks.filter((t) => t.hasProject).length);

  // Priority colors for chart
  const PRIORITY_COLORS: Record<string, string> = {
    High: "red",
    Medium: "yellow",
    Low: "green",
    "(No Priority)": "gray",
  };

  let chartColors = $derived.by((): Record<string, string> => {
    switch (groupBy) {
      case "tag": return tagColors;
      case "priority": return PRIORITY_COLORS;
      case "project": return {}; // Use fallback palette
    }
  });

  function selectPreset(label: string) {
    activePreset = label;
    const range = getPresetRange(label as PresetLabel, timezone);
    dateStart = range.start;
    dateEnd = range.end;
  }

  $effect(() => {
    // Recompute the active preset's range when timezone changes
    timezone;
    if (activePreset) {
      const range = getPresetRange(activePreset as PresetLabel, timezone);
      dateStart = range.start;
      dateEnd = range.end;
    }
  });

  async function postRefresh(url: string) {
    refreshError = null;
    try {
      const res = await fetch(url, { method: "POST" });
      if (res.ok) {
        const fresh = await res.json();
        allTasks = fresh.tasks;
        allTags = fresh.allTags;
        if (fresh.allPriorities) allPriorities = fresh.allPriorities;
        if (fresh.allProjects) allProjects = fresh.allProjects;
        if (fresh.tagColors) tagColors = fresh.tagColors;
      } else {
        refreshError = `${res.status}`;
      }
    } catch (e) {
      refreshError = (e as Error).message;
    }
  }

  async function fullSync() {
    isFullSyncing = true;
    try { await postRefresh("/api/refresh?full=1"); }
    finally { isFullSyncing = false; }
  }

  async function refreshToday() {
    isRefreshingToday = true;
    try {
      const since = encodeURIComponent(getStartOfDayUTC(timezone));
      await postRefresh(`/api/refresh?since=${since}`);
    } finally {
      isRefreshingToday = false;
    }
  }

  function handleSliderChange(start: string, end: string) {
    activePreset = "";
    dateStart = start;
    dateEnd = end;
  }

  onMount(async () => {
    isRefreshing = true;
    refreshError = null;
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      if (res.ok) {
        const fresh = await res.json();
        allTasks = fresh.tasks;
        allTags = fresh.allTags;
        if (fresh.allPriorities) allPriorities = fresh.allPriorities;
        if (fresh.allProjects) allProjects = fresh.allProjects;
        if (fresh.tagColors) tagColors = fresh.tagColors;
      } else {
        refreshError = `${res.status}`;
      }
    } catch (e) {
      refreshError = (e as Error).message;
    } finally {
      isRefreshing = false;
    }
  });
</script>

<!-- Background grid pattern -->
<div class="fixed inset-0 bg-grid pointer-events-none"></div>

<div
  class="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
  style="background: radial-gradient(ellipse, rgba(247,147,26,0.06) 0%, transparent 70%); filter: blur(80px);"
></div>

<div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

  <!-- Header -->
  <header class="mb-10">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="font-[var(--font-heading)] text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight">
          Task <span class="bg-gradient-to-r from-[#F7931A] to-[#FFD600] bg-clip-text text-transparent">Burndown</span>
        </h1>
        <p class="text-[#94A3B8] mt-2 font-[var(--font-body)] text-sm sm:text-base">
          Active task trends from Notion
        </p>
      </div>

      {#if isRefreshing}
        <div class="flex items-center gap-2 text-[#94A3B8] font-[var(--font-mono)] text-xs uppercase tracking-wider mt-2">
          <div class="loader"></div>
          <span>Syncing</span>
        </div>
      {:else if refreshError}
        <div class="flex items-center gap-2 text-red-400 font-[var(--font-mono)] text-xs mt-2">
          <span>Sync failed</span>
        </div>
      {:else if allTasks.length > 0}
        <div class="flex items-center gap-2 text-[#94A3B8] font-[var(--font-mono)] text-xs uppercase tracking-wider mt-2">
          <div class="glow-dot"></div>
          <span>Live</span>
        </div>
      {/if}
    </div>

    {#if allTasks.length > 0}
      <div class="flex items-center gap-6 mt-6 pt-6 border-t border-white/5">
        <div>
          <span class="font-[var(--font-mono)] text-2xl sm:text-3xl font-medium text-white">{totalActive}</span>
          <span class="text-[#94A3B8] text-xs font-[var(--font-mono)] uppercase tracking-wider ml-2">active now</span>
        </div>
        <div class="w-px h-6 bg-white/10"></div>
        <div>
          <span class="font-[var(--font-mono)] text-2xl sm:text-3xl font-medium text-white">{taskCount}</span>
          <span class="text-[#94A3B8] text-xs font-[var(--font-mono)] uppercase tracking-wider ml-2">total tracked</span>
        </div>
        <div class="w-px h-6 bg-white/10"></div>
        <div>
          <span class="font-[var(--font-mono)] text-2xl sm:text-3xl font-medium text-white">{allTags.length}</span>
          <span class="text-[#94A3B8] text-xs font-[var(--font-mono)] uppercase tracking-wider ml-2">tags</span>
        </div>
        <div class="w-px h-6 bg-white/10"></div>
        <div>
          <span class="font-[var(--font-mono)] text-2xl sm:text-3xl font-medium text-white">{projectCount}</span>
          <span class="text-[#94A3B8] text-xs font-[var(--font-mono)] uppercase tracking-wider ml-2">with projects</span>
        </div>
      </div>
    {/if}
  </header>

  <!-- Chart card -->
  <div
    class="rounded-2xl border border-white/10 bg-[#0F1115] p-4 sm:p-6"
    style="box-shadow: 0 0 60px -20px rgba(247,147,26,0.08);"
  >
    <!-- Controls row -->
    <div class="flex items-center justify-between mb-3 flex-wrap gap-3">
      <!-- Left: range presets + group by -->
      <div class="flex items-center gap-3">
        <!-- Range presets -->
        <div class="flex items-center gap-1 bg-black/30 rounded-lg p-1">
          {#each PRESET_LABELS as label}
            <button
              onclick={() => selectPreset(label)}
              class="px-3 py-1.5 rounded-md text-xs font-[var(--font-mono)] uppercase tracking-wider transition-all duration-150 {activePreset === label ? '' : 'preset-btn'}"
              style={activePreset === label
                ? "background: #F7931A; color: black; font-weight: 500; box-shadow: 0 0 16px -4px rgba(247,147,26,0.5);"
                : ""}
            >
              {label}
            </button>
          {/each}
        </div>

        <!-- Group by selector -->
        <div class="flex items-center gap-1 bg-black/30 rounded-lg p-1">
          {#each GROUP_BY_OPTIONS as option}
            <button
              onclick={() => (groupBy = option.value)}
              class="px-3 py-1.5 rounded-md text-xs font-[var(--font-mono)] uppercase tracking-wider transition-all duration-150 {groupBy === option.value ? '' : 'preset-btn'}"
              style={groupBy === option.value
                ? "background: #F7931A; color: black; font-weight: 500; box-shadow: 0 0 16px -4px rgba(247,147,26,0.5);"
                : ""}
            >
              {option.label}
            </button>
          {/each}
        </div>
      </div>

      <!-- Right: toggles -->
      <div class="flex items-center gap-3">
        <!-- Timezone selector -->
        <label
          class="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-transparent hover:border-white/20 transition-colors duration-150 cursor-pointer"
          title="Timezone"
        >
          <svg class="w-4 h-4 text-[#94A3B8]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"/>
          </svg>
          <select
            bind:value={timezone}
            class="bg-transparent text-xs font-[var(--font-mono)] uppercase tracking-wider text-[#94A3B8] focus:outline-none cursor-pointer"
          >
            {#each TIMEZONES as tz}
              <option value={tz.id} class="bg-[#0F1115] text-white normal-case">{tz.label}</option>
            {/each}
          </select>
        </label>

        <!-- Refresh Today button -->
        <button
          onclick={refreshToday}
          disabled={isRefreshingToday || isFullSyncing || isRefreshing}
          class="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 hover:border-[#F7931A]/40 hover:bg-[#F7931A]/5 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Fetch tasks edited today only (in selected timezone)"
        >
          <svg
            class="w-4 h-4 text-[#94A3B8] {isRefreshingToday ? 'animate-spin' : ''}"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
          </svg>
          <span class="text-xs font-[var(--font-mono)] uppercase tracking-wider text-[#94A3B8]">
            {isRefreshingToday ? "Syncing" : "Refresh Today"}
          </span>
        </button>

        <!-- Full Sync button -->
        <button
          onclick={fullSync}
          disabled={isFullSyncing || isRefreshingToday || isRefreshing}
          class="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 hover:border-[#F7931A]/40 hover:bg-[#F7931A]/5 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Re-fetch all pages from Notion (catches deletions)"
        >
          <svg
            class="w-4 h-4 text-[#94A3B8] {isFullSyncing ? 'animate-spin' : ''}"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"/>
          </svg>
          <span class="text-xs font-[var(--font-mono)] uppercase tracking-wider text-[#94A3B8]">
            {isFullSyncing ? "Syncing" : "Full Sync"}
          </span>
        </button>

        {#if groupBy === "tag"}
          <button
            onclick={() => (showLegacyTags = !showLegacyTags)}
            class="flex items-center gap-3 px-4 py-2 rounded-lg border transition-all duration-150"
            style={showLegacyTags
              ? "border-color: rgba(247,147,26,0.3); background: rgba(247,147,26,0.05);"
              : "border-color: rgba(255,255,255,0.1); background: transparent;"}
          >
            <div
              class="relative w-8 h-[18px] rounded-full transition-colors duration-150"
              style="background: {showLegacyTags ? '#F7931A' : 'rgba(255,255,255,0.15)'};"
            >
              <div
                class="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-all duration-150"
                style="left: {showLegacyTags ? '15px' : '2px'};"
              ></div>
            </div>
            <span
              class="text-xs font-[var(--font-mono)] uppercase tracking-wider"
              style="color: {showLegacyTags ? '#F7931A' : '#94A3B8'};"
            >Legacy Tags</span>
          </button>
        {/if}

        {#if groupBy !== "project"}
          <button
            onclick={() => (includeProjectTasks = !includeProjectTasks)}
            class="flex items-center gap-3 px-4 py-2 rounded-lg border transition-all duration-150"
            style={includeProjectTasks
              ? "border-color: rgba(247,147,26,0.3); background: rgba(247,147,26,0.05);"
              : "border-color: rgba(255,255,255,0.1); background: transparent;"}
          >
            <div
              class="relative w-8 h-[18px] rounded-full transition-colors duration-150"
              style="background: {includeProjectTasks ? '#F7931A' : 'rgba(255,255,255,0.15)'};"
            >
              <div
                class="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-all duration-150"
                style="left: {includeProjectTasks ? '15px' : '2px'};"
              ></div>
            </div>
            <span
              class="text-xs font-[var(--font-mono)] uppercase tracking-wider"
              style="color: {includeProjectTasks ? '#F7931A' : '#94A3B8'};"
            >Projects</span>
          </button>
        {/if}
      </div>
    </div>

    <!-- Range slider -->
    <div class="mb-4 px-1">
      <RangeSlider
        min={SLIDER_MIN}
        max={SLIDER_MAX}
        start={dateStart}
        end={dateEnd}
        onchange={handleSliderChange}
      />
    </div>

    <!-- Chart -->
    {#if allTasks.length === 0}
      <div class="h-[500px] flex items-center justify-center">
        <div class="text-center">
          <div class="loader mx-auto"></div>
          <p class="mt-4 text-[#94A3B8] font-[var(--font-mono)] text-sm">Loading task data...</p>
        </div>
      </div>
    {:else}
      <div class="h-[500px] sm:h-[550px]">
        <TaskChart
          {dailyCounts}
          {categories}
          dateRange={{ start: dateStart, end: dateEnd }}
          tagColors={chartColors}
          {hiddenByDefault}
        />
      </div>
    {/if}
  </div>
</div>
