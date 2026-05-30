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
  pushBusinessRemote(uid, next).catch(() => {});
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
      const merged: BusinessState = { ...empty(), ...remoteState };
      localStorage.setItem(KEY(uid), JSON.stringify(merged));
      const intros = Array.isArray(data.self_intros)
        ? (data.self_intros as unknown as SavedSelfIntro[])
        : [];
      localStorage.setItem(SI_KEY(uid), JSON.stringify(intros));
      return merged;
    }
  } catch {
    // fall through to local cache
  }
  return loadBusiness(uid);
}

// --- Labels (Georgian) ---

export const GOAL_LABELS: Record<BusinessGoal, string> = {
  university: "უნივერსიტეტისთვის / ბიზნესის სწავლისთვის",
  job_interview: "გასაუბრებისთვის",
  work_communication: "სამსახურისთვის / სამუშაო კომუნიკაციისთვის",
  remote_work: "ფრილანსისთვის / remote work-ისთვის",
  emails_writing: "იმეილებისა და პროფესიული წერისთვის",
  
  business_vocab: "ბიზნეს ლექსიკის გასაუმჯობესებლად",
  general_business: "ზოგადი ბიზნეს ინგლისურისთვის",
};

export const PRIORITY_LABELS: Record<BusinessPriority, string> = {
  university: "უნივერსიტეტი / ბიზნესის სწავლა",
  job_interview: "გასაუბრება",
  work_communication: "სამუშაო კომუნიკაცია",
  remote_work: "ფრილანსი / remote work",
  emails_writing: "იმეილები და პროფესიული წერა",
  
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

export type BusinessModule = {
  slug: string;
  title: string;
  description: string;
  icon: string;
};

export const BUSINESS_MODULES: BusinessModule[] = [
  {
    slug: "interview",
    title: "გასაუბრება",
    description: "ივარჯიშე გავრცელებულ კითხვებზე და გააუმჯობესე პასუხები.",
    icon: "🤝",
  },
  {
    slug: "emails",
    title: "იმეილები და პროფესიული წერა",
    description: "დაწერე უფრო სწორი, თავაზიანი და პროფესიული იმეილები.",
    icon: "📨",
  },
  {
    slug: "meetings",
    title: "შეხვედრები და სამუშაო კომუნიკაცია",
    description: "ისწავლე როგორ გამოთქვა აზრი, დასვა კითხვა და ჩაერთო სამუშაო საუბარში.",
    icon: "🗓️",
  },
  {
    slug: "presentations",
    title: "პრეზენტაციები",
    description: "ივარჯიშე იდეების, მონაცემების და ბიზნეს თემების ახსნაში.",
    icon: "📊",
  },
  {
    slug: "vocabulary",
    title: "ბიზნეს ლექსიკა",
    description: "ისწავლე სიტყვები მაგალითებით, ქართული ახსნებით და პრაქტიკით.",
    icon: "📚",
  },
];

// Map main priority -> recommended module
const PRIORITY_TO_MODULE: Record<BusinessPriority, string> = {
  university: "presentations",
  job_interview: "interview",
  work_communication: "meetings",
  remote_work: "emails",
  emails_writing: "emails",
  presentations: "presentations",
  business_vocab: "vocabulary",
  general_business: "interview",
};

const WEEKLY_FOCUS: Record<BusinessPriority, string[]> = {
  university: [
    "ბიზნეს ლექსიკის საფუძვლები",
    "პრეზენტაციის ფრაზები",
    "დიაგრამებისა და მონაცემების ახსნა",
    "case study discussion phrases",
    "academic/business writing",
  ],
  job_interview: [
    "პროფესიული წარდგენა",
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
  presentations: [
    "გახსნა და დასკვნა",
    "მონაცემების ახსნა",
    "ვიზუალის აღწერა",
    "კითხვებზე პასუხი",
    "Q&A ფრაზები",
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
  { id: "general", label: "ზოგადი პროფესიული წარდგენისთვის" },
];

export const SELF_INTRO_STATUSES: { id: string; label: string }[] = [
  { id: "student", label: "სტუდენტი" },
  { id: "graduate", label: "კურსდამთავრებული" },
  { id: "job_seeker", label: "სამსახურის მაძიებელი" },
  { id: "employed", label: "დასაქმებული" },
  { id: "freelancer", label: "ფრილანსერი" },
  { id: "other", label: "სხვა" },
];
