# Yash Verma — Systems, Widgets & Weird Automation

[**Open the site →**](https://meyashverma.github.io/yashverma-dev/)

A deliberately overbuilt personal portfolio for **Yash Verma**: cloud and automation experiments, browser-native interfaces, real-time Discord widgets, digital art, and the occasional system that has no business running on free infrastructure but does.

![Yash Verma — Systems, Widgets & Weird Automation](assets/images/og-yash-verma.png)

## What is here

- **Selected Work** — Discord widgets, automation pipelines, and AetherOS.
- **Repo Radar** — a project section that edits itself: every public repo not already showcased renders automatically from the GitHub API (originals *and* working forks), de-duplicated against the curated cards via `data-repo` attributes.
- **Developer Pulse** — the GitHub contribution heatmap (live mirror + daily snapshot) with streaks computed client-side, plus WakaTime editor telemetry when wired.
- **Recently Shipped** — a small live GitHub activity feed.
- **Chroma Engine** — five runtime accent themes (dock at bottom-right, `T` key, or ⌘K), applied to the DOM, the WebGL background and the dot-matrix portrait alike. Konami code unlocks Overdrive mode.
- **Build Notes** — short field notes on constraints, fallbacks, interfaces, and free-tier trade-offs; intentionally not a formal blog.
- **Live cards** — public Discord presence and Last.fm listening data, with graceful fallbacks.
- **The Lab, Arts, Journey, Equipment, Game Worlds, and Off Screen** — the fuller personal archive behind the work.

## Stack

Static HTML, CSS, and vanilla JavaScript deployed on GitHub Pages.

- GSAP + ScrollTrigger + Lenis for interaction and motion
- WebGL/canvas visual treatments
- Public GitHub, Lanyard, Last.fm, and iTunes APIs for optional live data
- A GitHub Actions cron that bakes the repo snapshot (`assets/data/radar.json`) so live data survives API rate limits
- Local fonts and local vendor files; no build step or server required

## Run locally

Clone the repository and serve the project root with any static file server:

```bash
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080). The public page-view counter deliberately stays inactive in local preview mode.

## Project layout

```text
index.html                Page structure, content, metadata and structured data
assets/css/main.css       Site styles, responsive layouts and theme tokens
assets/js/main.js         Interaction, navigation and visual behaviour
assets/js/theme.js        Chroma Engine — themes, dock, overdrive, console egg
assets/js/radar.js        Repo Radar — self-updating GitHub project sync
assets/js/pulse.js        Developer Pulse — contribution heatmap + streaks
assets/js/wakatime.js     WakaTime editor telemetry (snapshot-driven)
assets/js/background.js   WebGL ambient shader field (theme-aware)
assets/js/live.js         Public Discord and music widgets
assets/js/activity.js     GitHub activity feed and public page-view counter
assets/data/*.json        Daily snapshots built by the data-sync Action
scripts/sync-*.mjs        Snapshot builders used by the Action (or by hand)
.github/workflows/data-sync.yml  Daily cron that rebuilds the snapshots
assets/images/            Local project, art, photo and social-sharing assets
robots.txt                Search-crawler policy
sitemap.xml               Canonical homepage sitemap
llms.txt                  Plain-language site summary for AI systems
CHANGES.md                Human-readable change log
```

## Editing the site

- Add a project in the **Selected Work** or **Lab** markup in `index.html` and give the card a `data-repo="<repo name>"` attribute; the Repo Radar will then skip it automatically.
- Do **not** hand-edit the Repo Radar section — it renders itself from GitHub. Publishing a repo is the edit.
- Add short, durable learnings to the **Build Notes** section in `index.html` rather than maintaining a separate blog system.
- Add a matching image under `assets/images/`; use descriptive alt text and explicit dimensions.
- New themes go in `assets/js/theme.js` (palette entry) plus a `:root[data-theme]` token block in `assets/css/main.css`.
- Update `sitemap.xml`, `CHANGES.md`, and the `lastmod` value when a significant public change ships.

## Wiring WakaTime

The WakaTime panel stays hidden until real data exists — visitors never see a broken widget. Two options, no API key ever touches the browser:

1. **GitHub Action (recommended)** — copy your API key from [wakatime.com/settings/api-key](https://wakatime.com/settings/api-key), add it as the `WAKATIME_API_KEY` repository secret (Settings → Secrets and variables → Actions). The daily `data-sync` workflow then bakes `assets/data/wakatime.json` automatically, and you can trigger it once manually from the Actions tab.
2. **No-key embeds** — paste public share SVG URLs from [wakatime.com/share](https://wakatime.com/share) into the `SHARE_EMBEDS` array at the top of `assets/js/wakatime.js` (optionally set `PROFILE_URL` there too).

## Privacy and third-party data

The live Discord and music cards use public, read-only endpoints and are designed to fall back gracefully when data is unavailable. The page-view number is a lightweight public counter—not a replacement for private analytics—and records at most one increment per browser per day where local storage is available.

Game artwork, artist imagery, logos, and other third-party marks remain the property of their respective owners and are used here only to identify personal interests, projects, or platforms.

---

Built from scratch by [Yash Verma](https://github.com/MeYashverma). No template, no VPS required.
