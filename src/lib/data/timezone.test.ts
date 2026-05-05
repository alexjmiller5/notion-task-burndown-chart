import { assertEquals } from "@std/assert";
import {
  addDays,
  DEFAULT_TIMEZONE,
  getCurrentDateStr,
  TIMEZONES,
  toLocalDateStr,
} from "./timezone.ts";

Deno.test("toLocalDateStr — date-only strings pass through unchanged", () => {
  assertEquals(toLocalDateStr("2026-05-04", "America/New_York"), "2026-05-04");
  assertEquals(toLocalDateStr("2026-05-04", "UTC"), "2026-05-04");
  assertEquals(toLocalDateStr("2026-12-31", "America/Los_Angeles"), "2026-12-31");
});

Deno.test("toLocalDateStr — UTC ISO converts to NY date (afternoon UTC stays same NY day)", () => {
  // 18:00 UTC = 14:00 EDT (May = EDT, UTC-4)
  assertEquals(
    toLocalDateStr("2026-05-04T18:00:00.000Z", "America/New_York"),
    "2026-05-04",
  );
});

Deno.test("toLocalDateStr — UTC ISO converts to NY date (early morning UTC = previous NY day)", () => {
  // 03:00 UTC May 4 = 23:00 EDT May 3
  assertEquals(
    toLocalDateStr("2026-05-04T03:00:00.000Z", "America/New_York"),
    "2026-05-03",
  );
});

Deno.test("toLocalDateStr — UTC ISO with UTC tz returns the UTC date", () => {
  assertEquals(
    toLocalDateStr("2026-05-04T03:00:00.000Z", "UTC"),
    "2026-05-04",
  );
});

Deno.test("toLocalDateStr — UTC ISO converts to LA date", () => {
  // 06:00 UTC May 4 = 23:00 PDT May 3
  assertEquals(
    toLocalDateStr("2026-05-04T06:00:00.000Z", "America/Los_Angeles"),
    "2026-05-03",
  );
});

Deno.test("toLocalDateStr — winter (EST = UTC-5), 04:00 UTC = previous day", () => {
  // January = EST (UTC-5). 04:00 UTC Jan 15 = 23:00 EST Jan 14
  assertEquals(
    toLocalDateStr("2026-01-15T04:00:00.000Z", "America/New_York"),
    "2026-01-14",
  );
});

Deno.test("addDays — simple +1", () => {
  assertEquals(addDays("2026-05-04", 1), "2026-05-05");
});

Deno.test("addDays — simple -1", () => {
  assertEquals(addDays("2026-05-04", -1), "2026-05-03");
});

Deno.test("addDays — across spring DST (US, March 8 2026)", () => {
  // Should produce calendar-day arithmetic regardless of DST
  assertEquals(addDays("2026-03-08", 1), "2026-03-09");
  assertEquals(addDays("2026-03-07", 2), "2026-03-09");
});

Deno.test("addDays — across fall DST (US, Nov 1 2026)", () => {
  assertEquals(addDays("2026-11-01", 1), "2026-11-02");
});

Deno.test("addDays — month boundary", () => {
  assertEquals(addDays("2026-01-31", 1), "2026-02-01");
});

Deno.test("addDays — year boundary", () => {
  assertEquals(addDays("2026-12-31", 1), "2027-01-01");
  assertEquals(addDays("2026-01-01", -1), "2025-12-31");
});

Deno.test("addDays — leap year (2024-02-28 + 1)", () => {
  assertEquals(addDays("2024-02-28", 1), "2024-02-29");
  assertEquals(addDays("2024-02-29", 1), "2024-03-01");
});

Deno.test("addDays — non-leap-year (2026-02-28 + 1)", () => {
  assertEquals(addDays("2026-02-28", 1), "2026-03-01");
});

Deno.test("addDays — zero days returns same date", () => {
  assertEquals(addDays("2026-05-04", 0), "2026-05-04");
});

Deno.test("addDays — large step", () => {
  assertEquals(addDays("2026-01-01", 365), "2027-01-01");
});

Deno.test("getCurrentDateStr — returns YYYY-MM-DD format using injected now", () => {
  const fakeNow = new Date("2026-05-04T18:00:00.000Z"); // 14:00 EDT
  assertEquals(getCurrentDateStr("America/New_York", fakeNow), "2026-05-04");
  assertEquals(getCurrentDateStr("UTC", fakeNow), "2026-05-04");
});

Deno.test("getCurrentDateStr — early UTC = previous local day in NY", () => {
  const fakeNow = new Date("2026-05-04T03:00:00.000Z"); // 23:00 EDT May 3
  assertEquals(getCurrentDateStr("America/New_York", fakeNow), "2026-05-03");
});

Deno.test("TIMEZONES — curated list contains expected entries", () => {
  const ids = TIMEZONES.map((t) => t.id);
  for (const expected of [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "UTC",
    "Europe/London",
  ]) {
    assertEquals(
      ids.includes(expected),
      true,
      `Expected TIMEZONES to include ${expected}`,
    );
  }
});

Deno.test("DEFAULT_TIMEZONE is America/New_York", () => {
  assertEquals(DEFAULT_TIMEZONE, "America/New_York");
});
