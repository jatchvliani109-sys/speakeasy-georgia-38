import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Award,
  BarChart2,
  Briefcase,
  Clock,
  FileText,
  Library,
  Star,
  Target,
  Check,
  ArrowRight,
  Instagram,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useDisplayName } from "@/hooks/useDisplayName";
import { supabase } from "@/integrations/supabase/client";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";
import { track } from "@/lib/track";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import {
  BusinessIntensity,
  BusinessState,
  buildPlan,
  LEVEL_LABELS,
  pullBusinessFromSupabase,
  saveBusiness,
  isTrialActive,
  trialEndingSoon,
  trialDaysLeft,
  aiSessionsRemaining,
} from "./lib/state";
import {
  computeStreakWithFreezes,
  loadProgress,
  pickDailyScenario,
  planSession,
  summarizeVocabProgress,
  milestoneLetters,
  MILESTONE_WORD,
  nextMilestone as nextVocabMilestone,
  type VocabProgressSummary,
} from "./lib/vocabEngine";
import type { VocabWord } from "./lib/vocabBank";

const INTENSITY_MINUTES: Record<BusinessIntensity, string> = {
  light: "10 წუთი",
  standard: "20 წუთი",
  intensive: "30–40 წუთი",
  deadline: "30 წუთი",
};

const MODULE_FOCUS: Record<string, { title: string; subtitle: string; doneTitle: string; doneSubtitle: string }> = {
  vocabulary: {
    title: "დღევანდელი ბიზნეს სიტყვები",
    subtitle: "ახალი სიტყვები მაგალითებითა და ქართული ახსნებით.",
    doneTitle: "ყოჩაღ! დღევანდელი \"Streak\" დაცულია. ",
    doneSubtitle: " ხვალ ახალი სიტყვები გელოდება.",
  },
};

type ModuleProgress = { slug: string; count: number; doneToday: boolean };

const todayIso = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

export default function BusinessHome() {
  const { user } = useAuth();

  // Funnel endpoint: the user got past onboarding into the app. Guarded so a
  // re-render or a not-yet-loaded user cannot double-count.
  const trackedArrival = useRef(false);
  useEffect(() => {
    if (user && !trackedArrival.current) {
      trackedArrival.current = true;
      track("reached_dashboard");
    }
  }, [user]);
  const navigate = useNavigate();
  const { displayName: profileName, loaded: nameLoaded, save: saveName } = useDisplayName();
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [s, setS] = useState<BusinessState | null>(null);
  const [progress, setProgress] = useState<Record<string, ModuleProgress>>({});
  const [vocabSummary, setVocabSummary] = useState<VocabProgressSummary | null>(null);
  // Milestone celebration shown on RETURN to the dashboard, not on the results
  // screen — the user asked for it here, and it works better: arriving back at
  // the dashboard to a celebration reads as the app noticing, rather than as
  // one more panel at the end of a session.
  const [milestoneCelebration, setMilestoneCelebration] = useState<number | null>(null);
  // A broken Streak previously passed in silence: 40 days became 1 with no
  // acknowledgement, at exactly the moment a user is most likely to give up.
  // Held here so the dashboard can say something once, then move on.
  const [brokenStreak, setBrokenStreak] = useState<number | null>(null);
  const [hasResume, setHasResume] = useState<boolean>(false);
  const [vocabWordCount, setVocabWordCount] = useState<number>(0);
  const [vocabNewToday, setVocabNewToday] = useState<number>(0);
  const [scenarioToday, setScenarioToday] = useState<{ titleKa: string } | null>(null);
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
        const { count: totalVocabSessions } = await supabase
          .from("business_vocab_sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("completed", true);
        if (!cancelled) {
          const sc = pickDailyScenario(vp, totalVocabSessions ?? 0);
          setScenarioToday(sc ? { titleKa: sc.titleKa } : null);
          const plan = planSession(vp, cur.field || [], cur.mainPriority || []);
          setVocabNewToday(plan.newWords.length);
          setVocabReviewToday(plan.reviewKeys.length);
          const summary = summarizeVocabProgress(vp);
          setVocabSummary(summary);

          // Has a new 10% milestone been reached since we last celebrated?
          // `lastVocabMilestone` is persisted, so this fires exactly once.
          const reached = Math.min(100, Math.floor(summary.percent / 10) * 10);
          const alreadyShown = cur.lastVocabMilestone ?? 0;
          if (reached >= 10 && reached > alreadyShown) {
            setMilestoneCelebration(reached);
            track("vocab_milestone_reached", { pct: reached });
            saveBusiness(user.id, { lastVocabMilestone: reached });
          }
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
  const { streak, last7, freezesLeft, usedFreezeToday } = useMemo(() => {
    const banked = s?.streakFreezes ?? 2;
    const priorDays = s?.freezeDays ?? [];
    const res = computeStreakWithFreezes(streakDates, banked, priorDays);
    const days = new Set(streakDates.map((d) => new Date(d).toDateString()));
    const priorSet = new Set([...priorDays, ...res.freezeDaysUsed]);
    const KA_DAYS = ["კვ", "ორ", "სა", "ოთ", "ხუ", "პა", "შა"];
    const week: { label: string; done: boolean; frozen: boolean; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      week.push({
        label: KA_DAYS[d.getDay()],
        done: days.has(key),
        frozen: !days.has(key) && priorSet.has(key),
        isToday: i === 0,
      });
    }
    return {
      streak: res.streak,
      last7: week,
      freezesLeft: res.freezesLeft,
      usedFreezeToday: res.usedFreezeToday,
    };
  }, [streakDates, s]);

  // Persist freeze spend/earn back to state when it changes (fire-once per load).
  useEffect(() => {
    if (!user || !s || !streakDates.length) return;
    const banked = s.streakFreezes ?? 2;
    const priorDays = s.freezeDays ?? [];
    const res = computeStreakWithFreezes(streakDates, banked, priorDays);
    const newlyUsed = res.freezeDaysUsed.filter((d) => !priorDays.includes(d));
    if (newlyUsed.length || res.freezesLeft !== banked) {
      const mergedDays = [...priorDays, ...newlyUsed].slice(-30);
      saveBusiness(user.id, { streakFreezes: res.freezesLeft, freezeDays: mergedDays });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streakDates, user]);

  // Record the best Streak, and notice when one has been lost.
  //
  // Deliberately gentle. This fires at the point of highest churn risk, and
  // guilt is what makes someone close an app rather than reopen it. The message
  // leads with what they KEPT, because that part is true and it is the actual
  // argument against giving up.
  useEffect(() => {
    if (!user || !s) return;
    const best = s.bestStreak ?? 0;

    // New record: just store it, say nothing. The Streak card already
    // celebrates growth.
    if (streak > best) {
      saveBusiness(user.id, { bestStreak: streak });
      return;
    }

    // A Streak worth mourning was lost, and we have not said so yet.
    // The threshold of 3 avoids commenting on a one-day lapse.
    const alreadySeen = s.streakBreakSeen ?? 0;
    if (best >= 3 && streak <= 1 && alreadySeen < best) {
      setBrokenStreak(best);
      saveBusiness(user.id, { streakBreakSeen: best });
      track("streak_broken", { best });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streak, user, s]);

  // Streak drama scales with the count (Duolingo-style): bigger flame, richer
  // card, escalating copy, and a progress bar toward the next milestone.
  const streakTier = streak >= 30 ? 4 : streak >= 14 ? 3 : streak >= 7 ? 2 : streak >= 3 ? 1 : 0;
  const nextMilestone = streak >= 30 ? null : streak >= 14 ? 30 : streak >= 7 ? 14 : streak >= 3 ? 7 : 3;
  const streakMsg =
    streakTier === 4
      ? "ლეგენდარული Streak 👑"
      : streakTier === 3
        ? "ორ კვირაზე მეტი — სერიოზული ხარ 🏆"
        : streakTier === 2
          ? "კვირაზე მეტი — შთამბეჭდავია!"
          : streakTier === 1
            ? "ჩვევა ყალიბდება 💪"
            : streak > 0
              ? "კარგია, ასე გააგრძელე!"
              : "დაიწყე დღეს — ერთი სესია საკმარისია";
  const streakDark = streakTier >= 3;

  // VOCAB-FIRST: vocabulary IS the daily mission — always. Interview stays a
  // side feature in the modules grid, never the recommended focus (it also
  // burns AI tokens; vocabulary is free to serve).
  const focusModuleSlug = "vocabulary";

  if (!s) {
    return (
      <BusinessShell>
        <div className="ka text-[#4A4A4A]">იტვირთება...</div>
      </BusinessShell>
    );
  }

  // The dashboard body is gated on `plan`. A user who skipped the placement
  // test has no level, so buildPlan() returned null and the whole page rendered
  // empty behind a "finish setup" card — which then bounced them straight back
  // here, since setup was in fact complete. Build the plan on the fly with a
  // seeded level so the app works immediately; the test stays available.
  let plan = s.plan;
  if (!plan && s.setupCompleted) {
    const seeded: BusinessState = {
      ...s,
      level: s.level ?? ("business_elementary" as any),
    };
    plan = buildPlan(seeded);
    if (plan && user) {
      // Persist so this runs once, not on every dashboard load.
      saveBusiness(user.id, { plan, level: seeded.level, levelEstimated: !s.level } as any);
    }
  }

  // Nudge only about the TEST, and only when the level was never measured.
  // Setup cannot be incomplete here — the gate requires it.
  const levelUnmeasured = !s.testCompleted;
  const showIntroCard = !!plan && !s.businessSelfIntroductionCompleted;

  const focusCopy = MODULE_FOCUS.vocabulary;
  const focusMinutes = plan ? INTENSITY_MINUTES[plan.intensity] : "15 წუთი";
  const focusDoneToday = progress[focusModuleSlug]?.doneToday ?? false;



  const interviewCount = progress.interview?.count ?? 0;
  const vocabSessionsCount = progress.vocabulary?.count ?? 0;
  const allFourMilestone = vocabSessionsCount >= 7;
  const showMilestone = !!plan && allFourMilestone && !s.firstMilestoneAcknowledged;
  const lastReassessmentLabel = lastReassessmentAt
    ? new Date(lastReassessmentAt).toLocaleDateString("ka-GE", { year: "numeric", month: "short", day: "numeric" })
    : "ჯერ არ გაგივლია";

  return (
    <BusinessShell seo={{ title: "ჩემი სწავლება — SpeakBusy", description: "შენი პერსონალური ბიზნეს ინგლისურის სასწავლო გეგმა — დღევანდელი ფოკუსი და პროგრესი.", path: "/path/business/home" }}>
      <Dialog open={nameDialogOpen} onOpenChange={(v) => { if (!v && !profileName) return; setNameDialogOpen(v); }}>
        <DialogContent className="bg-[#F5F4F2] border-[#E4E2DF]">
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
            className="ka bg-white border-[#E4E2DF]"
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
            <span className="ka inline-block mt-1.5 text-[10px] font-semibold text-[#4A4A4A] border border-[#E4E2DF] bg-white px-2 py-0.5 rounded-full">
              {LEVEL_LABELS[plan.level]}
            </span>
          )}
        </div>
      </header>

      {levelUnmeasured && (
        <BizCard className="mb-4 border-l-2 border-l-[#C9A84C]">
          <p className="ka text-sm text-[#1C1C1E]">
            შენი დონე ვარაუდით არის განსაზღვრული. ზუსტი შეფასებისთვის გაიარე მოკლე ტესტი
            (თუ არ გინდა გამოტოვე :)&nbsp; no pressure!)
          </p>
          <div className="mt-3">
            <BizButton variant="outline" onClick={() => navigate("/path/business/test")}>
              დონის შეფასება
            </BizButton>
          </div>
        </BizCard>
      )}

      {plan && (
        <>
          {/* Daily streak — drama scales with the count. */}
          <section className="mb-5">
            <div
              className={`rounded-lg p-4 border transition-colors ${
                streakTier === 4
                  ? "bg-gradient-to-br from-[#232323] via-[#3A3A3A] to-[#8a5a1f] border-[#C9A84C] text-[#F5F4F2] shadow-lg"
                  : streakTier === 3
                    ? "bg-gradient-to-br from-[#232323] to-[#1C1C1E] border-[#5C1A2E] text-[#F5F4F2] shadow-md"
                    : streakTier === 2
                      ? "bg-gradient-to-br from-[#C9A84C]/30 to-white border-[#C9A84C]"
                      : streakTier === 1
                        ? "bg-white border-[#C9A84C]/60"
                        : "bg-white border-[#E4E2DF]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`leading-none ${
                      streakTier >= 3 ? "text-4xl" : streakTier === 2 ? "text-3xl" : "text-2xl"
                    } ${streak === 0 ? "grayscale opacity-50" : ""}`}
                  >
                    🔥
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`font-bold leading-tight ${streakTier >= 2 ? "text-2xl" : "text-lg"} ${
                        streakDark ? "text-[#F5F4F2]" : "text-[#5C1A2E]"
                      }`}
                    >
                      {streak}{" "}
                      <span className={`ka text-xs font-semibold ${streakDark ? "text-[#F5F4F2]/70" : "text-[#4A4A4A]"}`}>
                        დღე ზედიზედ{freezesLeft > 0 ? ` · ❄${freezesLeft}` : ""}
                      </span>
                    </p>
                    <p className={`ka text-[10px] mt-0.5 font-semibold ${streakDark ? "text-[#C9A84C]" : "text-[#4A4A4A]"}`}>
                      {streakMsg}
                    </p>
                    {(s?.bestStreak ?? 0) > streak && (s?.bestStreak ?? 0) >= 3 && (
                      <p className={`ka text-[9px] mt-0.5 ${streakDark ? "text-[#F5F4F2]/50" : "text-[#8A8A8A]"}`}>
                        რეკორდი {s?.bestStreak} დღე
                      </p>
                    )}
                    {usedFreezeToday && (
                      <p className={`ka text-[9px] mt-0.5 font-semibold ${streakDark ? "text-[#7FB2D9]" : "text-[#5C1A2E]"}`}>
                        ❄ Streak გადარჩა
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {last7.map((d, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <span
                        className={`w-5 h-5 rounded-full grid place-items-center text-[9px] font-bold transition-colors
                          ${d.done ? "bg-[#C9A84C] text-[#5C1A2E]" : d.frozen ? "bg-[#7Fb2d9]/30 border border-[#7Fb2d9]/60" : streakDark ? "border border-[#F5F4F2]/30 text-transparent" : "border border-[#E4E2DF] text-transparent"}
                          ${d.isToday && !d.done && !d.frozen ? (streakDark ? "border-[#C9A84C] border-dashed" : "border-[#5C1A2E]/50 border-dashed") : ""}`}
                        title={d.frozen ? "გაყინვა გამოყენებულია" : undefined}
                      >
                        {d.done ? "✓" : d.frozen ? "❄" : "·"}
                      </span>
                      <span
                        className={`ka text-[8px] ${
                          d.isToday
                            ? streakDark
                              ? "font-bold text-[#C9A84C]"
                              : "font-bold text-[#5C1A2E]"
                            : streakDark
                              ? "text-[#F5F4F2]/60"
                              : "text-[#4A4A4A]"
                        }`}
                      >
                        {d.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {nextMilestone !== null && (
                <div className="mt-3">
                  <div className={`h-1.5 rounded-full overflow-hidden ${streakDark ? "bg-[#F5F4F2]/15" : "bg-[#F5F4F2]"}`}>
                    <div
                      className="h-full bg-[#C9A84C] rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.round((streak / nextMilestone) * 100))}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Milestone celebration */}
          {showMilestone && (
            <section className="mb-5 animate-fade-in">
              <div className="relative overflow-hidden rounded-lg bg-[#232323] text-[#F5F4F2] p-6 border border-[#5C1A2E]">
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <Award size={16} strokeWidth={2.25} className="text-[#C9A84C]" />
                    <span className="ka text-[10px] uppercase tracking-wider text-[#C9A84C] font-semibold">
                      მიღწევა განბლოკილია
                    </span>
                  </div>
                  <h2 className="ka text-xl font-bold leading-snug">
                    გილოცავ!
                  </h2>
                  <p className="ka text-sm text-[#F5F4F2]/80 mt-2 leading-relaxed">
                    შენ შეასრულე 7 სავარჯიშო სესია.
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="border border-[#F5F4F2]/15 rounded-md px-2 py-3">
                      <div className="text-xl font-bold">
                        {interviewCount + vocabSessionsCount}
                      </div>
                      <div className="ka text-[10px] text-[#F5F4F2]/65 mt-0.5">სესია</div>
                    </div>
                    <div className="border border-[#F5F4F2]/15 rounded-md px-2 py-3">
                      <div className="text-xl font-bold">{vocabWordCount}</div>
                      <div className="ka text-[10px] text-[#F5F4F2]/65 mt-0.5">სიტყვა</div>
                    </div>
                    <div className="border border-[#F5F4F2]/15 rounded-md px-2 py-3">
                      <div className="text-xl font-bold">{phraseCount}</div>
                      <div className="ka text-[10px] text-[#F5F4F2]/65 mt-0.5">ფრაზა</div>
                    </div>
                  </div>
                  <p className="ka text-sm font-semibold text-[#F5F4F2]/85 mt-4">
                    შეამოწმე რამდენად მოგემატა ცოდნა - გაიარე ხელახალი შეფასება(თუ არ გინდა გამოტოვე :), no pressure!)
                  </p>
                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => {
                        if (user) saveBusiness(user.id, { firstMilestoneAcknowledged: true });
                        navigate("/path/business/reassessment");
                      }}
                      className="ka inline-flex items-center justify-center gap-2 bg-[#1C1C1E] text-[#C9A84C] hover:bg-[#3A3A3A] transition-colors px-5 py-2.5 rounded-md font-bold text-sm"
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
                      className="ka inline-flex items-center justify-center px-5 py-2.5 rounded-md text-sm font-semibold text-[#F5F4F2]/80 hover:text-[#F5F4F2] border border-[#F5F4F2]/20 hover:border-[#F5F4F2]/40 transition-colors"
                    >
                      მოგვიანებით
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {brokenStreak !== null && (
            <BizCard className="mb-4 border-l-2 border-l-[#C9A84C]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="ka text-sm font-bold text-[#1C1C1E]">
                    {brokenStreak} დღიანი Streak შეწყდა
                  </p>
                  <p className="ka text-xs text-[#4A4A4A] mt-1.5 leading-relaxed">
                    ნასწავლი სიტყვები, პროგრესი და ლექსიკონი ადგილზეა. მარტო
                    Streak დაიწყო თავიდან.
                  </p>
                  {vocabSummary && (
                    <p className="ka text-xs text-[#5C1A2E] mt-2 font-semibold">
                      {vocabSummary.known} სიტყვა უკვე იცი. {vocabSummary.percent}% დაფარულია.
                    </p>
                  )}
                  <p className="ka text-xs text-[#4A4A4A] mt-2 leading-relaxed">
                    ერთი სესია და ახალი Streak დაიწყება. რეკორდი {brokenStreak} დღეა.
                  </p>
                </div>
                <button
                  onClick={() => setBrokenStreak(null)}
                  aria-label="დახურვა"
                  className="shrink-0 -mt-1 -mr-1 p-1.5 text-[#8A8A8A] hover:text-[#1C1C1E]"
                >
                  <X size={15} strokeWidth={2.5} />
                </button>
              </div>
              <Link
                to="/path/business/vocabulary"
                onClick={() => setBrokenStreak(null)}
                className="ka mt-4 w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-[#5C1A2E] text-[#F8F5F0] text-sm font-bold"
              >
                დღევანდელი სესია
                <ArrowRight size={15} strokeWidth={2.25} />
              </Link>
            </BizCard>
          )}

          {/* Trial banner — shown INSTEAD of the upgrade prompt while the trial
              is live. Framed around what they currently have, not what they are
              about to lose; the countdown supplies the urgency on its own. */}
          {s && isTrialActive(s) && (
            <button
              onClick={() => navigate("/path/business/premium")}
              className={`w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-3 bg-gradient-to-r from-[#5C1A2E] to-[#4A1526] text-left shadow-sm hover:opacity-95 transition-opacity mb-4 ${
                trialEndingSoon(s) ? "ring-1 ring-[#C9A84C]/60" : ""
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-[#C9A84C] shrink-0"><Star size={16} className="fill-[#C9A84C]" /></span>
                <div className="min-w-0">
                  <p className="ka text-[13px] font-bold text-[#F5F4F2] truncate">
                    {trialEndingSoon(s)
                      ? `პრემიუმს ${trialDaysLeft(s)} დღე დარჩა`
                      : `პრემიუმი გააქტიურებულია — დარჩა ${trialDaysLeft(s)} დღე`}
                  </p>
                  <p className="ka text-[11px] text-[#F5F4F2]/70 truncate">
                    {trialEndingSoon(s)
                      ? "შეინარჩუნე ულიმიტო წვდომა — ნახე პრემიუმი"
                      : `ულიმიტო სესიები · ${aiSessionsRemaining(s)} AI სესია დარჩა`}
                  </p>
                </div>
              </div>
              <ArrowRight size={15} className="text-[#C9A84C] shrink-0" />
            </button>
          )}

          {/* Premium banner — persistent, small, gone once premium or on trial */}
          {s && !s.mockPro && !isTrialActive(s) && (
            <button
              onClick={() => navigate("/path/business/premium")}
              className="w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-3 bg-gradient-to-r from-[#232323] to-[#1C1C1E] text-left shadow-sm hover:opacity-95 transition-opacity"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-[#C9A84C] shrink-0"><Star size={16} className="fill-[#C9A84C]" /></span>
                <div className="min-w-0">
                  <p className="ka text-[13px] font-bold text-[#F5F4F2] truncate">პრემიუმი — ულიმიტო სესიები</p>
                  <p className="ka text-[11px] text-[#F5F4F2]/70 truncate">7 AI სესია კვირაში · გასაუბრებები · დოკუმენტები</p>
                </div>
              </div>
              <ArrowRight size={15} className="text-[#C9A84C] shrink-0" />
            </button>
          )}

          {/* 2. Today's Focus */}
          <section className="mb-5">
            <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold mb-2 px-1 inline-flex items-center gap-1.5">
              <Target size={12} strokeWidth={2.25} /> დღევანდელი ფოკუსი
            </p>
            <div className="relative overflow-hidden rounded-lg bg-[#232323] text-[#F5F4F2] p-6 border border-[#5C1A2E]">
              <div className="relative">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="ka text-[10px] uppercase tracking-wider text-[#F5F4F2]/70 font-semibold">
                    {focusDoneToday ? "დღევანდელი მისია შესრულებულია" : "შენი დღევანდელი მისია"}
                  </span>
                  {focusDoneToday ? (
                    <span className="ka text-[10px] inline-flex items-center gap-1 border border-[#F5F4F2]/20 text-[#F5F4F2]/85 px-2 py-0.5 rounded-md font-semibold">
                      <Check size={11} strokeWidth={2.5} /> დასრულდა
                    </span>
                  ) : (
                    <span className="ka text-[10px] inline-flex items-center gap-1 text-[#F5F4F2]/70">
                      <Clock size={11} strokeWidth={2.25} /> ~{focusMinutes}
                    </span>
                  )}
                </div>
                <h2 className="ka text-xl font-bold leading-snug">
                  {focusDoneToday ? focusCopy.doneTitle : focusCopy.title}
                </h2>
                <p className="ka text-sm text-[#F5F4F2]/80 mt-2 leading-relaxed">
                  {focusDoneToday ? focusCopy.doneSubtitle : focusCopy.subtitle}
                </p>
                {focusDoneToday && (s?.mockPro || isTrialActive(s)) && scenarioToday && (
                  <p className="ka text-[11px] font-semibold text-[#E5D4A8] mt-2">
                    🎬 შემდეგი სესია — სცენარი: {scenarioToday.titleKa}
                  </p>
                )}
                {!focusDoneToday && (
                  <div className="mt-3 space-y-2">
                    {scenarioToday && (
                      <p className="ka text-[11px] font-semibold text-[#E5D4A8]">
                        🎬 დღევანდელი სცენარი: {scenarioToday.titleKa}
                      </p>
                    )}
                    <p className="ka text-[11px] text-[#F5F4F2]/85">
                      დღეს {vocabWordCount} სიტყვა იცი
                    </p>
                    <p className="ka text-[11px] text-[#F5F4F2]/75">
                      {vocabNewToday > 0
                        ? `${vocabNewToday} ახალი სიტყვა · ${vocabReviewToday} გასამეორებელი`
                        : vocabReviewToday > 0
                        ? `${vocabReviewToday} გასამეორებელი სიტყვა`
                        : "გამეორების დღე — ყველაზე რთული სიტყვები"}
                    </p>
                  </div>
                )}
                <div className="mt-5 flex flex-col sm:flex-row gap-2">
                  {/* Premium: the day is never "over" — offer the next session. */}
                  {focusDoneToday && (s?.mockPro || isTrialActive(s)) && (
                    <button
                      onClick={() => navigate("/path/business/module/vocabulary")}
                      className="ka inline-flex items-center justify-center gap-2 bg-[#C9A84C] text-[#1C1C1E] hover:bg-[#D4B560] transition-colors px-5 py-2.5 rounded-md font-bold text-sm w-full sm:w-auto"
                    >
                      კიდევ ერთი სესია ⭐
                      <ArrowRight size={14} strokeWidth={2.25} />
                    </button>
                  )}
                  <button
                    onClick={() =>
                      navigate(focusDoneToday ? "/path/business/lexicon?tab=words" : "/path/business/module/vocabulary")
                    }
                    className="ka inline-flex items-center justify-center gap-2 bg-[#1C1C1E] text-white hover:bg-[#3A3A3A] transition-colors px-5 py-2.5 rounded-md font-bold text-sm w-full sm:w-auto"
                  >
                    {focusDoneToday ? "ნასწავლი სიტყვების ნახვა" : "დაწყება"}
                    <ArrowRight size={14} strokeWidth={2.25} />
                  </button>
                </div>
              </div>
            </div>
          </section>

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

          {/* 5. More — compact rows for everything that used to be big cards */}
          <section className="mb-5">
            <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold mb-2 px-1">
              მეტი
            </p>
            <div className="bg-white border border-[#E4E2DF] rounded-lg divide-y divide-[#F5F4F2]">
              <MoreRow
                icon={<Briefcase size={15} strokeWidth={2} />}
                title="გასაუბრება"
                sub="ივარჯიშე შენს რეზიუმეზე მორგებულ კითხვებზე"
                onClick={() => navigate("/path/business/module/interview")}
              />
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
              <MoreRow
                icon={<Star size={15} strokeWidth={2} />}
                title="⭐ პრემიუმი"
                sub="ულიმიტო სესიები და რეალური გასაუბრებები"
                onClick={() => navigate("/path/business/premium")}
              />
            </div>
          </section>

          {/* 6. Progress */}
          <section>
            <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold mb-2 px-1 inline-flex items-center gap-1.5">
              <BarChart2 size={12} strokeWidth={2.25} /> პროგრესი
            </p>
            <BizCard>
              {/* Overall vocabulary progress — the number that makes months of
                  work visible. Weighted rather than mastered-only: mastery needs
                  correct answers across three separate days, so a user with
                  weeks of effort can still have very few "known" words. Showing
                  only those would report ~1% after 18 sessions. */}
              {vocabSummary && (
                <div className="mb-4 pb-4 border-b border-[#E4E2DF]">
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold">
                        ბიზნეს ლექსიკა
                      </p>
                      <p className="ka text-[11px] text-[#8A8A8A] mt-0.5">
                        {vocabSummary.known} ვიცი · {vocabSummary.learning} ვსწავლობ ·{" "}
                        {vocabSummary.total} სულ
                      </p>
                    </div>
                    <p className="text-2xl font-extrabold text-[#5C1A2E] tabular-nums leading-none">
                      {vocabSummary.percent}%
                    </p>
                  </div>

                  <div className="h-2.5 rounded-full bg-[#F5F4F2] overflow-hidden">
                    {/* Two segments: solid for mastered, lighter for in-progress,
                        so the bar shows momentum rather than only finished work. */}
                    <div className="h-full flex">
                      <div
                        className="h-full bg-[#5C1A2E] transition-all duration-700"
                        style={{ width: `${(vocabSummary.known / vocabSummary.total) * 100}%` }}
                      />
                      <div
                        className="h-full bg-[#C9A84C] transition-all duration-700"
                        style={{
                          width: `${((vocabSummary.learning * 0.5 + vocabSummary.fresh * 0.15) / vocabSummary.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Stat label="🔥 Streak" value={String(streak)} />
                <Stat label="ბიზნეს სიტყვები" value={String(vocabWordCount)} />
                <Stat label="გასაუბრებები" value={String(interviewCount)} />
                <Stat label="სესიები სულ" value={String(interviewCount + (progress.vocabulary?.count ?? 0))} />
              </div>
              <Link
                to="/path/business/lexicon"
                className="ka mt-4 w-full inline-flex items-center justify-between gap-2 px-4 py-3 rounded-md bg-[#232323] text-[#F5F4F2] hover:bg-[#111111] transition-colors text-sm font-semibold"
              >
                <span className="flex items-center gap-2">
                  <Library size={15} strokeWidth={2} />
                  <span>ჩემი ლექსიკონი</span>
                </span>
                <ArrowRight size={14} strokeWidth={2.25} />
              </Link>
            </BizCard>
          </section>

          <SocialRow />

          {milestoneCelebration !== null && (
            <MilestoneCelebration
              pct={milestoneCelebration}
              onClose={() => setMilestoneCelebration(null)}
            />
          )}
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
      className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[#F5F4F2] transition-colors first:rounded-t-lg last:rounded-b-lg"
    >
      <span className="w-8 h-8 rounded-md bg-[#5C1A2E]/5 text-[#5C1A2E] border border-[#E4E2DF] grid place-items-center shrink-0">
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

// Rotating social prompts. A single fixed line stops being seen after about a
// week — the eye learns to skip it. Rotating gives the same slot several
// reasons to be noticed, without ever nagging.
const SOCIAL_PROMPTS = [
  "მოგვწერე, რას ფიქრობ",
  "გამოგვიწერე სოციალურ ქსელებში",
  "ნახე სიახლეები სოციალურ ქსელებში",
  "იდეა გაქვს? გაგვიზიარე",
  "რა უნდა გავაუმჯობესოთ?",
  "შემოგვიერთდი სოციალურ ქსელებში",
];

/**
 * Milestone celebration. Full-screen, dismissible, shown once per 10% reached.
 *
 * The word "ბიზნესმენი" is exactly ten letters, so each 10% reveals one more —
 * the user spells out what they are becoming. That gives an abstract percentage
 * something concrete to reach for, and the unrevealed letters show how far is
 * left without needing a second number.
 */
function MilestoneCelebration({ pct, onClose }: { pct: number; onClose: () => void }) {
  const earned = milestoneLetters(pct);
  const rest = MILESTONE_WORD.slice(earned.length);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-5 bg-[#1C1C1E]/70 backdrop-blur-sm animate-[bizFade_.3s_ease-out_both]"
      onClick={onClose}
    >
      <MilestoneConfetti />
      <div
        className="relative w-full max-w-sm rounded-3xl bg-gradient-to-br from-[#5C1A2E] to-[#4A1526] text-[#F8F5F0] p-7 text-center shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-5xl">🎉</div>

        <p className="ka text-2xl font-bold mt-4">{pct}% დაძლეულია</p>

        {/* Earned letters in gold, the rest faded — progress you can see. */}
        <p className="mt-5 text-3xl font-extrabold tracking-wide">
          <span className="text-[#C9A84C]">{earned}</span>
          <span className="text-[#F8F5F0]/25">{rest}</span>
        </p>

        <p className="ka text-sm text-[#F8F5F0]/80 mt-4 leading-relaxed">
          „ბიზნესმენი“-დან <b className="text-[#C9A84C]">„{earned}“</b> უკვე ხარ.
        </p>

        {pct === 100 && (
          <p className="ka text-sm text-[#C9A84C] font-bold mt-3">
            სრული ლექსიკა დაძლეულია — გილოცავ!
          </p>
        )}

        <button
          onClick={onClose}
          className="ka mt-6 w-full h-12 rounded-2xl bg-[#C9A84C] text-[#1C1C1E] text-sm font-bold"
        >
          გავაგრძელოთ
        </button>
      </div>
    </div>
  );
}

function MilestoneConfetti() {
  const pieces = useMemo(() => {
    const colors = ["#C9A84C", "#E5D4A8", "#F8F5F0", "#5A8A6A"];
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 400,
      duration: 1600 + Math.random() * 1200,
      color: colors[i % colors.length],
      size: 6 + Math.round(Math.random() * 7),
      rot: Math.round(Math.random() * 360),
    }));
  }, []);
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" data-milestone-confetti aria-hidden>
      {/* Keyframes defined locally: bizConfettiFall is used by the vocab module
          but lives in a global stylesheet, and this component must not silently
          fail to animate if that changes. Duplicating six lines is cheaper than
          a celebration that does nothing. */}
      <style>{`
        @keyframes bizConfettiFall {
          0%   { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-milestone-confetti] span { animation: none !important; opacity: 0 !important; }
        }
      `}</style>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.4,
            background: p.color,
            transform: `rotate(${p.rot}deg)`,
            animation: `bizConfettiFall ${p.duration}ms ease-in ${p.delay}ms forwards`,
          }}
        />
      ))}
    </div>
  );
}

function SocialRow() {
  // useMemo keyed to nothing: chosen once per mount, so a re-render mid-session
  // cannot swap the text under the user mid-glance.
  const prompt = useMemo(
    () => SOCIAL_PROMPTS[Math.floor(Math.random() * SOCIAL_PROMPTS.length)],
    [],
  );
  return (
    <div className="mt-6 pt-5 border-t border-[#E4E2DF] flex flex-col items-center gap-3">
      <p className="ka text-[12px] text-[#4A4A4A] text-center">{prompt}</p>
      <div className="flex items-center gap-2">
        <a
          href="https://www.instagram.com/speakbusy/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="SpeakBusy Instagram-ზე"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E4E2DF] bg-white text-[#5C1A2E] text-xs font-semibold hover:border-[#5C1A2E]/40 transition-colors"
        >
          <Instagram size={14} strokeWidth={2.25} />
          Instagram
        </a>
        <a
          href="https://www.tiktok.com/@speakbusy"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="SpeakBusy TikTok-ზე"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E4E2DF] bg-white text-[#5C1A2E] text-xs font-semibold hover:border-[#5C1A2E]/40 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 1 1 .77-5.06V9.7a5.66 5.66 0 0 0-.77-.05 5.68 5.68 0 1 0 5.68 5.68V8.99a7.35 7.35 0 0 0 4.29 1.37V7.27a4.29 4.29 0 0 1-3.23-1.45z" />
          </svg>
          TikTok
        </a>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#F5F4F2] border border-[#E4E2DF] rounded-md px-3 py-3">
      <div className="text-xl font-bold text-[#5C1A2E]">{value}</div>
      <div className="ka text-[11px] text-[#4A4A4A] mt-0.5">{label}</div>
    </div>
  );
}

