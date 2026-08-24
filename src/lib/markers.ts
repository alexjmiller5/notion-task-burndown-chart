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
	{ date: '2025-03-24', label: 'Post-spring-break catch-up', direction: 'down' },
	{ date: '2025-05-21', end: '2025-06-25', label: 'SE Asia Graduation Trip', direction: 'flat' },
	{ date: '2025-07-08', label: 'Pre-first-job purge', direction: 'down' },
	{ date: '2025-08-04', label: 'First job start', direction: 'up' },
	{ date: '2025-09-06', end: '2025-11-28', label: 'Notes limbo (pre-Synapse)', direction: 'flat' },
	{ date: '2025-10-06', label: 'Job backlog check-off', direction: 'down' },
	{ date: '2025-11-28', label: 'Synapse Implementation', direction: 'up' },
	{ date: '2026-02-17', label: 'Synapse pipeline failures', direction: 'up' },
	{ date: '2026-02-26', label: 'Project tasks reconciliation', direction: 'up' },
	{ date: '2026-03-30', label: 'Post-Colombia', direction: 'down' },
	{ date: '2026-05-19', label: 'Post-whirlwind purge', direction: 'down' },
	{ date: '2026-05-20', label: 'MySupplementals tasks', direction: 'up' },
	{ date: '2026-06-22', label: 'Post-Greece brain dump', direction: 'up' },
	{ date: '2026-06-29', label: 'Post-Greece', direction: 'down' },
	// Productivity blips, not life events — kept for reference:
	// { date: '2026-07-18', label: 'Old-backlog sweep', direction: 'down' },
	{ date: '2026-07-27', label: 'Kun Chen rabbit hole', direction: 'up' },
	// { date: '2026-08-02', label: 'Moving-out triage', direction: 'down' },
	{ date: '2026-08-10', label: 'Shortcuts project triage', direction: 'down' }
];

/** A marker label already drawn: a narrow vertical strip at `x`, spanning `top`..`bottom`. */
export interface PlacedLabel {
	x: number;
	top: number;
	bottom: number;
}

/**
 * Marker labels are rotated 90°, so each is a narrow vertical strip. Two only
 * collide when their x strips overlap AND their y ranges do — markers a week
 * apart never clash, markers a day apart always do. Push the newcomer below
 * anything it would sit on top of and return the y to start drawing at.
 */
export function placeLabel(
	placed: PlacedLabel[],
	x: number,
	length: number,
	top: number,
	bottom: number,
	xGap = 14,
	yGap = 6
): number {
	let y = top;
	// Re-scan after each push: moving down can land on a different label.
	for (let guard = 0; guard <= placed.length; guard++) {
		const hit = placed.find((p) => Math.abs(p.x - x) < xGap && y < p.bottom && y + length > p.top);
		if (!hit) break;
		y = hit.bottom + yGap;
	}
	// Never run off the bottom of the plot; better to overlap than to vanish.
	return y + length > bottom ? top : y;
}
