# Apply the yashverma-dev update

This patch was prepared against:

```text
MeYashverma/yashverma-dev
main @ ab48df2 (2026-07-12)
```

## What it contains

- Repository hygiene cleanup: valid README, CHANGELOG, robots, sitemap, and llms files; removal of obsolete root-level uploads.
- A repaired public page-view counter that begins a new clean public bucket and counts no more than once per browser per day when local storage is available.
- A new Build Notes section, including mobile-menu, command-palette, and scroll-spy support.
- Canonical URL, Open Graph, Twitter card, JSON-LD Person metadata, and a 1200×630 social-share image.

## Apply

Put `yashverma-dev-updates.patch` beside a fresh clone of the repository, then run:

```bash
git checkout main
git pull --ff-only origin main
git apply --check ../yashverma-dev-updates.patch
git apply ../yashverma-dev-updates.patch
git status
git add -A
git commit -m "Improve repository hygiene, sharing metadata and build notes"
git push origin main
```

If the repository has changed since `ab48df2`, use the file list in the accompanying handoff and apply the edits manually instead of forcing the patch.

## Deployment check

After GitHub Pages finishes deploying:

1. Open `https://meyashverma.github.io/yashverma-dev/` in a private window.
2. Confirm the Build Notes section appears after Recently Shipped.
3. Confirm the page-view counter starts at a non-negative value. The counter intentionally uses a new `v2` public bucket, so it does not inherit the corrupted negative number.
4. Paste the URL into an Open Graph preview/debugger to refresh cached social cards.
5. Visit `https://meyashverma.github.io/yashverma-dev/robots.txt` and `/sitemap.xml`; both should now render as text, not images.
