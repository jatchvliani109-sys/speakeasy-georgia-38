import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";
import {
  BusinessState,
  FIELD_LABELS,
  PRIORITY_LABELS,
  pullBusinessFromSupabase,
} from "./lib/state";

type Example = { en: string; ka: string; noteKa?: string };
type StructurePart = { partKa: string; purposeKa: string; exampleEn: string };
type Vocab = { en: string; ka: string; exampleEn: string; exampleKa: string };
type WarmUpOption = { label: string; text: string; isBetter: boolean; issuesKa: string[] };
type WarmUp = {
  kind: "spot_mistakes" | "compare";
  promptKa: string;
  options: WarmUpOption[];
  explanationKa: string;
};
type BonusScenario = {
  scenarioKa: string;
  recipientRole: string;
  promptKa: string;
  hintsKa: string[];
};
type SessionData = {
  emailType: string;
  scenarioKey: string;
  dailyFocusKa: string;
  estimatedMinutes: number;
  warmUp?: WarmUp | null;
  learn: { titleKa: string; explanationKa: string; structure?: StructurePart[]; examples: Example[] };
  realExample: {
    contextKa: string;
    subject: string;
    body: string;
    annotationsKa: string[];
  };
  practice: {
    scenarioKa: string;
    recipientRole: string;
    promptKa: string;
    hintsKa: string[];
  };
  bonusScenario?: BonusScenario | null;
  vocabulary: Vocab[];
  tomorrowTeaseKa: string;
};

type ImproveFocus = { instructionKa: string; originalSnippet: string; hintKa: string };
type Feedback = {
  inCharacter: { subject: string; body: string };
  feedback: {
    summaryKa: string;
    worked: string[];
    improve: string[];
    suggestions: { before: string; after: string; whyKa: string }[];
    rewriteEn: string;
    improveFocus?: ImproveFocus;
  };
};

type ImproveAck = { praiseKa: string; polishedEn: string; tipKa: string };

type Step =
  | "loading"
  | "focus"
  | "warmup"
  | "learn"
  | "example"
  | "practice"
  | "feedback"
  | "improve"
  | "bonus"
  | "vocab"
  | "done";

export default function EmailsModule() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("loading");
  const [biz, setBiz] = useState<BusinessState | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ total: number; vocab: number }>({ total: 0, vocab: 0 });

  // warmup
  const [warmupChoice, setWarmupChoice] = useState<number | null>(null);
  // improve step
  const [improveText, setImproveText] = useState("");
  const [improveAck, setImproveAck] = useState<ImproveAck | null>(null);
  const [loadingImprove, setLoadingImprove] = useState(false);
  // bonus
  const [bonusText, setBonusText] = useState("");
  const [bonusDone, setBonusDone] = useState(false);
  // saved phrases
  const [savedCount, setSavedCount] = useState(0);

  const intensity = biz?.plan?.intensity || biz?.intensity || "standard";
  const isLight = intensity === "light";
  const hasBonus = !!session?.bonusScenario && (intensity === "intensive" || intensity === "deadline");

  // Load state + generate session
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const cur = await pullBusinessFromSupabase(user.id);
        if (cancelled) return;
        setBiz(cur);

        const { data: recent } = await supabase
          .from("business_email_sessions")
          .select("email_type, scenario_key, completed, session_data")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);

        if (cancelled) return;

        const completed = (recent || []).filter((r: any) => r.completed);
        const vocabCount = completed.reduce(
          (acc: number, r: any) => acc + (r.session_data?.vocabulary?.length || 0),
          0,
        );
        setStats({ total: completed.length, vocab: vocabCount });

        const recentEmailTypes = (recent || []).slice(0, 6).map((r: any) => r.email_type);
        const recentScenarios = (recent || []).slice(0, 12).map((r: any) => r.scenario_key);

        const plan = cur.plan;
        const { data, error } = await supabase.functions.invoke("business-emails", {
          body: {
            action: "session",
            level: plan?.level || cur.level || "business_intermediate",
            intensity: plan?.intensity || cur.intensity || "standard",
            fields: (plan?.fields || cur.field || []).map((f) => FIELD_LABELS[f as keyof typeof FIELD_LABELS] || String(f)),
            goals: (plan?.mainGoals || cur.mainPriority || []).map(
              (g) => PRIORITY_LABELS[g as keyof typeof PRIORITY_LABELS] || String(g),
            ),
            recentEmailTypes,
            recentScenarios,
          },
        });
        if (cancelled) return;
        if (error) throw error;
        const s = data as SessionData;
        if (!s?.emailType) throw new Error("Invalid session");
        setSession(s);

        const { data: inserted, error: insErr } = await supabase
          .from("business_email_sessions")
          .insert({
            user_id: user.id,
            email_type: s.emailType,
            scenario_key: s.scenarioKey,
            session_data: s as any,
            completed: false,
          })
          .select("id")
          .single();
        if (!cancelled && !insErr && inserted) setSessionId(inserted.id);
        setStep("focus");
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "დღევანდელი სესიის ჩატვირთვა ვერ მოხერხდა.");
          setStep("focus");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const minutes = session?.estimatedMinutes || 20;

  async function submitForFeedback() {
    if (!session || !userEmail.trim()) return;
    setLoadingFeedback(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("business-emails", {
        body: {
          action: "feedback",
          level: biz?.plan?.level || biz?.level || "business_intermediate",
          emailType: session.emailType,
          scenario: session.practice.scenarioKa,
          recipientRole: session.practice.recipientRole,
          userEmail: userEmail.trim(),
        },
      });
      if (error) throw error;
      const fb = data as Feedback;
      if (!fb?.feedback) throw new Error("Invalid feedback");
      setFeedback(fb);
      // seed improve text with the snippet they need to rewrite
      const snip = fb.feedback.improveFocus?.originalSnippet || fb.feedback.suggestions?.[0]?.before || "";
      setImproveText(snip);
      if (sessionId) {
        await supabase
          .from("business_email_sessions")
          .update({ user_email: userEmail.trim(), feedback: fb as any })
          .eq("id", sessionId);
      }
      setStep("feedback");
    } catch (e: any) {
      setError(e?.message || "AI feedback ვერ მოვიდა. სცადე ისევ.");
    } finally {
      setLoadingFeedback(false);
    }
  }

  async function submitImprove() {
    if (!session || !feedback || !improveText.trim()) return;
    setLoadingImprove(true);
    setError(null);
    try {
      const focus = feedback.feedback.improveFocus;
      const fallback = feedback.feedback.suggestions?.[0];
      const targetBefore = focus?.originalSnippet || fallback?.before || "";
      const targetAfter = fallback?.after || "";
      const whyKa = focus?.hintKa || fallback?.whyKa || "";
      const { data, error } = await supabase.functions.invoke("business-emails", {
        body: {
          action: "improve",
          level: biz?.plan?.level || biz?.level || "business_intermediate",
          emailType: session.emailType,
          originalEmail: userEmail,
          targetBefore,
          targetAfter,
          whyKa,
          userRewrite: improveText.trim(),
        },
      });
      if (error) throw error;
      setImproveAck(data as ImproveAck);
    } catch (e: any) {
      setError(e?.message || "ვერ მოვიდა პასუხი. სცადე ისევ.");
    } finally {
      setLoadingImprove(false);
    }
  }

  async function savePhrasesToVocab() {
    if (!user || !session) return 0;
    const rows = session.vocabulary.map((v) => ({
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
    const saved = await savePhrasesToVocab();
    setSavedCount(saved);
    if (sessionId) {
      await supabase
        .from("business_email_sessions")
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq("id", sessionId);
    }
    setStep("done");
  }

  // ----- Render -----

  if (step === "loading" || !session) {
    return (
      <BusinessShell back={{ to: "/path/business/home", label: "ბიზნეს ინგლისური" }}>
        <BizCard>
          <p className="ka text-[#5B6473]">დღევანდელი სესია მზადდება შენი მიზნებისთვის...</p>
          <div className="mt-3 h-2 w-full bg-[#E7E2D5] rounded-full overflow-hidden">
            <div className="h-full bg-[#1E2A44] animate-[loadbar_1.6s_ease-in-out_infinite]" style={{ width: "40%" }} />
          </div>
          {error && <p className="ka text-xs text-[#B91C1C] mt-3">{error}</p>}
        </BizCard>
        <style>{`@keyframes loadbar { 0%{transform:translateX(-100%)} 100%{transform:translateX(250%)} }`}</style>
      </BusinessShell>
    );
  }

  const showWarmup = !isLight && !!session.warmUp?.options?.length;
  const afterFocusStep: Step = showWarmup ? "warmup" : "learn";

  return (
    <BusinessShell back={{ to: "/path/business/home", label: "ბიზნეს ინგლისური" }}>
      <Header step={step} session={session} isLight={isLight} hasBonus={hasBonus} />

      {step === "focus" && (
        <BizCard className="border-l-4 border-l-[#C9A227]">
          <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">
            დღევანდელი ფოკუსი · ~{minutes} წუთი
          </p>
          <h2 className="ka text-xl font-bold text-[#1E2A44] mt-2 leading-snug">
            {session.dailyFocusKa}
          </h2>
          <p className="ka text-sm text-[#5B6473] mt-3">
            დღეს ერთად ვიმუშავებთ {labelFor(session.emailType)} ტიპის იმეილზე — შენი მიზნებისა და სფეროს გათვალისწინებით.
          </p>
          <div className="mt-5 flex justify-end">
            <BizButton onClick={() => setStep(afterFocusStep)}>დაწყება →</BizButton>
          </div>
        </BizCard>
      )}

      {step === "warmup" && session.warmUp && (
        <BizCard>
          <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">
            გახურება · 1-2 წუთი
          </p>
          <p className="ka text-sm font-semibold text-[#1E2A44] mt-2">{session.warmUp.promptKa}</p>
          <div className="mt-3 space-y-2">
            {session.warmUp.options.map((o, i) => {
              const isPicked = warmupChoice === i;
              const reveal = warmupChoice !== null;
              const correct = o.isBetter;
              const ringClass = !reveal
                ? "border-[#E7E2D5] hover:border-[#1E2A44]"
                : correct
                  ? "border-[#0F766E] bg-[#F0FDF9]"
                  : isPicked
                    ? "border-[#B45309] bg-[#FFFBEA]"
                    : "border-[#E7E2D5] opacity-60";
              return (
                <button
                  key={i}
                  disabled={reveal}
                  onClick={() => setWarmupChoice(i)}
                  className={`w-full text-left p-3 rounded-lg border transition ${ringClass}`}
                >
                  <p className="text-xs font-semibold text-[#5B6473]">Option {o.label}</p>
                  <p className="text-sm text-[#1E2A44] mt-1 whitespace-pre-wrap">{o.text}</p>
                  {reveal && o.issuesKa?.length > 0 && (
                    <ul className="ka mt-2 space-y-0.5">
                      {o.issuesKa.map((it, j) => (
                        <li key={j} className="text-[11px] text-[#5B6473]">• {it}</li>
                      ))}
                    </ul>
                  )}
                </button>
              );
            })}
          </div>
          {warmupChoice !== null && (
            <p className="ka text-xs text-[#1E2A44] mt-3 p-3 bg-[#FAF7F0] rounded-lg border border-[#E7E2D5]">
              💡 {session.warmUp.explanationKa}
            </p>
          )}
          <NavRow
            onBack={() => setStep("focus")}
            onNext={() => setStep("learn")}
            nextLabel="სწავლა →"
            nextDisabled={warmupChoice === null}
          />
        </BizCard>
      )}

      {step === "learn" && (
        <BizCard>
          <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">სწავლა</p>
          <h3 className="ka text-lg font-bold text-[#1E2A44] mt-1">{session.learn.titleKa}</h3>
          <p className="ka text-sm text-[#374151] mt-2 leading-relaxed">{session.learn.explanationKa}</p>

          {session.learn.structure && session.learn.structure.length > 0 && (
            <div className="mt-4">
              <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">
                იმეილის სტრუქტურა
              </p>
              <div className="mt-2 space-y-2">
                {session.learn.structure.map((p, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-lg bg-white border border-[#E7E2D5]">
                    <div className="shrink-0 w-7 h-7 rounded-full bg-[#1E2A44] text-white text-xs grid place-items-center font-bold">
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="ka text-sm font-semibold text-[#1E2A44]">{p.partKa}</p>
                      <p className="ka text-[11px] text-[#5B6473]">{p.purposeKa}</p>
                      <p className="text-xs text-[#374151] mt-1 italic">"{p.exampleEn}"</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 space-y-2">
            {session.learn.examples.map((ex, i) => (
              <div key={i} className="p-3 rounded-lg bg-[#FAF7F0] border border-[#E7E2D5]">
                <p className="text-sm text-[#1E2A44]">{ex.en}</p>
                <p className="ka text-xs text-[#5B6473] mt-0.5">{ex.ka}</p>
                {ex.noteKa && <p className="ka text-[11px] text-[#C9A227] mt-1">💡 {ex.noteKa}</p>}
              </div>
            ))}
          </div>
          <NavRow
            onBack={() => setStep(showWarmup ? "warmup" : "focus")}
            onNext={() => setStep("example")}
            nextLabel="რეალური მაგალითი →"
          />
        </BizCard>
      )}

      {step === "example" && (
        <BizCard>
          <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">რეალური მაგალითი</p>
          <p className="ka text-xs text-[#5B6473] mt-2 italic">{session.realExample.contextKa}</p>
          <div className="mt-3 border border-[#E7E2D5] rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-[#1E2A44]/5 border-b border-[#E7E2D5]">
              <p className="text-xs text-[#5B6473]">Subject</p>
              <p className="text-sm font-semibold text-[#1E2A44]">{session.realExample.subject}</p>
            </div>
            <div className="px-4 py-3 bg-white whitespace-pre-wrap text-sm text-[#1E2A44] leading-relaxed">
              {session.realExample.body}
            </div>
          </div>
          {session.realExample.annotationsKa?.length > 0 && (
            <ul className="mt-3 space-y-1">
              {session.realExample.annotationsKa.map((a, i) => (
                <li key={i} className="ka text-xs text-[#5B6473] flex gap-2">
                  <span className="text-[#C9A227]">●</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          )}
          <NavRow onBack={() => setStep("learn")} onNext={() => setStep("practice")} nextLabel="მთავარი დავალება →" />
        </BizCard>
      )}

      {step === "practice" && (
        <BizCard>
          <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">მთავარი დავალება</p>
          <div className="mt-2 p-3 rounded-lg bg-[#FFFBEA] border border-[#F2E6B0]">
            <p className="ka text-sm text-[#1E2A44] leading-relaxed">{session.practice.scenarioKa}</p>
          </div>
          <p className="ka text-sm font-semibold text-[#1E2A44] mt-3">{session.practice.promptKa}</p>
          {session.practice.hintsKa?.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {session.practice.hintsKa.map((h, i) => (
                <li key={i} className="ka text-xs text-[#5B6473]">• {h}</li>
              ))}
            </ul>
          )}
          <textarea
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="Write your email here in English..."
            className="mt-3 w-full min-h-[180px] p-3 rounded-lg border border-[#E7E2D5] text-sm text-[#1E2A44] outline-none focus:border-[#1E2A44] resize-y"
          />
          {error && <p className="ka text-xs text-[#B91C1C] mt-2">{error}</p>}
          <NavRow
            onBack={() => setStep("example")}
            onNext={submitForFeedback}
            nextLabel={loadingFeedback ? "AI ფიქრობს..." : "გაგზავნა AI-სთან →"}
            nextDisabled={!userEmail.trim() || loadingFeedback}
          />
        </BizCard>
      )}

      {step === "feedback" && feedback && (
        <div className="space-y-3">
          <BizCard className="border-l-4 border-l-[#1E2A44]">
            <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">
              პასუხი {session.practice.recipientRole}-დან
            </p>
            <div className="mt-3 border border-[#E7E2D5] rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-[#1E2A44]/5 border-b border-[#E7E2D5]">
                <p className="text-sm font-semibold text-[#1E2A44]">{feedback.inCharacter.subject}</p>
              </div>
              <div className="px-4 py-3 bg-white whitespace-pre-wrap text-sm text-[#1E2A44] leading-relaxed">
                {feedback.inCharacter.body}
              </div>
            </div>
          </BizCard>

          <BizCard>
            <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">AI feedback</p>
            <p className="ka text-sm text-[#1E2A44] mt-2">{feedback.feedback.summaryKa}</p>

            {feedback.feedback.worked?.length > 0 && (
              <div className="mt-3">
                <p className="ka text-xs font-semibold text-[#0F766E]">✓ რა გამოგივიდა</p>
                <ul className="mt-1 space-y-0.5">
                  {feedback.feedback.worked.map((w, i) => (
                    <li key={i} className="ka text-xs text-[#374151]">• {w}</li>
                  ))}
                </ul>
              </div>
            )}

            {feedback.feedback.improve?.length > 0 && (
              <div className="mt-3">
                <p className="ka text-xs font-semibold text-[#B45309]">↗ რა გავაუმჯობესოთ</p>
                <ul className="mt-1 space-y-0.5">
                  {feedback.feedback.improve.map((w, i) => (
                    <li key={i} className="ka text-xs text-[#374151]">• {w}</li>
                  ))}
                </ul>
              </div>
            )}

            {feedback.feedback.suggestions?.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="ka text-xs font-semibold text-[#1E2A44]">კონკრეტული რჩევები</p>
                {feedback.feedback.suggestions.map((s, i) => (
                  <div key={i} className="p-3 rounded-lg bg-[#FAF7F0] border border-[#E7E2D5]">
                    <p className="text-xs text-[#B91C1C] line-through">{s.before}</p>
                    <p className="text-sm text-[#0F766E] mt-1">{s.after}</p>
                    <p className="ka text-[11px] text-[#5B6473] mt-1">{s.whyKa}</p>
                  </div>
                ))}
              </div>
            )}

            {feedback.feedback.rewriteEn && (
              <details className="mt-3 group">
                <summary className="ka text-xs font-semibold text-[#1E2A44] cursor-pointer">
                  გაუმჯობესებული ვერსია
                </summary>
                <div className="mt-2 p-3 rounded-lg bg-white border border-[#E7E2D5] whitespace-pre-wrap text-sm text-[#1E2A44]">
                  {feedback.feedback.rewriteEn}
                </div>
              </details>
            )}

            <NavRow onNext={() => setStep("improve")} nextLabel="გავაუმჯობესოთ →" />
          </BizCard>
        </div>
      )}

      {step === "improve" && feedback && (
        <BizCard className="border-l-4 border-l-[#C9A227]">
          <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">გავაუმჯობესოთ ერთი ნაწილი</p>
          <p className="ka text-sm font-semibold text-[#1E2A44] mt-2">
            {feedback.feedback.improveFocus?.instructionKa || "გადაწერე ეს ნაწილი უკეთეს ვერსიად:"}
          </p>
          {(feedback.feedback.improveFocus?.originalSnippet || feedback.feedback.suggestions?.[0]?.before) && (
            <div className="mt-2 p-3 rounded-lg bg-[#FAF7F0] border border-[#E7E2D5]">
              <p className="text-xs text-[#5B6473]">შენი ორიგინალი:</p>
              <p className="text-sm text-[#1E2A44] mt-1 italic">
                "{feedback.feedback.improveFocus?.originalSnippet || feedback.feedback.suggestions?.[0]?.before}"
              </p>
            </div>
          )}
          {feedback.feedback.improveFocus?.hintKa && (
            <p className="ka text-xs text-[#5B6473] mt-2">💡 {feedback.feedback.improveFocus.hintKa}</p>
          )}
          <textarea
            value={improveText}
            onChange={(e) => setImproveText(e.target.value)}
            placeholder="Rewrite just this part..."
            className="mt-3 w-full min-h-[100px] p-3 rounded-lg border border-[#E7E2D5] text-sm text-[#1E2A44] outline-none focus:border-[#1E2A44] resize-y"
            disabled={!!improveAck}
          />

          {improveAck && (
            <div className="mt-3 p-3 rounded-lg bg-[#F0FDF9] border border-[#A7F3D0]">
              <p className="ka text-sm text-[#065F46]">✓ {improveAck.praiseKa}</p>
              {improveAck.polishedEn && (
                <p className="text-sm text-[#1E2A44] mt-2 italic">"{improveAck.polishedEn}"</p>
              )}
              {improveAck.tipKa && (
                <p className="ka text-[11px] text-[#5B6473] mt-2">💡 {improveAck.tipKa}</p>
              )}
            </div>
          )}
          {error && <p className="ka text-xs text-[#B91C1C] mt-2">{error}</p>}

          {!improveAck ? (
            <NavRow
              onBack={() => setStep("feedback")}
              onNext={submitImprove}
              nextLabel={loadingImprove ? "AI ფიქრობს..." : "გადახედვა →"}
              nextDisabled={!improveText.trim() || loadingImprove}
            />
          ) : (
            <NavRow
              onNext={() => setStep(hasBonus ? "bonus" : "vocab")}
              nextLabel={hasBonus ? "დამატებითი სცენარი →" : "დღევანდელი ფრაზები →"}
            />
          )}
        </BizCard>
      )}

      {step === "bonus" && session.bonusScenario && (
        <BizCard className="border-l-4 border-l-[#1E2A44]">
          <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">
            დამატებითი ვარჯიში · ბონუს
          </p>
          <div className="mt-2 p-3 rounded-lg bg-[#FFFBEA] border border-[#F2E6B0]">
            <p className="ka text-sm text-[#1E2A44] leading-relaxed">{session.bonusScenario.scenarioKa}</p>
          </div>
          <p className="ka text-sm font-semibold text-[#1E2A44] mt-3">{session.bonusScenario.promptKa}</p>
          {session.bonusScenario.hintsKa?.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {session.bonusScenario.hintsKa.map((h, i) => (
                <li key={i} className="ka text-xs text-[#5B6473]">• {h}</li>
              ))}
            </ul>
          )}
          <textarea
            value={bonusText}
            onChange={(e) => setBonusText(e.target.value)}
            placeholder="Write your email here in English..."
            className="mt-3 w-full min-h-[140px] p-3 rounded-lg border border-[#E7E2D5] text-sm text-[#1E2A44] outline-none focus:border-[#1E2A44] resize-y"
            disabled={bonusDone}
          />
          {bonusDone && (
            <p className="ka text-xs text-[#065F46] mt-2">✓ შენახულია — კარგი მუშაობა!</p>
          )}
          <NavRow
            onBack={() => setStep("improve")}
            onNext={() => {
              if (!bonusDone) setBonusDone(true);
              else setStep("vocab");
            }}
            nextLabel={bonusDone ? "დღევანდელი ფრაზები →" : "დასრულება →"}
            nextDisabled={!bonusDone && !bonusText.trim()}
          />
        </BizCard>
      )}

      {step === "vocab" && (
        <BizCard>
          <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">
            დღევანდელი ფრაზები · ავტომატურად ინახება შენს ლექსიკაში
          </p>
          <div className="mt-3 space-y-2">
            {session.vocabulary.map((v, i) => (
              <div key={i} className="p-3 rounded-lg bg-[#FAF7F0] border border-[#E7E2D5]">
                <p className="text-sm font-bold text-[#1E2A44]">{v.en}</p>
                <p className="ka text-xs text-[#5B6473]">{v.ka}</p>
                <p className="text-xs text-[#374151] mt-2 italic">"{v.exampleEn}"</p>
                <p className="ka text-[11px] text-[#5B6473]">{v.exampleKa}</p>
              </div>
            ))}
          </div>
          <NavRow onNext={completeSession} nextLabel="დასრულება ✓" />
        </BizCard>
      )}

      {step === "done" && (
        <div className="relative">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E2A44] via-[#1A2540] to-[#15203A] text-[#F7F1E3] p-7 shadow-[0_20px_50px_-20px_rgba(30,42,68,0.6)]">
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-[#C9A227]/20 blur-3xl pointer-events-none animate-[glow_3s_ease-in-out_infinite_alternate]" />
            <div className="absolute -bottom-20 -left-10 w-48 h-48 rounded-full bg-[#0F766E]/15 blur-3xl pointer-events-none" />
            <div className="relative text-center">
              <div className="mx-auto relative w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-[#C9A227]/15 animate-[ping_1.6s_ease-out_1]" />
                <div className="absolute inset-0 rounded-full border border-[#C9A227]/40" />
                <div className="absolute inset-1 rounded-full bg-gradient-to-br from-[#C9A227] to-[#A8861E] grid place-items-center shadow-[0_8px_24px_-6px_rgba(201,162,39,0.6)] animate-[pop_.55s_cubic-bezier(.2,.9,.3,1.3)]">
                  <svg viewBox="0 0 24 24" className="w-9 h-9 text-[#1E2A44]" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.5l4.5 4.5L19 7" style={{ strokeDasharray: 30, strokeDashoffset: 30, animation: "draw .55s .25s ease-out forwards" }} />
                  </svg>
                </div>
              </div>
              <p className="ka text-[11px] uppercase tracking-[0.18em] text-[#F2D680] font-semibold mt-5">
                შესრულებულია
              </p>
              <h2 className="ka text-2xl font-bold mt-1 leading-snug">
                დღევანდელი გაკვეთილი დასრულებულია
              </h2>
              <p className="ka text-sm text-[#F7F1E3]/75 mt-2">
                {labelFor(session.emailType)} · {session.dailyFocusKa}
              </p>
            </div>
          </div>

          <BizCard className="mt-4">
            <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">
              დღევანდელი შედეგი
            </p>
            <ul className="mt-3 space-y-2">
              <SumRow ok label={`სცენარი: ${session.practice.scenarioKa}`} />
              <SumRow ok label={`შენახულია ${savedCount || session.vocabulary.length} ფრაზა ლექსიკაში`} />
              <SumRow ok={!!improveAck} label={improveAck ? "გაუმჯობესების ნაბიჯი დასრულდა" : "გაუმჯობესების ნაბიჯი გამოტოვებული"} />
              {bonusDone && <SumRow ok label="ბონუს სცენარი დასრულდა" />}
            </ul>
          </BizCard>

          <BizCard className="mt-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">
                  საერთო პროგრესი
                </p>
                <p className="ka text-sm text-[#1E2A44] mt-1">
                  <b className="text-lg">{stats.total + 1}</b> სესია დასრულებული
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#1E2A44]">
                  {stats.vocab + (savedCount || session.vocabulary.length)}
                </div>
                <div className="ka text-[10px] text-[#5B6473]">სულ ფრაზა</div>
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-[#F0EBDD] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#C9A227] to-[#D8B547] transition-all duration-700"
                style={{ width: `${Math.min(100, (stats.total + 1) * 5)}%` }}
              />
            </div>
            <p className="ka text-[10px] text-[#5B6473] mt-2">20 სესია = 1 ეტაპის ნიშანი</p>
          </BizCard>

          <BizCard className="mt-3 bg-[#FFFBEA] border-[#F2E6B0]">
            <div className="flex items-start gap-3">
              <div className="text-xl">🌅</div>
              <div className="min-w-0">
                <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">
                  ხვალინდელი სესია
                </p>
                <p className="ka text-sm text-[#1E2A44] mt-1 leading-relaxed">
                  {session.tomorrowTeaseKa}
                </p>
              </div>
            </div>
          </BizCard>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <BizButton variant="outline" onClick={() => navigate("/vocabulary")}>
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
          `}</style>
        </div>
      )}
    </BusinessShell>
  );
}

function Header({
  step,
  session,
  isLight,
  hasBonus,
}: {
  step: Step;
  session: SessionData;
  isLight: boolean;
  hasBonus: boolean;
}) {
  const order: Step[] = ["focus"];
  if (!isLight && session.warmUp) order.push("warmup");
  order.push("learn", "example", "practice", "feedback", "improve");
  if (hasBonus) order.push("bonus");
  order.push("vocab", "done");
  const idx = Math.max(0, order.indexOf(step));
  const pct = ((idx + 1) / order.length) * 100;
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h1 className="ka text-xl font-bold text-[#1E2A44]">📨 იმეილები</h1>
        <span className="ka text-[11px] text-[#5B6473]">{labelFor(session.emailType)}</span>
      </div>
      <div className="h-1.5 w-full bg-[#E7E2D5] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#1E2A44] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function NavRow({
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="mt-5 flex items-center justify-between">
      {onBack ? (
        <BizButton variant="ghost" onClick={onBack}>← უკან</BizButton>
      ) : <span />}
      <BizButton onClick={onNext} disabled={nextDisabled}>{nextLabel}</BizButton>
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

function SumRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-start gap-2">
      <span
        className={`shrink-0 mt-0.5 w-5 h-5 rounded-full grid place-items-center text-[11px] font-bold ${
          ok ? "bg-[#0F766E]/15 text-[#0F766E]" : "bg-[#E7E2D5] text-[#5B6473]"
        }`}
      >
        {ok ? "✓" : "–"}
      </span>
      <span className="ka text-sm text-[#1E2A44] leading-snug">{label}</span>
    </li>
  );
}

const TYPE_LABELS: Record<string, string> = {
  follow_up: "Follow-up",
  request: "Request",
  introduction: "Introduction",
  complaint: "Complaint",
  update: "Update",
  thank_you: "Thank you",
  apology: "Apology",
  meeting_invite: "Meeting invite",
  proposal: "Proposal",
  reminder: "Reminder",
};
function labelFor(t: string) {
  return TYPE_LABELS[t] || t;
}
