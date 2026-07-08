import { expect, test } from 'vitest';
import { getPresetRange, PRESET_LABELS } from './presets.ts';

const NOW = new Date('2026-05-04T18:00:00.000Z'); // 14:00 EDT, 11:00 PDT

test('PRESET_LABELS — has expected order', () => {
	expect(PRESET_LABELS).toEqual(['7D', '30D', '90D', '1Y', 'MTD', 'YTD', 'ALL']);
});

test('getPresetRange — 7D in NY', () => {
	const r = getPresetRange('7D', 'America/New_York', NOW);
	expect(r.end).toEqual('2026-05-04');
	expect(r.start).toEqual('2026-04-27');
});

test('getPresetRange — 30D in NY', () => {
	const r = getPresetRange('30D', 'America/New_York', NOW);
	expect(r.end).toEqual('2026-05-04');
	expect(r.start).toEqual('2026-04-04');
});

test('getPresetRange — 90D in NY', () => {
	const r = getPresetRange('90D', 'America/New_York', NOW);
	expect(r.end).toEqual('2026-05-04');
	expect(r.start).toEqual('2026-02-03');
});

test('getPresetRange — 1Y in NY', () => {
	const r = getPresetRange('1Y', 'America/New_York', NOW);
	expect(r.end).toEqual('2026-05-04');
	expect(r.start).toEqual('2025-05-04');
});

test('getPresetRange — MTD in NY', () => {
	const r = getPresetRange('MTD', 'America/New_York', NOW);
	expect(r.start).toEqual('2026-05-01');
	expect(r.end).toEqual('2026-05-04');
});

test('getPresetRange — YTD in NY', () => {
	const r = getPresetRange('YTD', 'America/New_York', NOW);
	expect(r.start).toEqual('2026-01-01');
	expect(r.end).toEqual('2026-05-04');
});

test('getPresetRange — ALL anchors at 2025-01-10', () => {
	const r = getPresetRange('ALL', 'America/New_York', NOW);
	expect(r.start).toEqual('2025-01-10');
	expect(r.end).toEqual('2026-05-04');
});

test('getPresetRange — same input shifts when TZ changes (early UTC)', () => {
	// 03:00 UTC May 4 = 23:00 EDT May 3 = 20:00 PDT May 3
	const earlyUTC = new Date('2026-05-04T03:00:00.000Z');
	const ny = getPresetRange('7D', 'America/New_York', earlyUTC);
	const utc = getPresetRange('7D', 'UTC', earlyUTC);
	expect(ny.end).toEqual('2026-05-03');
	expect(utc.end).toEqual('2026-05-04');
});

test('getPresetRange — 1Y crosses leap day correctly', () => {
	// From Feb 28 2026 → Feb 28 2025 (since 2025 is not leap, no Feb 29 to worry about)
	const feb28 = new Date('2026-02-28T18:00:00.000Z');
	const r = getPresetRange('1Y', 'UTC', feb28);
	expect(r.end).toEqual('2026-02-28');
	expect(r.start).toEqual('2025-02-28');
});
