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
    // VOCAB-FIRST pivot: vocabulary leads, interview second, emails demoted
    // to the end; goal ranking breaks ties for anything in between.
    const ranking = rankedModuleSlugs(goals);
    const goalRank = (slug: string) => (ranking ? ranking.indexOf(slug) : 0);
    const pivotRank = (slug: string) =>
      slug === "vocabulary" ? 0 : slug === "interview" ? 1 : slug === "emails" ? 3 : 2;
    return [...BUSINESS_MODULES].sort(
      (a, b) =>
        pivotRank(a.slug) - pivotRank(b.slug) || goalRank(a.slug) - goalRank(b.slug),
    );
  }, [goals]);

  const recommended = useMemo(() => recommendedModuleSlugs(goals), [goals]);

  return (
    <BusinessShell seo={{ title: "მოდულები — SpeakBusy", description: "ბიზნეს ინგლისურის მოდულები: ლექსიკა, სცენარები და გასაუბრება.", path: "/path/business/modules" }}>
      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-wider text-[#4A4A4A] font-bold">
          SpeakBusy
        </p>
        <h1 className="ka text-2xl font-bold text-[#5C1A2E] mt-1">მოდულები</h1>
        <p className="ka text-sm text-[#4A4A4A] mt-2">
          აირჩიე მოდული და დაიწყე ვარჯიში.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/path/business/scenarios" className="group sm:col-span-2">
          <BizCard className="h-full border-[#C9A84C]/45 hover:border-[#C9A84C] transition-colors">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-md bg-[#232323] text-[#C9A84C] grid place-items-center shrink-0 text-base">
                🎬
              </span>
              <div className="flex-1 min-w-0">
                <span className="ka inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#5C1A2E] bg-[#C9A84C]/20 border border-[#C9A84C]/35 rounded-full px-2 py-0.5 mb-1.5">
                  <Sparkles size={10} strokeWidth={2.5} />
                  ახალი
                </span>
                <h2 className="ka font-bold text-[#5C1A2E] text-base leading-snug">
                  სცენარები
                </h2>
                <p className="ka text-xs text-[#4A4A4A] mt-1 leading-relaxed">
                  ისწავლე სიტყვები რეალურ სამუშაო სიტუაციებში — დიალოგებით, აუდიოთი და ვარჯიშით.
                </p>
                <span className="ka inline-flex items-center gap-1 text-[11px] font-semibold text-[#5C1A2E] mt-3 group-hover:gap-1.5 transition-all">
                  გახსნა <ArrowRight size={12} strokeWidth={2.25} />
                </span>
              </div>
            </div>
          </BizCard>
        </Link>
        {orderedModules.map((m) => {
          const Icon = m.icon;
          const isRecommended = recommended.has(m.slug);
          return (
            <Link key={m.slug} to={`/path/business/module/${m.slug}`} className="group">
              <BizCard className="h-full hover:border-[#5C1A2E]/50 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-md bg-[#232323] text-[#F5F4F2] grid place-items-center shrink-0">
                    <Icon size={18} strokeWidth={2} />
                  </span>
                  <div className="flex-1 min-w-0">
                    {isRecommended && (
                      <span className="ka inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#5C1A2E] bg-[#5C1A2E]/8 border border-[#5C1A2E]/20 rounded-full px-2 py-0.5 mb-1.5">
                        <Sparkles size={10} strokeWidth={2.5} />
                        შენთვის რეკომენდებული
                      </span>
                    )}
                    <h2 className="ka font-bold text-[#5C1A2E] text-base leading-snug">
                      {m.title}
                    </h2>
                    <p className="ka text-xs text-[#4A4A4A] mt-1 leading-relaxed">
                      {m.description}
                    </p>
                    <span className="ka inline-flex items-center gap-1 text-[11px] font-semibold text-[#5C1A2E] mt-3 group-hover:gap-1.5 transition-all">
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
