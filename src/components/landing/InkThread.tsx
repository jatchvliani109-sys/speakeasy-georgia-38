// src/components/landing/InkThread.tsx
//
// The ink line that draws itself down the landing page as you scroll. It
// starts under the hero flashcards and threads through every "station" on
// the page (anything marked data-thread), ending on the closing card. Each
// station's dot fills in as the pen reaches it. A faint dotted guide shows
// the route still ahead.
//
// The line sits UNDER the page content: cards are opaque paper, and headings
// on the line's path carry the page colour behind them, so the line appears
// to pass behind them, like thread through a notebook.
//
// Cost: the path is rebuilt only when the layout changes. Per scroll frame
// the work is one binary search over pre-sampled points and three writes
// (dash offset, pen position, and a class on any dot that changes state).

import { useRef, type RefObject } from "react";
import { useMeasure, useReducedMotion, useScrollFrame } from "@/lib/motion";

type Sample = { len: number; x: number; y: number };

const SAMPLE_STEP = 6; // px of path length between samples
const PEN_AT = 0.62; // the pen follows this height of the viewport
const DOT_GAP = 14; // px between a station's dot and the station itself

export default function InkThread({ rootRef }: { rootRef: RefObject<HTMLElement> }) {
  const reduced = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const inkRef = useRef<SVGPathElement>(null);
  const guideRef = useRef<SVGPathElement>(null);
  const penRef = useRef<SVGGElement>(null);
  const dotsRef = useRef<SVGGElement>(null);

  const geo = useRef({
    rootTop: 0,
    total: 0,
    samples: [] as Sample[],
    dots: [] as { y: number; el: SVGCircleElement; lit: boolean }[],
    lastLen: -1,
  });

  useMeasure(rootRef, () => {
    const root = rootRef.current;
    const svg = svgRef.current;
    const ink = inkRef.current;
    const guide = guideRef.current;
    const dotsG = dotsRef.current;
    if (!root || !svg || !ink || !guide || !dotsG) return;

    const rootRect = root.getBoundingClientRect();
    const rootTop = rootRect.top + window.scrollY;
    const rootLeft = rootRect.left;
    const stations = Array.from(root.querySelectorAll<HTMLElement>("[data-thread]"));
    if (stations.length < 2) return;

    // Each station: where the line enters (top centre) and leaves (bottom centre).
    const all = stations
      .map((el) => {
        const r = el.getBoundingClientRect();
        const top = r.top + window.scrollY - rootTop;
        const x = r.left - rootLeft + r.width / 2;
        return { x, top, bottom: top + r.height, h: r.height };
      })
      .filter((p) => p.h > 0);
    // keep the line running downward: skip a station that starts above the
    // previous one's end (side-by-side layouts)
    const pts: typeof all = [];
    for (const p of all) {
      if (!pts.length || p.top >= pts[pts.length - 1].bottom - 1) pts.push(p);
    }
    if (pts.length < 2) return;

    // Start under the first station (the flashcards), end on the last one's top.
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].bottom.toFixed(1)}`;
    const dotYs: { x: number; y: number }[] = [];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const y1 = a.bottom;
      const y2 = b.top;
      const h = Math.max(1, y2 - y1);
      // The station's dot sits ON the line, just above the station, and the
      // line arrives at it travelling straight down, so it meets the dot
      // dead centre and carries on out of its bottom.
      const dotY = y2 - Math.min(DOT_GAP, h * 0.35);
      const span = Math.max(1, dotY - y1);
      // sway out to one side through the middle of the gap, more in tall
      // gaps than in short ones
      // (a short gap gets a straight drop: a wiggle squeezed into 40px looks
      // like a kink, not a curve)
      const sway = span < 140 ? 0 : (i % 2 ? 1 : -1) * Math.min(80, (span - 100) * 0.3, window.innerWidth * 0.12);
      const mx = (a.x + b.x) / 2 + sway;
      const my = (y1 + dotY) / 2;
      const q = span * 0.3; // long handles: arrives at the dot straight down
      const f = (n: number) => n.toFixed(1);
      // two curves, both vertical at their ends and at the joint: smooth, and
      // square to the dots
      d += ` C ${f(a.x)} ${f(y1 + q)}, ${f(mx)} ${f(my - q)}, ${f(mx)} ${f(my)}`;
      d += ` C ${f(mx)} ${f(my + q)}, ${f(b.x)} ${f(dotY - q)}, ${f(b.x)} ${f(dotY)}`;
      d += ` L ${f(b.x)} ${f(y2)}`;
      dotYs.push({ x: b.x, y: dotY });
      // run straight down behind the station, unless it is the last one
      if (i < pts.length - 1) d += ` L ${f(b.x)} ${f(b.bottom)}`;
    }

    svg.setAttribute("width", String(rootRect.width));
    svg.setAttribute("height", String(root.scrollHeight));
    ink.setAttribute("d", d);
    guide.setAttribute("d", d);

    const total = ink.getTotalLength();
    const samples: Sample[] = [];
    for (let len = 0; len <= total; len += SAMPLE_STEP) {
      const p = ink.getPointAtLength(len);
      samples.push({ len, x: p.x, y: p.y });
    }
    const end = ink.getPointAtLength(total);
    samples.push({ len: total, x: end.x, y: end.y });
    ink.style.strokeDasharray = `${total} ${total}`;

    // station dots, centred on the line just above each station
    while (dotsG.firstChild) dotsG.removeChild(dotsG.firstChild);
    const dots = dotYs.map(({ x, y }) => {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", x.toFixed(1));
      c.setAttribute("cy", y.toFixed(1));
      c.setAttribute("r", "4.5");
      c.setAttribute("class", "thread-dot");
      dotsG.appendChild(c);
      return { y, el: c, lit: false };
    });

    geo.current = { rootTop, total, samples, dots, lastLen: -1 };
  });

  useScrollFrame({
    write: (f) => {
      const g = geo.current;
      const ink = inkRef.current;
      const pen = penRef.current;
      if (!ink || !pen || g.samples.length === 0) return;

      let len: number;
      let x: number;
      let y: number;
      if (reduced) {
        const last = g.samples[g.samples.length - 1];
        len = g.total;
        x = last.x;
        y = last.y;
      } else {
        const penY = f.y + f.vh * PEN_AT - g.rootTop;
        // binary search: first sample at or below the pen's height
        const s = g.samples;
        let lo = 0;
        let hi = s.length - 1;
        if (penY <= s[0].y) hi = 0;
        else if (penY >= s[hi].y) lo = hi;
        else {
          while (hi - lo > 1) {
            const mid = (lo + hi) >> 1;
            if (s[mid].y < penY) lo = mid;
            else hi = mid;
          }
        }
        const a = s[lo];
        const b = s[hi];
        const t = b.y === a.y ? 0 : Math.min(1, Math.max(0, (penY - a.y) / (b.y - a.y)));
        len = a.len + (b.len - a.len) * t;
        x = a.x + (b.x - a.x) * t;
        y = a.y + (b.y - a.y) * t;
      }

      if (Math.abs(len - g.lastLen) > 0.5) {
        ink.style.strokeDashoffset = String(g.total - len);
        pen.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        pen.style.opacity = len > 2 && len < g.total - 1 ? "1" : "0";
        g.lastLen = len;
      }
      for (const dot of g.dots) {
        const lit = y >= dot.y - 1;
        if (lit !== dot.lit) {
          dot.el.classList.toggle("is-lit", lit);
          dot.lit = lit;
        }
      }
    },
  });

  return (
    <svg
      ref={svgRef}
      aria-hidden
      className="ink-thread pointer-events-none absolute left-0 top-0 z-0 overflow-visible"
      fill="none"
    >
      <path ref={guideRef} className="thread-guide" />
      <path ref={inkRef} className="thread-ink" />
      <g ref={dotsRef} />
      <g ref={penRef} className="thread-pen" style={{ opacity: 0 }}>
        <circle r="9" className="thread-pen-halo" />
        <circle r="4" className="thread-pen-tip" />
      </g>
    </svg>
  );
}
