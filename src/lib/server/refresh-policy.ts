export const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export interface RefreshDecisionInput {
  forceFull: boolean;
  hasCache: boolean;
  lastFullRefreshAt: string | null;
  now?: Date;
}

export function shouldFullRefresh(input: RefreshDecisionInput): boolean {
  if (input.forceFull) return true;
  if (!input.hasCache) return true;
  if (!input.lastFullRefreshAt) return true;
  const now = (input.now ?? new Date()).getTime();
  const last = new Date(input.lastFullRefreshAt).getTime();
  return now - last >= STALE_AFTER_MS;
}
