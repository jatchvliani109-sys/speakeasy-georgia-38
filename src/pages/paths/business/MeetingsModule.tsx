import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";
import { BusinessState, FIELD_LABELS, PRIORITY_LABELS, pullBusinessFromSupabase } from "./lib/state";
import { meetingStep, extractPreviouslyLearned, type CurriculumStep, type PreviouslyLearned } from "./lib/curriculum";

type Attendee = { name: string; titleEn: string; titleKa?: string; personalityKa?: string };

type Briefing = {
  companyName: string;
  companyType: string;
  industryKa: string;
  meetingTypeEn: string;
  meetingTypeKa: string;
  userRoleEn: string;
  userRoleKa: string;
  aboutCompanyKa: string;
  agendaKa: string[];
  whatToExpectKa: string;
};

type WarmUpOption = { label: string; text: string; isBetter: boolean; whyKa: string };
type WarmUpItem = { promptKa: string; contextEn: string; options: WarmUpOption[] };

type SessionData = {
  scenarioKey: string;
  briefing: Briefing;
  attendees: Attendee[];
  stages: string[];
  stageLabelsKa: Record<string, string>;
  warmUp: WarmUpItem[];
  openingLineEn: string;
  openingSpeaker: string;
  estimatedMinutes: number;
  tomorrowTeaseKa: string;
};

type Turn = { role: "ai" | "user"; speaker?: string; text: string };

type PhraseHighlight = { phraseEn: string; praiseKa: string; ka: string };
type MiniQuiz = {
  promptKa: string;
  options: { label: string; text: string; isBetter: boolean; whyKa: string }[];
};

type ReplyData = {
  turns: { speaker: string; text: string }[];
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
  vocabulary: { en: string; ka: string; exampleEn: string; exampleKa: string }[];
};

type Step = "loading" | "briefing" | "warmup" | "meeting" | "verdict" | "debrief" | "done";

function stagePlan(intensity: string): Record<string, number> {
  if (intensity === "light") {
    return { opening: 1, discussion: 2, decision: 1, closing: 1 };
  }
  if (intensity === "intensive" || intensity === "deadline") {
    return { opening: 1, discussion: 3, curveball: 2, decision: 2, closing: 1 };
  }
  return { opening: 1, discussion: 2, curveball: 1, decision: 1, closing: 1 };
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || "")
    .join("");
}

const AVATAR_TONES = [
  "bg-[#1C1C1E] text-[#5C1A2E]",
  "bg-[#5A8A6A] text-white",
  "bg-[#C0392B] text-white",
  "bg-[#6D28D9] text-white",
];

function avatarTone(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_TONES[Math.abs(h) % AVATAR_TONES.length];
}

// Parse "Name: text" out of model text and normalize against attendee list.
function parseSpeaker(text: string, attendees: Attendee[]): { speaker: string; text: string } {
  const m = text.match(/^\s*([A-Z][\w'.\- ]{1,40}?)\s*:\s*(.+)$/s);
  if (m) {
    const candidate = m[1].trim();
    const match = attendees.find((a) => a.name.toLowerCase() === candidate.toLowerCase());
    return { speaker: match?.name || candidate, text: m[2].trim() };
  }
  return { speaker: attendees[0]?.name || "Colleague", text: text.trim() };
}

export default function MeetingsModule() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("loading");
  const [biz, setBiz] = useState<BusinessState | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ total: number }>({ total: 0 });
  const [curriculum, setCurriculum] = useState<CurriculumStep | null>(null);
  const [previouslyLearned, setPreviouslyLearned] = useState<PreviouslyLearned | null>(null);

  const [warmupIdx, setWarmupIdx] = useState(0);
  const [warmupChoice, setWarmupChoice] = useState<number | null>(null);

  const [history, setHistory] = useState<Turn[]>([]);
  const [stageIdx, setStageIdx] = useState(0);
  const [turnInStage, setTurnInStage] = useState(0);
  const [userText, setUserText] = useState("");
  const [thinking, setThinking] = useState(false);
  const [score, setScore] = useState(0);
  const [highlights, setHighlights] = useState<PhraseHighlight[]>([]);
  const [activeHighlight, setActiveHighlight] = useState<PhraseHighlight | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<MiniQuiz | null>(null);
  const [quizChoice, setQuizChoice] = useState<number | null>(null);

  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [debrief, setDebrief] = useState<DebriefData | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  const chatRef = useRef<HTMLDivElement>(null);

  const intensity = biz?.plan?.intensity || biz?.intensity || "standard";
  const plan = useMemo(() => stagePlan(intensity), [intensity]);
  const stages = session?.stages || [];
  const currentStage = stages[stageIdx];
  const remainingInStage = currentStage ? (plan[currentStage] || 1) - turnInStage : 0;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const cur = await pullBusinessFromSupabase(user.id);
        if (cancelled) return;
        setBiz(cur);

        const { data: recent } = await supabase
          .from("business_meeting_sessions")
          .select("meeting_type, scenario_key, completed, session_data")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);

        const completed = (recent || []).filter((r: any) => r.completed);
        setStats({ total: completed.length });
        const recentScenarios = (recent || []).slice(0, 12).map((r: any) => r.meeting_type);

        const curStep = meetingStep(completed.length);
        setCurriculum(curStep);
        const lastCompleted = completed[0] || null;
        const prev = extractPreviouslyLearned(lastCompleted as any, curStep.titleKa);
        setPreviouslyLearned(prev);

        const p = cur.plan;
        const { data, error } = await supabase.functions.invoke("business-meetings", {
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
            previouslyLearned: prev,
          },
        });
        if (cancelled) return;
        if (error) throw error;
        const s = data as SessionData;
        if (!s?.briefing || !s.attendees?.length) throw new Error("Invalid session");
        setSession(s);

        const { data: inserted } = await supabase
          .from("business_meeting_sessions")
          .insert({
            user_id: user.id,
            meeting_type: s.briefing.meetingTypeEn,
            company_type: s.briefing.companyType,
            scenario_key: s.scenarioKey,
            session_data: s as any,
            completed: false,
          })
          .select("id")
          .single();
        if (!cancelled && inserted) setSessionId(inserted.id);
        setStep("briefing");
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "სესიის ჩატვირთვა ვერ მოხერხდა.");
          setStep("briefing");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [history, thinking]);

  function startMeeting() {
    if (!session) return;
    const opening = parseSpeaker(session.openingLineEn, session.attendees);
    const speaker = session.openingSpeaker || opening.speaker;
    setHistory([{ role: "ai", speaker, text: opening.text }]);
    setStageIdx(0);
    setTurnInStage(1);
    setStep("meeting");
  }

  async function submitTurn() {
    if (!session || !userText.trim() || thinking) return;
    const answer = userText.trim();
    const next: Turn[] = [...history, { role: "user", text: answer }];
    setHistory(next);
    setUserText("");
    setThinking(true);
    setError(null);

    try {
      const willEndStage = remainingInStage <= 1;
      const stageForCall = currentStage || stages[stages.length - 1];

      const { data, error } = await supabase.functions.invoke("business-meetings", {
        body: {
          action: "reply",
          level: biz?.plan?.level || biz?.level || "business_intermediate",
          briefing: session.briefing,
          attendees: session.attendees,
          stage: stageForCall,
          history: next,
          userText: answer,
          remainingTurns: Math.max(1, remainingInStage),
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
      const aiTurns: Turn[] = (r.turns || []).map((t) => {
        const norm = parseSpeaker(`${t.speaker}: ${t.text}`, session.attendees);
        return { role: "ai", speaker: norm.speaker, text: norm.text };
      });
      const after: Turn[] = [...next, ...aiTurns];
      setHistory(after);

      if (r.miniQuiz && !activeQuiz) {
        setActiveQuiz(r.miniQuiz);
        setQuizChoice(null);
      }

      if (willEndStage) {
        if (stageIdx + 1 >= stages.length) {
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
      const { data, error } = await supabase.functions.invoke("business-meetings", {
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
      setHistory([...finalHistory, { role: "ai", speaker: session.attendees[0]?.name, text: v.messageEn }]);
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
      const { data, error } = await supabase.functions.invoke("business-meetings", {
        body: {
          action: "debrief",
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
      const enrichedSession = {
        ...session,
        vocabulary: debrief.vocabulary,
        verdict: verdict?.verdict,
        headlineKa: verdict?.headlineKa,
      };
      await supabase
        .from("business_meeting_sessions")
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

  if (step === "loading" || !session) {
    return (
      <BusinessShell back={{ to: "/path/business/home", label: "ბიზნეს ინგლისური" }}>
        <BizCard>
          <p className="ka text-[#4A4A4A]">შეხვედრა მზადდება შენი პროფილისთვის...</p>
          <div className="mt-3 h-2 w-full bg-[#E0D8D0] rounded-full overflow-hidden">
            <div className="h-full bg-[#5C1A2E] animate-[loadbar_1.6s_ease-in-out_infinite]" style={{ width: "40%" }} />
          </div>
          {error && <p className="ka text-xs text-[#C0392B] mt-3">{error}</p>}
        </BizCard>
        <style>{`@keyframes loadbar { 0%{transform:translateX(-100%)} 100%{transform:translateX(250%)} }`}</style>
      </BusinessShell>
    );
  }

  const b = session.briefing;

  return (
    <BusinessShell back={{ to: "/path/business/home", label: "ბიზნეს ინგლისური" }}>
      {step !== "done" && <Header step={step} session={session} stageIdx={stageIdx} curriculum={curriculum} />}

      {step === "briefing" && (
        <div className="space-y-3">
          {previouslyLearned && (
            <BizCard className="bg-[#F8F5F0] border-dashed">
              <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold">
                წინა შეხვედრიდან
              </p>
              <p className="ka text-xs text-[#4A4A4A] mt-1">{previouslyLearned.topicKa}</p>
              <div className="mt-2 space-y-1.5">
                {previouslyLearned.phrases.map((p, i) => (
                  <div key={i} className="p-2 rounded-lg bg-white border border-[#E0D8D0]">
                    <p className="text-sm text-[#5C1A2E] font-medium">"{p.en}"</p>
                    <p className="ka text-[11px] text-[#4A4A4A]">{p.ka}</p>
                  </div>
                ))}
              </div>
              <p className="ka text-[11px] text-[#1C1C1E] mt-2">↑ დღეს ამაზე ავაშენებთ</p>
            </BizCard>
          )}
          <BizCard className="border-l-4 border-l-[#5A8A6A]">
            {curriculum && (
              <p className="ka text-[10px] uppercase tracking-wider text-[#4A4A4A] font-semibold mb-1">
                ეტაპი {curriculum.step} / {curriculum.total}
                {curriculum.cycle > 1 ? ` · გავლა #${curriculum.cycle}` : ""} · {curriculum.titleKa}
              </p>
            )}
            <p className="ka text-[11px] uppercase tracking-wider text-[#5A8A6A] font-semibold">
              შეხვედრის ბრიფინგი · ~{session.estimatedMinutes} წუთი
            </p>
            <h2 className="ka text-xl font-bold text-[#5C1A2E] mt-2">{b.meetingTypeKa}</h2>
            <p className="text-sm text-[#4A4A4A] mt-0.5">{b.meetingTypeEn}</p>

            <div className="mt-4 grid grid-cols-1 gap-2">
              <BriefRow label="კომპანია" valueKa={b.companyName} sub={b.companyType} />
              <BriefRow label="ინდუსტრია" valueKa={b.industryKa} />
              <BriefRow label="შენი როლი" valueKa={b.userRoleKa} sub={b.userRoleEn} />
            </div>

            <div className="mt-4 p-3 rounded-lg bg-[#F8F5F0] border border-[#E0D8D0]">
              <p className="ka text-xs font-semibold text-[#5C1A2E]">დღის წესრიგი</p>
              <ol className="ka text-sm text-[#1C1C1E] mt-1 space-y-1 list-decimal list-inside">
                {(b.agendaKa || []).map((a, i) => <li key={i}>{a}</li>)}
              </ol>
            </div>

            <div className="mt-2 p-3 rounded-lg bg-[#F0F7F2] border border-[#C8DCCF]">
              <p className="ka text-xs font-semibold text-[#3F6649]">დამსწრეები</p>
              <div className="mt-2 grid grid-cols-1 gap-1.5">
                {session.attendees.map((a, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full grid place-items-center text-[10px] font-bold ${avatarTone(a.name)}`}>
                      {initials(a.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#5C1A2E] break-words">{a.name}</p>
                      <p className="ka text-[10px] text-[#4A4A4A] break-words">
                        {a.titleKa || a.titleEn}{a.personalityKa ? ` · ${a.personalityKa}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-2 p-3 rounded-lg bg-[#F8F5F0] border border-[#F0E8D8]">
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
                ? "border-[#E0D8D0] hover:border-[#5C1A2E]"
                : o.isBetter
                  ? "border-[#5A8A6A] bg-[#F0F7F2]"
                  : isPicked
                    ? "border-[#C0392B] bg-[#F8F5F0]"
                    : "border-[#E0D8D0] opacity-60";
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
                  startMeeting();
                }
              }}
            >
              {warmupIdx + 1 < session.warmUp.length ? "შემდეგი →" : "შეხვედრის დაწყება →"}
            </BizButton>
          </div>
        </BizCard>
      )}

      {(step === "meeting" || step === "verdict") && (
        <div className="space-y-3">
          {/* Meeting room header */}
          <div className="rounded-2xl bg-gradient-to-br from-[#5A8A6A] via-[#5A8A6A] to-[#3F6649] text-[#F0F7F2] p-4 shadow-[0_12px_30px_-15px_rgba(90,138,106,0.45)]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="ka text-[10px] uppercase tracking-wider text-[#C8DCCF] font-semibold">
                  🎙️ შეხვედრა მიმდინარეობს
                </p>
                <p className="text-sm font-semibold break-words line-clamp-2 mt-0.5">{b.meetingTypeEn}</p>
                <p className="ka text-[11px] text-[#F0F7F2]/70 break-words line-clamp-2">{b.companyName}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="ka text-[10px] uppercase tracking-wider text-[#C8DCCF]">
                  {currentStage && session.stageLabelsKa[currentStage]
                    ? session.stageLabelsKa[currentStage]
                    : "შეხვედრა"}
                </p>
                <p className="ka text-[10px] text-[#F0F7F2]/70 mt-0.5">
                  {stageIdx + 1} / {stages.length}
                </p>
              </div>
            </div>
            <div className="mt-3 flex -space-x-2">
              {session.attendees.map((a, i) => (
                <div
                  key={i}
                  title={`${a.name} — ${a.titleEn}`}
                  className={`w-7 h-7 rounded-full grid place-items-center text-[10px] font-bold ring-2 ring-[#5A8A6A] ${avatarTone(a.name)}`}
                >
                  {initials(a.name)}
                </div>
              ))}
              <div className="w-7 h-7 rounded-full grid place-items-center text-[10px] font-bold ring-2 ring-[#5A8A6A] bg-white text-[#5C1A2E]">
                შენ
              </div>
            </div>
          </div>

          {/* Conversation */}
          <div
            ref={chatRef}
            className="bg-white border border-[#E0D8D0] rounded-2xl p-3 max-h-[440px] overflow-y-auto space-y-2"
          >
            {history.map((t, i) =>
              t.role === "ai" ? (
                <div key={i} className="flex items-start gap-2 max-w-[88%] mr-auto">
                  <div className={`shrink-0 w-7 h-7 rounded-full grid place-items-center text-[10px] font-bold ${avatarTone(t.speaker || "")}`}>
                    {initials(t.speaker || "")}
                  </div>
                  <div>
                    <p className="ka text-[10px] text-[#4A4A4A] font-semibold ml-1 mb-0.5">{t.speaker}</p>
                    <div className="p-3 rounded-2xl rounded-tl-sm bg-[#F8F5F0] border border-[#E0D8D0] text-sm text-[#5C1A2E] whitespace-pre-wrap leading-relaxed">
                      {t.text}
                    </div>
                  </div>
                </div>
              ) : (
                <div key={i} className="max-w-[88%] ml-auto">
                  <p className="ka text-[10px] text-[#4A4A4A] font-semibold mr-1 mb-0.5 text-right">შენ</p>
                  <div className="p-3 rounded-2xl rounded-tr-sm bg-[#5C1A2E] text-[#F0EBE3] text-sm whitespace-pre-wrap leading-relaxed">
                    {t.text}
                  </div>
                </div>
              ),
            )}
            {thinking && (
              <div className="max-w-[85%] p-3 rounded-2xl bg-[#F8F5F0] border border-[#E0D8D0] mr-auto inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5A8A6A] animate-[blink_1s_infinite]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#5A8A6A] animate-[blink_1s_.15s_infinite]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#5A8A6A] animate-[blink_1s_.3s_infinite]" />
              </div>
            )}
          </div>

          {/* Highlight toast */}
          {activeHighlight && (
            <div className="rounded-2xl bg-[#F0F7F2] border border-[#C8DCCF] p-3 animate-[pop_.4s_ease-out]">
              <p className="ka text-[11px] uppercase tracking-wider text-[#3F6649] font-semibold">
                ✨ ძლიერი წვლილი
              </p>
              <p className="text-sm font-bold text-[#5C1A2E] mt-1">"{activeHighlight.phraseEn}"</p>
              <p className="ka text-[11px] text-[#4A4A4A]">{activeHighlight.ka}</p>
              <p className="ka text-xs text-[#3F6649] mt-1">{activeHighlight.praiseKa}</p>
            </div>
          )}

          {/* Mini quiz */}
          {activeQuiz && step === "meeting" && (
            <BizCard className="border-l-4 border-l-[#5A8A6A]">
              <p className="ka text-[11px] uppercase tracking-wider text-[#5A8A6A] font-semibold">
                სწრაფი კითხვა
              </p>
              <p className="ka text-sm font-semibold text-[#5C1A2E] mt-2">{activeQuiz.promptKa}</p>
              <div className="mt-2 space-y-2">
                {activeQuiz.options.map((o, i) => {
                  const reveal = quizChoice !== null;
                  const isPicked = quizChoice === i;
                  const cls = !reveal
                    ? "border-[#E0D8D0] hover:border-[#5A8A6A]"
                    : o.isBetter
                      ? "border-[#5A8A6A] bg-[#F0F7F2]"
                      : isPicked
                        ? "border-[#C0392B] bg-[#F8F5F0]"
                        : "border-[#E0D8D0] opacity-60";
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
                    შეხვედრაში დაბრუნება →
                  </BizButton>
                </div>
              )}
            </BizCard>
          )}

          {/* Input */}
          {step === "meeting" && (
            <BizCard>
              <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold">
                შენი წვლილი
              </p>
              <textarea
                value={userText}
                onChange={(e) => setUserText(e.target.value)}
                placeholder="Speak up in English..."
                className="mt-2 w-full min-h-[110px] p-3 rounded-lg border border-[#E0D8D0] text-sm text-[#5C1A2E] outline-none focus:border-[#5A8A6A] resize-y"
                disabled={thinking}
              />
              {error && <p className="ka text-xs text-[#C0392B] mt-2">{error}</p>}
              <div className="mt-3 flex items-center justify-between">
                <span className="ka text-[11px] text-[#4A4A4A]">
                  ეტაპი {stageIdx + 1} / {stages.length}
                </span>
                <BizButton onClick={submitTurn} disabled={!userText.trim() || thinking}>
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
                  ? "border-l-4 border-l-[#1C1C1E] bg-[#F8F5F0]"
                  : "border-l-4 border-l-[#C0392B] bg-[#F8F5F0]"
            }>
              <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold">
                კოლეგების შეფასება
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
            <p className="ka text-[11px] uppercase tracking-wider text-[#5A8A6A] font-semibold">
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
              <p className="ka text-xs font-semibold text-[#C0392B]">↗ გამოტოვებული შესაძლებლობები</p>
              <div className="mt-2 space-y-2">
                {debrief.hurtChances.map((w, i) => (
                  <div key={i} className="p-3 rounded-lg bg-[#F8F5F0] border border-[#F5C9C3]">
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
              <p className="ka text-xs font-semibold text-[#5C1A2E]">3 ფრაზა შემდეგი შეხვედრისთვის</p>
              <div className="mt-2 space-y-2">
                {debrief.keyPhrases.map((p, i) => (
                  <div key={i} className="p-3 rounded-lg bg-[#F8F5F0] border border-[#E0D8D0]">
                    <p className="text-sm font-bold text-[#5C1A2E]">{p.en}</p>
                    <p className="ka text-xs text-[#4A4A4A]">{p.ka}</p>
                    <p className="ka text-[11px] text-[#5A8A6A] mt-1">📍 {p.whenKa}</p>
                  </div>
                ))}
              </div>
            </BizCard>
          )}

          <BizCard className="bg-[#F8F5F0] border-[#F0E8D8]">
            <p className="ka text-xs font-semibold text-[#1C1C1E]">🎯 ერთი უნარი, რომელიც უნდა ივარჯიშო</p>
            <p className="ka text-sm text-[#5C1A2E] mt-1">{debrief.practiceNextKa}</p>
          </BizCard>

          <div className="text-right">
            <BizButton onClick={completeSession}>დასრულება ✓</BizButton>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="relative">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#5A8A6A] via-[#5A8A6A] to-[#3F6649] text-[#F0F7F2] p-7 shadow-[0_20px_50px_-20px_rgba(90,138,106,0.6)]">
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-[#1C1C1E]/20 blur-3xl pointer-events-none animate-[glow_3s_ease-in-out_infinite_alternate]" />
            <div className="absolute -bottom-20 -left-10 w-48 h-48 rounded-full bg-[#C8DCCF]/15 blur-3xl pointer-events-none" />
            <div className="relative text-center">
              <div className="mx-auto relative w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-[#C8DCCF]/20 animate-[ping_1.6s_ease-out_1]" />
                <div className="absolute inset-0 rounded-full border border-[#C8DCCF]/40" />
                <div className="absolute inset-1 rounded-full bg-gradient-to-br from-[#1C1C1E] to-[#6E2038] grid place-items-center shadow-[0_8px_24px_-6px_rgba(28,28,30,0.6)] animate-[pop_.55s_cubic-bezier(.2,.9,.3,1.3)]">
                  <svg viewBox="0 0 24 24" className="w-9 h-9 text-[#3F6649]" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.5l4.5 4.5L19 7" style={{ strokeDasharray: 30, strokeDashoffset: 30, animation: "draw .55s .25s ease-out forwards" }} />
                  </svg>
                </div>
              </div>
              <p className="ka text-[11px] uppercase tracking-[0.18em] text-[#C8DCCF] font-semibold mt-5">
                შეხვედრა დასრულდა
              </p>
              <h2 className="ka text-2xl font-bold mt-1 leading-snug">
                {verdict?.headlineKa || "შეხვედრა დასრულდა"}
              </h2>
              <p className="ka text-sm text-[#F0F7F2]/80 mt-2">
                {b.meetingTypeKa} · {b.companyName}
              </p>
            </div>
          </div>

          <BizCard className="mt-4">
            <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold">
              დღევანდელი შედეგი
            </p>
            <ul className="mt-3 space-y-2">
              <SumRow ok label={`შეხვედრა: ${b.meetingTypeEn}`} />
              <SumRow ok label={`${highlights.length} ძლიერი ფრაზა გამოყენებული`} />
              <SumRow ok label={`${savedCount || debrief?.vocabulary?.length || 0} ფრაზა შენახული ლექსიკაში`} />
              <SumRow ok label={`${history.filter((t) => t.role === "user").length} წვლილი შეტანილი`} />
            </ul>
          </BizCard>

          <BizCard className="mt-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold">
                  შეხვედრების პროგრესი
                </p>
                <p className="ka text-sm text-[#5C1A2E] mt-1">
                  <b className="text-lg">{stats.total + 1}</b> შეხვედრა გავიარე
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#5A8A6A]">{score >= 0 ? `+${score}` : score}</div>
                <div className="ka text-[10px] text-[#4A4A4A]">საერთო ქულა</div>
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-[#F0EBE3] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#5A8A6A] to-[#14B8A6] transition-all duration-700"
                style={{ width: `${Math.min(100, (stats.total + 1) * 10)}%` }}
              />
            </div>
          </BizCard>

          <BizCard className="mt-3 bg-[#F8F5F0] border-[#F0E8D8]">
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

function Header({ step, session, stageIdx, curriculum }: { step: Step; session: SessionData; stageIdx: number; curriculum: CurriculumStep | null }) {
  const steps: Step[] = ["briefing", "warmup", "meeting", "verdict", "debrief"];
  const overall = Math.max(0, steps.indexOf(step));
  const totalStages = session.stages.length;
  const meetingPct = step === "meeting" ? (stageIdx / Math.max(1, totalStages)) * 100 : step === "verdict" || step === "debrief" ? 100 : 0;
  const pct =
    step === "meeting" || step === "verdict" || step === "debrief"
      ? 40 + meetingPct * 0.55
      : ((overall + 1) / steps.length) * 40;
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h1 className="ka text-xl font-bold text-[#5C1A2E] inline-flex items-center gap-2"><Users size={18} strokeWidth={2.25} /> შეხვედრები</h1>
        <span className="ka text-[11px] text-[#4A4A4A]">
          {curriculum
            ? `${curriculum.step}/${curriculum.total} · ${curriculum.shortKa}`
            : step === "meeting" && session.stages[stageIdx]
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
      <div className="h-1.5 w-full bg-[#E0D8D0] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#5A8A6A] transition-all duration-500"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

function BriefRow({ label, valueKa, sub }: { label: string; valueKa: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-dashed border-[#E0D8D0] last:border-0">
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
          ok ? "bg-[#5A8A6A] text-white" : "bg-[#E0D8D0] text-[#4A4A4A]"
        }`}
      >
        {ok ? "✓" : "—"}
      </span>
      <span className="ka text-xs text-[#1C1C1E]">{label}</span>
    </li>
  );
}
