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
type Vocab = { en: string; ka: string; exampleEn: string; exampleKa: string };
type SessionData = {
  emailType: string;
  scenarioKey: string;
  dailyFocusKa: string;
  estimatedMinutes: number;
  learn: { titleKa: string; explanationKa: string; examples: Example[] };
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
  vocabulary: Vocab[];
  tomorrowTeaseKa: string;
};

type Feedback = {
  inCharacter: { subject: string; body: string };
  feedback: {
    summaryKa: string;
    worked: string[];
    improve: string[];
    suggestions: { before: string; after: string; whyKa: string }[];
    rewriteEn: string;
  };
};

type Step = "loading" | "focus" | "learn" | "example" | "practice" | "feedback" | "vocab" | "done";

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

  // Load state + generate session
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const cur = await pullBusinessFromSupabase(user.id);
        if (cancelled) return;
        setBiz(cur);

        // Load recent sessions to avoid repeats + stats
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

        // Persist draft session row
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

  async function completeSession() {
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

  return (
    <BusinessShell back={{ to: "/path/business/home", label: "ბიზნეს ინგლისური" }}>
      <Header step={step} session={session} />

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
            <BizButton onClick={() => setStep("learn")}>დაწყება →</BizButton>
          </div>
        </BizCard>
      )}

      {step === "learn" && (
        <BizCard>
          <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">
            1 / 4 · სწავლა
          </p>
          <h3 className="ka text-lg font-bold text-[#1E2A44] mt-1">{session.learn.titleKa}</h3>
          <p className="ka text-sm text-[#374151] mt-2 leading-relaxed">{session.learn.explanationKa}</p>
          <div className="mt-4 space-y-2">
            {session.learn.examples.map((ex, i) => (
              <div key={i} className="p-3 rounded-lg bg-[#FAF7F0] border border-[#E7E2D5]">
                <p className="text-sm text-[#1E2A44]">{ex.en}</p>
                <p className="ka text-xs text-[#5B6473] mt-0.5">{ex.ka}</p>
                {ex.noteKa && <p className="ka text-[11px] text-[#C9A227] mt-1">💡 {ex.noteKa}</p>}
              </div>
            ))}
          </div>
          <NavRow onNext={() => setStep("example")} nextLabel="რეალური მაგალითი →" />
        </BizCard>
      )}

      {step === "example" && (
        <BizCard>
          <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">
            2 / 4 · რეალური მაგალითი
          </p>
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
          <NavRow onBack={() => setStep("learn")} onNext={() => setStep("practice")} nextLabel="ვარჯიში →" />
        </BizCard>
      )}

      {step === "practice" && (
        <BizCard>
          <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">
            3 / 4 · ვარჯიში
          </p>
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
              4 / 4 · პასუხი {session.practice.recipientRole}-დან
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
            <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">
              AI feedback
            </p>
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

            <NavRow onNext={() => setStep("vocab")} nextLabel="ლექსიკა →" />
          </BizCard>
        </div>
      )}

      {step === "vocab" && (
        <BizCard>
          <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">
            ლექსიკა · დღევანდელი ფრაზები
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
        <BizCard className="text-center border-l-4 border-l-[#0F766E]">
          <div className="mx-auto w-14 h-14 rounded-full bg-[#0F766E]/10 grid place-items-center text-[#0F766E] text-2xl animate-[pop_.5s_ease-out]">
            ✓
          </div>
          <h2 className="ka text-xl font-bold text-[#1E2A44] mt-3">სესია დასრულდა</h2>
          <p className="ka text-sm text-[#5B6473] mt-2">
            დღეს ივარჯიშე <b className="text-[#1E2A44]">{labelFor(session.emailType)}</b> იმეილზე და ისწავლე {session.vocabulary.length} ფრაზა.
          </p>
          <div className="grid grid-cols-2 gap-2 mt-4 text-left">
            <Stat label="სულ იმეილი" value={String(stats.total + 1)} />
            <Stat label="ნასწავლი ფრაზა" value={String(stats.vocab + session.vocabulary.length)} />
          </div>
          <div className="mt-4 p-3 rounded-lg bg-[#FFFBEA] border border-[#F2E6B0] text-left">
            <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">ხვალ</p>
            <p className="ka text-sm text-[#1E2A44] mt-1">{session.tomorrowTeaseKa}</p>
          </div>
          <div className="mt-5 flex gap-2 justify-center">
            <BizButton variant="outline" onClick={() => navigate("/path/business/home")}>დაშბორდი</BizButton>
            <BizButton onClick={() => window.location.reload()}>ახალი სესია</BizButton>
          </div>
          <style>{`@keyframes pop { 0%{transform:scale(.5);opacity:0} 100%{transform:scale(1);opacity:1} }`}</style>
        </BizCard>
      )}
    </BusinessShell>
  );
}

function Header({ step, session }: { step: Step; session: SessionData }) {
  const order: Step[] = ["focus", "learn", "example", "practice", "feedback", "vocab", "done"];
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
