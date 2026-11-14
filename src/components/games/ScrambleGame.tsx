// src/components/games/ScrambleGame.tsx
//
// დაალაგე: the word's letters are shuffled. Tap two letters to swap them. A
// letter that lands in its place turns cobalt and stays there. The number of
// swaps is limited, so guessing blindly runs out. Spaces and hyphens in a
// phrase never move.

import { useMemo, useRef, useState } from "react";
import { HintBar } from "./GameParts";
import { loadProgress, saveProgress, type PlayResult, type ScramblePuzzle } from "@/lib/wordGame";

type Saved = { arr: string; swaps: number; hints: number; t0: number };

const isLetter = (c: string) => /[A-Z]/.test(c);

export default function ScrambleGame({
  day,
  puzzle,
  done,
  onFinish,
}: {
  day: number;
  puzzle: ScramblePuzzle;
  done: PlayResult | null;
  onFinish: (r: PlayResult) => void;
}) {
  const { answer, start, limit } = puzzle;
  const saved = useMemo(() => loadProgress<Saved>(day, "scramble"), [day]);
  // a saved game only counts if it is this same puzzle
  const sameLetters = (x: string) => [...x].sort().join("") === [...answer].sort().join("");
  const startArr = saved && typeof saved.arr === "string" && sameLetters(saved.arr) ? saved.arr : start;
  const [arr, setArr] = useState<string[]>([...(done ? (done.solved || !saved ? answer : startArr) : startArr)]);
  const [swaps, setSwaps] = useState(saved?.swaps ?? done?.tries ?? 0);
  const [hints, setHints] = useState(saved?.hints ?? done?.hints ?? 0);
  const [sel, setSel] = useState<number | null>(null);
  const [popped, setPopped] = useState<{ a: number; b: number; n: number } | null>(null);
  const t0 = useRef(saved?.t0 ?? 0);

  const solved = arr.join("") === answer;
  const over = !!done || solved || swaps >= limit;
  const failed = over && !solved;

  // words of the phrase, each with the positions of its characters
  const words = useMemo(() => {
    const out: number[][] = [[]];
    [...answer].forEach((c, i) => {
      if (c === " ") out.push([]);
      else out[out.length - 1].push(i);
    });
    return out.filter((w) => w.length);
  }, [answer]);
  const widest = Math.max(...words.map((w) => w.length));
  const letters = [...answer].filter(isLetter).length;

  const tap = (i: number) => {
    if (over || arr[i] === answer[i]) return;
    if (!t0.current) t0.current = Date.now();
    if (sel === null) return setSel(i);
    if (sel === i) return setSel(null);
    const next = arr.slice();
    [next[sel], next[i]] = [next[i], next[sel]];
    const n = swaps + 1;
    setArr(next);
    setSwaps(n);
    setPopped({ a: sel, b: i, n });
    setSel(null);
    saveProgress(day, "scramble", { arr: next.join(""), swaps: n, hints, t0: t0.current } satisfies Saved);
    const nowSolved = next.join("") === answer;
    if (nowSolved || n >= limit) {
      window.setTimeout(() => onFinish({ solved: nowSolved, tries: n, hints, ms: Date.now() - t0.current }), 420);
    }
  };

  const takeHint = () => {
    const n = Math.min(2, hints + 1);
    setHints(n);
    if (!t0.current) t0.current = Date.now();
    saveProgress(day, "scramble", { arr: arr.join(""), swaps, hints: n, t0: t0.current } satisfies Saved);
  };

  const left = Math.max(0, limit - swaps);

  return (
    <div className="flex flex-col items-center">
      <p className="ka text-sm text-paper-ink-muted text-center">
        ასოები არეულია. შეეხე ორ ასოს, რომ ადგილები გაცვალონ, და ააწყვე ბიზნეს{" "}
        {words.length > 1 ? "ფრაზა" : "სიტყვა"}.{" "}
        <span className="font-bold text-paper-ink">{letters} ასო{words.length > 1 ? `, ${words.length} სიტყვა` : ""}.</span>
      </p>

      <div className="wg-board mt-5">
        <div
          className="wg-tiles flex flex-wrap justify-center"
          style={{ ["--n" as string]: Math.max(widest, 6), ["--max" as string]: "48px", columnGap: "calc(var(--t) * 0.55)", rowGap: "12px" }}
        >
          {words.map((w, wi) => (
            <div key={wi} className="flex" style={{ gap: "var(--gap)" }}>
              {w.map((i) => {
                const c = (failed && done ? answer : arr.join(""))[i];
                if (!isLetter(answer[i])) {
                  return (
                    <div key={i} className="wg-tile text-paper-ink-muted" aria-hidden>
                      {answer[i]}
                    </div>
                  );
                }
                const right = arr[i] === answer[i];
                const picked = sel === i;
                const pop = popped && (popped.a === i || popped.b === i) ? `wg-pop` : "";
                return (
                  <button
                    key={`${i}-${pop ? popped!.n : 0}`}
                    type="button"
                    onClick={() => tap(i)}
                    disabled={over || right}
                    aria-label={right ? `${c}, თავის ადგილასაა` : c}
                    aria-pressed={picked}
                    className={`wg-tile ${pop} transition-[translate,background-color] duration-150 ${
                      right
                        ? "bg-cta text-cta-fg border-2 border-cta"
                        : picked
                        ? "bg-paper-btn text-paper-btn-fg border-2 border-paper-btn -translate-y-1.5"
                        : failed
                        ? "bg-paper-2 text-paper-ink border-2 border-paper-edge/60"
                        : "bg-paper-2 text-paper-ink border-2 border-paper-edge/60 hover:border-paper-ink/70"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {!over && (
        <>
          <p className="ka mt-5 text-sm font-bold text-paper-ink" role="status" aria-live="polite">
            დარჩა {left} სვლა
            <span className="font-semibold text-paper-ink-muted"> {limit}-დან</span>
          </p>
          <div className="mt-3 h-1.5 w-40 rounded-full bg-paper-3/70 overflow-hidden" aria-hidden>
            <div className="h-full bg-paper-btn transition-[width] duration-300" style={{ width: `${(left / limit) * 100}%` }} />
          </div>
          <div className="mt-5 w-full flex flex-col items-center">
            <HintBar word={puzzle.word} used={hints} onUse={takeHint} />
          </div>
        </>
      )}
    </div>
  );
}
