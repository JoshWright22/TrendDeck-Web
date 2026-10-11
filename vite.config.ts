import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

// logos used on the page, by their simple-icons slug
const ICONS = [
  'youtube',
  'instagram',
  'tiktok',
  'x',
  'reddit',
  'threads',
  'linkedin',
  'facebook',
  'twitch',
  'discord',
  'snapchat',
  'pinterest',
  'bluesky',
  'claude',
  'openai',
  'googlegemini',
  'google',
  'ollama',
  'cursor',
  'opencode',
  'qwen',
  'kimi',
  'gnubash',
  'github',
];

// the four point spark from the logo, on the same 24 box as the icons
// corner mark on every card: a small rising line ending in a dot
const SPARK = 'M4.79 19.19 L10.79 13.19 L8.41 10.81 L2.41 16.81ZM8.41 13.19 L12.01 16.79 L14.39 14.41 L10.79 10.81ZM14.49 16.68 L20.49 9.48 L17.91 7.32 L11.91 14.52ZM1.9200000000000002 18.0a1.68 1.68 0 1 0 3.36 0a1.68 1.68 0 1 0 -3.36 0ZM7.92 12.0a1.68 1.68 0 1 0 3.36 0a1.68 1.68 0 1 0 -3.36 0ZM11.52 15.6a1.68 1.68 0 1 0 3.36 0a1.68 1.68 0 1 0 -3.36 0ZM17.52 8.4a1.68 1.68 0 1 0 3.36 0a1.68 1.68 0 1 0 -3.36 0ZM16.68 7.2a3.12 3.12 0 1 0 6.24 0a3.12 3.12 0 1 0 -6.24 0Z';

function iconPath(slug: string): string {
  // src/icons holds the ones simple-icons dropped, taken from its older releases
  const local = fileURLToPath(new URL(`./src/icons/${slug}.svg`, import.meta.url));
  const packaged = fileURLToPath(new URL(`./node_modules/simple-icons/icons/${slug}.svg`, import.meta.url));
  const path = /<path d="([^"]+)"/.exec(readFileSync(existsSync(local) ? local : packaged, 'utf8'));
  if (!path) throw new Error(`no path in ${slug}.svg`);
  return path[1];
}

// puts the logos into index.html as one svg sprite, so they cost no script and no extra request
function iconSprite(): Plugin {
  return {
    name: 'icon-sprite',
    transformIndexHtml(html) {
      const symbol = (id: string, d: string) => `<symbol id="i-${id}" viewBox="0 0 24 24"><path d="${d}"/></symbol>`;
      const symbols = ICONS.map((slug) => symbol(slug, iconPath(slug)));
      symbols.push(symbol('spark', SPARK));
      return html.replace('<!-- icons -->', symbols.join(''));
    },
  };
}

// base matches the GitHub Pages path for this repo
export default defineConfig({
  base: '/TrendDeck-Web/',
  plugins: [iconSprite()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    // three.js is its own lazy chunk and never part of the first load
    chunkSizeWarningLimit: 700,
  },
});
