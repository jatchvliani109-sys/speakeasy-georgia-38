// src/lib/formatDate.ts
//
// Dates, in Georgian, on every device.
//
// THE PROBLEM. The app formatted dates with toLocaleDateString("ka-GE").
// That trusts the browser to carry Georgian locale data, and plenty of them
// do not: when the data is missing the request silently falls back to the
// default locale instead of failing, so a Georgian-only app printed
// "7/31/2026" and "July 31, 2026" to Georgian users. It is invisible in
// testing on a machine that happens to have the data, and it varies by
// device, which is the worst kind of bug to chase.
//
//   Intl.DateTimeFormat("ka-GE").resolvedOptions().locale  ->  "en-US"
//
// THE FIX. Format it ourselves. There are twelve month names; the browser is
// not needed for this. The shape matches formatGeorgianDate in the
// subscription emails ("31 ივლისი, 2026"), so an email and the screen it
// refers to no longer disagree.

const KA_MONTHS = [
  "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
  "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი",
];

function toDate(input: string | number | Date | null | undefined): Date | null {
  if (input === null || input === undefined || input === "") return null;
  const d = input instanceof Date ? input : new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

/** "31 ივლისი, 2026" — the default for anything a person reads. */
export function formatDateKa(input: string | number | Date | null | undefined): string {
  const d = toDate(input);
  if (!d) return "";
  return `${d.getDate()} ${KA_MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}

/** "31.07.2026" — for tight rows and list metadata. */
export function formatDateShortKa(input: string | number | Date | null | undefined): string {
  const d = toDate(input);
  if (!d) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** "31 ივლისი, 2026, 14:05" — 24-hour, which is what Georgia uses. */
export function formatDateTimeKa(input: string | number | Date | null | undefined): string {
  const d = toDate(input);
  if (!d) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${formatDateKa(d)}, ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * "548888XXXXXX8590" -> "•••• 8590".
 *
 * Flitt returns the whole 16-character mask. Printed raw it is a wall of
 * digits and X's that nobody can read at a glance on a phone, and it looks
 * like a leak even though the BIN and the last four are not secret. Everyone
 * recognises their card by the last four.
 */
export function formatCardMask(masked: string | null | undefined): string {
  if (!masked) return "";
  const last4 = masked.replace(/\D/g, "").slice(-4);
  return last4.length === 4 ? `•••• ${last4}` : masked;
}