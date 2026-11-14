// src/components/games/GuessGame.tsx
//
// გამოიცანი: find the business word in six tries. No clue to begin with, only
// the number of letters. After each try every letter is marked:
//   cobalt, filled    right letter, right place
//   cobalt, outlined  the letter is in the word, somewhere else
//   dimmed            the letter is not in the word
// The answer is one of the course's words; any real English word is a valid try.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Delete } from "lucide-react";
import { HintBar } from "./GameParts";
import {
  isRealWord,
  loadProgress,
  markGuess,
  preloadWordList,
  saveProgress,
  type GuessPuzzle,
  type Mark,
  type PlayResult,
} from "@/lib/wordGame";

const TRIES = 6;
const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

type Saved = { guesses: string[]; hints: number; t0: number };

const TILE: Record<Mark | "empty" | "typed", string> = {
  hit: "bg-cta text-cta-fg border-2 border-cta",
  near: "bg-paper-2 text-paper-ink border-[3px] border-cta",
  miss: "bg-paper-3/70 text-paper-ink-muted border-2 border-transparent",
  empty: "bg-paper-2/60 border-2 border-paper-edge/25",
  typed: "bg-paper-2 text-paper-ink border-2 border-paper-edge/60",
};
const KEY: Record<Mark | "new", string> = {
  hit: "bg-cta text-cta-fg",
  near: "bg-paper-2 text-paper-ink ring-[3px] ring-inset ring-cta",
  miss: "bg-paper-3/60 text-paper-ink-muted/60",
  new: "bg-paper-2 text-paper-ink",
};

export default function GuessGame({
  day,
  puzzle,
  done,
  active,
  onFinish,
  onRows,
}: {
  day: number;
  puzzle: GuessPuzzle;
  done: PlayResult | null;
  active: boolean;
  onFinish: (r: PlayResult) => void;
  /** the marked rows, for the share text */
  onRows: (rows: Mark[][]) => void;
}) {
  const answer = puzzle.answer;
  const len = answer.length;
  const saved = useMemo(() => {
    const s = loadProgress<Saved>(day, "guess");
    // a saved game only counts if it was played against this same word length
    return s && Array.isArray(s.guesses) && s.guesses.every((g) => g.length === len) ? s : null;
  }, [day, len]);
  const [guesses, setGuesses] = useState<string[]>(saved?.guesses ?? []);
  const [hints, setHints] = useState(saved?.hints ?? done?.hints ?? 0);
  const [cur, setCur] = useState("");
  const [note, setNote] = useState("");
  const [shake, setShake] = useState(0);
  const [fresh, setFresh] = useState(-1); // the row that is turning over right now
  const [busy, setBusy] = useState(false);
  const t0 = useRef(saved?.t0 ?? 0);

  const over = !!done || guesses.includes(answer) || guesses.length >= TRIES;
  const marks = useMemo(() => guesses.map((g) => markGuess(g, answer)), [guesses, answer]);

  useEffect(() => { preloadWordList(len); }, [len]);
  useEffect(() => { onRows(marks); }, [marks, onRows]);

  // best mark seen for every letter, for the keyboard
  const keyMark = useMemo(() => {
    const rank: Record<Mark, number> = { miss: 0, near: 1, hit: 2 };
    const out: Record<string, Mark> = {};
    guesses.forEach((g, r) =>
      [...g].forEach((ch, i) => {
        const m = marks[r][i];
        if (!out[ch] || rank[m] > rank[out[ch]]) out[ch] = m;
      }),
    );
    return out;
  }, [guesses, marks]);

  const say = (text: string) => {
    setNote(text);
    setShake((n) => n + 1);
    window.setTimeout(() => setNote((cur) => (cur === text ? "" : cur)), 2200);
  };

  const submit = useCallback(async () => {
    if (over || busy) return;
    if (cur.length < len) return say("ასოები აკლია");
    setBusy(true);
    const ok = cur === answer || (await isRealWord(cur));
    setBusy(false);
    if (!ok) return say("ეს სიტყვა ლექსიკონში არ არის");
    if (!t0.current) t0.current = Date.now();
    const next = [...guesses, cur];
    setGuesses(next);
    setFresh(next.length - 1);
    setCur("");
    setNote("");
    saveProgress(day, "guess", { guesses: next, hints, t0: t0.current } satisfies Saved);
    const solved = cur === answer;
    if (solved || next.length >= TRIES) {
      // let the last row finish turning over before the result appears
      window.setTimeout(
        () => onFinish({ solved, tries: next.length, hints, ms: Date.now() - t0.current }),
        460 + len * 110,
      );
    }
  }, [over, busy, cur, len, answer, guesses, hints, day, onFinish]);

  const press = useCallback(
    (k: string) => {
      if (over) return;
      if (k === "ENTER") return void submit();
      if (k === "BACK") return setCur((c) => c.slice(0, -1));
      if (/^[A-Z]$/.test(k)) {
        if (!t0.current) t0.current = Date.now();
        setCur((c) => (c.length < len ? c + k : c));
      }
    },
    [over, submit, len],
  );

  // a real keyboard works too
  useEffect(() => {
    if (!active || over) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "Enter") { e.preventDefault(); press("ENTER"); }
      else if (e.key === "Backspace") { e.preventDefault(); press("BACK"); }
      else if (/^[a-zA-Z]$/.test(e.key)) press(e.key.toUpperCase());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, over, press]);

  const takeHint = () => {
    const n = Math.min(2, hints + 1);
    setHints(n);
    if (!t0.current) t0.current = Date.now();
    saveProgress(day, "guess", { guesses, hints: n, t0: t0.current } satisfies Saved);
  };

  // Finished on another device: there are no rows here to show, only the answer.
  const rows = done && guesses.length === 0 ? [answer] : guesses;
  const rowMarks = done && guesses.length === 0 ? [markGuess(answer, answer)] : marks;
  const blanks = over ? 0 : TRIES - rows.length - 1;

  return (
    <div className="flex flex-col items-center">
      <p className="ka text-sm text-paper-ink-muted text-center">
        გამოიცანი ბიზნეს სიტყვა 6 ცდაში. <span className="font-bold text-paper-ink">{len} ასო.</span>
      </p>

      <div className="wg-board mt-4">
        <div
          className="wg-tiles mx-auto flex flex-col items-center"
          style={{ ["--n" as string]: len, gap: "var(--gap)" }}
          role="grid"
          aria-label="ცდები"
        >
          {rows.map((g, r) => (
            <div key={r} className="flex" style={{ gap: "var(--gap)" }} role="row">
              {[...g].map((ch, i) => (
                <div
                  key={i}
                  role="gridcell"
                  className={`wg-tile ${TILE[rowMarks[r][i]]} ${r === fresh ? "wg-turn" : ""}`}
                  style={{ ["--i" as string]: i }}
                >
                  {ch}
                </div>
              ))}
            </div>
          ))}
          {!over && (
            <div key={`cur-${shake}`} className={`flex ${shake ? "wg-shake" : ""}`} style={{ gap: "var(--gap)" }} role="row">
              {Array.from({ length: len }, (_, i) => (
                <div key={i} className={`wg-tile ${cur[i] ? TILE.typed : TILE.empty}`}>{cur[i] ?? ""}</div>
              ))}
            </div>
          )}
          {Array.from({ length: Math.max(0, blanks) }, (_, r) => (
            <div key={`b${r}`} className="flex" style={{ gap: "var(--gap)" }} aria-hidden>
              {Array.from({ length: len }, (_, i) => (
                <div key={i} className={`wg-tile ${TILE.empty}`} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {!over && (
        <p className="ka h-6 mt-2 text-sm font-bold text-paper-danger" role="status" aria-live="polite">{note}</p>
      )}

      {!over && (
        <>
          <div className="w-full max-w-[460px] select-none" aria-label="კლავიატურა">
            {ROWS.map((row, r) => (
              <div key={row} className="flex justify-center gap-[5px] mb-[6px]">
                {r === 2 && (
                  <button
                    type="button"
                    onClick={() => press("ENTER")}
                    disabled={busy}
                    className="ka h-12 px-2.5 rounded-lg bg-paper-btn text-paper-btn-fg text-[11px] font-bold active:scale-95 transition-transform"
                  >
                    შეყვანა
                  </button>
                )}
                {[...row].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => press(k)}
                    className={`h-12 flex-1 max-w-[42px] min-w-0 rounded-lg text-sm font-extrabold active:scale-95 transition-transform ${KEY[keyMark[k] ?? "new"]}`}
                  >
                    {k}
                  </button>
                ))}
                {r === 2 && (
                  <button
                    type="button"
                    onClick={() => press("BACK")}
                    aria-label="წაშლა"
                    className="h-12 px-3 rounded-lg bg-paper-2 text-paper-ink grid place-items-center active:scale-95 transition-transform"
                  >
                    <Delete size={18} strokeWidth={2.25} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 w-full flex flex-col items-center">
            <HintBar word={puzzle.word} used={hints} onUse={takeHint} />
          </div>
          <ul className="ka mt-4 text-[12px] leading-relaxed text-paper-ink-muted space-y-1 self-start">
            <li className="flex items-center gap-2"><span className="inline-block w-4 h-4 rounded bg-cta shrink-0" /> ასო სწორ ადგილასაა</li>
            <li className="flex items-center gap-2"><span className="inline-block w-4 h-4 rounded bg-paper-2 border-[3px] border-cta shrink-0" /> ასო სიტყვაშია, ოღონდ სხვა ადგილას</li>
            <li className="flex items-center gap-2"><span className="inline-block w-4 h-4 rounded bg-paper-3/70 shrink-0" /> ასო სიტყვაში არ არის</li>
          </ul>
        </>
      )}
    </div>
  );
}
