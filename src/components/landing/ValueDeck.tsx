// src/components/landing/ValueDeck.tsx
//
// The three "why SpeakBusy" cards. On a wide screen they arrive as one
// stacked, fanned deck in the middle and are dealt out into their places as
// you scroll; scrolling back gathers them up again. On a phone, where they
// sit in one column, each card swings in from alternating sides instead.
// Every position is tied to the scroll, not to a timer.
//
// The outer element carries the scroll transform; the inner paper card keeps
// its own hover lift, so the two never fight over `transform`.

import { useRef, useState, type ComponentType } from "react";
import {
  easeOutCubic,
  pageTop,
  progress,
  useCountUp,
  useMeasure,
  useReducedMotion,
  useScrollFrame,
} from "@/lib/motion";

export type ValueItem = {
  icon: ComponentType<{ className?: string }>;
  count?: number;
  title: string;
  body: string;
};

/** Resting tilt once dealt: paper on a desk, never quite square. */
const TILT = [-1.2, 0.8, -0.6];
/** Rotation of each card while stacked in the deck. */
const FAN = [-7, 2, 9];

function Card({ item, counting }: { item: ValueItem; counting: boolean }) {
  const numRef = useRef<HTMLSpanElement>(null);
  useCountUp(numRef, item.count ?? 0, counting && !!item.count);
  const Icon = item.icon;
  return (
    <div className="paper-card lift h-full rounded-[22px] p-7 sm:p-8">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-paper-btn text-paper mb-6">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-bold ka text-paper-ink mb-2 leading-snug">
        {item.count ? (
          <>
            <span ref={numRef} className="tabular-nums">
              {item.count}
            </span>{" "}
          </>
        ) : null}
        {item.title}
      </h3>
      <p className="text-sm text-paper-ink-muted leading-relaxed ka">{item.body}</p>
    </div>
  );
}

export default function ValueDeck({ items }: { items: ValueItem[] }) {
  const reduced = useReducedMotion();
  const gridRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [counting, setCounting] = useState(false);
  const countingRef = useRef(false);
  const geo = useRef({ top: 0, wide: false, dx: [] as number[], tops: [] as number[] });

  useMeasure(gridRef, () => {
    const grid = gridRef.current;
    if (!grid) return;
    const cw = grid.clientWidth;
    const top = pageTop(grid);
    const cards = cardRefs.current;
    // offsetLeft/offsetTop ignore transforms, so these are the dealt positions
    const dx = cards.map((c) => (c ? cw / 2 - (c.offsetLeft + c.offsetWidth / 2) : 0));
    const tops = cards.map((c) => (c ? top + c.offsetTop : top));
    const wide = cards.length > 1 && cards[0] !== null && cards[1] !== null && cards[0]!.offsetTop === cards[1]!.offsetTop;
    geo.current = { top, wide, dx, tops };
  });

  useScrollFrame({
    write: (f) => {
      const g = geo.current;
      const cards = cardRefs.current;
      let start = false;
      if (reduced) {
        cards.forEach((c, i) => {
          if (c) c.style.transform = `rotate(${TILT[i] ?? 0}deg)`;
        });
        start = true;
      } else if (g.wide) {
        // dealt while the row travels from 92% to 40% of the screen
        const p = progress(f.y + f.vh * 0.92, g.top, g.top + f.vh * 0.52);
        cards.forEach((c, i) => {
          if (!c) return;
          const e = easeOutCubic(progress(p, i * 0.12, 0.76 + i * 0.12));
          const k = 1 - e;
          const x = g.dx[i] * k;
          const y = k * (40 - i * 8);
          const r = k * FAN[i] + e * (TILT[i] ?? 0);
          c.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${r.toFixed(2)}deg)`;
        });
        start = p > 0.55;
      } else {
        cards.forEach((c, i) => {
          if (!c) return;
          const e = easeOutCubic(progress(f.y + f.vh * 0.96, g.tops[i], g.tops[i] + f.vh * 0.38));
          const k = 1 - e;
          const side = i % 2 ? 1 : -1;
          c.style.transform = `translate3d(${(side * 64 * k).toFixed(1)}px, ${(30 * k).toFixed(1)}px, 0) rotate(${(
            side * 8 * k +
            e * (TILT[i] ?? 0)
          ).toFixed(2)}deg)`;
          c.style.opacity = (0.25 + 0.75 * e).toFixed(3);
          if (i === 0 && e > 0.5) start = true;
        });
      }
      if (start && !countingRef.current) {
        countingRef.current = true;
        setCounting(true);
      }
    },
  });

  return (
    <div ref={gridRef} data-thread className="relative grid gap-6 md:gap-7 md:grid-cols-3">
      {items.map((item, i) => (
        <div
          key={item.title}
          ref={(el) => (cardRefs.current[i] = el)}
          className="relative will-change-transform"
          style={{ zIndex: i }}
        >
          <Card item={item} counting={counting} />
        </div>
      ))}
    </div>
  );
}
