import { useEffect, useRef, useState } from "react";
import { Volume2, Square, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Shared cache + single-playback controller across the app
const cache = new Map<string, string>();
let currentAudio: HTMLAudioElement | null = null;
let currentToken = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

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
      // 1) Pre-generated storage audio (bank words) — zero cost, instant.
      if (storageKey) {
        const ok = await tryPlay(storageUrlFor(storageKey), myToken);
        if (ok) { setState("playing"); return; }
        if (myToken !== currentToken) return;
        console.log("[ReadAloud] No stored audio for key, falling back to TTS:", storageKey);
      }

      // 2) Live TTS via edge function (dynamic text: AI feedback, external phrases).
      let url = cache.get(text);
      if (!url) {
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

        if (!response.ok) {
          const errText = await response.text().catch(() => "");
          throw new Error(`TTS function failed: ${response.status} ${errText}`);
        }

        const blob = await response.blob();
        if (blob.size === 0) throw new Error("Empty audio blob");

        url = URL.createObjectURL(blob);
        cache.set(text, url);
      }

      if (myToken !== currentToken) return; // user clicked another button while loading

      const ok = await tryPlay(url, myToken);
      if (ok) { setState("playing"); return; }
      throw new Error("Playback failed");
    } catch (err) {
      console.error("[ReadAloud] Failed, falling back to SpeechSynthesis:", err);
      // 3) Browser SpeechSynthesis fallback
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
      />import { useEffect, useRef, useState } from "react";
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
      //    (980 vocab words + all scenario dialogue lines live here.)
      if (storageKey) {
        const ok = await tryPlay(storageUrlFor(storageKey), myToken);
        if (ok) { setState("playing"); return; }
        if (myToken !== currentToken) return;
      }
      // 2) No stored audio -> free browser speech. The paid live-TTS edge
      //    function is deliberately NOT called anymore — pre-recorded audio
      //    covers everything that matters, and dynamic text falls back to
      //    the device voice at zero cost.
      throw new Error("no stored audio");
    } catch (err) {
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

      {label && <span className="ka text-[11px] font-medium">{label}</span>}
    </button>
  );
}

export default ReadAloudButton;
