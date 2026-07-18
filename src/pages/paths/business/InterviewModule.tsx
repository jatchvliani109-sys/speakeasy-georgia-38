import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useDisplayName } from "@/hooks/useDisplayName";
import { supabase } from "@/integrations/supabase/client";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";
import { BusinessState, FIELD_LABELS, PRIORITY_LABELS, aiSessionsRemaining, aiWeeklyLimit, pullBusinessFromSupabase, tryConsumeAiSession } from "./lib/state";
import { interviewStep, extractPreviouslyLearned, type CurriculumStep, type PreviouslyLearned } from "./lib/curriculum";
import { randomRoleCard, type RoleCard } from "./lib/roleCards";

type Briefing = {
  companyName: string;
  companyType: string;
  industryKa: string;
  roleTitle: string;
  roleTitleKa: string;
  interviewerName: string;
  interviewerTitle: string;
  aboutCompanyKa: string;
  whatToExpectKa: string;
  focusAreasEn?: string[];
};

type WarmUpOption = { label: string; text: string; isBetter: boolean; whyKa: string };
type WarmUpItem = { promptKa: string; contextEn: string; options: WarmUpOption[] };

type SessionData = {
  scenarioKey: string;
  briefing: Briefing;
  stages: string[];
  stageLabelsKa: Record<string, string>;
  warmUp: WarmUpItem[];
  openingLineEn: string;
  estimatedMinutes: number;
  tomorrowTeaseKa: string;
};

type Turn = { role: "interviewer" | "candidate"; text: string };

type PhraseHighlight = { phraseEn: string; praiseKa: string; ka: string };
type MiniQuiz = {
  promptKa: string;
  options: { label: string; text: string; isBetter: boolean; whyKa: string }[];
};

type ReplyData = {
  interviewerText: string;
  scoreDelta: number;
  phraseHighlight: PhraseHighlight | null;
  miniQuiz: MiniQuiz | null;
};

type Verdict = { verdict: "strong" | "average" | "weak"; messageEn: string; headlineKa: string };

type DebriefData = {
  summaryKa: string;
  wentWell: { momentKa: string; phraseEn: string; whyKa: string }[];
  hurtChances: { momentKa: string; phraseEn: string; whyKa: string }[];
  keyPhrases: { en: string; ka: string; whenKa: string }[];
  practiceNextKa: string;
  modelAnswers?: { questionEn: string; theirAnswerKa: string; modelAnswerEn: string; whyStrongerKa: string }[];
  vocabulary: { en: string; ka: string; exampleEn: string; exampleKa: string }[];
};

// ---- Premium gating ----
// REAL mode (actual posting + resume) is the premium feature. While payments
// aren't live it stays open with a premium badge; once subscriptions launch,
// flip PAYMENTS_LIVE and it locks for free users automatically.
const PAYMENTS_LIVE = true; // gating active (mock premium unlocks it)

type Step = "loading" | "picker" | "posting" | "matchedPosting" | "briefing" | "warmup" | "interview" | "verdict" | "debrief" | "done";
type Mode = "real" | "matched" | "random";

// How many interviewer turns per stage by intensity
function stagePlan(intensity: string): Record<string, number> {
  if (intensity === "light") {
    return { small_talk: 1, background: 2, situational: 2, closing: 1 };
  }
  if (intensity === "intensive" || intensity === "deadline") {
    return { small_talk: 1, background: 3, situational: 3, curveball: 2, closing: 1 };
  }
  return { small_talk: 1, background: 2, situational: 2, curveball: 1, closing: 1 };
}

export default function InterviewModule() {
  const { user } = useAuth();
  const { displayName } = useDisplayName();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("loading");
  const [biz, setBiz] = useState<BusinessState | null>(null);
  // Unified weekly AI budget (shared with documents + self-intro).
  const isPaidUser = biz?.mockPro === true;
  const aiRemaining = aiSessionsRemaining(biz);
  const aiLimit = aiWeeklyLimit(biz);
  const aiEmpty = aiRemaining <= 0;
  const aiLockedHint = isPaidUser
    ? "ამ კვირის AI სესიები ამოწურულია — ორშაბათს განახლდება"
    : "ამ კვირის AI სესია გამოყენებულია — ⭐ პრემიუმი: 7/კვირაში";
  const [session, setSession] = useState<SessionData | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ total: number }>({ total: 0 });
  const [curriculum, setCurriculum] = useState<CurriculumStep | null>(null);
  const [previouslyLearned, setPreviouslyLearned] = useState<PreviouslyLearned | null>(null);

  // mode selection
  const [mode, setMode] = useState<Mode | null>(null);
  const [hasResume, setHasResume] = useState(false);
  const [resume, setResume] = useState<any | null>(null);
  const [jobPosting, setJobPosting] = useState("");
  const [matchedPostingText, setMatchedPostingText] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  // warmup
  const [warmupIdx, setWarmupIdx] = useState(0);
  const [warmupChoice, setWarmupChoice] = useState<number | null>(null);

  // interview state
  const [history, setHistory] = useState<Turn[]>([]);
  const [stageIdx, setStageIdx] = useState(0);
  const [turnInStage, setTurnInStage] = useState(0); // interviewer turns already given in this stage
  const [candidateText, setCandidateText] = useState("");
  const [thinking, setThinking] = useState(false);
  const [score, setScore] = useState(0);
  const [highlights, setHighlights] = useState<PhraseHighlight[]>([]);
  const [activeHighlight, setActiveHighlight] = useState<PhraseHighlight | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<MiniQuiz | null>(null);
  const [quizChoice, setQuizChoice] = useState<number | null>(null);

  // verdict + debrief
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [debrief, setDebrief] = useState<DebriefData | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  const chatRef = useRef<HTMLDivElement>(null);

  const intensity = biz?.plan?.intensity || biz?.intensity || "standard";
  const plan = useMemo(() => stagePlan(intensity), [intensity]);
  const stages = session?.stages || [];
  const currentStage = stages[stageIdx];
  const remainingInStage = currentStage ? (plan[currentStage] || 1) - turnInStage : 0;

  // Load context (business state, history, curriculum, resume) then show the mode picker.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const cur = await pullBusinessFromSupabase(user.id);
        if (cancelled) return;
        setBiz(cur);

        const { data: recent } = await supabase
          .from("business_interview_sessions")
          .select("role_title, completed, session_data")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);

        const completed = (recent || []).filter((r: any) => r.completed);
        setStats({ total: completed.length });


        const curStep = interviewStep(completed.length);
        setCurriculum(curStep);
        const lastCompleted = completed[0] || null;
        setPreviouslyLearned(extractPreviouslyLearned(lastCompleted, curStep.titleKa));

        // Load latest resume (for real/matched modes)
        const { data: resumeRow } = await supabase
          .from("business_resumes")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!cancelled) {
          setResume(resumeRow || null);
          setHasResume(!!resumeRow);
        }

        if (!cancelled) setStep("picker");
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "ჩატვირთვა ვერ მოხერხდა.");
          setStep("picker");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Fire the session once the user has picked a mode (and supplied a posting for "real").
  async function startSession(chosen: Mode, postingText?: string) {
    if (!user || starting) return;
    setStarting(true);
    setError(null);
    // One interview = one AI session from the weekly pool (any mode: even
    // random's replies + debrief hit the model).
    const budget = await tryConsumeAiSession(user.id);
    if (!budget.ok) {
      setError(isPaidUser
        ? "ამ კვირის 7 AI სესია ამოწურულია — ორშაბათს განახლდება."
        : "ამ კვირის AI სესია გამოყენებულია. ⭐ პრემიუმი გაძლევს 7-ს კვირაში.");
      setStarting(false);
      return;
    }
    setBiz(await pullBusinessFromSupabase(user.id));
    setStep("loading");
    try {
      const cur = biz || (await pullBusinessFromSupabase(user.id));
      const p = cur.plan;

      // RANDOM mode: use a pre-made role card — zero AI setup cost.
      if (chosen === "random") {
        const { data: recent } = await supabase
          .from("business_interview_sessions")
          .select("scenario_key")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);
        const usedKeys = (recent || []).map((r: any) => r.scenario_key).filter(Boolean);
        const card: RoleCard = randomRoleCard(usedKeys);
        const s: SessionData = {
          scenarioKey: card.scenarioKey,
          briefing: card.briefing as any,
          stages: ["small_talk", "background", "situational", "curveball", "closing"],
          stageLabelsKa: {
            small_talk: "გახურება",
            background: "გამოცდილება",
            situational: "სიტუაცია",
            curveball: "უცაბედი კითხვა",
            closing: "დახურვა",
          },
          warmUp: card.warmUp as any,
          openingLineEn: card.openingLineEn,
          estimatedMinutes: card.estimatedMinutes,
          tomorrowTeaseKa: "შემდეგი სესია კიდევ უფრო საინტერესო იქნება.",
        } as SessionData;
        setSession(s);
        const { data: inserted } = await supabase
          .from("business_interview_sessions")
          .insert({
            user_id: user.id,
            role_title: card.briefing.roleTitle,
            company_type: card.briefing.companyType,
            scenario_key: card.scenarioKey,
            session_data: { ...s, mode: "random" } as any,
            completed: false,
          })
          .select("id")
          .single();
        if (inserted) setSessionId(inserted.id);
        setStep("briefing");
        return;
      }

      // REAL / MATCHED: call the edge function with resume (+ posting for real).
      const curStep = curriculum || interviewStep(stats.total);
      const { data: recent } = await supabase
        .from("business_interview_sessions")
        .select("role_title")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12);
      const recentRoles = (recent || []).map((r: any) => r.role_title).filter(Boolean);

      const { data, error } = await supabase.functions.invoke("business-interview", {
        body: {
          action: "session",
          mode: chosen,
          resume: resume || null,
          jobPosting: chosen === "real" ? (postingText || jobPosting) : null,
          level: p?.level || cur.level || "business_intermediate",
          intensity: p?.intensity || cur.intensity || "standard",
          fields: (p?.fields || cur.field || []).map(
            (f) => FIELD_LABELS[f as keyof typeof FIELD_LABELS] || String(f),
          ),
          goals: (p?.mainGoals || cur.mainPriority || []).map(
            (g) => PRIORITY_LABELS[g as keyof typeof PRIORITY_LABELS] || String(g),
          ),
          recentRoles,
          curriculumTopicKey: curStep.key,
          curriculumTopicTitleKa: curStep.titleKa,
          curriculumGuidance: curStep.guidanceEn,
          curriculumStep: curStep.step,
          curriculumTotal: curStep.total,
          curriculumCycle: curStep.cycle,
          previouslyLearned,
        },
      });
      if (error) throw error;
      const s = data as SessionData & { jobPostingEn?: string };
      if (!s?.briefing) throw new Error("Invalid session");
      setSession(s);

      const { data: inserted } = await supabase
        .from("business_interview_sessions")
        .insert({
          user_id: user.id,
          role_title: s.briefing.roleTitle,
          company_type: s.briefing.companyType,
          scenario_key: s.scenarioKey,
          session_data: { ...s, mode } as any,
          completed: false,
        })
        .select("id")
        .single();
      if (inserted) setSessionId(inserted.id);

      // Matched mode: show the invented posting first, then briefing.
      if (chosen === "matched" && s.jobPostingEn) {
        setMatchedPostingText(s.jobPostingEn);
        setStep("matchedPosting");
      } else {
        setStep("briefing");
      }
    } catch (e: any) {
      setError(e?.message || "სესიის ჩატვირთვა ვერ მოხერხდა.");
      setStep("picker");
    } finally {
      setStarting(false);
    }
  }

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [history, thinking]);

  function startInterview() {
    if (!session) return;
    setHistory([{ role: "interviewer", text: session.openingLineEn }]);
    setStageIdx(0);
    setTurnInStage(1);
    setStep("interview");
  }

  async function submitAnswer() {
    if (!session || !candidateText.trim() || thinking) return;
    const answer = candidateText.trim();
    const next: Turn[] = [...history, { role: "candidate", text: answer }];
    setHistory(next);
    setCandidateText("");
    setThinking(true);
    setError(null);

    try {
      // Decide: should we advance stage after this answer?
      const willEndStage = remainingInStage <= 1;
      const stageForCall = currentStage || stages[stages.length - 1];

      const { data, error } = await supabase.functions.invoke("business-interview", {
        body: {
          action: "reply",
          level: biz?.plan?.level || biz?.level || "business_intermediate",
          briefing: session.briefing,
          stage: stageForCall,
          history: next,
          candidateAnswer: answer,
          remainingQuestions: Math.max(1, remainingInStage),
        },
      });
      if (error) throw error;
      const r = data as ReplyData;
      setScore((s) => s + (r.scoreDelta || 0));
      if (r.phraseHighlight) {
        setHighlights((h) => [...h, r.phraseHighlight!]);
        setActiveHighlight(r.phraseHighlight);
        setTimeout(() => setActiveHighlight(null), 3200);
      }
      const after: Turn[] = [...next, { role: "interviewer", text: r.interviewerText }];
      setHistory(after);

      if (r.miniQuiz && !activeQuiz) {
        setActiveQuiz(r.miniQuiz);
        setQuizChoice(null);
      }

      if (willEndStage) {
        if (stageIdx + 1 >= stages.length) {
          // interview done — go to verdict
          await getVerdict(after);
        } else {
          setStageIdx((i) => i + 1);
          setTurnInStage(1);
        }
      } else {
        setTurnInStage((t) => t + 1);
      }
    } catch (e: any) {
      setError(e?.message || "ვერ მოვიდა პასუხი. სცადე ისევ.");
    } finally {
      setThinking(false);
    }
  }

  async function getVerdict(finalHistory: Turn[]) {
    if (!session) return;
    setThinking(true);
    try {
      const { data, error } = await supabase.functions.invoke("business-interview", {
        body: {
          action: "verdict",
          level: biz?.plan?.level || biz?.level || "business_intermediate",
          briefing: session.briefing,
          history: finalHistory,
        },
      });
      if (error) throw error;
      const v = data as Verdict;
      setVerdict(v);
      setHistory([...finalHistory, { role: "interviewer", text: v.messageEn }]);
      setStep("verdict");
    } catch (e: any) {
      setError(e?.message || "ვერდიქტი ვერ მოვიდა.");
    } finally {
      setThinking(false);
    }
  }

  async function loadDebrief() {
    if (!session || !verdict) return;
    setThinking(true);
    try {
      const { data, error } = await supabase.functions.invoke("business-interview", {
        body: {
          action: "debrief",
          mode: mode || "matched",
          level: biz?.plan?.level || biz?.level || "business_intermediate",
          briefing: session.briefing,
          history,
          verdict: verdict.verdict,
        },
      });
      if (error) throw error;
      setDebrief(data as DebriefData);
      setStep("debrief");
    } catch (e: any) {
      setError(e?.message || "Debrief ვერ მოვიდა.");
    } finally {
      setThinking(false);
    }
  }

  async function savePhrasesToVocab(d: DebriefData) {
    if (!user) return 0;
    const rows = (d.vocabulary || []).map((v) => ({
      user_id: user.id,
      english_word: v.en,
      georgian_meaning: v.ka,
      example_sentence: v.exampleEn,
      difficulty: "business",
      status: "new" as const,
    }));
    if (!rows.length) return 0;
    const { error } = await supabase.from("vocabulary").insert(rows);
    if (error) return 0;
    return rows.length;
  }

  async function completeSession() {
    if (!debrief) return;
    const saved = await savePhrasesToVocab(debrief);
    setSavedCount(saved);
    if (sessionId) {
      // Persist enriched vocabulary on the session so dictionary can show it
      const enrichedSession = {
        ...session,
        vocabulary: debrief.vocabulary,
        verdict: verdict?.verdict,
        headlineKa: verdict?.headlineKa,
      };
      await supabase
        .from("business_interview_sessions")
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          transcript: history as any,
          result: verdict?.verdict || null,
          debrief: debrief as any,
          session_data: enrichedSession as any,
        })
        .eq("id", sessionId);
    }
    setStep("done");
  }

  // ----- Render -----

  if (step === "loading") {
    return (
      <BusinessShell back={{ to: "/path/business/home", label: "SpeakBusy" }}>
        <BizCard>
          <p className="ka text-[#4A4A4A]">გასაუბრება მზადდება შენი პროფილისთვის...</p>
          <div className="mt-3 h-2 w-full bg-[#E4E2DF] rounded-full overflow-hidden">
            <div className="h-full bg-[#232323] animate-[loadbar_1.6s_ease-in-out_infinite]" style={{ width: "40%" }} />
          </div>
          {error && <p className="ka text-xs text-[#C0392B] mt-3">{error}</p>}
        </BizCard>
        <style>{`@keyframes loadbar { 0%{transform:translateX(-100%)} 100%{transform:translateX(250%)} }`}</style>
      </BusinessShell>
    );
  }

  const b = session?.briefing as any;

  // ---- Mode picker ----
  if (step === "picker") {
    return (
      <BusinessShell back={{ to: "/path/business/home", label: "SpeakBusy" }}>
        <div className="space-y-3">
          <BizCard>
            <h2 className="ka text-lg font-bold text-[#1C1C1E]">აირჩიე გასაუბრების ტიპი</h2>
            <p className="ka text-sm text-[#4A4A4A] mt-1">
              სამი გზა ვარჯიშისთვის — რეალური ვაკანსიიდან შემთხვევით სცენარამდე.
            </p>
            <p className="ka text-[11px] text-[#4A4A4A] mt-1.5">
              ამ კვირაში დარჩა {aiRemaining}/{aiLimit} AI სესია — გასაუბრებები, დოკუმენტები და წარდგენა ერთ ბიუჯეტს იზიარებენ.
            </p>
          </BizCard>

          <ModeCard
            titleKa="რეალური ვაკანსია"
            badgeKa="⭐ პრემიუმ"
            descKa="ატვირთე რეალური ვაკანსია, რომელზეც აპლიცირებ. კითხვები შენს რეზიუმესა და ვაკანსიას მოარგებს — სუსტ წერტილებზეც."
            emoji="🎯"
            locked={!hasResume || (PAYMENTS_LIVE && !isPaidUser) || aiEmpty}
            lockedHintKa={
              !hasResume
                ? "ჯერ ატვირთე რეზიუმე"
                : PAYMENTS_LIVE && !isPaidUser
                  ? "⭐ პრემიუმ ფუნქცია"
                  : aiLockedHint
            }
            onClick={() => { setMode("real"); setStep("posting"); }}
            onLockedClick={() => {
              if (!hasResume) navigate("/path/business/resume");
              else if (PAYMENTS_LIVE && !isPaidUser) navigate("/path/business/premium");
            }}
          />
          <ModeCard
            titleKa="მორგებული ვაკანსია"
            descKa="AI შექმნის რეალისტურ ვაკანსიას შენს რეზიუმეზე მორგებულს, ერთი საფეხურით მაღლა. წაიკითხავ და გაივლი გასაუბრებას."
            emoji="✨"
            locked={!hasResume || aiEmpty}
            lockedHintKa={!hasResume ? "ჯერ ატვირთე რეზიუმე" : aiLockedHint}
            onClick={() => { setMode("matched"); startSession("matched"); }}
            onLockedClick={() => {
              if (!hasResume) navigate("/path/business/resume");
              else if (!isPaidUser) navigate("/path/business/premium");
            }}
          />
          <ModeCard
            titleKa="შემთხვევითი გასაუბრება"
            descKa="მზა როლი — გაყიდვები, ბუღალტერია, მარკეტინგი და სხვა. რეზიუმე არ სჭირდება. სწრაფი ვარჯიში."
            emoji="🎲"
            locked={aiEmpty}
            lockedHintKa={aiLockedHint}
            onClick={() => { setMode("random"); startSession("random"); }}
            onLockedClick={() => { if (!isPaidUser) navigate("/path/business/premium"); }}
          />

          {error && <p className="ka text-xs text-[#C0392B]">{error}</p>}
        </div>
      </BusinessShell>
    );
  }

  // ---- Real mode: paste the job posting ----
  if (step === "posting") {
    return (
      <BusinessShell back={{ to: "/path/business/home", label: "SpeakBusy" }}>
        <div className="space-y-3">
          <BizCard>
            <h2 className="ka text-lg font-bold text-[#1C1C1E]">ჩასვი ვაკანსიის ტექსტი</h2>
            <p className="ka text-sm text-[#4A4A4A] mt-1">
              დააკოპირე რეალური ვაკანსიის აღწერა (მოვალეობები და მოთხოვნები). გასაუბრება სწორედ ამ ვაკანსიაზე მოგირგებს.
            </p>
            <textarea
              value={jobPosting}
              onChange={(e) => setJobPosting(e.target.value)}
              rows={10}
              placeholder="Paste the job description here..."
              className="mt-3 w-full rounded-xl border border-[#E4E2DF] bg-white p-3 text-sm text-[#1C1C1E] focus:outline-none focus:border-[#5C1A2E]"
            />
            <div className="mt-3 flex gap-2">
              <BizButton
                onClick={() => startSession("real", jobPosting)}
                disabled={jobPosting.trim().length < 40 || starting}
              >
                გასაუბრების დაწყება
              </BizButton>
              <button
                onClick={() => setStep("picker")}
                className="ka px-4 py-2 rounded-xl border border-[#E4E2DF] text-sm text-[#4A4A4A]"
              >
                უკან
              </button>
            </div>
            {jobPosting.trim().length > 0 && jobPosting.trim().length < 40 && (
              <p className="ka text-xs text-[#C0392B] mt-2">ცოტა მეტი დეტალი ჩასვი (მინიმუმ რამდენიმე წინადადება).</p>
            )}
          </BizCard>
        </div>
      </BusinessShell>
    );
  }

  // ---- Matched mode: show the invented posting before the briefing ----
  if (step === "matchedPosting" && matchedPostingText) {
    return (
      <BusinessShell back={{ to: "/path/business/home", label: "SpeakBusy" }}>
        <div className="space-y-3">
          <BizCard>
            <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold">მორგებული ვაკანსია</p>
            <h2 className="ka text-lg font-bold text-[#1C1C1E] mt-1">წაიკითხე ვაკანსია</h2>
            <p className="ka text-sm text-[#4A4A4A] mt-1">
              ეს ვაკანსია შენს რეზიუმეზეა მორგებული, ოდნავ მაღალ დონეზე. წაიკითხე, შემდეგ დაიწყე გასაუბრება.
            </p>
            <div className="mt-3 p-3 rounded-xl bg-[#F5F4F2] border border-[#E4E2DF] whitespace-pre-wrap text-sm text-[#1C1C1E]">
              {matchedPostingText}
            </div>
            <div className="mt-3">
              <BizButton onClick={() => setStep("briefing")}>მზად ვარ — გავაგრძელოთ</BizButton>
            </div>
          </BizCard>
        </div>
      </BusinessShell>
    );
  }

  if (!session) {
    return (
      <BusinessShell back={{ to: "/path/business/home", label: "SpeakBusy" }}>
        <BizCard>
          <p className="ka text-[#4A4A4A]">იტვირთება...</p>
          {error && <p className="ka text-xs text-[#C0392B] mt-2">{error}</p>}
        </BizCard>
      </BusinessShell>
    );
  }

  return (
    <BusinessShell back={{ to: "/path/business/home", label: "SpeakBusy" }}>
      {step !== "done" && <Header step={step} session={session} stageIdx={stageIdx} curriculum={curriculum} />}

      {step === "briefing" && (
        <div className="space-y-3">
          {previouslyLearned && (
            <BizCard className="bg-[#F5F4F2] border-dashed">
              <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold">
                წინა გასაუბრებიდან
              </p>
              <p className="ka text-xs text-[#4A4A4A] mt-1">{previouslyLearned.topicKa}</p>
              <div className="mt-2 space-y-1.5">
                {previouslyLearned.phrases.map((p, i) => (
                  <div key={i} className="p-2 rounded-lg bg-white border border-[#E4E2DF]">
                    <p className="text-sm text-[#5C1A2E] font-medium">"{p.en}"</p>
                    <p className="ka text-[11px] text-[#4A4A4A]">{p.ka}</p>
                  </div>
                ))}
              </div>
              <p className="ka text-[11px] text-[#1C1C1E] mt-2">↑ დღეს ამაზე ავაშენებთ</p>
            </BizCard>
          )}
          <BizCard className="border-l-4 border-l-[#1C1C1E]">
            {curriculum && (
              <p className="ka text-[10px] uppercase tracking-wider text-[#4A4A4A] font-semibold mb-1">
                ეტაპი {curriculum.step} / {curriculum.total}
                {curriculum.cycle > 1 ? ` · გავლა #${curriculum.cycle}` : ""} · {curriculum.titleKa}
              </p>
            )}
            <p className="ka text-[11px] uppercase tracking-wider text-[#1C1C1E] font-semibold">
              გასაუბრების ბრიფინგი · ~{session.estimatedMinutes} წუთი
            </p>
            <h2 className="ka text-xl font-bold text-[#5C1A2E] mt-2">{b.roleTitleKa}</h2>
            <p className="text-sm text-[#4A4A4A] mt-0.5">{b.roleTitle}</p>

            <div className="mt-4 grid grid-cols-1 gap-2">
              <BriefRow label="კომპანია" valueKa={b.companyName} sub={b.companyType} />
              <BriefRow label="ინდუსტრია" valueKa={b.industryKa} />
              <BriefRow label="ინტერვიუერი" valueKa={b.interviewerName} sub={b.interviewerTitle} />
            </div>

            <div className="mt-4 p-3 rounded-lg bg-[#F5F4F2] border border-[#E4E2DF]">
              <p className="ka text-xs font-semibold text-[#5C1A2E]">კომპანიის შესახებ</p>
              <p className="ka text-sm text-[#1C1C1E] mt-1">{b.aboutCompanyKa}</p>
            </div>
            <div className="mt-2 p-3 rounded-lg bg-[#F5F4F2] border border-[#F0E8D8]">
              <p className="ka text-xs font-semibold text-[#1C1C1E]">რას უნდა ელოდე</p>
              <p className="ka text-sm text-[#1C1C1E] mt-1">{b.whatToExpectKa}</p>
            </div>

            <div className="mt-5 flex justify-end">
              <BizButton onClick={() => { setWarmupIdx(0); setWarmupChoice(null); setStep("warmup"); }}>
                გავხურდეთ →
              </BizButton>
            </div>
          </BizCard>
        </div>
      )}

      {step === "warmup" && session.warmUp[warmupIdx] && (
        <BizCard>
          <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold">
            გახურება · {warmupIdx + 1} / {session.warmUp.length}
          </p>
          <p className="text-xs text-[#4A4A4A] mt-2 italic">"{session.warmUp[warmupIdx].contextEn}"</p>
          <p className="ka text-sm font-semibold text-[#5C1A2E] mt-2">
            {session.warmUp[warmupIdx].promptKa}
          </p>
          <div className="mt-3 space-y-2">
            {session.warmUp[warmupIdx].options.map((o, i) => {
              const reveal = warmupChoice !== null;
              const isPicked = warmupChoice === i;
              const cls = !reveal
                ? "border-[#E4E2DF] hover:border-[#5C1A2E]"
                : o.isBetter
                  ? "border-[#5A8A6A] bg-[#F0F7F2]"
                  : isPicked
                    ? "border-[#C0392B] bg-[#F5F4F2]"
                    : "border-[#E4E2DF] opacity-60";
              return (
                <button
                  key={i}
                  disabled={reveal}
                  onClick={() => setWarmupChoice(i)}
                  className={`w-full text-left p-3 rounded-xl border transition ${cls}`}
                >
                  <p className="text-xs font-semibold text-[#4A4A4A]">Option {o.label}</p>
                  <p className="text-sm text-[#5C1A2E] mt-1">{o.text}</p>
                  {reveal && <p className="ka text-[11px] text-[#4A4A4A] mt-2">💡 {o.whyKa}</p>}
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex items-center justify-between">
            <BizButton variant="ghost" onClick={() => setStep("briefing")}>← უკან</BizButton>
            <BizButton
              disabled={warmupChoice === null}
              onClick={() => {
                if (warmupIdx + 1 < session.warmUp.length) {
                  setWarmupIdx((i) => i + 1);
                  setWarmupChoice(null);
                } else {
                  startInterview();
                }
              }}
            >
              {warmupIdx + 1 < session.warmUp.length ? "შემდეგი →" : "გასაუბრების დაწყება →"}
            </BizButton>
          </div>
        </BizCard>
      )}

      {(step === "interview" || step === "verdict") && (
        <div className="space-y-3">
          {/* Interview "set" card */}
          <div className="rounded-2xl bg-gradient-to-br from-[#232323] via-[#5C1A2E] to-[#161616] text-[#F5F4F2] p-4 shadow-[0_12px_30px_-15px_rgba(92,26,46,0.5)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1C1C1E] text-[#C9A84C] grid place-items-center font-bold text-sm">
                {initials(b.interviewerName)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold break-words line-clamp-2">{b.interviewerName}</p>
                <p className="ka text-[11px] text-[#F5F4F2]/70 break-words line-clamp-2">
                  {b.interviewerTitle} · {b.companyName}
                </p>
              </div>
              <div className="ml-auto ka text-[10px] uppercase tracking-wider text-[#E5D4A8]">
                {currentStage && session.stageLabelsKa[currentStage]
                  ? session.stageLabelsKa[currentStage]
                  : "ინტერვიუ"}
              </div>
            </div>
          </div>

          {/* Conversation */}
          <div
            ref={chatRef}
            className="bg-white border border-[#E4E2DF] rounded-2xl p-3 max-h-[420px] overflow-y-auto space-y-2"
          >
            {history.map((t, i) => (
              <div
                key={i}
                className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  t.role === "interviewer"
                    ? "bg-[#F5F4F2] border border-[#E4E2DF] text-[#5C1A2E] mr-auto rounded-bl-sm"
                    : "bg-[#232323] text-[#F5F4F2] ml-auto rounded-br-sm"
                }`}
              >
                {t.text}
              </div>
            ))}
            {thinking && (
              <div className="max-w-[85%] p-3 rounded-2xl bg-[#F5F4F2] border border-[#E4E2DF] mr-auto inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#232323] animate-[blink_1s_infinite]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#232323] animate-[blink_1s_.15s_infinite]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#232323] animate-[blink_1s_.3s_infinite]" />
              </div>
            )}
          </div>

          {/* Highlight toast */}
          {activeHighlight && (
            <div className="rounded-2xl bg-[#F0F7F2] border border-[#C8DCCF] p-3 animate-[pop_.4s_ease-out]">
              <p className="ka text-[11px] uppercase tracking-wider text-[#3F6649] font-semibold">
                ✨ კარგად გამოიყენე ეს ფრაზა
              </p>
              <p className="text-sm font-bold text-[#5C1A2E] mt-1">"{activeHighlight.phraseEn}"</p>
              <p className="ka text-[11px] text-[#4A4A4A]">{activeHighlight.ka}</p>
              <p className="ka text-xs text-[#3F6649] mt-1">{activeHighlight.praiseKa}</p>
            </div>
          )}

          {/* Mini quiz */}
          {activeQuiz && step === "interview" && (
            <BizCard className="border-l-4 border-l-[#1C1C1E]">
              <p className="ka text-[11px] uppercase tracking-wider text-[#1C1C1E] font-semibold">
                სწრაფი კითხვა
              </p>
              <p className="ka text-sm font-semibold text-[#5C1A2E] mt-2">{activeQuiz.promptKa}</p>
              <div className="mt-2 space-y-2">
                {activeQuiz.options.map((o, i) => {
                  const reveal = quizChoice !== null;
                  const isPicked = quizChoice === i;
                  const cls = !reveal
                    ? "border-[#E4E2DF] hover:border-[#5C1A2E]"
                    : o.isBetter
                      ? "border-[#5A8A6A] bg-[#F0F7F2]"
                      : isPicked
                        ? "border-[#C0392B] bg-[#F5F4F2]"
                        : "border-[#E4E2DF] opacity-60";
                  return (
                    <button
                      key={i}
                      disabled={reveal}
                      onClick={() => setQuizChoice(i)}
                      className={`w-full text-left p-3 rounded-xl border transition ${cls}`}
                    >
                      <p className="text-xs font-semibold text-[#4A4A4A]">Option {o.label}</p>
                      <p className="text-sm text-[#5C1A2E] mt-1">{o.text}</p>
                      {reveal && <p className="ka text-[11px] text-[#4A4A4A] mt-2">💡 {o.whyKa}</p>}
                    </button>
                  );
                })}
              </div>
              {quizChoice !== null && (
                <div className="mt-3 text-right">
                  <BizButton variant="ghost" onClick={() => { setActiveQuiz(null); setQuizChoice(null); }}>
                    გასაუბრებაში დაბრუნება →
                  </BizButton>
                </div>
              )}
            </BizCard>
          )}

          {/* Input */}
          {step === "interview" && (
            <BizCard>
              <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold">
                შენი პასუხი
              </p>
              <textarea
                value={candidateText}
                onChange={(e) => setCandidateText(e.target.value)}
                placeholder="Type your answer in English..."
                className="mt-2 w-full min-h-[110px] p-3 rounded-lg border border-[#E4E2DF] text-sm text-[#5C1A2E] outline-none focus:border-[#5C1A2E] resize-y"
                disabled={thinking}
              />
              {error && <p className="ka text-xs text-[#C0392B] mt-2">{error}</p>}
              <div className="mt-3 flex items-center justify-between">
                <span className="ka text-[11px] text-[#4A4A4A]">
                  ეტაპი {stageIdx + 1} / {stages.length}
                </span>
                <BizButton onClick={submitAnswer} disabled={!candidateText.trim() || thinking}>
                  {thinking ? "..." : "გაგზავნა →"}
                </BizButton>
              </div>
            </BizCard>
          )}

          {/* Verdict reveal */}
          {step === "verdict" && verdict && (
            <BizCard className={
              verdict.verdict === "strong"
                ? "border-l-4 border-l-[#5A8A6A] bg-[#F0F7F2]"
                : verdict.verdict === "average"
                  ? "border-l-4 border-l-[#1C1C1E] bg-[#F5F4F2]"
                  : "border-l-4 border-l-[#C0392B] bg-[#F5F4F2]"
            }>
              <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold">
                გასაუბრების შედეგი
              </p>
              <h3 className="ka text-xl font-bold text-[#5C1A2E] mt-2">{verdict.headlineKa}</h3>
              <p className="text-sm text-[#1C1C1E] mt-2 italic">"{verdict.messageEn}"</p>
              <div className="mt-4 text-right">
                <BizButton onClick={loadDebrief} disabled={thinking}>
                  {thinking ? "Debrief მზადდება..." : "სრული Debrief →"}
                </BizButton>
              </div>
            </BizCard>
          )}
        </div>
      )}

      {step === "debrief" && debrief && (
        <div className="space-y-3">
          <BizCard>
            <p className="ka text-[11px] uppercase tracking-wider text-[#1C1C1E] font-semibold">
              Debrief · მწვრთნელის შეფასება
            </p>
            <p className="ka text-sm text-[#5C1A2E] mt-2 leading-relaxed">{debrief.summaryKa}</p>
          </BizCard>

          {debrief.wentWell?.length > 0 && (
            <BizCard>
              <p className="ka text-xs font-semibold text-[#5A8A6A]">✓ რა გამოგივიდა</p>
              <div className="mt-2 space-y-2">
                {debrief.wentWell.map((w, i) => (
                  <div key={i} className="p-3 rounded-lg bg-[#F0F7F2] border border-[#C8DCCF]">
                    <p className="ka text-sm font-semibold text-[#3F6649]">{w.momentKa}</p>
                    <p className="text-xs text-[#5C1A2E] mt-1 italic">"{w.phraseEn}"</p>
                    <p className="ka text-[11px] text-[#4A4A4A] mt-1">{w.whyKa}</p>
                  </div>
                ))}
              </div>
            </BizCard>
          )}

          {debrief.hurtChances?.length > 0 && (
            <BizCard>
              <p className="ka text-xs font-semibold text-[#C0392B]">↗ რამ დააზიანა შენი შანსები</p>
              <div className="mt-2 space-y-2">
                {debrief.hurtChances.map((w, i) => (
                  <div key={i} className="p-3 rounded-lg bg-[#F5F4F2] border border-[#F5C9C3]">
                    <p className="ka text-sm font-semibold text-[#A52A1B]">{w.momentKa}</p>
                    <p className="text-xs text-[#5C1A2E] mt-1 italic">"{w.phraseEn}"</p>
                    <p className="ka text-[11px] text-[#4A4A4A] mt-1">{w.whyKa}</p>
                  </div>
                ))}
              </div>
            </BizCard>
          )}

          {debrief.keyPhrases?.length > 0 && (
            <BizCard>
              <p className="ka text-xs font-semibold text-[#5C1A2E]">3 ფრაზა შემდეგისთვის</p>
              <div className="mt-2 space-y-2">
                {debrief.keyPhrases.map((p, i) => (
                  <div key={i} className="p-3 rounded-lg bg-[#F5F4F2] border border-[#E4E2DF]">
                    <p className="text-sm font-bold text-[#5C1A2E]">{p.en}</p>
                    <p className="ka text-xs text-[#4A4A4A]">{p.ka}</p>
                    <p className="ka text-[11px] text-[#1C1C1E] mt-1">📍 {p.whenKa}</p>
                  </div>
                ))}
              </div>
            </BizCard>
          )}

          {debrief.modelAnswers && debrief.modelAnswers.length > 0 && (
            <BizCard>
              <p className="ka text-xs font-semibold text-[#5C1A2E]">💪 როგორ გეპასუხა უკეთ</p>
              <div className="mt-2 space-y-3">
                {debrief.modelAnswers.map((m, i) => (
                  <div key={i} className="p-3 rounded-lg bg-[#F5F4F2] border border-[#E4E2DF]">
                    <p className="text-sm font-semibold text-[#1C1C1E]">{m.questionEn}</p>
                    <p className="ka text-[11px] text-[#C0392B] mt-1">{m.theirAnswerKa}</p>
                    <div className="mt-2 p-2 rounded-lg bg-white border border-[#E4E2DF]">
                      <p className="text-sm text-[#1C1C1E]">{m.modelAnswerEn}</p>
                    </div>
                    <p className="ka text-[11px] text-[#5A8A6A] mt-1.5">✓ {m.whyStrongerKa}</p>
                  </div>
                ))}
              </div>
            </BizCard>
          )}

          <BizCard className="bg-[#F5F4F2] border-[#F0E8D8]">
            <p className="ka text-xs font-semibold text-[#1C1C1E]">🎯 ერთი რამ, რაც უნდა ივარჯიშო</p>
            <p className="ka text-sm text-[#5C1A2E] mt-1">{debrief.practiceNextKa}</p>
          </BizCard>

          <div className="text-right">
            <BizButton onClick={completeSession}>დასრულება ✓</BizButton>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="relative">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#232323] via-[#5C1A2E] to-[#161616] text-[#F5F4F2] p-7 shadow-[0_20px_50px_-20px_rgba(92,26,46,0.6)]">
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-[#1C1C1E]/20 blur-3xl pointer-events-none animate-[glow_3s_ease-in-out_infinite_alternate]" />
            <div className="absolute -bottom-20 -left-10 w-48 h-48 rounded-full bg-[#5A8A6A]/15 blur-3xl pointer-events-none" />
            <div className="relative text-center">
              <div className="mx-auto relative w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-[#1C1C1E]/15 animate-[ping_1.6s_ease-out_1]" />
                <div className="absolute inset-0 rounded-full border border-[#1C1C1E]/40" />
                <div className="absolute inset-1 rounded-full bg-gradient-to-br from-[#1C1C1E] to-[#3A3A3A] grid place-items-center shadow-[0_8px_24px_-6px_rgba(28,28,30,0.6)] animate-[pop_.55s_cubic-bezier(.2,.9,.3,1.3)]">
                  <svg viewBox="0 0 24 24" className="w-9 h-9 text-[#C9A84C]" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.5l4.5 4.5L19 7" style={{ strokeDasharray: 30, strokeDashoffset: 30, animation: "draw .55s .25s ease-out forwards" }} />
                  </svg>
                </div>
              </div>
              <p className="ka text-[11px] uppercase tracking-[0.18em] text-[#E5D4A8] font-semibold mt-5">
                {displayName ? `შესრულებულია, ${displayName}` : "შესრულებულია"}
              </p>
              <h2 className="ka text-2xl font-bold mt-1 leading-snug">
                {verdict?.headlineKa || "გასაუბრება დასრულდა"}
              </h2>
              <p className="ka text-sm text-[#F5F4F2]/75 mt-2">
                {b.roleTitleKa} · {b.companyName}
              </p>
            </div>
          </div>

          <BizCard className="mt-4">
            <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold">
              დღევანდელი შედეგი
            </p>
            <ul className="mt-3 space-y-2">
              <SumRow ok label={`როლი: ${b.roleTitle}`} />
              <SumRow ok label={`${highlights.length} ძლიერი ფრაზა გამოყენებული`} />
              <SumRow ok label={`${savedCount || debrief?.vocabulary?.length || 0} ფრაზა შენახული ლექსიკაში`} />
              <SumRow ok label={`${history.filter((t) => t.role === "candidate").length} პასუხი მიცემული`} />
            </ul>
          </BizCard>

          <BizCard className="mt-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold">
                  გასაუბრებების პროგრესი
                </p>
                <p className="ka text-sm text-[#5C1A2E] mt-1">
                  <b className="text-lg">{stats.total + 1}</b> გასაუბრება გავიარე
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#5C1A2E]">{score >= 0 ? `+${score}` : score}</div>
                <div className="ka text-[10px] text-[#4A4A4A]">საერთო ქულა</div>
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-[#F5F4F2] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#1C1C1E] to-[#C9A84C] transition-all duration-700"
                style={{ width: `${Math.min(100, (stats.total + 1) * 10)}%` }}
              />
            </div>
          </BizCard>

          <BizCard className="mt-3 bg-[#F5F4F2] border-[#F0E8D8]">
            <div className="flex items-start gap-3">
              <div className="text-xl">🌅</div>
              <div className="min-w-0">
                <p className="ka text-[11px] uppercase tracking-wider text-[#1C1C1E] font-semibold">
                  შემდეგი სესია
                </p>
                <p className="ka text-sm text-[#5C1A2E] mt-1 leading-relaxed">
                  {session.tomorrowTeaseKa}
                </p>
              </div>
            </div>
          </BizCard>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <BizButton variant="outline" onClick={() => navigate("/path/business/lexicon?tab=phrases")}>
              ლექსიკონის ნახვა
            </BizButton>
            <BizButton onClick={() => navigate("/path/business/home")}>
              დაშბორდზე დაბრუნება
            </BizButton>
          </div>

          <style>{`
            @keyframes pop { 0%{transform:scale(.5);opacity:0} 100%{transform:scale(1);opacity:1} }
            @keyframes glow { 0%{opacity:.5} 100%{opacity:1} }
            @keyframes draw { to { stroke-dashoffset: 0 } }
            @keyframes blink { 0%,80%,100%{opacity:.2} 40%{opacity:1} }
          `}</style>
        </div>
      )}

      <style>{`
        @keyframes pop { 0%{transform:scale(.92);opacity:0} 100%{transform:scale(1);opacity:1} }
        @keyframes blink { 0%,80%,100%{opacity:.2} 40%{opacity:1} }
      `}</style>
    </BusinessShell>
  );
}

function ModeCard({
  titleKa, descKa, emoji, locked, lockedHintKa, onClick, onLockedClick, badgeKa,
}: {
  titleKa: string; descKa: string; emoji: string; locked: boolean;
  lockedHintKa?: string; onClick: () => void; onLockedClick?: () => void;
  badgeKa?: string;
}) {
  return (
    <button
      onClick={locked ? onLockedClick : onClick}
      className={[
        "w-full text-left p-4 rounded-2xl border transition-colors",
        locked
          ? "border-[#E4E2DF] bg-[#F5F4F2] opacity-80"
          : "border-[#E4E2DF] bg-white hover:border-[#5C1A2E]/40 hover:bg-[#5C1A2E]/5",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl">{emoji}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="ka font-bold text-[#1C1C1E]">{titleKa}</h3>
            {badgeKa && (
              <span className="ka text-[10px] font-bold text-[#5C1A2E] bg-[#C9A84C]/25 border border-[#C9A84C]/40 px-1.5 py-0.5 rounded-full">
                {badgeKa}
              </span>
            )}
            {locked && <span className="text-xs">🔒</span>}
          </div>
          <p className="ka text-xs text-[#4A4A4A] mt-1 leading-relaxed">{descKa}</p>
          {locked && lockedHintKa && (
            <p className="ka text-[11px] text-[#5C1A2E] font-semibold mt-1.5">{lockedHintKa} →</p>
          )}
        </div>
      </div>
    </button>
  );
}

function Header({ step, session, stageIdx, curriculum }: { step: Step; session: SessionData; stageIdx: number; curriculum: CurriculumStep | null }) {
  const steps: Step[] = ["briefing", "warmup", "interview", "verdict", "debrief"];
  const overall = Math.max(0, steps.indexOf(step));
  const totalStages = session.stages.length;
  const interviewPct = step === "interview" ? (stageIdx / Math.max(1, totalStages)) * 100 : step === "verdict" || step === "debrief" ? 100 : 0;
  const pct =
    step === "interview" || step === "verdict" || step === "debrief"
      ? 40 + interviewPct * 0.55
      : ((overall + 1) / steps.length) * 40;
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h1 className="ka text-xl font-bold text-[#5C1A2E] inline-flex items-center gap-2"><Briefcase size={18} strokeWidth={2.25} /> გასაუბრება</h1>
        <span className="ka text-[11px] text-[#4A4A4A]">
          {curriculum
            ? `${curriculum.step}/${curriculum.total} · ${curriculum.shortKa}`
            : step === "interview" && session.stages[stageIdx]
              ? session.stageLabelsKa[session.stages[stageIdx]]
              : step === "briefing"
                ? "ბრიფინგი"
                : step === "warmup"
                  ? "გახურება"
                  : step === "verdict"
                    ? "შედეგი"
                    : "Debrief"}
        </span>
      </div>
      <div className="h-1.5 w-full bg-[#E4E2DF] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#232323] transition-all duration-500"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

function BriefRow({ label, valueKa, sub }: { label: string; valueKa: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-dashed border-[#E4E2DF] last:border-0">
      <span className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A]">{label}</span>
      <div className="text-right min-w-0">
        <p className="ka text-sm font-semibold text-[#5C1A2E] break-words">{valueKa}</p>
        {sub && <p className="text-[11px] text-[#4A4A4A] break-words">{sub}</p>}
      </div>
    </div>
  );
}

function SumRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-start gap-2">
      <span
        className={`mt-0.5 shrink-0 w-4 h-4 rounded-full grid place-items-center text-[10px] ${
          ok ? "bg-[#5A8A6A] text-white" : "bg-[#E4E2DF] text-[#4A4A4A]"
        }`}
      >
        {ok ? "✓" : "—"}
      </span>
      <span className="ka text-xs text-[#1C1C1E]">{label}</span>
    </li>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || "")
    .join("");
}
