// src/components/landing/ScrollTiki.tsx
//
// Tiki, the app's cat, walking along the bottom of the closing card, driven
// by the scroll rather than a timer: scroll down and he walks in, legs moving
// with the distance he covers, then lies down and falls asleep under the
// button. Scroll back up and he gets up and walks back out, facing the way he
// is going.
//
// Uses the same sprite sheet as the app (public/tiki.png: 55 frames, 87x88;
// frames 0-10 are one walk cycle, 22-54 the settle into sleep).

import { useRef, useState } from "react";
import { pageTop, progress, useMeasure, useReducedMotion, useScrollFrame } from "@/lib/motion";

const SHEET = "/tiki.png";
const TOTAL_FRAMES = 55;
const WALK_CYCLE = 11;
const SETTLE_START = 22;
const CELL_W = 87;
const CELL_H = 88;
const STRIDE_PX = 7; // px walked per walk frame, so the feet don't skate

export default function ScrollTiki({
  trackRef,
  size = 58,
  restAt = 0.62,
}: {
  /** The element he walks across (its width) and whose position drives him. */
  trackRef: React.RefObject<HTMLElement>;
  size?: number;
  /** Where he lies down, as a fraction of the track width. */
  restAt?: number;
}) {
  const reduced = useReducedMotion();
  const w = Math.round((CELL_W / CELL_H) * size);
  const moverRef = useRef<HTMLDivElement>(null);
  const spriteRef = useRef<HTMLDivElement>(null);
  const [asleep, setAsleep] = useState(false);
  const geo = useRef({ top: 0, width: 0, lastX: -1, facing: 1, asleep: false });

  useMeasure(trackRef, () => {
    const t = trackRef.current;
    if (!t) return;
    geo.current.top = pageTop(t);
    geo.current.width = t.clientWidth;
  });

  useScrollFrame({
    write: (f) => {
      const g = geo.current;
      const mover = moverRef.current;
      const sprite = spriteRef.current;
      if (!mover || !sprite || !g.width) return;
      const restX = g.width * restAt - w / 2;
      // the whole walk plays while the card rises from the bottom of the
      // screen to a little above the middle
      const p = reduced ? 1 : progress(f.y + f.vh, g.top + 40, g.top + f.vh * 0.62);
      const WALK_END = 0.78;
      let x: number;
      let frame: number;
      if (p < WALK_END) {
        const wp = p / WALK_END;
        x = -w + (restX + w) * wp;
        frame = Math.floor(Math.abs(x + w) / STRIDE_PX) % WALK_CYCLE;
      } else {
        x = restX;
        const sp = (p - WALK_END) / (1 - WALK_END);
        frame = SETTLE_START + Math.round(sp * (TOTAL_FRAMES - 1 - SETTLE_START));
      }
      // face the direction of travel while walking
      if (g.lastX >= 0 && p < WALK_END && Math.abs(x - g.lastX) > 0.3) {
        g.facing = x >= g.lastX ? 1 : -1;
      }
      if (p >= WALK_END) g.facing = 1;
      g.lastX = x;
      mover.style.transform = `translate3d(${x.toFixed(1)}px,0,0) scaleX(${g.facing})`;
      sprite.style.backgroundPositionX = `${-frame * w}px`;
      const nowAsleep = p >= 0.999;
      if (nowAsleep !== g.asleep) {
        g.asleep = nowAsleep;
        setAsleep(nowAsleep);
      }
    },
  });

  return (
    <div
      aria-hidden
      className={`pointer-events-none relative h-[60px] text-paper-ink-muted ${asleep ? "tiki-asleep" : ""}`}
      style={{ height: size + 2 }}
    >
      <div ref={moverRef} className="absolute bottom-0 left-0 will-change-transform" style={{ width: w, height: size }}>
        <div
          ref={spriteRef}
          style={{
            width: w,
            height: size,
            backgroundImage: `url(${SHEET})`,
            backgroundSize: `${w * TOTAL_FRAMES}px ${size}px`,
            backgroundRepeat: "no-repeat",
          }}
        />
      </div>
      {/* sleep z's, above where he lies down (outside the flipped mover) */}
      <div className="absolute" style={{ left: `calc(${restAt * 100}% + ${w * 0.18}px)`, top: size * 0.25 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="tiki-z"
            style={{
              fontSize: Math.max(9, Math.round(size * 0.26)) - i * 1.5,
              animationDelay: `${i * 0.9}s`,
            }}
          >
            z
          </span>
        ))}
      </div>
    </div>
  );
}
