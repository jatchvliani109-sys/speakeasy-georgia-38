import { useEffect, useRef, useState } from "react";
import { Volume2, Square, Loader2 } from "lucide-react";

// Shared cache + single-playback controller across the app
const cache = new Map<string, string>();
let currentAudio: HTMLAudioElement | null = null;
let currentToken = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function stopCurrent() {
  if (currentAudio) {
    try { currentAudio.pause(); } catch {}
    currentAudio = null;
  }
  try { window.speechSynthesis?.cancel(); } catch {}
  currentToken++;
  notify();
}

type Props = {
  text: string;
  className?: string;
  size?: "sm" | "md";
  label?: string; // optional Georgian label appended next to icon
};

export function ReadAloudButton({ text, className = "", size = "sm", label }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync with global controller: if another button starts playing, drop our playing state
  useEffect(() => {
    const l = () => {
      if (audioRef.current && currentAudio !== audioRef.current) {
        audioRef.current = null;
        setState("idle");
      }
    };
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  // On unmount, stop our own audio if it's the active one
  useEffect(() => () => {
    if (audioRef.current && currentAudio === audioRef.current) stopCurrent();
  }, []);

  const onClick = async () => {
    if (state === "loading") return;
    if (state === "playing") {
      stopCurrent();
      setState("idle");
      return;
    }
    if (!text) return;

    stopCurrent();
    const myToken = ++currentToken;
    setState("loading");

    try {
      let url = cache.get(text);
      if (!url) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(`${supabaseUrl}/functions/v1/openai-text-to-speech`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error("tts");
        const blob = await res.blob();
        if (!blob.type.startsWith("audio/")) throw new Error("notaudio");
        url = URL.createObjectURL(blob);
        cache.set(text, url);
      }

      if (myToken !== currentToken) return; // user clicked another button while we were loading

      const audio = new Audio(url);
      audio.playbackRate = 0.95;
      audioRef.current = audio;
      currentAudio = audio;
      audio.onended = () => {
        if (currentAudio === audio) { currentAudio = null; notify(); }
        setState("idle");
      };
      audio.onerror = () => {
        if (currentAudio === audio) currentAudio = null;
        setState("idle");
      };
      await audio.play();
      notify();
      setState("playing");
    } catch {
      // Browser SpeechSynthesis fallback
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "en-US";
        u.rate = 0.95;
        u.onend = () => setState("idle");
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
        setState("playing");
      } catch {
        setState("idle");
      }
    }
  };

  const Icon = state === "loading" ? Loader2 : state === "playing" ? Square : Volume2;
  const aria = state === "playing" ? "Stop audio" : "Read aloud";

  const sizeCls = label
    ? size === "md" ? "h-9 px-3 gap-1.5" : "h-7 px-2.5 gap-1"
    : size === "md" ? "h-9 w-9" : "h-7 w-7";
  const iconCls = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";

  const active = state === "playing";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={aria}
      title={aria}
      aria-pressed={active}
      className={[
        "inline-flex items-center justify-center rounded-full border transition-colors select-none",
        active
          ? "border-[#1E2A44]/40 bg-[#1E2A44]/5 text-[#1E2A44]"
          : "border-[#E7E2D5] bg-white/70 text-[#5B6473] hover:text-[#1E2A44] hover:border-[#1E2A44]/30 hover:bg-[#1E2A44]/5",
        sizeCls,
        className,
      ].join(" ")}
    >
      <Icon
        className={[
          iconCls,
          state === "loading" ? "animate-spin" : "",
          active ? "text-[#0F766E]" : "",
        ].join(" ")}
      />
      {label && <span className="ka text-[11px] font-medium">{label}</span>}
    </button>
  );
}

export default ReadAloudButton;
