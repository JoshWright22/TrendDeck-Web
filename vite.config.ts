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
const SPARK = 'M12 0 15.375 8.625 24 12 15.375 15.375 12 24 8.625 15.375 0 12 8.625 8.625Z';

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
