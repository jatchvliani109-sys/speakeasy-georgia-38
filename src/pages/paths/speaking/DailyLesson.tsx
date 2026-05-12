import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SpeakingShell from "./components/SpeakingShell";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Clock, Target, Sparkles, ArrowRight, Mic, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SpeakButton from "@/components/SpeakButton";
import PhraseCard from "./components/PhraseCard";
import MicPlaceholder from "./components/MicPlaceholder";
import { DEFAULT_DAILY_LESSON, SUGGESTED_NEXT_TOPICS, pickDailyTopic } from "./data";

type Step = "topic" | "phrases" | "repeat" | "conversation" | "review";
type Msg = { role: "user" | "assistant"; content: string };

type Plan = {
  title_en: string;
  title_ka: string;
  goal_ka: string;
  topic: string;
  estimated_minutes: number;
  warmup_questions: string[];
  new_words: { english_word: string; georgian_meaning: string; example_sentence: string }[];
  practice_intro: string;
  scenario_ka?: string;
  user_role_ka?: string;
  ai_role_ka?: string;
};

const STEPS: { key: Step; label: string }[] = [
  { key: "topic", label: "თემა" },
  { key: "phrases", label: "ფრაზები" },
  { key: "repeat", label: "გამეორება" },
  { key: "conversation", label: "საუბარი" },
  { key: "review", label: "მიმოხილვა" },
];

const LEVEL_LABEL_KA: Record<string, string> = {
  Beginner: "დამწყები",
  Elementary: "საშუალო-დამწყები",
  Intermediate: "საშუალო",
  Advanced: "მაღალი",
};

// Parse a trailing OPTIONS: [...] or STARTERS: [...] block out of an AI reply.
function extractChips(reply: string): { clean: string; options: string[]; starters: string[] } {
  let clean = reply;
  let options: string[] = [];
  let starters: string[] = [];
  const optMatch = clean.match(/^\s*OPTIONS:\s*(\[[\s\S]*?\])\s*$/m);
  if (optMatch) {
    try {
      const arr = JSON.parse(optMatch[1]);
      if (Array.isArray(arr)) options = arr.map(String).slice(0, 4);
    } catch {}
    clean = clean.replace(optMatch[0], "").trim();
  }
  const startMatch = clean.match(/^\s*STARTERS:\s*(\[[\s\S]*?\])\s*$/m);
  if (startMatch) {
    try {
      const arr = JSON.parse(startMatch[1]);
      if (Array.isArray(arr)) starters = arr.map(String).slice(0, 4);
    } catch {}
    clean = clean.replace(startMatch[0], "").trim();
  }
  return { clean, options, starters };
}

export default function DailyLesson() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [level, setLevel] = useState("Beginner");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [step, setStep] = useState<Step>("topic");
  const [practicedPhrases, setPracticedPhrases] = useState<boolean[]>([]);
  const [practicedRepeat, setPracticedRepeat] = useState<boolean[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mistakes, setMistakes] = useState<{ original: string; corrected: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("english_level")
        .eq("id", user.id)
        .maybeSingle();
      const lvl = prof?.english_level ?? "Beginner";
      setLevel(lvl);

      // Pull recent speaking lesson topics to avoid repetition
      const { data: recent } = await supabase
        .from("lessons")
        .select("level, summary, created_at")
        .eq("user_id", user.id)
        .eq("completed", true)
        .order("created_at", { ascending: false })
        .limit(10);
      const recentTopics = (recent ?? [])
        .filter((r) => (r.level ?? "").startsWith("speaking") && !(r.level ?? "").includes("roleplay"))
        .map((r) => (r.summary as any)?.plan?.topic)
        .filter(Boolean) as string[];

      const suggestedTopic = pickDailyTopic(lvl, recentTopics);

      try {
        const r = await supabase.functions.invoke("ai-tutor", {
          body: { mode: "plan", level: lvl, recentTopics, suggestedTopic },
        });
        const p = (r.data as any)?.plan as Plan | undefined;
        if (p && p.new_words?.length >= 3) {
          setPlan(p);
        } else {
          setPlan({ ...DEFAULT_DAILY_LESSON, topic: suggestedTopic } as Plan);
        }
      } catch {
        setPlan({ ...DEFAULT_DAILY_LESSON, topic: suggestedTopic } as Plan);
      }
      setPlanLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (plan) {
      const n = Math.min(3, plan.new_words.length);
      setPracticedPhrases(new Array(n).fill(false));
      setPracticedRepeat(new Array(n).fill(false));
    }
  }, [plan]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const phrases = plan ? plan.new_words.slice(0, 3) : [];
  const isBeginner = /begin/i.test(level);
  const isElementary = /element|pre/i.test(level);

  const lastAssistant = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i];
    }
    return null;
  }, [messages]);

  const lastChips = useMemo(() => {
    if (!lastAssistant) return { options: [] as string[], starters: [] as string[] };
    const { options, starters } = extractChips(lastAssistant.content);
    return { options, starters };
  }, [lastAssistant]);

  const goConversation = async () => {
    if (!plan) return;
    setStep("conversation");
    setLoading(true);
    const seed: Msg[] = [
      {
        role: "user",
        content: `Begin a short guided speaking practice on topic "${plan.topic}". Scenario: ${plan.scenario_ka ?? "—"}. I am the ${plan.user_role_ka ?? "student"}. You are the ${plan.ai_role_ka ?? "coach"}. Ask me a short question to start, like: "${plan.warmup_questions?.[0] ?? plan.practice_intro}". Keep your turns very short.`,
      },
    ];
    const r = await supabase.functions.invoke("ai-tutor", {
      body: {
        messages: seed,
        level,
        coachMode: "speaking_lesson",
        lessonContext: { topic: plan.topic, new_words: plan.new_words, scenario: plan.scenario_ka, user_role: plan.user_role_ka, ai_role: plan.ai_role_ka },
      },
    });
    setLoading(false);
    if (r.error || (r.data as any)?.error) {
      toast.error((r.data as any)?.error ?? "შეცდომა");
      return;
    }
    setMessages([{ role: "assistant", content: (r.data as any).reply as string }]);
  };

  const send = async (text: string) => {
    if (!text.trim() || loading || !plan) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    const r = await supabase.functions.invoke("ai-tutor", {
      body: {
        messages: next,
        level,
        coachMode: "speaking_lesson",
        lessonContext: { topic: plan.topic, new_words: plan.new_words, scenario: plan.scenario_ka, user_role: plan.user_role_ka, ai_role: plan.ai_role_ka },
      },
    });
    setLoading(false);
    if (r.error || (r.data as any)?.error) {
      toast.error((r.data as any)?.error ?? "შეცდომა");
      return;
    }
    const reply = (r.data as any).reply as string;
    setMessages([...next, { role: "assistant", content: reply }]);
    // Detect a gentle correction: "Better:" or "Try:" "<...>"
    const m = reply.match(/(?:Better|Try|Type):\s*["“']([^"”']+)["”']/i);
    if (m) {
      setMistakes((prev) => [...prev, { original: text, corrected: m[1] }]);
    }
  };

  const goReview = async () => {
    setStep("review");
    if (!user || !plan) return;
    setSaving(true);
    try {
      await supabase.from("lessons").insert({
        user_id: user.id,
        level: `speaking:${(level || "Beginner").toLowerCase()}`,
        messages: messages as any,
        summary: {
          plan: { title_ka: plan.title_ka, topic: plan.topic },
          phrases_practiced: practicedRepeat.filter(Boolean).length,
          mistakes,
        } as any,
        completed: true,
        ended_at: new Date().toISOString(),
      });
      // Persist mistakes to the mistakes table for Speaking Progress
      if (mistakes.length) {
        const rows = mistakes.map((m) => ({
          user_id: user.id,
          original_sentence: m.original,
          corrected_sentence: m.corrected,
          tag: "speaking",
        }));
        try {
          await supabase.from("mistakes").insert(rows);
        } catch {}
      }
    } catch (e: any) {
      toast.error(e.message ?? "ვერ შევინახე");
    } finally {
      setSaving(false);
    }
  };

  if (planLoading || !plan) {
    return (
      <SpeakingShell>
        <PageHeader title="დღევანდელი საუბრის მისია" backTo="/path/speaking" />
        <p className="text-center py-12 sp-text-muted ka">მისია მზადდება...</p>
      </SpeakingShell>
    );
  }

  const currentIdx = STEPS.findIndex((s) => s.key === step);
  const bestCorrection = mistakes[mistakes.length - 1];

  return (
    <SpeakingShell>
      <PageHeader title="დღევანდელი საუბრის მისია" backTo="/path/speaking" />
      <div className="space-y-5 max-w-3xl mx-auto">
        {/* Coach header + progress */}
        <div className="sp-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl sp-chip-teal flex items-center justify-center shrink-0">
            <Mic className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wider ka" style={{ color: "hsl(175 70% 28%)" }}>
              საუბრის მწვრთნელი
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              {STEPS.map((s, i) => (
                <div key={s.key} className="flex-1 flex flex-col items-center gap-1" title={s.label}>
                  <div
                    className={`w-full h-1 rounded-full ${
                      i <= currentIdx ? "bg-[hsl(175_70%_38%)]" : "bg-[hsl(220_22%_90%)]"
                    }`}
                  />
                  <span className={`text-[9px] ka font-medium ${i === currentIdx ? "sp-text" : "sp-text-soft"}`}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {step === "topic" && (
          <>
            <div className="sp-card-hero p-5 sm:p-6">
              <div className="text-[11px] font-bold uppercase tracking-wider ka text-[hsl(175_60%_75%)]">
                დღევანდელი თემა
              </div>
              <h2 className="text-2xl font-extrabold mt-2 sp-text leading-snug">{plan.title_en}</h2>
              <div className="text-base ka mt-1.5 sp-text-muted">{plan.title_ka}</div>
            </div>
            <div className="sp-card p-5 space-y-3">
              <Row icon={<Target className="w-4 h-4" style={{ color: "hsl(175 70% 38%)" }} />} label="მიზანი" value={plan.goal_ka} />
              <Row
                icon={<Clock className="w-4 h-4" style={{ color: "hsl(210 70% 45%)" }} />}
                label="ხანგრძლივობა"
                value={`${Math.max(5, Math.min(10, plan.estimated_minutes || 7))} წუთი`}
              />
              <Row
                icon={<Sparkles className="w-4 h-4" style={{ color: "hsl(220 50% 30%)" }} />}
                label="დონე"
                value={LEVEL_LABEL_KA[level] ?? level}
              />
            </div>
            <button
              onClick={() => setStep("phrases")}
              className="sp-btn-primary w-full inline-flex items-center justify-center gap-2 rounded-2xl h-14 text-base font-bold ka"
            >
              გაკვეთილის დაწყება <ArrowRight className="w-5 h-5" />
            </button>
          </>
        )}

        {step === "phrases" && (
          <>
            <h2 className="text-xl font-extrabold ka sp-text">სასარგებლო ფრაზები</h2>
            <p className="text-sm sp-text-muted ka">
              მოუსმინე, გაიცანი მნიშვნელობა და დააჭირე "გავიმეორე" როცა მზად ხარ.
            </p>
            <div className="space-y-3">
              {phrases.map((w, i) => (
                <PhraseCard
                  key={i}
                  english={w.english_word}
                  georgian={w.georgian_meaning}
                  example={w.example_sentence}
                  practiced={practicedPhrases[i]}
                  onPracticed={() => {
                    const next = [...practicedPhrases];
                    next[i] = !next[i];
                    setPracticedPhrases(next);
                  }}
                />
              ))}
            </div>
            <button
              onClick={() => setStep("repeat")}
              className="sp-btn-primary w-full inline-flex items-center justify-center gap-2 rounded-2xl h-12 text-base font-bold ka"
            >
              გამეორების ვარჯიში →
            </button>
          </>
        )}

        {step === "repeat" && (
          <>
            <h2 className="text-xl font-extrabold ka sp-text">მოუსმინე და გაიმეორე</h2>
            <p className="text-sm sp-text-muted ka">დააჭირე 🔊-ს, მოუსმინე და გაიმეორე ხმამაღლა.</p>
            <div><MicPlaceholder /></div>
            <div className="space-y-3">
              {phrases.map((w, i) => (
                <PhraseCard
                  key={i}
                  english={w.english_word}
                  georgian={w.georgian_meaning}
                  example={w.example_sentence}
                  practiced={practicedRepeat[i]}
                  onPracticed={() => {
                    const next = [...practicedRepeat];
                    next[i] = !next[i];
                    setPracticedRepeat(next);
                  }}
                  showRepeatHints
                />
              ))}
            </div>
            <button
              onClick={goConversation}
              className="sp-btn-primary w-full inline-flex items-center justify-center gap-2 rounded-2xl h-12 text-base font-bold ka"
            >
              საუბარზე გადასვლა →
            </button>
          </>
        )}

        {step === "conversation" && (
          <div className="flex flex-col h-[calc(100vh-15rem)]">
            {/* Scenario setup card */}
            <div className="sp-card p-4 mb-3">
              <div className="flex items-start gap-2.5">
                <div className="w-9 h-9 rounded-lg sp-chip-teal flex items-center justify-center shrink-0">
                  <Users className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider ka" style={{ color: "hsl(175 70% 28%)" }}>
                    სცენარი
                  </div>
                  {plan.scenario_ka && (
                    <div className="text-sm ka sp-text mt-0.5">{plan.scenario_ka}</div>
                  )}
                  {(plan.user_role_ka || plan.ai_role_ka) && (
                    <div className="text-xs ka sp-text-muted mt-1">
                      {plan.user_role_ka && <><span className="font-semibold">შენ:</span> {plan.user_role_ka}</>}
                      {plan.user_role_ka && plan.ai_role_ka && " · "}
                      {plan.ai_role_ka && <><span className="font-semibold">AI:</span> {plan.ai_role_ka}</>}
                    </div>
                  )}
                  <div className="text-xs ka mt-2 sp-text-muted">
                    {isBeginner
                      ? "აირჩიე პასუხი ან დაწერე შენი პასუხი."
                      : isElementary
                      ? "გამოიყენე დასაწყისები ან დაწერე საკუთარი პასუხი."
                      : "Answer naturally in English. Try to use the new phrases."}
                  </div>
                </div>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
              {messages.map((m, i) => {
                const display = m.role === "assistant" ? extractChips(m.content).clean : m.content;
                return (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] px-4 py-2 rounded-2xl ${
                        m.role === "user" ? "sp-btn-primary" : "sp-card"
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap break-words">{display}</div>
                      {m.role === "assistant" && (
                        <div className="mt-1">
                          <SpeakButton text={display} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {loading && (
                <div className="flex justify-start">
                  <div className="px-4 py-2 rounded-2xl sp-card">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "hsl(220 50% 30%)" }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "hsl(175 70% 38%)", animationDelay: "100ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "hsl(210 70% 45%)", animationDelay: "200ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 space-y-2">
              {/* Beginner: full answer chips, click to send */}
              {isBeginner && lastChips.options.length > 0 && !loading && (
                <div className="flex flex-wrap gap-2">
                  {lastChips.options.map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => send(o)}
                      className="sp-chip px-3 py-1.5 rounded-full text-xs hover:bg-[hsl(40_40%_92%)] transition-colors"
                    >
                      {o}
                    </button>
                  ))}
                </div>
              )}
              {/* Elementary: sentence starters, click to fill input */}
              {isElementary && lastChips.starters.length > 0 && !loading && (
                <div className="flex flex-wrap gap-2">
                  {lastChips.starters.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setInput(s)}
                      className="sp-chip px-3 py-1.5 rounded-full text-xs hover:bg-[hsl(40_40%_92%)] transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  rows={1}
                  placeholder={isBeginner ? "მარტივად ინგლისურად..." : "Type your answer..."}
                  className="resize-none bg-white text-foreground border-[hsl(220_22%_88%)]"
                  disabled={loading}
                />
                <button
                  onClick={() => send(input)}
                  disabled={!input.trim() || loading}
                  className="sp-btn-primary h-12 w-12 inline-flex items-center justify-center rounded-2xl disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <MicPlaceholder />
                <Button
                  variant="ghost"
                  size="sm"
                  className="ka sp-text hover:bg-[hsl(40_40%_94%)]"
                  onClick={goReview}
                  disabled={messages.length < 2}
                >
                  მიმოხილვაზე გადასვლა →
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "review" && (
          <>
            <div className="sp-card-hero p-5 sm:p-6">
              <div className="text-2xl">🎉</div>
              <h2 className="text-xl font-extrabold ka mt-2 sp-text">მისია დასრულდა!</h2>
              <p className="text-sm ka mt-1.5 sp-text-muted">
                შენ მოახერხე დღევანდელი მისია თემაზე "{plan.title_ka}". განაგრძე ყოველდღე —
                ცოტ-ცოტა ყოველთვის უფრო ეფექტურია, ვიდრე ბევრი ერთჯერ.
              </p>
            </div>

            <div className="sp-card p-5 space-y-2">
              <div className="font-bold ka sp-text">თემა</div>
              <div className="text-sm sp-text">📌 {plan.title_ka}</div>
            </div>

            <div className="sp-card p-5 space-y-2">
              <div className="font-bold ka sp-text">გავარჯიშებული ფრაზები</div>
              <div className="text-sm sp-text">
                {practicedRepeat.filter(Boolean).length} / {phrases.length}
              </div>
              <ul className="text-sm space-y-1 mt-1">
                {phrases.map((w, i) => (
                  <li key={i} className={practicedRepeat[i] ? "sp-text" : "sp-text-soft"}>
                    {practicedRepeat[i] ? "✅" : "⚪"} {w.english_word}
                  </li>
                ))}
              </ul>
            </div>

            <div className="sp-card p-5 space-y-2">
              <div className="font-bold ka sp-text">ახალი სიტყვები / ფრაზები</div>
              <ul className="text-sm space-y-1">
                {phrases.map((w, i) => (
                  <li key={i} className="sp-text">
                    <span className="font-semibold">{w.english_word}</span>{" "}
                    <span className="sp-text-muted ka">— {w.georgian_meaning}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="sp-card p-5 space-y-2">
              <div className="font-bold ka sp-text">გასწორებული შეცდომები</div>
              {mistakes.length === 0 ? (
                <div className="text-sm sp-text-muted ka">ამ გაკვეთილზე შეცდომები არ დაფიქსირებულა 👏</div>
              ) : (
                <ul className="text-sm space-y-2">
                  {mistakes.map((m, i) => (
                    <li key={i}>
                      <div className="line-through sp-text-soft">{m.original}</div>
                      <div className="font-semibold sp-text">→ {m.corrected}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {bestCorrection && (
              <div className="sp-card-hero p-5">
                <div className="text-[11px] font-bold uppercase tracking-wider ka text-[hsl(175_60%_75%)]">
                  ⭐ საუკეთესო გასწორება
                </div>
                <div className="text-base font-bold mt-2 sp-text">"{bestCorrection.corrected}"</div>
                <div className="text-xs sp-text-muted mt-1">შენი ვერსია: "{bestCorrection.original}"</div>
              </div>
            )}

            <div className="sp-card p-5 space-y-2">
              <div className="font-bold ka sp-text">შემდეგი თემა</div>
              <div className="text-sm sp-text">
                💡 {SUGGESTED_NEXT_TOPICS[Math.floor(Math.random() * SUGGESTED_NEXT_TOPICS.length)]}
              </div>
            </div>

            <button
              onClick={() => navigate("/path/speaking")}
              disabled={saving}
              className="sp-btn-primary w-full inline-flex items-center justify-center gap-2 rounded-2xl h-14 text-base font-bold ka disabled:opacity-60"
            >
              {saving ? "ვინახავ..." : "დასრულება"}
            </button>
          </>
        )}
      </div>
    </SpeakingShell>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs sp-text-muted ka">{label}</div>
        <div className="font-semibold ka break-words sp-text">{value}</div>
      </div>
    </div>
  );
}
