// supabase/functions/daily-tasks/index.ts
//
// One scheduled job, run once a day. Two responsibilities:
//
//   1. Trial reminders on days 2, 5 and 7.
//   2. Renewal charges for subscriptions whose paid period has ended.
//
// Deliberately one function rather than two: a single cron entry is one thing
// to configure, one thing to monitor, and one place to look when something did
// not happen. Each task is independent, so a failure in one cannot stop the
// other.
//
// PROTECTED: this moves money. It must never be reachable from a browser.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  FLITT_API, PRICE_TETRI, CURRENCY, merchantId, sign, corsHeaders, json,
} from "../_shared/flitt.ts";
import { sendAppEmail, getUserEmail, formatGeorgianDate } from "../_shared/subscriptionEmails.ts";

const MAX_ATTEMPTS = 3;
const RETRY_DAYS = 2;
const TRIAL_DAYS = 7;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return json({ error: "unauthorised" }, 401);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const summary = { reminders: [] as unknown[], charges: [] as unknown[] };

  // ── 1. TRIAL REMINDERS ────────────────────────────────────────────────────
  try {
    const { data: states } = await admin
      .from("business_state")
      .select("user_id, state")
      .not("state->>trialStartedAt", "is", null)
      .limit(500);

    const now = Date.now();

    for (const row of states ?? []) {
      const st = (row.state ?? {}) as Record<string, unknown>;
      if (st.mockPro === true) continue;              // paying: not on trial
      const started = st.trialStartedAt ? new Date(String(st.trialStartedAt)) : null;
      if (!started || isNaN(started.getTime())) continue;

      const dayNum = Math.floor((now - started.getTime()) / 86400000);
      // Which reminder is due today, if any?
      const template =
        dayNum === 2 ? "trial-day-2" :
        dayNum === 5 ? "trial-day-5" :
        dayNum === TRIAL_DAYS ? "trial-ended" : null;
      if (!template) continue;

      // Send each reminder at most once, tracked in the state blob so a
      // re-run of the job cannot double-send.
      const sent = Array.isArray(st.trialEmailsSent) ? (st.trialEmailsSent as string[]) : [];
      if (sent.includes(template)) continue;

      const email = await getUserEmail(admin, row.user_id);
      if (!email) continue;

      // Their real numbers. A reminder that says "you learned 0 words" is
      // worse than no reminder, so skip if nothing has been started.
      const { data: prog } = await admin
        .from("business_vocab_progress")
        .select("confidence, manual_label")
        .eq("user_id", row.user_id);
      const rows = prog ?? [];
      if (!rows.length && template !== "trial-ended") continue;

      let weighted = 0;
      const W: Record<number, number> = { 0: 0.15, 1: 0.30, 2: 0.50, 3: 0.75, 4: 1, 5: 1 };
      for (const r of rows) {
        if (r.manual_label === "easy") { weighted += 1; continue; }
        weighted += W[Math.max(0, Math.min(5, Math.round(r.confidence ?? 0)))] ?? 0;
      }
      const percent = Math.round((weighted / 980) * 1000) / 10;

      await sendAppEmail({
        templateName: template,
        recipientEmail: email,
        idempotencyKey: `${template}_${row.user_id}`,
        templateData: {
          words_started: String(rows.length),
          percent: String(percent),
          days_left: String(Math.max(0, TRIAL_DAYS - dayNum)),
          app_url: template === "trial-day-2"
            ? "https://speakbusy.com/path/business/vocabulary"
            : "https://speakbusy.com/path/business/premium",
        },
      });

      await admin.from("business_state")
        .update({ state: { ...st, trialEmailsSent: [...sent, template] } })
        .eq("user_id", row.user_id);

      summary.reminders.push({ user: row.user_id, template, day: dayNum });
    }
  } catch (e) {
    console.error("trial reminders failed", e);
    summary.reminders.push({ error: String((e as Error)?.message ?? e) });
  }

  // ── 2. RENEWAL CHARGES ────────────────────────────────────────────────────
  try {
    const { data: due } = await admin
      .from("subscriptions")
      .select("*")
      .in("status", ["active", "past_due"])
      .not("rectoken", "is", null)
      .lte("current_period_end", new Date().toISOString())
      .limit(100);

    for (const sub of due ?? []) {
      const attempts = Number(sub.charge_attempts ?? 0);

      if (attempts >= MAX_ATTEMPTS) {
        await admin.from("subscriptions")
          .update({ status: "expired", updated_at: new Date().toISOString() })
          .eq("user_id", sub.user_id);
        await revokePremium(admin, sub.user_id);
        summary.charges.push({ user: sub.user_id, action: "expired_after_retries" });
        continue;
      }

      if (attempts > 0 && sub.last_charge_attempt) {
        const next = new Date(sub.last_charge_attempt);
        next.setDate(next.getDate() + RETRY_DAYS);
        if (next > new Date()) {
          summary.charges.push({ user: sub.user_id, action: "waiting_for_retry" });
          continue;
        }
      }

      const orderId = `sb_rec_${String(sub.user_id).slice(0, 8)}_${Date.now()}`;
      const request: Record<string, unknown> = {
        order_id: orderId,
        order_desc: "SpeakBusy Premium",
        currency: CURRENCY,
        amount: String(PRICE_TETRI),
        rectoken: sub.rectoken,
        merchant_id: merchantId(),
      };
      const { signature } = await sign(request);

      let approved = false;
      let message = "";
      try {
        const res = await fetch(`${FLITT_API}/recurring/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ request: { ...request, signature } }),
        });
        const r = (await res.json())?.response ?? {};
        approved = r.order_status === "approved";
        message = r.error_message ?? r.order_status ?? "";
        await admin.from("payment_events").insert({
          user_id: sub.user_id,
          order_id: orderId,
          payment_id: r.payment_id ? String(r.payment_id) : null,
          amount: PRICE_TETRI,
          status: r.order_status ?? "error",
          raw: r as any,
        });
      } catch (e) {
        message = String((e as Error)?.message ?? e);
      }

      if (approved) {
        // Extend from the PREVIOUS period end, not today, so a late run does
        // not quietly shorten what the customer paid for.
        const base = sub.current_period_end ? new Date(sub.current_period_end) : new Date();
        const periodEnd = new Date(base);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        await admin.from("subscriptions").update({
          status: "active",
          current_period_end: periodEnd.toISOString(),
          charge_attempts: 0,
          last_charge_attempt: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("user_id", sub.user_id);

        // The regulated notice of the NEXT charge rides on this confirmation.
        const email = await getUserEmail(admin, sub.user_id);
        if (email) {
          const dateKa = formatGeorgianDate(periodEnd);
          await sendAppEmail({
            templateName: "payment-confirmation",
            recipientEmail: email,
            idempotencyKey: `pay_${orderId}`,
            templateData: {
              amount: (PRICE_TETRI / 100).toFixed(2),
              period_end_date: dateKa,
              next_charge_date: dateKa,
              profile_url: "https://speakbusy.com/profile",
            },
          });
          await admin.from("subscriptions")
            .update({ next_notice_sent: new Date().toISOString() })
            .eq("user_id", sub.user_id);
        }
        summary.charges.push({ user: sub.user_id, action: "charged" });
      } else {
        await admin.from("subscriptions").update({
          status: "past_due",
          charge_attempts: attempts + 1,
          last_charge_attempt: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("user_id", sub.user_id);
        summary.charges.push({ user: sub.user_id, action: "failed", attempt: attempts + 1, message });
      }
    }
  } catch (e) {
    console.error("renewal charges failed", e);
    summary.charges.push({ error: String((e as Error)?.message ?? e) });
  }

  return json({ ok: true, ...summary });
});

/** Drops the user to the free tier. mockPro is what every premium check reads. */
async function revokePremium(admin: any, userId: string) {
  const { data: bs } = await admin
    .from("business_state").select("state").eq("user_id", userId).maybeSingle();
  const next = { ...((bs?.state as Record<string, unknown>) ?? {}), mockPro: false };
  await admin.from("business_state")
    .upsert({ user_id: userId, state: next }, { onConflict: "user_id" });
}