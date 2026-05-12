import { Check, Volume2 } from "lucide-react";
import SpeakButton from "@/components/SpeakButton";

type Props = {
  english: string;
  georgian: string;
  example?: string;
  practiced?: boolean;
  onPracticed?: () => void;
  showRepeatHints?: boolean;
};

export default function PhraseCard({ english, georgian, example, practiced, onPracticed, showRepeatHints }: Props) {
  return (
    <div className="sp-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <SpeakButton text={english} size="md" className="!w-12 !h-12 !rounded-2xl sp-btn-teal !text-white" />
        <div className="min-w-0 flex-1">
          <div className="text-base font-bold break-words sp-text">{english}</div>
          <div className="text-sm sp-text-muted ka mt-0.5">{georgian}</div>
          {example && (
            <div className="flex items-start gap-2 mt-2">
              <SpeakButton text={example} />
              <div className="text-xs italic sp-text-muted">"{example}"</div>
            </div>
          )}
        </div>
      </div>

      {/* sound-wave visual */}
      <div className="flex items-center gap-1 h-3 opacity-70">
        {Array.from({ length: 28 }).map((_, i) => (
          <span
            key={i}
            className="block w-[3px] rounded-full bg-gradient-to-b from-blue-300 to-purple-400"
            style={{ height: `${20 + Math.abs(Math.sin(i * 0.7)) * 80}%` }}
          />
        ))}
      </div>

      {showRepeatHints && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t sp-divider">
          <span className="text-xs sp-text-muted ka">🔊 მოუსმინე • 🗣️ გაიმეორე ხმამაღლა</span>
        </div>
      )}

      {onPracticed && (
        <div className="flex items-center justify-end pt-1">
          <button
            type="button"
            onClick={onPracticed}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ka transition-smooth ${
              practiced
                ? "sp-btn-teal"
                : "sp-chip hover:bg-purple-400/30"
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            {practiced ? "გავიმეორე ✓" : "I practiced"}
          </button>
        </div>
      )}
    </div>
  );
}
