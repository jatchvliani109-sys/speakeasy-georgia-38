// Business English path local state. Stored in localStorage to avoid DB schema changes.

export type BusinessGoal =
  | "university"
  | "job_interview"
  | "work_communication"
  | "remote_work"
  | "emails_writing"
  | "business_vocab"
  | "general_business";


export type BusinessPriority = BusinessGoal;

export type BusinessIntensity = "light" | "standard" | "intensive" | "deadline";
export type BusinessDeadline = "2_weeks" | "1_month" | "3_months" | "other" | null;

export type BusinessField =
  | "general"
  | "management"
  | "marketing"
  | "finance"
  | "accounting"
  | "economics"
  | "hr"
  | "sales"
  | "project_management"
  | "customer_service"
  | "entrepreneurship"
  | "logistics";

export type BusinessLevel =
  | "business_beginner"
  | "business_elementary"
  | "business_intermediate"
  | "business_advanced";

export type BusinessPlan = {
  mainGoals: BusinessPriority[];
  level: BusinessLevel;
  intensity: BusinessIntensity;
  deadline: BusinessDeadline;
  fields: BusinessField[];
  recommendedModule: string; // module slug
  recommendedModuleTitle: string;
  weeklyFocus: string[];
};

export type BusinessState = {
  setupCompleted: boolean;
  testCompleted: boolean;
  goals: BusinessGoal[];
  mainPriority: BusinessPriority[];
  intensity: BusinessIntensity | null;
  deadline: BusinessDeadline;
  field: BusinessField[];
  level: BusinessLevel | null;
  plan: BusinessPlan | null;
  businessSelfIntroductionCompleted?: boolean;
  businessSelfIntroductionSkipped?: boolean;
  businessResumeUploaded?: boolean;
  businessResumeSkipped?: boolean;
  firstMilestoneAcknowledged?: boolean;
  /** Mock premium flag until real payments launch. */
  mockPro?: boolean;
  /** Streak freezes banked, and the days they covered. */
  streakFreezes?: number;
  freezeDays?: string[];
  /** Weekly AI budget bookkeeping (mirrors the server-side counter). */
  aiWeekKey?: string;
  aiUsedWeek?: number;
  /** ISO timestamp when the 7-day premium trial began (set at signup). */
  trialStartedAt?: string;
  /** AI sessions consumed during the trial. A TOTAL, not a weekly figure. */
  trialAiUsed?: number;
  /** The gift screen has been shown and answered (accepted OR declined). */
  trialOffered?: boolean;
  /** They turned the gift down. Deliberately irreversible. */
  trialDeclined?: boolean;
  /** The end-of-trial screen has been shown, so it only appears once. */
  trialEndSeen?: boolean;
  /**
   * Highest vocabulary milestone already celebrated (10, 20, ... 100).
   * Persisted so the celebration shows ONCE on the dashboard and does not
   * reappear on every visit.
   */
  lastVocabMilestone?: number;
};


const KEY = (uid: string) => `business_state_${uid}`;

const empty = (): BusinessState => ({
  setupCompleted: false,
  testCompleted: false,
  goals: [],
  mainPriority: [],
  intensity: null,
  deadline: null,
  field: [],
  level: null,
  plan: null,
  businessSelfIntroductionCompleted: false,
  businessSelfIntroductionSkipped: false,
  businessResumeUploaded: false,
  businessResumeSkipped: false,
  firstMilestoneAcknowledged: false,
});

export function loadBusiness(uid: string): BusinessState {
  try {
    const raw = localStorage.getItem(KEY(uid));
    if (!raw) return empty();
    return { ...empty(), ...JSON.parse(raw) };
  } catch {
    return empty();
  }
}

/**
 * Should the gift screen be shown?
 *
 * The trial is no longer switched on silently — it is offered once, as a gift,
 * and starts only when accepted. Something you choose to accept is valued
 * differently from something granted by default, and that difference is the
 * whole point of the screen.
 *
 * Shown only to a user who has finished setup, has not already answered, and
 * is not already paying.
 */
export function shouldOfferTrial(state: BusinessState | null | undefined): boolean {
  if (!state) return false;
  if (state.mockPro === true) return false;
  if (state.trialOffered) return false;      // already accepted or declined
  if (state.trialStartedAt) return false;    // legacy: trial already running
  return state.setupCompleted === true;
}

export function saveBusiness(uid: string, patch: Partial<BusinessState>) {
  const cur = loadBusiness(uid);
  const next = { ...cur, ...patch };
  localStorage.setItem(KEY(uid), JSON.stringify(next));
  pushBusinessRemote(uid, next).catch((e) => {
    console.warn("[business] remote push failed (will retry on next save)", e);
  });
  return next;
}

// Same as saveBusiness, but awaits the remote write. Use this before
// navigating to a page whose guard reads from Supabase, to avoid the
// guard seeing stale remote state and bouncing the user back.
export async function saveBusinessAsync(uid: string, patch: Partial<BusinessState>) {
  const cur = loadBusiness(uid);
  const next = { ...cur, ...patch };
  localStorage.setItem(KEY(uid), JSON.stringify(next));
  try {
    await pushBusinessRemote(uid, next);
  } catch (e) {
    console.warn("[business] remote push failed (continuing with local state)", e);
  }
  return next;
}

export function resetBusiness(uid: string) {
  localStorage.removeItem(KEY(uid));
  import("@/integrations/supabase/client").then(({ supabase }) => {
    supabase
      .from("business_state")
      .upsert({ user_id: uid, state: {}, self_intros: [] } as any, { onConflict: "user_id" })
      .then(() => {}, () => {});
  });
}

// --- Weekly AI budget (client-side UI hint; the server enforces the real limit) ---

// AI is premium-only as of 2026-08-03. Free users get 0; the 7-day trial still
// grants 3, so a new user experiences the feature before deciding — the trial is
// now the ONLY route to AI for a non-paying user, which makes it a real taste
// rather than a permanent allowance.
//
// Resume parsing is NOT covered by this quota. It stays free with a 5/day rate
// limit: a one-time onboarding step and a dependency of the paid feature.
export const FREE_WEEKLY_AI = 0;
export const PREMIUM_WEEKLY_AI = 7;

/** Monday of the current Tbilisi week — must match the server's currentAiWeekKey(). */
export function currentAiWeekKey(now: Date = new Date()): string {
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const t = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  const day = t.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  t.setUTCDate(t.getUTCDate() - diff);
  t.setUTCHours(0, 0, 0, 0);
  return `${DAYS[t.getUTCDay()]} ${MONTHS[t.getUTCMonth()]} ${String(t.getUTCDate()).padStart(2, "0")} ${t.getUTCFullYear()}`;
}

// ---- Trial -----------------------------------------------------------------
//
// New users get 7 days of premium features. The AI allowance during the trial
// is a small FIXED TOTAL rather than the premium weekly rate, because AI output
// (a generated CV, an interview transcript) is kept by the user and has no
// switching cost — so a full premium allowance would reward re-registering with
// a fresh email. Vocabulary progress has the opposite property, which is why
// unlimited vocab during the trial is safe.
//
// A total (not weekly) allowance is also simpler: no week key, no reset, and
// none of the client/server week-mismatch risk that the weekly quota carries.

export const TRIAL_DAYS = 7;
export const TRIAL_AI_TOTAL = 3;

export function trialEndsAt(state: BusinessState | null | undefined): Date | null {
  if (!state?.trialStartedAt) return null;
  const start = new Date(state.trialStartedAt);
  if (isNaN(start.getTime())) return null;
  return new Date(start.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

/** True while the trial window is open AND the user has not already paid. */
export function isTrialActive(state: BusinessState | null | undefined, now: Date = new Date()): boolean {
  if (state?.mockPro === true) return false;   // paid users are not on trial
  const ends = trialEndsAt(state);
  return !!ends && now < ends;
}

export function trialDaysLeft(state: BusinessState | null | undefined, now: Date = new Date()): number {
  const ends = trialEndsAt(state);
  if (!ends) return 0;
  return Math.max(0, Math.ceil((ends.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
}

/** Unlimited vocabulary sessions: premium OR trial. */
export function hasUnlimitedVocab(state: BusinessState | null | undefined): boolean {
  return state?.mockPro === true || isTrialActive(state);
}

/** True in the last stretch of the trial, when the banner should escalate. */
export function trialEndingSoon(state: BusinessState | null | undefined): boolean {
  return isTrialActive(state) && trialDaysLeft(state) <= 2;
}

/**
 * Should the end-of-trial screen be shown?
 *
 * Only for someone who ACCEPTED the gift and has now run out of days — not for
 * a user who declined (they never had it) and not for a paying user. Shown once,
 * then flagged, because a farewell that reappears is nagging rather than a moment.
 */
export function shouldShowTrialEnd(state: BusinessState | null | undefined, now: Date = new Date()): boolean {
  if (!state) return false;
  if (state.mockPro === true) return false;
  if (!state.trialStartedAt) return false;      // never accepted
  if (state.trialEndSeen) return false;         // already said goodbye
  const ends = trialEndsAt(state);
  return !!ends && now >= ends;
}

/** True when the user has no AI access at all — free tier, no active trial. */
export function aiLocked(state: BusinessState | null | undefined): boolean {
  return state?.mockPro !== true && !isTrialActive(state);
}

export function aiWeeklyLimit(state: BusinessState | null | undefined): number {
  if (state?.mockPro === true) return PREMIUM_WEEKLY_AI;
  if (isTrialActive(state)) return TRIAL_AI_TOTAL;   // total for the whole trial
  return FREE_WEEKLY_AI;
}

export function aiSessionsRemaining(state: BusinessState | null | undefined): number {
  const limit = aiWeeklyLimit(state);
  if (!state) return limit;
  // During the trial the counter is a running total that never resets.
  if (isTrialActive(state)) return Math.max(0, limit - (state.trialAiUsed ?? 0));
  const used = state.aiWeekKey === currentAiWeekKey() ? state.aiUsedWeek ?? 0 : 0;
  return Math.max(0, limit - used);
}

/**
 * READ-ONLY pre-flight check so the UI can block before spending a request.
 *
 * It must NOT increment. The authoritative counter lives in the database and is
 * claimed by the edge functions (consume_ai_session). While this function also
 * incremented, every AI use cost TWO sessions — one here and one on the server.
 */
export async function tryConsumeAiSession(
  uid: string,
): Promise<{ ok: boolean; remaining: number; limit: number }> {
  const state = await pullBusinessFromSupabase(uid).catch(() => loadBusiness(uid));
  const limit = aiWeeklyLimit(state);
  const remaining = aiSessionsRemaining(state);
  if (remaining <= 0) return { ok: false, remaining: 0, limit };
  return { ok: true, remaining, limit };
}


// --- Supabase sync ---

async function pushBusinessRemote(uid: string, state: BusinessState) {
  const { supabase } = await import("@/integrations/supabase/client");
  await supabase
    .from("business_state")
    .upsert({ user_id: uid, state: state as any }, { onConflict: "user_id" });
}

async function pushSelfIntrosRemote(uid: string, list: SavedSelfIntro[]) {
  const { supabase } = await import("@/integrations/supabase/client");
  await supabase
    .from("business_state")
    .upsert({ user_id: uid, self_intros: list as any }, { onConflict: "user_id" });
}

/**
 * Pulls latest business state + self-intros from Supabase and mirrors into
 * localStorage. Remote is the source of truth across devices; local is a cache.
 */
export async function pullBusinessFromSupabase(uid: string): Promise<BusinessState> {
  const local = loadBusiness(uid);
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase
      .from("business_state")
      .select("state, self_intros")
      .eq("user_id", uid)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      const remoteState = ((data.state as any) || {}) as Partial<BusinessState>;
      // Remote is source of truth, but never let a slow/empty remote
      // erase progress flags that have already been set locally.
      const merged: BusinessState = { ...empty(), ...remoteState };
      const keepLocalTrue: (keyof BusinessState)[] = [
        "setupCompleted",
        "testCompleted",
        "businessSelfIntroductionCompleted",
        "businessSelfIntroductionSkipped",
        "businessResumeUploaded",
        "businessResumeSkipped",
        "firstMilestoneAcknowledged",
      ];
      for (const k of keepLocalTrue) {
        if ((local as any)[k] && !(merged as any)[k]) (merged as any)[k] = true;
      }
      // Preserve locally-built plan / level / answers if remote is missing them.
      if (!merged.plan && local.plan) merged.plan = local.plan;
      if (!merged.level && local.level) merged.level = local.level;
      if ((!merged.goals || merged.goals.length === 0) && local.goals?.length) merged.goals = local.goals;
      if ((!merged.mainPriority || merged.mainPriority.length === 0) && local.mainPriority?.length) merged.mainPriority = local.mainPriority;
      if ((!merged.field || merged.field.length === 0) && local.field?.length) merged.field = local.field;
      if (!merged.intensity && local.intensity) merged.intensity = local.intensity;
      if (!merged.deadline && local.deadline) merged.deadline = local.deadline;

      localStorage.setItem(KEY(uid), JSON.stringify(merged));
      const intros = Array.isArray(data.self_intros)
        ? (data.self_intros as unknown as SavedSelfIntro[])
        : [];
      localStorage.setItem(SI_KEY(uid), JSON.stringify(intros));
      return merged;
    }
  } catch (e) {
    console.warn("[business] pull failed, using local cache", e);
  }
  return local;
}

// --- Labels (Georgian) ---

export const GOAL_LABELS: Record<BusinessGoal, string> = {
  university: "უნივერსიტეტისთვის / ბიზნესის სწავლისთვის",
  job_interview: "გასაუბრებისთვის",
  work_communication: "სამსახურისთვის / სამუშაო კომუნიკაციისთვის",
  remote_work: "ფრილანსისთვის / remote work-ისთვის",
  emails_writing: "იმეილებისა და პროფესიონალური წერისთვის",
  
  business_vocab: "ბიზნეს ლექსიკის გასაუმჯობესებლად",
  general_business: "ზოგადი ბიზნეს ინგლისურისთვის",
};

export const PRIORITY_LABELS: Record<BusinessPriority, string> = {
  university: "უნივერსიტეტი / ბიზნესის სწავლა",
  job_interview: "გასაუბრება",
  work_communication: "სამუშაო კომუნიკაცია",
  remote_work: "ფრილანსი / remote work",
  emails_writing: "იმეილები და პროფესიონალური წერა",
  
  business_vocab: "ბიზნეს ლექსიკა",
  general_business: "ზოგადი გაუმჯობესება",
};

export const INTENSITY_LABELS: Record<BusinessIntensity, string> = {
  light: "მსუბუქი რეჟიმი — 10 წუთი დღეში",
  standard: "სტანდარტული — 20 წუთი დღეში",
  intensive: "ინტენსიური — 30–40 წუთი დღეში",
  deadline: "სწრაფი მიზანი — მაქვს კონკრეტული ვადა",
};

export const DEADLINE_LABELS: Record<Exclude<BusinessDeadline, null>, string> = {
  "2_weeks": "2 კვირაში",
  "1_month": "1 თვეში",
  "3_months": "3 თვეში",
  other: "სხვა",
};

export const FIELD_LABELS: Record<BusinessField, string> = {
  general: "General Business",
  management: "Management",
  marketing: "Marketing",
  finance: "Finance",
  accounting: "Accounting",
  economics: "Economics",
  hr: "HR",
  sales: "Sales",
  project_management: "Project Management",
  customer_service: "Customer Service",
  entrepreneurship: "Entrepreneurship",
  logistics: "Logistics",
};

export const LEVEL_LABELS: Record<BusinessLevel, string> = {
  business_beginner: "Business Beginner",
  business_elementary: "Business Elementary",
  business_intermediate: "Business Intermediate",
  business_advanced: "Business Advanced",
};

// Modules

import { Briefcase, Mail, BookOpen, type LucideIcon } from "lucide-react";

export type BusinessModule = {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export const BUSINESS_MODULES: BusinessModule[] = [
  {
    slug: "interview",
    title: "გასაუბრება",
    description: "ივარჯიშე გავრცელებულ კითხვებზე და გააუმჯობესე პასუხები.",
    icon: Briefcase,
  },
  {
    slug: "emails",
    title: "იმეილები და პროფესიონალური წერა",
    description: "დაწერე უფრო სწორი, თავაზიანი და პროფესიონალური იმეილები.",
    icon: Mail,
  },
  {
    slug: "vocabulary",
    title: "ბიზნეს ლექსიკა",
    description: "ისწავლე სიტყვები მაგალითებით, ქართული ახსნებით და პრაქტიკით.",
    icon: BookOpen,
  },
];

// Map main priority -> recommended module (single primary)
const PRIORITY_TO_MODULE: Record<BusinessPriority, string> = {
  university: "interview",
  job_interview: "interview",
  work_communication: "emails",
  remote_work: "emails",
  emails_writing: "emails",
  business_vocab: "vocabulary",
  general_business: "interview",
};

// Map a priority -> one or more relevant modules (used for ordering & rotation).
export const PRIORITY_TO_MODULES: Record<BusinessPriority, string[]> = {
  university: ["interview", "vocabulary"],
  job_interview: ["interview", "vocabulary"],
  work_communication: ["emails", "vocabulary"],
  remote_work: ["emails", "vocabulary"],
  emails_writing: ["emails"],
  business_vocab: ["vocabulary"],
  general_business: ["vocabulary", "interview", "emails"],
};

/**
 * Returns an ordered list of module slugs ranked by user goals.
 * Goals earlier in the list (higher priority) push their modules higher.
 * Every module in BUSINESS_MODULES is included — nothing is hidden.
 * Returns `null` when the user has no goals (caller should show default order).
 */
export function rankedModuleSlugs(goals: BusinessPriority[] | undefined | null): string[] | null {
  if (!goals || goals.length === 0) return null;
  const score = new Map<string, number>();
  goals.forEach((g, idx) => {
    const weight = goals.length - idx; // first goal = highest weight
    (PRIORITY_TO_MODULES[g] || []).forEach((slug, i) => {
      score.set(slug, (score.get(slug) || 0) + weight * (i === 0 ? 2 : 1));
    });
  });
  const all = BUSINESS_MODULES.map((m) => m.slug);
  return [...all].sort((a, b) => (score.get(b) || 0) - (score.get(a) || 0));
}

/** Slugs that should display the "recommended for you" badge. */
export function recommendedModuleSlugs(goals: BusinessPriority[] | undefined | null): Set<string> {
  const set = new Set<string>();
  if (!goals) return set;
  goals.forEach((g) => (PRIORITY_TO_MODULES[g] || []).forEach((s) => set.add(s)));
  return set;
}


const WEEKLY_FOCUS: Record<BusinessPriority, string[]> = {
  university: [
    "ბიზნეს ლექსიკის საფუძვლები",
    "პრეზენტაციის ფრაზები",
    "დიაგრამებისა და მონაცემების ახსნა",
    "case study discussion phrases",
    "academic/business writing",
  ],
  job_interview: [
    "პროფესიონალური წარდგენა",
    "გასაუბრების კითხვები",
    "ძლიერი პასუხების ფორმულირება",
    "ბიზნეს ლექსიკა",
    "მოკლე mock interview",
  ],
  work_communication: [
    "სამუშაო შეხვედრების ფრაზები",
    "თავაზიანი მოთხოვნები",
    "სტატუსის გაზიარება",
    "უთანხმოების გადაჭრა",
    "small talk სამსახურში",
  ],
  remote_work: [
    "Async კომუნიკაცია",
    "Slack/Email tone",
    "Stand-up updates",
    "Video call ფრაზები",
    "Time zone & deadlines",
  ],
  emails_writing: [
    "professional email structure",
    "polite requests",
    "follow-up messages",
    "status updates",
    "tone improvement",
  ],
  business_vocab: [
    "Finance & numbers",
    "Marketing & sales",
    "Management & teams",
    "Operations & projects",
    "Idioms & collocations",
  ],
  general_business: [
    "ბიზნეს ლექსიკის საფუძვლები",
    "მოკლე იმეილები",
    "სამუშაო საუბრები",
    "გასაუბრების მომზადება",
    "მოკლე პრეზენტაცია",
  ],
};

export function buildPlan(s: BusinessState): BusinessPlan | null {
  const primaryGoal = s.mainPriority?.[0];
  if (!primaryGoal || !s.intensity || !s.field?.length || !s.level) return null;
  const moduleSlug = PRIORITY_TO_MODULE[primaryGoal];
  const mod = BUSINESS_MODULES.find((m) => m.slug === moduleSlug)!;
  return {
    mainGoals: s.mainPriority,
    level: s.level,
    intensity: s.intensity,
    deadline: s.deadline,
    fields: s.field,
    recommendedModule: mod.slug,
    recommendedModuleTitle: mod.title,
    weeklyFocus: WEEKLY_FOCUS[primaryGoal],
  };
}

// --- Self-Introduction module storage ---

export type SelfIntroVersion = { en: string; ka: string };
export type SelfIntroPhrase = {
  en: string;
  ka: string;
  explanationKa: string;
  exampleEn: string;
  exampleKa: string;
};

export type SelfIntroInputs = {
  purpose: string;
  name: string;
  status: string;
  field: string;
  experience: string;
  skills: string;
  goal: string;
};

export type SavedSelfIntro = {
  id: string;
  createdAt: string;
  inputs: SelfIntroInputs;
  short: SelfIntroVersion;
  standard: SelfIntroVersion;
  polished: SelfIntroVersion;
  phrases: SelfIntroPhrase[];
  selected: "short" | "standard" | "polished";
  practicedAt?: string | null;
};

const SI_KEY = (uid: string) => `business_self_intro_${uid}`;

export function loadSelfIntros(uid: string): SavedSelfIntro[] {
  try {
    const raw = localStorage.getItem(SI_KEY(uid));
    return raw ? (JSON.parse(raw) as SavedSelfIntro[]) : [];
  } catch { return []; }
}

export function saveSelfIntro(uid: string, item: SavedSelfIntro) {
  const list = loadSelfIntros(uid);
  const idx = list.findIndex((i) => i.id === item.id);
  if (idx >= 0) list[idx] = item; else list.unshift(item);
  localStorage.setItem(SI_KEY(uid), JSON.stringify(list));
  pushSelfIntrosRemote(uid, list).catch(() => {});
  return list;
}

export function deleteSelfIntro(uid: string, id: string) {
  const list = loadSelfIntros(uid).filter((i) => i.id !== id);
  localStorage.setItem(SI_KEY(uid), JSON.stringify(list));
  pushSelfIntrosRemote(uid, list).catch(() => {});
  return list;
}

export const SELF_INTRO_PURPOSES: { id: string; label: string }[] = [
  { id: "university", label: "უნივერსიტეტისთვის" },
  { id: "interview", label: "გასაუბრებისთვის" },
  { id: "networking", label: "Networking-ისთვის" },
  { id: "freelance", label: "Freelance / client communication-ისთვის" },
  { id: "presentation", label: "პრეზენტაციის დასაწყებად" },
  { id: "general", label: "ზოგადი პროფესიონალური წარდგენისთვის" },
];

export const SELF_INTRO_STATUSES: { id: string; label: string }[] = [
  { id: "student", label: "სტუდენტი" },
  { id: "graduate", label: "კურსდამთავრებული" },
  { id: "job_seeker", label: "სამსახურის მაძიებელი" },
  { id: "employed", label: "დასაქმებული" },
  { id: "freelancer", label: "ფრილანსერი" },
  { id: "other", label: "სხვა" },
];