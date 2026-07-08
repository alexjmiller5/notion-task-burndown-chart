import { expect, test } from 'vitest';
import { getIncrementalSince, mergeParsedData } from './merge.ts';
import type { ParsedData, Task } from '$lib/types.js';

function makeTask(overrides: Partial<Task> = {}): Task {
	return {
		id: 't1',
		created: '2026-01-01T00:00:00.000Z',
		completed: null,
		dueDate: null,
		status: 'Not started',
		tags: [],
		priority: '(No Priority)',
		projectName: '(No Project)',
		history: [],
		hasProject: false,
		lastEditedTime: '2026-01-02T00:00:00.000Z',
		...overrides
	};
}
function makeParsed(overrides: Partial<ParsedData> = {}): ParsedData {
	return {
		tasks: [],
		allTags: [],
		allPriorities: [],
		allProjects: [],
		tagColors: {},
		...overrides
	};
}

test('mergeParsedData: fresh task replaces cached task with same id', () => {
	const base = makeParsed({ tasks: [makeTask({ status: 'Not started' })] });
	const fresh = makeParsed({ tasks: [makeTask({ status: 'Done' })] });
	const merged = mergeParsedData(base, fresh);
	expect(merged.tasks.length).toEqual(1);
	expect(merged.tasks[0].status).toEqual('Done');
});

test('mergeParsedData: unions metadata', () => {
	const base = makeParsed({
		allTags: ['Chore'],
		allPriorities: ['High'],
		allProjects: ['A'],
		tagColors: { Chore: 'blue' }
	});
	const fresh = makeParsed({
		allTags: ['Work'],
		allPriorities: ['Low'],
		allProjects: ['B'],
		tagColors: { Work: 'red' }
	});
	const merged = mergeParsedData(base, fresh);
	expect(merged.allTags).toEqual(['Chore', 'Work']);
	expect(merged.allPriorities).toEqual(['High', 'Low']);
	expect(merged.allProjects).toEqual(['A', 'B']);
	expect(merged.tagColors).toEqual({ Chore: 'blue', Work: 'red' });
});

test('getIncrementalSince: earlier of the two maxima', () => {
	const tasks = [
		makeTask({
			id: 'a',
			created: '2026-01-05T00:00:00.000Z',
			lastEditedTime: '2026-01-06T00:00:00.000Z'
		}),
		makeTask({
			id: 'b',
			created: '2026-01-01T00:00:00.000Z',
			lastEditedTime: '2026-01-09T00:00:00.000Z'
		})
	];
	// max(created)=01-05, max(edited)=01-09 -> earlier is 01-05
	expect(getIncrementalSince(tasks)).toEqual('2026-01-05T00:00:00.000Z');
});

test('getIncrementalSince: null for empty', () => {
	expect(getIncrementalSince([])).toEqual(null);
});
