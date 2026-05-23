import { useMemo, useState } from "react";
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
  loadBusiness,
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
  const initial = useMemo(() => (user ? loadBusiness(user.id) : null), [user]);

  const [step, setStep] = useState<Step>(0);
  const [goals, setGoals] = useState<BusinessGoal[]>(initial?.goals ?? []);
  const [priority, setPriority] = useState<BusinessPriority | null>(initial?.mainPriority ?? null);
  const [intensity, setIntensity] = useState<BusinessIntensity | null>(initial?.intensity ?? null);
  const [deadline, setDeadline] = useState<BusinessDeadline>(initial?.deadline ?? null);
  const [field, setField] = useState<BusinessField | null>(initial?.field ?? null);

  const toggleGoal = (g: BusinessGoal) =>
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  const canNext =
    (step === 0 && goals.length > 0) ||
    (step === 1 && !!priority) ||
    (step === 2 && !!intensity && (intensity !== "deadline" || !!deadline)) ||
    (step === 3 && !!field);

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
        <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">
          ნაბიჯი {step + 1} / 4
        </p>
        <h1 className="ka text-2xl font-bold text-[#1E2A44] mt-1">ბიზნეს ინგლისურის დაყენება</h1>
        <p className="ka text-sm text-[#5B6473] mt-1">
          მითხარი რისთვის გჭირდება ბიზნეს ინგლისური და შენთვის შესაბამის გეგმას შევქმნით.
        </p>
      </div>

      <BizCard>
        {step === 0 && (
          <div>
            <h2 className="ka font-semibold text-[#1E2A44]">რისთვის გჭირდება ბიზნეს ინგლისური?</h2>
            <p className="ka text-xs text-[#5B6473] mt-1 mb-4">შეგიძლია რამდენიმე პასუხი აირჩიო.</p>
            <div className="space-y-2">
              {GOAL_KEYS.map((g) => {
                const on = goals.includes(g);
                return (
                  <button
                    key={g}
                    onClick={() => toggleGoal(g)}
                    className={`ka w-full text-left px-4 py-3 rounded-xl border transition-colors text-sm ${
                      on
                        ? "border-[#1E2A44] bg-[#1E2A44]/5 text-[#1E2A44]"
                        : "border-[#E7E2D5] hover:border-[#1E2A44]/40 text-[#374151]"
                    }`}
                  >
                    <span className="inline-block w-4 h-4 mr-2 rounded border align-middle"
                      style={{ background: on ? "#1E2A44" : "transparent", borderColor: on ? "#1E2A44" : "#CBD5E1" }} />
                    {GOAL_LABELS[g]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 1 && (
          <SingleSelect
            title="რომელია შენი მთავარი მიზანი ახლა?"
            options={PRIORITY_KEYS.map((k) => ({ value: k, label: PRIORITY_LABELS[k] }))}
            value={priority}
            onChange={(v) => setPriority(v as BusinessPriority)}
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
              <div className="mt-5 pt-5 border-t border-[#E7E2D5]">
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
          <SingleSelect
            title="რომელი სფერო გაინტერესებს?"
            options={FIELD_KEYS.map((k) => ({ value: k, label: FIELD_LABELS[k] }))}
            value={field}
            onChange={(v) => setField(v as BusinessField)}
          />
        )}

        <div className="flex items-center justify-between mt-6">
          <BizButton variant="ghost" onClick={back} disabled={step === 0}>
            უკან
          </BizButton>
          <BizButton onClick={next} disabled={!canNext}>
            {step < 3 ? "შემდეგი" : "ტესტზე გადასვლა"}
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
      <h2 className="ka font-semibold text-[#1E2A44] mb-3">{title}</h2>
      <div className="space-y-2">
        {options.map((o) => {
          const on = value === o.value;
          return (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              className={`ka w-full text-left px-4 py-3 rounded-xl border transition-colors text-sm ${
                on
                  ? "border-[#1E2A44] bg-[#1E2A44]/5 text-[#1E2A44]"
                  : "border-[#E7E2D5] hover:border-[#1E2A44]/40 text-[#374151]"
              }`}
            >
              <span
                className="inline-block w-3.5 h-3.5 mr-2 rounded-full border align-middle"
                style={{ background: on ? "#C9A227" : "transparent", borderColor: on ? "#C9A227" : "#CBD5E1" }}
              />
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
