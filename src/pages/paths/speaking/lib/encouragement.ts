// Friendly, professional encouragement messages for the Speaking path.
// Tone: friendly, light, encouraging — not formal, not childish, not slang.

const KA_MESSAGES = [
  "კარგია! დღევანდელი საუბრის პრაქტიკა დასრულებულია.",
  "ყოჩაღ! დღეს კარგი პროგრესი გაქვს.",
  "კარგი მუშაობაა — ხვალ ისევ გააგრძელე.",
  "დღევანდელი გაკვეთილი შესრულებულია. შეგიძლია კიდევ ივარჯიშო.",
  "კარგი პრაქტიკა გამოვიდა. ნელ-ნელა საუბარი უფრო მარტივი გახდება.",
  "ძალიან კარგი — ასე გააგრძელე.",
  "კარგი რიტმია, შეინარჩუნე ის.",
  "ერთი ნაბიჯით წინ ხარ. ხვალაც მოდი.",
];

const EN_MESSAGES = [
  "Nice work! Today's speaking practice is complete.",
  "Good job — you made progress today.",
  "Great work. Come back tomorrow and keep practicing.",
  "Today's lesson is complete. You can practice more if you want.",
  "Solid practice. Keep it going.",
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
