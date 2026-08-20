// Manual event markers on the Active chart (day/week buckets). Directions:
// 'up' = blue dashed line (task dump, like Created), 'down' = green dashed
// line (purge, like Completed), 'flat' = shaded band from date to end
// (stagnation: trips, breaks). The Markers chip toggles all of them.
export interface ChartMarker {
	date: string; // YYYY-MM-DD
	end?: string; // for 'flat' bands
	label: string;
	direction: 'up' | 'down' | 'flat';
}

export const MARKERS: ChartMarker[] = [
	{ date: '2025-01-23', label: 'Senior winter break', direction: 'up' },
	{ date: '2025-03-06', end: '2025-03-16', label: 'Spring Break 2025', direction: 'flat' },
	{ date: '2025-05-17', label: 'Pre-SE-Asia prep', direction: 'down' },
	{ date: '2025-05-21', end: '2025-06-25', label: 'SE Asia Graduation Trip', direction: 'flat' },
	{ date: '2025-07-08', label: 'Pre-first-job purge', direction: 'down' },
	{ date: '2025-09-06', end: '2025-11-10', label: 'Notes limbo (pre-Synapse)', direction: 'flat' },
	{ date: '2025-10-06', label: 'Job backlog check-off', direction: 'down' },
	{ date: '2025-11-28', label: 'Synapse Implementation', direction: 'up' },
	{ date: '2026-02-26', label: 'Project tasks reconciliation', direction: 'up' },
	{ date: '2026-03-30', label: 'Post-Colombia', direction: 'down' },
	{ date: '2026-05-19', label: 'Post-whirlwind purge', direction: 'down' },
	{ date: '2026-06-29', label: 'Post-Greece', direction: 'down' },
	{ date: '2026-08-10', label: 'Shortcuts project triage', direction: 'down' }
];
