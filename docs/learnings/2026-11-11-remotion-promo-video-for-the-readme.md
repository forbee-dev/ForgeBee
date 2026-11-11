---
title: Remotion promo video for the README and social posts
author: Tiago Santos
date: 2026-11-11
touches:
  - promo/src/Promo.tsx
  - promo/package.json
  - README.md
  - docs/assets/forgebee-promo.gif
---

## Decided
- The video source lives in `promo/`, a separate npm package. The plugin keeps zero dependencies.
- `npm run render` in `promo/` writes the MP4 to `promo/out/` (git-ignored) and the GIF to `docs/assets/forgebee-promo.gif` (referenced by README.md).
- One 1920x1080 composition, 30 fps, 24 s, no audio. The GIF uses `--scale=0.5 --every-nth-frame=2` and is 4.4 MB.
- No tsconfig and no `@types/react`. The Remotion bundler compiles the TSX without them.

## Tried and ruled out
- Command box at width 1500: the `/team` line wraps. Width 1600 holds it on one line.

## Watch out
- The counts (agents, commands, skills, hooks) are hard-coded in `STATS` in `promo/src/Promo.tsx`. Update them with the README badges, then render again.
- The logo is a placeholder hexagon. The repository has no brand assets.
- The fonts are macOS system fonts. A render on another OS looks different.
- Remotion needs a paid company license above three employees.
