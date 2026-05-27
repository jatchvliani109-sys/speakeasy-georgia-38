import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";
import { BusinessState, FIELD_LABELS, PRIORITY_LABELS, pullBusinessFromSupabase } from "./lib/state";
import { presentationStep, type CurriculumStep } from "./lib/curriculum";

type VocabItem = { en: string; ka: string; pronounceKa: string };
type Slide = {
  titleEn: string;
  titleKa: string;
  bullets: string[];
  bulletsKa: string[];
  keySentenceEn: string;
  keywords: string[];
  vocabulary: VocabItem[];
};
type AudienceQ = { questionEn: string; unexpected?: boolean };

type SessionData = {
  scenarioKey: string;
  presentationTitleEn: string;
  presentationTitleKa: string;
  audienceEn: string;
  audienceKa: string;
  difficultyKa: string;
  estimatedMinutes: number;
  skillsTrainedKa: string[];
  whyMattersEn: string;
  whyMattersKa: string;
  slides: Slide[];
  audienceQuestions: AudienceQ[];
  tomorrowTeaseKa: string;
};

type Verdict = { verdict: "strong" | "average" | "weak"; headlineKa: string; summaryKa: string };

type Debrief = {
  summaryKa: string;
  wentWell: { momentKa: string; phraseEn: string; whyKa: string }[];
  needsImprovement: { momentKa: string; phraseEn: string; whyKa: string }[];
  keyPhrases: { en: string; ka: string; whenKa: string }[];
  practiceNextKa: string;
  vocabulary: { en: string; ka: string; exampleEn: string; exampleKa: string }[];
};

type Step =
  | "loading"
  | "overview"
  | "intro"
  | "stage1"   // slide-by-slide teaching
  | "stage2"   // keywords-only
  | "stage3"   // free presentation
  | "qa"
  | "evaluating"
  | "verdict"
  | "debrief"
  | "done";

export default function PresentationsModule() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("loading");
  const [biz, setBiz] = useState<BusinessState | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ total: number }>({ total: 0 });
  const [curriculum, setCurriculum] = useState<CurriculumStep | null>(null);

  // Stage 1 (per-slide) state
  const [slideIdx, setSlideIdx] = useState(0);
  const [explanation, setExplanation] = useState<{ english: string; georgian: string; tip: string } | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [practiceText, setPracticeText] = useState("");
  const [practiceFeedback, setPracticeFeedback] = useState<{
    rating: "great" | "good" | "needs_work";
    encouragementKa: string;
    improvedEn: string;
    praiseKa: string;
  } | null>(null);
  const [practiceLoading, setPracticeLoading] = useState(false);

  // Stage 2 keywords
  const [stage2Idx, setStage2Idx] = useState(0);
  const [stage2Text, setStage2Text] = useState("");
  const [stage2Notes, setStage2Notes] = useState<string[]>([]);

  // Stage 3 full
  const [stage3Text, setStage3Text] = useState("");

  // Q&A
  const [qIdx, setQIdx] = useState(0);
  const [currentQ, setCurrentQ] = useState<string>("");
  const [qLoading, setQLoading] = useState(false);
  const [qaAnswer, setQaAnswer] = useState("");
  const [qaLog, setQaLog] = useState<{ q: string; a: string }[]>([]);

  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [debrief, setDebrief] = useState<Debrief | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  const intensity = biz?.plan?.intensity || biz?.intensity || "standard";
  const skipStage2 = intensity === "light";
  const extendedQA = intensity === "intensive" || intensity === "deadline";

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const cur = await pullBusinessFromSupabase(user.id);
        if (cancelled) return;
        setBiz(cur);

        const { data: recent } = await supabase
          .from("business_presentation_sessions")
          .select("presentation_topic, scenario_key, completed")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);

        const completed = (recent || []).filter((r: any) => r.completed);
        setStats({ total: completed.length });
        const recentScenarios = (recent || []).slice(0, 12).map((r: any) => r.presentation_topic);
        const curStep = presentationStep(completed.length);
        setCurriculum(curStep);

        const p = cur.plan;
        const { data, error } = await supabase.functions.invoke("business-presentations", {
          body: {
            action: "session",
            level: p?.level || cur.level || "business_intermediate",
            intensity: p?.intensity || cur.intensity || "standard",
            fields: (p?.fields || cur.field || []).map(
              (f) => FIELD_LABELS[f as keyof typeof FIELD_LABELS] || String(f),
            ),
            goals: (p?.mainGoals || cur.mainPriority || []).map(
              (g) => PRIORITY_LABELS[g as keyof typeof PRIORITY_LABELS] || String(g),
            ),
            recentScenarios,
            curriculumTopicKey: curStep.key,
            curriculumTopicTitleKa: curStep.titleKa,
            curriculumGuidance: curStep.guidanceEn,
            curriculumStep: curStep.step,
            curriculumTotal: curStep.total,
            curriculumCycle: curStep.cycle,
          },
        });
        if (cancelled) return;
        if (error) throw error;
        const s = data as SessionData;
        if (!s?.slides?.length) throw new Error("Invalid session");
        setSession(s);

        const { data: inserted } = await supabase
          .from("business_presentation_sessions")
          .insert({
            user_id: user.id,
            presentation_topic: s.presentationTitleEn,
            scenario_key: s.scenarioKey,
            session_data: s as any,
            completed: false,
          })
          .select("id")
          .single();
        if (!cancelled && inserted) setSessionId(inserted.id);
        setStep("overview");
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "სესიის ჩატვირთვა ვერ მოხერხდა.");
          setStep("overview");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function getExplanation() {
    if (!session) return;
    setExplainLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("business-presentations", {
        body: {
          action: "explain",
          level: biz?.plan?.level || biz?.level || "business_intermediate",
          slide: session.slides[slideIdx],
        },
      });
      if (error) throw error;
      setExplanation(data as any);
    } catch (e: any) {
      setError(e?.message || "ვერ მოვიდა ახსნა.");
    } finally {
      setExplainLoading(false);
    }
  }

  async function submitPractice() {
    if (!session || !practiceText.trim()) return;
    setPracticeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("business-presentations", {
        body: {
          action: "practiceFeedback",
          slide: session.slides[slideIdx],
          userText: practiceText,
        },
      });
      if (error) throw error;
      setPracticeFeedback(data as any);
    } catch (e: any) {
      setError(e?.message || "ვერ მოვიდა უკუკავშირი.");
    } finally {
      setPracticeLoading(false);
    }
  }

  function nextSlide() {
    if (!session) return;
    setExplanation(null);
    setPracticeText("");
    setPracticeFeedback(null);
    if (slideIdx + 1 < session.slides.length) {
      setSlideIdx((i) => i + 1);
    } else {
      // Stage 1 done → stage 2 (or skip to stage 3 if light)
      setSlideIdx(0);
      if (skipStage2) {
        setStep("stage3");
      } else {
        setStage2Idx(0);
        setStage2Text("");
        setStep("stage2");
      }
    }
  }

  function submitStage2() {
    if (!session) return;
    setStage2Notes((n) => [...n, stage2Text]);
    setStage2Text("");
    if (stage2Idx + 1 < session.slides.length) {
      setStage2Idx((i) => i + 1);
    } else {
      setStep("stage3");
    }
  }

  async function startQA() {
    if (!session) return;
    setQIdx(0);
    setQaLog([]);
    setStep("qa");
    await fetchQ(0);
  }

  async function fetchQ(index: number) {
    if (!session) return;
    setQLoading(true);
    setQaAnswer("");
    try {
      const total = extendedQA ? (session.audienceQuestions?.length || 3) + 1 : session.audienceQuestions?.length || 3;
      const isLast = index >= total - 1;
      const { data, error } = await supabase.functions.invoke("business-presentations", {
        body: {
          action: "audienceQuestion",
          presentationTitleEn: session.presentationTitleEn,
          audienceEn: session.audienceEn,
          curriculumGuidance: curriculum?.guidanceEn,
          userText: stage3Text,
          questionIndex: index + 1,
          unexpected: isLast,
        },
      });
      if (error) throw error;
      setCurrentQ((data as any).questionEn || session.audienceQuestions[index]?.questionEn || "");
    } catch (e: any) {
      setCurrentQ(session.audienceQuestions[index]?.questionEn || "Could you tell us more about your main point?");
    } finally {
      setQLoading(false);
    }
  }

  async function submitAnswer() {
    if (!qaAnswer.trim()) return;
    const log = [...qaLog, { q: currentQ, a: qaAnswer }];
    setQaLog(log);
    const total = extendedQA ? (session?.audienceQuestions?.length || 3) + 1 : session?.audienceQuestions?.length || 3;
    if (qIdx + 1 < total) {
      setQIdx((i) => i + 1);
      await fetchQ(qIdx + 1);
    } else {
      await evaluate(log);
    }
  }

  async function evaluate(log: { q: string; a: string }[]) {
    if (!session) return;
    setStep("evaluating");
    try {
      const { data, error } = await supabase.functions.invoke("business-presentations", {
        body: {
          action: "evaluate",
          level: biz?.plan?.level || biz?.level || "business_intermediate",
          presentationTitleEn: session.presentationTitleEn,
          stage3Text,
          qa: log,
        },
      });
      if (error) throw error;
      setVerdict(data as Verdict);
      setStep("verdict");
    } catch (e: any) {
      setError(e?.message || "შეფასება ვერ მოვიდა.");
      setStep("stage3");
    }
  }

  async function loadDebrief() {
    if (!session || !verdict) return;
    try {
      const { data, error } = await supabase.functions.invoke("business-presentations", {
        body: {
          action: "debrief",
          level: biz?.plan?.level || biz?.level || "business_intermediate",
          presentationTitleEn: session.presentationTitleEn,
          stage3Text,
          qa: qaLog,
          verdict: verdict.verdict,
        },
      });
      if (error) throw error;
      setDebrief(data as Debrief);
      setStep("debrief");
    } catch (e: any) {
      setError(e?.message || "Debrief ვერ მოვიდა.");
    }
  }

  async function savePhrasesToVocab(d: Debrief, s: SessionData): Promise<number> {
    if (!user) return 0;
    const slideVocab = s.slides.flatMap((sl) =>
      (sl.vocabulary || []).map((v) => ({
        user_id: user.id,
        english_word: v.en,
        georgian_meaning: v.ka,
        example_sentence: sl.keySentenceEn || "",
        difficulty: "business",
        status: "new" as const,
      })),
    );
    const debriefVocab = (d.vocabulary || []).map((v) => ({
      user_id: user.id,
      english_word: v.en,
      georgian_meaning: v.ka,
      example_sentence: v.exampleEn,
      difficulty: "business",
      status: "new" as const,
    }));
    const rows = [...slideVocab, ...debriefVocab];
    if (!rows.length) return 0;
    const { error } = await supabase.from("vocabulary").insert(rows);
    if (error) return 0;
    return rows.length;
  }

  async function completeSession() {
    if (!debrief || !session) return;
    const saved = await savePhrasesToVocab(debrief, session);
    setSavedCount(saved);
    if (sessionId) {
      // Build a combined vocabulary list (slide vocab + debrief vocab) that
      // the dictionary surface can render under this session.
      const combinedVocab = [
        ...session.slides.flatMap((sl) =>
          (sl.vocabulary || []).map((v) => ({
            en: v.en,
            ka: v.ka,
            exampleEn: sl.keySentenceEn || "",
            exampleKa: sl.titleKa || "",
          })),
        ),
        ...(debrief.vocabulary || []),
      ];
      const enriched = {
        ...session,
        vocabulary: combinedVocab,
        verdict: verdict?.verdict,
        headlineKa: verdict?.headlineKa,
      };
      await supabase
        .from("business_presentation_sessions")
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          transcript: [
            ...stage2Notes.map((t, i) => ({ role: "user", stage: "stage2", slide: i, text: t })),
            { role: "user", stage: "stage3", text: stage3Text },
            ...qaLog.map((q) => ({ role: "user", stage: "qa", q: q.q, text: q.a })),
          ] as any,
          result: verdict?.verdict || null,
          debrief: debrief as any,
          session_data: enriched as any,
        })
        .eq("id", sessionId);
    }
    setStep("done");
  }

  if (step === "loading" || !session) {
    return (
      <BusinessShell back={{ to: "/path/business/home", label: "ბიზნეს ინგლისური" }}>
        <BizCard>
          <p className="ka text-[#5B6473]">პრეზენტაცია მზადდება შენი პროფილისთვის...</p>
          <div className="mt-3 h-2 w-full bg-[#E7E2D5] rounded-full overflow-hidden">
            <div className="h-full bg-[#1E2A44] animate-[loadbar_1.6s_ease-in-out_infinite]" style={{ width: "40%" }} />
          </div>
          {error && <p className="ka text-xs text-[#B91C1C] mt-3">{error}</p>}
        </BizCard>
        <style>{`@keyframes loadbar { 0%{transform:translateX(-100%)} 100%{transform:translateX(250%)} }`}</style>
      </BusinessShell>
    );
  }

  const stages: Step[] = skipStage2
    ? ["overview", "intro", "stage1", "stage3", "qa", "verdict", "debrief"]
    : ["overview", "intro", "stage1", "stage2", "stage3", "qa", "verdict", "debrief"];

  return (
    <BusinessShell back={{ to: "/path/business/home", label: "ბიზნეს ინგლისური" }}>
      {step !== "done" && (
        <Header step={step} stages={stages} curriculum={curriculum} session={session} slideIdx={slideIdx} stage2Idx={stage2Idx} />
      )}

      {step === "overview" && (
        <OverviewCard
          session={session}
          curriculum={curriculum}
          onStart={() => setStep("intro")}
        />
      )}

      {step === "intro" && (
        <BizCard className="border-l-4 border-l-[#1E2A44]">
          <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">
            შესავალი
          </p>
          <h2 className="ka text-xl font-bold text-[#1E2A44] mt-2 leading-snug">
            {session.presentationTitleKa}
          </h2>
          <div className="mt-4 p-4 rounded-xl bg-[#FAF7F0] border border-[#E7E2D5]">
            <p className="text-sm text-[#1E2A44] leading-relaxed italic">"{session.whyMattersEn}"</p>
            <p className="ka text-xs text-[#5B6473] mt-2 leading-relaxed">{session.whyMattersKa}</p>
          </div>
          <div className="mt-5 flex justify-end">
            <BizButton onClick={() => { setSlideIdx(0); setStep("stage1"); }}>
              დავიწყოთ პრეზენტაცია →
            </BizButton>
          </div>
        </BizCard>
      )}

      {step === "stage1" && (
        <Stage1
          slide={session.slides[slideIdx]}
          slideIdx={slideIdx}
          total={session.slides.length}
          explanation={explanation}
          explainLoading={explainLoading}
          onExplain={getExplanation}
          practiceText={practiceText}
          setPracticeText={setPracticeText}
          onSubmitPractice={submitPractice}
          practiceLoading={practiceLoading}
          practiceFeedback={practiceFeedback}
          onNext={nextSlide}
        />
      )}

      {step === "stage2" && (
        <Stage2
          slide={session.slides[stage2Idx]}
          slideIdx={stage2Idx}
          total={session.slides.length}
          text={stage2Text}
          setText={setStage2Text}
          onSubmit={submitStage2}
        />
      )}

      {step === "stage3" && (
        <Stage3
          session={session}
          text={stage3Text}
          setText={setStage3Text}
          onSubmit={startQA}
        />
      )}

      {step === "qa" && (
        <QAStep
          session={session}
          qIdx={qIdx}
          total={extendedQA ? (session.audienceQuestions?.length || 3) + 1 : session.audienceQuestions?.length || 3}
          currentQ={currentQ}
          loading={qLoading}
          answer={qaAnswer}
          setAnswer={setQaAnswer}
          onSubmit={submitAnswer}
        />
      )}

      {step === "evaluating" && (
        <BizCard>
          <p className="ka text-sm text-[#5B6473]">აუდიტორია ფიქრობს...</p>
          <div className="mt-3 h-2 w-full bg-[#E7E2D5] rounded-full overflow-hidden">
            <div className="h-full bg-[#1E2A44] animate-[loadbar_1.6s_ease-in-out_infinite]" style={{ width: "40%" }} />
          </div>
        </BizCard>
      )}

      {step === "verdict" && verdict && (
        <VerdictCard verdict={verdict} onContinue={loadDebrief} />
      )}

      {step === "debrief" && debrief && (
        <DebriefView debrief={debrief} onComplete={completeSession} />
      )}

      {step === "done" && (
        <DoneScreen
          session={session}
          verdict={verdict}
          savedCount={savedCount}
          stats={stats}
          onDictionary={() => navigate("/path/business/dictionary")}
          onDashboard={() => navigate("/path/business/home")}
        />
      )}

      <style>{`
        @keyframes loadbar { 0%{transform:translateX(-100%)} 100%{transform:translateX(250%)} }
        @keyframes pop { 0%{transform:scale(.92);opacity:0} 100%{transform:scale(1);opacity:1} }
        @keyframes glow { 0%{opacity:.5} 100%{opacity:1} }
        @keyframes draw { to { stroke-dashoffset: 0 } }
        @keyframes slideFade { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
      `}</style>
    </BusinessShell>
  );
}

/* -------------------- Sub-components -------------------- */

function Header({
  step, stages, curriculum, session, slideIdx, stage2Idx,
}: {
  step: Step;
  stages: Step[];
  curriculum: CurriculumStep | null;
  session: SessionData;
  slideIdx: number;
  stage2Idx: number;
}) {
  const idx = Math.max(0, stages.indexOf(step));
  const total = session.slides.length;
  const inner =
    step === "stage1" ? (slideIdx + 0.5) / total
    : step === "stage2" ? (stage2Idx + 0.5) / total
    : 0;
  const pct = ((idx + inner) / stages.length) * 100;
  const label =
    step === "stage1" ? `სტადია 1 · სლაიდი ${slideIdx + 1}/${total}` :
    step === "stage2" ? `სტადია 2 · ${stage2Idx + 1}/${total}` :
    step === "stage3" ? "სტადია 3 · სრული პრეზენტაცია" :
    step === "qa" ? "Q&A" :
    step === "intro" ? "შესავალი" :
    step === "overview" ? "მიმოხილვა" :
    step === "verdict" ? "შეფასება" : "Debrief";
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h1 className="ka text-xl font-bold text-[#1E2A44]">📊 პრეზენტაცია</h1>
        <span className="ka text-[11px] text-[#5B6473]">
          {curriculum ? `${curriculum.step}/${curriculum.total} · ` : ""}{label}
        </span>
      </div>
      <div className="h-1.5 w-full bg-[#E7E2D5] rounded-full overflow-hidden">
        <div className="h-full bg-[#1E2A44] transition-all duration-500" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

function OverviewCard({
  session, curriculum, onStart,
}: { session: SessionData; curriculum: CurriculumStep | null; onStart: () => void }) {
  return (
    <BizCard className="border-l-4 border-l-[#C9A227] overflow-hidden">
      {curriculum && (
        <p className="ka text-[10px] uppercase tracking-wider text-[#5B6473] font-semibold mb-1">
          ეტაპი {curriculum.step} / {curriculum.total}
          {curriculum.cycle > 1 ? ` · გავლა #${curriculum.cycle}` : ""} · {curriculum.titleKa}
        </p>
      )}
      <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">
        პრეზენტაციის მიმოხილვა · ~{session.estimatedMinutes} წუთი
      </p>
      <h2 className="ka text-2xl font-bold text-[#1E2A44] mt-2 leading-snug">
        {session.presentationTitleKa}
      </h2>
      <p className="text-sm text-[#5B6473] mt-0.5">{session.presentationTitleEn}</p>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="p-3 rounded-lg bg-[#FAF7F0] border border-[#E7E2D5]">
          <p className="ka text-[10px] uppercase tracking-wider text-[#5B6473]">აუდიტორია</p>
          <p className="ka text-sm font-semibold text-[#1E2A44] mt-0.5">{session.audienceKa}</p>
        </div>
        <div className="p-3 rounded-lg bg-[#FAF7F0] border border-[#E7E2D5]">
          <p className="ka text-[10px] uppercase tracking-wider text-[#5B6473]">სირთულე</p>
          <p className="ka text-sm font-semibold text-[#1E2A44] mt-0.5">{session.difficultyKa}</p>
        </div>
      </div>

      <div className="mt-3 p-3 rounded-lg bg-[#FFFBEA] border border-[#F2E6B0]">
        <p className="ka text-xs font-semibold text-[#C9A227]">დღეს გაივარჯიშებ</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(session.skillsTrainedKa || []).map((s, i) => (
            <span key={i} className="ka text-[11px] bg-white border border-[#F2E6B0] text-[#1E2A44] px-2 py-1 rounded-md">
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <BizButton onClick={onStart}>დაწყება →</BizButton>
      </div>
    </BizCard>
  );
}

function StageBadge({ n, label }: { n: 1 | 2 | 3; label: string }) {
  const tone =
    n === 1 ? "bg-[#0F766E]/10 text-[#0F766E] border-[#0F766E]/30"
    : n === 2 ? "bg-[#C9A227]/15 text-[#8C6B14] border-[#C9A227]/40"
    : "bg-[#1E2A44]/10 text-[#1E2A44] border-[#1E2A44]/30";
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${tone}`}>
      <span className="w-4 h-4 rounded-full bg-white grid place-items-center text-[10px] border">{n}</span>
      {label}
    </span>
  );
}

function Stage1({
  slide, slideIdx, total, explanation, explainLoading, onExplain,
  practiceText, setPracticeText, onSubmitPractice, practiceLoading, practiceFeedback, onNext,
}: any) {
  return (
    <div className="space-y-3 animate-[slideFade_.4s_ease-out]">
      <div className="flex items-center justify-between">
        <StageBadge n={1} label="სრული მხარდაჭერა" />
        <span className="ka text-[11px] text-[#5B6473]">სლაიდი {slideIdx + 1} / {total}</span>
      </div>

      {/* Slide card */}
      <div className="rounded-2xl bg-white border border-[#1E2A44]/10 shadow-[0_12px_30px_-15px_rgba(30,42,68,0.18)] p-7">
        <p className="ka text-[10px] uppercase tracking-wider text-[#C9A227] font-semibold">
          {slide.titleKa}
        </p>
        <h2 className="text-2xl font-bold text-[#1E2A44] mt-2 leading-snug">{slide.titleEn}</h2>
        <ul className="mt-5 space-y-2.5">
          {slide.bullets.map((b: string, i: number) => (
            <li key={i} className="flex items-start gap-3 text-sm text-[#1E2A44] leading-relaxed">
              <span className="mt-2 shrink-0 w-1.5 h-1.5 rounded-full bg-[#C9A227]" />
              <div>
                <p>{b}</p>
                {slide.bulletsKa?.[i] && <p className="ka text-[11px] text-[#5B6473] mt-0.5">{slide.bulletsKa[i]}</p>}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Explain button */}
      {!explanation ? (
        <div className="text-right">
          <BizButton variant="outline" onClick={onExplain} disabled={explainLoading}>
            {explainLoading ? "მზადდება..." : "ახსნა"}
          </BizButton>
        </div>
      ) : (
        <BizCard className="border-l-4 border-l-[#0F766E]">
          <p className="ka text-[11px] uppercase tracking-wider text-[#0F766E] font-semibold">AI ახსნა</p>
          <p className="text-sm text-[#1E2A44] mt-2 leading-relaxed">{explanation.english}</p>
          <p className="ka text-xs text-[#5B6473] mt-2 leading-relaxed">{explanation.georgian}</p>
          <div className="mt-3 p-2.5 rounded-lg bg-[#FFFBEA] border border-[#F2E6B0]">
            <p className="ka text-[11px] text-[#8C6B14]">💡 {explanation.tip}</p>
          </div>
        </BizCard>
      )}

      {/* Vocabulary */}
      <BizCard>
        <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">
          ლექსიკა · {slide.vocabulary?.length || 0} ფრაზა
        </p>
        <div className="mt-2 grid grid-cols-1 gap-2">
          {(slide.vocabulary || []).map((v: VocabItem, i: number) => (
            <div key={i} className="p-3 rounded-lg bg-[#FAF7F0] border border-[#E7E2D5]">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-bold text-[#1E2A44]">{v.en}</p>
                <p className="ka text-[10px] text-[#5B6473] italic">/{v.pronounceKa}/</p>
              </div>
              <p className="ka text-xs text-[#5B6473] mt-0.5">{v.ka}</p>
            </div>
          ))}
        </div>
      </BizCard>

      {/* Practice */}
      <BizCard className="border-l-4 border-l-[#C9A227]">
        <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">
          ვარჯიში — შენი სიტყვებით
        </p>
        <p className="ka text-xs text-[#5B6473] mt-1">გადააფრაზე ეს მთავარი წინადადება:</p>
        <p className="text-sm text-[#1E2A44] mt-2 p-3 rounded-lg bg-[#FAF7F0] border border-[#E7E2D5] italic">
          "{slide.keySentenceEn}"
        </p>
        <textarea
          value={practiceText}
          onChange={(e) => setPracticeText(e.target.value)}
          placeholder="Type it in your own words..."
          disabled={!!practiceFeedback}
          className="mt-3 w-full min-h-[80px] p-3 rounded-lg border border-[#E7E2D5] text-sm text-[#1E2A44] outline-none focus:border-[#1E2A44] resize-y disabled:bg-[#FAF7F0]"
        />
        {!practiceFeedback ? (
          <div className="mt-3 text-right">
            <BizButton onClick={onSubmitPractice} disabled={!practiceText.trim() || practiceLoading}>
              {practiceLoading ? "..." : "გაგზავნა"}
            </BizButton>
          </div>
        ) : (
          <div className={`mt-3 p-3 rounded-lg border ${
            practiceFeedback.rating === "great" ? "bg-[#F0FDF9] border-[#A7F3D0]" :
            practiceFeedback.rating === "good" ? "bg-[#FFFBEA] border-[#F2E6B0]" :
            "bg-[#FFF7ED] border-[#FED7AA]"
          }`}>
            <p className="ka text-xs font-semibold text-[#1E2A44]">{practiceFeedback.praiseKa}</p>
            <p className="ka text-[11px] text-[#5B6473] mt-1">{practiceFeedback.encouragementKa}</p>
            <div className="mt-2 pt-2 border-t border-[#E7E2D5]/60">
              <p className="ka text-[10px] uppercase tracking-wider text-[#5B6473]">გაუმჯობესებული ვერსია</p>
              <p className="text-sm text-[#1E2A44] mt-0.5 italic">"{practiceFeedback.improvedEn}"</p>
            </div>
          </div>
        )}
      </BizCard>

      <div className="text-right">
        <BizButton onClick={onNext} disabled={!practiceFeedback}>
          {slideIdx + 1 < total ? "შემდეგი სლაიდი →" : "სტადია 2 →"}
        </BizButton>
      </div>
    </div>
  );
}

function Stage2({
  slide, slideIdx, total, text, setText, onSubmit,
}: any) {
  return (
    <div className="space-y-3 animate-[slideFade_.4s_ease-out]">
      <div className="flex items-center justify-between">
        <StageBadge n={2} label="ნაწილობრივი მხარდაჭერა" />
        <span className="ka text-[11px] text-[#5B6473]">სლაიდი {slideIdx + 1} / {total}</span>
      </div>

      <div className="rounded-2xl bg-white border border-[#1E2A44]/10 shadow-[0_12px_30px_-15px_rgba(30,42,68,0.18)] p-7">
        <p className="ka text-[10px] uppercase tracking-wider text-[#C9A227] font-semibold">
          {slide.titleKa}
        </p>
        <h2 className="text-2xl font-bold text-[#1E2A44] mt-2">{slide.titleEn}</h2>
        <div className="mt-5 flex flex-wrap gap-2">
          {(slide.keywords || []).map((k: string, i: number) => (
            <span
              key={i}
              className="text-sm bg-[#FAF7F0] border border-[#C9A227]/30 text-[#1E2A44] px-3 py-1.5 rounded-lg font-semibold"
            >
              {k}
            </span>
          ))}
        </div>
        <p className="ka text-[11px] text-[#5B6473] mt-5 italic">
          მხოლოდ მთავარი სიტყვები ჩანს — ააწყვე წინადადებები ბუნებრივად.
        </p>
      </div>

      <BizCard>
        <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">
          შენი ვერსია — ააწყვე ამ სლაიდის შინაარსი
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Build full sentences using the keywords..."
          className="mt-2 w-full min-h-[120px] p-3 rounded-lg border border-[#E7E2D5] text-sm text-[#1E2A44] outline-none focus:border-[#C9A227] resize-y"
        />
        <div className="mt-3 text-right">
          <BizButton onClick={onSubmit} disabled={!text.trim()}>
            {slideIdx + 1 < total ? "შემდეგი →" : "სტადია 3 →"}
          </BizButton>
        </div>
      </BizCard>
    </div>
  );
}

function Stage3({ session, text, setText, onSubmit }: any) {
  return (
    <div className="space-y-3 animate-[slideFade_.4s_ease-out]">
      <div className="flex items-center justify-between">
        <StageBadge n={3} label="რეალური პრეზენტაცია" />
        <span className="ka text-[11px] text-[#5B6473]">{session.slides.length} სლაიდი</span>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-[#1E2A44] to-[#15203A] text-[#F7F1E3] p-6 shadow-[0_12px_30px_-15px_rgba(30,42,68,0.5)]">
        <p className="ka text-[10px] uppercase tracking-wider text-[#F2D680] font-semibold">
          🎤 სცენაზე ხარ
        </p>
        <h2 className="ka text-xl font-bold mt-2 leading-snug">{session.presentationTitleKa}</h2>
        <p className="ka text-xs text-[#F7F1E3]/70 mt-2">
          მხარდაჭერა აღარაა — წარადგინე მთლიანი თემა შენი სიტყვებით. ეცადე ბუნებრივად და თავდაჯერებულად.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {session.slides.map((sl: Slide, i: number) => (
            <span key={i} className="text-[10px] bg-white/10 text-[#F7F1E3]/80 px-2 py-1 rounded-md">
              {i + 1}. {sl.titleEn}
            </span>
          ))}
        </div>
      </div>

      <BizCard>
        <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">
          შენი პრეზენტაცია
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Present the full topic in English, in your own words..."
          className="mt-2 w-full min-h-[260px] p-3 rounded-lg border border-[#E7E2D5] text-sm text-[#1E2A44] outline-none focus:border-[#1E2A44] resize-y leading-relaxed"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="ka text-[11px] text-[#5B6473]">{text.trim().split(/\s+/).filter(Boolean).length} სიტყვა</span>
          <BizButton onClick={onSubmit} disabled={text.trim().split(/\s+/).length < 20}>
            Q&A-ზე გადასვლა →
          </BizButton>
        </div>
      </BizCard>
    </div>
  );
}

function QAStep({
  session, qIdx, total, currentQ, loading, answer, setAnswer, onSubmit,
}: any) {
  return (
    <div className="space-y-3 animate-[slideFade_.4s_ease-out]">
      <div className="flex items-center justify-between">
        <StageBadge n={3} label="Q&A · აუდიტორია" />
        <span className="ka text-[11px] text-[#5B6473]">კითხვა {qIdx + 1} / {total}</span>
      </div>

      <div className="rounded-2xl bg-white border border-[#1E2A44]/10 shadow-[0_12px_30px_-15px_rgba(30,42,68,0.18)] p-5">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-full bg-[#1E2A44]/10 text-[#1E2A44] grid place-items-center font-bold text-sm">
            A
          </div>
          <div className="min-w-0">
            <p className="ka text-[11px] text-[#5B6473] font-semibold">აუდიტორიის წევრი</p>
            {loading ? (
              <p className="text-sm text-[#5B6473] italic mt-1">აუდიტორია ფიქრობს...</p>
            ) : (
              <p className="text-base text-[#1E2A44] mt-1 leading-relaxed">"{currentQ}"</p>
            )}
          </div>
        </div>
      </div>

      <BizCard>
        <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">
          შენი პასუხი
        </p>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Answer professionally in English..."
          className="mt-2 w-full min-h-[120px] p-3 rounded-lg border border-[#E7E2D5] text-sm text-[#1E2A44] outline-none focus:border-[#1E2A44] resize-y"
          disabled={loading}
        />
        <div className="mt-3 text-right">
          <BizButton onClick={onSubmit} disabled={!answer.trim() || loading}>
            {qIdx + 1 < total ? "შემდეგი კითხვა →" : "შეფასების ნახვა →"}
          </BizButton>
        </div>
      </BizCard>
    </div>
  );
}

function VerdictCard({ verdict, onContinue }: { verdict: Verdict; onContinue: () => void }) {
  const tone =
    verdict.verdict === "strong" ? "border-l-[#0F766E] bg-[#F0FDF9]"
    : verdict.verdict === "average" ? "border-l-[#C9A227] bg-[#FFFBEA]"
    : "border-l-[#B45309] bg-[#FFF7ED]";
  return (
    <BizCard className={`border-l-4 ${tone}`}>
      <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">
        აუდიტორიის შეფასება
      </p>
      <h3 className="ka text-xl font-bold text-[#1E2A44] mt-2 leading-snug">{verdict.headlineKa}</h3>
      <p className="ka text-sm text-[#5B6473] mt-2 leading-relaxed">{verdict.summaryKa}</p>
      <div className="mt-4 text-right">
        <BizButton onClick={onContinue}>სრული Debrief →</BizButton>
      </div>
    </BizCard>
  );
}

function DebriefView({ debrief, onComplete }: { debrief: Debrief; onComplete: () => void }) {
  return (
    <div className="space-y-3">
      <BizCard>
        <p className="ka text-[11px] uppercase tracking-wider text-[#1E2A44] font-semibold">
          Debrief · მწვრთნელის შეფასება
        </p>
        <p className="ka text-sm text-[#1E2A44] mt-2 leading-relaxed">{debrief.summaryKa}</p>
      </BizCard>

      {debrief.wentWell?.length > 0 && (
        <BizCard>
          <p className="ka text-xs font-semibold text-[#0F766E]">✓ რა გამოგივიდა</p>
          <div className="mt-2 space-y-2">
            {debrief.wentWell.map((w, i) => (
              <div key={i} className="p-3 rounded-lg bg-[#F0FDF9] border border-[#A7F3D0]">
                <p className="ka text-sm font-semibold text-[#065F46]">{w.momentKa}</p>
                <p className="text-xs text-[#1E2A44] mt-1 italic">"{w.phraseEn}"</p>
                <p className="ka text-[11px] text-[#5B6473] mt-1">{w.whyKa}</p>
              </div>
            ))}
          </div>
        </BizCard>
      )}

      {debrief.needsImprovement?.length > 0 && (
        <BizCard>
          <p className="ka text-xs font-semibold text-[#B45309]">↗ რა საჭიროებს გაუმჯობესებას</p>
          <div className="mt-2 space-y-2">
            {debrief.needsImprovement.map((w, i) => (
              <div key={i} className="p-3 rounded-lg bg-[#FFF7ED] border border-[#FED7AA]">
                <p className="ka text-sm font-semibold text-[#9A3412]">{w.momentKa}</p>
                <p className="text-xs text-[#1E2A44] mt-1 italic">"{w.phraseEn}"</p>
                <p className="ka text-[11px] text-[#5B6473] mt-1">{w.whyKa}</p>
              </div>
            ))}
          </div>
        </BizCard>
      )}

      {debrief.keyPhrases?.length > 0 && (
        <BizCard>
          <p className="ka text-xs font-semibold text-[#1E2A44]">3 ფრაზა შემდეგი პრეზენტაციისთვის</p>
          <div className="mt-2 space-y-2">
            {debrief.keyPhrases.map((p, i) => (
              <div key={i} className="p-3 rounded-lg bg-[#FAF7F0] border border-[#E7E2D5]">
                <p className="text-sm font-bold text-[#1E2A44]">{p.en}</p>
                <p className="ka text-xs text-[#5B6473]">{p.ka}</p>
                <p className="ka text-[11px] text-[#0F766E] mt-1">📍 {p.whenKa}</p>
              </div>
            ))}
          </div>
        </BizCard>
      )}

      <BizCard className="bg-[#FFFBEA] border-[#F2E6B0]">
        <p className="ka text-xs font-semibold text-[#C9A227]">🎯 შემდეგ სესიაში ფოკუსი</p>
        <p className="ka text-sm text-[#1E2A44] mt-1">{debrief.practiceNextKa}</p>
      </BizCard>

      <div className="text-right">
        <BizButton onClick={onComplete}>დასრულება ✓</BizButton>
      </div>
    </div>
  );
}

function DoneScreen({
  session, verdict, savedCount, stats, onDictionary, onDashboard,
}: {
  session: SessionData;
  verdict: Verdict | null;
  savedCount: number;
  stats: { total: number };
  onDictionary: () => void;
  onDashboard: () => void;
}) {
  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E2A44] via-[#15203A] to-[#0F172A] text-[#F7F1E3] p-7 shadow-[0_20px_50px_-20px_rgba(30,42,68,0.6)]">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-[#C9A227]/20 blur-3xl pointer-events-none animate-[glow_3s_ease-in-out_infinite_alternate]" />
        <div className="absolute -bottom-20 -left-10 w-48 h-48 rounded-full bg-[#A7F3D0]/10 blur-3xl pointer-events-none" />
        <div className="relative text-center">
          <div className="mx-auto relative w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-[#C9A227]/20 animate-[ping_1.6s_ease-out_1]" />
            <div className="absolute inset-0 rounded-full border border-[#C9A227]/40" />
            <div className="absolute inset-1 rounded-full bg-gradient-to-br from-[#C9A227] to-[#A8861E] grid place-items-center shadow-[0_8px_24px_-6px_rgba(201,162,39,0.6)] animate-[pop_.55s_cubic-bezier(.2,.9,.3,1.3)]">
              <svg viewBox="0 0 24 24" className="w-9 h-9 text-[#1E2A44]" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7" style={{ strokeDasharray: 30, strokeDashoffset: 30, animation: "draw .55s .25s ease-out forwards" }} />
              </svg>
            </div>
          </div>
          <p className="ka text-[11px] uppercase tracking-[0.18em] text-[#F2D680] font-semibold mt-5">
            პრეზენტაცია დასრულდა
          </p>
          <h2 className="ka text-2xl font-bold mt-1 leading-snug">
            {verdict?.headlineKa || "პრეზენტაცია დასრულდა"}
          </h2>
          <p className="ka text-sm text-[#F7F1E3]/80 mt-2">{session.presentationTitleKa}</p>
        </div>
      </div>

      <BizCard className="mt-4">
        <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">
          დღევანდელი შედეგი
        </p>
        <ul className="mt-3 space-y-2">
          <SumRow ok label={`${session.slides.length} სლაიდი გავიარე`} />
          <SumRow ok label={`სრული პრეზენტაცია წარდგენილია`} />
          <SumRow ok label={`${savedCount} ფრაზა შენახული ლექსიკაში`} />
        </ul>
      </BizCard>

      <BizCard className="mt-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">
              პრეზენტაციების პროგრესი
            </p>
            <p className="ka text-sm text-[#1E2A44] mt-1">
              <b className="text-lg">{stats.total + 1}</b> პრეზენტაცია გავიარე
            </p>
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-[#F0EBDD] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#C9A227] to-[#E8C760] transition-all duration-700"
            style={{ width: `${Math.min(100, (stats.total + 1) * 10)}%` }}
          />
        </div>
      </BizCard>

      <BizCard className="mt-3 bg-[#FFFBEA] border-[#F2E6B0]">
        <div className="flex items-start gap-3">
          <div className="text-xl">🌅</div>
          <div className="min-w-0">
            <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">
              შემდეგი სესია
            </p>
            <p className="ka text-sm text-[#1E2A44] mt-1 leading-relaxed">
              {session.tomorrowTeaseKa}
            </p>
          </div>
        </div>
      </BizCard>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <BizButton variant="outline" onClick={onDictionary}>ლექსიკონის ნახვა</BizButton>
        <BizButton onClick={onDashboard}>დაშბორდზე დაბრუნება</BizButton>
      </div>
    </div>
  );
}

function SumRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className={`mt-0.5 shrink-0 w-4 h-4 rounded-full grid place-items-center text-[10px] ${ok ? "bg-[#1E2A44] text-white" : "bg-[#E7E2D5] text-[#5B6473]"}`}>
        {ok ? "✓" : "—"}
      </span>
      <span className="ka text-xs text-[#374151]">{label}</span>
    </li>
  );
}
