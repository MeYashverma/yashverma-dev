# yashverma.dev — v3 changes

Layered on top of the previous v2 upgrade. Still one static site, no build tools.

---

## 1. Hero — live canvas dot-matrix portrait (right side)

**File:** `assets/js/main.js` (`initHeroPortrait()`), `assets/css/main.css` (`.hero__grid`, `.hero__portrait`).

Split the hero into a two-column layout: the "I build systems that shouldn't exist on free infra." block on the left, and on the **right** an interactive live-rendered portrait of you.

**How it works (real technique, not just a static image):**
- Your `assets/images/real/portrait-hero.jpg` is drawn into a hidden off-screen `<canvas>` sized to a grid (`GRID = 10px`).
- Per-cell luminance is sampled with `getImageData()` and stored in a `Float32Array`.
- Every frame, the main visible canvas paints a lime dot at each grid cell — **larger and brighter dots for darker source pixels**.
- Subtle idle "breathing" via `Math.sin(elapsed * 0.9) * 0.012` — max ±1.2% scale, so it never feels twitchy.
- **Mouse push:** hovering the portrait applies a radial force — dots grow slightly and shift *away* from the pointer like a soft magnetic field. Fades with distance, no click required.
- Fully responsive: recomputes cols/rows/sampling on `resize`. Respects `prefers-reduced-motion` (skips the breathe animation).

No labels, no HUD, no captions — it's just an image, rendered a different way.

---

## 2. About portrait — junky chrome removed

**File:** `assets/css/main.css`, `assets/js/main.js`.

Removed everything that was making the About portrait feel like "a beginner made it":

- ❌ scanning-line sweep
- ❌ blinking HUD corner brackets
- ❌ green HUD readout bars
- ❌ animated CRT noise / grid overlays
- ❌ glitch flash on mode swap
- ❌ tilted "YV/01" corner monogram
- ❌ auto-cycle through modes (no more automatic swap)
- ❌ animated pulsing underline on section headings

What's left is a calm frame with the halftone / ASCII / photo layers cross-fading only when you click one of three tabs (`Halftone · ASCII · Photo`). One quiet 6s breathe (±0.8% scale) instead of the old busy set.

---

## 3. Gallery — no more labels, silent swap

**Files:** `index.html`, `assets/css/main.css`, `assets/js/main.js`.

Removed the `6 SHOTS · ANIMATED` badge chip and the always-visible caption bars from every gallery card. The pose-swap animations still play — they're now **completely silent**:

- Cross-fade duration bumped from 0.9s to **1.4s** for a slower, calmer feel.
- Cycle cadence extended to **4.5–6.8s per card**, staggered so cards never flip in lockstep.
- Auto-pauses when the card is off-screen (`IntersectionObserver`) so nothing runs unless you can actually see it.
- Auto-pauses on hover so you can study a still.
- Captions only fade in on hover, if a card has one at all (most no longer do).

Result: the gallery reads as one cohesive photo wall, not "look, look, animations!".

---

## 4. Google Cloud Skills integration

**Files:** `index.html`, `assets/images/gcp-badges/*.png`, `assets/css/main.css`.

Pulled your public profile from `skills.google/public_profiles/a8a49bbd-…` and integrated it as a first-class About-section module:

- **Header:** Google G logo · `GOOGLE CLOUD SKILLS` eyebrow · `Gold League · 5,463 pts` (points in lime accent).
- **Stat row:** `30+ Skill badges earned` · `2025–26 Active member` · `GenAI · MLOps · DevOps Focus areas`.
- **Badge marquee:** 15 real Skill Badge / Arcade PNGs from qwiklabs CDN, downloaded and self-hosted (`assets/images/gcp-badges/`). Continuously scrolls right-to-left in a masked track, pauses on hover, and each badge lifts on hover.
  - Includes: *Create Your First Gemini Enterprise Application*, *MLOps for Generative AI*, *Multimodal Vector Search with BigQuery*, *Event-Driven Applications with Eventarc*, *Level 1/2/3 Arcade*, *DevOps Workflows*, *App Engine 3 Ways*, *Knowledge Catalog*, *Cloud Storage & Data Protection*, *Speech / Language APIs*, *Cloud Collaboration*.
- **Deep link:** `View full Google Cloud Skills profile ↗` to the same public URL.

Placed right under the About-section skills grid and above the "A few things I'm genuinely into" block, so credentials sit next to the tech chips.

---

## 5. KK Spotify URL corrected

Was: `open.spotify.com/artist/499FbBl4hL4iaXSLSKcNSc` (wrong artist).
Now: `open.spotify.com/artist/4fEkbug6kZzzJ8eYX6Kbbp` (KK — Krishnakumar Kunnath).

---

## Files touched this pass

```
NEW  assets/images/gcp-badges/*.png              # 15 real Google Cloud badges
MOD  index.html                                  # hero 2-col + gcloud + gallery scrub + KK URL
MOD  assets/css/main.css                         # hero canvas frame + gcloud + toned-down animations
MOD  assets/js/main.js                           # initHeroPortrait() + calmer swap + kill auto-cycle
```
