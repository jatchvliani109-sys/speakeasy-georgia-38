import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Award,
  BarChart2,
  Clock,
  FileText,
  Library,
  RotateCcw,
  Sparkles,
  Target,
  Check,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";

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
  saveBusiness,
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
  const [lastReassessmentAt, setLastReassessmentAt] = useState<string | null>(null);
  const [phraseCount, setPhraseCount] = useState<number>(0);

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

      // Last reassessment + phrase count (used in milestone celebration).
      try {
        const { data: ra } = await supabase
          .from("business_reassessments")
          .select("created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!cancelled) setLastReassessmentAt(ra?.created_at ?? null);
      } catch {}
      try {
        const [{ count: emailPhr }, { count: intPhr }, { count: meetPhr }] = await Promise.all([
          supabase.from("business_email_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("completed", true),
          supabase.from("business_interview_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("completed", true),
          supabase.from("business_meeting_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("completed", true),
        ]);
        if (!cancelled) setPhraseCount((emailPhr ?? 0) + (intPhr ?? 0) + (meetPhr ?? 0));
      } catch {}
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
        <div className="ka text-[#4A4A4A]">იტვირთება...</div>
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
  const meetingsCount = progress.meetings?.count ?? 0;
  const vocabSessionsCount = progress.vocabulary?.count ?? 0;
  const allFourMilestone =
    emailsCount >= 7 && interviewCount >= 7 && meetingsCount >= 7 && vocabSessionsCount >= 7;
  const showMilestone = !!plan && allFourMilestone && !s.firstMilestoneAcknowledged;
  const lastReassessmentLabel = lastReassessmentAt
    ? new Date(lastReassessmentAt).toLocaleDateString("ka-GE", { year: "numeric", month: "short", day: "numeric" })
    : "ჯერ არ გაგივლია";

  return (
    <BusinessShell>
      {/* 1. Greeting */}
      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold">
            ბიზნეს ინგლისური
          </p>
          <h1 className="ka text-2xl font-bold text-[#5C1A2E] mt-1 leading-tight">
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
            className="font-mono text-[10px] uppercase tracking-wider inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#E0D8D0] text-[#4A4A4A] hover:bg-white hover:text-[#5C1A2E] transition"
          >
            <RotateCcw size={11} strokeWidth={2.25} /> reset
          </button>
          
        </div>
      </header>

      {incomplete && (
        <BizCard className="mb-4 border-l-2 border-l-[#1C1C1E]">
          <p className="ka text-sm text-[#5C1A2E]">
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
          {/* Level Assessment */}
          <section className="mb-5">
            <button
              onClick={() => navigate("/path/business/reassessment")}
              className="w-full text-left bg-white border border-[#E0D8D0] hover:border-[#5C1A2E]/50 rounded-lg p-4 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-md bg-[#5C1A2E] text-[#F0EBE3] grid place-items-center shrink-0">
                  <Award size={18} strokeWidth={2} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold">
                    შენი მიმდინარე დონე
                  </p>
                  <p className="ka font-bold text-[#5C1A2E] text-base mt-0.5">
                    {LEVEL_LABELS[plan.level]}
                  </p>
                  <p className="ka text-[11px] text-[#4A4A4A] mt-0.5">
                    ბოლო შეფასება: {lastReassessmentLabel}
                  </p>
                </div>
                <span className="ka inline-flex items-center gap-1 text-xs font-semibold text-[#5C1A2E] border border-[#E0D8D0] rounded-md px-3 py-2 shrink-0">
                  დონის შეფასება <ArrowRight size={13} strokeWidth={2.25} />
                </span>
              </div>
            </button>
          </section>

          {/* Milestone celebration */}
          {showMilestone && (
            <section className="mb-5 animate-fade-in">
              <div className="relative overflow-hidden rounded-lg bg-[#5C1A2E] text-[#F0EBE3] p-6 border border-[#5C1A2E]">
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <Award size={16} strokeWidth={2.25} className="text-[#1C1C1E]" />
                    <span className="ka text-[10px] uppercase tracking-wider text-[#1C1C1E] font-semibold">
                      მიღწევა განბლოკილია
                    </span>
                  </div>
                  <h2 className="ka text-xl font-bold leading-snug">
                    გილოცავ — დაასრულე პირველი დონე
                  </h2>
                  <p className="ka text-sm text-[#F0EBE3]/80 mt-2 leading-relaxed">
                    შენ შეასრულე 7+ სესია ოთხივე მოდულში. ეს სერიოზული ნაბიჯია.
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="border border-[#F0EBE3]/15 rounded-md px-2 py-3">
                      <div className="text-xl font-bold">
                        {emailsCount + interviewCount + meetingsCount + vocabSessionsCount}
                      </div>
                      <div className="ka text-[10px] text-[#F0EBE3]/65 mt-0.5">სესია</div>
                    </div>
                    <div className="border border-[#F0EBE3]/15 rounded-md px-2 py-3">
                      <div className="text-xl font-bold">{vocabWordCount}</div>
                      <div className="ka text-[10px] text-[#F0EBE3]/65 mt-0.5">სიტყვა</div>
                    </div>
                    <div className="border border-[#F0EBE3]/15 rounded-md px-2 py-3">
                      <div className="text-xl font-bold">{phraseCount}</div>
                      <div className="ka text-[10px] text-[#F0EBE3]/65 mt-0.5">ფრაზა</div>
                    </div>
                  </div>
                  <p className="ka text-sm font-semibold text-[#1C1C1E] mt-4">
                    შეამოწმე რამდენად გაიზარდე — გაიარე ხელახალი შეფასება
                  </p>
                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => {
                        if (user) saveBusiness(user.id, { firstMilestoneAcknowledged: true });
                        navigate("/path/business/reassessment");
                      }}
                      className="ka inline-flex items-center justify-center gap-2 bg-[#1C1C1E] text-[#5C1A2E] hover:bg-[#6E2038] transition-colors px-5 py-2.5 rounded-md font-bold text-sm"
                    >
                      ხელახალი შეფასების დაწყება <ArrowRight size={14} strokeWidth={2.25} />
                    </button>
                    <button
                      onClick={() => {
                        if (user) {
                          const next = saveBusiness(user.id, { firstMilestoneAcknowledged: true });
                          setS(next);
                        }
                      }}
                      className="ka inline-flex items-center justify-center px-5 py-2.5 rounded-md text-sm font-semibold text-[#F0EBE3]/80 hover:text-[#F0EBE3] border border-[#F0EBE3]/20 hover:border-[#F0EBE3]/40 transition-colors"
                    >
                      მოგვიანებით
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 2. Today's Focus */}
          <section className="mb-5">
            <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold mb-2 px-1 inline-flex items-center gap-1.5">
              <Target size={12} strokeWidth={2.25} /> დღევანდელი ფოკუსი
            </p>
            <div className="relative overflow-hidden rounded-lg bg-[#5C1A2E] text-[#F0EBE3] p-6 border border-[#5C1A2E]">
              <div className="relative">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="ka text-[10px] uppercase tracking-wider text-[#1C1C1E] font-semibold">
                    {focusDoneToday ? "დღევანდელი მისია შესრულებულია" : "შენი დღევანდელი მისია"}
                  </span>
                  {focusDoneToday ? (
                    <span className="ka text-[10px] inline-flex items-center gap-1 border border-[#F0EBE3]/20 text-[#F0EBE3]/85 px-2 py-0.5 rounded-md font-semibold">
                      <Check size={11} strokeWidth={2.5} /> დასრულდა
                    </span>
                  ) : (
                    <span className="ka text-[10px] inline-flex items-center gap-1 text-[#F0EBE3]/70">
                      <Clock size={11} strokeWidth={2.25} /> ~{focusMinutes}
                    </span>
                  )}
                  {focusCurriculum && (
                    <span className="ka text-[10px] border border-[#F0EBE3]/15 text-[#F0EBE3]/80 px-2 py-0.5 rounded-md font-semibold">
                      ეტაპი {focusCurriculum.step}/{focusCurriculum.total}
                    </span>
                  )}
                </div>
                <h2 className="ka text-xl font-bold leading-snug">
                  {focusDoneToday ? focusCopy.doneTitle : focusCopy.title}
                </h2>
                <p className="ka text-sm text-[#F0EBE3]/80 mt-2 leading-relaxed">
                  {focusDoneToday ? focusCopy.doneSubtitle : focusCopy.subtitle}
                </p>
                {focusCurriculum && !focusDoneToday && (
                  <p className="ka text-[11px] text-[#1C1C1E] mt-2">
                    დღევანდელი თემა: {focusCurriculum.titleKa}
                  </p>
                )}
                {focusModuleSlug === "vocabulary" && !focusDoneToday && (
                  <div className="mt-3 space-y-2">
                    <p className="ka text-[11px] text-[#1C1C1E]">
                      დღეს {vocabWordCount} სიტყვა იცი
                    </p>
                    <p className="ka text-[11px] text-[#F0EBE3]/75">
                      {vocabNewToday > 0
                        ? `${vocabNewToday} ახალი სიტყვა · ${vocabReviewToday} გასამეორებელი`
                        : vocabReviewToday > 0
                        ? `${vocabReviewToday} გასამეორებელი სიტყვა`
                        : "გამეორების დღე — ყველაზე რთული სიტყვები"}
                    </p>
                    {vocabPreview && (
                      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-[#F0EBE3]/15">
                        <span className="ka text-[9px] uppercase tracking-wider text-[#1C1C1E] font-semibold">
                          პირველი სიტყვა
                        </span>
                        <span className="text-sm font-bold text-[#F0EBE3]">{vocabPreview.en}</span>
                        <span className="ka text-[11px] text-[#F0EBE3]/70">· {vocabPreview.ka}</span>
                      </div>
                    )}
                  </div>
                )}
                {focusMod && (
                  <p className="ka text-[11px] text-[#F0EBE3]/60 mt-3">
                    მოდული: {focusMod.title}
                  </p>
                )}
                <button
                  onClick={() => navigate(`/path/business/module/${focusModuleSlug}`)}
                  className="ka mt-5 inline-flex items-center justify-center gap-2 bg-[#1C1C1E] text-[#5C1A2E] hover:bg-[#6E2038] transition-colors px-5 py-2.5 rounded-md font-bold text-sm w-full sm:w-auto"
                >
                  {focusDoneToday ? "კიდევ ერთი სესია" : "დაწყება"}
                  <ArrowRight size={14} strokeWidth={2.25} />
                </button>
              </div>
            </div>
          </section>

          {/* 2a. Document Helper */}
          <section className="mb-5">
            <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold mb-2 px-1 inline-flex items-center gap-1.5">
              <FileText size={12} strokeWidth={2.25} /> დოკუმენტების ასისტენტი
            </p>
            <button
              onClick={() => navigate("/path/business/documents")}
              className="w-full text-left bg-white border border-[#E0D8D0] hover:border-[#5C1A2E]/50 rounded-lg p-5 transition-colors"
            >
              <div className="flex items-start gap-4">
                <span className="w-11 h-11 rounded-md bg-[#5C1A2E] text-[#F0EBE3] grid place-items-center shrink-0">
                  <FileText size={20} strokeWidth={2} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="ka font-bold text-[#5C1A2E] text-base">
                    შექმენი ან გაასწორე რეალური დოკუმენტი
                  </p>
                  <p className="ka text-xs text-[#4A4A4A] mt-1 leading-relaxed">
                    იმეილი, სამოტივაციო წერილი, რეზიუმე, ბიო — შენი მონაცემებით, წამიერად. ან ჩასვი იმეილი და მიიღე გაუმჯობესებული ვერსია.
                  </p>
                  <span className="ka inline-flex items-center gap-1 mt-3 text-xs font-semibold text-[#5C1A2E]">
                    გახსნა <ArrowRight size={12} strokeWidth={2.25} />
                  </span>
                </div>
              </div>
            </button>
          </section>

          {/* 2b. Still have energy */}
          {focusDoneToday && suggestionMod && suggestionCopy && (() => {
            const SugIcon = suggestionMod.icon;
            return (
              <BizCard className="mb-5 border-l-2 border-l-[#1C1C1E]">
                <div className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-md bg-[#5C1A2E]/5 text-[#5C1A2E] grid place-items-center shrink-0 border border-[#E0D8D0]">
                    <SugIcon size={16} strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold">
                      კიდევ გრძნობ ენერგიას?
                    </p>
                    <p className="ka text-sm font-semibold text-[#5C1A2E] mt-1">
                      კარგად გააკეთე! თუ კიდევ გრძნობ ენერგიას, შეგიძლია სცადო{" "}
                      {suggestionMod.title.toLowerCase()}.
                    </p>
                    <p className="ka text-[11px] text-[#4A4A4A] mt-1">{suggestionCopy.subtitle}</p>
                    <button
                      onClick={() => navigate(`/path/business/module/${suggestionMod.slug}`)}
                      className="ka mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#5C1A2E] underline underline-offset-2"
                    >
                      დაწყება <ArrowRight size={12} strokeWidth={2.25} />
                    </button>
                  </div>
                </div>
              </BizCard>
            );
          })()}

          {/* 3. Your Plan */}
          <section className="mb-4">
            <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold mb-2 px-1">
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
                className="ka text-[11px] text-[#5C1A2E] underline underline-offset-2 mt-3 inline-block"
              >
                სრული გეგმის ნახვა
              </Link>
            </BizCard>
          </section>

          {showIntroCard && (
            <BizCard className="mb-5 border-dashed">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold">
                    რეკომენდაცია
                  </p>
                  <p className="ka text-sm font-semibold text-[#5C1A2E] mt-1">
                    შექმენი შენი პროფესიული წარდგენა
                  </p>
                  <p className="ka text-xs text-[#4A4A4A] mt-1">
                    სასარგებლოა გასაუბრებებზე, networking-ზე და LinkedIn-ზე.
                  </p>
                </div>
                <Link
                  to="/path/business/self-introduction"
                  className="ka text-xs text-[#5C1A2E] underline underline-offset-2 shrink-0 mt-1 inline-flex items-center gap-1"
                >
                  დაწყება <ArrowRight size={12} strokeWidth={2.25} />
                </Link>
              </div>
            </BizCard>
          )}

          {!hasResume && (
            <BizCard className="mb-5 border-dashed">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold">
                    პერსონალიზაცია
                  </p>
                  <p className="ka text-sm font-semibold text-[#5C1A2E] mt-1">
                    ატვირთე რეზიუმე
                  </p>
                  <p className="ka text-xs text-[#4A4A4A] mt-1">
                    გაკვეთილები მოერგება შენს პროფესიულ გამოცდილებას.
                  </p>
                </div>
                <Link
                  to="/path/business/resume"
                  className="ka text-xs text-[#5C1A2E] underline underline-offset-2 shrink-0 mt-1 inline-flex items-center gap-1"
                >
                  ატვირთვა <ArrowRight size={12} strokeWidth={2.25} />
                </Link>
              </div>
            </BizCard>
          )}

          {/* 4. Modules */}
          <section className="mb-5">
            <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold mb-2 px-1">
              მოდულები
            </p>
            <div className="grid gap-2 md:grid-cols-2">
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
                const ModIcon = m.icon;

                return (
                  <Link
                    key={m.slug}
                    to={`/path/business/module/${m.slug}`}
                    className="block bg-white border border-[#E0D8D0] rounded-lg p-4 hover:border-[#5C1A2E]/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-10 h-10 rounded-md bg-[#5C1A2E]/5 text-[#5C1A2E] border border-[#E0D8D0] grid place-items-center shrink-0">
                        <ModIcon size={18} strokeWidth={2} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="ka font-semibold text-sm text-[#5C1A2E] truncate">
                            {m.title}
                          </p>
                          <span
                            className={`ka text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 ${
                              started
                                ? "bg-[#5C1A2E]/8 text-[#5C1A2E]"
                                : "text-[#4A4A4A] border border-[#E0D8D0]"
                            }`}
                          >
                            {started ? `${count} სესია` : "ჯერ არ დაწყებულა"}
                          </span>
                        </div>
                        <p className="ka text-[11px] text-[#4A4A4A] mt-1 line-clamp-2">
                          {m.description}
                        </p>
                        {cur && (
                          <p className="ka text-[10px] text-[#1C1C1E] mt-1.5 font-semibold">
                            შემდეგი: ეტაპი {cur.step}/{cur.total} · {cur.titleKa}
                          </p>
                        )}
                        <div className="mt-2 h-1 rounded-full bg-[#E0D8D0] overflow-hidden">
                          <div
                            className="h-full bg-[#5C1A2E] transition-all"
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
            <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold mb-2 px-1 inline-flex items-center gap-1.5">
              <BarChart2 size={12} strokeWidth={2.25} /> პროგრესი
            </p>
            <BizCard>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="გაუმჯობესებული იმეილები" value={String(emailsCount)} />
                <Stat label="გასაუბრებები" value={String(interviewCount)} />
                <Stat label="ბიზნეს სიტყვები" value={String(vocabWordCount)} />
                <Stat label="გაკვეთილები" value={String(emailsCount + interviewCount + (progress.meetings?.count ?? 0) + (progress.vocabulary?.count ?? 0))} />
              </div>
              <Link
                to="/path/business/lexicon"
                className="ka mt-4 w-full inline-flex items-center justify-between gap-2 px-4 py-3 rounded-md bg-[#5C1A2E] text-[#F0EBE3] hover:bg-[#3D1220] transition-colors text-sm font-semibold"
              >
                <span className="flex items-center gap-2">
                  <Library size={15} strokeWidth={2} />
                  <span>ჩემი ლექსიკონი</span>
                </span>
                <ArrowRight size={14} strokeWidth={2.25} />
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
    <div className="bg-[#F0EBE3] border border-[#E0D8D0] rounded-md px-3 py-2">
      <div className="ka text-[10px] text-[#4A4A4A]">{label}</div>
      <div className="ka text-xs font-semibold text-[#5C1A2E] mt-0.5">{value}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#F0EBE3] border border-[#E0D8D0] rounded-md px-3 py-3">
      <div className="text-xl font-bold text-[#5C1A2E]">{value}</div>
      <div className="ka text-[11px] text-[#4A4A4A] mt-0.5">{label}</div>
    </div>
  );
}

