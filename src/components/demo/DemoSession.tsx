// src/components/demo/DemoSession.tsx
//
// The try-it-before-you-register session that sits on the landing page.
//
// Why this exists: 250 visitors from the first Instagram ad reached the home
// page, 8 reached the signup form and 0 finished. Nobody will hand over an
// email to find out what a product is. So the product now runs on the landing
// page itself, and the account is only asked for once they want to continue.
//
// Deliberate constraints:
//  - NO auth, NO database, NO vocabulary bank import. It must work for a
//    stranger in Instagram's in-app browser, and it must not drag 144 KB of
//    word bank into the landing bundle. Questions live in demoQuestions.ts.
//  - Nothing is saved. Refreshing starts over, and that is fine — the point is
//    the experience, not the score.
//  - Identical for everyone, every time (see demoSession.ts).

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, X, Volume2 } from "lucide-react";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { track } from "@/lib/track";
import { DEMO_QUESTIONS, DEMO_TOTAL, demoVerdict, type DemoQuestion } from "./demoQuestions";

/** The Georgian label above each card, so the format is never a surprise. */
function promptFor(q: DemoQuestion): string {
  switch (q.type) {
    case "meaning": return "რას ნიშნავს?";
    case "toEnglish": return "როგორ იქნება ინგლისურად?";
    case "gap": return "შეავსე ცარიელი ადგილი";
    case "listening": return "მოისმინე და აირჩიე მნიშვნელობა";
    case "trueFalse": return "სწორი თუ არასწორი თარგმანი?";
  }
}

function choicesFor(q: DemoQuestion): { label: string; value: string }[] {
  if (q.type === "trueFalse") {
    return [
      { label: "სწორი", value: "true" },
      { label: "არასწორი", value: "false" },
    ];
  }
  return q.choices.map((c) => ({ label: c, value: c }));
}

function correctValue(q: DemoQuestion): string {
  return q.type === "trueFalse" ? String(q.isCorrect) : q.correct;
}

export default function DemoSession() {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const started = useRef(false);
  const finished = useRef(false);

  const q = DEMO_QUESTIONS[idx];
  const revealed = picked !== null;
  const correct = correctValue(q);
  const gotIt = revealed && picked === correct;

  // Abandonment is the number that matters most here: it says whether the demo
  // holds attention. Sent on unload so a bounce still reports.
  useEffect(() => {
    const onLeave = () => {
      if (started.current && !finished.current) {
        track("demo_abandoned", { question: idx + 1, score });
      }
    };
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, [idx, score]);

  const choose = (value: string) => {
    if (revealed) return;
    if (!started.current) {
      started.current = true;
      track("demo_started");
    }
    setPicked(value);
    if (value === correct) setScore((s) => s + 1);
  };

  const next = () => {
    if (idx + 1 >= DEMO_TOTAL) {
      finished.current = true;
      track("demo_completed", { score, total: DEMO_TOTAL });
      setDone(true);
      return;
    }
    setIdx((i) => i + 1);
    setPicked(null);
  };

  const restart = () => {
    setIdx(0);
    setPicked(null);
    setScore(0);
    setDone(false);
    finished.current = false;
  };

  /* ─────────────── result ─────────────── */
  if (done) {
    const verdict = demoVerdict(score);
    return (
      <div className="rounded-3xl border border-line bg-white p-6 sm:p-8 shadow-[0_2px_12px_-2px_rgba(28,28,30,0.08)]">
        <p className="ka text-[11px] uppercase tracking-[0.2em] text-ink-muted font-semibold">
          შედეგი
        </p>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-5xl font-extrabold text-wine tabular-nums">{score}</span>
          <span className="text-2xl font-bold text-ink-subtle tabular-nums">/ {DEMO_TOTAL}</span>
        </div>

        <h3 className="ka mt-4 text-xl font-extrabold text-ink">{verdict.titleKa}</h3>
        <p className="ka mt-2 text-sm text-ink-muted leading-relaxed">{verdict.bodyKa}</p>

        <div className="mt-6 rounded-2xl bg-cream border border-line p-4">
          <p className="ka text-sm text-ink leading-relaxed">
            რეგისტრაციის შემდეგ სესიები შენს დონეს მოერგება, ნასწავლი სიტყვები კი
            პერიოდულად დაგიბრუნდება გასამეორებლად, რომ არ დაგავიწყდეს.
          </p>
        </div>

        <Link
          to="/auth?mode=signup"
          onClick={() => track("demo_signup_clicked", { score })}
          className="ka mt-6 w-full inline-flex items-center justify-center gap-2 h-14 rounded-xl bg-wine text-on-dark text-base font-bold hover:bg-wine-deep transition-colors"
        >
          გააგრძელე სწავლა უფასოდ
          <ArrowRight className="w-5 h-5" />
        </Link>

        <button
          onClick={restart}
          className="ka mt-3 w-full h-11 rounded-xl border border-line text-sm font-semibold text-ink-muted hover:bg-cream transition-colors"
        >
          თავიდან სცადე
        </button>
      </div>
    );
  }

  /* ─────────────── question ─────────────── */
  return (
    <div className="rounded-3xl border border-line bg-white p-5 sm:p-7 shadow-[0_2px_12px_-2px_rgba(28,28,30,0.08)]">
      {/* progress */}
      <div className="flex items-center justify-between gap-4">
        <p className="ka text-[11px] uppercase tracking-[0.2em] text-ink-muted font-semibold">
          {promptFor(q)}
        </p>
        <p className="text-[11px] font-semibold text-ink-subtle tabular-nums">
          {idx + 1}/{DEMO_TOTAL}
        </p>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-cream overflow-hidden">
        <div
          className="h-full rounded-full bg-gold transition-[width] duration-300"
          style={{ width: `${((idx + (revealed ? 1 : 0)) / DEMO_TOTAL) * 100}%` }}
        />
      </div>

      {/* the question itself */}
      <div className="mt-6">
        {q.type === "meaning" && (
          <div className="flex items-center gap-3">
            <h3 className="text-3xl font-extrabold text-wine tracking-tight">{q.en}</h3>
            <ReadAloudButton text={q.en} storageKey={q.key} size="sm" />
          </div>
        )}

        {q.type === "toEnglish" && (
          <h3 className="ka text-2xl font-extrabold text-wine leading-snug">{q.ka}</h3>
        )}

        {q.type === "gap" && (
          <p className="text-xl text-ink leading-relaxed font-medium">{q.sentence}</p>
        )}

        {q.type === "listening" && (
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="p-5 rounded-full bg-cream border border-line">
              <ReadAloudButton text={q.en} storageKey={q.key} size="md" />
            </div>
            {revealed ? (
              <p className="text-2xl font-extrabold text-wine">{q.en}</p>
            ) : (
              <p className="ka text-[11px] text-ink-muted inline-flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" />
                დააჭირე მოსასმენად
              </p>
            )}
          </div>
        )}

        {q.type === "trueFalse" && (
          <div className="rounded-2xl bg-cream border border-line p-4 text-center">
            <p className="text-2xl font-extrabold text-wine">{q.en}</p>
            <p className="ka text-base text-ink-muted mt-1">= {q.claimKa}</p>
          </div>
        )}
      </div>

      {/* answers */}
      <div className="mt-5 space-y-2.5">
        {choicesFor(q).map((c) => {
          const isCorrect = c.value === correct;
          const isPicked = c.value === picked;
          const base =
            "w-full text-left px-4 py-3.5 rounded-xl border text-[15px] font-semibold transition-colors flex items-center justify-between gap-3";
          const state = !revealed
            ? "border-line bg-white text-ink hover:border-wine hover:bg-cream"
            : isCorrect
            ? "border-success bg-success/10 text-ink"
            : isPicked
            ? "border-destructive bg-destructive/10 text-ink"
            : "border-line bg-white text-ink-subtle";
          // Georgian answers need the ka font; English ones must not have it.
          const font =
            q.type === "meaning" || q.type === "listening" || q.type === "trueFalse" ? "ka" : "";
          return (
            <button
              key={c.value}
              onClick={() => choose(c.value)}
              disabled={revealed}
              className={`${base} ${state} ${font}`}
            >
              <span>{c.label}</span>
              {revealed && isCorrect && <Check className="w-4 h-4 shrink-0 text-success" />}
              {revealed && isPicked && !isCorrect && (
                <X className="w-4 h-4 shrink-0 text-destructive" />
              )}
            </button>
          );
        })}
      </div>

      {/* what the app teaches after every answer: the meaning and a real sentence */}
      {revealed && (
        <div className="mt-5 rounded-2xl bg-cream border border-line p-4">
          <p className="ka text-sm font-bold text-wine">
            {gotIt ? "სწორია" : "სწორი პასუხი:"}{" "}
            {!gotIt && (
              <span className={q.type === "gap" || q.type === "toEnglish" ? "" : "ka"}>
                {q.type === "trueFalse" ? q.realKa : q.correct}
              </span>
            )}
          </p>
          <p className="ka text-sm text-ink-muted mt-1.5 leading-relaxed">{q.explanationKa}</p>
          <div className="mt-3 pt-3 border-t border-line">
            <p className="text-sm text-ink leading-relaxed">
              {q.type === "gap" ? q.sentence.replace("______", q.correct) : q.exampleEn}
            </p>
            <p className="ka text-xs text-ink-muted mt-1">{q.exampleKa}</p>
          </div>
        </div>
      )}

      {revealed && (
        <button
          onClick={next}
          className="ka mt-5 w-full py-4 rounded-xl bg-ink text-on-dark text-base font-bold hover:bg-panel transition-colors inline-flex items-center justify-center gap-2"
        >
          {idx + 1 >= DEMO_TOTAL ? "შედეგის ნახვა" : "შემდეგი"}
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
