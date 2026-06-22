// Pre-written Georgian feedback framing for the email module.
// The AI edge function returns ONLY English content + category tags (no Georgian
// sentences), so all user-facing Georgian here is hand-written and grammatically
// correct. The module stitches our Georgian + the AI's English corrections together.
//
// Flow:
//   AI returns: verdict ("strong"|"okay"|"weak"), English rewrite,
//               and corrections each tagged with a categoryKey.
//   We supply:  all Georgian framing (encouragement, headers, per-category "why").

export type Verdict = "strong" | "okay" | "weak";

// ----- Verdict-level framing (the warm summary at the top of feedback) -----
// Several variants per verdict so repeated lessons don't feel canned. The module
// picks one at random.

export const VERDICT_SUMMARIES: Record<Verdict, string[]> = {
  strong: [
    "ძალიან კარგი იმეილია — სტრუქტურა და ტონი პროფესიონალურია. ქვემოთ რამდენიმე პატარა დახვეწა.",
    "მაგარი ნამუშევარია! იმეილი ნათელი და თავაზიანია. მოდი კიდევ ცოტა გავაუმჯობესოთ.",
    "შესანიშნავია — შენი იმეილი თავდაჯერებულად და გარკვევით ჟღერს. რამდენიმე წვრილმანი დაგვრჩა.",
  ],
  okay: [
    "კარგი მცდელობაა — საფუძველი სწორია, თუმცა რამდენიმე ადგილი დახვეწას საჭიროებს.",
    "კარგად მიდიხარ! ძირითადი აზრი გასაგებია, ახლა მოდი ტონსა და სიზუსტეზე ვიმუშაოთ.",
    "კარგი დასაწყისია. რამდენიმე ცვლილებით იმეილი ბევრად უფრო პროფესიონალური გახდება.",
  ],
  weak: [
    "კარგია, რომ სცადე — ეს მთავარია. მოდი ერთად გავარჩიოთ რა გავაუმჯობესოთ.",
    "ყოჩაღ მცდელობისთვის! რამდენიმე მნიშვნელოვანი ცვლილება იმეილს ბევრად გააძლიერებს.",
    "კარგი დასაწყისია — ახლა ნაბიჯ-ნაბიჯ გავხადოთ უფრო ნათელი და პროფესიონალური.",
  ],
};

// ----- "What worked" generic praise lines, keyed by category -----
// AI tags what the user did well; we show the matching Georgian.

export const STRENGTH_MESSAGES: Record<string, string> = {
  clear_structure: "იმეილს ნათელი სტრუქტურა აქვს — ადვილი წასაკითხია.",
  polite_tone: "ტონი თავაზიანი და პროფესიონალურია.",
  good_greeting: "მისალმება სწორად და თბილად არის შერჩეული.",
  clear_ask: "შენი მოთხოვნა მკაფიოა — მკითხველი მიხვდება რა გინდა.",
  good_closing: "დასასრული პროფესიონალური და გარკვევითია.",
  concise: "იმეილი მოკლე და კონკრეტულია — ზედმეტი არაფერია.",
  specific_detail: "კონკრეტული დეტალები კარგად გამოიყენე — ეს ნდობას ზრდის.",
  good_subject: "თემის ველი (subject) ნათელია და აზუსტებს იმეილის მიზანს.",
};

// ----- Correction categories: the "why" behind each before→after fix -----
// AI tags each correction with one of these keys; we show the Georgian "why".
// Keep these covering the most common Business-English mistakes for Georgian speakers.

export const CORRECTION_CATEGORIES: Record<string, { labelKa: string; whyKa: string }> = {
  too_casual: {
    labelKa: "ზედმეტად არაფორმალური",
    whyKa: "სამუშაო იმეილისთვის ეს ტონი ზედმეტად არაფორმალურია — უფრო პროფესიონალური ფორმაა საჭირო.",
  },
  too_direct: {
    labelKa: "ზედმეტად პირდაპირი",
    whyKa: "პირდაპირი მოთხოვნა შეიძლება უხეშად აღიქმებოდეს — დაამატე თავაზიანი 'softener' (მაგ. 'could you', 'would it be possible').",
  },
  vague_ask: {
    labelKa: "ბუნდოვანი მოთხოვნა",
    whyKa: "მოთხოვნა ბუნდოვანია — მკაფიოდ თქვი ზუსტად რა გჭირდება და როდის.",
  },
  wrong_tense: {
    labelKa: "არასწორი დრო (tense)",
    whyKa: "ზმნის დრო არასწორია — ეს ცვლის წინადადების მნიშვნელობას.",
  },
  missing_article: {
    labelKa: "აკლია artikli (a/the)",
    whyKa: "ინგლისურში არტიკლი (a/an/the) ხშირად სავალდებულოა — მისი გამოტოვება გრამატიკულ შეცდომას ქმნის.",
  },
  word_order: {
    labelKa: "სიტყვების რიგი",
    whyKa: "სიტყვების რიგი ბუნებრივ ინგლისურს არ შეესაბამება — გადაალაგე უფრო გასაგებად.",
  },
  preposition: {
    labelKa: "არასწორი წინდებული (preposition)",
    whyKa: "წინდებული (in/on/at/to...) არასწორია — ინგლისურში კონკრეტული ფრაზები კონკრეტულ წინდებულს თხოულობს.",
  },
  cliche: {
    labelKa: "ცარიელი კლიშე",
    whyKa: "ეს ფრაზა ცარიელი კლიშეა — ჩაანაცვლე კონკრეტული ფაქტით ან მაგალითით.",
  },
  too_long: {
    labelKa: "ზედმეტად გრძელი",
    whyKa: "წინადადება ზედმეტად გრძელია — დაყავი მოკლე, ნათელ ნაწილებად.",
  },
  unclear_subject: {
    labelKa: "სუსტი subject line",
    whyKa: "თემის ველი (subject) ბუნდოვანია — გახადე კონკრეტული, რომ მკითხველმა მაშინვე მიხვდეს მიზანს.",
  },
  greeting_issue: {
    labelKa: "მისალმების პრობლემა",
    whyKa: "მისალმება არ შეესაბამება სიტუაციის ფორმალურობას — შეარჩიე უფრო შესაფერისი.",
  },
  closing_issue: {
    labelKa: "სუსტი დასასრული",
    whyKa: "დასასრული სუსტია ან აკლია — დაამატე პროფესიონალური დახურვა და ხელმოწერა.",
  },
  word_choice: {
    labelKa: "სიტყვის არჩევანი",
    whyKa: "ეს სიტყვა აქ ზუსტად არ ჯდება — უფრო ბუნებრივი ან პროფესიონალური ვარიანტი არსებობს.",
  },
  redundant: {
    labelKa: "გამეორება",
    whyKa: "ეს ნაწილი იმეორებს უკვე ნათქვამს — ამოღება იმეილს უფრო მკაფიოს გახდის.",
  },
  tone_mismatch: {
    labelKa: "ტონის შეუსაბამობა",
    whyKa: "ტონი არ შეესაბამება მიმღებს ან სიტუაციას — მოარგე ფორმალურობა კონტექსტს.",
  },
  spelling: {
    labelKa: "მართლწერა",
    whyKa: "მართლწერის შეცდომაა — გადაამოწმე სიტყვის სწორი დაწერილობა.",
  },
  // Fallback when AI sends an unknown category
  general: {
    labelKa: "გასაუმჯობესებელი",
    whyKa: "ეს ნაწილი უკეთ ჩამოყალიბდება — იხილე შემოთავაზებული ვერსია.",
  },
};

// ----- Improve-step acknowledgements (when user rewrites a snippet) -----
// AI returns a verdict on their rewrite; we supply the Georgian.

export type ImproveVerdict = "better" | "similar" | "worse" | "empty";

export const IMPROVE_MESSAGES: Record<ImproveVerdict, { headlineKa: string[]; tipKa: string }> = {
  better: {
    headlineKa: [
      "მართლა გაუმჯობესდა! 👏",
      "ბევრად უკეთესია — ყოჩაღ!",
      "სწორედ ასე — ეს ვერსია უფრო ძლიერია.",
    ],
    tipKa: "გადადი შემდეგ ნაბიჯზე — კარგად გამოგივიდა.",
  },
  similar: {
    headlineKa: [
      "ცოტა შეიცვალა, მაგრამ არსი იგივეა — ვცადოთ ისევ.",
      "თითქმის იგივეა — სცადე უფრო თამამი ცვლილება.",
    ],
    tipKa: "სცადე სხვა სიტყვები ან სტრუქტურა — არა მხოლოდ სინონიმები.",
  },
  worse: {
    headlineKa: [
      "ეს ვერსია ცოტა დაასუსტა — დავუბრუნდეთ.",
      "ჰმ, აქ ცოტა გაურკვევლობა შემოვიდა — ვცადოთ თავიდან.",
    ],
    tipKa: "დაუბრუნდი თავდაპირველ აზრს და გახადე უფრო ნათელი, არა რთული.",
  },
  empty: {
    headlineKa: [
      "ცარიელი პასუხი ვერ შევაფასე 🙂",
      "ჩაწერე შენი ვერსია და მერე შევაფასებ.",
    ],
    tipKa: "სცადე — თუნდაც ერთი წინადადება საკმარისია დასაწყისად.",
  },
};

// ----- Helpers -----

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function verdictSummary(verdict: Verdict): string {
  return pick(VERDICT_SUMMARIES[verdict] ?? VERDICT_SUMMARIES.okay);
}

export function strengthMessage(key: string): string {
  return STRENGTH_MESSAGES[key] ?? STRENGTH_MESSAGES.clear_structure;
}

export function correctionFor(categoryKey: string): { labelKa: string; whyKa: string } {
  return CORRECTION_CATEGORIES[categoryKey] ?? CORRECTION_CATEGORIES.general;
}

export function improveHeadline(verdict: ImproveVerdict): string {
  return pick(IMPROVE_MESSAGES[verdict]?.headlineKa ?? IMPROVE_MESSAGES.similar.headlineKa);
}

export function improveTip(verdict: ImproveVerdict): string {
  return (IMPROVE_MESSAGES[verdict] ?? IMPROVE_MESSAGES.similar).tipKa;
}
