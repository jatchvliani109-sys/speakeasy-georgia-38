// src/components/landing/MatchBoard.tsx
//
// The matching exercise, played by the page: English words on the left,
// their Georgian on the right in a different order, and as you scroll, ink
// lines draw from each word to its translation, one pair after another. A
// matched pair turns charcoal. Scroll back up and the lines rewind.
//
// Pairs are copied from the real bank (vocabBank.ts). Line positions are
// measured from the chips, so they stay attached at any width.

import { useRef, useState } from "react";
import {
  easeInOutCubic,
  pageTop,
  progress,
  useMeasure,
  useReducedMotion,
  useScrollFrame,
} from "@/lib/motion";

const PAIRS = [
  { en: "Deadline", ka: "ბოლო ვადა" },
  { en: "Feedback", ka: "უკუკავშირი" },
  { en: "Revenue", ka: "შემოსავალი" },
  { en: "Agenda", ka: "დღის წესრიგი" },
];
/** Order of the Georgian column: index into PAIRS. */
const KA_ORDER = [2, 0, 3, 1];

export default function MatchBoard() {
  const reduced = useReducedMotion();
  const boardRef = useRef<HTMLDivElement>(null);
  const enRefs = useRef<(HTMLDivElement | null)[]>([]);
  const kaRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const [paths, setPaths] = useState<string[]>([]);
  const geo = useRef({ top: 0, height: 0, lengths: [] as number[], matched: [] as boolean[] });

  useMeasure(boardRef, () => {
    const board = boardRef.current;
    if (!board) return;
    const b = board.getBoundingClientRect();
    const d = PAIRS.map((_, i) => {
      const en = enRefs.current[i];
      const ka = kaRefs.current[KA_ORDER.indexOf(i)];
      if (!en || !ka) return "";
      const er = en.getBoundingClientRect();
      const kr = ka.getBoundingClientRect();
      const x1 = er.right - b.left;
      const y1 = er.top - b.top + er.height / 2;
      const x2 = kr.left - b.left;
      const y2 = kr.top - b.top + kr.height / 2;
      const mid = (x1 + x2) / 2;
      return `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${mid.toFixed(1)} ${y1.toFixed(1)}, ${mid.toFixed(
        1,
      )} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    });
    setPaths(d);
    geo.current.top = pageTop(board);
    geo.current.height = b.height;
    // lengths are read after React has written the new paths
    requestAnimationFrame(() => {
      geo.current.lengths = pathRefs.current.map((p) => (p ? p.getTotalLength() : 0));
      pathRefs.current.forEach((p, i) => {
        const L = geo.current.lengths[i];
        if (p) p.style.strokeDasharray = `${L} ${L}`;
      });
      geo.current.matched = [];
    });
  });

  useScrollFrame({
    write: (f) => {
      const g = geo.current;
      if (!g.lengths.length) return;
      // whole sequence plays while the board travels from 85% to 30% of the screen
      const p = reduced ? 1 : progress(f.y + f.vh * 0.85, g.top, g.top + g.height + f.vh * 0.25);
      PAIRS.forEach((_, i) => {
        const path = pathRefs.current[i];
        if (!path) return;
        const local = easeInOutCubic(progress(p, i * 0.22, i * 0.22 + 0.3));
        const L = g.lengths[i];
        path.style.strokeDashoffset = String(L * (1 - local));
        const matched = local > 0.98;
        if (matched !== g.matched[i]) {
          g.matched[i] = matched;
          enRefs.current[i]?.classList.toggle("is-matched", matched);
          kaRefs.current[KA_ORDER.indexOf(i)]?.classList.toggle("is-matched", matched);
        }
      });
    },
  });

  const chip =
    "match-chip relative z-[1] rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[14px] sm:text-base font-bold";

  return (
    <div
      ref={boardRef}
      data-thread
      className="paper-card relative rounded-[26px] px-4 py-6 sm:px-10 sm:py-9 max-w-2xl mx-auto"
    >
      <div className="grid grid-cols-2 gap-x-10 sm:gap-x-28 gap-y-3 sm:gap-y-4">
        <p className="text-[11px] font-semibold text-paper-ink-muted">English</p>
        <p className="ka text-[11px] font-semibold text-paper-ink-muted text-right">ქართულად</p>
        {PAIRS.map((pair, row) => {
          const ka = PAIRS[KA_ORDER[row]];
          return (
            <div key={pair.en} className="contents">
              <div ref={(el) => (enRefs.current[row] = el)} className={`${chip} justify-self-start`}>
                {pair.en}
              </div>
              <div ref={(el) => (kaRefs.current[row] = el)} className={`${chip} ka justify-self-end text-right`}>
                {ka.ka}
              </div>
            </div>
          );
        })}
      </div>

      <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" fill="none">
        {paths.map((d, i) => (
          <g key={i}>
            <path d={d} className="match-guide" />
            <path ref={(el) => (pathRefs.current[i] = el)} d={d} className="match-ink" />
          </g>
        ))}
      </svg>
    </div>
  );
}
