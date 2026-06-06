import { useEffect, useRef, useState } from "react";
import { Mic, Loader2, Sparkles } from "lucide-react";

type State = "idle" | "ready" | "user_speaking" | "ai_speaking" | "thinking" | "connecting";

type Props = {
  state: State;
  micStream?: MediaStream | null;
  aiStream?: MediaStream | null;
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

export default function MicBubble({ state, micStream, aiStream, onPress, onRelease, active }: Props) {
  const userLevel = useAmplitude(micStream, state === "user_speaking");
  const aiLevel = useAmplitude(aiStream, state === "ai_speaking");

  const isUser = state === "user_speaking";
  const isAi = state === "ai_speaking";
  const isThinking = state === "thinking" || state === "connecting";

  const reactive = Math.min(isUser ? userLevel : isAi ? Math.max(aiLevel, 0.22) : 0, 0.72);
  const scale = 1 + reactive * 0.1;

  // Palette per state
  const palette = isUser
    ? { core: "33 95% 60%", glow: "33 100% 55%", edge: "45 100% 70%" }
    : isAi
    ? { core: "190 85% 55%", glow: "195 95% 55%", edge: "175 80% 65%" }
    : { core: "41 100% 60%", glow: "38 90% 50%", edge: "45 100% 70%" };

  const glow = isUser
    ? `0 0 ${50 + reactive * 90}px ${12 + reactive * 30}px hsl(${palette.glow} / ${0.35 + reactive * 0.35})`
    : isAi
    ? `0 0 ${70 + reactive * 50}px ${18 + reactive * 16}px hsl(${palette.glow} / ${0.40 + reactive * 0.25})`
    : "0 0 50px 6px hsl(41 100% 55% / 0.20)";

  // 4 amplitude-driven rings for user state
  const rings = [0.0, 0.18, 0.36, 0.55];

  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onPress?.(); }}
      onMouseUp={() => onRelease?.()}
      onMouseLeave={() => onRelease?.()}
      onTouchStart={(e) => { e.preventDefault(); onPress?.(); }}
      onTouchEnd={(e) => { e.preventDefault(); onRelease?.(); }}
      className="relative outline-none select-none touch-none"
      aria-label="Push to talk"
      style={{ width: "clamp(210px, 42dvh, 280px)", height: "clamp(210px, 42dvh, 280px)" }}
    >
      {/* Soft ambient halo */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 50%, hsl(${palette.glow} / 0.30), transparent 65%)`,
            transform: `scale(${1 + reactive * 0.18})`,
          transition: "transform 120ms ease-out, background 400ms ease",
        }}
      />

      {/* Idle slow breathing ring */}
      {!isUser && !isAi && !isThinking && (
        <span
          aria-hidden
          className="absolute inset-8 rounded-full border border-amber-300/20"
          style={{ animation: "mb-breathe 3.4s ease-in-out infinite" }}
        />
      )}

      {/* User amplitude rings — expand outward with voice */}
      {isUser && rings.map((threshold, i) => {
        const v = Math.min(0.72, Math.max(0, userLevel - threshold));
        const s = 1 + v * 0.58 + i * 0.035;
        const op = Math.max(0, 0.55 - i * 0.12) * (v > 0 ? 1 : 0.2);
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

      {/* AI flowing wave rings */}
      {isAi && (
        <>
          <span aria-hidden className="absolute inset-0 rounded-full border-2 border-cyan-300/35"
            style={{ animation: "mb-wave 2.2s ease-out infinite" }} />
          <span aria-hidden className="absolute inset-0 rounded-full border-2 border-teal-300/25"
            style={{ animation: "mb-wave 2.8s ease-out infinite", animationDelay: "400ms" }} />
          <span aria-hidden className="absolute inset-0 rounded-full border border-cyan-200/20"
            style={{ animation: "mb-wave 3.4s ease-out infinite", animationDelay: "800ms" }} />
        </>
      )}

      {/* Core orb */}
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 overflow-hidden"
        style={{
          width: 190,
          height: 190,
          marginLeft: -95,
          marginTop: -95,
          transform: `scale(${scale})`,
          transition: isUser || isAi
            ? "transform 80ms ease-out, box-shadow 160ms ease-out, border-radius 600ms ease-in-out"
            : "transform 700ms ease-in-out, box-shadow 500ms ease, border-radius 800ms ease",
          background: isAi
            ? `radial-gradient(circle at 32% 28%, hsl(185 95% 75%), hsl(195 85% 48%) 50%, hsl(210 70% 18%) 100%)`
            : isUser
            ? `radial-gradient(circle at 30% 28%, hsl(48 100% 78%), hsl(33 95% 55%) 50%, hsl(20 70% 22%) 100%)`
            : `radial-gradient(circle at 30% 28%, hsl(48 100% 72%), hsl(38 90% 52%) 55%, hsl(25 60% 20%) 100%)`,
          boxShadow: glow,
          borderRadius: isAi ? "50% 48% 52% 46% / 46% 52% 48% 54%" : "50%",
          animation: isAi
            ? "mb-morph 4.5s ease-in-out infinite"
            : !isUser && !isAi && !isThinking
            ? "mb-breathe 3.6s ease-in-out infinite"
            : "none",
        }}
      >
        {/* AI flowing inner shimmer (lava-lamp feel) */}
        {isAi && (
          <>
            <span
              aria-hidden
              className="absolute -inset-4"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent, hsl(180 90% 80% / 0.5), transparent 35%, hsl(200 95% 70% / 0.45), transparent 65%, hsl(170 90% 75% / 0.4), transparent)",
                animation: "spin 5s linear infinite",
                mixBlendMode: "screen",
                filter: "blur(6px)",
              }}
            />
            <span
              aria-hidden
              className="absolute -inset-2"
              style={{
                background:
                  "radial-gradient(60% 40% at 30% 70%, hsl(180 90% 80% / 0.55), transparent 70%), radial-gradient(50% 35% at 70% 30%, hsl(200 90% 70% / 0.5), transparent 70%)",
                animation: "mb-flow 3.6s ease-in-out infinite",
                mixBlendMode: "screen",
                filter: "blur(4px)",
              }}
            />
          </>
        )}
        {/* Soft inner highlight */}
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 35% 22%, hsl(0 0% 100% / 0.40), transparent 50%)",
          }}
        />
      </span>

      {/* Icon */}
      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {isThinking ? (
          <Loader2 className="w-10 h-10 text-amber-50 animate-spin" />
        ) : isAi ? (
          <Sparkles className="w-10 h-10 text-cyan-50 drop-shadow-lg" />
        ) : (
          <Mic className={`w-10 h-10 ${isUser ? "text-amber-50" : "text-amber-100"} drop-shadow-lg`} />
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
          50% { transform: scale(1.05); opacity: 0.92; }
        }
        @keyframes mb-wave {
          0% { transform: scale(0.95); opacity: 0.55; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes mb-morph {
          0%, 100% { border-radius: 50% 48% 52% 46% / 46% 52% 48% 54%; }
          25%     { border-radius: 46% 54% 48% 52% / 52% 46% 54% 48%; }
          50%     { border-radius: 52% 46% 54% 48% / 48% 54% 46% 52%; }
          75%     { border-radius: 48% 52% 46% 54% / 54% 48% 52% 46%; }
        }
        @keyframes mb-flow {
          0%, 100% { transform: translate(0%, 0%) rotate(0deg); }
          50% { transform: translate(4%, -4%) rotate(20deg); }
        }
      `}</style>
    </button>
  );
}
