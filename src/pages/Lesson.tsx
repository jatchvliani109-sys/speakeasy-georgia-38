import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mic, Send, Square, Sparkles, BookOpen, MessageCircle, ClipboardCheck, Clock, Target, ListChecks, Check, X } from "lucide-react";
import SpeakButton from "@/components/SpeakButton";

type Msg = { role: "user" | "assistant"; content: string };
type Stage = "intro" | "warmup" | "words" | "activities" | "practice" | "review";

type Activity = {
  type: "choose_meaning" | "fill_blank" | "pick_correct";
  question_ka: string;
  options: string[];
  correct_index: number;
  explanation_ka: string;
};

type Plan = {
  title_en: string;
  title_ka: string;
  goal_ka: string;
  topic: string;
  estimated_minutes: number;
  warmup_questions: string[];
  new_words: { english_word: string; georgian_meaning: string; example_sentence: string }[];
  practice_intro: string;
  activities?: Activity[];
};

const STAGES: { key: Stage; label: string; icon: any }[] = [
  { key: "warmup", label: "გახურება", icon: Sparkles },
  { key: "words", label: "სიტყვები", icon: BookOpen },
  { key: "activities", label: "ვარჯიში", icon: ListChecks },
  { key: "practice", label: "საუბარი", icon: MessageCircle },
  { key: "review", label: "მიმოხილვა", icon: ClipboardCheck },
];

const TOPIC_POOL: Record<string, string[]> = {
  Beginner: ["Introductions", "School", "Family", "Food", "Daily routine", "Hobbies", "Weather", "Shopping", "Colors", "Animals"],
  Elementary: ["Weekend plans", "Describing people", "Ordering food", "Travel basics", "Daily schedule", "Asking for help", "My city", "Free time"],
  Intermediate: ["Opinions", "Storytelling", "Job interview", "Problem solving", "Travel situations", "Explaining preferences", "Movies & books"],
  Advanced: ["Debate", "Professional conversation", "Presenting ideas", "Interview practice", "Cultural discussion", "Current events"],
};

function pickTopic(level: string, recent: string[]): string {
  const pool = TOPIC_POOL[level] ?? TOPIC_POOL.Beginner;
  const fresh = pool.filter((t) => !recent.slice(0, 3).map((r) => r.toLowerCase()).includes(t.toLowerCase()));
  const list = fresh.length ? fresh : pool;
  return list[Math.floor(Math.random() * list.length)];
}

export default function Lesson() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [level, setLevel] = useState("Beginner");
  const [stage, setStage] = useState<Stage>("intro");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ending, setEnding] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("english_level").eq("id", user.id).maybeSingle();
      const lvl = prof?.english_level ?? "Beginner";
      setLevel(lvl);
      // recent topics for rotation
      const { data: recent } = await supabase
        .from("lessons").select("summary").eq("user_id", user.id).eq("completed", true)
        .order("created_at", { ascending: false }).limit(5);
      const recentTopics = (recent ?? [])
        .map((l: any) => l?.summary?.plan?.topic).filter(Boolean) as string[];
      const suggestedTopic = pickTopic(lvl, recentTopics);

      const r = await supabase.functions.invoke("ai-tutor", {
        body: { mode: "plan", level: lvl, recentTopics, suggestedTopic },
      });
      setPlanLoading(false);
      if (r.error || (r.data as any)?.error) { toast.error("ვერ შევქმენი გაკვეთილი"); return; }
      const p = (r.data as any).plan as Plan;
      if (!p?.topic) p.topic = suggestedTopic;
      setPlan(p);
    })();
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const askAI = async (next: Msg[], activeStage: Stage) => {
    setLoading(true);
    const r = await supabase.functions.invoke("ai-tutor", {
      body: { messages: next, level, stage: activeStage, lessonContext: plan },
    });
    setLoading(false);
    if (r.error || (r.data as any).error) { toast.error((r.data as any)?.error ?? "შეცდომა"); return null; }
    const reply = (r.data as any).reply as string;
    setMessages([...next, { role: "assistant", content: reply }]);
    return reply;
  };

  const startLesson = async () => {
    if (!plan) return;
    setStage("warmup");
    const seed: Msg[] = [{
      role: "user",
      content: `Today's topic is "${plan.topic}". Begin the warm-up. Use these questions in order: ${plan.warmup_questions.map((q, i) => `(${i + 1}) ${q}`).join(" ")}. Greet me briefly, then ask the first one. Do NOT ask "what is your name" unless the topic is Introductions.`,
    }];
    await askAI(seed, "warmup");
    setMessages((curr) => curr.filter((m) => m !== seed[0]));
  };

  const goToWords = () => setStage("words");
  const goToActivities = () => setStage("activities");

  const startPractice = async () => {
    setStage("practice");
    const seed: Msg[] = [{
      role: "user",
      content: `Start the speaking practice now for topic "${plan?.topic}". Begin with: "${plan?.practice_intro}". Ask one short question at a time. Encourage me to use the new words.`,
    }];
    setMessages([]);
    await askAI(seed, "practice");
    setMessages((curr) => curr.filter((m) => m !== seed[0]));
  };

  const send = async (text: string) => {
    if (!text.trim() || stage !== "practice") return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    await askAI(next, "practice");
  };

  const finishLesson = async () => {
    if (!user || !plan) return;
    setEnding(true);
    setStage("review");
    try {
      const r = await supabase.functions.invoke("ai-tutor", { body: { messages, level, mode: "summary" } });
      if (r.error || (r.data as any).error) throw new Error((r.data as any)?.error ?? "Summary failed");
      const summary = { ...(r.data as any).summary, plan };
      const planWords = (plan.new_words || []).map((w) => ({ ...w, difficulty: "easy" }));
      summary.new_words = [...planWords, ...(summary.new_words || [])];

      const { data: lesson } = await supabase.from("lessons").insert({
        user_id: user.id, level, messages: messages as any, summary, completed: true, ended_at: new Date().toISOString(),
      }).select().single();

      if (lesson) {
        if (summary.new_words?.length) {
          await supabase.from("vocabulary").insert(summary.new_words.map((w: any) => ({
            user_id: user.id, lesson_id: lesson.id,
            english_word: w.english_word, georgian_meaning: w.georgian_meaning,
            example_sentence: w.example_sentence, difficulty: w.difficulty ?? "easy",
          })));
        }
        if (summary.mistakes?.length) {
          await supabase.from("mistakes").insert(summary.mistakes.map((m: any) => ({
            user_id: user.id, lesson_id: lesson.id,
            original_sentence: m.original_sentence, corrected_sentence: m.corrected_sentence,
            explanation_ka: m.explanation_ka, tag: m.tag ?? "grammar",
          })));
        }
      }
      // update streak + last_activity
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().slice(0, 10);
      const { data: prof } = await supabase.from("profiles").select("streak, last_activity").eq("id", user.id).maybeSingle();
      let newStreak = 1;
      if (prof?.last_activity) {
        const last = new Date(prof.last_activity); last.setHours(0, 0, 0, 0);
        const diffDays = Math.round((today.getTime() - last.getTime()) / 86400000);
        if (diffDays === 0) newStreak = prof.streak ?? 1;
        else if (diffDays === 1) newStreak = (prof.streak ?? 0) + 1;
        else newStreak = 1;
      }
      await supabase.from("profiles").update({ streak: newStreak, last_activity: todayStr }).eq("id", user.id);
      navigate(`/summary/${lesson?.id}`);
    } catch (e: any) {
      toast.error(e.message);
      setEnding(false);
    }
  };

  // ===== UI =====
  if (planLoading) return (
    <Layout>
      <PageHeader title="გაკვეთილი" backTo="/dashboard" />
      <p className="text-center py-12 text-muted-foreground ka">გაკვეთილი მზადდება...</p>
    </Layout>
  );
  if (!plan) return (
    <Layout>
      <PageHeader title="გაკვეთილი" backTo="/dashboard" />
      <p className="text-center py-12 text-muted-foreground ka">ვერ შევქმენი გაკვეთილი. სცადე თავიდან.</p>
    </Layout>
  );

  // Intro screen
  if (stage === "intro") {
    return (
      <Layout>
        <PageHeader title="დღევანდელი გაკვეთილი" backTo="/dashboard" />
        <div className="space-y-5 py-2">
          <div className="p-6 rounded-3xl gradient-hero text-primary-foreground shadow-warm">
            <div className="text-sm opacity-90 ka">თემა</div>
            <h1 className="text-2xl font-extrabold mt-1">{plan.title_en}</h1>
            <div className="text-base opacity-95 mt-1 ka">{plan.title_ka}</div>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border shadow-card space-y-3">
            <Row icon={<Target className="w-5 h-5 text-primary" />} label="მიზანი" value={plan.goal_ka} />
            <Row icon={<Clock className="w-5 h-5 text-primary" />} label="ხანგრძლივობა" value={`${plan.estimated_minutes} წუთი`} />
            <Row icon={<Sparkles className="w-5 h-5 text-primary" />} label="დონე" value={level} />
            <Row icon={<BookOpen className="w-5 h-5 text-primary" />} label="სასწავლი სიტყვები" value={plan.new_words.map(w => w.english_word).join(", ")} />
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border shadow-card">
            <div className="font-bold mb-3 ka">გაკვეთილის ნაბიჯები:</div>
            <ul className="space-y-2 text-sm">
              {STAGES.map((s) => (
                <li key={s.key} className="flex items-center gap-3">
                  <s.icon className="w-4 h-4 text-primary" />
                  <span className="ka">{s.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <Button variant="hero" size="xl" className="w-full ka" onClick={startLesson}>
            გაკვეთილის დაწყება
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader title={plan.title_ka || "გაკვეთილი"} backTo="/dashboard" />
      <div className="flex flex-col h-[calc(100vh-9rem)]">
        <Stepper current={stage} />

        {stage === "warmup" && (
          <ChatArea
            scrollRef={scrollRef}
            messages={messages}
            loading={loading}
            footer={
              <>
                <ChatInput
                  input={input} setInput={setInput} send={(t: string) => sendWarmup(t, messages, askAI, setMessages)}
                  loading={loading} disabled={false}
                />
                <Button variant="ghost" size="sm" className="mt-2 ka self-end" onClick={goToWords}>
                  გადასვლა სიტყვებზე →
                </Button>
              </>
            }
          />
        )}

        {stage === "words" && (
          <div className="flex-1 overflow-y-auto space-y-3 py-2">
            <div className="text-center mb-2">
              <div className="text-3xl mb-1">📚</div>
              <h2 className="text-xl font-extrabold ka">ახალი სიტყვები</h2>
              <p className="text-sm text-muted-foreground ka">დაიმახსოვრე ეს სიტყვები</p>
            </div>
            {plan.new_words.map((w, i) => (
              <div key={i} className="p-4 rounded-2xl bg-card border border-border shadow-card">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <SpeakButton text={w.english_word} />
                    <div className="text-lg font-bold truncate">{w.english_word}</div>
                  </div>
                  <div className="text-sm text-muted-foreground ka shrink-0">{w.georgian_meaning}</div>
                </div>
                <div className="flex items-start gap-2 mt-2">
                  <SpeakButton text={w.example_sentence} />
                  <div className="text-sm italic text-muted-foreground">"{w.example_sentence}"</div>
                </div>
              </div>
            ))}
            <Button variant="hero" size="lg" className="w-full mt-4 ka" onClick={goToActivities}>
              ვარჯიში →
            </Button>
          </div>
        )}

        {stage === "activities" && (
          <ActivitiesStage
            activities={plan.activities ?? []}
            onDone={startPractice}
          />
        )}

        {stage === "practice" && (
          <ChatArea
            scrollRef={scrollRef}
            messages={messages}
            loading={loading}
            footer={
              <>
                <ChatInput
                  input={input} setInput={setInput} send={send}
                  loading={loading} disabled={false}
                />
                <Button variant="ghost" size="sm" className="mt-2 ka self-end" onClick={finishLesson} disabled={ending}>
                  <Square className="w-4 h-4" />{ending ? "..." : "გაკვეთილის დასრულება"}
                </Button>
              </>
            }
          />
        )}

        {stage === "review" && (
          <p className="text-center py-12 text-muted-foreground ka">ვამზადებ მიმოხილვას...</p>
        )}
      </div>
    </Layout>
  );
}

function sendWarmup(
  text: string,
  messages: Msg[],
  askAI: (next: Msg[], stage: Stage) => Promise<string | null>,
  setMessages: React.Dispatch<React.SetStateAction<Msg[]>>,
) {
  if (!text.trim()) return;
  const next = [...messages, { role: "user" as const, content: text }];
  setMessages(next);
  askAI(next, "warmup");
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground ka">{label}</div>
        <div className="font-semibold ka break-words">{value}</div>
      </div>
    </div>
  );
}

function Stepper({ current }: { current: Stage }) {
  const idx = STAGES.findIndex((s) => s.key === current);
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between gap-1">
        {STAGES.map((s, i) => {
          const active = i === idx;
          const done = i < idx;
          return (
            <div key={s.key} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-smooth ${
                done ? "bg-success text-success-foreground" : active ? "gradient-hero text-primary-foreground shadow-soft" : "bg-secondary text-muted-foreground"
              }`}>
                <s.icon className="w-4 h-4" />
              </div>
              <div className={`text-[10px] ka text-center leading-tight ${active ? "text-foreground font-bold" : "text-muted-foreground"}`}>{s.label}</div>
            </div>
          );
        })}
      </div>
      <div className="h-1 bg-secondary rounded-full mt-2 overflow-hidden">
        <div className="h-full gradient-hero transition-smooth" style={{ width: `${((idx + 1) / STAGES.length) * 100}%` }} />
      </div>
    </div>
  );
}

function ActivitiesStage({ activities, onDone }: { activities: Activity[]; onDone: () => void }) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  if (!activities.length) {
    return (
      <div className="flex-1 overflow-y-auto py-2 space-y-3">
        <p className="text-center text-muted-foreground ka">აქტივობები არ არის. გადავიდეთ საუბარზე.</p>
        <Button variant="hero" size="lg" className="w-full ka" onClick={onDone}>დავიწყოთ საუბარი →</Button>
      </div>
    );
  }

  const a = activities[idx];
  const isLast = idx === activities.length - 1;
  const answered = picked !== null;
  const correct = picked === a.correct_index;

  const next = () => {
    if (isLast) { onDone(); return; }
    setPicked(null);
    setIdx(idx + 1);
  };

  const pick = (i: number) => {
    if (answered) return;
    setPicked(i);
    if (i === a.correct_index) setScore((s) => s + 1);
  };

  return (
    <div className="flex-1 overflow-y-auto py-2 space-y-4">
      <div className="text-center">
        <div className="text-xs text-muted-foreground ka">აქტივობა {idx + 1} / {activities.length}</div>
        <h2 className="text-xl font-extrabold ka mt-1">აირჩიე სწორი პასუხი</h2>
      </div>
      <div className="p-5 rounded-2xl bg-card border border-border shadow-card">
        <div className="ka text-base font-semibold mb-4">{a.question_ka}</div>
        <div className="space-y-2">
          {a.options.map((opt, i) => {
            const isCorrect = i === a.correct_index;
            const isPicked = i === picked;
            const variant = !answered
              ? "soft"
              : isCorrect ? "hero"
              : isPicked ? "destructive" : "soft";
            return (
              <Button
                key={i}
                variant={variant as any}
                className="w-full justify-between ka text-left h-auto py-3"
                onClick={() => pick(i)}
                disabled={answered}
              >
                <span className="whitespace-normal">{opt}</span>
                {answered && isCorrect && <Check className="w-4 h-4" />}
                {answered && isPicked && !isCorrect && <X className="w-4 h-4" />}
              </Button>
            );
          })}
        </div>
        {answered && (
          <div className={`mt-4 p-3 rounded-xl text-sm ka ${correct ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
            {correct ? "🎉 ყოჩაღ! " : "💡 "}{a.explanation_ka}
          </div>
        )}
      </div>
      <Button variant="hero" size="lg" className="w-full ka" onClick={next} disabled={!answered}>
        {isLast ? `დავიწყოთ საუბარი (${score}/${activities.length}) →` : "შემდეგი →"}
      </Button>
    </div>
  );
}

function ChatArea({ scrollRef, messages, loading, footer }: any) {
  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pb-3">
        {messages.map((m: Msg, i: number) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} items-end gap-2`}>
            {m.role === "assistant" && (
              <div className="w-8 h-8 rounded-full gradient-hero flex items-center justify-center text-sm shrink-0">🦉</div>
            )}
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${
              m.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-card border border-border shadow-card rounded-bl-sm"
            }`}>
              <div className="whitespace-pre-wrap text-base leading-relaxed">{m.content}</div>
              {m.role === "assistant" && /[a-zA-Z]/.test(m.content) && (
                <div className="mt-2 flex justify-end">
                  <SpeakButton text={m.content} />
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start items-end gap-2">
            <div className="w-8 h-8 rounded-full gradient-hero flex items-center justify-center text-sm">🦉</div>
            <div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col pt-2 border-t border-border">{footer}</div>
    </>
  );
}

function ChatInput({ input, setInput, send, loading, disabled }: any) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const handleSend = () => {
    if (!input.trim() || loading) return;
    const text = input;
    setInput("");
    send(text);
    requestAnimationFrame(() => taRef.current?.focus());
  };
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        <Textarea
          ref={taRef}
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="⌨️ Type your answer..."
          className="min-h-12 max-h-32 rounded-2xl resize-none"
          rows={1}
          disabled={disabled}
        />
        <Button variant="hero" size="icon" onClick={handleSend} disabled={loading || !input.trim()} className="shrink-0 h-12 w-12">
          <Send />
        </Button>
      </div>
      <Button
        variant="soft"
        size="sm"
        className="w-full ka opacity-70"
        onClick={() => toast.info("ხმოვანი შეყვანა მალე დაემატება 🎤")}
        type="button"
      >
        <Mic className="w-4 h-4" /> Speak (coming soon)
      </Button>
    </div>
  );
}
