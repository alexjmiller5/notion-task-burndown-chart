import { assertEquals } from "@std/assert";
import { buildEventsMap, getMinDate } from "./events.ts";
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

Deno.test("buildEventsMap — task with due date enters on due date", () => {
  const task = makeTask({ dueDate: "2026-05-04" });
  const events = buildEventsMap([task], "America/New_York");
  const day = events.get("2026-05-04");
  assertEquals(day?.created.length, 1);
  assertEquals(day?.created[0].id, "task-1");
});

Deno.test("buildEventsMap — task without due date falls back to created (NY)", () => {
  // 03:00 UTC May 4 → 23:00 EDT May 3
  const task = makeTask({
    created: "2026-05-04T03:00:00.000Z",
    dueDate: null,
  });
  const events = buildEventsMap([task], "America/New_York");
  assertEquals(events.get("2026-05-03")?.created.length, 1);
  assertEquals(events.get("2026-05-04"), undefined);
});

Deno.test("buildEventsMap — same task buckets differently in UTC vs NY", () => {
  // 03:00 UTC = May 4 in UTC, May 3 in NY
  const task = makeTask({
    created: "2026-05-04T03:00:00.000Z",
    dueDate: null,
  });
  const eventsUTC = buildEventsMap([task], "UTC");
  const eventsNY = buildEventsMap([task], "America/New_York");
  assertEquals(eventsUTC.get("2026-05-04")?.created.length, 1);
  assertEquals(eventsNY.get("2026-05-03")?.created.length, 1);
});

Deno.test("buildEventsMap — completed task adds completion event one day after", () => {
  const task = makeTask({ dueDate: "2026-05-01", completed: "2026-05-04" });
  const events = buildEventsMap([task], "America/New_York");
  // Completion is on completedDate + 1 (so the chart shows it active through the completed day)
  assertEquals(events.get("2026-05-05")?.completed.length, 1);
});

Deno.test("buildEventsMap — task completed before due date is skipped entirely", () => {
  // due 2026-05-04, completed 2026-05-01 — was finished before it'd ever count
  const task = makeTask({ dueDate: "2026-05-04", completed: "2026-05-01" });
  const events = buildEventsMap([task], "America/New_York");
  assertEquals(events.size, 0);
});

Deno.test("buildEventsMap — task completed same day as due IS counted (active for one day)", () => {
  const task = makeTask({ dueDate: "2026-05-04", completed: "2026-05-04" });
  const events = buildEventsMap([task], "America/New_York");
  assertEquals(events.get("2026-05-04")?.created.length, 1);
  assertEquals(events.get("2026-05-05")?.completed.length, 1);
});

Deno.test("buildEventsMap — history entries become stateChange events", () => {
  const task = makeTask({
    dueDate: "2026-05-01",
    history: [
      { date: "2026-05-02", tags: ["Work"], dueDate: "2026-05-01" },
      { date: "2026-05-03", tags: ["Chore"], dueDate: "2026-05-01" },
    ],
  });
  const events = buildEventsMap([task], "America/New_York");
  assertEquals(events.get("2026-05-02")?.stateChange.length, 1);
  assertEquals(events.get("2026-05-03")?.stateChange.length, 1);
});

Deno.test("getMinDate — empty list returns today in tz", () => {
  const min = getMinDate([], "America/New_York");
  // Should be a YYYY-MM-DD string
  assertEquals(/^\d{4}-\d{2}-\d{2}$/.test(min), true);
});

Deno.test("getMinDate — finds earliest effective start date", () => {
  const tasks = [
    makeTask({ id: "a", dueDate: "2026-05-04" }),
    makeTask({ id: "b", dueDate: "2026-03-01" }),
    makeTask({ id: "c", dueDate: "2026-04-15" }),
  ];
  assertEquals(getMinDate(tasks, "America/New_York"), "2026-03-01");
});

Deno.test("getMinDate — uses created (in tz) when no due date", () => {
  // 03:00 UTC = May 3 NY
  const tasks = [
    makeTask({
      id: "a",
      created: "2026-05-04T03:00:00.000Z",
      dueDate: null,
    }),
    makeTask({ id: "b", dueDate: "2026-05-04" }),
  ];
  assertEquals(getMinDate(tasks, "America/New_York"), "2026-05-03");
});
