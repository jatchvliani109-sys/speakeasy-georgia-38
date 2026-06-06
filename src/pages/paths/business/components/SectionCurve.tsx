/**
 * Artistic curved section transitions for the Business path.
 *
 * Each variant is an asymmetric, hand-tuned SVG path — not a generic sine wave.
 * The curve renders in `color` (the color of the section it transitions INTO),
 * so when placed at the bottom of a dark hero card with `color="#F5F0E8"`, the
 * cream surface appears to flow up and "carve" into the navy.
 *
 * Usage — parent must be `relative overflow-hidden`:
 *   <div className="relative overflow-hidden ...">
 *     ...content...
 *     <SectionCurve variant="crest" color="#F5F0E8" />  // bottom edge
 *     <SectionCurve variant="dune" color="#3d6b9e" position="top" />  // top edge
 *   </div>
 */

type Variant = "crest" | "dune" | "ribbon" | "swell" | "arc";
type Position = "top" | "bottom";

const PATHS: Record<Variant, string> = {
  // Asymmetric peak rising on the right — architectural arch-like
  crest:
    "M0,40 C220,10 360,70 540,55 C720,40 880,5 1040,30 C1180,52 1320,82 1440,60 L1440,120 L0,120 Z",
  // Long sweeping dune cresting left of center
  dune:
    "M0,75 C180,30 320,5 500,25 C680,45 820,90 1000,85 C1180,80 1320,50 1440,65 L1440,120 L0,120 Z",
  // Thin ribbon-like curve, gentle but offset
  ribbon:
    "M0,55 C260,90 420,20 640,40 C860,60 1020,100 1240,70 C1340,55 1400,45 1440,50 L1440,120 L0,120 Z",
  // Deep asymmetric swell — feels like a slow tide
  swell:
    "M0,30 C300,100 520,70 760,50 C1000,30 1200,80 1440,40 L1440,120 L0,120 Z",
  // Single elegant arc, slightly off-center
  arc:
    "M0,60 C360,0 720,110 1080,60 C1260,35 1380,45 1440,55 L1440,120 L0,120 Z",
};

export default function SectionCurve({
  variant = "crest",
  color = "#F5F0E8",
  position = "bottom",
  height = 44,
  className = "",
}: {
  variant?: Variant;
  color?: string;
  position?: Position;
  height?: number;
  className?: string;
}) {
  const isTop = position === "top";
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      className={`absolute left-0 w-full pointer-events-none ${
        isTop ? "top-0 -translate-y-px" : "bottom-0 translate-y-px"
      } ${className}`}
      style={{ height, transform: isTop ? "scaleY(-1)" : undefined }}
    >
      <path d={PATHS[variant]} fill={color} />
    </svg>
  );
}
