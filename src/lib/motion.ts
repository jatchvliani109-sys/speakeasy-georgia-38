// src/lib/motion.ts
//
// Small motion helpers for the landing page. No animation library: everything
// here writes `transform` / `opacity` straight onto an element (never through
// React state or an inherited CSS variable), so a frame never re-renders React
// and never recalculates styles for a whole subtree.
//
// Every helper respects "reduce motion" and does nothing on touch-only devices
// where it would not make sense (pointer effects).

import { useEffect, useRef, useState, type RefObject } from "react";

/** True when the visitor asked the OS for less motion. Updates live. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

/** A mouse or trackpad that can hover precisely. False on phones and tablets. */
export function hasFinePointer(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches
  );
}

/**
 * Becomes true the first time the element scrolls into view, then stays true.
 * Used to trigger one-off entrances (a deck dealing out, a number counting up).
 */
export function useInViewOnce<T extends Element>(
  ref: RefObject<T>,
  rootMargin = "0px 0px -15% 0px",
): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, seen]);
  return seen;
}

/**
 * Counts from 0 up to `target` once `start` turns true. Writes the number
 * straight into the element's text so React never re-renders per frame.
 */
export function useCountUp<T extends HTMLElement>(
  ref: RefObject<T>,
  target: number,
  start: boolean,
  durationMs = 1400,
) {
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!start || reduced) {
      el.textContent = String(start || reduced ? target : 0);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / durationMs);
      // strong ease-out: fast at first, settling on the final number
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = String(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ref, target, start, reduced, durationMs]);
}

/**
 * A button that leans a few pixels toward the cursor and springs back when
 * the cursor leaves. Mouse only; does nothing on touch or reduced motion.
 */
export function useMagnetic<T extends HTMLElement>(ref: RefObject<T>, maxPx = 6) {
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || !hasFinePointer()) return;
    let dx = 0;
    let dy = 0;
    let pressed = false;
    // The inline transform would hide the stylesheet's press scale, so the
    // press is folded in here.
    const paint = (ms: number) => {
      el.style.transition = `transform ${ms}ms cubic-bezier(0.23, 1, 0.32, 1)`;
      el.style.transform =
        `translate3d(${(dx * maxPx).toFixed(2)}px, ${(dy * maxPx * 0.6).toFixed(2)}px, 0)` +
        (pressed ? " scale(0.97)" : "");
    };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      paint(120);
    };
    const down = () => {
      pressed = true;
      paint(100);
    };
    const up = () => {
      pressed = false;
      paint(160);
    };
    const leave = () => {
      pressed = false;
      el.style.transition = "transform 420ms cubic-bezier(0.23, 1, 0.32, 1)";
      el.style.transform = "";
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointerleave", leave);
      el.style.transform = "";
    };
  }, [ref, reduced, maxPx]);
}

/**
 * Thin progress line for how far down the page the visitor has scrolled.
 * Writes scaleX on the bar element; reads scroll once per frame at most.
 */
export function useScrollProgress<T extends HTMLElement>(ref: RefObject<T>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      el.style.transform = `scaleX(${p.toFixed(4)})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [ref]);
}

/** True once the page has scrolled past `px`. Cheap: one rAF per scroll burst. */
export function useScrolledPast(px: number): boolean {
  const [past, setPast] = useState(false);
  const pastRef = useRef(false);
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const now = window.scrollY > px;
      if (now !== pastRef.current) {
        pastRef.current = now;
        setPast(now);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [px]);
  return past;
}

/* ───────────────────────── scroll engine ─────────────────────────
 * One requestAnimationFrame per scroll burst for the whole page. Every
 * scroll-driven effect registers a job with an optional `read` (measure) and
 * a `write` (paint). All reads run before any write, so the page never
 * measures a layout it has just invalidated (no layout thrashing).
 *
 * The frame also carries a smoothed scroll velocity, which keeps the loop
 * alive for a moment after scrolling stops so velocity-driven effects (the
 * word rows leaning) can settle back to rest.
 */
export type ScrollFrame = {
  /** window.scrollY */
  y: number;
  /** viewport height and width */
  vh: number;
  vw: number;
  /** smoothed scroll speed in px per frame, signed (down is positive) */
  v: number;
};
type ScrollJob = { read?: (f: ScrollFrame) => void; write: (f: ScrollFrame) => void };

const jobs = new Set<ScrollJob>();
let loopRaf = 0;
let lastY = -1;
let velocity = 0;
let listening = false;

function runFrame() {
  loopRaf = 0;
  const y = window.scrollY;
  if (lastY < 0) lastY = y;
  velocity = velocity * 0.82 + (y - lastY) * 0.18;
  lastY = y;
  if (Math.abs(velocity) < 0.02) velocity = 0;
  const f: ScrollFrame = { y, vh: window.innerHeight, vw: window.innerWidth, v: velocity };
  jobs.forEach((j) => j.read?.(f));
  jobs.forEach((j) => j.write(f));
  if (velocity !== 0) scheduleFrame();
}

/** Ask for one frame of the scroll engine (cheap to call repeatedly). */
export function scheduleFrame() {
  if (!loopRaf && typeof window !== "undefined") loopRaf = requestAnimationFrame(runFrame);
}

/** Current smoothed scroll speed, px per frame. */
export function scrollVelocity() {
  return velocity;
}

function ensureListening() {
  if (listening) return;
  listening = true;
  window.addEventListener("scroll", scheduleFrame, { passive: true });
  window.addEventListener("resize", scheduleFrame);
}

/**
 * Run `job` on every scroll frame while the component is mounted. The job
 * object is read through a ref, so it can close over fresh props without
 * re-registering.
 */
export function useScrollFrame(job: ScrollJob, enabled = true) {
  const ref = useRef(job);
  ref.current = job;
  useEffect(() => {
    if (!enabled) return;
    const proxy: ScrollJob = {
      read: (f) => ref.current.read?.(f),
      write: (f) => ref.current.write(f),
    };
    jobs.add(proxy);
    ensureListening();
    scheduleFrame();
    return () => {
      jobs.delete(proxy);
    };
  }, [enabled]);
}

/**
 * Call `measure` now, whenever `el` (or the window) changes size, and once the
 * web fonts have loaded (Georgian text reflows when Noto arrives). Use it to
 * cache layout positions so the per-frame work only needs scrollY.
 */
export function useMeasure(ref: RefObject<Element>, measure: () => void) {
  const fn = useRef(measure);
  fn.current = measure;
  useEffect(() => {
    const el = ref.current;
    const run = () => {
      fn.current();
      scheduleFrame();
    };
    run();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(run) : null;
    if (el && ro) ro.observe(el);
    window.addEventListener("resize", run);
    document.fonts?.ready.then(run).catch(() => {});
    // late layout shifts (images, the demo growing) are caught by the observer;
    // one more pass after first paint covers anything mounted in the same tick
    const t = window.setTimeout(run, 400);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", run);
      window.clearTimeout(t);
    };
  }, [ref]);
}

/** Top of an (untransformed) element in page coordinates. */
export function pageTop(el: Element) {
  return el.getBoundingClientRect().top + window.scrollY;
}

/** 0 → 1 as `v` goes from `a` to `b`, clamped. */
export function progress(v: number, a: number, b: number) {
  if (b === a) return v >= b ? 1 : 0;
  return Math.min(1, Math.max(0, (v - a) / (b - a)));
}

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * Adds the `revealed` class to the element the first time it scrolls into
 * view (or straight away when `immediate`). CSS does the rest (.rw, .fade-up,
 * .draw-line).
 */
export function useRevealClass<T extends Element>(
  ref: RefObject<T>,
  { immediate = false, rootMargin = "0px 0px -12% 0px" } = {},
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (immediate || typeof IntersectionObserver === "undefined") {
      // next frame, so the starting state paints first and the transition runs
      const r = requestAnimationFrame(() => el.classList.add("revealed"));
      return () => cancelAnimationFrame(r);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.classList.add("revealed");
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, immediate, rootMargin]);
}
