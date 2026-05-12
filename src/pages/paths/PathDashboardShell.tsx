import { ReactNode } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import PathSwitcher from "@/components/PathSwitcher";

type CardSpec = { title: string; icon: string };

export default function PathDashboardShell({
  badge,
  title,
  cards,
  ctaLabel,
  ctaTo,
  themeClass,
  accentClass,
}: {
  badge: string;
  title: string;
  cards: CardSpec[];
  ctaLabel: string;
  ctaTo: string;
  themeClass: string;
  accentClass: string;
}): JSX.Element {
  return (
    <Layout>
      <div className="py-2 space-y-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={`text-xs font-semibold ka ${accentClass}`}>{badge}</p>
            <h1 className="text-2xl font-extrabold mt-1 ka">{title}</h1>
          </div>
          <PathSwitcher />
        </div>

        <div className={`p-5 rounded-3xl border-2 shadow-card ${themeClass}`}>
          <Button asChild variant="hero" size="xl" className="w-full ka">
            <Link to={ctaTo}>{ctaLabel}</Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {cards.map((c) => (
            <div key={c.title} className="p-4 rounded-2xl bg-card border border-border shadow-card flex flex-col items-start">
              <div className="text-2xl mb-1">{c.icon}</div>
              <div className="font-bold ka">{c.title}</div>
              <div className="text-[11px] text-muted-foreground ka mt-1">მალე ხელმისაწვდომი</div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

export function makePlaceholderCards(items: { title: string; icon: string }[]): ReactNode {
  return null;
}
