import { useMemo } from "react";

/**
 * Tiki, sitting, yawns.
 *
 * 15 frames. Starts and ends in the same seated pose the boxing routine leaves
 * him in, so it chains on without a seam and loops cleanly.
 *
 * Frames are anchored on the cat's BASE rather than the bounding-box centre:
 * the tail curls during the yawn and shifts the box, so centring would make him
 * drift sideways.
 *
 * `size` 44 is not arbitrary. The cat fills 0.985 of the cell here against
 * 0.641 in the boxing sheet, so 44 here renders the same physical cat as 68
 * there. Matching the numbers instead would shrink him by a third.
 */

const SHEET = "/tiki-yawn.png";
const TOTAL = 15;
const CELL_W = 77;
const CELL_H = 104;

export default function TikiYawn({
  size = 44,
  /** A yawn is slow. 6fps suits it; 11 makes him look startled. */
  fps = 6,
  delay = 0.3,
  loop = false,
  onDone,
}: {
  size?: number;
  fps?: number;
  delay?: number;
  loop?: boolean;
  onDone?: () => void;
}) {
  const uid = useMemo(() => `ty${Math.random().toString(36).slice(2, 8)}`, []);
  const w = Math.round((CELL_W / CELL_H) * size);
  const dur = TOTAL / fps;

  return (
    <div
      aria-hidden
      className="pointer-events-none relative"
      style={{ width: w, height: size }}
    >
      <style>{`
        @keyframes ${uid}yawn {
          from { background-position-x: 0px; }
          /* ends ON the last frame: plain steps() with fill-forwards holds one
             frame past the sheet and he vanishes */
          to   { background-position-x: -${w * (TOTAL - 1)}px; }
        }
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
          animation: `${uid}yawn ${dur}s steps(${TOTAL}, jump-none) ${delay}s ${loop ? "infinite" : "1"} both`,
        }}
        onAnimationEnd={loop ? undefined : onDone}
      />
    </div>
  );
}
