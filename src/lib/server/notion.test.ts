import { afterEach, expect, test, vi } from "vitest";
import { fetchPageChunk } from "./notion.ts";

function notionResponse(ids: string[], nextCursor: string | null) {
  return new Response(
    JSON.stringify({
      results: ids.map((id) => ({ id, created_time: "", last_edited_time: "", properties: {}, archived: false, in_trash: false, url: "" })),
      has_more: nextCursor !== null,
      next_cursor: nextCursor,
    }),
    { status: 200 },
  );
}

afterEach(() => vi.unstubAllGlobals());

test("fetchPageChunk stops after maxRequests and returns the cursor", async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(notionResponse(["a"], "c1"))
    .mockResolvedValueOnce(notionResponse(["b"], "c2"))
    .mockResolvedValueOnce(notionResponse(["c"], "c3"));
  vi.stubGlobal("fetch", fetchMock);
  const chunk = await fetchPageChunk("key", null, 3);
  expect(fetchMock.mock.calls.length).toEqual(3);
  expect(chunk.pages.map((p) => p.id)).toEqual(["a", "b", "c"]);
  expect(chunk.nextCursor).toEqual("c3");
});

test("fetchPageChunk returns null cursor when Notion is exhausted early", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(notionResponse(["a"], null)));
  const chunk = await fetchPageChunk("key", null, 3);
  expect(chunk.pages.map((p) => p.id)).toEqual(["a"]);
  expect(chunk.nextCursor).toEqual(null);
});

test("fetchPageChunk resumes from a given cursor", async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce(notionResponse(["z"], null));
  vi.stubGlobal("fetch", fetchMock);
  await fetchPageChunk("key", "resume-me", 3);
  const body = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(body.start_cursor).toEqual("resume-me");
});
