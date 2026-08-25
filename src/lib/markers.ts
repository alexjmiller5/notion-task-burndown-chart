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

/** Marker labels live in horizontal lanes in the strip above the plot. */
export interface PlacedLabel {
	lane: number;
	left: number;
	right: number;
}

export const MARKER_LANE_HEIGHT = 13;
export const MARKER_MAX_LANES = 6;

/**
 * Drop a label into the highest lane it fits in. Markers far enough apart
 * share the top lane; ones that would run into each other stack downward.
 * Past `maxLanes` we give up and reuse the last lane rather than pushing the
 * strip taller than the chart can spare.
 */
export function assignLane(
	placed: PlacedLabel[],
	left: number,
	right: number,
	maxLanes = MARKER_MAX_LANES
): number {
	for (let lane = 0; lane < maxLanes; lane++) {
		const clash = placed.some((p) => p.lane === lane && left < p.right && right > p.left);
		if (!clash) return lane;
	}
	return maxLanes - 1;
}

/** Height of the strip needed to hold everything placed so far. */
export function laneStripHeight(placed: PlacedLabel[]): number {
	if (placed.length === 0) return 0;
	const lanes = Math.max(...placed.map((p) => p.lane)) + 1;
	return lanes * MARKER_LANE_HEIGHT + 6;
}
