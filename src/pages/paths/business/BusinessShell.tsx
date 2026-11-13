import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import GlobalNav from "@/components/GlobalNav";
import SEO from "@/components/SEO";
import Wordmark from "@/components/Wordmark";
import ThemeToggle from "@/components/ThemeToggle";


// Shared shell for the Business English path.
//
// Same language as the landing page: cream page (dark at night), sand
// "paper" cards, brown ink, charcoal, and cobalt only on what should be
// clicked. BizCard is a sheet of paper; everything inside it re-colours for
// the sand automatically (see "Paper scope" in index.css).

export default function BusinessShell({
  children,
  back,
  seo,
}: {
  children: ReactNode;
  back?: { to: string; label: string };
  seo?: { title: string; description?: string; path: string };
}) {
  return (
    <div className="min-h-screen bg-cream">
      {seo && <SEO {...seo} />}
      <header className="border-b border-rule/10 bg-cream sticky top-0 z-20">
        <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link to="/path/business/home" className="flex items-center text-ink hover:opacity-75 transition-opacity">
            <Wordmark size="md" />
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <GlobalNav />
          </div>
        </div>
      </header>
      <main className="page-rise max-w-2xl w-full mx-auto px-4 py-6">
        {back && (
          <Link to={back.to} className="ka text-xs text-ink-muted hover:text-ink inline-flex items-center gap-1 mb-3">
            <ArrowLeft size={13} strokeWidth={2.25} /> {back.label}
          </Link>
        )}
        {children}
      </main>
    </div>
  );
}

export function BizCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`paper-card rounded-[22px] p-5 ${className}`}>{children}</div>;
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
    "press ka inline-flex items-center justify-center gap-1.5 px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-bold transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";
  // primary: the action to take (cobalt). accent: a strong secondary
  // (charcoal). outline / ghost: everything else.
  const styles =
    variant === "primary"
      ? "bg-cta text-cta-fg hover:bg-cta-hover shadow-[0_10px_22px_-12px_hsl(var(--cta)/0.7)]"
      : variant === "accent"
      ? "bg-paper-btn text-paper-btn-fg hover:bg-paper-btn/90"
      : variant === "outline"
      ? "border border-ink/20 text-ink hover:bg-ink/5 hover:border-ink/35"
      : "text-ink hover:bg-ink/5";
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}
