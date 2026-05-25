import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Layout from "@/components/Layout";

export default function SpeakingShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  useEffect(() => {
    document.body.classList.add("sp-active");
    return () => document.body.classList.remove("sp-active");
  }, []);
  return (
    <Layout>
      <div className="relative">
        <div key={pathname} className="sp-page-enter">
          {children}
        </div>
      </div>
    </Layout>
  );
}

export function SoundBars({ count = 4, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`flex items-end gap-1 h-5 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="sp-bar"
          style={{ height: "100%", animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}
