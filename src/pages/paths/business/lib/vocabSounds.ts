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
  osc.type = opts.type || "sine";
  osc.frequency.setValueAtTime(freq, start);
  if (opts.sweepTo) {
    osc.frequency.exponentialRampToValueAtTime(opts.sweepTo, start + durMs / 1000);
  }
  const peak = opts.gain ?? 0.08;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + durMs / 1000);
  osc.connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(start + durMs / 1000 + 0.02);
}

export function playCorrect() {
  if (!isSoundEnabled()) return;
  tone(660, 90, { type: "sine", gain: 0.08 });
  tone(990, 160, { type: "sine", gain: 0.08, delayMs: 70 });
}

export function playWrong() {
  if (!isSoundEnabled()) return;
  tone(240, 180, { type: "sine", gain: 0.05, sweepTo: 170 });
}

export function playCombo() {
  if (!isSoundEnabled()) return;
  // shorter, energetic
  tone(659, 80, { type: "triangle", gain: 0.08 });
  tone(880, 80, { type: "triangle", gain: 0.08, delayMs: 70 });
  tone(1175, 180, { type: "triangle", gain: 0.09, delayMs: 140 });
}

export function playMegaCombo() {
  if (!isSoundEnabled()) return;
  // celebratory fanfare
  tone(523, 110, { type: "triangle", gain: 0.08 });
  tone(659, 110, { type: "triangle", gain: 0.08, delayMs: 100 });
  tone(784, 110, { type: "triangle", gain: 0.08, delayMs: 200 });
  tone(1046, 130, { type: "triangle", gain: 0.09, delayMs: 300 });
  tone(1318, 320, { type: "sine", gain: 0.1, delayMs: 430 });
}

export function playComplete() {
  if (!isSoundEnabled()) return;
  tone(523, 120, { type: "sine", gain: 0.08 });
  tone(659, 120, { type: "sine", gain: 0.08, delayMs: 110 });
  tone(880, 320, { type: "sine", gain: 0.09, delayMs: 220 });
}

export function playFlip() {
  if (!isSoundEnabled()) return;
  tone(420, 90, { type: "sine", gain: 0.04, sweepTo: 720 });
}
