import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BookOpen, Volume2, VolumeX } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useDisplayName } from "@/hooks/useDisplayName";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";
import { toast } from "sonner";
import { track } from "@/lib/track";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import {
  applyKnownWordFastTrack,
  applySessionResults,
  buildQuiz,
  buildReviewQuiz,
  computeFormatTier,
  computeStreakWithFreezes,
  countCompletedSessions,
  countSessionsToday,
  pickDailyScenario,
  dueToday,
  emptyProgressFor,
  ingestExternalPhrases,
  isProductionType,
  loadProgress,
  loadRecentSessions,
  pickLowestConfidenceWords,
  planSession,
  progressToWord,
  SESSION_QUESTION_TARGET,
  type ProgressRow,
  type QuizQuestion,
  upsertProgress,
  summarizeVocabProgress,
  progressDelta,
} from "./lib/vocabEngine";
import { pullBusinessFromSupabase, type BusinessState,
  hasUnlimitedVocab,
} from "./lib/state";
import { findWord, type VocabWord } from "./lib/vocabBank";
import { clusterById, getContext, type SituationCluster } from "./lib/vocabContext";
import {
  isSoundEnabled,
  playCombo,
  playComplete,
  playCorrect,
  playFlip,
  playMegaCombo,
  playWrong,
  setSoundEnabled,
} from "./lib/vocabSounds";

type Stage = "intro" | "cards" | "quiz" | "results" | "empty" | "reviewIntro";

const PRACTICE_TARGET = 12;
const REVIEW_FALLBACK_SIZE = 10;

// ---- Free-tier daily cap ----
// Vocab costs nothing to serve, so this is pacing + a future upgrade lever,
// not cost control. When payments launch, wire isPaidUser to the real plan.
const FREE_DAILY_SESSIONS = 1;

export default function VocabularyModule() {
  const { user } = useAuth();
  const { displayName } = useDisplayName();
  const [stage, setStage] = useState<Stage>("intro");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [state, setState] = useState<BusinessState | null>(null);
  const [newWords, setNewWords] = useState<VocabWord[]>([]);
  const [reviewKeys, setReviewKeys] = useState<string[]>([]);
  // Scenario mode: /path/business/vocabulary?scenario=<cluster-id> scopes the
  // session to that scenario's words (from vocabContext).
  const [searchParams] = useSearchParams();
  const scenarioId = searchParams.get("scenario");
  const [scenario, setScenario] = useState<SituationCluster | null>(null);
  const [tierLevel, setTierLevel] = useState<1 | 2 | 3>(1);
  // Question-format difficulty — escalates above tierLevel automatically when
  // recent accuracy is very high, eases back when it drops.
  const [formatTier, setFormatTier] = useState<1 | 2 | 3>(1);
  // Words the learner marked "I already know this" on the card stage.
  const [claimed, setClaimed] = useState<Set<string>>(new Set());
  const [sessionsToday, setSessionsToday] = useState(0);
  const [streakCelebration, setStreakCelebration] = useState<{ from: number; to: number } | null>(null);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [cardIdx, setCardIdx] = useState(0);
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<{ wordKey: string; correct: boolean; production: boolean }[]>([]);
  const [selected, setSelected] = useState<string | number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [totalVocab, setTotalVocab] = useState(0);
  // Progress gained this session — captured before and after the save so the
  // results screen can show "+0.6% დღეს". The absolute percentage barely moves
  // at 980 words; the delta is what makes a session feel like it counted.
  const [sessionDelta, setSessionDelta] = useState<number | null>(null);

  const [lastResults, setLastResults] = useState<{
    answers: { wordKey: string; correct: boolean; production: boolean }[];
    newWords: VocabWord[];
  } | null>(null);
  const [reviewWords, setReviewWords] = useState<VocabWord[]>([]);
  const [reviewMode, setReviewMode] = useState(false);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [soundOn, setSoundOnState] = useState<boolean>(() => isSoundEnabled());
  const [confettiKey, setConfettiKey] = useState(0);
  const [streakOverlay, setStreakOverlay] = useState<null | "mid" | "mega">(null);
  const [streakN, setStreakN] = useState(0);
  // Chosen when the overlay fires — picking during render would reshuffle the
  // text on every re-render while the overlay is on screen.
  const [megaMsg, setMegaMsg] = useState(MSG_MEGA[0]);
  const [progressPulse, setProgressPulse] = useState(0);
  const [resumed, setResumed] = useState(false);
  const [screenFlash, setScreenFlash] = useState<null | "gold" | "mega">(null);
  const masteredBaselineRef = useRef<number>(0);
  const autoAdvanceRef = useRef<number | null>(null);

  // Words due for review today — shown on the intro screen so the learner
  // sees exactly what today's session will strengthen.
  const dueList = useMemo(() => dueToday(progress), [progress]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOnState(next);
    setSoundEnabled(next);
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const s = await pullBusinessFromSupabase(user.id);
      if (cancelled) return;
      setState(s);
      let p = await loadProgress(user.id);
      // DISABLED 2026-08-01. This pulled AI-generated phrases out of interview
      // and meeting transcripts and wrote them into vocabulary progress as
      // `interview:*` / `meeting:*` rows whose EN/KA live in a meta blob rather
      // than the curated bank. They bypass every quality gate: unreviewed
      // Georgian, no enrichment, no collocations — and they produced real
      // nonsense questions in production ("explore" paired with wrong Georgian).
      // 35 such rows were purged. Re-enable only if these phrases go through
      // the same review the 980-word bank did.
      // p = await ingestExternalPhrases(user.id, p);
      if (cancelled) return;
      const plan = planSession(p, s.field || [], s.mainPriority || []);
      const recent = await loadRecentSessions(user.id);
      const doneToday = await countSessionsToday(user.id);
      const totalDone = await countCompletedSessions(user.id);
      if (cancelled) return;
      setSessionsToday(doneToday);
      setProgress(p);
      setTotalVocab(p.length);
      // Explicit ?scenario link wins; otherwise the app decides — on scenario
      // days the session is automatically themed (no choosing).
      const sc = scenarioId
        ? clusterById(scenarioId)
        : pickDailyScenario(p, totalDone) ?? undefined;
      let newW = plan.newWords;
      let revK = plan.reviewKeys;
      if (sc) {
        // Scenario session: only this scenario's words. Unseen ones are
        // taught as new; already-studied ones come back as review.
        setScenario(sc);
        const words = sc.wordKeys.map(findWord).filter(Boolean) as VocabWord[];
        const seenKeys = new Set(p.map((r) => r.word_key));
        newW = words.filter((w) => !seenKeys.has(w.key)).slice(0, 8);
        revK = words
          .filter((w) => seenKeys.has(w.key))
          .map((w) => w.key)
          .slice(0, 8);
      }
      setNewWords(newW);
      setReviewKeys(revK);
      setTierLevel(plan.tierLevel);
      setFormatTier(computeFormatTier(plan.tierLevel, recent));

      // Resume an interrupted session rather than silently starting a new one.
      const saved = loadSessionSnapshot(user.id);
      if (saved) {
        setQuiz(saved.quiz);
        setQIdx(saved.qIdx);
        setAnswers(saved.answers);
        setNewWords(saved.newWords);
        setFormatTier(saved.formatTier);
        setReviewMode(saved.reviewMode);
        setBestCombo(saved.bestCombo);
        setSelected(null);
        setRevealed(false);
        setResumed(true);
        setStage("quiz");
        setLoading(false);
        return;
      }
      if (!newW.length && !revK.length) {
        const fallback = pickLowestConfidenceWords(p, REVIEW_FALLBACK_SIZE);
        if (fallback.length) {
          setReviewWords(fallback);
          setReviewMode(true);
          setStage("reviewIntro");
        } else {
          setStage("empty");
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, scenarioId]);

  // Snapshot the in-flight session so leaving the page doesn't discard it.
  useEffect(() => {
    if (stage !== "quiz" || !user || quiz.length === 0) return;
    saveSessionSnapshot({
      v: SESSION_VERSION,
      userId: user.id,
      savedAt: new Date().toISOString(),
      quiz,
      qIdx,
      answers,
      newWords,
      formatTier,
      reviewMode,
      bestCombo,
    });
  }, [stage, quiz, qIdx, answers, user, newWords, formatTier, reviewMode, bestCombo]);

  // Mock premium (placeholder until real payments): unlocks unlimited sessions.
  // Trial users get premium session behaviour too, so this must not test
  // mockPro directly — that would promise unlimited sessions and then deny them.
  const isPaidUser = hasUnlimitedVocab(state);
  const dailyLimitReached = !isPaidUser && sessionsToday >= FREE_DAILY_SESSIONS;

  const startSession = () => {
    if (dailyLimitReached) return;
    clearSessionSnapshot();   // starting fresh on purpose
    setResumed(false);
    // Resume audio on user gesture (browsers require it).
    try { (window as any).AudioContext && new (window as any).AudioContext().resume?.(); } catch {}
    masteredBaselineRef.current = progress.filter((p) => p.confidence >= 4).length;
    setCombo(0);
    setBestCombo(0);
    setClaimed(new Set());
    if (reviewMode) {
      setQuiz(buildReviewQuiz(reviewWords));
      setQIdx(0);
      setAnswers([]);
      setSelected(null);
      setRevealed(false);
      setStage("quiz");
      return;
    }
    setCardIdx(0);
    setQIdx(0);
    setAnswers([]);
    setSelected(null);
    setRevealed(false);
    if (newWords.length) {
      // Quiz is built AFTER the cards stage so "I know this word" claims can
      // shape it (claimed words get one typed proof instead of two questions).
      playFlip();
      setStage("cards");
    } else {
      setQuiz(buildQuiz([], reviewKeys, formatTier, { targetQuestions: SESSION_QUESTION_TARGET }));
      setStage("quiz");
    }
  };

  const beginQuiz = () => {
    track("vocab_session_started");
    setQuiz(buildQuiz(newWords, reviewKeys, formatTier, { claimedKeys: Array.from(claimed) }));
    setQIdx(0);
    setAnswers([]);
    setSelected(null);
    setRevealed(false);
    setStage("quiz");
  };

  const toggleClaim = (key: string) => {
    setClaimed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // CARDS
  const onNextCard = () => {
    if (cardIdx + 1 < newWords.length) {
      setCardIdx((i) => i + 1);
      playFlip();
    } else {
      beginQuiz();
    }
  };

  // QUIZ — single click flow
  const currentQ = quiz[qIdx];

  // Duolingo-style mistake requeue: a missed question is appended to the END of
  // the session and must be answered again, so the session grows by one item per
  // mistake. A question is a RETRY if the same item already appeared earlier in
  // the queue — that also caps it at exactly one repeat (a retry never requeues).
  const qid = (q: QuizQuestion) => `${q.type}:${"wordKey" in q ? q.wordKey : (q as any).key}`;
  const isRetry = !!currentQ && quiz.slice(0, qIdx).some((q) => qid(q) === qid(currentQ));

  const triggerStreak = (n: number) => {
    setStreakN(n);
    if (n === 10 || (n > 10 && n % 10 === 0)) {
      setMegaMsg(randomOf(MSG_MEGA));
      setStreakOverlay("mega");
      setScreenFlash("mega");
      setConfettiKey((k) => k + 1);
      playMegaCombo();
      window.setTimeout(() => setStreakOverlay(null), 2500);
      window.setTimeout(() => setScreenFlash(null), 2500);
    } else if (n === 5 || (n > 5 && n % 5 === 0)) {
      setStreakOverlay("mid");
      setScreenFlash("gold");
      setProgressPulse((p) => p + 1);
      playCombo();
      window.setTimeout(() => setStreakOverlay(null), 1500);
      window.setTimeout(() => setScreenFlash(null), 1500);
    }
  };

  const handleSelect = (val: string | number) => {
    if (revealed || !currentQ) return;
    setSelected(val);
    const correct = checkAnswer(currentQ, val);
    const key = "wordKey" in currentQ ? currentQ.wordKey : `mistake:${currentQ.key}`;
    const nextAnswers = [...answers, { wordKey: key, correct, production: isProductionType(currentQ.type) }];
    setAnswers(nextAnswers);
    setRevealed(true);

    if (correct) {
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      setBestCombo((b) => Math.max(b, nextCombo));
      if (nextCombo === 5 || (nextCombo > 5 && nextCombo % 5 === 0) || nextCombo === 10 || (nextCombo > 10 && nextCombo % 10 === 0)) {
        triggerStreak(nextCombo);
      } else {
        playCorrect();
      }
      // Auto-advance on correct after 1.5s (longer if streak overlay is showing)
      const delay = (nextCombo === 10 || (nextCombo > 10 && nextCombo % 10 === 0)) ? 2700 : (nextCombo === 5 || (nextCombo > 5 && nextCombo % 5 === 0)) ? 1700 : 1500;
      if (autoAdvanceRef.current) window.clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = window.setTimeout(() => goNext(nextAnswers), delay);
    } else {
      setCombo(0);
      playWrong();
      // Requeue the missed question once, at the end of this session.
      if (!isRetry) setQuiz((qs) => [...qs, currentQ]);
      // Wrong: do not auto-advance — let user review and click next.
    }
  };

  const goNext = (ans: { wordKey: string; correct: boolean; production: boolean }[]) => {
    if (autoAdvanceRef.current) { window.clearTimeout(autoAdvanceRef.current); autoAdvanceRef.current = null; }
    if (resumed) setResumed(false);
    if (qIdx + 1 < quiz.length) {
      setQIdx((i) => i + 1);
      setSelected(null);
      setRevealed(false);
    } else {
      finishSession(ans);
    }
  };


  const finishSession = async (finalAnswers: { wordKey: string; correct: boolean; production: boolean }[]) => {
    if (!user) return;
    // Aggregate per word
    const perWord = new Map<string, { correct: boolean; production: boolean }[]>();
    finalAnswers.forEach((a) => {
      const arr = perWord.get(a.wordKey) || [];
      arr.push({ correct: a.correct, production: a.production });
      perWord.set(a.wordKey, arr);
    });

    const updated: ProgressRow[] = [];
    for (const [wordKey, entries] of perWord.entries()) {
      const results = entries.map((e) => e.correct);
      const prodCorrect = entries.filter((e) => e.correct && e.production).length;
      const existing = progress.find((p) => p.word_key === wordKey);
      let row =
        existing ||
        (() => {
          const isNew = newWords.find((w) => w.key === wordKey);
          if (isNew) return emptyProgressFor(isNew);
          const fallback = reviewWords.find((w) => w.key === wordKey);
          if (fallback) return emptyProgressFor(fallback);
          return null;
        })();
      if (!row) continue;
      row = claimed.has(wordKey)
        ? applyKnownWordFastTrack(row, results, prodCorrect)
        : applySessionResults(row, results, prodCorrect);
      updated.push(row);
    }
    // A dropped connection here used to lose the whole session silently — the
    // results screen appeared as if everything had saved. Tell the user instead,
    // and keep the session snapshot so nothing is thrown away.
    const saveRes = await upsertProgress(user.id, updated);
    if (!saveRes.ok) {
      toast.error("პროგრესი ვერ შეინახა — შეამოწმე ინტერნეტი და სცადე ხელახლა");
    }
    // Update local progress + total vocab counter
    const newProgress = [...progress];
    updated.forEach((row) => {
      const idx = newProgress.findIndex((p) => p.word_key === row.word_key);
      if (idx >= 0) newProgress[idx] = row;
      else newProgress.push(row);
    });
    setProgress(newProgress);
    setTotalVocab(newProgress.length);

    // Save session
    const score = finalAnswers.filter((a) => a.correct).length;
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.from("business_vocab_sessions").insert({
      user_id: user.id,
      score,
      total: finalAnswers.length,
      new_words: newWords.length,
      review_words: reviewKeys.length,
      completed: true,
      completed_at: new Date().toISOString(),
      session_data: {
        wordKeys: newWords.map((w) => w.key),
        answers: finalAnswers,
      },
    });
    // Count it now so the daily cap applies within this visit too.
    setSessionsToday((x) => x + 1);

    // Mastered milestone (every 10 mastered → confetti)
    const newMastered = newProgress.filter((p) => p.confidence >= 4).length;
    const baseline = masteredBaselineRef.current;
    if (Math.floor(newMastered / 10) > Math.floor(baseline / 10)) {
      setConfettiKey((k) => k + 1);
    }
    masteredBaselineRef.current = newMastered;

    // Streak celebration: compute the streak as it was BEFORE today's session
    // vs. after, so the results screen can tick the flame up by one when today
    // is the day that extended it. ONLY for the first completed session of the
    // day — the streak grows once per day, so later sessions repeating
    // "the streak grew!" was both wrong and noisy. (`sessionsToday` here still
    // holds the pre-increment closure value = sessions finished before this one.)
    if (sessionsToday > 0) {
      // Not the first session today — the streak already grew earlier.
      setStreakCelebration(null);
    } else try {
      const { supabase: sb } = await import("@/integrations/supabase/client");
      const { data: sessRows } = await sb
        .from("business_vocab_sessions")
        .select("completed_at")
        .eq("user_id", user.id)
        .eq("completed", true)
        .order("completed_at", { ascending: false })
        .limit(120);
      const allDates = (sessRows || []).map((r: any) => r.completed_at).filter(Boolean);
      const todayStr = new Date().toDateString();
      const beforeDates = allDates.filter((d: string) => new Date(d).toDateString() !== todayStr);
      const bank = state?.streakFreezes ?? 2;
      const fdays = state?.freezeDays ?? [];
      const before = computeStreakWithFreezes(beforeDates, bank, fdays).streak;
      const after = computeStreakWithFreezes(allDates, bank, fdays).streak;
      setStreakCelebration({ from: before, to: Math.max(after, before) });
    } catch {
      setStreakCelebration(null);
    }

    track("vocab_session_completed", {
      questions: finalAnswers.length,
      correct: finalAnswers.filter((a) => a.correct).length,
      new_words: newWords.length,
    });
    playComplete();
    // Only discard the resume snapshot if the results actually reached the server.
    if (saveRes.ok) clearSessionSnapshot();

    // Percentage before this session's rows were applied, versus after.
    try {
      const before = summarizeVocabProgress(progress).percent;
      const after = summarizeVocabProgress(newProgress).percent;
      const d = progressDelta(before, after);
      if (d > 0) setSessionDelta(d);
    } catch { /* display only — never block the results screen */ }

    setLastResults({ answers: finalAnswers, newWords });
    setStage("results");
  };


  const startPracticeMore = () => {
    const src = lastResults || { answers, newWords };
    // Build a quick review pool: words user got wrong + lowest-confidence words
    const wrongKeys = Array.from(
      new Set(src.answers.filter((a) => !a.correct).map((a) => a.wordKey)),
    );
    const wrongWords = wrongKeys
      .map((k) => src.newWords.find((w) => w.key === k) || progressToWord(progress.find((p) => p.word_key === k) as ProgressRow))
      .filter(Boolean) as VocabWord[];

    let pool: VocabWord[] = [...wrongWords];
    if (pool.length < PRACTICE_TARGET) {
      const lowConf = [...progress]
        .filter((p) => !pool.find((w) => w.key === p.word_key))
        .sort((a, b) => a.confidence - b.confidence)
        .map((p) => progressToWord(p))
        .filter(Boolean) as VocabWord[];
      pool = [...pool, ...lowConf].slice(0, PRACTICE_TARGET);
    }
    if (!pool.length) return;

    // Pass pool as newWords so buildQuiz uses real VocabWord objects directly
    // (review-key lookup via findWord would miss ingested phrases). We still
    // skip the cards stage and go straight to quiz.
    setNewWords([]);
    setReviewKeys(pool.map((w) => w.key));
    setQuiz(buildQuiz(pool, [], formatTier, { targetQuestions: SESSION_QUESTION_TARGET }));
    setQIdx(0);
    setAnswers([]);
    setSelected(null);
    setRevealed(false);
    setStage("quiz");
  };

  if (loading) {
    return (
      <BusinessShell back={{ to: "/path/business/home", label: "SpeakBusy" }}>
        <BizCard><p className="ka text-sm text-[#4A4A4A]">იტვირთება...</p></BizCard>
      </BusinessShell>
    );
  }

  return (
    <BusinessShell back={{ to: "/path/business/home", label: "SpeakBusy" }}>
      <header className="mb-5">
        <p className="ka text-[11px] uppercase tracking-wider text-[#1C1C1E] font-semibold">
          ბიზნეს ლექსიკა
        </p>
        <h1 className="ka text-2xl font-bold text-[#5C1A2E] mt-1">
          {stage === "results"
            ? displayName ? `${displayName}, სესია დასრულდა` : "სესია დასრულდა"
            : stage === "reviewIntro"
            ? "გამეორების დღე"
            : "დღევანდელი სიტყვები"}
        </h1>
        <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
          <Link to="/path/business/lexicon?tab=words" className="ka text-xs text-[#5C1A2E] underline underline-offset-2 inline-flex items-center gap-1">
            <BookOpen size={13} strokeWidth={2.25} /> ჩემი რვეული
          </Link>
          <button
            type="button"
            onClick={toggleSound}
            title={soundOn ? "ხმის გამორთვა" : "ხმის ჩართვა"}
            className="ka text-[11px] inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-[#E4E2DF] text-[#4A4A4A] hover:text-[#5C1A2E] hover:bg-white transition"
          >
            {soundOn ? <Volume2 size={13} strokeWidth={2.25} /> : <VolumeX size={13} strokeWidth={2.25} />}
            <span>{soundOn ? "ხმა ჩართულია" : "ხმა გამორთულია"}</span>
          </button>
        </div>
      </header>

      {stage === "quiz" && combo >= 2 && (
        <div className="mb-3 flex items-center justify-end">
          <div className={`ka inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#1C1C1E] to-[#C9A84C] text-white text-xs font-bold shadow-sm transition-all ${progressPulse ? "biz-progress-pulse" : ""}`}>
            <span className="biz-flame">🔥</span>
            {combo} სწორი ზედიზედ
          </div>
        </div>
      )}

      {/* Screen flash overlay for streaks */}
      {screenFlash && (
        <div
          key={`flash-${screenFlash}-${streakOverlay}`}
          className={`pointer-events-none fixed inset-0 z-40 ${screenFlash === "mega" ? "biz-mega-flash" : "biz-gold-flash"}`}
        />
      )}

      {/* Streak message overlay */}
      {streakOverlay === "mid" && (
        <div className="pointer-events-none fixed inset-0 z-50 flex">
          <div className="absolute left-1/2 top-1/2 biz-streak-pop">
            <div className="ka px-7 py-4 rounded-2xl bg-gradient-to-br from-[#232323] to-[#1C1C1E] text-[#F5F4F2] text-2xl font-extrabold shadow-2xl border-2 border-[#C9A84C]/60 whitespace-nowrap">
              🔥 <span className="text-[#C9A84C]">{streakN}</span> სწორი პასუხი!
            </div>
          </div>
        </div>
      )}
      {streakOverlay === "mega" && (
        <div className="pointer-events-none fixed inset-0 z-50 flex">
          <div className="absolute left-1/2 top-1/2 biz-mega-pop">
            <div className="ka px-8 py-6 rounded-3xl bg-gradient-to-br from-[#232323] via-[#111111] to-[#1C1C1E] text-[#F5F4F2] text-3xl font-extrabold shadow-2xl border-2 border-[#C9A84C] text-center max-w-[90vw]">
              <div className="text-4xl">⚡ <span className="text-[#C9A84C]">{streakN}</span> სწორი პასუხი!</div>
              <div className="text-xl mt-1 text-[#E5D4A8]">{megaMsg}</div>
            </div>
          </div>
        </div>
      )}

      {confettiKey > 0 && <Confetti seed={confettiKey} />}

      {stage === "intro" && dailyLimitReached && (
        <>
          <div className="rounded-3xl p-6 text-center text-[#F5F4F2] bg-gradient-to-br from-[#232323] to-[#1C1C1E] shadow-lg">
            <div className="text-4xl">✓</div>
            <h2 className="ka text-xl font-bold mt-2">დღევანდელი ვარჯიში დასრულებულია</h2>
            <p className="ka text-sm text-[#F5F4F2]/80 mt-2 leading-relaxed">
              "Streak" შენარჩუნებულია 🔥 ხვალ ახალი სიტყვები და გამეორება გელოდება.
            </p>
            <Link
              to="/path/business/home"
              className="ka inline-block mt-5 px-6 py-3 rounded-full bg-[#C9A84C] text-[#5C1A2E] text-sm font-bold"
            >
              მთავარზე დაბრუნება
            </Link>
            <Link
              to="/path/business/premium"
              className="ka block mt-3 text-[12px] font-semibold text-[#F5F4F2]/85 underline underline-offset-4"
            >
              ⭐ პრემიუმით მეორე სესია ახლავე შეგეძლო — ულიმიტოდ
            </Link>
          </div>
          {dueList.length > 0 && (
            <BizCard className="mt-4">
              <p className="ka text-[11px] uppercase tracking-wider text-[#1C1C1E] font-semibold">
                ხვალ გასამეორებელი
              </p>
              <ul className="mt-2 space-y-1.5">
                {dueList.slice(0, 4).map((w) => (
                  <li key={w.key} className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-semibold text-[#5C1A2E]">{w.en}</span>
                    <span className="ka text-xs text-[#4A4A4A] truncate">{w.ka}</span>
                  </li>
                ))}
              </ul>
            </BizCard>
          )}
        </>
      )}
      {stage === "intro" && !dailyLimitReached && (
        <>
          {scenario && (
            <div className="mb-3 text-center">
              <div className="rounded-2xl border-2 border-[#C9A84C] bg-[#C9A84C]/10 p-4 text-left">
                <p className="ka text-sm font-bold text-[#5C1A2E]">🎬 დღევანდელი სცენარი: {scenario.titleKa}</p>
                <p className="ka text-xs text-[#4A4A4A] mt-1.5 leading-relaxed">
                  {scenario.scenarioKa}
                </p>
                <p className="ka text-[11px] text-[#5C1A2E] font-semibold mt-2">
                  ამ სესიის ყველა სიტყვა ამ სიტუაციიდანაა
                </p>
              </div>
            </div>
          )}
          <IntroCard
            newWords={newWords}
            reviewCount={reviewKeys.length}
            onStart={startSession}
          />
          {formatTier > tierLevel && (
            <p className="ka text-xs text-[#4A4A4A] mt-2 text-center">
              📈 ბოლო შედეგების მიხედვით კითხვები ოდნავ გართულდა
            </p>
          )}
          {dueList.length > 0 && (
            <BizCard className="mt-4">
              <div className="flex items-baseline justify-between">
                <p className="ka text-[11px] uppercase tracking-wider text-[#1C1C1E] font-semibold">
                  დღეს გასამეორებელი
                </p>
                <p className="text-[11px] text-[#4A4A4A] font-mono">{dueList.length}</p>
              </div>
              <ul className="mt-2 space-y-1.5">
                {dueList.slice(0, 6).map((w) => (
                  <li key={w.key} className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-semibold text-[#5C1A2E]">{w.en}</span>
                    <span className="ka text-xs text-[#4A4A4A] truncate">{w.ka}</span>
                  </li>
                ))}
              </ul>
              {dueList.length > 6 && (
                <p className="ka text-xs text-[#4A4A4A] mt-2">+{dueList.length - 6} სხვა სიტყვა</p>
              )}
            </BizCard>
          )}
        </>
      )}

      {stage === "reviewIntro" && (
        <ReviewIntroCard words={reviewWords} onStart={startSession} />
      )}

      {stage === "empty" && (
        <BizCard className="text-center py-10">
          <div className="mx-auto w-14 h-14 rounded-full bg-[#F5F4F2] border border-[#E4E2DF] grid place-items-center text-2xl">
            🎉
          </div>
          <h3 className="ka text-lg font-bold text-[#5C1A2E] mt-3">დღევანდელი სიტყვები მზად არ არის</h3>
          <p className="ka text-sm text-[#4A4A4A] mt-2 max-w-sm mx-auto">
            ყველა მიმდინარე სიტყვა შესწავლილია. შემოამოწმე ხვალ ან გადახედე რვეულს.
          </p>
          <div className="mt-5">
            <Link to="/path/business/lexicon?tab=words">
              <BizButton>რვეულის ნახვა →</BizButton>
            </Link>
          </div>
        </BizCard>
      )}

      {stage === "cards" && newWords[cardIdx] && (
        <>
          <ProgressBar value={cardIdx + 1} total={newWords.length} label={`ახალი სიტყვა ${cardIdx + 1}/${newWords.length}`} />
          <WordCard
            key={newWords[cardIdx].key}
            word={newWords[cardIdx]}
            claimed={claimed.has(newWords[cardIdx].key)}
            onToggleClaim={() => toggleClaim(newWords[cardIdx].key)}
          />
          <div className="mt-4 flex justify-end">
            <BizButton onClick={onNextCard}>
              {cardIdx + 1 < newWords.length ? "შემდეგი →" : "ქვიზის დაწყება →"}
            </BizButton>
          </div>
        </>
      )}

      {stage === "quiz" && currentQ && (
        <>
          <ProgressBar value={qIdx + (revealed ? 1 : 0)} total={quiz.length} label={`კითხვა ${qIdx + 1}/${quiz.length}`} pulse={progressPulse} />
          {scenario && (
            <p className="ka text-[11px] font-semibold text-[#5C1A2E] -mt-1">
              🎬 {scenario.titleKa}
            </p>
          )}
          {resumed && (
            <p className="ka text-[11px] font-semibold text-[#5C1A2E] -mt-1">
              ⏵ გაგრძელდა იქიდან, სადაც შეწყვიტე
            </p>
          )}
          {isRetry && (
            <p className="ka text-[11px] font-semibold text-[#C9A84C] -mt-1">
              🔁 გამეორება — ეს კითხვა ადრე გამოგრჩა
            </p>
          )}
          <div key={qIdx} className="biz-question-slide">
            <QuestionCard
              q={currentQ}
              selected={selected}
              revealed={revealed}
              setSelected={handleSelect}
            />
          </div>
          {revealed && selected !== null && !checkAnswer(currentQ, selected) && (
            <div className="mt-4 flex justify-end animate-[bizFade_.3s_ease-out_both]">
              <BizButton onClick={() => goNext(answers)}>
                {qIdx + 1 < quiz.length ? "შემდეგი →" : "შედეგი →"}
              </BizButton>
            </div>
          )}
        </>
      )}


      {stage === "results" && lastResults && (
        <Results
          sessionDelta={sessionDelta}
          answers={lastResults.answers}
          newWords={lastResults.newWords}
          reviewCount={reviewKeys.length}
          totalVocab={totalVocab}
          streakCelebration={streakCelebration}
          canPracticeMore={!dailyLimitReached && (lastResults.answers.some((a) => !a.correct) || progress.length > 0)}
          isPaid={isPaidUser}
          onPracticeMore={startPracticeMore}
        />
      )}
    </BusinessShell>
  );
}

function IntroCard({
  newWords,
  reviewCount,
  onStart,
}: { newWords: VocabWord[]; reviewCount: number; onStart: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#232323] to-[#161616] text-[#F5F4F2] p-6 shadow-[0_12px_32px_-12px_rgba(92,26,46,0.45)]">
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#1C1C1E]/15 blur-2xl pointer-events-none" />
      <div className="relative">
        <p className="ka text-[10px] uppercase tracking-wider bg-[#1C1C1E]/20 text-[#E5D4A8] px-2 py-1 rounded-md font-semibold inline-block">
          შემდეგი სესია
        </p>
        <h2 className="ka text-xl font-bold mt-3 leading-snug">
          {newWords.length} ახალი სიტყვა · {reviewCount} გასამეორებელი
        </h2>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Mini label="ბარათები" value={`${newWords.length}`} />
          <Mini label="გასამეორებელი" value={`${reviewCount}`} />
          <Mini label="დრო" value="~5 წთ" />
        </div>
        <button
          onClick={onStart}
          className="ka mt-5 inline-flex items-center justify-center gap-2 bg-[#1C1C1E] text-[#5C1A2E] hover:bg-[#C9A84C] transition-colors px-5 py-3 rounded-xl font-bold text-sm w-full"
        >
          დაწყება →
        </button>
      </div>
    </div>
  );
}

function ReviewIntroCard({ words, onStart }: { words: VocabWord[]; onStart: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#232323] to-[#161616] text-[#F5F4F2] p-6 shadow-[0_12px_32px_-12px_rgba(92,26,46,0.45)]">
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#1C1C1E]/15 blur-2xl pointer-events-none" />
      <div className="relative">
        <p className="ka text-[10px] uppercase tracking-wider bg-[#1C1C1E]/20 text-[#E5D4A8] px-2 py-1 rounded-md font-semibold inline-block">
          გამეორების დღე
        </p>
        <h2 className="ka text-xl font-bold mt-3 leading-snug">
          {words.length} სიტყვის გამეორება
        </h2>
        <p className="ka text-sm text-[#F5F4F2]/80 mt-2 leading-relaxed">
          ახალი სიტყვები ხვალ გემატება. დღეს გაიმეორე ის სიტყვები, რომლებიც ყველაზე მეტ გამეორებას საჭიროებს.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Mini label="სიტყვები" value={`${words.length}`} />
          <Mini label="კითხვები" value="~20" />
          <Mini label="დრო" value="~7 წთ" />
        </div>
        <button
          onClick={onStart}
          className="ka mt-5 inline-flex items-center justify-center gap-2 bg-[#1C1C1E] text-[#5C1A2E] hover:bg-[#C9A84C] transition-colors px-5 py-3 rounded-xl font-bold text-sm w-full"
        >
          გამეორების დაწყება →
        </button>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#F5F4F2]/10 rounded-lg px-3 py-2">
      <p className="ka text-[10px] text-[#F5F4F2]/70 uppercase tracking-wider">{label}</p>
      <p className="text-base font-bold text-[#F5F4F2] mt-0.5">{value}</p>
    </div>
  );
}

function ProgressBar({ value, total, label, pulse = 0 }: { value: number; total: number; label: string; pulse?: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / total) * 100)));
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1.5">
        <p className="ka text-[11px] text-[#4A4A4A] font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-[11px] text-[#4A4A4A] font-mono">{pct}%</p>
      </div>
      <div className={`h-2 bg-[#E4E2DF] rounded-full overflow-hidden ${pulse ? "biz-progress-pulse" : ""}`}>
        <div
          key={pulse}
          className="h-full bg-gradient-to-r from-[#232323] to-[#1C1C1E] rounded-full"
          style={{ width: `${pct}%`, transition: "width 700ms cubic-bezier(0.2,0.8,0.2,1)" }}
        />
      </div>
    </div>
  );
}

function WordCard({
  word,
  claimed,
  onToggleClaim,
}: {
  word: VocabWord;
  claimed?: boolean;
  onToggleClaim?: () => void;
}) {
  const ctx = getContext(word.key);
  return (
    <div key={word.key} className="biz-card-flip bg-white border border-[#E4E2DF] rounded-3xl p-6 shadow-[0_2px_4px_rgba(92,26,46,0.04),0_12px_32px_-12px_rgba(92,26,46,0.15)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-3xl font-bold text-[#5C1A2E] tracking-tight">{word.en}</h2>
          <p className="ka text-base text-[#4A4A4A] mt-1">{word.ka}</p>
          {word.pronunciation && (
            <p className="ka text-xs text-[#1C1C1E] font-mono mt-1">[{word.pronunciation}]</p>
          )}
        </div>
        <ReadAloudButton text={word.en} storageKey={word.key} size="md" />
      </div>

      {onToggleClaim && (
        <button
          type="button"
          onClick={onToggleClaim}
          className={`ka mt-3 text-[11px] px-3 py-1.5 rounded-full border font-semibold transition-colors
            ${claimed
              ? "border-[#C9A84C] bg-[#C9A84C]/15 text-[#5C1A2E]"
              : "border-[#E4E2DF] bg-white text-[#4A4A4A] hover:border-[#C9A84C] hover:text-[#5C1A2E]"}
          `}
        >
          {claimed ? "✓ ვიცი — ქვიზში დავადასტურებ" : "ვიცი ეს სიტყვა"}
        </button>
      )}

      {word.explanationKa && word.explanationKa.trim() !== word.ka.trim() && (
        <p className="ka text-sm text-[#1C1C1E] mt-4 leading-relaxed">{word.explanationKa}</p>
      )}

      {(() => {
        // Authored enrichment covers all 980 words; the older context file only
        // covered 74. Prefer the word's own collocations, fall back to context.
        const colls = (word.collocations && word.collocations.length > 0)
          ? word.collocations
          : (ctx?.collocations ?? []);
        if (colls.length === 0) return null;
        return (
        <div className="mt-4">
          <p className="ka text-[10px] uppercase tracking-wider text-[#4A4A4A] font-semibold">როგორ იყენებენ</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {colls.slice(0, 3).map((c) => (
              <span
                key={c.en}
                title={c.ka}
                className="text-[11px] px-2 py-1 rounded-lg bg-[#C9A84C]/15 border border-[#C9A84C]/35 text-[#5C1A2E] font-medium"
              >
                {c.en}
              </span>
            ))}
          </div>
        </div>
        );
      })()}

      <div className="mt-4">
        <div className="p-3 rounded-xl bg-[#F5F4F2] border border-[#E4E2DF]">
          <p className="text-sm text-[#5C1A2E]">"{word.exampleEn}"</p>
          <p className="ka text-xs text-[#4A4A4A] mt-1">{word.exampleKa}</p>
        </div>
        {(() => {
          // Second example: authored for all 980 words; context file is fallback.
          const ex2 = (word.example2En && word.example2En.trim())
            ? { en: word.example2En, ka: word.example2Ka }
            : (ctx?.examples[0] ?? null);
          if (!ex2) return null;
          return (
            <div className="mt-2 p-3 rounded-xl bg-[#F5F4F2] border border-[#E4E2DF]">
              <p className="text-sm text-[#5C1A2E]">"{ex2.en}"</p>
              <p className="ka text-xs text-[#4A4A4A] mt-1">{ex2.ka}</p>
            </div>
          );
        })()}

        <ReportWordButton word={word} />
      </div>
    </div>
  );
}

// ---- Content error reporting ---------------------------------------------
//
// Every content bug found so far was found by the founder using the app:
// "ვირუსული" for viral, "action item items", a silent MP3, AI phrases that
// bypassed review. Real users will find more and currently have no way to say
// so — they just trust the app less. This closes that loop.

const REPORT_REASONS: { key: string; label: string }[] = [
  { key: "translation", label: "თარგმანი არასწორია" },
  { key: "example", label: "მაგალითი უცნაურია ან არასწორი" },
  { key: "audio", label: "აუდიო არ მუშაობს ან არასწორია" },
  { key: "other", label: "სხვა" },
];

function ReportWordButton({ word }: { word: VocabWord }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Reset when the card changes to a different word.
  useEffect(() => {
    setOpen(false); setReason(null); setNote(""); setSent(false);
  }, [word.key]);

  const submit = async () => {
    if (!user || !reason || sending) return;
    setSending(true);
    try {
      // This file imports supabase dynamically elsewhere; match that pattern
      // rather than adding a top-level import for one call.
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.from("word_reports" as any).insert({
        user_id: user.id,
        word_key: word.key,
        word_en: word.en,
        word_ka: word.ka,
        reason,
        note: note.trim() || null,
      });
      if (error) throw error;
      setSent(true);
      setOpen(false);
    } catch {
      toast.error("გაგზავნა ვერ მოხერხდა — სცადე მოგვიანებით");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <p className="ka text-[11px] text-[#5A8A6A] mt-4">
        ✓ მადლობა — შევამოწმებთ.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="ka text-[11px] text-[#8A8A8A] hover:text-[#5C1A2E] mt-4 underline underline-offset-2"
      >
        რაღაც არასწორია?
      </button>
    );
  }

  return (
    <div className="mt-4 pt-3 border-t border-[#E4E2DF]">
      <p className="ka text-[11px] text-[#4A4A4A] font-semibold mb-2">რა არის არასწორი?</p>
      <div className="flex flex-wrap gap-1.5">
        {REPORT_REASONS.map((r) => (
          <button
            key={r.key}
            onClick={() => setReason(r.key)}
            className={`ka text-[11px] px-2.5 py-1.5 rounded-md border transition-colors ${
              reason === r.key
                ? "border-[#5C1A2E] bg-[#5C1A2E]/5 text-[#5C1A2E] font-semibold"
                : "border-[#E4E2DF] text-[#4A4A4A] hover:border-[#5C1A2E]/40"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      {reason && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={300}
          placeholder="დამატებითი დეტალი (არასავალდებულო)"
          className="ka mt-2 w-full px-3 py-2 rounded-md border border-[#E4E2DF] focus:border-[#5C1A2E] focus:outline-none text-[#1C1C1E] text-xs bg-white resize-none"
        />
      )}
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={submit}
          disabled={!reason || sending}
          className="ka px-3 py-1.5 rounded-md bg-[#5C1A2E] text-[#F8F5F0] text-[11px] font-semibold disabled:opacity-40"
        >
          {sending ? "იგზავნება..." : "გაგზავნა"}
        </button>
        <button
          onClick={() => { setOpen(false); setReason(null); setNote(""); }}
          className="ka text-[11px] text-[#8A8A8A]"
        >
          გაუქმება
        </button>
      </div>
    </div>
  );
}

// ---- Session-complete messages -------------------------------------------
// Rotated at random so the results screen doesn't read like a script. The jokes
// deliberately reuse vocabulary the app teaches (ROI, KPI, pipeline, backlog,
// pivot, runway...), so the payoff doubles as revision.
const MSG_EXCELLENT = [
  "ROI 100% — ყოჩაღ! 📈",
  "ეს კვარტალი მოგებით დახურე! 💰",
  "KPI გადააჭარბე — პრომოუშენი გეკუთვნის!",
  "შენი ლექსიკის აქციები მკვეთრად გაიზარდა 📈",
  "win-win — სხვა არაფერი ითქმის! 🤝",
  "Target-ს გადააჭარბე — bonus შენია! 💰",
  "ეს იყო perfect pitch — ინვესტორი დარწმუნებული გყავს 🎯",
  "Zero bugs, zero delays — ასე მუშაობენ პროფესიონალები!",
  "Promotion-ს იმსახურებ — HR-ს ვეტყვი 😉",
  "Board-ი ფეხზე დამდგარა 👏",
];
const MSG_GOOD = [
  "კარგი Deal დადე - ხელს გართმევ! 🤝",
  "სტაბილური ზრდაა — ინვესტორები კმაყოფილი იქნებოდნენ 📊",
  "მოლაპარაკება მოიგე, ოღონდ მცირე დათმობით 😉",
  "KPI შესრულებულია — ყოჩაღ!",
  "Budget-ში ჩაეტიე და deadline-იც დაიცავი ✅",
  "Solid quarter — ანალიტიკოსები კმაყოფილი არიან 📊",
  "Client-ი კმაყოფილია — follow-up აღარ დაგჭირდება 😉",
  "Meeting-ი ეფექტური იყო — 15 წუთით ადრე დასრულდა ⏱",
  "Review გაიარე — feedback: \"კარგია, გააგრძელე\" ✅",
];
const MSG_MID = [
  "ეს საპილოტე პროექტი იყო — ახლა მასშტაბირება მოდის 🚀",
  "მცირე დეფიციტია, მაგრამ ბიუჯეტი კონტროლშია 📉",
  "გამეორება საუკეთესო ინვესტიციაა — უკუგება გარანტირებულია",
  "ეს სიტყვები ჯერ pipeline-შია — მალე დაიხურება 😉",
  "შუალედური შედეგია — მომდევნო კვარტალი შენია 💪",
  "Draft-ია ჯერ — final version ხვალ მოვა 📝",
  "Beta ვერსიაა — bug-ები ჯერ კიდევ არის 🐞",
  "Break-even-ს მიუახლოვდი — კიდევ ცოტა 📈",
  "Feedback: \"აქვს პოტენციალი, სჭირდება მუშაობა\" 📋",
  "Sprint დაასრულე, მაგრამ ზოგი task backlog-ში დარჩა",
];
const MSG_LOW = [
  "რთული კვარტალი გამოდგა — ხვალ რესტრუქტურიზაცია 💪",
  "ესეც ტექნიკური ვალია — ხვალ დავფარავთ 😅",
  "ეს სიტყვები backlog-ში გადავიდა — ხვალ მოვაგვარებთ",
  "ყოველი წარუმატებელი პიჩი გამოცდილებაა — გააგრძელე!",
  "სტარტაპებიც ჯერ ცდებიან, მერე იზრდებიან 🚀",
  "Postmortem-ის დროა — გავარკვიოთ, რა არ გამოვიდა 🔍",
  "Deadline გაცდა, მაგრამ project ცოცხალია 💪",
  "Pivot გვჭირდება — ხვალ ახალი სტრატეგიით 🔄",
  "Cash flow უარყოფითია, მაგრამ runway ჯერ გვაქვს 😅",
  "Q1 რთული იყო — Q2-ზე ვმუშაობთ 📅",
];
const MSG_MEGA = [
  "შენ ხარ ამ კვარტლის MVP! 🏆",
  "top performer ხარ! ⚡",
  "Unicorn ხარ! 🦄",
  "Scale-up mode ჩართულია! 🚀",
];
const randomOf = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

// ---- Interrupted-session persistence -------------------------------------
// Leaving mid-session used to discard everything and rebuild a different
// session on return. We snapshot the in-flight session locally so it can be
// resumed exactly where it stopped. Local (not Supabase) on purpose: it needs
// to survive a tab close, not sync across devices, and costs no round trip.
const SESSION_KEY = "speakbusy:vocab-session";
const SESSION_VERSION = 2;          // bump when QuizQuestion shape changes
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type SavedSession = {
  v: number;
  userId: string;
  savedAt: string;
  quiz: QuizQuestion[];
  qIdx: number;
  answers: { wordKey: string; correct: boolean; production: boolean }[];
  newWords: VocabWord[];
  formatTier: 1 | 2 | 3;
  reviewMode: boolean;
  bestCombo: number;
};

function saveSessionSnapshot(s: SavedSession) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch { /* private mode / full */ }
}

function clearSessionSnapshot() {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

function loadSessionSnapshot(userId: string): SavedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as SavedSession;
    // Ignore snapshots from another account, an older question format, or a
    // stale day — resuming yesterday's half-session would be worse than a fresh one.
    if (s.v !== SESSION_VERSION || s.userId !== userId) return null;
    if (Date.now() - new Date(s.savedAt).getTime() > SESSION_MAX_AGE_MS) return null;
    if (!Array.isArray(s.quiz) || s.quiz.length === 0) return null;
    if (s.qIdx >= s.quiz.length) return null;   // was effectively finished
    return s;
  } catch {
    return null;
  }
}

// Typed answers: forgiving on case, extra spaces, and hyphen-vs-space
// ("Follow up" counts for "follow-up") — strict on actual spelling.
function normalizeTyped(s: string): string {
  return s.toLowerCase().trim().replace(/[-\s]+/g, " ");
}

function checkAnswer(q: QuizQuestion, selected: string | number): boolean {
  switch (q.type) {
    case "mc_meaning":
      return selected === q.correctKa;
    case "tr_en_to_ka":
      return selected === q.correct;
    case "tr_ka_to_en":
      return selected === q.correct;
    case "fill_blank":
      return selected === q.correct;
    case "true_false":
      return (selected === "true") === q.isCorrect;
    case "sentence_correct":
    case "georgian_mistake":
      return selected === q.correctIndex;
    case "listening":
      return selected === q.correctKa;
    case "type_word":
      return normalizeTyped(String(selected)) === normalizeTyped(q.correct);
    case "context_cloze":
      return selected === q.correct;
    case "odd_one_out":
      return selected === q.correctIndex;
    case "synonym_match":
      return selected === q.correct;
    case "collocation":
      return selected === q.correct;
    case "definition_match":
      return selected === q.correct;
    case "sentence_definition":
      return selected === q.correct;
  }
}

function QuestionCard({
  q,
  selected,
  revealed,
  setSelected,
}: {
  q: QuizQuestion;
  selected: string | number | null;
  revealed: boolean;
  setSelected: (v: string | number) => void;
}) {
  const renderChoices = (
    choices: (string | { label: string; value: string | number })[],
    correctValue: string | number,
  ) => (
    <div className="grid gap-2 mt-4">
      {choices.map((c, i) => {
        const value = typeof c === "string" ? c : c.value;
        const label = typeof c === "string" ? c : c.label;
        const isSelected = selected === value;
        const isCorrect = revealed && value === correctValue;
        const isWrongPick = revealed && isSelected && !isCorrect;
        const showBurst = isCorrect && isSelected;
        return (
          <button
            key={i}
            disabled={revealed}
            onClick={() => setSelected(value)}
            className={`relative overflow-visible text-left px-4 py-3 rounded-xl border text-sm transition-all
              ${isCorrect ? "border-emerald-500 bg-emerald-50 text-emerald-900 biz-bounce" : ""}
              ${isWrongPick ? "border-red-400 bg-red-50 text-red-900 biz-shake" : ""}
              ${!revealed && isSelected ? "border-[#5C1A2E] bg-[#F5F4F2] text-[#5C1A2E]" : ""}
              ${!revealed && !isSelected ? "border-[#E4E2DF] bg-white text-[#5C1A2E] hover:bg-[#F5F4F2]" : ""}
              ${revealed && !isCorrect && !isWrongPick ? "border-[#E4E2DF] bg-white text-[#4A4A4A] opacity-60" : ""}
            `}
          >
            <span className={typeof label === "string" && label.match(/[ა-ჰ]/) ? "ka" : ""}>{label}</span>
            {showBurst && <ParticleBurst />}
          </button>
        );
      })}
    </div>
  );

  switch (q.type) {
    case "mc_meaning":
      return (
        <div className="bg-white border border-[#E4E2DF] rounded-3xl p-6 shadow-sm animate-[bizFade_.3s_ease-out_both]">
          <p className="ka text-xs text-[#4A4A4A] uppercase tracking-wider font-semibold">აირჩიე სწორი თარგმანი</p>
          <div className="mt-3 flex items-center gap-2">
            <h3 className="text-2xl font-bold text-[#5C1A2E]">{q.en}</h3>
            <ReadAloudButton text={q.en} storageKey={q.wordKey} size="sm" />
          </div>
          {renderChoices(q.choices, q.correctKa)}
        </div>
      );
    case "tr_en_to_ka":
      return (
        <div className="bg-white border border-[#E4E2DF] rounded-3xl p-6 shadow-sm animate-[bizFade_.3s_ease-out_both]">
          <p className="ka text-xs text-[#4A4A4A] uppercase tracking-wider font-semibold">English → ქართული</p>
          <h3 className="text-2xl font-bold text-[#5C1A2E] mt-3">{q.en}</h3>
          {renderChoices(q.choices, q.correct)}
        </div>
      );
    case "tr_ka_to_en":
      return (
        <div className="bg-white border border-[#E4E2DF] rounded-3xl p-6 shadow-sm animate-[bizFade_.3s_ease-out_both]">
          <p className="ka text-xs text-[#4A4A4A] uppercase tracking-wider font-semibold">ქართული → English</p>
          <h3 className="ka text-2xl font-bold text-[#5C1A2E] mt-3">{q.ka}</h3>
          {renderChoices(q.choices, q.correct)}
        </div>
      );
    case "fill_blank":
      return (
        <div className="bg-white border border-[#E4E2DF] rounded-3xl p-6 shadow-sm animate-[bizFade_.3s_ease-out_both]">
          <p className="ka text-xs text-[#4A4A4A] uppercase tracking-wider font-semibold">შეავსე ცარიელი ადგილი</p>
          <p className="text-lg text-[#5C1A2E] mt-3 leading-relaxed">{q.sentence}</p>
          <p className="ka text-xs text-[#4A4A4A] mt-1">{q.ka}</p>
          {renderChoices(q.choices, q.correct)}
        </div>
      );
    case "true_false":
      return (
        <div className="bg-white border border-[#E4E2DF] rounded-3xl p-6 shadow-sm animate-[bizFade_.3s_ease-out_both]">
          <p className="ka text-xs text-[#4A4A4A] uppercase tracking-wider font-semibold">სწორი თუ არასწორი თარგმანი?</p>
          <div className="mt-3 p-4 rounded-xl bg-[#F5F4F2] border border-[#E4E2DF]">
            <p className="text-xl font-bold text-[#5C1A2E]">{q.en}</p>
            <p className="ka text-base text-[#4A4A4A] mt-1">= {q.ka}</p>
          </div>
          {renderChoices(
            [
              { label: "სწორი", value: "true" },
              { label: "არასწორი", value: "false" },
            ],
            q.isCorrect ? "true" : "false",
          )}
        </div>
      );
    case "sentence_correct":
      return (
        <div className="bg-white border border-[#E4E2DF] rounded-3xl p-6 shadow-sm animate-[bizFade_.3s_ease-out_both]">
          <p className="ka text-sm text-[#5C1A2E]">{q.promptKa}</p>
          {renderChoices(
            q.choices.map((c, i) => ({ label: c, value: i })),
            q.correctIndex,
          )}
        </div>
      );
    case "georgian_mistake":
      return (
        <div className="bg-white border border-[#E4E2DF] rounded-3xl p-6 shadow-sm animate-[bizFade_.3s_ease-out_both]">
          <p className="ka text-[11px] uppercase tracking-wider text-[#1C1C1E] font-semibold">გავრცელებული შეცდომა</p>
          <p className="ka text-sm text-[#5C1A2E] mt-2">{q.promptKa}</p>
          {renderChoices(
            q.choices.map((c, i) => ({ label: c, value: i })),
            q.correctIndex,
          )}
          {revealed && (
            <p className="ka text-xs text-[#4A4A4A] mt-3 italic">💡 {q.explanationKa}</p>
          )}
        </div>
      );
    case "odd_one_out":
      return (
        <div className="bg-white border border-[#E4E2DF] rounded-3xl p-6 shadow-sm animate-[bizFade_.3s_ease-out_both]">
          <p className="ka text-xs text-[#4A4A4A] uppercase tracking-wider font-semibold">{q.promptKa}</p>
          {renderChoices(
            q.options.map((o, i) => ({ label: `${o.en} — ${o.ka}`, value: i })),
            q.correctIndex,
          )}
        </div>
      );
    case "synonym_match":
      return (
        <div className="bg-white border border-[#E4E2DF] rounded-3xl p-6 shadow-sm animate-[bizFade_.3s_ease-out_both]">
          <p className="ka text-xs text-[#4A4A4A] uppercase tracking-wider font-semibold">{q.promptKa}</p>
          <h3 className="ka text-2xl font-bold text-[#5C1A2E] mt-3">{q.ka}</h3>
          {renderChoices(q.choices, q.correct)}
        </div>
      );
    case "sentence_definition":
      return (
        <div className="bg-white border border-[#E4E2DF] rounded-3xl p-6 shadow-sm animate-[bizFade_.3s_ease-out_both]">
          <p className="ka text-xs text-[#4A4A4A] uppercase tracking-wider font-semibold">{q.promptKa}</p>
          <p className="text-lg text-[#1C1C1E] mt-3 leading-relaxed">
            {q.before}
            <span className="font-bold text-[#5C1A2E] underline decoration-[#C9A84C] decoration-2 underline-offset-4">
              {q.target}
            </span>
            {q.after}
          </p>
          {renderChoices(q.choices, q.correct)}
        </div>
      );
    case "definition_match":
      return (
        <div className="bg-white border border-[#E4E2DF] rounded-3xl p-6 shadow-sm animate-[bizFade_.3s_ease-out_both]">
          <p className="ka text-xs text-[#4A4A4A] uppercase tracking-wider font-semibold">{q.promptKa}</p>
          <p className="ka text-base text-[#1C1C1E] mt-3 leading-relaxed">{q.definitionKa}</p>
          {renderChoices(q.choices, q.correct)}
        </div>
      );
    case "collocation":
      return (
        <div className="bg-white border border-[#E4E2DF] rounded-3xl p-6 shadow-sm animate-[bizFade_.3s_ease-out_both]">
          <p className="ka text-xs text-[#4A4A4A] uppercase tracking-wider font-semibold">{q.promptKa}</p>
          <p className="text-2xl font-bold text-[#5C1A2E] mt-3 tracking-tight">{q.phraseEn}</p>
          <p className="ka text-xs text-[#4A4A4A] mt-1">{q.hintKa}</p>
          {renderChoices(q.choices, q.correct)}
        </div>
      );
    case "listening":
      return (
        <div className="bg-white border border-[#E4E2DF] rounded-3xl p-6 shadow-sm animate-[bizFade_.3s_ease-out_both]">
          <p className="ka text-xs text-[#4A4A4A] uppercase tracking-wider font-semibold">მოისმინე და აირჩიე მნიშვნელობა</p>
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="p-5 rounded-full bg-[#F5F4F2] border border-[#E4E2DF]">
              <ReadAloudButton text={q.en} storageKey={q.wordKey} size="md" />
            </div>
            {revealed ? (
              /* Reveal the written word after answering — closes the loop
                 between what they heard and how it's spelled. */
              <p className="text-xl font-bold text-[#5C1A2E] animate-[bizFade_.3s_ease-out_both]">
                {q.en}
              </p>
            ) : (
              <p className="ka text-[11px] text-[#4A4A4A]">დააჭირე მოსასმენად 🔊</p>
            )}
          </div>
          {renderChoices(q.choices, q.correctKa)}
        </div>
      );
    case "type_word":
      return <TypeWordCard q={q} revealed={revealed} submit={(v) => setSelected(v)} />;
    case "context_cloze":
      return (
        <div className="bg-white border border-[#E4E2DF] rounded-3xl p-6 shadow-sm animate-[bizFade_.3s_ease-out_both]">
          <p className="ka text-xs text-[#4A4A4A] uppercase tracking-wider font-semibold">შეავსე ცარიელი ადგილი სიტუაციაში</p>
          <span className="ka inline-block mt-2 text-[11px] text-[#5C1A2E] bg-[#C9A84C]/20 border border-[#C9A84C]/35 px-2 py-0.5 rounded-md font-semibold">
            {q.titleKa}
          </span>
          <div className="mt-3 p-4 rounded-xl bg-[#F5F4F2] border border-[#E4E2DF]">
            <p className="text-sm text-[#5C1A2E] leading-relaxed">{q.paragraph}</p>
          </div>
          {renderChoices(q.choices, q.correct)}
        </div>
      );
  }
}

function TypeWordCard({
  q,
  revealed,
  submit,
}: {
  q: Extract<QuizQuestion, { type: "type_word" }>;
  revealed: boolean;
  submit: (v: string) => void;
}) {
  const [text, setText] = useState("");
  const isCorrect = revealed && normalizeTyped(text) === normalizeTyped(q.correct);

  const trySubmit = () => {
    if (revealed || !text.trim()) return;
    submit(text);
  };

  return (
    <div className="bg-white border border-[#E4E2DF] rounded-3xl p-6 shadow-sm animate-[bizFade_.3s_ease-out_both]">
      <p className="ka text-xs text-[#4A4A4A] uppercase tracking-wider font-semibold">დაწერე სიტყვა ინგლისურად</p>
      <h3 className="ka text-2xl font-bold text-[#5C1A2E] mt-3">{q.ka}</h3>
      <p className="text-lg font-mono tracking-[0.25em] text-[#4A4A4A] mt-2">{q.hint}</p>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={text}
          disabled={revealed}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") trySubmit(); }}
          placeholder="ჩაწერე აქ..."
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          className={`ka flex-1 min-w-0 px-4 py-3 rounded-xl border text-base outline-none transition-colors
            ${revealed && isCorrect ? "border-emerald-500 bg-emerald-50 text-emerald-900" : ""}
            ${revealed && !isCorrect ? "border-red-400 bg-red-50 text-red-900" : ""}
            ${!revealed ? "border-[#E4E2DF] bg-white text-[#1C1C1E] focus:border-[#5C1A2E]" : ""}
          `}
        />
        {!revealed && (
          <button
            onClick={trySubmit}
            disabled={!text.trim()}
            className="ka px-4 py-3 rounded-xl bg-[#232323] text-[#F5F4F2] text-sm font-bold disabled:opacity-40 transition-opacity"
          >
            შემოწმება
          </button>
        )}
      </div>

      {revealed && (
        <div className={`mt-3 p-3 rounded-xl border animate-[bizFade_.3s_ease-out_both] ${isCorrect ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
          {isCorrect ? (
            <p className="ka text-sm text-emerald-800 font-semibold">სწორია! ✓ {q.correct}</p>
          ) : (
            <p className="ka text-sm text-red-800">სწორი პასუხი: <span className="font-bold">{q.correct}</span></p>
          )}
        </div>
      )}
    </div>
  );
}

function Results({
  answers,
  newWords,
  reviewCount,
  totalVocab,
  streakCelebration,
  canPracticeMore,
  onPracticeMore,
  isPaid,
  sessionDelta,
}: {
  sessionDelta: number | null;
  answers: { wordKey: string; correct: boolean }[];
  newWords: VocabWord[];
  reviewCount: number;
  totalVocab: number;
  streakCelebration: { from: number; to: number } | null;
  canPracticeMore: boolean;
  onPracticeMore: () => void;
  isPaid: boolean;
}) {
  const total = answers.length;
  const correct = answers.filter((a) => a.correct).length;
  const pct = total ? Math.round((correct / total) * 100) : 0;

  const perWord = new Map<string, { c: number; w: number }>();
  answers.forEach((a) => {
    const cur = perWord.get(a.wordKey) || { c: 0, w: 0 };
    if (a.correct) cur.c++;
    else cur.w++;
    perWord.set(a.wordKey, cur);
  });

  const mastered = newWords.filter((w) => {
    const s = perWord.get(w.key);
    return s && s.c > s.w;
  });
  const needsReview = newWords.filter((w) => {
    const s = perWord.get(w.key);
    return s && s.w >= s.c;
  });

  const learnedToday = mastered.length;
  const addedToReview = needsReview.length + reviewCount;

  // useMemo keeps the line stable while the score counters animate; without it
  // every re-render would draw a different message.
  const message = useMemo(
    () => randomOf(pct >= 90 ? MSG_EXCELLENT : pct >= 70 ? MSG_GOOD : pct >= 50 ? MSG_MID : MSG_LOW),
    [pct],
  );

  const streakGrew = !!streakCelebration && streakCelebration.to > streakCelebration.from;

  return (
    <div className="space-y-4 animate-[bizFade_.4s_ease-out_both]">
      {streakCelebration && streakCelebration.to > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1C1C1E] via-[#5C1A2E] to-[#C9A84C] text-[#F5F4F2] p-4 text-center shadow-lg animate-[bizFade_.5s_ease-out_both]">
          <div className="relative flex items-center justify-center gap-3">
            <span className={`text-4xl ${streakGrew ? "biz-flame" : ""}`}>🔥</span>
            <div className="text-left">
              <p className="text-3xl font-bold leading-none tabular-nums">
                <StreakTick from={streakCelebration.from} to={streakCelebration.to} />
                <span className="ka text-sm font-semibold ml-1.5">დღე ზედიზედ</span>
              </p>
              <p className="ka text-[11px] text-[#F5F4F2]/80 mt-1">
                {streakGrew ? "\"Streak\" გაიზარდა — ასე განაგრძე! 💪" : "\"Streak\" შენარჩუნებულია — ხვალაც შემოიარე 🔥"}
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#232323] to-[#161616] text-[#F5F4F2] p-6 text-center">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#1C1C1E]/15 blur-2xl pointer-events-none" />
        <div className="relative">
          <p className="ka text-[11px] uppercase tracking-wider text-[#E5D4A8] font-semibold">დღევანდელი შედეგი</p>
          <p className="text-6xl font-bold mt-2 tabular-nums"><CountUp to={pct} duration={1200} />%</p>
          <p className="ka text-sm text-[#F5F4F2]/80 mt-2"><CountUp to={correct} duration={1200} /> / {total} სწორი პასუხი</p>
          <p className="ka text-sm text-[#E5D4A8] mt-3 font-semibold">{message}</p>

          {/* Progress gained this session. The absolute percentage moves slowly
              across 980 words; the delta is what makes the session feel like it
              counted. Only shown when it is actually positive. */}
          {sessionDelta !== null && sessionDelta > 0 && (
            <p className="ka text-[13px] text-[#C9A84C] mt-2 font-bold">
              +{sessionDelta}% ლექსიკის პროგრესი
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <SummaryStat label="ნასწავლი" value={learnedToday} />
        <SummaryStat label="გასამეორებელი" value={addedToReview} />
        <SummaryStat label="სულ ლექსიკაში" value={totalVocab} />
      </div>

      {mastered.length > 0 && (
        <BizCard>
          <p className="ka text-[11px] uppercase tracking-wider text-emerald-700 font-semibold">
            დაძლეული სიტყვები
          </p>
          <ul className="mt-2 space-y-1.5">
            {mastered.map((w) => (
              <li key={w.key} className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-[#5C1A2E]">{w.en}</span>
                <span className="ka text-xs text-[#4A4A4A]">{w.ka}</span>
              </li>
            ))}
          </ul>
        </BizCard>
      )}

      {needsReview.length > 0 && (
        <BizCard>
          <p className="ka text-[11px] uppercase tracking-wider text-amber-700 font-semibold">
            გასამეორებელი სიტყვები
          </p>
          <ul className="mt-2 space-y-1.5">
            {needsReview.map((w) => (
              <li key={w.key} className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-[#5C1A2E]">{w.en}</span>
                <span className="ka text-xs text-[#4A4A4A]">{w.ka}</span>
              </li>
            ))}
          </ul>
        </BizCard>
      )}

      <div className="space-y-2 pt-2">
        {canPracticeMore ? (
          <BizButton className="w-full" onClick={onPracticeMore}>
            დღეს კიდევ ვივარჯიშოთ →
          </BizButton>
        ) : (
          <div className="text-center space-y-1.5">
            <p className="ka text-xs text-[#4A4A4A]">
              დღევანდელი ვარჯიში დასრულებულია — ხვალ ახალი სესია გელოდება 🔥
            </p>
            {!isPaid && (
              <Link to="/path/business/premium" className="ka block text-xs font-semibold text-[#5C1A2E] underline underline-offset-4">
                ⭐ პრემიუმით მეორე სესია ახლავე — ულიმიტოდ
              </Link>
            )}
          </div>
        )}
        <Link to="/path/business/home" className="block">
          <BizButton variant="outline" className="w-full">
            დაშბორდზე დაბრუნება
          </BizButton>
        </Link>
        <Link to="/path/business/lexicon?tab=words" className="block">
          <p className="ka text-center text-xs text-[#5C1A2E] underline underline-offset-2 mt-2 inline-flex items-center gap-1 justify-center w-full">
            <BookOpen size={13} strokeWidth={2.25} /> ჩემი რვეულის ნახვა
          </p>
        </Link>
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-[#E4E2DF] rounded-xl p-3 text-center">
      <p className="text-xl font-bold text-[#5C1A2E]">{value}</p>
      <p className="ka text-[10px] text-[#4A4A4A] uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}

function Confetti({ seed }: { seed: number }): JSX.Element {
  const pieces = useMemo(() => {
    const colors = ["#1C1C1E", "#5C1A2E", "#C9A84C", "#5A8A6A", "#C0392B", "#E5D4A8"];
    return Array.from({ length: 36 }).map((_, i) => ({
      id: `${seed}-${i}`,
      left: Math.random() * 100,
      delay: Math.random() * 250,
      duration: 1400 + Math.random() * 900,
      color: colors[i % colors.length],
      size: 6 + Math.round(Math.random() * 6),
      rot: Math.round(Math.random() * 360),
    }));
  }, [seed]);
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
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

function ParticleBurst(): JSX.Element {
  const particles = useMemo(() => {
    const colors = ["#5A8A6A", "#7AA88A", "#1C1C1E", "#C9A84C", "#E5D4A8"];
    return Array.from({ length: 10 }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.3;
      const dist = 32 + Math.random() * 24;
      return {
        id: i,
        bx: Math.cos(angle) * dist,
        by: Math.sin(angle) * dist,
        color: colors[i % colors.length],
        delay: Math.random() * 60,
      };
    });
  }, []);
  return (
    <span className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
      {particles.map((p) => (
        <span
          key={p.id}
          className="biz-particle"
          style={{
            background: p.color,
            ["--bx" as never]: `${p.bx}px`,
            ["--by" as never]: `${p.by}px`,
            animationDelay: `${p.delay}ms`,
          }}
        />
      ))}
    </span>
  );
}

function CountUp({ to, duration = 1000 }: { to: number; duration?: number }): JSX.Element {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{val}</>;
}

// Holds on the previous streak for a beat, then flips up to the new number —
// the little "+1" moment that makes finishing a session feel earned.
function StreakTick({ from, to }: { from: number; to: number }): JSX.Element {
  const [val, setVal] = useState(from);
  const [bump, setBump] = useState(false);
  useEffect(() => {
    if (to <= from) {
      setVal(to);
      return;
    }
    const t = window.setTimeout(() => {
      setVal(to);
      setBump(true);
      window.setTimeout(() => setBump(false), 450);
    }, 650);
    return () => window.clearTimeout(t);
  }, [from, to]);
  return (
    <span
      className="inline-block"
      style={bump ? { animation: "bizStreakBump 450ms ease-out", display: "inline-block" } : undefined}
    >
      {val}
      <style>{`@keyframes bizStreakBump {
        0% { transform: scale(1); }
        40% { transform: scale(1.5); color: #C9A84C; }
        100% { transform: scale(1); }
      }`}</style>
    </span>
  );
}

