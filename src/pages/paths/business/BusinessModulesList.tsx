import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import BusinessShell, { BizCard } from "./BusinessShell";
import {
  BUSINESS_MODULES,
  pullBusinessFromSupabase,
  rankedModuleSlugs,
  recommendedModuleSlugs,
  type BusinessPriority,
} from "./lib/state";
import { useAuth } from "@/lib/auth";

export default function BusinessModulesList() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<BusinessPriority[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const s = await pullBusinessFromSupabase(user.id);
      if (cancelled) return;
      setGoals((s.plan?.mainGoals?.length ? s.plan.mainGoals : s.mainPriority) || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const orderedModules = useMemo(() => {
    // VOCAB-FIRST pivot: vocabulary leads, interview second; goal ranking
    // breaks ties for anything in between.
    const ranking = rankedModuleSlugs(goals);
    const goalRank = (slug: string) => (ranking ? ranking.indexOf(slug) : 0);
    const pivotRank = (slug: string) =>
      slug === "vocabulary" ? 0 : slug === "interview" ? 1 : 2;
    return [...BUSINESS_MODULES].sort(
      (a, b) =>
        pivotRank(a.slug) - pivotRank(b.slug) || goalRank(a.slug) - goalRank(b.slug),
    );
  }, [goals]);

  const recommended = useMemo(() => recommendedModuleSlugs(goals), [goals]);

  return (
    <BusinessShell seo={{ title: "მოდულები, SpeakBusy", description: "ბიზნეს ინგლისურის მოდულები: ლექსიკა და გასაუბრება.", path: "/path/business/modules" }}>
      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-wider text-ink-muted font-bold">
          SpeakBusy
        </p>
        <h1 className="ka text-2xl font-bold text-wine mt-1">მოდულები</h1>
        <p className="ka text-sm text-ink-muted mt-2">
          აირჩიე მოდული და დაიწყე ვარჯიში.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {orderedModules.map((m) => {
          const Icon = m.icon;
          const isRecommended = recommended.has(m.slug);
          return (
            <Link key={m.slug} to={`/path/business/module/${m.slug}`} className="group">
              <BizCard className="h-full hover:border-wine/50 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-md bg-panel-soft text-on-dark grid place-items-center shrink-0">
                    <Icon size={18} strokeWidth={2} />
                  </span>
                  <div className="flex-1 min-w-0">
                    {isRecommended && (
                      <span className="ka inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-wine bg-wine/8 border border-wine/20 rounded-full px-2 py-0.5 mb-1.5">
                        <Sparkles size={10} strokeWidth={2.5} />
                        შენთვის რეკომენდებული
                      </span>
                    )}
                    <h2 className="ka font-bold text-wine text-base leading-snug">
                      {m.title}
                    </h2>
                    <p className="ka text-xs text-ink-muted mt-1 leading-relaxed">
                      {m.description}
                    </p>
                    <span className="ka inline-flex items-center gap-1 text-[11px] font-semibold text-wine mt-3 group-hover:gap-1.5 transition-all">
                      გახსნა <ArrowRight size={12} strokeWidth={2.25} />
                    </span>
                  </div>
                </div>
              </BizCard>
            </Link>
          );
        })}
      </div>
    </BusinessShell>
  );
}