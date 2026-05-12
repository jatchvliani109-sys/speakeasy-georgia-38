import { Mic } from "lucide-react";

export default function MicPlaceholder() {
  return (
    <button
      type="button"
      disabled
      title="Recording coming soon"
      className="inline-flex items-center gap-2 rounded-full bg-secondary text-muted-foreground px-3 py-1.5 text-xs font-medium cursor-not-allowed opacity-70"
    >
      <Mic className="w-3.5 h-3.5" />
      🎤 Recording coming soon
    </button>
  );
}
