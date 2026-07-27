#!/usr/bin/env node
/**
 * Generates the app's sound effects as WAV files.
 *
 * Synthesised rather than sampled so the files are ours outright, with no
 * licensing to track, and so each sound can be tuned to the moment it marks.
 */
const fs = require('fs');
const path = require('path');

const SR = 44100;
const OUT = process.argv[2];
if (!OUT) {
  console.error('usage: gen-audio.js <output-dir>');
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------- utilities

// Deterministic RNG so re-running produces byte-identical files.
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const rndRange = (rng, lo, hi) => lo + rng() * (hi - lo);

// RBJ cookbook biquad. Returns a stateful sample-by-sample processor.
function biquad(type, freq, q, sr = SR) {
  const w0 = (2 * Math.PI * freq) / sr;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * q);
  let b0, b1, b2, a0, a1, a2;

  if (type === 'lowpass') {
    b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2;
    a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
  } else if (type === 'highpass') {
    b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2;
    a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
  } else { // bandpass, constant 0 dB peak
    b0 = alpha; b1 = 0; b2 = -alpha;
    a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
  }

  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => {
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
}

const applyFilter = (buf, filter) => buf.map(filter);

/**
 * Roll off the top end. Synthesised noise runs flat to 20 kHz, which reads as
 * hiss; real recordings of a room taper well before that.
 */
function tame(channels, cutoff) {
  return channels.map((ch) => {
    const a = biquad('lowpass', cutoff, 0.6);
    const b = biquad('lowpass', cutoff * 1.6, 0.6);
    return ch.map((v) => b(a(v)));
  });
}

/** Remove any DC drift the noise generators leave behind. */
function removeDc(channels) {
  return channels.map((ch) => {
    const mean = ch.reduce((s, v) => s + v, 0) / ch.length;
    return ch.map((v) => v - mean);
  });
}

function normalise(channels, peak = 0.89) {
  let max = 0;
  for (const ch of channels) for (const v of ch) max = Math.max(max, Math.abs(v));
  if (max === 0) return channels;
  const g = peak / max;
  return channels.map((ch) => ch.map((v) => v * g));
}

// Gentle saturation keeps transients from sounding brittle when they clip.
const softClip = (v) => Math.tanh(v * 1.1) * 0.92;

function fadeEdges(channels, ms = 4) {
  const n = Math.floor((ms / 1000) * SR);
  for (const ch of channels) {
    for (let i = 0; i < n && i < ch.length; i++) {
      const g = i / n;
      ch[i] *= g;
      ch[ch.length - 1 - i] *= g;
    }
  }
  return channels;
}

function writeWav(name, channels) {
  const numCh = channels.length;
  const numSamples = channels[0].length;
  const dataSize = numSamples * numCh * 2;
  const buf = Buffer.alloc(44 + dataSize);

  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(numCh, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * numCh * 2, 28);
  buf.writeUInt16LE(numCh * 2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  let off = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < numCh; c++) {
      const v = Math.max(-1, Math.min(1, channels[c][i]));
      buf.writeInt16LE(Math.round(v * 32767), off);
      off += 2;
    }
  }

  const file = path.join(OUT, name);
  fs.writeFileSync(file, buf);

  // Report level so the result can be checked without listening to it.
  let peak = 0, sumSq = 0;
  for (const ch of channels) for (const v of ch) {
    peak = Math.max(peak, Math.abs(v));
    sumSq += v * v;
  }
  const rms = Math.sqrt(sumSq / (numSamples * numCh));
  const db = (x) => (x > 0 ? (20 * Math.log10(x)).toFixed(1) : '-inf');
  console.log(
    `${name.padEnd(22)} ${numCh}ch ${(numSamples / SR).toFixed(2)}s  ` +
    `${(buf.length / 1024).toFixed(0)}KB  peak ${db(peak)}dB  rms ${db(rms)}dB`
  );
}

// ------------------------------------------------------------ sound sources

/**
 * One handclap: a very fast noise transient with a body resonance. Randomising
 * brightness and length per clap is what stops a crowd sounding like a machine.
 */
function clap(rng) {
  const durMs = rndRange(rng, 26, 52);
  const n = Math.floor((durMs / 1000) * SR);
  const centre = rndRange(rng, 1150, 2600);
  const bp = biquad('bandpass', centre, rndRange(rng, 0.7, 1.3));
  const hp = biquad('highpass', 420, 0.7);
  const out = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    const t = i / n;
    // Near-instant attack, exponential tail.
    const env = (i < 30 ? i / 30 : 1) * Math.exp(-t * rndRange(rng, 7, 12));
    out[i] = hp(bp((rng() * 2 - 1) * env));
  }
  return out;
}

/**
 * A crowd clapping: claps scattered in time, thickened with a low body layer
 * so it reads as a room full of people rather than a stack of clicks.
 */
function applause(seed, { seconds, density, swellMs = 140, tailMs = 600, width = 0.55 }) {
  const rng = makeRng(seed);
  const n = Math.floor(seconds * SR);
  const left = new Float64Array(n);
  const right = new Float64Array(n);

  const swell = Math.floor((swellMs / 1000) * SR);
  const tail = Math.floor((tailMs / 1000) * SR);
  const shape = (i) => {
    const attack = i < swell ? i / swell : 1;
    const release = i > n - tail ? (n - i) / tail : 1;
    return attack * release * release;
  };

  const total = Math.floor(seconds * density);
  for (let c = 0; c < total; c++) {
    const at = Math.floor(rng() * (n - 3000));
    const gain = rndRange(rng, 0.25, 1) * shape(at);
    // Pan each clap; decorrelating the channels is most of what makes a
    // crowd sound wide instead of flat.
    const pan = rndRange(rng, -width, width);
    const gl = gain * (1 - Math.max(0, pan));
    const gr = gain * (1 + Math.min(0, pan));
    const c1 = clap(rng);
    for (let i = 0; i < c1.length; i++) {
      const idx = at + i;
      if (idx >= n) break;
      left[idx] += c1[i] * gl;
      right[idx] += c1[i] * gr;
    }
  }

  // Low body: the rumble of a lot of people in one place.
  const bodyLp = biquad('lowpass', 700, 0.6);
  const bodyHp = biquad('highpass', 130, 0.7);
  let brown = 0;
  for (let i = 0; i < n; i++) {
    brown = brown * 0.985 + (rng() * 2 - 1) * 0.06;
    const body = bodyHp(bodyLp(brown)) * shape(i) * 0.5;
    left[i] += body;
    right[i] += body * 0.92;
  }

  return [Array.from(left).map(softClip), Array.from(right).map(softClip)];
}

/** Voices: filtered noise with slow formant-ish movement, for a cheer. */
function cheer(seed, seconds) {
  const rng = makeRng(seed);
  const n = Math.floor(seconds * SR);
  const left = new Float64Array(n);
  const right = new Float64Array(n);

  const voices = 22;
  for (let v = 0; v < voices; v++) {
    const f = rndRange(rng, 620, 2100);
    const bp = biquad('bandpass', f, rndRange(rng, 2.5, 6));
    const rate = rndRange(rng, 0.6, 1.8);
    const phase = rng() * Math.PI * 2;
    const start = Math.floor(rng() * n * 0.25);
    const pan = rndRange(rng, -0.7, 0.7);
    const gl = (1 - Math.max(0, pan)) / voices;
    const gr = (1 + Math.min(0, pan)) / voices;

    for (let i = start; i < n; i++) {
      const t = (i - start) / SR;
      const swell = Math.min(1, t * 3) * Math.min(1, ((n - i) / SR) * 1.6);
      const wobble = 0.7 + 0.3 * Math.sin(2 * Math.PI * rate * t + phase);
      const s = bp(rng() * 2 - 1) * swell * wobble * 3.2;
      left[i] += s * gl;
      right[i] += s * gr;
    }
  }
  return [Array.from(left), Array.from(right)];
}

// ------------------------------------------------------------------ sounds

function ballHit() {
  const rng = makeRng(20260727);
  const n = Math.floor(0.16 * SR);
  const out = new Float64Array(n);

  // String snap: a very short bright tick.
  const tickBp = biquad('bandpass', 4200, 1.1);
  // Impact body: the dull thud of the ball itself.
  const bodyBp = biquad('bandpass', 1500, 0.9);

  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const attack = i < 20 ? i / 20 : 1;
    const noise = rng() * 2 - 1;
    out[i] =
      tickBp(noise) * Math.exp(-t * 260) * 0.55 * attack +
      bodyBp(noise) * Math.exp(-t * 46) * 0.9 * attack;
  }

  // Tuned partials give the hit a pitch instead of leaving it a pure click.
  const partials = [[430, 34, 0.5], [720, 52, 0.3], [1180, 78, 0.16]];
  for (const [f, decay, amp] of partials) {
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const attack = i < 20 ? i / 20 : 1;
      out[i] += Math.sin(2 * Math.PI * f * t) * Math.exp(-t * decay) * amp * attack;
    }
  }

  return [Array.from(out).map(softClip)];
}

function undoTick() {
  const rng = makeRng(770077);
  const n = Math.floor(0.14 * SR);
  const out = new Float64Array(n);
  const bp = biquad('bandpass', 1800, 1.4);

  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const attack = i < 40 ? i / 40 : 1;
    // A short downward sweep reads as "undo" — going back.
    const f = 880 - 420 * Math.min(1, t / 0.11);
    out[i] =
      Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 26) * 0.55 * attack +
      bp(rng() * 2 - 1) * Math.exp(-t * 70) * 0.12 * attack;
  }
  return [Array.from(out)];
}

/** Loopable stadium murmur: quiet, wide, and seamless at the join. */
function crowdAmbience() {
  const rng = makeRng(31415926);
  const seconds = 6;
  const n = Math.floor(seconds * SR);
  const left = new Float64Array(n);
  const right = new Float64Array(n);

  const lp = [biquad('lowpass', 1350, 0.7), biquad('lowpass', 1350, 0.7)];
  const hp = [biquad('highpass', 190, 0.7), biquad('highpass', 190, 0.7)];
  let bl = 0, br = 0;
  // Two slow drifts so the level breathes instead of sitting flat.
  let d1 = 0, d2 = 0;

  for (let i = 0; i < n; i++) {
    const t = i / SR;
    bl = bl * 0.9885 + (rng() * 2 - 1) * 0.055;
    br = br * 0.9885 + (rng() * 2 - 1) * 0.055;
    d1 = d1 * 0.99995 + (rng() * 2 - 1) * 0.00035;
    d2 = d2 * 0.99992 + (rng() * 2 - 1) * 0.00028;
    const drift = 0.78 + 6 * d1 + 0.12 * Math.sin(2 * Math.PI * 0.13 * t + d2 * 40);
    left[i] = hp[0](lp[0](bl)) * drift;
    right[i] = hp[1](lp[1](br)) * drift;
  }

  // Sparse distant claps keep it from turning into plain noise.
  const sprinkle = makeRng(2718281);
  for (let c = 0; c < 34; c++) {
    const at = Math.floor(sprinkle() * (n - 6000));
    const g = rndRange(sprinkle, 0.05, 0.16);
    const src = clap(sprinkle);
    for (let i = 0; i < src.length; i++) {
      left[at + i] += src[i] * g;
      right[at + i] += src[i] * g * 0.8;
    }
  }

  // Crossfade the tail over the head so the loop point is inaudible.
  const xf = Math.floor(0.9 * SR);
  const outL = new Float64Array(n - xf);
  const outR = new Float64Array(n - xf);
  for (let i = 0; i < outL.length; i++) {
    outL[i] = left[i];
    outR[i] = right[i];
  }
  for (let i = 0; i < xf; i++) {
    const g = i / xf;
    outL[i] = left[i] * g + left[n - xf + i] * (1 - g);
    outR[i] = right[i] * g + right[n - xf + i] * (1 - g);
  }

  return [Array.from(outL), Array.from(outR)];
}

function mix(layers) {
  const n = Math.max(...layers.map(([l]) => l[0].length));
  const out = [new Float64Array(n), new Float64Array(n)];
  for (const [chans, gain] of layers) {
    for (let c = 0; c < 2; c++) {
      const src = chans[Math.min(c, chans.length - 1)];
      for (let i = 0; i < src.length; i++) out[c][i] += src[i] * gain;
    }
  }
  return [Array.from(out[0]), Array.from(out[1])];
}

// ------------------------------------------------------------------- render

const finish = (channels, { peak, cutoff, fadeMs = 8 }) =>
  fadeEdges(normalise(removeDc(tame(channels, cutoff)), peak), fadeMs);

writeWav('ball-hit.wav', finish(ballHit(), { peak: 0.8, cutoff: 11000, fadeMs: 2 }));
writeWav('undo.wav', finish(undoTick(), { peak: 0.55, cutoff: 9000, fadeMs: 3 }));

writeWav(
  'applause-game.wav',
  finish(applause(1001, { seconds: 1.5, density: 150, tailMs: 620 }), {
    peak: 0.72,
    cutoff: 8200,
  })
);

writeWav(
  'applause-set.wav',
  finish(applause(2002, { seconds: 2.6, density: 230, swellMs: 180, tailMs: 900 }), {
    peak: 0.82,
    cutoff: 8600,
  })
);

writeWav(
  'celebration.wav',
  finish(
    mix([
      [applause(3003, { seconds: 4, density: 280, swellMs: 220, tailMs: 1400, width: 0.7 }), 1],
      [cheer(4004, 4), 0.85],
    ]),
    { peak: 0.88, cutoff: 9000, fadeMs: 10 }
  )
);

// The loop crossfade must survive, so no edge fade here.
writeWav('crowd.wav', normalise(removeDc(tame(crowdAmbience(), 4000)), 0.42));
