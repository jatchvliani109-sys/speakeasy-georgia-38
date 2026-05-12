import { ReactNode } from "react";
import Layout from "@/components/Layout";

export default function SpeakingShell({ children }: { children: ReactNode }) {
  return (
    <Layout>
      <div className="sp-bg relative -mx-4 -my-6 px-4 py-6 min-h-[calc(100vh-4rem)] rounded-none overflow-hidden">
        <div className="relative z-[1]">{children}</div>
      </div>
    </Layout>
  );
}

export function SoundBars({ count = 5, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`flex items-end gap-1 h-6 ${className}`}>
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
