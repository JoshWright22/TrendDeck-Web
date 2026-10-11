![TrendDeck](public/assets/banner.png)

# TrendDeck-Web

The landing site for [TrendDeck](https://github.com/JoshWright22/TrendDeck), the open source marketing desktop for creators.

The page goes top to bottom like this:

1. Hero. The logo with two rings of playing cards orbiting it in 3D, one card for each platform and AI logo. The orbit leans toward the mouse.
2. Features, as a grid of big cards.
3. "Bring your own AI", a small card for each agent with its login command.
4. Download, with the run from source steps.

Colors, type, cards, sparks and motion all follow the app's [brand guide](https://github.com/JoshWright22/TrendDeck/blob/main/docs/BRAND.md). The approved mockups are in `design/`.

## Run it

You need [Node.js](https://nodejs.org) 22 or newer.

```bash
npm install
npm run dev        # dev server with hot reload
npm run build      # type check and build into dist/
npm run preview    # serve the build
```

Dev and preview both serve at `/TrendDeck-Web/`, same as the live site.

## How it's put together

Vite, TypeScript and Three.js. No framework.

```
index.html          all the copy and the section cards, as plain html
src/style.css       the whole look
src/main.ts         picks the mode, builds the flat hero cards, deals sections in, card tilt
src/mode.ts         full or lite
src/orbit.ts        which card goes where in the orbit, used by both the flat cards and the 3d scene
src/scene.ts        the 3d orbit
src/icons           logos simple-icons no longer ships
vite.config.ts      also builds the logo sprite
public/assets       logo and banner, copied from the app repo
design              approved mockups
DECISIONS.md        calls made along the way
```

All the text is real html, so it reads fine with no WebGL and no script.

Platform and agent logos come from [simple-icons](https://simpleicons.org). The list is at the top of `vite.config.ts` and the build puts them into the page as one svg sprite, so add a slug there to use a new one. If simple-icons doesn't have it, drop an svg with one path into `src/icons`.

## Full and lite mode

Full mode draws the hero orbit in WebGL. Three.js is its own chunk and only loads after the first paint, so the first load is the html, one css file, a small script and the fonts.

Lite mode is the same page with the hero cards as flat html that don't move. You get it when:

- you ask for reduced motion (nothing else animates either)
- WebGL is missing or only runs in software
- the GPU is on the weak list, the device reports under 4 GB of memory or 2 cores or fewer, or data saver is on
- full mode starts and the frame rate is bad, then it drops to lite on its own

There's a switch in the footer, and `?lite` or `?full` on the url forces one.

The canvas pixel ratio is capped at 2 and it stops drawing when the hero is off screen or the tab is hidden.

## Deploying

Pushing to `main` runs `.github/workflows/pages.yml`, which builds and deploys to GitHub Pages. Pages has to be set to "GitHub Actions" as the source in the repo settings. The base path `/TrendDeck-Web/` is set in `vite.config.ts`, change it there if the repo is renamed.

## License

MIT, see [LICENSE](LICENSE). Fonts are Inter and Inter Tight, bundled from `@fontsource` under the SIL Open Font License. The logos belong to their owners.
