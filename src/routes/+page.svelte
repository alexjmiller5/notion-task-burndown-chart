<script lang="ts">
  import { onMount } from "svelte";
  import dayjs from "dayjs";
  import type { Task, DayCount, DueDateCategory, GroupBy } from "$lib/types.js";
  import { applyViewFilters } from "$lib/data/filters.js";
  import { buildEventsMap, getMinDate } from "$lib/data/events.js";
  import { calculateDailyCounts } from "$lib/data/calculator.js";
  import TaskChart from "../components/TaskChart.svelte";
  import RangeSlider from "../components/RangeSlider.svelte";

  // svelte-ignore state_referenced_locally
  const { data } = $props();

  const DEFAULT_TAGS = [
    "Learning", "Chore", "Work", "Westport",
    "Social Planning", "Shopping", "Errand", "Finances",
  ];

  const RANGE_PRESETS = [
    { label: "7D", start: () => dayjs().subtract(7, "day"), end: () => dayjs() },
    { label: "30D", start: () => dayjs().subtract(30, "day"), end: () => dayjs() },
    { label: "90D", start: () => dayjs().subtract(90, "day"), end: () => dayjs() },
    { label: "1Y", start: () => dayjs().subtract(1, "year"), end: () => dayjs() },
    { label: "MTD", start: () => dayjs().startOf("month"), end: () => dayjs() },
    { label: "YTD", start: () => dayjs().startOf("year"), end: () => dayjs() },
    { label: "ALL", start: () => dayjs("2025-01-10"), end: () => dayjs() },
  ];

  const GROUP_BY_OPTIONS: { value: GroupBy; label: string }[] = [
    { value: "tag", label: "Tag" },
    { value: "priority", label: "Priority" },
    { value: "project", label: "Project" },
  ];

  const SLIDER_MIN = "2025-01-10";
  const SLIDER_MAX = dayjs().add(2, "month").format("YYYY-MM-DD");

  const ALL_STATUSES: DueDateCategory[] = ["Future", "Overdue", "Undated"];

  let allTasks: Task[] = $state(data.tasks);
  let allTags: string[] = $state(data.allTags);
  let allPriorities: string[] = $state(data.allPriorities ?? ["High", "Medium", "Low", "(No Priority)"]);
  let allProjects: string[] = $state(data.allProjects ?? ["(No Project)"]);
  let tagColors: Record<string, string> = $state(data.tagColors ?? {});

  let activePreset: string = $state("90D");
  let dateStart: string = $state(dayjs().subtract(90, "day").format("YYYY-MM-DD"));
  let dateEnd: string = $state(dayjs().format("YYYY-MM-DD"));
  let includeProjectTasks: boolean = $state(true);
  let showLegacyTags: boolean = $state(false);
  let groupBy: GroupBy = $state("tag");

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

  let eventsMap = $derived(buildEventsMap(filteredTasks));
  let minDate = $derived(getMinDate(filteredTasks));

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
    const today = dayjs().format("YYYY-MM-DD");
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
    const preset = RANGE_PRESETS.find((p) => p.label === label);
    if (!preset) return;
    dateStart = preset.start().format("YYYY-MM-DD");
    dateEnd = preset.end().format("YYYY-MM-DD");
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
          {#each RANGE_PRESETS as preset}
            <button
              onclick={() => selectPreset(preset.label)}
              class="px-3 py-1.5 rounded-md text-xs font-[var(--font-mono)] uppercase tracking-wider transition-all duration-150 {activePreset === preset.label ? '' : 'preset-btn'}"
              style={activePreset === preset.label
                ? "background: #F7931A; color: black; font-weight: 500; box-shadow: 0 0 16px -4px rgba(247,147,26,0.5);"
                : ""}
            >
              {preset.label}
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

  <p class="text-center text-white/15 font-[var(--font-mono)] text-[10px] uppercase tracking-[0.2em] mt-8">
    Powered by Notion
  </p>
</div>
