// Billing emails (payment confirmation + cancellation confirmation).
//
// They go through the SAME pipeline as the auth emails: rendered here, then
// enqueued with the enqueue_email RPC and delivered by process-email-queue.
//
// Every export is fire-and-forget and swallows its own errors. A payment must
// never fail because an email could not be sent.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const SENDER_DOMAIN = "notify.speakbusy.com";
const FROM_DOMAIN = "speakbusy.com";
const FROM = `SpeakBusy <noreply@${FROM_DOMAIN}>`;

const GE_MONTHS = [
  "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
  "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი",
];

export function formatGeorgianDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "";
  return `${d.getUTCDate()} ${GE_MONTHS[d.getUTCMonth()]}, ${d.getUTCFullYear()}`;
}

function render(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key) => vars[key] ?? "");
}

function toPlainText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const SHELL_HEAD = (title: string) => `<!DOCTYPE html>
<html lang="ka">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0; padding:24px 12px; background:#F0EEEB; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px; background:#FFFFFF; border-radius:14px; overflow:hidden;">
            <tr>
              <td style="background:#5C1A2E; padding:26px 32px;">
                <span style="color:#FFFFFF; font-size:22px; font-weight:700; letter-spacing:-0.2px;">SpeakBusy</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">`;

const SHELL_FOOT = `              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px; border-top:1px solid #E4E2DF;">
                <p style="margin:0; font-size:12px; color:#8A8A8A;">
                  SpeakBusy · ბიზნეს ინგლისური ქართველებისთვის
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

// Payment confirmation. The gold "შემდეგი გადახდა" block is REQUIRED by the
// National Bank of Georgia rules on merchant-initiated recurring payments:
// the customer must be told the exact amount and date of the next charge in
// advance. Do not remove it, and do not remove the cancellation instructions.
const PAYMENT_HTML = `${SHELL_HEAD("გადახდა დადასტურებულია")}
                <h1 style="margin:0 0 14px; font-size:20px; line-height:1.4; color:#1C1C1E; font-weight:700;">
                  გადახდა დადასტურებულია
                </h1>

                <p style="margin:0 0 20px; font-size:15px; line-height:1.75; color:#3A3A3A;">
                  მადლობა, რომ სარგებლობ SpeakBusy-ის პრემიუმით. გადახდა წარმატებით
                  განხორციელდა და პრემიუმ წვდომა უკვე აქტიურია.
                </p>

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F8F5F0; border:1px solid #E4E2DF; border-radius:10px; margin-bottom:20px;">
                  <tr>
                    <td style="padding:16px 18px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td style="font-size:13px; color:#8A8A8A; padding:5px 0;">გადახდილი თანხა</td>
                          <td align="right" style="font-size:14px; color:#1C1C1E; font-weight:600; padding:5px 0;">{{amount}} ლარი</td>
                        </tr>
                        <tr>
                          <td style="font-size:13px; color:#8A8A8A; padding:5px 0;">პრემიუმი აქტიურია</td>
                          <td align="right" style="font-size:14px; color:#1C1C1E; font-weight:600; padding:5px 0;">{{period_end_date}}-მდე</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- REGULATORY: advance notice of the next charge. Required. -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FFFFFF; border:2px solid #C9A84C; border-radius:10px; margin-bottom:22px;">
                  <tr>
                    <td style="padding:16px 18px;">
                      <p style="margin:0 0 6px; font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#8A6D2F; font-weight:700;">
                        შემდეგი გადახდა
                      </p>
                      <p style="margin:0; font-size:16px; line-height:1.6; color:#1C1C1E; font-weight:700;">
                        {{next_charge_date}}, {{amount}} ლარი
                      </p>
                      <p style="margin:8px 0 0; font-size:13px; line-height:1.7; color:#4A4A4A;">
                        თანხა ავტომატურად ჩამოიჭრება შენახული ბარათიდან, თუ გამოწერას
                        არ გააუქმებ.
                      </p>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 10px; font-size:15px; line-height:1.75; color:#3A3A3A;">
                  გამოწერის გაუქმება ან ბარათის წაშლა ნებისმიერ დროს შეგიძლია
                  პროფილის გვერდიდან.
                </p>

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 22px;">
                  <tr>
                    <td style="background:#C9A84C; border-radius:26px;">
                      <a href="{{profile_url}}" style="display:inline-block; padding:14px 30px; font-size:15px; font-weight:700; color:#1C1C1E; text-decoration:none;">
                        გამოწერის მართვა
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 6px; font-size:13px; line-height:1.7; color:#4A4A4A;">
                  თუ ღილაკი არ იხსნება, დააკოპირე ეს ბმული ბრაუზერში:
                </p>
                <p style="margin:0 0 22px; font-size:13px; line-height:1.6; word-break:break-all;">
                  <a href="{{profile_url}}" style="color:#5C1A2E;">{{profile_url}}</a>
                </p>

                <hr style="border:none; border-top:1px solid #E4E2DF; margin:0 0 18px;" />

                <p style="margin:0; font-size:13px; line-height:1.75; color:#8A8A8A;">
                  კითხვის შემთხვევაში დაგვიკავშირდი:
                  <a href="mailto:speakbusy@gmail.com" style="color:#5C1A2E;">speakbusy@gmail.com</a>
                  ან +995 551 58 89 69
                </p>
${SHELL_FOOT}`;

const CANCELLATION_HTML = `${SHELL_HEAD("გამოწერა გაუქმებულია")}
                <h1 style="margin:0 0 14px; font-size:20px; line-height:1.4; color:#1C1C1E; font-weight:700;">
                  გამოწერა გაუქმებულია
                </h1>

                <p style="margin:0 0 20px; font-size:15px; line-height:1.75; color:#3A3A3A;">
                  დავადასტურეთ შენი გამოწერის გაუქმება. ავტომატური გადახდა
                  შეწყდა და ბარათიდან თანხა აღარ ჩამოიჭრება.
                </p>

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F8F5F0; border:1px solid #E4E2DF; border-radius:10px; margin-bottom:22px;">
                  <tr>
                    <td style="padding:16px 18px;">
                      <p style="margin:0 0 6px; font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#8A8A8A; font-weight:700;">
                        პრემიუმი აქტიურია
                      </p>
                      <p style="margin:0; font-size:16px; line-height:1.6; color:#1C1C1E; font-weight:700;">
                        {{period_end_date}}-მდე
                      </p>
                      <p style="margin:8px 0 0; font-size:13px; line-height:1.7; color:#4A4A4A;">
                        უკვე გადახდილი პერიოდი სრულად შენია. ამის შემდეგ
                        ავტომატურად გადახვალ უფასო ვერსიაზე.
                      </p>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 20px; font-size:15px; line-height:1.75; color:#3A3A3A;">
                  შენი პროგრესი არსად წასულა. ნასწავლი სიტყვები, ლექსიკონი და
                  Streak შენთან რჩება, უფასო ვერსიაშიც.
                </p>

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;">
                  <tr>
                    <td style="background:#C9A84C; border-radius:26px;">
                      <a href="{{premium_url}}" style="display:inline-block; padding:14px 30px; font-size:15px; font-weight:700; color:#1C1C1E; text-decoration:none;">
                        გამოწერის განახლება
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 6px; font-size:13px; line-height:1.7; color:#4A4A4A;">
                  თუ ღილაკი არ იხსნება, დააკოპირე ეს ბმული ბრაუზერში:
                </p>
                <p style="margin:0 0 22px; font-size:13px; line-height:1.6; word-break:break-all;">
                  <a href="{{premium_url}}" style="color:#5C1A2E;">{{premium_url}}</a>
                </p>

                <hr style="border:none; border-top:1px solid #E4E2DF; margin:0 0 18px;" />

                <p style="margin:0; font-size:13px; line-height:1.75; color:#8A8A8A;">
                  თუ ეს გაუქმება შენ არ გაგიკეთებია, დაგვიკავშირდი დაუყოვნებლივ:
                  <a href="mailto:speakbusy@gmail.com" style="color:#5C1A2E;">speakbusy@gmail.com</a>
                  ან +995 551 58 89 69
                </p>
${SHELL_FOOT}`;

const PROFILE_URL = "https://speakbusy.com/profile";
const PREMIUM_URL = "https://speakbusy.com/path/business/premium";

async function enqueue(
  admin: SupabaseClient<any, any, any>,
  opts: { to: string; subject: string; html: string; label: string },
): Promise<boolean> {
  const messageId = crypto.randomUUID();
  const { error } = await admin.rpc("enqueue_email", {
    queue_name: "auth_emails",
    payload: {
      message_id: messageId,
      to: opts.to,
      from: FROM,
      sender_domain: SENDER_DOMAIN,
      subject: opts.subject,
      html: opts.html,
      text: toPlainText(opts.html),
      purpose: "transactional",
      label: opts.label,
      queued_at: new Date().toISOString(),
    },
  } as any);
  if (error) {
    console.error("billing email enqueue failed", { label: opts.label, error });
    return false;
  }
  return true;
}

export function adminClient(): SupabaseClient<any, any, any> {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/** Fire-and-forget. Never throws. */
export async function sendPaymentConfirmation(
  admin: SupabaseClient<any, any, any>,
  args: { userId: string; email?: string | null; amountGel: number; periodEnd: string },
): Promise<void> {
  try {
    let to = args.email ?? null;
    if (!to) {
      const { data } = await admin.auth.admin.getUserById(args.userId);
      to = data?.user?.email ?? null;
    }
    if (!to) return;

    const date = formatGeorgianDate(args.periodEnd);
    const html = render(PAYMENT_HTML, {
      amount: args.amountGel.toFixed(2),
      next_charge_date: date,
      period_end_date: date,
      profile_url: PROFILE_URL,
    });

    const ok = await enqueue(admin, {
      to,
      subject: "SpeakBusy — გადახდა დადასტურებულია",
      html,
      label: "payment_confirmation",
    });

    if (ok) {
      // Records that the regulatory advance notice for this cycle went out.
      await admin
        .from("subscriptions")
        .update({ next_notice_sent: new Date().toISOString() })
        .eq("user_id", args.userId);
    }
  } catch (e) {
    console.error("sendPaymentConfirmation failed (payment unaffected)", e);
  }
}

/** Fire-and-forget. Never throws. */
export async function sendCancellationConfirmation(
  admin: SupabaseClient<any, any, any>,
  args: { userId: string; email?: string | null; periodEnd: string | null },
): Promise<void> {
  try {
    let to = args.email ?? null;
    if (!to) {
      const { data } = await admin.auth.admin.getUserById(args.userId);
      to = data?.user?.email ?? null;
    }
    if (!to) return;

    const html = render(CANCELLATION_HTML, {
      period_end_date: formatGeorgianDate(args.periodEnd),
      premium_url: PREMIUM_URL,
    });

    await enqueue(admin, {
      to,
      subject: "SpeakBusy — გამოწერა გაუქმებულია",
      html,
      label: "cancellation_confirmation",
    });
  } catch (e) {
    console.error("sendCancellationConfirmation failed (cancel unaffected)", e);
  }
}
