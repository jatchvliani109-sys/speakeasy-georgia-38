// Friendly, casual Georgian-coach encouragement messages for the Speaking path.
// Mix of casual slang and clean messages. One sentence max, at most one slang phrase per message.

const KA_MESSAGES = [
  // casual / slang
  "საღოლ, ბრო! დღევანდელი პრაქტიკა შესრულებულია.",
  "ვაა, კარგი გამოვიდა! დღეს საუბარში ივარჯიშე.",
  "შეხე ამას — კიდევ ერთი გაკვეთილი შესრულებულია.",
  "კარგია, ძმობილო! ნელ-ნელა ინგლისური მოდის.",
  "საღოლ! დღეს კარგი speaking practice გამოვიდა.",
  "ბრო, კარგი იყო — ხვალაც გააგრძელე და Streak არ დაკარგო.",
  "სიმონ, ეგრე გააგრძელე — დღევანდელი გაკვეთილი შესრულებულია.",
  "კარგი სამუშაოა, ტო. დღეს რეალურად ივარჯიშე.",
  "ჰაჰა, მშვენიერია — ინგლისური უკვე მოძრაობაშია.",
  "შესანიშნავია! დღეს ერთი ნაბიჯით წინ წახვედი.",
  "ვაა, ეგრე! დღევანდელი მისია შესრულდა.",
  "ბრატ, კარგად მიდიხარ — განაგრძე ასევე.",
  // cleaner / balanced
  "ყოჩაღ! დღევანდელი პრაქტიკა დასრულებულია.",
  "კარგია! დღეს საუბარში ივარჯიშე.",
  "ძალიან კარგი — ასე გააგრძელე.",
  "დღევანდელი გაკვეთილი შესრულებულია.",
  "კარგი რიტმია, შეინარჩუნე ის.",
  "ერთი ნაბიჯით წინ ხარ. ხვალაც მოდი.",
];

const EN_MESSAGES = [
  "Nice one — speaking practice done.",
  "Good work today.",
  "You showed up today. That counts.",
  "Solid practice. Keep it going.",
  "Done for today — see you tomorrow.",
  "Nice progress today.",
];

function pick<T>(arr: T[], seed?: number): T {
  const i = typeof seed === "number" ? Math.abs(seed) % arr.length : Math.floor(Math.random() * arr.length);
  return arr[i];
}

export function getEncouragementKa(seed?: number): string {
  return pick(KA_MESSAGES, seed);
}

export function getEncouragementEn(seed?: number): string {
  return pick(EN_MESSAGES, seed);
}

// Stable per-day so the message doesn't flicker on re-renders within the same day.
export function dailySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
