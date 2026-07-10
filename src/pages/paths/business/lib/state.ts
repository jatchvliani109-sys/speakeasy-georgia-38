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

import { Briefcase, BookOpen, type LucideIcon } from "lucide-react";

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
  work_communication: "vocabulary",
  remote_work: "vocabulary",
  emails_writing: "vocabulary",
  business_vocab: "vocabulary",
  general_business: "interview",
};

// Map a priority -> one or more relevant modules (used for ordering & rotation).
export const PRIORITY_TO_MODULES: Record<BusinessPriority, string[]> = {
  university: ["interview", "vocabulary"],
  job_interview: ["interview", "vocabulary"],
  work_communication: ["vocabulary", "interview"],
  remote_work: ["vocabulary", "interview"],
  emails_writing: ["vocabulary"],
  business_vocab: ["vocabulary"],
  general_business: ["vocabulary", "interview"],
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
  const mod =
    BUSINESS_MODULES.find((m) => m.slug === moduleSlug) ||
    BUSINESS_MODULES.find((m) => m.slug === "vocabulary")!;
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