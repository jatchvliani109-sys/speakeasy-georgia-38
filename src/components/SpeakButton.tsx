import { Volume2 } from "lucide-react";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  text: string;
  size?: "sm" | "md";
  className?: string;
};

// Strip Georgian characters so the TTS only reads the English parts
function extractEnglish(text: string): string {
  const cleaned = text.replace(/[\u10A0-\u10FF\u2D00-\u2D2F]+/g, " ");
  return cleaned.replace(/\s+/g, " ").trim();
}

// Module-level cache so the same phrase isn't re-fetched
const audioCache = new Map<string, string>();
let retryAfter = 0;

async function fetchRealisticAudio(text: string): Promise<string | null> {
  if (Date.now() < retryAfter) return null;
  if (audioCache.has(text)) return audioCache.get(text)!;
  try {
    const { data, error } = await supabase.functions.invoke("tts", {
      body: { text },
    });
    if (error || !data) {
      // Don't permanently disable the real voice; secrets/config can change while the app is open.
      retryAfter = Date.now() + 15_000;
      return null;
    }
    const blob = data instanceof Blob ? data : new Blob([data as ArrayBuffer], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    audioCache.set(text, url);
    return url;
  } catch {
    retryAfter = Date.now() + 15_000;
    return null;
  }
}

function speakWithBrowser(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.85;
  u.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const en =
    voices.find((v) => /en-US/i.test(v.lang) && /Google|Natural|Samantha|Aria|Jenny/i.test(v.name)) ||
    voices.find((v) => /en-US|en-GB/i.test(v.lang)) ||
    voices.find((v) => v.lang?.startsWith("en"));
  if (en) u.voice = en;
  window.speechSynthesis.speak(u);
}

export default function SpeakButton({ text, size = "sm", className = "" }: Props) {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const clean = extractEnglish(text);
    if (!clean) return;

    setSpeaking(true);
    const url = await fetchRealisticAudio(clean);
    if (url) {
      try {
        if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.playbackRate = 0.95;
        audio.onended = () => setSpeaking(false);
        audio.onerror = () => setSpeaking(false);
        await audio.play();
        return;
      } catch {
        // fall through to browser voice
      }
    }
    // Fallback: browser voice
    speakWithBrowser(clean);
    // Browser voice doesn't reliably fire onend cross-browser; clear after a beat
    setTimeout(() => setSpeaking(false), Math.min(6000, 800 + clean.length * 60));
  };

  const dim = size === "sm" ? "w-7 h-7" : "w-9 h-9";
  const icon = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";

  return (
    <button
      type="button"
      onClick={handleClick}
      title="🔊 Play pronunciation"
      aria-label="Play pronunciation"
      className={`inline-flex items-center justify-center rounded-full shrink-0 transition-colors ${dim} ${
        speaking ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-primary/15"
      } ${className}`}
    >
      <Volume2 className={icon} />
    </button>
  );
}
