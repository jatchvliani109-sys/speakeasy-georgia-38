// src/components/games/GameParts.tsx
//
// Pieces the three word games share: the hint button, the word that is shown
// once a game ends, and the result card with sharing.

import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Lightbulb, Share2 } from "lucide-react";
import { toast } from "sonner";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { track } from "@/lib/track";
import {
  GAME_NAME,
  hintLabel,
  shareOut,
  type DayStats,
  type GameId,
  type PlayResult,
  type Viewer,
  type WordInfo,
} from "@/lib/wordGame";

const AUDIO_ON_PAPER = "!border-paper-edge/30 !bg-paper-2 !text-paper-ink";

/**
 * Two hints, both free, both recorded. The first is the Georgian explanation
 * (it never contains the English word); the second is the direct translation.
 */
export function HintBar({
  word,
  used,
  onUse,
  disabled,
}: {
  word: WordInfo;
  used: number;
  onUse: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="w-full">
      {used > 0 && (
        <div className="wg-rise paper-inset rounded-2xl px-4 py-3 mb-2 text-left" aria-live="polite">
          <p className="ka text-[11px] font-bold uppercase tracking-wider text-paper-ink-muted">მინიშნება</p>
          <p className="ka text-[15px] leading-snug text-paper-ink mt-1">{word.hint}</p>
          {used > 1 && (
            <p className="ka text-[15px] leading-snug text-paper-ink mt-2 pt-2 border-t border-paper-edge/25">
              <span className="text-paper-ink-muted">ქართულად: </span>
              <span className="font-bold">{word.ka}</span>
            </p>
          )}
        </div>
      )}
      {!disabled && used < 2 && (
        <button
          type="button"
          onClick={onUse}
          className="press ka inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl border border-paper-edge/40 text-sm font-bold text-paper-ink hover:bg-paper-2 transition-colors"
        >
          <Lightbulb size={16} strokeWidth={2.25} className="text-cta" />
          {used === 0 ? "მინიშნება" : "კიდევ ერთი მინიშნება"}
          <span className="text-paper-ink-muted font-semibold">{used}/2</span>
        </button>
      )}
    </div>
  );
}

/** The word, opened up: English with audio, Georgian, explanation, one example. */
export function WordReveal({ word, compact = false }: { word: WordInfo; compact?: boolean }) {
  return (
    <div className="paper-inset rounded-2xl px-4 py-3.5 text-left">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xl font-extrabold text-paper-ink leading-tight">{word.en}</p>
        <ReadAloudButton text={word.en} storageKey={word.key} size="md" className={AUDIO_ON_PAPER} />
      </div>
      <p className="ka text-[15px] font-bold text-paper-ink mt-1">{word.ka}</p>
      {!compact && (
        <>
          <p className="ka text-sm leading-snug text-paper-ink-muted mt-1.5">{word.hint}</p>
          <div className="mt-3 pt-3 border-t border-paper-edge/25">
            <p className="text-sm leading-snug text-paper-ink">{word.exEn}</p>
            <p className="ka text-sm leading-snug text-paper-ink-muted mt-0.5">{word.exKa}</p>
          </div>
        </>
      )}
    </div>
  );
}

export function ResultCard({
  day,
  game,
  result,
  score,
  words,
  stats,
  streak,
  viewer,
  share,
  nextGame,
  onNext,
}: {
  day: number;
  game: GameId;
  result: PlayResult;
  /** "4/6 ცდაში", "7 სვლაში", "2:13" */
  score: string;
  words: WordInfo[];
  stats: DayStats | null;
  streak: number;
  viewer: Viewer;
  share: string;
  nextGame: GameId | null;
  onNext: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const pct = (n: number) => Math.round((n / Math.max(1, stats?.players ?? 1)) * 100);

  const onShare = async () => {
    track("game_shared", { game, day, solved: result.solved });
    const how = await shareOut(share);
    if (how === "copied") {
      setCopied(true);
      toast.success("შედეგი დაკოპირდა. ჩასვი, სადაც გინდა.");
      window.setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="wg-rise mt-5 text-center">
      <p className="ka text-2xl font-extrabold text-paper-ink">{result.solved ? "ყოჩაღ!" : "ამჯერად არ გამოვიდა"}</p>
      <p className="ka text-sm font-semibold text-paper-ink-muted mt-1">
        {GAME_NAME[game]}: {score}
        {result.solved ? ` · ${hintLabel(result.hints)}` : ""}
      </p>

      <div className="mt-4 space-y-2">
        {words.map((w) => (
          <WordReveal key={w.key} word={w} compact={words.length > 1} />
        ))}
      </div>

      {stats && stats.players >= 5 && (
        <p className="ka text-[13px] text-paper-ink-muted mt-3">
          დღეს მოთამაშეების {pct(stats.solved)}%-მა ამოხსნა, {pct(stats.noHint)}%-მა მინიშნების გარეშე.
        </p>
      )}
      {viewer !== "visitor" && streak >= 2 && (
        <p className="ka text-[13px] font-bold text-paper-ink mt-2">თამაშების Streak: {streak} დღე</p>
      )}

      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={onShare}
          className="press ka flex-1 inline-flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-xl bg-paper-btn text-paper-btn-fg text-sm font-bold hover:bg-paper-btn/90 transition-colors"
        >
          {copied ? <Check size={16} strokeWidth={2.5} /> : <Share2 size={16} strokeWidth={2.25} />}
          {copied ? "დაკოპირდა" : "გაზიარება"}
        </button>
        {nextGame && (
          <button
            type="button"
            onClick={onNext}
            className="press ka flex-1 inline-flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-xl bg-cta text-cta-fg text-sm font-bold hover:bg-cta-hover transition-colors"
          >
            შემდეგი: {GAME_NAME[nextGame]}
            <ArrowRight size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {viewer === "visitor" && <SignupNudge where="result" lead="ხვალ ახალი სიტყვა გელოდება" />}
    </div>
  );
}

/** For visitors: the reason to make an account, said once and plainly. */
export function SignupNudge({ where, lead }: { where: "result" | "locked"; lead: string }) {
  return (
    <div className="mt-5 rounded-2xl border border-paper-edge/35 px-4 py-4 text-center">
      <p className="ka text-base font-extrabold text-paper-ink">{lead}</p>
      <p className="ka text-sm leading-snug text-paper-ink-muted mt-1">
        დარეგისტრირდი უფასოდ და ითამაშე ყოველდღე. SpeakBusy-ში 980 ასეთი ბიზნეს სიტყვაა.
      </p>
      <Link
        to="/auth?mode=signup"
        onClick={() => track("game_signup_clicked", { where })}
        className="press ka mt-3 inline-flex items-center justify-center gap-2 min-h-[48px] w-full px-5 rounded-xl bg-cta text-cta-fg text-sm font-bold hover:bg-cta-hover transition-colors"
      >
        დაიწყე ახლავე უფასოდ
        <ArrowRight size={16} strokeWidth={2.5} />
      </Link>
      {where === "locked" && (
        <Link to="/auth?mode=login" className="ka inline-block mt-3 text-sm font-semibold text-paper-ink underline underline-offset-4">
          უკვე მაქვს ანგარიში
        </Link>
      )}
    </div>
  );
}
