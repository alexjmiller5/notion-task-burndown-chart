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

export function getIncrementalSinceDate(
  cached: NotionPage[],
): string | null {
  if (cached.length === 0) return null;

  let maxCreated = "";
  let maxEdited = "";

  for (const page of cached) {
    if (page.created_time > maxCreated) maxCreated = page.created_time;
    if (page.last_edited_time > maxEdited) maxEdited = page.last_edited_time;
  }

  return maxCreated < maxEdited ? maxCreated : maxEdited;
}

export function mergePages(
  cached: NotionPage[],
  fresh: NotionPage[],
): NotionPage[] {
  const pageMap = new Map<string, NotionPage>();

  for (const page of cached) {
    pageMap.set(page.id, page);
  }

  for (const page of fresh) {
    pageMap.set(page.id, page);
  }

  return Array.from(pageMap.values());
}
