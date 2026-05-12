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
import SpeakingRecorder from "./components/SpeakingRecorder";
import { DEFAULT_DAILY_LESSON, SUGGESTED_NEXT_TOPICS, pickDailyTopic } from "./data";
import { recordSpeakingActivity } from "./lib/tracker";

const MAX_VOICE_TURNS = 5;

// Pull a clean English prompt out of an AI message. Picks the line most likely to be English speech.
function extractEnglishPrompt(text: string): string {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const scored = lines.map((l) => {
    const stripped = l.replace(/[^A-Za-z\u10A0-\u10FF]/g, "");
    if (!stripped) return { l, s: -1 };
    const ascii = (l.match(/[A-Za-z]/g) || []).length;
    const total = stripped.length;
    return { l, s: ascii / total };
  });
  const best = scored.filter((x) => x.s > 0.6).pop();
  return (best?.l ?? lines.find((l) => /[A-Za-z]/.test(l)) ?? text).replace(/^[^A-Za-z"']*/, "").trim();
}

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

type LessonPrompt = {
  question: string;
  instruction_ka: string;
  examples: string[];
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

const CAFE_PROMPTS: LessonPrompt[] = [
  { question: "What would you like?", instruction_ka: "უპასუხე ინგლისურად. შეგიძლია გამოიყენო მაგალითი.", examples: ["I want coffee.", "I want tea.", "I want water."] },
  { question: "Would you like coffee or tea?", instruction_ka: "აირჩიე ერთი სასმელი და უპასუხე ინგლისურად.", examples: ["I would like coffee.", "I would like tea.", "Coffee, please."] },
  { question: "Do you want water?", instruction_ka: "უპასუხე მოკლედ ინგლისურად.", examples: ["Yes, please.", "No, thank you.", "I want water."] },
  { question: "Can I have your name?", instruction_ka: "თქვი შენი სახელი ინგლისურად.", examples: ["My name is Ana.", "I am Nika.", "Ana, please."] },
  { question: "Do you want sugar?", instruction_ka: "უპასუხე გინდა თუ არა შაქარი.", examples: ["Yes, please.", "No sugar, please.", "A little sugar, please."] },
  { question: "Do you want milk?", instruction_ka: "უპასუხე გინდა თუ არა რძე.", examples: ["Yes, with milk.", "No milk, please.", "A little milk, please."] },
  { question: "Is that all?", instruction_ka: "უპასუხე და დაასრულე შეკვეთა.", examples: ["Yes, that is all.", "That is all, thank you.", "No, I want cake too."] },
  { question: "How would you pay?", instruction_ka: "თქვი როგორ გადაიხდი.", examples: ["By card, please.", "I will pay cash.", "Card, please."] },
  { question: "Do you want a receipt?", instruction_ka: "უპასუხე გინდა თუ არა ქვითარი.", examples: ["Yes, please.", "No, thank you.", "A receipt, please."] },
  { question: "Thank you. Have a nice day.", instruction_ka: "უპასუხე ზრდილობიანად ინგლისურად.", examples: ["Thank you.", "You too.", "Have a nice day too."] },
];

const DEFAULT_PROMPTS: LessonPrompt[] = [
  { question: "What is your name?", instruction_ka: "უპასუხე ინგლისურად. შეგიძლია გამოიყენო მაგალითი.", examples: ["My name is Ana.", "I am Nika.", "My name is Mari."] },
  { question: "Where are you from?", instruction_ka: "თქვი საიდან ხარ ინგლისურად.", examples: ["I am from Georgia.", "I am from Tbilisi.", "I am from Batumi."] },
  { question: "How are you today?", instruction_ka: "უპასუხე მოკლედ ინგლისურად.", examples: ["I am good.", "I am fine, thank you.", "I am happy."] },
  { question: "What do you like?", instruction_ka: "თქვი რა მოგწონს ინგლისურად.", examples: ["I like English.", "I like music.", "I like football."] },
  { question: "What do you want?", instruction_ka: "თქვი რა გინდა ინგლისურად.", examples: ["I want water.", "I want coffee.", "I want help."] },
  { question: "Can you say that again?", instruction_ka: "ივარჯიშე თავაზიანი თხოვნა ინგლისურად.", examples: ["Can you say that again?", "Again, please.", "Please say that again."] },
  { question: "Do you need help?", instruction_ka: "უპასუხე გჭირდება თუ არა დახმარება.", examples: ["Yes, I need help.", "No, thank you.", "I need help, please."] },
  { question: "What time is it?", instruction_ka: "უპასუხე მარტივი დროით ინგლისურად.", examples: ["It is two o'clock.", "It is morning.", "I don't know."] },
  { question: "What is your favorite thing?", instruction_ka: "თქვი შენი საყვარელი რამ ინგლისურად.", examples: ["My favorite thing is my phone.", "I like books.", "My favorite thing is music."] },
  { question: "Thank you. See you later.", instruction_ka: "უპასუხე დამშვიდობებით ინგლისურად.", examples: ["See you later.", "Thank you.", "Goodbye."] },
];

function isMostlyEnglish(s: string) {
  const letters = s.replace(/[^A-Za-z\u10A0-\u10FF]/g, "");
  if (!letters) return false;
  return ((s.match(/[A-Za-z]/g) || []).length / letters.length) > 0.55;
}

function makeLessonPrompts(plan: Plan, isBeginner: boolean): LessonPrompt[] {
  const topic = (plan.topic || plan.title_en || "").toLowerCase();
  const base = topic.includes("café") || topic.includes("cafe") || topic.includes("coffee") ? CAFE_PROMPTS : DEFAULT_PROMPTS;
  const fromPlan = (plan.warmup_questions || [])
    .map((q) => q.trim())
    .filter(isMostlyEnglish)
    .slice(0, 4)
    .map((question) => ({
      question,
      instruction_ka: isBeginner ? "უპასუხე ინგლისურად. შეგიძლია გამოიყენო მაგალითი." : "უპასუხე ინგლისურად.",
      examples: plan.new_words.map((w) => w.example_sentence).filter(Boolean).slice(0, 3),
    }));
  const merged = [...fromPlan, ...base];
  const seen = new Set<string>();
  return merged.filter((p) => {
    const key = p.question.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);
}

function makeLocalFeedback(answer: string, examples: string[]) {
  const clean = answer.trim();
  const better = examples[0] || "I would like coffee.";
  const words = normalizeForLesson(clean);
  if (words.length >= 4) return { feedback: "Good answer! კარგი ცდა — გააგრძელე ნელა და გარკვევით.", corrected: undefined as string | undefined };
  if (words.length >= 2) return { feedback: `Good try! Better: “${better}” სცადე კიდევ ერთხელ ნელა.`, corrected: better };
  return { feedback: `Good try! Better: “${better}” თქვი სრული მოკლე წინადადება.`, corrected: better };
}

function normalizeForLesson(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
}

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

  // Voice-first guided prompts state
  type PromptResult = { transcript: string; feedback: string; corrected?: string; loading: boolean; typing: boolean };
  const [promptIdx, setPromptIdx] = useState(0);
  const [promptResults, setPromptResults] = useState<Record<number, PromptResult>>({});
  const [typedAnswer, setTypedAnswer] = useState("");

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
    setPromptIdx(0);
    setPromptResults({});
    setTypedAnswer("");
    setMessages([]);
    setStep("conversation");
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
          voice_prompts_completed: Object.values(promptResults).filter((r) => r.transcript).length,
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
      await recordSpeakingActivity(user.id, "daily_speaking_lesson");
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
  const reviewPrompts = makeLessonPrompts(plan, isBeginner);
  const completedPromptResults = Object.entries(promptResults)
    .map(([idx, result]) => ({ idx: Number(idx), result }))
    .filter(({ result }) => Boolean(result.transcript));

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
            <p className="text-sm sp-text-muted ka">დააჭირე 🔊-ს, მოუსმინე და გაიმეორე ხმამაღლა. შემდეგ ჩაწერე შენი ხმა და მიიღე უკუკავშირი.</p>
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
                  enableRecording
                  topic={plan.topic}
                  source="daily_lesson"
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

        {step === "conversation" && (() => {
          const prompts = makeLessonPrompts(plan, isBeginner);
          const current = prompts[promptIdx] ?? prompts[0];
          const result = promptResults[promptIdx];
          const examples = current.examples.length ? current.examples : phrases.map((p) => p.example_sentence).filter(Boolean).slice(0, 3);

          const submitAnswer = async (text: string) => {
            const t = text.trim();
            if (!t) return;
            console.log("[DailyLesson] Speaking prompt answer submitted", { promptIdx, text: t });
            const { feedback, corrected } = makeLocalFeedback(t, examples);
            setPromptResults((prev) => ({ ...prev, [promptIdx]: { transcript: t, feedback, corrected, loading: false, typing: false } }));
            if (corrected && normalizeForLesson(corrected).join(" ") !== normalizeForLesson(t).join(" ")) {
              setMistakes((prev) => [...prev, { original: t, corrected }]);
            }
            setMessages((prev) => [...prev, { role: "assistant", content: current.question }, { role: "user", content: t }]);
          };

          const goNext = () => {
            if (promptIdx < prompts.length - 1) {
              setPromptIdx(promptIdx + 1);
              setTypedAnswer("");
            } else {
              goReview();
            }
          };

          return (
            <div className="space-y-4">
              {/* Scenario card */}
              <div className="sp-card p-4">
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-lg sp-chip-teal flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold uppercase tracking-wider ka" style={{ color: "hsl(175 70% 28%)" }}>
                      სცენარი
                    </div>
                    {plan.scenario_ka && <div className="text-sm ka sp-text mt-0.5">{plan.scenario_ka}</div>}
                    {(plan.user_role_ka || plan.ai_role_ka) && (
                      <div className="text-xs ka sp-text-muted mt-1">
                        {plan.user_role_ka && <><span className="font-semibold">შენ:</span> {plan.user_role_ka}</>}
                        {plan.user_role_ka && plan.ai_role_ka && " · "}
                        {plan.ai_role_ka && <><span className="font-semibold">AI:</span> {plan.ai_role_ka}</>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Prompt counter */}
              <div className="flex items-center justify-between">
                <div className="text-xs sp-text-soft ka">კითხვა {promptIdx + 1} / {prompts.length}</div>
                <div className="flex gap-1">
                  {prompts.map((_, i) => (
                    <div key={i} className={`w-6 h-1 rounded-full ${i <= promptIdx ? "bg-[hsl(175_70%_38%)]" : "bg-[hsl(220_22%_90%)]"}`} />
                  ))}
                </div>
              </div>

              {/* Prompt card */}
              <div className="sp-card p-5 space-y-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider ka" style={{ color: "hsl(175 70% 28%)" }}>
                    Speak in English · უპასუხე ინგლისურად
                  </div>
                  <div className="text-xs ka sp-text-muted mt-1">
                    {current.instruction_ka}
                  </div>
                  <div className="flex items-start gap-2 mt-3">
                    <SpeakButton text={current.question} />
                    <div className="text-lg font-bold sp-text leading-snug break-words">{current.question}</div>
                  </div>
                </div>

                {examples.length > 0 && !result?.transcript && (
                  <div>
                    <div className="text-[11px] sp-text-soft ka mb-1.5">მაგალითები:</div>
                    <ul className="space-y-1">
                      {examples.map((ex, i) => (
                        <li key={i} className="text-sm sp-text flex items-center gap-2">
                          <span className="text-[hsl(175_70%_38%)]">•</span>
                          <span>{ex}</span>
                          <SpeakButton text={ex} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recorder (primary) */}
                {!result?.transcript && !result?.loading && !result?.typing && (
                  <div className="space-y-2">
                    <SpeakingRecorder
                      key={`prompt-${promptIdx}`}
                      mode="transcribe"
                      target={current.question}
                      topic={plan.topic}
                      source="daily_lesson_voice"
                      recordLabel="Record"
                      onTranscript={(t) => submitAnswer(t)}
                    />
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setPromptResults((prev) => ({ ...prev, [promptIdx]: { transcript: "", feedback: "", loading: false, typing: true } }))}
                        className="text-xs ka sp-text-soft underline hover:sp-text"
                      >
                        ⌨️ Type instead
                      </button>
                    </div>
                  </div>
                )}

                {/* Type instead */}
                {result?.typing && !result?.transcript && (
                  <div className="space-y-2">
                    <div className="flex items-end gap-2">
                      <Textarea
                        value={typedAnswer}
                        onChange={(e) => setTypedAnswer(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            submitAnswer(typedAnswer);
                          }
                        }}
                        rows={1}
                        placeholder={isBeginner ? "მარტივად ინგლისურად..." : "Type your answer..."}
                        className="resize-none bg-white text-foreground border-[hsl(220_22%_88%)]"
                      />
                      <button
                        onClick={() => submitAnswer(typedAnswer)}
                        disabled={!typedAnswer.trim()}
                        className="sp-btn-primary h-12 w-12 inline-flex items-center justify-center rounded-2xl disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPromptResults((prev) => ({ ...prev, [promptIdx]: { transcript: "", feedback: "", loading: false, typing: false } }))}
                      className="text-xs ka sp-text-soft underline hover:sp-text"
                    >
                      🎤 Back to voice
                    </button>
                  </div>
                )}

                {/* Loading feedback */}
                {result?.loading && (
                  <div className="flex items-center gap-2 text-sm sp-text-muted ka">
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "hsl(175 70% 38%)" }} />
                    AI ამოწმებს პასუხს...
                  </div>
                )}

                {/* Result */}
                {result?.transcript && !result?.loading && (
                  <div className="space-y-3">
                    <div className="rounded-xl bg-[hsl(40_45%_96%)] border border-[hsl(40_30%_88%)] p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider sp-text-soft ka">Heard · გაიგე</div>
                      <div className="text-sm sp-text mt-0.5 break-words">{result.transcript}</div>
                    </div>
                    {result.feedback && (
                      <div className="rounded-xl bg-[hsl(175_60%_96%)] border border-[hsl(175_40%_85%)] p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider ka" style={{ color: "hsl(175 70% 28%)" }}>Feedback</div>
                        <div className="text-sm sp-text mt-0.5 whitespace-pre-wrap break-words">{result.feedback}</div>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => { setPromptResults((prev) => ({ ...prev, [promptIdx]: { transcript: "", feedback: "", loading: false, typing: false } })); setTypedAnswer(""); }}
                        className="text-xs ka sp-text-soft underline hover:sp-text"
                      >
                        🔁 Try again
                      </button>
                      <button
                        onClick={goNext}
                        className="sp-btn-primary inline-flex items-center justify-center gap-2 rounded-2xl h-11 px-5 text-sm font-bold ka"
                      >
                        {promptIdx < prompts.length - 1 ? "Next Question →" : "Finish Lesson →"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button variant="ghost" size="sm" className="ka sp-text hover:bg-[hsl(40_40%_94%)]" onClick={goReview}>
                  Finish Lesson
                </Button>
              </div>
            </div>
          );
        })()}


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
              <div className="font-bold ka sp-text">საუბრის კითხვები</div>
              <div className="text-sm sp-text">
                {completedPromptResults.length} completed
              </div>
              {completedPromptResults.length > 0 ? (
                <ul className="text-sm space-y-2 mt-1">
                  {completedPromptResults.map(({ idx, result }) => (
                    <li key={idx} className="sp-text">
                      <div className="font-semibold">{reviewPrompts[idx]?.question ?? `Question ${idx + 1}`}</div>
                      <div className="sp-text-muted italic">Heard: {result.transcript}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm sp-text-muted ka">ჯერ საუბრის პასუხი არ არის ჩაწერილი.</div>
              )}
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
              <div className="font-bold ka sp-text">სასურველია გადახედო</div>
              <ul className="text-sm space-y-1">
                {Array.from(new Set([...mistakes.map((m) => m.corrected), ...phrases.map((w) => w.example_sentence || w.english_word)])).slice(0, 5).map((item, i) => (
                  <li key={i} className="sp-text">• {item}</li>
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
