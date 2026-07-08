import { expect, test } from "vitest";
import { getIncrementalSinceDate, mergePages } from "./notion.ts";
import type { NotionPage } from "$lib/types.js";

function makePage(overrides: Partial<NotionPage> = {}): NotionPage {
  return {
    id: "id-1",
    created_time: "2026-05-01T00:00:00.000Z",
    last_edited_time: "2026-05-01T00:00:00.000Z",
    properties: {},
    archived: false,
    in_trash: false,
    url: "",
    ...overrides,
  };
}

test("mergePages — empty cached + fresh returns fresh", () => {
  const fresh = [makePage({ id: "a" }), makePage({ id: "b" })];
  const result = mergePages([], fresh);
  expect(result.length).toEqual(2);
  expect(result.map((p) => p.id).sort()).toEqual(["a", "b"]);
});

test("mergePages — fresh page overwrites cached page with same id", () => {
  const cached = [makePage({ id: "a", last_edited_time: "2026-01-01T00:00:00.000Z" })];
  const fresh = [makePage({ id: "a", last_edited_time: "2026-05-04T00:00:00.000Z" })];
  const result = mergePages(cached, fresh);
  expect(result.length).toEqual(1);
  expect(result[0].last_edited_time).toEqual("2026-05-04T00:00:00.000Z");
});

test("mergePages — disjoint ids combine", () => {
  const cached = [makePage({ id: "a" })];
  const fresh = [makePage({ id: "b" })];
  const result = mergePages(cached, fresh);
  expect(result.length).toEqual(2);
  expect(result.map((p) => p.id).sort()).toEqual(["a", "b"]);
});

test("mergePages — preserves cached pages not in fresh", () => {
  const cached = [makePage({ id: "a" }), makePage({ id: "b" })];
  const fresh = [makePage({ id: "c" })];
  const result = mergePages(cached, fresh);
  expect(result.length).toEqual(3);
});

test("getIncrementalSinceDate — returns null for empty cache", () => {
  expect(getIncrementalSinceDate([])).toEqual(null);
});

test("getIncrementalSinceDate — returns the smaller of maxCreated/maxEdited", () => {
  const pages = [
    makePage({
      id: "a",
      created_time: "2026-05-01T00:00:00.000Z",
      last_edited_time: "2026-05-01T00:00:00.000Z",
    }),
    makePage({
      id: "b",
      created_time: "2026-05-04T00:00:00.000Z", // newest creation
      last_edited_time: "2026-05-04T00:00:00.000Z",
    }),
    makePage({
      id: "c",
      created_time: "2026-05-02T00:00:00.000Z",
      last_edited_time: "2026-05-05T00:00:00.000Z", // newest edit
    }),
  ];
  // maxCreated=2026-05-04, maxEdited=2026-05-05 → since=2026-05-04
  expect(getIncrementalSinceDate(pages)).toEqual("2026-05-04T00:00:00.000Z");
});

test("getIncrementalSinceDate — when max created equals max edited", () => {
  const pages = [
    makePage({
      id: "a",
      created_time: "2026-05-04T00:00:00.000Z",
      last_edited_time: "2026-05-04T00:00:00.000Z",
    }),
  ];
  expect(getIncrementalSinceDate(pages)).toEqual("2026-05-04T00:00:00.000Z");
});
