import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SpeakingShell, { SoundBars } from "./components/SpeakingShell";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Clock, Target, Sparkles, ArrowRight, Mic } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SpeakButton from "@/components/SpeakButton";
import PhraseCard from "./components/PhraseCard";
import MicPlaceholder from "./components/MicPlaceholder";
import { DEFAULT_DAILY_LESSON, SUGGESTED_NEXT_TOPICS } from "./data";

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
};

const STEPS: { key: Step; label: string }[] = [
  { key: "topic", label: "თემა" },
  { key: "phrases", label: "ფრაზები" },
  { key: "repeat", label: "გამეორება" },
  { key: "conversation", label: "საუბარი" },
  { key: "review", label: "მიმოხილვა" },
];

export default function DailyLesson() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [level, setLevel] = useState("Beginner");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [step, setStep] = useState<Step>("topic");
  const [practiced, setPracticed] = useState<boolean[]>([]);
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
        .from("profiles").select("english_level").eq("id", user.id).maybeSingle();
      const lvl = prof?.english_level ?? "Beginner";
      setLevel(lvl);
      try {
        const r = await supabase.functions.invoke("ai-tutor", {
          body: { mode: "plan", level: lvl, recentTopics: [] },
        });
        const p = (r.data as any)?.plan as Plan | undefined;
        if (p && p.new_words?.length >= 3) {
          setPlan(p);
        } else {
          setPlan(DEFAULT_DAILY_LESSON as Plan);
        }
      } catch {
        setPlan(DEFAULT_DAILY_LESSON as Plan);
      }
      setPlanLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (plan) setPracticed(new Array(Math.min(3, plan.new_words.length)).fill(false));
  }, [plan]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const phrases = plan ? plan.new_words.slice(0, 3) : [];
  const isBeginner = /begin/i.test(level);

  const goConversation = async () => {
    if (!plan) return;
    setStep("conversation");
    setLoading(true);
    const seed: Msg[] = [{
      role: "user",
      content: `Begin a short guided speaking practice on topic "${plan.topic}". Ask me 2-3 short questions one at a time, starting with: "${plan.warmup_questions[0] ?? plan.practice_intro}". Keep your turns very short.`,
    }];
    const r = await supabase.functions.invoke("ai-tutor", {
      body: {
        messages: seed,
        level,
        coachMode: "speaking_lesson",
        lessonContext: { topic: plan.topic, new_words: plan.new_words },
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
        lessonContext: { topic: plan.topic, new_words: plan.new_words },
      },
    });
    setLoading(false);
    if (r.error || (r.data as any)?.error) {
      toast.error((r.data as any)?.error ?? "შეცდომა");
      return;
    }
    const reply = (r.data as any).reply as string;
    setMessages([...next, { role: "assistant", content: reply }]);
    // Detect a gentle correction in the form: Try: "..."
    const m = reply.match(/(?:Try|Type):\s*["“']([^"”']+)["”']/i);
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
          phrases_practiced: practiced.filter(Boolean).length,
          mistakes,
        } as any,
        completed: true,
        ended_at: new Date().toISOString(),
      });
    } catch (e: any) {
      toast.error(e.message ?? "ვერ შევინახე");
    } finally {
      setSaving(false);
    }
  };

  if (planLoading || !plan) {
    return (
      <SpeakingShell>
        <PageHeader title="დღევანდელი საუბრის გაკვეთილი" backTo="/path/speaking" />
        <p className="text-center py-12 sp-text-muted ka">გაკვეთილი მზადდება...</p>
      </SpeakingShell>
    );
  }

  const currentIdx = STEPS.findIndex((s) => s.key === step);

  return (
    <SpeakingShell>
      <PageHeader title="დღევანდელი საუბრის გაკვეთილი" backTo="/path/speaking" />
      <div className="space-y-4">
        {/* Coach header + progress */}
        <div className="sp-card p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] sp-text-muted ka">AI Speaking Coach</div>
            <div className="flex items-center gap-1 mt-1">
              {STEPS.map((s, i) => (
                <div key={s.key} className="flex-1 flex flex-col items-center gap-0.5" title={s.label}>
                  <div
                    className={`w-full h-1.5 rounded-full ${
                      i <= currentIdx
                        ? "bg-gradient-to-r from-purple-400 to-blue-400"
                        : "bg-white/10"
                    }`}
                  />
                  <span className={`text-[9px] ka ${i === currentIdx ? "sp-text" : "sp-text-muted"}`}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          <SoundBars />
        </div>

        {step === "topic" && (
          <>
            <div className="sp-card-glow p-5 relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-purple-500/25 blur-2xl" />
              <div className="text-xs font-semibold ka text-purple-200">დღევანდელი თემა</div>
              <h2 className="text-2xl font-extrabold mt-1 sp-text">{plan.title_en}</h2>
              <div className="text-base ka mt-1 sp-text-muted">{plan.title_ka}</div>
            </div>
            <div className="sp-card p-4 space-y-3">
              <Row icon={<Target className="w-4 h-4 text-teal-300" />} label="მიზანი" value={plan.goal_ka} />
              <Row
                icon={<Clock className="w-4 h-4 text-blue-300" />}
                label="ხანგრძლივობა"
                value={`${Math.max(5, Math.min(10, plan.estimated_minutes || 7))} წუთი`}
              />
              <Row icon={<Sparkles className="w-4 h-4 text-purple-300" />} label="დონე" value={level} />
            </div>
            <button
              onClick={() => setStep("phrases")}
              className="sp-btn-primary w-full inline-flex items-center justify-center gap-2 rounded-2xl h-14 text-base font-bold ka"
            >
              დაწყება <ArrowRight className="w-5 h-5" />
            </button>
          </>
        )}

        {step === "phrases" && (
          <>
            <h2 className="text-xl font-extrabold ka sp-text">სასარგებლო ფრაზები</h2>
            <p className="text-sm sp-text-muted ka">მოუსმინე და დაიმახსოვრე.</p>
            <div className="space-y-3">
              {phrases.map((w, i) => (
                <PhraseCard
                  key={i}
                  english={w.english_word}
                  georgian={w.georgian_meaning}
                  example={w.example_sentence}
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
            <h2 className="text-xl font-extrabold ka sp-text">გაიმეორე ხმამაღლა</h2>
            <p className="text-sm sp-text-muted ka">დააჭირე 🔊-ს, მოუსმინე და გაიმეორე ხმამაღლა.</p>
            <div><MicPlaceholder /></div>
            <div className="space-y-3">
              {phrases.map((w, i) => (
                <PhraseCard
                  key={i}
                  english={w.english_word}
                  georgian={w.georgian_meaning}
                  example={w.example_sentence}
                  practiced={practiced[i]}
                  onPracticed={() => {
                    const next = [...practiced];
                    next[i] = !next[i];
                    setPracticed(next);
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
            <div className="sp-card p-3 mb-3">
              <p className="text-xs ka sp-text">
                {isBeginner ? (
                  <>უპასუხე მარტივად ინგლისურად. AI გასწორებს ნაზად 😊</>
                ) : (
                  <>Answer naturally in English. Try to use the phrases you learned.</>
                )}
              </p>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] px-4 py-2 rounded-2xl ${
                    m.role === "user"
                      ? "sp-btn-primary"
                      : "sp-card"
                  }`}>
                    <div className="text-sm whitespace-pre-wrap break-words">{m.content}</div>
                    {m.role === "assistant" && <div className="mt-1"><SpeakButton text={m.content} /></div>}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="px-4 py-2 rounded-2xl sp-card">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-purple-300 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: "100ms" }} />
                      <span className="w-1.5 h-1.5 bg-teal-300 rounded-full animate-bounce" style={{ animationDelay: "200ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="pt-3 space-y-2">
              <div className="flex items-end gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
                  }}
                  rows={1}
                  placeholder={isBeginner ? "მარტივად ინგლისურად..." : "Type your answer..."}
                  className="resize-none bg-white/95 text-foreground"
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
                  className="ka sp-text hover:bg-white/10"
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
            <div className="sp-card-glow p-5 relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-teal-400/25 blur-2xl" />
              <div className="text-3xl">🎉</div>
              <h2 className="text-xl font-extrabold ka mt-2 sp-text">მშვენიერი ვარჯიში!</h2>
              <p className="text-sm ka mt-1 sp-text-muted">
                შენ მოახერხე დღევანდელი გაკვეთილი თემაზე "{plan.title_ka}". განაგრძე ყოველდღე —
                ცოტ-ცოტა ყოველთვის უფრო ეფექტურია, ვიდრე ბევრი ერთჯერ.
              </p>
            </div>

            <div className="sp-card p-4 space-y-2">
              <div className="font-bold ka sp-text">გავარჯიშებული ფრაზები</div>
              <div className="text-sm sp-text">
                {practiced.filter(Boolean).length} / {phrases.length}
              </div>
              <ul className="text-sm space-y-1">
                {phrases.map((w, i) => (
                  <li key={i} className={practiced[i] ? "sp-text" : "sp-text-muted"}>
                    {practiced[i] ? "✅" : "⚪"} {w.english_word}
                  </li>
                ))}
              </ul>
            </div>

            <div className="sp-card p-4 space-y-2">
              <div className="font-bold ka sp-text">გასწორებული შეცდომები</div>
              {mistakes.length === 0 ? (
                <div className="text-sm sp-text-muted ka">ამ გაკვეთილზე შეცდომები არ დაფიქსირებულა 👏</div>
              ) : (
                <ul className="text-sm space-y-2">
                  {mistakes.map((m, i) => (
                    <li key={i}>
                      <div className="line-through sp-text-muted">{m.original}</div>
                      <div className="font-semibold sp-text">→ {m.corrected}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="sp-card p-4 space-y-2">
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
              {saving ? "ვინახავ..." : "დაბრუნება საუბრის გვერდზე"}
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
