import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

// logos used on the page, by their simple-icons slug
const ICONS = [
  'youtube',
  'tiktok',
  'instagram',
  'x',
  'reddit',
  'claudecode',
  'cursor',
  'opencode',
  'google',
  'qwen',
  'kimi',
  'github',
];

// puts the logos into index.html as one svg sprite, so they cost no script and no extra request
function iconSprite(): Plugin {
  return {
    name: 'icon-sprite',
    transformIndexHtml(html) {
      const symbols = ICONS.map((slug) => {
        const file = fileURLToPath(new URL(`./node_modules/simple-icons/icons/${slug}.svg`, import.meta.url));
        const path = /<path d="([^"]+)"/.exec(readFileSync(file, 'utf8'));
        if (!path) throw new Error(`no path in simple-icons/${slug}.svg`);
        return `<symbol id="i-${slug}" viewBox="0 0 24 24"><path d="${path[1]}"/></symbol>`;
      });
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
