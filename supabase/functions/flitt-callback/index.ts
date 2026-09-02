// supabase/functions/flitt-callback/index.ts
//
// Flitt calls this after EVERY charge: the first one and every monthly renewal.
// This is the only place premium access is granted.
//
// PUBLIC endpoint (Flitt is not logged in), so it must verify the signature.
// Deploy with verify_jwt = false, or Flitt's calls will be rejected.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCallback, verifyAndDecodeV2, corsHeaders, json } from "../_shared/flitt.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const raw = await req.text();
    // Flitt posts either JSON or form-encoded depending on configuration.
    let body: Record<string, unknown>;
    try {
      const parsed = JSON.parse(raw);
      body = parsed?.response ?? parsed;
    } catch {
      body = Object.fromEntries(new URLSearchParams(raw));
    }

    // NEVER trust an unverified callback. Anyone can POST to a public URL;
    // without this check they could grant themselves premium.
    const isV2 = body.version === "2.0" || (typeof body.data === "string" && body.data.length > 0);
    const decodedV2 = isV2 ? await verifyAndDecodeV2(body) : null;
    const valid = isV2 ? decodedV2 !== null : await verifyCallback(body);
    if (!valid) {
      console.error("flitt-callback: bad signature", body?.order_id);
      return json({ error: "invalid_signature" }, 403);
    }
    if (decodedV2) body = decodedV2;

    const orderId = String(body.order_id ?? "");
    const paymentId = String(body.payment_id ?? "");
    const orderStatus = String(body.order_status ?? "");
    const rectoken = String(body.rectoken ?? "");
    const maskedCard = String(body.masked_card ?? "");
    const amount = Number(body.amount ?? 0);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Find the subscriber. Renewals carry a NEW order_id derived from the
    // original, so match on the stored rectoken as well.
    let sub = null as any;
    if (orderId) {
      const { data } = await admin.from("subscriptions").select("*").eq("order_id", orderId).maybeSingle();
      sub = data;
    }
    if (!sub && rectoken) {
      const { data } = await admin.from("subscriptions").select("*").eq("rectoken", rectoken).maybeSingle();
      sub = data;
    }

    // Append-only log, written whether or not we matched a user. The unique
    // index on payment_id makes a duplicate callback a no-op rather than a
    // double activation — Flitt may retry, and it must be safe.
    await admin.from("payment_events").insert({
      user_id: sub?.user_id ?? null,
      order_id: orderId || null,
      payment_id: paymentId || null,
      amount,
      status: orderStatus,
      raw: body as any,
    });

    if (!sub) {
      // Log it and return 200 anyway: a non-200 makes Flitt retry forever.
      console.warn("flitt-callback: no subscription for", orderId, rectoken);
      return json({ ok: true, note: "no matching subscription" });
    }

    if (orderStatus === "approved") {
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      await admin.from("subscriptions").update({
        status: "active",
        rectoken: rectoken || sub.rectoken,
        masked_card: maskedCard || sub.masked_card,
        current_period_end: periodEnd.toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("user_id", sub.user_id);
    } else if (["declined", "expired", "reversed"].includes(orderStatus)) {
      // Do not revoke immediately: the paid period may still be running, and
      // a failed renewal deserves a retry before access is removed.
      await admin.from("subscriptions").update({
        status: "past_due",
        updated_at: new Date().toISOString(),
      }).eq("user_id", sub.user_id);
    }

    return json({ ok: true });
  } catch (e) {
    console.error("flitt-callback", e);
    // Still 200: an exception here must not make Flitt retry indefinitely.
    return json({ ok: false, error: String((e as Error)?.message ?? e) });
  }
});