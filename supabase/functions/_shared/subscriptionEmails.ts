// Fire-and-forget subscription emails.
//
// A send failure must NEVER break or roll back a payment: every function here
// swallows its own errors and only logs them.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmail } from './transactional-email-templates/send-email.ts'

const KA_MONTHS = [
  "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
  "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი",
];

export function formatGeorgianDate(input: string | Date | null | undefined): string {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  if (isNaN(d.getTime())) return "";
  return `${d.getUTCDate()} ${KA_MONTHS[d.getUTCMonth()]}, ${d.getUTCFullYear()}`;
}

// deno-lint-ignore no-explicit-any
export async function getUserEmail(admin: any, userId: string): Promise<string | null> {
  try {
    const { data } = await admin.auth.admin.getUserById(userId);
    return data?.user?.email ?? null;
  } catch (e) {
    console.error("getUserEmail failed", e);
    return null;
  }
}

function redactEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  return `${local[0]}***@${domain}`;
}

async function logSend(
  templateName: string,
  recipientEmail: string,
  status: "sent" | "suppressed" | "failed",
  errorMessage?: string,
): Promise<void> {
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error } = await admin.from("email_send_log").insert({
      message_id: null,
      template_name: templateName,
      recipient_email: recipientEmail,
      status,
      error_message: errorMessage ?? null,
    });
    if (error) {
      console.error("email_send_log insert failed", { code: error.code, message: error.message });
    }
  } catch (e) {
    console.error("email_send_log insert threw", e);
  }
}

export async function sendAppEmail(params: {
  templateName: string;
  recipientEmail: string;
  idempotencyKey: string;
  templateData: Record<string, unknown>;
}): Promise<void> {
  try {
    const result = await sendTemplateEmail(params.templateName, params.recipientEmail, {
      templateData: params.templateData,
      idempotencyKey: params.idempotencyKey,
    });

    if (result.sent) {
      await logSend(params.templateName, params.recipientEmail, "sent");
    } else {
      await logSend(
        params.templateName,
        params.recipientEmail,
        "suppressed",
        "Recipient suppressed",
      );
      console.log("App email suppressed", {
        template: params.templateName,
        recipient_redacted: redactEmail(params.recipientEmail),
      });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("sendAppEmail failed", params.templateName, message);
    await logSend(params.templateName, params.recipientEmail, "failed", message.slice(0, 1000));
  }
}
