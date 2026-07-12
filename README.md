# yashverma.dev

A single-page personal portfolio for Yash Verma, built with plain HTML, CSS,
and JavaScript. There is no framework, package manager, bundler, CMS, or
build command: the repository can be served directly by GitHub Pages or any
static host.

The site combines engineering work, live public data, education and career
history, artwork, personal photography, equipment, music, and a curated games
collection.

## Current feature set

### Hero and navigation

- Terminal-style boot sequence with a shorter path for touch devices and
  repeat visits.
- Interactive canvas dot-matrix portrait generated from a local source image.
- Lower-resolution and lower-frame-rate portrait rendering on mobile rather
  than replacing the effect with a normal photograph.
- BITS Pilani and HCLTech affiliation marks.
- Fixed navigation, full-screen mobile menu, command palette (`Cmd/Ctrl + K`),
  and terminal-style scroll spy.

### Live data

- Discord presence through the public Lanyard API.
- Minimal Discord card focused on useful data: status, custom status, current
  game/media activity, active clients, public activity count, member-since
  date, and rich application artwork when available.
- Last.fm now-playing/last-played widget with Discord Spotify fallback.
- Album-art fallback chain: Last.fm → iTunes Search API → local vinyl artwork.
- Recently played history, total scrobbles, unique artists, weekly top artist,
  and weekly top album.
- Automatic “Recently Shipped” feed from public GitHub events and commit data,
  cached in local storage for 30 minutes.
- Persistent public page-view counter that increments only on production
  hostnames; local previews remain read-only.

### Work and experiments

- Selected Work section with live screenshots and repository/demo links.
- Filterable Lab section for widgets, cloud experiments, web projects, and
  miscellaneous builds.
- Real project metadata, technology tags, and live-state indicators.

### Art, journey, and personal sections

- Filterable digital-art gallery with keyboard-accessible lightbox.
- Detailed Experience & Education timeline covering school, RBSE results,
  HCLTech internship/FTE progression, and B.Sc. Design & Computing at BITS
  Pilani.
- Clearly separated zero-cost systems-lab track for self-directed experiments;
  these are not presented as formal credentials.
- Live age clock calculated from 8 January 2005 in the Asia/Kolkata timezone.
- Interactive About portrait with Halftone, ASCII, and Photo modes.
- Local monochrome Delhi map with OpenStreetMap attribution.
- Google Cloud Skills strip with self-hosted badge artwork.
- Personal interests and photography gallery.

### Equipment, software, music, and games

- Equipment specification section for the HP EliteBook 8 G1a, Infinix Note 30
  5G, and Redmi Watch Move.
- Working software rack for Windows, Visual Studio Code, Git/GitHub, Python,
  Node.js, and IbisPaint X.
- Playable 30-second Sunflower preview resolved through the iTunes Search API,
  plus a link to the full track on Spotify. No song audio is stored in this
  repository.
- Curated game shelves for Games I Like, Games in Rotation, and Want to Play.
- Every shelf cover opens in a full-screen viewer with keyboard, button, and
  mobile-swipe navigation.
- Grand Theft Auto VI countdown targeting the announced 19 November 2026
  console release, using locally stored official artwork.

## Technology

- **Markup:** semantic `index.html`
- **Styling:** `assets/css/main.css` with custom properties and responsive
  breakpoints
- **Interaction:** vanilla JavaScript
- **Animation:** vendored GSAP and ScrollTrigger
- **Smooth scrolling:** vendored Lenis on supported desktop environments;
  touch browsers use native scrolling
- **Background:** Three.js fragment shader, loaded conditionally on capable
  desktop devices
- **Typography:** self-hosted Space Grotesk, Inter, and JetBrains Mono
- **Hosting:** static files only

No third-party JavaScript or CSS is loaded from a CDN. Live widgets do make
network requests to public data/audio services.

## Page structure

The major sections currently appear in this order:

```text
Hero
Quick stats + real page views
Live Discord and music
Recently Shipped
Selected Work
The Lab
Digital Arts
Experience & Education
About Me + live age + interests
Google Cloud Skills
Equipment & Working Stack
Curated Game Worlds + GTA VI countdown
Off Screen photography
Contact
```

## Repository structure

```text
index.html
assets/
  css/
    main.css                  # all site styles and responsive rules
  fonts/                      # self-hosted WOFF font files
  js/
    main.js                   # boot, navigation, reveals, lightboxes, age,
                              # game viewer, Sunflower player, GTA countdown
    live.js                   # Lanyard, Last.fm, Spotify, iTunes art fallback
    activity.js               # GitHub feed and public page-view counter
    performance.js            # conditional Three.js/background loader
    background.js             # WebGL fragment shader
    vendor/                   # GSAP, ScrollTrigger, Lenis, Three.js
  images/
    arts/                     # digital artwork
    brand/                    # BITS Pilani and HCLTech marks
    equipment/                # laptop, phone, and watch product imagery
    favs/                     # favourite singer/song/software artwork
    games/                    # locally stored game identification artwork
    gcp-badges/               # Google Cloud Skills artwork
    maps/                     # Delhi map assets
    real/                     # personal photography
      mobile/                 # reduced-size responsive WebP variants
    software/                 # software/tool logos
    whatilike/                # film, series, game, nature, and gear imagery
    widgets/                  # real project screenshots
```

## Live-data configuration

### Discord and music

Edit the constants near the top of `assets/js/live.js`:

```js
var DISCORD_USER_ID = '848100520509308989';
var LASTFM_USER = 'The_Berlin';
var LASTFM_API_KEY = 'c928f4b7b51bd314bc09ec438eaf85ec';
```

Lanyard reports presence only for users registered with the Lanyard service.
The Last.fm key is public client-side configuration; do not place private
credentials in this repository.

### Recently Shipped and visitor counter

Edit `assets/js/activity.js`:

```js
var GITHUB_USER = 'MeYashverma';
var VISITOR_KEY = 'yashverma_dev_portfolio_pageviews_v1';
```

The visitor counter currently increments only when the hostname is one of:

```text
yashverma.dev
www.yashverma.dev
meyashverma.github.io
```

Update the production-host check in `loadVisitorCounter()` if deployment moves
to another domain.

## Editing content

The site is hand-authored; there is no data layer or template compiler.

- Add work by copying a `.work-card` in `#workList`.
- Add a lab item by copying `.lab-card` and setting `data-cat`.
- Add artwork by copying `.arts-card` inside `#artsGrid`.
- Update journey entries in the `#journey` section.
- Update equipment in `#equipment`.
- Update game shelves in `#games`; any `.game-shelf__item` is automatically
  picked up by the game artwork viewer.
- Update the GTA VI target in `initGtaCountdown()` if the official date changes.

## Local preview

Use a static server rather than opening `index.html` directly:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

or:

```bash
npx serve .
```

Local behavior differs slightly from production:

- The page-view counter stays in preview mode and does not increment.
- GitHub, Last.fm, Lanyard, iTunes artwork, and the Sunflower preview require an
  internet connection.
- The in-app file preview used by some editors may block external API/audio
  requests even though the deployed site works normally.

## Deployment

For GitHub Pages, publish the repository root from the `main` branch. No build
workflow is required.

```bash
git add .
git commit -m "Update portfolio"
git push
```

The same directory can also be deployed to Netlify, Vercel, Cloudflare Pages,
or any basic static web server.

## Mobile and performance behavior

- Three.js and the full WebGL background are not downloaded on compact,
  low-memory, or data-saver devices.
- The hero dot-matrix portrait remains active on mobile with a coarser grid,
  reduced pixel ratio, and reduced frame rate.
- Lenis is desktop-only; touch browsers retain native scrolling.
- Personal photography uses responsive mobile WebP variants.
- Alternate gallery frames are deferred on constrained mobile sessions.
- Game, equipment, badge, map, and portrait assets use compressed local
  formats.
- Images include intrinsic dimensions and asynchronous decoding to reduce
  layout shifts.
- Animations respect `prefers-reduced-motion` where applicable.
- Cards and grids explicitly collapse to a single visible column on mobile;
  horizontal scrolling is limited to intentional shelves/marquees.

## Accessibility

- Semantic sections and headings.
- Keyboard-accessible command palette, art lightbox, and game artwork viewer.
- Escape/arrow-key support for overlays.
- Visible focus styles on interactive game covers.
- Touch targets and safe-area padding for mobile browsers.
- Reduced-motion support and native touch scrolling.
- Descriptive alternative text for meaningful images; decorative imagery is
  hidden from assistive technology.

## External data and artwork

- Discord presence: Lanyard
- Music history: Last.fm
- Artwork/song previews: Apple iTunes Search API
- Shipping activity: GitHub public API
- Page views: public Count API endpoint
- Map data: OpenStreetMap contributors
- Game artwork remains the property of the respective publishers and is stored
  only to identify titles in a personal collection.

## License and reuse

The code can be studied or adapted, but personal photographs, artwork, logos,
profile data, and third-party game/media artwork retain their respective
rights. Replace personal and branded assets before reusing the site as another
portfolio.
