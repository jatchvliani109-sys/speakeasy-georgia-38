// Quiz generators + spaced repetition logic for the Business Vocabulary module.
// All quiz questions are produced client-side from the static word bank + DB-tracked
// progress. Spaced repetition follows simple buckets: wrong → +1 day, ok → +3 days,
// easy → +7 days, mastered (confidence ≥ 4 streak) → +14 days.

import { supabase } from "@/integrations/supabase/client";
import {
  ALL_WORDS,
  ALL_CORE_WORDS,
  CORE_WORDS,
  fieldWordsFor,
  findWord,
  GEORGIAN_MISTAKES,
  type GeorgianMistake,
  type VocabWord,
} from "./vocabBank";

export type ProgressRow = {
  id?: string;
  user_id?: string;
  word_key: string;
  source: string;
  field: string | null;
  confidence: number;
  correct_count: number;
  wrong_count: number;
  manual_label: string | null;
  due_at: string;
  last_seen_at: string | null;
  meta: any;
};

export type SourceLabel = "core" | "field" | "email" | "interview" | "meeting";

// ---------------- Spaced repetition ----------------

const DAY_MS = 24 * 60 * 60 * 1000;

export function nextDue(confidence: number, correct: boolean): string {
  const now = Date.now();
  let days: number;
  if (!correct) days = 1;
  else if (confidence <= 1) days = 1;
  else if (confidence === 2) days = 3;
  else if (confidence === 3) days = 7;
  else days = 14;
  return new Date(now + days * DAY_MS).toISOString();
}

export function applyAnswer(p: ProgressRow, correct: boolean): ProgressRow {
  const confidence = Math.max(0, Math.min(5, correct ? p.confidence + 1 : p.confidence - 1));
  return {
    ...p,
    confidence,
    correct_count: p.correct_count + (correct ? 1 : 0),
    wrong_count: p.wrong_count + (correct ? 0 : 1),
    last_seen_at: new Date().toISOString(),
    due_at: nextDue(confidence, correct),
  };
}

// Aggregate one full session's results for a single word. This drives
// mastery: confidence + history are bumped once per session, not per answer.
export function applySessionResults(p: ProgressRow, results: boolean[]): ProgressRow {
  if (!results.length) return p;
  const correctCount = results.filter(Boolean).length;
  const wrongCount = results.length - correctCount;
  const sessionCorrect = wrongCount === 0;
  const today = new Date().toISOString().slice(0, 10);
  const prevHistory: { date: string; correct: boolean }[] = Array.isArray(p.meta?.history)
    ? p.meta.history
    : [];
  const history = [...prevHistory, { date: today, correct: sessionCorrect }].slice(-30);
  const confidence = Math.max(
    0,
    Math.min(5, sessionCorrect ? p.confidence + 1 : p.confidence - 1),
  );
  const newCorrectTotal = p.correct_count + correctCount;
  const meta = { ...(p.meta || {}), history };
  const mastered = checkMastery({
    ...p,
    confidence,
    correct_count: newCorrectTotal,
    meta,
  });
  const days = mastered
    ? 14
    : sessionCorrect
    ? confidence <= 1
      ? 1
      : confidence === 2
      ? 3
      : confidence === 3
      ? 7
      : 14
    : 1;
  return {
    ...p,
    confidence,
    correct_count: newCorrectTotal,
    wrong_count: p.wrong_count + wrongCount,
    last_seen_at: new Date().toISOString(),
    due_at: new Date(Date.now() + days * DAY_MS).toISOString(),
    meta,
  };
}

// Mastery requires: ≥4 correct answers total, correct sessions across ≥3
// different days, and no wrong sessions in the last 2 appearances.
export function checkMastery(p: ProgressRow): boolean {
  if (p.correct_count < 4) return false;
  const history: { date: string; correct: boolean }[] = Array.isArray(p.meta?.history)
    ? p.meta.history
    : [];
  const correctDays = new Set(history.filter((h) => h.correct).map((h) => h.date));
  if (correctDays.size < 3) return false;
  const last2 = history.slice(-2);
  if (last2.length < 2 || last2.some((h) => !h.correct)) return false;
  return true;
}

// ---------------- DB helpers ----------------

export async function loadProgress(userId: string): Promise<ProgressRow[]> {
  const { data } = await supabase
    .from("business_vocab_progress")
    .select("*")
    .eq("user_id", userId);
  return (data || []) as any;
}

export async function upsertProgress(userId: string, rows: ProgressRow[]) {
  if (!rows.length) return;
  const payload = rows.map((r) => ({
    user_id: userId,
    word_key: r.word_key,
    source: r.source,
    field: r.field,
    confidence: r.confidence,
    correct_count: r.correct_count,
    wrong_count: r.wrong_count,
    manual_label: r.manual_label,
    due_at: r.due_at,
    last_seen_at: r.last_seen_at,
    meta: r.meta || {},
    updated_at: new Date().toISOString(),
  }));
  await supabase.from("business_vocab_progress").upsert(payload, { onConflict: "user_id,word_key" });
}

export function emptyProgressFor(w: VocabWord): ProgressRow {
  return {
    word_key: w.key,
    source: w.source,
    field: w.field || null,
    confidence: 0,
    correct_count: 0,
    wrong_count: 0,
    manual_label: null,
    due_at: new Date().toISOString(),
    last_seen_at: null,
    meta: {},
  };
}

// ---------------- Session planning ----------------

export type SessionPlan = {
  newWords: VocabWord[];
  reviewKeys: string[];
  tierLevel: 1 | 2 | 3; // drives quiz question-type difficulty
};

// ---- Tier classification --------------------------------------------------
// Tier 1 = foundation (core, weeks 1-3)
// Tier 2 = intermediate (core, weeks 4-7)
// Tier 3 = advanced (core, weeks 8+)
// Tier 4 = field-specific
function tierOf(w: VocabWord): 1 | 2 | 3 | 4 {
  if (w.source === "field") return 4;
  const week = w.week ?? 1;
  if (week <= 3) return 1;
  if (week <= 7) return 2;
  return 3;
}

function wordsByTier() {
  const t1: VocabWord[] = [];
  const t2: VocabWord[] = [];
  const t3: VocabWord[] = [];
  for (const w of ALL_CORE_WORDS) {
    const t = tierOf(w);
    if (t === 1) t1.push(w);
    else if (t === 2) t2.push(w);
    else if (t === 3) t3.push(w);
  }
  return { t1, t2, t3 };
}

// Strict unlock thresholds — users must finish foundations before advanced words appear.
const TIER2_UNLOCK_PCT = 0.8;  // 80% of Tier 1 mastered → Tier 2 unlocks
const TIER3_UNLOCK_PCT = 0.7;  // 70% of Tier 2 mastered → Tier 3 unlocks
const TIER4_UNLOCK_PCT = 0.5;  // 50% of Tier 1 mastered → field words allowed

/**
 * Pick today's words with progressive tier gating + cross-tier reinforcement.
 */
export function planSession(
  progress: ProgressRow[],
  fields: string[],
  goals: string[],
): SessionPlan {
  const now = Date.now();
  const seen = new Set(progress.map((p) => p.word_key));
  const masteredKeys = new Set(progress.filter(checkMastery).map((p) => p.word_key));

  const { t1, t2, t3 } = wordsByTier();
  const t1Mastered = t1.filter((w) => masteredKeys.has(w.key)).length;
  const t2Mastered = t2.filter((w) => masteredKeys.has(w.key)).length;

  const t1Pct = t1.length ? t1Mastered / t1.length : 1;
  const t2Pct = t2.length ? t2Mastered / t2.length : 0;

  const tier2Unlocked = t1Pct >= TIER2_UNLOCK_PCT;
  const tier3Unlocked = tier2Unlocked && t2Pct >= TIER3_UNLOCK_PCT;
  const tier4Unlocked = t1Pct >= TIER4_UNLOCK_PCT;

  const currentTier: 1 | 2 | 3 = tier3Unlocked ? 3 : tier2Unlocked ? 2 : 1;

  // Due review words (real spaced repetition) — hardest first.
  const dueRows = progress
    .filter((p) => !checkMastery(p))
    .filter((p) => new Date(p.due_at).getTime() <= now)
    .sort((a, b) => a.confidence - b.confidence
      || new Date(a.due_at).getTime() - new Date(b.due_at).getTime());

  const reviewKeys = dueRows.slice(0, 8).map((r) => r.word_key);

  // Cross-tier reinforcement: in Tier 2+, surface previously-seen earlier-tier
  // words even if not strictly due, so foundation vocab stays warm.
  if (currentTier >= 2) {
    const earlier = currentTier === 3 ? [...t1, ...t2] : t1;
    const earlierSeen = earlier.filter((w) => seen.has(w.key) && !reviewKeys.includes(w.key));
    const reinforce = pick(earlierSeen, currentTier === 3 ? 3 : 2).map((w) => w.key);
    reviewKeys.push(...reinforce);
  }

  // ---- New word selection in strict tier order ---------------------------
  const t1Unseen = t1.filter((w) => !seen.has(w.key));
  const t2Unseen = t2.filter((w) => !seen.has(w.key));
  const t3Unseen = t3.filter((w) => !seen.has(w.key));
  const fieldUnseen = tier4Unlocked
    ? fieldWordsFor(fields, goals).filter((w) => !seen.has(w.key))
    : [];

  const newWords: VocabWord[] = [];
  const TOTAL_NEW = 8;

  const primary = currentTier === 3 ? t3Unseen : currentTier === 2 ? t2Unseen : t1Unseen;
  for (const w of primary) {
    if (newWords.length >= 6) break;
    newWords.push(w);
  }

  // Field words only when unlocked, capped at 2 so core curriculum still dominates.
  if (tier4Unlocked) {
    let fieldAdded = 0;
    for (const w of fieldUnseen) {
      if (fieldAdded >= 2 || newWords.length >= TOTAL_NEW) break;
      newWords.push(w);
      fieldAdded++;
    }
  }

  // Catch-up from earlier tiers only — NEVER leak in words from a higher
  // locked tier even when the current tier is exhausted.
  if (newWords.length < TOTAL_NEW) {
    const fallback: VocabWord[] = [];
    if (currentTier === 3) fallback.push(...t2Unseen, ...t1Unseen);
    else if (currentTier === 2) fallback.push(...t1Unseen);
    for (const w of fallback) {
      if (newWords.length >= TOTAL_NEW) break;
      if (!newWords.includes(w)) newWords.push(w);
    }
  }

  return { newWords, reviewKeys, tierLevel: currentTier };
}

// ---------------- Quiz generation ----------------

export type QuizQuestion =
  | { type: "mc_meaning"; wordKey: string; en: string; correctKa: string; choices: string[] }
  | { type: "fill_blank"; wordKey: string; sentence: string; correct: string; choices: string[]; ka: string }
  | { type: "tr_en_to_ka"; wordKey: string; en: string; correct: string; choices: string[] }
  | { type: "tr_ka_to_en"; wordKey: string; ka: string; correct: string; choices: string[] }
  | { type: "true_false"; wordKey: string; en: string; ka: string; isCorrect: boolean }
  | { type: "sentence_correct"; wordKey: string; promptKa: string; choices: string[]; correctIndex: number }
  | { type: "georgian_mistake"; key: string; promptKa: string; choices: string[]; correctIndex: number; explanationKa: string };

function pick<T>(arr: T[], n: number): T[] {
  const c = [...arr];
  const out: T[] = [];
  while (out.length < n && c.length) {
    out.push(c.splice(Math.floor(Math.random() * c.length), 1)[0]);
  }
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function distractorsKa(word: VocabWord, pool: VocabWord[], n: number): string[] {
  const seen = new Set<string>([word.ka]);
  const unique: string[] = [];
  for (const w of pool) {
    if (w.key === word.key) continue;
    if (seen.has(w.ka)) continue;
    seen.add(w.ka);
    unique.push(w.ka);
  }
  return pick(unique, n);
}

function distractorsEn(word: VocabWord, pool: VocabWord[], n: number): string[] {
  const seen = new Set<string>([word.en.toLowerCase()]);
  const unique: string[] = [];
  for (const w of pool) {
    if (w.key === word.key) continue;
    const k = w.en.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(w.en);
  }
  return pick(unique, n);
}

function makeMcMeaning(word: VocabWord, pool: VocabWord[]): QuizQuestion {
  const choices = shuffle([word.ka, ...distractorsKa(word, pool, 3)]);
  return { type: "mc_meaning", wordKey: word.key, en: word.en, correctKa: word.ka, choices };
}

function makeFillBlank(word: VocabWord, pool: VocabWord[]): QuizQuestion | null {
  const sentence = word.exampleEn;
  const wordLower = word.en.toLowerCase();
  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Try matching the full phrase first so multi-word terms like "engagement rate" work correctly.
  const fullRe = new RegExp(`\\b${escapeRe(wordLower)}\\b`, "i");
  let re: RegExp;
  if (fullRe.test(sentence)) {
    re = fullRe;
  } else {
    // Fall back to matching just the first word.
    const first = wordLower.split(" ")[0];
    re = new RegExp(`\\b${escapeRe(first)}\\w*`, "i");
    if (!re.test(sentence)) return null;
  }

  const masked = sentence.replace(re, "______");
  const choices = shuffle([word.en, ...distractorsEn(word, pool, 3)]);
  return {
    type: "fill_blank",
    wordKey: word.key,
    sentence: masked,
    correct: word.en,
    choices,
    ka: word.exampleKa,
  };
}

function makeTrEnToKa(word: VocabWord, pool: VocabWord[]): QuizQuestion {
  const choices = shuffle([word.ka, ...distractorsKa(word, pool, 3)]);
  return { type: "tr_en_to_ka", wordKey: word.key, en: word.en, correct: word.ka, choices };
}

function makeTrKaToEn(word: VocabWord, pool: VocabWord[]): QuizQuestion {
  const choices = shuffle([word.en, ...distractorsEn(word, pool, 3)]);
  return { type: "tr_ka_to_en", wordKey: word.key, ka: word.ka, correct: word.en, choices };
}

function makeTrueFalse(word: VocabWord, pool: VocabWord[]): QuizQuestion {
  const isCorrect = Math.random() > 0.5;
  const ka = isCorrect ? word.ka : (pick(pool.filter((w) => w.key !== word.key), 1)[0]?.ka || word.ka);
  return { type: "true_false", wordKey: word.key, en: word.en, ka, isCorrect: ka === word.ka };
}

function makeSentenceCorrect(word: VocabWord): QuizQuestion {
  const choices = shuffle([
    word.exampleEn,
    `I will ${word.en.toLowerCase()} my homework yesterday.`,
    `The ${word.en.toLowerCase()} is a small kitchen tool you buy at the store.`,
  ]);
  const correctIndex = choices.indexOf(word.exampleEn);
  return {
    type: "sentence_correct",
    wordKey: word.key,
    promptKa: `რომელ წინადადებაში არის "${word.en}" სწორად გამოყენებული?`,
    choices,
    correctIndex,
  };
}

function makeGeorgianMistake(m: GeorgianMistake): QuizQuestion {
  const choices = shuffle([m.wrong, m.right]);
  return {
    type: "georgian_mistake",
    key: m.key,
    promptKa: "რომელია სწორი ფორმა?",
    choices,
    correctIndex: choices.indexOf(m.right),
    explanationKa: m.explanationKa,
  };
}

const NEW_GENERATORS = [makeMcMeaning, makeFillBlank, makeTrEnToKa, makeSentenceCorrect];
const REVIEW_GENERATORS = [makeMcMeaning, makeTrKaToEn, makeFillBlank, makeTrEnToKa];

/**
 * Build a mixed quiz of ~12 questions for the session.
 * - First, one question per new word using a varied generator.
 * - Then review words mixed in.
 * - 2 Georgian mistake questions sprinkled in.
 * - Never the same type twice in a row.
 */
export function buildQuiz(newWords: VocabWord[], reviewKeys: string[]): QuizQuestion[] {
  const pool = ALL_WORDS;
  const reviewWords = reviewKeys.map(findWord).filter(Boolean) as VocabWord[];

  const questions: QuizQuestion[] = [];

  newWords.forEach((w, i) => {
    const gen = NEW_GENERATORS[i % NEW_GENERATORS.length];
    const q = gen(w, pool);
    if (q) questions.push(q);
    else questions.push(makeMcMeaning(w, pool));
  });

  reviewWords.forEach((w, i) => {
    const gen = REVIEW_GENERATORS[i % REVIEW_GENERATORS.length];
    const q = gen(w, pool);
    if (q) questions.push(q);
    else questions.push(makeMcMeaning(w, pool));
  });

  // Sprinkle 2 mistakes
  const mistakes = pick(GEORGIAN_MISTAKES, 2).map(makeGeorgianMistake);

  // Shuffle but avoid back-to-back same type
  let merged = shuffle([...questions, ...mistakes]);
  for (let i = 1; i < merged.length; i++) {
    if (merged[i].type === merged[i - 1].type) {
      const swapIdx = merged.findIndex((q, idx) => idx > i && q.type !== merged[i - 1].type);
      if (swapIdx > -1) {
        [merged[i], merged[swapIdx]] = [merged[swapIdx], merged[i]];
      }
    }
  }
  return merged.slice(0, 20);
}

// ---------------- Phrase ingestion from other modules ----------------

/**
 * Pull vocab/phrases saved from other Business modules and ensure they exist
 * as progress rows so they enter the spaced repetition system.
 */
export async function ingestExternalPhrases(userId: string, existing: ProgressRow[]): Promise<ProgressRow[]> {
  const have = new Set(existing.map((p) => p.word_key));
  const newRows: ProgressRow[] = [];

  const [emails, interviews, meetings] = await Promise.all([
    supabase
      .from("business_email_sessions")
      .select("session_data")
      .eq("user_id", userId)
      .eq("completed", true)
      .limit(20),
    supabase
      .from("business_interview_sessions")
      .select("session_data")
      .eq("user_id", userId)
      .eq("completed", true)
      .limit(20),
    supabase
      .from("business_meeting_sessions")
      .select("session_data")
      .eq("user_id", userId)
      .eq("completed", true)
      .limit(20),
  ]);

  const ingest = (rows: any[] | null | undefined, source: "email" | "interview" | "meeting") => {
    (rows || []).forEach((row) => {
      const vocab = row.session_data?.vocabulary as any[] | undefined;
      if (!Array.isArray(vocab)) return;
      vocab.forEach((v) => {
        if (!v?.en || !v?.ka) return;
        const key = `${source}:${String(v.en).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}`;
        if (have.has(key)) return;
        have.add(key);
        newRows.push({
          word_key: key,
          source,
          field: null,
          confidence: 0,
          correct_count: 0,
          wrong_count: 0,
          manual_label: null,
          due_at: new Date().toISOString(),
          last_seen_at: null,
          meta: {
            en: v.en,
            ka: v.ka,
            exampleEn: v.exampleEn || "",
            exampleKa: v.exampleKa || "",
          },
        });
      });
    });
  };

  ingest(emails.data, "email");
  ingest(interviews.data, "interview");
  ingest(meetings.data, "meeting");

  if (newRows.length) {
    await upsertProgress(userId, newRows);
  }
  return [...existing, ...newRows];
}

// ---------------- Notebook helpers ----------------

export function progressToWord(p: ProgressRow): VocabWord | null {
  const base = findWord(p.word_key);
  if (base) return base;
  // External phrase ingested into meta
  if (p.meta?.en) {
    return {
      key: p.word_key,
      en: p.meta.en,
      ka: p.meta.ka || "",
      explanationKa: p.meta.exampleKa || "",
      pronunciation: "",
      exampleEn: p.meta.exampleEn || "",
      exampleKa: p.meta.exampleKa || "",
      example2En: "",
      example2Ka: "",
      source: "field",
      field: p.source,
    };
  }
  return null;
}

export function sourceLabelKa(source: string): string {
  switch (source) {
    case "core": return "ძირითადი კურსი";
    case "field": return "შენი სფერო";
    case "email": return "იმეილების მოდული";
    case "interview": return "გასაუბრების მოდული";
    case "meeting": return "შეხვედრების მოდული";
    default: return source;
  }
}

// ---------------- Review fallback (no new words today) ----------------

/**
 * When the user has no new words queued for today, build a session from the
 * 10 lowest-confidence words across their entire progress (excluding mastered).
 */
export function pickLowestConfidenceWords(progress: ProgressRow[], n = 10): VocabWord[] {
  const candidates = progress
    .filter((p) => !checkMastery(p))
    .sort((a, b) => {
      if (a.confidence !== b.confidence) return a.confidence - b.confidence;
      // tie-break: more wrong answers first
      return b.wrong_count - a.wrong_count;
    })
    .slice(0, n);
  return candidates.map(progressToWord).filter(Boolean) as VocabWord[];
}

/**
 * Build a 15-20 question quiz using only the supplied review words. Generates
 * roughly 2 varied questions per word so even a 10-word pool reaches ~20 Qs.
 */
export function buildReviewQuiz(words: VocabWord[]): QuizQuestion[] {
  if (!words.length) return [];
  const pool = ALL_WORDS;
  const generators = [makeMcMeaning, makeTrKaToEn, makeFillBlank, makeTrEnToKa];
  const questions: QuizQuestion[] = [];

  // Pass 1: one varied question per word
  words.forEach((w, i) => {
    const gen = generators[i % generators.length];
    const q = gen(w, pool);
    questions.push(q || makeMcMeaning(w, pool));
  });
  // Pass 2: a second different question per word until we hit ~20
  words.forEach((w, i) => {
    if (questions.length >= 20) return;
    const gen = generators[(i + 2) % generators.length];
    const q = gen(w, pool);
    questions.push(q || makeTrKaToEn(w, pool));
  });

  // Avoid back-to-back same type
  let merged = shuffle(questions);
  for (let i = 1; i < merged.length; i++) {
    if (merged[i].type === merged[i - 1].type) {
      const swap = merged.findIndex((q, idx) => idx > i && q.type !== merged[i - 1].type);
      if (swap > -1) [merged[i], merged[swap]] = [merged[swap], merged[i]];
    }
  }
  return merged.slice(0, 20);
}
