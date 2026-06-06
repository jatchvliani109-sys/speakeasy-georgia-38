import { useEffect, useRef, useState } from "react";
import { Mic, Loader2 } from "lucide-react";

type State = "idle" | "ready" | "user_speaking" | "ai_speaking" | "thinking" | "connecting";

type Props = {
  state: State;
  micStream?: MediaStream | null;
  aiStream?: MediaStream | null;
  aiAmplitude?: number;
  onPress?: () => void;
  onRelease?: () => void;
  active?: boolean;
};

function useAmplitude(stream: MediaStream | null | undefined, enabled: boolean) {
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    if (!stream || !enabled) { setLevel(0); return; }
    let cancelled = false;
    try {
      const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      const ctx = new AC();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      sourceRef.current = src;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
      src.connect(analyser);
      analyserRef.current = analyser;
      const buf = new Uint8Array(analyser.fftSize);
      const tick = () => {
        if (cancelled) return;
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        const lvl = Math.min(1, rms * 4.5);
        setLevel((prev) => prev * 0.4 + lvl * 0.6);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      console.warn("[MicBubble] analyser failed", e);
    }
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try { sourceRef.current?.disconnect(); } catch {}
      try { analyserRef.current?.disconnect(); } catch {}
      try { ctxRef.current?.close(); } catch {}
      ctxRef.current = null;
      analyserRef.current = null;
      sourceRef.current = null;
      setLevel(0);
    };
  }, [stream, enabled]);

  return level;
}

export default function MicBubble({ state, micStream, onPress, onRelease, active }: Props) {
  // Only react to the user's mic — bubble looks identical whether AI or user is speaking.
  const userLevel = useAmplitude(micStream, state === "user_speaking");
  const isThinking = state === "thinking" || state === "connecting";

  const reactive = Math.min(userLevel, 0.55);
  const scale = 1 + reactive * 0.06;

  const palette = { glow: "38 90% 50%", edge: "45 100% 70%" };
  const glow = `0 0 ${55 + reactive * 70}px ${14 + reactive * 22}px hsl(${palette.glow} / ${0.30 + reactive * 0.30})`;

  const rings = [0.0, 0.18, 0.36, 0.55];

  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onPress?.(); }}
      onMouseUp={() => onRelease?.()}
      onMouseLeave={() => onRelease?.()}
      onTouchStart={(e) => { e.preventDefault(); onPress?.(); }}
      onTouchEnd={(e) => { e.preventDefault(); onRelease?.(); }}
      className="relative outline-none select-none touch-none overflow-visible"
      aria-label="Push to talk"
      style={{ width: "clamp(180px, min(34dvh, 50vw), 240px)", height: "clamp(180px, min(34dvh, 50vw), 240px)" }}
    >
      {/* Soft ambient halo */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 50%, hsl(${palette.glow} / 0.30), transparent 65%)`,
          transform: `scale(${1 + reactive * 0.18})`,
          transition: "transform 120ms ease-out",
        }}
      />

      {/* Slow breathing ring — always on (except when actively reacting to mic) */}
      <span
        aria-hidden
        className="absolute inset-8 rounded-full border border-amber-300/20"
        style={{ animation: "mb-breathe 3.4s ease-in-out infinite" }}
      />

      {/* Amplitude rings — driven by mic only */}
      {rings.map((threshold, i) => {
        const v = Math.min(0.72, Math.max(0, userLevel - threshold));
        const s = 1 + v * 0.36 + i * 0.025;
        const op = Math.max(0, 0.55 - i * 0.12) * (v > 0 ? 1 : 0);
        return (
          <span
            key={i}
            aria-hidden
            className="absolute inset-4 rounded-full pointer-events-none"
            style={{
              border: `2px solid hsl(${palette.edge} / ${op})`,
              transform: `scale(${s})`,
              transition: "transform 90ms ease-out, opacity 120ms ease-out",
              opacity: op,
            }}
          />
        );
      })}

      {/* Core orb — same look regardless of state */}
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 overflow-hidden"
        style={{
          width: 190,
          height: 190,
          marginLeft: -95,
          marginTop: -95,
          transform: `scale(${scale})`,
          transition: "transform 120ms ease-out, box-shadow 200ms ease-out",
          background: `radial-gradient(circle at 30% 28%, hsl(48 100% 75%), hsl(38 92% 52%) 52%, hsl(25 65% 20%) 100%)`,
          boxShadow: glow,
          borderRadius: "50%",
          animation: "mb-breathe 3.6s ease-in-out infinite",
        }}
      >
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 35% 22%, hsl(0 0% 100% / 0.40), transparent 50%)",
          }}
        />
      </span>

      {/* Icon — always mic, except spinner when connecting */}
      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {isThinking ? (
          <Loader2 className="w-10 h-10 text-amber-50 animate-spin" />
        ) : (
          <Mic className="w-10 h-10 text-amber-50 drop-shadow-lg" />
        )}
      </span>

      {/* Active recording dot */}
      {active && (
        <span aria-hidden
          className="absolute top-3 right-3 w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_14px_5px_hsl(0_85%_55%/0.6)] animate-pulse" />
      )}

      <style>{`
        @keyframes mb-breathe {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.04); opacity: 0.95; }
        }
      `}</style>
    </button>
  );
}
