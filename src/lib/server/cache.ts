import type { TaskCache } from '$lib/types.js';

export const CACHE_KEY = 'task-cache.json';

export const EMPTY_CACHE: TaskCache = {
	lastFullRefreshAt: null,
	tasks: [],
	allTags: [],
	allPriorities: [],
	allProjects: [],
	tagColors: {}
};

export async function readCache(bucket: R2Bucket): Promise<TaskCache> {
	const obj = await bucket.get(CACHE_KEY);
	if (!obj) return structuredClone(EMPTY_CACHE);
	return (await obj.json()) as TaskCache;
}

export async function writeCache(bucket: R2Bucket, data: TaskCache): Promise<void> {
	await bucket.put(CACHE_KEY, JSON.stringify(data), {
		httpMetadata: { contentType: 'application/json' }
	});
}
