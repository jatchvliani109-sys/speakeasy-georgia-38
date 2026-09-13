import { useMemo } from "react";

/**
 * Tiki wakes, stretches, turns to face you, drops down the card and sits.
 *
 * 47 illustrated frames. Two playback phases at DIFFERENT rates, because one
 * rate does not suit both: a stretch is slow and deliberate, a leap is not.
 *
 *   0-22   waking and stretching        8 fps, unhurried
 *   23-46  turning, the leap, landing  12 fps
 *
 * The DROP is expressed as a percentage of the parent, not a pixel count, so he
 * lands exactly on the bottom edge of whatever he is placed over rather than at
 * a distance guessed at build time. Give the parent `position: relative` and a
 * height, and he will land on its lower edge.
 */

const SHEET = "/tiki-wake.png";
const TOTAL = 47;
const STRETCH_END = 23;      // frames 0-22 are the wake and stretch
const LEAP_START = 33;       // measured from frame heights: the leap frames
const LEAP_END = 40;

const WAKE_FPS = 5;   // a cat waking and stretching is unhurried
const ACTION_FPS = 12;
const CELL_W = 72;
const CELL_H = 104;

export default function TikiWake({
  size = 34,
  delay = 0.3,
  /**
   * Where frame 0 sits, relative to this component's own box.
   *
   * The sleeping cat is handed over from TikiCat, which uses a different sheet
   * with different cell dimensions and head-alignment rather than centring, and
   * which lives in the strip ABOVE this card. Without an offset the waking cat
   * appears somewhere other than where the sleeping one was, and the handover
   * reads as a teleport.
   */
  startX = 0,
  startY = 0,
  /** Sideways drift during the jump, px. Cats do not fall straight down. */
  driftX = 18,
  /** Faint light outline, for dark backgrounds. */
  rim = false,
  onDone,
}: {
  size?: number;
  delay?: number;
  startX?: number;
  startY?: number;
  driftX?: number;
  rim?: boolean;
  onDone?: () => void;
}) {
  const uid = useMemo(() => `tw${Math.random().toString(36).slice(2, 8)}`, []);
  const w = Math.round((CELL_W / CELL_H) * size);

  const wakeSec = STRETCH_END / WAKE_FPS;               // 2.875s
  const actionFrames = TOTAL - STRETCH_END;             // 24
  const actionSec = actionFrames / ACTION_FPS;          // 2.0s
  const totalSec = wakeSec + actionSec;

  // The fall is pinned to the leap frames, so it can never drift out of step
  // with the artwork the way a hand-tuned percentage would.
  const dropFrom = ((wakeSec + (LEAP_START - STRETCH_END) / ACTION_FPS) / totalSec) * 100;
  const dropTo = ((wakeSec + (LEAP_END - STRETCH_END) / ACTION_FPS) / totalSec) * 100;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      // Above the card he is jumping down the front of.
      style={{ zIndex: 30 }}
    >
      <style>{`
        @keyframes ${uid}wake {
          from { background-position-x: 0px; }
          to   { background-position-x: -${w * STRETCH_END}px; }
        }
        @keyframes ${uid}action {
          from { background-position-x: -${w * STRETCH_END}px; }
          /* ends ON the last frame: plain steps() with fill-forwards holds one
             frame past the sheet and he vanishes */
          to   { background-position-x: -${w * (TOTAL - 1)}px; }
        }
        @keyframes ${uid}drop {
          0%, ${dropFrom.toFixed(2)}% { transform: translate(${startX}px, ${startY}px); }
          ${(dropFrom + 1.5).toFixed(2)}% {
            transform: translate(${startX + Math.round(driftX*0.2)}px, ${startY - 7}px);
          }
          /* 100% of the PARENT height, less his own, lands him on its bottom edge */
          ${dropTo.toFixed(2)}%, 100% {
            transform: translate(${startX + driftX}px, calc(100% - ${size}px));
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .${uid}root { display: none; }
        }
      `}</style>

      <div
        className={`${uid}root absolute left-0 top-0`}
        style={{
          height: "100%",
          animation: `${uid}drop ${totalSec}s cubic-bezier(.4,0,.75,1) ${delay}s 1 both`,
        }}
        onAnimationEnd={onDone}
      >
        <div
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
            // `both`, not `forwards`: with forwards alone nothing is painted
            // during the delay, so the cat blinks out between falling asleep
            // and waking. `both` shows frame 0 from the start.
            animation:
              `${uid}wake ${wakeSec}s steps(${STRETCH_END}) ${delay}s 1 both, ` +
              `${uid}action ${actionSec}s steps(${actionFrames}, jump-none) ${delay + wakeSec}s 1 forwards`,
          }}
        />
      </div>
    </div>
  );
}
