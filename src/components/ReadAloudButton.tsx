import { useEffect, useRef, useState } from "react";
import { Volume2, Square, Loader2 } from "lucide-react";

// Single-playback controller shared across the app
let currentAudio: HTMLAudioElement | null = null;
let currentToken = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL;

// Pre-generated word audio lives in public storage — free + instant.
const storageUrlFor = (key: string) =>
  `${SUPABASE_URL}/storage/v1/object/public/word-audio/${encodeURIComponent(key)}.mp3`;

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
  /** Vocab bank word key — plays the pre-generated MP3 from storage (free, instant).
   *  Falls back to live TTS automatically if no stored audio exists for the key. */
  storageKey?: string;
  className?: string;
  size?: "sm" | "md";
  label?: string; // optional Georgian label appended next to icon
};

export function ReadAloudButton({ text, storageKey, className = "", size = "sm", label }: Props) {
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

  // Attempt playback of a URL; resolves true if playback started, false on failure.
  const tryPlay = (url: string, myToken: number): Promise<boolean> =>
    new Promise((resolve) => {
      if (myToken !== currentToken) return resolve(false);
      const audio = new Audio(url);
      audio.playbackRate = 0.95;
      let settled = false;
      const fail = () => {
        if (settled) return;
        settled = true;
        if (currentAudio === audio) currentAudio = null;
        resolve(false);
      };
      audio.onerror = fail;
      audio.onended = () => {
        if (currentAudio === audio) { currentAudio = null; notify(); }
        setState("idle");
      };
      audio
        .play()
        .then(() => {
          if (settled) return;
          if (myToken !== currentToken) {
            try { audio.pause(); } catch {}
            return resolve(false);
          }
          settled = true;
          audioRef.current = audio;
          currentAudio = audio;
          notify();
          resolve(true);
        })
        .catch(fail);
    });

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
      // 1) Pre-generated storage audio — zero cost, instant, studio quality.
      if (storageKey) {
        const ok = await tryPlay(storageUrlFor(storageKey), myToken);
        if (ok) { setState("playing"); return; }
        if (myToken !== currentToken) return;
      }
      // 2) No stored audio -> free browser speech.
      throw new Error("no stored audio");
    } catch (err) {
      try {
        const synth = window.speechSynthesis;
        if (!synth) throw new Error("speech unsupported");
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "en-US";
        u.rate = 0.95;
        u.onend = () => setState("idle");
        u.onerror = () => setState("idle");
        // Keep a global ref: Safari garbage-collects utterances mid-speech,
        // which silently kills playback.
        (window as any).__sbUtterance = u;
        synth.cancel();
        // iOS Safari drops an utterance queued in the same tick as cancel();
        // resume() un-sticks a paused synth after backgrounding.
        window.setTimeout(() => {
          try {
            synth.resume();
            synth.speak(u);
          } catch {
            setState("idle");
          }
        }, 80);
        setState("playing");
        // Safety net: if neither onend nor onerror ever fires (a known iOS
        // quirk), reset the button so it never gets stuck.
        const myToken2 = currentToken;
        window.setTimeout(() => {
          if (currentToken === myToken2 && !synth.speaking) setState("idle");
        }, 15000);
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
