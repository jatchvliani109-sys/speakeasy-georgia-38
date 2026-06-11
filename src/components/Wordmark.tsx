type Props = {
  size?: "sm" | "md" | "lg";
  className?: string;
  /**
   * Tone of the wordmark. `auto` inherits currentColor so it adapts to
   * whichever surface (cream, navy, etc.) it sits on.
   */
  tone?: "auto" | "navy" | "cream";
};

/**
 * SpeakBusy wordmark.
 *
 * A quiet, editorial wordmark: "Speak" set in a refined contemporary serif
 * (Fraunces) at a light weight, paired with "Busy" in the same family at a
 * medium weight + italic. A single hairline underscore beneath the "y" of
 * "Busy" acts as a minimal speech-line — the only graphic gesture.
 *
 * Uses currentColor so it sits cleanly on both light (cream/warm white) and
 * dark (muted navy) backgrounds.
 */
export default function Wordmark({ size = "md", className = "", tone = "auto" }: Props) {
  const sizeCls =
    size === "sm" ? "text-[17px]" : size === "lg" ? "text-3xl sm:text-4xl" : "text-xl";

  const colorCls =
    tone === "navy"
      ? "text-[#5A1834]"
      : tone === "cream"
      ? "text-[#F5EDEF]"
      : "";

  return (
    <span
      className={`inline-flex items-baseline leading-none tracking-tight select-none ${sizeCls} ${colorCls} ${className}`}
      style={{ fontFamily: '"Fraunces", "Instrument Serif", Georgia, serif' }}
      aria-label="SpeakBusy"
    >
      <span style={{ fontWeight: 300, fontVariationSettings: '"SOFT" 30' }}>Speak</span>
      <span
        className="relative"
        style={{ fontWeight: 500, fontStyle: "italic", fontVariationSettings: '"SOFT" 50' }}
      >
        Busy
        <span
          aria-hidden
          className="absolute left-0 right-[12%] -bottom-[0.18em] block"
          style={{ height: 1, background: "currentColor", opacity: 0.55 }}
        />
      </span>
    </span>
  );
}
