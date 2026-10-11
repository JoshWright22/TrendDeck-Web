# Decisions

Calls made while reworking the page, so they are easy to undo.

- The download pill goes to the GitHub releases page. The app has no installer yet so that page may be empty. The fork section still has the run from source steps.
- The hero's 3D logo hand is gone. The floating cards took its spot and two things moving behind the headline was too much. The logo is still in the top bar and footer. WebGL now only draws the dealt story cards.
- Floating hero cards are html and css, not WebGL. They work the same in lite mode and cost no extra download.
- The floating cards bob forever, which the brand guide says only the glow should do. The bob is slow, pauses when the hero is off screen, and is off in lite mode and with reduced motion.
- Logos are white on dark cards, not their own brand colors, and one card is teal. The brand guide wants accents kept small.
- simple-icons has no logo for Codex, Grok Build or Antigravity. Codex and Grok Build get lettered cards and Antigravity uses the Google mark.
- Logos are put into index.html as an svg sprite at build time by a small plugin in vite.config.ts. No icon script ships to the browser.
- The app screenshot is an html mock with made up brands and trends. The line under it says so, and says Trends and chat are still being built.
- Trends, Chat and Posting keep their "Coming next" tags in the story since the app doesn't have them yet.
- Antigravity has no login command in the app readme, so its card says "sign in with Google".
- The two feature sections are site tabs and local data. Both are in the app now and the story cards don't cover them.
- Deals are 330 ms and flips 400 ms now to match the brand guide. They were 430 and 500.
- Step dots and the deck only show while the story is on screen.
- On phones the floating cards sit in a row above and a row under the headline so they never cover the text.
- Logo paths in index.html are /assets/... now. With %BASE_URL% the dev server doubled the base path and the logo was broken in npm run dev.
- Added @types/node so the type check passes on vite.config.ts reading the icon files.
