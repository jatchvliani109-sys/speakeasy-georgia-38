import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";
import {
  BusinessDeadline,
  BusinessField,
  BusinessGoal,
  BusinessIntensity,
  BusinessPriority,
  DEADLINE_LABELS,
  FIELD_LABELS,
  GOAL_LABELS,
  INTENSITY_LABELS,
  PRIORITY_LABELS,
  buildPlan,
  pullBusinessFromSupabase,
  saveBusiness,
} from "./lib/state";

type Step = 0 | 1 | 2 | 3;

const GOAL_KEYS = Object.keys(GOAL_LABELS) as BusinessGoal[];
const PRIORITY_KEYS = Object.keys(PRIORITY_LABELS) as BusinessPriority[];
const INTENSITY_KEYS = Object.keys(INTENSITY_LABELS) as BusinessIntensity[];
const DEADLINE_KEYS = Object.keys(DEADLINE_LABELS) as Exclude<BusinessDeadline, null>[];
const FIELD_KEYS = Object.keys(FIELD_LABELS) as BusinessField[];

export default function BusinessSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(0);

  const [goals, setGoals] = useState<BusinessGoal[]>([]);
  const [priority, setPriority] = useState<BusinessPriority[]>([]);
  const [intensity, setIntensity] = useState<BusinessIntensity | null>(null);
  const [deadline, setDeadline] = useState<BusinessDeadline>(null);
  const [field, setField] = useState<BusinessField[]>([]);

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
      setPriority(cur.mainPriority ?? []);
      setIntensity(cur.intensity ?? null);
      setDeadline(cur.deadline ?? null);
      setField(cur.field ?? []);
    })();

    return () => { cancelled = true; };
  }, [user, navigate]);

  const toggleGoal = (g: BusinessGoal) =>
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  const togglePriority = (p: BusinessPriority) =>
    setPriority((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  const toggleField = (f: BusinessField) =>
    setField((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  const canNext =
    (step === 0 && goals.length > 0) ||
    (step === 1 && priority.length > 0) ||
    (step === 2 && !!intensity && (intensity !== "deadline" || !!deadline)) ||
    (step === 3 && field.length > 0);


  const next = () => {
    if (step < 3) setStep((s) => (s + 1) as Step);
    else if (user) {
      const saved = saveBusiness(user.id, {
        goals,
        mainPriority: priority,
        intensity,
        deadline: intensity === "deadline" ? deadline : null,
        field,
        setupCompleted: true,
      });
      const plan = buildPlan(saved);
      if (plan) saveBusiness(user.id, { plan });
      navigate("/path/business/plan", { replace: true });
    }
  };
  const back = () => setStep((s) => Math.max(0, (s - 1) as Step) as Step);

  return (
    <BusinessShell>
      <div className="mb-6">
        <p className="ka text-[11px] uppercase tracking-wider text-[#1C1C1E] font-semibold">
          ნაბიჯი {step + 1} / 4
        </p>
        <h1 className="ka text-2xl font-bold text-[#5C1A2E] mt-1">ბიზნეს ინგლისურის დაყენება</h1>
        <p className="ka text-sm text-[#6B6B6B] mt-1">
          მითხარი რისთვის გჭირდება ბიზნეს ინგლისური და შენთვის შესაბამის გეგმას შევქმნით.
        </p>
      </div>

      <BizCard>
        {step === 0 && (
          <div>
            <h2 className="ka font-semibold text-[#5C1A2E]">რისთვის გჭირდება ბიზნეს ინგლისური?</h2>
            <p className="ka text-xs text-[#6B6B6B] mt-1 mb-4">შეგიძლია რამდენიმე პასუხი აირჩიო.</p>
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
                        : "border-[#E0D8D0] hover:border-[#5C1A2E]/40 text-[#1C1C1E]"
                    }`}
                  >
                    <span className="inline-block w-4 h-4 mr-2 rounded border align-middle"
                      style={{ background: on ? "#5C1A2E" : "transparent", borderColor: on ? "#5C1A2E" : "#E0D8D0" }} />
                    {GOAL_LABELS[g]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 1 && (
          <MultiSelect
            title="რომელია შენი მთავარი მიზანი ახლა?"
            hint="შეგიძლია რამდენიმე პასუხი აირჩიო."
            options={PRIORITY_KEYS.map((k) => ({ value: k, label: PRIORITY_LABELS[k] }))}
            values={priority}
            onToggle={(v) => togglePriority(v as BusinessPriority)}
          />
        )}

        {step === 2 && (
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
              <div className="mt-5 pt-5 border-t border-[#E0D8D0]">
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

        {step === 3 && (
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
            {step < 3 ? "შემდეგი" : "გეგმის ნახვა"}
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
                  : "border-[#E0D8D0] hover:border-[#5C1A2E]/40 text-[#1C1C1E]"
              }`}
            >
              <span
                className="inline-block w-3.5 h-3.5 mr-2 rounded-full border align-middle"
                style={{ background: on ? "#1C1C1E" : "transparent", borderColor: on ? "#1C1C1E" : "#E0D8D0" }}
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
      {hint && <p className="ka text-xs text-[#6B6B6B] mt-1 mb-4">{hint}</p>}
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
                  : "border-[#E0D8D0] hover:border-[#5C1A2E]/40 text-[#1C1C1E]"
              }`}
            >
              <span
                className="inline-block w-4 h-4 mr-2 rounded border align-middle"
                style={{ background: on ? "#5C1A2E" : "transparent", borderColor: on ? "#5C1A2E" : "#E0D8D0" }}
              />
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
