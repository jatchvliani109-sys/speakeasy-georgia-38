import { useEffect, useRef, useState } from "react";
import { Volume2, Square, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
        console.log("[ReadAloud] Requesting TTS for text length:", text.length);

        // Use direct fetch instead of supabase.functions.invoke — invoke mishandles binary responses
        const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL;
        const SUPABASE_ANON_KEY =
          (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY ||
          (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
        const functionUrl = `${SUPABASE_URL}/functions/v1/openai-text-to-speech`;

        const { data: { session } } = await supabase.auth.getSession();
        const authToken = session?.access_token || SUPABASE_ANON_KEY;

        const response = await fetch(functionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ text }),
        });

        console.log("[ReadAloud] Response status:", response.status, "content-type:", response.headers.get("content-type"));

        if (!response.ok) {
          const errText = await response.text().catch(() => "");
          console.error("[ReadAloud] Edge function error:", response.status, errText);
          throw new Error(`TTS function failed: ${response.status} ${errText}`);
        }

        const blob = await response.blob();
        console.log("[ReadAloud] Blob received — size:", blob.size, "type:", blob.type);

        if (blob.size === 0) throw new Error("Empty audio blob");

        url = URL.createObjectURL(blob);
        cache.set(text, url);
        console.log("[ReadAloud] Blob URL created:", url);
      }

      if (myToken !== currentToken) return; // user clicked another button while we were loading

      const audio = new Audio(url);
      audio.playbackRate = 0.95;
      audioRef.current = audio;
      currentAudio = audio;
      audio.onended = () => {
        console.log("[ReadAloud] Audio ended");
        if (currentAudio === audio) { currentAudio = null; notify(); }
        setState("idle");
      };
      audio.onerror = (e) => {
        console.error("[ReadAloud] Audio element error:", e, audio.error);
        if (currentAudio === audio) currentAudio = null;
        setState("idle");
      };
      console.log("[ReadAloud] Calling audio.play()");
      await audio.play();
      console.log("[ReadAloud] Playback started");
      notify();
      setState("playing");
    } catch (err) {
      console.error("[ReadAloud] Failed, falling back to SpeechSynthesis:", err);
      // Browser SpeechSynthesis fallback
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "en-US";
        u.rate = 0.95;
        u.onend = () => setState("idle");
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
        setState("playing");
      } catch (fallbackErr) {
        console.error("[ReadAloud] Fallback also failed:", fallbackErr);
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
          ? "border-[#5C1A2E]/40 bg-[#5C1A2E]/5 text-[#5C1A2E]"
          : "border-[#E0D8D0] bg-white/70 text-[#4A4A4A] hover:text-[#5C1A2E] hover:border-[#5C1A2E]/30 hover:bg-[#5C1A2E]/5",
        sizeCls,
        className,
      ].join(" ")}
    >
      <Icon
        className={[
          iconCls,
          state === "loading" ? "animate-spin" : "",
          active ? "text-[#5A8A6A]" : "",
        ].join(" ")}
      />
      {label && <span className="ka text-[11px] font-medium">{label}</span>}
    </button>
  );
}

export default ReadAloudButton;
