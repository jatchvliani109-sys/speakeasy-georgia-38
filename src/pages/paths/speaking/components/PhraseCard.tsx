import { Check } from "lucide-react";
import SpeakButton from "@/components/SpeakButton";
import { Button } from "@/components/ui/button";

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
    <div className="p-4 rounded-2xl bg-card border border-border shadow-card space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <SpeakButton text={english} />
            <div className="text-base font-bold break-words">{english}</div>
          </div>
          <div className="text-sm text-muted-foreground ka mt-1">{georgian}</div>
          {example && (
            <div className="flex items-start gap-2 mt-2">
              <SpeakButton text={example} />
              <div className="text-xs italic text-muted-foreground">"{example}"</div>
            </div>
          )}
        </div>
      </div>

      {showRepeatHints && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
          <span className="text-xs text-muted-foreground ka">🔊 მოუსმინე • 🗣️ გაიმეორე ხმამაღლა</span>
        </div>
      )}

      {onPracticed && (
        <div className="flex items-center justify-between pt-1">
          <Button
            type="button"
            size="sm"
            variant={practiced ? "default" : "soft"}
            className="ka"
            onClick={onPracticed}
          >
            <Check className="w-4 h-4" />
            {practiced ? "გავიმეორე ✓" : "I practiced"}
          </Button>
        </div>
      )}
    </div>
  );
}
