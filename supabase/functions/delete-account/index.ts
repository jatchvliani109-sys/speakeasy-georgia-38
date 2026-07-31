// supabase/functions/delete-account/index.ts
//
// Permanently deletes the calling user: every row they own across the schema,
// then the auth account itself.
//
// Table list verified against information_schema on 2026-07-31 — do not edit it
// from memory. If you add a table with a user_id column, add it here too, or
// account deletion will silently leave personal data behind.
//
// This MUST be an edge function: removing an auth user requires the service role
// key, which can never ship to a browser. A client-side "delete account" can
// only clear rows and leaves the login alive.
//
// The user is identified from their own JWT, never from the request body, so one
// account cannot delete another.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Tables keyed on the user's id.
const USER_ID_TABLES = [
  "business_vocab_progress",
  "business_vocab_sessions",
  "business_interview_sessions",
  "business_meeting_sessions",
  "business_presentation_sessions",
  "business_email_sessions",
  "business_documents",
  "business_reassessments",
  "business_resumes",
  "business_state",
  "vocabulary",
  "lessons",
  "level_test_results",
  "mistakes",
  "onboarding_answers",
  "pronunciation_attempts",
  "speaking_scenario_progress",
];

// profiles keys the user on `id`, not `user_id`.
const ID_TABLES = ["profiles"];

// Keyed on the email address rather than the user id — column name varies.
// NOTE: `suppressed_emails` is deliberately NOT cleared. It records addresses
// that bounced or reported spam; wiping it would allow that address to be
// emailed again, defeating the very preference it exists to honour.
// `email_send_log` IS cleared: it stores recipient_email plus a free-form
// metadata jsonb that may contain further personal data, so anonymising only
// the address column would be a half-measure.
const EMAIL_TABLES: Array<[string, string]> = [
  ["email_unsubscribe_tokens", "email"],
  ["email_send_log", "recipient_email"],
];

// Postgres codes we tolerate: missing table / missing column. A schema that has
// drifted must not abort the whole deletion.
const IGNORABLE = new Set(["42P01", "42703"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "missing authorization header" }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceKey) return json({ error: "server not configured" }, 500);

    // Identify the caller from their own token.
    const asUser = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await asUser.auth.getUser();
    const user = userData?.user;
    if (userErr || !user) return json({ error: "not authenticated" }, 401);

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const errors: string[] = [];
    let tablesCleared = 0;

    const wipe = async (table: string, column: string, value: string) => {
      const { error } = await admin.from(table).delete().eq(column, value);
      if (error && !IGNORABLE.has(error.code ?? "")) {
        errors.push(`${table}.${column}: ${error.message}`);
      } else if (!error) {
        tablesCleared++;
      }
    };

    for (const t of USER_ID_TABLES) await wipe(t, "user_id", user.id);
    for (const t of ID_TABLES) await wipe(t, "id", user.id);

    if (user.email) {
      for (const [t, col] of EMAIL_TABLES) await wipe(t, col, user.email);
      // business_email_sessions carries a denormalised user_email as well.
      await wipe("business_email_sessions", "user_email", user.email);
    }

    // Auth account last: if this fails the user can retry, rather than being
    // left with a live login pointing at deleted data.
    const { error: authErr } = await admin.auth.admin.deleteUser(user.id);
    if (authErr) {
      return json({ error: `auth deletion failed: ${authErr.message}`, errors }, 500);
    }

    return json({ ok: true, tablesCleared, errors });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
