# Stacked Task Chart

A SvelteKit app that visualizes Notion task data as interactive stacked area charts over time.

## Requirements

- [Deno](https://deno.land/) 2.x
- [1Password CLI](https://developer.1password.com/docs/cli/) (`op`) for local secrets retrieval

## Setup & Run

```bash
deno task dev
```

Opens on `http://localhost:5173`. The app loads cached data instantly, then refreshes from Notion in the background.

## How It Works

- Fetches tasks from a Notion database via the Notion API
- Caches all page data locally in `notion-cache.json`
- On subsequent loads, serves cached data immediately and incrementally fetches only changed tasks
- Renders a stacked area chart showing active task counts over time, grouped by tag or due date status
- Supports filtering by tags, due date status (Future/Overdue/Undated), and toggles for incomplete and legacy tasks

## Secrets

The Notion API key is retrieved via 1Password CLI:

```
op item get "Stacked Task Chart Notion Internal Integration Secret" --fields credential --reveal
```

Alternatively, set the `NOTION_API_KEY` environment variable.
