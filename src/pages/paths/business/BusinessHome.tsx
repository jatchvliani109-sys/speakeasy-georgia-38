import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Award,
  BarChart2,
  Briefcase,
  Clock,
  FileText,
  Library,
  RotateCcw,
  Star,
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
  BusinessIntensity,
  BusinessState,
  LEVEL_LABELS,
  pullBusinessFromSupabase,
  resetBusiness,
  saveBusiness,
} from "./lib/state";
import { computeStreakWithFreezes, loadProgress, pickDailyScenario, planSession } from "./lib/vocabEngine";
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
    doneTitle: "ყოჩაღ — დღევანდელი ვარჯიში დასრულდა",
    doneSubtitle: "სერია დაცულია 🔥 ხვალ ახალი სიტყვები გელოდება.",
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

  // Streak drama scales with the count (Duolingo-style): bigger flame, richer
  // card, escalating copy, and a progress bar toward the next milestone.
  const streakTier = streak >= 30 ? 4 : streak >= 14 ? 3 : streak >= 7 ? 2 : streak >= 3 ? 1 : 0;
  const nextMilestone = streak >= 30 ? null : streak >= 14 ? 30 : streak >= 7 ? 14 : streak >= 3 ? 7 : 3;
  const streakMsg =
    streakTier === 4
      ? "ლეგენდარული სერია! 👑"
      : streakTier === 3
        ? "ორ კვირაზე მეტი — სერიოზული ხარ 🏆"
        : streakTier === 2
          ? "კვირაზე მეტი — შთამბეჭდავია!"
          : streakTier === 1
            ? "ჩვევა ყალიბდება 💪"
            : streak > 0
              ? "კარგი დასაწყისია — გააგრძელე!"
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

  const incomplete = !s.setupCompleted || !s.testCompleted || !s.plan;
  const plan = s.plan;
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
          {/* Daily streak — drama scales with the count. */}
          <section className="mb-5">
            <div
              className={`rounded-lg p-4 border transition-colors ${
                streakTier === 4
                  ? "bg-gradient-to-br from-[#5C1A2E] via-[#6E2038] to-[#8a5a1f] border-[#C9A84C] text-[#F8F5F0] shadow-lg"
                  : streakTier === 3
                    ? "bg-gradient-to-br from-[#5C1A2E] to-[#1C1C1E] border-[#5C1A2E] text-[#F8F5F0] shadow-md"
                    : streakTier === 2
                      ? "bg-gradient-to-br from-[#C9A84C]/30 to-white border-[#C9A84C]"
                      : streakTier === 1
                        ? "bg-white border-[#C9A84C]/60"
                        : "bg-white border-[#E0D8D0]"
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
                        streakDark ? "text-[#F8F5F0]" : "text-[#5C1A2E]"
                      }`}
                    >
                      {streak}{" "}
                      <span className={`ka text-xs font-semibold ${streakDark ? "text-[#F8F5F0]/70" : "text-[#4A4A4A]"}`}>
                        დღე ზედიზედ{freezesLeft > 0 ? ` · ❄${freezesLeft}` : ""}
                      </span>
                    </p>
                    <p className={`ka text-[10px] mt-0.5 font-semibold ${streakDark ? "text-[#C9A84C]" : "text-[#4A4A4A]"}`}>
                      {streakMsg}
                    </p>
                    {usedFreezeToday && (
                      <p className={`ka text-[9px] mt-0.5 font-semibold ${streakDark ? "text-[#7FB2D9]" : "text-[#5C1A2E]"}`}>
                        ❄ სერია გადარჩა!
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {last7.map((d, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <span
                        className={`w-5 h-5 rounded-full grid place-items-center text-[9px] font-bold transition-colors
                          ${d.done ? "bg-[#C9A84C] text-[#5C1A2E]" : d.frozen ? "bg-[#7Fb2d9]/30 border border-[#7Fb2d9]/60" : streakDark ? "border border-[#F8F5F0]/30 text-transparent" : "border border-[#E0D8D0] text-transparent"}
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
                              ? "text-[#F8F5F0]/60"
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
                  <div className={`h-1.5 rounded-full overflow-hidden ${streakDark ? "bg-[#F8F5F0]/15" : "bg-[#F0EBE3]"}`}>
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
                    შენ შეასრულე 7 სავარჯიშო სესია — ეს ნამდვილი ჩვევის დასაწყისია.
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

          {/* Premium banner — persistent, small, gone once premium */}
          {s && !s.mockPro && (
            <button
              onClick={() => navigate("/path/business/premium")}
              className="w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-3 bg-gradient-to-r from-[#5C1A2E] to-[#1C1C1E] text-left shadow-sm hover:opacity-95 transition-opacity"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-[#C9A84C] shrink-0"><Star size={16} className="fill-[#C9A84C]" /></span>
                <div className="min-w-0">
                  <p className="ka text-[13px] font-bold text-[#F8F5F0] truncate">პრემიუმი - სიტყვების ულიმიტო სესიები</p>
                  <p className="ka text-[11px] text-[#F8F5F0]/70 truncate">7 AI სესია კვირაში · გასაუბრებები · დოკუმენტები</p>
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
                </div>
                <h2 className="ka text-xl font-bold leading-snug">
                  {focusDoneToday ? focusCopy.doneTitle : focusCopy.title}
                </h2>
                <p className="ka text-sm text-[#F0EBE3]/80 mt-2 leading-relaxed">
                  {focusDoneToday ? focusCopy.doneSubtitle : focusCopy.subtitle}
                </p>
                {!focusDoneToday && (
                  <div className="mt-3 space-y-2">
                    {scenarioToday && (
                      <p className="ka text-[11px] font-semibold text-[#E5D4A8]">
                        🎬 დღევანდელი სცენარი: {scenarioToday.titleKa}
                      </p>
                    )}
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
                  onClick={() =>
                    navigate(focusDoneToday ? "/path/business/lexicon?tab=words" : "/path/business/module/vocabulary")
                  }
                  className="ka mt-5 inline-flex items-center justify-center gap-2 bg-[#1C1C1E] text-white hover:bg-[#6E2038] transition-colors px-5 py-2.5 rounded-md font-bold text-sm w-full sm:w-auto"
                >
                  {focusDoneToday ? "ნასწავლი სიტყვების ნახვა" : "დაწყება"}
                  <ArrowRight size={14} strokeWidth={2.25} />
                </button>
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
            <div className="bg-white border border-[#E0D8D0] rounded-lg divide-y divide-[#F0EBE3]">
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

