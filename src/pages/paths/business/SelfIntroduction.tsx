import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";
import {
  BusinessLevel,
  loadBusiness,
  saveBusiness,
  loadSelfIntros,
  saveSelfIntro,
  deleteSelfIntro,
  SavedSelfIntro,
  SelfIntroInputs,
  SelfIntroVersion,
  SelfIntroPhrase,
  SELF_INTRO_PURPOSES,
  SELF_INTRO_STATUSES,
} from "./lib/state";

type GenResult = {
  short: SelfIntroVersion;
  standard: SelfIntroVersion;
  polished: SelfIntroVersion;
  phrases: SelfIntroPhrase[];
};

const emptyInputs: SelfIntroInputs = {
  purpose: "", name: "", status: "", field: "", experience: "", skills: "", goal: "",
};

const TOTAL_STEPS = 7;

// ---------- Level helpers ----------
type LevelTier = "beginner" | "elementary" | "intermediate" | "advanced";
function tierOf(l?: BusinessLevel | null): LevelTier {
  if (l === "business_beginner") return "beginner";
  if (l === "business_elementary") return "elementary";
  if (l === "business_advanced") return "advanced";
  return "intermediate";
}

// Structure lesson texts per tier
const STRUCTURE_PARTS = [
  { en: "Name", ka: "სახელი", exEn: "My name is Nino.", exKa: "მე მქვია ნინო." },
  { en: "Current status", ka: "ვინ ხარ ახლა", exEn: "I am a Business Administration student.", exKa: "მე ვარ ბიზნეს ადმინისტრირების სტუდენტი." },
  { en: "Field / background", ka: "სფერო ან ბექგრაუნდი", exEn: "I study marketing and management.", exKa: "ვსწავლობ მარკეტინგსა და მენეჯმენტს." },
  { en: "Skills or interests", ka: "უნარები ან ინტერესები", exEn: "I am interested in customer communication.", exKa: "მე მაინტერესებს მომხმარებელთან კომუნიკაცია." },
  { en: "Goal", ka: "მიზანი", exEn: "I want to improve my professional English.", exKa: "მინდა გავიუმჯობესო პროფესიული ინგლისური." },
];

// Examples per purpose & tier
type Example = { en: string; ka: string; note?: string };
const EXAMPLES: Record<string, Record<LevelTier, Example>> = {
  university: {
    beginner: { en: "Hi, my name is Nino. I am a Business Administration student. I am interested in marketing.", ka: "გამარჯობა, მე მქვია ნინო. ვარ ბიზნეს ადმინისტრირების სტუდენტი. მაინტერესებს მარკეტინგი." },
    elementary: { en: "Hello, I'm Nino. I study Business Administration and I'm interested in marketing and customer communication.", ka: "გამარჯობა, მე ვარ ნინო. ვსწავლობ ბიზნეს ადმინისტრირებას და მაინტერესებს მარკეტინგი და კომუნიკაცია." },
    intermediate: { en: "Hi, I'm Nino, a Business Administration student focusing on marketing. I enjoy learning how brands communicate with customers.", ka: "გამარჯობა, ნინო ვარ, ბიზნეს ადმინისტრირების სტუდენტი მარკეტინგის მიმართულებით." },
    advanced: { en: "Hi, I'm Nino — a Business Administration student with a focus on marketing and consumer behavior. I'm exploring how data-driven decisions shape brand strategy.", ka: "გამარჯობა, ნინო ვარ — ბიზნეს ადმინისტრირების სტუდენტი მარკეტინგისა და მომხმარებლის ქცევის მიმართულებით.", note: "Tone: confident, specific." },
  },
  interview: {
    beginner: { en: "My name is Nino. I have one year of customer service experience. I want to work in your team.", ka: "მე მქვია ნინო. მაქვს ერთი წლის გამოცდილება customer service-ში. მინდა ვიმუშაო თქვენს გუნდში." },
    elementary: { en: "I'm Nino. I have one year of customer service experience and good communication skills. I'd like to grow in a professional team.", ka: "ნინო ვარ. მაქვს 1 წლის გამოცდილება customer service-ში და კარგი კომუნიკაცია. მინდა გავიზარდო პროფესიულ გუნდში." },
    intermediate: { en: "I'm Nino. For the past year I've worked in customer service, where I learned how to handle clients calmly and clearly. I'm looking for a role where I can grow.", ka: "ნინო ვარ. ბოლო ერთი წელია ვმუშაობ customer service-ში — ვისწავლე კლიენტებთან მუშაობა მშვიდად და ნათლად." },
    advanced: { en: "I'm Nino. Over the past year in customer service I learned how to stay calm under pressure and turn difficult conversations into solutions. I'm now looking for a role where I can take more ownership.", ka: "ნინო ვარ. ერთი წლის განმავლობაში customer service-ში ვისწავლე როგორ მოვაგვარო რთული საუბრები.", note: "Tone: calm, ownership-focused." },
  },
  networking: {
    beginner: { en: "Hi, I'm Nino. I work in marketing. Nice to meet you.", ka: "გამარჯობა, ნინო ვარ. ვმუშაობ მარკეტინგში. სასიამოვნოა." },
    elementary: { en: "Hi, I'm Nino. I work in marketing and I'm here to meet people from the same field.", ka: "გამარჯობა, ნინო ვარ. ვმუშაობ მარკეტინგში და მინდა გავიცნო იგივე სფეროს ხალხი." },
    intermediate: { en: "Hi, I'm Nino — I work in marketing, mostly on social campaigns. I'm here to meet people working on similar challenges.", ka: "გამარჯობა, ნინო ვარ — ვმუშაობ მარკეტინგში, ძირითადად სოციალურ კამპანიებზე." },
    advanced: { en: "Hi, I'm Nino. I lead social campaigns at a small marketing team. Always curious to hear how others approach audience growth.", ka: "გამარჯობა, ნინო ვარ. ვუძღვები სოციალურ კამპანიებს მცირე მარკეტინგ გუნდში.", note: "Tone: open, curious." },
  },
  freelance: {
    beginner: { en: "Hi, I'm Nino. I am a freelance designer. I work with small companies.", ka: "გამარჯობა, ნინო ვარ. ვარ ფრილანსერი დიზაინერი. ვმუშაობ პატარა კომპანიებთან." },
    elementary: { en: "Hi, I'm Nino. I'm a freelance designer and I help small businesses with branding and visuals.", ka: "გამარჯობა, ნინო ვარ. ვარ ფრილანსერი დიზაინერი, ვეხმარები პატარა ბიზნესებს ბრენდინგსა და ვიზუალში." },
    intermediate: { en: "Hi, I'm Nino — a freelance designer who helps small businesses build a clear brand and clean visuals.", ka: "გამარჯობა, ნინო ვარ — ფრილანსერი დიზაინერი, რომელიც ეხმარება პატარა ბიზნესებს მკაფიო ბრენდის შექმნაში." },
    advanced: { en: "Hi, I'm Nino. I work with early-stage teams as a freelance designer — usually on brand identity and product visuals that need to ship fast.", ka: "გამარჯობა, ნინო ვარ. ვმუშაობ ადრეული ეტაპის გუნდებთან ფრილანს დიზაინერად — ძირითადად ბრენდსა და პროდუქტ-ვიზუალზე.", note: "Tone: specific, outcome-driven." },
  },
  presentation: {
    beginner: { en: "Hello everyone. My name is Nino. Today I will talk about our project.", ka: "გამარჯობა ყველას. მე მქვია ნინო. დღეს ვისაუბრებ ჩვენს პროექტზე." },
    elementary: { en: "Hello everyone, I'm Nino. Today I'd like to share a short update about our project.", ka: "გამარჯობა ყველას, ნინო ვარ. დღეს მოკლედ გავაცნობ ჩვენი პროექტის სტატუსს." },
    intermediate: { en: "Good morning, everyone. I'm Nino, and today I'd like to walk you through what our team has been working on this month.", ka: "გამარჯობა ყველას. ნინო ვარ — დღეს გაჩვენებთ რაზე მუშაობდა ჩვენი გუნდი ამ თვეში." },
    advanced: { en: "Good morning. I'm Nino. In the next ten minutes I'll walk you through our progress, the key decisions we made, and what we need from this room.", ka: "გამარჯობა. ნინო ვარ. შემდეგი 10 წუთის განმავლობაში გაჩვენებთ პროგრესს, მნიშვნელოვან გადაწყვეტილებებსა და რა გვჭირდება თქვენგან.", note: "Tone: clear agenda upfront." },
  },
  general: {
    beginner: { en: "Hi, I'm Nino. I work in marketing. I want to learn more English for my job.", ka: "გამარჯობა, ნინო ვარ. ვმუშაობ მარკეტინგში. მინდა ვისწავლო მეტი ინგლისური სამსახურისთვის." },
    elementary: { en: "Hi, I'm Nino. I work in marketing and I'm improving my English to communicate better at work.", ka: "გამარჯობა, ნინო ვარ. ვმუშაობ მარკეტინგში და ვიუმჯობესებ ინგლისურს სამსახურისთვის." },
    intermediate: { en: "Hi, I'm Nino. I work in marketing and I'm focused on building stronger professional English for daily work and emails.", ka: "გამარჯობა, ნინო ვარ. ვმუშაობ მარკეტინგში და ვაუმჯობესებ პროფესიულ ინგლისურს ყოველდღიური სამუშაოსთვის." },
    advanced: { en: "Hi, I'm Nino — I work in marketing and I'm sharpening my professional English to communicate more clearly in meetings and writing.", ka: "გამარჯობა, ნინო ვარ — ვმუშაობ მარკეტინგში და ვაუმჯობესებ ინგლისურს შეხვედრებსა და წერაში.", note: "Tone: concise, professional." },
  },
};

// Mini practice exercises (level-aware count via slice)
type Exercise =
  | { kind: "fill"; prompt: string; promptKa: string; answer: string; hintKa: string }
  | { kind: "choice"; prompt: string; promptKa: string; options: string[]; correct: number; hintKa?: string }
  | { kind: "order"; prompt: string; promptKa: string; words: string[]; answer: string };

const EXERCISES: Exercise[] = [
  { kind: "fill", prompt: "My name ___ Nino.", promptKa: "ჩაწერე გამოტოვებული სიტყვა.", answer: "is", hintKa: "to be ფორმა" },
  { kind: "choice", prompt: "Which is more professional?", promptKa: "რომელია უფრო პროფესიული?",
    options: ["I wanna work here.", "I'd like to work here.", "Gimme this job."], correct: 1 },
  { kind: "fill", prompt: "I am interested ___ marketing.", promptKa: "ჩაწერე სწორი წინდებული.", answer: "in", hintKa: "interested + ?" },
  { kind: "order", prompt: "Put the words in order:", promptKa: "დაალაგე სიტყვები სწორი თანმიმდევრობით.",
    words: ["a", "I", "student", "am"], answer: "I am a student" },
  { kind: "choice", prompt: "Best opening for a job interview?", promptKa: "გასაუბრების საუკეთესო გახსნა?",
    options: ["Yo, what's up.", "Hi, I'm Nino — thanks for taking the time to meet me.", "Hello, listen..."], correct: 1 },
];

// ---------- Main ----------
export default function SelfIntroduction() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<number>(0);
  const [inputs, setInputs] = useState<SelfIntroInputs>(emptyInputs);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenResult | null>(null);
  const [selected, setSelected] = useState<"short" | "standard" | "polished">("standard");
  const [saved, setSaved] = useState<SavedSelfIntro[]>([]);
  const [rewriting, setRewriting] = useState<string | null>(null);

  useEffect(() => { if (user) setSaved(loadSelfIntros(user.id)); }, [user]);

  const biz = useMemo(() => (user ? loadBusiness(user.id) : null), [user]);
  const tier = tierOf(biz?.level);
  const isBeginner = tier === "beginner";
  const isElementary = tier === "elementary";
  const isAdvanced = tier === "advanced";

  const canGenerate =
    inputs.name.trim() && inputs.status && inputs.field.trim() && inputs.skills.trim() && inputs.goal.trim();

  const set = (k: keyof SelfIntroInputs, v: string) => setInputs((p) => ({ ...p, [k]: v }));

  const generate = async () => {
    if (!canGenerate) { toast.error("შეავსე ყველა აუცილებელი ველი"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("business-self-intro", {
        body: { ...inputs, level: biz?.level || "business_intermediate",
          businessPriority: biz?.mainPriority || "general_business", variant: "all" },
      });
      if (error) throw error;
      if (!data?.short || !data?.standard || !data?.polished) throw new Error("AI-მ ვერ დააბრუნა სრული პასუხი. სცადე ისევ.");
      setResult({ short: data.short, standard: data.standard, polished: data.polished,
        phrases: Array.isArray(data.phrases) ? data.phrases : [] });
      setSelected(isBeginner ? "short" : isAdvanced ? "polished" : "standard");
      setStep(4);
    } catch (e: any) { toast.error(e?.message || "გენერაცია ვერ მოხერხდა"); }
    finally { setLoading(false); }
  };

  const rewrite = async (which: "short" | "standard" | "polished",
    variant: "shorter" | "simpler" | "more_professional" | "improve") => {
    if (!result) return;
    setRewriting(`${which}:${variant}`);
    try {
      const { data, error } = await supabase.functions.invoke("business-self-intro", {
        body: { ...inputs, level: biz?.level, businessPriority: biz?.mainPriority,
          variant, baseText: result[which].en },
      });
      if (error) throw error;
      if (!data?.en) throw new Error("AI-მ ვერ დააბრუნა პასუხი");
      setResult({ ...result, [which]: { en: data.en, ka: data.ka || "" } });
    } catch (e: any) { toast.error(e?.message || "ვერ მოხერხდა"); }
    finally { setRewriting(null); }
  };

  const saveCurrent = () => {
    if (!user || !result) return;
    const item: SavedSelfIntro = {
      id: crypto.randomUUID(), createdAt: new Date().toISOString(), inputs,
      short: result.short, standard: result.standard, polished: result.polished,
      phrases: result.phrases, selected, practicedAt: null,
    };
    const list = saveSelfIntro(user.id, item);
    setSaved(list);
    toast.success("შენახულია");
    setStep(7);
  };

  const speak = (text: string) => {
    try { const u = new SpeechSynthesisUtterance(text); u.lang = "en-US"; u.rate = 0.95;
      window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch {}
  };
  const copyText = async (t: string) => { try { await navigator.clipboard.writeText(t); toast.success("დაკოპირდა"); } catch {} };
  const markPracticed = (id: string) => {
    if (!user) return;
    const list = loadSelfIntros(user.id);
    const item = list.find((i) => i.id === id);
    if (!item) return;
    item.practicedAt = new Date().toISOString();
    saveSelfIntro(user.id, item);
    setSaved(loadSelfIntros(user.id));
    toast.success("აღინიშნა");
  };

  const STEP_LABELS = [
    "სტრუქტურა", "მაგალითები", "შენი ინფო", "შედეგი", "ფრაზები & პრაქტიკა", "შენახვა", "დასრულება"
  ];

  return (
    <BusinessShell back={{ to: "/path/business/home", label: "Business Dashboard" }}>
      <div className="mb-4">
        <h1 className="ka text-2xl font-bold text-[#1E2A44]">პროფესიული წარდგენა</h1>
        <p className="ka text-xs text-[#5B6473] mt-1">
          ნაბიჯ-ნაბიჯ ისწავლე როგორ წარადგინო თავი ინგლისურად.
          {biz?.level && <span className="ml-1">• დონე: <span className="font-semibold text-[#1E2A44]">{biz.level.replace("business_", "")}</span></span>}
        </p>
      </div>

      {/* Progress */}
      <div className="mb-5">
        <div className="flex items-center gap-1">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${step >= i + 1 ? "bg-[#1E2A44]" : "bg-[#E7E2D5]"}`} />
          ))}
        </div>
        <p className="ka text-[11px] text-[#5B6473] mt-2">ნაბიჯი {step} / {TOTAL_STEPS} — {STEP_LABELS[step - 1]}</p>
      </div>

      {/* STEP 1: Structure */}
      {step === 1 && (
        <BizCard className="mb-4">
          <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">ნაბიჯი 1</p>
          <h2 className="ka text-lg font-bold text-[#1E2A44] mt-1">როგორ ავაწყოთ პროფესიული წარდგენა?</h2>
          <p className="ka text-sm text-[#374151] mt-3">
            {isBeginner || isElementary
              ? "კარგი წარდგენა მოკლეა და მკაფიო. ის შედგება 5 ნაწილისგან. ჯერ წავიკითხოთ თითოეული."
              : isAdvanced
              ? "A strong self-introduction is short, specific, and confident. It usually covers 5 parts:"
              : "კარგი წარდგენა ხშირად შედგება 5 ნაწილისგან — სახელი, სტატუსი, სფერო, უნარები და მიზანი."}
          </p>
          <ol className="mt-4 space-y-3">
            {STRUCTURE_PARTS.map((p, i) => (
              <li key={i} className="p-3 rounded-lg bg-[#FAF7F0] border border-[#E7E2D5]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="ka text-xs font-bold text-[#1E2A44]">{i + 1}. {p.ka} <span className="text-[#5B6473] font-normal">({p.en})</span></p>
                    <p className="text-sm text-[#1E2A44] mt-1.5">{p.exEn}</p>
                    {(isBeginner || isElementary) && <p className="ka text-xs text-[#5B6473] mt-1">{p.exKa}</p>}
                  </div>
                  <button onClick={() => speak(p.exEn)} className="text-xs px-2 py-1 rounded border border-[#E7E2D5]">🔊</button>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex justify-end">
            <BizButton onClick={() => setStep(2)}>გაგრძელება</BizButton>
          </div>
        </BizCard>
      )}

      {/* STEP 2: Purpose + Examples */}
      {step === 2 && (
        <BizCard className="mb-4">
          <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">ნაბიჯი 2</p>
          <h2 className="ka text-lg font-bold text-[#1E2A44] mt-1">აირჩიე მიზანი და ნახე მაგალითი</h2>
          <p className="ka text-xs text-[#5B6473] mt-1">სხვადასხვა სიტუაცია — სხვადასხვა ტონი.</p>

          <div className="grid gap-2 mt-4">
            {SELF_INTRO_PURPOSES.map((p) => (
              <button key={p.id} onClick={() => set("purpose", p.id)}
                className={`ka text-left px-4 py-2.5 rounded-xl border text-sm transition-all ${
                  inputs.purpose === p.id
                    ? "border-[#1E2A44] bg-[#1E2A44]/5 text-[#1E2A44] font-semibold"
                    : "border-[#E7E2D5] hover:border-[#1E2A44]/40 text-[#374151]"
                }`}>{p.label}</button>
            ))}
          </div>

          {inputs.purpose && EXAMPLES[inputs.purpose] && (
            <div className="mt-5 p-4 rounded-xl bg-[#FAF7F0] border border-[#E7E2D5]">
              <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold mb-2">
                მაგალითი შენი დონისთვის
              </p>
              <p className="text-sm text-[#1E2A44] leading-relaxed">{EXAMPLES[inputs.purpose][tier].en}</p>
              {(isBeginner || isElementary) && (
                <p className="ka text-xs text-[#5B6473] mt-2">{EXAMPLES[inputs.purpose][tier].ka}</p>
              )}
              {isAdvanced && EXAMPLES[inputs.purpose][tier].note && (
                <p className="ka text-[11px] text-[#5B6473] mt-2 italic">{EXAMPLES[inputs.purpose][tier].note}</p>
              )}
              <button onClick={() => speak(EXAMPLES[inputs.purpose][tier].en)}
                className="mt-3 text-xs px-3 py-1.5 rounded-lg border border-[#E7E2D5]">🔊 მოსმენა</button>
            </div>
          )}

          <div className="mt-5 flex justify-between">
            <BizButton variant="ghost" onClick={() => setStep(1)}>უკან</BizButton>
            <BizButton onClick={() => setStep(3)} disabled={!inputs.purpose}>გაგრძელება</BizButton>
          </div>
        </BizCard>
      )}

      {/* STEP 3: Build (info) */}
      {step === 3 && (
        <BizCard className="mb-4">
          <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">ნაბიჯი 3</p>
          <h2 className="ka text-lg font-bold text-[#1E2A44] mt-1">ააწყე შენი წარდგენა</h2>
          {(isBeginner || isElementary) && (
            <p className="ka text-xs text-[#5B6473] mt-1">შეავსე მოკლედ. AI შემდეგ შენთვის ააწყობს.</p>
          )}

          <div className="mt-4 space-y-4">
            <Field label="რა გქვია?">
              <input value={inputs.name} onChange={(e) => set("name", e.target.value)} placeholder="Nino" className={inputCls}/>
            </Field>
            <Field label="რომელი აღწერს შენს მდგომარეობას?">
              <div className="grid grid-cols-2 gap-2">
                {SELF_INTRO_STATUSES.map((s) => (
                  <button key={s.id} onClick={() => set("status", s.id)}
                    className={`ka text-xs px-3 py-2 rounded-lg border ${
                      inputs.status === s.id
                        ? "border-[#1E2A44] bg-[#1E2A44]/5 text-[#1E2A44] font-semibold"
                        : "border-[#E7E2D5] text-[#374151]"}`}>{s.label}</button>
                ))}
              </div>
            </Field>
            <Field label="რომელ სფეროში სწავლობ ან მუშაობ?">
              <input value={inputs.field} onChange={(e) => set("field", e.target.value)}
                placeholder="Business Administration, Marketing, Finance..." className={inputCls}/>
            </Field>
            <Field label="რა გამოცდილება გაქვს? თუ არ გაქვს, დაწერე 'გამოცდილება არ მაქვს'.">
              <textarea value={inputs.experience} onChange={(e) => set("experience", e.target.value)}
                rows={2} placeholder="2 წელი customer service-ში... ან 'გამოცდილება არ მაქვს'" className={inputCls}/>
            </Field>
            <Field label="რომელი უნარები გინდა ახსენო?">
              <input value={inputs.skills} onChange={(e) => set("skills", e.target.value)}
                placeholder="communication, teamwork, organization" className={inputCls}/>
            </Field>
            <Field label="რა არის შენი მიზანი?">
              <input value={inputs.goal} onChange={(e) => set("goal", e.target.value)}
                placeholder="get an internship / prepare for interview" className={inputCls}/>
            </Field>
          </div>

          <div className="mt-5 flex justify-between">
            <BizButton variant="ghost" onClick={() => setStep(2)}>უკან</BizButton>
            <BizButton onClick={generate} disabled={!canGenerate || loading}>
              {loading ? "იქმნება..." : "წარდგენის შექმნა"}
            </BizButton>
          </div>
        </BizCard>
      )}

      {/* STEP 4: Result versions */}
      {step === 4 && result && (
        <div className="space-y-4">
          {(["short", "standard", "polished"] as const).map((v) => (
            <VersionCard key={v}
              label={v === "short" ? "Short — 20-30 წამი" : v === "standard" ? "Standard — 45-60 წამი" : "Polished — პროფესიული"}
              version={result[v]} isSelected={selected === v} onSelect={() => setSelected(v)}
              onSpeak={() => speak(result[v].en)} onCopy={() => copyText(result[v].en)}
              onRewrite={(mode) => rewrite(v, mode)} rewritingKey={rewriting} vKey={v}
              showKa={isBeginner || isElementary}/>
          ))}
          <div className="flex justify-between">
            <BizButton variant="ghost" onClick={() => setStep(3)}>უკან</BizButton>
            <BizButton onClick={() => setStep(5)}>გაგრძელება — ფრაზები</BizButton>
          </div>
        </div>
      )}

      {/* STEP 5: Phrases + Practice exercises */}
      {step === 5 && result && (
        <div className="space-y-4">
          {result.phrases.length > 0 && (
            <BizCard>
              <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">სასარგებლო ფრაზები</p>
              <p className="ka text-xs text-[#5B6473] mt-1">
                {isBeginner ? "თითოეული ფრაზა ქართულად აგიხსნი." : "ფრაზები რომლებიც სხვა სიტუაციაშიც გამოგადგება."}
              </p>
              <div className="mt-3 space-y-3">
                {result.phrases.map((p, i) => (
                  <div key={i} className="p-3 rounded-lg bg-[#FAF7F0] border border-[#E7E2D5]">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-[#1E2A44] text-sm">{p.en}</p>
                      <button onClick={() => speak(p.en)} className="text-xs px-2 py-1 rounded border border-[#E7E2D5]">🔊</button>
                    </div>
                    <p className="ka text-xs text-[#5B6473] mt-1">{p.ka}</p>
                    <p className="ka text-xs text-[#374151] mt-2">{p.explanationKa}</p>
                    {p.exampleEn && (
                      <div className="mt-2 pt-2 border-t border-[#E7E2D5]">
                        <p className="text-xs text-[#1E2A44]">{p.exampleEn}</p>
                        {(isBeginner || isElementary) && <p className="ka text-xs text-[#5B6473] mt-0.5">{p.exampleKa}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </BizCard>
          )}

          <PracticeExercises tier={tier} />

          <div className="flex justify-between">
            <BizButton variant="ghost" onClick={() => setStep(4)}>უკან</BizButton>
            <BizButton onClick={() => setStep(6)}>გაგრძელება — შენახვა</BizButton>
          </div>
        </div>
      )}

      {/* STEP 6: Save */}
      {step === 6 && result && (
        <BizCard className="mb-4">
          <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">ნაბიჯი 6 — შენახვა</p>
          <h2 className="ka text-lg font-bold text-[#1E2A44] mt-1">აირჩიე და შეინახე საბოლოო ვერსია</h2>
          <div className="mt-4 grid gap-2">
            {(["short", "standard", "polished"] as const).map((v) => (
              <button key={v} onClick={() => setSelected(v)}
                className={`text-left px-4 py-3 rounded-xl border text-sm ${
                  selected === v ? "border-[#1E2A44] bg-[#1E2A44]/5" : "border-[#E7E2D5]"}`}>
                <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">{v}</p>
                <p className="text-sm text-[#1E2A44] mt-1">{result[v].en}</p>
              </button>
            ))}
          </div>
          <div className="mt-5 flex justify-between">
            <BizButton variant="ghost" onClick={() => setStep(5)}>უკან</BizButton>
            <BizButton onClick={saveCurrent}>შენახვა და დასრულება</BizButton>
          </div>
        </BizCard>
      )}

      {/* STEP 7: Complete */}
      {step === 7 && (
        <BizCard className="mb-4 text-center">
          <div className="text-3xl">✓</div>
          <h2 className="ka text-xl font-bold text-[#1E2A44] mt-2">მოდული დასრულდა</h2>
          <p className="ka text-sm text-[#5B6473] mt-2">
            შენი წარდგენა შენახულია. წაიკითხე ხმამაღლა მინიმუმ 3-ჯერ — ეს ყველაზე კარგი პრაქტიკაა.
          </p>
          <div className="mt-5 flex gap-2 justify-center flex-wrap">
            <BizButton variant="outline" onClick={() => { setStep(1); setResult(null); setInputs(emptyInputs); }}>
              ხელახლა
            </BizButton>
            <Link to="/path/business/home"><BizButton>Dashboard-ზე დაბრუნება</BizButton></Link>
          </div>
        </BizCard>
      )}

      {/* SAVED LIST */}
      {saved.length > 0 && (
        <div className="mt-8">
          <h2 className="ka text-base font-bold text-[#1E2A44] mb-3">ჩემი შენახული წარდგენა</h2>
          <div className="space-y-3">
            {saved.map((s) => {
              const v = s[s.selected];
              return (
                <BizCard key={s.id}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="ka text-[11px] text-[#5B6473]">{new Date(s.createdAt).toLocaleDateString()} · {s.selected}</p>
                      <p className="ka text-xs text-[#1E2A44] mt-0.5 font-semibold">
                        {SELF_INTRO_PURPOSES.find((p) => p.id === s.inputs.purpose)?.label || "—"}
                      </p>
                    </div>
                    <button onClick={() => { if (user) { deleteSelfIntro(user.id, s.id); setSaved(loadSelfIntros(user.id)); } }}
                      className="text-xs text-[#B91C1C] hover:underline">წაშლა</button>
                  </div>
                  <p className="text-sm text-[#1E2A44] mt-3 leading-relaxed">{v.en}</p>
                  <p className="ka text-xs text-[#5B6473] mt-2">{v.ka}</p>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <button onClick={() => speak(v.en)} className="text-xs px-3 py-1.5 rounded-lg border border-[#E7E2D5]">🔊 მოსმენა</button>
                    <button onClick={() => copyText(v.en)} className="text-xs px-3 py-1.5 rounded-lg border border-[#E7E2D5]">კოპირება</button>
                    <button onClick={() => markPracticed(s.id)} className="text-xs px-3 py-1.5 rounded-lg border border-[#E7E2D5]">I practiced</button>
                  </div>
                  {s.practicedAt && (
                    <p className="ka text-[10px] text-[#5B6473] mt-2">ბოლო ვარჯიში: {new Date(s.practicedAt).toLocaleDateString()}</p>
                  )}
                </BizCard>
              );
            })}
          </div>
        </div>
      )}
    </BusinessShell>
  );
}

// ---------- subcomponents ----------
const inputCls = "w-full px-3 py-2 rounded-lg border border-[#E7E2D5] text-sm outline-none focus:border-[#1E2A44] bg-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="ka block text-xs font-semibold text-[#1E2A44] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function VersionCard({
  label, version, isSelected, onSelect, onSpeak, onCopy, onRewrite, rewritingKey, vKey, showKa,
}: {
  label: string; version: SelfIntroVersion; isSelected: boolean;
  onSelect: () => void; onSpeak: () => void; onCopy: () => void;
  onRewrite: (mode: "shorter" | "simpler" | "more_professional" | "improve") => void;
  rewritingKey: string | null; vKey: string; showKa: boolean;
}) {
  const busy = (m: string) => rewritingKey === `${vKey}:${m}`;
  return (
    <BizCard className={isSelected ? "border-[#1E2A44]/40 ring-1 ring-[#1E2A44]/10" : ""}>
      <div className="flex items-center justify-between gap-2">
        <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">{label}</p>
        <button onClick={onSelect}
          className={`ka text-[11px] px-2.5 py-1 rounded-full border ${
            isSelected ? "bg-[#1E2A44] text-white border-[#1E2A44]" : "border-[#E7E2D5] text-[#1E2A44]"}`}>
          {isSelected ? "არჩეული" : "Use this"}
        </button>
      </div>
      <p className="text-sm text-[#1E2A44] mt-3 leading-relaxed">{version.en}</p>
      {showKa && <p className="ka text-xs text-[#5B6473] mt-2">{version.ka}</p>}
      <div className="mt-3 flex gap-1.5 flex-wrap">
        <ChipBtn onClick={onSpeak}>🔊</ChipBtn>
        <ChipBtn onClick={onCopy}>კოპირება</ChipBtn>
        <ChipBtn onClick={() => onRewrite("improve")} loading={busy("improve")}>Improve</ChipBtn>
        <ChipBtn onClick={() => onRewrite("simpler")} loading={busy("simpler")}>Simpler</ChipBtn>
        <ChipBtn onClick={() => onRewrite("more_professional")} loading={busy("more_professional")}>More pro</ChipBtn>
        <ChipBtn onClick={() => onRewrite("shorter")} loading={busy("shorter")}>Shorter</ChipBtn>
      </div>
    </BizCard>
  );
}

function ChipBtn({ children, onClick, loading }: { children: React.ReactNode; onClick: () => void; loading?: boolean }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="text-[11px] px-2.5 py-1.5 rounded-lg border border-[#E7E2D5] text-[#1E2A44] hover:bg-[#1E2A44]/5 disabled:opacity-50">
      {loading ? "..." : children}
    </button>
  );
}

function PracticeExercises({ tier }: { tier: LevelTier }) {
  // Beginner: 3 simple, intermediate: 4, advanced: all 5
  const count = tier === "beginner" ? 3 : tier === "advanced" ? 5 : 4;
  const list = EXERCISES.slice(0, count);
  return (
    <BizCard>
      <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">მინი ვარჯიში</p>
      <p className="ka text-xs text-[#5B6473] mt-1">გაიარე ეს მცირე სავარჯიშოები — ეხმარება დამახსოვრებას.</p>
      <div className="mt-3 space-y-3">
        {list.map((ex, i) => <ExerciseItem key={i} ex={ex} idx={i + 1} />)}
      </div>
    </BizCard>
  );
}

function ExerciseItem({ ex, idx }: { ex: Exercise; idx: number }) {
  const [val, setVal] = useState("");
  const [pick, setPick] = useState<number | null>(null);
  const [checked, setChecked] = useState<null | boolean>(null);

  const check = () => {
    if (ex.kind === "choice") setChecked(pick === ex.correct);
    else if (ex.kind === "fill") setChecked(val.trim().toLowerCase() === ex.answer.toLowerCase());
    else setChecked(val.trim().toLowerCase().replace(/\s+/g, " ") === ex.answer.toLowerCase());
  };

  return (
    <div className="p-3 rounded-lg bg-[#FAF7F0] border border-[#E7E2D5]">
      <p className="ka text-[11px] text-[#5B6473]">{idx}. {ex.promptKa}</p>
      <p className="text-sm text-[#1E2A44] mt-1 font-medium">{ex.prompt}</p>

      {ex.kind === "choice" ? (
        <div className="mt-2 space-y-1.5">
          {ex.options.map((opt, i) => (
            <button key={i} onClick={() => { setPick(i); setChecked(null); }}
              className={`block w-full text-left text-xs px-3 py-2 rounded border ${
                pick === i ? "border-[#1E2A44] bg-white" : "border-[#E7E2D5] bg-white"}`}>
              {opt}
            </button>
          ))}
        </div>
      ) : ex.kind === "order" ? (
        <div className="mt-2">
          <p className="text-[11px] text-[#5B6473]">{ex.words.join(" · ")}</p>
          <input value={val} onChange={(e) => { setVal(e.target.value); setChecked(null); }}
            placeholder="Type the full sentence" className={`${inputCls} mt-2`} />
        </div>
      ) : (
        <input value={val} onChange={(e) => { setVal(e.target.value); setChecked(null); }}
          placeholder="Your answer" className={`${inputCls} mt-2`} />
      )}

      <div className="mt-2 flex items-center gap-2">
        <button onClick={check}
          className="text-[11px] px-3 py-1.5 rounded-lg border border-[#1E2A44] text-[#1E2A44]">შემოწმება</button>
        {checked === true && <span className="ka text-[11px] text-[#0F766E]">სწორია</span>}
        {checked === false && (
          <span className="ka text-[11px] text-[#B91C1C]">
            სცადე ისევ{("hintKa" in ex && ex.hintKa) ? ` — ${ex.hintKa}` : ""}
          </span>
        )}
      </div>
    </div>
  );
}
