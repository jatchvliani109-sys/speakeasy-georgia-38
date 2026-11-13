// src/components/landing/HeroField.tsx
//
// The space around the hero flashcards:
//  - HeroBackdrop: a dotted page that drifts slower than the scroll (depth),
//    and a soft sand light that follows the mouse.
//  - FloatChips: small paper word chips hovering around the deck at different
//    depths. They bob on their own, lean with the mouse (nearer chips move
//    more) and rise at different speeds as you scroll away.
//
// Words come from the vocab bank. Pointer effects are mouse-only; scroll
// depth works on phones too. Everything writes transform / opacity only.

import { useEffect, useRef, type RefObject } from "react";
import { hasFinePointer, useReducedMotion, useScrollFrame } from "@/lib/motion";

/* ───────────── shared pointer state for the hero ───────────── */

function usePointerLerp(area: RefObject<HTMLElement>, onFrame: (x: number, y: number) => void) {
  const reduced = useReducedMotion();
  const cb = useRef(onFrame);
  cb.current = onFrame;
  useEffect(() => {
    const el = area.current;
    if (!el || reduced || !hasFinePointer()) return;
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    let raf = 0;
    const step = () => {
      cur.x += (target.x - cur.x) * 0.08;
      cur.y += (target.y - cur.y) * 0.08;
      cb.current(cur.x, cur.y);
      raf = Math.abs(target.x - cur.x) + Math.abs(target.y - cur.y) > 0.001 ? requestAnimationFrame(step) : 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(step);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      target.y = ((e.clientY - r.top) / r.height) * 2 - 1;
      kick();
    };
    const leave = () => {
      target.x = 0;
      target.y = 0;
      kick();
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(raf);
    };
  }, [area, reduced]);
}

/* ───────────── backdrop ───────────── */

export function HeroBackdrop({ heroRef }: { heroRef: RefObject<HTMLElement> }) {
  const reduced = useReducedMotion();
  const dotsRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);

  useScrollFrame(
    {
      write: (f) => {
        if (f.y > f.vh * 1.2) return;
        if (dotsRef.current) dotsRef.current.style.transform = `translate3d(0, ${(f.y * 0.35).toFixed(1)}px, 0)`;
      },
    },
    !reduced,
  );

  usePointerLerp(heroRef, (x, y) => {
    const hero = heroRef.current;
    const light = lightRef.current;
    if (!hero || !light) return;
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    light.style.opacity = "1";
    light.style.transform = `translate3d(${((x + 1) / 2 * w - 320).toFixed(1)}px, ${((y + 1) / 2 * h - 320).toFixed(
      1,
    )}px, 0)`;
  });

  return (
    <>
      <div
        ref={dotsRef}
        aria-hidden
        className="hero-dots pointer-events-none absolute inset-x-0 -top-10 h-[130%] will-change-transform"
      />
      <div
        ref={lightRef}
        aria-hidden
        className="hero-light pointer-events-none absolute left-0 top-0 h-[640px] w-[640px] rounded-full opacity-0 transition-opacity duration-700 will-change-transform"
      />
    </>
  );
}

/* ───────────── chips around the deck ───────────── */

const CHIPS = [
  { t: "KPI", ka: false, pos: "-left-[14%] -top-[16%]", depth: 1.25, bob: 5.2, front: true },
  { t: "Follow up", ka: false, pos: "-right-[16%] top-[30%]", depth: 0.75, bob: 6.4, front: true },
  { t: "შემოსავალი", ka: true, pos: "-left-[20%] -bottom-[17%]", depth: 0.95, bob: 5.8, front: true },
  { t: "Approve", ka: false, pos: "-right-[8%] -bottom-[24%]", depth: 1.1, bob: 7.1, front: true },
  { t: "შეჯამება", ka: true, pos: "left-[34%] -top-[34%] hidden lg:block", depth: 0.5, bob: 6.9, front: false },
];

export function FloatChips({ heroRef }: { heroRef: RefObject<HTMLElement> }) {
  const reduced = useReducedMotion();
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const mouse = useRef({ x: 0, y: 0 });
  const scroll = useRef(0);

  const paint = () => {
    refs.current.forEach((el, i) => {
      if (!el) return;
      const d = CHIPS[i].depth;
      const x = mouse.current.x * 26 * d;
      const y = mouse.current.y * 18 * d - scroll.current * 0.22 * d;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${(mouse.current.x * 6 * d).toFixed(
        2,
      )}deg)`;
    });
  };

  useScrollFrame(
    {
      write: (f) => {
        if (f.y > f.vh * 1.3) return;
        scroll.current = f.y;
        paint();
      },
    },
    !reduced,
  );

  usePointerLerp(heroRef, (x, y) => {
    mouse.current = { x, y };
    paint();
  });

  return (
    <>
      {CHIPS.map((c, i) => (
        <div
          key={c.t}
          ref={(el) => (refs.current[i] = el)}
          aria-hidden
          className={`pointer-events-none absolute ${c.pos} ${c.front ? "z-20" : "z-0"} will-change-transform`}
        >
          <div
            className="float-bob paper-card rounded-xl px-3 py-1.5 sm:px-3.5 sm:py-2 text-[12px] sm:text-sm font-bold text-paper-ink whitespace-nowrap"
            style={{
              ["--bob" as string]: `${c.bob}s`,
              ["--bob-delay" as string]: `${-i * 1.3}s`,
              ["--in-delay" as string]: `${900 + i * 110}ms`,
            }}
          >
            <span className={c.ka ? "ka" : ""}>{c.t}</span>
          </div>
        </div>
      ))}
    </>
  );
}
