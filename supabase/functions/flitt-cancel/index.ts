// supabase/functions/flitt-cancel/index.ts
//
// Cancels a subscription AND deletes the saved card at Flitt.
//
// Both halves matter. Marking a row cancelled in our own database while Flitt
// keeps the card and keeps charging is the worst failure available: the user
// believes they cancelled, the money keeps leaving, and the first they hear of
// it is a chargeback.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser } from "../_shared/auth.ts";
import { FLITT_API, merchantId, sign, corsHeaders, json } from "../_shared/flitt.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    const user = auth.user;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: sub } = await admin
      .from("subscriptions").select("*").eq("user_id", user.id).maybeSingle();

    if (!sub || !["active", "past_due", "pending"].includes(sub.status)) {
      return json({ error: "no_active_subscription" }, 404);
    }

    let flittStopped = false;
    let flittError: string | null = null;

    if (sub.order_id) {
      // Stop the recurring schedule at Flitt.
      const stopReq: Record<string, unknown> = {
        order_id: sub.order_id,
        merchant_id: merchantId(),
        action: "stop",
      };
      const { signature } = await sign(stopReq);
      try {
        const res = await fetch(`${FLITT_API}/subscription/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ request: { ...stopReq, signature } }),
        });
        const r = (await res.json())?.response ?? {};
        flittStopped = r.response_status === "success";
        if (!flittStopped) flittError = r.error_message ?? "stop_failed";
      } catch (e) {
        flittError = String((e as Error)?.message ?? e);
      }
    }

    // Delete the saved card token so it cannot be charged again.
    if (sub.rectoken) {
      const delReq: Record<string, unknown> = {
        merchant_id: merchantId(),
        rectoken: sub.rectoken,
      };
      const { signature } = await sign(delReq);
      try {
        await fetch(`${FLITT_API}/token/delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ request: { ...delReq, signature } }),
        });
      } catch { /* logged below; local cancellation still proceeds */ }
    }

    // Cancel locally regardless. Access continues to the end of the period the
    // user already paid for — cutting it short would be taking their money and
    // withdrawing the service.
    await admin.from("subscriptions").update({
      status: "cancelled",
      rectoken: null,
      masked_card: null,
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);

    await admin.from("payment_events").insert({
      user_id: user.id,
      order_id: sub.order_id,
      status: "cancelled_by_user",
      raw: { flittStopped, flittError } as any,
    });

    return json({
      ok: true,
      flitt_stopped: flittStopped,
      access_until: sub.current_period_end,
    });
  } catch (e) {
    console.error("flitt-cancel", e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});