#!/usr/bin/env node
/**
 * Generates the app's sound effects as WAV files.
 *
 * Only the short interaction ticks: the applause is a real recording that
 * lives in assets/audio and is not generated here.
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
