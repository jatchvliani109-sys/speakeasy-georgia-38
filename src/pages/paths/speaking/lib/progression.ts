// Speaking-path progression: tiers, unlock rules, CEFR, daily mission pick, scoring.

import { SCENARIOS } from "./scenarios";

export type Tier = "easy" | "medium" | "hard";

export const TIERS: Tier[] = ["easy", "medium", "hard"];

export const TIER_LABEL_KA: Record<Tier, string> = {
  easy: "დამწყები",
  medium: "საშუალო",
  hard: "რთული",
};

export const TIER_ESTIMATED_MIN: Record<Tier, number> = {
  easy: 8,
  medium: 10,
  hard: 12,
};

export type ProgressRow = {
  scenario_id: string;
  tier: Tier;
  score: number;
  completed_at: string;
};

export type ProgressMap = Record<string, Partial<Record<Tier, ProgressRow>>>;

export function buildProgressMap(rows: ProgressRow[]): ProgressMap {
  const m: ProgressMap = {};
  for (const r of rows) {
    if (!m[r.scenario_id]) m[r.scenario_id] = {};
    const existing = m[r.scenario_id][r.tier];
    if (!existing || r.score >= existing.score) m[r.scenario_id][r.tier] = r;
  }
  return m;
}

/**
 * Tier unlock rule (per scenario):
 *  - easy   is always unlocked
 *  - medium unlocks after easy is completed
 *  - hard   unlocks after medium is completed
 */
export function isTierUnlocked(map: ProgressMap, scenarioId: string, tier: Tier): boolean {
  if (tier === "easy") return true;
  const s = map[scenarioId] ?? {};
  if (tier === "medium") return !!s.easy;
  return !!s.medium;
}

export function isTierCompleted(map: ProgressMap, scenarioId: string, tier: Tier): boolean {
  return !!map[scenarioId]?.[tier];
}

/** Returns the next locked tier that becomes available right after completing `tier`. */
export function nextTierAfter(tier: Tier): Tier | null {
  if (tier === "easy") return "medium";
  if (tier === "medium") return "hard";
  return null;
}

export function tierCounts(map: ProgressMap) {
  let easy = 0, medium = 0, hard = 0;
  for (const sid of Object.keys(map)) {
    if (map[sid].easy) easy++;
    if (map[sid].medium) medium++;
    if (map[sid].hard) hard++;
  }
  return { easy, medium, hard, total: easy + medium + hard };
}

/** Number of scenarios where ALL tiers are completed. */
export function fullyMasteredCount(map: ProgressMap): number {
  let n = 0;
  for (const sid of Object.keys(map)) {
    const s = map[sid];
    if (s.easy && s.medium && s.hard) n++;
  }
  return n;
}

export type CEFR =
  | { code: "A1"; label_ka: string; label_en: string }
  | { code: "A2"; label_ka: string; label_en: string }
  | { code: "B1"; label_ka: string; label_en: string }
  | { code: "B2"; label_ka: string; label_en: string }
  | { code: "C1"; label_ka: string; label_en: string };

export function calculateCEFR(map: ProgressMap): CEFR {
  const { easy, medium, hard } = tierCounts(map);
  const total = SCENARIOS.length; // 17
  if (hard >= total) return { code: "C1", label_ka: "მოწინავე", label_en: "Advanced" };
  if (medium >= total && hard > 0) return { code: "B2", label_ka: "მაღალი საშუალო", label_en: "Upper Intermediate" };
  if (easy >= total && medium > 0) return { code: "B1", label_ka: "საშუალო", label_en: "Intermediate" };
  if (easy >= 6) return { code: "A2", label_ka: "ელემენტარული", label_en: "Elementary" };
  return { code: "A1", label_ka: "დამწყები", label_en: "Beginner" };
}

/** Coarse 0–100 score for a finished call. */
export function scoreSession(args: {
  userTurns: number;
  mistakesCount: number;
  phrasesCount: number;
  durationSec: number;
}): number {
  const { userTurns, mistakesCount, phrasesCount, durationSec } = args;
  // Base on engagement: 6+ turns and >=60s is a full pass.
  const turnScore = Math.min(60, userTurns * 10);
  const timeScore = Math.min(20, Math.round(durationSec / 6));
  const phraseScore = Math.min(15, phrasesCount * 3);
  const mistakePenalty = Math.min(20, mistakesCount * 4);
  const raw = turnScore + timeScore + phraseScore + 5 - mistakePenalty;
  return Math.max(0, Math.min(100, raw));
}

/** A completed session needs at least 4 user turns. */
export function isCompletionEligible(userTurns: number): boolean {
  return userTurns >= 4;
}

/** Deterministic daily seed from user id + local date. */
function todayKey(userId: string): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  return `${userId}|${ymd}`;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type DailyMission = {
  scenarioId: string;
  tier: Tier;
  reason_ka: string;
  estimated_min: number;
};

/**
 * Picks a {scenario, tier} for today.
 * Priority:
 *  1) Lowest unlocked tier not completed yet (push forward)
 *  2) Scenario not practiced in last 7 days
 *  3) Lowest-scoring scenario for retry
 *  4) Deterministic fallback by daily seed
 */
export function pickDailyMission(args: {
  userId: string;
  map: ProgressMap;
  recentScenarioIds?: string[]; // ids practiced in last 7 days, most recent first
}): DailyMission {
  const { userId, map, recentScenarioIds = [] } = args;
  const recent = new Set(recentScenarioIds.slice(0, 10));
  const seed = hashString(todayKey(userId));

  type Candidate = { scenarioId: string; tier: Tier; priority: number; weight: number };
  const candidates: Candidate[] = [];

  for (const s of SCENARIOS) {
    for (const tier of TIERS) {
      if (!isTierUnlocked(map, s.id, tier)) continue;
      const done = isTierCompleted(map, s.id, tier);
      if (done) continue;

      // Priority: lower = better. Unlocked-not-done at lowest tier wins first.
      let priority = tier === "easy" ? 0 : tier === "medium" ? 1 : 2;
      if (recent.has(s.id)) priority += 5; // de-prioritize very recent
      const prior = map[s.id]?.[tier];
      const weight = prior ? 100 - prior.score : 50;
      candidates.push({ scenarioId: s.id, tier, priority, weight });
    }
  }

  let pick: Candidate | null = null;
  if (candidates.length) {
    candidates.sort((a, b) => a.priority - b.priority || b.weight - a.weight);
    // Within the lowest priority bucket, rotate by daily seed for variety.
    const bestPriority = candidates[0].priority;
    const top = candidates.filter((c) => c.priority === bestPriority);
    pick = top[seed % top.length];
  } else {
    // Everything completed — recommend a refresher: lowest-scoring tier.
    let lowest: { scenarioId: string; tier: Tier; score: number } | null = null;
    for (const sid of Object.keys(map)) {
      for (const t of TIERS) {
        const r = map[sid][t];
        if (!r) continue;
        if (!lowest || r.score < lowest.score) lowest = { scenarioId: sid, tier: t, score: r.score };
      }
    }
    if (lowest) pick = { scenarioId: lowest.scenarioId, tier: lowest.tier, priority: 0, weight: 0 };
    else pick = { scenarioId: SCENARIOS[seed % SCENARIOS.length].id, tier: "easy", priority: 0, weight: 0 };
  }

  const reason_ka = reasonFor(pick.tier, recent.has(pick.scenarioId));
  return {
    scenarioId: pick.scenarioId,
    tier: pick.tier,
    reason_ka,
    estimated_min: TIER_ESTIMATED_MIN[pick.tier],
  };
}

function reasonFor(tier: Tier, recentlyDone: boolean): string {
  if (recentlyDone) return "გავიმეოროთ უფრო თავდაჯერებულად.";
  if (tier === "easy") return "დაიწყე ახალი თემა მარტივად.";
  if (tier === "medium") return "ცოტა უფრო ღრმად ჩაუღრმავდი.";
  return "გამოწვევა შენი დონისთვის.";
}

/** Strongest / weakest scenarios from progress map. */
export function strongestWeakest(map: ProgressMap): {
  strongest: { scenarioId: string; avg: number }[];
  weakest: { scenarioId: string; avg: number }[];
} {
  const arr: { scenarioId: string; avg: number }[] = [];
  for (const sid of Object.keys(map)) {
    const tiers = Object.values(map[sid]) as ProgressRow[];
    if (!tiers.length) continue;
    const avg = Math.round(tiers.reduce((s, r) => s + r.score, 0) / tiers.length);
    arr.push({ scenarioId: sid, avg });
  }
  const sorted = [...arr].sort((a, b) => b.avg - a.avg);
  return {
    strongest: sorted.slice(0, 3),
    weakest: [...arr].sort((a, b) => a.avg - b.avg).slice(0, 3),
  };
}
