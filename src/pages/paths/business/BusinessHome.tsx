import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";
import PathSwitcher from "@/components/PathSwitcher";
import {
  BUSINESS_MODULES,
  BusinessIntensity,
  BusinessState,
  FIELD_LABELS,
  INTENSITY_LABELS,
  LEVEL_LABELS,
  PRIORITY_LABELS,
  pullBusinessFromSupabase,
} from "./lib/state";

const INTENSITY_MINUTES: Record<BusinessIntensity, string> = {
  light: "10 წუთი",
  standard: "20 წუთი",
  intensive: "30–40 წუთი",
  deadline: "30 წუთი",
};

const MODULE_FOCUS: Record<string, { title: string; subtitle: string }> = {
  interview: {
    title: "გასაუბრების პასუხების ვარჯიში",
    subtitle: "ერთი კითხვა, მკაფიო პასუხი — დღევანდელი მცირე გამარჯვება.",
  },
  emails: {
    title: "დღევანდელი იმეილის გამოწვევა",
    subtitle: "დაწერე ერთი პროფესიული იმეილი და მიიღე AI უკუკავშირი.",
  },
  meetings: {
    title: "შეხვედრის ფრაზების სცენარი",
    subtitle: "ივარჯიშე როგორ ჩაერთო და გამოთქვა აზრი შეხვედრაზე.",
  },
  presentations: {
    title: "პრეზენტაციის სტრუქტურის ვარჯიში",
    subtitle: "გახსნა, მთავარი იდეა, დასკვნა — სამივე ერთ მცირე სავარჯიშოში.",
  },
  vocabulary: {
    title: "დღევანდელი ბიზნეს სიტყვები",
    subtitle: "ახალი სიტყვები მაგალითებითა და ქართული ახსნებით.",
  },
};

export default function BusinessHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [s, setS] = useState<BusinessState | null>(null);
  const [emailsCount, setEmailsCount] = useState<number>(0);
  const [doneToday, setDoneToday] = useState<boolean>(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const cur = await pullBusinessFromSupabase(user.id);
      if (cancelled) return;
      setS(cur);
      const { count } = await supabase
        .from("business_email_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("completed", true);
      if (!cancelled) setEmailsCount(count ?? 0);

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { data: todays } = await supabase
        .from("business_email_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("completed", true)
        .gte("completed_at", startOfDay.toISOString())
        .limit(1);
      if (!cancelled) setDoneToday((todays?.length ?? 0) > 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const displayName = useMemo(() => {
    const meta = (user?.user_metadata as any) || {};
    return (
      meta.display_name ||
      meta.full_name ||
      meta.name ||
      (user?.email ? user.email.split("@")[0] : "")
    );
  }, [user]);

  if (!s) {
    return (
      <BusinessShell>
        <div className="ka text-[#5B6473]">იტვირთება...</div>
      </BusinessShell>
    );
  }

  const incomplete = !s.setupCompleted || !s.testCompleted || !s.plan;
  const plan = s.plan;
  const showIntroCard =
    !!plan && !s.businessSelfIntroductionCompleted;

  const focusModuleSlug = plan?.recommendedModule || "emails";
  const focusMod = BUSINESS_MODULES.find((m) => m.slug === focusModuleSlug);
  const focusCopy = MODULE_FOCUS[focusModuleSlug] || MODULE_FOCUS.emails;
  const focusMinutes = plan ? INTENSITY_MINUTES[plan.intensity] : "15 წუთი";

  const moduleProgress: Record<string, number> = { emails: emailsCount };

  return (
    <BusinessShell>
      {/* 1. Greeting */}
      <header className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">
            ბიზნეს ინგლისური
          </p>
          <h1 className="ka text-2xl font-bold text-[#1E2A44] mt-1">
            გამარჯობა{displayName ? `, ${displayName}` : ""}
            {plan ? ` — ${LEVEL_LABELS[plan.level]}` : ""}
          </h1>
        </div>
        <PathSwitcher />
      </header>

      {incomplete && (
        <BizCard className="mb-4 border-l-4 border-l-[#C9A227] bg-[#FFFBEA]">
          <p className="ka text-sm text-[#1E2A44]">
            სრული პერსონალიზაციისთვის გირჩევთ დაასრულოთ Business setup და ტესტი.
          </p>
          <div className="mt-3 flex gap-2 flex-wrap">
            <BizButton onClick={() => navigate("/path/business/setup")}>Setup-ის დასრულება</BizButton>
            <BizButton variant="outline" onClick={() => navigate("/path/business/test")}>ტესტი</BizButton>
          </div>
        </BizCard>
      )}

      {plan && (
        <>
          {/* 2. Today's Focus */}
          <section className="mb-5">
            <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold mb-2 px-1">
              დღევანდელი ფოკუსი
            </p>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E2A44] to-[#15203A] text-[#F7F1E3] p-6 shadow-[0_12px_32px_-12px_rgba(30,42,68,0.45)]">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#C9A227]/15 blur-2xl pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="ka text-[10px] uppercase tracking-wider bg-[#C9A227]/20 text-[#F2D680] px-2 py-1 rounded-md font-semibold">
                    {doneToday ? "დღევანდელი მისია შესრულებულია" : "შენი დღევანდელი მისია"}
                  </span>
                  {doneToday ? (
                    <span className="ka text-[10px] inline-flex items-center gap-1 bg-[#0F766E]/25 text-[#A7F3D0] px-2 py-1 rounded-md font-semibold">
                      ✓ დასრულდა
                    </span>
                  ) : (
                    <span className="ka text-[10px] text-[#F7F1E3]/70">⏱ ~{focusMinutes}</span>
                  )}
                </div>
                <h2 className="ka text-xl font-bold leading-snug">
                  {doneToday ? "ყოჩაღ — დღევანდელი გაკვეთილი დასრულდა" : focusCopy.title}
                </h2>
                <p className="ka text-sm text-[#F7F1E3]/80 mt-2 leading-relaxed">
                  {doneToday
                    ? "შენი პროგრესი განახლდა. ხვალ ახალი სცენარით დაგხვდები."
                    : focusCopy.subtitle}
                </p>
                {focusMod && (
                  <p className="ka text-[11px] text-[#F7F1E3]/60 mt-3">
                    მოდული: {focusMod.title}
                  </p>
                )}
                <button
                  onClick={() => navigate(`/path/business/module/${focusModuleSlug}`)}
                  className="ka mt-5 inline-flex items-center justify-center gap-2 bg-[#C9A227] text-[#1E2A44] hover:bg-[#D8B547] transition-colors px-5 py-3 rounded-xl font-bold text-sm w-full sm:w-auto"
                >
                  {doneToday ? "კიდევ ერთი სესია →" : "დაწყება →"}
                </button>
              </div>
            </div>
          </section>

          {/* 3. Your Plan */}
          <section className="mb-4">
            <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold mb-2 px-1">
              შენი გეგმა
            </p>
            <BizCard>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Mini label="დონე" value={LEVEL_LABELS[plan.level]} />
                <Mini label="ინტენსივობა" value={INTENSITY_LABELS[plan.intensity]} />
                <Mini
                  label="მთავარი მიზნები"
                  value={plan.mainGoals.map((g) => PRIORITY_LABELS[g]).join(", ")}
                />
                <Mini label="სფეროები" value={plan.fields.map((f) => FIELD_LABELS[f]).join(", ")} />
              </div>
              <Link
                to="/path/business/plan"
                className="ka text-[11px] text-[#1E2A44] underline underline-offset-2 mt-3 inline-block"
              >
                სრული გეგმის ნახვა
              </Link>
            </BizCard>
          </section>

          {/* 3b. Optional self-introduction suggestion */}
          {showIntroCard && (
            <BizCard className="mb-5 bg-[#FAF7F0] border-dashed">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">
                    რეკომენდაცია
                  </p>
                  <p className="ka text-sm font-semibold text-[#1E2A44] mt-1">
                    შექმენი შენი პროფესიული წარდგენა
                  </p>
                  <p className="ka text-xs text-[#5B6473] mt-1">
                    სასარგებლოა გასაუბრებებზე, networking-ზე და LinkedIn-ზე.
                  </p>
                </div>
                <Link
                  to="/path/business/self-introduction"
                  className="ka text-xs text-[#1E2A44] underline underline-offset-2 shrink-0 mt-1"
                >
                  დაწყება →
                </Link>
              </div>
            </BizCard>
          )}

          {/* 4. Modules */}
          <section className="mb-5">
            <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold mb-2 px-1">
              მოდულები
            </p>
            <div className="space-y-2">
              {BUSINESS_MODULES.map((m) => {
                const count = moduleProgress[m.slug] ?? 0;
                const started = count > 0;
                return (
                  <Link
                    key={m.slug}
                    to={`/path/business/module/${m.slug}`}
                    className="block bg-white border border-[#E7E2D5] rounded-2xl p-4 hover:border-[#1E2A44]/40 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl shrink-0">{m.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="ka font-semibold text-sm text-[#1E2A44] truncate">
                            {m.title}
                          </p>
                          <span
                            className={`ka text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                              started
                                ? "bg-[#1E2A44]/10 text-[#1E2A44]"
                                : "bg-[#FAF7F0] text-[#5B6473] border border-[#E7E2D5]"
                            }`}
                          >
                            {started ? `${count} სესია` : "ჯერ არ დაწყებულა"}
                          </span>
                        </div>
                        <p className="ka text-[11px] text-[#5B6473] mt-1 line-clamp-2">
                          {m.description}
                        </p>
                        <div className="mt-2 h-1 rounded-full bg-[#F0EBDD] overflow-hidden">
                          <div
                            className="h-full bg-[#C9A227] transition-all"
                            style={{ width: `${Math.min(100, count * 10)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* 5. Progress */}
          <section>
            <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold mb-2 px-1">
              პროგრესი
            </p>
            <BizCard>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="გაუმჯობესებული იმეილები" value={String(emailsCount)} />
                <Stat label="ბიზნეს სიტყვები" value="0" />
                <Stat label="გასაუბრების პასუხები" value="0" />
                <Stat label="გაკვეთილები" value="0" />
              </div>
            </BizCard>
          </section>
        </>
      )}
    </BusinessShell>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#FAF7F0] border border-[#E7E2D5] rounded-lg px-3 py-2">
      <div className="ka text-[10px] text-[#5B6473]">{label}</div>
      <div className="ka text-xs font-semibold text-[#1E2A44] mt-0.5">{value}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#FAF7F0] border border-[#E7E2D5] rounded-xl px-3 py-3">
      <div className="text-xl font-bold text-[#1E2A44]">{value}</div>
      <div className="ka text-[11px] text-[#5B6473] mt-0.5">{label}</div>
    </div>
  );
}
