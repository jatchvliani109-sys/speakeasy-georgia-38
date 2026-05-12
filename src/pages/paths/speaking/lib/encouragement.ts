// Calm, natural encouragement messages for Speaking path completions.
// Use one at a time, rotated.

const KA_MESSAGES = [
  "კარგია — დღეს საუბარში ივარჯიშე.",
  "ყოჩაღ. ერთი ნაბიჯით წინ ხარ.",
  "დღეს ივარჯიშე — ეს უკვე პროგრესია.",
  "კარგი სამუშაოა. ნელ-ნელა თავდაჯერებულობა გაიზრდება.",
  "დღევანდელი პრაქტიკა შესრულებულია. ხვალ გააგრძელე.",
  "კარგად გამოგივიდა. განაგრძე ასევე.",
  "მოკლე ვარჯიში ყოველდღე — სწორი გზაა.",
  "შენ მოხვედი დღეს. ეს მთავარია.",
  "კარგი რიტმია. შეინარჩუნე ის.",
  "კიდევ ერთი დღე ინგლისურთან. კარგია.",
];

const EN_MESSAGES = [
  "Good work — you practiced speaking today.",
  "Nice job. One step forward.",
  "You showed up today. That matters.",
  "Solid work — keep building confidence.",
  "Good practice today. Come back tomorrow and keep your Streak alive.",
  "You completed today's speaking practice. Well done.",
  "Nice progress. Keep going tomorrow.",
  "Good work today.",
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
