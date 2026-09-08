// Fire-and-forget subscription emails.
//
// A send failure must NEVER break or roll back a payment: every function here
// swallows its own errors and only logs them.

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

export async function sendAppEmail(params: {
  templateName: string;
  recipientEmail: string;
  idempotencyKey: string;
  templateData: Record<string, unknown>;
}): Promise<void> {
  try {
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-transactional-email`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      console.error("sendAppEmail non-ok", params.templateName, res.status, await res.text());
    }
  } catch (e) {
    console.error("sendAppEmail failed", params.templateName, e);
  }
}
