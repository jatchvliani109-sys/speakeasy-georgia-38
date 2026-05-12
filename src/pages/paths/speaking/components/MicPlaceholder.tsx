import { Mic } from "lucide-react";

export default function MicPlaceholder() {
  return (
    <button
      type="button"
      disabled
      title="ხმოვანი ჩაწერა მალე დაემატება"
      className="inline-flex items-center gap-2 rounded-full sp-chip px-3 py-1.5 text-xs font-medium ka cursor-not-allowed opacity-80"
    >
      <Mic className="w-3.5 h-3.5" />
      ხმოვანი ჩაწერა მალე
    </button>
  );
}
