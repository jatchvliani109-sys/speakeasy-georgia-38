import { useMemo } from "react";

/**
 * Tiki stands up, shadow boxes, flexes for the camera, and sits back down.
 *
 * 46 illustrated frames, played in THREE phases at different rates. One rate
 * does not suit the whole routine: the boxing wants pace, the flex wants to be
 * held long enough to register.
 *
 *   0-30   standing up and shadow boxing        base speed
 *   31-33  the double bicep, facing you         much slower, this is the joke
 *   34-45  turning back and sitting down        base speed
 *
 * The flex frames were identified by measuring horizontal symmetry: the
 * front-facing poses are near mirror-symmetric (0.87 to 0.97) while every side
 * view scores below 0.65. Hand-picked indices would drift if the sheet changed.
 *
 * He stays on one spot, so placement is the caller's business.
 */

const SHEET = "/tiki-box.png";
const TOTAL = 46;
const FLEX_START = 31;
const FLEX_END = 34;      // exclusive
const CELL_W = 77;
const CELL_H = 104;

export default function TikiBox({
  size = 44,
  /** Base rate for the boxing and the sit. */
  fps = 8,
  /** The flex runs this much slower. */
  flexSlowdown = 3,
  delay = 0.4,
  loop = false,
  /** Faint light outline, for dark backgrounds. */
  rim = false,
  onDone,
}: {
  size?: number;
  fps?: number;
  flexSlowdown?: number;
  delay?: number;
  loop?: boolean;
  rim?: boolean;
  onDone?: () => void;
}) {
  const uid = useMemo(() => `tb${Math.random().toString(36).slice(2, 8)}`, []);
  const w = Math.round((CELL_W / CELL_H) * size);

  const nBox = FLEX_START;                 // 31
  const nFlex = FLEX_END - FLEX_START;     // 3
  const nSit = TOTAL - FLEX_END;           // 12

  const boxSec = nBox / fps;
  const flexSec = nFlex / (fps / flexSlowdown);
  const sitSec = nSit / fps;
  const total = boxSec + flexSec + sitSec;

  const px = (n: number) => `-${w * n}px`;

  return (
    <div
      aria-hidden
      className="pointer-events-none relative"
      style={{ width: w, height: size }}
    >
      <style>{`
        @keyframes ${uid}b { from { background-position-x: 0px; } to { background-position-x: ${px(FLEX_START)}; } }
        @keyframes ${uid}f { from { background-position-x: ${px(FLEX_START)}; } to { background-position-x: ${px(FLEX_END)}; } }
        /* ends ON the last frame: plain steps() with fill-forwards holds one
           frame past the sheet and he vanishes */
        @keyframes ${uid}s { from { background-position-x: ${px(FLEX_END)}; } to { background-position-x: ${px(TOTAL - 1)}; } }
        @media (prefers-reduced-motion: reduce) { .${uid}root { display: none; } }
      `}</style>

      <div
        className={`${uid}root`}
        style={{
          width: w,
          height: size,
          backgroundImage: `url(${SHEET})`,
          backgroundSize: `${w * TOTAL}px ${size}px`,
          backgroundRepeat: "no-repeat",
            // A faint light rim. The cat is dark grey on a dark card and all but
            // vanishes against it; a rim separates him without touching the
            // card's colour, which would have to work in both themes.
            filter: rim ? "drop-shadow(0 0 1.5px rgba(255,255,255,.55))" : undefined,
          // Later animations win while they are running, so the three phases
          // hand over cleanly without any gap.
          animation:
            `${uid}b ${boxSec}s steps(${nBox}) ${delay}s 1 both, ` +
            `${uid}f ${flexSec}s steps(${nFlex}) ${delay + boxSec}s 1 forwards, ` +
            `${uid}s ${sitSec}s steps(${nSit}, jump-none) ${delay + boxSec + flexSec}s 1 forwards`,
        }}
        onAnimationEnd={(e) => {
          // three animations fire this; only act on the last
          if (!loop && e.animationName.endsWith("s")) onDone?.();
        }}
      />
    </div>
  );
}
