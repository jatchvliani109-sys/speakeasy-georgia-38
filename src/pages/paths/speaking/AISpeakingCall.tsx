import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Mic, PhoneOff, Lightbulb,
  Loader2, Type as TypeIcon, RotateCcw, X,
} from "lucide-react";
import SpeakingShell from "./components/SpeakingShell";
import SpeakingRecorder from "./components/SpeakingRecorder";
import SpeakButton from "@/components/SpeakButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { recordSpeakingActivity } from "./lib/tracker";
import { getEncouragementKa, dailySeed } from "./lib/encouragement";

// --- Topics --------------------------------------------------------------

type Level = "Beginner" | "Elementary" | "Intermediate";
type Topic = {
  id: string;
  level: Level | "Free";
  title_en: string;
  desc_ka: string;
  emoji: string;
  scene_en?: string; // hint for the AI
};

const TOPICS: Topic[] = [
  { id: "intro", level: "Beginner", title_en: "Introducing Yourself", desc_ka: "გაიცანი AI და ისაუბრე საკუთარ თავზე.", emoji: "👋" },
  { id: "school", level: "Beginner", title_en: "School", desc_ka: "ისაუბრე სკოლაზე და საგნებზე.", emoji: "🎒" },
  { id: "family", level: "Beginner", title_en: "Family", desc_ka: "ისაუბრე ოჯახის წევრებზე.", emoji: "👨‍👩‍👧" },
  { id: "cafe", level: "Beginner", title_en: "At a Café", desc_ka: "შეუკვეთე სასმელი და ილაპარაკე ოფიციანტთან.", emoji: "☕" },
  { id: "hobbies", level: "Beginner", title_en: "Hobbies", desc_ka: "მოყევი რა გიყვარს თავისუფალ დროს.", emoji: "🎨" },
  { id: "routine", level: "Beginner", title_en: "Daily Routine", desc_ka: "ისაუბრე შენს დღიურ რუტინაზე.", emoji: "🕗" },

  { id: "ordering", level: "Elementary", title_en: "Ordering Food", desc_ka: "შეუკვეთე საჭმელი რესტორანში.", emoji: "🍽️" },
  { id: "directions", level: "Elementary", title_en: "Asking for Directions", desc_ka: "ჰკითხე გზა ქალაქში.", emoji: "🗺️" },
  { id: "shopping", level: "Elementary", title_en: "Shopping", desc_ka: "იყიდე ტანსაცმელი ან ჰკითხე ფასი.", emoji: "🛍️" },
  { id: "travel", level: "Elementary", title_en: "Travel Basics", desc_ka: "სასტუმრო, ბილეთი, აეროპორტი.", emoji: "✈️" },
  { id: "weekend", level: "Elementary", title_en: "Weekend Plans", desc_ka: "დაგეგმე შაბათ-კვირა მეგობართან.", emoji: "📅" },

  { id: "interview", level: "Intermediate", title_en: "Job Interview", desc_ka: "ივარჯიშე გასაუბრებაზე.", emoji: "💼" },
  { id: "opinions", level: "Intermediate", title_en: "Giving Opinions", desc_ka: "გამოთქვი აზრი თემაზე.", emoji: "💭" },
  { id: "plans", level: "Intermediate", title_en: "Making Plans", desc_ka: "შეთანხმდი მეგობართან გეგმაზე.", emoji: "🗓️" },
  { id: "travel_conv", level: "Intermediate", title_en: "Travel Conversation", desc_ka: "ისაუბრე მოგზაურობის გამოცდილებაზე.", emoji: "🌍" },
  { id: "problem", level: "Intermediate", title_en: "Problem Solving", desc_ka: "გადაჭერი სიტუაცია მხარდაჭერასთან.", emoji: "🧩" },

  { id: "free", level: "Free", title_en: "Free Conversation", desc_ka: "ისაუბრე ნებისმიერ თემაზე.", emoji: "💬" },
];

const LEVEL_LABEL_KA: Record<Topic["level"], string> = {
  Beginner: "მარტივი",
  Elementary: "საშუალო",
  Intermediate: "რთული",
  Free: "თავისუფალი",
};

// --- Types --------------------------------------------------------------

type Msg = { role: "user" | "assistant"; content: string };
type Step = "setup" | "explain" | "call" | "summary";
type CallStatus = "ready" | "ai_speaking" | "listening" | "thinking";

// --- Component ----------------------------------------------------------

export default function AISpeakingCall() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("setup");
  const [topic, setTopic] = useState<Topic | null>(null);
  const [level, setLevel] = useState<string>("Beginner");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("english_level")
        .eq("id", user.id)
        .maybeSingle();
      setLevel(data?.english_level ?? "Beginner");
    })();
  }, [user]);

  // ---- Setup -----------------------------------------------------------
  if (step === "setup") {
    return (
      <SpeakingShell>
        <div className="max-w-2xl mx-auto space-y-5">
          <header className="flex items-center gap-3">
            <button
              onClick={() => navigate("/path/speaking")}
              className="w-9 h-9 rounded-full sp-chip inline-flex items-center justify-center"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-extrabold sp-text ka">აირჩიე საუბრის თემა</h1>
              <p className="text-xs sp-text-muted ka">აირჩიე ის, რაზეც გინდა ვარჯიში.</p>
            </div>
          </header>

          {(["Beginner", "Elementary", "Intermediate", "Free"] as Topic["level"][]).map((lvl) => {
            const items = TOPICS.filter((t) => t.level === lvl);
            if (!items.length) return null;
            return (
              <section key={lvl}>
                <h3 className="text-[11px] font-bold uppercase tracking-wider sp-text-muted ka mb-2">
                  {LEVEL_LABEL_KA[lvl]}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {items.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { setTopic(t); setStep("explain"); }}
                      className="sp-card p-3.5 text-left hover:bg-[hsl(40_40%_96%)] transition-colors flex items-start gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl sp-chip-teal flex items-center justify-center text-xl shrink-0">
                        {t.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold sp-text text-[14px]">{t.title_en}</div>
                        <div className="text-[12px] sp-text-muted ka leading-snug mt-0.5">{t.desc_ka}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 sp-text-soft mt-2 shrink-0" />
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </SpeakingShell>
    );
  }

  // ---- Explain ---------------------------------------------------------
  if (step === "explain" && topic) {
    return (
      <SpeakingShell>
        <div className="max-w-md mx-auto space-y-5">
          <header className="flex items-center gap-3">
            <button
              onClick={() => setStep("setup")}
              className="w-9 h-9 rounded-full sp-chip inline-flex items-center justify-center"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-lg font-extrabold sp-text ka">როგორ მუშაობს საუბრის რეჟიმი?</h1>
          </header>

          <div className="sp-card p-5 space-y-3">
            <ExplainItem text="AI დაგელაპარაკება ინგლისურად." />
            <ExplainItem text="შენ უპასუხებ ინგლისურად." />
            <ExplainItem text="თუ გაიჭედები, შეგიძლია ქართულად ითხოვო დახმარება." />
            <ExplainItem text="AI ქართულად დაგიწერს დახმარებას ეკრანზე." />
            <ExplainItem text="შემდეგ ისევ ინგლისურად გააგრძელებ საუბარს." />
          </div>

          <div className="rounded-xl bg-[hsl(40_45%_96%)] border border-[hsl(40_30%_88%)] p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider sp-text-muted ka">თემა</div>
            <div className="font-bold sp-text mt-1">{topic.title_en}</div>
            <div className="text-xs sp-text-muted ka mt-0.5">{topic.desc_ka}</div>
          </div>

          <button
            onClick={() => setStep("call")}
            className="sp-btn-primary w-full inline-flex items-center justify-center gap-2 rounded-xl h-12 text-sm font-bold ka"
          >
            გასაგებია, დავიწყოთ
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </SpeakingShell>
    );
  }

  // ---- Call ------------------------------------------------------------
  if (step === "call" && topic) {
    return (
      <CallScreen
        topic={topic}
        level={level}
        onBack={() => setStep("explain")}
        onEnd={(messages, durationSec) => {
          (window as any).__sp_call_data = { topic, level, messages, durationSec };
          setStep("summary");
        }}
      />
    );
  }

  // ---- Summary ---------------------------------------------------------
  if (step === "summary" && topic) {
    const data = (window as any).__sp_call_data ?? { topic, level, messages: [], durationSec: 0 };
    return (
      <SummaryScreen
        topic={data.topic}
        level={data.level}
        messages={data.messages}
        durationSec={data.durationSec}
        onPracticeAgain={() => { setStep("setup"); }}
        onBackToSpeaking={() => navigate("/path/speaking")}
      />
    );
  }

  return null;
}

function ExplainItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-1.5 h-1.5 rounded-full bg-[hsl(175_70%_38%)] mt-2 shrink-0" />
      <p className="text-sm sp-text ka leading-relaxed">{text}</p>
    </div>
  );
}

// --- Call screen --------------------------------------------------------

function CallScreen({
  topic, level, onBack, onEnd,
}: {
  topic: Topic;
  level: string;
  onBack: () => void;
  onEnd: (messages: Msg[], durationSec: number) => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [status, setStatus] = useState<CallStatus>("ready");
  const [showHelp, setShowHelp] = useState(false);
  const [helpLoading, setHelpLoading] = useState(false);
  const [helpData, setHelpData] = useState<{ english: string; georgian: string } | null>(null);
  const [showText, setShowText] = useState(false);
  const [textInput, setTextInput] = useState("");
  const startedAtRef = useRef<number>(Date.now());
  const transcriptRef = useRef<HTMLDivElement>(null);

  // auto scroll
  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Kick off AI greeting
  useEffect(() => {
    void askAI([{
      role: "user",
      content:
        `Start an English speaking practice call about "${topic.title_en}". ` +
        `Greet me warmly in 1 short English sentence and ask ONE simple opening question. Stay on topic.`,
    }], true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const askAI = async (next: Msg[], hideSeed = false) => {
    setStatus("thinking");
    const r = await supabase.functions.invoke("ai-tutor", {
      body: {
        messages: next,
        level,
        coachMode: "speaking_lesson",
        lessonContext: { topic: topic.title_en, mode: "voice_call" },
      },
    });
    if (r.error || (r.data as any)?.error) {
      toast.error((r.data as any)?.error ?? "AI შეცდომა");
      setStatus("ready");
      return;
    }
    const reply = (r.data as any).reply as string;
    // strip OPTIONS:/STARTERS: helper lines for voice-first feel
    const clean = reply
      .split("\n")
      .filter((l) => !/^\s*(OPTIONS|STARTERS)\s*:/i.test(l))
      .join("\n")
      .trim();
    const visible = hideSeed ? next.slice(0, -1) : next;
    setMessages([...visible, { role: "assistant", content: clean }]);
    setStatus("ai_speaking");
    // auto-revert to ready after a moment
    window.setTimeout(() => setStatus("ready"), 1200);
  };

  const handleUserUtterance = (text: string) => {
    if (!text.trim()) return;
    setShowHelp(false);
    setHelpData(null);
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    void askAI(next);
  };

  const requestGeorgianHelp = async () => {
    setShowHelp(true);
    setHelpLoading(true);
    setHelpData(null);
    const last = messages[messages.length - 1];
    const lastAi = last && last.role === "assistant" ? last.content : "";
    const r = await supabase.functions.invoke("ai-tutor", {
      body: {
        level,
        messages: [
          {
            role: "user",
            content:
              `The student is practicing English speaking about "${topic.title_en}". ` +
              `The AI tutor's last line was: "${lastAi}". ` +
              `The student is stuck. Suggest ONE short, natural English reply (max 8 words) the student can say next, ` +
              `and a Georgian translation. Reply in EXACTLY this format on two lines:\nEN: <english>\nKA: <georgian>`,
          },
        ],
      },
    });
    setHelpLoading(false);
    if (r.error || (r.data as any)?.error) {
      setHelpData({ english: "I'm not sure. Can you repeat?", georgian: "არ ვარ დარწმუნებული. შეგიძლია გაიმეორო?" });
      return;
    }
    const reply = ((r.data as any).reply as string) ?? "";
    const en = (reply.match(/EN:\s*(.+)/i)?.[1] ?? "").trim().replace(/^["']|["']$/g, "");
    const ka = (reply.match(/KA:\s*(.+)/i)?.[1] ?? "").trim().replace(/^["']|["']$/g, "");
    setHelpData({
      english: en || "Can you say that again, please?",
      georgian: ka || "შეგიძლია გაიმეორო?",
    });
  };

  const sendText = () => {
    const t = textInput.trim();
    if (!t) return;
    setTextInput("");
    handleUserUtterance(t);
  };

  const endSession = () => {
    const dur = Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000));
    onEnd(messages, dur);
  };

  const statusLabel: Record<CallStatus, string> = {
    ready: "AI is ready",
    ai_speaking: "AI is speaking…",
    listening: "Listening…",
    thinking: "Thinking…",
  };

  return (
    <SpeakingShell>
      <div className="max-w-md mx-auto flex flex-col min-h-[calc(100vh-7rem)]">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-3 mb-4">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full sp-chip inline-flex items-center justify-center"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="text-center min-w-0">
            <div className="text-[10px] uppercase tracking-wider sp-text-muted ka">თემა</div>
            <div className="font-bold sp-text text-sm truncate">{topic.title_en}</div>
          </div>
          <button
            onClick={endSession}
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 text-white px-3 h-9 text-xs font-bold ka"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            დასრულება
          </button>
        </header>

        {/* AI Tutor area */}
        <div className="flex-1 flex flex-col items-center justify-start pt-4">
          <div
            className={`relative w-32 h-32 rounded-full flex items-center justify-center text-5xl shrink-0 transition-transform ${
              status === "ai_speaking" ? "sp-recording" : ""
            }`}
            style={{
              background:
                "linear-gradient(135deg, hsl(265 70% 55%), hsl(210 70% 45%) 60%, hsl(175 70% 42%))",
              boxShadow: "0 12px 40px -10px hsl(220 50% 30% / 0.45)",
            }}
          >
            <span aria-hidden>🎙️</span>
            {status === "thinking" && (
              <span className="absolute inset-0 rounded-full border-4 border-white/40 border-t-transparent animate-spin" />
            )}
          </div>

          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full sp-chip text-xs ka">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                status === "listening" ? "bg-emerald-500" :
                status === "ai_speaking" ? "bg-violet-500" :
                status === "thinking" ? "bg-amber-500" :
                "bg-slate-400"
              }`}
            />
            {statusLabel[status]}
          </div>

          {/* Transcript (secondary) */}
          <div
            ref={transcriptRef}
            className="w-full mt-5 max-h-56 overflow-y-auto rounded-xl bg-[hsl(40_45%_98%)] border border-[hsl(40_30%_88%)] p-3 space-y-2 text-[13px]"
          >
            {messages.length === 0 && (
              <p className="text-center sp-text-muted ka text-xs py-6">
                საუბარი დაიწყება როცა AI მოგესალმება.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className="flex gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 shrink-0 ${
                  m.role === "assistant" ? "text-[hsl(265_50%_45%)]" : "text-[hsl(175_70%_30%)]"
                }`}>
                  {m.role === "assistant" ? "AI" : "You"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="sp-text whitespace-pre-wrap break-words">{m.content}</div>
                  {m.role === "assistant" && (
                    <div className="mt-0.5"><SpeakButton text={m.content} /></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mic area */}
        <div className="mt-4 mb-2">
          <div className="flex items-center justify-center">
            <SpeakingRecorder
              mode="transcribe"
              source="speaking_call"
              topic={topic.title_en}
              recordLabel="დააჭირე და ილაპარაკე"
              onTranscript={handleUserUtterance}
            />
          </div>
          <p className="text-center text-[11px] sp-text-muted ka mt-2">
            დააჭირე მიკროფონს და ილაპარაკე ინგლისურად
          </p>

          {/* Help + Text fallback */}
          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={requestGeorgianHelp}
              className="inline-flex items-center gap-1.5 rounded-full sp-chip-teal px-3 py-1.5 text-xs font-bold ka"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              დახმარება ქართულად
            </button>
            <button
              type="button"
              onClick={() => setShowText((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full sp-chip px-3 py-1.5 text-xs font-semibold ka"
            >
              <TypeIcon className="w-3.5 h-3.5" />
              {showText ? "Hide typing" : "Type instead"}
            </button>
          </div>

          {showText && (
            <div className="mt-3 flex gap-2">
              <input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); sendText(); }
                }}
                placeholder="Type in English…"
                className="flex-1 rounded-xl border border-[hsl(220_22%_88%)] px-3 h-10 text-sm bg-white"
              />
              <button
                onClick={sendText}
                disabled={!textInput.trim() || status === "thinking"}
                className="sp-btn-primary h-10 px-4 rounded-xl text-sm font-bold disabled:opacity-50"
              >
                Send
              </button>
            </div>
          )}

          <p className="text-center text-[10px] sp-text-soft mt-3 ka">
            სრული რეალური ხმოვანი კავშირი მალე დაემატება.
          </p>
        </div>

        {/* Georgian help card overlay */}
        {showHelp && (
          <div
            className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowHelp(false)}
          >
            <div
              className="sp-card max-w-md w-full p-5 sp-pop-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg sp-chip-teal inline-flex items-center justify-center">
                    <Lightbulb className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold sp-text ka">დახმარება ქართულად</h3>
                </div>
                <button onClick={() => setShowHelp(false)} className="sp-text-soft p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {helpLoading || !helpData ? (
                <div className="py-6 flex items-center justify-center sp-text-muted text-sm gap-2 ka">
                  <Loader2 className="w-4 h-4 animate-spin" /> ვამზადებ რჩევას…
                </div>
              ) : (
                <>
                  <div className="ka text-xs sp-text-muted mb-1">თქვი ასე:</div>
                  <div className="rounded-xl bg-[hsl(40_45%_96%)] border border-[hsl(40_30%_88%)] p-3 flex items-center justify-between gap-2">
                    <div className="font-bold sp-text text-base">{helpData.english}</div>
                    <SpeakButton text={helpData.english} />
                  </div>
                  <div className="mt-2 text-sm sp-text ka">
                    ეს ნიშნავს: „{helpData.georgian}“
                  </div>

                  <button
                    onClick={() => setShowHelp(false)}
                    className="sp-btn-primary w-full mt-4 inline-flex items-center justify-center gap-2 rounded-xl h-11 text-sm font-bold ka"
                  >
                    <Mic className="w-4 h-4" />
                    ვცდი ინგლისურად
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </SpeakingShell>
  );
}

// --- Summary screen -----------------------------------------------------

type SessionSummary = {
  useful_phrases?: string[];
  mistakes?: { original_sentence: string; corrected_sentence: string; explanation_ka?: string; tag?: string }[];
  new_words?: { english_word: string; georgian_meaning: string; example_sentence?: string; difficulty?: string }[];
  encouragement_ka?: string;
  homework_ka?: string;
};

const NEXT_SUGGESTIONS: Record<string, string> = {
  intro: "School", school: "Family", family: "Hobbies", hobbies: "Daily Routine",
  routine: "At a Café", cafe: "Ordering Food", ordering: "Asking for Directions",
  directions: "Shopping", shopping: "Travel Basics", travel: "Weekend Plans",
  weekend: "Making Plans", interview: "Giving Opinions", opinions: "Making Plans",
  plans: "Travel Conversation", travel_conv: "Problem Solving", problem: "Job Interview",
  free: "Introducing Yourself",
};

function SummaryScreen({
  topic, level, messages, durationSec, onPracticeAgain, onBackToSpeaking,
}: {
  topic: Topic;
  level: string;
  messages: Msg[];
  durationSec: number;
  onPracticeAgain: () => void;
  onBackToSpeaking: () => void;
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SessionSummary>({});
  const savedRef = useRef(false);

  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;
    (async () => {
      let summ: SessionSummary = {};
      // Only request AI summary if there's actual conversation content.
      if (messages.length >= 2) {
        try {
          const r = await supabase.functions.invoke("ai-tutor", {
            body: { mode: "summary", messages, level },
          });
          if (!r.error && (r.data as any)?.summary) {
            summ = (r.data as any).summary as SessionSummary;
          }
        } catch (e) {
          console.warn("[speaking-call] summary failed", e);
        }
      }
      setSummary(summ);
      setLoading(false);

      // Save session
      if (user) {
        try {
          await supabase.from("lessons").insert({
            user_id: user.id,
            level: `speaking:call:${(level || "Beginner").toLowerCase()}`,
            messages: messages as any,
            summary: {
              mode: "ai_speaking_call",
              topic: topic.title_en,
              topic_id: topic.id,
              difficulty: topic.level,
              duration_sec: durationSec,
              voice_prompts_completed: messages.filter((m) => m.role === "user").length,
              phrases_practiced: (summ.useful_phrases ?? []).length,
              mistakes: summ.mistakes ?? [],
              useful_phrases: summ.useful_phrases ?? [],
              new_words: summ.new_words ?? [],
              encouragement_ka: summ.encouragement_ka ?? null,
              plan: { title_ka: topic.title_en, topic: topic.title_en },
            } as any,
            completed: true,
            ended_at: new Date().toISOString(),
          });
          // Save mistakes
          if (summ.mistakes?.length) {
            await supabase.from("mistakes").insert(
              summ.mistakes.map((m) => ({
                user_id: user.id,
                original_sentence: m.original_sentence,
                corrected_sentence: m.corrected_sentence,
                explanation_ka: m.explanation_ka ?? null,
                tag: m.tag ?? "speaking",
              })),
            );
          }
          // Save new words
          if (summ.new_words?.length) {
            await supabase.from("vocabulary").insert(
              summ.new_words.map((w) => ({
                user_id: user.id,
                english_word: w.english_word,
                georgian_meaning: w.georgian_meaning,
                example_sentence: w.example_sentence ?? null,
                difficulty: w.difficulty ?? null,
                status: "new",
              })),
            );
          }
          await recordSpeakingActivity(user.id, "daily_speaking_lesson");
        } catch (e: any) {
          console.warn("[speaking-call] save failed", e?.message);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  const next = NEXT_SUGGESTIONS[topic.id] ?? "Introducing Yourself";

  return (
    <SpeakingShell>
      <div className="max-w-md mx-auto space-y-4">
        <div className="sp-card-hero p-6 text-center sp-pop-in">
          <div className="text-3xl mb-2">🎉</div>
          <h1 className="text-xl font-extrabold sp-text ka">სესია დასრულებულია</h1>
          <p className="text-sm sp-text ka mt-2">
            {summary.encouragement_ka || getEncouragementKa(dailySeed())}
          </p>
        </div>

        <div className="sp-card p-4 grid grid-cols-2 gap-3">
          <Stat label_ka="თემა" value={topic.title_en} small />
          <Stat label_ka="დრო" value={`${minutes}:${String(seconds).padStart(2, "0")}`} />
          <Stat label_ka="შენი პასუხები" value={messages.filter((m) => m.role === "user").length} />
          <Stat label_ka="დონე" value={LEVEL_LABEL_KA[topic.level]} small />
        </div>

        {loading ? (
          <div className="sp-card p-6 text-center text-sm sp-text-muted ka inline-flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> ვამზადებ შენი სესიის შეჯამებას…
          </div>
        ) : (
          <>
            {!!summary.useful_phrases?.length && (
              <Section title_ka="სასარგებლო ფრაზები">
                <ul className="space-y-1.5">
                  {summary.useful_phrases.slice(0, 6).map((p, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 text-sm">
                      <span className="sp-text">{p}</span>
                      <SpeakButton text={p} />
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {!!summary.mistakes?.length && (
              <Section title_ka="გასწორებები">
                <ul className="space-y-2.5">
                  {summary.mistakes.slice(0, 5).map((m, i) => (
                    <li key={i} className="text-sm">
                      <div className="text-[12px] sp-text-muted line-through">{m.original_sentence}</div>
                      <div className="font-semibold sp-text">{m.corrected_sentence}</div>
                      {m.explanation_ka && <div className="text-[12px] sp-text-muted ka mt-0.5">{m.explanation_ka}</div>}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {!!summary.new_words?.length && (
              <Section title_ka="გასაიმეორებელი სიტყვები">
                <ul className="space-y-1.5">
                  {summary.new_words.slice(0, 6).map((w, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <div className="font-semibold sp-text">{w.english_word}</div>
                        <div className="text-[12px] sp-text-muted ka">{w.georgian_meaning}</div>
                      </div>
                      <SpeakButton text={w.english_word} />
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </>
        )}

        <div className="sp-card p-4">
          <div className="text-[11px] uppercase tracking-wider font-bold sp-text-muted ka">შემდეგი თემა</div>
          <div className="font-bold sp-text mt-1">{next}</div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onPracticeAgain}
            className="sp-btn-primary inline-flex items-center justify-center gap-2 rounded-xl h-11 text-sm font-bold ka flex-1"
          >
            <RotateCcw className="w-4 h-4" />
            ივარჯიშე კიდევ
          </button>
          <button
            onClick={onBackToSpeaking}
            className="inline-flex items-center justify-center gap-2 rounded-xl h-11 px-4 text-sm font-bold ka border border-[hsl(220_22%_88%)] sp-text hover:bg-[hsl(40_40%_96%)] flex-1"
          >
            დაბრუნდი მთავარზე
          </button>
        </div>
      </div>
    </SpeakingShell>
  );
}

function Stat({ label_ka, value, small }: { label_ka: string; value: string | number; small?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider sp-text-muted ka">{label_ka}</div>
      <div className={`font-extrabold sp-text mt-0.5 ${small ? "text-sm truncate" : "text-lg"}`}>{value}</div>
    </div>
  );
}

function Section({ title_ka, children }: { title_ka: string; children: React.ReactNode }) {
  return (
    <div className="sp-card p-4">
      <div className="text-[11px] uppercase tracking-wider font-bold sp-text-muted ka mb-2">{title_ka}</div>
      {children}
    </div>
  );
}
