// supabase/functions/_shared/wordGameCore.ts
//
// The rules of the daily word games, with no database or HTTP in them, so they
// can be tested on their own. The edge function (word-game/index.ts) plugs in
// the real database through the Store interface below.
//
// WHO MAY PLAY WHAT
//   visitor (not signed in)  today's three games, on ONE day only. Once this
//                            device has played on an earlier day, it is asked
//                            to register.
//   signed in, free          today's three games, every day.
//   premium (or trial)       today plus every past day.
//   nobody                   a future day. Those never leave the server.

import { WG_DAYS, WG_WORDS } from "./wordGameData.ts";

export const TOTAL_DAYS = WG_DAYS.length;
export const GAMES = ["guess", "scramble", "find"] as const;
export type GameId = (typeof GAMES)[number];

export type Play = { day: number; game: GameId; solved: boolean; tries: number; hints: number; ms: number };

export interface Store {
  /** "YYYY-MM-DD": the Tbilisi date that is day 1. null until the SQL has been run. */
  launchDate(): Promise<string | null>;
  isPremium(userId: string): Promise<boolean>;
  playsOnDay(who: { userId: string } | { anonId: string }, day: number): Promise<Play[]>;
  /** Has this device finished any game on a day before `day`? */
  devicePlayedBefore(anonId: string, day: number): Promise<boolean>;
  /** Saves a finished game. A second finish of the same game is ignored. */
  insertPlay(row: Play & { userId: string | null; anonId: string | null }): Promise<void>;
  /** Hands a visitor's earlier plays to the account they have just signed in to. */
  linkDevice(anonId: string, userId: string): Promise<void>;
  dayStats(day: number, game: GameId): Promise<{ players: number; solved: number; noHint: number }>;
  solvedDays(userId: string, fromDay: number): Promise<number[]>;
  allPlays(userId: string): Promise<Play[]>;
}

export type Viewer = { userId: string | null; anonId: string | null };
export type Result = { status: number; body: Record<string, unknown> };

const TBILISI_OFFSET_MS = 4 * 60 * 60 * 1000; // UTC+4 all year, no summer time
const DAY_MS = 24 * 60 * 60 * 1000;

function dayIndexOfDate(ymd: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return null;
  return Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY_MS);
}

/** Day 1 is the launch date; a new day starts at midnight in Tbilisi. */
export function todayNumber(launch: string, now: Date): number | null {
  const start = dayIndexOfDate(launch);
  if (start === null) return null;
  return Math.floor((now.getTime() + TBILISI_OFFSET_MS) / DAY_MS) - start + 1;
}

export function validAnonId(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(v);
}

function wordInfo(key: string) {
  const w = WG_WORDS[key];
  return { key, en: w[0], ka: w[1], hint: w[2], exEn: w[3], exKa: w[4] };
}

/** After day 980 the puzzles start again from the first one. */
export function puzzlesForDay(day: number) {
  const d = WG_DAYS[(day - 1) % TOTAL_DAYS];
  return {
    guess: { answer: d[2], word: wordInfo(d[1]) },
    scramble: { answer: d[4], start: d[5], limit: d[6], word: wordInfo(d[3]) },
    find: {
      w: d[7],
      h: d[8],
      grid: d[9],
      words: d[10].map(([key, form, cells]) => ({ form, cells, word: wordInfo(key) })),
    },
  };
}

function streakFrom(days: number[], today: number): number {
  const set = new Set(days);
  // today counts once it is played; until then yesterday keeps the streak alive
  let d = set.has(today) ? today : today - 1;
  let n = 0;
  while (d >= 1 && set.has(d)) { n++; d--; }
  return n;
}

function playsMap(plays: Play[]) {
  const out: Record<string, { solved: boolean; tries: number; hints: number; ms: number }> = {};
  for (const p of plays) out[p.game] = { solved: p.solved, tries: p.tries, hints: p.hints, ms: p.ms };
  return out;
}

const clampInt = (v: unknown, lo: number, hi: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
};

export async function handle(
  body: Record<string, unknown>,
  viewer: Viewer,
  store: Store,
  now: Date = new Date(),
): Promise<Result> {
  const action = body?.action;
  if (action !== "get" && action !== "finish" && action !== "archive") {
    return { status: 400, body: { error: "bad_action" } };
  }
  if (!viewer.userId && !viewer.anonId) return { status: 400, body: { error: "no_player" } };

  const launch = await store.launchDate();
  const today = launch ? todayNumber(launch, now) : null;
  if (!launch || today === null || today < 1) {
    return { status: 200, body: { ok: false, reason: "not_started" } };
  }

  const userId = viewer.userId;
  const anonId = viewer.anonId;
  if (userId && anonId && body.link === true) {
    try { await store.linkDevice(anonId, userId); } catch (_e) { /* never block a game on this */ }
  }
  const premium = userId ? await store.isPremium(userId) : false;
  const kind = userId ? (premium ? "premium" : "free") : "visitor";
  const who = userId ? { userId } : { anonId: anonId as string };

  const streak = async () => (userId ? streakFrom(await store.solvedDays(userId, Math.max(1, today - 400)), today) : 0);

  if (action === "archive") {
    if (!userId) return { status: 200, body: { ok: true, today, launch, viewer: kind, locked: "register", days: {} } };
    const days: Record<number, Record<string, boolean>> = {};
    for (const p of await store.allPlays(userId)) (days[p.day] = days[p.day] || {})[p.game] = p.solved;
    return { status: 200, body: { ok: true, today, launch, viewer: kind, locked: null, days } };
  }

  const day = body.day === undefined || body.day === null ? today : Number(body.day);
  if (!Number.isInteger(day) || day < 1 || day > today) return { status: 400, body: { error: "bad_day" } };

  let locked: "register" | "premium" | null = null;
  if (day < today) locked = userId ? (premium ? null : "premium") : "register";
  else if (!userId && (await store.devicePlayedBefore(anonId as string, today))) locked = "register";

  if (action === "get") {
    if (locked) {
      return {
        status: 200,
        body: { ok: true, today, day, launch, total: TOTAL_DAYS, viewer: kind, locked, games: null, plays: {}, streak: await streak() },
      };
    }
    const [plays, s] = await Promise.all([store.playsOnDay(who, day), streak()]);
    return {
      status: 200,
      body: {
        ok: true, today, day, launch, total: TOTAL_DAYS, viewer: kind, locked: null,
        games: puzzlesForDay(day), plays: playsMap(plays), streak: s,
      },
    };
  }

  // finish
  if (locked) return { status: 403, body: { error: "locked", locked } };
  const game = body.game as GameId;
  if (!GAMES.includes(game)) return { status: 400, body: { error: "bad_game" } };
  await store.insertPlay({
    day,
    game,
    solved: body.solved === true,
    tries: clampInt(body.tries, 0, 999),
    hints: clampInt(body.hints, 0, 20),
    ms: clampInt(body.ms, 0, 6 * 60 * 60 * 1000),
    userId,
    anonId,
  });
  const [stats, plays, s] = await Promise.all([store.dayStats(day, game), store.playsOnDay(who, day), streak()]);
  return { status: 200, body: { ok: true, today, day, stats, plays: playsMap(plays), streak: s } };
}
