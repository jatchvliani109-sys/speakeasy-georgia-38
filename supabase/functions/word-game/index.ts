// supabase/functions/word-game/index.ts
//
// The daily word games (გამოიცანი, დაალაგე, იპოვე).
//
// Open to visitors as well as signed-in users, so verify_jwt is off for this
// function (supabase/config.toml) and the caller is worked out here instead.
// The rules themselves live in ../_shared/wordGameCore.ts; this file only
// connects them to the database.
//
// POST { action: "get",     day?, anonId?, link? }      -> today's (or a past day's) puzzles
// POST { action: "finish",  day, game, solved, tries, hints, ms, anonId? } -> saves a result, returns stats
// POST { action: "archive" }                            -> which days this user has played
//
// Tables (created by the SQL Olegi runs once): word_game_settings, word_game_plays.
// Both have row level security on and no policies, so only this function,
// through the service role, can read or write them.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { handle, validAnonId, type GameId, type Play, type Store } from "../_shared/wordGameCore.ts";

const TRIAL_DAYS = 7; // keep in step with TRIAL_DAYS in src/pages/paths/business/lib/state.ts

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/** The signed-in user, or null for a visitor. Never rejects the request. */
async function userIdFrom(req: Request): Promise<string | null> {
  const header = req.headers.get("Authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  const parts = token.split(".");
  if (parts.length !== 3) return null; // a publishable key, not a user's token
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload?.role === "anon" || !payload?.sub) return null; // the public key
  } catch (_e) {
    return null;
  }
  try {
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data, error } = await anon.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user.id;
  } catch (_e) {
    return null;
  }
}

let launchCache: { value: string | null; at: number } | null = null;

type Row = { day_number: number; game: string; solved: boolean; tries: number; hints: number; duration_ms: number };
const toPlay = (r: Row): Play => ({
  day: r.day_number, game: r.game as GameId, solved: r.solved, tries: r.tries, hints: r.hints, ms: r.duration_ms,
});

function makeStore(): Store {
  const db = admin();
  const COLS = "day_number, game, solved, tries, hints, duration_ms";
  return {
    async launchDate() {
      if (launchCache && Date.now() - launchCache.at < 60_000) return launchCache.value;
      const { data, error } = await db.from("word_game_settings").select("launch_date").eq("id", 1).maybeSingle();
      if (error) return null; // table not created yet: the games simply stay hidden
      const value = (data?.launch_date as string | undefined) ?? null;
      launchCache = { value, at: Date.now() };
      return value;
    },
    async isPremium(userId) {
      const { data } = await db.from("business_state").select("state").eq("user_id", userId).maybeSingle();
      const state = (data?.state ?? null) as Record<string, unknown> | null;
      if (state?.mockPro === true) return true;
      const started = typeof state?.trialStartedAt === "string" ? new Date(state.trialStartedAt) : null;
      if (!started || isNaN(started.getTime())) return false;
      return Date.now() < started.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000;
    },
    async playsOnDay(who, day) {
      let q = db.from("word_game_plays").select(COLS).eq("day_number", day);
      q = "userId" in who ? q.eq("user_id", who.userId) : q.eq("anon_id", who.anonId);
      const { data } = await q;
      return ((data ?? []) as Row[]).map(toPlay);
    },
    async devicePlayedBefore(anonId, day) {
      const { data } = await db.from("word_game_plays").select("id").eq("anon_id", anonId).lt("day_number", day).limit(1);
      return (data ?? []).length > 0;
    },
    async insertPlay(row) {
      const { error } = await db.from("word_game_plays").insert({
        day_number: row.day,
        game: row.game,
        user_id: row.userId,
        anon_id: row.anonId,
        solved: row.solved,
        tries: row.tries,
        hints: row.hints,
        duration_ms: row.ms,
      });
      // 23505 = this player has already finished this game today. Not an error.
      if (error && error.code !== "23505") throw new Error(error.message);
    },
    async linkDevice(anonId, userId) {
      await db.from("word_game_plays").update({ user_id: userId }).eq("anon_id", anonId).is("user_id", null);
    },
    async dayStats(day, game) {
      const base = () =>
        db.from("word_game_plays").select("id", { count: "exact", head: true }).eq("day_number", day).eq("game", game);
      const [all, solved, noHint] = await Promise.all([
        base(),
        base().eq("solved", true),
        base().eq("solved", true).eq("hints", 0),
      ]);
      return { players: all.count ?? 0, solved: solved.count ?? 0, noHint: noHint.count ?? 0 };
    },
    async solvedDays(userId, fromDay) {
      const { data } = await db
        .from("word_game_plays")
        .select("day_number")
        .eq("user_id", userId)
        .eq("solved", true)
        .gte("day_number", fromDay);
      return [...new Set(((data ?? []) as { day_number: number }[]).map((r) => r.day_number))];
    },
    async allPlays(userId) {
      const { data } = await db
        .from("word_game_plays")
        .select(COLS)
        .eq("user_id", userId)
        .order("day_number", { ascending: false })
        .limit(3000);
      return ((data ?? []) as Row[]).map(toPlay);
    },
  };
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const userId = await userIdFrom(req);
    const anonId = validAnonId(body.anonId) ? body.anonId : null;
    const result = await handle(body, { userId, anonId }, makeStore());
    return json(result.status, result.body);
  } catch (e) {
    console.error("word-game failed", e);
    return json(500, { error: "server_error" });
  }
});
