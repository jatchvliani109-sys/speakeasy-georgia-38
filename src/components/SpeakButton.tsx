import { Volume2 } from "lucide-react";
import { useState } from "react";

type Props = {
  text: string;
  size?: "sm" | "md";
  className?: string;
};

// Strip Georgian characters so the English-voice TTS only reads the English parts
function extractEnglish(text: string): string {
  // Remove Georgian script ranges
  const cleaned = text.replace(/[\u10A0-\u10FF\u2D00-\u2D2F]+/g, " ");
  return cleaned.replace(/\s+/g, " ").trim();
}

export default function SpeakButton({ text, size = "sm", className = "" }: Props) {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!supported) return;
    const clean = extractEnglish(text);
    if (!clean) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = "en-US";
      u.rate = 0.8; // slow & clear for beginners
      u.pitch = 1;
      // Prefer a clear English voice if available
      const voices = window.speechSynthesis.getVoices();
      const en = voices.find((v) => /en-US|en_US|en-GB/i.test(v.lang)) || voices.find((v) => v.lang?.startsWith("en"));
      if (en) u.voice = en;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(u);
    } catch {
      setSpeaking(false);
    }
  };

  const dim = size === "sm" ? "w-7 h-7" : "w-9 h-9";
  const icon = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";

  return (
    <button
      type="button"
      onClick={handleClick}
      title={supported ? "მოუსმინე გამოთქმას" : "🔊 Play pronunciation (coming soon)"}
      aria-label="Play pronunciation"
      className={`inline-flex items-center justify-center rounded-full shrink-0 transition-colors ${dim} ${
        speaking ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-primary/15"
      } ${className}`}
    >
      <Volume2 className={icon} />
    </button>
  );
}
