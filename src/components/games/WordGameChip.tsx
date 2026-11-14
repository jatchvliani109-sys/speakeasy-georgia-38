// src/components/games/WordGameChip.tsx
//
// The small floating "დღევანდელი სიტყვების თამაში" chip: the way into the three daily word
// games, on the landing page and on the dashboard.
//
// It stays out of the way on purpose:
//   - on the landing page it waits until the visitor has scrolled a little or
//     been there a few seconds, never on arrival
//   - it steps aside whenever something marked data-wg-avoid is on screen (the
//     sign-up buttons, the closing card where Tiki walks)
//   - the small x hides it for the rest of the day
//   - it never appears at all if the games are not switched on yet
//
// The games themselves are a separate, lazily loaded file, so this chip costs
// the landing page almost nothing.

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  GAME_ORDER,
  chipDismissedToday,
  dismissChipToday,
  fetchDay,
  pruneProgress,
  type DayData,
} from "@/lib/wordGame";
import "./wordGame.css";

const WordGameSheet = lazy(() => import("./WordGameSheet"));

export default function WordGameChip({ wait = false }: { /** landing page: hold back until scrolled or a few seconds in */ wait?: boolean }) {
  const { user, loading } = useAuth();
  const [armed, setArmed] = useState(!wait);
  const [data, setData] = useState<DayData | null>(null);
  const [hidden, setHidden] = useState(() => chipDismissedToday());
  const [aside, setAside] = useState(false);
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const chipRef = useRef<HTMLDivElement>(null);

  // landing page: appear after a little scrolling, or eight seconds
  useEffect(() => {
    if (armed) return;
    const arm = () => setArmed(true);
    const onScroll = () => { if (window.scrollY > 500) arm(); };
    const timer = window.setTimeout(arm, 8000);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [armed]);

  // ask the server for today's games; if they are not live yet, show nothing
  useEffect(() => {
    if (!armed || loading || hidden) return;
    let alive = true;
    fetchDay({ signedIn: !!user })
      .then((d) => {
        if (!alive || !d) return;
        setData(d);
        pruneProgress(d.today);
      })
      .catch(() => { /* no chip is better than a broken one */ });
    return () => { alive = false; };
  }, [armed, loading, hidden, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // step aside while the chip would sit on top of a sign-up button, the demo
  // or the closing card (anything marked data-wg-avoid)
  useEffect(() => {
    if (!data) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const chip = chipRef.current;
      if (!chip) return;
      const c = chip.getBoundingClientRect();
      const pad = 10;
      let hit = false;
      document.querySelectorAll("[data-wg-avoid]").forEach((z) => {
        const r = z.getBoundingClientRect();
        if (r.width && r.left < c.right + pad && r.right > c.left - pad && r.top < c.bottom + pad && r.bottom > c.top - pad) hit = true;
      });
      setAside(hit);
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(measure); };
    queue();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
    };
  }, [data]);

  if (!data || hidden) return null;

  const played = GAME_ORDER.filter((g) => data.plays[g]).length;
  const sub =
    data.locked === "register"
      ? "ახალი სიტყვა გელოდება"
      : played === 0
      ? "3 ახალი თამაში"
      : played < 3
      ? `დარჩა ${3 - played} თამაში`
      : "დღეს სამივე ითამაშე";

  return (
    <>
      <div
        ref={chipRef}
        className={`wg-chip fixed z-40 left-3 sm:left-5 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] sm:bottom-5 transition-opacity duration-300 ${
          aside && !open ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <div className="wg-chip-drift paper-card rounded-2xl flex items-center gap-0.5 p-1">
          <button
            type="button"
            onClick={() => { setOpen(true); setEverOpened(true); }}
            className="press flex items-center gap-2.5 min-h-[46px] pl-2.5 pr-2 rounded-xl text-left hover:bg-paper-2 transition-colors"
          >
            <span className="flex gap-[3px]" aria-hidden>
              <span className="w-[13px] h-[13px] rounded-[3px] bg-cta" />
              <span className="w-[13px] h-[13px] rounded-[3px] bg-paper-2 border-2 border-cta" />
              <span className="w-[13px] h-[13px] rounded-[3px] bg-paper-3" />
            </span>
            {/* the name is long: it sits on two short lines so the chip stays small */}
            <span className="max-w-[9.75rem]">
              <span className="ka block text-[12.5px] font-extrabold leading-[1.2] text-paper-ink">
                დღევანდელი სიტყვების თამაში
              </span>
              <span className="ka block text-[11px] font-semibold leading-tight text-paper-ink-muted mt-1">
                #{data.today} · {sub}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => { dismissChipToday(); setHidden(true); }}
            aria-label="დამალვა დღეს"
            title="დამალვა დღეს"
            className="w-9 h-[46px] grid place-items-center rounded-xl text-paper-ink-muted hover:text-paper-ink hover:bg-paper-2 transition-colors"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>
      </div>
      {everOpened && (
        <Suspense fallback={null}>
          <WordGameSheet
            open={open}
            onClose={() => setOpen(false)}
            today={data}
            signedIn={!!user}
            onToday={setData}
          />
        </Suspense>
      )}
    </>
  );
}
