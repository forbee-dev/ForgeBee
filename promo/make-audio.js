// Synthesizes the promo audio into public/: one background track and the animation sounds.
// Synthesized, not sampled, so there are no music rights to clear.
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const SR = 44100;
const OUT = path.join(__dirname, 'public');
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const track = (sec) => new Float32Array(Math.round(sec * SR));

// Seeded, so each run writes the same files.
let seed = 42;
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const pluck = (amp, tau, attack = 0.005) => (t) => amp * Math.min(1, t / attack) * Math.exp(-t / tau);
const swell = (amp, dur, edge) => (t) => amp * Math.max(0, Math.min(1, t / edge, (dur - t) / edge));

// freq is Hz, or a function of t for a pitch sweep. partials are [multiple, gain] pairs.
function note(out, start, dur, freq, env, partials = [[1, 1]]) {
  const from = Math.round(start * SR);
  const n = Math.min(Math.round(dur * SR), out.length - from);
  const f = typeof freq === 'function' ? freq : () => freq;
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    phase += (2 * Math.PI * f(t)) / SR;
    let s = 0;
    for (const [mult, gain] of partials) s += gain * Math.sin(phase * mult);
    // The 10 ms release stops a click at the end of the note.
    out[from + i] += s * env(t) * Math.min(1, (dur - t) / 0.01);
  }
}

function save(name, out, peak) {
  let max = 0;
  for (const s of out) max = Math.max(max, Math.abs(s));
  assert(max > 0 && Number.isFinite(max), `${name} is silent or invalid`);
  const wav = Buffer.alloc(44 + out.length * 2);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + out.length * 2, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20); // PCM
  wav.writeUInt16LE(1, 22); // mono
  wav.writeUInt32LE(SR, 24);
  wav.writeUInt32LE(SR * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(out.length * 2, 40);
  // Scaling to `peak` also makes clipping impossible.
  out.forEach((s, i) => wav.writeInt16LE(Math.round((s / max) * peak * 32767), 44 + i * 2));
  fs.writeFileSync(path.join(OUT, name), wav);
}

fs.mkdirSync(OUT, {recursive: true});

// Background track: 24 s, six 4 s chords [bass, pad notes]. The last chord (C) starts with the CTA scene.
const CHORDS = [
  [45, [57, 60, 64]], // Am
  [41, [57, 60, 65]], // F
  [48, [55, 60, 64]], // C
  [43, [55, 59, 62]], // G
  [41, [57, 60, 65]], // F
  [48, [55, 60, 64]], // C
];
const BAR = 4;
const ARP_START = 3.5; // the arpeggio enters with scene 2
const music = track(CHORDS.length * BAR);
CHORDS.forEach(([bass, pad], c) => {
  const t0 = c * BAR;
  for (const m of pad)
    for (const detune of [0.997, 1.003])
      note(music, t0, BAR + 1, hz(m) * detune, swell(0.05, BAR + 1, 1), [[1, 1], [2, 0.15]]);
  for (const t of [t0, t0 + 2]) note(music, t, 1.8, hz(bass), pluck(0.25, 0.7, 0.02));
  for (let k = 0; k < 16; k++) {
    const t = t0 + k * 0.25;
    if (t >= ARP_START) note(music, t, 0.6, hz(pad[[0, 1, 2, 1][k % 4]] + 12), pluck(0.07, 0.2), [[1, 1], [2, 0.3]]);
  }
});
const total = music.length / SR;
music.forEach((s, i) => (music[i] = s * Math.min(1, i / SR / 0.3, (total - i / SR) / 1.5)));
save('music.wav', music, 0.4);

// Keyboard: 50 frames of clicks at uneven intervals.
const typing = track(50 / 30);
for (let t = 0.02; t < 1.6; t += 0.065 + rand() * 0.03) {
  const from = Math.round(t * SR);
  for (let i = 0; i < 0.01 * SR; i++) typing[from + i] += (rand() * 2 - 1) * Math.exp(-i / SR / 0.002) * 0.5;
  note(typing, t, 0.015, 1800 + rand() * 600, pluck(0.3, 0.004, 0.001));
}
save('typing.wav', typing, 0.25);

const ok = track(0.3);
note(ok, 0, 0.1, 880, pluck(1, 0.05));
note(ok, 0.07, 0.22, 1320, pluck(1, 0.08));
save('ok.wav', ok, 0.35);

const bad = track(0.35);
note(bad, 0, 0.12, 330, pluck(1, 0.06), [[1, 1], [3, 0.3]]);
note(bad, 0.09, 0.25, 247, pluck(1, 0.09), [[1, 1], [3, 0.3]]);
save('bad.wav', bad, 0.35);

const pop = track(0.2);
note(pop, 0, 0.2, (t) => 350 + 350 * Math.exp(-t / 0.03), pluck(1, 0.05, 0.002));
save('pop.wav', pop, 0.45);

const thud = track(0.5);
note(thud, 0, 0.5, (t) => 45 + 45 * Math.exp(-t / 0.06), pluck(1, 0.15, 0.003));
save('thud.wav', thud, 0.7);

const chime = track(2);
[72, 76, 79, 84].forEach((m, i) => note(chime, i * 0.06, 1.9 - i * 0.06, hz(m), pluck(1, 0.5, 0.003), [[1, 1], [2, 0.2], [3, 0.08]]));
save('chime.wav', chime, 0.4);

console.log(`audio written to ${OUT}`);
