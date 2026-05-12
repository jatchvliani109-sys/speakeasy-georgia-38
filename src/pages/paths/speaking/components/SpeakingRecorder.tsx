import { useEffect, useRef, useState } from "react";
import { Mic, Square, RotateCcw, Loader2, Check, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Props = {
  target?: string;
  topic?: string;
  source?: string;
  mode?: "score" | "transcribe";
  onScored?: (score: number) => void;
  onTranscript?: (text: string) => void;
  compact?: boolean;
  recordLabel?: string;
};

type Status = "idle" | "recording" | "processing" | "result" | "error";

const BACKUP_RECORD_MS = 20_000;

function normalizeWords(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
}
function lcs(a: string[], b: string[]): number {
  const m = a.length, n = b.length;
  if (!m || !n) return 0;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp[m][n];
}
function scorePronunciation(target: string, heard: string) {
  const t = normalizeWords(target);
  const h = normalizeWords(heard);
  if (!t.length) return { score: 0, missing: [] as string[], matched: 0 };
  if (!h.length) return { score: 0, missing: t, matched: 0 };
  const matched = lcs(t, h);
  const coverage = matched / t.length;
  const noise = Math.max(0, h.length - t.length) / Math.max(t.length, 1);
  let score = Math.max(0, Math.min(100, Math.round(coverage * 100 - noise * 10)));
  const heardSet = new Set(h);
  const missing = t.filter((w) => !heardSet.has(w));
  if (missing.length === 1 && matched >= t.length - 1) score = Math.max(score, 82);
  if (missing.length <= 2 && matched >= Math.max(1, t.length - 2)) score = Math.max(score, 68);
  return { score, missing, matched };
}
function buildFeedback(score: number, missing: string[], target: string): string {
  if (score >= 90) return "ძალიან კარგი! შეგიძლია შემდეგ ფრაზაზე გადახვიდე.";
  if (score >= 75) return missing.length
    ? `Good try! Better: “${target}.” სცადე კიდევ ერთხელ ნელა.`
    : "კარგია. სცადე კიდევ ერთხელ უფრო გარკვევით.";
  if (score >= 50) return missing.length
    ? `ცოტა გამოგრჩა. გაიმეორე ეს ნაწილი: ${missing.slice(0, 3).join(", ")}.`
    : "კარგი ცდა. სცადე უფრო ნელა და გარკვევით.";
  return "სცადე თავიდან. ჯერ მოუსმინე ფრაზას და შემდეგ ნელა გაიმეორე.";
}
function pickMimeType(): string {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  for (const t of types) { try { if ((MediaRecorder as any).isTypeSupported?.(t)) return t; } catch {} }
  return "audio/webm";
}
async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
  }
  return btoa(bin);
}

export default function SpeakingRecorder({
  target, topic, source, mode = "score", onScored, onTranscript, compact, recordLabel,
}: Props) {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>("idle");
  const statusRef = useRef<Status>("idle");
  const setS = (s: Status) => { statusRef.current = s; setStatus(s); };

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeRef = useRef<string>("audio/webm");
  const ignoreStopRef = useRef(false);
  const autoStopTimer = useRef<number | null>(null);
  const watchdog = useRef<number | null>(null);

  const recorderSupported = typeof window !== "undefined"
    && !!(navigator as any).mediaDevices?.getUserMedia
    && typeof window.MediaRecorder !== "undefined";

  const cleanup = () => {
    if (autoStopTimer.current) { clearTimeout(autoStopTimer.current); autoStopTimer.current = null; }
    if (watchdog.current) { clearTimeout(watchdog.current); watchdog.current = null; }
    try {
      if (recorderRef.current && recorderRef.current.state === "recording") {
        ignoreStopRef.current = true;
        recorderRef.current.stop();
      }
    } catch {}
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
  };
  useEffect(() => () => cleanup(), []);

  const reset = () => {
    cleanup();
    setErrorMsg(null);
    setTranscript("");
    setScore(null);
    setMissing([]);
    setFeedback("");
    setS("idle");
  };

  const failSafeReset = (msg = "ჩაწერა ვერ დასრულდა სწორად. სცადე თავიდან.") => {
    cleanup();
    setErrorMsg(msg);
    setS("error");
  };

  const finish = async (heard: string) => {
    cleanup();
    setTranscript(heard);
    if (mode === "transcribe") {
      setS("result");
      onTranscript?.(heard);
      return;
    }
    const t = target ?? "";
    const { score: sc, missing: miss } = scorePronunciation(t, heard);
    const fb = buildFeedback(sc, miss, t);
    setScore(sc); setMissing(miss); setFeedback(fb);
    setS("result");
    onScored?.(sc);
    if (user && t) {
      try {
        await supabase.from("pronunciation_attempts").insert({
          user_id: user.id, target_phrase: t, transcript: heard,
          score: sc, feedback_ka: fb, missing_words: miss,
          topic: topic ?? null, source: source ?? null,
        });
      } catch {}
    }
  };

  const armAutoStop = () => {
    if (autoStopTimer.current) clearTimeout(autoStopTimer.current);
    autoStopTimer.current = window.setTimeout(() => {
      if (statusRef.current === "recording") stop();
    }, BACKUP_RECORD_MS);
  };

  const startRecorderFallback = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMimeType();
      mimeRef.current = mime;
      const rec = new MediaRecorder(stream, { mimeType: mime });
      recorderRef.current = rec;
      chunksRef.current = [];
      ignoreStopRef.current = false;
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => handleRecorderStop();
      rec.start();
      setS("recording");
      setErrorMsg(null);
      armAutoStop();
    } catch (e: any) {
      const msg = e?.name === "NotAllowedError"
        ? "მიკროფონის გამოყენებისთვის საჭიროა ნებართვა."
        : "ჩაწერა ვერ მოხერხდა. სცადე თავიდან.";
      failSafeReset(msg);
    }
  };

  const start = async () => {
    if (statusRef.current === "recording" || statusRef.current === "processing") return;
    reset();
    if (!navigator.onLine) return failSafeReset("ინტერნეტი ვერ მოიძებნა. ჩაწერისთვის საჭიროა ქსელი.");
    if (recorderSupported) return startRecorderFallback();
    failSafeReset("შენი ბრაუზერი არ უჭერს მხარს ჩაწერას. სცადე Chrome-ის უახლესი ვერსია.");
  };

  const stop = () => {
    if (statusRef.current !== "recording") return;
    if (autoStopTimer.current) { clearTimeout(autoStopTimer.current); autoStopTimer.current = null; }
    let stopped = false;
    try {
      if (recorderRef.current && recorderRef.current.state === "recording") {
        recorderRef.current.requestData?.();
        recorderRef.current.stop();
        stopped = true;
        setS("processing");
      }
    } catch {}
    // Watchdog: keep the UI from getting stuck if the browser never resolves stop/transcription.
    if (watchdog.current) clearTimeout(watchdog.current);
    watchdog.current = window.setTimeout(() => {
      if (statusRef.current === "recording" || statusRef.current === "processing") {
        failSafeReset("ვერ გავიგეთ კარგად. სცადე ნელა და ახლოს მიკროფონთან.");
      }
    }, 30000);
    if (!stopped) failSafeReset();
  };

  const handleRecorderStop = async () => {
    if (ignoreStopRef.current) { ignoreStopRef.current = false; return; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (!chunksRef.current.length) return failSafeReset("ვერ გავიგეთ კარგად. სცადე ნელა და ახლოს მიკროფონთან.");
    setS("processing");
    try {
      const blob = new Blob(chunksRef.current, { type: mimeRef.current });
      if (blob.size < 800) return failSafeReset("ვერ გავიგეთ კარგად. სცადე ნელა და ახლოს მიკროფონთან.");
      const audioBase64 = await blobToBase64(blob);
      const { data, error } = await supabase.functions.invoke("speech-to-text", {
        body: { audioBase64, mimeType: mimeRef.current },
      });
      const payload: any = data ?? {};
      if (error || payload.fallback || payload.error || !payload.text) {
        return failSafeReset("ვერ გავიგეთ კარგად. სცადე ნელა და ახლოს მიკროფონთან.");
      }
      await finish((payload.text as string).trim());
    } catch {
      failSafeReset("ვერ გავიგეთ კარგად. სცადე ნელა და ახლოს მიკროფონთან.");
    }
  };

  const scoreColor = score == null ? "" : score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-rose-600";
  const isRecording = status === "recording";
  const isProcessing = status === "processing";

  return (
    <div className={compact ? "" : "mt-1"}>
      <div className="flex flex-wrap items-center gap-2">
        {!isRecording && !isProcessing && (
          <button
            type="button"
            onClick={start}
            disabled={isRecording || isProcessing}
            className="inline-flex items-center gap-1.5 rounded-full sp-btn-teal px-3.5 py-1.5 text-xs font-semibold ka disabled:opacity-50"
          >
            <Mic className="w-3.5 h-3.5" /> 🎤 {recordLabel ?? "ჩაწერა"}
          </button>
        )}
        {isRecording && (
          <button
            type="button"
            onClick={stop}
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 text-white px-3.5 py-1.5 text-xs font-semibold ka animate-pulse"
          >
            <Square className="w-3.5 h-3.5" /> ⏹ გაჩერება
          </button>
        )}
        {isProcessing && (
          <span className="inline-flex items-center gap-1.5 rounded-full sp-chip px-3 py-1.5 text-xs font-medium ka">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...
          </span>
        )}
        {isRecording && (
          <span className="text-[11px] ka sp-text-soft">Recording... speak now (max 20 წმ)</span>
        )}
        {(status === "result" || status === "error") && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-full sp-chip px-3 py-1.5 text-xs font-semibold ka"
          >
            <RotateCcw className="w-3.5 h-3.5" /> 🔁 Try again
          </button>
        )}
      </div>

      {status === "error" && errorMsg && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 ka">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {status === "result" && mode === "transcribe" && transcript && (
        <div className="mt-3 rounded-xl border border-[hsl(40_30%_88%)] bg-[hsl(40_45%_98%)] p-3 text-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "hsl(220 20% 50%)" }}>Heard</span>
          <div className="sp-text italic">{transcript}</div>
        </div>
      )}

      {status === "result" && mode === "score" && score != null && (
        <div className="mt-3 rounded-xl border border-[hsl(40_30%_88%)] bg-[hsl(40_45%_98%)] p-3.5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-wider font-bold ka" style={{ color: "hsl(220 25% 45%)" }}>
              Speaking Check
            </div>
            <div className={`text-2xl font-extrabold ${scoreColor}`}>{score}%</div>
          </div>
          <div className="mt-2 space-y-1.5 text-[13px]">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "hsl(220 20% 50%)" }}>Target</span>
              <div className="sp-text">{target}</div>
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "hsl(220 20% 50%)" }}>Heard</span>
              <div className="sp-text italic">{transcript || "—"}</div>
            </div>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-[hsl(40_30%_88%)] text-sm ka sp-text flex items-start gap-2">
            <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "hsl(175 60% 38%)" }} />
            <span>{feedback}</span>
          </div>
          {missing.length > 0 && (
            <div className="mt-2 text-xs ka" style={{ color: "hsl(220 20% 45%)" }}>
              ივარჯიშე: <span className="font-semibold sp-text">{missing.slice(0, 4).join(", ")}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
