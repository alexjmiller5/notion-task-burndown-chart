import { assertEquals } from "@std/assert";
import { shouldFullRefresh, STALE_AFTER_MS } from "./refresh-policy.ts";

const NOW = new Date("2026-05-04T12:00:00.000Z");

Deno.test("shouldFullRefresh — forceFull short-circuits to true", () => {
  assertEquals(
    shouldFullRefresh({
      forceFull: true,
      hasCache: true,
      lastFullRefreshAt: NOW.toISOString(),
      now: NOW,
    }),
    true,
  );
});

Deno.test("shouldFullRefresh — empty cache returns true", () => {
  assertEquals(
    shouldFullRefresh({
      forceFull: false,
      hasCache: false,
      lastFullRefreshAt: null,
      now: NOW,
    }),
    true,
  );
});

Deno.test("shouldFullRefresh — never had a full refresh returns true", () => {
  assertEquals(
    shouldFullRefresh({
      forceFull: false,
      hasCache: true,
      lastFullRefreshAt: null,
      now: NOW,
    }),
    true,
  );
});

Deno.test("shouldFullRefresh — recent full refresh (1h ago) returns false", () => {
  const oneHourAgo = new Date(NOW.getTime() - 60 * 60 * 1000).toISOString();
  assertEquals(
    shouldFullRefresh({
      forceFull: false,
      hasCache: true,
      lastFullRefreshAt: oneHourAgo,
      now: NOW,
    }),
    false,
  );
});

Deno.test("shouldFullRefresh — exactly 24h ago returns true (>= boundary)", () => {
  const exactly24h = new Date(NOW.getTime() - STALE_AFTER_MS).toISOString();
  assertEquals(
    shouldFullRefresh({
      forceFull: false,
      hasCache: true,
      lastFullRefreshAt: exactly24h,
      now: NOW,
    }),
    true,
  );
});

Deno.test("shouldFullRefresh — 23h59m ago returns false (still fresh)", () => {
  const almostStale = new Date(NOW.getTime() - STALE_AFTER_MS + 60_000).toISOString();
  assertEquals(
    shouldFullRefresh({
      forceFull: false,
      hasCache: true,
      lastFullRefreshAt: almostStale,
      now: NOW,
    }),
    false,
  );
});

Deno.test("shouldFullRefresh — 25h ago returns true", () => {
  const stale = new Date(NOW.getTime() - 25 * 60 * 60 * 1000).toISOString();
  assertEquals(
    shouldFullRefresh({
      forceFull: false,
      hasCache: true,
      lastFullRefreshAt: stale,
      now: NOW,
    }),
    true,
  );
});

Deno.test("STALE_AFTER_MS — equals 24 hours", () => {
  assertEquals(STALE_AFTER_MS, 24 * 60 * 60 * 1000);
});
