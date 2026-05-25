// Fixed progressive curriculum for Business English modules.
// Every user follows the same ordered topic sequence; the actual
// scenarios + content within each topic are generated fresh each time.

export type CurriculumTopic = {
  key: string;
  titleKa: string;
  shortKa: string;
  focusKa: string;
  guidanceEn: string; // sent to the model to lock topic + complexity
};

export const EMAIL_CURRICULUM: CurriculumTopic[] = [
  {
    key: "introduction",
    titleKa: "გაცნობის წერილი",
    shortKa: "გაცნობა",
    focusKa: "პროფესიული გაცნობა — სტრუქტურა, მისალმება, მკაფიო შესავალი.",
    guidanceEn:
      "INTRODUCTION emails — basic structure, professional greeting, simple but clear opener. Keep tone friendly + professional. Foundation skill.",
  },
  {
    key: "follow_up",
    titleKa: "Follow-up წერილი",
    shortKa: "Follow-up",
    focusKa: "წინა კონტაქტზე მითითება, თავაზიანი დაჟინება, მკაფიო next step.",
    guidanceEn:
      "FOLLOW-UP emails — referencing previous contact/meeting, polite persistence, clear next step. Build on greeting + structure from intro lesson.",
  },
  {
    key: "request",
    titleKa: "მოთხოვნის წერილი",
    shortKa: "მოთხოვნა",
    focusKa: "პროფესიული ტონი, ნათელი მოთხოვნა, შესაბამისი ფორმალურობა.",
    guidanceEn:
      "MAKING REQUESTS — professional tone, clear specific ask, appropriate formality (modal verbs, softeners). Builds on opener + follow-up framing.",
  },
  {
    key: "update",
    titleKa: "სტატუსი და მოხსენება",
    shortKa: "სტატუსი/მოხსენება",
    focusKa: "სტრუქტურირებული ინფორმაცია, მკაფიო ფორმატი, ნათელი დასკვნა.",
    guidanceEn:
      "SHARING UPDATES & REPORTS — structured information, clear formatting (bullets / short paragraphs), TL;DR + detail. Reuse polite opener.",
  },
  {
    key: "complaint",
    titleKa: "საჩივრის წერილი",
    shortKa: "საჩივარი",
    focusKa: "ემპათია, პრობლემის მკაფიო აღწერა, გადაწყვეტაზე ფოკუსი.",
    guidanceEn:
      "HANDLING COMPLAINTS PROFESSIONALLY — empathy, neutral language, solution-focused. Avoid blame. Builds on clear-ask skills from request lesson.",
  },
  {
    key: "negotiation",
    titleKa: "მოლაპარაკება და წინადადება",
    shortKa: "მოლაპარაკება",
    focusKa: "დარწმუნება პროფესიული ტონით, ალტერნატივების შეთავაზება.",
    guidanceEn:
      "NEGOTIATING AND PROPOSING — persuasive but professional, offer alternatives, hedge language, value framing. Builds on request + complaint tone.",
  },
  {
    key: "closing",
    titleKa: "გარიგების დახურვა",
    shortKa: "დახურვა",
    focusKa: "გადამწყვეტი, მკაფიო, პროფესიული დახურვა და დადასტურება.",
    guidanceEn:
      "CLOSING DEALS AND CONFIRMING — decisive, clear, confirming details (dates, scope, next actions). Caps the negotiation arc.",
  },
];

export const INTERVIEW_CURRICULUM: CurriculumTopic[] = [
  {
    key: "background",
    titleKa: "გამოცდილების მიმოხილვა",
    shortKa: "Background",
    focusKa: "Tell me about yourself, experience overview, მკაფიო structure.",
    guidanceEn:
      "BACKGROUND questions — 'Tell me about yourself', experience overview. Heavy weight on small_talk + background stages. Foundation.",
  },
  {
    key: "motivation",
    titleKa: "მოტივაცია",
    shortKa: "Motivation",
    focusKa: "რატომ ეს კომპანია, რატომ ეს როლი — specific + authentic პასუხები.",
    guidanceEn:
      "MOTIVATION questions — 'Why this company?', 'Why this role?'. Push for specifics about company, not generic answers. Build on intro skills.",
  },
  {
    key: "situational",
    titleKa: "სიტუაციური კითხვები",
    shortKa: "Situational",
    focusKa: "'Tell me about a time when…' — STAR struktura, კონკრეტული მაგალითები.",
    guidanceEn:
      "SITUATIONAL questions — 'Tell me about a time when…'. Heavy situational stage, push for STAR-style answers (Situation, Task, Action, Result).",
  },
  {
    key: "competency",
    titleKa: "უნარების დემონსტრირება",
    shortKa: "Skills",
    focusKa: "Skill-based კითხვები, კონკრეტული უნარების მაგალითები.",
    guidanceEn:
      "SKILL AND COMPETENCY questions — demonstrate specific abilities, technical/role skills. Probe for evidence + outcomes. Builds on STAR from situational.",
  },
  {
    key: "pressure",
    titleKa: "ზეწოლა და pushback",
    shortKa: "Pressure",
    focusKa: "რთული follow-up-ების მართვა, თავდაცვა პროფესიონალურად.",
    guidanceEn:
      "PRESSURE AND PUSHBACK — interviewer pushes back hard on every answer, plays skeptical, asks 'why should I believe you?'. Heavy curveball stage.",
  },
  {
    key: "salary",
    titleKa: "ხელფასი და მოლაპარაკება",
    shortKa: "Salary",
    focusKa: "სენსიტიური თემების მართვა — ხელფასი, ბენეფიტები, ვადები.",
    guidanceEn:
      "SALARY AND NEGOTIATION — professional handling of compensation, benefits, start date. Hedging language, ranges, value justification.",
  },
  {
    key: "closing",
    titleKa: "დახურვა და კითხვები",
    shortKa: "Closing",
    focusKa: "ძლიერი ბოლო შთაბეჭდილება, კარგი კითხვები ინტერვიუერისთვის.",
    guidanceEn:
      "CLOSING AND QUESTIONS FOR INTERVIEWER — leave a strong final impression, ask thoughtful questions about role/team/company. Heavy closing stage.",
  },
];

export type CurriculumStep = CurriculumTopic & {
  step: number; // 1-indexed
  total: number;
  cycle: number; // 1-indexed pass through the sequence
};

export function emailStep(completedCount: number): CurriculumStep {
  const total = EMAIL_CURRICULUM.length;
  const idx = ((completedCount % total) + total) % total;
  return { ...EMAIL_CURRICULUM[idx], step: idx + 1, total, cycle: Math.floor(completedCount / total) + 1 };
}

export function interviewStep(completedCount: number): CurriculumStep {
  const total = INTERVIEW_CURRICULUM.length;
  const idx = ((completedCount % total) + total) % total;
  return { ...INTERVIEW_CURRICULUM[idx], step: idx + 1, total, cycle: Math.floor(completedCount / total) + 1 };
}

export type PreviouslyLearned = {
  topicKa: string;
  phrases: { en: string; ka: string }[];
};

/**
 * Extract a short "previously learned" reminder from the last completed
 * session's stored session_data.vocabulary.
 */
export function extractPreviouslyLearned(
  lastSession: { email_type?: string; role_title?: string; session_data?: any } | null | undefined,
  fallbackTopicKa: string,
): PreviouslyLearned | null {
  if (!lastSession) return null;
  const vocab = lastSession.session_data?.vocabulary;
  if (!Array.isArray(vocab) || vocab.length === 0) return null;
  const phrases = vocab.slice(0, 2).map((v: any) => ({ en: String(v.en || ""), ka: String(v.ka || "") })).filter((p) => p.en);
  if (!phrases.length) return null;
  const t =
    lastSession.session_data?.dailyFocusKa ||
    lastSession.session_data?.learn?.titleKa ||
    lastSession.session_data?.briefing?.roleTitleKa ||
    fallbackTopicKa;
  return { topicKa: t, phrases };
}
