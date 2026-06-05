// Lightweight WebAudio-synthesized sounds for the vocabulary module.
// Refined to feel professional and personal — soft sine/triangle tones,
// gentle envelopes, no video-game square waves.

const STORAGE_KEY = "biz_vocab_sound_enabled";

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  try {
    const Ctor: typeof AudioContext =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === null ? true : v === "1";
}

export function setSoundEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
}

type ToneOpts = {
  type?: OscillatorType;
  gain?: number;
  sweepTo?: number;
  delayMs?: number;
  attackMs?: number;
  releaseMs?: number;
  // low-pass filter cutoff in Hz to keep things warm, not buzzy
  filterHz?: number;
};

function tone(freq: number, durMs: number, opts: ToneOpts = {}) {
  const c = audio();
  if (!c) return;
  const start = c.currentTime + (opts.delayMs ? opts.delayMs / 1000 : 0);
  const dur = durMs / 1000;
  const osc = c.createOscillator();
  const g = c.createGain();
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = opts.filterHz ?? 2400;
  filter.Q.value = 0.6;

  osc.type = opts.type || "sine";
  osc.frequency.setValueAtTime(freq, start);
  if (opts.sweepTo) {
    osc.frequency.exponentialRampToValueAtTime(opts.sweepTo, start + dur);
  }

  const peak = opts.gain ?? 0.07;
  const attack = (opts.attackMs ?? 12) / 1000;
  const release = (opts.releaseMs ?? Math.max(60, durMs * 0.6)) / 1000;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + attack);
  g.gain.setValueAtTime(peak, start + Math.max(attack, dur - release));
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);

  osc.connect(filter).connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

// Soft warm click — used for "start" / "next" advance interactions.
export function playTap() {
  if (!isSoundEnabled()) return;
  tone(520, 90, { type: "sine", gain: 0.05, attackMs: 6, releaseMs: 70, filterHz: 1800 });
  tone(780, 70, { type: "sine", gain: 0.025, delayMs: 18, attackMs: 6, releaseMs: 55, filterHz: 2200 });
}

// Backwards-compat alias for the page flip sound.
export function playFlip() {
  playTap();
}

// Correct answer — warm two-note rise, like a soft confirmation chime.
export function playCorrect() {
  if (!isSoundEnabled()) return;
  // C5 -> E5 -> G5, sine, gentle
  tone(523.25, 140, { type: "sine", gain: 0.06, attackMs: 10, releaseMs: 120, filterHz: 2600 });
  tone(659.25, 180, { type: "sine", gain: 0.06, delayMs: 90, attackMs: 10, releaseMs: 160, filterHz: 2800 });
  tone(783.99, 260, { type: "triangle", gain: 0.045, delayMs: 190, attackMs: 14, releaseMs: 240, filterHz: 2400 });
}

// Wrong answer — short, low, soft thud. No harshness.
export function playWrong() {
  if (!isSoundEnabled()) return;
  tone(220, 180, { type: "sine", gain: 0.06, sweepTo: 150, attackMs: 8, releaseMs: 160, filterHz: 900 });
  tone(150, 240, { type: "sine", gain: 0.04, delayMs: 40, sweepTo: 110, attackMs: 10, releaseMs: 220, filterHz: 700 });
}

// 5-streak — small ascending arpeggio, still understated.
export function playCombo() {
  if (!isSoundEnabled()) return;
  tone(523.25, 110, { type: "sine", gain: 0.05, attackMs: 8, releaseMs: 100, filterHz: 2600 });
  tone(659.25, 110, { type: "sine", gain: 0.05, delayMs: 90, attackMs: 8, releaseMs: 100, filterHz: 2600 });
  tone(783.99, 200, { type: "triangle", gain: 0.05, delayMs: 180, attackMs: 10, releaseMs: 180, filterHz: 2600 });
}

// 10-streak — fuller chord, still warm, not arcade.
export function playMegaCombo() {
  if (!isSoundEnabled()) return;
  tone(523.25, 120, { type: "sine", gain: 0.05, attackMs: 8, releaseMs: 110, filterHz: 2800 });
  tone(659.25, 120, { type: "sine", gain: 0.05, delayMs: 90, attackMs: 8, releaseMs: 110, filterHz: 2800 });
  tone(783.99, 140, { type: "sine", gain: 0.05, delayMs: 180, attackMs: 8, releaseMs: 130, filterHz: 2800 });
  tone(1046.5, 360, { type: "triangle", gain: 0.05, delayMs: 270, attackMs: 14, releaseMs: 340, filterHz: 2600 });
}

// Session complete — calm resolving cadence.
export function playComplete() {
  if (!isSoundEnabled()) return;
  tone(392.0, 180, { type: "sine", gain: 0.055, attackMs: 12, releaseMs: 160, filterHz: 2400 });
  tone(523.25, 200, { type: "sine", gain: 0.055, delayMs: 160, attackMs: 12, releaseMs: 180, filterHz: 2400 });
  tone(659.25, 420, { type: "triangle", gain: 0.05, delayMs: 340, attackMs: 16, releaseMs: 400, filterHz: 2400 });
}
