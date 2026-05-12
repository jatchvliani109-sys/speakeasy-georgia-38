import { Check } from "lucide-react";
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
    <div className="sp-card p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <SpeakButton
          text={english}
          size="md"
          className="!w-11 !h-11 !rounded-xl sp-btn-teal !text-white shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="text-[17px] font-bold leading-snug break-words sp-text">{english}</div>
          <div className="text-sm ka mt-1" style={{ color: "hsl(220 15% 42%)" }}>{georgian}</div>
          {example && (
            <div className="flex items-start gap-2 mt-3 pt-3 sp-rule">
              <SpeakButton text={example} />
              <div className="text-[13px] italic" style={{ color: "hsl(220 18% 50%)" }}>"{example}"</div>
            </div>
          )}
        </div>
      </div>

      {(showRepeatHints || onPracticed) && (
        <div className="flex items-center justify-between gap-3 mt-4 pt-3 sp-rule">
          {showRepeatHints ? (
            <span className="text-[11px] sp-text-soft ka">🔊 მოუსმინე · 🗣️ გაიმეორე ხმამაღლა</span>
          ) : <span />}
          {onPracticed && (
            <button
              type="button"
              onClick={onPracticed}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ka transition-colors ${
                practiced ? "sp-btn-teal" : "sp-chip hover:bg-[hsl(40_40%_92%)]"
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              {practiced ? "გავიმეორე" : "გავიმეორე"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
