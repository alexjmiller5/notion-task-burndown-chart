import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { CACHE_KEY, EMPTY_CACHE } from '$lib/server/cache.js';

export const GET: RequestHandler = async ({ platform }) => {
	const obj = await platform!.env.CACHE.get(CACHE_KEY);
	if (!obj) return json(EMPTY_CACHE);
	// Stream the R2 body straight through — ~0 CPU; the client parses.
	return new Response(obj.body, { headers: { 'content-type': 'application/json' } });
};
