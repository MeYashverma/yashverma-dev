# Changelog

All notable public changes to this portfolio are recorded here. Dates use the Asia/Kolkata timezone.

## [Unreleased]

- Add case-study depth and a constraint-first systems status view.
- Continue improving responsive image delivery and low-power behaviour.

## [2026-09-17] — chroma engine, self-updating projects, new daily phone

- **Chroma Engine theme system** — the accent is now a runtime variable everywhere (DOM, WebGL field, dot-matrix portrait): five swappable themes (Acid, Ember, Aqua, Ultraviolet, Crimson) from a floating dock, the `T` key, or the ⌘K palette, persisted per browser with zero first-paint flash.
- **Overdrive mode** — Konami-code / dock / ⌘K easter egg that drops the site into CRT arcade styling for the session, plus a developer-console signature for the people who ask "how did you make this?".
- **Repo Radar section** — projects sync themselves: every public repo not already showcased renders automatically from the GitHub API (live first, cached locally, with a daily `assets/data/radar.json` snapshot rebuilt by a GitHub Action as the rate-limit-proof fallback). Featured cards declare themselves via `data-repo`, so promotion to Selected Work de-duplicates with no other edits.
- **Live stat** — the "Public repos" counter now tracks the real GitHub total instead of a hand-maintained number.
- **Equipment** — daily-carry phone updated to the OPPO K13 Turbo Pro 5G (Purple Phantom) with a purpose-rendered product shot; retired the Infinix Note 30 5G asset.
- **Theme-aware polish** — all 64 hard-coded accent RGBA usages converted to `--accent-rgb` tokens; custom theme-tinted scrollbar.
- Repository hygiene: removed an accidentally committed `git diff --stat` output file with a mangled name.

## [2026-07-17] — repository, discoverability, and notes

- Replaced accidentally uploaded binary files masquerading as `README.md`, `CHANGES.md`, `robots.txt`, `sitemap.xml`, and `llms.txt` with valid text files.
- Added a proper repository README with project purpose, local setup, architecture, editing guidance, and privacy notes.
- Added valid crawler policy and sitemap files.
- Added canonical, Open Graph, Twitter, and JSON-LD Person metadata plus a purpose-built social sharing image.
- Added **Build Notes**, a small field-notes section rather than a separate formal blog.
- Replaced the corrupted public page-view counter bucket with a fresh versioned bucket and limited increments to one per browser per day when local storage is available.
- Removed obsolete root-level scripts and image uploads that were not used by the deployed site.

## [2026-07-12] — portfolio expansion

- Added additional project, personal, equipment, game-world, and gallery material.
- Added the GTA VI countdown and refreshed the visual asset set.

## [2026-07-11] — GitHub Pages setup

- Added `.nojekyll` and published the static site through GitHub Pages.
