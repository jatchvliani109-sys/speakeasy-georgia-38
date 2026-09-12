import { useMemo } from "react";

/**
 * Tiki walks in, slows, lies down and falls asleep.
 *
 * 55 illustrated frames, drawn for 11fps.
 *
 * TWO THINGS TO UNDERSTAND BEFORE CHANGING ANYTHING.
 *
 * 1. The walk cycle LOOPS. Frames 0-10 are one gait cycle. Playing the sheet
 *    straight through gives only two seconds of walking, which is not enough to
 *    cross anything, so the cycle repeats while the legs keep their 11fps
 *    rhythm and only then does the settle play.
 *
 * 2. Horizontal travel stops when the legs stop. The crossing ends at the exact
 *    instant the settle begins, or he slides along the floor while asleep.
 *
 * Frames are anchored by the HEAD, not centred: his body extends backward as he
 * lies down, so centring would drag his head sideways through the sequence.
 *
 * If he looks like he is skating, the travel is too fast for the leg speed:
 * raise `walkCycles` or lower `restAt`. If he moonwalks, the reverse.
 *
 * Renders as a normal block, not an overlay, so it can sit in the flow of a
 * page above a card. The earlier version filled its parent absolutely, which
 * suited a celebration card and nothing else.
 */

const SHEET = "/tiki.png";
const TOTAL_FRAMES = 55;
const WALK_CYCLE = 11;      // frames 0-10, one gait cycle
const SETTLE_START = 22;    // measured: height holds to ~19 then drops away
const FPS = 11;
const CELL_W = 87;
const CELL_H = 88;

export default function TikiCat({
  /** Gait cycles before he settles. Each is one second. */
  walkCycles = 4,
  size = 58,
  delay = 0.6,
  loop = false,
  /** Where he lies down, as a percentage across the container. */
  restAt = 55,
}: {
  walkCycles?: number;
  size?: number;
  delay?: number;
  loop?: boolean;
  restAt?: number;
}) {
  const uid = useMemo(() => `tc${Math.random().toString(36).slice(2, 8)}`, []);
  const w = Math.round((CELL_W / CELL_H) * size);

  const cycleSec = WALK_CYCLE / FPS;
  const walkSec = cycleSec * walkCycles;
  const settleFrames = TOTAL_FRAMES - SETTLE_START;
  const settleSec = settleFrames / FPS;
  const totalSec = walkSec + settleSec;
  const stopPct = (walkSec / totalSec) * 100;
  const iter = loop ? "infinite" : "1";

  return (
    <div
      aria-hidden
      className="pointer-events-none relative w-full overflow-hidden"
      style={{ height: size + 2 }}
    >
      <style>{`
        @keyframes ${uid}cross {
          0%   { transform: translateX(-${w}px); }
          ${stopPct.toFixed(3)}% { transform: translateX(calc(${restAt}% - ${w}px)); }
          100% { transform: translateX(calc(${restAt}% - ${w}px)); }
        }
        @keyframes ${uid}walk {
          from { background-position-x: 0px; }
          to   { background-position-x: -${w * WALK_CYCLE}px; }
        }
        /* Ends ON the last frame, not one past it, and uses jump-none.
           With ordinary steps() and fill-forwards the animation holds its END
           value, which would be one frame beyond the sheet: the cat vanishes
           the instant he falls asleep. */
        @keyframes ${uid}settle {
          from { background-position-x: -${w * SETTLE_START}px; }
          to   { background-position-x: -${w * (TOTAL_FRAMES - 1)}px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .${uid}root { display: none; }
        }
      `}</style>

      <div
        className={`${uid}root absolute bottom-0 left-0 w-full`}
        style={{ animation: `${uid}cross ${totalSec}s linear ${delay}s ${iter} both` }}
      >
        <div
          style={{
            width: w,
            height: size,
            backgroundImage: `url(${SHEET})`,
            backgroundSize: `${w * TOTAL_FRAMES}px ${size}px`,
            backgroundRepeat: "no-repeat",
            // settle is listed second so it wins once it starts
            animation:
              `${uid}walk ${cycleSec}s steps(${WALK_CYCLE}) ${delay}s ${walkCycles} forwards, ` +
              `${uid}settle ${settleSec}s steps(${settleFrames}, jump-none) ${delay + walkSec}s 1 forwards`,
          }}
        />
      </div>
    </div>
  );
}
