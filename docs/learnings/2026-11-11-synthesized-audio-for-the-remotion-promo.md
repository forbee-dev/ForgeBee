---
title: Synthesized audio for the Remotion promo video
author: Tiago Santos
date: 2026-11-11
touches:
  - promo/make-audio.js
  - promo/src/Promo.tsx
  - promo/package.json
---

## Decided
- `promo/make-audio.js` synthesizes all audio as WAV files in `promo/public/` (git-ignored). Plain Node, no dependencies, seeded, no music rights to clear.
- `npm run render` runs the script first. The background track is one `<Audio>` at the root. Each animation sound is an `<Sfx at=…>` next to the animation it belongs to, so the timing lives in one place.
- Rising pops reuse one `pop.wav` with `playbackRate`.

## Watch out
- The video is 735 frames (24.5 s). The music is 24 s, with the last chord at 20 s to match the CTA scene. Change `CHORDS` or `BAR` if scene lengths change.
- The mix was checked by loudness (max -5.5 dB) and waveform only. No one listened to it in that session.
- An earlier learning says the video is 24 s. The correct length is 24.5 s.
