// supabase/functions/_shared/aiQuota.ts
//
// Server-side enforcement of the weekly AI limit.
//
// The browser copy of this rule (tryConsumeAiSession in state.ts) is only a UI
// hint — a signed-in user can call an edge function directly and skip it, or
// write aiUsedWeek: 0 to their own row. Enforcement has to happen here, using
// the service role, backed by the row-locking SQL functions consume_ai_session
// and refund_ai_session.

import { createClient } from "npm:@supabase/supabase-js@2";

export const FREE_WEEKLY_AI = 1;
export const PREMIUM_WEEKLY_AI = 7;

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Must produce the SAME string as the client's currentAiWeekKey(), which is
// `Date.toDateString()` of the local Monday. Georgian local time is UTC+4, and
// edge functions run in UTC — so shift first, then read UTC components.
// If these two ever disagree, each side would see the other's key as "a new
// week" and reset the counter forever, silently disabling the limit.
export function currentAiWeekKey(now: Date = new Date()): string {
  const t = new Date(now.getTime() + 4 * 60 * 60 * 1000); // -> Tbilisi wall clock
  const day = t.getUTCDay();                 // 0 Sun .. 6 Sat
  const diff = day === 0 ? 6 : day - 1;      // days since Monday
  t.setUTCDate(t.getUTCDate() - diff);
  t.setUTCHours(0, 0, 0, 0);
  return `${DAYS[t.getUTCDay()]} ${MONTHS[t.getUTCMonth()]} ${String(t.getUTCDate()).padStart(2, "0")} ${t.getUTCFullYear()}`;
}

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export type QuotaResult = {
  ok: boolean;
  remaining: number;
  limit: number;
  week: string;
};

/**
 * Atomically claims one AI session for this user. The LIMIT is decided here,
 * never accepted from the request body — otherwise a caller could claim any
 * allowance they liked.
 */
export async function consumeAiSession(userId: string): Promise<QuotaResult> {
  const db = admin();
  const week = currentAiWeekKey();

  const { data: row } = await db
    .from("business_state")
    .select("state")
    .eq("user_id", userId)
    .maybeSingle();

  const isPro = (row?.state as Record<string, unknown> | null)?.mockPro === true;
  const limit = isPro ? PREMIUM_WEEKLY_AI : FREE_WEEKLY_AI;

  const { data, error } = await db.rpc("consume_ai_session", {
    p_user_id: userId,
    p_week: week,
    p_limit: limit,
  });

  if (error) {
    // Fail CLOSED: if the quota check itself breaks, refuse rather than hand out
    // unlimited generations.
    return { ok: false, remaining: 0, limit, week };
  }

  const r = data as { ok: boolean; remaining: number; limit: number };
  const result = { ok: !!r?.ok, remaining: r?.remaining ?? 0, limit: r?.limit ?? limit, week };

  if (!result.ok) {
    // Fire-and-forget: logging must never block or fail the quota response.
    try {
      void db
        .from("analytics_events")
        .insert({ user_id: userId, event: "ai_quota_exhausted", props: { limit: result.limit } })
        .then(() => {}, () => {});
    } catch (_e) {
      // ignored
    }
  }

  return result;
}

/** Returns the session if generation failed, so an error costs the user nothing. */
export async function refundAiSession(userId: string, week: string): Promise<void> {
  try {
    await admin().rpc("refund_ai_session", { p_user_id: userId, p_week: week });
  } catch (_e) {
    // Non-fatal: a lost refund is far better than a failed response.
  }
}

/** 429 response with a Georgian message the UI can show directly. */
export function quotaExceededResponse(q: QuotaResult, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({
      error: "ai_quota_exceeded",
      limit: q.limit,
      remaining: 0,
      messageKa:
        q.limit === FREE_WEEKLY_AI
          ? "კვირის უფასო ლიმიტი ამოიწურა. პრემიუმით კვირაში 7 სესიაა."
          : "კვირის ლიმიტი ამოიწურა. ახალი სესიები ორშაბათს დაემატება.",
    }),
    { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
