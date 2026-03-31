import type { Task, TaskEvent, DayCount, DueDateCategory, GroupBy } from "$lib/types.js";

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getTaskTagsForDate(
  task: Task,
  dateStr: string,
): string[] {
  if (task.history.length === 0) return task.tags;
  let activeTags = task.tags;
  for (const entry of task.history) {
    if (entry.date > dateStr) break;
    activeTags = entry.tags;
  }
  return activeTags;
}

/** Get the group keys for a task based on the groupBy mode */
function getGroupKeys(task: Task, groupBy: GroupBy, dateStr: string): string[] {
  switch (groupBy) {
    case "tag": {
      const tags = getTaskTagsForDate(task, dateStr);
      return tags.length > 0 ? tags : ["(Untagged)"];
    }
    case "priority":
      return [task.priority];
    case "project":
      return [task.projectName];
  }
}

interface TrackedState {
  groupKeys: string[];
  passes: boolean;
}

export interface CalculateParams {
  events: Map<string, TaskEvent>;
  minDate: string;
  limitDate: string;
  groupBy: GroupBy;
  allCategories: string[];
  selectedCategories: Set<string>;
}

export function calculateDailyCounts(params: CalculateParams): DayCount[] {
  const { events, minDate, limitDate, groupBy, allCategories, selectedCategories } = params;

  if (minDate >= limitDate) return [];

  const data: DayCount[] = [];
  const endDate = addDays(limitDate, 1);

  const activeStates = new Map<string, TrackedState>();
  const counts: Record<string, number> = {};
  let totalCount = 0;

  function addContribution(keys: string[]) {
    totalCount++;
    for (const key of keys) {
      counts[key] = (counts[key] || 0) + 1;
    }
  }

  function removeContribution(keys: string[]) {
    totalCount--;
    for (const key of keys) {
      counts[key] = (counts[key] || 0) - 1;
    }
  }

  function handleTaskAdd(task: Task, dateStr: string) {
    const groupKeys = getGroupKeys(task, groupBy, dateStr);
    const passes = groupKeys.some((k) => selectedCategories.has(k));
    activeStates.set(task.id, { groupKeys, passes });
    if (passes) addContribution(groupKeys);
  }

  function handleTaskRemove(task: Task) {
    const state = activeStates.get(task.id);
    if (state?.passes) removeContribution(state.groupKeys);
    activeStates.delete(task.id);
  }

  function handleStateChange(task: Task, dateStr: string) {
    const oldState = activeStates.get(task.id);
    if (!oldState) return;

    const groupKeys = getGroupKeys(task, groupBy, dateStr);
    const passes = groupKeys.some((k) => selectedCategories.has(k));

    if (
      oldState.passes === passes &&
      groupKeys.length === oldState.groupKeys.length &&
      groupKeys.every((k, i) => k === oldState.groupKeys[i])
    ) {
      return;
    }

    if (oldState.passes) removeContribution(oldState.groupKeys);
    if (passes) addContribution(groupKeys);
    activeStates.set(task.id, { groupKeys, passes });
  }

  let dateStr = minDate;
  while (dateStr < endDate) {
    if (events.has(dateStr)) {
      const dayEvents = events.get(dateStr)!;
      for (const task of dayEvents.created) handleTaskAdd(task, dateStr);
      for (const task of dayEvents.completed) handleTaskRemove(task);
      for (const task of dayEvents.stateChange) handleStateChange(task, dateStr);
    }

    const day: DayCount = { date: dateStr, total: totalCount };
    for (const cat of allCategories) {
      day[cat] = counts[cat] || 0;
    }
    data.push(day);
    dateStr = addDays(dateStr, 1);
  }

  return data;
}
