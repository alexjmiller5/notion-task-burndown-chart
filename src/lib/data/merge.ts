import type { ParsedData, Task } from '$lib/types.js';
import { PRIORITY_ORDER } from './parser.js';

export function mergeParsedData(base: ParsedData, fresh: ParsedData): ParsedData {
	const byId = new Map<string, Task>();
	for (const t of base.tasks) byId.set(t.id, t);
	for (const t of fresh.tasks) byId.set(t.id, t);
	return {
		tasks: [...byId.values()],
		allTags: [...new Set([...base.allTags, ...fresh.allTags])].sort(),
		allPriorities: PRIORITY_ORDER.filter(
			(p) => base.allPriorities.includes(p) || fresh.allPriorities.includes(p)
		),
		allProjects: [...new Set([...base.allProjects, ...fresh.allProjects])].sort(),
		tagColors: { ...base.tagColors, ...fresh.tagColors }
	};
}

/** Earlier of max(created) / max(lastEditedTime) — mirrors the old page-based threshold. */
export function getIncrementalSince(tasks: Task[]): string | null {
	if (tasks.length === 0) return null;
	let maxCreated = '';
	let maxEdited = '';
	for (const t of tasks) {
		if (t.created > maxCreated) maxCreated = t.created;
		if (t.lastEditedTime > maxEdited) maxEdited = t.lastEditedTime;
	}
	return maxCreated < maxEdited ? maxCreated : maxEdited;
}
