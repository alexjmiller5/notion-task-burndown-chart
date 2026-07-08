// One-off: render the homescreen/app icons. Run: bun scripts/generate-icons.ts
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';

const BG = '#030304'; // --color-void from src/app.css — keep in sync
const FG = '#F7931A'; // --color-bitcoin

const heroicon = readFileSync(
	`${process.env.HOME}/Desktop/coding/reference-repos/heroicons/optimized/24/solid/chart-bar.svg`,
	'utf8'
);
const path = heroicon.match(/<path[^>]*d="([^"]+)"/)![1];

// Full-bleed square: iOS masks its own corners on apple-touch-icon.
// Glyph occupies the middle ~55% of the canvas.
function iconSvg(size: number): string {
	const glyph = size * 0.55;
	const offset = (size - glyph) / 2;
	const scale = glyph / 24;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">
    <path d="${path}" fill="${FG}"/>
  </g>
</svg>`;
}

for (const [file, size] of [
	['static/icon-192.png', 192],
	['static/icon-512.png', 512],
	['static/apple-touch-icon.png', 180]
] as const) {
	writeFileSync(file, new Resvg(iconSvg(size)).render().asPng());
	console.log(`wrote ${file}`);
}

// Browser-tab favicon: transparent background, just the glyph.
writeFileSync(
	'static/favicon.svg',
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${path}" fill="${FG}"/></svg>`
);
console.log('wrote static/favicon.svg');
