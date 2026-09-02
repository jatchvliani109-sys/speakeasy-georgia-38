// supabase/functions/flitt-subscribe/index.ts
//
// Starts a subscription. Returns a Flitt checkout URL for the browser to open.
//
// The card is entered on FLITT'S page, never ours, which keeps this project
// out of PCI DSS scope entirely.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser } from "../_shared/auth.ts";
import {
  FLITT_API, PRICE_TETRI, CURRENCY, merchantId, sign, corsHeaders, json,
  type NestedMode,
} from "../_shared/flitt.ts";

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

    // Already paying? Do not let them subscribe twice.
    const { data: existing } = await admin
      .from("subscriptions").select("status, current_period_end")
      .eq("user_id", user.id).maybeSingle();
    if (existing && ["active", "cancelled"].includes(existing.status)
        && existing.current_period_end && new Date(existing.current_period_end) > new Date()) {
      return json({ error: "already_subscribed" }, 409);
    }

    const siteUrl = Deno.env.get("SITE_URL") ?? "https://speakbusy.com";
    // Unique per attempt. Flitt rejects a reused order_id, and reusing one
    // across attempts would also collide in our own table.
    const orderId = `sb_${user.id.slice(0, 8)}_${Date.now()}`;

    // Optional { "mode": "simple" } in the body creates a ONE-OFF payment with
    // no recurring_data. If simple signs but subscription does not, the fault
    // is isolated to the nested object.
    let mode = "subscription";
    let probe = false;
    try {
      const b = await req.json();
      if (b?.mode === "simple") mode = "simple";
      if (b?.mode === "probe") { mode = "subscription"; probe = true; }
    } catch { /* no body is fine */ }

    const request: Record<string, unknown> = {
      order_id: orderId,
      order_desc: "SpeakBusy Premium",
      currency: CURRENCY,
      amount: PRICE_TETRI,
      merchant_id: merchantId(),
      ...(mode === "subscription" ? {
        subscription: "Y",
        recurring_data: {
          every: 1,
          period: "month",
          amount: PRICE_TETRI,
          // 'hidden' enables the schedule without showing the user a calendar
          // they might switch off. They agreed to a monthly subscription; the
          // cancel button lives in our app, where consumer law expects it.
          state: "hidden",
          readonly: "y",
          quantity: 120,      // 10 years of months; renewed long before then
        },
      } : {}),
      server_callback_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/flitt-callback`,
      response_url: `${siteUrl}/path/business/premium?payment=return`,
      lang: "ka",
      sender_email: user.email ?? "",
    };

    // PROBE MODE: try each nested-object encoding against the live API and
    // report which one Flitt accepts. A rejected order costs nothing and
    // charges nobody, so this is cheaper than guessing one per round trip.
    if (probe) {
      // PROVEN so far: variant C put recurring_data in the request but LEFT IT
      // OUT of the signature, producing a signature string identical to the
      // working plain payment — and it still failed. The signature is therefore
      // correct, and "Invalid signature" is a misleading error for a rejected
      // recurring_data payload.
      //
      // These variants vary the CONTENTS of recurring_data instead.
      const base = { ...request };
      delete base.subscription;
      delete base.recurring_data;

      const today = new Date().toISOString().slice(0, 10);
      const variants: Array<{ name: string; rd: unknown }> = [
        // Only the four documented mandatory fields.
        { name: "G_minimal", rd: { amount: PRICE_TETRI, period: "month", every: 1, quantity: 12 } },
        // `readonly` appears in Flitt's example but NOT in their property table,
        // and their Node sample spells it "Readonly". Prime suspect.
        { name: "H_no_readonly", rd: { amount: PRICE_TETRI, period: "month", every: 1, quantity: 12, state: "y" } },
        // Explicit start date, as in their PHP sample.
        { name: "I_with_start", rd: { start_time: today, amount: PRICE_TETRI, period: "month", every: 1, quantity: 12, state: "y" } },
        // Their documented sample values verbatim, only the amount changed.
        { name: "J_docs_exact", rd: { every: 5, period: "day", amount: PRICE_TETRI, state: "y", readonly: "n", quantity: 100 } },
        // Amount as a string rather than a number.
        { name: "K_string_amount", rd: { amount: String(PRICE_TETRI), period: "month", every: "1", quantity: "12" } },
        // recurring_data sent as a JSON STRING rather than a nested object.
        { name: "L_json_string", rd: JSON.stringify({ amount: PRICE_TETRI, period: "month", every: 1, quantity: 12 }) },
      ];

      const results: Record<string, string> = {};
      for (const v of variants) {
        const attempt: Record<string, unknown> = {
          ...base,
          order_id: `${orderId}_${v.name}`,
          subscription: "Y",
          recurring_data: v.rd,
        };
        // Sign with the nested object excluded — proven equivalent to the
        // working plain-payment signature.
        const { signature: sg } = await sign(attempt, typeof v.rd === "string" ? "json" : "exclude");
        const res2 = await fetch(`${FLITT_API}/checkout/url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ request: { ...attempt, signature: sg } }),
        });
        const b2 = (await res2.json())?.response ?? {};
        results[v.name] = b2.response_status === "success"
          ? "*** WORKS ***"
          : `${b2.error_code ?? "?"} ${b2.error_message ?? ""}`.trim();
      }
      return json({ probe: 3, results });
    }

    const { signature, debugString } = await sign(request);
    request.signature = signature;

    const res = await fetch(`${FLITT_API}/checkout/url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request }),
    });
    const body = await res.json();
    const r = body?.response ?? {};

    if (r.response_status !== "success" || !r.checkout_url) {
      // response_signature_string is returned in TEST MODE only and shows
      // exactly how Flitt built the signature — the fastest way to fix a
      // signature mismatch.
      console.error("flitt create failed", JSON.stringify(r));
      // Return the string WE hashed, with the secret masked, so a mismatch can
      // be diagnosed without Flitt's own hint (which only appears in test mode).
      const masked = debugString.replace(/^[^|]*/, "********");
      return json({
        error: r.error_message ?? "payment_init_failed",
        error_code: r.error_code ?? null,
        mode,
        flitt_hint: r.response_signature_string ?? null,
        our_signature_string: masked,
        full_response: r,
      }, 502);
    }

    // Record the attempt so the callback can find this user by order_id.
    await admin.from("subscriptions").upsert({
      user_id: user.id,
      order_id: orderId,
      status: "pending",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    return json({ ok: true, checkout_url: r.checkout_url, order_id: orderId });
  } catch (e) {
    console.error("flitt-subscribe", e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});