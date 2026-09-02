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
  // Secrets pasted through a dashboard very often carry a trailing newline or
  // stray space. That single invisible byte changes the SHA-1 and Flitt
  // answers with error 1014 "Invalid signature".
  return v.trim();
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
export async function sign(params: Record<string, unknown>): Promise<{ signature: string; debugString: string }> {
  const parts: string[] = [secretKey()];

  for (const key of Object.keys(params).sort()) {
    if (key === "signature" || key === "response_signature_string") continue;
    const raw = params[key];
    // 0 is meaningful; only null/undefined/"" are skipped.
    if (raw === null || raw === undefined || raw === "") continue;
    // NESTED OBJECTS ARE EXCLUDED. Flitt's own PHP SDK filters parameters with
    // `array_filter($params, 'strlen')`, which cannot accept an array — so
    // recurring_data never reaches their signature string. JSON-encoding it
    // (the obvious guess) produces "Invalid signature", error 1014.
    if (typeof raw === "object") continue;
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

/**
 * Flitt protocol 2.0 signing for requests containing nested data.
 *
 * Protocol 1.0 signs a flat parameter list and cannot represent
 * `recurring_data` reliably. Flitt's own SDK switches subscription creation to
 * 2.0: the complete order is JSON encoded, base64 encoded, then signed as
 * sha1(paymentKey + "|" + base64Data).
 */
export async function createV2Request(order: Record<string, unknown>): Promise<{
  request: { version: "2.0"; data: string; signature: string };
  debugString: string;
}> {
  const json = JSON.stringify({ order });
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const data = btoa(binary);
  const debugString = `${secretKey()}|${data}`;
  const hash = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(debugString));
  const signature = Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return { request: { version: "2.0", data, signature }, debugString };
}

/** Decode the order carried by a successful protocol 2.0 response. */
export function decodeV2Response(data: unknown): Record<string, unknown> {
  if (typeof data !== "string" || !data) return {};
  try {
    const binary = atob(data);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const decoded = JSON.parse(new TextDecoder().decode(bytes));
    return decoded?.order && typeof decoded.order === "object" ? decoded.order : {};
  } catch {
    return {};
  }
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