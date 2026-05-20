import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";
import {
  loadBusiness,
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
  purpose: "",
  name: "",
  status: "",
  field: "",
  experience: "",
  skills: "",
  goal: "",
};

export default function SelfIntroduction() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [inputs, setInputs] = useState<SelfIntroInputs>(emptyInputs);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenResult | null>(null);
  const [selected, setSelected] = useState<"short" | "standard" | "polished">("standard");
  const [saved, setSaved] = useState<SavedSelfIntro[]>([]);
  const [rewriting, setRewriting] = useState<string | null>(null);

  useEffect(() => {
    if (user) setSaved(loadSelfIntros(user.id));
  }, [user]);

  const biz = useMemo(() => (user ? loadBusiness(user.id) : null), [user]);

  const canStep2 = !!inputs.purpose;
  const canGenerate =
    inputs.name.trim() && inputs.status && inputs.field.trim() && inputs.skills.trim() && inputs.goal.trim();

  const set = (k: keyof SelfIntroInputs, v: string) => setInputs((p) => ({ ...p, [k]: v }));

  const generate = async () => {
    if (!canGenerate) {
      toast.error("შეავსე ყველა აუცილებელი ველი");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("business-self-intro", {
        body: {
          ...inputs,
          level: biz?.level || "business_intermediate",
          businessPriority: biz?.mainPriority || "general_business",
          variant: "all",
        },
      });
      if (error) throw error;
      if (!data?.short || !data?.standard || !data?.polished) {
        throw new Error("AI-მ ვერ დააბრუნა სრული პასუხი. სცადე ისევ.");
      }
      setResult({
        short: data.short,
        standard: data.standard,
        polished: data.polished,
        phrases: Array.isArray(data.phrases) ? data.phrases : [],
      });
      setSelected("standard");
      setStep(3);
    } catch (e: any) {
      toast.error(e?.message || "გენერაცია ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  };

  const rewrite = async (
    which: "short" | "standard" | "polished",
    variant: "shorter" | "simpler" | "more_professional" | "improve",
  ) => {
    if (!result) return;
    setRewriting(`${which}:${variant}`);
    try {
      const { data, error } = await supabase.functions.invoke("business-self-intro", {
        body: {
          ...inputs,
          level: biz?.level,
          businessPriority: biz?.mainPriority,
          variant,
          baseText: result[which].en,
        },
      });
      if (error) throw error;
      if (!data?.en) throw new Error("AI-მ ვერ დააბრუნა პასუხი");
      setResult({ ...result, [which]: { en: data.en, ka: data.ka || "" } });
    } catch (e: any) {
      toast.error(e?.message || "ვერ მოხერხდა");
    } finally {
      setRewriting(null);
    }
  };

  const saveCurrent = () => {
    if (!user || !result) return;
    const item: SavedSelfIntro = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      inputs,
      short: result.short,
      standard: result.standard,
      polished: result.polished,
      phrases: result.phrases,
      selected,
      practicedAt: null,
    };
    const list = saveSelfIntro(user.id, item);
    setSaved(list);
    toast.success("შენახულია");
  };

  const speak = (text: string) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = 0.95;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  };

  const copyText = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast.success("დაკოპირდა"); } catch {}
  };

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

  return (
    <BusinessShell back={{ to: "/path/business/home", label: "Business Dashboard" }}>
      <div className="mb-5">
        <h1 className="ka text-2xl font-bold text-[#1E2A44]">პროფესიული წარდგენა</h1>
        <p className="ka text-sm text-[#5B6473] mt-1">
          შექმენი მოკლე და ძლიერი ინგლისური წარდგენა უნივერსიტეტისთვის, გასაუბრებისთვის ან სამუშაო გარემოსთვის.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-5">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`h-1.5 flex-1 rounded-full ${step >= (n as 1 | 2 | 3) ? "bg-[#1E2A44]" : "bg-[#E7E2D5]"}`}
          />
        ))}
      </div>

      {/* STEP 1: PURPOSE */}
      {step === 1 && (
        <BizCard className="mb-4">
          <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">ნაბიჯი 1</p>
          <h2 className="ka text-lg font-bold text-[#1E2A44] mt-1">რისთვის გჭირდება წარდგენა?</h2>
          <div className="grid gap-2 mt-4">
            {SELF_INTRO_PURPOSES.map((p) => (
              <button
                key={p.id}
                onClick={() => set("purpose", p.id)}
                className={`ka text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                  inputs.purpose === p.id
                    ? "border-[#1E2A44] bg-[#1E2A44]/5 text-[#1E2A44] font-semibold"
                    : "border-[#E7E2D5] hover:border-[#1E2A44]/40 text-[#374151]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <BizButton onClick={() => setStep(2)} disabled={!canStep2}>გაგრძელება</BizButton>
          </div>
        </BizCard>
      )}

      {/* STEP 2: USER INFO */}
      {step === 2 && (
        <BizCard className="mb-4">
          <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">ნაბიჯი 2</p>
          <h2 className="ka text-lg font-bold text-[#1E2A44] mt-1">შენი ინფორმაცია</h2>

          <div className="mt-4 space-y-4">
            <Field label="რა გქვია?">
              <input
                value={inputs.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Nino"
                className={inputCls}
              />
            </Field>

            <Field label="რომელი აღწერს შენს მდგომარეობას?">
              <div className="grid grid-cols-2 gap-2">
                {SELF_INTRO_STATUSES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => set("status", s.id)}
                    className={`ka text-xs px-3 py-2 rounded-lg border ${
                      inputs.status === s.id
                        ? "border-[#1E2A44] bg-[#1E2A44]/5 text-[#1E2A44] font-semibold"
                        : "border-[#E7E2D5] text-[#374151]"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="რომელ სფეროში სწავლობ ან მუშაობ?">
              <input
                value={inputs.field}
                onChange={(e) => set("field", e.target.value)}
                placeholder="Business Administration, Marketing, Finance..."
                className={inputCls}
              />
            </Field>

            <Field label="რა გამოცდილება გაქვს? თუ არ გაქვს, დაწერე 'გამოცდილება არ მაქვს'.">
              <textarea
                value={inputs.experience}
                onChange={(e) => set("experience", e.target.value)}
                rows={2}
                placeholder="2 წელი customer service-ში... ან 'გამოცდილება არ მაქვს'"
                className={inputCls}
              />
            </Field>

            <Field label="რომელი უნარები გინდა ახსენო?">
              <input
                value={inputs.skills}
                onChange={(e) => set("skills", e.target.value)}
                placeholder="communication, teamwork, organization, problem-solving"
                className={inputCls}
              />
            </Field>

            <Field label="რა არის შენი მიზანი?">
              <input
                value={inputs.goal}
                onChange={(e) => set("goal", e.target.value)}
                placeholder="get an internship / prepare for interview / work with clients"
                className={inputCls}
              />
            </Field>
          </div>

          <div className="mt-5 flex justify-between">
            <BizButton variant="outline" onClick={() => setStep(1)}>უკან</BizButton>
            <BizButton onClick={generate} disabled={!canGenerate || loading}>
              {loading ? "იქმნება..." : "წარდგენის შექმნა"}
            </BizButton>
          </div>
        </BizCard>
      )}

      {/* STEP 3: RESULTS */}
      {step === 3 && result && (
        <div className="space-y-4">
          {(["short", "standard", "polished"] as const).map((v) => (
            <VersionCard
              key={v}
              label={
                v === "short" ? "Short — 20-30 წამი" :
                v === "standard" ? "Standard — 45-60 წამი" : "Polished — პროფესიული"
              }
              version={result[v]}
              isSelected={selected === v}
              onSelect={() => setSelected(v)}
              onSpeak={() => speak(result[v].en)}
              onCopy={() => copyText(result[v].en)}
              onRewrite={(mode) => rewrite(v, mode)}
              rewritingKey={rewriting}
              vKey={v}
            />
          ))}

          {result.phrases.length > 0 && (
            <BizCard>
              <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">სასარგებლო ფრაზები</p>
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
                        <p className="ka text-xs text-[#5B6473] mt-0.5">{p.exampleKa}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </BizCard>
          )}

          <BizCard>
            <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">შენახვა</p>
            <p className="ka text-sm text-[#5B6473] mt-1">
              შერჩეული ვერსია: <span className="font-semibold text-[#1E2A44]">{selected}</span>
            </p>
            <div className="mt-3 flex gap-2 flex-wrap">
              <BizButton onClick={saveCurrent}>შენახვა</BizButton>
              <BizButton variant="outline" onClick={() => { setStep(2); setResult(null); }}>
                ხელახლა შექმნა
              </BizButton>
            </div>
          </BizCard>

          <PracticeCard onPracticed={() => { /* handled per-saved-item below */ }} disabled />
        </div>
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
                      <p className="ka text-[11px] text-[#5B6473]">
                        {new Date(s.createdAt).toLocaleDateString()} · {s.selected}
                      </p>
                      <p className="ka text-xs text-[#1E2A44] mt-0.5 font-semibold">
                        {SELF_INTRO_PURPOSES.find((p) => p.id === s.inputs.purpose)?.label || "—"}
                      </p>
                    </div>
                    <button
                      onClick={() => { if (user) { deleteSelfIntro(user.id, s.id); setSaved(loadSelfIntros(user.id)); } }}
                      className="text-xs text-[#B91C1C] hover:underline"
                    >
                      წაშლა
                    </button>
                  </div>
                  <p className="text-sm text-[#1E2A44] mt-3 leading-relaxed">{v.en}</p>
                  <p className="ka text-xs text-[#5B6473] mt-2">{v.ka}</p>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <button onClick={() => speak(v.en)} className="text-xs px-3 py-1.5 rounded-lg border border-[#E7E2D5]">🔊 მოსმენა</button>
                    <button onClick={() => copyText(v.en)} className="text-xs px-3 py-1.5 rounded-lg border border-[#E7E2D5]">კოპირება</button>
                    <button onClick={() => markPracticed(s.id)} className="text-xs px-3 py-1.5 rounded-lg border border-[#E7E2D5]">I practiced</button>
                  </div>
                  {s.practicedAt && (
                    <p className="ka text-[10px] text-[#5B6473] mt-2">
                      ბოლო ვარჯიში: {new Date(s.practicedAt).toLocaleDateString()}
                    </p>
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

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-[#E7E2D5] text-sm outline-none focus:border-[#1E2A44] bg-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="ka block text-xs font-semibold text-[#1E2A44] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function VersionCard({
  label, version, isSelected, onSelect, onSpeak, onCopy, onRewrite, rewritingKey, vKey,
}: {
  label: string;
  version: SelfIntroVersion;
  isSelected: boolean;
  onSelect: () => void;
  onSpeak: () => void;
  onCopy: () => void;
  onRewrite: (mode: "shorter" | "simpler" | "more_professional" | "improve") => void;
  rewritingKey: string | null;
  vKey: string;
}) {
  const busy = (m: string) => rewritingKey === `${vKey}:${m}`;
  return (
    <BizCard className={isSelected ? "border-[#1E2A44]/40 ring-1 ring-[#1E2A44]/10" : ""}>
      <div className="flex items-center justify-between gap-2">
        <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">{label}</p>
        <button
          onClick={onSelect}
          className={`ka text-[11px] px-2.5 py-1 rounded-full border ${
            isSelected ? "bg-[#1E2A44] text-white border-[#1E2A44]" : "border-[#E7E2D5] text-[#1E2A44]"
          }`}
        >
          {isSelected ? "არჩეული" : "Save this version"}
        </button>
      </div>
      <p className="text-sm text-[#1E2A44] mt-3 leading-relaxed">{version.en}</p>
      <p className="ka text-xs text-[#5B6473] mt-2">{version.ka}</p>
      <div className="mt-3 flex gap-1.5 flex-wrap">
        <ChipBtn onClick={onSpeak}>🔊</ChipBtn>
        <ChipBtn onClick={onCopy}>კოპირება</ChipBtn>
        <ChipBtn onClick={() => onRewrite("improve")} loading={busy("improve")}>Improve</ChipBtn>
        <ChipBtn onClick={() => onRewrite("simpler")} loading={busy("simpler")}>Make simpler</ChipBtn>
        <ChipBtn onClick={() => onRewrite("more_professional")} loading={busy("more_professional")}>More professional</ChipBtn>
        <ChipBtn onClick={() => onRewrite("shorter")} loading={busy("shorter")}>Shorter</ChipBtn>
      </div>
    </BizCard>
  );
}

function ChipBtn({ children, onClick, loading }: { children: React.ReactNode; onClick: () => void; loading?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="text-[11px] px-2.5 py-1.5 rounded-lg border border-[#E7E2D5] text-[#1E2A44] hover:bg-[#1E2A44]/5 disabled:opacity-50"
    >
      {loading ? "..." : children}
    </button>
  );
}

function PracticeCard({ disabled }: { onPracticed: () => void; disabled?: boolean }) {
  return (
    <BizCard>
      <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">ივარჯიშე წარდგენაზე</p>
      <p className="ka text-sm text-[#374151] mt-2">
        წაიკითხე ხმამაღლა შენი წარდგენა. გამოიყენე 🔊 ღილაკი მოსასმენად.
      </p>
      <p className="ka text-xs text-[#5B6473] mt-2">
        საუბრის პრაქტიკა მოგვიანებით დაემატება.
      </p>
    </BizCard>
  );
}
