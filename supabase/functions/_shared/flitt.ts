// supabase/functions/_shared/flitt.ts
//
// Shared helpers for the Flitt payment gateway (TBC's e-commerce partner).
//
// Credentials live in Cloud → Secrets and are read from the environment here.
// They must never appear in the repo, in the browser, or in any log line.

export const FLITT_API = "https://pay.flitt.com/api";

/** 13.99 GEL is sent as 1399. Flitt amounts have NO decimal separator. */
export const PRICE_TETRI = 1399;
export const CURRENCY = "GEL";

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`missing secret: ${name}`);
  return v;
}

export const merchantId = () => Number(env("FLITT_MERCHANT_ID"));
const secretKey = () => env("FLITT_PAYMENT_KEY");

/**
 * Flitt signature: sha1 of the payment secret key followed by every non-empty
 * request value, sorted by KEY name, joined with "|".
 *
 * Rules that cause almost every integration failure, per Flitt's own docs:
 *   - empty / null values are omitted entirely, including their separator
 *   - `signature` and `response_signature_string` are never included
 *   - the result must be lowercase hex
 *   - a value of 0 must NOT be treated as empty
 *
 * Nested objects (recurring_data) are JSON-encoded. Flitt's docs do not state
 * this explicitly; if signatures are rejected, their TEST-mode error response
 * includes `response_signature_string` showing exactly what they expected —
 * compare it against `debugString` below.
 */
/**
 * How nested objects (recurring_data) participate in the signature.
 *
 * A plain payment signs correctly with the base algorithm, so sort/filter/join
 * are proven right — only the nested object is in question, and Flitt's docs do
 * not say. These are the candidate encodings; `probeSignature` tries them
 * against the live API to find the one that works.
 */
export type NestedMode =
  | "exclude"        // omit nested objects entirely
  | "json"           // JSON.stringify as-is
  | "json_sorted"    // JSON.stringify with keys sorted
  | "flatten"        // append each nested VALUE as its own segment
  | "flatten_sorted" // same, with nested keys sorted first
  | "merge";         // merge nested KEYS into the top-level alphabetical sort

export async function sign(
  params: Record<string, unknown>,
  nested: NestedMode = "exclude",
): Promise<{ signature: string; debugString: string }> {
  const parts: string[] = [secretKey()];

  // "merge": nested keys join the SAME alphabetical sort as top-level ones, as
  // a flat form-encoded API would produce. Untried until now, and the only
  // encoding consistent with the evidence: excluding recurring_data yields a
  // signature string identical to a working plain payment, yet still fails —
  // so Flitt must be folding its contents in somewhere.
  if (nested === "merge") {
    const flat: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(params)) {
      if (k === "signature" || k === "response_signature_string") continue;
      if (v && typeof v === "object") {
        for (const [nk, nv] of Object.entries(v as Record<string, unknown>)) flat[nk] = nv;
      } else {
        flat[k] = v;
      }
    }
    for (const k of Object.keys(flat).sort()) {
      const v = flat[k];
      if (v === null || v === undefined || v === "") continue;
      parts.push(String(v));
    }
    const dbg = parts.join("|");
    const bts = new TextEncoder().encode(dbg);
    const hsh = await crypto.subtle.digest("SHA-1", bts);
    return {
      signature: Array.from(new Uint8Array(hsh)).map((b) => b.toString(16).padStart(2, "0")).join(""),
      debugString: dbg,
    };
  }

  for (const key of Object.keys(params).sort()) {
    if (key === "signature" || key === "response_signature_string") continue;
    const raw = params[key];
    // 0 is meaningful; only null/undefined/"" are skipped.
    if (raw === null || raw === undefined || raw === "") continue;

    if (typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      if (nested === "exclude") continue;
      if (nested === "json") { parts.push(JSON.stringify(obj)); continue; }
      if (nested === "json_sorted") {
        const sorted: Record<string, unknown> = {};
        for (const k of Object.keys(obj).sort()) sorted[k] = obj[k];
        parts.push(JSON.stringify(sorted));
        continue;
      }
      const keys = nested === "flatten_sorted" ? Object.keys(obj).sort() : Object.keys(obj);
      for (const k of keys) {
        const v = obj[k];
        if (v === null || v === undefined || v === "") continue;
        parts.push(String(v));
      }
      continue;
    }
    parts.push(String(raw));
  }

  const debugString = parts.join("|");
  const bytes = new TextEncoder().encode(debugString);
  const hash = await crypto.subtle.digest("SHA-1", bytes);
  const signature = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return { signature, debugString };
}

/** Verifies a callback really came from Flitt and was not tampered with. */
export async function verifyCallback(body: Record<string, unknown>): Promise<boolean> {
  const claimed = String(body.signature ?? "");
  if (!claimed) return false;
  const { signature } = await sign(body);
  return signature === claimed.toLowerCase();
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}