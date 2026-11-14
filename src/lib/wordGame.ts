// src/lib/wordGame.ts
//
// Browser side of the daily word games (გამოიცანი, დაალაგე, იპოვე).
//
// The puzzles are NOT in the website's code. The word-game edge function hands
// out one day at a time, after checking who is asking, so tomorrow's answer
// and the premium archive cannot be read from the page.
//
// What lives in the browser:
//   - a random device id, so a visitor's one free day can be recognised
//   - the half-finished state of today's games, so closing the sheet loses nothing

import { supabase } from "@/integrations/supabase/client";

export type GameId = "guess" | "scramble" | "find";
export const GAME_ORDER: GameId[] = ["guess", "scramble", "find"];
export const GAME_NAME: Record<GameId, string> = {
  guess: "გამოიცანი",
  scramble: "დაალაგე",
  find: "იპოვე",
};

export type WordInfo = { key: string; en: string; ka: string; hint: string; exEn: string; exKa: string };
export type GuessPuzzle = { answer: string; word: WordInfo };
export type ScramblePuzzle = { answer: string; start: string; limit: number; word: WordInfo };
export type FindWord = { form: string; cells: number[]; word: WordInfo };
export type FindPuzzle = { w: number; h: number; grid: string; words: FindWord[] };
export type Puzzles = { guess: GuessPuzzle; scramble: ScramblePuzzle; find: FindPuzzle };

export type PlayResult = { solved: boolean; tries: number; hints: number; ms: number };
export type Viewer = "visitor" | "free" | "premium";
export type Locked = null | "register" | "premium";
export type DayStats = { players: number; solved: number; noHint: number };

export type DayData = {
  ok: true;
  today: number;
  day: number;
  launch: string;
  total: number;
  viewer: Viewer;
  locked: Locked;
  games: Puzzles | null;
  plays: Partial<Record<GameId, PlayResult>>;
  streak: number;
};
export type FinishData = {
  ok: true;
  stats: DayStats;
  plays: Partial<Record<GameId, PlayResult>>;
  streak: number;
};
export type ArchiveData = {
  ok: true;
  today: number;
  launch: string;
  viewer: Viewer;
  locked: Locked;
  days: Record<string, Partial<Record<GameId, boolean>>>;
};

// ---------- storage that never throws ----------
const mem: Record<string, string> = {};
function lsGet(k: string): string | null {
  try { return window.localStorage.getItem(k); } catch { return mem[k] ?? null; }
}
function lsSet(k: string, v: string) {
  try { window.localStorage.setItem(k, v); } catch { mem[k] = v; }
}
function lsDel(k: string) {
  try { window.localStorage.removeItem(k); } catch { delete mem[k]; }
}

// ---------- the device id ----------
const DEVICE_KEY = "sb_wg_device";
const LINK_KEY = "sb_wg_link";

function readCookie(name: string): string | null {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : null;
  } catch { return null; }
}

/** A random id for this browser. No personal data: it only says "the same device as before". */
export function deviceId(): string {
  let id = lsGet(DEVICE_KEY) || readCookie(DEVICE_KEY);
  if (!id || !/^[A-Za-z0-9_-]{16,64}$/.test(id)) {
    const bytes = new Uint8Array(16);
    try { crypto.getRandomValues(bytes); } catch { for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256); }
    id = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  lsSet(DEVICE_KEY, id);
  try { document.cookie = `${DEVICE_KEY}=${id}; max-age=31536000; path=/; SameSite=Lax`; } catch { /* fine */ }
  return id;
}

// ---------- server calls ----------
async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("word-game", { body: { ...body, anonId: deviceId() } });
  if (error) throw error;
  return data as T;
}

/**
 * Today's games (or a past day's, for premium). `signedIn` lets a visitor's
 * earlier plays be handed to the account they have just created.
 */
export async function fetchDay(opts: { day?: number; signedIn: boolean }): Promise<DayData | null> {
  const link = opts.signedIn && lsGet(LINK_KEY) === "1";
  const data = await call<DayData | { ok: false }>({ action: "get", day: opts.day, link });
  if (!data || data.ok !== true) return null; // not launched yet
  if (link) lsDel(LINK_KEY);
  return data;
}

export async function finishGame(day: number, game: GameId, r: PlayResult, viewer: Viewer): Promise<FinishData | null> {
  if (viewer === "visitor") lsSet(LINK_KEY, "1");
  try {
    return await call<FinishData>({ action: "finish", day, game, solved: r.solved, tries: r.tries, hints: r.hints, ms: r.ms });
  } catch {
    return null; // the result still shows; only the shared stats are missing
  }
}

export async function fetchArchive(): Promise<ArchiveData> {
  return call<ArchiveData>({ action: "archive" });
}

// ---------- half-finished games ----------
const progressKey = (day: number, game: GameId) => `sb_wg:${day}:${game}`;

export function loadProgress<T>(day: number, game: GameId): T | null {
  try {
    const raw = lsGet(progressKey(day, game));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}
export function saveProgress(day: number, game: GameId, state: unknown) {
  lsSet(progressKey(day, game), JSON.stringify(state));
}
/** Old days pile up otherwise. Keeps the last two weeks. */
export function pruneProgress(today: number) {
  try {
    const drop: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      const m = k ? /^sb_wg:(\d+):/.exec(k) : null;
      if (m && Math.abs(today - Number(m[1])) > 14 && Number(m[1]) <= today) drop.push(k as string);
    }
    drop.forEach(lsDel);
  } catch { /* fine */ }
}

// ---------- the chip ----------
const DISMISS_KEY = "sb_wg_chip_off";
/** Today's date in Tbilisi (UTC+4), as the games count days. */
export function tbilisiDateKey(now: Date = new Date()): string {
  return new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
export const chipDismissedToday = () => lsGet(DISMISS_KEY) === tbilisiDateKey();
export const dismissChipToday = () => lsSet(DISMISS_KEY, tbilisiDateKey());

// ---------- dates and labels ----------
const KA_MONTHS = [
  "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
  "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი",
];
/** "14 ნოემბერი": the calendar date of a game day. */
export function dayLabel(launch: string, day: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(launch);
  if (!m) return "";
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + day - 1));
  return `${d.getUTCDate()} ${KA_MONTHS[d.getUTCMonth()]}`;
}

export function hintLabel(hints: number): string {
  return hints === 0 ? "მინიშნების გარეშე" : `${hints} მინიშნებით`;
}
export function clock(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** One line that says how a finished game went. */
export function scoreLine(game: GameId, r: PlayResult, limit?: number): string {
  if (game === "guess") return r.solved ? `${r.tries}/6 ცდაში` : "6 ცდა არ ეყო";
  if (game === "scramble") return r.solved ? `${r.tries} სვლაში` : `${limit ?? r.tries} სვლა არ ეყო`;
  return r.solved ? clock(r.ms) : "ყველა სიტყვა ვერ მოიძებნა";
}

// ---------- guess game: marking a guess ----------
export type Mark = "hit" | "near" | "miss";
/** Standard rules, including repeated letters: each answer letter is used once. */
export function markGuess(guess: string, answer: string): Mark[] {
  const n = answer.length;
  const out: Mark[] = new Array(n).fill("miss");
  const left: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    if (guess[i] === answer[i]) out[i] = "hit";
    else left[answer[i]] = (left[answer[i]] || 0) + 1;
  }
  for (let i = 0; i < n; i++) {
    if (out[i] === "hit") continue;
    if (left[guess[i]] > 0) { out[i] = "near"; left[guess[i]]--; }
  }
  return out;
}

// ---------- guess game: is it a real word? ----------
const lists: Record<number, Promise<string | null>> = {};
/**
 * The word list for one length: every word glued together, sorted, so a
 * binary search finds one without building anything in memory. Returns null
 * when the list cannot be loaded, and then every guess is allowed: a missing
 * file must never make the game unplayable.
 */
function wordList(len: number): Promise<string | null> {
  if (!lists[len]) {
    lists[len] = fetch(`${import.meta.env.BASE_URL}wordlists/en-${len}.txt`)
      .then((r) => (r.ok ? r.text() : null))
      .then((t) => (t && t.length % len === 0 && /^[a-z]+$/.test(t) ? t : null))
      .catch(() => null);
  }
  return lists[len];
}
export function preloadWordList(len: number) { void wordList(len); }
export async function isRealWord(word: string): Promise<boolean> {
  const len = word.length;
  const list = await wordList(len);
  if (!list) return true;
  const w = word.toLowerCase();
  let lo = 0, hi = list.length / len - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const cur = list.substr(mid * len, len);
    if (cur === w) return true;
    if (cur < w) lo = mid + 1; else hi = mid - 1;
  }
  return false;
}

// ---------- sharing ----------
const SQUARE: Record<Mark, string> = { hit: "🟦", near: "🟨", miss: "⬜" };

export function shareText(opts: {
  day: number;
  /** false for a past day opened from the archive */
  today: boolean;
  game: GameId;
  result: PlayResult;
  limit?: number;
  guessRows?: Mark[][];
  findTotal?: number;
  findFound?: number;
}): string {
  const { day, game, result } = opts;
  const lines = [`SpeakBusy · ${opts.today ? "დღევანდელი სიტყვების თამაში" : "სიტყვების თამაში"} #${day}`];
  let score = scoreLine(game, result, opts.limit);
  if (game === "find") score = `${opts.findFound ?? 0}/${opts.findTotal ?? 5} სიტყვა${result.solved ? ` · ${clock(result.ms)}` : ""}`;
  lines.push(`${GAME_NAME[game]}: ${score} · ${hintLabel(result.hints)}`);
  if (game === "guess" && opts.guessRows?.length) {
    lines.push("");
    for (const row of opts.guessRows) lines.push(row.map((m) => SQUARE[m]).join(""));
  }
  lines.push("", "speakbusy.com");
  return lines.join("\n");
}

/** Shares through the phone's own share sheet, or copies to the clipboard. */
export async function shareOut(text: string): Promise<"shared" | "copied" | "failed"> {
  try {
    const touch = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
    if (touch && navigator.share) {
      await navigator.share({ text });
      return "shared";
    }
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return "failed"; // closed the share sheet
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
