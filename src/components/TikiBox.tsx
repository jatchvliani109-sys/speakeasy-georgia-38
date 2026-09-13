import { useMemo } from "react";

/**
 * Tiki turns side on, stands up, shadow boxes, flexes, and sits back down.
 *
 * 50 frames: 4 turnaround frames then the 46-frame routine. The turnaround
 * bridges the pose TikiWake ends on (sitting, facing you) to the one the
 * routine starts from (sitting, side on), which was a visible jump before.
 *
 * The turnaround artwork drew the front view 1.21x taller than the side view.
 * A cat does not grow as it turns, so each of those frames was rescaled to a
 * constant cat height before being spliced in.
 *
 * Played in THREE phases at different rates. One rate
 * does not suit the whole routine: the boxing wants pace, the flex wants to be
 * held long enough to register.
 *
 *   0-34   turning to face side on, standing up, shadow boxing   base speed
 *   35-37  the double bicep, facing you        much slower, this is the joke
 *   38-49  turning back and sitting down       base speed
 *
 * The flex frames were identified by measuring horizontal symmetry: the
 * front-facing poses are near mirror-symmetric (0.87 to 0.97) while every side
 * view scores below 0.65. Hand-picked indices would drift if the sheet changed.
 *
 * He stays on one spot, so placement is the caller's business.
 */

const SHEET = "/tiki-box.png";
const TOTAL = 50;
const FLEX_START = 35;    // shifted by the 4 turnaround frames
const FLEX_END = 38;      // exclusive
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
  onDone,
}: {
  size?: number;
  fps?: number;
  flexSlowdown?: number;
  delay?: number;
  loop?: boolean;
  onDone?: () => void;
}) {
  const uid = useMemo(() => `tb${Math.random().toString(36).slice(2, 8)}`, []);
  const w = Math.round((CELL_W / CELL_H) * size);

  const nBox = FLEX_START;                 // 35
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
