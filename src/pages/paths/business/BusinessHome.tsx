import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";
import PathSwitcher from "@/components/PathSwitcher";
import {
  BUSINESS_MODULES,
  BusinessIntensity,
  BusinessPriority,
  BusinessState,
  FIELD_LABELS,
  INTENSITY_LABELS,
  LEVEL_LABELS,
  PRIORITY_LABELS,
  pullBusinessFromSupabase,
  resetBusiness,
} from "./lib/state";
import { emailStep, interviewStep, meetingStep } from "./lib/curriculum";
import { loadProgress, planSession } from "./lib/vocabEngine";
import type { VocabWord } from "./lib/vocabBank";

const INTENSITY_MINUTES: Record<BusinessIntensity, string> = {
  light: "10 წუთი",
  standard: "20 წუთი",
  intensive: "30–40 წუთი",
  deadline: "30 წუთი",
};

const MODULE_FOCUS: Record<string, { title: string; subtitle: string; doneTitle: string; doneSubtitle: string }> = {
  interview: {
    title: "გასაუბრების პასუხების ვარჯიში",
    subtitle: "ერთი კითხვა, მკაფიო პასუხი — დღევანდელი მცირე გამარჯვება.",
    doneTitle: "ყოჩაღ — დღევანდელი გასაუბრება დასრულდა",
    doneSubtitle: "სცადე ერთი ფრაზა გაიხსენო რომელიც დღეს გამოგივიდა.",
  },
  emails: {
    title: "დღევანდელი იმეილის გამოწვევა",
    subtitle: "დაწერე ერთი პროფესიული იმეილი და მიიღე AI უკუკავშირი.",
    doneTitle: "ყოჩაღ — დღევანდელი იმეილი დასრულდა",
    doneSubtitle: "შენი პროგრესი განახლდა. ხვალ ახალი სცენარით დაგხვდები.",
  },
  meetings: {
    title: "შეხვედრის სცენარი",
    subtitle: "ჩაერთე რეალურ სამუშაო შეხვედრაში — გამოთქვი აზრი, შეუთანხმდი, აიღე გადაწყვეტილება.",
    doneTitle: "ყოჩაღ — დღევანდელი შეხვედრა დასრულდა",
    doneSubtitle: "შენი წვლილი დაფიქსირდა. ხვალ ახალი შეხვედრა გელოდება.",
  },
  vocabulary: {
    title: "დღევანდელი ბიზნეს სიტყვები",
    subtitle: "ახალი სიტყვები მაგალითებითა და ქართული ახსნებით.",
    doneTitle: "შესრულდა",
    doneSubtitle: "კარგი მუშაობა დღეს.",
  },
};

// Modules that are fully built today
const ACTIVE_MODULES = new Set(["emails", "interview", "meetings", "vocabulary"]);

// Map a learner priority to a module slug — used for goal-weighted rotation.
const PRIORITY_TO_MODULE: Record<BusinessPriority, string> = {
  university: "interview",
  job_interview: "interview",
  work_communication: "meetings",
  remote_work: "emails",
  emails_writing: "emails",
  business_vocab: "vocabulary",
  general_business: "interview",
};


type ModuleProgress = { slug: string; count: number; doneToday: boolean };

const todayIso = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

export default function BusinessHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [s, setS] = useState<BusinessState | null>(null);
  const [progress, setProgress] = useState<Record<string, ModuleProgress>>({});
  const [hasResume, setHasResume] = useState<boolean>(false);
  const [vocabWordCount, setVocabWordCount] = useState<number>(0);
  const [vocabPreview, setVocabPreview] = useState<VocabWord | null>(null);
  const [vocabNewToday, setVocabNewToday] = useState<number>(0);
  const [vocabReviewToday, setVocabReviewToday] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const cur = await pullBusinessFromSupabase(user.id);
      if (cancelled) return;
      setS(cur);

      const startIso = todayIso();

      const [emailsAll, emailsToday, interviewAll, interviewToday, meetingsAll, meetingsToday, vocabAll, vocabToday, vocabWords] = await Promise.all([
        supabase.from("business_email_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("completed", true),
        supabase.from("business_email_sessions").select("id").eq("user_id", user.id).eq("completed", true).gte("completed_at", startIso).limit(1),
        supabase.from("business_interview_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("completed", true),
        supabase.from("business_interview_sessions").select("id").eq("user_id", user.id).eq("completed", true).gte("completed_at", startIso).limit(1),
        supabase.from("business_meeting_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("completed", true),
        supabase.from("business_meeting_sessions").select("id").eq("user_id", user.id).eq("completed", true).gte("completed_at", startIso).limit(1),
        supabase.from("business_vocab_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("completed", true),
        supabase.from("business_vocab_sessions").select("id").eq("user_id", user.id).eq("completed", true).gte("completed_at", startIso).limit(1),
        supabase.from("business_vocab_progress").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

      if (cancelled) return;
      setProgress({
        emails: { slug: "emails", count: emailsAll.count ?? 0, doneToday: (emailsToday.data?.length ?? 0) > 0 },
        interview: { slug: "interview", count: interviewAll.count ?? 0, doneToday: (interviewToday.data?.length ?? 0) > 0 },
        meetings: { slug: "meetings", count: meetingsAll.count ?? 0, doneToday: (meetingsToday.data?.length ?? 0) > 0 },
        vocabulary: { slug: "vocabulary", count: vocabAll.count ?? 0, doneToday: (vocabToday.data?.length ?? 0) > 0 },
      });
      setVocabWordCount(vocabWords.count ?? 0);

      // Plan a preview of today's vocab session for the dashboard card.
      try {
        const vp = await loadProgress(user.id);
        if (!cancelled) {
          const plan = planSession(vp, cur.field || [], cur.mainPriority || []);
          setVocabNewToday(plan.newWords.length);
          setVocabReviewToday(plan.reviewKeys.length);
          setVocabPreview(plan.newWords[0] || null);
        }
      } catch {}

      const { data: resumeRow } = await supabase
        .from("business_resumes")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (!cancelled) setHasResume(!!resumeRow?.id);


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

  // Build goal-weighted rotation queue across active modules.
  const rotationQueue = useMemo<string[]>(() => {
    const plan = s?.plan;
    const goals = plan?.mainGoals || s?.mainPriority || [];
    const weighted: string[] = [];
    // Map goals to active modules with double weight on first goal
    goals.forEach((g, idx) => {
      const slug = PRIORITY_TO_MODULE[g];
      if (slug && ACTIVE_MODULES.has(slug)) {
        const reps = idx === 0 ? 2 : 1;
        for (let i = 0; i < reps; i++) weighted.push(slug);
      }
    });
    // Ensure both active modules appear at least once
    Array.from(ACTIVE_MODULES).forEach((m) => {
      if (!weighted.includes(m)) weighted.push(m);
    });
    return weighted;
  }, [s]);

  // Pick today's focus: first slot in rotation that hasn't been done today.
  // If everything done, fall back to the first goal-priority module.
  const focusModuleSlug = useMemo(() => {
    if (!Object.keys(progress).length) return s?.plan?.recommendedModule || "emails";
    const undone = rotationQueue.find((slug) => !progress[slug]?.doneToday);
    return undone || rotationQueue[0] || s?.plan?.recommendedModule || "emails";
  }, [progress, rotationQueue, s]);

  // Suggestion: another active module not yet done today (after primary focus is done).
  const suggestionSlug = useMemo(() => {
    return rotationQueue.find((slug) => slug !== focusModuleSlug && !progress[slug]?.doneToday) || null;
  }, [rotationQueue, focusModuleSlug, progress]);

  if (!s) {
    return (
      <BusinessShell>
        <div className="ka text-[#5B6473]">იტვირთება...</div>
      </BusinessShell>
    );
  }

  const incomplete = !s.setupCompleted || !s.testCompleted || !s.plan;
  const plan = s.plan;
  const showIntroCard = !!plan && !s.businessSelfIntroductionCompleted;

  const focusMod = BUSINESS_MODULES.find((m) => m.slug === focusModuleSlug);
  const focusCopy = MODULE_FOCUS[focusModuleSlug] || MODULE_FOCUS.emails;
  const focusMinutes = plan ? INTENSITY_MINUTES[plan.intensity] : "15 წუთი";
  const focusDoneToday = progress[focusModuleSlug]?.doneToday ?? false;

  // Curriculum preview for focus module
  const focusCurriculum =
    focusModuleSlug === "emails"
      ? emailStep(progress.emails?.count ?? 0)
      : focusModuleSlug === "interview"
        ? interviewStep(progress.interview?.count ?? 0)
        : focusModuleSlug === "meetings"
          ? meetingStep(progress.meetings?.count ?? 0)
          : null;


  const suggestionMod = suggestionSlug ? BUSINESS_MODULES.find((m) => m.slug === suggestionSlug) : null;
  const suggestionCopy = suggestionSlug ? MODULE_FOCUS[suggestionSlug] : null;

  const emailsCount = progress.emails?.count ?? 0;
  const interviewCount = progress.interview?.count ?? 0;

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
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Dev: reset all business progress"
            onClick={async () => {
              if (!user) return;
              if (!confirm("Reset ALL Business English progress for this account? (dev only)")) return;
              try {
                const patch = { completed: false, completed_at: null } as any;
                await Promise.all([
                  supabase.from("business_email_sessions").update(patch).eq("user_id", user.id),
                  supabase.from("business_interview_sessions").update(patch).eq("user_id", user.id),
                  supabase.from("business_meeting_sessions").update(patch).eq("user_id", user.id),
                  supabase.from("business_vocab_sessions").update(patch).eq("user_id", user.id),
                ]);
              } catch {}
              resetBusiness(user.id);
              window.location.reload();
            }}
            className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-md border border-[#E7E2D5] text-[#5B6473] hover:bg-[#FAF7F0] hover:text-[#1E2A44] transition"
          >
            ↺ reset
          </button>
          <PathSwitcher />
        </div>
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
                    {focusDoneToday ? "დღევანდელი მისია შესრულებულია" : "შენი დღევანდელი მისია"}
                  </span>
                  {focusDoneToday ? (
                    <span className="ka text-[10px] inline-flex items-center gap-1 bg-[#0F766E]/25 text-[#A7F3D0] px-2 py-1 rounded-md font-semibold">
                      ✓ დასრულდა
                    </span>
                  ) : (
                    <span className="ka text-[10px] text-[#F7F1E3]/70">⏱ ~{focusMinutes}</span>
                  )}
                  {focusCurriculum && (
                    <span className="ka text-[10px] bg-[#F7F1E3]/10 text-[#F7F1E3]/80 px-2 py-1 rounded-md font-semibold">
                      ეტაპი {focusCurriculum.step}/{focusCurriculum.total}
                    </span>
                  )}
                </div>
                <h2 className="ka text-xl font-bold leading-snug">
                  {focusDoneToday ? focusCopy.doneTitle : focusCopy.title}
                </h2>
                <p className="ka text-sm text-[#F7F1E3]/80 mt-2 leading-relaxed">
                  {focusDoneToday ? focusCopy.doneSubtitle : focusCopy.subtitle}
                </p>
                {focusCurriculum && !focusDoneToday && (
                  <p className="ka text-[11px] text-[#F2D680] mt-2">
                    დღევანდელი თემა: {focusCurriculum.titleKa}
                  </p>
                )}
                {focusMod && (
                  <p className="ka text-[11px] text-[#F7F1E3]/60 mt-3">
                    მოდული: {focusMod.title}
                  </p>
                )}
                <button
                  onClick={() => navigate(`/path/business/module/${focusModuleSlug}`)}
                  className="ka mt-5 inline-flex items-center justify-center gap-2 bg-[#C9A227] text-[#1E2A44] hover:bg-[#D8B547] transition-colors px-5 py-3 rounded-xl font-bold text-sm w-full sm:w-auto"
                >
                  {focusDoneToday ? "კიდევ ერთი სესია →" : "დაწყება →"}
                </button>
              </div>
            </div>
          </section>

          {/* 2a-pre. Vocabulary — prominent card */}
          <section className="mb-5">
            <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold mb-2 px-1">
              ბიზნეს ლექსიკა
            </p>
            <button
              onClick={() => navigate("/path/business/module/vocabulary")}
              className="group relative w-full text-left overflow-hidden rounded-3xl p-5 transition-all hover:shadow-lg"
              style={{
                background:
                  "radial-gradient(420px 180px at 100% 0%, rgba(201,162,39,0.30), transparent 60%), linear-gradient(135deg, #1E2A44 0%, #15203A 100%)",
                color: "#F7F1E3",
                boxShadow: "0 12px 32px -14px rgba(30,42,68,0.45)",
              }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="ka text-[10px] uppercase tracking-wider bg-[#C9A227]/25 text-[#F2D680] px-2 py-1 rounded-md font-bold">
                  🔥 დღევანდელი ვარჯიში
                </span>
                <span className="ka text-[10px] text-[#F7F1E3]/70">
                  დღეს {vocabWordCount} სიტყვა იცი
                </span>
              </div>
              <p className="ka text-base font-bold mt-2 leading-snug">
                დღევანდელი ბიზნეს სიტყვები
              </p>
              <p className="ka text-[11px] text-[#F7F1E3]/75 mt-1 leading-relaxed">
                {vocabNewToday > 0
                  ? `${vocabNewToday} ახალი სიტყვა · ${vocabReviewToday} გასამეორებელი`
                  : vocabReviewToday > 0
                  ? `${vocabReviewToday} გასამეორებელი სიტყვა`
                  : "გამეორების დღე — ყველაზე რთული სიტყვები"}
              </p>

              {vocabPreview && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F7F1E3]/10 border border-[#F7F1E3]/15">
                  <span className="ka text-[9px] uppercase tracking-wider text-[#F2D680] font-semibold">
                    პირველი სიტყვა
                  </span>
                  <span className="text-sm font-bold text-[#F7F1E3]">{vocabPreview.en}</span>
                  <span className="ka text-[11px] text-[#F7F1E3]/70">· {vocabPreview.ka}</span>
                </div>
              )}

              <span className="ka mt-3 inline-flex items-center justify-center gap-1 bg-[#C9A227] text-[#1E2A44] hover:bg-[#D8B547] px-4 py-2 rounded-xl font-bold text-xs">
                დაწყება →
              </span>
            </button>
          </section>



          {/* 2a. Document Helper — prominent practical tool */}
          <section className="mb-5">
            <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold mb-2 px-1">
              დოკუმენტების ასისტენტი
            </p>
            <button
              onClick={() => navigate("/path/business/documents")}
              className="w-full text-left bg-white border-2 border-[#E7E2D5] hover:border-[#1E2A44]/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl shrink-0">🗂</div>
                <div className="flex-1 min-w-0">
                  <p className="ka font-bold text-[#1E2A44] text-base">
                    შექმენი ან გაასწორე რეალური დოკუმენტი
                  </p>
                  <p className="ka text-xs text-[#5B6473] mt-1 leading-relaxed">
                    იმეილი, სამოტივაციო წერილი, რეზიუმე, ბიო — შენი მონაცემებით, წამიერად. ან ჩასვი იმეილი და მიიღე გაუმჯობესებული ვერსია.
                  </p>
                  <span className="ka inline-flex items-center gap-1 mt-3 text-xs font-semibold text-[#1E2A44]">
                    გახსნა →
                  </span>
                </div>
              </div>
            </button>
          </section>


          {/* 2b. "Still have energy?" cross-module suggestion */}
          {focusDoneToday && suggestionMod && suggestionCopy && (
            <BizCard className="mb-5 bg-[#FFFBEA] border-[#F2E6B0]">
              <div className="flex items-start gap-3">
                <div className="text-2xl shrink-0">{suggestionMod.icon}</div>
                <div className="min-w-0 flex-1">
                  <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">
                    კიდევ გრძნობ ენერგიას?
                  </p>
                  <p className="ka text-sm font-semibold text-[#1E2A44] mt-1">
                    კარგად გააკეთე! თუ კიდევ გრძნობ ენერგიას შეგიძლია სცადო{" "}
                    {suggestionMod.title.toLowerCase()}.
                  </p>
                  <p className="ka text-[11px] text-[#5B6473] mt-1">{suggestionCopy.subtitle}</p>
                  <button
                    onClick={() => navigate(`/path/business/module/${suggestionMod.slug}`)}
                    className="ka mt-3 text-xs font-semibold text-[#1E2A44] underline underline-offset-2"
                  >
                    დაწყება →
                  </button>
                </div>
              </div>
            </BizCard>
          )}

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

          {!hasResume && (
            <BizCard className="mb-5 bg-[#FAF7F0] border-dashed">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">
                    პერსონალიზაცია
                  </p>
                  <p className="ka text-sm font-semibold text-[#1E2A44] mt-1">
                    ატვირთე რეზიუმე
                  </p>
                  <p className="ka text-xs text-[#5B6473] mt-1">
                    გაკვეთილები მოერგება შენს პროფესიულ გამოცდილებას.
                  </p>
                </div>
                <Link
                  to="/path/business/resume"
                  className="ka text-xs text-[#1E2A44] underline underline-offset-2 shrink-0 mt-1"
                >
                  ატვირთვა →
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
                const count = progress[m.slug]?.count ?? 0;
                const started = count > 0;
                const cur =
                  m.slug === "emails"
                    ? emailStep(count)
                    : m.slug === "interview"
                      ? interviewStep(count)
                      : m.slug === "meetings"
                        ? meetingStep(count)
                        : null;

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
                        {cur && (
                          <p className="ka text-[10px] text-[#C9A227] mt-1.5 font-semibold">
                            შემდეგი: ეტაპი {cur.step}/{cur.total} · {cur.titleKa}
                          </p>
                        )}
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
                <Stat label="გასაუბრებები" value={String(interviewCount)} />
                <Stat label="ბიზნეს სიტყვები" value={String(vocabWordCount)} />
                <Stat label="გაკვეთილები" value={String(emailsCount + interviewCount + (progress.meetings?.count ?? 0) + (progress.vocabulary?.count ?? 0))} />
              </div>
              <Link
                to="/path/business/dictionary"
                className="ka mt-4 w-full inline-flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-[#1E2A44] text-[#F7F1E3] hover:bg-[#15203A] transition-colors text-sm font-semibold"
              >
                <span className="flex items-center gap-2">
                  <span>📖</span>
                  <span>ჩემი ლექსიკონი</span>
                </span>
                <span>→</span>
              </Link>
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

function MiniGiorgi(): JSX.Element {
  return (
    <svg viewBox="0 0 120 140" width="100%" height="100%" aria-hidden style={{ animation: "giorgiBreathe 3.5s ease-in-out infinite" }}>
      <ellipse cx="60" cy="134" rx="26" ry="3" fill="#000" opacity="0.18" />
      <path d="M30 132 L34 86 Q60 78 86 86 L90 132 Z" fill="#0F1B2E" />
      <path d="M60 86 L46 132 L52 132 L60 102 Z" fill="#0A1424" />
      <path d="M60 86 L74 132 L68 132 L60 102 Z" fill="#0A1424" />
      <path d="M60 86 L54 96 L60 102 L66 96 Z" fill="#F7F1E3" />
      <path d="M58 96 L62 96 L64 100 L60 104 L56 100 Z" fill="#C9A227" />
      <path d="M56 100 L64 100 L66 122 L60 128 L54 122 Z" fill="#C9A227" />
      <path d="M32 90 L30 122 L40 122 L42 92 Z" fill="#0F1B2E" />
      <path d="M88 90 L90 122 L80 122 L78 92 Z" fill="#0F1B2E" />
      <rect x="55" y="72" width="10" height="10" fill="#E8C9A0" />
      <ellipse cx="60" cy="56" rx="22" ry="24" fill="#F0D2A8" />
      <path d="M38 50 Q40 30 60 30 Q80 30 82 50 Q78 40 60 40 Q42 40 38 50 Z" fill="#2A2118" />
      <g stroke="#1E2A44" strokeWidth="1.5" fill="none">
        <circle cx="51" cy="56" r="5" />
        <circle cx="69" cy="56" r="5" />
        <line x1="56" y1="56" x2="64" y2="56" />
      </g>
      <line x1="54" y1="68" x2="66" y2="68" stroke="#1E2A44" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
