// Manual event markers drawn as vertical lines on the Active chart (day/week
// buckets). Add a row for any real-life event that explains an uptick (task
// dump) or downtick (purge) in the task count; direction picks the color
// (up = blue, like Created; down = green, like Completed).
export interface ChartMarker {
	date: string; // YYYY-MM-DD
	label: string;
	direction: 'up' | 'down';
}

export const MARKERS: ChartMarker[] = [
	{ date: '2025-11-28', label: 'Thanksgiving brain dump', direction: 'up' },
	{ date: '2026-02-26', label: 'Post-ski workspace overhaul', direction: 'up' },
	{ date: '2026-03-30', label: 'Spring cleanup', direction: 'down' },
	{ date: '2026-05-19', label: 'May cleanup', direction: 'down' },
	{ date: '2026-06-29', label: 'Post-Greece backlog purge', direction: 'down' },
	{ date: '2026-08-10', label: 'Shortcuts triage', direction: 'down' }
];
