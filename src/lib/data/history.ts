import type { HistoryEntry } from "$lib/types.js";
import dayjs from "dayjs";

/**
 * Parses the "Tag & Date History" rich text field into sorted entries.
 * Format: [YYYY-MM-DD HH:MM] --- Tags: [tag1, tag2], Due Date: YYYY-MM-DD
 */
export function parseHistoryLedger(text: string): HistoryEntry[] {
  if (!text) return [];

  const dailyState = new Map<string, { tags: string[]; dueDate: string | null }>();
  const regex =
    /\[(.*?)\] --- Tags: \[(.*?)\](?:, Due Date: (.*?))?$/gm;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const entryDate = dayjs(match[1].split(" ")[0]);
    const dateKey = entryDate.format("YYYY-MM-DD");

    dailyState.set(dateKey, {
      tags: match[2] ? match[2].split(", ").filter((t) => t) : [],
      dueDate: match[3] && match[3] !== "undefined" ? match[3] : null,
    });
  }

  return Array.from(dailyState.entries())
    .map(([date, state]) => ({ date, ...state }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
