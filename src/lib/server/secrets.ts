/** Prod: Worker secret on platform.env. Dev: process env injected by `op run`. */
export function getNotionApiKey(env: { NOTION_API_KEY?: string }): string {
	const key =
		env.NOTION_API_KEY ??
		(globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
			?.NOTION_API_KEY;
	if (!key) throw new Error('NOTION_API_KEY is not set (Worker secret or op run env)');
	return key;
}
