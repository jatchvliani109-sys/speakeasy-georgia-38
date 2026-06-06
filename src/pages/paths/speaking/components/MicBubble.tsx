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
      analyser.smoothingTimeConstant = 0.7;
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
        // Smooth + scale: typical speech RMS ~0.05-0.25
        const lvl = Math.min(1, rms * 4);
        setLevel((prev) => prev * 0.5 + lvl * 0.5);
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

  // Derived scale for breathing & reactive expansion
  const isUser = state === "user_speaking";
  const isAi = state === "ai_speaking";
  const isThinking = state === "thinking" || state === "connecting";

  const reactive = isUser ? userLevel : isAi ? aiLevel : 0;
  const scale = 1 + reactive * 0.18;

  // Ring colors per state
  const ringColor = isUser
    ? "hsl(33 95% 60%)"
    : isAi
    ? "hsl(180 70% 60%)"
    : "hsl(41 100% 60%)";

  const glow = isUser
    ? `0 0 ${40 + reactive * 80}px ${10 + reactive * 30}px hsl(33 95% 55% / ${0.35 + reactive * 0.35})`
    : isAi
    ? `0 0 ${50 + reactive * 60}px ${14 + reactive * 20}px hsl(180 70% 55% / ${0.30 + reactive * 0.30})`
    : "0 0 60px 8px hsl(41 100% 55% / 0.25)";

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
      style={{ width: 260, height: 260 }}
    >
      {/* Soft halo rings */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle at 50% 50%, hsl(33 70% 30% / 0.35), transparent 70%)",
          transform: `scale(${1 + (isUser || isAi ? reactive * 0.4 : 0.05)})`,
          transition: "transform 120ms ease-out",
        }}
      />
      {/* Outer pulse rings (calm idle) */}
      {!isUser && !isAi && (
        <>
          <span aria-hidden className="absolute inset-2 rounded-full border border-amber-300/20 animate-[pulse_3s_ease-in-out_infinite]" />
          <span aria-hidden className="absolute inset-6 rounded-full border border-amber-300/15 animate-[pulse_3.6s_ease-in-out_infinite]" />
        </>
      )}
      {/* AI wave ripple rings */}
      {isAi && (
        <>
          <span aria-hidden className="absolute inset-0 rounded-full border-2 border-cyan-300/40 animate-[ping_1.6s_ease-out_infinite]" />
          <span aria-hidden className="absolute inset-0 rounded-full border-2 border-cyan-300/25 animate-[ping_2.2s_ease-out_infinite]" style={{ animationDelay: "300ms" }} />
        </>
      )}

      {/* Core orb */}
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 rounded-full overflow-hidden"
        style={{
          width: 180,
          height: 180,
          marginLeft: -90,
          marginTop: -90,
          transform: `translate(0,0) scale(${scale})`,
          transition: isUser || isAi ? "transform 80ms ease-out, box-shadow 120ms ease-out" : "transform 600ms ease-out, box-shadow 400ms ease-out",
          background: isAi
            ? "radial-gradient(circle at 30% 30%, hsl(185 90% 70%), hsl(195 80% 45%) 55%, hsl(210 60% 18%) 100%)"
            : isUser
            ? "radial-gradient(circle at 30% 30%, hsl(45 100% 75%), hsl(33 95% 55%) 55%, hsl(20 70% 22%) 100%)"
            : "radial-gradient(circle at 30% 30%, hsl(45 100% 70%), hsl(38 90% 52%) 55%, hsl(25 60% 20%) 100%)",
          boxShadow: glow,
          border: `1px solid ${ringColor}`,
        }}
      >
        {/* Animated inner shimmer for AI */}
        {isAi && (
          <span
            aria-hidden
            className="absolute inset-0"
            style={{
              background: "conic-gradient(from 0deg, transparent, hsl(180 90% 80% / 0.4), transparent 50%, hsl(200 90% 70% / 0.35), transparent)",
              animation: "spin 4s linear infinite",
              mixBlendMode: "screen",
            }}
          />
        )}
        {/* Soft inner highlight */}
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 35% 25%, hsl(0 0% 100% / 0.35), transparent 45%)",
          }}
        />
      </span>

      {/* Icon */}
      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {isThinking ? (
          <Loader2 className="w-10 h-10 text-amber-50 animate-spin" />
        ) : isAi ? (
          <Sparkles className="w-10 h-10 text-cyan-50 drop-shadow" />
        ) : (
          <Mic className={`w-10 h-10 ${isUser ? "text-amber-50" : "text-amber-100"} drop-shadow`} />
        )}
      </span>

      {/* Active press indicator dot */}
      {active && (
        <span aria-hidden className="absolute top-2 right-2 w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_12px_4px_hsl(0_85%_55%/0.6)] animate-pulse" />
      )}
    </button>
  );
}
