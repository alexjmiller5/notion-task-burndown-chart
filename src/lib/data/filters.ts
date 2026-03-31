import type { Task } from "$lib/types.js";
import dayjs from "dayjs";

const LEGACY_CUTOFF = "2025-01-10";

export interface FilterOptions {
  includeLegacy: boolean;
  includeIncomplete: boolean;
  includeProjectTasks: boolean;
}

/** Server-side: remove tasks that should never be shown */
export function applyBaseFilters(tasks: Task[]): Task[] {
  return tasks.filter((task) => {
    if (!task.created) return false;
    if (task.status === "Cancelled") return false;
    if (task.tags.includes("useless")) return false;
    return true;
  });
}

/** Client-side: apply user-toggleable filters */
export function applyViewFilters(
  tasks: Task[],
  options: FilterOptions,
): Task[] {
  return tasks.filter((task) => {
    if (!options.includeLegacy && !dayjs(task.created).isAfter(LEGACY_CUTOFF)) {
      return false;
    }
    if (!options.includeIncomplete && !task.completed) return false;
    if (!options.includeProjectTasks && task.hasProject) return false;
    return true;
  });
}
