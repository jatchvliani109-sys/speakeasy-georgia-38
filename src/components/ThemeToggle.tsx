import { Moon, Sun, Laptop } from "lucide-react";
import { useTheme } from "@/lib/theme";

const LABELS: Record<string, string> = {
  system: "სისტემის რეჟიმი",
  light: "ნათელი რეჟიმი",
  dark: "მუქი რეჟიმი",
};

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { mode, cycle } = useTheme();
  const Icon = mode === "system" ? Laptop : mode === "light" ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={LABELS[mode]}
      title={LABELS[mode]}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-md text-ink-muted hover:text-wine hover:bg-wine/5 transition-colors ${className}`}
    >
      <Icon size={17} strokeWidth={2.25} />
    </button>
  );
}
