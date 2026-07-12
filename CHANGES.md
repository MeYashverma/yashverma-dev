# yashverma.dev — change log

This file records the major portfolio passes now present in the static site.
The version names correspond to the labelled blocks in `main.css`; they are
not npm/package releases.

Last consolidated: **12 July 2026**

---

## v11 — unified game shelves, playable Sunflower, GTA VI countdown

### Game collection

- Converted **Currently Playing / Games in Rotation** and **Want to Play** to
  the same physical-shelf layout as **Games I Like**.
- Standardized desktop and mobile cover dimensions to prevent intrinsic image
  heights from stretching covers down the page.
- Added shelf-specific treatments:
  - lime live indicator for games in rotation;
  - subdued-to-colour artwork for wishlist titles;
  - double-cover treatment for The Last of Us Part I & II.
- Expanded the artwork viewer to include all three shelves.
- Viewer supports previous/next buttons, arrow keys, Escape, click-outside,
  keyboard activation, focus restoration, and touch swiping.

### Sunflower player

- Replaced the favourite-song link-only card with a stable custom player.
- Resolves a legal 30-second preview from the iTunes Search API.
- Added play/pause state, elapsed time, progress line, and spinning vinyl.
- Retained a separate Spotify link for the full song.
- No copyrighted song file is stored in the repository.

### Grand Theft Auto VI

- Added self-hosted official hero and cover artwork.
- Added a live days/hours/minutes/seconds countdown.
- Target date: **19 November 2026**.
- Added PS5 / Xbox Series X|S labels and an official Rockstar link.
- Countdown collapses into a mobile-first single-column composition.

**Files:**

```text
MOD  index.html
MOD  assets/css/main.css
MOD  assets/js/main.js
NEW  assets/images/games/gta-6-cover.webp
NEW  assets/images/games/gta-6-hero.webp
```

---

## v10 — game artwork viewer, equipment polish, mobile About fix

- Fixed stretched Games I Like covers by enforcing explicit display sizes.
- Made each game cover keyboard-focusable and clickable.
- Added full-screen game artwork viewer with keyboard and touch navigation.
- Reworked the equipment area into a more consistent specification surface.
- Improved laptop image treatment, CPU/GPU/RAM rows, companion-device imagery,
  and software rack spacing.
- Fixed the main mobile About overflow: the desktop
  `grid-template-columns: 1fr 1.4fr !important` rule was overriding the old
  mobile rule and pushing About copy outside the viewport.
- Forced portrait, map, About copy, live age, Right Now, skills, favourites,
  and Personal Ops into one mobile column.

---

## v9 — equipment, software, curated games, useful Discord

### Discord

- Removed low-value public fields from the visible card:
  - raw Discord snowflake;
  - collectible nameplate;
  - refresh cadence;
  - inactive client matrix.
- Replaced them with a minimal, full-height presence focus:
  - status and custom status;
  - current game/stream/media/Spotify activity;
  - active clients only;
  - public activity count;
  - member-since date;
  - rich game/application artwork when available.

### Equipment and software

- Added HP EliteBook 8 G1a specification card:
  - AMD Ryzen 5 PRO 230;
  - Radeon 760M Graphics;
  - 16 GB RAM.
- Added Infinix Note 30 5G and Redmi Watch Move.
- Added software rack for Windows, Visual Studio Code, Git/GitHub, Python,
  Node.js, and IbisPaint X.
- Added self-hosted product images and software logos.

### Curated game worlds

- Added Forza Horizon 6 favourite-game feature.
- Added Games I Like shelf.
- Added games-in-rotation collection.
- Added Want to Play collection.
- Added locally stored identification artwork for every listed title.
- Avoided a generic Steam-library grid in favour of shelves, rotation rows,
  and bookmark language.

### Mobile

- Restored the live dot-matrix portrait on mobile.
- Mobile portrait now uses fewer cells, lower DPR, lower FPS, and no pointer
  listeners while retaining the same visual technique.
- Added stronger width containment across grids/cards at 760px and 390px.

---

## v8 — detailed education and career journey

- Expanded the Journey section with:
  - Classes 0–5 school in Churu;
  - Classes 6–12 school in Churu;
  - Class X RBSE result: 80.83% (2019–20);
  - Class XII RBSE result: 70.60% (2021–22);
  - HCLTech internship in 2022;
  - HCLTech full-time role from 2023 to present;
  - B.Sc. Design & Computing at BITS Pilani, 2022–2029 expected.
- Added direct school-listing links.
- Added internship → FTE transition visual and degree completion marker.
- Added a separately labelled **zero-cost systems lab** track.
- Kept self-directed experiments explicitly separate from employment,
  education, and formal credentials.

---

## v7 — Recently Shipped, page views, mobile/performance pass

### Automatic activity

- Added GitHub-based Recently Shipped feed.
- Pulls public events and recent commit messages across active repositories.
- Uses a 30-minute local cache and event-only fallback on data-saver sessions.
- Added persistent public page-view counter.
- Counter increments only on production hostnames; local preview does not
  inflate the value.

### Mobile/performance

- Added `performance.js` to conditionally load Three.js/background shader only
  on capable desktop devices.
- Kept native touch scrolling; Lenis became desktop-only.
- Shortened the mobile/repeat-visit preloader.
- Added mobile WebP variants for personal photography.
- Deferred alternate gallery frames on constrained devices.
- Converted major map, portrait, badge, project, and favourite assets to
  smaller WebP versions.
- Added intrinsic image dimensions and async decoding.
- Removed injected Cloudflare challenge scripts and restored direct `mailto:`
  links when they appeared in exported HTML.

**New runtime files:**

```text
assets/js/activity.js
assets/js/performance.js
```

---

## v6 — live age and denser Discord profile

- Added live age clock based on 8 January 2005 in Asia/Kolkata.
- Shows completed years, days since birthday, HH:MM:SS, and total days lived.
- Added Discord avatar decoration, public badge, guild identity, account age,
  active platform detail, and richer activity handling.
- Later simplified in v9 to retain only visitor-useful fields.

---

## v5 — requested layout and live-widget fixes

- Matched Iron Man and Interstellar favourite-card layouts to the tall cards.
- Implemented iTunes fallback for Recently Played artwork.
- Removed tilt from Discord and Now Playing so nested links remain stationary.
- Added BITS Pilani and HCLTech logos to the hero availability line.
- Added local monochrome Delhi map with OpenStreetMap attribution.
- Added initial richer Discord profile data.

---

## v4 — command palette and navigation utilities

- Added `Cmd/Ctrl + K` command palette.
- Added section/external-link manifest and keyboard navigation.
- Added terminal-style scroll spy and palette discoverability hint.
- Added arts focus mode and additional contact/social polish.

---

## v3 — hero portrait, calmer gallery, Google Cloud Skills

- Added two-column hero and live canvas dot-matrix portrait.
- Removed automatic About portrait cycling and excessive HUD/glitch chrome.
- Calmed gallery cross-fades and paused them off-screen/on hover.
- Added Google Cloud Skills Gold League module and self-hosted badge marquee.
- Corrected KK’s Spotify artist URL.

---

## Current primary files

```text
index.html                    # all semantic content
assets/css/main.css           # complete visual system + responsive passes
assets/js/main.js             # interaction/UI layer
assets/js/live.js             # Discord + music data
assets/js/activity.js         # GitHub feed + page views
assets/js/performance.js      # conditional visual loader
assets/js/background.js       # desktop WebGL shader
```

## Current external runtime services

```text
Lanyard                  Discord public presence
Last.fm                  recent tracks and listening statistics
iTunes Search API        album-art fallback and Sunflower preview
GitHub public API        Recently Shipped feed
Public Count API         production page views
OpenStreetMap            map attribution/data source
Spotify                  outbound full-song/profile links
```

All core HTML, CSS, fonts, JavaScript libraries, photographs, project
screenshots, game-identification artwork, equipment imagery, and UI assets are
stored locally in the repository.
