import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import GlobalNav from "@/components/GlobalNav";

// Shared shell for the Business English path.
// Premium-education theme: warm white, cream, muted navy, slate, subtle gold accent.

export default function BusinessShell({
  children,
  back,
}: {
  children: ReactNode;
  back?: { to: string; label: string };
}) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#FAF7F0]">
      <header className="border-b border-[#E7E2D5] bg-[#FAF7F0]/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/path/business" className="flex items-center gap-2 text-[#1E2A44]">
            <span className="w-7 h-7 rounded-md bg-[#1E2A44] text-[#F7F1E3] grid place-items-center text-xs font-bold">B</span>
            <span className="ka font-semibold text-sm">ბიზნეს ინგლისური</span>
          </Link>
          <div className="flex items-center gap-1">
            <GlobalNav />
            <Link to="/learning-path" className="ka text-xs text-[#5B6473] hover:text-[#1E2A44]">
              ↺
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-2xl w-full mx-auto px-4 py-6 animate-[bizFade_.45s_ease-out_both]">
        {back ? (
          <Link to={back.to} className="ka text-xs text-[#5B6473] hover:text-[#1E2A44] inline-flex items-center gap-1 mb-3">
            ← {back.label}
          </Link>
        ) : (
          <button
            onClick={() => navigate(-1)}
            className="ka text-xs text-[#5B6473] hover:text-[#1E2A44] inline-flex items-center gap-1 mb-3"
            aria-label="უკან"
          >
            ← უკან
          </button>
        )}
        {children}
      </main>
      <style>{`
        @keyframes bizFade { from { opacity: 0; transform: translateY(8px);} to { opacity:1; transform:none; } }
      `}</style>
    </div>
  );
}

export function BizCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-[#E7E2D5] rounded-2xl p-5 shadow-[0_1px_2px_rgba(30,42,68,0.04),0_8px_24px_-12px_rgba(30,42,68,0.12)] ${className}`}>
      {children}
    </div>
  );
}

export function BizButton({
  children,
  onClick,
  disabled,
  variant = "primary",
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "outline";
  type?: "button" | "submit";
  className?: string;
}) {
  const base =
    "ka inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-[#1E2A44] text-[#F7F1E3] hover:bg-[#15203A] shadow-sm"
      : variant === "outline"
      ? "border border-[#1E2A44]/20 text-[#1E2A44] hover:bg-[#1E2A44]/5"
      : "text-[#1E2A44] hover:bg-[#1E2A44]/5";
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}
