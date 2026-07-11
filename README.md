# yashverma.dev

Personal portfolio — plain HTML/CSS/JS, no build step, no framework, no
external runtime dependencies (fonts and JS libraries are vendored locally
so it works fully offline and loads fast).

## Stack

- **Structure**: single `index.html`, semantic sections (`hero`, `stats`,
  `work`, `lab`, `arts`, `about`, `contact`).
- **Motion**: [GSAP](https://gsap.com) + ScrollTrigger for reveals/parallax,
  [Lenis](https://github.com/darkroomengineering/lenis) for smooth scroll.
  All vendored in `assets/js/vendor/` — no CDN calls at runtime.
- **Background**: a hand-written WebGL fragment shader
  (`assets/js/background.js`, raw [Three.js](https://threejs.org)) — a
  slow-moving domain-warped noise field that reacts to pointer position and
  scroll depth. Falls back to a static CSS gradient if WebGL isn't
  available, so the page is never broken by it.
- **Type**: Space Grotesk (display), Inter (body), JetBrains Mono (labels/UI
  chrome) — self-hosted `.woff` files in `assets/fonts/`.
- **Live data**: a "right now" strip (`assets/js/live.js`) pulls real-time
  Discord presence from the public [Lanyard](https://lanyard.rest) API and
  "now playing" / "last played" from the [Last.fm](https://www.last.fm/api)
  API — both public, read-only, CORS-enabled endpoints called directly from
  the browser (no backend, no proxy). Priority order: Last.fm "now playing"
  → Discord's own Spotify presence (via Lanyard) → Last.fm's most recent
  scrobble labelled "last played" → a static "nothing playing" fallback if
  both APIs are unreachable. Polls every 30s.
- **No backend, no CMS.** Content lives directly in `index.html`.

## Structure

```
index.html
assets/
  css/main.css        — all styling, one file, custom-property driven
  js/
    main.js            — cursor, nav, reveals, lab filters, misc UI wiring
    background.js       — the WebGL shader background
    live.js              — Discord presence + now-playing widgets (Lanyard + Last.fm)
    vendor/             — gsap, ScrollTrigger, three.js, lenis (vendored)
  fonts/                — self-hosted woff files + fonts-local.css
  images/
    avatar.jpg           — profile photo
    projects/            — project preview screenshots
    arts/                — digital art gallery pieces (11 real pieces)
    whatilike/           — "favourites" imagery used in the About section
```

## Editing content

Everything is hand-authored in `index.html` — no templating. To add a
project to **Selected Work**, copy a `.work-item` block; to add something to
**The Lab**, copy a `.lab-card` block and set its `data-cat` to one of
`widget` / `cloud` / `web` / `misc` so the filter buttons pick it up. To add
an art piece, copy an `.arts-card` figure block inside `#artsGrid` (add
`arts-card--tall` or `arts-card--wide` modifiers for grid variety) — the
lightbox click-to-zoom wiring in `main.js` picks up any `.arts-card`
automatically, no extra JS needed.

To point the **Live** strip at different accounts, edit the constants at the
top of `assets/js/live.js`:

```js
var DISCORD_USER_ID = '848100520509308989'; // Lanyard needs this
var LASTFM_USER = 'The_Berlin';
var LASTFM_API_KEY = 'c928f4b7b51bd314bc09ec438eaf85ec'; // free, get one at last.fm/api/account/create
```

Note: Lanyard only reports presence for Discord users who have joined the
[Lanyard Discord server](https://discord.gg/lanyard) — without that, the
Discord card will always show as unavailable/offline regardless of the code.

## Local preview

No build step needed — any static file server works:

```bash
python3 -m http.server 8000
# or
npx serve .
```

## Deploying

Static files only — works as-is on GitHub Pages, Netlify, Vercel, or any
static host. For GitHub Pages: enable Pages on this repo pointed at the
`main` branch root.

## Performance / accessibility notes

- Respects `prefers-reduced-motion`: disables the shader's time-based motion
  and Lenis smooth scroll when set.
- Custom cursor and hover-follow previews are disabled entirely on
  touch/no-hover devices — mobile gets normal native scrolling and tap
  targets, not a crippled desktop experience.
- All vendored JS/fonts mean zero third-party requests at runtime (no
  Google Fonts CDN, no jsDelivr/cdnjs calls) — faster load, and nothing
  breaks if a CDN has a bad day.
