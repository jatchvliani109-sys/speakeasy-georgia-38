import { useEffect, useRef, useState } from "react";
import { Mic, Square, RotateCcw, Loader2, Check, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Props = {
  target: string;
  topic?: string;
  source?: string; // e.g. "pronunciation" | "daily_lesson" | "roleplay"
  onScored?: (score: number) => void;
  compact?: boolean;
};

type Status = "idle" | "recording" | "processing" | "result" | "error";

// Normalize for comparison: lowercase, strip punctuation + non-letters
function normalizeWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

// LCS length for word arrays
function lcs(a: string[], b: string[]): number {
  const m = a.length, n = b.length;
  if (!m || !n) return 0;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

function scorePronunciation(target: string, heard: string) {
  const t = normalizeWords(target);
  const h = normalizeWords(heard);
  if (!t.length) return { score: 0, missing: [] as string[], matched: 0 };
  if (!h.length) return { score: 0, missing: t, matched: 0 };
  const matched = lcs(t, h);
  // Coverage of target words (in order) with a penalty for extra/wrong words.
  const coverage = matched / t.length;
  const noise = Math.max(0, h.length - t.length) / Math.max(t.length, 1);
  const raw = coverage * 100 - noise * 12;
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const heardSet = new Set(h);
  const missing = t.filter((w) => !heardSet.has(w));
  return { score, missing, matched };
}

function buildFeedback(score: number, missing: string[]): string {
  if (score >= 90) return "ძალიან კარგი! შეგიძლია შემდეგ ფრაზაზე გადახვიდე.";
  if (score >= 75) {
    if (missing.length) return `კარგია. გამოგრჩა სიტყვა: ${missing.slice(0, 2).join(", ")}.`;
    return "კარგია. სცადე კიდევ ერთხელ უფრო გარკვევით.";
  }
  if (score >= 50) {
    if (missing.length) return `ცოტა გამოგრჩა. გაიმეორე ეს ნაწილი: ${missing.slice(0, 3).join(", ")}.`;
    return "კარგი ცდა. სცადე უფრო ნელა და გარკვევით.";
  }
  return "სცადე თავიდან. ჯერ მოუსმინე ფრაზას და შემდეგ ნელა გაიმეორე.";
}

function pickMimeType(): string {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  for (const t of types) {
    try { if ((MediaRecorder as any).isTypeSupported?.(t)) return t; } catch {}
  }
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

export default function SpeakingRecorder({ target, topic, source, onScored, compact }: Props) {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeRef = useRef<string>("audio/webm");

  const supported = typeof window !== "undefined"
    && !!(navigator as any).mediaDevices?.getUserMedia
    && typeof window.MediaRecorder !== "undefined";

  useEffect(() => () => {
    try { recorderRef.current?.state === "recording" && recorderRef.current.stop(); } catch {}
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const reset = () => {
    setStatus("idle");
    setErrorMsg(null);
    setTranscript("");
    setScore(null);
    setMissing([]);
    setFeedback("");
  };

  const start = async () => {
    if (!supported) {
      setErrorMsg("შენი ბრაუზერი არ უჭერს მხარს ჩაწერას. სცადე Chrome ან Safari.");
      setStatus("error");
      return;
    }
    if (!navigator.onLine) {
      setErrorMsg("ინტერნეტი ვერ მოიძებნა. ჩაწერისთვის საჭიროა ქსელი.");
      setStatus("error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMimeType();
      mimeRef.current = mime;
      const rec = new MediaRecorder(stream, { mimeType: mime });
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => handleStop();
      rec.start();
      setStatus("recording");
      setErrorMsg(null);
    } catch (e: any) {
      const msg = e?.name === "NotAllowedError"
        ? "მიკროფონის გამოყენებისთვის საჭიროა ნებართვა."
        : "მიკროფონი ვერ ჩაირთო. სცადე თავიდან.";
      setErrorMsg(msg);
      setStatus("error");
    }
  };

  const stop = () => {
    try { recorderRef.current?.stop(); } catch {}
  };

  const handleStop = async () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (!chunksRef.current.length) {
      setErrorMsg("ჩანაწერი ვერ მოიძებნა. სცადე თავიდან.");
      setStatus("error");
      return;
    }
    setStatus("processing");
    try {
      const blob = new Blob(chunksRef.current, { type: mimeRef.current });
      if (blob.size < 800) {
        setErrorMsg("ჩანაწერი ძალიან მოკლეა. სცადე თავიდან, ნელა და გარკვევით.");
        setStatus("error");
        return;
      }
      const audioBase64 = await blobToBase64(blob);
      const { data, error } = await supabase.functions.invoke("speech-to-text", {
        body: { audioBase64, mimeType: mimeRef.current },
      });
      if (error || !data || (data as any).error) {
        setErrorMsg("ვერ გავიგეთ კარგად. სცადე თავიდან, ნელა და გარკვევით.");
        setStatus("error");
        return;
      }
      const heard: string = ((data as any).text ?? "").trim();
      setTranscript(heard);
      const { score: sc, missing: miss } = scorePronunciation(target, heard);
      const fb = buildFeedback(sc, miss);
      setScore(sc);
      setMissing(miss);
      setFeedback(fb);
      setStatus("result");
      onScored?.(sc);

      if (user) {
        try {
          await supabase.from("pronunciation_attempts").insert({
            user_id: user.id,
            target_phrase: target,
            transcript: heard,
            score: sc,
            feedback_ka: fb,
            missing_words: miss,
            topic: topic ?? null,
            source: source ?? null,
          });
        } catch {}
      }
    } catch {
      setErrorMsg("ვერ გავიგეთ კარგად. სცადე თავიდან.");
      setStatus("error");
    }
  };

  const scoreColor = score == null ? "" : score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-rose-600";

  return (
    <div className={compact ? "" : "mt-3"}>
      <div className="flex flex-wrap items-center gap-2">
        {status !== "recording" && status !== "processing" && (
          <button
            type="button"
            onClick={start}
            className="inline-flex items-center gap-1.5 rounded-full sp-btn-teal px-3.5 py-1.5 text-xs font-semibold ka"
          >
            <Mic className="w-3.5 h-3.5" /> 🎤 ჩაწერა
          </button>
        )}
        {status === "recording" && (
          <button
            type="button"
            onClick={stop}
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 text-white px-3.5 py-1.5 text-xs font-semibold ka animate-pulse"
          >
            <Square className="w-3.5 h-3.5" /> ⏹ გაჩერება
          </button>
        )}
        {status === "processing" && (
          <span className="inline-flex items-center gap-1.5 rounded-full sp-chip px-3 py-1.5 text-xs font-medium ka">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> ვამუშავებთ...
          </span>
        )}
        {(status === "result" || status === "error") && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-full sp-chip px-3 py-1.5 text-xs font-semibold ka"
          >
            <RotateCcw className="w-3.5 h-3.5" /> 🔁 თავიდან
          </button>
        )}
      </div>

      {status === "error" && errorMsg && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 ka">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {status === "result" && score != null && (
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
