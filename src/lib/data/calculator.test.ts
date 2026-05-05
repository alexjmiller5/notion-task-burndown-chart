import { assertEquals } from "@std/assert";
import { calculateDailyCounts } from "./calculator.ts";
import { buildEventsMap } from "./events.ts";
import type { Task } from "$lib/types.js";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    created: "2026-05-01T15:00:00.000Z",
    completed: null,
    dueDate: null,
    status: "Active",
    tags: ["Work"],
    priority: "Medium",
    projectName: "(No Project)",
    history: [],
    hasProject: false,
    ...overrides,
  };
}

Deno.test("calculateDailyCounts — single active task, no completion", () => {
  const tasks = [makeTask({ dueDate: "2026-05-04", tags: ["Work"] })];
  const events = buildEventsMap(tasks, "America/New_York");
  const result = calculateDailyCounts({
    events,
    minDate: "2026-05-04",
    limitDate: "2026-05-06",
    groupBy: "tag",
    allCategories: ["Work"],
    selectedCategories: new Set(["Work"]),
  });
  assertEquals(result.length, 3);
  assertEquals(result[0], { date: "2026-05-04", total: 1, Work: 1 });
  assertEquals(result[1], { date: "2026-05-05", total: 1, Work: 1 });
  assertEquals(result[2], { date: "2026-05-06", total: 1, Work: 1 });
});

Deno.test("calculateDailyCounts — task created and completed shows up then leaves", () => {
  const tasks = [
    makeTask({
      dueDate: "2026-05-04",
      completed: "2026-05-05",
      tags: ["Work"],
    }),
  ];
  const events = buildEventsMap(tasks, "America/New_York");
  const result = calculateDailyCounts({
    events,
    minDate: "2026-05-03",
    limitDate: "2026-05-07",
    groupBy: "tag",
    allCategories: ["Work"],
    selectedCategories: new Set(["Work"]),
  });
  assertEquals(result[0].total, 0); // 5/3 — not yet active
  assertEquals(result[1].total, 1); // 5/4 — created
  assertEquals(result[2].total, 1); // 5/5 — still active (completed end of day)
  assertEquals(result[3].total, 0); // 5/6 — removed
  assertEquals(result[4].total, 0); // 5/7
});

Deno.test("calculateDailyCounts — task NOT in selected category is not counted", () => {
  const tasks = [makeTask({ dueDate: "2026-05-04", tags: ["Work"] })];
  const events = buildEventsMap(tasks, "America/New_York");
  const result = calculateDailyCounts({
    events,
    minDate: "2026-05-04",
    limitDate: "2026-05-05",
    groupBy: "tag",
    allCategories: ["Work", "Chore"],
    selectedCategories: new Set(["Chore"]), // Work not selected
  });
  assertEquals(result[0].total, 0);
  assertEquals(result[0].Work, 0);
  assertEquals(result[0].Chore, 0);
});

Deno.test("calculateDailyCounts — minDate >= limitDate returns empty", () => {
  const result = calculateDailyCounts({
    events: new Map(),
    minDate: "2026-05-05",
    limitDate: "2026-05-04",
    groupBy: "tag",
    allCategories: [],
    selectedCategories: new Set(),
  });
  assertEquals(result, []);
});

Deno.test("calculateDailyCounts — DST spring forward day arithmetic", () => {
  // March 8 2026 is US spring forward day. The day-by-day loop should produce
  // March 7, 8, 9, 10 in sequence with no gaps or duplicates.
  const tasks = [makeTask({ dueDate: "2026-03-07", tags: ["Work"] })];
  const events = buildEventsMap(tasks, "America/New_York");
  const result = calculateDailyCounts({
    events,
    minDate: "2026-03-07",
    limitDate: "2026-03-10",
    groupBy: "tag",
    allCategories: ["Work"],
    selectedCategories: new Set(["Work"]),
  });
  const dates = result.map((r) => r.date);
  assertEquals(dates, ["2026-03-07", "2026-03-08", "2026-03-09", "2026-03-10"]);
});

Deno.test("calculateDailyCounts — state change adds task to new tag bucket", () => {
  const tasks = [
    makeTask({
      dueDate: "2026-05-01",
      tags: ["Work"],
      history: [
        { date: "2026-05-03", tags: ["Chore"], dueDate: "2026-05-01" },
      ],
    }),
  ];
  const events = buildEventsMap(tasks, "America/New_York");
  const result = calculateDailyCounts({
    events,
    minDate: "2026-05-01",
    limitDate: "2026-05-04",
    groupBy: "tag",
    allCategories: ["Work", "Chore"],
    selectedCategories: new Set(["Work", "Chore"]),
  });
  // 5/1: Work=1, Chore=0
  assertEquals(result[0].Work, 1);
  assertEquals(result[0].Chore, 0);
  // 5/3: state changed to Chore
  assertEquals(result[2].Work, 0);
  assertEquals(result[2].Chore, 1);
});
