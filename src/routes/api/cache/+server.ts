import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { CACHE_KEY } from '$lib/server/cache.js';

export const PUT: RequestHandler = async ({ request, platform }) => {
	// Buffered, not streamed: the sanity gate needs the text, and decoding
	// ~1.1 MB of UTF-8 is ~1 ms — no JSON.parse happens here either way.
	const text = await request.text();
	// ponytail: cheap sanity gate, not schema validation — CF Access already
	// restricts callers to Alex; this only guards against a truncated body.
	if (!text.startsWith('{') || text.length < 100) {
		return json({ error: 'bad cache body' }, { status: 400 });
	}
	await platform!.env.CACHE.put(CACHE_KEY, text, {
		httpMetadata: { contentType: 'application/json' }
	});
	return json({ ok: true });
};
