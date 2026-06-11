import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import {
  BusinessLevel,
  loadBusiness,
  saveBusiness,
  loadSelfIntros,
  saveSelfIntro,
  deleteSelfIntro,
  pullBusinessFromSupabase,
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

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      await pullBusinessFromSupabase(user.id);
      if (!cancelled) setSaved(loadSelfIntros(user.id));
      // Pre-fill from latest resume if user hasn't started typing yet
      const { data: resume } = await supabase
        .from("business_resumes")
        .select("full_name, job_title, industry, skills, years_of_experience")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || !resume) return;
      setInputs((prev) => {
        if (prev.name || prev.field || prev.skills || prev.experience) return prev;
        const skillsArr = Array.isArray(resume.skills) ? resume.skills : [];
        return {
          ...prev,
          name: prev.name || resume.full_name || "",
          field: prev.field || resume.industry || resume.job_title || "",
          experience: prev.experience || resume.years_of_experience || "",
          skills: prev.skills || skillsArr.join(", "),
        };
      });
    })();
    return () => { cancelled = true; };
  }, [user]);


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
          businessPriority: biz?.mainPriority?.[0] || "general_business", variant: "all" },
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
        body: { ...inputs, level: biz?.level, businessPriority: biz?.mainPriority?.[0],
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
    saveBusiness(user.id, { businessSelfIntroductionCompleted: true });
    toast.success("შენახულია");
    setStep(7);
  };

  // OpenAI TTS read-aloud (cleans Georgian + emojis server-side). Cached per session.
  const audioCache = useMemo(() => new Map<string, string>(), []);
  const speak = async (text: string) => {
    if (!text) return;
    try {
      let url = audioCache.get(text);
      if (!url) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(`${supabaseUrl}/functions/v1/openai-text-to-speech`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${anonKey}` },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) {
          if (res.status === 400) { toast.message("No English audio available"); return; }
          throw new Error("tts");
        }
        const blob = await res.blob();
        if (!blob.type.startsWith("audio/")) { toast.message("No English audio available"); return; }
        url = URL.createObjectURL(blob);
        audioCache.set(text, url);
      }
      const audio = new Audio(url);
      audio.playbackRate = 0.95;
      await audio.play();
    } catch {
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "en-US"; u.rate = 0.95;
        window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
      } catch {}
    }
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
        <p className="ka text-[11px] uppercase tracking-wider text-[#A84060] font-semibold">პირველი ნაბიჯი</p>
        <h1 className="ka text-2xl font-bold text-[#6B1E3E] mt-1">შენი პროფესიული წარდგენა</h1>
        <p className="ka text-xs text-[#6B6B6B] mt-1">
          ნაბიჯ-ნაბიჯ ისწავლე როგორ წარადგინო თავი ინგლისურად.
          {biz?.level && <span className="ml-1">• დონე: <span className="font-semibold text-[#6B1E3E]">{biz.level.replace("business_", "")}</span></span>}
        </p>
      </div>

      {/* Progress (hidden on intro step 0) */}
      {step >= 1 && (
        <div className="mb-5">
          <div className="flex items-center gap-1">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full ${step >= i + 1 ? "bg-[#6B1E3E]" : "bg-[#E8D5DA]"}`} />
            ))}
          </div>
          <p className="ka text-[11px] text-[#6B6B6B] mt-2">ნაბიჯი {step} / {TOTAL_STEPS} — {STEP_LABELS[step - 1]}</p>
        </div>
      )}

      {/* STEP 0: Friendly intro */}
      {step === 0 && (
        <BizCard className="mb-4">
          <h2 className="ka text-xl font-bold text-[#6B1E3E]">პირველი ნაბიჯი: პროფესიული წარდგენა</h2>
          <p className="ka text-sm text-[#1A1A1A] mt-2">
            სანამ ბიზნეს ინგლისურის გაკვეთილებზე გადავალთ, შევქმნათ შენი მოკლე და ძლიერი ინგლისური წარდგენა.
          </p>
          <div className="mt-4 space-y-2">
            <p className="ka text-sm text-[#6B1E3E]">
              პროფესიული წარდგენა დაგჭირდება უნივერსიტეტში, გასაუბრებაზე, networking-ში, პრეზენტაციებზე და სამუშაო კომუნიკაციაში.
            </p>
            <p className="text-sm text-[#6B6B6B] italic">
              A strong introduction helps you present yourself clearly in interviews, university, networking, and professional settings.
            </p>
          </div>
          <div className="mt-5 flex gap-2 flex-wrap">
            <BizButton onClick={() => setStep(1)}>წარდგენის შექმნა</BizButton>
            {saved.length > 0 && (
              <BizButton variant="outline" onClick={() => setStep(7)}>შენახული წარდგენა</BizButton>
            )}
            <BizButton
              variant="ghost"
              onClick={() => {
                if (user) saveBusiness(user.id, { businessSelfIntroductionSkipped: true });
                navigate("/path/business/home", { replace: true });
              }}
            >
              გამოტოვება
            </BizButton>
          </div>
          <p className="ka text-[11px] text-[#6B6B6B] mt-3">
            შეგიძლია ახლა გამოტოვო და მოგვიანებით დაშბორდიდან შექმნა.
          </p>
        </BizCard>
      )}

      {/* STEP 1: Structure */}
      {step === 1 && (
        <BizCard className="mb-4">
          <p className="ka text-[11px] uppercase tracking-wider text-[#6B6B6B] font-semibold">ნაბიჯი 1</p>
          <h2 className="ka text-lg font-bold text-[#6B1E3E] mt-1">როგორ ავაწყოთ პროფესიული წარდგენა?</h2>
          <p className="ka text-sm text-[#1A1A1A] mt-3">
            {isBeginner || isElementary
              ? "კარგი წარდგენა მოკლეა და მკაფიო. ის შედგება 5 ნაწილისგან. ჯერ წავიკითხოთ თითოეული."
              : isAdvanced
              ? "A strong self-introduction is short, specific, and confident. It usually covers 5 parts:"
              : "კარგი წარდგენა ხშირად შედგება 5 ნაწილისგან — სახელი, სტატუსი, სფერო, უნარები და მიზანი."}
          </p>
          <ol className="mt-4 space-y-3">
            {STRUCTURE_PARTS.map((p, i) => (
              <li key={i} className="p-3 rounded-lg bg-[#FAF6F7] border border-[#E8D5DA]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="ka text-xs font-bold text-[#6B1E3E]">{i + 1}. {p.ka} <span className="text-[#6B6B6B] font-normal">({p.en})</span></p>
                    <p className="text-sm text-[#6B1E3E] mt-1.5">{p.exEn}</p>
                    {(isBeginner || isElementary) && <p className="ka text-xs text-[#6B6B6B] mt-1">{p.exKa}</p>}
                  </div>
                  <ReadAloudButton text={p.exEn} />
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
          <p className="ka text-[11px] uppercase tracking-wider text-[#6B6B6B] font-semibold">ნაბიჯი 2</p>
          <h2 className="ka text-lg font-bold text-[#6B1E3E] mt-1">აირჩიე მიზანი და ნახე მაგალითი</h2>
          <p className="ka text-xs text-[#6B6B6B] mt-1">სხვადასხვა სიტუაცია — სხვადასხვა ტონი.</p>

          <div className="grid gap-2 mt-4">
            {SELF_INTRO_PURPOSES.map((p) => (
              <button key={p.id} onClick={() => set("purpose", p.id)}
                className={`ka text-left px-4 py-2.5 rounded-xl border text-sm transition-all ${
                  inputs.purpose === p.id
                    ? "border-[#6B1E3E] bg-[#6B1E3E]/5 text-[#6B1E3E] font-semibold"
                    : "border-[#E8D5DA] hover:border-[#6B1E3E]/40 text-[#1A1A1A]"
                }`}>{p.label}</button>
            ))}
          </div>

          {inputs.purpose && EXAMPLES[inputs.purpose] && (
            <div className="mt-5 p-4 rounded-xl bg-[#FAF6F7] border border-[#E8D5DA]">
              <p className="ka text-[11px] uppercase tracking-wider text-[#A84060] font-semibold mb-2">
                მაგალითი შენი დონისთვის
              </p>
              <p className="text-sm text-[#6B1E3E] leading-relaxed">{EXAMPLES[inputs.purpose][tier].en}</p>
              {(isBeginner || isElementary) && (
                <p className="ka text-xs text-[#6B6B6B] mt-2">{EXAMPLES[inputs.purpose][tier].ka}</p>
              )}
              {isAdvanced && EXAMPLES[inputs.purpose][tier].note && (
                <p className="ka text-[11px] text-[#6B6B6B] mt-2 italic">{EXAMPLES[inputs.purpose][tier].note}</p>
              )}
              <div className="mt-3">
                <ReadAloudButton text={EXAMPLES[inputs.purpose][tier].en} label="მოსმენა" />
              </div>

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
          <p className="ka text-[11px] uppercase tracking-wider text-[#6B6B6B] font-semibold">ნაბიჯი 3</p>
          <h2 className="ka text-lg font-bold text-[#6B1E3E] mt-1">ააწყე შენი წარდგენა</h2>
          {(isBeginner || isElementary) && (
            <p className="ka text-xs text-[#6B6B6B] mt-1">შეავსე მოკლედ. AI შემდეგ შენთვის ააწყობს.</p>
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
                        ? "border-[#6B1E3E] bg-[#6B1E3E]/5 text-[#6B1E3E] font-semibold"
                        : "border-[#E8D5DA] text-[#1A1A1A]"}`}>{s.label}</button>
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
              speakText={result[v].en} onCopy={() => copyText(result[v].en)}
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
              <p className="ka text-[11px] uppercase tracking-wider text-[#6B6B6B] font-semibold">სასარგებლო ფრაზები</p>
              <p className="ka text-xs text-[#6B6B6B] mt-1">
                {isBeginner ? "თითოეული ფრაზა ქართულად აგიხსნი." : "ფრაზები რომლებიც სხვა სიტუაციაშიც გამოგადგება."}
              </p>
              <div className="mt-3 space-y-3">
                {result.phrases.map((p, i) => (
                  <div key={i} className="p-3 rounded-lg bg-[#FAF6F7] border border-[#E8D5DA]">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-[#6B1E3E] text-sm">{p.en}</p>
                      <ReadAloudButton text={p.en} />
                    </div>
                    <p className="ka text-xs text-[#6B6B6B] mt-1">{p.ka}</p>
                    <p className="ka text-xs text-[#1A1A1A] mt-2">{p.explanationKa}</p>
                    {p.exampleEn && (
                      <div className="mt-2 pt-2 border-t border-[#E8D5DA]">
                        <p className="text-xs text-[#6B1E3E]">{p.exampleEn}</p>
                        {(isBeginner || isElementary) && <p className="ka text-xs text-[#6B6B6B] mt-0.5">{p.exampleKa}</p>}
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
          <p className="ka text-[11px] uppercase tracking-wider text-[#A84060] font-semibold">ნაბიჯი 6 — შენახვა</p>
          <h2 className="ka text-lg font-bold text-[#6B1E3E] mt-1">აირჩიე და შეინახე საბოლოო ვერსია</h2>
          <div className="mt-4 grid gap-2">
            {(["short", "standard", "polished"] as const).map((v) => (
              <button key={v} onClick={() => setSelected(v)}
                className={`text-left px-4 py-3 rounded-xl border text-sm ${
                  selected === v ? "border-[#6B1E3E] bg-[#6B1E3E]/5" : "border-[#E8D5DA]"}`}>
                <p className="ka text-[11px] uppercase tracking-wider text-[#6B6B6B] font-semibold">{v}</p>
                <p className="text-sm text-[#6B1E3E] mt-1">{result[v].en}</p>
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
        <div className="mb-4 animate-[bizFade_.5s_ease-out_both]">
          <style>{`
            @keyframes siCircleIn { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
            @keyframes siCheckDraw { from { stroke-dashoffset: 48; } to { stroke-dashoffset: 0; } }
            @keyframes siRingPulse { 0% { transform: scale(0.6); opacity: 0.45; } 100% { transform: scale(1.7); opacity: 0; } }
            @keyframes siGoldShimmer { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
            @keyframes siRise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            .si-rise-1 { animation: siRise .55s ease-out .25s both; }
            .si-rise-2 { animation: siRise .55s ease-out .4s both; }
            .si-rise-3 { animation: siRise .55s ease-out .55s both; }
            .si-rise-4 { animation: siRise .55s ease-out .7s both; }
          `}</style>

          {/* Celebratory header */}
          <div className="text-center mb-6">
            <div className="relative inline-flex items-center justify-center mb-4">
              <span
                className="absolute inset-0 rounded-full bg-[#A84060]/30"
                style={{ animation: "siRingPulse 1.6s ease-out 0.3s infinite" }}
              />
              <span
                className="relative w-16 h-16 rounded-full grid place-items-center bg-gradient-to-br from-[#6B1E3E] to-[#5A1834] shadow-[0_8px_24px_-8px_rgba(30,42,68,0.5)] ring-2 ring-[#A84060]/40"
                style={{ animation: "siCircleIn 0.5s cubic-bezier(.2,.8,.2,1) both" }}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12.5 L10 17.5 L19 7"
                    stroke="#F5DDE3"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ strokeDasharray: 48, strokeDashoffset: 48, animation: "siCheckDraw 0.45s ease-out 0.35s forwards" }}
                  />
                </svg>
              </span>
            </div>
            <p className="ka text-[11px] uppercase tracking-[0.18em] text-[#A84060] font-semibold si-rise-1">დასრულდა</p>
            <h2 className="ka text-2xl font-bold text-[#6B1E3E] mt-2 si-rise-1">წარდგენა მზადაა</h2>
            <p className="ka text-sm text-[#6B6B6B] mt-3 max-w-md mx-auto si-rise-2">
              ეს არის შენი პირადი პროფესიული წარდგენა — ინგლისურად, შენი ხმით.
              გამოიყენე გასაუბრებაზე, ქსელშეკრებებზე ან ნებისმიერ პროფესიულ გარემოში.
            </p>
          </div>

          {saved[0] && (
            <>
              {/* Premium document card */}
              <div className="relative si-rise-3">
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-[#A84060]/40 via-transparent to-[#6B1E3E]/20 blur-[2px]" aria-hidden />
                <div className="relative rounded-2xl bg-gradient-to-br from-white to-[#FAF6F7] border border-[#E8D5DA] shadow-[0_2px_4px_rgba(30,42,68,0.04),0_20px_50px_-20px_rgba(30,42,68,0.25)] overflow-hidden">
                  <div className="h-[3px] bg-gradient-to-r from-[#A84060] via-[#C97A90] to-[#A84060]" />
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#A84060]" />
                        <p className="ka text-[10px] uppercase tracking-[0.2em] text-[#6B6B6B] font-bold">შენი წარდგენა</p>
                      </div>
                      <span className="ka text-[10px] text-[#6B6B6B] italic">{saved[0].selected}</span>
                    </div>
                    <p className="text-[15px] text-[#6B1E3E] leading-[1.7] font-medium" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                      "{saved[0][saved[0].selected].en}"
                    </p>
                    <div className="mt-4 pt-4 border-t border-dashed border-[#E8D5DA] flex items-center justify-between">
                      <p className="ka text-[10px] text-[#8A8578] italic">— შენი ხელით აშენებული</p>
                      <ReadAloudButton text={saved[0][saved[0].selected].en} label="მოსმენა" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Phrases bonus reward */}
              {saved[0].phrases?.length > 0 && (
                <div className="mt-5 si-rise-4">
                  <div className="relative rounded-2xl p-5 bg-gradient-to-br from-[#FAF6F7] via-[#FAF0F2] to-[#FAF0F2] border border-[#C97A90]/50 shadow-[0_8px_24px_-12px_rgba(201,162,39,0.35)]">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base" style={{ animation: "siGoldShimmer 2s ease-in-out infinite" }}>✦</span>
                      <p className="ka text-[11px] uppercase tracking-[0.18em] text-[#8A6A0F] font-bold">ბონუსი · ნასწავლი ფრაზები</p>
                    </div>
                    <ul className="space-y-2">
                      {saved[0].phrases.slice(0, 5).map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[#6B1E3E]">
                          <span className="text-[#A84060] font-bold mt-0.5">{i + 1}.</span>
                          <span className="font-medium">{p.en}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Next steps */}
          <div className="mt-6 si-rise-4">
            <p className="ka text-center text-[11px] uppercase tracking-[0.18em] text-[#6B6B6B] font-semibold mb-3">შემდეგი ნაბიჯი</p>
            <div className="grid gap-2.5">
              <button
                onClick={() => navigate("/path/business/home")}
                className="ka group relative w-full px-5 py-4 rounded-2xl bg-gradient-to-br from-[#6B1E3E] to-[#5A1834] text-[#F5EDEF] font-semibold text-[15px] shadow-[0_8px_20px_-8px_rgba(30,42,68,0.5)] hover:shadow-[0_12px_28px_-8px_rgba(30,42,68,0.6)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
              >
                <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#C97A90] to-[#A84060]" />
                <span className="flex items-center justify-between pl-2">
                  <span className="flex flex-col items-start gap-0.5">
                    <span>ბიზნეს გაკვეთილებზე გადასვლა</span>
                    <span className="text-[11px] font-normal text-[#F5EDEF]/70">გააგრძელე შენი მოგზაურობა</span>
                  </span>
                  <span className="text-lg transition-transform duration-200 group-hover:translate-x-1">→</span>
                </span>
              </button>
              <button
                onClick={() => { setStep(1); setResult(null); setInputs(emptyInputs); }}
                className="ka w-full px-5 py-3 rounded-2xl border border-[#6B1E3E]/15 bg-white/60 text-[#6B1E3E] font-medium text-sm hover:bg-white hover:border-[#6B1E3E]/30 transition-all duration-200"
              >
                ჩემი წარდგენის რედაქტირება
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAVED LIST */}
      {saved.length > 0 && (
        <div className="mt-8">
          <h2 className="ka text-base font-bold text-[#6B1E3E] mb-3">ჩემი შენახული წარდგენა</h2>
          <div className="space-y-3">
            {saved.map((s) => {
              const v = s[s.selected];
              return (
                <BizCard key={s.id}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="ka text-[11px] text-[#6B6B6B]">{new Date(s.createdAt).toLocaleDateString()} · {s.selected}</p>
                      <p className="ka text-xs text-[#6B1E3E] mt-0.5 font-semibold">
                        {SELF_INTRO_PURPOSES.find((p) => p.id === s.inputs.purpose)?.label || "—"}
                      </p>
                    </div>
                    <button onClick={() => { if (user) { deleteSelfIntro(user.id, s.id); setSaved(loadSelfIntros(user.id)); } }}
                      className="text-xs text-[#C0392B] hover:underline">წაშლა</button>
                  </div>
                  <p className="text-sm text-[#6B1E3E] mt-3 leading-relaxed">{v.en}</p>
                  <p className="ka text-xs text-[#6B6B6B] mt-2">{v.ka}</p>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <ReadAloudButton text={v.en} label="მოსმენა" />
                    <button onClick={() => copyText(v.en)} className="text-xs px-3 py-1.5 rounded-lg border border-[#E8D5DA]">კოპირება</button>
                    <button onClick={() => markPracticed(s.id)} className="text-xs px-3 py-1.5 rounded-lg border border-[#E8D5DA]">I practiced</button>
                  </div>
                  {s.practicedAt && (
                    <p className="ka text-[10px] text-[#6B6B6B] mt-2">ბოლო ვარჯიში: {new Date(s.practicedAt).toLocaleDateString()}</p>
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
const inputCls = "w-full px-3 py-2 rounded-lg border border-[#E8D5DA] text-sm outline-none focus:border-[#6B1E3E] bg-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="ka block text-xs font-semibold text-[#6B1E3E] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function VersionCard({
  label, version, isSelected, onSelect, speakText, onCopy, onRewrite, rewritingKey, vKey, showKa,
}: {
  label: string; version: SelfIntroVersion; isSelected: boolean;
  onSelect: () => void; speakText: string; onCopy: () => void;
  onRewrite: (mode: "shorter" | "simpler" | "more_professional" | "improve") => void;
  rewritingKey: string | null; vKey: string; showKa: boolean;
}) {
  const busy = (m: string) => rewritingKey === `${vKey}:${m}`;
  return (
    <BizCard className={isSelected ? "border-[#6B1E3E]/40 ring-1 ring-[#6B1E3E]/10" : ""}>
      <div className="flex items-center justify-between gap-2">
        <p className="ka text-[11px] uppercase tracking-wider text-[#6B6B6B] font-semibold">{label}</p>
        <button onClick={onSelect}
          className={`ka text-[11px] px-2.5 py-1 rounded-full border ${
            isSelected ? "bg-[#6B1E3E] text-white border-[#6B1E3E]" : "border-[#E8D5DA] text-[#6B1E3E]"}`}>
          {isSelected ? "არჩეული" : "Use this"}
        </button>
      </div>
      <p className="text-sm text-[#6B1E3E] mt-3 leading-relaxed">{version.en}</p>
      {showKa && <p className="ka text-xs text-[#6B6B6B] mt-2">{version.ka}</p>}
      <div className="mt-3 flex gap-1.5 flex-wrap items-center">
        <ReadAloudButton text={speakText} />
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
      className="text-[11px] px-2.5 py-1.5 rounded-lg border border-[#E8D5DA] text-[#6B1E3E] hover:bg-[#6B1E3E]/5 disabled:opacity-50">
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
      <p className="ka text-[11px] uppercase tracking-wider text-[#A84060] font-semibold">მინი ვარჯიში</p>
      <p className="ka text-xs text-[#6B6B6B] mt-1">გაიარე ეს მცირე სავარჯიშოები — ეხმარება დამახსოვრებას.</p>
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
    <div className="p-3 rounded-lg bg-[#FAF6F7] border border-[#E8D5DA]">
      <p className="ka text-[11px] text-[#6B6B6B]">{idx}. {ex.promptKa}</p>
      <p className="text-sm text-[#6B1E3E] mt-1 font-medium">{ex.prompt}</p>

      {ex.kind === "choice" ? (
        <div className="mt-2 space-y-1.5">
          {ex.options.map((opt, i) => (
            <button key={i} onClick={() => { setPick(i); setChecked(null); }}
              className={`block w-full text-left text-xs px-3 py-2 rounded border ${
                pick === i ? "border-[#6B1E3E] bg-white" : "border-[#E8D5DA] bg-white"}`}>
              {opt}
            </button>
          ))}
        </div>
      ) : ex.kind === "order" ? (
        <div className="mt-2">
          <p className="text-[11px] text-[#6B6B6B]">{ex.words.join(" · ")}</p>
          <input value={val} onChange={(e) => { setVal(e.target.value); setChecked(null); }}
            placeholder="Type the full sentence" className={`${inputCls} mt-2`} />
        </div>
      ) : (
        <input value={val} onChange={(e) => { setVal(e.target.value); setChecked(null); }}
          placeholder="Your answer" className={`${inputCls} mt-2`} />
      )}

      <div className="mt-2 flex items-center gap-2">
        <button onClick={check}
          className="text-[11px] px-3 py-1.5 rounded-lg border border-[#6B1E3E] text-[#6B1E3E]">შემოწმება</button>
        {checked === true && <span className="ka text-[11px] text-[#5A8A6A]">სწორია</span>}
        {checked === false && (
          <span className="ka text-[11px] text-[#C0392B]">
            სცადე ისევ{("hintKa" in ex && ex.hintKa) ? ` — ${ex.hintKa}` : ""}
          </span>
        )}
      </div>
    </div>
  );
}
