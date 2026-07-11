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
- **No backend, no CMS.** Content lives directly in `index.html`.

## Structure

```
index.html
assets/
  css/main.css        — all styling, one file, custom-property driven
  js/
    main.js            — cursor, nav, reveals, lab filters, misc UI wiring
    background.js       — the WebGL shader background
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
