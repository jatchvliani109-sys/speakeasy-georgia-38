// Quiz generators + spaced repetition logic for the Business Vocabulary module.
// All quiz questions are produced client-side from the static word bank + DB-tracked
// progress. Spaced repetition follows simple buckets: wrong → +1 day, ok → +3 days,
// easy → +7 days, mastered (confidence ≥ 4 streak) → +14 days.
//
// Session sizing (free vs paid):
// - free: 6 new words + up to 8 review words per session.
// - paid: total word budget starts at 30 for the first session of the day and
//   drops by 5 per additional session (25, 20, 15...) with a floor of 10.
//   New words are capped at 12 per session regardless of budget — retention
//   collapses past ~10-12 new words — so bigger budgets mean MORE REVIEW.
// Every new word gets two differently-formatted questions per quiz (encode +
// retrieve), and review slots always fill: overdue first, then reinforcement,
// then weakest seen words.

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
import { SITUATION_CLUSTERS, clusterFor, type SituationCluster } from "./vocabContext";

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
  // Wrong answers become due IMMEDIATELY: the very next session (even the
  // same day, for premium multi-session users) repeats them via the overdue
  // layer instead of burying them until tomorrow.
  if (!correct) return new Date(now).toISOString();
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
// `prodCorrect` = how many of this session's correct answers came from
// production-type questions; accumulated in meta.prodCorrect for the
// production gate in checkMastery.
export function applySessionResults(p: ProgressRow, results: boolean[], prodCorrect = 0): ProgressRow {
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
  const meta = {
    ...(p.meta || {}),
    history,
    prodCorrect: (p.meta?.prodCorrect ?? 0) + Math.max(0, prodCorrect),
  };
  // MECHANIC 3 — evidence fast-track: a word the learner clearly already knows
  // (first-ever encounter, every question in the session correct, at least two
  // asked) shouldn't crawl the ladder like a genuinely new word. Jump straight
  // to confidence 3 and park it a week out. Handles cognates ("service",
  // "manager") and any known word from BEHAVIOR, without hand-tagging the bank.
  const firstEncounter = (p.correct_count + p.wrong_count) === 0;
  const fastTracked = firstEncounter && sessionCorrect && results.length >= 2;
  const effConfidence = fastTracked ? Math.max(confidence, 3) : confidence;

  const mastered = checkMastery({
    ...p,
    confidence: effConfidence,
    correct_count: newCorrectTotal,
    meta,
  });
  const days = mastered
    ? 14
    : fastTracked
    ? 7
    : sessionCorrect
    ? effConfidence <= 1
      ? 1
      : effConfidence === 2
      ? 3
      : effConfidence === 3
      ? 7
      : 14
    : 0; // any wrong in the session -> due right away, not tomorrow
  return {
    ...p,
    confidence: effConfidence,
    correct_count: newCorrectTotal,
    wrong_count: p.wrong_count + wrongCount,
    last_seen_at: new Date().toISOString(),
    due_at: new Date(Date.now() + days * DAY_MS).toISOString(),
    meta,
  };
}

// Question types that count as PRODUCTION (active recall): the learner must
// produce or retrieve the word, not just recognize it. tr_ka_to_en is included
// so long multi-word entries (which type_word skips) can still reach mastery.
export const PRODUCTION_TYPES = new Set<QuizQuestion["type"]>([
  "type_word",
  "context_cloze",
  "fill_blank",
  "tr_ka_to_en",
]);
// Correct production answers (cumulative, stored in meta.prodCorrect) required
// before a word can count as mastered.
export const PRODUCTION_MASTERY_MIN = 2;

export function isProductionType(t: QuizQuestion["type"]): boolean {
  return PRODUCTION_TYPES.has(t);
}

// "I already know this word" fast-track. The learner claimed the word on its
// card and then had to PROVE it in the quiz (typed recall, or KA→EN recall for
// words the typing format skips). If every proof answer was correct, the word
// jumps straight to high confidence with a 14-day interval — no beginner
// ladder. Any miss and the claim is ignored: normal session handling applies.
// Mastery rules are NOT bypassed: the word still needs correct sessions on 3
// different days and 2 production-correct answers like everything else.
export function applyKnownWordFastTrack(
  p: ProgressRow,
  results: boolean[],
  prodCorrect = 0,
): ProgressRow {
  const allCorrect = results.length > 0 && results.every(Boolean);
  if (!allCorrect) return applySessionResults(p, results, prodCorrect);
  const today = new Date().toISOString().slice(0, 10);
  const prevHistory: { date: string; correct: boolean }[] = Array.isArray(p.meta?.history)
    ? p.meta.history
    : [];
  const history = [...prevHistory, { date: today, correct: true }].slice(-30);
  const meta = {
    ...(p.meta || {}),
    history,
    prodCorrect: (p.meta?.prodCorrect ?? 0) + Math.max(0, prodCorrect),
    fastTracked: true,
  };
  return {
    ...p,
    confidence: Math.max(p.confidence, 4),
    correct_count: p.correct_count + results.length,
    last_seen_at: new Date().toISOString(),
    due_at: new Date(Date.now() + 14 * DAY_MS).toISOString(),
    meta,
  };
}

// Mastery requires: ≥4 correct answers total, correct sessions across ≥3
// different days, no wrong sessions in the last 2 appearances, AND at least
// 2 correct answers on production-type questions (typed recall, context cloze,
// fill-in-blank, KA→EN recall) — recognizing a word is not the same as
// being able to use it.
export function checkMastery(p: ProgressRow): boolean {
  if (p.correct_count < 4) return false;
  if ((p.meta?.prodCorrect ?? 0) < PRODUCTION_MASTERY_MIN) return false;
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

// ---------------- Adaptive difficulty (format tier) ----------------
// Curriculum tier controls WHICH words appear; format tier controls HOW HARD
// the questions are. They start equal, but if the learner's recent accuracy
// is very high the format tier escalates one level (more typing/cloze, fewer
// easy recognition formats) even while the curriculum stays put — and eases
// back down if accuracy drops. Fully automatic; no "was this too easy?" nags.

const FORMAT_BOOST_ACCURACY = 0.9; // ≥90% over recent sessions → harder formats
const FORMAT_EASE_ACCURACY = 0.6;  // <60% → gentler formats
const FORMAT_MIN_SESSIONS = 2;     // need at least 2 recent sessions to judge

export function computeFormatTier(
  curriculumTier: 1 | 2 | 3,
  recentSessions: { score: number; total: number }[],
): 1 | 2 | 3 {
  if (recentSessions.length < FORMAT_MIN_SESSIONS) return curriculumTier;
  const score = recentSessions.reduce((s, r) => s + (r.score || 0), 0);
  const total = recentSessions.reduce((s, r) => s + (r.total || 0), 0);
  if (!total) return curriculumTier;
  const accuracy = score / total;
  if (accuracy >= FORMAT_BOOST_ACCURACY) return Math.min(3, curriculumTier + 1) as 1 | 2 | 3;
  if (accuracy < FORMAT_EASE_ACCURACY) return Math.max(1, curriculumTier - 1) as 1 | 2 | 3;
  return curriculumTier;
}

export type StreakResult = {
  streak: number;
  freezesLeft: number;
  freezeDaysUsed: string[]; // days newly covered by a freeze this computation
  usedFreezeToday: boolean; // whether a freeze is currently shielding the run
};

/**
 * Streak with auto-consumed freezes. Walking back from today (or yesterday if
 * today isn't done yet), each MISSED day spends one banked freeze to bridge the
 * gap and keep the run alive; when freezes run out, the streak ends at that gap.
 * Earning: +1 freeze per 7 days of streak, capped at maxFreezes. Freezes already
 * spent on a given day (persisted in priorFreezeDays) are not re-charged.
 *
 * Pure + deterministic given `now`, so it's unit-testable.
 */
export function computeStreakWithFreezes(
  completedDates: string[],
  bankedFreezes: number,
  priorFreezeDays: string[],
  now: Date = new Date(),
  maxFreezes = 2,
): StreakResult {
  const done = new Set(completedDates.map((d) => new Date(d).toDateString()));
  const priorSet = new Set(priorFreezeDays);
  const dayMs = 86_400_000;

  // Earliest real activity — never spend freezes to bridge past the day the
  // user first started (that would invent streak backwards forever).
  const earliest = completedDates.length
    ? Math.min(...completedDates.map((d) => new Date(new Date(d).toDateString()).getTime()))
    : Infinity;

  // Anchor: if today isn't done, start counting from yesterday (today still has
  // time — it shouldn't break the streak yet).
  const cursor = new Date(now);
  const todayStr = cursor.toDateString();
  const startedToday = done.has(todayStr);
  if (!startedToday) cursor.setTime(cursor.getTime() - dayMs);

  let streak = 0;
  let freezesLeft = bankedFreezes;
  const newlyUsed: string[] = [];
  let usedFreezeToday = false;

  // Walk back day by day.
  for (let guard = 0; guard < 400; guard++) {
    const key = cursor.toDateString();
    if (done.has(key)) {
      streak++;
      cursor.setTime(cursor.getTime() - dayMs);
      continue;
    }
    // Missed day. Was it already freeze-covered on a prior computation — and
    // is it still within the active history (not before the user's start)?
    if (priorSet.has(key) && cursor.getTime() > earliest) {
      streak++;
      if (streak <= 1) usedFreezeToday = true;
      cursor.setTime(cursor.getTime() - dayMs);
      continue;
    }
    // Spend a fresh freeze to bridge, but only if we're mid-run AND there is
    // still earlier activity to connect back to (never bridge into the void).
    if (freezesLeft > 0 && streak > 0 && cursor.getTime() > earliest) {
      freezesLeft--;
      newlyUsed.push(key);
      streak++;
      cursor.setTime(cursor.getTime() - dayMs);
      continue;
    }
    break; // gap can't be bridged — streak ends here
  }

  // Earn freezes back for consistency: every 7 days of streak tops you up by
  // one, never above maxFreezes, and never below what you have banked now.
  const earned = Math.min(maxFreezes, Math.floor(streak / 7));
  freezesLeft = Math.min(maxFreezes, Math.max(freezesLeft, earned));

  return { streak, freezesLeft, freezeDaysUsed: newlyUsed, usedFreezeToday };
}

/** Total completed vocab sessions ever — drives the scenario-day cadence. */
export async function countCompletedSessions(userId: string): Promise<number> {
  const { count } = await supabase
    .from("business_vocab_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("completed", true);
  return count ?? 0;
}

/**
 * SCENARIO OF THE DAY — the app picks, the learner just shows up.
 * Cadence: after the first regular session, every 2nd session is a scenario
 * session (sessions #2, #4, #6...). The scenario is chosen deterministically:
 * the first cluster (in curriculum order) that still has unseen words; once
 * everything has been seen, the first cluster with unmastered words comes
 * back as a themed review. Returns null on regular days or when all scenario
 * material is mastered.
 */
export function pickDailyScenario(
  progress: ProgressRow[],
  totalCompletedSessions: number,
): SituationCluster | null {
  if (totalCompletedSessions % 2 !== 1) return null;
  const seen = new Set(progress.map((p) => p.word_key));
  const withUnseen = SITUATION_CLUSTERS.find((c) =>
    c.wordKeys.some((k) => !seen.has(k)),
  );
  if (withUnseen) return withUnseen;
  const mastered = new Set(progress.filter(checkMastery).map((p) => p.word_key));
  return (
    SITUATION_CLUSTERS.find((c) => c.wordKeys.some((k) => !mastered.has(k))) ??
    null
  );
}

/** Completed vocab sessions since local midnight — powers the free daily cap. */
export async function countSessionsToday(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("business_vocab_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("completed", true)
    .gte("completed_at", startOfDay.toISOString());
  return count ?? 0;
}

/** Last `n` completed vocab sessions (score/total), newest first. */
export async function loadRecentSessions(
  userId: string,
  n = 3,
): Promise<{ score: number; total: number }[]> {
  const { data } = await supabase
    .from("business_vocab_sessions")
    .select("score,total")
    .eq("user_id", userId)
    .eq("completed", true)
    .order("completed_at", { ascending: false })
    .limit(n);
  return (data || []) as any;
}

// ---------------- Session planning ----------------

export type PlanTier = "free" | "paid";

export type PlanOptions = {
  /** Subscription tier — controls the session word budget. Defaults to "free". */
  plan?: PlanTier;
  /** Completed vocab sessions today — paid budgets shrink with each one. */
  sessionsToday?: number;
};

export type SessionPlan = {
  newWords: VocabWord[];
  reviewKeys: string[];
  tierLevel: 1 | 2 | 3; // drives quiz question-type difficulty
};

// ---- Word budgets ----------------------------------------------------------
const FREE_NEW_TARGET = 6;      // free users: 6 new words per session
const FREE_REVIEW_TARGET = 8;   // free users: up to 8 review words per session

// Premium sessions keep a CONSISTENT length; what changes across the day is the
// MIX (more review, fewer new), not the size. Previously the total shrank 30/25/20,
// but because that was a cap rather than a target, session 1 came out small (little
// due to review yet) and session 2 came out large (session 1's misses all requeued)
// — the opposite of the intent.
// Sessions are budgeted in QUESTIONS, not words. Each NEW word yields two
// questions (encode + retrieve) and each review word one, so a fixed word count
// still let the quiz swing between roughly 22 and 32 questions — which is what
// the learner actually experiences.
const QUESTIONS_PER_NEW = 2;
const MISTAKE_ALLOWANCE = 2;    // buildQuiz adds 1-2 "common mistake" items
const PAID_QUESTION_TARGET = 24;
const PAID_BUDGET_STEP = 2;     // ...easing down slightly from the 3rd session on
const PAID_MIN_QUESTIONS = 18;
const PAID_NEW_FIRST = 8;       // new words in the day's first session
const FREE_QUESTION_TARGET = 20;
const PAID_MAX_NEW = 12;        // hard cap on NEW words — retention drops past ~10-12,
                                // so bigger budgets buy more review, not more new words

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
 * Pick today's words with progressive tier gating + layered review selection.
 *
 * New words: strict tier order, field words capped at 2 so core dominates,
 * catch-up only from earlier tiers (never leaks locked higher tiers).
 *
 * Review words fill in three layers until the review target is met:
 *   1. overdue words (real spaced repetition), hardest first
 *   2. cross-tier reinforcement — earlier-tier words kept warm
 *   3. weakest seen words even if not due yet — so every session
 *      strengthens old material, not only when due dates line up
 */
export function planSession(
  progress: ProgressRow[],
  fields: string[],
  goals: string[],
  opts: PlanOptions = {},
): SessionPlan {
  const plan: PlanTier = opts.plan ?? "free";
  const sessionsToday = Math.max(0, opts.sessionsToday ?? 0);

  // ---- Budgets per tier + session number ----
  let newTarget: number;
  let reviewTarget: number;
  let sessionTarget: number;   // total words we aim to serve this session
  let newCeiling: number;      // hard cap on new words (governor-limited)
  if (plan === "paid") {
    sessionTarget = Math.max(
      PAID_MIN_QUESTIONS,
      PAID_QUESTION_TARGET - PAID_BUDGET_STEP * Math.max(0, sessionsToday - 1),
    );
    newCeiling = PAID_MAX_NEW;
    // MECHANIC 2 — same-day taper: later sessions shift toward consolidation.
    // Freed new-word slots become review, so the QUESTION COUNT stays steady.
    newTarget = sessionsToday === 0 ? PAID_NEW_FIRST : sessionsToday === 1 ? 4 : 3;
  } else {
    sessionTarget = FREE_QUESTION_TARGET;
    newCeiling = FREE_NEW_TARGET;
    newTarget = FREE_NEW_TARGET;
  }
  newTarget = Math.min(newTarget, newCeiling);
  reviewTarget = Math.max(0, sessionTarget - MISTAKE_ALLOWANCE - QUESTIONS_PER_NEW * newTarget);

  // MECHANIC 1 — backlog governor: never pour new words onto an unconsolidated
  // pile. Count SEEN-but-not-yet-sticky words (confidence < 2). As the backlog
  // grows, throttle new intake toward review-only until it drains. This is the
  // brake premium removed when it lifted the 1-session/day cap.
  const backlog = progress.filter(
    (p) => (p.correct_count + p.wrong_count) > 0 && p.confidence < 2,
  ).length;
  if (backlog >= 30) newCeiling = Math.min(newCeiling, 2);
  else if (backlog >= 15) newCeiling = Math.min(newCeiling, Math.ceil(newCeiling / 2));
  newTarget = Math.min(newTarget, newCeiling);
  // Freed new-word slots become review questions, so the count holds up.
  reviewTarget = Math.max(reviewTarget, sessionTarget - MISTAKE_ALLOWANCE - QUESTIONS_PER_NEW * newTarget);

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

  // ---- Review selection: three layers, filled up to reviewTarget ----------

  // Layer 1: overdue words (real spaced repetition) — hardest first.
  const dueRows = progress
    .filter((p) => !checkMastery(p))
    .filter((p) => new Date(p.due_at).getTime() <= now)
    .sort((a, b) => a.confidence - b.confidence
      || new Date(a.due_at).getTime() - new Date(b.due_at).getTime());

  const reviewKeys = dueRows.slice(0, reviewTarget).map((r) => r.word_key);

  // Layer 2: cross-tier reinforcement — in Tier 2+, surface previously-seen
  // earlier-tier words even if not strictly due, so foundation vocab stays warm.
  if (currentTier >= 2 && reviewKeys.length < reviewTarget) {
    const earlier = currentTier === 3 ? [...t1, ...t2] : t1;
    const earlierSeen = earlier.filter(
      (w) => seen.has(w.key) && !reviewKeys.includes(w.key) && !masteredKeys.has(w.key),
    );
    const room = Math.min(currentTier === 3 ? 3 : 2, reviewTarget - reviewKeys.length);
    reviewKeys.push(...pick(earlierSeen, room).map((w) => w.key));
  }

  // Layer 3: weakest seen words (not yet due) — keeps every session
  // strengthening old material instead of waiting for due dates.
  if (reviewKeys.length < reviewTarget) {
    const chosen = new Set(reviewKeys);
    const weakest = progress
      .filter((p) => !checkMastery(p) && !chosen.has(p.word_key))
      .sort((a, b) => a.confidence - b.confidence || b.wrong_count - a.wrong_count)
      .slice(0, reviewTarget - reviewKeys.length)
      .map((p) => p.word_key);
    reviewKeys.push(...weakest);
  }

  // If the review queue could not fill its share (common in the FIRST session of
  // the day, when nothing has come due yet), top the session back up with new
  // words — never past the governor ceiling. This is what stopped session 1 from
  // being a 6-word stub while session 2 ballooned.
  const questionsPlanned = MISTAKE_ALLOWANCE + QUESTIONS_PER_NEW * newTarget + reviewKeys.length;
  if (questionsPlanned < sessionTarget) {
    const extraNew = Math.ceil((sessionTarget - questionsPlanned) / QUESTIONS_PER_NEW);
    newTarget = Math.min(newCeiling, newTarget + extraNew);
  }

  // ---- New word selection in strict tier order ---------------------------
  const t1Unseen = t1.filter((w) => !seen.has(w.key));
  const t2Unseen = t2.filter((w) => !seen.has(w.key));
  const t3Unseen = t3.filter((w) => !seen.has(w.key));
  const fieldUnseen = tier4Unlocked
    ? fieldWordsFor(fields, goals).filter((w) => !seen.has(w.key))
    : [];

  const newWords: VocabWord[] = [];

  // Field words capped at 2 so the core curriculum still dominates.
  const fieldCap = tier4Unlocked ? Math.min(2, newTarget) : 0;

  const primary = currentTier === 3 ? t3Unseen : currentTier === 2 ? t2Unseen : t1Unseen;
  for (const w of primary) {
    if (newWords.length >= newTarget - fieldCap) break;
    newWords.push(w);
  }

  if (fieldCap > 0) {
    let fieldAdded = 0;
    for (const w of fieldUnseen) {
      if (fieldAdded >= fieldCap || newWords.length >= newTarget) break;
      newWords.push(w);
      fieldAdded++;
    }
  }

  // If field words didn't fill their reserved slots, top back up from the
  // primary tier so the session isn't short-changed.
  if (newWords.length < newTarget) {
    for (const w of primary) {
      if (newWords.length >= newTarget) break;
      if (!newWords.includes(w)) newWords.push(w);
    }
  }

  // Catch-up from earlier tiers only — NEVER leak in words from a higher
  // locked tier even when the current tier is exhausted.
  if (newWords.length < newTarget) {
    const fallback: VocabWord[] = [];
    if (currentTier === 3) fallback.push(...t2Unseen, ...t1Unseen);
    else if (currentTier === 2) fallback.push(...t1Unseen);
    for (const w of fallback) {
      if (newWords.length >= newTarget) break;
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
  | { type: "georgian_mistake"; key: string; promptKa: string; choices: string[]; correctIndex: number; explanationKa: string }
  | { type: "listening"; wordKey: string; en: string; correctKa: string; choices: string[] }
  | { type: "type_word"; wordKey: string; ka: string; correct: string; hint: string }
  | { type: "context_cloze"; wordKey: string; paragraph: string; choices: string[]; correct: string; titleKa: string }
  | { type: "odd_one_out"; wordKey: string; promptKa: string; options: { en: string; ka: string }[]; correctIndex: number }
  | { type: "synonym_match"; wordKey: string; en: string; ka: string; promptKa: string; choices: string[]; correct: string }
  | { type: "collocation"; wordKey: string; promptKa: string; phraseEn: string; blankIndex: number; choices: string[]; correct: string; hintKa: string }
  | { type: "definition_match"; wordKey: string; promptKa: string; definitionKa: string; choices: string[]; correct: string }
  | { type: "sentence_definition"; wordKey: string; promptKa: string; before: string; target: string; after: string; choices: string[]; correct: string };

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

// ---- Distractor quality --------------------------------------------------
// Random distractors make the answer guessable by elimination: if the target is
// "negotiate" and the options are "invoice", "Monday", "warehouse", you don't
// need to know the word. Good distractors are PLAUSIBLE — same topic area,
// similar shape — so the learner has to actually retrieve the meaning.

const WORD_SUFFIXES = ["tion", "ment", "ing", "ity", "ance", "ence", "ness", "ship", "er", "or", "al", "ive"];

function cohortKey(w: VocabWord): string {
  return w.field || (w.week ? `week${w.week}` : w.source);
}

function suffixOf(en: string): string {
  const low = en.toLowerCase();
  return WORD_SUFFIXES.find((s) => low.endsWith(s)) || "";
}

// Higher = more plausible as a wrong answer next to `target`.
function plausibility(target: VocabWord, cand: VocabWord): number {
  let s = 0;
  if (cohortKey(cand) === cohortKey(target)) s += 3;          // same topic area
  const tSuf = suffixOf(target.en);
  if (tSuf && suffixOf(cand.en) === tSuf) s += 3;             // same word class
  if (Math.abs(cand.en.length - target.en.length) <= 3) s += 2; // no length tell
  if (cand.en.split(" ").length === target.en.split(" ").length) s += 1;
  return s;
}

// Rank by plausibility, then sample from the strongest band so repeat encounters
// don't show an identical option set every time.
function rankedDistractors<T>(
  target: VocabWord,
  pool: VocabWord[],
  n: number,
  exclude: (w: VocabWord) => boolean,
  project: (w: VocabWord) => T,
): T[] {
  const seen = new Set<string>();
  const scored: { w: VocabWord; score: number }[] = [];
  for (const w of pool) {
    if (w.key === target.key || exclude(w)) continue;
    const dedupe = String(project(w)).toLowerCase();
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    scored.push({ w, score: plausibility(target, w) });
  }
  scored.sort((a, b) => b.score - a.score);
  // Sample from the top band (at least 4x what we need) for variety with quality.
  const band = scored.slice(0, Math.max(n * 4, 12));
  return pick(band.length >= n ? band : scored, n).map((x) => project(x.w));
}

function distractorsKa(word: VocabWord, pool: VocabWord[], n: number): string[] {
  return rankedDistractors(word, pool, n, (w) => w.ka === word.ka, (w) => w.ka);
}

function distractorsEn(word: VocabWord, pool: VocabWord[], n: number): string[] {
  // COLLISION GUARD: never offer a word that shares the target's Georgian
  // translation — otherwise a KA->EN question would have two correct answers.
  return rankedDistractors(
    word,
    pool,
    n,
    (w) => w.en.toLowerCase() === word.en.toLowerCase() || w.ka.trim() === word.ka.trim(),
    (w) => w.en,
  );
}

function makeMcMeaning(word: VocabWord, pool: VocabWord[]): QuizQuestion {
  const choices = shuffle([word.ka, ...distractorsKa(word, pool, 3)]);
  return { type: "mc_meaning", wordKey: word.key, en: word.en, correctKa: word.ka, choices };
}

// Matches the target phrase in a sentence, tolerating a normal inflected ending
// on the FINAL word ("action item" -> "action items", "forecast" -> "forecasts").
//
// This replaces an earlier first-word fallback that caused a real bug: for
// "Action item" the exact match failed on the plural "action items", so it
// blanked only "action" and left "items" behind — giving
// "captures the ______ items" with the answer "Action item", i.e.
// "action item items". Matching the whole phrase (or nothing) avoids that.
// The suffix list is deliberately narrow rather than \w*, so "lead" cannot
// swallow "leadership".
function targetPhraseRegex(en: string): RegExp {
  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = en.toLowerCase().trim().split(/\s+/).map(escapeRe);
  return new RegExp(`\\b${parts.join("\\s+")}(?:s|es|ed|ing|d)?\\b`, "i");
}

// Enrichment gave every word a second example. Alternating between them stops a
// repeated word from always showing the SAME sentence — otherwise learners
// memorise one sentence instead of the word. Returned in random order.
function exampleCandidates(word: VocabWord): { en: string; ka: string }[] {
  const list = [{ en: word.exampleEn, ka: word.exampleKa }];
  if (word.example2En && word.example2En.trim()) {
    list.push({ en: word.example2En, ka: word.example2Ka });
  }
  return shuffle(list);
}

function makeFillBlank(word: VocabWord, pool: VocabWord[]): QuizQuestion | null {
  const re = targetPhraseRegex(word.en);

  // Try each example in random order; use the first that actually contains the
  // whole phrase. If none does, skip — a half-blanked sentence is worse than
  // no question.
  for (const cand of exampleCandidates(word)) {
    const sentence = cand.en;
    if (!re.test(sentence)) continue;
    const masked = sentence.replace(re, "______");
    const choices = shuffle([word.en, ...distractorsEn(word, pool, 3)]);
    return {
      type: "fill_blank",
      wordKey: word.key,
      sentence: masked,
      correct: word.en,
      choices,
      ka: cand.ka,
    };
  }
  return null;
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
  const real = exampleCandidates(word)[0].en;
  const choices = shuffle([
    real,
    `I will ${word.en.toLowerCase()} my homework yesterday.`,
    `The ${word.en.toLowerCase()} is a small kitchen tool you buy at the store.`,
  ]);
  const correctIndex = choices.indexOf(real);
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

// LISTENING — plays the word's pre-generated MP3 (ReadAloudButton hits the
// word-audio bucket first, live TTS only as fallback). The learner never sees
// the English word — they hear it and must pick its GEORGIAN meaning, which
// tests comprehension rather than sound-to-spelling matching. The "hear" step.
// `en` is carried only as the audio/TTS text and is never displayed.
function makeListening(word: VocabWord, pool: VocabWord[]): QuizQuestion {
  const choices = shuffle([word.ka, ...distractorsKa(word, pool, 3)]);
  return { type: "listening", wordKey: word.key, en: word.en, correctKa: word.ka, choices };
}

// TYPE THE WORD — production, not recognition: the learner sees the Georgian
// meaning plus a first-letter mask and must type the English word. The "type"
// step. Skips long/awkward entries (>20 chars, >2 words, non-latin) — the
// quiz builder falls back to another format for those.
function makeTypeWord(word: VocabWord): QuizQuestion | null {
  const en = word.en.trim();
  if (en.length > 20 || en.split(/\s+/).length > 2) return null;
  if (!/^[A-Za-z][A-Za-z' -]*$/.test(en)) return null;
  const hint = en[0] + en.slice(1).replace(/[A-Za-z]/g, "_");
  return { type: "type_word", wordKey: word.key, ka: word.ka, correct: en, hint };
}

// CONTEXT CLOZE — blanks the word inside its situational cluster's business
// paragraph (from vocabContext.ts, pre-generated, zero AI cost). The "use"
// step. Returns null for words without a cluster — builder falls back.
function makeContextCloze(word: VocabWord): QuizQuestion | null {
  const cluster = clusterFor(word.key);
  if (!cluster) return null;
  const paragraph = cluster.paragraphEn;
  const re = targetPhraseRegex(word.en);
  if (!re.test(paragraph)) return null;
  const masked = paragraph.replace(re, "______");
  const choices = shuffle([word.en, ...distractorsEn(word, ALL_WORDS, 3)]);
  return {
    type: "context_cloze",
    wordKey: word.key,
    paragraph: masked,
    choices,
    correct: word.en,
    titleKa: cluster.titleKa,
  };
}

// ---- Odd-one-out: three words share a field/theme, one doesn't belong. ----
// Uses field grouping when available, else falls back to "same source" cohort.
// Bank-wide: works for any word that has at least 3 field/cohort peers.
function makeOddOneOut(word: VocabWord, pool: VocabWord[]): QuizQuestion | null {
  // Only FIELD words carry a real semantic category (marketing, finance, hr...).
  // Core words were previously grouped by curriculum WEEK, which means nothing
  // semantically — that produced genuinely unanswerable sets such as
  // "Next steps / Leverage point / Risk / Downsizing". Skip those entirely.
  if (!word.field) return null;
  const peers = pool.filter((w) => w.key !== word.key && w.field === word.field);
  // The odd one must come from a DIFFERENT named field, so the contrast is
  // category-vs-category rather than "one random word".
  const outsiders = pool.filter((w) => w.field && w.field !== word.field);
  if (peers.length < 2 || outsiders.length < 1) return null;
  const group = [word, ...pick(peers, 2)]; // 3 that belong (incl. the target)
  const odd = pick(outsiders, 1)[0];
  const options = shuffle([...group, odd]).map((w) => ({ en: w.en, ka: w.ka }));
  const correctIndex = options.findIndex((o) => o.en === odd.en);
  return {
    type: "odd_one_out",
    wordKey: word.key,
    promptKa: "რომელი სიტყვა არ ერგება დანარჩენებს?",
    options,
    correctIndex,
  };
}

// ---- Sentence definition: infer meaning from CONTEXT. ----
// Shows a real example sentence with the target word highlighted and asks which
// Georgian explanation fits. Unlike definition_match (which shows the meaning and
// asks for the word), this runs the other way and forces the learner to read the
// sentence rather than recall a memorised pair. Splitting the sentence into
// before/target/after lets the UI highlight without re-running a regex.
function makeSentenceDefinition(word: VocabWord, pool: VocabWord[]): QuizQuestion | null {
  const def = (word.explanationKa || "").trim();
  if (!def || def === word.ka.trim()) return null;

  const phraseRe = targetPhraseRegex(word.en);
  let hit: { en: string; index: number; matched: string } | null = null;
  for (const cand of exampleCandidates(word)) {
    const m = phraseRe.exec(cand.en);
    if (m) { hit = { en: cand.en, index: m.index, matched: m[0] }; break; }
  }
  if (!hit) return null;   // no example actually contains the word

  // Rival explanations must be real, distinct, and not from a word sharing this
  // word's Georgian translation (that would make two options defensible).
  const wrong = rankedDistractors(
    word,
    pool,
    3,
    (w) =>
      !w.explanationKa ||
      !w.explanationKa.trim() ||
      w.explanationKa.trim() === def ||
      w.explanationKa.trim() === w.ka.trim() ||
      w.ka.trim() === word.ka.trim(),
    (w) => w.explanationKa.trim(),
  );
  if (wrong.length < 3) return null;

  return {
    type: "sentence_definition",
    wordKey: word.key,
    promptKa: "რას ნიშნავს გამოკვეთილი სიტყვა ამ წინადადებაში?",
    before: hit.en.slice(0, hit.index),
    target: hit.matched,
    after: hit.en.slice(hit.index + hit.matched.length),
    choices: shuffle([def, ...wrong]),
    correct: def,
  };
}

// ---- Definition -> word: show the Georgian explanation, pick the English word. ----
// Only possible now that all 980 words carry an authored explanationKa. Skips
// words whose explanation is just the translation repeated (no information gain).
function makeDefinitionMatch(word: VocabWord, pool: VocabWord[]): QuizQuestion | null {
  const def = (word.explanationKa || "").trim();
  if (!def || def === word.ka.trim()) return null;
  const choices = shuffle([word.en, ...distractorsEn(word, pool, 3)]);
  return {
    type: "definition_match",
    wordKey: word.key,
    promptKa: "რომელ სიტყვას შეესაბამება ეს განმარტება?",
    definitionKa: def,
    choices,
    correct: word.en,
  };
}

// ---- Collocation: fill the missing word in a real business phrase. ----
function makeCollocation(word: VocabWord, pool: VocabWord[]): QuizQuestion | null {
  const colls = word.collocations;
  if (!colls || colls.length === 0) return null;
  // Multi-word terms ("Sales forecast") must blank the whole phrase, not one token.
  const enLower = word.en.toLowerCase();
  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const phraseRe = new RegExp(`\\b${escapeRe(enLower)}\\b`, "i");
  // Use a collocation that actually contains the target, not a random one.
  const usable = colls.filter((c) => phraseRe.test(c.en));
  if (usable.length === 0) return null;
  const coll = pick(usable, 1)[0];
  const blanked = coll.en.replace(phraseRe, "___");
  const idx = coll.en.toLowerCase().indexOf(enLower);
  const choices = shuffle([word.en, ...distractorsEn(word, pool, 3)]);
  return { type: "collocation", wordKey: word.key, promptKa: "შეავსე გამოტოვებული სიტყვა",
    phraseEn: blanked, blankIndex: idx, choices, correct: word.en, hintKa: coll.ka };
}

// ---- Synonym / closest-meaning: pick the English word closest to the target. ----
// The target's OWN translation is shown in Georgian; the learner picks which
// English option matches. Distractors are other English words. Since the bank
// has no synonym data, this trains recognition of the right word for a meaning
// (functionally: KA meaning -> correct EN among plausible EN distractors).
function makeSynonymMatch(word: VocabWord, pool: VocabWord[]): QuizQuestion {
  const choices = shuffle([word.en, ...distractorsEn(word, pool, 3)]);
  return {
    type: "synonym_match",
    wordKey: word.key,
    en: word.en,
    ka: word.ka,
    promptKa: "რომელი ინგლისური სიტყვა შეესაბამება მნიშვნელობას?",
    choices,
    correct: word.en,
  };
}

// Progressive generator pools by tier level.
// Tier 1: recognition-heavy (MC, T/F, EN→KA) + listening from stored MP3s;
//         typed recall appears once in the second pass, with a letter hint.
// Tier 2: adds fill-in-blank, sentence-correctness, typed recall and context-cloze.
// Tier 3: production-heavy — typing, context-cloze, KA→EN recall dominate.
// This is the see → hear → type → use ladder: cards (see) → listening (hear)
// → type_word (type) → context_cloze (use). Generators that can return null
// (type_word, context_cloze, fill_blank) fall back to safe formats in buildQuiz.
type Generator = (w: VocabWord, p: VocabWord[]) => QuizQuestion | null;
const NEW_GENERATORS_BY_TIER: Record<1 | 2 | 3, Generator[]> = {
  1: [makeMcMeaning, makeListening, makeTrueFalse, makeTrEnToKa, makeOddOneOut, makeSynonymMatch, makeDefinitionMatch],
  2: [makeMcMeaning, makeFillBlank, makeListening, makeSentenceCorrect, makeTrEnToKa, makeOddOneOut, makeCollocation, makeDefinitionMatch, makeSentenceDefinition],
  3: [makeFillBlank, makeContextCloze, makeListening, makeSentenceCorrect, makeTrKaToEn, makeOddOneOut, makeCollocation, makeDefinitionMatch, makeSentenceDefinition],
};
// Second-pass generators for NEW words: retrieval-heavier than the first pass,
// so each new word is first recognized, then actively recalled/produced.
const NEW_SECOND_PASS_BY_TIER: Record<1 | 2 | 3, Generator[]> = {
  1: [makeListening, makeTrEnToKa, makeTypeWord, makeSynonymMatch, makeFillBlank],
  2: [makeTrKaToEn, makeTypeWord, makeContextCloze, makeFillBlank, makeListening, makeSentenceDefinition, makeCollocation, makeDefinitionMatch],
  3: [makeTypeWord, makeContextCloze, makeTrKaToEn, makeFillBlank, makeCollocation],
};
const REVIEW_GENERATORS_BY_TIER: Record<1 | 2 | 3, Generator[]> = {
  1: [makeMcMeaning, makeListening, makeTrKaToEn, makeTrueFalse, makeOddOneOut, makeSynonymMatch],
  2: [makeFillBlank, makeTypeWord, makeListening, makeTrKaToEn, makeContextCloze, makeOddOneOut, makeCollocation, makeSentenceDefinition],
  3: [makeTypeWord, makeContextCloze, makeFillBlank, makeTrKaToEn, makeListening, makeCollocation],
};

/**
 * Build a mixed quiz for the session.
 * - Question type difficulty scales with tierLevel.
 * - Every NEW word gets TWO differently-formatted questions (encode + retrieve),
 *   spaced apart in the quiz — a word met once per session doesn't stick.
 * - Review words get one question each and reinforce retention.
 * - Georgian mistake questions sprinkled in.
 * - Never the same question type — or the same word — twice in a row.
 * - No arbitrary length cap: the quiz fits the session plan's word budget.
 *   Pass opts.maxQuestions to cap explicitly if ever needed.
 */
// A session must not collapse to a stub just because few WORDS are available.
// The main path budgets questions properly, but secondary entry points (review
// fallback, practice mode) build 1-2 questions per word with no floor — which is
// how a 3-word review turned into a 6-question session. This tops a short quiz
// back up by asking each word in additional FORMATS, capped so no single word is
// drilled absurdly often.
const MAX_QUESTIONS_PER_WORD = 3;
export const SESSION_QUESTION_TARGET = 20;

function topUpQuestions(
  questions: QuizQuestion[],
  words: VocabWord[],
  pool: VocabWord[],
  target: number,
  generators: Generator[],
): QuizQuestion[] {
  if (!words.length) return questions;
  const perWord = new Map<string, number>();
  for (const q of questions) {
    const k = (q as any).wordKey;
    if (k) perWord.set(k, (perWord.get(k) ?? 0) + 1);
  }
  let gi = 0;
  let guard = 0;
  while (questions.length < target && guard++ < 300) {
    let added = false;
    for (const w of words) {
      if (questions.length >= target) break;
      if ((perWord.get(w.key) ?? 0) >= MAX_QUESTIONS_PER_WORD) continue;
      const gen = generators[gi++ % generators.length];
      const q = gen(w, pool);
      if (!q) continue;
      questions.push(q);
      perWord.set(w.key, (perWord.get(w.key) ?? 0) + 1);
      added = true;
    }
    if (!added) break;   // every word already at its cap
  }
  return questions;
}

export function buildQuiz(
  newWords: VocabWord[],
  reviewKeys: string[],
  tierLevel: 1 | 2 | 3 = 1,
  opts: { maxQuestions?: number; claimedKeys?: string[]; targetQuestions?: number } = {},
): QuizQuestion[] {
  const pool = ALL_WORDS;
  const reviewWords = reviewKeys.map(findWord).filter(Boolean) as VocabWord[];
  const claimedSet = new Set(opts.claimedKeys ?? []);

  const newGens = NEW_GENERATORS_BY_TIER[tierLevel];
  const secondGens = NEW_SECOND_PASS_BY_TIER[tierLevel];
  const reviewGens = REVIEW_GENERATORS_BY_TIER[tierLevel];

  const questions: QuizQuestion[] = [];

  // Pass 1: encode — one question per new word. Words the learner claimed to
  // already know get a single typed PROOF question instead of the usual pair.
  newWords.forEach((w, i) => {
    if (claimedSet.has(w.key)) {
      questions.push(makeTypeWord(w) || makeTrKaToEn(w, pool));
      return;
    }
    const gen = newGens[i % newGens.length];
    const q = gen(w, pool);
    if (q) questions.push(q);
    else questions.push(makeMcMeaning(w, pool));
  });

  // Pass 2: retrieve — a second, different-format question per new word.
  // Claimed words skip this: one proof is enough.
  newWords.forEach((w, i) => {
    if (claimedSet.has(w.key)) return;
    const gen = secondGens[i % secondGens.length];
    const q = gen(w, pool);
    if (q) questions.push(q);
    else questions.push(makeTrEnToKa(w, pool));
  });

  // Review words: one question each.
  reviewWords.forEach((w, i) => {
    const gen = reviewGens[i % reviewGens.length];
    const q = gen(w, pool);
    if (q) questions.push(q);
    else questions.push(makeMcMeaning(w, pool));
  });

  // Top up short sessions before adding mistakes, so the floor applies to the
  // vocabulary content rather than being padded out with grammar items.
  if (opts.targetQuestions) {
    const allWords = [...newWords, ...reviewWords];
    topUpQuestions(questions, allWords, pool, opts.targetQuestions - (tierLevel === 1 ? 1 : 2), [...NEW_SECOND_PASS_BY_TIER[tierLevel], ...reviewGens]);
  }

  // 1 mistake on tier 1 to keep things gentle, 2 on higher tiers.
  const mistakeCount = tierLevel === 1 ? 1 : 2;
  const mistakes = pick(GEORGIAN_MISTAKES, mistakeCount).map(makeGeorgianMistake);

  // Shuffle, then avoid back-to-back same type OR same word (so a new word's
  // two questions don't land adjacent).
  const keyOf = (q: QuizQuestion) =>
    (q as any).wordKey ? String((q as any).wordKey) : `mistake:${(q as any).key ?? ""}`;

  let merged = shuffle([...questions, ...mistakes]);
  for (let i = 1; i < merged.length; i++) {
    const clashes = (a: QuizQuestion, b: QuizQuestion) =>
      a.type === b.type || keyOf(a) === keyOf(b);
    if (clashes(merged[i], merged[i - 1])) {
      const swapIdx = merged.findIndex(
        (q, idx) => idx > i && !clashes(q, merged[i - 1]) && (idx + 1 >= merged.length || !clashes(merged[i], merged[idx + 1] ?? q)),
      );
      if (swapIdx > -1) {
        [merged[i], merged[swapIdx]] = [merged[swapIdx], merged[i]];
      }
    }
  }

  const cap = opts.maxQuestions ?? merged.length;
  return merged.slice(0, cap);
}

// ---------------- Phrase ingestion from other modules ----------------

/**
 * Pull vocab/phrases saved from other Business modules and ensure they exist
 * as progress rows so they enter the spaced repetition system.
 */
export async function ingestExternalPhrases(userId: string, existing: ProgressRow[]): Promise<ProgressRow[]> {
  const have = new Set(existing.map((p) => p.word_key));
  const newRows: ProgressRow[] = [];

  const [interviews, meetings] = await Promise.all([
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

  const ingest = (rows: any[] | null | undefined, source: "interview" | "meeting") => {
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
 * Words due for review today (overdue included), weakest first — powers the
 * "დღეს გასამეორებელი" list on the vocab intro screen. Excludes words never
 * actually studied (last_seen_at null), so freshly-ingested phrases don't show
 * as "due" before the learner has ever met them.
 */
export function dueToday(progress: ProgressRow[]): VocabWord[] {
  const now = Date.now();
  return progress
    .filter((p) => !checkMastery(p) && p.last_seen_at !== null)
    .filter((p) => new Date(p.due_at).getTime() <= now)
    .sort(
      (a, b) =>
        a.confidence - b.confidence ||
        new Date(a.due_at).getTime() - new Date(b.due_at).getTime(),
    )
    .map(progressToWord)
    .filter(Boolean) as VocabWord[];
}

/**
 * Build a 15-20 question quiz using only the supplied review words. Generates
 * roughly 2 varied questions per word so even a 10-word pool reaches ~20 Qs.
 */
export function buildReviewQuiz(words: VocabWord[], targetQuestions = SESSION_QUESTION_TARGET): QuizQuestion[] {
  if (!words.length) return [];
  const pool = ALL_WORDS;
  const generators: Generator[] = [makeMcMeaning, makeTrKaToEn, makeListening, makeFillBlank, makeTypeWord, makeTrEnToKa];
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

  topUpQuestions(questions, words, pool, targetQuestions, generators);

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