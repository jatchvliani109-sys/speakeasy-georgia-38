import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useDisplayName } from "@/hooks/useDisplayName";
import { toast } from "sonner";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";
import {
  BusinessDeadline,
  BusinessField,
  BusinessGoal,
  BusinessIntensity,
  DEADLINE_LABELS,
  FIELD_LABELS,
  GOAL_LABELS,
  INTENSITY_LABELS,
  buildPlan,
  pullBusinessFromSupabase,
  saveBusiness,
  saveBusinessAsync,
} from "./lib/state";

type Step = 0 | 1 | 2;

const GOAL_KEYS = Object.keys(GOAL_LABELS) as BusinessGoal[];
const INTENSITY_KEYS = Object.keys(INTENSITY_LABELS) as BusinessIntensity[];
const DEADLINE_KEYS = Object.keys(DEADLINE_LABELS) as Exclude<BusinessDeadline, null>[];
const FIELD_KEYS = Object.keys(FIELD_LABELS) as BusinessField[];

export default function BusinessSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { displayName, loaded: nameLoaded, save: saveName } = useDisplayName();

  const [nameInput, setNameInput] = useState<string>("");
  const [savingName, setSavingName] = useState(false);
  const [step, setStep] = useState<Step>(0);

  const [goals, setGoals] = useState<BusinessGoal[]>([]);
  const [intensity, setIntensity] = useState<BusinessIntensity | null>(null);
  const [deadline, setDeadline] = useState<BusinessDeadline>(null);
  const [field, setField] = useState<BusinessField[]>([]);

  useEffect(() => {
    if (nameLoaded && displayName) setNameInput(displayName);
  }, [nameLoaded, displayName]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const cur = await pullBusinessFromSupabase(user.id);
      if (cancelled) return;
      // If setup already completed, do not show the questions again — route forward.
      if (cur.setupCompleted) {
        if (!cur.testCompleted) navigate("/path/business/test", { replace: true });
        else if (!cur.plan) navigate("/path/business/plan", { replace: true });
        else if (!cur.businessResumeUploaded && !cur.businessResumeSkipped)
          navigate("/path/business/resume", { replace: true });
        else if (!cur.businessSelfIntroductionCompleted && !cur.businessSelfIntroductionSkipped)
          navigate("/path/business/self-introduction", { replace: true });
        else navigate("/path/business/home", { replace: true });
        return;
      }
      setGoals(cur.goals ?? []);
      setIntensity(cur.intensity ?? null);
      setDeadline(cur.deadline ?? null);
      setField(cur.field ?? []);
    })();

    return () => { cancelled = true; };
  }, [user, navigate]);

  const toggleGoal = (g: BusinessGoal) =>
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  const toggleField = (f: BusinessField) =>
    setField((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  const canNext =
    (step === 0 && goals.length > 0) ||
    (step === 1 && !!intensity && (intensity !== "deadline" || !!deadline)) ||
    (step === 2 && field.length > 0);


  const next = async () => {
    if (step < 2) {
      setStep((s) => (s + 1) as Step);
      return;
    }
    if (!user) {
      console.warn("[setup] no user — navigating to plan anyway");
      navigate("/path/business/plan", { replace: true });
      return;
    }

    console.log("[setup] completing setup", { goals, intensity, deadline, field });

    // Safety net: never let the user stay stuck on this screen.
    const failsafe = setTimeout(() => {
      console.warn("[setup] failsafe fired — forcing navigation to plan");
      navigate("/path/business/plan", { replace: true });
    }, 6000);

    try {
      // Save + await remote write so the plan page guard sees the latest state.
      // mainPriority mirrors goals since the standalone priority question was removed —
      // downstream logic (plan, curriculum, vocab, docs) still reads mainPriority.
      const saved = await saveBusinessAsync(user.id, {
        goals,
        mainPriority: goals,
        intensity,
        deadline: intensity === "deadline" ? deadline : null,
        field,
        setupCompleted: true,
      });
      console.log("[setup] saved setup", { setupCompleted: saved.setupCompleted });

      const plan = buildPlan(saved);
      if (plan) {
        await saveBusinessAsync(user.id, { plan });
        console.log("[setup] plan saved");
      } else {
        console.log("[setup] buildPlan returned null (missing level/field) — plan will be built later");
      }
    } catch (e) {
      // Local state was already written by saveBusinessAsync; keep going.
      console.error("[setup] save error — continuing to plan", e);
    } finally {
      clearTimeout(failsafe);
      console.log("[setup] navigating to /path/business/plan");
      navigate("/path/business/plan", { replace: true });
    }
  };
  const back = () => setStep((s) => Math.max(0, (s - 1) as Step) as Step);

  const needsName = nameLoaded && !displayName;

  const submitName = async () => {
    const clean = nameInput.trim();
    if (!clean) {
      toast.error("გთხოვ, შეიყვანე შენი სახელი");
      return;
    }
    setSavingName(true);
    const res = await saveName(clean);
    setSavingName(false);
    if (!res.ok) toast.error("სახელის შენახვა ვერ მოხერხდა");
  };

  if (needsName) {
    return (
      <BusinessShell>
        <div className="mb-6">
          <p className="ka text-[11px] uppercase tracking-wider text-[#1C1C1E] font-semibold">
            ნაბიჯი 1 / 4
          </p>
          <h1 className="ka text-2xl font-bold text-[#5C1A2E] mt-1">როგორ დაგიძახოთ?</h1>
          <p className="ka text-sm text-[#4A4A4A] mt-1">
            შეიყვანე შენი სახელი — ამ სახელით მოგმართავთ აპლიკაციაში.
          </p>
        </div>
        <BizCard>
          <label className="ka text-xs text-[#4A4A4A] font-semibold" htmlFor="name-input">
            შენი სახელი
          </label>
          <input
            id="name-input"
            type="text"
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitName();
            }}
            maxLength={60}
            placeholder="მაგ. ნინო"
            className="ka mt-2 w-full px-4 py-3 rounded-xl border border-[#E4E2DF] focus:border-[#5C1A2E] focus:outline-none text-[#1C1C1E] text-base"
          />
          <div className="flex justify-end mt-6">
            <BizButton onClick={submitName} disabled={savingName || !nameInput.trim()}>
              {savingName ? "ინახება..." : "შემდეგი"}
            </BizButton>
          </div>
        </BizCard>
      </BusinessShell>
    );
  }

  return (
    <BusinessShell>
      <div className="mb-6">
        <p className="ka text-[11px] uppercase tracking-wider text-[#1C1C1E] font-semibold">
          ნაბიჯი {step + 2} / 4
        </p>
        <h1 className="ka text-2xl font-bold text-[#5C1A2E] mt-1">ბიზნეს ინგლისურის დაყენება</h1>
        <p className="ka text-sm text-[#4A4A4A] mt-1">
          {displayName ? `${displayName}, მ` : "მ"}ითხარი რისთვის გჭირდება ბიზნეს ინგლისური და შენთვის შესაბამის გეგმას შევქმნით.
        </p>
      </div>


      <BizCard>
        {step === 0 && (
          <div>
            <h2 className="ka font-semibold text-[#5C1A2E]">რისთვის გჭირდება ბიზნეს ინგლისური?</h2>
            <p className="ka text-xs text-[#4A4A4A] mt-1 mb-4">შეგიძლია რამდენიმე პასუხი აირჩიო.</p>
            <div className="space-y-2">
              {GOAL_KEYS.map((g) => {
                const on = goals.includes(g);
                return (
                  <button
                    key={g}
                    onClick={() => toggleGoal(g)}
                    className={`ka w-full text-left px-4 py-3 rounded-xl border transition-colors text-sm ${
                      on
                        ? "border-[#5C1A2E] bg-[#5C1A2E]/5 text-[#5C1A2E]"
                        : "border-[#E4E2DF] hover:border-[#5C1A2E]/40 text-[#1C1C1E]"
                    }`}
                  >
                    <span className="inline-block w-4 h-4 mr-2 rounded border align-middle"
                      style={{ background: on ? "#5C1A2E" : "transparent", borderColor: on ? "#5C1A2E" : "#E4E2DF" }} />
                    {GOAL_LABELS[g]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <SingleSelect
              title="რამდენად ინტენსიურად გინდა სწავლა?"
              options={INTENSITY_KEYS.map((k) => ({ value: k, label: INTENSITY_LABELS[k] }))}
              value={intensity}
              onChange={(v) => {
                setIntensity(v as BusinessIntensity);
                if (v !== "deadline") setDeadline(null);
              }}
            />
            {intensity === "deadline" && (
              <div className="mt-5 pt-5 border-t border-[#E4E2DF]">
                <SingleSelect
                  title="როდის გჭირდება შედეგი?"
                  options={DEADLINE_KEYS.map((k) => ({ value: k, label: DEADLINE_LABELS[k] }))}
                  value={deadline}
                  onChange={(v) => setDeadline(v as BusinessDeadline)}
                />
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <MultiSelect
            title="რომელი სფეროები გაინტერესებს?"
            hint="შეგიძლია რამდენიმე სფერო აირჩიო."
            options={FIELD_KEYS.map((k) => ({ value: k, label: FIELD_LABELS[k] }))}
            values={field}
            onToggle={(v) => toggleField(v as BusinessField)}
          />
        )}

        <div className="flex items-center justify-between mt-6">
          <BizButton variant="ghost" onClick={back} disabled={step === 0}>
            უკან
          </BizButton>
          <BizButton onClick={next} disabled={!canNext}>
            {step < 2 ? "შემდეგი" : "გეგმის ნახვა"}
          </BizButton>
        </div>
      </BizCard>
    </BusinessShell>
  );
}

function SingleSelect<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <h2 className="ka font-semibold text-[#5C1A2E] mb-3">{title}</h2>
      <div className="space-y-2">
        {options.map((o) => {
          const on = value === o.value;
          return (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              className={`ka w-full text-left px-4 py-3 rounded-xl border transition-colors text-sm ${
                on
                  ? "border-[#5C1A2E] bg-[#5C1A2E]/5 text-[#5C1A2E]"
                  : "border-[#E4E2DF] hover:border-[#5C1A2E]/40 text-[#1C1C1E]"
              }`}
            >
              <span
                className="inline-block w-3.5 h-3.5 mr-2 rounded-full border align-middle"
                style={{ background: on ? "#1C1C1E" : "transparent", borderColor: on ? "#1C1C1E" : "#E4E2DF" }}
              />
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MultiSelect<T extends string>({
  title,
  hint,
  options,
  values,
  onToggle,
}: {
  title: string;
  hint?: string;
  options: { value: T; label: string }[];
  values: T[];
  onToggle: (v: T) => void;
}) {
  return (
    <div>
      <h2 className="ka font-semibold text-[#5C1A2E]">{title}</h2>
      {hint && <p className="ka text-xs text-[#4A4A4A] mt-1 mb-4">{hint}</p>}
      <div className="space-y-2">
        {options.map((o) => {
          const on = values.includes(o.value);
          return (
            <button
              key={o.value}
              onClick={() => onToggle(o.value)}
              className={`ka w-full text-left px-4 py-3 rounded-xl border transition-colors text-sm ${
                on
                  ? "border-[#5C1A2E] bg-[#5C1A2E]/5 text-[#5C1A2E]"
                  : "border-[#E4E2DF] hover:border-[#5C1A2E]/40 text-[#1C1C1E]"
              }`}
            >
              <span
                className="inline-block w-4 h-4 mr-2 rounded border align-middle"
                style={{ background: on ? "#5C1A2E" : "transparent", borderColor: on ? "#5C1A2E" : "#E4E2DF" }}
              />
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
