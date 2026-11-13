// src/components/landing/WordMarquee.tsx
//
// Two rows of paper word chips gliding in opposite directions: English with
// its Georgian underneath. Scrolling pushes them: the faster you scroll, the
// faster they run and the more they lean, then they ease back to a drift.
//
// Words and translations are copied from the real bank (vocabBank.ts).
//
// Runs its own animation loop only while the band is on screen. Each frame
// writes one transform per row. Reduced motion: the rows stand still.
//
// Seamless loop: each row holds the word list COPIES times and slides back by
// exactly one copy's width (measured, gaps included), so there is always more
// row than screen, even on a wide monitor with the band tilted.

import { useEffect, useRef } from "react";
import { scrollVelocity, useReducedMotion } from "@/lib/motion";

const ROW_A = [
  { en: "Deadline", ka: "ბოლო ვადა" },
  { en: "Revenue", ka: "შემოსავალი" },
  { en: "Stakeholder", ka: "დაინტერესებული მხარე" },
  { en: "Invoice", ka: "ანგარიშფაქტურა" },
  { en: "Priority", ka: "პრიორიტეტი" },
  { en: "Negotiate", ka: "მოლაპარაკება" },
  { en: "Summary", ka: "შეჯამება" },
  { en: "Blocker", ka: "შემაფერხებელი" },
];
const ROW_B = [
  { en: "Feedback", ka: "უკუკავშირი" },
  { en: "Agenda", ka: "დღის წესრიგი" },
  { en: "Approve", ka: "დამტკიცება" },
  { en: "Accountability", ka: "ანგარიშვალდებულება" },
  { en: "Client", ka: "კლიენტი" },
  { en: "Outcome", ka: "შედეგი" },
  { en: "Engagement", ka: "ჩართულობა" },
  { en: "Scalable", ka: "მასშტაბირებადი" },
];

const DRIFT = 0.45; // px per frame at rest
const COPIES = 5;

function Row({
  words,
  rowRef,
}: {
  words: typeof ROW_A;
  rowRef: (el: HTMLDivElement | null) => void;
}) {
  const all = Array.from({ length: COPIES }, () => words).flat();
  return (
    <div ref={rowRef} className="flex w-max gap-3 sm:gap-4 will-change-transform">
      {all.map((w, i) => (
        <div
          key={i}
          aria-hidden={i >= words.length}
          className="paper-card shrink-0 rounded-2xl px-5 py-3 sm:px-6 sm:py-3.5"
        >
          <p className="text-[15px] sm:text-lg font-extrabold text-paper-ink leading-tight">{w.en}</p>
          <p className="ka text-[12px] sm:text-[13px] font-semibold text-paper-ink-muted leading-tight mt-0.5">
            {w.ka}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function WordMarquee() {
  const reduced = useReducedMotion();
  const bandRef = useRef<HTMLDivElement>(null);
  const rows = useRef<(HTMLDivElement | null)[]>([null, null]);

  useEffect(() => {
    const band = bandRef.current;
    if (!band || reduced) return;
    let raf = 0;
    let visible = false;
    const x = [0, 0];
    let skew = 0;
    let push = 0;
    // one copy's width: from the first chip to the first chip of copy two
    const period = [0, 0];
    const measure = () => {
      rows.current.forEach((row, i) => {
        if (!row) return;
        const n = (i === 0 ? ROW_A : ROW_B).length;
        const a = row.children[0] as HTMLElement | undefined;
        const b = row.children[n] as HTMLElement | undefined;
        if (a && b) period[i] = b.offsetLeft - a.offsetLeft;
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    rows.current.forEach((r) => r && ro.observe(r));
    document.fonts?.ready.then(measure).catch(() => {});

    const tick = () => {
      raf = 0;
      if (!visible) return;
      const v = scrollVelocity();
      // scrolling adds speed in the scroll's direction, then fades out
      push = push * 0.9 + v * 0.1;
      skew += (Math.max(-9, Math.min(9, v * 0.45)) - skew) * 0.12;
      rows.current.forEach((row, i) => {
        const P = period[i];
        if (!row || !P) return;
        const dir = i === 0 ? -1 : 1;
        x[i] += dir * (DRIFT + Math.abs(push) * 0.9);
        // wrap by exactly one copy, so the jump is invisible; the row stays
        // between -2 and -1 copies, with two more copies covering the screen
        while (x[i] <= -2 * P) x[i] += P;
        while (x[i] > -P) x[i] -= P;
        row.style.transform = `translate3d(${x[i].toFixed(2)}px,0,0) skewX(${(dir * -skew).toFixed(2)}deg)`;
      });
      raf = requestAnimationFrame(tick);
    };

    // start one copy in (so there is row on both sides of the screen); the
    // second row half a list further, so the two rows don't line up
    x[0] = -period[0] * 1.0 - 1;
    x[1] = -period[1] * 1.5;
    // place both rows now, not on the first animation frame, so the band
    // never shows a row sitting at its untransformed start
    rows.current.forEach((row, i) => {
      if (row && period[i]) row.style.transform = `translate3d(${x[i].toFixed(2)}px,0,0)`;
    });

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(tick);
      },
      { rootMargin: "80px 0px" },
    );
    io.observe(band);
    return () => {
      io.disconnect();
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return (
    <div
      ref={bandRef}
      data-thread
      aria-label="ბიზნეს სიტყვები ქართული თარგმანით"
      className="relative overflow-hidden bg-paper-btn py-6 sm:py-8 -rotate-[1.5deg] scale-[1.04] border-y border-paper/10"
    >
      <div className="flex flex-col gap-3 sm:gap-4">
        <Row words={ROW_A} rowRef={(el) => (rows.current[0] = el)} />
        <Row words={ROW_B} rowRef={(el) => (rows.current[1] = el)} />
      </div>
    </div>
  );
}
