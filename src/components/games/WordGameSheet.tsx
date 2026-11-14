// src/components/games/WordGameSheet.tsx
//
// The sheet that holds the three daily word games: a bottom sheet on a phone,
// a centred panel on a wider screen. Loaded only when the chip is opened, so
// the landing page does not carry the games' code.
//
// One day at a time. Visitors and free accounts get today; premium can also
// open past days from the archive. The server decides that, not this file.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, CalendarDays, Check, Loader2, Lock, X } from "lucide-react";
import { track } from "@/lib/track";
import {
  GAME_NAME,
  GAME_ORDER,
  dayLabel,
  fetchArchive,
  fetchDay,
  finishGame,
  scoreLine,
  shareText,
  type ArchiveData,
  type DayData,
  type DayStats,
  type GameId,
  type Mark,
  type PlayResult,
} from "@/lib/wordGame";
import GuessGame from "./GuessGame";
import ScrambleGame from "./ScrambleGame";
import FindGame from "./FindGame";
import { ResultCard, SignupNudge } from "./GameParts";

const firstOpen = (d: DayData): GameId => GAME_ORDER.find((g) => !d.plays[g]) ?? "guess";

export default function WordGameSheet({
  open,
  onClose,
  today,
  signedIn,
  onToday,
}: {
  open: boolean;
  onClose: () => void;
  /** today's games, already fetched by the chip */
  today: DayData;
  signedIn: boolean;
  /** tells the chip when today's results change */
  onToday: (d: DayData) => void;
}) {
  const [cur, setCur] = useState<DayData>(today);
  const [tab, setTab] = useState<GameId>(() => firstOpen(today));
  const [view, setView] = useState<"play" | "archive">("play");
  const [stats, setStats] = useState<Partial<Record<GameId, DayStats>>>({});
  const [guessRows, setGuessRows] = useState<Mark[][]>([]);
  const [findFound, setFindFound] = useState(0);
  const [archive, setArchive] = useState<ArchiveData | null>(null);
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState(60);

  const isToday = cur.day === cur.today;

  useEffect(() => {
    if (open) track("game_opened", { day: today.today, viewer: today.viewer });
  }, [open, today.today, today.viewer]);

  const openDay = useCallback(
    async (day: number) => {
      setBusy(true);
      try {
        const d = await fetchDay({ day, signedIn });
        if (d) {
          setCur(d);
          setTab(firstOpen(d));
          setStats({});
          setGuessRows([]);
          setFindFound(0);
          setView("play");
        }
      } catch { /* stay where we are */ }
      setBusy(false);
    },
    [signedIn],
  );

  const openArchive = async () => {
    setView("archive");
    if (archive) return;
    try { setArchive(await fetchArchive()); } catch { /* the list simply stays empty */ }
  };

  const onFinish = useCallback(
    async (game: GameId, result: PlayResult) => {
      const day = cur.day;
      const next = { ...cur, plays: { ...cur.plays, [game]: result } };
      setCur((c) => (c.day === day ? { ...c, plays: { ...c.plays, [game]: result } } : c));
      if (cur.day === cur.today) onToday(next);
      track("game_finished", { game, day, solved: result.solved, tries: result.tries, hints: result.hints });
      const res = await finishGame(day, game, result, cur.viewer);
      if (res) {
        setStats((s) => ({ ...s, [game]: res.stats }));
        setCur((c) => (c.day === day ? { ...c, streak: res.streak } : c));
        setArchive(null); // refetch next time it is opened
      }
    },
    [cur, onToday],
  );

  const games = cur.games;
  const done = cur.plays[tab] ?? null;
  const nextGame = useMemo(() => GAME_ORDER.find((g) => g !== tab && !cur.plays[g]) ?? null, [tab, cur.plays]);
  const allDone = GAME_ORDER.every((g) => cur.plays[g]);

  const share = done
    ? shareText({
        day: cur.day,
        today: isToday,
        game: tab,
        result: done,
        limit: games?.scramble.limit,
        guessRows: tab === "guess" ? guessRows : undefined,
        findTotal: games?.find.words.length,
        findFound: done.solved ? games?.find.words.length : findFound,
      })
    : "";

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="wg-overlay fixed inset-0 z-[60] bg-panel/60" />
        <Dialog.Content
          aria-describedby={undefined}
          // do not put a focus ring on the first button the moment it opens
          onOpenAutoFocus={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).focus(); }}
          tabIndex={-1}
          className="wg-sheet paper-card fixed z-[61] inset-x-0 bottom-0 max-h-[94dvh] rounded-t-[26px] sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[460px] sm:max-h-[92vh] sm:rounded-[26px] flex flex-col outline-none"
        >
          {/* header */}
          <div className="flex items-center gap-2 pl-5 pr-2 pt-3 pb-2">
            {view === "archive" || !isToday ? (
              <button
                type="button"
                onClick={() => (view === "archive" ? setView("play") : openDay(cur.today))}
                aria-label="უკან"
                className="press -ml-2 w-11 h-11 grid place-items-center rounded-xl text-paper-ink hover:bg-paper-2"
              >
                <ArrowLeft size={18} strokeWidth={2.25} />
              </button>
            ) : null}
            <div className="flex-1 min-w-0">
              <Dialog.Title className="ka text-[15px] font-extrabold text-paper-ink leading-tight">
                {view === "archive" ? "არქივი" : isToday ? "დღევანდელი სიტყვების თამაში" : "სიტყვების თამაში"}
              </Dialog.Title>
              {view === "play" && (
                <p className="ka text-[12px] font-semibold text-paper-ink-muted">
                  #{cur.day} · {dayLabel(cur.launch, cur.day)}
                </p>
              )}
            </div>
            {busy && <Loader2 size={18} className="animate-spin text-paper-ink-muted" aria-label="იტვირთება" />}
            {signedIn && view === "play" && (
              <button
                type="button"
                onClick={openArchive}
                aria-label="არქივი"
                className="press w-11 h-11 grid place-items-center rounded-xl text-paper-ink hover:bg-paper-2"
              >
                <CalendarDays size={18} strokeWidth={2.25} />
              </button>
            )}
            <Dialog.Close
              aria-label="დახურვა"
              className="press w-11 h-11 grid place-items-center rounded-xl text-paper-ink hover:bg-paper-2"
            >
              <X size={20} strokeWidth={2.25} />
            </Dialog.Close>
          </div>

          {view === "play" && games && (
            <div className="px-4 pb-2" role="tablist" aria-label="თამაშები">
              <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-paper-3/60">
                {GAME_ORDER.map((g) => {
                  const p = cur.plays[g];
                  return (
                    <button
                      key={g}
                      type="button"
                      role="tab"
                      aria-selected={tab === g}
                      onClick={() => setTab(g)}
                      className={`ka min-h-[40px] rounded-xl text-[13px] font-bold inline-flex items-center justify-center gap-1 transition-colors ${
                        tab === g ? "bg-paper-btn text-paper-btn-fg" : "text-paper-ink hover:bg-paper-2/70"
                      }`}
                    >
                      {GAME_NAME[g]}
                      {p && (p.solved ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-2 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            {view === "archive" ? (
              <Archive
                data={archive}
                today={cur.today}
                launch={cur.launch}
                shown={shown}
                onMore={() => setShown((n) => n + 120)}
                onOpen={openDay}
              />
            ) : cur.locked === "register" ? (
              <div className="py-4 text-center">
                <Lock size={22} className="mx-auto text-paper-ink-muted" aria-hidden />
                <p className="ka text-sm text-paper-ink-muted mt-3">სტუმრად თამაში მხოლოდ ერთხელ შეიძლება.</p>
                <SignupNudge where="locked" lead="ახალი სიტყვა უკვე გელოდება" />
              </div>
            ) : cur.locked === "premium" ? (
              <div className="py-6 text-center">
                <Lock size={22} className="mx-auto text-paper-ink-muted" aria-hidden />
                <p className="ka text-lg font-extrabold text-paper-ink mt-3">წინა დღეების თამაშები პრემიუმშია</p>
                <p className="ka text-sm text-paper-ink-muted mt-1">დღევანდელი სიტყვა ყოველთვის უფასოა.</p>
                <Link
                  to="/path/business/premium"
                  className="press ka mt-4 inline-flex items-center justify-center min-h-[48px] w-full px-5 rounded-xl bg-cta text-cta-fg text-sm font-bold hover:bg-cta-hover transition-colors"
                >
                  პრემიუმის ნახვა
                </Link>
                <button
                  type="button"
                  onClick={() => openDay(cur.today)}
                  className="ka mt-3 min-h-[44px] text-sm font-semibold text-paper-ink underline underline-offset-4"
                >
                  დღევანდელ თამაშზე დაბრუნება
                </button>
              </div>
            ) : games ? (
              <div key={`${cur.day}-${tab}`}>
                {tab === "guess" && (
                  <GuessGame
                    day={cur.day}
                    puzzle={games.guess}
                    done={done}
                    active={open}
                    onFinish={(r) => onFinish("guess", r)}
                    onRows={setGuessRows}
                  />
                )}
                {tab === "scramble" && (
                  <ScrambleGame day={cur.day} puzzle={games.scramble} done={done} onFinish={(r) => onFinish("scramble", r)} />
                )}
                {tab === "find" && (
                  <FindGame
                    day={cur.day}
                    puzzle={games.find}
                    done={done}
                    onFinish={(r) => onFinish("find", r)}
                    onFound={setFindFound}
                  />
                )}
                {done && (
                  <ResultCard
                    day={cur.day}
                    game={tab}
                    result={done}
                    score={
                      tab === "find" && !done.solved
                        ? `${games.find.words.length}-დან ${findFound} სიტყვა`
                        : scoreLine(tab, done, games.scramble.limit)
                    }
                    words={
                      tab === "guess"
                        ? [games.guess.word]
                        : tab === "scramble"
                        ? [games.scramble.word]
                        : games.find.words.map((x) => x.word)
                    }
                    stats={stats[tab] ?? null}
                    streak={cur.streak}
                    viewer={cur.viewer}
                    share={share}
                    nextGame={nextGame}
                    onNext={() => nextGame && setTab(nextGame)}
                  />
                )}
                {done && allDone && isToday && cur.viewer !== "visitor" && (
                  <p className="ka text-center text-[13px] text-paper-ink-muted mt-4">დღეს სამივე ითამაშე. ხვალ ახალი სიტყვა იქნება.</p>
                )}
              </div>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Archive({
  data,
  today,
  launch,
  shown,
  onMore,
  onOpen,
}: {
  data: ArchiveData | null;
  today: number;
  launch: string;
  shown: number;
  onMore: () => void;
  onOpen: (day: number) => void;
}) {
  if (!data) {
    return (
      <div className="py-10 grid place-items-center">
        <Loader2 size={20} className="animate-spin text-paper-ink-muted" aria-label="იტვირთება" />
      </div>
    );
  }
  const premium = data.viewer === "premium";
  const days = Array.from({ length: Math.min(today, shown) }, (_, i) => today - i);
  return (
    <div>
      {!premium && (
        <div className="paper-inset rounded-2xl px-4 py-3 mb-3">
          <p className="ka text-sm font-bold text-paper-ink">წინა დღეების თამაშები პრემიუმშია</p>
          <p className="ka text-[13px] text-paper-ink-muted mt-0.5">დღევანდელი სიტყვა ყოველთვის უფასოა.</p>
          <Link to="/path/business/premium" className="ka inline-block mt-2 text-sm font-bold text-paper-ink underline underline-offset-4">
            პრემიუმის ნახვა
          </Link>
        </div>
      )}
      <ul className="space-y-1.5">
        {days.map((d) => {
          const p = data.days[String(d)] ?? {};
          const can = premium || d === today;
          return (
            <li key={d}>
              <button
                type="button"
                onClick={() => can && onOpen(d)}
                disabled={!can}
                className="w-full min-h-[48px] px-4 rounded-xl paper-inset flex items-center gap-3 text-left disabled:opacity-60 enabled:hover:bg-paper"
              >
                <span className="ka flex-1 text-sm font-bold text-paper-ink">
                  #{d}
                  <span className="font-semibold text-paper-ink-muted"> · {d === today ? "დღეს" : dayLabel(launch, d)}</span>
                </span>
                <span className="flex items-center gap-1" aria-label="შედეგები">
                  {GAME_ORDER.map((g) => (
                    <span
                      key={g}
                      title={GAME_NAME[g]}
                      className={`w-5 h-5 rounded-md grid place-items-center ${
                        p[g] === true
                          ? "bg-cta text-cta-fg"
                          : p[g] === false
                          ? "bg-paper-btn text-paper-btn-fg"
                          : "border border-paper-edge/40"
                      }`}
                    >
                      {p[g] === true ? <Check size={12} strokeWidth={3} /> : p[g] === false ? <X size={12} strokeWidth={3} /> : null}
                    </span>
                  ))}
                </span>
                {!can && <Lock size={14} className="text-paper-ink-muted" aria-hidden />}
              </button>
            </li>
          );
        })}
      </ul>
      {today > shown && (
        <button type="button" onClick={onMore} className="ka mt-3 w-full min-h-[44px] text-sm font-bold text-paper-ink underline underline-offset-4">
          მეტის ჩვენება
        </button>
      )}
    </div>
  );
}
