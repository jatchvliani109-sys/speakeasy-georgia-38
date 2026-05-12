import { Volume2 } from "lucide-react";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  text: string;
  size?: "sm" | "md";
  className?: string;
};

// Clean text for TTS: keep only English-friendly content, drop emojis,
// markdown, decorative symbols, and punctuation that voices read literally.
function extractEnglish(text: string): string {
  if (!text) return "";
  let s = text;

  // Remove emojis and pictographs (covers most modern emoji ranges).
  try {
    s = s.replace(/\p{Extended_Pictographic}/gu, " ");
    s = s.replace(/[\p{Emoji_Presentation}\p{Emoji_Modifier}\p{Emoji_Component}]/gu, " ");
  } catch {
    // Fallback for engines without Unicode property escapes
    s = s.replace(
      /[\u200D\u2600-\u27BF\uFE0F\u{1F000}-\u{1FFFF}]/gu,
      " "
    );
  }
  // Regional indicator flags
  s = s.replace(/[\u{1F1E6}-\u{1F1FF}]/gu, " ");

  // Remove Georgian (and related) script
  s = s.replace(/[\u10A0-\u10FF\u2D00-\u2D2F\u1C90-\u1CBF]+/g, " ");

  // Remove common markdown / decorative symbols
  s = s.replace(/[*_`~#>|\\/=+^<>{}\[\]()]/g, " ");
  // Bullets and dashes that get read aloud
  s = s.replace(/[•·●◦▪►–—−-]+/g, " ");
  // Quotes (straight + smart) and stray colons/semicolons
  s = s.replace(/["“”„«»‘’'`]/g, "");
  s = s.replace(/[:;]/g, ".");

  // If a phrase like Word: 'English part' exists, prefer the quoted English.
  // Already stripped quotes above; instead try to keep ASCII-letter sequences only.
  // Drop any leftover non-Latin letters/digits/punctuation we don't want.
  s = s.replace(/[^A-Za-z0-9 ,.!?']/g, " ");

  // Collapse repeated punctuation (e.g. "!!!" -> ".")
  s = s.replace(/[!?]+/g, ".");
  s = s.replace(/\.{2,}/g, ".");
  s = s.replace(/,+/g, ",");

  // Trim spaces around punctuation
  s = s.replace(/\s+([,.])/g, "$1");
  s = s.replace(/\s+/g, " ").trim();

  // If nothing meaningful (no Latin letters), return empty.
  if (!/[A-Za-z]/.test(s)) return "";
  return s;
}

// Module-level cache so the same phrase isn't re-fetched
const audioCache = new Map<string, string>();
let retryAfter = 0;

async function fetchRealisticAudio(text: string): Promise<string | null> {
  if (Date.now() < retryAfter) return null;
  if (audioCache.has(text)) return audioCache.get(text)!;
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const res = await fetch(`${supabaseUrl}/functions/v1/tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      // Don't permanently disable the real voice; secrets/config can change while the app is open.
      retryAfter = Date.now() + 15_000;
      return null;
    }
    const contentType = res.headers.get("Content-Type") || "";
    if (contentType.includes("application/json")) {
      retryAfter = Date.now() + 15_000;
      return null;
    }
    const blob = await res.blob();
    if (!blob.type.startsWith("audio/")) {
      retryAfter = Date.now() + 15_000;
      return null;
    }
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
