// src/components/games/FindGame.tsx
//
// იპოვე: five business words are hidden in the grid, and together they use
// every letter exactly once. Trace a word from letter to neighbouring letter
// (up, down, left, right) and it is wiped off the board. Clear the board to win.
//
// Each word has its own two hints. The grids are built so that a word can be
// traced in only one place, so a correct spelling is always the right cells.

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Lightbulb } from "lucide-react";
import { loadProgress, saveProgress, type FindPuzzle, type PlayResult } from "@/lib/wordGame";

type Saved = { found: string[]; hints: number[]; wrong: number; t0: number; gaveUp?: boolean };

/** "6+2" for "Follow up", "8" for a single word: how the hidden word is built. */
function shape(en: string, form: string): string {
  let s = en.replace(/\s*\(.*?\)\s*/g, " ").trim();
  if (s.includes(" / ")) s = s.split(" / ").pop() as string;
  const parts = s.split(/[\s-]+/).filter(Boolean);
  return parts.length > 1 && parts.join("").toUpperCase() === form ? parts.map((x) => x.length).join("+") : String(form.length);
}

export default function FindGame({
  day,
  puzzle,
  done,
  onFinish,
  onFound,
}: {
  day: number;
  puzzle: FindPuzzle;
  done: PlayResult | null;
  onFinish: (r: PlayResult) => void;
  /** how many words are found so far, for the share text */
  onFound: (n: number) => void;
}) {
  const { w, h, grid, words } = puzzle;
  const saved = useMemo(() => loadProgress<Saved>(day, "find"), [day]);
  const [found, setFound] = useState<string[]>(
    // only words that are really in today's grid
    saved?.found?.filter((f) => words.some((x) => x.form === f)) ?? (done?.solved ? words.map((x) => x.form) : []),
  );
  const [hints, setHints] = useState<number[]>(saved?.hints?.length === words.length ? saved.hints : words.map(() => 0));
  const [wrong, setWrong] = useState(saved?.wrong ?? 0);
  const [slot, setSlot] = useState(() => Math.max(0, words.findIndex((x) => !(saved?.found ?? []).includes(x.form))));
  const [path, setPathState] = useState<number[]>([]);
  const pathRef = useRef<number[]>([]);
  const setPath = (p: number[]) => { pathRef.current = p; setPathState(p); };
  const [wiping, setWiping] = useState<number[]>([]);
  const [shake, setShake] = useState(0);
  const [askQuit, setAskQuit] = useState(false);
  const dragging = useRef(false);
  const moved = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const t0 = useRef(saved?.t0 ?? 0);

  const over = !!done || found.length === words.length || !!saved?.gaveUp;
  const gone = useMemo(() => {
    const s = new Set<number>();
    for (const x of words) if (found.includes(x.form)) x.cells.forEach((c) => s.add(c));
    return s;
  }, [found, words]);

  useEffect(() => { onFound(found.length); }, [found.length, onFound]);

  const persist = (next: Partial<Saved>) =>
    saveProgress(day, "find", { found, hints, wrong, t0: t0.current, ...next } satisfies Saved);

  const adjacent = (a: number, b: number) =>
    Math.abs((a % w) - (b % w)) + Math.abs(Math.floor(a / w) - Math.floor(b / w)) === 1;

  /** Which cell is under the pointer. Only the middle of a cell counts, so a
   *  finger sliding past a corner does not pick up the wrong letter. */
  const cellAt = (x: number, y: number, strict: boolean): number | null => {
    const el = gridRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cw = r.width / w, ch = r.height / h;
    const cx = Math.floor((x - r.left) / cw), cy = Math.floor((y - r.top) / ch);
    if (cx < 0 || cy < 0 || cx >= w || cy >= h) return null;
    if (strict) {
      const dx = (x - r.left) / cw - cx - 0.5, dy = (y - r.top) / ch - cy - 0.5;
      if (Math.hypot(dx, dy) > 0.4) return null;
    }
    return cy * w + cx;
  };

  const check = (p: number[], fromDrag: boolean) => {
    // a word may be traced from either end
    const text = p.map((c) => grid[c]).join("");
    const back = [...text].reverse().join("");
    const hit = words.find(
      (x) =>
        !found.includes(x.form) &&
        (x.form === text || x.form === back) &&
        x.cells.length === p.length &&
        x.cells.every((c) => p.includes(c)),
    );
    if (hit) {
      const next = [...found, hit.form];
      setWiping(p);
      setPath([]);
      window.setTimeout(() => {
        setFound(next);
        setWiping([]);
        const nextSlot = words.findIndex((x) => !next.includes(x.form));
        if (nextSlot >= 0) setSlot(nextSlot);
      }, 380 + p.length * 45);
      persist({ found: next });
      if (next.length === words.length) {
        const total = hints.reduce((a, b) => a + b, 0);
        window.setTimeout(
          () => onFinish({ solved: true, tries: wrong, hints: total, ms: Date.now() - t0.current }),
          700 + p.length * 45,
        );
      }
      return true;
    }
    if (fromDrag && p.length >= 2) {
      const n = wrong + 1;
      setWrong(n);
      persist({ wrong: n });
      setShake((k) => k + 1);
      setPath([]);
    }
    return false;
  };

  const extend = (p: number[], c: number): number[] => {
    if (gone.has(c) || wiping.includes(c)) return p;
    if (p.length >= 2 && p[p.length - 2] === c) return p.slice(0, -1); // step back
    if (p.includes(c)) return p;
    if (p.length && !adjacent(p[p.length - 1], c)) return p;
    return [...p, c];
  };

  const onDown = (e: React.PointerEvent) => {
    if (over) return;
    const c = cellAt(e.clientX, e.clientY, false);
    if (c === null || gone.has(c)) return;
    if (!t0.current) t0.current = Date.now();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragging.current = true;
    moved.current = false;
    // a tap next to the end of the current trail carries on from it
    const p = pathRef.current;
    if (p.length && p[p.length - 1] === c) return;
    const n = p.length ? extend(p, c) : p;
    setPath(n !== p ? n : [c]);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const c = cellAt(e.clientX, e.clientY, true);
    if (c === null) return;
    const p = pathRef.current;
    if (p[p.length - 1] === c) return;
    const n = extend(p, c);
    if (n !== p) { moved.current = true; setPath(n); }
  };
  const onUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    // a swipe is checked when the finger lifts; taps are checked letter by letter
    check(pathRef.current, moved.current);
  };

  const takeHint = (i: number) => {
    if (hints[i] >= 2) return;
    if (!t0.current) t0.current = Date.now();
    const next = hints.map((n, k) => (k === i ? n + 1 : n));
    setHints(next);
    persist({ hints: next });
  };

  const quit = () => {
    if (!askQuit) return setAskQuit(true);
    persist({ gaveUp: true });
    onFinish({ solved: false, tries: wrong, hints: hints.reduce((a, b) => a + b, 0), ms: Date.now() - (t0.current || Date.now()) });
  };

  const cur = words[slot];
  const pct = (c: number) => ({ x: ((c % w) + 0.5) / w * 100, y: (Math.floor(c / w) + 0.5) / h * 100 });
  const line = (cells: number[]) => cells.map((c) => `${pct(c).x},${pct(c).y}`).join(" ");

  return (
    <div className="flex flex-col items-center">
      <p className="ka text-sm text-paper-ink-muted text-center">
        ბადეში {words.length} ბიზნეს სიტყვაა დამალული. გადაუსვი მეზობელ ასოებს და წაშალე ყველა.
      </p>

      {/* the five words: blanks until found */}
      <div className="mt-4 w-full flex flex-wrap justify-center gap-1.5">
        {words.map((x, i) => {
          const ok = found.includes(x.form) || (over && !!done);
          const mine = found.includes(x.form);
          return (
            <button
              key={x.form}
              type="button"
              onClick={() => setSlot(i)}
              aria-pressed={slot === i && !over}
              className={`ka min-h-[36px] px-3 rounded-full text-[13px] font-bold inline-flex items-center gap-1.5 transition-colors ${
                mine
                  ? "bg-cta text-cta-fg"
                  : ok
                  ? "bg-paper-2 text-paper-ink border border-paper-edge/50"
                  : slot === i
                  ? "bg-paper-btn text-paper-btn-fg"
                  : "bg-paper-2 text-paper-ink border border-paper-edge/40"
              }`}
            >
              {mine && <Check size={13} strokeWidth={3} />}
              {ok ? x.word.en : `${shape(x.word.en, x.form)} ასო`}
              {!ok && hints[i] > 0 && <Lightbulb size={12} strokeWidth={2.5} />}
            </button>
          );
        })}
      </div>

      {/* hint for the chosen word */}
      {!over && cur && !found.includes(cur.form) && (
        <div className="mt-2 w-full paper-inset rounded-2xl px-4 py-2.5 text-left min-h-[52px] flex items-center gap-3">
          <div className="flex-1 min-w-0">
            {hints[slot] === 0 ? (
              <p className="ka text-[13px] text-paper-ink-muted">არჩეული სიტყვა: {shape(cur.word.en, cur.form)} ასო. გაიჭედე?</p>
            ) : (
              <>
                <p className="ka text-[14px] leading-snug text-paper-ink">{cur.word.hint}</p>
                {hints[slot] > 1 && (
                  <p className="ka text-[14px] leading-snug text-paper-ink mt-1">
                    <span className="text-paper-ink-muted">ქართულად: </span>
                    <span className="font-bold">{cur.word.ka}</span>
                  </p>
                )}
              </>
            )}
          </div>
          {hints[slot] < 2 && (
            <button
              type="button"
              onClick={() => takeHint(slot)}
              className="press ka shrink-0 inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl border border-paper-edge/40 text-[13px] font-bold text-paper-ink hover:bg-paper transition-colors"
            >
              <Lightbulb size={15} strokeWidth={2.25} className="text-cta" />
              მინიშნება
            </button>
          )}
        </div>
      )}

      <div className="wg-board mt-4">
        <div
          key={shake}
          ref={gridRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className={`wg-grid wg-tiles relative mx-auto grid ${shake ? "wg-shake" : ""}`}
          style={{
            ["--n" as string]: w,
            ["--max" as string]: "54px",
            ["--gap" as string]: "0px",
            gridTemplateColumns: `repeat(${w}, var(--t))`,
            width: `calc(var(--t) * ${w})`,
          }}
          role="application"
          aria-label="ასოების ბადე"
        >
          {[...grid].map((ch, c) => {
            const inPath = path.includes(c);
            const isGone = gone.has(c) && !over;
            const isWiping = wiping.includes(c);
            return (
              <div key={c} className="p-[3px]" style={{ width: "var(--t)", height: "var(--t)" }}>
                <div
                  className={`w-full h-full grid place-items-center rounded-[22%] font-extrabold transition-colors duration-100 ${
                    isGone
                      ? "border-2 border-dashed border-paper-edge/20"
                      : isWiping
                      ? "wg-wipe bg-cta text-cta-fg"
                      : inPath
                      ? "bg-paper-btn text-paper-btn-fg"
                      : "bg-paper-2 text-paper-ink border border-paper-edge/45"
                  }`}
                  style={{ fontSize: "calc(var(--t) * 0.46)", ["--i" as string]: isWiping ? wiping.indexOf(c) : 0 }}
                >
                  {isGone ? "" : ch}
                </div>
              </div>
            );
          })}
          <svg className="pointer-events-none absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            {!over && path.length > 1 && (
              <polyline points={line(path)} fill="none" stroke="hsl(var(--cta))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity="0.85" />
            )}
            {/* when it is over, show where every word was */}
            {over && words.map((x, i) => (
              <polyline
                key={x.form}
                points={line(x.cells)}
                fill="none"
                stroke={i % 2 ? "hsl(var(--paper-btn))" : "hsl(var(--cta))"}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                opacity="0.75"
              />
            ))}
          </svg>
        </div>
      </div>

      {!over && (
        <div className="mt-3 w-full flex items-center justify-between gap-3">
          <p className="text-base font-extrabold tracking-[0.18em] text-paper-ink min-h-[24px]" aria-live="polite">
            {path.map((c) => grid[c]).join("")}
          </p>
          <button
            type="button"
            onClick={quit}
            className="ka min-h-[40px] px-2 text-[13px] font-semibold text-paper-ink-muted underline underline-offset-4"
          >
            {askQuit ? "დარწმუნებული ხარ? დააჭირე კიდევ ერთხელ" : "დანებება"}
          </button>
        </div>
      )}
    </div>
  );
}
