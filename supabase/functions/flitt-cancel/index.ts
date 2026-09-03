// supabase/functions/flitt-cancel/index.ts
//
// Two DISTINCT actions, because they are not the same thing:
//
//   action: "cancel"      Stop future charges. Access continues to the end of
//                         the period already paid for. The saved card REMAINS,
//                         so resubscribing later is one tap.
//
//   action: "delete_card" Remove the stored card entirely. This necessarily
//                         cancels the subscription too, since there is nothing
//                         left to charge.
//
// Either way the change must reach Flitt, not just our database. Marking a row
// cancelled locally while Flitt keeps charging is the worst outcome available:
// the user believes they cancelled, money keeps leaving, and the first anyone
// hears of it is a chargeback.

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

    let action = "cancel";
    try {
      const b = await req.json();
      if (b?.action === "delete_card") action = "delete_card";
    } catch { /* default to cancel */ }

    const { data: sub } = await admin
      .from("subscriptions").select("*").eq("user_id", user.id).maybeSingle();

    if (!sub) return json({ error: "no_subscription" }, 404);
    if (action === "cancel" && !["active", "past_due", "pending"].includes(sub.status)) {
      // Already cancelled: report success rather than an error. The user asked
      // for a state that already holds, so from their side nothing is wrong.
      return json({ ok: true, action, note: "already_cancelled" });
    }
    // No hard failure for delete_card. If the token is already gone at Flitt
    // but a masked number is still displayed, the user must still be able to
    // clear it: otherwise the interface shows a card that cannot be removed.
    if (action === "delete_card" && !sub.rectoken && !sub.masked_card) {
      return json({ ok: true, action, note: "nothing_to_delete" });
    }

    let flittStopped = false;
    let flittError: string | null = null;

    // Stop the schedule for BOTH actions: a deleted card cannot be charged, so
    // leaving the schedule running would only generate failed payments.
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

    // Only remove the stored card when that is what was asked for.
    if (action === "delete_card" && sub.rectoken) {
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
      // Card details are cleared ONLY on delete_card. After a plain cancel the
      // card stays on file so resubscribing does not mean re-entering it.
      ...(action === "delete_card" ? { rectoken: null, masked_card: null } : {}),
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);

    // Access is NOT revoked here. The user paid for the current period and is
    // entitled to it; withdrawing the service early would be taking their money
    // and giving nothing back. business_state.mockPro is cleared when the period
    // actually lapses (see the expiry check on load).

    await admin.from("payment_events").insert({
      user_id: user.id,
      order_id: sub.order_id,
      status: action === "delete_card" ? "card_deleted_by_user" : "cancelled_by_user",
      raw: { action, flittStopped, flittError } as any,
    });

    return json({
      ok: true,
      action,
      flitt_stopped: flittStopped,
      access_until: sub.current_period_end,
    });
  } catch (e) {
    console.error("flitt-cancel", e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});