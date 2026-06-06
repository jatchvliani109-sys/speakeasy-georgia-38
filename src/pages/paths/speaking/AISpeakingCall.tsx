import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Mic, MicOff, PhoneOff, Lightbulb, Sparkles,
  Loader2, RotateCcw, X, Radio, Clock, CheckCircle2, Lock,
} from "lucide-react";
import SpeakingShell from "./components/SpeakingShell";
import SpeakButton from "@/components/SpeakButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { recordSpeakingActivity } from "./lib/tracker";
import { getEncouragementKa, dailySeed } from "./lib/encouragement";
import { useRealtimeCall, type RtStatus } from "./lib/useRealtimeCall";
import { SCENARIOS, GROUP_LABEL_KA, scenarioById, type Scenario, type ScenarioGroup } from "./lib/scenarios";
import { TIERS, TIER_LABEL_KA, type Tier, scoreSession, isCompletionEligible, isTierUnlocked, isTierCompleted } from "./lib/progression";
import { useSpeakingProgress } from "./lib/useSpeakingProgress";
import { toast } from "sonner";

// --- Types --------------------------------------------------------------

type Msg = { role: "user" | "assistant"; content: string; pending?: boolean };
type Step = "setup" | "explain" | "call" | "summary";

// Backwards-compat alias so existing references downstream keep working.
type Topic = Scenario;

// --- Component ----------------------------------------------------------

export default function AISpeakingCall() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { map, recordCompletion } = useSpeakingProgress();

  const [step, setStep] = useState<Step>("setup");
  const [topic, setTopic] = useState<Topic | null>(null);
  const [tier, setTier] = useState<Tier>("easy");
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

  // Deep-link support: ?scenario=cafe&tier=easy → jump to explain
  useEffect(() => {
    if (step !== "setup") return;
    const sid = searchParams.get("scenario");
    const tParam = (searchParams.get("tier") as Tier | null) ?? "easy";
    if (!sid) return;
    const found = scenarioById(sid);
    if (!found) return;
    if (!isTierUnlocked(map, sid, tParam)) {
      toast.error("ეს დონე ჯერ დაბლოკილია — ჯერ წინა დონე გაიარე.");
      return;
    }
    setTopic(found);
    setTier(tParam);
    setStep("explain");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, map, step]);

  // ---- Setup -----------------------------------------------------------
  if (step === "setup") {
    const groups: ScenarioGroup[] = ["Beginner", "Elementary", "Intermediate", "Free"];
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

          {groups.map((g, gIdx) => {
            const items = SCENARIOS.filter((t) => t.group === g);
            if (!items.length) return null;
            return (
              <section key={g}>
                {gIdx > 0 && <div className="sp-curve-divider" aria-hidden="true" />}
                <h3 className="text-[11px] font-bold uppercase tracking-wider sp-text-muted ka mb-2">
                  {GROUP_LABEL_KA[g]}
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {items.map((t) => (
                    <ScenarioRow
                      key={t.id}
                      scenario={t}
                      map={map}
                      onPick={(picked, pickedTier) => {
                        setTopic(picked);
                        setTier(pickedTier);
                        setStep("explain");
                      }}
                    />
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
              onClick={() => {
                if (searchParams.get("scenario")) {
                  navigate("/path/speaking");
                } else {
                  setStep("setup");
                }
              }}
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

          <div className="rounded-xl bg-[hsl(40_91%_93%)] border border-[hsl(38_55%_82%)] p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] font-bold uppercase tracking-wider sp-text-muted ka">თემა</div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[hsl(41_100%_47%)] text-[hsl(31_53%_12%)] ka">
                {TIER_LABEL_KA[tier]}
              </span>
            </div>
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
        tier={tier}
        level={level}
        onBack={() => {
          if (searchParams.get("scenario")) navigate("/path/speaking");
          else setStep("explain");
        }}
        onEnd={(messages, durationSec) => {
          (window as any).__sp_call_data = { topic, tier, level, messages, durationSec };
          setStep("summary");
        }}
      />
    );
  }

  // ---- Summary ---------------------------------------------------------
  if (step === "summary" && topic) {
    const data = (window as any).__sp_call_data ?? { topic, tier, level, messages: [], durationSec: 0 };
    return (
      <SummaryScreen
        topic={data.topic}
        tier={data.tier ?? tier}
        level={data.level}
        messages={data.messages}
        durationSec={data.durationSec}
        recordCompletion={recordCompletion}
        onPracticeAgain={() => { setStep("setup"); }}
        onBackToSpeaking={() => navigate("/path/speaking")}
      />
    );
  }

  return null;
}

function ScenarioRow({
  scenario, map, onPick,
}: {
  scenario: Scenario;
  map: ReturnType<typeof useSpeakingProgress>["map"];
  onPick: (s: Scenario, t: Tier) => void;
}) {
  const Icon = scenario.Icon;
  return (
    <div className="sp-card p-3.5 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl sp-chip-teal flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-bold sp-text text-[14px]">{scenario.title_en}</div>
        <div className="text-[12px] sp-text-muted ka leading-snug mt-0.5">{scenario.desc_ka}</div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {TIERS.map((t) => {
          const unlocked = isTierUnlocked(map, scenario.id, t);
          const done = isTierCompleted(map, scenario.id, t);
          return (
            <button
              key={t}
              disabled={!unlocked}
              onClick={() => onPick(scenario, t)}
              title={`${TIER_LABEL_KA[t]}${done ? " ✓" : unlocked ? "" : " (დაბლოკილია)"}`}
              className={`h-9 min-w-9 px-2 rounded-lg text-[11px] font-bold ka inline-flex items-center justify-center gap-1 transition-colors ${
                done
                  ? "bg-[hsl(33_69%_45%)] text-[hsl(40_91%_96%)]"
                  : unlocked
                  ? "border border-[hsl(38_70%_72%)] bg-[hsl(40_91%_93%)] sp-text hover:bg-[hsl(40_91%_88%)]"
                  : "bg-[hsl(38_25%_88%)] text-[hsl(30_15%_55%)] cursor-not-allowed"
              }`}
            >
              {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : !unlocked ? <Lock className="w-3 h-3" /> : null}
              {TIER_LABEL_KA[t]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ExplainItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-1.5 h-1.5 rounded-full bg-[hsl(33_69%_45%)] mt-2 shrink-0" />
      <p className="text-sm sp-text ka leading-relaxed">{text}</p>
    </div>
  );
}

// --- Call screen --------------------------------------------------------

const STATUS_LABEL_KA: Record<RtStatus, string> = {
  idle: "მზად",
  connecting: "ვუკავშირდები...",
  ready: "AI მზად არის",
  listening: "გისმენ...",
  ai_speaking: "AI ლაპარაკობს...",
  thinking: "ვფიქრობ...",
  ended: "სესია დასრულდა",
  error: "კავშირის შეცდომა",
};

// Automatic Georgian detection removed — user manually requests Georgian help.

function CallScreen({
  topic, tier, level, onBack, onEnd,
}: {
  topic: Topic;
  tier: Tier;
  level: string;
  onBack: () => void;
  onEnd: (messages: Msg[], durationSec: number) => void;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [partial, setPartial] = useState<{ user: string; ai: string }>({ user: "", ai: "" });
  const [showHelp, setShowHelp] = useState(false);
  const [helpInput, setHelpInput] = useState("");
  const [helpLoading, setHelpLoading] = useState(false);
  const [helpData, setHelpData] = useState<{ english: string; georgian: string } | null>(null);
  const [showCorrect, setShowCorrect] = useState(false);
  const [correctInput, setCorrectInput] = useState("");
  const manualMode = true; // push-to-talk only (free/auto listening disabled)
  const [pttActive, setPttActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showTimeWarn, setShowTimeWarn] = useState(false);
  const startedAtRef = useRef<number>(Date.now());
  const transcriptRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Msg[]>([]);
  messagesRef.current = messages;

  const [learningPath, setLearningPath] = useState<string | undefined>();
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("selected_learning_path")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.selected_learning_path) setLearningPath(data.selected_learning_path);
    })();
  }, [user]);

  const handleEvent = useCallback((e: any) => {
    if (e.kind === "user_turn_started") {
      // Reserve user's slot BEFORE the AI starts answering so transcript order stays correct.
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === "user" && last.pending) return prev;
        console.log("[rt] pending transcript created");
        return [...prev, { role: "user", content: "Transcribing…", pending: true }];
      });
    } else if (e.kind === "ai_text") {
      if (e.final) {
        console.log("[rt] AI response appended");
        setMessages((prev) => [...prev, { role: "assistant", content: e.text }]);
        setPartial((p) => ({ ...p, ai: "" }));
      } else {
        setPartial((p) => ({ ...p, ai: e.text }));
      }
    } else if (e.kind === "user_text") {
      if (e.final) {
        console.log("[rt] user transcript finalized → updating pending");
        setMessages((prev) => {
          // Update the most recent pending user message in place.
          for (let i = prev.length - 1; i >= 0; i--) {
            if (prev[i].role === "user" && prev[i].pending) {
              const copy = prev.slice();
              copy[i] = { role: "user", content: e.text };
              return copy;
            }
          }
          // No pending slot — append (fallback).
          return [...prev, { role: "user", content: e.text }];
        });
        setPartial((p) => ({ ...p, user: "" }));
      } else {
        // Live partial — also update the pending slot text so order stays right.
        setMessages((prev) => {
          for (let i = prev.length - 1; i >= 0; i--) {
            if (prev[i].role === "user" && prev[i].pending) {
              const copy = prev.slice();
              copy[i] = { role: "user", content: e.text || "Transcribing…", pending: true };
              return copy;
            }
          }
          return prev;
        });
        setPartial((p) => ({ ...p, user: e.text }));
      }
    } else if (e.kind === "user_text_failed") {
      setMessages((prev) => {
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].role === "user" && prev[i].pending) {
            const copy = prev.slice();
            copy[i] = { role: "user", content: "Could not transcribe clearly" };
            return copy;
          }
        }
        return prev;
      });
      setPartial((p) => ({ ...p, user: "" }));
    }
  }, []);

  const { status, errorMsg, start, stop, setMicEnabled, sendUserText } = useRealtimeCall({
    topic: topic.title_en,
    level,
    tier,
    selectedLearningPath: learningPath,
    onEvent: handleEvent,
  });

  const isConnectedRef = useRef(false);
  const endingRef = useRef(false);

  const endSession = useCallback(() => {
    if (endingRef.current) return;
    endingRef.current = true;
    console.log("[rt] session ended (user / timer / unmount)");
    stop();
    const dur = Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000));
    onEnd(messagesRef.current, dur);
  }, [stop, onEnd]);

  // Hard safety: 2-min cap + 90s warn. Cleanup on unmount + tab close.
  useEffect(() => {
    startedAtRef.current = Date.now();
    const id = setInterval(() => {
      const sec = Math.floor((Date.now() - startedAtRef.current) / 1000);
      setElapsed(sec);
      if (sec >= 90 && !showTimeWarn) setShowTimeWarn(true);
      if (sec >= 120) {
        console.log("[rt] session ended by timer (120s hard cap)");
        clearInterval(id);
        endSession();
      }
    }, 1000);
    const onBeforeUnload = () => { console.log("[rt] tab closing — cleanup"); stop(); };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      clearInterval(id);
      window.removeEventListener("beforeunload", onBeforeUnload);
      console.log("[rt] CallScreen unmount → stop()");
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manual mode: keep mic muted until user holds the talk button.
  useEffect(() => {
    if (manualMode) setMicEnabled(pttActive);
    else setMicEnabled(true);
  }, [manualMode, pttActive, setMicEnabled, status]);

  // auto scroll
  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, partial]);

  const openHelp = () => {
    setShowHelp(true);
    setHelpInput("");
    setHelpData(null);
    setHelpLoading(false);
  };

  const submitHelp = async () => {
    const georgianAsk = helpInput.trim();
    if (!georgianAsk) return;
    setHelpLoading(true);
    setHelpData(null);
    const r = await supabase.functions.invoke("ai-tutor", {
      body: {
        level,
        messages: [
          {
            role: "user",
            content:
              `The student is practicing English (topic: "${topic.title_en}"). ` +
              `They want to say this in English: "${georgianAsk}". ` +
              `Give ONE short, natural English sentence they can say (max 10 words), ` +
              `and the Georgian meaning. Reply in EXACTLY this format on two lines:\nEN: <english>\nKA: <georgian>`,
          },
        ],
      },
    });
    setHelpLoading(false);
    if (r.error || (r.data as any)?.error) {
      setHelpData({ english: "Sorry, I'm not sure.", georgian: "ბოდიში, ვერ მივხვდი." });
      return;
    }
    const reply = ((r.data as any).reply as string) ?? "";
    const en = (reply.match(/EN:\s*(.+)/i)?.[1] ?? "").trim().replace(/^["']|["']$/g, "");
    const ka = (reply.match(/KA:\s*(.+)/i)?.[1] ?? "").trim().replace(/^["']|["']$/g, "");
    setHelpData({
      english: en || "Can you help me, please?",
      georgian: ka || georgianAsk,
    });
  };

  const submitCorrection = () => {
    const text = correctInput.trim();
    if (!text) return;
    sendUserText(text);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setCorrectInput("");
    setShowCorrect(false);
  };


  const isConnected = status === "ready" || status === "listening" || status === "ai_speaking" || status === "thinking";

  return (
    <SpeakingShell>
      <div className="max-w-md mx-auto flex flex-col min-h-[calc(100vh-7rem)]">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-3 mb-4">
          <button
            onClick={() => { stop(); onBack(); }}
            className="w-9 h-9 rounded-full sp-chip inline-flex items-center justify-center"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="text-center min-w-0">
            <div className="text-[10px] uppercase tracking-wider sp-text-muted ka">თემა</div>
            <div className="font-bold sp-text text-sm truncate">{topic.title_en}</div>
          </div>
          {isConnected ? (
            <button
              onClick={endSession}
              className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 text-white px-3 h-9 text-xs font-bold ka"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              დასრულება
            </button>
          ) : (
            <div className="w-[88px]" />
          )}
        </header>


        {/* AI Tutor area */}
        <div className="flex-1 flex flex-col items-center justify-start pt-4">
          <div
            className={`relative w-32 h-32 rounded-full flex items-center justify-center shrink-0 transition-transform ${
              status === "ai_speaking" ? "sp-recording" : ""
            }`}
            style={{
              background:
                "linear-gradient(135deg, hsl(41 100% 55%), hsl(33 80% 45%) 60%, hsl(28 60% 25%))",
              boxShadow: "0 12px 40px -10px hsl(31 60% 18% / 0.45)",
            }}
          >
            <Mic className="w-12 h-12 text-[hsl(40_91%_96%)]" aria-hidden />
            {(status === "thinking" || status === "connecting") && (
              <span className="absolute inset-0 rounded-full border-4 border-[hsl(40_91%_96%)]/40 border-t-transparent animate-spin" />
            )}
          </div>

          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full sp-chip text-xs ka">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                status === "listening" ? "bg-emerald-500 animate-pulse" :
                status === "ai_speaking" ? "bg-violet-500 animate-pulse" :
                status === "thinking" || status === "connecting" ? "bg-amber-500 animate-pulse" :
                status === "ready" ? "bg-emerald-500" :
                status === "error" ? "bg-rose-500" :
                "bg-slate-400"
              }`}
            />
            {STATUS_LABEL_KA[status]}
          </div>

          {/* Transcript (secondary) */}
          <div
            ref={transcriptRef}
            className="w-full mt-5 max-h-56 overflow-y-auto rounded-xl bg-[hsl(40_45%_98%)] border border-[hsl(38_55%_82%)] p-3 space-y-2 text-[13px]"
          >
            {messages.length === 0 && !partial.ai && !partial.user && (
              <p className="text-center sp-text-muted ka text-xs py-6">
                {status === "idle" ? "დააჭირე „დაიწყე“ რომ დაიწყო საუბარი."
                  : status === "connecting" ? "ვუკავშირდები AI-ს..."
                  : "Transcript will appear here."}
              </p>
            )}
            {messages.map((m, i) => (
              <TranscriptLine key={i} role={m.role} text={m.content} />
            ))}
            {partial.ai && <TranscriptLine role="assistant" text={partial.ai} faded />}
          </div>
        </div>

        {/* Bottom controls */}
        <div className="mt-4 mb-2">
          {status === "idle" || status === "ended" ? (
            <button
              onClick={start}
              className="sp-btn-primary w-full inline-flex items-center justify-center gap-2 rounded-xl h-14 text-base font-bold ka"
            >
              <Mic className="w-5 h-5" />
              {status === "ended" ? "თავიდან დაიწყე" : "დაიწყე საუბარი"}
            </button>
          ) : status === "error" ? (
            <div className="space-y-2">
              {errorMsg && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 ka">
                  {errorMsg}
                </div>
              )}
              <button
                onClick={start}
                className="sp-btn-primary w-full inline-flex items-center justify-center gap-2 rounded-xl h-12 text-sm font-bold ka"
              >
                <RotateCcw className="w-4 h-4" />
                სცადე თავიდან
              </button>
            </div>
          ) : status === "connecting" ? (
            <div className="text-center text-xs sp-text-muted ka inline-flex items-center justify-center gap-2 w-full h-12">
              <Loader2 className="w-4 h-4 animate-spin" /> ვუკავშირდები...
            </div>
          ) : manualMode ? (
            <button
              type="button"
              onMouseDown={() => setPttActive(true)}
              onMouseUp={() => setPttActive(false)}
              onMouseLeave={() => setPttActive(false)}
              onTouchStart={(e) => { e.preventDefault(); setPttActive(true); }}
              onTouchEnd={(e) => { e.preventDefault(); setPttActive(false); }}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-xl h-14 text-base font-bold ka transition-all select-none ${
                pttActive
                  ? "bg-[hsl(33_69%_45%)] text-white scale-[0.99] shadow-inner"
                  : "sp-btn-primary"
              }`}
            >
              <Mic className="w-5 h-5" />
              {pttActive ? "ვლაპარაკობ..." : "დაიჭირე და ილაპარაკე"}
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full sp-chip-teal px-3 py-2 text-xs font-bold ka">
                <Radio className="w-3.5 h-3.5" /> ცოცხალი ხმოვანი კავშირი
              </div>
            </div>
          )}

          <p className="text-center text-[11px] sp-text-muted ka mt-2">
            {isConnected
              ? "AI დაიწყებს საუბარს. შენ პასუხისთვის დააჭირე ღილაკს და ილაპარაკე."
              : ""}
          </p>

          {/* Help + Correction */}
          {isConnected && (
            <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={openHelp}
                className="inline-flex items-center gap-1.5 rounded-full sp-chip-teal px-3 py-1.5 text-xs font-bold ka"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                დახმარება ქართულად
              </button>
              <button
                type="button"
                onClick={() => { setCorrectInput(""); setShowCorrect(true); }}
                className="inline-flex items-center gap-1.5 rounded-full sp-chip px-3 py-1.5 text-xs font-bold ka border border-[hsl(220_22%_88%)]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                AI-მ არასწორად გაიგო
              </button>
            </div>
          )}
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

              {!helpData && !helpLoading && (
                <>
                  <label className="text-xs sp-text ka block mb-2">რისი თქმა გინდა ინგლისურად?</label>
                  <textarea
                    value={helpInput}
                    onChange={(e) => setHelpInput(e.target.value)}
                    rows={3}
                    placeholder="მაგ: მინდა პიცის შეკვეთა"
                    className="w-full rounded-xl border border-[hsl(38_55%_82%)] bg-[hsl(40_45%_98%)] p-3 text-sm sp-text ka focus:outline-none focus:ring-2 focus:ring-[hsl(33_69%_45%)]"
                  />
                  <button
                    onClick={submitHelp}
                    disabled={!helpInput.trim()}
                    className="sp-btn-primary w-full mt-3 inline-flex items-center justify-center gap-2 rounded-xl h-11 text-sm font-bold ka disabled:opacity-50"
                  >
                    მაჩვენე ინგლისურად
                  </button>
                </>
              )}

              {helpLoading && (
                <div className="py-6 flex items-center justify-center sp-text-muted text-sm gap-2 ka">
                  <Loader2 className="w-4 h-4 animate-spin" /> ქართული დახმარება მზადდება...
                </div>
              )}

              {helpData && !helpLoading && (
                <>
                  <div className="ka text-xs sp-text-muted mb-1">თქვი ასე:</div>
                  <div className="rounded-xl bg-[hsl(40_91%_93%)] border border-[hsl(38_55%_82%)] p-3 flex items-center justify-between gap-2">
                    <div className="font-bold sp-text text-base">{helpData.english}</div>
                    <SpeakButton text={helpData.english} />
                  </div>
                  <div className="mt-2 text-sm sp-text ka">
                    <span className="sp-text-muted">ნიშნავს:</span> „{helpData.georgian}“
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

        {/* "AI heard me wrong" correction overlay */}
        {showCorrect && (
          <div
            className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowCorrect(false)}
          >
            <div
              className="sp-card max-w-md w-full p-5 sp-pop-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="font-bold sp-text ka">დაწერე რისი თქმაც გინდოდა</h3>
                <button onClick={() => setShowCorrect(false)} className="sp-text-soft p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                value={correctInput}
                onChange={(e) => setCorrectInput(e.target.value)}
                rows={3}
                placeholder="I would like to order pizza."
                className="w-full rounded-xl border border-[hsl(38_55%_82%)] bg-[hsl(40_45%_98%)] p-3 text-sm sp-text focus:outline-none focus:ring-2 focus:ring-[hsl(33_69%_45%)]"
              />
              <button
                onClick={submitCorrection}
                disabled={!correctInput.trim()}
                className="sp-btn-primary w-full mt-3 inline-flex items-center justify-center gap-2 rounded-xl h-11 text-sm font-bold ka disabled:opacity-50"
              >
                გაგზავნა
              </button>
            </div>
          </div>
        )}
      </div>
    </SpeakingShell>
  );
}

function TranscriptLine({ role, text, faded }: { role: "user" | "assistant"; text: string; faded?: boolean }) {
  return (
    <div className={`flex gap-2 ${faded ? "opacity-60" : ""}`}>
      <span className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 shrink-0 ${
        role === "assistant" ? "text-[hsl(28_55%_30%)]" : "text-[hsl(33_75%_28%)]"
      }`}>
        {role === "assistant" ? "AI" : "You"}
      </span>
      <div className="flex-1 min-w-0">
        <div className="sp-text whitespace-pre-wrap break-words">{text}</div>
      </div>
    </div>
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
  topic, tier, level, messages, durationSec, recordCompletion, onPracticeAgain, onBackToSpeaking,
}: {
  topic: Topic;
  tier: Tier;
  level: string;
  messages: Msg[];
  durationSec: number;
  recordCompletion: (input: { scenarioId: string; tier: Tier; score: number }) => Promise<{ newlyUnlockedTier: Tier | null; upgraded?: boolean }>;
  onPracticeAgain: () => void;
  onBackToSpeaking: () => void;
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SessionSummary>({});
  const [unlocked, setUnlocked] = useState<Tier | null>(null);
  const [scored, setScored] = useState<number | null>(null);
  const savedRef = useRef(false);

  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;
    (async () => {
      let summ: SessionSummary = {};
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

      const userTurns = messages.filter((m) => m.role === "user").length;
      const score = scoreSession({
        userTurns,
        mistakesCount: summ.mistakes?.length ?? 0,
        phrasesCount: summ.useful_phrases?.length ?? 0,
        durationSec,
      });
      setScored(score);

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
              difficulty: topic.group,
              tier,
              score,
              duration_sec: durationSec,
              voice_prompts_completed: userTurns,
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

          // Record progression — only if user actually engaged (>= 4 turns).
          if (isCompletionEligible(userTurns)) {
            const res = await recordCompletion({ scenarioId: topic.id, tier, score });
            if (res.newlyUnlockedTier) {
              setUnlocked(res.newlyUnlockedTier);
              toast.success(`${TIER_LABEL_KA[res.newlyUnlockedTier]} დონე განბლოკილია!`);
            }
          }
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
          <div className="mx-auto w-12 h-12 rounded-full bg-[hsl(41_100%_55%)] text-[hsl(31_53%_12%)] flex items-center justify-center mb-3">
            {unlocked ? <Sparkles className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
          </div>
          <h1 className="text-xl font-extrabold sp-text ka">
            {unlocked ? `${TIER_LABEL_KA[unlocked]} დონე განბლოკილია!` : "სესია დასრულებულია"}
          </h1>
          <p className="text-sm sp-text ka mt-2">
            {summary.encouragement_ka || getEncouragementKa(dailySeed())}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[hsl(41_100%_47%)] text-[hsl(31_53%_12%)] text-[11px] font-bold ka">
            {TIER_LABEL_KA[tier]} {scored !== null ? `· ${scored}%` : ""}
          </div>
        </div>

        <div className="sp-card p-4 grid grid-cols-2 gap-3">
          <Stat label_ka="თემა" value={topic.title_en} small />
          <Stat label_ka="დრო" value={`${minutes}:${String(seconds).padStart(2, "0")}`} />
          <Stat label_ka="შენი პასუხები" value={messages.filter((m) => m.role === "user").length} />
          <Stat label_ka="დონე" value={GROUP_LABEL_KA[topic.group]} small />
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
            className="inline-flex items-center justify-center gap-2 rounded-xl h-11 px-4 text-sm font-bold ka border border-[hsl(220_22%_88%)] sp-text hover:bg-[hsl(40_91%_92%)] flex-1"
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
