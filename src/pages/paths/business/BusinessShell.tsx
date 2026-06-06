import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Briefcase } from "lucide-react";
import GlobalNav from "@/components/GlobalNav";

// Shared shell for the Business English path.
// Premium professional theme: deep navy (#3d6b9e), warm cream (#F5F0E8),
// slate (#64748B). Gold (#C9A84C) reserved for key CTAs only.
// Sharp corners, subtle 1px borders, minimal shadows.

export default function BusinessShell({
  children,
  back,
}: {
  children: ReactNode;
  back?: { to: string; label: string };
}) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <header className="border-b border-[#E2DDD0] bg-[#F5F0E8]/85 backdrop-blur sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/path/business" className="flex items-center gap-2 text-[#3d6b9e]">
            <span className="w-7 h-7 rounded-md bg-[#3d6b9e] text-[#F5F0E8] grid place-items-center">
              <Briefcase size={14} strokeWidth={2.25} />
            </span>
            <span className="ka font-semibold text-sm tracking-tight">ბიზნეს ინგლისური</span>
          </Link>
          <GlobalNav />
        </div>
      </header>
      <main className="max-w-2xl w-full mx-auto px-4 py-6 animate-[bizFade_.45s_ease-out_both]">
        {back ? (
          <Link to={back.to} className="ka text-xs text-[#64748B] hover:text-[#3d6b9e] inline-flex items-center gap-1 mb-3">
            <ArrowLeft size={13} strokeWidth={2.25} /> {back.label}
          </Link>
        ) : (
          <button
            onClick={() => navigate(-1)}
            className="ka text-xs text-[#64748B] hover:text-[#3d6b9e] inline-flex items-center gap-1 mb-3"
            aria-label="უკან"
          >
            <ArrowLeft size={13} strokeWidth={2.25} /> უკან
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
    <div className={`bg-white border border-[#E2DDD0] rounded-lg p-5 ${className}`}>
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
  variant?: "primary" | "ghost" | "outline" | "accent";
  type?: "button" | "submit";
  className?: string;
}) {
  const base =
    "ka inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-[#3d6b9e] text-[#F5F0E8] hover:bg-[#2a5298]"
      : variant === "accent"
      ? "bg-[#C9A84C] text-[#3d6b9e] hover:bg-[#B89538]"
      : variant === "outline"
      ? "border border-[#3d6b9e]/25 text-[#3d6b9e] hover:bg-[#3d6b9e]/5"
      : "text-[#3d6b9e] hover:bg-[#3d6b9e]/5";
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}
