// supabase/functions/delete-account/index.ts
//
// Permanently deletes the calling user: every row they own across the app's
// tables, then the auth account itself.
//
// This MUST be an edge function. Removing an auth user requires the service
// role key, which can never be shipped to the browser — a client-side "delete
// account" can only clear rows, leaving the login alive.
//
// The user is identified from their own JWT, never from the request body, so
// one account can't delete another by passing someone else's id.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// [table, column that holds the user id]
const USER_TABLES: Array<[string, string]> = [
  ["business_vocab_progress", "user_id"],
  ["business_vocab_sessions", "user_id"],
  ["business_interview_sessions", "user_id"],
  ["business_meeting_sessions", "user_id"],
  ["business_email_sessions", "user_id"],
  ["business_reassessments", "user_id"],
  ["business_resumes", "user_id"],
  ["business_state", "user_id"],
  ["vocabulary", "user_id"],
  ["profiles", "id"],
];

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
    if (!url || !anonKey || !serviceKey) {
      return json({ error: "server not configured" }, 500);
    }

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

    // Delete owned rows first. A table that doesn't exist in this project is
    // skipped rather than failing the whole request.
    const tableErrors: string[] = [];
    for (const [table, column] of USER_TABLES) {
      const { error } = await admin.from(table).delete().eq(column, user.id);
      if (error && error.code !== "42P01") {
        tableErrors.push(`${table}: ${error.message}`);
      }
    }

    // Auth account last: if this fails, the user can retry and we haven't left
    // a live login pointing at half-deleted data.
    const { error: authErr } = await admin.auth.admin.deleteUser(user.id);
    if (authErr) {
      return json({ error: `auth deletion failed: ${authErr.message}`, tableErrors }, 500);
    }

    return json({ ok: true, tableErrors });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});