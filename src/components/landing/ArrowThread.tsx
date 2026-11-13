// src/components/landing/ArrowThread.tsx
//
// The cobalt arrow line. The white arrow inside the top sign-up button
// ("დაიწყე ახლავე უფასოდ") flies out of the button as you scroll and draws a
// cobalt line behind it down the page: it swoops over the buttons and behind
// the flashcards, loops in the open spaces between sections, slips behind the
// cards and boxes, and finally comes round into the sign-up button at the
// bottom of the page and lands exactly where that button's own arrow sits.
// Scrolling back up traces it back the same way.
//
// Colour: inside a blue button the line and the arrow are white; outside,
// they are cobalt. Both are drawn twice (cobalt everywhere, white clipped to
// the two buttons), so the colour changes exactly at the button's edge.
//
// Layers: the line runs UNDER the page content (so cards and boxes hide it as
// it passes behind them) except on the closing card and inside the two
// buttons, where a copy drawn over the content shows it.
//
// Pace: the arrow doesn't jump to wherever the scroll says. It chases that
// point with a speed limit that depends on the bend it is on: through loops
// and tight turns it moves at a steady, readable pace; on straighter runs it
// speeds up to catch up. When you stop scrolling it finishes the move.
//
// Look: the trail is dark ink like the other line; the arrowhead is cobalt
// with a soft light-blue glow (white inside the blue buttons).
//
// Cost: the route is rebuilt only when the layout changes. Per animation
// frame while the arrow is moving: the dash offset on three copies of one
// path and the arrowhead's position.

import { useEffect, useId, useRef, type RefObject } from "react";
import { useMeasure, useReducedMotion, useScrollFrame } from "@/lib/motion";

type P = { x: number; y: number };
const ARRIVE_AT = 0.6; // the arrow lands when the bottom button is this far down the screen
const SAMPLE = 5; // px between samples along the drawn curve

/** Layout position of an element inside `root` (ignores transforms). */
function layoutRect(el: HTMLElement, root: HTMLElement) {
  let x = 0;
  let y = 0;
  let n: HTMLElement | null = el;
  while (n && n !== root) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

/** Centripetal Catmull-Rom through the points, sampled every ~SAMPLE px. */
function sampleSpline(pts: P[]): P[] {
  if (pts.length < 2) return pts;
  const ext = [
    { x: 2 * pts[0].x - pts[1].x, y: 2 * pts[0].y - pts[1].y },
    ...pts,
    {
      x: 2 * pts[pts.length - 1].x - pts[pts.length - 2].x,
      y: 2 * pts[pts.length - 1].y - pts[pts.length - 2].y,
    },
  ];
  const out: P[] = [pts[0]];
  const tj = (a: P, b: P) => Math.pow(Math.hypot(b.x - a.x, b.y - a.y), 0.5) || 1e-4;
  for (let i = 1; i < ext.length - 2; i++) {
    const p0 = ext[i - 1];
    const p1 = ext[i];
    const p2 = ext[i + 1];
    const p3 = ext[i + 2];
    const t0 = 0;
    const t1 = t0 + tj(p0, p1);
    const t2 = t1 + tj(p1, p2);
    const t3 = t2 + tj(p2, p3);
    const n = Math.max(2, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / SAMPLE));
    for (let k = 1; k <= n; k++) {
      const t = t1 + ((t2 - t1) * k) / n;
      const lerp = (a: P, b: P, ta: number, tb: number): P => {
        const u = (t - ta) / (tb - ta);
        return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
      };
      const a1 = lerp(p0, p1, t0, t1);
      const a2 = lerp(p1, p2, t1, t2);
      const a3 = lerp(p2, p3, t2, t3);
      const b1 = lerp(a1, a2, t0, t2);
      const b2 = lerp(a2, a3, t1, t3);
      out.push(lerp(b1, b2, t1, t2));
    }
  }
  return out;
}

/**
 * A loop like a handwritten "l": coming down, it swings out to one side, up
 * and over, crosses its own path and carries on down. (A prolate trochoid:
 * vertical at the way in and the way out, so it joins the line smoothly.)
 */
function loop(cx: number, yTop: number, drop: number, r: number, toRight: boolean): P[] {
  const s = toRight ? 1 : -1;
  const out: P[] = [{ x: cx, y: yTop - 34 }];
  const steps = 20;
  for (let k = 0; k <= steps; k++) {
    const t = (k / steps) * Math.PI * 2;
    out.push({
      x: cx + s * r * (1 - Math.cos(t)),
      y: yTop + (drop / (Math.PI * 2)) * t + r * 0.95 * Math.sin(t),
    });
  }
  out.push({ x: cx, y: yTop + drop + 34 });
  return out;
}

/** Moving-average smoothing that leaves the two ends exactly in place. */
function smoothPts(pts: P[], radius: number, passes: number, lockStart: number, lockEnd: number): P[] {
  let cur = pts;
  for (let pass = 0; pass < passes; pass++) {
    const next = cur.map((p) => ({ ...p }));
    for (let i = lockStart; i < cur.length - lockEnd; i++) {
      let sx = 0;
      let sy = 0;
      let n = 0;
      for (let j = i - radius; j <= i + radius; j++) {
        if (j < 0 || j >= cur.length) continue;
        sx += cur[j].x;
        sy += cur[j].y;
        n++;
      }
      next[i] = { x: sx / n, y: sy / n };
    }
    cur = next;
  }
  return cur;
}

export default function ArrowThread({ rootRef }: { rootRef: RefObject<HTMLElement> }) {
  const reduced = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const backRef = useRef<SVGSVGElement>(null);
  const frontRef = useRef<SVGSVGElement>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const headRefs = useRef<(SVGGElement | null)[]>([]);
  const btnClipRefs = useRef<(SVGRectElement | null)[]>([]);
  const btnGroupRefs = useRef<(SVGGElement | null)[]>([]);
  const cardClipRef = useRef<SVGPathElement>(null);
  // the two buttons, and their centres in page coordinates, so the white
  // arrow inside each can lean with its button when the mouse pulls it
  const btns = useRef<{ el: HTMLElement; cx: number; cy: number }[]>([]);

  const geo = useRef({
    ok: false,
    rootTop: 0,
    xs: new Float32Array(0),
    ys: new Float32Array(0),
    len: new Float32Array(0), // cumulative length
    prog: new Float32Array(0), // scroll-progress key per sample (rises monotonically)
    bend: new Float32Array(0), // 0 straight … 1 tight loop, per sample
    total: 0,
    endY: 0,
    startIcon: null as SVGElement | null,
    endIcon: null as SVGElement | null,
    minL: 0, // the short line inside the top button is always drawn
    last: -1,
  });

  useMeasure(rootRef, () => {
    const root = rootRef.current;
    const back = backRef.current;
    const front = frontRef.current;
    if (!root || !back || !front) return;
    const startIcon = root.querySelector<SVGElement>('[data-arrow="start"]');
    const endIcon = root.querySelector<SVGElement>('[data-arrow="end"]');
    const startBtn = startIcon?.closest("a") as HTMLElement | null;
    const endBtn = endIcon?.closest("a") as HTMLElement | null;
    const card = endBtn?.closest(".paper-card") as HTMLElement | null;
    const stations = Array.from(root.querySelectorAll<HTMLElement>("[data-thread]"));
    if (!startIcon || !endIcon || !startBtn || !endBtn || !card || stations.length < 3) return;

    const W = root.clientWidth;
    const sb = layoutRect(startBtn, root);
    const eb = layoutRect(endBtn, root);
    const cr = layoutRect(card, root);
    // the icons' place inside their buttons (relative, so transforms cancel out)
    const iconIn = (icon: SVGElement, btn: HTMLElement, b: { x: number; y: number }) => {
      const ir = icon.getBoundingClientRect();
      const br = btn.getBoundingClientRect();
      const sx = br.width ? btn.offsetWidth / br.width : 1;
      return {
        x: b.x + (ir.left - br.left) * sx,
        y: b.y + (ir.top - br.top) * sx,
        w: ir.width * sx,
        h: ir.height * sx,
      };
    };
    const si = iconIn(startIcon, startBtn, sb);
    const ei = iconIn(endIcon, endBtn, eb);
    // the arrow's tip sits at the icon's arrowhead (lucide's arrow tip is at 19/24)
    const A: P = { x: si.x + si.w * (19 / 24), y: si.y + si.h / 2 };
    const Z: P = { x: ei.x + ei.w * (19 / 24), y: ei.y + ei.h / 2 };

    const deckSt = layoutRect(stations[0], root);
    const blocks = stations.slice(1, -1).map((el) => layoutRect(el, root));
    const hero = stations[0].closest("section") as HTMLElement | null;
    const heroBottom = hero ? layoutRect(hero, root).y + hero.offsetHeight : deckSt.y + deckSt.h;

    const narrow = W < 640;
    const edgeR = narrow ? W * 0.88 : Math.min(W - 9, Math.max(W * 0.86, W - 60));
    const edgeL = narrow ? W * 0.12 : Math.max(9, Math.min(W * 0.14, 60));
    // the route starts at the left end of the top arrow's short line, so at
    // the top of the page our arrow (line + head) IS the button's arrow
    const S0: P = { x: si.x + si.w * (5 / 24), y: A.y };
    const shaft = A.x - S0.x;
    const pts: P[] = [S0, A, { x: sb.x + sb.w + 22, y: A.y }];

    // ── out of the hero ──
    const deckBeside = deckSt.x > sb.x + sb.w + 20 && deckSt.y < sb.y + sb.h;
    const deckCx = deckSt.x + deckSt.w / 2;
    const second = startBtn.parentElement?.querySelector<HTMLElement>('a[href="#demo"]') ?? null;
    const secondBeside = second ? second.offsetTop < startBtn.offsetTop + startBtn.offsetHeight / 2 : false;
    if (deckBeside) {
      // straight on, behind the second button (it is opaque for this), out
      // the other side, across to the flashcards and behind them
      const r2 = second && secondBeside ? layoutRect(second, root) : null;
      const afterX = r2 ? r2.x + r2.w + 26 : sb.x + sb.w + 90;
      pts.push({ x: afterX, y: A.y });
      pts.push({ x: Math.max(afterX + 30, deckSt.x + 14), y: A.y - 6 });
      pts.push({ x: deckCx, y: deckSt.y + deckSt.h * 0.55 });
      pts.push({ x: deckCx + deckSt.w * 0.2, y: deckSt.y + deckSt.h + 26 });
    } else {
      // a wide, smooth swing out past the right edge of the screen (briefly
      // off it), back in, and behind the flashcards
      pts.push({ x: W + 26, y: sb.y + sb.h + 70 });
      pts.push({ x: W + 8, y: deckSt.y + deckSt.h * 0.15 });
      pts.push({ x: deckCx + deckSt.w * 0.15, y: deckSt.y + deckSt.h * 0.55 });
      pts.push({ x: deckCx - deckSt.w * 0.05, y: deckSt.y + deckSt.h + 34 });
    }

    // ── down the page: through each gap between boxes, swapping sides, with
    // a loop in every other roomy gap; between gaps it passes behind boxes ──
    let prevBottom = Math.max(heroBottom, deckSt.y + deckSt.h + 24);
    let side = 1; // 1 = right, -1 = left
    let roomy = 0;
    blocks.forEach((b, bi) => {
      const gapTop = prevBottom;
      const gapBot = b.y;
      const gap = gapBot - gapTop;
      if (gap >= 52) {
        const cx = side > 0 ? edgeR : edgeL;
        const cy = (gapTop + gapBot) / 2;
        if (gap >= 100 && roomy++ % 2 === 0) {
          const r = Math.min(40, gap * 0.28, W * 0.1);
          const drop = Math.max(40, gap * 0.45);
          // swing inwards, towards the middle of the page
          pts.push(...loop(cx, cy - drop / 2, drop, r, side < 0));
        } else {
          pts.push({ x: cx, y: cy });
        }
        // cross to the other side only behind a tall box, where the crossing
        // is a steep dive; across a short box it would be a long flat run
        // that lags behind the scroll
        if (b.h >= 180 || (blocks[bi + 1] && blocks[bi + 1].h >= 180)) side = -side;
      }
      prevBottom = Math.max(prevBottom, b.y + b.h);
    });

    // ── into the last button, from beside the card, under the button, and
    // up into it, finishing level so it lands like the button's own arrow ──
    // (on a phone "beside the card" is just off the screen's edge)
    const outside = cr.x + cr.w + (narrow ? 26 : 24);
    const under = eb.y + eb.h;
    pts.push({ x: outside, y: cr.y + 20 });
    pts.push({ x: outside - 6, y: under + 22 });
    pts.push({ x: Z.x + 34, y: under + 30 });
    // the route ends just under the button; the last bit into the arrow is a
    // separate, exact curve (added after sampling, below)
    const E: P = { x: Z.x + 6, y: under + 18 };
    pts.push(E);

    // ── sample, measure ──
    // a smooth curve through the route, then softened once more so no corner
    // reads as a kink (the two ends stay exactly on the button arrows)
    const s = smoothPts(sampleSpline(pts), 3, 3, 2, 3);
    // The hook into the bottom arrow: one cubic curve that leaves E in the
    // direction the line was already going (no corner where they meet) and
    // joins the START of the arrow's own short line (its shaft), level. From
    // there it runs exactly along that shaft to the tip, so when the button's
    // arrow reappears there is only ever one line, never two side by side.
    {
      const S = { x: ei.x + ei.w * (5 / 24), y: Z.y }; // left end of the shaft
      const m = s.length;
      const a = s[Math.max(0, m - 4)];
      const b = s[m - 1];
      const dl = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const dx = (b.x - a.x) / dl;
      const dy = (b.y - a.y) / dl;
      // long handles: a wide, round "J" rather than a tight corner
      const P1 = { x: E.x + dx * 30, y: E.y + dy * 30 };
      const P2 = { x: S.x - 14, y: S.y };
      const steps = 24;
      for (let k = 1; k <= steps; k++) {
        const t = k / steps;
        const u = 1 - t;
        s.push({
          x: u * u * u * E.x + 3 * u * u * t * P1.x + 3 * u * t * t * P2.x + t * t * t * S.x,
          y: u * u * u * E.y + 3 * u * u * t * P1.y + 3 * u * t * t * P2.y + t * t * t * S.y,
        });
      }
      // straight along the shaft to the tip
      const run = Z.x - S.x;
      const k2 = Math.max(1, Math.round(run / 4));
      for (let k = 1; k <= k2; k++) s.push({ x: S.x + (run * k) / k2, y: Z.y });
    }
    const n = s.length;
    const xs = new Float32Array(n);
    const ys = new Float32Array(n);
    const len = new Float32Array(n);
    const prog = new Float32Array(n);
    let d = "";
    for (let i = 0; i < n; i++) {
      xs[i] = s[i].x;
      ys[i] = s[i].y;
      if (i) {
        const dx = xs[i] - xs[i - 1];
        const dy = ys[i] - ys[i - 1];
        len[i] = len[i - 1] + Math.hypot(dx, dy);
        // scrolling advances mostly with height; sideways and looping
        // stretches still take some scrolling, so they are drawn, not jumped
        prog[i] = prog[i - 1] + Math.abs(dy) + Math.abs(dx) * 0.25;
      }
      d += `${i ? "L" : "M"}${xs[i].toFixed(1)} ${ys[i].toFixed(1)}`;
    }
    const total = len[n - 1];
    // Scroll → how far the arrow has got. Mostly "has it reached this height
    // yet" (the furthest point down so far), so the arrow keeps pace with the
    // page; half blended with distance travelled, so loops and sideways runs
    // are drawn over a little scrolling instead of appearing all at once.
    const key = new Float32Array(n);
    let runMax = ys[0];
    const y0 = ys[0];
    const yEnd = Math.max(ys[n - 1], y0 + 1);
    for (let i = 0; i < n; i++) {
      runMax = Math.max(runMax, ys[i]);
      const lin = y0 + (prog[i] / prog[n - 1]) * (yEnd - y0);
      key[i] = 0.5 * runMax + 0.5 * lin;
    }

    // how tightly the line bends at each point (for the arrow's pace)
    const head = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 2);
      const b = Math.min(n - 1, i + 2);
      head[i] = Math.atan2(ys[b] - ys[a], xs[b] - xs[a]);
    }
    const rawBend = new Float32Array(n);
    for (let i = 1; i < n - 1; i++) {
      let dh = head[i + 1] - head[i - 1];
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      const ds = Math.max(0.5, len[i + 1] - len[i - 1]);
      rawBend[i] = Math.min(1, (Math.abs(dh) / ds) * 55); // radius ≤ 55px counts as fully "tight"
    }
    const bend = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let m = 0;
      for (let j = Math.max(0, i - 8); j <= Math.min(n - 1, i + 8); j++) m = Math.max(m, rawBend[j]);
      bend[i] = m;
    }

    const H = root.scrollHeight;
    for (const svg of [back, front]) {
      svg.setAttribute("width", String(W));
      svg.setAttribute("height", String(H));
    }
    pathRefs.current.forEach((p) => {
      if (!p) return;
      p.setAttribute("d", d);
      p.style.strokeDasharray = `${total} ${total}`;
    });
    const setRect = (el: SVGRectElement | null, r: { x: number; y: number; w: number; h: number }, rx: number) => {
      if (!el) return;
      el.setAttribute("x", String(r.x));
      el.setAttribute("y", String(r.y));
      el.setAttribute("width", String(r.w));
      el.setAttribute("height", String(r.h));
      el.setAttribute("rx", String(rx));
    };
    setRect(btnClipRefs.current[0], sb, 16);
    setRect(btnClipRefs.current[1], eb, 16);
    // the closing card, minus the bottom button (inside the button only the
    // white copy shows, and that one moves with the button)
    const rr = (r: { x: number; y: number; w: number; h: number }, k: number) =>
      `M${r.x + k} ${r.y}H${r.x + r.w - k}A${k} ${k} 0 0 1 ${r.x + r.w} ${r.y + k}V${r.y + r.h - k}` +
      `A${k} ${k} 0 0 1 ${r.x + r.w - k} ${r.y + r.h}H${r.x + k}A${k} ${k} 0 0 1 ${r.x} ${r.y + r.h - k}` +
      `V${r.y + k}A${k} ${k} 0 0 1 ${r.x + k} ${r.y}Z`;
    cardClipRef.current?.setAttribute("d", rr(cr, 32) + rr(eb, 16));
    btns.current = [
      { el: startBtn, cx: sb.x + sb.w / 2, cy: sb.y + sb.h / 2 },
      { el: endBtn, cx: eb.x + eb.w / 2, cy: eb.y + eb.h / 2 },
    ];

    geo.current = {
      ok: true,
      rootTop: root.getBoundingClientRect().top + window.scrollY,
      xs,
      ys,
      len,
      prog: key,
      bend,
      total,
      endY: Z.y,
      startIcon,
      endIcon,
      minL: shaft,
      last: -1,
    };
  });

  // ── drawing at a given length along the route ──
  const draw = (Lin: number) => {
    const g = geo.current;
    const L = Math.max(g.minL, Lin);
    const n = g.xs.length;
    // sample at length L
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (g.len[mid] < L) lo = mid;
      else hi = mid;
    }
    const seg = g.len[hi] - g.len[lo];
    const t = seg > 0 ? Math.min(1, Math.max(0, (L - g.len[lo]) / seg)) : 0;
    const x = g.xs[lo] + (g.xs[hi] - g.xs[lo]) * t;
    const y = g.ys[lo] + (g.ys[hi] - g.ys[lo]) * t;
    // heading from a little behind the tip, levelled out over the last few
    // pixels so it settles exactly like the button's own arrow
    const back = Math.max(0, lo - 3);
    let ang = lo === 0 ? 0 : (Math.atan2(y - g.ys[back], x - g.xs[back]) * 180) / Math.PI;
    const toEnd = g.total - L;
    if (toEnd < 30) {
      const k = 1 - toEnd / 30;
      const e = k * k * (3 - 2 * k);
      ang = ang * (1 - e);
    }

    const off = String(g.total - L);
    pathRefs.current.forEach((p) => p && (p.style.strokeDashoffset = off));

    // one arrow, start to finish: the buttons' own icons stay hidden (they
    // only hold the space and mark where the arrow starts and lands)
    const tf = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${ang.toFixed(1)}deg)`;
    headRefs.current.forEach((h) => {
      if (!h) return;
      h.style.transform = tf;
      h.style.opacity = "1";
    });
  };

  // ── where the scroll says the arrow should be, and the arrow chasing it ──
  const chase = useRef({ L: -1, target: 0, raf: 0, lastT: 0 });

  const step = (now: number) => {
    const c = chase.current;
    const g = geo.current;
    c.raf = 0;
    if (!g.ok) return;
    const dt = c.lastT ? Math.min(3, (now - c.lastT) / 16.67) : 1; // in 60 fps frames
    c.lastT = now;
    const diff = c.target - c.L;
    if (Math.abs(diff) < 0.25) {
      c.L = c.target;
      draw(c.L);
      c.lastT = 0;
      return;
    }
    // bend at the arrow's current place
    const n = g.len.length;
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (g.len[mid] < c.L) lo = mid;
      else hi = mid;
    }
    const bend = g.bend[lo];
    // steady through loops and tight turns; on straighter runs, faster, and
    // faster still the further behind it is, to catch up
    // (after a big jump, say a tap on a link, even the bends speed up so it
    // never takes ages to get there)
    const vCurve = Math.max(4.4, Math.abs(diff) * 0.03);
    const vStraight = Math.max(9, Math.abs(diff) * 0.13);
    const vMax = vStraight + (vCurve - vStraight) * bend;
    const move = Math.min(Math.abs(diff) * 0.2 + 0.5, vMax) * dt;
    c.L += Math.sign(diff) * Math.min(move, Math.abs(diff));
    draw(c.L);
    c.raf = requestAnimationFrame(step);
  };

  useScrollFrame({
    write: (f) => {
      const g = geo.current;
      if (!g.ok) return;
      const n = g.xs.length;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - f.vh);
      const arrive = Math.min(maxScroll, g.rootTop + g.endY - f.vh * ARRIVE_AT);
      const u = reduced || arrive <= 0 ? 1 : Math.min(1, Math.max(0, f.y / arrive));
      const target = g.prog[0] + u * (g.prog[n - 1] - g.prog[0]);

      // the length along the route that matches this scroll position
      let lo = 0;
      let hi = n - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (g.prog[mid] < target) lo = mid;
        else hi = mid;
      }
      const span = g.prog[hi] - g.prog[lo];
      const t = span > 0 ? Math.min(1, Math.max(0, (target - g.prog[lo]) / span)) : 0;
      const L = g.len[lo] + (g.len[hi] - g.len[lo]) * t;

      const c = chase.current;
      c.target = L;
      if (c.L < 0 || reduced) {
        // first frame (or reduced motion): be there already
        c.L = L;
        draw(L);
        return;
      }
      if (!c.raf) c.raf = requestAnimationFrame(step);
    },
  });

  useEffect(() => () => cancelAnimationFrame(chase.current.raf), []);

  // ── the white arrow leans with its button (the mouse pull on the button) ──
  useEffect(() => {
    let raf = 0;
    let until = 0;
    const sync = () => {
      raf = 0;
      btns.current.forEach((b, i) => {
        const g = btnGroupRefs.current[i];
        if (!g) return;
        const t = getComputedStyle(b.el).transform;
        if (!t || t === "none") {
          g.removeAttribute("transform");
          return;
        }
        const v = t.slice(t.indexOf("(") + 1, -1).split(",").map(Number);
        const m = t.startsWith("matrix3d") ? [v[0], v[1], v[4], v[5], v[12], v[13]] : v;
        g.setAttribute(
          "transform",
          `translate(${b.cx} ${b.cy}) matrix(${m.map((n) => n.toFixed(4)).join(" ")}) translate(${-b.cx} ${-b.cy})`,
        );
      });
      if (performance.now() < until) raf = requestAnimationFrame(sync);
    };
    // follow for a while after any pointer activity (the button eases back)
    const poke = () => {
      until = performance.now() + 700;
      if (!raf) raf = requestAnimationFrame(sync);
    };
    const opts = { passive: true } as const;
    window.addEventListener("pointermove", poke, opts);
    window.addEventListener("pointerdown", poke, opts);
    window.addEventListener("pointerup", poke, opts);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", poke);
      window.removeEventListener("pointerdown", poke);
      window.removeEventListener("pointerup", poke);
    };
  }, []);

  const line = (i: number, cls: string) => (
    <path ref={(el) => (pathRefs.current[i] = el)} className={cls} style={{ strokeDasharray: "0 100000" }} />
  );
  const head = (i: number, cls: string) => (
    <g ref={(el) => (headRefs.current[i] = el)} style={{ opacity: 0 }}>
      {/* soft light-blue glow behind the arrowhead */}
      <circle r="13" cx="-3" fill={`url(#${uid}-glow-${i})`} />
      <path d="M -9 -7 L 0.5 0 L -9 7" className={cls} />
    </g>
  );
  const glow = (i: number) => (
    <radialGradient id={`${uid}-glow-${i}`}>
      <stop offset="0%" stopColor="hsl(230 100% 74%)" stopOpacity="0.75" />
      <stop offset="55%" stopColor="hsl(230 100% 74%)" stopOpacity="0.28" />
      <stop offset="100%" stopColor="hsl(230 100% 74%)" stopOpacity="0" />
    </radialGradient>
  );

  return (
    <>
      {/* under the content: cards and boxes hide it as it passes behind */}
      <svg ref={backRef} aria-hidden className="pointer-events-none absolute left-0 top-0 z-0 overflow-visible" fill="none">
        <defs>{glow(0)}</defs>
        {line(0, "arrow-line")}
        {head(0, "arrow-head")}
      </svg>
      {/* over the content: on the closing card, and white inside the buttons */}
      <svg ref={frontRef} aria-hidden className="pointer-events-none absolute left-0 top-0 z-30 overflow-visible" fill="none">
        <defs>
          {glow(1)}
          {glow(2)}
          {glow(3)}
          <clipPath id={`${uid}-card`}>
            <path ref={cardClipRef} clipRule="evenodd" />
          </clipPath>
          <clipPath id={`${uid}-btn0`}>
            <rect ref={(el) => (btnClipRefs.current[0] = el)} />
          </clipPath>
          <clipPath id={`${uid}-btn1`}>
            <rect ref={(el) => (btnClipRefs.current[1] = el)} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${uid}-card)`}>
          {line(1, "arrow-line arrow-line-paper")}
          {head(1, "arrow-head")}
        </g>
        {/* white inside each button; each group moves with its button */}
        <g ref={(el) => (btnGroupRefs.current[0] = el)}>
          <g clipPath={`url(#${uid}-btn0)`}>
            {line(2, "arrow-line arrow-line-white")}
            {head(2, "arrow-head arrow-head-white")}
          </g>
        </g>
        <g ref={(el) => (btnGroupRefs.current[1] = el)}>
          <g clipPath={`url(#${uid}-btn1)`}>
            {line(3, "arrow-line arrow-line-white")}
            {head(3, "arrow-head arrow-head-white")}
          </g>
        </g>
      </svg>
    </>
  );
}
