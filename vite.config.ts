import { defineConfig } from 'vite';

// base matches the GitHub Pages path for this repo
export default defineConfig({
  base: '/TrendDeck-Web/',
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    // three.js is its own lazy chunk and never part of the first load
    chunkSizeWarningLimit: 700,
  },
});
