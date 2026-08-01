// supabase/functions/_shared/resumeRateLimit.ts
//
// Daily rate limit for CV parsing. This step is deliberately OUTSIDE the weekly
// AI budget (it is a one-time onboarding action, not a practice exercise), so it
// needs its own abuse guard: a per-user daily cap backed by resume_parse_events.
//
// Enforced with the service role — the table is invisible to normal clients, so
// a user cannot delete their own events to reset the counter.

import { createClient } from "npm:@supabase/supabase-js@2";

export const RESUME_PARSES_PER_DAY = 5;

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/** Start of the current day in Tbilisi wall-clock time (UTC+4), as a UTC instant. */
function startOfTbilisiDay(now: Date = new Date()): Date {
  const t = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  t.setUTCHours(0, 0, 0, 0);
  return new Date(t.getTime() - 4 * 60 * 60 * 1000);
}

export type RateLimitResult = {
  ok: boolean;
  used: number;
  limit: number;
  remaining: number;
  /** ISO timestamp when the window resets (next Tbilisi midnight). */
  resetAt: string;
};

/**
 * Counts today's parses and records this one. Returns ok: false when the user is
 * already at the cap. Fails OPEN on infrastructure errors: this is an abuse
 * guard, not a paywall, and blocking a legitimate onboarding upload because a
 * count query hiccuped is the worse outcome.
 */
export async function checkResumeParseLimit(userId: string): Promise<RateLimitResult> {
  const db = admin();
  const since = startOfTbilisiDay();
  const resetAt = new Date(since.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const limit = RESUME_PARSES_PER_DAY;

  const { count, error } = await db
    .from("resume_parse_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since.toISOString());

  if (error) {
    return { ok: true, used: 0, limit, remaining: limit, resetAt };
  }

  const used = count ?? 0;
  if (used >= limit) {
    return { ok: false, used, limit, remaining: 0, resetAt };
  }

  await db.from("resume_parse_events").insert({ user_id: userId });
  return { ok: true, used: used + 1, limit, remaining: limit - used - 1, resetAt };
}

/** 429 response with a Georgian message the UI can show directly. */
export function resumeRateLimitResponse(
  r: RateLimitResult,
  corsHeaders: Record<string, string>,
) {
  return new Response(
    JSON.stringify({
      error: "resume_parse_rate_limited",
      limit: r.limit,
      used: r.used,
      remaining: 0,
      resetAt: r.resetAt,
      messageKa: `დღეს CV-ის ატვირთვის ლიმიტი ამოიწურა (დღეში ${r.limit}-ჯერ). სცადე ხვალ.`,
    }),
    { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
