# Decisions

Calls made while rebuilding the page, so they are easy to undo.

## Hero

- The logo is drawn inside the WebGL scene in full mode, not as an html image over it. Cards have to pass both behind and in front of it, and one canvas can't sit on both sides of an image.
- Until the 3D orbit is ready the hero shows the same cards as flat html, placed with the same math. Lite mode and reduced motion keep those and nothing orbits. The swap waits for the deal animation to finish.
- The inner ring has ten logos, one card each. The outer ring has the other eight twice, always on opposite sides. That is how the front never repeats a logo: one copy is in front while its twin is behind.
- Inner: YouTube, TikTok, Claude, Gemini, Instagram, X, OpenAI, Facebook, Reddit, Discord. Outer: Bluesky, Snapchat, Threads, Pinterest, LinkedIn, Google, Ollama, Twitch.
- The blur on the cards behind is a smaller mipmap, not a real blur pass. It costs nothing per frame.
- simple-icons dropped LinkedIn and OpenAI. Their svgs in `src/icons` come from an older simple-icons release.
- The mouse lean is mouse only. Phones get the orbit with no lean.
- On tall screens the ring tips up steeper so the orbit isn't a thin strip.
- No glow pulse. The orbit is the only thing that keeps moving.
- Logo and banner in `public/assets` were copied again from the app repo since both changed there.

## Features

- Eight cards in three columns, four of them two wide, so every row is full. The mockup had a hole in row two.
- Glyphs and colors follow the mockup where it shows them. Ad blocker is YouTube on pink, not the Google mark, since Google is a teal card in the hero. Phone emulator is Snapchat on yellow, Fast on slow laptops is Bluesky on indigo.
- No "coming soon" chips on feature cards (Josh 10/11).
- Two columns under 860 px, one under 600 px.

## Agents

- simple-icons has no mark for Codex, Grok Build or Antigravity. They use the OpenAI, X and Google marks.
- Antigravity has no login command in the app readme, so its card says "sign in with Google". "Any CLI or API" points at Settings > Agents.
- Card colors here are picked for balance in the grid, not from each logo's own color.
- Two columns on phones, with the ninth card taking the last row.

## Download

- The pill goes to the app's latest release on GitHub. The app readme says there's no installer yet, so that link may land on an empty page until one is published.
- The terminal card has the run from source steps from the app readme.

## Other

- Fonts are the latin subsets of Inter 400 and 500 and Inter Tight 800. Commands use the system mono font, so nothing extra downloads.
- Springy easing uses css `linear()` where it exists and an overshoot bezier elsewhere.
- The footer keeps the lite mode switch. It is hidden when there's nothing to switch to (no WebGL, or reduced motion).
