import type { NotionPage } from "$lib/types.js";

const DATA_SOURCE_ID = "77ef5074-aa23-468a-b5fb-2692e78184db";
const QUERY_URL = `https://api.notion.com/v1/data_sources/${DATA_SOURCE_ID}/query`;
const API_VERSION = "2026-03-11";

function apiHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "Notion-Version": API_VERSION,
  };
}

async function fetchPaginated(
  apiKey: string,
  payload: Record<string, unknown> = {},
): Promise<NotionPage[]> {
  const allPages: NotionPage[] = [];
  let hasMore = true;
  let startCursor: string | undefined;

  while (hasMore) {
    const body: Record<string, unknown> = { ...payload };
    if (startCursor) body.start_cursor = startCursor;

    const response = await fetch(QUERY_URL, {
      method: "POST",
      headers: apiHeaders(apiKey),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Notion API error ${response.status}: ${text}`);
    }

    const data = await response.json();
    allPages.push(...(data.results as NotionPage[]));
    hasMore = data.has_more ?? false;
    startCursor = data.next_cursor ?? undefined;
  }

  return allPages;
}

export async function fetchAllPages(apiKey: string): Promise<NotionPage[]> {
  return fetchPaginated(apiKey);
}

export async function fetchIncrementalPages(
  apiKey: string,
  since: string,
): Promise<NotionPage[]> {
  return fetchPaginated(apiKey, {
    filter: {
      property: "Last edited time",
      last_edited_time: {
        on_or_after: since,
      },
    },
  });
}

export interface PageChunk {
  pages: NotionPage[];
  nextCursor: string | null;
}

/**
 * Fetch up to maxRequests pagination steps of the full-database query.
 * ponytail: 3 requests/chunk keeps each Worker invocation ~4-6ms CPU and 3
 * subrequests — the client loops with nextCursor until null.
 */
export async function fetchPageChunk(
  apiKey: string,
  cursor: string | null,
  maxRequests = 3,
): Promise<PageChunk> {
  const pages: NotionPage[] = [];
  let startCursor = cursor ?? undefined;
  for (let i = 0; i < maxRequests; i++) {
    const body: Record<string, unknown> = {};
    if (startCursor) body.start_cursor = startCursor;
    const response = await fetch(QUERY_URL, {
      method: "POST",
      headers: apiHeaders(apiKey),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Notion API error ${response.status}: ${await response.text()}`);
    }
    const data = await response.json();
    pages.push(...(data.results as NotionPage[]));
    startCursor = data.next_cursor ?? undefined;
    if (!(data.has_more ?? false)) return { pages, nextCursor: null };
  }
  return { pages, nextCursor: startCursor ?? null };
}

