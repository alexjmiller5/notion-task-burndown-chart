import { expect, test } from 'vitest';
import { shouldFullRefresh, STALE_AFTER_MS } from './refresh-policy.ts';

const NOW = new Date('2026-05-04T12:00:00.000Z');

test('shouldFullRefresh — forceFull short-circuits to true', () => {
	expect(
		shouldFullRefresh({
			forceFull: true,
			hasCache: true,
			lastFullRefreshAt: NOW.toISOString(),
			now: NOW
		})
	).toEqual(true);
});

test('shouldFullRefresh — empty cache returns true', () => {
	expect(
		shouldFullRefresh({
			forceFull: false,
			hasCache: false,
			lastFullRefreshAt: null,
			now: NOW
		})
	).toEqual(true);
});

test('shouldFullRefresh — never had a full refresh returns true', () => {
	expect(
		shouldFullRefresh({
			forceFull: false,
			hasCache: true,
			lastFullRefreshAt: null,
			now: NOW
		})
	).toEqual(true);
});

test('shouldFullRefresh — recent full refresh (1h ago) returns false', () => {
	const oneHourAgo = new Date(NOW.getTime() - 60 * 60 * 1000).toISOString();
	expect(
		shouldFullRefresh({
			forceFull: false,
			hasCache: true,
			lastFullRefreshAt: oneHourAgo,
			now: NOW
		})
	).toEqual(false);
});

test('shouldFullRefresh — exactly 24h ago returns true (>= boundary)', () => {
	const exactly24h = new Date(NOW.getTime() - STALE_AFTER_MS).toISOString();
	expect(
		shouldFullRefresh({
			forceFull: false,
			hasCache: true,
			lastFullRefreshAt: exactly24h,
			now: NOW
		})
	).toEqual(true);
});

test('shouldFullRefresh — 23h59m ago returns false (still fresh)', () => {
	const almostStale = new Date(NOW.getTime() - STALE_AFTER_MS + 60_000).toISOString();
	expect(
		shouldFullRefresh({
			forceFull: false,
			hasCache: true,
			lastFullRefreshAt: almostStale,
			now: NOW
		})
	).toEqual(false);
});

test('shouldFullRefresh — 25h ago returns true', () => {
	const stale = new Date(NOW.getTime() - 25 * 60 * 60 * 1000).toISOString();
	expect(
		shouldFullRefresh({
			forceFull: false,
			hasCache: true,
			lastFullRefreshAt: stale,
			now: NOW
		})
	).toEqual(true);
});

test('STALE_AFTER_MS — equals 24 hours', () => {
	expect(STALE_AFTER_MS).toEqual(24 * 60 * 60 * 1000);
});
