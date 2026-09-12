import { useMemo } from "react";

/**
 * Tiki wakes, stretches, turns to face you, jumps down the page and sits.
 *
 * 46 illustrated frames at 11fps. The artwork is already in sequence order, so
 * this plays straight through; only the VERTICAL drop needs timing, and it is
 * pinned to the leap frames rather than guessed.
 *
 * Frame phases, derived from the frame heights rather than by eye:
 *   0-11   curled asleep, waking, sitting up
 *   12-22  the stretch
 *   23-27  turning to face the camera
 *   28-34  the leap            <- the drop happens here
 *   35-45  landing, then sitting
 *
 * Meant to follow TikiCat, which leaves him asleep. Same sheet dimensions and
 * the same 11fps, so the two read as one continuous animation.
 *
 * POSITIONING: this one moves DOWN the page, so it needs a container tall
 * enough to hold the fall. It renders absolutely and drops `dropDistance` px
 * from wherever it is placed.
 */

const SHEET = "/tiki-wake.png";
const TOTAL_FRAMES = 46;
const LEAP_START = 28;
const LEAP_END = 34;
const FPS = 11;
const CELL_W = 72;
const CELL_H = 104;

export default function TikiWake({
  size = 34,
  delay = 0.4,
  /** How far he falls, in px. */
  dropDistance = 260,
  /** Nudge sideways as he jumps, in px. Cats do not fall straight down. */
  driftX = 24,
  onDone,
}: {
  size?: number;
  delay?: number;
  dropDistance?: number;
  driftX?: number;
  onDone?: () => void;
}) {
  const uid = useMemo(() => `tw${Math.random().toString(36).slice(2, 8)}`, []);
  const w = Math.round((CELL_W / CELL_H) * size);
  const totalSec = TOTAL_FRAMES / FPS;

  // The drop is keyed to the leap frames, so it can never drift out of sync
  // with the artwork the way a hand-picked percentage would.
  const dropFrom = (LEAP_START / TOTAL_FRAMES) * 100;
  const dropTo = (LEAP_END / TOTAL_FRAMES) * 100;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-0 right-0 top-0"
      style={{ height: size + dropDistance }}
    >
      <style>{`
        @keyframes ${uid}frames {
          from { background-position-x: 0px; }
          /* ends ON the last frame: with plain steps() and fill-forwards the
             held value is one frame past the sheet and he disappears */
          to   { background-position-x: -${w * (TOTAL_FRAMES - 1)}px; }
        }
        @keyframes ${uid}drop {
          0%, ${dropFrom.toFixed(2)}% {
            transform: translate(0, 0);
          }
          /* a slight rise before the fall reads as a push-off */
          ${(dropFrom + 2).toFixed(2)}% {
            transform: translate(${Math.round(driftX * 0.15)}px, -8px);
          }
          ${dropTo.toFixed(2)}%, 100% {
            transform: translate(${driftX}px, ${dropDistance}px);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .${uid}root { display: none; }
        }
      `}</style>

      <div
        className={`${uid}root absolute left-0 top-0`}
        style={{
          // gravity: slow off the edge, fast into the landing
          animation: `${uid}drop ${totalSec}s cubic-bezier(.4,0,.75,1) ${delay}s 1 forwards`,
        }}
        onAnimationEnd={onDone}
      >
        <div
          style={{
            width: w,
            height: size,
            backgroundImage: `url(${SHEET})`,
            backgroundSize: `${w * TOTAL_FRAMES}px ${size}px`,
            backgroundRepeat: "no-repeat",
            animation: `${uid}frames ${totalSec}s steps(${TOTAL_FRAMES}, jump-none) ${delay}s 1 forwards`,
          }}
        />
      </div>
    </div>
  );
}
