// src/components/landing/HeroDeck.tsx
//
// The landing hero's moving part: a small deck of paper flashcards, the same
// sand "paper" colour as the session card inside the app. The front card turns
// over between English and Georgian (the hook that works best in the ads),
// then the next word comes up. With a mouse, the deck leans toward the cursor
// with a little depth between the cards. Tap or click it to turn it yourself.
//
// Words are copied from the real bank (vocabBank.ts), not invented, so the
// translations match what the app teaches. Importing the bank here would drag
// 144 KB into the landing bundle, so the five pairs are inlined.
//
// Motion rules: transform/opacity only, written to the elements directly; the
// pointer loop stops when it settles; reduced motion keeps the deck still and
// turns cards only on tap.

import { useEffect, useRef, useState, type RefObject } from "react";
import { hasFinePointer, useReducedMotion } from "@/lib/motion";

const WORDS = [
  { en: "Deadline", ka: "ბოლო ვადა" },
  { en: "Feedback", ka: "უკუკავშირი" },
  { en: "Agenda", ka: "დღის წესრიგი" },
  { en: "Stakeholder", ka: "დაინტერესებული მხარე" },
  { en: "Negotiate", ka: "მოლაპარაკება" },
];

const FLIP_MS = 700;
const HOLD_MS = 2400;

/** The fan is tighter on a phone so the back cards stay on screen. */
function poseSpread() {
  return typeof window !== "undefined" && window.innerWidth < 640 ? 0.55 : 1;
}

/** Resting pose of the three cards, back to front. */
const POSE = [
  { x: 34, y: -26, r: 7, depth: 0.45 },
  { x: -30, y: -12, r: -6, depth: 0.7 },
  { x: 0, y: 0, r: -1.5, depth: 1 },
];

export default function HeroDeck({ pointerArea }: { pointerArea?: RefObject<HTMLElement> }) {
  const reduced = useReducedMotion();
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [showBack, setShowBack] = useState(false);
  const [frontIdx, setFrontIdx] = useState(0);
  const [backIdx, setBackIdx] = useState(0);
  const paused = useRef(false);

  // Auto-turn: English, then Georgian, then the next word's English.
  // Each face's word is swapped only while that face is hidden.
  useEffect(() => {
    if (reduced) return;
    let alive = true;
    let timer = 0;
    const step = (toBack: boolean) => {
      timer = window.setTimeout(() => {
        if (!alive) return;
        if (paused.current || document.hidden) return step(toBack);
        setShowBack(toBack);
        window.setTimeout(() => {
          if (!alive) return;
          if (toBack) setFrontIdx((i) => (i + 1) % WORDS.length);
          else setBackIdx((i) => (i + 1) % WORDS.length);
        }, FLIP_MS);
        step(!toBack);
      }, HOLD_MS);
    };
    step(true);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [reduced]);

  // Lean toward the cursor. Mouse only.
  useEffect(() => {
    if (reduced || !hasFinePointer()) return;
    const area = pointerArea?.current ?? cardRefs.current[2]?.parentElement;
    if (!area) return;
    const spread = poseSpread();
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    let raf = 0;
    const apply = () => {
      cur.x += (target.x - cur.x) * 0.09;
      cur.y += (target.y - cur.y) * 0.09;
      cardRefs.current.forEach((el, i) => {
        if (!el) return;
        const p = POSE[i];
        const tx = p.x * spread + cur.x * 18 * p.depth;
        const ty = p.y * spread + cur.y * 12 * p.depth;
        el.style.transform =
          `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) ` +
          `rotate(${p.r}deg) rotateX(${(-cur.y * 7 * p.depth).toFixed(2)}deg) ` +
          `rotateY(${(cur.x * 9 * p.depth).toFixed(2)}deg)`;
      });
      if (Math.abs(target.x - cur.x) + Math.abs(target.y - cur.y) > 0.002) {
        raf = requestAnimationFrame(apply);
      } else {
        raf = 0;
      }
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const move = (e: PointerEvent) => {
      const r = area.getBoundingClientRect();
      target.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      target.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      kick();
    };
    const leave = () => {
      target.x = 0;
      target.y = 0;
      kick();
    };
    area.addEventListener("pointermove", move);
    area.addEventListener("pointerleave", leave);
    return () => {
      area.removeEventListener("pointermove", move);
      area.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(raf);
    };
  }, [reduced, pointerArea]);

  const turn = () => {
    setShowBack((b) => {
      const next = !b;
      window.setTimeout(() => {
        if (next) setFrontIdx((i) => (i + 1) % WORDS.length);
        else setBackIdx((i) => (i + 1) % WORDS.length);
      }, FLIP_MS);
      return next;
    });
  };

  const front = WORDS[frontIdx];
  const back = WORDS[backIdx];

  return (
    <div
      className="hero-deck relative mx-auto w-[230px] sm:w-[300px] lg:w-[290px] xl:w-[320px] aspect-[16/10] sm:aspect-[4/3] [perspective:1100px]"
      onPointerEnter={() => (paused.current = true)}
      onPointerLeave={() => (paused.current = false)}
    >
      {/* two blank cards behind, for the deck's depth */}
      {[0, 1].map((i) => (
        <div
          key={i}
          ref={(el) => (cardRefs.current[i] = el)}
          aria-hidden
          className="hero-deal absolute inset-0 rounded-[22px] paper-card"
          style={{
            transform: `translate3d(${POSE[i].x * poseSpread()}px, ${POSE[i].y * poseSpread()}px, 0) rotate(${POSE[i].r}deg)`,
            animationDelay: `${380 + i * 110}ms`,
          }}
        >
          <div className="absolute inset-x-6 top-6 h-2 rounded-full bg-paper-3/70" />
          <div className="absolute inset-x-6 top-11 h-2 w-1/2 rounded-full bg-paper-3/60" />
        </div>
      ))}

      {/* the front card, which turns over */}
      <div
        ref={(el) => (cardRefs.current[2] = el)}
        className="hero-deal absolute inset-0"
        style={{
          transform: `translate3d(${POSE[2].x}px, ${POSE[2].y}px, 0) rotate(${POSE[2].r}deg)`,
          animationDelay: "600ms",
          transformStyle: "preserve-3d",
        }}
      >
        <button
          type="button"
          onClick={turn}
          aria-label={`${front.en}: ${showBack ? back.ka : "გადააბრუნე თარგმანის სანახავად"}`}
          className="group absolute inset-0 rounded-[22px] [transform-style:preserve-3d] transition-transform duration-700 ease-[cubic-bezier(0.77,0,0.175,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rule focus-visible:ring-offset-4 focus-visible:ring-offset-cream"
          style={{ transform: showBack ? "rotateY(180deg)" : "rotateY(0deg)" }}
        >
          {/* English face */}
          <span className="paper-card absolute inset-0 rounded-[22px] [backface-visibility:hidden] flex flex-col items-start justify-between p-5 sm:p-7 text-left">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-paper-ink-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-cta" />
              English
            </span>
            <span className="text-[1.7rem] sm:text-[2.3rem] font-extrabold tracking-tight text-paper-ink leading-none">
              {front.en}
            </span>
            <span className="ka text-[11px] font-semibold text-paper-ink-muted">შეეხე, რომ გადააბრუნო</span>
          </span>
          {/* Georgian face */}
          <span className="paper-card absolute inset-0 rounded-[22px] [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col items-start justify-between p-5 sm:p-7 text-left">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-paper-ink-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-cta" />
              <span className="ka">ქართულად</span>
            </span>
            <span className="ka text-[1.3rem] sm:text-[1.75rem] font-extrabold text-paper-ink leading-tight">
              {back.ka}
            </span>
            <span className="text-[12px] font-semibold text-paper-ink-muted">{back.en}</span>
          </span>
        </button>
      </div>
    </div>
  );
}
