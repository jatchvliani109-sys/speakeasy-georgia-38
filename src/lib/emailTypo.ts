// src/lib/emailTypo.ts
//
// "Did you mean gmail.com?" for mistyped email domains.
//
// Sign-up no longer waits for a confirmation email, which means a typo is not
// caught by the person failing to receive it — they just never hear from us
// again, and a paying customer never gets their receipt. This catches the
// common slips before that happens: gamil.com, yaho.com, gmail.con, outlok.com.
//
// Suggestion only. It never rewrites what someone typed and never blocks a
// submit: rare but real domains exist, and being told your own address is
// wrong is worse than a typo.

/** Domains worth correcting towards. Ordered by how common they are here. */
const KNOWN_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "mail.ru",
  "yandex.ru",
  "live.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "me.com",
  "msn.com",
];

/** Edit distance, capped: anything past `max` is "not a typo, a different word". */
function distance(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      row[j] = v;
      if (v < best) best = v;
    }
    // Whole row already worse than the cap: it can only get worse.
    if (best > max) return max + 1;
    prev = row;
  }
  return prev[b.length];
}

/**
 * Returns the corrected address, or null when the address looks fine (or is
 * too far from anything known to guess at).
 *
 *   suggestEmail("nino@gamil.com")  -> "nino@gmail.com"
 *   suggestEmail("nino@gmail.com")  -> null
 *   suggestEmail("nino@company.ge") -> null
 */
export function suggestEmail(raw: string): string | null {
  const email = raw.trim();
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return null;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  if (KNOWN_DOMAINS.includes(domain)) return null;

  // A known domain with a mangled ending: gmail.con, gmail.cm, gmail.co,
  // gmail.comm. Checked first because ".co" is a real TLD and would otherwise
  // sit two edits from ".com" and be missed.
  const dot = domain.indexOf(".");
  if (dot > 0) {
    const name = domain.slice(0, dot);
    const tld = domain.slice(dot + 1);
    for (const known of KNOWN_DOMAINS) {
      const kDot = known.indexOf(".");
      if (known.slice(0, kDot) !== name) continue;
      const kTld = known.slice(kDot + 1);
      if (tld !== kTld && distance(tld, kTld, 2) <= 2) return `${local}@${known}`;
    }
  }

  // Missing dot entirely: gmailcom, yahoocom.
  if (!domain.includes(".")) {
    for (const known of KNOWN_DOMAINS) {
      if (domain === known.replace(".", "")) return `${local}@${known}`;
    }
  }

  // Ordinary misspelling of the whole domain. One edit for short domains, two
  // for longer ones, so "mail.ru" is not dragged towards "gmail.com".
  let best: { domain: string; d: number } | null = null;
  for (const known of KNOWN_DOMAINS) {
    const max = known.length <= 8 ? 1 : 2;
    const d = distance(domain, known, max);
    if (d <= max && (!best || d < best.d)) best = { domain: known, d };
  }
  return best ? `${local}@${best.domain}` : null;
}
