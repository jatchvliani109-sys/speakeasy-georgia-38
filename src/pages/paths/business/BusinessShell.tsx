import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Briefcase } from "lucide-react";
import GlobalNav from "@/components/GlobalNav";
import SEO from "@/components/SEO";

// Shared shell for the Business English path.

export default function BusinessShell({
  children,
  back,
  seo,
}: {
  children: ReactNode;
  back?: { to: string; label: string };
  seo?: { title: string; description?: string; path: string };
}) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#F5F4F2]">
      {seo && <SEO {...seo} />}
      <header className="border-b border-[#E4E2DF] bg-[#F5F4F2]/85 backdrop-blur sticky top-0 z-20">
        <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link to="/path/business/home" className="flex items-center gap-2 text-[#5C1A2E]">
            <span className="w-7 h-7 rounded-md bg-[#232323] text-[#F5F4F2] grid place-items-center">
              <Briefcase size={14} strokeWidth={2.25} />
            </span>
            <span className="font-bold text-sm tracking-tight">SpeakBusy</span>
          </Link>
          <GlobalNav />
        </div>
      </header>
      <main className="max-w-2xl w-full mx-auto px-4 py-6 animate-[bizFade_.45s_ease-out_both]">
        {back ? (
          <Link to={back.to} className="ka text-xs text-[#4A4A4A] hover:text-[#5C1A2E] inline-flex items-center gap-1 mb-3">
            <ArrowLeft size={13} strokeWidth={2.25} /> {back.label}
          </Link>
        ) : (
          <button
            onClick={() => navigate(-1)}
            className="ka text-xs text-[#4A4A4A] hover:text-[#5C1A2E] inline-flex items-center gap-1 mb-3"
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
    <div className={`bg-white border border-[#E4E2DF] rounded-lg p-5 ${className}`}>
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
      ? "bg-[#232323] text-[#F5F4F2] hover:bg-[#111111]"
      : variant === "accent"
      ? "bg-[#1C1C1E] text-[#5C1A2E] hover:bg-[#3A3A3A]"
      : variant === "outline"
      ? "border border-[#5C1A2E]/25 text-[#5C1A2E] hover:bg-[#5C1A2E]/5"
      : "text-[#5C1A2E] hover:bg-[#5C1A2E]/5";
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}
