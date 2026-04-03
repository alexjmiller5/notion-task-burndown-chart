import type { Task, TaskEvent } from "$lib/types.js";

function toDateStr(isoStr: string): string {
  return isoStr.slice(0, 10);
}

function addOneDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Get the effective start date for a task (when it enters the active count).
 * Tasks become active on their due date. Westport tasks without due dates
 * use their created date instead.
 */
function getEffectiveStartDate(task: Task): string {
  if (task.dueDate) {
    return toDateStr(task.dueDate);
  }
  // Westport tasks (or any task without a due date) fall back to created date
  return toDateStr(task.created);
}

export function buildEventsMap(tasks: Task[]): Map<string, TaskEvent> {
  const events = new Map<string, TaskEvent>();

  function addEvent(dateStr: string, type: keyof TaskEvent, task: Task) {
    if (!events.has(dateStr)) {
      events.set(dateStr, { created: [], completed: [], stateChange: [] });
    }
    events.get(dateStr)![type].push(task);
  }

  for (const task of tasks) {
    const startDate = getEffectiveStartDate(task);
    const completedDate = task.completed ? toDateStr(task.completed) : null;

    // Skip tasks that were completed before their effective start date —
    // they were finished before they'd ever enter the active count
    if (completedDate && addOneDay(completedDate) <= startDate) continue;

    // Task enters the count on its effective start date (due date or created date)
    addEvent(startDate, "created", task);

    // Task leaves the count when completed
    if (completedDate) {
      addEvent(addOneDay(completedDate), "completed", task);
    }

    // State changes for tag/due date history
    for (const h of task.history) {
      addEvent(h.date, "stateChange", task);
    }
  }

  return events;
}

export function getMinDate(tasks: Task[]): string {
  if (tasks.length === 0) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  // Find earliest effective start date across all tasks
  let min = getEffectiveStartDate(tasks[0]);
  for (const task of tasks) {
    const start = getEffectiveStartDate(task);
    if (start < min) min = start;
  }

  return min;
}
