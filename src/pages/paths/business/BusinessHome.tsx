import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { useDisplayName } from "@/hooks/useDisplayName";
import { supabase } from "@/integrations/supabase/client";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import {
  BUSINESS_MODULES,
  BusinessIntensity,
  BusinessState,
  LEVEL_LABELS,
  PRIORITY_TO_MODULES,
  pullBusinessFromSupabase,
  resetBusiness,
  saveBusiness,
} from "./lib/state";
import { interviewStep } from "./lib/curriculum";
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
  vocabulary: {
    title: "დღევანდელი ბიზნეს სიტყვები",
    subtitle: "ახალი სიტყვები მაგალითებითა და ქართული ახსნებით.",
    doneTitle: "შესრულდა",
    doneSubtitle: "კარგი მუშაობა დღეს.",
  },
};

// Modules that are fully built today
const ACTIVE_MODULES = new Set(["interview", "vocabulary"]);

type ModuleProgress = { slug: string; count: number; doneToday: boolean };

const todayIso = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

export default function BusinessHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { displayName: profileName, loaded: nameLoaded, save: saveName } = useDisplayName();
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [s, setS] = useState<BusinessState | null>(null);
  const [progress, setProgress] = useState<Record<string, ModuleProgress>>({});
  const [hasResume, setHasResume] = useState<boolean>(false);
  const [vocabWordCount, setVocabWordCount] = useState<number>(0);
  const [vocabNewToday, setVocabNewToday] = useState<number>(0);
  const [vocabReviewToday, setVocabReviewToday] = useState<number>(0);
  const [lastReassessmentAt, setLastReassessmentAt] = useState<string | null>(null);
  const [phraseCount, setPhraseCount] = useState<number>(0);
  // Raw completed_at timestamps (vocab + interview) powering the daily streak.
  const [streakDates, setStreakDates] = useState<string[]>([]);

  // Existing users with no saved name: prompt once.
  useEffect(() => {
    if (nameLoaded && !profileName) setNameDialogOpen(true);
  }, [nameLoaded, profileName]);

  const submitName = async () => {
    const clean = nameInput.trim();
    if (!clean) {
      toast.error("გთხოვ, შეიყვანე შენი სახელი");
      return;
    }
    setSavingName(true);
    const res = await saveName(clean);
    setSavingName(false);
    if (!res.ok) {
      toast.error("სახელის შენახვა ვერ მოხერხდა");
      return;
    }
    setNameDialogOpen(false);
    toast.success("გამარჯობა!");
  };


  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const cur = await pullBusinessFromSupabase(user.id);
      if (cancelled) return;
      setS(cur);

      const startIso = todayIso();

      const [interviewAll, interviewToday, vocabAll, vocabToday, vocabWords] = await Promise.all([
        supabase.from("business_interview_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("completed", true),
        supabase.from("business_interview_sessions").select("id").eq("user_id", user.id).eq("completed", true).gte("completed_at", startIso).limit(1),
        supabase.from("business_vocab_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("completed", true),
        supabase.from("business_vocab_sessions").select("id").eq("user_id", user.id).eq("completed", true).gte("completed_at", startIso).limit(1),
        supabase.from("business_vocab_progress").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

      if (cancelled) return;
      setProgress({
        interview: { slug: "interview", count: interviewAll.count ?? 0, doneToday: (interviewToday.data?.length ?? 0) > 0 },
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
        const { count: intPhr } = await supabase
          .from("business_interview_sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("completed", true);
        if (!cancelled) setPhraseCount(intPhr ?? 0);
      } catch {}
      // Daily streak: dates of ALL completed sessions (vocab + interview).
      try {
        const [vd, idd] = await Promise.all([
          supabase.from("business_vocab_sessions").select("completed_at").eq("user_id", user.id).eq("completed", true).order("completed_at", { ascending: false }).limit(120),
          supabase.from("business_interview_sessions").select("completed_at").eq("user_id", user.id).eq("completed", true).order("completed_at", { ascending: false }).limit(120),
        ]);
        if (!cancelled) {
          const dates = [...(vd.data || []), ...(idd.data || [])]
            .map((r: any) => r.completed_at)
            .filter(Boolean);
          setStreakDates(dates);
        }
      } catch {}
      try {
        const vp = await loadProgress(user.id);
        if (!cancelled) {
          const plan = planSession(vp, cur.field || [], cur.mainPriority || []);
          setVocabNewToday(plan.newWords.length);
          setVocabReviewToday(plan.reviewKeys.length);
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

  // Only the name the user actually told us — never an account username
  // like "jatchvliani109". Blank beats wrong.
  const displayName = profileName || "";

  // Daily streak from completed-session dates (Duolingo-style: any one
  // session counts the day; a missed today doesn't kill the streak until
  // the day actually ends).
  const { streak, last7 } = useMemo(() => {
    const days = new Set(streakDates.map((d) => new Date(d).toDateString()));
    let count = 0;
    const cursor = new Date();
    if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
    while (days.has(cursor.toDateString())) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    const KA_DAYS = ["კვ", "ორ", "სა", "ოთ", "ხუ", "პა", "შა"];
    const week: { label: string; done: boolean; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      week.push({ label: KA_DAYS[d.getDay()], done: days.has(d.toDateString()), isToday: i === 0 });
    }
    return { streak: count, last7: week };
  }, [streakDates]);

  // Build goal-weighted rotation queue across active modules.
  // Each goal contributes all its mapped modules; primary goal gets extra weight.
  const rotationQueue = useMemo<string[]>(() => {
    const plan = s?.plan;
    const goals = plan?.mainGoals || s?.mainPriority || [];
    const weighted: string[] = [];
    goals.forEach((g, idx) => {
      const slugs = PRIORITY_TO_MODULES[g] || [];
      slugs.forEach((slug, i) => {
        if (!ACTIVE_MODULES.has(slug)) return;
        // Primary goal repeats twice; primary module within a goal repeats more.
        const reps = (idx === 0 ? 2 : 1) * (i === 0 ? 2 : 1);
        for (let n = 0; n < reps; n++) weighted.push(slug);
      });
    });
    // Ensure every active module appears at least once (balanced exposure).
    Array.from(ACTIVE_MODULES).forEach((m) => {
      if (!weighted.includes(m)) weighted.push(m);
    });
    // VOCAB-FIRST pivot: vocabulary always leads the day, interview second,
    // emails demoted to a side feature. Goal weighting still shapes frequency
    // further down the queue via the stable sort.
    const pivotRank = (slug: string) =>
      slug === "vocabulary" ? 0 : slug === "interview" ? 1 : 2;
    return weighted.sort((a, b) => pivotRank(a) - pivotRank(b));
  }, [s]);

  // Pick today's focus: first slot in rotation that hasn't been done today.
  // If everything done, fall back to the first goal-priority module.
  const focusModuleSlug = useMemo(() => {
    if (!Object.keys(progress).length) return "vocabulary";
    const undone = rotationQueue.find((slug) => !progress[slug]?.doneToday);
    return undone || rotationQueue[0] || "vocabulary";
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

  const focusCopy = MODULE_FOCUS[focusModuleSlug] || MODULE_FOCUS.vocabulary;
  const focusMinutes = plan ? INTENSITY_MINUTES[plan.intensity] : "15 წუთი";
  const focusDoneToday = progress[focusModuleSlug]?.doneToday ?? false;

  // Curriculum preview for focus module
  const focusCurriculum =
    focusModuleSlug === "interview" ? interviewStep(progress.interview?.count ?? 0) : null;


  const suggestionMod = suggestionSlug ? BUSINESS_MODULES.find((m) => m.slug === suggestionSlug) : null;
  const suggestionCopy = suggestionSlug ? MODULE_FOCUS[suggestionSlug] : null;

  const interviewCount = progress.interview?.count ?? 0;
  const vocabSessionsCount = progress.vocabulary?.count ?? 0;
  const allFourMilestone = interviewCount >= 7 && vocabSessionsCount >= 7;
  const showMilestone = !!plan && allFourMilestone && !s.firstMilestoneAcknowledged;
  const lastReassessmentLabel = lastReassessmentAt
    ? new Date(lastReassessmentAt).toLocaleDateString("ka-GE", { year: "numeric", month: "short", day: "numeric" })
    : "ჯერ არ გაგივლია";

  return (
    <BusinessShell seo={{ title: "ჩემი სწავლება — SpeakBusy", description: "შენი პერსონალური ბიზნეს ინგლისურის სასწავლო გეგმა — დღევანდელი ფოკუსი და პროგრესი.", path: "/path/business/home" }}>
      <Dialog open={nameDialogOpen} onOpenChange={(v) => { if (!v && !profileName) return; setNameDialogOpen(v); }}>
        <DialogContent className="bg-[#F0EBE3] border-[#E0D8D0]">
          <DialogHeader>
            <DialogTitle className="ka text-[#5C1A2E]">როგორ დაგიძახოთ?</DialogTitle>
            <DialogDescription className="ka text-[#4A4A4A]">
              შეიყვანე შენი სახელი — ამ სახელით მოგმართავთ აპლიკაციაში.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitName(); }}
            maxLength={60}
            placeholder="მაგ. ნინო"
            className="ka bg-white border-[#E0D8D0]"
          />
          <DialogFooter>
            <BizButton onClick={submitName} disabled={savingName || !nameInput.trim()}>
              {savingName ? "ინახება..." : "შენახვა"}
            </BizButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 1. Greeting */}
      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[#4A4A4A] font-bold">
            SpeakBusy
          </p>
          <h1 className="ka text-2xl font-bold text-[#5C1A2E] mt-1 leading-tight">
            გამარჯობა{displayName ? `, ${displayName}` : ""} 👋
          </h1>
          {plan && (
            <span className="ka inline-block mt-1.5 text-[10px] font-semibold text-[#4A4A4A] border border-[#E0D8D0] bg-white px-2 py-0.5 rounded-full">
              {LEVEL_LABELS[plan.level]}
            </span>
          )}
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
          {/* Daily streak — the retention heartbeat. One session counts the day. */}
          <section className="mb-5">
            <div className="bg-white border border-[#E0D8D0] rounded-lg p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-2xl leading-none">🔥</span>
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-[#5C1A2E] leading-tight">
                      {streak}{" "}
                      <span className="ka text-xs font-semibold text-[#4A4A4A]">
                        დღე ზედიზედ
                      </span>
                    </p>
                    <p className="ka text-[10px] text-[#4A4A4A] mt-0.5">
                      {last7[6]?.done
                        ? "დღევანდელი დღე ჩათვლილია ✓"
                        : "ერთი სესია საკმარისია დღის ჩასათვლელად"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {last7.map((d, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <span
                        className={`w-5 h-5 rounded-full grid place-items-center text-[9px] font-bold transition-colors
                          ${d.done ? "bg-[#C9A84C] text-[#5C1A2E]" : "border border-[#E0D8D0] text-transparent"}
                          ${d.isToday && !d.done ? "border-[#5C1A2E]/50 border-dashed" : ""}`}
                      >
                        {d.done ? "✓" : "·"}
                      </span>
                      <span className={`ka text-[8px] ${d.isToday ? "font-bold text-[#5C1A2E]" : "text-[#4A4A4A]"}`}>
                        {d.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
                    შენ შეასრულე 7+ სესია ორივე მოდულში. ეს სერიოზული ნაბიჯია.
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="border border-[#F0EBE3]/15 rounded-md px-2 py-3">
                      <div className="text-xl font-bold">
                        {interviewCount + vocabSessionsCount}
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
                  </div>
                )}
                <button
                  onClick={() => navigate(`/path/business/module/${focusModuleSlug}`)}
                  className="ka mt-5 inline-flex items-center justify-center gap-2 bg-[#1C1C1E] text-white hover:bg-[#6E2038] transition-colors px-5 py-2.5 rounded-md font-bold text-sm w-full sm:w-auto"
                >
                  {focusDoneToday ? "კიდევ ერთი სესია" : "დაწყება"}
                  <ArrowRight size={14} strokeWidth={2.25} />
                </button>
              </div>
            </div>
          </section>

          {/* 2a. Scenarios — learn words inside real situations */}
          <section className="mb-5">
            <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold mb-2 px-1 inline-flex items-center gap-1.5">
              <Sparkles size={12} strokeWidth={2.25} /> სცენარები
            </p>
            <button
              onClick={() => navigate("/path/business/scenarios")}
              className="w-full text-left rounded-lg p-5 border border-[#C9A84C]/45 bg-gradient-to-br from-[#C9A84C]/15 to-white hover:border-[#C9A84C] transition-colors"
            >
              <div className="flex items-start gap-4">
                <span className="w-11 h-11 rounded-md bg-[#5C1A2E] text-[#C9A84C] grid place-items-center shrink-0 text-lg">
                  🎬
                </span>
                <div className="flex-1 min-w-0">
                  <p className="ka font-bold text-[#5C1A2E] text-base">
                    ისწავლე სიტყვები რეალურ სიტუაციებში
                  </p>
                  <p className="ka text-xs text-[#4A4A4A] mt-1 leading-relaxed">
                    შეხვედრები, იმეილები, გასაუბრება, პრეზენტაციები — დიალოგებით, აუდიოთი და ვარჯიშით.
                  </p>
                  <span className="ka inline-flex items-center gap-1 mt-3 text-xs font-semibold text-[#5C1A2E]">
                    სცენარების ნახვა <ArrowRight size={12} strokeWidth={2.25} />
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

          {showIntroCard && (
            <BizCard className="mb-5 border-dashed">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold">
                    რეკომენდაცია
                  </p>
                  <p className="ka text-sm font-semibold text-[#5C1A2E] mt-1">
                    შექმენი შენი პროფესიონალური წარდგენა
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
                    გაკვეთილები მოერგება შენს პროფესიონალურ გამოცდილებას.
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
              {[...BUSINESS_MODULES]
                .sort((a, b) => {
                  // VOCAB-FIRST: vocabulary leads, interview second.
                  const r = (slug: string) => (slug === "vocabulary" ? 0 : slug === "interview" ? 1 : 2);
                  return r(a.slug) - r(b.slug);
                })
                .map((m) => {
                const count = progress[m.slug]?.count ?? 0;
                const started = count > 0;
                const cur = m.slug === "interview" ? interviewStep(count) : null;
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
                          <p className="ka font-semibold text-sm text-[#5C1A2E] break-words leading-snug">
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

          {/* 5. More — compact rows for everything that used to be big cards */}
          <section className="mb-5">
            <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold mb-2 px-1">
              მეტი
            </p>
            <div className="bg-white border border-[#E0D8D0] rounded-lg divide-y divide-[#F0EBE3]">
              <MoreRow
                icon={<FileText size={15} strokeWidth={2} />}
                title="დოკუმენტების ასისტენტი"
                sub="იმეილი, რეზიუმე, სამოტივაციო — შენი მონაცემებით"
                onClick={() => navigate("/path/business/documents")}
              />
              <MoreRow
                icon={<Award size={15} strokeWidth={2} />}
                title="დონის შეფასება"
                sub={`ბოლო: ${lastReassessmentLabel}`}
                onClick={() => navigate("/path/business/reassessment")}
              />
              <MoreRow
                icon={<Target size={15} strokeWidth={2} />}
                title="სრული გეგმა"
                sub="შენი მიზნები, ინტენსივობა და სფეროები"
                onClick={() => navigate("/path/business/plan")}
              />
            </div>
          </section>

          {/* 6. Progress */}
          <section>
            <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold mb-2 px-1 inline-flex items-center gap-1.5">
              <BarChart2 size={12} strokeWidth={2.25} /> პროგრესი
            </p>
            <BizCard>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="🔥 სერია (დღე)" value={String(streak)} />
                <Stat label="ბიზნეს სიტყვები" value={String(vocabWordCount)} />
                <Stat label="გასაუბრებები" value={String(interviewCount)} />
                <Stat label="სესიები სულ" value={String(interviewCount + (progress.vocabulary?.count ?? 0))} />
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

function MoreRow({
  icon,
  title,
  sub,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[#F8F5F0] transition-colors first:rounded-t-lg last:rounded-b-lg"
    >
      <span className="w-8 h-8 rounded-md bg-[#5C1A2E]/5 text-[#5C1A2E] border border-[#E0D8D0] grid place-items-center shrink-0">
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="ka block text-sm font-semibold text-[#5C1A2E]">{title}</span>
        <span className="ka block text-[11px] text-[#4A4A4A] mt-0.5 truncate">{sub}</span>
      </span>
      <ArrowRight size={14} strokeWidth={2.25} className="text-[#4A4A4A] shrink-0" />
    </button>
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

