// src/components/demo/demoQuestions.ts
//
// The 12 questions of the try-before-you-register session on the landing page.
//
// Deliberately HARD-CODED rather than generated from the vocabulary bank:
//
//  1. The bank is ~144 KB gzipped and the landing page must stay light. Every
//     anonymous visitor downloads this file, including the 95% who bounce.
//  2. The demo must be IDENTICAL for everyone, every time. It is the advert,
//     so it has to be a rehearsed performance, not a random draw: difficulty
//     rises, the types alternate, and it ends on a word people know.
//
// Every Georgian string here is copied verbatim from the reviewed vocabulary
// bank (ka, explanationKa, exampleEn/exampleKa). Do not paraphrase them here —
// if a translation is wrong, fix it in vocabBank.ts and copy it across, or the
// two will drift apart.

export type DemoQuestion =
  /** English word shown, pick the Georgian meaning. */
  | {
      type: "meaning";
      key: string;
      en: string;
      choices: string[];
      correct: string;
      explanationKa: string;
      exampleEn: string;
      exampleKa: string;
    }
  /** Georgian meaning shown, pick the English word. */
  | {
      type: "toEnglish";
      key: string;
      ka: string;
      choices: string[];
      correct: string;
      explanationKa: string;
      exampleEn: string;
      exampleKa: string;
    }
  /** Sentence with a gap, pick the word that fills it. */
  | {
      type: "gap";
      key: string;
      /** The sentence with the target replaced by "______". */
      sentence: string;
      choices: string[];
      correct: string;
      explanationKa: string;
      /** Georgian of the FULL sentence, revealed only after answering. */
      exampleKa: string;
    }
  /** Audio plays, pick the Georgian meaning. Uses the stored MP3 for `key`. */
  | {
      type: "listening";
      key: string;
      en: string;
      choices: string[];
      correct: string;
      explanationKa: string;
      exampleEn: string;
      exampleKa: string;
    }
  /** A translation pair is claimed; is it right? */
  | {
      type: "trueFalse";
      key: string;
      en: string;
      claimKa: string;
      isCorrect: boolean;
      /** The real translation, shown when the claim was false. */
      realKa: string;
      explanationKa: string;
      exampleEn: string;
      exampleKa: string;
    };

export const DEMO_QUESTIONS: DemoQuestion[] = [
  // 1 — easy opener, week 1 word. Almost everyone gets this, which is the point:
  // the first question decides whether they play or leave.
  {
    type: "meaning",
    key: "deadline",
    en: "Deadline",
    choices: ["დღის წესრიგი", "ბიუჯეტი", "უკუკავშირი", "ბოლო ვადა"],
    correct: "ბოლო ვადა",
    explanationKa: "ბოლო თარიღი, რომელშიც დავალება უნდა დასრულდეს.",
    exampleEn: "We need to meet the deadline by Friday.",
    exampleKa: "პარასკევისთვის ვადა უნდა დავიცვათ.",
  },
  // 2 — first gap question, still easy.
  {
    type: "gap",
    key: "invoice",
    sentence: "I'll send the ______ at the end of the month.",
    choices: ["Budget", "Invoice", "Agenda", "Feedback"],
    correct: "Invoice",
    explanationKa: "დოკუმენტი, რომელშიც ჩაწერილია გადასახდელი თანხა მომსახურებისთვის.",
    exampleKa: "ანგარიშფაქტურას თვის ბოლოს გამოვაგზავნი.",
  },
  // 3 — reverse direction: Georgian to English is harder than recognising.
  {
    type: "toEnglish",
    key: "feedback",
    ka: "უკუკავშირი",
    choices: ["Minutes", "Agenda", "Feedback", "Follow up"],
    correct: "Feedback",
    explanationKa: "მოსაზრება ან კომენტარი ვინმეს/რამეს ფონქციონირებაზე.",
    exampleEn: "Thanks for the honest feedback on my report.",
    exampleKa: "გმადლობთ ჩემს ანგარიშზე გულახდილი უკუკავშირისთვის.",
  },
  // 4 — audio. Shows off the pre-recorded pronunciation, which no competitor
  // in Georgian has, and breaks up the reading.
  {
    type: "listening",
    key: "revenue",
    en: "Revenue",
    choices: ["შემოსავალი", "ხარჯი", "ვალი", "ფასდაკლება"],
    correct: "შემოსავალი",
    explanationKa: "ფული, რომელსაც კომპანია იღებს გაყიდვებიდან.",
    exampleEn: "Revenue grew by 15% last quarter.",
    exampleKa: "შემოსავალი წინა კვარტალში 15%-ით გაიზარდა.",
  },
  // 5 — gap, mid difficulty.
  {
    type: "gap",
    key: "milestone",
    sentence: "We hit our first ______ last week.",
    choices: ["Turnover", "Headcount", "Milestone", "Shortlist"],
    correct: "Milestone",
    explanationKa: "მნიშვნელოვანი მიღწევა პროექტში.",
    exampleKa: "გასულ კვირას პირველ ეტაპს მივაღწიეთ.",
  },
  // 6 — first genuinely hard word (week 9). By now they are invested.
  {
    type: "meaning",
    key: "bottleneck",
    en: "Bottleneck",
    choices: ["საზომი ნიშნული", "შეფერხების წერტილი", "მოკლე სია", "ზეგანაკვეთური"],
    correct: "შეფერხების წერტილი",
    explanationKa: "ადგილი, სადაც პროცესი ნელდება.",
    exampleEn: "We identified the bottleneck in the process.",
    exampleKa: "შეფერხების წერტილი იპოვე.",
  },
  // 7 — a false pair. Two options, so it feels like a breather, but it tests
  // whether they really know the word rather than recognising a shape.
  {
    type: "trueFalse",
    key: "headcount",
    en: "Headcount",
    claimKa: "ბიუჯეტი",
    isCorrect: false,
    realKa: "თანამშრომელთა რაოდენობა",
    explanationKa: "კომპანიაში დასაქმებულთა საერთო რაოდენობა.",
    exampleEn: "We're increasing headcount next quarter.",
    exampleKa: "თანამშრომელთა რაოდენობა გაიზარდა.",
  },
  // 8 — Georgian to English again, a word most learners have met at work.
  {
    type: "toEnglish",
    key: "onboarding",
    ka: "ადაპტაცია (ახალი თანამშრომლის)",
    choices: ["Overtime", "Outsource", "Turnover", "Onboarding"],
    correct: "Onboarding",
    explanationKa: "პროცესი, რომლის დროსაც ახალი თანამშრომელი ეცნობა კომპანიას.",
    exampleEn: "Onboarding usually takes two weeks.",
    exampleKa: "ადაპტაცია ჩვეულებრივ ორ კვირას გრძელდება.",
  },
  // 9 — hard gap: a two-word freelance term.
  {
    type: "gap",
    key: "scope-creep",
    sentence: "______ killed our profit on that job.",
    choices: ["Scope creep", "Cash flow", "Due diligence", "Churn"],
    correct: "Scope creep",
    explanationKa: "სამუშაოს თანდათანობითი ზრდა დამატებითი გადახდის გარეშე.",
    exampleKa: "სამუშაოს ზრდას უფრთხილდი.",
  },
  // 10 — hard meaning, week 8.
  {
    type: "meaning",
    key: "due-diligence",
    en: "Due diligence",
    choices: ["მოკლე სია", "საფუძვლიანი შემოწმება", "დღის წესრიგი", "აუთსორსინგი"],
    correct: "საფუძვლიანი შემოწმება",
    explanationKa: "ფრთხილი შემოწმება გადაწყვეტილებამდე.",
    exampleEn: "We did due diligence before buying.",
    exampleKa: "საფუძვლიანი შემოწმება გააკეთე.",
  },
  // 11 — audio again, this time a word with two senses.
  {
    type: "listening",
    key: "leverage",
    en: "Leverage",
    choices: ["დაზოგვა", "შეფასება", "დელეგირება", "გამოყენება / ბერკეტი"],
    correct: "გამოყენება / ბერკეტი",
    explanationKa: "რესურსის ან უპირატესობის ეფექტურად გამოყენება.",
    exampleEn: "We can leverage our network to find clients.",
    exampleKa: "კლიენტების მოსაძებნად ჩვენი კონტაქტები შეგვიძლია გამოვიყენოთ.",
  },
  // 12 — finish on a win. The last question is the score they walk away with.
  {
    type: "meaning",
    key: "asap",
    en: "ASAP",
    choices: ["სამუშაო საათებში", "თვის ბოლოს", "რაც შეიძლება მალე", "ყოველ კვირას"],
    correct: "რაც შეიძლება მალე",
    explanationKa: "სასწრაფოდ, ყველანაირი შეფერხების გარეშე",
    exampleEn: "Please reply ASAP.",
    exampleKa: "გთხოვ, რაც შეიძლება მალე მიპასუხე.",
  },
];

export const DEMO_TOTAL = DEMO_QUESTIONS.length;

/** The closing line, written for the score they actually got. */
export function demoVerdict(score: number): { titleKa: string; bodyKa: string } {
  if (score === DEMO_TOTAL)
    return {
      titleKa: "სრული ქულა.",
      bodyKa: "ბაზისი უკვე გაქვს. სერიოზული ბიზნეს ლექსიკა შემდეგ იწყება.",
    };
  if (score >= 9)
    return {
      titleKa: "ძალიან კარგი შედეგია.",
      bodyKa: "ძირითადი სიტყვები იცი. დანარჩენი 968 გელოდება.",
    };
  if (score >= 6)
    return {
      titleKa: "კარგი საწყისი დონეა.",
      bodyKa: "ნახევარზე მეტი იცოდი. დანარჩენი სწორედ ისაა, რაც სამსახურში გამოგადგება.",
    };
  return {
    titleKa: "სწორედ ამისთვისაა SpeakBusy.",
    bodyKa: "ეს სიტყვები ყოველდღე ხმარებაშია ბიზნესში. დღეში ხუთ წუთში ისწავლი.",
  };
}
