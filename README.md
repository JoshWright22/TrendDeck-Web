![TrendDeck](public/assets/banner.png)

# TrendDeck-Web

The landing site for [TrendDeck](https://github.com/JoshWright22/TrendDeck), the open source marketing desktop for creators.

The page goes top to bottom like this:

1. Hero. The headline and the download button, with playing cards floating round it that carry the platform and agent logos. They bob slowly and lean toward the cursor.
2. A mock of the app window, dealt onto the felt as one big card.
3. The "dealt a hand" story. A dealer deals six cards as you scroll and each one flips over to show a feature you can poke at: brands, every account at once, trends, chat, posting, and the smaller stuff.
4. "Bring your own sub", a card for each agent with its login command.
5. Two feature sections, site tabs and local data.
6. "Don't like something? Fork it." with the run from source steps.

Colors, type, cards, sparks and motion all follow the app's [brand guide](https://github.com/JoshWright22/TrendDeck/blob/main/docs/BRAND.md).

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
index.html          all the copy and every card, as plain html
src/style.css       the whole look, plus the css card deal used in lite mode
src/main.ts         picks the mode, deals cards as they scroll into view, step dots
src/mode.ts         full or lite
src/hero.ts         the spring tilt on the floating hero cards
src/features.ts     the small interaction on each story card
src/scene.ts        the 3d table: the flying story cards
vite.config.ts      also builds the logo sprite
public/assets       logo and banner, copied from the app repo
DECISIONS.md        calls made along the way
```

All the text is real html, so it reads fine with no WebGL and no script.

Platform and agent logos come from [simple-icons](https://simpleicons.org). The list is at the top of `vite.config.ts` and the build puts them into the page as one svg sprite, so add a slug there to use a new one.

## Full and lite mode

Full mode draws the dealt story cards in WebGL. Three.js is its own chunk and only loads after the first paint, so the first load is the html, one css file, a small script and the fonts.

Lite mode has the same content with css 3D cards and no WebGL, and the hero cards don't bob. You get it when:

- you ask for reduced motion (cards also stop animating)
- WebGL is missing or only runs in software
- the GPU is on the weak list, the device reports under 4 GB of memory or 2 cores or fewer, or data saver is on
- full mode starts and the frame rate is bad, then it drops to lite on its own

There's a switch in the footer, and `?lite` or `?full` on the url forces one.

The canvas pixel ratio is capped at 2 and it only draws while something is moving.

## Deploying

Pushing to `main` runs `.github/workflows/pages.yml`, which builds and deploys to GitHub Pages. Pages has to be set to "GitHub Actions" as the source in the repo settings. The base path `/TrendDeck-Web/` is set in `vite.config.ts`, change it there if the repo is renamed.

## License

MIT, see [LICENSE](LICENSE). Fonts are Inter and Inter Tight, bundled from `@fontsource` under the SIL Open Font License. The logos belong to their owners.
