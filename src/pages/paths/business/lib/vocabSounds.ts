// Lightweight WebAudio-synthesized sounds for the vocabulary module.
// No external assets — keeps the bundle small and avoids licensing issues.

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

function tone(
  freq: number,
  durMs: number,
  opts: { type?: OscillatorType; gain?: number; sweepTo?: number; delayMs?: number } = {},
) {
  const c = audio();
  if (!c) return;
  const start = c.currentTime + (opts.delayMs ? opts.delayMs / 1000 : 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type || "square";
  osc.frequency.setValueAtTime(freq, start);
  if (opts.sweepTo) {
    osc.frequency.exponentialRampToValueAtTime(opts.sweepTo, start + durMs / 1000);
  }
  const peak = opts.gain ?? 0.06;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, start + durMs / 1000);
  osc.connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(start + durMs / 1000 + 0.02);
}

export function playCorrect() {
  if (!isSoundEnabled()) return;
  tone(340, 70, { type: "square", gain: 0.06 });
  tone(520, 110, { type: "square", gain: 0.05, delayMs: 60 });
}

export function playWrong() {
  if (!isSoundEnabled()) return;
  tone(180, 220, { type: "square", gain: 0.05, sweepTo: 100 });
}

export function playCombo() {
  if (!isSoundEnabled()) return;
  tone(320, 70, { type: "square", gain: 0.06 });
  tone(440, 70, { type: "square", gain: 0.06, delayMs: 60 });
  tone(600, 140, { type: "square", gain: 0.06, delayMs: 120 });
}

export function playMegaCombo() {
  if (!isSoundEnabled()) return;
  tone(280, 100, { type: "square", gain: 0.06 });
  tone(360, 100, { type: "square", gain: 0.06, delayMs: 90 });
  tone(480, 100, { type: "square", gain: 0.06, delayMs: 180 });
  tone(640, 120, { type: "square", gain: 0.07, delayMs: 270 });
  tone(800, 280, { type: "square", gain: 0.07, delayMs: 390 });
}

export function playComplete() {
  if (!isSoundEnabled()) return;
  tone(320, 110, { type: "square", gain: 0.06 });
  tone(440, 110, { type: "square", gain: 0.06, delayMs: 100 });
  tone(600, 300, { type: "square", gain: 0.06, delayMs: 200 });
}

export function playFlip() {
  if (!isSoundEnabled()) return;
  tone(280, 80, { type: "square", gain: 0.04, sweepTo: 480 });
}
